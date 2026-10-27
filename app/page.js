"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import RevenueChart from "@/components/RevenueChart";
import ChannelChart from "@/components/ChannelChart";
import TransactionsTable from "@/components/TransactionsTable";
import UploadModal from "@/components/UploadModal";
import { formatCurrency, exportRecordsToCSV } from "@/lib/analytics";
import { useAuth } from "@/lib/AuthContext";
import {
  isAwsBackendConfigured,
  listUserDatasets,
  downloadAndReopenDataset,
} from "@/lib/awsClient";
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
  FileSpreadsheet,
  RotateCcw,
  Cloud,
  FolderOpen,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  HardDrive,
} from "lucide-react";


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [customDataset, setCustomDataset] = useState(null);

  // AWS Cloud dataset history state
  const { isAuthenticated, isConfigured, openAuthModal, getIdToken } = useAuth();
  const [cloudDatasets, setCloudDatasets] = useState([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudError, setCloudError] = useState(null);
  const [openingDatasetId, setOpeningDatasetId] = useState(null);
  const [reopenError, setReopenError] = useState(null);
  const [reopenSuccess, setReopenSuccess] = useState(null);

  const isCloudEnabled = isAwsBackendConfigured() && isConfigured;

  const fetchCloudDatasets = useCallback(async () => {
    if (!isAuthenticated || !isCloudEnabled) return;
    setIsLoadingCloud(true);
    setCloudError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Unable to retrieve authentication token. Please sign in again.");
      }
      const result = await listUserDatasets(token);
      setCloudDatasets(result.items || []);
    } catch (err) {
      setCloudError(err.message || "Failed to load cloud datasets from AWS.");
    } finally {
      setIsLoadingCloud(false);
    }
  }, [isAuthenticated, isCloudEnabled, getIdToken]);

  useEffect(() => {
    let active = true;
    if (activeTab === "datasets" && isAuthenticated && isCloudEnabled) {
      const timer = setTimeout(() => {
        if (active) {
          fetchCloudDatasets();
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [activeTab, isAuthenticated, isCloudEnabled, fetchCloudDatasets]);

  const handleOpenCloudDataset = async (datasetItem) => {
    if (openingDatasetId) return; // Prevent duplicate clicks
    setOpeningDatasetId(datasetItem.id);
    setReopenError(null);
    setReopenSuccess(null);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("Your session has expired or is unauthorized. Please sign in again.");
      }
      const loadedDataset = await downloadAndReopenDataset(datasetItem, token);
      setCustomDataset(loadedDataset);
      setReopenSuccess(`Successfully reopened "${datasetItem.name}". Dashboard metrics recalculated.`);
    } catch (err) {
      setReopenError(err.message || "Failed to download and reopen dataset.");
    } finally {
      setOpeningDatasetId(null);
    }
  };

  const handleDatasetLoaded = (dataset) => {
    setCustomDataset(dataset);
    setReopenSuccess(null);
    setReopenError(null);
    if (dataset.cloud?.isCloud && isCloudEnabled && isAuthenticated) {
      fetchCloudDatasets();
    }
  };

  const handleResetDataset = () => {
    setCustomDataset(null);
    setReopenSuccess(null);
    setReopenError(null);
  };

  const handleExportCurrent = () => {
    const recordsToExport = customDataset
      ? customDataset.analytics.transactions
      : null;

    if (!recordsToExport || !recordsToExport.length) {
      const link = document.createElement("a");
      link.href = "/sample-business-data.csv";
      link.setAttribute("download", "sample-business-data.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const csvContent = exportRecordsToCSV(recordsToExport);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `insighthub-${customDataset.filename.replace(/\.csv$/i, "")}-analytics.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine active metrics
  const isCustom = customDataset !== null;
  const metrics = isCustom
    ? customDataset.analytics.metrics
    : {
        totalRevenue: 128430.0,
        totalOrders: 1429,
        averageOrderValue: 89.87,
        conversionRate: 3.42,
      };

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
              {/* Dataset Status Banner */}
              {isCustom ? (
                <div className="bg-teal-50 border border-teal-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-teal-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                        Active Dataset: {customDataset.filename}
                        {customDataset.cloud?.isCloud ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-300">
                            <Cloud className="w-3 h-3 text-teal-700" />
                            Saved to AWS Cloud
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Local Session
                          </span>
                        )}
                      </span>
                      <p className="text-teal-700 text-[11px] mt-0.5">
                        {customDataset.validRowCount.toLocaleString()} records parsed
                        {customDataset.skippedRowCount > 0 &&
                          ` • ${customDataset.skippedRowCount} skipped`}
                        {customDataset.cloud?.s3Key && ` • S3: ${customDataset.cloud.s3Key}`}
                      </p>
                    </div>

                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-3 py-1.5 bg-white border border-teal-200 text-teal-800 hover:bg-teal-100/50 rounded-lg font-semibold transition-colors shadow-2xs"
                    >
                      Replace Dataset
                    </button>
                    <button
                      onClick={handleResetDataset}
                      title="Reset to sample baseline data"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      Reset to Sample
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        Sample Data Mode
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Previewing baseline business metrics. Upload your business CSV to compute real-time metrics.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload Your CSV
                  </button>
                </div>
              )}

              {/* Page Welcome & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                    {isCustom ? "Dataset Performance Summary" : "Welcome back, Alex"}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    {isCustom
                      ? `Computed metrics for ${customDataset.filename} across all verified columns.`
                      : "Here is your company's baseline performance summary for the past 30 days."}
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-50 transition-colors">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {isCustom ? "All Uploaded Dates" : "Last 30 Days"}
                  </button>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    {isCustom ? "Change CSV" : "Upload Dataset"}
                  </button>
                  <button
                    onClick={handleExportCurrent}
                    title="Export current analytics records to CSV"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* 4 Key Business Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <MetricCard
                  title="Total Revenue"
                  value={formatCurrency(metrics.totalRevenue)}
                  change={isCustom ? null : "+12.5%"}
                  isPositive={true}
                  icon={DollarSign}
                  timeframe={isCustom ? "Sum of all sales records" : "vs last month"}
                />
                <MetricCard
                  title="Total Orders"
                  value={metrics.totalOrders.toLocaleString()}
                  change={isCustom ? null : "+8.2%"}
                  isPositive={true}
                  icon={ShoppingBag}
                  timeframe={isCustom ? "Unique order transactions" : "vs last month"}
                />
                <MetricCard
                  title="Conversion Rate"
                  value={
                    metrics.conversionRate !== null
                      ? `${metrics.conversionRate}%`
                      : "N/A"
                  }
                  change={isCustom ? null : "-0.4%"}
                  isPositive={metrics.conversionRate !== null ? true : false}
                  icon={Activity}
                  timeframe={
                    isCustom && metrics.conversionRate === null
                      ? "Requires visitor data"
                      : "vs last month"
                  }
                />
                <MetricCard
                  title="Average Order Value"
                  value={formatCurrency(metrics.averageOrderValue)}
                  change={isCustom ? null : "+4.1%"}
                  isPositive={true}
                  icon={CreditCard}
                  timeframe={isCustom ? "Revenue / Orders" : "vs last month"}
                />
              </div>

              {/* Interactive Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RevenueChart
                    data={isCustom ? customDataset.analytics.revenueChartData : null}
                    isCustom={isCustom}
                  />
                </div>
                <div className="lg:col-span-1">
                  <ChannelChart
                    data={isCustom ? customDataset.analytics.categoryChartData : null}
                    isCustom={isCustom}
                  />
                </div>
              </div>

              {/* Recent Transactions Table */}
              <div>
                <TransactionsTable
                  data={isCustom ? customDataset.analytics.transactions : null}
                  externalSearch={searchQuery}
                  isCustom={isCustom}
                />
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
                        Business Datasets & CSV Engine
                      </h2>
                      <p className="text-xs text-slate-500">
                        Inspect uploaded schemas, detected column mappings, and manage data files
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      {isCustom ? "Upload New CSV" : "Import CSV File"}
                    </button>
                    {isCustom && (
                      <button
                        onClick={handleResetDataset}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Reset to Sample
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Dataset Status Card */}
                {isCustom ? (
                  <div className="mt-6 p-5 bg-teal-50/60 border border-teal-200/80 rounded-xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-300/60 mb-2">
                          Active Custom Dataset
                        </span>
                        <h3 className="text-sm font-bold text-slate-800">
                          {customDataset.filename}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {customDataset.validRowCount.toLocaleString()} valid records • {customDataset.headers.length} headers detected
                        </p>
                        {customDataset.cloud?.isCloud ? (
                          <div className="mt-2 text-[11px] text-teal-800 bg-teal-100/70 p-2 rounded-lg border border-teal-200">
                            <span className="font-semibold flex items-center gap-1">
                              <Cloud className="w-3 h-3 text-teal-700" />
                              AWS Cloud Synchronized
                            </span>
                            <span className="font-mono text-[10px] block text-teal-700 truncate mt-0.5">
                              S3 Key: {customDataset.cloud.s3Key}
                            </span>
                            <span className="text-[10px] text-teal-700 font-medium block mt-1">
                              Backed by private S3 and indexed in DynamoDB. Ready to reopen anytime.
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Storage: Local browser memory only (Not synchronized with AWS).
                          </p>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold bg-white border border-teal-200 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Calculated
                      </span>
                    </div>

                    {/* Detected Schema Table */}
                    <div className="pt-3 border-t border-teal-200/60">
                      <h4 className="text-xs font-bold text-slate-800 mb-2">
                        Detected Column Mappings
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-teal-200/60">
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Revenue Column</span>
                          <span className="font-bold text-slate-800 mt-0.5 block truncate">
                            {customDataset.analytics.mapping.revenue || "Not Found"}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-teal-200/60">
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Date Column</span>
                          <span className="font-bold text-slate-800 mt-0.5 block truncate">
                            {customDataset.analytics.mapping.date || "Not Found"}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-teal-200/60">
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Category / Channel</span>
                          <span className="font-bold text-slate-800 mt-0.5 block truncate">
                            {customDataset.analytics.mapping.category || "Not Found"}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-teal-200/60">
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Order ID</span>
                          <span className="font-bold text-slate-800 mt-0.5 block truncate">
                            {customDataset.analytics.mapping.orderId || "Not Found"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700 mb-2">
                          Baseline Sample Dataset
                        </span>
                        <h3 className="text-sm font-bold text-slate-800">
                          sample-business-data.csv
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          22 sample transactions • Columns: order_id, customer, date, channel, revenue, status
                        </p>
                      </div>
                      <a
                        href="/sample-business-data.csv"
                        download
                        className="inline-flex items-center gap-1.5 text-xs text-teal-700 font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Template CSV
                      </a>
                    </div>
                  </div>
                )}

                {/* AWS Cloud Dataset History Section */}
                <div className="mt-6 p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          AWS Cloud Saved Datasets
                        </h3>
                        <p className="text-xs text-slate-500">
                          View previously saved cloud datasets and reopen them with live dashboard analytics
                        </p>
                      </div>
                    </div>

                    {isCloudEnabled && isAuthenticated && (
                      <button
                        onClick={fetchCloudDatasets}
                        disabled={isLoadingCloud}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors self-start sm:self-auto disabled:opacity-50"
                        title="Refresh dataset list"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCloud ? "animate-spin text-teal-700" : "text-slate-500"}`} />
                        Refresh
                      </button>
                    )}
                  </div>

                  {/* Reopen Feedback Notifications */}
                  {reopenSuccess && (
                    <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between gap-3 text-xs text-teal-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>{reopenSuccess}</span>
                      </div>
                      <button
                        onClick={() => setActiveTab("overview")}
                        className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 shrink-0"
                      >
                        View Dashboard <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {reopenError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{reopenError}</span>
                      </div>
                      <button
                        onClick={() => setReopenError(null)}
                        className="text-xs text-rose-700 hover:text-rose-900 font-semibold"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* State 1: Local / Offline Mode */}
                  {!isCloudEnabled && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                      <HardDrive className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-700">
                          Local Mode Active (AWS Disabled)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Cloud synchronization is disabled. Datasets uploaded in local mode remain in browser RAM and are not persisted to AWS. All KPI calculations, search, chart generation, and CSV exports remain 100% functional locally without credentials.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* State 2: Cloud Enabled but Unauthenticated */}
                  {isCloudEnabled && !isAuthenticated && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Cloud className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">
                            Sign in to access your AWS datasets
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Connect with your Amazon Cognito account to access your saved dataset history, download securely from S3, and restore previous analytics.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={openAuthModal}
                        className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs"
                      >
                        Sign In / Register
                      </button>
                    </div>
                  )}

                  {/* State 3: Loading Cloud Datasets */}
                  {isCloudEnabled && isAuthenticated && isLoadingCloud && cloudDatasets.length === 0 && (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
                      <p className="text-xs font-medium">Fetching saved datasets from AWS DynamoDB...</p>
                    </div>
                  )}

                  {/* State 4: Error Loading Datasets */}
                  {isCloudEnabled && isAuthenticated && cloudError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{cloudError}</span>
                      </div>
                      <button
                        onClick={fetchCloudDatasets}
                        className="px-3 py-1 bg-white border border-rose-200 text-rose-800 hover:bg-rose-100/50 rounded-lg text-xs font-semibold transition-colors shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* State 5: Authenticated & Empty */}
                  {isCloudEnabled && isAuthenticated && !isLoadingCloud && !cloudError && cloudDatasets.length === 0 && (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Cloud className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-700">
                        No cloud datasets saved yet
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        When you upload a CSV with cloud synchronization enabled, it will appear here so you can securely reopen it anytime.
                      </p>
                      <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs mt-2"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload First Cloud Dataset
                      </button>
                    </div>
                  )}

                  {/* State 6: Populated Cloud Datasets List */}
                  {isCloudEnabled && isAuthenticated && cloudDatasets.length > 0 && (
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                      {cloudDatasets.map((item) => {
                        const isActive =
                          customDataset?.cloud?.id === item.id ||
                          customDataset?.cloud?.s3Key === item.s3Key;
                        const isOpening = openingDatasetId === item.id;
                        const uploadDate = item.createdAt
                          ? new Date(item.createdAt).toLocaleString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Unknown Date";

                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              isActive ? "bg-teal-50/50" : "bg-white hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isActive
                                    ? "bg-teal-700 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-800 truncate">
                                    {item.name}
                                  </span>
                                  {isActive && (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-300">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                                  <span>Uploaded: {uploadDate}</span>
                                  <span>•</span>
                                  <span className="font-medium text-slate-700">
                                    {Number(item.rowCount).toLocaleString()} rows
                                  </span>
                                  {item.columnCount && (
                                    <>
                                      <span>•</span>
                                      <span>{item.columnCount} columns</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                  Currently Open
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleOpenCloudDataset(item)}
                                  disabled={openingDatasetId !== null}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                                  title={`Open ${item.name} in dashboard`}
                                >
                                  {isOpening ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      Opening...
                                    </>
                                  ) : (
                                    <>
                                      <FolderOpen className="w-3.5 h-3.5" />
                                      Open Dataset
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Supported Schemas Documentation */}
                <div className="mt-6 p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Supported CSV Schema Specifications
                  </h4>
                  <p className="text-xs text-slate-600">
                    InsightHub dynamically maps common business column naming conventions:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <strong className="text-slate-800 block mb-1">💰 Revenue / Sales</strong>
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">revenue</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">sales</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">amount</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">total</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">price</code>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <strong className="text-slate-800 block mb-1">📅 Date / Time</strong>
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">date</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">order_date</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">transaction_date</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">created_at</code>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <strong className="text-slate-800 block mb-1">🏷️ Category / Channel</strong>
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">channel</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">category</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">product_category</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">source</code>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <strong className="text-slate-800 block mb-1">🔢 Order Identifier</strong>
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">order_id</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">orderid</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">transaction_id</code>,{" "}
                      <code className="text-[11px] text-teal-800 bg-teal-50 px-1 py-0.5 rounded">id</code>
                    </div>
                  </div>
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
                onClick={handleExportCurrent}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Current Analytics Dataset (CSV)
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
                Client-Side Engine Active: No cloud credentials or server endpoints required.
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
        onDatasetLoaded={handleDatasetLoaded}
        currentDataset={customDataset}
        onResetDataset={handleResetDataset}
      />
    </div>
  );
}
