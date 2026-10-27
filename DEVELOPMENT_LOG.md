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

### ⚠️ Security Limitations & Important Notes
- **Deployment Status**: Backend code is **prepared locally only**; **NO deployment has been performed**, respecting strict project constraints.
- **Authentication**: Endpoints currently do not enforce Cognito/OAuth authentication. An API Gateway Lambda Authorizer or Cognito User Pool is **mandatory** before deploying to production with real enterprise data.
- **Client Independence**: Frontend remains 100% operational in client-side mode without requiring backend connectivity.
