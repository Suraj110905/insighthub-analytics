import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { created, badRequest, unauthorized, serverError } from "../utils/response.js";
import { validateCreateDatasetInput } from "../validators/datasetValidator.js";
import { getAuthenticatedUser } from "../utils/auth.js";
import crypto from "node:crypto";

const rawClient = new DynamoDBClient({});
const defaultDocClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * POST /datasets
 * 
 * Validates dataset metadata and stores the record in DynamoDB.
 * Enforces multi-tenant data isolation using composite key (userId = HASH, id = RANGE).
 * Does NOT accept or store raw CSV file bytes; stores structural metadata and KPI summaries only.
 * 
 * @param {object} event - API Gateway Lambda Proxy Request
 * @param {object} context - Lambda Execution Context
 * @param {object} [injectedClient] - Optional injected DocumentClient for unit testing
 */
export async function handler(event, context, injectedClient = null) {
  const docClient = injectedClient || defaultDocClient;
  const tableName = process.env.DATASETS_TABLE_NAME;

  if (!tableName) {
    return serverError("DATASETS_TABLE_NAME environment variable is not configured.");
  }

  // 1. Enforce verified authentication
  const user = getAuthenticatedUser(event);
  if (!user) {
    return unauthorized("Authentication required. Valid user session required to create datasets.");
  }

  // 2. Parse request body
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return badRequest("Invalid JSON in request body.", [err.message]);
  }

  // 3. Validate input
  const validation = validateCreateDatasetInput(body);
  if (!validation.valid) {
    return badRequest("Validation failed for dataset creation.", validation.errors);
  }

  // 4. Validate S3 key ownership if provided
  let validatedS3Key = validation.sanitized.s3Key;
  if (validatedS3Key) {
    const expectedPrefix = `uploads/${user.userId}/`;
    if (!validatedS3Key.startsWith(expectedPrefix)) {
      return badRequest("Invalid 's3Key'. S3 object must be located within your user directory.");
    }
  }

  // 5. Generate cryptographically random dataset ID
  const datasetId = `ds_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // 6. Build item with tenant isolation key (userId: HASH, id: RANGE)
  const item = {
    userId: user.userId,
    id: datasetId,
    name: validation.sanitized.name,
    rowCount: validation.sanitized.rowCount,
    columnCount: validation.sanitized.columnCount,
    headers: validation.sanitized.headers,
    metrics: validation.sanitized.metrics,
    s3Key: validatedS3Key,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      })
    );

    return created({
      message: "Dataset metadata stored successfully.",
      dataset: item,
    });
  } catch (err) {
    return serverError(`Failed to save dataset in DynamoDB: ${err.message}`);
  }
}

