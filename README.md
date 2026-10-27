# 📊 InsightHub — Minimal Business Analytics Web App

InsightHub is an assessment-ready, lightweight business intelligence and analytics web application. It allows business users to upload business CSV datasets, inspect individual data records, compute key performance indicators (KPIs) in real time, view interactive trend charts, and export structured business summaries.

---

## 🏗️ Architecture Overview

The system is structured as a modern web application designed for seamless serverless cloud integration:

```
📱 Client (Next.js App Router Frontend)
   │
   ├── 📂 Upload Dropzone & Validator (components/UploadModal.js)
   ├── ⚙️ RFC 4180 CSV Parser (lib/csvParser.js with PapaParse)
   ├── 🧠 Analytics Calculation Engine (lib/analytics.js)
   │     ├── Schema & Column Mapping Detector
   │     ├── KPI Formulator (Revenue, Orders, AOV, Conversion)
   │     ├── Time-Series Aggregator (Monthly Trends)
   │     └── Category / Channel Segmenter
   ├── 🎨 Dashboard Components (MetricCard, RevenueChart, ChannelChart, TransactionsTable)
   └── 🌐 Next.js Pages & Layouts (app/layout.js, app/page.js)
   │
   ▼ (Prepared AWS SAM Backend - Phases 4B & 5C)
🔐 Amazon Cognito User Pool (ap-south-1)
   │
   ▼
🌐 Amazon API Gateway (REST Endpoints with Cognito Authorizer)
   ├── GET  /health (Public)
   ├── POST /datasets (Protected)
   ├── GET  /datasets (Protected - User Scoped)
   ├── GET  /datasets/{id} (Protected - Anti-IDOR)
   ├── GET  /datasets/{id}/download (Protected - 60s Presigned S3 GET)
   └── POST /datasets/presigned-url (Protected - 10MB S3 Policy)
   │
   ▼
⚡ AWS Lambda Handlers (Node.js 24.x, ARM64)
   │
   ├── 🗄️ Amazon DynamoDB (DatasetsTable, On-Demand, Composite Key: userId HASH + id RANGE)
   ├── 💾 Amazon S3 (CsvStorageBucket, Private Encrypted, 10MB Presigned POST, 60s Presigned GET)
   └── 🪵 Amazon CloudWatch Logs (Explicit 14-day retention for cost control)
```

---

## 📁 Project Directory Structure

```text
insighthub/
├── app/                  # Next.js App Router pages, layout, and global styling
│   ├── favicon.ico       # Website favicon
│   ├── globals.css       # Global CSS with Tailwind v4 setup & custom tokens
│   ├── layout.js         # Root HTML layout and metadata wrapper
│   └── page.js           # Interactive Phase 3 dashboard with dynamic CSV engine
├── backend/              # AWS Serverless Application Model (SAM) Backend (Phase 4A)
│   ├── src/
│   │   ├── handlers/     # Lambda handlers (health, createDataset, listDatasets, getDataset, getPresignedUrl)
│   │   ├── utils/        # Response helpers and CORS configuration
│   │   └── validators/   # Strict dataset metadata and file upload validators
│   ├── tests/            # Zero-dependency backend test suite (19 tests)
│   ├── package.json      # Backend AWS SDK dependencies
│   ├── samconfig.toml.example # Example non-secret SAM deploy configuration
│   ├── template.yaml     # SAM CloudFormation serverless infrastructure template
│   └── README.md         # Dedicated backend architecture and deployment guide
├── components/           # Reusable UI elements
│   ├── AuthModal.js      # Branded modal for Cognito Sign-In, Sign-Up & Email Confirmation
│   ├── ClientProviders.js# Client wrapper for AuthProvider and AuthModal
│   ├── Sidebar.js        # Responsive navigation drawer (Overview, Datasets, Reports, Settings)
│   ├── Header.js         # Header with breadcrumbs, search, notification popover & Cognito auth status
│   ├── MetricCard.js     # Modular business KPI cards with trend indicators
│   ├── RevenueChart.js   # Recharts AreaChart for monthly revenue & order volume
│   ├── ChannelChart.js   # Recharts BarChart for acquisition channel distribution
│   ├── TransactionsTable.js # Data table with real-time search, status filter & CSV export
│   └── UploadModal.js    # Interactive CSV upload modal with drag-and-drop & live validation
├── lib/                  # Business logic and helper functions
│   ├── analytics.js      # Dynamic analytics engine, column mapping, and metric calculations
│   ├── AuthContext.js    # Client session manager with SRP authentication via amazon-cognito-identity-js
│   ├── awsClient.js      # S3 presigned POST & API Gateway Bearer token caller
│   ├── cognitoStorage.js # In-memory RAM storage adapter (avoids localStorage/sessionStorage XSS token risk)
│   ├── csvParser.js      # RFC 4180 compliant CSV parser and header normalization
│   └── useIsClient.js    # Client-side hydration hook (avoids cascading render warnings)
├── public/               # Static assets & sample data
│   └── sample-business-data.csv # Built-in template dataset for 1-click testing
├── scripts/              # Automated verification and tests
│   ├── test-analytics.mjs# Unit tests for CSV parsing, column mapping, and KPI formulas
│   ├── test-auth.mjs     # Unit tests for in-memory storage, token safety & Cognito validation
│   ├── test-cloud-upload.mjs # Unit tests for S3 presigned POST, upload pipeline & partial failures
│   └── test-dataset-history.mjs # Unit tests for cloud history listing, 60s secure download & reopening

├── .env.example          # Environment variable template with security guidelines
├── .gitignore            # Git exclusion rules (protects credentials, SAM artifacts & outputs)
├── DEVELOPMENT_LOG.md    # Log of tasks completed, testing results, and issues
├── jsconfig.json         # Path aliases configuration (@/*)
├── next.config.mjs       # Next.js configuration (JavaScript, Turbopack root)
├── package.json          # Dependencies and npm scripts
├── postcss.config.mjs    # PostCSS configuration for Tailwind CSS
└── README.md             # Project documentation (this file)
```

