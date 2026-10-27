"use client";

import { useState } from "react";
import { useIsClient } from "@/lib/useIsClient";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CalendarX } from "lucide-react";

const SAMPLE_REVENUE_DATA = [
  { month: "Jan", revenue: 64200, orders: 740 },
  { month: "Feb", revenue: 71500, orders: 810 },
  { month: "Mar", revenue: 68900, orders: 790 },
  { month: "Apr", revenue: 84300, orders: 950 },
  { month: "May", revenue: 92400, orders: 1040 },
  { month: "Jun", revenue: 88100, orders: 990 },
  { month: "Jul", revenue: 104200, orders: 1180 },
  { month: "Aug", revenue: 112600, orders: 1260 },
  { month: "Sep", revenue: 119800, orders: 1330 },
  { month: "Oct", revenue: 128430, orders: 1429 },
];

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs">
        <p className="font-semibold text-slate-800 mb-1">{label} Performance</p>
        <p className="text-teal-700 font-bold text-sm">
          ${(data.revenue || 0).toLocaleString()}
        </p>
        <p className="text-slate-500 mt-0.5">
          {(data.orders || 0).toLocaleString()} orders
        </p>
      </div>
    );
  }
  return null;
}

export default function RevenueChart({ data = null, isCustom = false }) {
  const isMounted = useIsClient();
  const [metricView, setMetricView] = useState("revenue");

  const chartData = data !== null ? data : SAMPLE_REVENUE_DATA;

  if (!isMounted) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs h-84 flex items-center justify-center">
        <span className="text-xs text-slate-400">Loading chart metrics...</span>
      </div>
    );
  }

  // Handle case where custom CSV was uploaded but lacks date column
  if (isCustom && chartData.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs h-84 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <CalendarX className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-700">Date Dimension Unavailable</h4>
        <p className="text-[11px] text-slate-500 max-w-xs mt-1">
          The uploaded dataset does not contain an identified Date column (e.g. &apos;date&apos;, &apos;order_date&apos;). Timeline grouping is unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Revenue Trends</h3>
            {isCustom && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                Uploaded Data
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCustom ? "Chronological revenue aggregation from uploaded records" : "Monthly gross revenue and performance trajectory"}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto text-xs">
          <button
            onClick={() => setMetricView("revenue")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              metricView === "revenue"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Revenue ($)
          </button>
          <button
            onClick={() => setMetricView("orders")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              metricView === "orders"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F766E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) =>
                metricView === "revenue" ? `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}` : val
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={metricView}
              stroke="#0F766E"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorTeal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
