# ☁️ InsightHub — AWS Serverless Backend

This directory contains the production-ready AWS Serverless Application Model (SAM) configuration and Lambda source code for InsightHub.

---

## 🏗️ Architecture Overview

```
📱 Client Browser (Next.js Frontend)
   │
   ├── [Direct Upload via S3 Presigned URL] ───────────────┐
   │                                                       ▼
   ├── [REST API Calls with CORS] ──► 🌐 Amazon API Gateway (RestApi)
                                              │
                                              ▼
                                    ⚡ AWS Lambda Handlers (Node.js 20.x, ARM64)
                                       ├── HealthCheck: GET /health
                                       ├── CreateDataset: POST /datasets
                                       ├── ListDatasets: GET /datasets
                                       ├── GetDataset: GET /datasets/{id}
                                       └── GetPresignedUrl: POST /datasets/presigned-url
                                              │
                                              ├──► 🗄️ Amazon DynamoDB (DatasetsTable, On-Demand)
                                              └──► 💾 Amazon S3 (CsvStorageBucket, Private Encrypted)
```

---

## 📡 REST API Route Specifications

| Route | Method | Description | Request Body | Response Status |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | Service liveness and environment status | None | `200 OK` |
| `/datasets` | `POST` | Validates & saves dataset metadata summary | `{ name, rowCount, headers, metrics }` | `201 Created` / `400 Bad Request` |
| `/datasets` | `GET` | Lists recent stored dataset metadata items | None | `200 OK` |
| `/datasets/{id}`| `GET` | Retrieves metadata for a single dataset | None | `200 OK` / `404 Not Found` |
| `/datasets/presigned-url` | `POST` | Generates secure direct S3 upload URL | `{ filename, fileSizeBytes }` | `200 OK` / `400 Bad Request` |

---

## 🔐 Security & Storage Principles

1. **Private S3 Storage**:
   - `BlockPublicAccess` enabled (all 4 public block options active).
   - Default Server-Side Encryption (`AES256`).
   - Lifecycle cleanup policy: uploaded files expire automatically after 90 days.
   - S3 CORS restricted to configured `FrontendOrigin`.
2. **DynamoDB On-Demand Billing**:
   - `BillingMode: PAY_PER_REQUEST` ensures zero fixed monthly costs.
   - Server-side encryption enabled.
3. **S3 Presigned URLs for Data Privacy**:
   - Heavy raw CSV files are uploaded directly from the browser to private S3.
   - Raw CSV payloads **never pass through Lambda memory**, eliminating execution timeouts and memory exhaustion.
4. **Least-Privilege IAM Scopes**:
   - Handlers receive scoped permissions limited exclusively to the specific table or bucket ARN.
   - No administrative or wildcard IAM permissions.
5. **No Hardcoded Secrets**:
   - No AWS account IDs, access keys, or secret keys exist in template or source code.
6. **Authentication Notice**:
   - ⚠️ This backend is prepared for local prototyping and development. An authentication layer (such as AWS Cognito User Pools or API Gateway Lambda Authorizer) is **required** before production deployment with sensitive multi-tenant data.

---

## 🧪 Local Testing

The backend includes a zero-dependency test suite using the Node.js native test runner:

```bash
cd backend
npm test
```

### Test Coverage:
- `HealthHandler`: Status, version, CORS header checks.
- `CreateDatasetHandler`: Validation rules, required name/rowCount, DynamoDB put commands.
- `ListDatasetsHandler`: Table scan mapping and item count.
- `GetDatasetHandler`: 400 on missing ID, 404 on non-existent record, 200 on success.
- `PresignedUrlHandler`: Rejection of non-CSV extensions, rejection of >10MB files, valid presigned URL generation.
- `TemplateValidation`: SAM structure, on-demand billing, encryption, S3 public access block, no EC2 resources, no hardcoded secrets.

---

## 🚀 Future Deployment Guide (When Approved)

> **IMPORTANT**: As per Phase 4A strict constraints, this backend has **NOT** been deployed. Deployment commands should only be executed after explicit user authorization.

### Prerequisites for Future Deployment:
1. Install [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
2. Configure AWS credentials with `aws configure` (requires IAM permissions for CloudFormation, Lambda, API Gateway, DynamoDB, S3).

### Step-by-Step Deployment Commands:
```bash
# 1. Navigate to backend directory
cd backend

# 2. Build the serverless application artifacts
sam build

# 3. Deploy interactively (guided)
sam deploy --guided
```

### Guided Prompts & Suggested Values:
- **Stack Name**: `insighthub-backend-dev`
- **AWS Region**: `us-east-1` (or your preferred region)
- **Parameter Environment**: `dev`
- **Parameter FrontendOrigin**: `http://localhost:3000` (or your production domain)
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`
- **Save arguments to configuration file**: `Y` (saves to `samconfig.toml`)