---

## 📋 Supported CSV Column Mappings

InsightHub uses flexible, case-insensitive heuristic detection to automatically map business headers without requiring rigid column names:

| Analytical Dimension | Supported Column Aliases | Purpose / Calculation |
| :--- | :--- | :--- |
| **💰 Revenue** | `revenue`, `sales`, `amount`, `total`, `price`, `ordervalue`, `netamount`, `grosssales` | Summed to compute Total Revenue. Non-numeric values are safely flagged and not silently set to zero. |
| **🔢 Order ID** | `order_id`, `orderid`, `transaction_id`, `id`, `ordernumber`, `invoiceid` | Counted uniquely to determine Total Orders. Deduplicates multi-line orders. |
| **📅 Date** | `date`, `order_date`, `transaction_date`, `created_at`, `timestamp` | Chronologically grouped into monthly buckets for `RevenueChart`. |
| **🏷️ Category / Channel**| `channel`, `category`, `product_category`, `source`, `department`, `type` | Aggregated and sorted descending for `ChannelChart`. |
| **👤 Customer** | `customer`, `customer_name`, `client`, `company`, `buyer`, `user` | Displayed in `TransactionsTable`. |
| **🚦 Status** | `status`, `order_status`, `payment_status`, `state` | Formatted into color-coded status badges (`Completed`, `Processing`, `Pending`). |
| **👥 Visitor / Sessions** | `visitors`, `sessions`, `traffic`, `visits` | Used along with conversions to compute Conversion Rate. Displays "N/A" if absent. |

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | React web application framework |
| **Language** | JavaScript (ES6+) | Clean, beginner-friendly code without build complexity |
| **CSV Parser** | PapaParse | RFC 4180 compliant parser for quotes, commas, escapes, and line breaks |
| **Styling** | Tailwind CSS v4 & PostCSS | Minimal, restrained dashboard styling inspired by Figma |
| **Charts** | Recharts | Interactive SVG area charts and bar charts |
| **Icons** | Lucide React | Clean, lightweight UI icons |
| **Testing** | Node.js Test Runner (`node:test`) | Native, zero-dependency unit tests for parsing and KPIs |
| **Backend (Prepared)** | AWS SAM, Lambda (Node.js 24.x, ARM64), API Gateway (ap-south-1) | Serverless REST APIs with CORS |
| **Storage (Prepared)** | Amazon DynamoDB & S3 | On-Demand metadata store & private encrypted S3 bucket |

---

