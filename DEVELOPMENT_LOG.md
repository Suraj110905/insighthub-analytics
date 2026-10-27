# 📝 InsightHub Development Log

## 📅 Phase 1: Project Foundation & Environment Setup (2026-10-28)

### ✅ Completed Tasks
- [x] Verified local toolchain versions: Node.js `v22.15.1`, npm `11.19.1`, Git `2.44.0`.
- [x] Initialized dedicated local Git repository inside `insighthub/` (`git init`).
- [x] Configured Next.js App Router with pure JavaScript (no TypeScript) per project guidelines.
- [x] Installed and configured Tailwind CSS v4 with `@tailwindcss/postcss` and PostCSS.
- [x] Installed visualization and UI libraries: `lucide-react` (icons) and `recharts` (charts).
- [x] Established clean directory architecture (`app/`, `components/`, `lib/`, `public/`).
- [x] Created secure environment template `.env.example` with strict AWS secret warnings.
- [x] Configured comprehensive `.gitignore` preventing accidental commits of node_modules, build caches, and credentials.
- [x] Created initial project documentation (`README.md`).
- [x] Configured `turbopack.root: process.cwd()` in `next.config.mjs` to eliminate external lockfile warning.

### 🧪 Test Results
- Git repository initialization: Verified (`.git/` directory established).
- Package installation: Verified (`0 vulnerabilities` reported by npm).
- Configuration validation: Tested PostCSS and Tailwind imports without syntax errors.
- Build verification: `npm run build` compiled in 698ms with 0 warnings.

---

## 📅 Phase 2: Professional Dashboard UI & Layout (2026-10-28)

### ✅ Completed Tasks
- [x] Created responsive `Sidebar.js` navigation with branding, active states, and mobile backdrop drawer:
  - Overview, Datasets (tagged Phase 3), Reports, Settings.
- [x] Created sticky `Header.js` with breadcrumbs, functional search filter input, notification bell with popover, and user profile badge.
- [x] Built 4 business KPI cards (`MetricCard.js`): Total Revenue, Total Orders, Conversion Rate, Average Order Value.
- [x] Implemented `RevenueChart.js` with Recharts `AreaChart` (interactive Monthly Revenue vs Orders toggle).
- [x] Implemented `ChannelChart.js` with Recharts `BarChart` (Direct, Organic, Referral, Social, Email).
- [x] Implemented `TransactionsTable.js` with realistic sample records, real-time filtering, status badges, and pagination.
- [x] Built `UploadModal.js` with drag-and-drop CSV dropzone.
- [x] Created `lib/useIsClient.js` with `useSyncExternalStore` to prevent SSR hydration mismatches.
- [x] Created `jsconfig.json` configuring `@/*` path aliases.

### 🧪 Test Results
- ESLint: `npm run lint` passed with **0 errors and 0 warnings**.
- Production Build: `npm run build` compiled static and dynamic routes in 2.1s with **0 errors**.

---

## 📅 Phase 3: Client-Side CSV Analytics Engine (2026-10-28)

### ✅ Completed Tasks
- [x] Built robust RFC 4180 compliant CSV parser in `lib/csvParser.js` powered by `papaparse`:
  - Handles quoted values with embedded commas, linebreaks, and escaped quotes (`""`).
  - Normalizes headers: trims whitespace, replaces empty headers (`column_{i}`), renames duplicate headers (`{col}_{count}`).
  - Validates row consistency, skips empty rows, and surfaces parsing warnings without crashing.
  - Rejects empty and whitespace-only files with clear feedback.
- [x] Built dynamic business analytics engine in `lib/analytics.js`:
  - Detects semantic column aliases: Revenue, Date, Category/Channel, Order ID, Status, Customer, Visitors/Conversions.
  - Calculates Total Revenue, unique Total Orders, AOV, and Conversion Rate (or "N/A" if visitor data absent).
  - Time-series monthly revenue aggregation for `RevenueChart`.
  - Segment breakdown grouping for `ChannelChart`.
  - Client-side CSV export generator `exportRecordsToCSV`.
- [x] Enhanced `components/UploadModal.js` with drag-and-drop, sample loader, and live column mapping preview.
- [x] Created downloadable template dataset `public/sample-business-data.csv` (22 records across 10 months).
- [x] Connected shared dataset state in `app/page.js` with sample baseline fallback and active dataset banners.
- [x] Created automated unit test suite in `scripts/test-analytics.mjs` (8/8 tests passing).

