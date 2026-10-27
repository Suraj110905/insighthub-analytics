/**
 * Reusable MetricCard component for displaying key business performance indicators.
 * 
 * Props:
 * - title: Label for the metric (e.g., "Total Revenue")
 * - value: Formatted number or string (e.g., "$124,500")
 * - change: Optional percentage or trend text (e.g., "+12.4%")
 * - isPositive: Boolean indicating positive or negative trend
 * - icon: Lucide icon component
 */
export default function MetricCard({ title, value, change, isPositive = true, icon: Icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {change && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              isPositive ? "text-teal-600" : "text-rose-600"
            }`}
          >
            {change}
          </span>
          <span className="text-slate-500">vs previous period</span>
        </div>
      )}
    </div>
  );
}
