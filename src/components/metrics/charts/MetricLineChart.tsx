import React, { useState } from 'react';
import { Company, MetricObservation } from '../../../types/metrics';
import { useLanguage } from '../../../i18n/LanguageContext';
import { TrendingUp, LayoutGrid, LineChart as LineIcon, Eye } from 'lucide-react';

export interface TrendSeriesItem {
  company: Company;
  data: {
    period: string;
    value: number | null;
    observation?: MetricObservation;
  }[];
  color: string;
}

interface MetricLineChartProps {
  title: string;
  subtitle?: string;
  series: TrendSeriesItem[];
  unit: string;
  activePeriod?: string;
  onSelectObservation?: (obs: MetricObservation) => void;
  yAxisLabel?: string;
}

function formatTickValue(val: number, unit: string): string {
  if (unit === 'percentage') {
    return `${val.toFixed(1)}%`;
  }
  if (unit === 'thousand_units') {
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(1)}M`;
    }
    return `${Math.round(val).toLocaleString()}k`;
  }
  if (unit === 'currency_millions') {
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(1)}B`;
    }
    return `${Math.round(val).toLocaleString()}M`;
  }
  if (unit === 'currency_billions') {
    return `${val.toFixed(1)}B`;
  }
  if (unit === 'units') {
    if (Math.abs(val) >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(0)}k`;
    }
    return `${Math.round(val).toLocaleString()}`;
  }
  return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1);
}

function formatLineChartValue(
  val: number | null | undefined,
  unit: string,
  language: 'ko' | 'en'
): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '-';
  if (unit === 'percentage') {
    return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
  }
  if (unit === 'thousand_units') {
    if (Math.abs(val) >= 1000) {
      return language === 'ko'
        ? `${(val / 1000).toFixed(2)}M대 (${val.toLocaleString()}천대)`
        : `${(val / 1000).toFixed(2)}M units (${val.toLocaleString()}k)`;
    }
    return language === 'ko'
      ? `${Math.round(val).toLocaleString()}천대`
      : `${Math.round(val).toLocaleString()}k units`;
  }
  if (unit === 'currency_millions') {
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(2)}B (${Math.round(val).toLocaleString()}M)`;
    }
    return `${Math.round(val).toLocaleString()}M`;
  }
  if (unit === 'currency_billions') {
    return `${val.toFixed(2)}B`;
  }
  if (unit === 'units') {
    return language === 'ko'
      ? `${Math.round(val).toLocaleString()}대`
      : `${Math.round(val).toLocaleString()} units`;
  }
  return val.toLocaleString();
}

function getYAxisUnitLabel(unit: string, language: 'ko' | 'en'): string {
  switch (unit) {
    case 'percentage':
      return language === 'ko' ? '↑ 세로축 단위: 비율 (%)' : '↑ Y-Axis: Ratio / Percentage (%)';
    case 'thousand_units':
      return language === 'ko' ? '↑ 세로축 단위: 판매·인도량 (천 대 / k units)' : '↑ Y-Axis: Volume (Thousand Units / k)';
    case 'currency_millions':
      return language === 'ko' ? '↑ 세로축 단위: 재무 금액 (백만 / Millions)' : '↑ Y-Axis: Currency in Millions (M)';
    case 'currency_billions':
      return language === 'ko' ? '↑ 세로축 단위: 재무 금액 (십억 / Billions)' : '↑ Y-Axis: Currency in Billions (B)';
    case 'units':
      return language === 'ko' ? '↑ 세로축 단위: 수량 (대 / Units)' : '↑ Y-Axis: Quantity (Units)';
    default:
      return language === 'ko' ? `↑ 세로축 단위: ${unit.replace('_', ' ')}` : `↑ Y-Axis: ${unit.replace('_', ' ')}`;
  }
}

