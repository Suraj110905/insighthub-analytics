import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { success, badRequest, serverError } from "../utils/response.js";
import { validatePresignedUrlInput } from "../validators/datasetValidator.js";
import crypto from "node:crypto";

const defaultS3Client = new S3Client({});

/**
 * POST /datasets/presigned-url
 * 
 * Generates an S3 presigned PUT URL allowing the client browser to upload a CSV file directly to private S3.
 * File never passes through Lambda memory, avoiding function memory exhaustion and protecting data privacy.
 * 
 * @param {object} event - API Gateway Lambda Proxy Request
 * @param {object} context - Lambda Execution Context
 * @param {object} [injectedClient] - Optional injected S3 client
 * @param {Function} [injectedPresigner] - Optional injected presigner function for testing
 */
export async function handler(event, context, injectedClient = null, injectedPresigner = null) {
  const s3Client = injectedClient || defaultS3Client;
  const presignFn = injectedPresigner || getSignedUrl;
  const bucketName = process.env.S3_BUCKET_NAME;
  const expirySeconds = parseInt(process.env.PRESIGNED_URL_EXPIRY || "900", 10);

  if (!bucketName) {
    return serverError("S3_BUCKET_NAME environment variable is not configured.");
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return badRequest("Invalid JSON in request body.", [err.message]);
  }

  const validation = validatePresignedUrlInput(body);
  if (!validation.valid) {
    return badRequest("Validation failed for upload request.", validation.errors);
  }

  const sanitizedFilename = validation.sanitized.filename.replace(/[^a-zA-Z0-9_\-.]/g, "_");
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const s3Key = `uploads/${new Date().toISOString().split("T")[0]}/${Date.now()}-${randomSuffix}-${sanitizedFilename}`;

  try {
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: "text/csv",
    });

    const uploadUrl = await presignFn(s3Client, putCommand, {
      expiresIn: expirySeconds,
    });

    return success({
      uploadUrl,
      key: s3Key,
      bucket: bucketName,
      expiresIn: expirySeconds,
      method: "PUT",
      headers: {
        "Content-Type": "text/csv",
      },
    });
  } catch (err) {
    return serverError(`Failed to generate S3 presigned URL: ${err.message}`);
  }
}
