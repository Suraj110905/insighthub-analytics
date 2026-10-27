# 📊 InsightHub — Minimal Business Analytics Web App

InsightHub is an assessment-ready, lightweight business intelligence and analytics web application. It allows business users to upload business CSV datasets, inspect individual data records, compute key performance indicators (KPIs) in real time, view interactive trend charts, and export structured business summaries.

---

## 🏗️ Architecture Overview

The system is structured as a modern web application designed for seamless serverless cloud integration:

```
📱 Client (Next.js App Router Frontend)
   │
   ├── 🎨 UI Components (components/MetricCard.js, etc.)
   ├── ⚙️ Client-side CSV Parser & Formula Helpers (lib/analytics.js)
   └── 🌐 Next.js Pages & Layouts (app/layout.js, app/page.js)
   │
   ▼ (Future Phase Cloud Services)
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
│   ├── globals.css       # Global CSS with Tailwind setup & custom tokens
│   ├── layout.js         # Root HTML layout and metadata wrapper
│   └── page.js           # Main dashboard homepage
├── components/           # Reusable UI elements (cards, buttons, modal dialogs)
│   └── MetricCard.js     # Card component for business KPIs
├── lib/                  # Business logic and helper functions
│   └── analytics.js      # Statistical formulas and data formatting
├── public/               # Static assets (images, icons, sample data)
├── .env.example          # Environment variable template with security guidelines
├── .gitignore            # Git exclusion rules (protects credentials & outputs)
├── DEVELOPMENT_LOG.md    # Log of tasks completed, testing results, and issues
├── next.config.mjs       # Next.js configuration (JavaScript)
├── package.json          # Dependencies and npm scripts
├── postcss.config.mjs    # PostCSS configuration for Tailwind CSS
└── README.md             # Project documentation (this file)
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | React web application framework |
| **Language** | JavaScript (ES6+) | Clean, beginner-friendly code without build complexity |
| **Styling** | Tailwind CSS v4 & PostCSS | Minimal, restrained dashboard styling |
| **Charts** | Recharts | Interactive SVG bar charts, line graphs, and pie charts |
| **Icons** | Lucide React | Clean, lightweight UI icons |
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

### Installation & Setup

1. **Clone or open the repository:**
   ```bash
   cd insighthub
   ```

2. **Verify dependencies:**
   Dependencies have been configured. To reinstall or update:
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the InsightHub dashboard.

---

## 🔐 Environment & Security Guidelines

- InsightHub strictly keeps application secrets out of source control.
- Copy `.env.example` to `.env.local` for local environment configuration:
  ```bash
  cp .env.example .env.local
  ```
- **Never commit `.env` or `.env.local` files to Git.**
- **Never put AWS IAM secret keys in client-side code.**

---

## ☁️ Future AWS Cloud Integration Steps

In upcoming development phases, the application will connect to AWS serverless infrastructure:
1. **S3 Bucket Creation**: For secure CSV document uploads via presigned URLs.
2. **Lambda Functions**: Node.js serverless functions to parse datasets and aggregate metrics.
3. **API Gateway**: REST API routes (`POST /upload`, `GET /metrics`, `GET /reports`).
4. **DynamoDB Table**: Key-value data store for user records and KPI history.
5. **AWS Amplify Hosting**: Continuous deployment connected to the Git repository.
