import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("SAM Template: structure and security rules validation", () => {
  const templatePath = path.resolve("template.yaml");
  assert.ok(fs.existsSync(templatePath), "template.yaml must exist");

  const content = fs.readFileSync(templatePath, "utf-8");

  // 1. SAM Transform and Version
  assert.ok(content.includes("AWSTemplateFormatVersion: '2010-09-09'"), "Must have standard template format version");
  assert.ok(content.includes("Transform: AWS::Serverless-2016-10-31"), "Must declare SAM transform");

  // 2. Strict constraint: NO EC2 resources
  assert.ok(!content.includes("AWS::EC2::"), "Must NOT define any EC2 resources");

  // 3. Strict constraint: NO hardcoded secrets or credentials
  assert.ok(!content.includes("AKIA"), "Must not contain hardcoded AWS access key IDs");
  assert.ok(!content.includes("aws_secret_access_key"), "Must not contain secret access keys");

  // 4. DynamoDB Billing Mode & Composite Multi-Tenant Key Schema
  assert.ok(content.includes("BillingMode: PAY_PER_REQUEST"), "DynamoDB table must use on-demand billing mode");
  assert.ok(content.includes("DatasetsTable:"), "Must declare DatasetsTable resource");
  assert.ok(content.includes("AttributeName: userId"), "DynamoDB must declare userId attribute definition");
  assert.ok(content.includes("AttributeName: id"), "DynamoDB must declare id attribute definition");
  assert.ok(content.includes("KeyType: HASH"), "DynamoDB must configure HASH key");
  assert.ok(content.includes("KeyType: RANGE"), "DynamoDB must configure RANGE key for multi-tenant isolation");

  // 5. S3 Security: Block Public Access & Encryption
  assert.ok(content.includes("BlockPublicAcls: true"), "S3 must block public ACLs");
  assert.ok(content.includes("BlockPublicPolicy: true"), "S3 must block public policy");
  assert.ok(content.includes("IgnorePublicAcls: true"), "S3 must ignore public ACLs");
  assert.ok(content.includes("RestrictPublicBuckets: true"), "S3 must restrict public buckets");
  assert.ok(content.includes("SSEAlgorithm: AES256"), "S3 must have default encryption enabled");

  // 6. CloudWatch Log Retention: 14 Days for all functions
  assert.ok(content.includes("HealthFunctionLogGroup:"), "Must declare HealthFunctionLogGroup");
  assert.ok(content.includes("CreateDatasetFunctionLogGroup:"), "Must declare CreateDatasetFunctionLogGroup");
  assert.ok(content.includes("ListDatasetsFunctionLogGroup:"), "Must declare ListDatasetsFunctionLogGroup");
  assert.ok(content.includes("GetDatasetFunctionLogGroup:"), "Must declare GetDatasetFunctionLogGroup");
  assert.ok(content.includes("GetPresignedUrlFunctionLogGroup:"), "Must declare GetPresignedUrlFunctionLogGroup");
  assert.ok(content.includes("GetDatasetDownloadUrlFunctionLogGroup:"), "Must declare GetDatasetDownloadUrlFunctionLogGroup");
  assert.ok(content.includes("GetDatasetDownloadUrlFunction:"), "Must declare GetDatasetDownloadUrlFunction");
  assert.ok(content.includes("RetentionInDays: 14"), "Must configure 14 days retention in log groups");

  // 7. Cognito User Pool & User Pool Client
  assert.ok(content.includes("AWS::Cognito::UserPool"), "Must declare AWS::Cognito::UserPool resource");
  assert.ok(content.includes("AWS::Cognito::UserPoolClient"), "Must declare AWS::Cognito::UserPoolClient resource");
  assert.ok(content.includes("GenerateSecret: false"), "Client must not generate client secret (SPA Next.js)");
  assert.ok(content.includes("MinimumLength: 8"), "Must configure secure password minimum length");

  // 8. API Gateway Cognito Authorizer
  assert.ok(content.includes("DefaultAuthorizer: CognitoAuthorizer"), "API Gateway must set CognitoAuthorizer as default");
  assert.ok(content.includes("Authorizer: NONE"), "HealthFunction event must set Authorizer: NONE for public health checks");

  // 9. CORS Configuration
  assert.ok(content.includes("AllowHeaders: \"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\""), "CORS must allow Authorization header");

  // 10. Runtime & Architecture
  assert.ok(content.includes("Runtime: nodejs24.x"), "Must configure nodejs24.x runtime in Globals");
  assert.ok(content.includes("- arm64"), "Must configure arm64 architecture in Globals");
});
