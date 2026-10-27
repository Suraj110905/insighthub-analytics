"use client";

import { useState } from "react";
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function UploadModal({ isOpen, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedFile(file);
        setUploadSuccess(false);
      } else {
        alert("Please select a valid CSV file (.csv)");
      }
    }
  };

  const handleSimulateUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
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
              Import a CSV file to recalculate KPIs and refresh analytics
            </p>
          </div>
        </div>

        {/* Phase 3 Roadmap Notice */}
        <div className="mb-4 bg-teal-50/70 border border-teal-200/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-teal-800">
          <AlertCircle className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Phase 2 Prototype Active:</strong> Client upload dropzone is functional. In Phase 3, this connects to AWS S3 & Lambda for serverless parsing.
          </div>
        </div>

        {/* Dropzone Container */}
        <label className="border-2 border-dashed border-slate-200 hover:border-teal-600 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-teal-50/20 block">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-700">
            Click to browse or drag and drop your CSV
          </span>
          <span className="text-[11px] text-slate-400 mt-1">
            Standard UTF-8 CSV up to 10MB (Order ID, Customer, Revenue, Channel)
          </span>
        </label>

        {/* Selected File Feedback */}
        {selectedFile && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="font-medium text-slate-800 truncate">
                {selectedFile.name}
              </span>
              <span className="text-slate-400 text-[10px]">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            {uploadSuccess ? (
              <span className="inline-flex items-center gap-1 text-teal-700 font-semibold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <button
                onClick={handleSimulateUpload}
                disabled={isUploading}
                className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium text-xs transition-colors disabled:opacity-50"
              >
                {isUploading ? "Verifying..." : "Validate CSV"}
              </button>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedFile) {
                alert(`Dataset "${selectedFile.name}" selected! Full S3 parsing will be activated in Phase 3.`);
                onClose();
              } else {
                alert("Please select a CSV file first.");
              }
            }}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            Confirm & Inspect
          </button>
        </div>
      </div>
    </div>
  );
}
