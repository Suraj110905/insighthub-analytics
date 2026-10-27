"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter, Download } from "lucide-react";
import { exportRecordsToCSV } from "@/lib/analytics";

const SAMPLE_TRANSACTIONS = [
  {
    id: "ORD-9042",
    customer: "Acme Industrial Corp",
    channel: "Direct",
    date: "Oct 26, 2026",
    amount: 4250.0,
    status: "Completed",
  },
  {
    id: "ORD-9041",
    customer: "Nova Retail Group",
    channel: "Organic",
    date: "Oct 25, 2026",
    amount: 1820.5,
    status: "Completed",
  },
  {
    id: "ORD-9040",
    customer: "Starlight Logistics",
    channel: "Referral",
    date: "Oct 25, 2026",
    amount: 940.0,
    status: "Processing",
  },
  {
    id: "ORD-9039",
    customer: "Apex Healthcare LLC",
    channel: "Direct",
    date: "Oct 24, 2026",
    amount: 3100.0,
    status: "Completed",
  },
  {
    id: "ORD-9038",
    customer: "Beacon Solutions",
    channel: "Social",
    date: "Oct 24, 2026",
    amount: 620.0,
    status: "Pending",
  },
  {
    id: "ORD-9037",
    customer: "Crestview Media Labs",
    channel: "Email",
    date: "Oct 23, 2026",
    amount: 1450.0,
    status: "Completed",
  },
  {
    id: "ORD-9036",
    customer: "Horizon BioTech",
    channel: "Organic",
    date: "Oct 22, 2026",
    amount: 2890.0,
    status: "Completed",
  },
  {
    id: "ORD-9035",
    customer: "Vanguard Tech Inc",
    channel: "Direct",
    date: "Oct 21, 2026",
    amount: 5400.0,
    status: "Completed",
  },
];

export default function TransactionsTable({
  data = null,
  externalSearch = "",
  isCustom = false,
}) {
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const dataset = data !== null ? data : SAMPLE_TRANSACTIONS;
  const effectiveSearch = (externalSearch || tableSearch).toLowerCase();

  const filtered = dataset.filter((item) => {
    const matchesSearch =
      String(item.id || "").toLowerCase().includes(effectiveSearch) ||
      String(item.customer || "").toLowerCase().includes(effectiveSearch) ||
      String(item.channel || "").toLowerCase().includes(effectiveSearch);

    const matchesStatus =
      statusFilter === "All" ||
      String(item.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status) => {
    const lower = String(status).toLowerCase();
    if (lower.includes("complete") || lower.includes("paid") || lower.includes("delivered")) {
      return "bg-teal-50 text-teal-700 border-teal-200/60";
    }
    if (lower.includes("process") || lower.includes("transit") || lower.includes("shipped")) {
      return "bg-sky-50 text-sky-700 border-sky-200/60";
    }
    if (lower.includes("pend") || lower.includes("unpaid") || lower.includes("review")) {
      return "bg-amber-50 text-amber-700 border-amber-200/60";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const handleExportFiltered = () => {
    if (!filtered.length) {
      alert("No records to export matching your search.");
      return;
    }
    const csvContent = exportRecordsToCSV(filtered);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `insighthub-export-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">
              {isCustom ? "Validated Transactions" : "Recent Transactions"}
            </h3>
            {isCustom && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                {dataset.length} Uploaded Records
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCustom
              ? "Verified business records extracted from your CSV file"
              : "Verified customer transactions and revenue entries"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter transactions..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-teal-700 focus:border-teal-700"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed / Paid</option>
              <option value="Processing">Processing / Transit</option>
              <option value="Pending">Pending / Unpaid</option>
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportFiltered}
            title="Download visible records as CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Order ID</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Channel / Category</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">
                <span className="flex items-center gap-1">
                  Amount
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </span>
              </th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginated.length > 0 ? (
              paginated.map((row, idx) => (
                <tr
                  key={`${row.id}-${idx}`}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {row.id}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">
                    {row.customer}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                      {row.channel}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{row.date}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">
                    {typeof row.amount === "number"
                      ? `$${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : row.amount}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-slate-400 text-xs"
                >
                  No transactions match the selected filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing{" "}
          <strong className="text-slate-700">
            {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          </strong>{" "}
          to{" "}
          <strong className="text-slate-700">
            {Math.min(currentPage * itemsPerPage, filtered.length)}
          </strong>{" "}
          of <strong className="text-slate-700">{filtered.length}</strong> transactions
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
