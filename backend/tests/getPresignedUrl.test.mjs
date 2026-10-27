import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/getPresignedUrl.js";

test("PresignedUrlHandler: rejects non-csv files with 400", async () => {
  process.env.S3_BUCKET_NAME = "test-bucket";

  const event = {
    body: JSON.stringify({
      filename: "malicious.exe",
      fileSizeBytes: 1024,
    }),
  };

  const res = await handler(event);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.ok(body.details.some((e) => e.includes(".csv")));
});

test("PresignedUrlHandler: rejects files larger than 10MB with 400", async () => {
  process.env.S3_BUCKET_NAME = "test-bucket";

  const event = {
    body: JSON.stringify({
      filename: "huge_data.csv",
      fileSizeBytes: 15 * 1024 * 1024, // 15MB
    }),
  };

  const res = await handler(event);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.ok(body.details.some((e) => e.includes("10MB limit")));
});

test("PresignedUrlHandler: generates presigned URL for valid CSV request", async () => {
  process.env.S3_BUCKET_NAME = "test-bucket";
  process.env.PRESIGNED_URL_EXPIRY = "900";

  const mockPresigner = async (client, cmd, opts) => {
    assert.equal(cmd.input.Bucket, "test-bucket");
    assert.equal(cmd.input.ContentType, "text/csv");
    assert.ok(cmd.input.Key.includes("sales_2026.csv"));
    assert.equal(opts.expiresIn, 900);
    return `https://test-bucket.s3.amazonaws.com/${cmd.input.Key}?AWSAccessKeyId=MOCK&Signature=MOCK`;
  };

  const event = {
    body: JSON.stringify({
      filename: "sales_2026.csv",
      fileSizeBytes: 204800, // 200KB
    }),
  };

  const res = await handler(event, {}, {}, mockPresigner);
  assert.equal(res.statusCode, 200);

  const body = JSON.parse(res.body);
  assert.ok(body.uploadUrl.startsWith("https://test-bucket.s3.amazonaws.com/"));
  assert.equal(body.bucket, "test-bucket");
  assert.equal(body.method, "PUT");
  assert.equal(body.expiresIn, 900);
});
