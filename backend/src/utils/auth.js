/**
 * Authentication and identity helper for API Gateway Lambda Proxy integration.
 * Extracts verified user claims injected by the API Gateway Cognito Authorizer.
 */

/**
 * Extracts and verifies the authenticated user from the API Gateway Lambda event.
 * 
 * In production with Cognito Authorizer, API Gateway verifies the JWT token
 * and injects validated claims into: event.requestContext.authorizer.claims
 * 
 * The primary identifier is the Cognito `sub` (subject UUID).
 * 
 * @param {object} event - API Gateway Lambda Proxy event
 * @returns {{ userId: string, email?: string } | null} Authenticated user or null if unauthenticated
 */
export function getAuthenticatedUser(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  // 1. Production Path: Extract verified claims from Cognito Authorizer
  const claims = event.requestContext?.authorizer?.claims;
  if (claims && typeof claims === "object") {
    const sub = claims.sub || claims["cognito:username"];
    if (sub && typeof sub === "string" && sub.trim()) {
      return {
        userId: sub.trim(),
        email: typeof claims.email === "string" ? claims.email.trim() : undefined,
      };
    }
  }

  // 2. Safe Local/Test Development Path (NEVER enabled in production)
  const isProd = process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "prod";
  const mockAuthAllowed = !isProd && (process.env.NODE_ENV === "test" || process.env.ENABLE_LOCAL_MOCK_AUTH === "true");

  if (mockAuthAllowed) {
    // Check for explicit test context injection
    const testMockUser = event.requestContext?.authorizer?.mockUser;
    if (testMockUser && typeof testMockUser.userId === "string" && testMockUser.userId.trim()) {
      return {
        userId: testMockUser.userId.trim(),
        email: testMockUser.email || "test@insighthub.local",
      };
    }

    // Check for development header (only in explicit local mock mode)
    const mockHeader = event.headers?.["x-mock-user-id"] || event.headers?.["X-Mock-User-Id"];
    if (mockHeader && typeof mockHeader === "string" && mockHeader.trim()) {
      return {
        userId: mockHeader.trim(),
        email: event.headers?.["x-mock-user-email"] || "dev-user@insighthub.local",
      };
    }
  }

  // No verified authentication found
  return null;
}
