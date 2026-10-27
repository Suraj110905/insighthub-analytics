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

  // 4. DynamoDB Billing Mode: On-Demand
  assert.ok(content.includes("BillingMode: PAY_PER_REQUEST"), "DynamoDB table must use on-demand billing mode");
  assert.ok(content.includes("DatasetsTable:"), "Must declare DatasetsTable resource");

  // 5. S3 Security: Block Public Access & Encryption
  assert.ok(content.includes("BlockPublicAcls: true"), "S3 must block public ACLs");
  assert.ok(content.includes("BlockPublicPolicy: true"), "S3 must block public policy");
  assert.ok(content.includes("IgnorePublicAcls: true"), "S3 must ignore public ACLs");
  assert.ok(content.includes("RestrictPublicBuckets: true"), "S3 must restrict public buckets");
  assert.ok(content.includes("SSEAlgorithm: AES256"), "S3 must have default encryption enabled");

  // 6. Functions and API Routes
  assert.ok(content.includes("HealthFunction:"), "Must declare HealthFunction");
  assert.ok(content.includes("CreateDatasetFunction:"), "Must declare CreateDatasetFunction");
  assert.ok(content.includes("ListDatasetsFunction:"), "Must declare ListDatasetsFunction");
  assert.ok(content.includes("GetDatasetFunction:"), "Must declare GetDatasetFunction");
  assert.ok(content.includes("GetPresignedUrlFunction:"), "Must declare GetPresignedUrlFunction");

  // 7. Outputs
  assert.ok(content.includes("ApiUrl:"), "Must export ApiUrl");
  assert.ok(content.includes("DatasetsTableName:"), "Must export DatasetsTableName");
  assert.ok(content.includes("CsvStorageBucketName:"), "Must export CsvStorageBucketName");
});
