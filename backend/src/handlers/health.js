import { success } from "../utils/response.js";

/**
 * GET /health
 * 
 * Simple health check endpoint to confirm API Gateway and Lambda availability.
 */
export async function handler() {
  return success({
    status: "healthy",
    service: "insighthub-api",
    version: "1.0.0",
    environment: process.env.ENVIRONMENT || "dev",
    timestamp: new Date().toISOString(),
    corsOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  });
}
