import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/getPresignedUrl.js";

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

test("PresignedUrlHandler: rejects unauthenticated requests with 401 Unauthorized", async () => {
  process.env.S3_BUCKET_NAME = "test-bucket";

  const event = {
    body: JSON.stringify({
      filename: "valid.csv",
      fileSizeBytes: 1024,
    }),
  };

  const res = await handler(event);
  assert.equal(res.statusCode, 401);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "Unauthorized");
});

test("PresignedUrlHandler: rejects non-csv files with 400", async () => {
  process.env.S3_BUCKET_NAME = "test-bucket";

  const event = {
    ...TEST_USER,
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

test("PresignedUrlHandler: rejects unsupported content-type with 400", async () => {
  process.env.S3_BUCKET_NAME = "test-bucket";

  const event = {
    ...TEST_USER,
    body: JSON.stringify({
      filename: "data.csv",
      fileSizeBytes: 1024,
      contentType: "application/json",
    }),
  };

  const res = await handler(event);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.ok(body.details.some((e) => e.includes("contentType")));
});

test("PresignedUrlHandler: rejects files larger than 10MB with 400", async () => {
  process.env.S3_BUCKET_NAME = "test-bucket";

  const event = {
    ...TEST_USER,
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

test("PresignedUrlHandler: generates presigned POST policy with strict 10MB content-length-range and user isolation", async () => {
  process.env.S3_BUCKET_NAME = "test-bucket";
  process.env.PRESIGNED_URL_EXPIRY = "900";

  let capturedParams = null;
  const mockCreatePresignedPost = async (client, params) => {
    capturedParams = params;
    return {
      url: `https://${params.Bucket}.s3.ap-south-1.amazonaws.com`,
      fields: {
        key: params.Key,
        bucket: params.Bucket,
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": "MOCK/20261028/ap-south-1/s3/aws4_request",
        "X-Amz-Date": "20261028T000000Z",
        Policy: "eyJleHBpcmF0aW9uIjoiMjAyNi...==",
        "X-Amz-Signature": "mocksignature123456",
      },
    };
  };

  const event = {
    ...TEST_USER,
    body: JSON.stringify({
      filename: "sales_2026.csv",
      fileSizeBytes: 204800, // 200KB
    }),
  };

  const res = await handler(event, {}, {}, mockCreatePresignedPost);
  assert.equal(res.statusCode, 200);

  const body = JSON.parse(res.body);
  assert.equal(body.url, "https://test-bucket.s3.ap-south-1.amazonaws.com");
  assert.equal(body.bucket, "test-bucket");
  assert.equal(body.method, "POST");
  assert.equal(body.maxSizeBytes, 10485760);
  assert.equal(body.expiresIn, 900);
  assert.ok(body.key.startsWith("uploads/user-uuid-12345/"));

  // Verify S3 policy conditions enforcement
  assert.ok(capturedParams, "presign function must be called with parameters");
  assert.equal(capturedParams.Bucket, "test-bucket");
  assert.ok(capturedParams.Key.startsWith("uploads/user-uuid-12345/"));
  assert.equal(capturedParams.Expires, 900);

  // Check content-length-range condition [1, 10485760]
  const lengthCondition = capturedParams.Conditions.find((c) => Array.isArray(c) && c[0] === "content-length-range");
  assert.ok(lengthCondition, "Policy must include content-length-range condition");
  assert.equal(lengthCondition[1], 1);
  assert.equal(lengthCondition[2], 10485760);
});
