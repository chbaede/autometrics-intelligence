import React, { useState } from 'react';
import { Company, MetricObservation } from '../../../types/metrics';
import { formatMetricValue } from '../../../utils/metricCalculations';
import { HelpCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';

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
  const { language } = useLanguage();
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
  const width = 800;
  const height = 280;
  const paddingX = 60;
  const paddingY = 35;
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
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {title}
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold">
              {unit.replace('_', ' ')}
            </span>
          </h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {series.map((s) => (
            <div key={s.company.id} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: s.color }} />
              <span className="font-semibold">{s.company.shortName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[640px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - paddingY - ratio * chartH;
            const val = minVal + ratio * range;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#cbd5e1"
                  className="dark:stroke-slate-800/80"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {allPeriods.map((p, idx) => {
            const x = getX(idx);
            return (
              <g key={p}>
                <line
                  x1={x}
                  y1={height - paddingY}
                  x2={x}
                  y2={height - paddingY + 5}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={height - paddingY + 20}
                  textAnchor="middle"
                  className="fill-slate-600 dark:fill-slate-400 text-[11px] font-mono font-bold"
                >
                  {p}
                </text>
              </g>
            );
          })}

          {/* Series Lines and Points */}
          {series.map((s) => {
            const points = allPeriods.map((p, idx) => {
              const item = s.data.find((d) => d.period === p);
              const x = getX(idx);
              const y = getY(item?.value ?? null);
              return { x, y, value: item?.value ?? null, obs: item?.observation };
            });

            // Path generator
            const pathD = points.reduce((acc, pt) => {
              if (pt.value === null) return acc;
              return acc === '' ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
            }, '');

            return (
              <g key={s.company.id}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-xs"
                />

                {/* Data Points */}
                {points.map((pt, idx) => {
                  if (pt.value === null) return null;
                  return (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill={s.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-7 transition-all duration-150"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          companyName: s.company.shortName,
                          period: allPeriods[idx],
                          value: pt.value,
                          currency: pt.obs?.currency,
                          x: pt.x,
                          y: pt.y,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => pt.obs && onSelectObservation?.(pt.obs)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip card */}
        {hoveredPoint && (
          <div
            className="absolute z-20 px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow-xl text-xs font-mono border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <span className="font-bold text-brand-400">{hoveredPoint.companyName}</span> ({hoveredPoint.period}):{' '}
            <span className="font-semibold text-white">
              {formatMetricValue(hoveredPoint.value, unit, hoveredPoint.currency)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>{language === 'ko' ? '포인트를 클릭하면 해당 분기 공식 IR 원문 확인' : 'Click data points to inspect quarter disclosures'}</span>
        </div>
      </div>
    </div>
  );
};
