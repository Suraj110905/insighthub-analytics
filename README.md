# 📊 InsightHub — Business Analytics Made Simple

**InsightHub** is a fast, lightweight analytics dashboard that turns messy business spreadsheets (CSVs) into clean charts, live KPIs, and actionable insights.

It works **100% offline in your browser** right out of the box — no credit card, account, or AWS setup required. If you want cloud backup, it seamlessly connects to an AWS serverless backend with secure user login.

---

## 🌟 What Can InsightHub Do?

- ⚡ **Instant CSV Insights**: Drag and drop any business CSV (orders, sales, transactions) and watch your revenue, conversion rates, and order counts calculate in real time.
- 📈 **Interactive Visuals**: Beautiful revenue trends over time and channel breakdown charts powered by Recharts.
- 🔒 **Privacy-First (Local Mode)**: Your data never leaves your device unless you choose to save it to the cloud.
- ☁️ **Cloud Sync & History**: Log in securely with Amazon Cognito to save datasets to private Amazon S3 and revisit your previous uploads anytime.
- 📱 **Clean & Responsive**: Modern, assessment-ready design built with Next.js and Tailwind CSS that looks great on mobile, tablet, and desktop.

---

## 🏗️ How It Works

```
📁 Your Business CSV
   ↓
🖥️ InsightHub Dashboard (Next.js & Browser Engine)
   ├── 🟢 Works 100% Offline (PapaParse + in-memory calculation)
   │
   └── ☁️ Optional Cloud Backup (When Signed In)
        ├── 🔐 Amazon Cognito (Secure user authentication)
        ├── 🌐 AWS API Gateway (Protected REST endpoints)
        ├── ⚙️ AWS Lambda (Node.js 24 on ARM64)
        ├── 🗄️ Amazon DynamoDB (Isolated user dataset history)
        └── 🪣 Private Amazon S3 (Encrypted file storage)
```

---

## 🛠️ Built With

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Recharts](https://recharts.org/), [Lucide Icons](https://lucide.dev/)
- **Data Parsing**: [PapaParse](https://www.papaparse.com/) (RFC 4180 compliant)
- **Cloud Infrastructure**: AWS SAM, Amazon S3, AWS Lambda, Amazon DynamoDB, Amazon Cognito, Amazon CloudFront

---

## 🚀 Quick Start (Local Demo)

Get InsightHub running locally in less than 2 minutes:

### 1. Clone the repository
```bash
git clone https://github.com/Suraj110905/insighthub-analytics.git
cd insighthub-analytics
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```

### 4. Open in browser
Visit **[http://localhost:3000](http://localhost:3000)**. 
Click **"Upload Your CSV"** or explore with the built-in sample business data!

---

## 🧪 Testing

Both frontend and backend include zero-dependency automated test suites:

```bash
# Run all frontend tests (34 tests)
npm test

# Run backend tests (27 tests)
cd backend && npm test
```

---

## 📄 License

MIT License — feel free to use and adapt this project!
