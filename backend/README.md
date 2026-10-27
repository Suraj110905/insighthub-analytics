# ☁️ InsightHub — AWS Serverless Backend

This directory contains the production-ready AWS Serverless Application Model (SAM) configuration and Lambda source code for InsightHub.

---

## 🏗️ Architecture Overview

```
📱 Client Browser (Next.js Frontend)
   │
   ├── 1. Authenticate with Amazon Cognito ─────────► 🔐 Amazon Cognito User Pool
   │   (SRP / Refresh Token Auth)                         │
   │                                                      ▼
   │   ◄── Returns Verified JWT (IdToken) ────────────────┘
   │
   ├── 2. Direct Upload via S3 Presigned POST ────────┐ (Policy strictly enforces 10MB limit)
   │   (uploads/${userId}/${uploadId}/${filename})    ▼
   │                                               💾 Amazon S3 (CsvStorageBucket, Private Encrypted)
   │
   └── 3. Authenticated REST API Calls ──────────► 🌐 Amazon API Gateway (RestApi)
          (Authorization: Bearer <IdToken>)               │
                                                          ├── 🔐 Cognito Authorizer
                                                          │   (Validates token & injects claims.sub)
                                                          │
                                                          ▼
                                                ⚡ AWS Lambda Handlers (Node.js 24.x, ARM64)
                                                   ├── HealthCheck: GET /health (Public)
                                                   ├── CreateDataset: POST /datasets (Protected)
                                                   ├── ListDatasets: GET /datasets (Protected)
                                                   ├── GetDataset: GET /datasets/{id} (Protected)
                                                   └── GetPresignedUrl: POST /datasets/presigned-url (Protected)
                                                          │
                                                          ├──► 🗄️ Amazon DynamoDB (DatasetsTable, On-Demand)
                                                          │    (Composite Key: userId HASH, id RANGE)
                                                          └──► 🪵 Amazon CloudWatch Logs
                                                               (Explicit 14-day retention per function)
```

---

## 📡 REST API Route Specifications

| Route | Method | Access | Description | Request Body | Response Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | **Public** | Service liveness and environment status | None | `200 OK` |
| `/datasets` | `POST` | **Protected** | Validates & saves tenant-isolated dataset metadata | `{ name, rowCount, headers, metrics, s3Key }` | `201 Created` / `400 Bad Request` / `401 Unauthorized` |
| `/datasets` | `GET` | **Protected** | Queries dataset records belonging strictly to caller | None | `200 OK` / `401 Unauthorized` |
| `/datasets/{id}`| `GET` | **Protected** | Retrieves metadata for a single dataset (anti-IDOR) | None | `200 OK` / `404 Not Found` / `401 Unauthorized` |
| `/datasets/presigned-url` | `POST` | **Protected** | Generates secure direct S3 upload POST policy | `{ filename, fileSizeBytes }` | `200 OK` / `400 Bad Request` / `401 Unauthorized` |

---

## 🔐 Security, Multi-Tenancy & Cost Controls

1. **Amazon Cognito User Authentication**:
   - `AWS::Cognito::UserPool` and `AWS::Cognito::UserPoolClient` configured with secure defaults.
   - Client authentication uses `ALLOW_USER_SRP_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`.
   - `GenerateSecret: false` (secure for Single Page Next.js web applications).
   - Minimum 8-character password policy with uppercase, lowercase, numbers, and symbols.
   - API Gateway REST API is protected by a native Cognito Authorizer (`DefaultAuthorizer: CognitoAuthorizer`).
   - `GET /health` is explicitly configured with `Auth: { Authorizer: NONE }` for public health probes.

2. **Tenant Data Isolation & Anti-IDOR (Insecure Direct Object Reference)**:
   - User identity is **strictly derived from verified JWT claims** (`event.requestContext.authorizer.claims.sub`).
   - The API **never trusts** an owner or user ID sent in the request body.
   - **DynamoDB Key Schema**: Composite Primary Key:
     - Partition Key (`HASH`): `userId` (Cognito `sub` UUID).
     - Sort Key (`RANGE`): `id` (`ds_<crypto.randomUUID()>`).
   - Listing datasets executes a `QueryCommand` scoped to `userId = :uid`, preventing full-table scans and eliminating cross-tenant visibility.
   - Retrieving a dataset by ID queries `{ userId: callerSub, id: datasetId }`. If another user guesses a dataset ID, DynamoDB returns empty and the API returns `404 Not Found`, preventing existence enumeration.

