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

const CHANNEL_DATA = [
  { channel: "Direct", revenue: 48800, percentage: 38 },
  { channel: "Organic", revenue: 34600, percentage: 27 },
  { channel: "Referral", revenue: 23100, percentage: 18 },
  { channel: "Social", revenue: 15400, percentage: 12 },
  { channel: "Email", revenue: 6530, percentage: 5 },
];

const BAR_COLORS = ["#0F766E", "#0D9488", "#14B8A6", "#2DD4BF", "#5EEAD4"];

function CustomChannelTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-md text-xs">
        <p className="font-semibold text-slate-800">{data.channel}</p>
        <p className="text-teal-700 font-bold mt-0.5">
          ${data.revenue.toLocaleString()}
        </p>
        <p className="text-slate-500 text-[10px]">{data.percentage}% of total sales</p>
      </div>
    );
  }
  return null;
}

export default function ChannelChart() {
  const isMounted = useIsClient();

  if (!isMounted) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs h-84 flex items-center justify-center">
        <span className="text-xs text-slate-400">Loading channel distribution...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      {/* Chart Header */}
      <div>
        <h3 className="text-sm font-bold text-slate-800">Sales by Channel</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Revenue distribution across acquisition paths
        </p>
      </div>

      {/* Bar Chart Canvas */}
      <div className="h-56 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={CHANNEL_DATA}
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
              tickFormatter={(val) => `$${val / 1000}k`}
            />
            <Tooltip content={<CustomChannelTooltip />} cursor={{ fill: "#F8FAFC" }} />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {CHANNEL_DATA.map((entry, index) => (
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
      <div className="grid grid-cols-3 gap-2 pt-3 mt-2 border-t border-slate-100 text-[11px]">
        <div>
          <span className="text-slate-400 block">Top Channel</span>
          <span className="font-semibold text-slate-800">Direct (38%)</span>
        </div>
        <div>
          <span className="text-slate-400 block">Fastest Growth</span>
          <span className="font-semibold text-teal-700">Referral (+24%)</span>
        </div>
        <div>
          <span className="text-slate-400 block">Total Channels</span>
          <span className="font-semibold text-slate-800">5 Active</span>
        </div>
      </div>
    </div>
  );
}
