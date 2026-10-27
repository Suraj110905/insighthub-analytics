import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/getDataset.js";

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

test("GetDatasetHandler: rejects unauthenticated requests with 401 Unauthorized", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const event = { pathParameters: { id: "ds_12345678" } };
  const res = await handler(event);
  assert.equal(res.statusCode, 401);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "Unauthorized");
});

test("GetDatasetHandler: returns 400 when id pathParameter is missing", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const event = { ...TEST_USER, pathParameters: null };
  const res = await handler(event);
  assert.equal(res.statusCode, 400);
});

test("GetDatasetHandler: returns 400 when id format is invalid", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const event = { ...TEST_USER, pathParameters: { id: "not_a_valid_ds_id" } };
  const res = await handler(event);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.ok(body.message.includes("Invalid dataset identifier format"));
});

test("GetDatasetHandler: returns 404 when dataset does not exist or belongs to another user (anti-IDOR)", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const mockGetCommand = {
    send: async (cmd) => {
      // Verifies that DynamoDB query strictly scopes to the requesting user's partition
      assert.equal(cmd.input.Key.userId, "user-uuid-12345");
      assert.equal(cmd.input.Key.id, "ds_bob_dataset_9999");
      return { Item: null };
    },
  };

  const event = { ...TEST_USER, pathParameters: { id: "ds_bob_dataset_9999" } };
  const res = await handler(event, {}, mockGetCommand);
  assert.equal(res.statusCode, 404);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "NotFound");
});

test("GetDatasetHandler: returns 200 with dataset when found in authenticated user's partition", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const mockGetCommand = {
    send: async (cmd) => {
      assert.equal(cmd.input.Key.userId, "user-uuid-12345");
      assert.equal(cmd.input.Key.id, "ds_12345678");
      return {
        Item: {
          userId: "user-uuid-12345",
          id: "ds_12345678",
          name: "Annual_Report.csv",
          rowCount: 4200,
        },
      };
    },
  };

  const event = { ...TEST_USER, pathParameters: { id: "ds_12345678" } };
  const res = await handler(event, {}, mockGetCommand);
  assert.equal(res.statusCode, 200);

  const body = JSON.parse(res.body);
  assert.equal(body.dataset.id, "ds_12345678");
  assert.equal(body.dataset.userId, "user-uuid-12345");
  assert.equal(body.dataset.name, "Annual_Report.csv");
});
