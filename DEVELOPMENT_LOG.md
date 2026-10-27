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
- [x] Created responsive `Sidebar.js` navigation with branding, active states, and mobile backdrop drawer.
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
  - Detects semantic column aliases:
    - Revenue: `revenue`, `sales`, `amount`, `total`, `price`, `ordervalue`
    - Date: `date`, `order_date`, `transaction_date`, `created_at`
    - Category: `channel`, `category`, `product_category`, `source`
    - Order ID: `order_id`, `orderid`, `transaction_id`, `id`
    - Status: `status`, `order_status`, `payment_status`
    - Customer: `customer`, `customer_name`, `client`, `company`
    - Conversion data: `visitors`, `sessions`, `traffic`, `conversions`
  - Total Revenue: sums verified numeric amounts without silently treating bad strings as 0.
  - Total Orders: deduplicates order IDs if present, or counts valid transaction rows.
  - Average Order Value: dynamically computes `revenue / orders`.
  - Conversion Rate: safely displays `N/A` with informative label when session data is absent; calculates rate if visitor data is provided.
  - Chronological time-series revenue grouping by month for `RevenueChart`.
  - Segment breakdown grouping for `ChannelChart`.
  - Record formatting and filtering for `TransactionsTable`.
  - Client-side CSV export generator `exportRecordsToCSV`.
- [x] Enhanced `components/UploadModal.js`:
  - Drag-and-drop dropzone with file type validation (`.csv`).
  - Live preview showing parsed filename, valid records, skipped records, and mapped columns.
  - 1-click "Load Sample Dataset" feature for immediate assessment review.
  - Option to replace or reset active dataset.
- [x] Created downloadable template dataset `public/sample-business-data.csv` (22 records across 10 months).
- [x] Connected shared dataset state in `app/page.js`:
  - Baseline sample mode when no file is uploaded.
  - Dynamic dataset mode when file is uploaded, updating all 4 KPI cards, charts, and table.
  - Banner indicating active dataset and "Reset to Sample" action.
  - Table filtered record CSV export.
- [x] Created unit test suite in `scripts/test-analytics.mjs` covering 8 core scenarios:
  1. RFC 4180 quotes, commas, escapes.
  2. Column alias resolution.
  3. Missing required columns handling.
  4. Safe numeric parsing (no silent zero conversions).
  5. Order ID deduplication.
  6. Empty and whitespace file rejection.
  7. Duplicate and empty header renaming.
  8. CSV export record formatting.

### 🧪 Test Results
- Unit Tests: `npm test` executed 8/8 tests with **8 passing, 0 failing** (35ms duration).
- ESLint: `npm run lint` passed with **0 errors and 0 warnings**.
- Production Build: `npm run build` compiled in 2.3s with **0 errors**.

### ⚠️ Known Limitations
- Processing is 100% in-browser; files larger than ~50MB may cause browser memory pressure.
- Cloud storage (S3), serverless persistence (DynamoDB), and remote API endpoints (Lambda/API Gateway) are deferred to future cloud phases.
