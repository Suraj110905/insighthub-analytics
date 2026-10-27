import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { success, unauthorized, serverError } from "../utils/response.js";
import { getAuthenticatedUser } from "../utils/auth.js";

const rawClient = new DynamoDBClient({});
const defaultDocClient = DynamoDBDocumentClient.from(rawClient);

/**
 * GET /datasets
 * 
 * Returns the list of dataset metadata items belonging exclusively to the authenticated user.
 * Enforces tenant data isolation via DynamoDB partition key QueryCommand (userId = :uid).
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
    return unauthorized("Authentication required. Please sign in to view your datasets.");
  }

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": user.userId,
        },
        Limit: 50,
        ScanIndexForward: false, // Newest datasets first if sort key ordered
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

