import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/listDatasets.js";

const TEST_USER = {
  requestContext: {
    authorizer: {
      claims: {
        sub: "user-uuid-12345",
        email: "alice@example.com",
      },
    },
  },
};

test("ListDatasetsHandler: rejects unauthenticated requests with 401 Unauthorized", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const res = await handler({});
  assert.equal(res.statusCode, 401);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "Unauthorized");
});

test("ListDatasetsHandler: queries only authenticated user's records via QueryCommand with 200 OK", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const mockDocClient = {
    send: async (cmd) => {
      assert.equal(cmd.input.TableName, "TestTable");
      assert.equal(cmd.input.KeyConditionExpression, "userId = :uid");
      assert.equal(cmd.input.ExpressionAttributeValues[":uid"], "user-uuid-12345");
      return {
        Items: [
          { userId: "user-uuid-12345", id: "ds_1", name: "Jan Sales.csv", rowCount: 500 },
          { userId: "user-uuid-12345", id: "ds_2", name: "Feb Sales.csv", rowCount: 650 },
        ],
      };
    },
  };

  const res = await handler(TEST_USER, {}, mockDocClient);
  assert.equal(res.statusCode, 200);

  const body = JSON.parse(res.body);
  assert.equal(body.count, 2);
  assert.equal(body.items.length, 2);
  assert.equal(body.items[0].name, "Jan Sales.csv");
  assert.equal(body.items[0].userId, "user-uuid-12345");
});
