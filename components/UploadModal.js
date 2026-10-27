"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ArrowRight,
} from "lucide-react";
import { parseAndValidateCSV } from "@/lib/csvParser";
import { computeDashboardAnalytics } from "@/lib/analytics";

export default function UploadModal({
  isOpen,
  onClose,
  onDatasetLoaded,
  currentDataset = null,
  onResetDataset,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMessage("Unsupported file format. Please upload a valid CSV file (.csv).");
      setPreviewData(null);
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const parsed = await parseAndValidateCSV(text, file.name);

      if (!parsed.success) {
        setErrorMessage(parsed.error || "Failed to parse CSV file.");
        setPreviewData(null);
        setIsProcessing(false);
        return;
      }

      // Compute initial analytics to verify column mapping
      const analytics = computeDashboardAnalytics(parsed.rows, parsed.headers);

      setPreviewData({
        parsed,
        analytics,
        file,
      });
    } catch (err) {
      setErrorMessage(`Error reading file: ${err.message}`);
      setPreviewData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/sample-business-data.csv");
      if (!res.ok) throw new Error("Could not load sample file");
      const text = await res.text();
      const parsed = await parseAndValidateCSV(text, "sample-business-data.csv");
      const analytics = computeDashboardAnalytics(parsed.rows, parsed.headers);
      setPreviewData({
        parsed,
        analytics,
        file: { name: "sample-business-data.csv", size: text.length },
      });
    } catch (err) {
      setErrorMessage(`Sample load error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!previewData) return;
    onDatasetLoaded({
      filename: previewData.parsed.filename,
      headers: previewData.parsed.headers,
      rows: previewData.parsed.rows,
      validRowCount: previewData.parsed.validRowCount,
      skippedRowCount: previewData.parsed.skippedRowCount,
      analytics: previewData.analytics,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Upload Business Dataset
            </h3>
            <p className="text-xs text-slate-500">
              Client-side CSV analytics engine • No data sent to any server
            </p>
          </div>
        </div>

        {/* Active Dataset Status (if dataset already active) */}
        {currentDataset && !previewData && (
          <div className="mb-4 p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl flex items-center justify-between text-xs text-teal-800">
            <div>
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                Active Dataset: {currentDataset.filename}
              </p>
              <p className="text-[11px] text-teal-600 mt-0.5">
                {currentDataset.validRowCount} records loaded
              </p>
            </div>
            {onResetDataset && (
              <button
                onClick={() => {
                  onResetDataset();
                  onClose();
                }}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
              >
                Reset to Sample
              </button>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Validation Error:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-teal-600 bg-teal-50/40"
              : "border-slate-200 hover:border-teal-600 bg-slate-50/50 hover:bg-teal-50/20"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
            <FileText className="w-6 h-6 text-teal-700" />
          </div>
          <span className="text-xs font-semibold text-slate-800">
            {isProcessing ? "Parsing CSV dataset..." : "Click to select or drag and drop your CSV file"}
          </span>
          <span className="text-[11px] text-slate-400 mt-1">
            Supports standard CSVs with quotes, commas, and aliases (Revenue, Date, Channel, Order ID)
          </span>
        </div>

        {/* Quick Sample Button */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Need a sample file to test right away?</span>
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isProcessing}
            className="font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline"
          >
            <FileCode className="w-3.5 h-3.5" />
            Load Sample Dataset
          </button>
        </div>

        {/* Parsing Preview Section */}
        {previewData && (
          <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {previewData.parsed.filename}
                </p>
                <p className="text-[11px] text-slate-500">
                  {previewData.parsed.validRowCount} valid records
                  {previewData.parsed.skippedRowCount > 0 &&
                    ` • ${previewData.parsed.skippedRowCount} skipped`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-teal-700 text-xs font-semibold bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Validated
              </span>
            </div>

            {/* Column Mapping Summary */}
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400">Revenue Column:</span>{" "}
                <strong className="text-slate-700">
                  {previewData.analytics.mapping.revenue || "Not Found"}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Date Column:</span>{" "}
                <strong className="text-slate-700">
                  {previewData.analytics.mapping.date || "Not Found"}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Channel / Category:</span>{" "}
                <strong className="text-slate-700">
                  {previewData.analytics.mapping.category || "Not Found"}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Order ID:</span>{" "}
                <strong className="text-slate-700">
                  {previewData.analytics.mapping.orderId || "Not Found"}
                </strong>
              </div>
            </div>

            {previewData.analytics.schemaNotice && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                {previewData.analytics.schemaNotice}
              </p>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!previewData || isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            Apply to Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
