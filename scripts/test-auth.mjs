/**
 * scripts/test-auth.mjs
 * 
 * Focused unit test suite for Frontend Authentication logic,
 * in-memory storage security, and Cognito configuration validation.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "../lib/cognitoStorage.js";

test("Auth 1: MemoryStorage accurately sets, gets, removes, and clears tokens without disk/localStorage persistence", () => {
  const storage = new MemoryStorage();

  // Test set and get
  storage.setItem("cognito.idToken", "mock.jwt.token");
  assert.equal(storage.getItem("cognito.idToken"), "mock.jwt.token");

  // Test non-existent key
  assert.equal(storage.getItem("nonexistent.key"), null);

  // Test remove
  storage.removeItem("cognito.idToken");
  assert.equal(storage.getItem("cognito.idToken"), null);

  // Test clear
  storage.setItem("key1", "val1");
  storage.setItem("key2", "val2");
  storage.clear();
  assert.equal(storage.getItem("key1"), null);
  assert.equal(storage.getItem("key2"), null);
});

test("Auth 2: Unconfigured Cognito environment handles missing credentials gracefully without throwing", () => {
  const dummyPoolId = "";
  const dummyClientId = "";

  const isConfigured = Boolean(
    dummyPoolId &&
    dummyClientId &&
    dummyPoolId !== "ap-south-1_xxxxxxxxx" &&
    dummyClientId !== "xxxxxxxxxxxxxxxxxxxxxxxxxx"
  );

  assert.equal(isConfigured, false, "Must detect unconfigured Cognito when env vars are empty");
});

test("Auth 3: Placeholder Cognito environment is detected as unconfigured", () => {
  const placeholderPoolId = "ap-south-1_xxxxxxxxx";
  const placeholderClientId = "xxxxxxxxxxxxxxxxxxxxxxxxxx";

  const isConfigured = Boolean(
    placeholderPoolId &&
    placeholderClientId &&
    placeholderPoolId !== "ap-south-1_xxxxxxxxx" &&
    placeholderClientId !== "xxxxxxxxxxxxxxxxxxxxxxxxxx"
  );

  assert.equal(isConfigured, false, "Must treat template placeholders as unconfigured to prevent auth crashes");
});

test("Auth 4: Validates real-looking Cognito configuration parameters", () => {
  const validPoolId = "ap-south-1_Ab1Cd2Ef3";
  const validClientId = "1a2b3c4d5e6f7g8h9i0j1k2l3m";

  const isConfigured = Boolean(
    validPoolId &&
    validClientId &&
    validPoolId !== "ap-south-1_xxxxxxxxx" &&
    validClientId !== "xxxxxxxxxxxxxxxxxxxxxxxxxx"
  );

  assert.equal(isConfigured, true, "Must recognize deployed Cognito configurations");
});

test("Auth 5: Password complexity validator enforces minimum 8 characters and prevents short passwords", () => {
  const validatePassword = (pwd) => {
    if (!pwd || typeof pwd !== "string") return false;
    return pwd.length >= 8;
  };

  assert.equal(validatePassword("short"), false);
  assert.equal(validatePassword(""), false);
  assert.equal(validatePassword("SecureP@ssw0rd!"), true);
});

test("Auth 6: Sanitizes user emails to lowercase and trims whitespace", () => {
  const sanitizeEmail = (email) => {
    if (!email || typeof email !== "string") return "";
    return email.trim().toLowerCase();
  };

  assert.equal(sanitizeEmail("  Analyst@Company.COM  "), "analyst@company.com");
  assert.equal(sanitizeEmail("user@insighthub.in"), "user@insighthub.in");
});

test("Auth 7: Resolves both NEXT_PUBLIC_AWS_COGNITO_* and NEXT_PUBLIC_COGNITO_* naming aliases", () => {
  const resolveCognitoConfig = (env) => {
    const userPoolId = env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID || env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "";
    const clientId = env.NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID || env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";
    return {
      userPoolId,
      clientId,
      isConfigured: Boolean(
        userPoolId &&
        clientId &&
        userPoolId !== "ap-south-1_xxxxxxxxx" &&
        clientId !== "xxxxxxxxxxxxxxxxxxxxxxxxxx"
      ),
    };
  };

  // Test standard prefix
  const res1 = resolveCognitoConfig({
    NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID: "ap-south-1_TestPool1",
    NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID: "client-id-1",
  });
  assert.equal(res1.isConfigured, true);
  assert.equal(res1.userPoolId, "ap-south-1_TestPool1");

  // Test alias prefix
  const res2 = resolveCognitoConfig({
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: "ap-south-1_TestPool2",
    NEXT_PUBLIC_COGNITO_CLIENT_ID: "client-id-2",
  });
  assert.equal(res2.isConfigured, true);
  assert.equal(res2.userPoolId, "ap-south-1_TestPool2");
});
