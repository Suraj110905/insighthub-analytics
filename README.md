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
   ▼ (Future Cloud Services - Phase 4+)
🌐 AWS API Gateway (REST Endpoints)
   │
   ▼
⚡ AWS Lambda (Serverless Compute Functions)
   │
   ├── 🗄️ Amazon DynamoDB (Persistent metrics, query history)
   └── 💾 Amazon S3 (Raw business CSV file storage)
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
├── .gitignore            # Git exclusion rules (protects credentials & outputs)
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
| **Backend (Target)** | AWS API Gateway & Lambda | Serverless API computation |
| **Storage (Target)** | Amazon DynamoDB & S3 | Key-value metric store and CSV file repository |
| **Hosting (Target)** | AWS Amplify Hosting | Continuous frontend deployment |

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
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the InsightHub dashboard.

---

## 🧪 Testing the CSV Upload in Your Browser

1. Click **Upload Dataset** or navigate to the **Datasets** page.
2. Click **Load Sample Dataset** to immediately test the built-in 22-record CSV file, or drag and drop your own `.csv`.
3. Notice that all 4 KPI cards, both charts, and the transaction table refresh instantly with computed values.
4. Try filtering transactions using the table search box or status dropdown.
5. Click **Export CSV** in the table header to download filtered records.
6. Click **Reset to Sample** in the top banner to return to baseline mode.

---

## 🔐 Environment & Security Guidelines

- **Client-Side Sandbox**: All CSV parsing occurs in the client browser memory. No files or rows are transmitted over the network.
- **XSS Prevention**: Table cells and labels are sanitized and rendered as React text nodes, preventing injection attacks.
- **Secrets Management**: Copy `.env.example` to `.env.local` for local environment configuration. Never commit AWS secrets.
