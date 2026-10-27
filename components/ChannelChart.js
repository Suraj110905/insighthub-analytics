"use client";

import { useIsClient } from "@/lib/useIsClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Layers } from "lucide-react";

const SAMPLE_CHANNEL_DATA = [
  { channel: "Direct", revenue: 48800, percentage: 38 },
  { channel: "Organic", revenue: 34600, percentage: 27 },
  { channel: "Referral", revenue: 23100, percentage: 18 },
  { channel: "Social", revenue: 15400, percentage: 12 },
  { channel: "Email", revenue: 6530, percentage: 5 },
];

const BAR_COLORS = ["#0F766E", "#0D9488", "#14B8A6", "#2DD4BF", "#5EEAD4", "#99F6E4"];

function CustomChannelTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-md text-xs">
        <p className="font-semibold text-slate-800">{data.channel}</p>
        <p className="text-teal-700 font-bold mt-0.5">
          ${(data.revenue || 0).toLocaleString()}
        </p>
        <p className="text-slate-500 text-[10px]">{data.percentage}% of total sales</p>
      </div>
    );
  }
  return null;
}

export default function ChannelChart({ data = null, isCustom = false }) {
  const isMounted = useIsClient();

  const chartData = data !== null ? data : SAMPLE_CHANNEL_DATA;

  if (!isMounted) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs h-84 flex items-center justify-center">
        <span className="text-xs text-slate-400">Loading channel distribution...</span>
      </div>
    );
  }

  // Handle case where custom CSV was uploaded but lacks category/channel column
  if (isCustom && chartData.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs h-84 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <Layers className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-700">Category Breakdown Unavailable</h4>
        <p className="text-[11px] text-slate-500 max-w-xs mt-1">
          The uploaded dataset does not contain an identified Channel or Category column (e.g. &apos;channel&apos;, &apos;category&apos;).
        </p>
      </div>
    );
  }

  const topChannel = chartData[0];

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      {/* Chart Header */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">
            {isCustom ? "Revenue by Category" : "Sales by Channel"}
          </h3>
          {isCustom && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
              Uploaded Data
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {isCustom ? "Distribution grouped from uploaded records" : "Revenue distribution across acquisition paths"}
        </p>
      </div>

      {/* Bar Chart Canvas */}
      <div className="h-56 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="channel"
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
              tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />
            <Tooltip content={<CustomChannelTooltip />} cursor={{ fill: "#F8FAFC" }} />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Channel Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 mt-2 border-t border-slate-100 text-[11px]">
        <div>
          <span className="text-slate-400 block">Top Segment</span>
          <span className="font-semibold text-slate-800 truncate block">
            {topChannel ? `${topChannel.channel} (${topChannel.percentage}%)` : "N/A"}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Total Segments</span>
          <span className="font-semibold text-slate-800">
            {chartData.length} Identified
          </span>
        </div>
        <div className="hidden sm:block">
          <span className="text-slate-400 block">Total Tracked</span>
          <span className="font-semibold text-teal-700">
            ${chartData.reduce((acc, c) => acc + (c.revenue || 0), 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
