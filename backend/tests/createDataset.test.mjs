import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/createDataset.js";

test("CreateDatasetHandler: rejects empty or malformed body with 400", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const emptyEvent = { body: "" };
  const res = await handler(emptyEvent);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "BadRequest");
});

test("CreateDatasetHandler: rejects invalid rowCount and missing name with 400", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const invalidEvent = {
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

test("CreateDatasetHandler: successfully saves valid dataset with 201 Created", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const mockPutCommand = {
    send: async (cmd) => {
      assert.equal(cmd.input.TableName, "TestTable");
      assert.ok(cmd.input.Item.id.startsWith("ds_"));
      assert.equal(cmd.input.Item.name, "Q4 Retail Sales.csv");
      assert.equal(cmd.input.Item.rowCount, 1500);
      return {};
    },
  };

  const validEvent = {
    body: JSON.stringify({
      name: "Q4 Retail Sales.csv",
      rowCount: 1500,
      headers: ["order_id", "customer", "revenue", "date"],
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
  assert.equal(body.dataset.rowCount, 1500);
  assert.ok(body.dataset.id);
});
