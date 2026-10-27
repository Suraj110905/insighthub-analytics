import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { created, badRequest, serverError } from "../utils/response.js";
import { validateCreateDatasetInput } from "../validators/datasetValidator.js";
import crypto from "node:crypto";

const rawClient = new DynamoDBClient({});
const defaultDocClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * POST /datasets
 * 
 * Validates dataset metadata and stores the record in DynamoDB.
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

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return badRequest("Invalid JSON in request body.", [err.message]);
  }

  const validation = validateCreateDatasetInput(body);
  if (!validation.valid) {
    return badRequest("Validation failed for dataset creation.", validation.errors);
  }

  const datasetId = `ds_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const item = {
    id: datasetId,
    name: validation.sanitized.name,
    rowCount: validation.sanitized.rowCount,
    columnCount: validation.sanitized.columnCount,
    headers: validation.sanitized.headers,
    metrics: validation.sanitized.metrics,
    s3Key: validation.sanitized.s3Key,
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
