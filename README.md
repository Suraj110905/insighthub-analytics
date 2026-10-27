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
   ▼ (Prepared AWS SAM Backend - Phase 4A)
🌐 Amazon API Gateway (REST Endpoints in ap-south-1: /health, /datasets, /datasets/{id}, /datasets/presigned-url)
   │
   ▼
⚡ AWS Lambda Handlers (Node.js 24.x, ARM64)
   │
   ├── 🗄️ Amazon DynamoDB (DatasetsTable, On-Demand billing)
   └── 💾 Amazon S3 (CsvStorageBucket, Private Encrypted, 90-day lifecycle)
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
│   ├── tests/            # Zero-dependency backend test suite (12 tests)
│   ├── package.json      # Backend AWS SDK dependencies
│   ├── samconfig.toml.example # Example non-secret SAM deploy configuration
│   ├── template.yaml     # SAM CloudFormation serverless infrastructure template
│   └── README.md         # Dedicated backend architecture and deployment guide
├── components/           # Reusable UI elements
│   ├── Sidebar.js        # Responsive navigation drawer (Overview, Datasets, Reports, Settings)
│   ├── Header.js         # Header with breadcrumbs, search, notification popover & profile
│   ├── MetricCard.js     # Modular business KPI cards with trend indicators
│   ├── RevenueChart.js   # Recharts AreaChart for monthly revenue & order volume
│   ├── ChannelChart.js   # Recharts BarChart for acquisition channel distribution
│   ├── TransactionsTable.js # Data table with real-time search, status filter & CSV export
│   └── UploadModal.js    # Interactive CSV upload modal with drag-and-drop & live validation
├── lib/                  # Business logic and helper functions
│   ├── analytics.js      # Dynamic analytics engine, column mapping, and metric calculations
│   ├── csvParser.js      # RFC 4180 compliant CSV parser and header normalization
│   └── useIsClient.js    # Client-side hydration hook (avoids cascading render warnings)
├── public/               # Static assets & sample data
│   └── sample-business-data.csv # Built-in template dataset for 1-click testing
├── scripts/              # Automated verification and tests
│   └── test-analytics.mjs # Unit tests for CSV parsing, column mapping, and KPI formulas
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

## 🔐 Environment & Security Guidelines

- **Zero Cloud Deployment in Phase 4A**: Serverless infrastructure has been prepared locally and validated with unit tests; no cloud resources have been deployed.
- **Client-Side Sandbox**: All CSV parsing currently occurs in the client browser memory. No files or rows are transmitted over the network without user configuration.
- **Authentication Warning**: Endpoints in `backend/` are configured for development. An authorization layer (e.g. AWS Cognito User Pool) is required before deploying with production enterprise data.
- **Secrets Management**: Copy `.env.example` to `.env.local` for local environment configuration. Never commit AWS secrets.
