/**
 * InsightHub AWS Backend & Cognito Client Integration.
 * 
 * Safely abstracts communication with AWS API Gateway, Amazon Cognito, and Amazon S3.
 * Preserves local client-side offline operation when AWS backend is disabled.
 */

import { parseAndValidateCSV } from "./csvParser.js";
import { computeDashboardAnalytics } from "./analytics.js";

export const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

/**
 * Checks whether the AWS cloud backend is configured and enabled.
 * Dynamically checks process.env to allow runtime and test environment toggling.
 * @returns {boolean}
 */
export function isAwsBackendConfigured() {
  return (
    process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND === "true" &&
    Boolean(process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL)
  );
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL || "";
}

/**
 * Custom error class for cloud upload failures.
 * Clearly flags partial failure states when S3 upload succeeded but DynamoDB metadata creation failed.
 */
export class CloudUploadError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "CloudUploadError";
    this.step = options.step || "unknown"; // "presign" | "s3" | "metadata"
    this.isPartialFailure = Boolean(options.isPartialFailure);
    this.s3Key = options.s3Key || null;
    this.status = options.status || null;
    this.details = options.details || null;
  }
}



/**
 * Uploads a validated CSV file directly to private Amazon S3 using a Presigned POST policy.
 * 
 * Enforces S3-level 10MB limit and Content-Type verification without passing bytes through Lambda.
 * 
 * @param {object} presignedPost - Policy object returned from POST /datasets/presigned-url
 * @param {string} presignedPost.url - S3 bucket endpoint URL
 * @param {object} presignedPost.fields - Policy fields and signature returned by S3
 * @param {File|Blob} file - The CSV file to upload
 * @returns {Promise<boolean>} True if upload succeeded
 */