### 🧪 Test Results
- Unit Tests: `npm test` executed 8/8 tests with **8 passing, 0 failing**.
- ESLint: `npm run lint` passed with **0 errors and 0 warnings**.
- Production Build: `npm run build` compiled in 2.3s with **0 errors**.

---

## 📅 Phase 4A: Prepare AWS Serverless Backend (No Deployment) (2026-10-28)

### ✅ Completed Tasks
- [x] Created standalone `backend/` directory structured for AWS SAM:
  - `template.yaml`: Full CloudFormation & SAM serverless specification.
  - `samconfig.toml.example`: Non-secret deployment configuration template.
  - `backend/package.json`: Configured with AWS SDK v3 dependencies and test scripts.
- [x] Implemented 5 serverless Lambda handlers in `backend/src/handlers/`:
  - `health.js`: `GET /health` service health check with CORS headers.
  - `createDataset.js`: `POST /datasets` metadata validation and DynamoDB storage.
  - `listDatasets.js`: `GET /datasets` DynamoDB scan returning recent datasets.
  - `getDataset.js`: `GET /datasets/{id}` single dataset retrieval with 404 handling.
  - `getPresignedUrl.js`: `POST /datasets/presigned-url` secure S3 PUT presigned URL generator.
- [x] Built utilities and validators in `backend/src/`:
  - `utils/response.js`: Standardized API Gateway proxy responses and CORS headers.
  - `validators/datasetValidator.js`: Strict validation for metadata, safe filenames, and 10MB limits.
- [x] Applied storage & security best practices:
  - DynamoDB table configured with `PAY_PER_REQUEST` on-demand billing (zero fixed costs).
  - Private S3 bucket with all 4 `BlockPublicAccess` flags enabled and default `AES256` encryption.
  - S3 lifecycle rule expiring temporary uploads after 90 days.
  - Heavy raw CSV files upload directly to S3 via presigned URLs (never routed through Lambda memory).
  - Zero hardcoded secrets, credentials, or AWS account IDs.
  - Strict constraint verified: **NO EC2 resources created**.
- [x] Created automated backend unit test suite in `backend/tests/` (12 tests covering handlers, validation, error paths, and SAM template structure).
- [x] Standardized Lambda runtime to `nodejs24.x` with `arm64` architecture.
- [x] Standardized default AWS deployment region to `ap-south-1` (Mumbai) across `samconfig.toml.example`, `.env.example`, and documentation.
- [x] Preserved existing Next.js frontend functionality completely intact.

### 🧪 Test Results
- Backend Unit Tests: `cd backend && npm test` executed 12/12 tests with **12 passing, 0 failing** (265ms).
- Frontend Unit Tests: `npm test` executed 8/8 tests with **8 passing, 0 failing**.
- Frontend ESLint: `npm run lint` passed with **0 errors and 0 warnings**.
- Frontend Build: `npm run build` compiled in 735ms with **0 errors**.

---

## 📅 Phase 4B: Authentication, Data Isolation & Cost Controls

### 🎯 Objectives Completed
- **CloudWatch Log Retention**: Added explicit `AWS::Logs::LogGroup` resources with `RetentionInDays: 14` for all 5 Lambda functions to prevent unmanaged storage accumulation.
- **Amazon Cognito Integration**: Added `AWS::Cognito::UserPool` and `AWS::Cognito::UserPoolClient` with secure defaults (`GenerateSecret: false`, password policy, SRP + refresh flows).
- **API Gateway Authorizer**: Configured `CognitoAuthorizer` as default REST API authorizer. Kept `GET /health` public with `Authorizer: NONE`.
- **Tenant Data Isolation & Anti-IDOR**:
  - Identity strictly derived from verified JWT `event.requestContext.authorizer.claims.sub`.
  - DynamoDB table schema updated to composite primary key: `userId` (HASH) + `id` (RANGE).
  - Replaced full-table scans with partition-scoped `QueryCommand` for `/datasets`.
  - Cross-user access denial on `/datasets/{id}` returning `404 Not Found` without information leakage.
- **Strict S3 10MB Limit**: Integrated `@aws-sdk/s3-presigned-post` generating presigned POST policies with `['content-length-range', 1, 10485760]` and user-scoped S3 prefixes (`uploads/${userId}/...`). S3 directly rejects uploads > 10MB.
- **Local Dev Compatibility**: Frontend remains 100% operational offline (`NEXT_PUBLIC_ENABLE_AWS_BACKEND=false`). Created `lib/awsClient.js` for clean abstraction.
- **Test Verification**:
  - Backend Unit Tests: 19/19 passing (261ms) across all handlers, validators, anti-IDOR tests, and template validation.
  - Frontend Unit Tests: 8/8 passing.
  - ESLint: 0 errors, 0 warnings.
  - Next.js Production Build: Compiled and prerendered in 690ms with 0 errors.
