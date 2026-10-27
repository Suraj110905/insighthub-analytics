/**
 * scripts/test-analytics.js
 * 
 * Comprehensive test suite for CSV parsing and KPI calculations.
 * Uses Node.js built-in test runner (no extra dependencies required).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { parseAndValidateCSV } from "../lib/csvParser.js";
import {
  computeDashboardAnalytics,
  detectColumnMapping,
  parseNumericValue,
  exportRecordsToCSV,
} from "../lib/analytics.js";

test("1. Valid CSV with quotes, commas, and escapes parses correctly", async () => {
  const csvContent = `order_id,customer,date,channel,revenue,status
"ORD-1001","Acme, Inc.","2026-01-15","Direct","1,250.00","Completed"
"ORD-1002","Nova ""Prime"" Retail","2026-01-16","Organic","840.50","Processing"`;

  const parsed = await parseAndValidateCSV(csvContent, "test.csv");
  assert.equal(parsed.success, true);
  assert.equal(parsed.validRowCount, 2);
  assert.equal(parsed.rows[0]["customer"], "Acme, Inc.");
  assert.equal(parsed.rows[1]["customer"], 'Nova "Prime" Retail');

  const analytics = computeDashboardAnalytics(parsed.rows, parsed.headers);
  assert.equal(analytics.metrics.totalRevenue, 2090.5);
  assert.equal(analytics.metrics.totalOrders, 2);
  assert.equal(analytics.metrics.averageOrderValue, 1045.25);
  assert.equal(analytics.metrics.conversionRate, null); // N/A
});

test("2. Detects column aliases (sales, transaction_id, product_category)", () => {
  const headers = ["transaction_id", "client", "sales", "product_category", "created_at"];
  const mapping = detectColumnMapping(headers);

  assert.equal(mapping.orderId, "transaction_id");
  assert.equal(mapping.customer, "client");
  assert.equal(mapping.revenue, "sales");
  assert.equal(mapping.category, "product_category");
  assert.equal(mapping.date, "created_at");
});

test("3. Handles missing columns gracefully without crashing", async () => {
  const csvContent = `item_name,quantity,color
Widget,5,Blue
Gadget,10,Red`;

  const parsed = await parseAndValidateCSV(csvContent, "incomplete.csv");
  assert.equal(parsed.success, true);

  const analytics = computeDashboardAnalytics(parsed.rows, parsed.headers);
  assert.equal(analytics.metrics.totalRevenue, 0);
  assert.ok(analytics.missingColumns.includes("Revenue/Sales/Amount"));
  assert.ok(analytics.missingColumns.includes("Order ID"));
  assert.ok(analytics.schemaNotice.includes("Some columns were not automatically recognized"));
});

test("4. Invalid numbers are NOT silently treated as zero", () => {
  assert.equal(parseNumericValue("invalid_amount"), null);
  assert.equal(parseNumericValue("N/A"), null);
  assert.equal(parseNumericValue(""), null);
  assert.equal(parseNumericValue(undefined), null);

  assert.equal(parseNumericValue("$1,500.50"), 1500.5);
  assert.equal(parseNumericValue("250"), 250);
  assert.equal(parseNumericValue(0), 0);
});

test("5. Duplicate order IDs are deduplicated for Total Orders count", async () => {
  const csvContent = `order_id,customer,revenue
ORD-99,Customer A,100
ORD-99,Customer A,50
ORD-100,Customer B,200`;

  const parsed = await parseAndValidateCSV(csvContent, "duplicates.csv");
  const analytics = computeDashboardAnalytics(parsed.rows, parsed.headers);

  assert.equal(analytics.metrics.totalRevenue, 350);
  assert.equal(analytics.metrics.totalOrders, 2); // ORD-99 and ORD-100 (2 unique orders)
  assert.equal(analytics.metrics.averageOrderValue, 175);
});

test("6. Empty files and whitespace-only files are rejected safely", async () => {
  const emptyRes = await parseAndValidateCSV("", "empty.csv");
  assert.equal(emptyRes.success, false);
  assert.ok(emptyRes.error.includes("empty"));

  const wsRes = await parseAndValidateCSV("   \n\n  \t  ", "spaces.csv");
  assert.equal(wsRes.success, false);
});

test("7. Handles empty or duplicate header names safely", async () => {
  const csvContent = `order_id,,revenue,revenue
ORD-01,Alpha,500,500`;

  const parsed = await parseAndValidateCSV(csvContent, "bad_headers.csv");
  assert.equal(parsed.success, true);
  assert.ok(parsed.headers.includes("column_2")); // Empty header replaced
  assert.ok(parsed.headers.includes("revenue_2")); // Duplicate header renamed
});

test("8. Exports records to CSV correctly", () => {
  const records = [
    { id: "ORD-1", customer: "Test Corp", channel: "Direct", date: "2026-01-01", amount: 150.0, status: "Completed" },
  ];
  const csv = exportRecordsToCSV(records);
  assert.ok(csv.includes("Order ID,Customer,Channel,Date,Amount,Status"));
  assert.ok(csv.includes('"ORD-1","Test Corp","Direct","2026-01-01",150.00,"Completed"'));
});
