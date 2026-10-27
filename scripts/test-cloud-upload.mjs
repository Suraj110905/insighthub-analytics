/**
 * scripts/test-cloud-upload.mjs
 * 
 * Unit test suite for Phase 5B Cloud Dataset Upload Pipeline:
 * - S3 Presigned POST request construction
 * - Direct S3 multipart upload behavior & 10MB validation
 * - DynamoDB metadata creation
 * - Partial failure detection and recovery
 * - Token authorization & offline mode
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  isAwsBackendConfigured,
  requestPresignedUploadPost,
  uploadCsvToS3PresignedPost,
  saveDatasetMetadata,
  uploadDatasetToCloud,
  CloudUploadError,
  MAX_CSV_SIZE_BYTES,
} from "../lib/awsClient.js";

// Mock global fetch for unit testing
const originalFetch = global.fetch;

test("CloudUpload 0: isAwsBackendConfigured returns false in default offline mode", () => {
  const origEnable = process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND;
  const origUrl = process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL;
  try {
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "false";
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "";
    assert.equal(isAwsBackendConfigured(), false);
  } finally {
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = origEnable;
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = origUrl;
  }
});

test("CloudUpload 1: requestPresignedUploadPost rejects missing token with 401 CloudUploadError", async () => {
  await assert.rejects(
    async () => {
      await requestPresignedUploadPost(
        { filename: "test.csv", fileSizeBytes: 1024 },
        null // missing token
      );
    },
    (err) => {
      assert.ok(err instanceof CloudUploadError);
      assert.equal(err.status, 401);
      assert.ok(err.message.includes("Authentication required"));
      return true;
    }
  );
});

test("CloudUpload 2: requestPresignedUploadPost rejects files larger than 10MB with 400", async () => {
  await assert.rejects(
    async () => {
      await requestPresignedUploadPost(
        { filename: "large.csv", fileSizeBytes: MAX_CSV_SIZE_BYTES + 1024 },
        "valid.jwt.token"
      );
    },
    (err) => {
      assert.ok(err instanceof CloudUploadError);
      assert.equal(err.status, 400);
      assert.ok(err.message.includes("10 MB"));
      return true;
    }
  );
});

test("CloudUpload 3: uploadCsvToS3PresignedPost validates required policy structure", async () => {
  await assert.rejects(
    async () => {
      await uploadCsvToS3PresignedPost(null, new Blob(["col1,col2\nval1,val2"]));
    },
    (err) => {
      assert.ok(err.message.includes("Invalid presigned POST policy"));
      return true;
    }
  );
});

test("CloudUpload 4: uploadCsvToS3PresignedPost succeeds on S3 204 No Content response", async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, "https://mock-bucket.s3.ap-south-1.amazonaws.com");
    assert.equal(options.method, "POST");
    assert.ok(options.body instanceof FormData);
    return {
      status: 204,
      ok: true,
      text: async () => "",
    };
  };

  try {
    const mockPolicy = {
      url: "https://mock-bucket.s3.ap-south-1.amazonaws.com",
      fields: {
        key: "uploads/user-123/upl_1/data.csv",
        bucket: "mock-bucket",
        Policy: "eyJleHBpcmF0aW9uIjoi...",
      },
    };

    const dummyFile = new Blob(["test,csv\n1,2"], { type: "text/csv" });
    const result = await uploadCsvToS3PresignedPost(mockPolicy, dummyFile);
    assert.equal(result, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test("CloudUpload 5: uploadCsvToS3PresignedPost throws on S3 EntityTooLarge rejection", async () => {
  global.fetch = async () => {
    return {
      status: 400,
      ok: false,
      text: async () => "<Error><Code>EntityTooLarge</Code></Error>",
    };
  };

  try {
    const mockPolicy = {
      url: "https://mock-bucket.s3.ap-south-1.amazonaws.com",
      fields: { key: "k", bucket: "b" },
    };

    await assert.rejects(
      async () => {
        await uploadCsvToS3PresignedPost(mockPolicy, new Blob(["too large"]));
      },
      (err) => {
        assert.ok(err instanceof CloudUploadError);
        assert.ok(err.message.includes("10 MB maximum upload limit"));
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("CloudUpload 6: saveDatasetMetadata requires verified s3Key and token", async () => {
  await assert.rejects(
    async () => {
      await saveDatasetMetadata(
        { name: "test.csv", rowCount: 10, headers: ["id"], metrics: {}, s3Key: "" },
        "token"
      );
    },
    (err) => {
      assert.ok(err.message.includes("Missing verified s3Key"));
      return true;
    }
  );
});

test("CloudUpload 7: uploadDatasetToCloud handles S3 failure without calling DynamoDB metadata endpoint", async () => {
  process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "true";
  process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "https://mock-api.execute-api.ap-south-1.amazonaws.com/dev";

  let metadataEndpointCalled = false;

  global.fetch = async (url) => {
    // Step 1: Presigned URL endpoint
    if (url.includes("/datasets/presigned-url")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          url: "https://mock-bucket.s3.amazonaws.com",
          fields: { key: "uploads/user-1/upl_1/data.csv" },
          key: "uploads/user-1/upl_1/data.csv",
        }),
      };
    }
    // Step 2: S3 direct upload (Fails with 500)
    if (url.includes("mock-bucket.s3")) {
      return {
        ok: false,
        status: 500,
        text: async () => "Internal S3 Error",
      };
    }
    // Step 3: DynamoDB metadata endpoint (Should NEVER be called)
    if (url.includes("/datasets")) {
      metadataEndpointCalled = true;
      return { ok: true, json: async () => ({}) };
    }
    return { ok: false };
  };

  try {
    const dummyFile = new Blob(["order,rev\n1,100"], { type: "text/csv" });
    dummyFile.name = "data.csv";

    await assert.rejects(
      async () => {
        await uploadDatasetToCloud({
          file: dummyFile,
          validRowCount: 1,
          headers: ["order", "rev"],
          metrics: { totalRevenue: 100 },
          token: "valid.token",
        });
      },
      (err) => {
        assert.ok(err instanceof CloudUploadError);
        assert.equal(err.step, "s3");
        return true;
      }
    );

    assert.equal(metadataEndpointCalled, false, "Must NEVER call DynamoDB metadata creation when S3 upload fails");
  } finally {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "false";
  }
});

test("CloudUpload 8: uploadDatasetToCloud detects PARTIAL FAILURE when S3 succeeds but DynamoDB metadata creation fails", async () => {
  process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "true";
  process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "https://mock-api.execute-api.ap-south-1.amazonaws.com/dev";

  global.fetch = async (url) => {
    // Step 1: Presigned URL endpoint
    if (url.includes("/datasets/presigned-url")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          url: "https://mock-bucket.s3.amazonaws.com",
          fields: { key: "uploads/user-1/upl_1/data.csv" },
          key: "uploads/user-1/upl_1/data.csv",
        }),
      };
    }
    // Step 2: S3 direct upload (Succeeds)
    if (url.includes("mock-bucket.s3")) {
      return {
        ok: true,
        status: 204,
        text: async () => "",
      };
    }
    // Step 3: DynamoDB metadata endpoint (Fails with 500)
    if (url.includes("/datasets")) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ message: "DynamoDB Capacity Exceeded" }),
      };
    }
    return { ok: false };
  };

  try {
    const dummyFile = new Blob(["order,rev\n1,100"], { type: "text/csv" });
    dummyFile.name = "data.csv";

    await assert.rejects(
      async () => {
        await uploadDatasetToCloud({
          file: dummyFile,
          validRowCount: 1,
          headers: ["order", "rev"],
          metrics: { totalRevenue: 100 },
          token: "valid.token",
        });
      },
      (err) => {
        assert.ok(err instanceof CloudUploadError);
        assert.equal(err.isPartialFailure, true, "Must flag partialFailure when S3 succeeded but DynamoDB failed");
        assert.equal(err.s3Key, "uploads/user-1/upl_1/data.csv");
        assert.ok(err.message.includes("S3 upload succeeded, but saving dataset metadata to DynamoDB failed"));
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "false";
  }
});

test("CloudUpload 9: uploadDatasetToCloud HAPPY PATH succeeds through all 3 stages", async () => {
  process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "true";
  process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "https://mock-api.execute-api.ap-south-1.amazonaws.com/dev";

  const stepsExecuted = [];

  global.fetch = async (url) => {
    if (url.includes("/datasets/presigned-url")) {
      stepsExecuted.push("presign");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          url: "https://mock-bucket.s3.amazonaws.com",
          fields: { key: "uploads/user-uuid/upl_10/sales.csv" },
          key: "uploads/user-uuid/upl_10/sales.csv",
        }),
      };
    }
    if (url.includes("mock-bucket.s3")) {
      stepsExecuted.push("s3");
      return {
        ok: true,
        status: 204,
        text: async () => "",
      };
    }
    if (url.includes("/datasets")) {
      stepsExecuted.push("metadata");
      return {
        ok: true,
        status: 201,
        json: async () => ({
          message: "Dataset metadata stored successfully.",
          dataset: {
            id: "ds_abc123",
            name: "sales.csv",
            rowCount: 50,
            s3Key: "uploads/user-uuid/upl_10/sales.csv",
          },
        }),
      };
    }
    return { ok: false };
  };

  try {
    const dummyFile = new Blob(["order,rev\n1,100"], { type: "text/csv" });
    dummyFile.name = "sales.csv";

    const progressLog = [];
    const result = await uploadDatasetToCloud({
      file: dummyFile,
      validRowCount: 50,
      headers: ["order", "rev"],
      metrics: { totalRevenue: 100 },
      token: "valid.token",
      onProgress: (p) => progressLog.push(p),
    });

    assert.equal(result.success, true);
    assert.equal(result.dataset.id, "ds_abc123");
    assert.equal(result.s3Key, "uploads/user-uuid/upl_10/sales.csv");
    assert.deepEqual(stepsExecuted, ["presign", "s3", "metadata"]);
    assert.ok(progressLog.length >= 3);
  } finally {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "false";
  }
});
