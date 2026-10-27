import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/health.js";

test("HealthHandler: returns 200 with healthy status and CORS headers", async () => {
  process.env.ENVIRONMENT = "dev";
  process.env.FRONTEND_ORIGIN = "http://localhost:3000";

  const event = { httpMethod: "GET" };
  const response = await handler(event);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["Content-Type"], "application/json");
  assert.equal(response.headers["Access-Control-Allow-Origin"], "http://localhost:3000");

  const body = JSON.parse(response.body);
  assert.equal(body.status, "healthy");
  assert.equal(body.service, "insighthub-api");
  assert.equal(body.version, "1.0.0");
  assert.ok(body.timestamp);
});
