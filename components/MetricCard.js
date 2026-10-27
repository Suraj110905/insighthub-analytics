import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * Reusable MetricCard component matching the clean Figma reference.
 * 
 * Props:
 * - title: Label for the metric (e.g. "Total Revenue")
 * - value: Primary displayed value (e.g. "$128,430")
 * - change: Percentage text (e.g. "+12.5%")
 * - isPositive: Boolean indicating positive trend
 * - icon: Lucide icon component
 * - timeframe: Optional comparison timeframe label (defaults to "vs last month")
 */
export default function MetricCard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  timeframe = "vs last month",
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5 tracking-tight">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {change && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
              isPositive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-rose-50 text-rose-700 border border-rose-200/60"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {change}
          </span>
          <span className="text-slate-400 font-normal">{timeframe}</span>
        </div>
      )}
    </div>
  );
}
