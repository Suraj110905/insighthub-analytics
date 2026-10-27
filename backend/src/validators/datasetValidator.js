/**
 * Input validation for dataset metadata and file upload requests.
 */

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_\-. ]+\.csv$/i;

/**
 * Validates request payload for creating dataset metadata records.
 *
 * @param {object} payload
 * @returns {{ valid: boolean, errors: Array<string>, sanitized?: object }}
 */
export function validateCreateDatasetInput(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Request body must be a valid JSON object."] };
  }

  // 1. Dataset Name
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name || name.length === 0) {
    errors.push("Dataset 'name' is required.");
  } else if (name.length > 120) {
    errors.push("Dataset 'name' cannot exceed 120 characters.");
  }

  // 2. Row Count
  const rowCount = Number(payload.rowCount);
  if (isNaN(rowCount) || !Number.isInteger(rowCount) || rowCount <= 0) {
    errors.push("'rowCount' must be a positive integer greater than 0.");
  } else if (rowCount > 1000000) {
    errors.push("'rowCount' exceeds the maximum allowed limit of 1,000,000 records.");
  }

  // 3. Headers Array
  if (!Array.isArray(payload.headers) || payload.headers.length === 0) {
    errors.push("'headers' must be a non-empty array of column names.");
  } else if (payload.headers.length > 200) {
    errors.push("'headers' cannot contain more than 200 columns.");
  }

  // 4. Metrics Summary (Optional)
  const metrics = payload.metrics && typeof payload.metrics === "object" ? payload.metrics : {};
  const sanitizedMetrics = {
    totalRevenue: typeof metrics.totalRevenue === "number" && !isNaN(metrics.totalRevenue) ? metrics.totalRevenue : 0,
    totalOrders: typeof metrics.totalOrders === "number" && !isNaN(metrics.totalOrders) ? metrics.totalOrders : 0,
    averageOrderValue: typeof metrics.averageOrderValue === "number" && !isNaN(metrics.averageOrderValue) ? metrics.averageOrderValue : 0,
    conversionRate: typeof metrics.conversionRate === "number" && !isNaN(metrics.conversionRate) ? metrics.conversionRate : null,
  };

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    sanitized: {
      name,
      rowCount,
      columnCount: payload.headers.length,
      headers: payload.headers.map((h) => String(h).trim().slice(0, 80)),
      metrics: sanitizedMetrics,
      s3Key: payload.s3Key && typeof payload.s3Key === "string" ? payload.s3Key.trim() : null,
    },
  };
}

/**
 * Validates request payload for generating S3 presigned upload URLs.
 *
 * @param {object} payload
 * @returns {{ valid: boolean, errors: Array<string>, sanitized?: object }}
 */
export function validatePresignedUrlInput(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Request body must be a valid JSON object."] };
  }

  const filename = typeof payload.filename === "string" ? payload.filename.trim() : "";
  if (!filename) {
    errors.push("'filename' is required.");
  } else if (!SAFE_FILENAME_REGEX.test(filename)) {
    errors.push("Invalid 'filename'. Must end in .csv and contain only safe alphanumeric characters.");
  } else if (filename.length > 128) {
    errors.push("'filename' cannot exceed 128 characters.");
  }

  const fileSizeBytes = Number(payload.fileSizeBytes);
  if (isNaN(fileSizeBytes) || !Number.isInteger(fileSizeBytes) || fileSizeBytes <= 0) {
    errors.push("'fileSizeBytes' must be a positive integer greater than 0.");
  } else if (fileSizeBytes > MAX_CSV_SIZE_BYTES) {
    errors.push(`'fileSizeBytes' exceeds the 10MB limit (${MAX_CSV_SIZE_BYTES} bytes).`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    sanitized: {
      filename,
      fileSizeBytes,
    },
  };
}
