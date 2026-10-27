import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { success, badRequest, notFound, unauthorized, serverError } from "../utils/response.js";
import { getAuthenticatedUser } from "../utils/auth.js";
import { validateDatasetId } from "../validators/datasetValidator.js";

const rawDocClient = new DynamoDBClient({});
const defaultDocClient = DynamoDBDocumentClient.from(rawDocClient);
const defaultS3Client = new S3Client({});

/**
 * GET /datasets/{id}/download
 * 
 * Generates a short-lived (60s) S3 presigned GET URL for downloading a dataset CSV.
 * Security requirements:
 *  1. Protected by Cognito Authorizer; requires verified user identity (claims.sub).
 *  2. Tenant-isolated lookup using composite key { userId, id }.
 *  3. Returns 404 for missing datasets or datasets owned by another user (anti-IDOR).
 *  4. Obtains S3 key strictly from DynamoDB metadata (never from client parameter).
 *  5. Verifies object existence via S3 HeadObject, returning 404 if removed.
 *  6. Short-lived 60-second expiration. Private S3 bucket is never made public.
 * 
 * @param {object} event - API Gateway Lambda Proxy Request
 * @param {object} context - Lambda Execution Context
 * @param {object} [injectedDocClient] - Optional injected DynamoDB DocumentClient for testing
 * @param {object} [injectedS3Client] - Optional injected S3 client for testing
 * @param {Function} [injectedGetSignedUrl] - Optional injected getSignedUrl function for testing
 */
export async function handler(
  event,
  context,
  injectedDocClient = null,
  injectedS3Client = null,
  injectedGetSignedUrl = null
) {
  const docClient = injectedDocClient || defaultDocClient;
  const s3Client = injectedS3Client || defaultS3Client;
  const presignFn = injectedGetSignedUrl || getSignedUrl;

  const tableName = process.env.DATASETS_TABLE_NAME;
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!tableName) {
    return serverError("DATASETS_TABLE_NAME environment variable is not configured.");
  }
  if (!bucketName) {
    return serverError("S3_BUCKET_NAME environment variable is not configured.");
  }

  // 1. Enforce verified authentication
  const user = getAuthenticatedUser(event);
  if (!user) {
    return unauthorized("Authentication required. Please sign in to download datasets.");
  }

  // 2. Validate dataset ID parameter
  const rawId = event.pathParameters?.id;
  if (!rawId || typeof rawId !== "string" || !rawId.trim()) {
    return badRequest("Missing or invalid 'id' path parameter.");
  }

  const datasetId = rawId.trim();
  if (!validateDatasetId(datasetId)) {
    return badRequest("Invalid dataset identifier format. Expected format: ds_<id>.");
  }

  // 3. Retrieve metadata using composite tenant key { userId: HASH, id: RANGE }
  let item;
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          userId: user.userId,
          id: datasetId,
        },
      })
    );
    item = result.Item;
  } catch (err) {
    return serverError(`Failed to retrieve dataset metadata from DynamoDB: ${err.message}`);
  }

  // Anti-IDOR: Return 404 for missing datasets and datasets owned by another user
  if (!item) {
    return notFound(`Dataset with id '${datasetId}' was not found.`);
  }

  // 4. Obtain S3 key strictly from verified metadata record
  const s3Key = item.s3Key;
  if (!s3Key || typeof s3Key !== "string") {
    return notFound("Dataset file storage reference is missing or invalid.");
  }

  // Strict tenant boundary check on stored S3 key
  const expectedPrefix = `uploads/${user.userId}/`;
  if (!s3Key.startsWith(expectedPrefix)) {
    return notFound("Dataset storage reference does not belong to the authenticated user.");
  }

  // 5. Verify S3 object existence safely before presigning
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      })
    );
  } catch (err) {
    const isNotFound =
      err.name === "NotFound" ||
      err.name === "NoSuchKey" ||
      err.$metadata?.httpStatusCode === 404;

    if (isNotFound) {
      return notFound("The dataset file is no longer available in cloud storage.");
    }

    return serverError(`Failed to verify dataset in S3 storage: ${err.message}`);
  }

  // 6. Generate short-lived presigned GET URL (60 seconds)
  const expiresInSeconds = 60;
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const downloadUrl = await presignFn(s3Client, getCommand, {
      expiresIn: expiresInSeconds,
    });

    return success({
      downloadUrl,
      key: s3Key,
      expiresIn: expiresInSeconds,
      dataset: {
        id: item.id,
        name: item.name,
        rowCount: item.rowCount,
        createdAt: item.createdAt,
      },
    });
  } catch (err) {
    return serverError(`Failed to generate secure S3 download URL: ${err.message}`);
  }
}
