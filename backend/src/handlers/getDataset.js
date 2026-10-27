import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { success, badRequest, notFound, serverError } from "../utils/response.js";

const rawClient = new DynamoDBClient({});
const defaultDocClient = DynamoDBDocumentClient.from(rawClient);

/**
 * GET /datasets/{id}
 * 
 * Retrieves metadata for a single dataset by ID from DynamoDB.
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

  const datasetId = event.pathParameters?.id;
  if (!datasetId || typeof datasetId !== "string" || !datasetId.trim()) {
    return badRequest("Missing or invalid 'id' path parameter.");
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { id: datasetId.trim() },
      })
    );

    if (!result.Item) {
      return notFound(`Dataset with id '${datasetId}' was not found.`);
    }

    return success({
      dataset: result.Item,
    });
  } catch (err) {
    return serverError(`Failed to retrieve dataset from DynamoDB: ${err.message}`);
  }
}