export async function uploadCsvToS3PresignedPost(presignedPost, file) {
  if (!presignedPost || !presignedPost.url || !presignedPost.fields) {
    throw new CloudUploadError("Invalid presigned POST policy object received from server.", {
      step: "s3",
    });
  }

  // Build multipart FormData required by S3 presigned POST
  const formData = new FormData();

  // 1. Policy fields MUST come before the file field
  Object.entries(presignedPost.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  // 2. Attach file payload as the final field
  formData.append("file", file);

  let response;
  try {
    response = await fetch(presignedPost.url, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    throw new CloudUploadError(`Network error communicating with Amazon S3: ${err.message}`, {
      step: "s3",
    });
  }

  // S3 returns 204 No Content or 200 OK on successful POST
  if (response.status === 200 || response.status === 204) {
    return true;
  }

  const errorText = await response.text().catch(() => "");
  let userFriendlyMsg = `S3 upload was rejected (HTTP ${response.status}).`;

  if (errorText.includes("EntityTooLarge") || response.status === 400) {
    userFriendlyMsg = "File exceeds the 10 MB maximum upload limit enforced by Amazon S3.";
  } else if (response.status === 403) {
    userFriendlyMsg = "Amazon S3 upload policy expired or signature was invalid.";
  }

  throw new CloudUploadError(userFriendlyMsg, {
    step: "s3",
    status: response.status,
    details: errorText,
  });
}

/**
 * Authenticated API caller for InsightHub API Gateway endpoints.
 * 
 * Attaches verified Cognito JWT Bearer token to protected routes.
 * 
 * @param {string} endpoint - API path (e.g. '/datasets')
 * @param {object} [options] - Fetch options
 * @param {string} [token] - Verified Cognito ID token
 * @returns {Promise<any>}
 */
export async function callApi(endpoint, options = {}, token = null) {
  if (!isAwsBackendConfigured()) {
    throw new Error("AWS Backend is not enabled. Running in local browser-only mode.");
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new Error(`Failed to reach API Gateway (${endpoint}): ${err.message}`);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMsg = data?.message || data?.error || `Request failed with HTTP ${response.status}`;
    if (response.status === 401) {
      errorMsg = "Your session has expired or is unauthorized. Please sign in again.";
    } else if (response.status === 403) {
      errorMsg = "Access denied by API Gateway. Insufficient permissions.";
    }

    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

/**
 * Requests an S3 presigned POST upload policy from API Gateway.
 * 
 * @param {object} params
 * @param {string} params.filename
 * @param {number} params.fileSizeBytes
 * @param {string} [params.contentType]
 * @param {string} token - Verified Cognito ID token
 * @returns {Promise<object>} S3 Presigned POST data
 */
export async function requestPresignedUploadPost({ filename, fileSizeBytes, contentType = "text/csv" }, token) {
  if (!token) {
    throw new CloudUploadError("Authentication required. Please sign in to request upload credentials.", {
      step: "presign",
      status: 401,
    });
  }

  if (fileSizeBytes > MAX_CSV_SIZE_BYTES) {
    throw new CloudUploadError("File exceeds the 10 MB maximum upload limit.", {
      step: "presign",
      status: 400,
    });
  }

  try {
    const data = await callApi(
      "/datasets/presigned-url",
      {
        method: "POST",
        body: JSON.stringify({ filename, fileSizeBytes, contentType }),
      },
      token
    );
    return data;
  } catch (err) {
    throw new CloudUploadError(`Failed to generate secure upload credentials: ${err.message}`, {
      step: "presign",
      status: err.status,
      details: err.details,
    });
  }
}

/**
 * Saves dataset metadata summary in DynamoDB after successful S3 upload.
 * 
 * @param {object} params
 * @param {string} params.name
 * @param {number} params.rowCount
 * @param {Array<string>} params.headers
 * @param {object} params.metrics
 * @param {string} params.s3Key - Exact S3 key returned by presigned POST endpoint
 * @param {string} token - Verified Cognito ID token
 * @returns {Promise<object>} Stored dataset item
 */
export async function saveDatasetMetadata({ name, rowCount, headers, metrics, s3Key }, token) {
  if (!token) {
    throw new CloudUploadError("Authentication required to save dataset metadata.", {
      step: "metadata",
      status: 401,
    });
  }

  if (!s3Key) {
    throw new CloudUploadError("Missing verified s3Key. S3 upload must complete before saving metadata.", {
      step: "metadata",
    });
  }

  try {
    const data = await callApi(
      "/datasets",
      {
        method: "POST",
        body: JSON.stringify({ name, rowCount, headers, metrics, s3Key }),
      },
      token
    );
    return data;
  } catch (err) {
    throw new CloudUploadError(`Failed to save dataset metadata in DynamoDB: ${err.message}`, {
      step: "metadata",
      status: err.status,
      details: err.details,
    });
  }
}

/**
 * High-level pipeline: Orchestrates full cloud dataset upload.
 * 
 * Sequence:
 * 1. Request S3 Presigned POST URL & key from API Gateway
 * 2. Upload raw CSV directly to Amazon S3
 * 3. Save structural metadata in DynamoDB
 * 
 * Handles partial failures: If S3 succeeds but DynamoDB metadata fails,
 * throws CloudUploadError with isPartialFailure: true and s3Key.
 * 
 * @param {object} params
 * @param {File|Blob} params.file
 * @param {number} params.validRowCount
 * @param {Array<string>} params.headers
 * @param {object} params.metrics
 * @param {string} params.token - Verified Cognito ID token
 * @param {Function} [params.onProgress] - Optional status progress callback
 * @returns {Promise<object>} Stored cloud dataset record
 */
export async function uploadDatasetToCloud({
  file,
  validRowCount,
  headers,
  metrics,
  token,
  onProgress = () => {},
}) {
  if (!file) throw new Error("File is required for upload.");
  if (!token) throw new CloudUploadError("You must be signed in to upload to AWS.", { status: 401 });

  // 1. Get presigned POST policy
  onProgress("Requesting S3 upload policy...");
  const presignData = await requestPresignedUploadPost(
    {
      filename: file.name,
      fileSizeBytes: file.size,
      contentType: "text/csv",
    },
    token
  );

  const { url, fields, key } = presignData;
  if (!url || !fields || !key) {
    throw new CloudUploadError("Server returned incomplete S3 presigned credentials.", {
      step: "presign",
    });
  }

  // 2. Upload file directly to S3
  onProgress("Uploading CSV directly to private Amazon S3...");
  await uploadCsvToS3PresignedPost({ url, fields }, file);

  // 3. Save metadata record in DynamoDB
  onProgress("Saving dataset metadata in DynamoDB...");
  let metadataResult;
  try {
    metadataResult = await saveDatasetMetadata(
      {
        name: file.name,
        rowCount: validRowCount,
        headers,
        metrics,
        s3Key: key,
      },
      token
    );
  } catch (err) {
    // S3 succeeded, but DynamoDB metadata failed: PARTIAL FAILURE
    throw new CloudUploadError(
      `S3 upload succeeded, but saving dataset metadata to DynamoDB failed: ${err.message}. The raw file is securely stored in S3, but its metadata is not indexed.`,
      {
        step: "metadata",
        isPartialFailure: true,
        s3Key: key,
        status: err.status,
      }
    );
  }

  onProgress("Upload complete!");
  return {
    success: true,
    dataset: metadataResult.dataset,
    s3Key: key,
  };
}

/**
 * Fetches the authenticated user's saved datasets from DynamoDB via GET /datasets.
 * 
 * @param {string} token - Verified Cognito ID token
 * @returns {Promise<{ items: Array<object>, count: number }>}
 */
export async function listUserDatasets(token) {
  if (!token) {
    throw new Error("Authentication required. Please sign in to view cloud datasets.");
  }

  const data = await callApi("/datasets", { method: "GET" }, token);
  return {
    items: data.items || [],
    count: data.count || 0,
  };
}

/**
 * Requests a short-lived (60s) S3 presigned GET URL for downloading a dataset CSV.
 * 
 * @param {string} datasetId - Unique dataset identifier (e.g. ds_...)
 * @param {string} token - Verified Cognito ID token
 * @returns {Promise<{ downloadUrl: string, key: string, expiresIn: number, dataset: object }>}
 */
export async function getDatasetDownloadUrl(datasetId, token) {
  if (!datasetId || typeof datasetId !== "string") {
    throw new Error("A valid dataset ID is required to generate a download URL.");
  }
  if (!token) {
    throw new Error("Authentication required. Please sign in to download datasets.");
  }

  const endpoint = `/datasets/${encodeURIComponent(datasetId)}/download`;
  return await callApi(endpoint, { method: "GET" }, token);
}

/**
 * Securely fetches the raw CSV text from Amazon S3 using a short-lived presigned GET URL.
 * 
 * @param {string} downloadUrl - Presigned S3 GET URL
 * @returns {Promise<string>} Raw CSV content string
 */
export async function downloadDatasetCsv(downloadUrl) {
  if (!downloadUrl || typeof downloadUrl !== "string") {
    throw new Error("Download URL is required.");
  }

  let response;
  try {
    response = await fetch(downloadUrl, { method: "GET" });
  } catch (err) {
    throw new Error(`Network failure downloading dataset from storage: ${err.message}`);
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("The secure download link has expired or access was denied. Please try reopening the dataset.");
    }
    if (response.status === 404) {
      throw new Error("The requested dataset file is no longer available in cloud storage.");
    }
    throw new Error(`Failed to download dataset from storage (HTTP ${response.status}).`);
  }

  return await response.text();
}

/**
 * High-level pipeline: Downloads, parses, and recalculates analytics for an AWS cloud dataset.
 * 
 * 1. Requests a short-lived presigned GET URL from API Gateway.
 * 2. Fetches raw CSV text directly from Amazon S3.
 * 3. Parses CSV with header normalization and error detection.
 * 4. Recalculates full dashboard KPIs, time-series revenue, channel breakdown, and transactions.
 * 5. Returns custom dataset structure formatted for dashboard integration with source set to AWS Cloud.
 * 
 * @param {object} dataset - Metadata record from DynamoDB (with id, name, rowCount, s3Key, etc.)
 * @param {string} token - Verified Cognito ID token
 * @param {Function} [onProgress] - Optional progress notification callback
 * @returns {Promise<object>} Complete dashboard-ready dataset object
 */
export async function downloadAndReopenDataset(dataset, token, onProgress = () => {}) {
  if (!dataset || !dataset.id) {
    throw new Error("Invalid dataset: missing dataset id.");
  }
  if (!token) {
    throw new Error("Authentication required. Please sign in to reopen saved datasets.");
  }

  onProgress("Requesting secure download link from AWS...");
  const presignResult = await getDatasetDownloadUrl(dataset.id, token);

  const downloadUrl = presignResult.downloadUrl;
  if (!downloadUrl) {
    throw new Error("Server did not return a valid download URL.");
  }

  onProgress("Downloading dataset from private cloud storage...");
  const csvText = await downloadDatasetCsv(downloadUrl);

  onProgress("Parsing CSV and validating records...");
  const fileName = dataset.name || "cloud-dataset.csv";
  const parsed = await parseAndValidateCSV(csvText, fileName);

  if (!parsed.success) {
    throw new Error(parsed.error || "Failed to parse downloaded CSV data.");
  }

  onProgress("Recalculating business analytics and metrics...");
  const analytics = computeDashboardAnalytics(parsed.rows, parsed.headers);

  onProgress("Dataset ready!");
  return {
    filename: fileName,
    headers: parsed.headers,
    rows: parsed.rows,
    validRowCount: parsed.validRowCount,
    skippedRowCount: parsed.skippedRowCount,
    skippedRows: parsed.skippedRows,
    warnings: parsed.warnings,
    analytics,
    cloud: {
      isCloud: true,
      id: dataset.id,
      name: fileName,
      s3Key: dataset.s3Key || presignResult.key,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
    },
  };
}