3. **Strict 10MB S3 Upload Limit (Presigned POST)**:
   - Uses `@aws-sdk/s3-presigned-post` to generate cryptographic S3 upload policies.
   - Policy conditions enforce:
     - `['content-length-range', 1, 10485760]` (10 MB maximum byte limit).
     - `['starts-with', '$Content-Type', 'text/csv']`.
   - **S3 itself rejects oversized files** with HTTP 400 `EntityTooLarge` before bytes are accepted into storage.
   - S3 objects are isolated to user-scoped prefixes: `uploads/${userId}/${uploadId}/${filename}`.

4. **CloudWatch Log Retention (Cost Control)**:
   - Explicit `AWS::Logs::LogGroup` resources declared for each of the 5 Lambda functions.
   - `RetentionInDays: 14` avoids default indefinite retention and prevents unmanaged log storage charges.

5. **Private S3 Storage & Encryption**:
   - `PublicAccessBlockConfiguration` blocks all public ACLs, policies, and buckets.
   - Default Server-Side Encryption (`AES256`).
   - Lifecycle policy: uploaded files expire automatically after 90 days.

6. **DynamoDB Migration Note**:
   - The DynamoDB schema was updated from a single `id` key to a composite multi-tenant key (`userId` HASH, `id` RANGE).
   - Because this project is pre-deployment and no production cloud resources exist, no backfill data migration was necessary.

---

## 🧪 Local Testing

The backend includes a comprehensive zero-dependency test suite running on Node.js native test runner:

```bash
cd backend
npm test
```

### Verified Test Suites (19 Tests Passing):
- `HealthHandler`: Public access, status, version, and CORS headers.
- `CreateDatasetHandler`: Authentication requirement (401), validation rules (400), user-scoped S3 key validation, composite key (`userId`, `id`) DynamoDB storage (201).
- `ListDatasetsHandler`: Authentication requirement (401), QueryCommand isolation by `userId` (200).
- `GetDatasetHandler`: Authentication requirement (401), missing ID (400), invalid ID format (400), anti-IDOR cross-user access denial (404), successful retrieval (200).
- `PresignedUrlHandler`: Authentication requirement (401), rejection of non-CSV extensions (400), unsupported content type (400), rejection of >10MB files (400), S3 presigned POST policy generation with `content-length-range: [1, 10485760]` and user prefix scoping (200).
- `TemplateValidation`: CloudWatch 14-day retention for all 5 Lambdas, Cognito UserPool and Client configuration, API Gateway authorizer, composite DynamoDB keys, Node 24 runtime, ARM64 architecture, S3 public block, and zero EC2/credentials.

---

## 🚀 Future Deployment Guide (When Approved)

> **SAFETY NOTICE**: Cloud authentication remains unverified against live AWS infrastructure until a real deployment is executed. This backend has **NOT** been deployed.

### Prerequisites:
1. Install [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
2. Configure AWS credentials with `aws configure` in `ap-south-1` (Mumbai).

### Deployment Commands:
```bash
cd backend
sam build
sam deploy --guided
```

### After Deployment Setup:
1. Copy the output values from CloudFormation:
   - `ApiUrl` -> Set in frontend `.env.local` as `NEXT_PUBLIC_AWS_API_GATEWAY_URL`.
   - `UserPoolId` -> Set as `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID`.
   - `UserPoolClientId` -> Set as `NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID`.
2. In AWS Cognito Console, create an initial user or allow self-registration with email verification.
3. Set `NEXT_PUBLIC_ENABLE_AWS_BACKEND=true` in `.env.local` to switch the frontend from local offline mode to AWS cloud mode.
