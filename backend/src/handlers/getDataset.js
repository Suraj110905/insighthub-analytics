import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { success, badRequest, notFound, unauthorized, serverError } from "../utils/response.js";
import { getAuthenticatedUser } from "../utils/auth.js";
import { validateDatasetId } from "../validators/datasetValidator.js";

const rawClient = new DynamoDBClient({});
const defaultDocClient = DynamoDBDocumentClient.from(rawClient);

/**
 * GET /datasets/{id}
 * 
 * Retrieves metadata for a single dataset by ID from DynamoDB.
 * Enforces tenant data isolation by querying composite key { userId, id }.
 * Returns 404 if the dataset does not exist or belongs to another user, preventing IDOR leakage.
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
    return unauthorized("Authentication required. Please sign in to view dataset details.");
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

  // 3. Query DynamoDB using composite primary key (userId = HASH, id = RANGE)
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

