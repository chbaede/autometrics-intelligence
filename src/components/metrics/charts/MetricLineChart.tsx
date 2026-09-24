import React, { useState } from 'react';
import { Company, MetricObservation } from '../../../types/metrics';
import { formatMetricValue } from '../../../utils/metricCalculations';
import { HelpCircle } from 'lucide-react';

interface MetricLineChartProps {
  title: string;
  subtitle?: string;
  series: {
    company: Company;
    data: {
      period: string;
      value: number | null;
      observation?: MetricObservation;
    }[];
    color: string;
  }[];
  unit: string;
  onSelectObservation?: (obs: MetricObservation) => void;
}

export const MetricLineChart: React.FC<MetricLineChartProps> = ({
  title,
  subtitle,
  series,
  unit,
  onSelectObservation,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    companyName: string;
    period: string;
    value: number | null;
    currency?: string;
    x: number;
    y: number;
  } | null>(null);

  if (!series || series.length === 0) return null;

  // Extract all periods across series in order
  const allPeriods = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.period)))
  ).sort();

  // Find global min and max values
  const allValues = series.flatMap((s) =>
    s.data
      .map((d) => d.value)
      .filter((v): v is number => v !== null && Number.isFinite(v))
  );

  const maxVal = allValues.length > 0 ? Math.max(...allValues, 0) : 100;
  const minVal = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const range = maxVal - minVal || 1;

  // Chart dimensions
  const width = 640;
  const height = 220;
  const paddingX = 50;
  const paddingY = 30;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const getX = (periodIndex: number) => {
    if (allPeriods.length <= 1) return paddingX + chartW / 2;
    return paddingX + (periodIndex / (allPeriods.length - 1)) * chartW;
  };

  const getY = (val: number | null) => {
    if (val === null || !Number.isFinite(val)) return height - paddingY;
    return height - paddingY - ((val - minVal) / range) * chartH;
  };

  return (
    <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 shadow-md flex flex-col space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            {title}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {unit.replace('_', ' ')}
            </span>
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {series.map((s) => (
            <div key={s.company.id} className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-medium">{s.company.shortName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height - paddingY - pct * chartH;
            const gridVal = minVal + pct * range;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 text-[9px] font-mono"
                >
                  {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Lines and points */}
          {series.map((s) => {
            const validPoints = s.data
              .map((d) => {
                const pIdx = allPeriods.indexOf(d.period);
                return {
                  period: d.period,
                  value: d.value,
                  obs: d.observation,
                  x: getX(pIdx),
                  y: getY(d.value),
                };
              })
              .filter((p) => p.value !== null);

            if (validPoints.length === 0) return null;

            const pathD = validPoints.reduce((acc, pt, idx) => {
              return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
            }, '');

            return (
              <g key={s.company.id}>
                {/* Connecting Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {validPoints.map((pt, pIdx) => (
                  <circle
                    key={pIdx}
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#0f172a"
                    stroke={s.color}
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        companyName: s.company.shortName,
                        period: pt.period,
                        value: pt.value,
                        currency: pt.obs?.currency || s.company.reportingCurrency,
                        x: pt.x,
                        y: pt.y,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => pt.obs && onSelectObservation?.(pt.obs)}
                  />
                ))}
              </g>
            );
          })}

          {/* X Axis Period Labels */}
          {allPeriods.map((p, idx) => (
            <text
              key={p}
              x={getX(idx)}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-mono font-medium"
            >
              {p}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute z-20 px-2.5 py-1.5 bg-slate-800 text-slate-100 rounded-lg shadow-xl text-xs font-mono border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <div className="font-semibold text-brand-300">{hoveredPoint.companyName} ({hoveredPoint.period})</div>
            <div className="font-bold text-white">
              {formatMetricValue(hoveredPoint.value, unit, hoveredPoint.currency)}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          Click data points to inspect raw filing disclosures
        </span>
        <span className="font-mono text-[10px]">AutoMetrics Intelligence Engine</span>
      </div>
    </div>
  );
};
