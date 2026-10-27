import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handlers/getDatasetDownloadUrl.js";

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

test("GetDatasetDownloadUrlHandler: rejects unauthenticated requests with 401 Unauthorized", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";
  process.env.S3_BUCKET_NAME = "TestBucket";

  const event = { pathParameters: { id: "ds_12345678" } };
  const res = await handler(event);
  assert.equal(res.statusCode, 401);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "Unauthorized");
});

test("GetDatasetDownloadUrlHandler: returns 400 when id pathParameter is missing", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";
  process.env.S3_BUCKET_NAME = "TestBucket";

  const event = { ...TEST_USER, pathParameters: null };
  const res = await handler(event);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "BadRequest");
});

test("GetDatasetDownloadUrlHandler: returns 400 when id format is invalid", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";
  process.env.S3_BUCKET_NAME = "TestBucket";

  const event = { ...TEST_USER, pathParameters: { id: "invalid_id_not_matching_ds" } };
  const res = await handler(event);
  assert.equal(res.statusCode, 400);

  const body = JSON.parse(res.body);
  assert.ok(body.message.includes("Invalid dataset identifier format"));
});

test("GetDatasetDownloadUrlHandler: returns 404 when dataset does not exist or belongs to another user (anti-IDOR)", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";
  process.env.S3_BUCKET_NAME = "TestBucket";

  const mockDocClient = {
    send: async (cmd) => {
      // Verifies composite primary key strictly scopes to the requesting user's partition
      assert.equal(cmd.input.Key.userId, "user-uuid-12345");
      assert.equal(cmd.input.Key.id, "ds_bob_dataset_9999");
      return { Item: null };
    },
  };

  const event = { ...TEST_USER, pathParameters: { id: "ds_bob_dataset_9999" } };
  const res = await handler(event, {}, mockDocClient);
  assert.equal(res.statusCode, 404);

  const body = JSON.parse(res.body);
  assert.equal(body.error, "NotFound");
});

test("GetDatasetDownloadUrlHandler: returns 404 when dataset item lacks an s3Key", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";
  process.env.S3_BUCKET_NAME = "TestBucket";

  const mockDocClient = {
    send: async () => ({
      Item: {
        userId: "user-uuid-12345",
        id: "ds_12345678",
        name: "Test.csv",
        s3Key: null,
      },
    }),
  };

  const event = { ...TEST_USER, pathParameters: { id: "ds_12345678" } };
  const res = await handler(event, {}, mockDocClient);
  assert.equal(res.statusCode, 404);

  const body = JSON.parse(res.body);
  assert.ok(body.message.includes("missing or invalid"));
});

test("GetDatasetDownloadUrlHandler: returns 404 when s3Key violates user tenant prefix", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";
  process.env.S3_BUCKET_NAME = "TestBucket";

  const mockDocClient = {
    send: async () => ({
      Item: {
        userId: "user-uuid-12345",
        id: "ds_12345678",
        name: "Test.csv",
        s3Key: "uploads/attacker-uuid/malicious.csv",
      },
    }),
  };

  const event = { ...TEST_USER, pathParameters: { id: "ds_12345678" } };
  const res = await handler(event, {}, mockDocClient);
  assert.equal(res.statusCode, 404);

  const body = JSON.parse(res.body);
  assert.ok(body.message.includes("does not belong to the authenticated user"));
});

test("GetDatasetDownloadUrlHandler: returns 404 when S3 object does not exist in storage", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";
  process.env.S3_BUCKET_NAME = "TestBucket";

  const mockDocClient = {
    send: async () => ({
      Item: {
        userId: "user-uuid-12345",
        id: "ds_12345678",
        name: "DeletedFile.csv",
        rowCount: 100,
        s3Key: "uploads/user-uuid-12345/upl_123/DeletedFile.csv",
      },
    }),
  };

  const mockS3Client = {
    send: async () => {
      const err = new Error("Object does not exist");
      err.name = "NotFound";
      err.$metadata = { httpStatusCode: 404 };
      throw err;
    },
  };

  const event = { ...TEST_USER, pathParameters: { id: "ds_12345678" } };
  const res = await handler(event, {}, mockDocClient, mockS3Client);
  assert.equal(res.statusCode, 404);

  const body = JSON.parse(res.body);
  assert.ok(body.message.includes("no longer available in cloud storage"));
});

test("GetDatasetDownloadUrlHandler: generates 60s presigned GET URL strictly from metadata s3Key", async () => {
  process.env.DATASETS_TABLE_NAME = "TestTable";
  process.env.S3_BUCKET_NAME = "TestBucket";

  const storedS3Key = "uploads/user-uuid-12345/upl_456/Q4_Sales.csv";
  let capturedPresignParams = null;

  const mockDocClient = {
    send: async () => ({
      Item: {
        userId: "user-uuid-12345",
        id: "ds_12345678",
        name: "Q4_Sales.csv",
        rowCount: 5500,
        createdAt: "2026-10-28T00:00:00.000Z",
        s3Key: storedS3Key,
      },
    }),
  };

  const mockS3Client = {
    send: async (cmd) => {
      // HeadObjectCommand check
      assert.equal(cmd.input.Bucket, "TestBucket");
      assert.equal(cmd.input.Key, storedS3Key);
      return { ContentLength: 1024 };
    },
  };

  const mockPresignFn = async (client, command, options) => {
    capturedPresignParams = {
      bucket: command.input.Bucket,
      key: command.input.Key,
      expiresIn: options.expiresIn,
    };
    return `https://TestBucket.s3.ap-south-1.amazonaws.com/${command.input.Key}?token=mock-presigned-url`;
  };

  const event = { ...TEST_USER, pathParameters: { id: "ds_12345678" } };
  const res = await handler(event, {}, mockDocClient, mockS3Client, mockPresignFn);
  assert.equal(res.statusCode, 200);

  const body = JSON.parse(res.body);
  assert.equal(body.key, storedS3Key);
  assert.equal(body.expiresIn, 60);
  assert.equal(body.dataset.id, "ds_12345678");
  assert.equal(body.dataset.name, "Q4_Sales.csv");
  assert.equal(body.dataset.rowCount, 5500);
  assert.ok(body.downloadUrl.includes("token=mock-presigned-url"));

  // Check presigner was called with 60s expiry and exact stored S3 key
  assert.equal(capturedPresignParams.bucket, "TestBucket");
  assert.equal(capturedPresignParams.key, storedS3Key);
  assert.equal(capturedPresignParams.expiresIn, 60);
});
