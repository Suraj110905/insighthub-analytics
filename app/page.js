import { BarChart3, UploadCloud, Database, Layers, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">InsightHub</h1>
              <p className="text-xs text-slate-500">Business Analytics & Metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              Phase 1: Foundation Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard Canvas */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Banner */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 mb-8 shadow-xs">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">
              Foundation Established
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1 mb-2">
              Welcome to InsightHub
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              InsightHub is designed to help business stakeholders upload CSV data, inspect records,
              compute KPIs in real time, visualize trends, and export structured reports.
            </p>
          </div>
        </section>

        {/* Milestone Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-4 border border-teal-100">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Next.js App Router</h3>
              <p className="text-xs text-slate-500">
                Pure JavaScript architecture with server and client components support.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-teal-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Configured & Verified
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-4 border border-slate-200">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Tailwind CSS & Styling</h3>
              <p className="text-xs text-slate-500">
                Restrained minimal styling inspired by clean dashboard layouts.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-teal-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Active & Responsive
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-4 border border-slate-200">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Data & Charts Ready</h3>
              <p className="text-xs text-slate-500">
                Prepared for CSV uploads, KPI calculations, and Recharts integration.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-teal-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Dependencies Installed
            </div>
          </div>
        </div>

        {/* Next Steps Guidance Panel */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Assessment Phase 1 Checklist
          </h3>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Environment verified: Node.js v22, npm v11, Git initialized
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Isolated repository initialized with protected `.gitignore`
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              JavaScript App Router configuration with Tailwind CSS styling
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Documentation created: README.md, DEVELOPMENT_LOG.md, and .env.example
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>InsightHub — Business Analytics Dashboard</span>
          <span>Prepared for AWS Amplify & Cloud Deployment</span>
        </div>
      </footer>
    </div>
  );
}
