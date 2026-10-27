"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Cloud,
  Lock,
  RotateCw,
  AlertCircle,
} from "lucide-react";

import { parseAndValidateCSV } from "@/lib/csvParser";
import { computeDashboardAnalytics } from "@/lib/analytics";
import { useAuth } from "@/lib/AuthContext";
import {
  isAwsBackendConfigured,
  uploadDatasetToCloud,
  MAX_CSV_SIZE_BYTES,
  CloudUploadError,
} from "@/lib/awsClient";

export default function UploadModal({
  isOpen,
  onClose,
  onDatasetLoaded,
  currentDataset = null,
  onResetDataset,
}) {
  const { isAuthenticated, getIdToken, openAuthModal } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [uploadProgressStep, setUploadProgressStep] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [partialFailureInfo, setPartialFailureInfo] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [saveToCloud, setSaveToCloud] = useState(true);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const isCloudAvailable = isAwsBackendConfigured();

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

    if (file.size > MAX_CSV_SIZE_BYTES) {
      setErrorMessage(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB maximum upload limit.`
      );
      setPreviewData(null);
      return;
    }

    setErrorMessage(null);
    setPartialFailureInfo(null);
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
    setPartialFailureInfo(null);
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

  /**
   * Applies the dataset to the dashboard.
   * If saveToCloud is active, performs the 3-step cloud upload pipeline first:
   * 1. Presigned POST URL -> 2. S3 direct upload -> 3. DynamoDB metadata record
   */
  const handleApply = async () => {
    if (!previewData) return;

    setErrorMessage(null);
    setPartialFailureInfo(null);

    // Path A: Cloud Upload Mode (AWS enabled, user authenticated, and cloud save opted)
    const shouldUploadToCloud = isCloudAvailable && isAuthenticated && saveToCloud;

    if (shouldUploadToCloud) {
      setIsUploadingToCloud(true);
      setUploadProgressStep("Preparing secure upload credentials...");

      try {
        const token = getIdToken();
        if (!token) {
          throw new CloudUploadError("Your authentication session has expired. Please sign in again.", {
            status: 401,
          });
        }

        const cloudResult = await uploadDatasetToCloud({
          file: previewData.file,
          validRowCount: previewData.parsed.validRowCount,
          headers: previewData.parsed.headers,
          metrics: previewData.analytics.metrics,
          token,
          onProgress: (stepText) => setUploadProgressStep(stepText),
        });

        // Cloud upload succeeded completely
        onDatasetLoaded({
          filename: previewData.parsed.filename,
          headers: previewData.parsed.headers,
          rows: previewData.parsed.rows,
          validRowCount: previewData.parsed.validRowCount,
          skippedRowCount: previewData.parsed.skippedRowCount,
          analytics: previewData.analytics,
          cloud: {
            id: cloudResult.dataset?.id,
            s3Key: cloudResult.s3Key,
            savedAt: cloudResult.dataset?.createdAt || new Date().toISOString(),
            isCloud: true,
          },
        });

        onClose();
      } catch (err) {
        setIsUploadingToCloud(false);
        setUploadProgressStep("");

        if (err.isPartialFailure) {
          setPartialFailureInfo({
            message: err.message,
            s3Key: err.s3Key,
          });
        } else {
          setErrorMessage(err.message || "Failed to upload dataset to AWS.");
        }
      } finally {
        setIsUploadingToCloud(false);
      }
      return;
    }

    // Path B: Local Offline Mode (instant memory load without AWS calls)
    onDatasetLoaded({
      filename: previewData.parsed.filename,
      headers: previewData.parsed.headers,
      rows: previewData.parsed.rows,
      validRowCount: previewData.parsed.validRowCount,
      skippedRowCount: previewData.parsed.skippedRowCount,
      analytics: previewData.analytics,
      cloud: null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isUploadingToCloud}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
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
              {isCloudAvailable && isAuthenticated
                ? "Private S3 Storage & DynamoDB Metadata • Direct Upload"
                : "Client-side CSV analytics engine • Local in-memory parsing"}
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
                {currentDataset.cloud?.isCloud && " • Persisted in AWS Cloud"}
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

        {/* Cloud Status Guidance Banner */}
        {isCloudAvailable && !isAuthenticated && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">AWS Cloud Backend Available</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Sign in to persist datasets to private S3 and DynamoDB, or apply locally for this session.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openAuthModal}
              className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Partial Failure Warning Banner */}
        {partialFailureInfo && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              Partial Upload Notice: S3 Upload Succeeded, Metadata Failed
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {partialFailureInfo.message}
            </p>
            {partialFailureInfo.s3Key && (
              <p className="text-[10px] font-mono text-amber-700 bg-amber-100/70 p-1.5 rounded truncate">
                S3 Key: {partialFailureInfo.s3Key}
              </p>
            )}
            <p className="text-[10px] text-amber-700 italic pt-0.5">
              Recovery: You can apply this dataset locally, or retry the upload once your network/credentials are verified.
            </p>
          </div>
        )}

        {/* In-Flight Cloud Upload Progress Banner */}
        {isUploadingToCloud && (
          <div className="mb-4 p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3 text-xs text-teal-800 animate-pulse">
            <RotateCw className="w-4 h-4 text-teal-700 animate-spin shrink-0" />
            <div>
              <p className="font-semibold text-teal-900">Cloud Upload in Progress</p>
              <p className="text-[11px] text-teal-700">{uploadProgressStep}</p>
            </div>
          </div>
        )}

        {/* Dropzone Container */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-teal-700 bg-teal-50/50"
              : "border-slate-300 hover:border-teal-600 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 text-slate-600" />
            )}
          </div>

          <p className="text-sm font-semibold text-slate-700 mb-1">
            {isProcessing
              ? "Parsing & validating CSV..."
              : "Choose a CSV file or drag & drop it here"}
          </p>
          <span className="text-xs text-slate-400 block mb-2">
            Maximum file size: 10 MB • Comma-separated files (.csv)
          </span>
          <span className="text-[11px] text-slate-400 block">
            Supports quotes, commas, and aliases (Revenue, Date, Channel, Order ID)
          </span>
        </div>

        {/* Quick Sample Button */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Need a sample file to test right away?</span>
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isProcessing || isUploadingToCloud}
            className="font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline disabled:opacity-40"
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
                  {previewData.file?.size &&
                    ` • ${(previewData.file.size / 1024).toFixed(1)} KB`}
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

            {/* Cloud Persistence Option (Visible when AWS is configured and authenticated) */}
            {isCloudAvailable && isAuthenticated && (
              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={saveToCloud}
                    onChange={(e) => setSaveToCloud(e.target.checked)}
                    disabled={isUploadingToCloud}
                    className="w-4 h-4 rounded text-teal-700 focus:ring-teal-700"
                  />
                  <span className="flex items-center gap-1 font-medium">
                    <Cloud className="w-3.5 h-3.5 text-teal-700" />
                    Save to AWS Cloud (Private S3 + DynamoDB)
                  </span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">ap-south-1</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isUploadingToCloud}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!previewData || isProcessing || isUploadingToCloud}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            {isUploadingToCloud ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading to Cloud...</span>
              </>
            ) : isCloudAvailable && isAuthenticated && saveToCloud ? (
              <>
                <Cloud className="w-3.5 h-3.5" />
                <span>Upload to Cloud & Apply</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Apply to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