## 🚀 Getting Started Locally

### Prerequisites
Make sure the following tools are installed on your computer:
- **Node.js**: `v20.x` or `v22.x` (check with `node -v`)
- **npm**: `v10.x` or `v11.x` (check with `npm -v`)
- **Git**: `v2.x` (check with `git -v`)

### Installation & Running

1. **Open the repository:**
   ```bash
   cd insighthub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run unit tests:**
   ```bash
   npm test
   cd backend && npm test && cd ..
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the InsightHub dashboard.

---

## ☁️ Phase 5C: Dataset History, Secure Downloads & Reopening

InsightHub supports end-to-end cloud dataset persistence, secure browsing, and one-click reopening:

### 1. Cloud History Browsing
- Authenticated users navigate to the **Datasets** tab to view their previously saved datasets.
- DynamoDB `QueryCommand` scopes strictly to `userId = :sub`, guaranteeing complete tenant data isolation.
- Displays dataset name, upload timestamp, valid record count, and detected column count.
- Includes clean loading, error, empty, and retry states.

### 2. Secure 60-Second Presigned Downloads
- **Protected Endpoint**: `GET /datasets/{id}/download` validated by Cognito Authorizer.
- **Anti-IDOR Defense**: Looks up composite key `{ userId, id }`. Missing datasets or datasets belonging to another user return a generic 404 `NotFound` error without leaking existence.
- **Server-Controlled S3 Key**: S3 key is strictly retrieved from verified DynamoDB metadata (`uploads/${userId}/...`), never accepted from client query/body input.
- **Private S3 Storage**: Generates a short-lived presigned GET URL (60-second expiration). S3 bucket access remains 100% private and blocked from public access.
- **S3 Object Validation**: Validates object existence via `HeadObjectCommand` before presigning, returning 404 if the underlying file was removed.

### 3. Reopening with Live Analytics Recalculation
- Clicking **Open Dataset** retrieves the short-lived presigned GET URL and downloads the CSV raw text directly from private S3.
- Runs the raw CSV through `parseAndValidateCSV` and `computeDashboardAnalytics`.
- Replaces active dashboard metrics, recalculating Total Revenue, Total Orders, Average Order Value, Monthly Revenue trend chart, Channel breakdown chart, and Transactions table.
- Sets dataset source badge to `Saved to AWS Cloud`.
- Duplicate clicks are prevented while an operation is in progress.

### 4. Local Mode Preservation
- When AWS configuration (`NEXT_PUBLIC_ENABLE_AWS_BACKEND="false"`) is disabled or absent:
  - Zero AWS network requests are executed.
  - Sample dataset, local CSV uploads, KPI calculations, Recharts trends, search, and CSV export remain 100% functional in browser memory.
  - Sign-in is never required for local-only analytics.

---

## 🔐 Environment & Security Guidelines

### Required Environment Variables (`.env.local`)
```ini
# AWS Backend Integration Toggle
NEXT_PUBLIC_ENABLE_AWS_BACKEND="false" # Set "true" to activate cloud history & uploads

# API Gateway Endpoint (from SAM outputs)
NEXT_PUBLIC_AWS_API_GATEWAY_URL="https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/Prod"

# Amazon Cognito Configuration (from SAM outputs)
NEXT_PUBLIC_AWS_REGION="ap-south-1"
NEXT_PUBLIC_COGNITO_USER_POOL_ID="ap-south-1_xxxxxxxxx"
NEXT_PUBLIC_COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Local Testing vs Live AWS Environment
- **Fully Testable Locally**:
  - All CSV parsing, RFC 4180 handling, column alias heuristics, and KPI math.
  - Cognito in-memory storage, password validation, and auth state management.
  - Mocked S3 Presigned POST, 10MB limit enforcement, and partial failure detection.
  - Mocked Presigned GET download, 60s expiration handling, anti-IDOR checks, and analytics reopening.
  - SAM CloudFormation template syntax and security rules.
- **Requires Deployed AWS Environment for Live Verification**:
  - Real Cognito user registration, live SMS/email verification codes, and SRP token issuance.
  - Live API Gateway REST authorizer token validation.
  - Real DynamoDB write/query throughput on `DatasetsTable`.
  - Live Amazon S3 presigned multipart POST uploads and presigned GET browser downloads.
