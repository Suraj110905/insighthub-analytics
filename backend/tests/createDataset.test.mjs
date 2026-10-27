import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/createDataset.js";

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

test("CreateDatasetHandler: rejects unauthenticated requests with 401 Unauthorized", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const unauthenticatedEvent = {
    body: JSON.stringify({ name: "Sales.csv", rowCount: 10, headers: ["id"] }),
  };

  const res = await handler(unauthenticatedEvent);
  assert.equal(res.statusCode, 401);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "Unauthorized");
});

test("CreateDatasetHandler: rejects empty or malformed body with 400", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const emptyEvent = {
    ...TEST_USER,
    body: "",
  };
  const res = await handler(emptyEvent);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "BadRequest");
});

test("CreateDatasetHandler: rejects invalid rowCount and missing name with 400", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const invalidEvent = {
    ...TEST_USER,
    body: JSON.stringify({
      name: "",
      rowCount: -5,
      headers: [],
    }),
  };

  const res = await handler(invalidEvent);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.ok(body.details.some((e) => e.includes("name")));
  assert.ok(body.details.some((e) => e.includes("rowCount")));
  assert.ok(body.details.some((e) => e.includes("headers")));
});

test("CreateDatasetHandler: rejects S3 key outside user's scoped directory with 400", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const spoofedS3KeyEvent = {
    ...TEST_USER,
    body: JSON.stringify({
      name: "Q4 Retail Sales.csv",
      rowCount: 100,
      headers: ["order_id", "revenue"],
      s3Key: "uploads/another-user-9999/malicious.csv",
    }),
  };

  const res = await handler(spoofedS3KeyEvent);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.ok(body.message.includes("user directory"));
});

test("CreateDatasetHandler: successfully saves valid dataset with 201 Created and user partition key", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const mockPutCommand = {
    send: async (cmd) => {
      assert.equal(cmd.input.TableName, "TestTable");
      assert.equal(cmd.input.Item.userId, "user-uuid-12345");
      assert.ok(cmd.input.Item.id.startsWith("ds_"));
      assert.equal(cmd.input.Item.name, "Q4 Retail Sales.csv");
      assert.equal(cmd.input.Item.rowCount, 1500);
      assert.equal(cmd.input.Item.s3Key, "uploads/user-uuid-12345/upl_1/sales.csv");
      return {};
    },
  };

  const validEvent = {
    ...TEST_USER,
    body: JSON.stringify({
      name: "Q4 Retail Sales.csv",
      rowCount: 1500,
      headers: ["order_id", "customer", "revenue", "date"],
      s3Key: "uploads/user-uuid-12345/upl_1/sales.csv",
      // Attacker attempts to pass a different owner ID in payload:
      userId: "spoofed-user-9999",
      metrics: {
        totalRevenue: 125000,
        totalOrders: 1500,
        averageOrderValue: 83.33,
      },
    }),
  };

  const res = await handler(validEvent, {}, mockPutCommand);
  assert.equal(res.statusCode, 201);

  const body = JSON.parse(res.body);
  assert.equal(body.message, "Dataset metadata stored successfully.");
  assert.equal(body.dataset.name, "Q4 Retail Sales.csv");
  assert.equal(body.dataset.userId, "user-uuid-12345");
  assert.equal(body.dataset.rowCount, 1500);
  assert.ok(body.dataset.id);
});
