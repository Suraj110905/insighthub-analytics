import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/getDataset.js";

test("GetDatasetHandler: returns 400 when id pathParameter is missing", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const event = { pathParameters: null };
  const res = await handler(event);
  assert.equal(res.statusCode, 400);
});

test("GetDatasetHandler: returns 404 when dataset does not exist", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const mockGetCommand = {
    send: async () => ({ Item: null }),
  };

  const event = { pathParameters: { id: "ds_nonexistent" } };
  const res = await handler(event, {}, mockGetCommand);
  assert.equal(res.statusCode, 404);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "NotFound");
});

test("GetDatasetHandler: returns 200 with dataset when found", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const mockGetCommand = {
    send: async (cmd) => {
      assert.equal(cmd.input.Key.id, "ds_123");
      return {
        Item: {
          id: "ds_123",
          name: "Annual_Report.csv",
          rowCount: 4200,
        },
      };
    },
  };

  const event = { pathParameters: { id: "ds_123" } };
  const res = await handler(event, {}, mockGetCommand);
  assert.equal(res.statusCode, 200);

  const body = JSON.parse(res.body);
  assert.equal(body.dataset.id, "ds_123");
  assert.equal(body.dataset.name, "Annual_Report.csv");
});