function getUnitBadgeLabel(unit: string, language: 'ko' | 'en'): string {
  switch (unit) {
    case 'percentage':
      return language === 'ko' ? '비율 단위 (%)' : 'Percentage (%)';
    case 'thousand_units':
      return language === 'ko' ? '천 대 단위 (k units)' : 'Thousand Units (k)';
    case 'currency_millions':
      return language === 'ko' ? '백만 단위 (M)' : 'Millions (M)';
    case 'currency_billions':
      return language === 'ko' ? '십억 단위 (B)' : 'Billions (B)';
    case 'units':
      return language === 'ko' ? '수량 (대)' : 'Units';
    default:
      return unit.replace('_', ' ');
  }
}

export const MetricLineChart: React.FC<MetricLineChartProps> = ({
  title,
  subtitle,
  series,
  unit,
  activePeriod,
  onSelectObservation,
  yAxisLabel,
}) => {
  const { language } = useLanguage();
  const [viewMode, setViewMode] = useState<'overlay' | 'grid'>('overlay');
  const [highlightedCompanyId, setHighlightedCompanyId] = useState<string | null>(null);
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);

  if (!series || series.length === 0) return null;

  // Extract all periods across series in order
  const allPeriods = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.period)))
  ).sort();

  const effectivePeriod = hoveredPeriod || activePeriod || allPeriods[allPeriods.length - 1];

  // Find global min and max values
  const allValues = series.flatMap((s) =>
    s.data
      .map((d) => d.value)
      .filter((v): v is number => v !== null && Number.isFinite(v))
  );

  const maxVal = allValues.length > 0 ? Math.max(...allValues, 0) : 100;
  const minVal = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const range = maxVal - minVal || 1;

  // Chart dimensions with clear vertical axis padding
  const width = 1040;
  const height = 340;
  const paddingLeft = 95; // Expanded to 95 to prevent clipping of large numbers or negative signs
  const paddingRight = 40;
  const paddingTop = 35;
  const paddingBottom = 45;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (periodIndex: number) => {
    if (allPeriods.length <= 1) return paddingLeft + chartW / 2;
    return paddingLeft + (periodIndex / (allPeriods.length - 1)) * chartW;
  };

  const getY = (val: number | null) => {
    if (val === null || !Number.isFinite(val)) return height - paddingBottom;
    return height - paddingBottom - ((val - minVal) / range) * chartH;
  };

  // Ranking at hovered period
  const getLeaderboardAtPeriod = (period: string) => {
    return series
      .map((s) => {
        const pt = s.data.find((d) => d.period === period);
        return {
          company: s.company,
          value: pt?.value ?? null,
          color: s.color,
          obs: pt?.observation,
        };
      })
      .filter((item): item is typeof item & { value: number } => item.value !== null)
      .sort((a, b) => b.value - a.value);
  };

  return (
    <div className="p-3.5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col space-y-4">
      {/* Header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-bold border border-brand-500/20">
              {getUnitBadgeLabel(unit, language)}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
          <button
            onClick={() => setViewMode('overlay')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition ${
              viewMode === 'overlay'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '통합 오버레이' : 'Overlay Chart'}</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? 'OEM별 개별 그리드' : 'Small Multiples'}</span>
          </button>
        </div>
      </div>

      {/* OEM Quick Highlighter Buttons (Only shown for multi-OEM comparison) */}
      {series.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {language === 'ko' ? 'OEM 강조:' : 'Highlight:'}
          </span>
          <button
            onClick={() => setHighlightedCompanyId(null)}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition ${
              highlightedCompanyId === null
                ? 'bg-brand-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {language === 'ko' ? '전체 보기' : 'Show All'}
          </button>
          {series.map((s) => {
            const isSelected = highlightedCompanyId === s.company.id;
            return (
              <button
                key={s.company.id}
                onClick={() =>
                  setHighlightedCompanyId(isSelected ? null : s.company.id)
                }
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium transition border ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.company.shortName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MODE 1: Overlay Line Chart with Highlighting */}
      {viewMode === 'overlay' && (
        <div className="space-y-3">
          <div className="relative w-full overflow-hidden bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-2">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Axes Base Lines */}
              <line
                x1={paddingLeft}
                y1={height - paddingBottom}
                x2={width - paddingRight}
                y2={height - paddingBottom}
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <line
                x1={paddingLeft}
                y1={paddingTop}
                x2={paddingLeft}
                y2={height - paddingBottom}
                stroke="#64748b"
                strokeWidth="1.5"
              />

              {/* Y Axis Meaning / Unit Title */}
              <text
                x={paddingLeft}
                y={paddingTop - 14}
                textAnchor="start"
                className="fill-slate-600 dark:fill-slate-400 text-[11px] font-mono font-bold"
              >
                {yAxisLabel || getYAxisUnitLabel(unit, language)}
              </text>

              {/* Y Axis Grid lines & Ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = height - paddingBottom - ratio * chartH;
                const val = minVal + ratio * range;
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      stroke="#cbd5e1"
                      className="dark:stroke-slate-800/80"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <line
                      x1={paddingLeft - 6}
                      y1={y}
                      x2={paddingLeft}
                      y2={y}
                      stroke="#64748b"
                      strokeWidth="1.5"
                    />
                    <text
                      x={paddingLeft - 12}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-600 dark:fill-slate-400 text-[11px] font-mono font-bold"
                    >
                      {formatTickValue(val, unit)}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Columns & Period Guideline on Hover */}
              {allPeriods.map((p, idx) => {
                const x = getX(idx);
                const isHovered = hoveredPeriod === p;
                return (
                  <g key={p}>
                    {isHovered && (
                      <line
                        x1={x}
                        y1={paddingTop}
                        x2={x}
                        y2={height - paddingBottom}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        className="opacity-70"
                      />
                    )}
                    <line
                      x1={x}
                      y1={height - paddingBottom}
                      x2={x}
                      y2={height - paddingBottom + 6}
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={height - paddingBottom + 22}
                      textAnchor="middle"
                      className={`text-[11px] font-mono font-bold ${
                        isHovered
                          ? 'fill-brand-600 dark:fill-brand-400 font-extrabold text-[12px]'
                          : 'fill-slate-600 dark:fill-slate-400'
                      }`}
                    >
                      {p}
                    </text>
                    {/* Hover hotspot zone */}
                    <rect
                      x={x - chartW / (allPeriods.length * 2)}
                      y={paddingTop}
                      width={chartW / allPeriods.length}
                      height={chartH}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPeriod(p)}
                    />
                  </g>
                );
              })}

              {/* Series Lines and Points */}
              {series.map((s) => {
                const isHighlighted =
                  highlightedCompanyId === null ||
                  highlightedCompanyId === s.company.id;
                const strokeOpacity = isHighlighted ? 1 : 0.15;
                const strokeWidth =
                  highlightedCompanyId === s.company.id ? 3.5 : isHighlighted ? 2.5 : 1.5;

                const points = allPeriods.map((p, idx) => {
                  const item = s.data.find((d) => d.period === p);
                  const x = getX(idx);
                  const y = getY(item?.value ?? null);
                  return {
                    x,
                    y,
                    value: item?.value ?? null,
                    obs: item?.observation,
                    period: p,
                  };
                });

                // Path generator
                const pathD = points.reduce((acc, pt) => {
                  if (pt.value === null) return acc;
                  return acc === ''
                    ? `M ${pt.x} ${pt.y}`
                    : `${acc} L ${pt.x} ${pt.y}`;
                }, '');

                return (
                  <g
                    key={s.company.id}
                    className="transition-opacity duration-200"
                    style={{ opacity: strokeOpacity }}
                  >
                    <path
                      d={pathD}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-xs"
                    />

                    {/* Data Points */}
                    {points.map((pt, idx) => {
                      if (pt.value === null) return null;
                      const isPointHovered = hoveredPeriod === pt.period;
                      return (
                        <g key={idx}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isPointHovered ? 7 : isHighlighted ? 4.5 : 3}
                            fill={s.color}
                            stroke="#ffffff"
                            strokeWidth={isPointHovered ? 2.5 : 1.5}
                            className="cursor-pointer transition-all duration-150"
                            onClick={() => pt.obs && onSelectObservation?.(pt.obs)}
                          />
                          {isPointHovered && (
                            <g className="pointer-events-none">
                              <rect
                                x={Math.max(10, Math.min(width - 130, pt.x - 60))}
                                y={Math.max(10, pt.y - 32)}
                                width="120"
                                height="24"
                                rx="6"
                                fill="#0f172a"
                                className="opacity-95 shadow-md"
                              />
                              <text
                                x={Math.max(70, Math.min(width - 70, pt.x))}
                                y={Math.max(26, pt.y - 16)}
                                textAnchor="middle"
                                fill="#ffffff"
                                className="text-[11px] font-mono font-bold"
                              >
                                {formatLineChartValue(pt.value, unit, language)}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Period Interactive Leaderboard */}
          {effectivePeriod && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col space-y-2.5 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/25 font-bold font-mono text-xs">
                    📅 {effectivePeriod} {series.length > 1 ? (language === 'ko' ? 'OEM 비교 순위' : 'OEM Rankings') : (language === 'ko' ? '공시 실적' : 'Reported Value')}
                  </span>
                  {hoveredPeriod && hoveredPeriod !== activePeriod && (
                    <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">
                      ({language === 'ko' ? '커서 탐색' : 'Hovered'})
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'ko' ? '기업 카드를 클릭하면 원문 공시 출처 감사 모달이 열립니다' : 'Click any item for full provenance'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {getLeaderboardAtPeriod(effectivePeriod).map((item, rank) => {
                  const isTop1 = rank === 0;
                  const isTop2 = rank === 1;
                  const isTop3 = rank === 2;

                  return (
                    <div
                      key={item.company.id}
                      onClick={() => item.obs && onSelectObservation?.(item.obs)}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-brand-50/40 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-brand-400/60 dark:hover:border-brand-500/50 cursor-pointer transition-all hover:shadow-xs flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isTop1
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                              : isTop2
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                              : isTop3
                              ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700/50'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          #{rank + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span
                          title={item.company.name}
                          className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition"
                        >
                          {item.company.shortName}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs ml-1.5 ${
                          item.value >= 0
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatLineChartValue(item.value, unit, language)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Small Multiples Grid (Clean Individual Trajectories) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {series.map((s) => {
            const validPts = s.data.filter((d) => d.value !== null);
            const values = validPts.map((d) => d.value as number);
            const latestVal = values.length > 0 ? values[values.length - 1] : null;
            const max = values.length > 0 ? Math.max(...values) : 0;
            const min = values.length > 0 ? Math.min(...values) : 0;

            const gridW = 180;
            const gridH = 60;
            const ptsStr = s.data
              .map((d, idx) => {
                if (d.value === null) return null;
                const x = (idx / (allPeriods.length - 1 || 1)) * (gridW - 20) + 10;
                const y = gridH - 10 - ((d.value - minVal) / (range || 1)) * (gridH - 20);
                return `${x},${y}`;
              })
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={s.company.id}
                className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span
                      title={s.company.name}
                      className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate"
                    >
                      {s.company.shortName}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400">
                    {latestVal !== null ? formatLineChartValue(latestVal, unit, language) : '-'}
                  </span>
                </div>

                {/* Sparkline SVG */}
                <div className="w-full h-14 bg-white/60 dark:bg-slate-900/60 rounded-lg p-1 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center">
                  <svg viewBox={`0 0 ${gridW} ${gridH}`} className="w-full h-full">
                    {ptsStr && (
                      <polyline
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={ptsStr}
                      />
                    )}
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span>{language === 'ko' ? '최저:' : 'Min:'} {min.toFixed(1)}%</span>
                  <span>{language === 'ko' ? '최고:' : 'Max:'} {max.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
