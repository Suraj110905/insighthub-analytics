import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { success, serverError } from "../utils/response.js";

const rawClient = new DynamoDBClient({});
const defaultDocClient = DynamoDBDocumentClient.from(rawClient);

/**
 * GET /datasets
 * 
 * Returns a list of dataset metadata items stored in DynamoDB.
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

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        Limit: 50,
      })
    );

    const items = result.Items || [];

    return success({
      items,
      count: items.length,
    });
  } catch (err) {
    return serverError(`Failed to list datasets from DynamoDB: ${err.message}`);
  }
}
