/**
 * scripts/test-dataset-history.mjs
 * 
 * Unit test suite for Phase 5C Dataset History, Secure Downloads & Reopening:
 * - listUserDatasets: authorization & item listing
 * - getDatasetDownloadUrl: ID validation, token auth, 404 handling
 * - downloadDatasetCsv: secure S3 GET download with 403/404 handling
 * - downloadAndReopenDataset: end-to-end pipeline (download, parse, recalculate analytics, cloud labeling)
 * - Error cases: failed download, expired URLs, invalid/empty CSV (no false successes)
 * - Local mode preservation: offline operation without AWS credentials
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  isAwsBackendConfigured,
  listUserDatasets,
  getDatasetDownloadUrl,
  downloadDatasetCsv,
  downloadAndReopenDataset,
} from "../lib/awsClient.js";
import { parseAndValidateCSV } from "../lib/csvParser.js";
import { computeDashboardAnalytics } from "../lib/analytics.js";

const originalFetch = global.fetch;

test("DatasetHistory 1: listUserDatasets requires verified token", async () => {
  await assert.rejects(
    async () => {
      await listUserDatasets(null);
    },
    (err) => {
      assert.ok(err.message.includes("Authentication required"));
      return true;
    }
  );
});

test("DatasetHistory 2: listUserDatasets fails cleanly if AWS backend is disabled (local mode)", async () => {
  const origEnable = process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND;
  const origUrl = process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL;
  try {
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "false";
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "";
    assert.equal(isAwsBackendConfigured(), false);

    await assert.rejects(
      async () => {
        await listUserDatasets("mock-token");
      },
      (err) => {
        assert.ok(err.message.includes("AWS Backend is not enabled"));
        return true;
      }
    );
  } finally {
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = origEnable;
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = origUrl;
  }
});

test("DatasetHistory 3: listUserDatasets passes Bearer token to GET /datasets and returns items", async () => {
  const origEnable = process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND;
  const origUrl = process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL;
  try {
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "true";
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "https://mock-api.execute-api.ap-south-1.amazonaws.com/dev";

    const mockDatasets = [
      {
        id: "ds_11111111",
        name: "Q1_Sales.csv",
        rowCount: 1200,
        createdAt: "2026-10-27T10:00:00Z",
        s3Key: "uploads/user-123/upl_1/Q1_Sales.csv",
      },
      {
        id: "ds_22222222",
        name: "Q2_Sales.csv",
        rowCount: 2500,
        createdAt: "2026-10-28T10:00:00Z",
        s3Key: "uploads/user-123/upl_2/Q2_Sales.csv",
      },
    ];

    global.fetch = async (url, options) => {
      assert.equal(url, "https://mock-api.execute-api.ap-south-1.amazonaws.com/dev/datasets");
      assert.equal(options.method, "GET");
      assert.equal(options.headers["Authorization"], "Bearer valid-cognito-id-token");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: mockDatasets,
          count: mockDatasets.length,
        }),
      };
    };

    const res = await listUserDatasets("valid-cognito-id-token");
    assert.equal(res.count, 2);
    assert.equal(res.items.length, 2);
    assert.equal(res.items[0].name, "Q1_Sales.csv");
    assert.equal(res.items[1].rowCount, 2500);
  } finally {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = origEnable;
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = origUrl;
  }
});

test("DatasetHistory 4: getDatasetDownloadUrl validates ID and token", async () => {
  await assert.rejects(
    async () => {
      await getDatasetDownloadUrl(null, "token");
    },
    (err) => {
      assert.ok(err.message.includes("valid dataset ID is required"));
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await getDatasetDownloadUrl("ds_12345678", null);
    },
    (err) => {
      assert.ok(err.message.includes("Authentication required"));
      return true;
    }
  );
});

test("DatasetHistory 5: getDatasetDownloadUrl handles 404 not found or cross-tenant access", async () => {
  const origEnable = process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND;
  const origUrl = process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL;
  try {
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "true";
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "https://mock-api.execute-api.ap-south-1.amazonaws.com/dev";

    global.fetch = async () => ({
      ok: false,
      status: 404,
      json: async () => ({
        error: "NotFound",
        message: "Dataset with id 'ds_other_user_99' was not found.",
      }),
    });

    await assert.rejects(
      async () => {
        await getDatasetDownloadUrl("ds_other_user_99", "mock-token");
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.ok(err.message.includes("was not found"));
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = origEnable;
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = origUrl;
  }
});

test("DatasetHistory 6: downloadDatasetCsv throws descriptive errors on expired 403 or deleted 404", async () => {
  // Test 403 Expired URL
  global.fetch = async () => ({
    ok: false,
    status: 403,
    text: async () => "<Error><Code>AccessDenied</Code></Error>",
  });

  await assert.rejects(
    async () => {
      await downloadDatasetCsv("https://s3.ap-south-1.amazonaws.com/bucket/key?expired");
    },
    (err) => {
      assert.ok(err.message.includes("expired or access was denied"));
      return true;
    }
  );

  // Test 404 Deleted Object
  global.fetch = async () => ({
    ok: false,
    status: 404,
    text: async () => "<Error><Code>NoSuchKey</Code></Error>",
  });

  await assert.rejects(
    async () => {
      await downloadDatasetCsv("https://s3.ap-south-1.amazonaws.com/bucket/key?deleted");
    },
    (err) => {
      assert.ok(err.message.includes("no longer available in cloud storage"));
      return true;
    }
  );

  global.fetch = originalFetch;
});

test("DatasetHistory 7: downloadAndReopenDataset rejects invalid or empty CSV without false reporting", async () => {
  const origEnable = process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND;
  const origUrl = process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL;
  try {
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "true";
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "https://mock-api.execute-api.ap-south-1.amazonaws.com/dev";

    global.fetch = async (url) => {
      if (url.includes("/download")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            downloadUrl: "https://mock-s3.amazonaws.com/empty.csv",
            key: "uploads/user-123/empty.csv",
            expiresIn: 60,
          }),
        };
      }
      // Return empty file from S3
      return {
        ok: true,
        status: 200,
        text: async () => "   \n  \n",
      };
    };

    await assert.rejects(
      async () => {
        await downloadAndReopenDataset(
          { id: "ds_empty", name: "empty.csv" },
          "valid-token"
        );
      },
      (err) => {
        assert.ok(err.message.includes("empty or contains only whitespace"));
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = origEnable;
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = origUrl;
  }
});

test("DatasetHistory 8: downloadAndReopenDataset HAPPY PATH downloads, parses, and recalculates live analytics", async () => {
  const origEnable = process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND;
  const origUrl = process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL;
  try {
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = "true";
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = "https://mock-api.execute-api.ap-south-1.amazonaws.com/dev";

    const mockCSV = [
      "order_id,customer,date,channel,revenue,status",
      "ORD-101,Acme Corp,2026-10-01,Enterprise,1200.50,Completed",
      "ORD-102,Beta Ltd,2026-10-02,Online,450.00,Completed",
      "ORD-103,Gamma Inc,2026-10-03,Retail,300.00,Pending",
    ].join("\n");

    const mockDatasetItem = {
      id: "ds_valid_12345",
      name: "October_Sales.csv",
      rowCount: 3,
      s3Key: "uploads/user-123/upl_xyz/October_Sales.csv",
      createdAt: "2026-10-28T02:00:00Z",
    };

    let presignedUrlCalled = false;
    let s3DownloadCalled = false;

    global.fetch = async (url) => {
      if (url.includes("/datasets/ds_valid_12345/download")) {
        presignedUrlCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            downloadUrl: "https://mock-s3.ap-south-1.amazonaws.com/uploads/user-123/upl_xyz/October_Sales.csv?token=60s",
            key: mockDatasetItem.s3Key,
            expiresIn: 60,
            dataset: mockDatasetItem,
          }),
        };
      }
      if (url.includes("mock-s3.ap-south-1.amazonaws.com")) {
        s3DownloadCalled = true;
        return {
          ok: true,
          status: 200,
          text: async () => mockCSV,
        };
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const result = await downloadAndReopenDataset(mockDatasetItem, "valid-token");

    assert.ok(presignedUrlCalled, "Must call GET /datasets/{id}/download");
    assert.ok(s3DownloadCalled, "Must download CSV from S3 presigned URL");

    // Check dataset structure
    assert.equal(result.filename, "October_Sales.csv");
    assert.equal(result.validRowCount, 3);
    assert.equal(result.cloud.isCloud, true);
    assert.equal(result.cloud.id, "ds_valid_12345");
    assert.equal(result.cloud.s3Key, mockDatasetItem.s3Key);

    // Check recalculation of analytics
    assert.ok(result.analytics);
    assert.equal(result.analytics.metrics.totalRevenue, 1950.5); // 1200.5 + 450 + 300
    assert.equal(result.analytics.metrics.totalOrders, 3);
    assert.equal(result.analytics.metrics.averageOrderValue, 650.17);
    assert.equal(result.analytics.transactions.length, 3);
  } finally {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND = origEnable;
    process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL = origUrl;
  }
});

test("DatasetHistory 9: Local mode continues working without AWS credentials or Cognito configuration", async () => {
  // Ensure local CSV parsing and analytics recalculate without AWS backend configured
  const localCSV = [
    "order_id,customer,date,channel,revenue,status",
    "LOCAL-001,Local Customer,2026-10-10,Web,88.50,Completed",
  ].join("\n");

  const parsed = await parseAndValidateCSV(localCSV, "local_data.csv");
  assert.equal(parsed.success, true);
  assert.equal(parsed.validRowCount, 1);

  const analytics = computeDashboardAnalytics(parsed.rows, parsed.headers);
  assert.equal(analytics.metrics.totalRevenue, 88.5);
  assert.equal(analytics.metrics.totalOrders, 1);

  // Local dataset object does not flag cloud
  const localDataset = {
    filename: parsed.filename,
    rows: parsed.rows,
    headers: parsed.headers,
    validRowCount: parsed.validRowCount,
    analytics,
    cloud: null,
  };

  assert.equal(localDataset.cloud, null);
  assert.equal(localDataset.analytics.metrics.totalRevenue, 88.5);
});
