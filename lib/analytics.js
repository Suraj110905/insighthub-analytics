/**
 * lib/analytics.js
 * 
 * Dynamic Business Analytics Engine for InsightHub.
 * Calculates KPIs, groups time-series data for Recharts, detects column schemas,
 * and handles edge cases (missing columns, invalid numbers, duplicate IDs).
 */

// Common column alias variations (normalized to lowercase without spaces/underscores)
const COLUMN_ALIASES = {
  revenue: [
    "revenue", "sales", "amount", "total", "price", "ordervalue",
    "netamount", "totalamount", "grosssales", "value"
  ],
  orderId: [
    "orderid", "order_id", "transactionid", "transaction_id", "id",
    "ordernumber", "order_number", "invoiceid", "invoicenumber"
  ],
  date: [
    "date", "orderdate", "order_date", "transactiondate", "transaction_date",
    "createdat", "created_at", "timestamp", "datetime", "purchasedate"
  ],
  category: [
    "category", "channel", "productcategory", "product_category", "product",
    "source", "acquisitionchannel", "department", "type", "segment"
  ],
  status: [
    "status", "orderstatus", "order_status", "paymentstatus", "state"
  ],
  customer: [
    "customer", "customername", "customer_name", "client", "user",
    "company", "buyer", "accountname"
  ],
  visitors: [
    "visitors", "sessions", "traffic", "impressions", "visits", "leads"
  ],
  conversions: [
    "conversions", "converted", "orders", "sales_count"
  ],
};

/**
 * Normalizes a column name for fuzzy alias matching
 */
export function cleanKey(key = "") {
  return String(key).trim().toLowerCase().replace(/[\s_\-.]+/g, "");
}

/**
 * Automatically maps dataset headers to expected analytical dimensions
 */
export function detectColumnMapping(headers = []) {
  const mapping = {
    revenue: null,
    orderId: null,
    date: null,
    category: null,
    status: null,
    customer: null,
    visitors: null,
    conversions: null,
  };

  const cleanHeaderMap = headers.map((h) => ({
    original: h,
    cleaned: cleanKey(h),
  }));

  for (const [dimension, aliases] of Object.entries(COLUMN_ALIASES)) {
    // Exact or direct alias match
    const match = cleanHeaderMap.find((item) => aliases.includes(item.cleaned));
    if (match) {
      mapping[dimension] = match.original;
    }
  }

  return mapping;
}

/**
 * Safely parses a currency/numeric string into a float.
 * Does NOT silently convert unparseable text to 0.
 *
 * @param {string|number} rawValue
 * @returns {number|null} Valid float or null if invalid/empty
 */
export function parseNumericValue(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === "number") {
    return isNaN(rawValue) ? null : rawValue;
  }

  const str = String(rawValue).trim();
  if (str === "") return null;

  // Remove common currency symbols, commas, and whitespace ($ 1,240.50 -> 1240.50)
  const sanitized = str.replace(/[$€£¥,]/g, "").trim();
  const parsed = Number(sanitized);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Computes all analytics metrics, chart series, and table rows from parsed CSV rows.
 *
 * @param {Array<object>} rows - Valid parsed CSV rows
 * @param {Array<string>} headers - Detected headers
 * @returns {object} Comprehensive analytics model
 */
