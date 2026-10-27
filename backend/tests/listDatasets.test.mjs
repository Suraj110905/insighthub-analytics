import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/listDatasets.js";

test("ListDatasetsHandler: returns items array and count with 200 OK", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";

  const mockScanCommand = {
    send: async (cmd) => {
      assert.equal(cmd.input.TableName, "TestTable");
      return {
        Items: [
          { id: "ds_1", name: "Jan Sales.csv", rowCount: 500 },
          { id: "ds_2", name: "Feb Sales.csv", rowCount: 650 },
        ],
      };
    },
  };

  const res = await handler({}, {}, mockScanCommand);
  assert.equal(res.statusCode, 200);

  const body = JSON.parse(res.body);
  assert.equal(body.count, 2);
  assert.equal(body.items.length, 2);
  assert.equal(body.items[0].name, "Jan Sales.csv");
});
