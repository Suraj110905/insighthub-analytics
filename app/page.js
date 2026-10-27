"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import RevenueChart from "@/components/RevenueChart";
import ChannelChart from "@/components/ChannelChart";
import TransactionsTable from "@/components/TransactionsTable";
import UploadModal from "@/components/UploadModal";
import {
  DollarSign,
  ShoppingBag,
  Activity,
  CreditCard,
  UploadCloud,
  Download,
  Calendar,
  Database,
  FileBarChart,
  Settings as SettingsIcon,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Responsive Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          pageTitle={activeTab}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
        />

        {/* Dynamic Content Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Page Welcome & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                    Welcome back, Alex
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Here is your company&apos;s real-time performance summary for the past 30 days.
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-50 transition-colors">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload Dataset
                  </button>
                  <button
                    onClick={() => alert("Report generation scheduled. Full export capability will link with S3 in Phase 3.")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Export
                  </button>
                </div>
              </div>

              {/* 4 Key Business Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <MetricCard
                  title="Total Revenue"
                  value="$128,430.00"
                  change="+12.5%"
                  isPositive={true}
                  icon={DollarSign}
                />
                <MetricCard
                  title="Total Orders"
                  value="1,429"
                  change="+8.2%"
                  isPositive={true}
                  icon={ShoppingBag}
                />
                <MetricCard
                  title="Conversion Rate"
                  value="3.42%"
                  change="-0.4%"
                  isPositive={false}
                  icon={Activity}
                />
                <MetricCard
                  title="Average Order Value"
                  value="$89.87"
                  change="+4.1%"
                  isPositive={true}
                  icon={CreditCard}
                />
              </div>

              {/* Interactive Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RevenueChart />
                </div>
                <div className="lg:col-span-1">
                  <ChannelChart />
                </div>
              </div>

              {/* Recent Transactions Table */}
              <div>
                <TransactionsTable externalSearch={searchQuery} />
              </div>
            </div>
          )}

          {/* Datasets View */}
          {activeTab === "datasets" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">
                        Business Datasets
                      </h2>
                      <p className="text-xs text-slate-500">
                        Manage imported CSV tables, schemas, and processing status
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Import New CSV
                  </button>
                </div>

                {/* Sample Dataset Card */}
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60 mb-2">
                        Active Dataset
                      </span>
                      <h3 className="text-sm font-bold text-slate-800">
                        q3_q4_business_sales_2026.csv
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        1,429 records • 6 columns: Order ID, Customer, Channel, Date, Amount, Status
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      Parsed & Active
                    </span>
                  </div>
                </div>

                {/* Phase 3 Notice */}
                <div className="mt-6 p-4 bg-white border border-dashed border-slate-200 rounded-xl text-center">
                  <p className="text-xs text-slate-600 font-medium">
                    Phase 3 will connect this view to Amazon S3 bucket storage & Lambda CSV parsing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reports View */}
          {activeTab === "reports" && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                <FileBarChart className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Executive Reports</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Generate and export standardized summaries of your financial metrics, acquisition costs, and channel conversions.
              </p>
              <button
                onClick={() => setActiveTab("overview")}
                className="inline-block mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Return to Overview
              </button>
            </div>
          )}

          {/* Settings View */}
          {activeTab === "settings" && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                <SettingsIcon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Workspace Settings</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Configure regional currency standards, alert thresholds, and future AWS cloud connections.
              </p>
              <button
                onClick={() => setActiveTab("overview")}
                className="inline-block mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Return to Overview
              </button>
            </div>
          )}
        </main>
      </div>

      {/* CSV Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