export function computeDashboardAnalytics(rows = [], headers = []) {
  if (!rows || rows.length === 0) {
    return {
      hasData: false,
      mapping: detectColumnMapping(headers),
      metrics: {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        conversionRate: null, // Displays N/A when conversion data not provided
      },
      revenueChartData: [],
      categoryChartData: [],
      transactions: [],
      schemaNotice: "No records to analyze.",
    };
  }

  const mapping = detectColumnMapping(headers);

  let totalRevenue = 0;
  let validRevenueCount = 0;
  let invalidRevenueCount = 0;
  const uniqueOrderIds = new Set();
  const dateRevenueMap = new Map();
  const categoryRevenueMap = new Map();

  let totalVisitors = 0;
  let hasVisitorData = false;
  let totalConversions = 0;
  let hasConversionData = false;

  const transactions = [];

  rows.forEach((row, index) => {
    // 1. Revenue Calculation
    let rowRevenue = null;
    if (mapping.revenue && row[mapping.revenue] !== undefined) {
      rowRevenue = parseNumericValue(row[mapping.revenue]);
      if (rowRevenue !== null && rowRevenue >= 0) {
        totalRevenue += rowRevenue;
        validRevenueCount++;
      } else if (row[mapping.revenue].trim() !== "") {
        invalidRevenueCount++;
      }
    }

    // 2. Order ID Tracking
    let orderIdentifier = null;
    if (mapping.orderId && row[mapping.orderId]) {
      orderIdentifier = String(row[mapping.orderId]).trim();
      if (orderIdentifier) {
        uniqueOrderIds.add(orderIdentifier);
      }
    }

    // 3. Date Grouping for Time-Series Chart
    if (mapping.date && row[mapping.date] && rowRevenue !== null) {
      const rawDateStr = String(row[mapping.date]).trim();
      const parsedDate = new Date(rawDateStr);
      let dateKey = rawDateStr;

      if (!isNaN(parsedDate.getTime())) {
        // Group by Month Year (e.g., "Jan 2026")
        dateKey = parsedDate.toLocaleString("en-US", { month: "short", year: "numeric" });
      }

      if (!dateRevenueMap.has(dateKey)) {
        dateRevenueMap.set(dateKey, {
          month: dateKey,
          revenue: 0,
          orders: 0,
          sortTimestamp: !isNaN(parsedDate.getTime()) ? parsedDate.getTime() : 0,
        });
      }
      const dateEntry = dateRevenueMap.get(dateKey);
      dateEntry.revenue += rowRevenue;
      dateEntry.orders += 1;
    }

    // 4. Category / Channel Grouping for Bar Chart
    if (mapping.category && row[mapping.category] && rowRevenue !== null) {
      const categoryKey = String(row[mapping.category]).trim() || "Uncategorized";
      categoryRevenueMap.set(
        categoryKey,
        (categoryRevenueMap.get(categoryKey) || 0) + rowRevenue
      );
    }

    // 5. Visitor / Conversion data for Conversion Rate
    if (mapping.visitors && row[mapping.visitors] !== undefined) {
      const v = parseNumericValue(row[mapping.visitors]);
      if (v !== null && v > 0) {
        totalVisitors += v;
        hasVisitorData = true;
      }
    }
    if (mapping.conversions && row[mapping.conversions] !== undefined) {
      const c = parseNumericValue(row[mapping.conversions]);
      if (c !== null && c >= 0) {
        totalConversions += c;
        hasConversionData = true;
      }
    }

    // 6. Build Clean Transaction Table Record
    transactions.push({
      id: orderIdentifier || `ORD-${String(index + 1).padStart(4, "0")}`,
      customer: mapping.customer && row[mapping.customer] ? row[mapping.customer] : `Customer ${index + 1}`,
      channel: mapping.category && row[mapping.category] ? row[mapping.category] : "General",
      date: mapping.date && row[mapping.date] ? row[mapping.date] : "N/A",
      amount: rowRevenue !== null ? rowRevenue : 0,
      status: mapping.status && row[mapping.status] ? row[mapping.status] : "Completed",
      raw: row,
    });
  });

  // Calculate Order Count
  const totalOrders = mapping.orderId && uniqueOrderIds.size > 0
    ? uniqueOrderIds.size
    : rows.length;

  // Calculate Average Order Value
  const averageOrderValue = totalOrders > 0
    ? Number((totalRevenue / totalOrders).toFixed(2))
    : 0;

  // Calculate Conversion Rate only if legitimate visitor/session metrics exist
  let conversionRate = null;
  if (hasVisitorData && totalVisitors > 0) {
    const conversionsToUse = hasConversionData ? totalConversions : totalOrders;
    conversionRate = Number(((conversionsToUse / totalVisitors) * 100).toFixed(2));
  }

  // Format Revenue Chart Data (sorted chronologically if dates parsed)
  const revenueChartData = Array.from(dateRevenueMap.values())
    .sort((a, b) => a.sortTimestamp - b.sortTimestamp)
    .map((item) => ({
      month: item.month,
      revenue: Math.round(item.revenue),
      orders: item.orders,
    }));

  // Format Category Chart Data
  const sortedCategories = Array.from(categoryRevenueMap.entries())
    .sort((a, b) => b[1] - a[1]);

  const categoryChartData = sortedCategories.map(([channel, catRevenue]) => ({
    channel,
    revenue: Math.round(catRevenue),
    percentage: totalRevenue > 0 ? Number(((catRevenue / totalRevenue) * 100).toFixed(1)) : 0,
  }));

  // Generate Informative Schema Notice if columns are missing
  const missingColumns = [];
  if (!mapping.revenue) missingColumns.push("Revenue/Sales/Amount");
  if (!mapping.orderId) missingColumns.push("Order ID");
  if (!mapping.date) missingColumns.push("Date");
  if (!mapping.category) missingColumns.push("Category/Channel");

  return {
    hasData: true,
    mapping,
    metrics: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      conversionRate, // null => "N/A"
      validRevenueCount,
      invalidRevenueCount,
    },
    revenueChartData,
    categoryChartData,
    transactions,
    missingColumns,
    schemaNotice: missingColumns.length > 0
      ? `Notice: Some columns were not automatically recognized: ${missingColumns.join(", ")}. Fallback grouping applied.`
      : null,
  };
}

/**
 * Formats a raw number as a standard USD currency string.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "$0.00";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Exports an array of transaction records to a downloadable CSV string.
 *
 * @param {Array<object>} records
 * @returns {string} CSV formatted content
 */
export function exportRecordsToCSV(records = []) {
  if (!records || !records.length) return "";

  const headers = ["Order ID", "Customer", "Channel", "Date", "Amount", "Status"];
  const rows = records.map((r) => [
    `"${String(r.id || "").replace(/"/g, '""')}"`,
    `"${String(r.customer || "").replace(/"/g, '""')}"`,
    `"${String(r.channel || "").replace(/"/g, '""')}"`,
    `"${String(r.date || "").replace(/"/g, '""')}"`,
    typeof r.amount === "number" ? r.amount.toFixed(2) : `"${r.amount}"`,
    `"${String(r.status || "").replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
