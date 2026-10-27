/**
 * InsightHub AWS Backend & Cognito Client Integration.
 * 
 * Safely abstracts communication with AWS API Gateway, Amazon Cognito, and S3.
 * Preserves local client-side offline operation when AWS backend is disabled.
 */

const IS_AWS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AWS_BACKEND === "true";
const API_BASE_URL = process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL || "";

/**
 * Checks whether the AWS cloud backend is configured and enabled.
 * @returns {boolean}
 */
export function isAwsBackendConfigured() {
  return IS_AWS_ENABLED && Boolean(API_BASE_URL);
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
    throw new Error("Invalid presigned POST policy object.");
  }

  // Build multipart FormData required by S3 presigned POST
  const formData = new FormData();

  // 1. Policy fields MUST come before the file field
  Object.entries(presignedPost.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  // 2. Attach file payload as the final field
  formData.append("file", file);

  const response = await fetch(presignedPost.url, {
    method: "POST",
    body: formData,
  });

  // S3 returns 204 No Content or 200 OK on successful POST
  if (response.status === 200 || response.status === 204) {
    return true;
  }

  const errorText = await response.text();
  throw new Error(`S3 upload rejected (HTTP ${response.status}): ${errorText}`);
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

  const url = `${API_BASE_URL.replace(/\/$/, "")}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with HTTP ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}