- **Safety**: Zero AWS resources deployed or modified.

---

## 📅 Phase 5A: Frontend Cognito Authentication Layer

### 🎯 Objectives Completed
- **Official AWS SDK Integration**: Installed and configured `amazon-cognito-identity-js` for Secure Remote Password (SRP) authentication, avoiding cleartext password transmission.
- **In-Memory Storage Security**: Created `lib/cognitoStorage.js` (`MemoryStorage`) implementing the SDK's storage interface purely in RAM. Zero tokens, passwords, or session secrets are saved to `localStorage` or `sessionStorage`, mitigating persistent XSS attack vectors.
- **Client Session Manager**: Built `lib/AuthContext.js` providing `AuthProvider` and `useAuth()` hook with `signUp`, `confirmSignUp`, `resendConfirmationCode`, `signIn`, `signOut`, and `getIdToken()`.
- **Dynamic Header & Profile**: Updated `components/Header.js` to dynamically display the authenticated user's email, verified badge, and sign-out button, replacing the hardcoded demo profile. Added a graceful "Local Mode" badge when unconfigured.
- **Branded Authentication Modal**: Created `components/AuthModal.js` matching InsightHub's Teal and Slate theme, supporting Sign-In, Sign-Up, and 6-digit confirmation code flows.
- **Preserved Offline Analytics**: Full separation maintained. Local CSV upload, RFC 4180 parsing, and real-time KPI calculations function 100% offline without AWS configuration.
- **Test Verification**:
  - Frontend Test Suite: 14/14 tests passing (8 analytics + 6 auth unit tests in `scripts/test-auth.mjs`).
  - Backend Test Suite: 19/19 tests passing.
  - ESLint: 0 errors, 0 warnings.
  - Production Build: Compiled and prerendered in 2.6s with 0 errors.
- **Safety Compliance**: Zero AWS resources created, modified, or deployed. Zero commits made automatically.

---

## 📅 Phase 5B: End-to-End AWS Dataset Upload Integration

### 🎯 Objectives Completed
- **3-Stage Cloud Upload Pipeline**: Implemented in `lib/awsClient.js`:
  1. Requests S3 Presigned POST policy from `POST /datasets/presigned-url` attaching Cognito ID token as Bearer authorization.
  2. Uploads raw CSV bytes directly to private S3 via multipart form data, strictly enforcing the 10 MB limit and text/csv without passing bytes through Lambda memory.
  3. Saves dataset metadata summary in DynamoDB via `POST /datasets` using the backend-generated `s3Key`.
- **Partial Failure Detection**: Added custom `CloudUploadError` with `isPartialFailure: true` and `s3Key`. If S3 upload succeeds but DynamoDB metadata creation fails, the UI reports the partial failure clearly rather than claiming success or blindly creating duplicates.
- **UI Integration in UploadModal**:
  - Connected `components/UploadModal.js` to `lib/awsClient.js` with dynamic cloud upload toggle when authenticated.
  - Step-by-step progress indicator ("Requesting S3 upload policy..." -> "Uploading CSV directly to private Amazon S3..." -> "Saving dataset metadata in DynamoDB...").
  - Clear guidance banner and sign-in button when cloud storage is enabled on the instance but user is not authenticated.
- **Offline & Local Analytics Parity**:
  - Offline mode functions 100% in browser memory with zero network requests when AWS mode is disabled or unconfigured.
  - Clearly distinguishes local session datasets from AWS cloud-synchronized datasets with UI badges (`Saved to AWS Cloud` vs `Local Session`).
- **Phase 5C Boundary**: Explicitly documented that historical dataset browsing and reopening from S3 is scheduled for Phase 5C.
- **Comprehensive Unit Testing**:
  - Added `scripts/test-cloud-upload.mjs` with 10 unit tests covering presigned POST, S3 multipart uploads, DynamoDB metadata creation, partial failure detection, 10MB limits, and offline mode.
  - Total Frontend Tests: 24/24 passing (8 analytics + 6 auth + 10 cloud upload).
  - Total Backend Tests: 19/19 passing.
  - ESLint: 0 errors, 0 warnings.
  - Next.js Production Build: Compiled in 2.3s with 0 errors.
- **Safety Compliance**: Zero AWS resources created, modified, or deployed. Zero commits made automatically.



