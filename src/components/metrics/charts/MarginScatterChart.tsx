import React, { useState } from 'react';
import { Company } from '../../../types/metrics';
import { TermBadge } from '../TermBadge';

interface ScatterPoint {
  company: Company;
  volumeThousand: number; // e.g. 9025
  marginPercent: number; // e.g. 5.9
}

interface MarginScatterChartProps {
  title: string;
  subtitle?: string;
  points: ScatterPoint[];
  onSelectCompany?: (company: Company) => void;
}

export const MarginScatterChart: React.FC<MarginScatterChartProps> = ({
  title,
  subtitle,
  points,
  onSelectCompany,
}) => {
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);

  if (!points || points.length === 0) return null;

  // Chart dimensions
  const width = 640;
  const height = 260;
  const padLeft = 50;
  const padBottom = 40;
  const padRight = 30;
  const padTop = 20;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVolume = 12000; // 12M units
  const minMargin = 0;
  const maxMargin = 15; // 15% margin

  const getX = (vol: number) => padLeft + (Math.min(maxVolume, Math.max(0, vol)) / maxVolume) * chartW;
  const getY = (margin: number) =>
    height - padBottom - ((Math.min(maxMargin, Math.max(minMargin, margin)) - minMargin) / (maxMargin - minMargin)) * chartH;

  return (
    <div className="p-5 bg-slate-900 dark:bg-slate-900 light:bg-white rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 shadow-md flex flex-col space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
            {title}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 dark:bg-slate-800 light:bg-slate-100 text-slate-400">
              Quadrant Matrix
            </span>
          </h3>
          {subtitle && <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>X: Volume (M)</span>
          <span>•</span>
          <span>Y: <TermBadge term="RoS" showIcon={false} /> Margin (%)</span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Quadrant dividing lines */}
          <line
            x1={padLeft + chartW / 2}
            y1={padTop}
            x2={padLeft + chartW / 2}
            y2={height - padBottom}
            stroke="#1e293b"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH / 2}
            x2={width - padRight}
            y2={padTop + chartH / 2}
            stroke="#1e293b"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Quadrant Labels */}
          <text x={padLeft + 10} y={padTop + 15} className="fill-slate-600 text-[10px] font-mono uppercase">
            Premium Niche / High Margin
          </text>
          <text x={width - padRight - 10} y={padTop + 15} textAnchor="end" className="fill-brand-400/60 text-[10px] font-mono uppercase font-bold">
            Scale & Profit Leaders
          </text>
          <text x={padLeft + 10} y={height - padBottom - 10} className="fill-slate-600 text-[10px] font-mono uppercase">
            Restructuring / Transition
          </text>
          <text x={width - padRight - 10} y={height - padBottom - 10} textAnchor="end" className="fill-slate-600 text-[10px] font-mono uppercase">
            Mass Market Scale
          </text>

          {/* Axes */}
          <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="#475569" strokeWidth="1" />
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="#475569" strokeWidth="1" />

          {/* X Axis Ticks */}
          {[0, 3000, 6000, 9000, 12000].map((vol) => (
            <text
              key={vol}
              x={getX(vol)}
              y={height - padBottom + 16}
              textAnchor="middle"
              className="fill-slate-400 text-[9px] font-mono"
            >
              {(vol / 1000).toFixed(0)}M
            </text>
          ))}

          {/* Y Axis Ticks */}
          {[0, 5, 10, 15].map((m) => (
            <text
              key={m}
              x={padLeft - 8}
              y={getY(m) + 3}
              textAnchor="end"
              className="fill-slate-400 text-[9px] font-mono"
            >
              {m}%
            </text>
          ))}

          {/* Scatter Bubbles */}
          {points.map((pt) => {
            const x = getX(pt.volumeThousand);
            const y = getY(pt.marginPercent);

            return (
              <g
                key={pt.company.id}
                className="cursor-pointer group"
                onMouseEnter={() => setHovered(pt)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectCompany?.(pt.company)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r="7"
                  className="fill-brand-500/80 stroke-white stroke-2 group-hover:r-9 group-hover:fill-brand-400 transition-all shadow-md"
                />
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  className="fill-slate-200 dark:fill-slate-200 light:fill-slate-800 text-[10px] font-bold font-sans pointer-events-none group-hover:fill-brand-300"
                >
                  {pt.company.shortName}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hovered && (
          <div className="absolute top-2 right-4 px-3 py-2 bg-slate-800 text-slate-100 rounded-lg shadow-xl text-xs font-mono border border-slate-700 pointer-events-none">
            <span className="font-bold text-brand-400">{hovered.company.name}</span>
            <div className="text-[11px] text-slate-300 mt-0.5">
              Deliveries: {(hovered.volumeThousand / 1000).toFixed(2)}M units | Margin: {hovered.marginPercent.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span>* Bubble position plotted from FY2024 reported operating profit margin & volume</span>
        <span className="font-mono text-[10px]">AutoMetrics Intelligence</span>
      </div>
    </div>
  );
};

