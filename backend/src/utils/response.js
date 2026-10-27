/**
 * Standard HTTP response builder for AWS API Gateway Lambda Proxy integration.
 * Ensures consistent JSON formatting and configurable CORS headers.
 */

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

/**
 * Returns standard CORS headers based on configured frontend origin
 */
export function getCorsHeaders(overrideOrigin = null) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": overrideOrigin || FRONTEND_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Max-Age": "3600",
    "X-Content-Type-Options": "nosniff",
  };
}

/**
 * Creates an API Gateway response object
 * 
 * @param {number} statusCode
 * @param {object} body
 * @param {object} extraHeaders
 * @returns {object} API Gateway proxy result
 */
export function buildResponse(statusCode, body = {}, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...getCorsHeaders(),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function success(body = {}, statusCode = 200) {
  return buildResponse(statusCode, body);
}

export function created(body = {}) {
  return buildResponse(201, body);
}

export function badRequest(message = "Invalid request payload", details = null) {
  return buildResponse(400, {
    error: "BadRequest",
    message,
    ...(details && { details }),
  });
}

export function notFound(message = "Resource not found") {
  return buildResponse(404, {
    error: "NotFound",
    message,
  });
}

export function serverError(message = "Internal server error") {
  return buildResponse(500, {
    error: "InternalServerError",
    message,
  });
}
