import React from 'react';
import { GuidanceObservation } from '../../../types/metrics';
import { getCompanyById } from '../../../utils/metricQueries';
import { Target, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';

interface GuidanceRangeChartProps {
  guidanceList: GuidanceObservation[];
  onSelectGuidance?: (item: GuidanceObservation) => void;
}

export const GuidanceRangeChart: React.FC<GuidanceRangeChartProps> = ({
  guidanceList,
  onSelectGuidance,
}) => {
  if (!guidanceList || guidanceList.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-sm">
        No forward-looking guidance statements available.
      </div>
    );
  }

  // Calculate global min and max for range scaling
  const allMins = guidanceList.map((g) => g.min ?? g.target ?? 0);
  const allMaxs = guidanceList.map((g) => g.max ?? g.target ?? 10);
  const minBound = Math.min(...allMins, 0);
  const maxBound = Math.max(...allMaxs, 12);
  const totalSpan = maxBound - minBound || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'raised':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            <TrendingUp className="w-3 h-3" /> Raised
          </span>
        );
      case 'lowered':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
            <TrendingDown className="w-3 h-3" /> Lowered
          </span>
        );
      case 'reaffirmed':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Reaffirmed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
            <Target className="w-3 h-3" /> Initial
          </span>
        );
    }
  };

  return (
    <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            FY2025 Operating / EBIT Margin Guidance Corridors
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Official management target ranges (%) with midpoint indicators
          </p>
        </div>
      </div>

      <div className="space-y-3.5 pt-2">
        {guidanceList.map((g) => {
          const company = getCompanyById(g.companyId);
          const min = g.min ?? g.target ?? 0;
          const max = g.max ?? g.target ?? min;
          const mid = g.midpoint ?? (min + max) / 2;

          const leftPct = ((min - minBound) / totalSpan) * 100;
          const widthPct = Math.max(3, ((max - min) / totalSpan) * 100);
          const midPct = ((mid - minBound) / totalSpan) * 100;

          return (
            <div
              key={g.id}
              onClick={() => onSelectGuidance?.(g)}
              className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200 group-hover:text-brand-400 transition">
                    {company?.name || g.companyId}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({g.reportingYear})</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(g.status)}
                  <span className="font-mono font-bold text-slate-100 text-xs">
                    {min === max ? `${min}%` : `${min}% – ${max}%`}
                  </span>
                </div>
              </div>

              {/* Range Track Bar */}
              <div className="relative h-5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                {/* Target Range Band */}
                <div
                  className="absolute top-0 bottom-0 bg-brand-500/30 border-l border-r border-brand-400/80 rounded-sm group-hover:bg-brand-500/40 transition"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                />
                {/* Midpoint Marker */}
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-brand-400 rounded-full shadow-xs"
                  style={{
                    left: `calc(${midPct}% - 3px)`,
                  }}
                  title={`Midpoint: ${mid}%`}
                />
              </div>

              <div className="text-[11px] text-slate-400 italic line-clamp-1 pt-0.5">
                "{g.originalText}"
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex items-center justify-between">
        <span>* Forward-looking statements subject to macroeconomic and supply risks.</span>
        <span className="font-mono text-[10px]">Updated Q1 2025</span>
      </div>
    </div>
  );
};

