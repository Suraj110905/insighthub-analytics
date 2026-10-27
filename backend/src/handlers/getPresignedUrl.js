import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { success, badRequest, unauthorized, serverError } from "../utils/response.js";
import { validatePresignedUrlInput, MAX_CSV_SIZE_BYTES } from "../validators/datasetValidator.js";
import { getAuthenticatedUser } from "../utils/auth.js";
import crypto from "node:crypto";

const defaultS3Client = new S3Client({});

/**
 * POST /datasets/presigned-url
 * 
 * Generates an S3 presigned POST policy allowing the client browser to upload a CSV file directly to private S3.
 * Enforces:
 *  1. User authentication: URL is scoped strictly to uploads/${user.userId}/...
 *  2. Upload size: S3 policy strictly enforces content-length-range [1, 10485760] (10MB).
 *  3. Content-Type: Policy strictly enforces text/csv.
 * 
 * @param {object} event - API Gateway Lambda Proxy Request
 * @param {object} context - Lambda Execution Context
 * @param {object} [injectedClient] - Optional injected S3 client
 * @param {Function} [injectedPresigner] - Optional injected createPresignedPost function for testing
 */
export async function handler(event, context, injectedClient = null, injectedPresigner = null) {
  const s3Client = injectedClient || defaultS3Client;
  const presignFn = injectedPresigner || createPresignedPost;
  const bucketName = process.env.S3_BUCKET_NAME;
  const expirySeconds = parseInt(process.env.PRESIGNED_URL_EXPIRY || "900", 10);

  if (!bucketName) {
    return serverError("S3_BUCKET_NAME environment variable is not configured.");
  }

  // 1. Enforce verified authentication
  const user = getAuthenticatedUser(event);
  if (!user) {
    return unauthorized("Authentication required. Please sign in to request upload credentials.");
  }

  // 2. Parse request body
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return badRequest("Invalid JSON in request body.", [err.message]);
  }

  // 3. Validate input
  const validation = validatePresignedUrlInput(body);
  if (!validation.valid) {
    return badRequest("Validation failed for upload request.", validation.errors);
  }

  // 4. Construct user-scoped S3 key to guarantee tenant data isolation
  const sanitizedFilename = validation.sanitized.filename.replace(/[^a-zA-Z0-9_\-.]/g, "_");
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const uploadId = `upl_${Date.now()}_${randomSuffix}`;
  const s3Key = `uploads/${user.userId}/${uploadId}/${sanitizedFilename}`;

  // 5. Generate presigned POST policy with strict S3-level conditions
  try {
    const presignedPost = await presignFn(s3Client, {
      Bucket: bucketName,
      Key: s3Key,
      Conditions: [
        // Strict 10MB limit enforced directly by S3 REST API
        ["content-length-range", 1, MAX_CSV_SIZE_BYTES],
        ["starts-with", "$Content-Type", "text/csv"],
      ],
      Fields: {
        "Content-Type": "text/csv",
      },
      Expires: expirySeconds,
    });

    return success({
      url: presignedPost.url,
      fields: presignedPost.fields,
      key: s3Key,
      bucket: bucketName,
      expiresIn: expirySeconds,
      method: "POST",
      maxSizeBytes: MAX_CSV_SIZE_BYTES,
      contentType: "text/csv",
    });
  } catch (err) {
    return serverError(`Failed to generate S3 presigned upload policy: ${err.message}`);
  }
}

