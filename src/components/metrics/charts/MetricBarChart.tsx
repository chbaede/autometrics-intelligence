import React, { useState } from 'react';
import { MetricObservation, Company } from '../../../types/metrics';
import {
  formatMetricValue,
  analyzeVolumeComparability,
  getVolumeDefinitionLabel,
} from '../../../utils/metricCalculations';
import {
  convertMillionsToKRW,
  convertMillionsToUSD,
  formatOriginalCurrencyCompact,
} from '../../../utils/currencyUtils';
import { HelpCircle, AlertTriangle, Filter, BarChart3, ListOrdered } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface MetricBarChartItem {
  company: Company;
  observation: MetricObservation;
  displayValue?: string;
  tooltipValue?: string;
  normalizedValue?: number;
}

export interface MetricBarChartProps {
  title: string;
  subtitle?: string;
  observations: MetricBarChartItem[];
  unit: string;
  periodBadge?: string;
  sortByValue?: boolean;
  onSelectObservation?: (obs: MetricObservation) => void;
  headerAction?: React.ReactNode;
}

export const MetricBarChart: React.FC<MetricBarChartProps> = ({
  title,
  subtitle,
  observations,
  unit,
  periodBadge,
  sortByValue = true,
  onSelectObservation,
  headerAction,
}) => {
  const { language } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Desktop defaults to vertical bar chart; user can also toggle to horizontal ranked list
  const [desktopLayout, setDesktopLayout] = useState<'vertical' | 'horizontal'>('vertical');

  if (!observations || observations.length === 0) {
    return (
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col">
        {/* Chart Header */}
        <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 break-words sm:whitespace-nowrap">
                {title}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold">
                {unit.replace('_', ' ')}
              </span>
              {periodBadge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-bold border border-brand-500/20 whitespace-nowrap">
                  📅 {periodBadge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {headerAction}
          </div>
        </div>

        {/* Informative Empty State */}
        <div className="py-12 flex flex-col items-center justify-center text-center px-4">
          <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            {language === 'ko' ? '표시할 공시 데이터가 없습니다' : 'No Observations Available'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {language === 'ko'
              ? '선택된 필터 조건(기업 목록, 공시 기준, 기간)에 부합하는 공식 공시 관측치가 존재하지 않습니다.'
              : 'No reported observations match the selected filters (OEM selection, volume perimeter, or reporting period).'}
          </p>
        </div>
      </div>
    );
  }

  // Enrich items with automatic FX normalization when unit is currency_millions and normalizedValue is not pre-computed
  const enrichedObservations: MetricBarChartItem[] = observations.map((item) => {
    if (item.normalizedValue !== undefined && item.displayValue !== undefined) {
      return item;
    }
    const rawVal = item.observation.value;
    const obsUnit = item.observation.unit || unit;
    if (
      obsUnit === 'currency_millions' &&
      rawVal !== null &&
      rawVal !== undefined &&
      Number.isFinite(rawVal)
    ) {
      const curr = item.observation.currency || item.company.reportingCurrency || 'USD';
      if (language === 'ko') {
        const krwWon = convertMillionsToKRW(rawVal, curr);
        if (krwWon !== null) {
          const trillion = krwWon / 1_000_000_000_000;
          const sign = trillion < 0 ? '-' : '';
          const absTrillion = Math.abs(trillion);
          const displayValue = `${sign}₩${absTrillion >= 10 ? absTrillion.toFixed(1) : absTrillion.toFixed(2)}조`;
          const origCompact = formatOriginalCurrencyCompact(rawVal, curr);
          return {
            ...item,
            normalizedValue: trillion,
            displayValue: item.displayValue ?? displayValue,
            tooltipValue: item.tooltipValue ?? `${displayValue} (${origCompact})`,
          };
        }
      } else {
        const usd = convertMillionsToUSD(rawVal, curr);
        if (usd !== null) {
          const billion = usd / 1_000_000_000;
          const sign = billion < 0 ? '-' : '';
          const absBillion = Math.abs(billion);
          const displayValue = `${sign}$${absBillion >= 10 ? absBillion.toFixed(1) : absBillion.toFixed(2)}B`;
          const origCompact = formatOriginalCurrencyCompact(rawVal, curr);
          return {
            ...item,
            normalizedValue: billion,
            displayValue: item.displayValue ?? displayValue,
            tooltipValue: item.tooltipValue ?? `${displayValue} (${origCompact})`,
          };
        }
      }
    }
    return item;
  });

  // Sort observations strictly in descending order (highest rank #1 first) by default
  const sortedObservations = sortByValue
    ? [...enrichedObservations].sort((a, b) => {
        const valA = a.normalizedValue ?? (a.observation.value ?? -Infinity);
        const valB = b.normalizedValue ?? (b.observation.value ?? -Infinity);
        if (valB !== valA) return valB - valA;
        return a.company.shortName.localeCompare(b.company.shortName);
      })
    : enrichedObservations;

  // Calculate scales
  const validValues = sortedObservations
    .map((o) => o.normalizedValue ?? o.observation.value)
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const maxVal = validValues.length > 0 ? Math.max(...validValues, 0) : 100;
  const minVal = validValues.length > 0 ? Math.min(...validValues, 0) : 0;
  const hasNegative = minVal < 0;
  const hasPositive = validValues.some((v) => v > 0);
  const maxAbsVal = Math.max(Math.abs(maxVal), Math.abs(minVal), 1);

  // Volume Definition Comparability Analysis
  const volumeAnalysis = analyzeVolumeComparability(sortedObservations);

  const formatBarLabel = (item: MetricBarChartItem, valNum: number, isNull: boolean): string => {
    if (isNull) return 'N/R';
    if (item.displayValue) return item.displayValue;
    if (unit === 'percentage' || item.observation.unit === 'percentage') {
      return `${valNum.toFixed(1)}%`;
    }
    if (unit === 'thousand_units' || item.observation.unit === 'thousand_units') {
      return valNum >= 1000
        ? `${(valNum / 1000).toFixed(2)}M`
        : `${Math.round(valNum).toLocaleString()}k`;
    }
    if (valNum >= 1000) {
      return `${(valNum / 1000).toFixed(1)}k`;
    }
    return valNum.toFixed(1);
  };

  const getRankBadgeStyle = (idx: number, isNegative: boolean) => {
    if (isNegative) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    }
    if (idx === 0) {
      return 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/70 shadow-2xs';
    }
    if (idx === 1) {
      return 'bg-slate-200/90 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600';
    }
    if (idx === 2) {
      return 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border border-orange-300/80 dark:border-orange-700/60';
    }
    return 'bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60';
  };

  // Dynamic minimum width for desktop vertical chart so columns never crowd or clip #1 on the left
  const verticalTrackMinWidth = Math.max(660, sortedObservations.length * 60);

  return (
    <div className="p-3.5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col">
      {/* Chart Header */}
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 break-words">
              {title}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold">
              {unit.replace('_', ' ')}
            </span>
            {periodBadge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-bold border border-brand-500/20 whitespace-nowrap">
                📅 {periodBadge}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold whitespace-nowrap">
              {language === 'ko'
                ? `1위~${sortedObservations.length}위 높은순 정렬`
                : `Ranked #1–#${sortedObservations.length}`}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Dynamic Header Action, Layout Switcher & Hover/Active Status */}
        <div className="flex items-center gap-2 flex-wrap ml-auto shrink-0">
          {headerAction}
          {/* Desktop View Mode Toggle (Vertical Bars vs Ranked Horizontal List) */}
          <div
            className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
            role="group"
            aria-label={language === 'ko' ? '차트 보기 방식' : 'Chart layout mode'}
          >
            <button
              type="button"
              onClick={() => setDesktopLayout('vertical')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                desktopLayout === 'vertical'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-2xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={language === 'ko' ? '세로 막대 그래프 보기' : 'Vertical Bar Chart'}
            >
              <BarChart3 className="w-3 h-3" />
              <span>{language === 'ko' ? '세로 막대' : 'Bars'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDesktopLayout('horizontal')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                desktopLayout === 'horizontal'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-2xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={language === 'ko' ? '가로 순위 차트 보기' : 'Ranked Horizontal Bar List'}
            >
              <ListOrdered className="w-3 h-3" />
              <span>{language === 'ko' ? '순위표' : 'Ranked List'}</span>
            </button>
          </div>

          {hoveredIndex !== null && sortedObservations[hoveredIndex] && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 rounded-lg text-xs font-mono">
              <span className="font-bold text-brand-700 dark:text-brand-300">
                #{hoveredIndex + 1} {sortedObservations[hoveredIndex].company.shortName}:
              </span>
              <span
                className={`font-extrabold ${
                  ((sortedObservations[hoveredIndex].normalizedValue ??
                    sortedObservations[hoveredIndex].observation.value) ??
                    0) < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {sortedObservations[hoveredIndex].tooltipValue ??
                  sortedObservations[hoveredIndex].displayValue ??
                  formatMetricValue(
                    sortedObservations[hoveredIndex].observation.value,
                    unit,
                    sortedObservations[hoveredIndex].observation.currency
                  )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Leaders Summary Strip (Always visible so #1, #2, #3 are immediately prominent in all filter modes) */}
      {sortedObservations.length > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-thin">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
            {language === 'ko' ? '🏆 상위 랭킹:' : '🏆 Top Ranked:'}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {sortedObservations.slice(0, Math.min(5, sortedObservations.length)).map((item, idx) => {
              const rawObsVal = item.observation.value;
              const val = item.normalizedValue ?? rawObsVal;
              const isNull = val === null || !Number.isFinite(val);
              const valNum = isNull ? 0 : val;
              const isNeg = !isNull && valNum < 0;
              return (
                <button
                  key={`top-pill-${item.company.id}`}
                  type="button"
                  onClick={() => onSelectObservation?.(item.observation)}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition border shrink-0 ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-400/50 text-slate-900 dark:text-white font-bold shadow-2xs'
                      : idx < 3
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold'
                      : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span
                    className={`text-[10px] font-extrabold px-1 py-0.2 rounded ${getRankBadgeStyle(
                      idx,
                      isNeg
                    )}`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-sans font-bold">{item.company.shortName}</span>
                  <span
                    className={`font-extrabold ${
                      isNeg
                        ? 'text-rose-600 dark:text-rose-400'
                        : idx === 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {formatBarLabel(item, valNum, isNull)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Volume Definition Comparability Warning Banner */}
      {!volumeAnalysis.isFullyComparable && volumeAnalysis.warningType !== 'none' && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px] space-y-0.5">
            <span className="font-bold">
              {language === 'ko'
                ? volumeAnalysis.warningType === 'all_unclassified'
                  ? '공시 기준 미분류/미확인 안내:'
                  : volumeAnalysis.warningType === 'unclassified_with_known'
                  ? '공시 기준 불완전 비교 주의:'
                  : '판매량 공시 기준 혼합 안내:'
                : volumeAnalysis.warningType === 'all_unclassified'
                ? 'Unclassified Volume Definitions Notice:'
                : volumeAnalysis.warningType === 'unclassified_with_known'
                ? 'Incomplete Volume Perimeter Warning:'
                : 'Mixed Volume Definitions Notice:'}
            </span>{' '}
            {language === 'ko'
              ? volumeAnalysis.warningMessageKo
              : volumeAnalysis.warningMessageEn}
          </div>
        </div>
      )}

      {/* =====================================================================
          1. MOBILE-FIRST & RANKED HORIZONTAL BAR VIEW
          Always shown on mobile (< md) so all #1..#N rankings are 100% visible
          without horizontal scrolling or clipping; also shown on desktop when
          desktopLayout === 'horizontal'.
         ===================================================================== */}
      <div className={`${desktopLayout === 'horizontal' ? 'block' : 'block md:hidden'} w-full space-y-1.5 py-1`}>
        {sortedObservations.map((item, idx) => {
          const rawObsVal = item.observation.value;
          const val = item.normalizedValue ?? rawObsVal;
          const isNull = val === null || !Number.isFinite(val);
          const valNum = isNull ? 0 : val;
          const isNegative = !isNull && valNum < 0;
          const isPositive = !isNull && valNum > 0;
          const isHovered = hoveredIndex === idx;

          // Proportional width relative to max magnitude (minimum 4% so small bars remain visible)
          const barWidthPct = isNull
            ? 0
            : Math.min(100, Math.max(4, (Math.abs(valNum) / maxAbsVal) * 100));

          const formattedLabel = formatBarLabel(item, valNum, isNull);
          const origCompact =
            (item.observation.unit === 'currency_millions' || unit === 'currency_millions') &&
            rawObsVal !== null &&
            rawObsVal !== undefined
              ? formatOriginalCurrencyCompact(
                  rawObsVal,
                  item.observation.currency || item.company.reportingCurrency || 'USD'
                )
              : null;

          return (
            <div
              key={`horiz-${item.company.id}`}
              onClick={() => onSelectObservation?.(item.observation)}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`group p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border transition cursor-pointer ${
                isHovered
                  ? 'bg-brand-50/70 dark:bg-slate-800/90 border-brand-400/60 dark:border-brand-500/50 shadow-xs'
                  : idx === 0 && !isNegative
                  ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-300/60 dark:border-amber-800/50'
                  : isNegative
                  ? 'bg-rose-50/30 dark:bg-rose-950/15 border-rose-200/60 dark:border-rose-900/40'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Row Top: Rank + Company Name + Badges on Left, Value on Right */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded shrink-0 ${getRankBadgeStyle(
                      idx,
                      isNegative
                    )}`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                    {item.company.shortName}
                  </span>
                  {(item.observation.volumeDefinition || volumeAnalysis.isVolumeMetric) &&
                    (() => {
                      const lbl = getVolumeDefinitionLabel(
                        item.observation.volumeDefinition,
                        language
                      );
                      const isKnown =
                        item.observation.volumeDefinition &&
                        item.observation.volumeDefinition !== 'unknown';
                      return (
                        <span
                          className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border shrink-0 ${
                            isKnown
                              ? 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                          }`}
                        >
                          {lbl.short}
                        </span>
                      );
                    })()}
                  {!item.observation.isComparable && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      {language === 'ko' ? '비교주의' : 'Scope'}
                    </span>
                  )}
                </div>

                {/* Right Value Display (Never Truncated) */}
                <div className="flex items-baseline gap-1.5 shrink-0 font-mono">
                  <span
                    className={`text-xs sm:text-sm font-extrabold whitespace-nowrap ${
                      isNegative
                        ? 'text-rose-600 dark:text-rose-400'
                        : idx === 0
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {formattedLabel}
                  </span>
                  {origCompact && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap hidden xs:inline">
                      ({origCompact})
                    </span>
                  )}
                </div>
              </div>

              {/* Row Bottom: Proportional Horizontal Bar Track */}
              <div className="w-full h-2.5 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isNegative
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                      : idx === 0
                      ? 'bg-gradient-to-r from-amber-500 to-brand-500'
                      : isPositive && item.observation.isComparable
                      ? 'bg-gradient-to-r from-brand-600 to-brand-400'
                      : 'bg-gradient-to-r from-amber-600 to-amber-400'
                  }`}
                  style={{ width: `${barWidthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          2. DESKTOP VERTICAL BAR CHART VIEW
          Generous vertical headroom (180px positive zone + shrink-0 labels)
          so #1, #2, #3 badges and values NEVER clip or shrink in any mode.
         ===================================================================== */}
      <div
        className={`${
          desktopLayout === 'vertical' ? 'hidden md:block' : 'hidden'
        } relative w-full overflow-x-auto pt-8 pb-3 scrollbar-thin`}
      >
        <div
          className="w-full flex flex-col justify-start relative"
          style={{ minWidth: `${verticalTrackMinWidth}px` }}
        >
          {/* Main Bar Plot Area */}
          <div className="w-full relative flex flex-col">
            <div className="w-full flex items-stretch justify-between gap-1.5 sm:gap-2 px-3">
              {sortedObservations.map((item, idx) => {
                const rawObsVal = item.observation.value;
                const val = item.normalizedValue ?? rawObsVal;
                const isNull = val === null || !Number.isFinite(val);
                const valNum = isNull ? 0 : val;
                const isPositive = !isNull && valNum > 0;
                const isZeroOrNull = isNull || valNum === 0;
                const isNegative = !isNull && valNum < 0;
                const isHovered = hoveredIndex === idx;

                // Scale positive and negative bars with ample headroom so labels never clip
                const maxPosBarPx = 110;
                const posBarHeight = isPositive
                  ? Math.max(8, (valNum / (maxVal || 1)) * maxPosBarPx)
                  : isZeroOrNull
                  ? 4
                  : 0;

                const maxNegBarPx = hasPositive ? 68 : 115;
                const negBarHeight = isNegative
                  ? Math.max(10, (Math.abs(valNum) / (Math.abs(minVal) || 1)) * maxNegBarPx)
                  : 0;

                const tooltipPositionClass =
                  idx <= 1
                    ? 'left-0'
                    : idx >= sortedObservations.length - 2
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2';

                const formattedValueStr = formatBarLabel(item, valNum, isNull);

                return (
                  <div
                    key={item.company.id}
                    className="flex-1 min-w-[54px] max-w-[76px] shrink-0 flex flex-col items-center group relative cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => onSelectObservation?.(item.observation)}
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div
                        className={`absolute -top-7 z-30 px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg shadow-lg shadow-slate-300/50 dark:shadow-slate-950/60 text-[11px] font-mono border border-slate-200 dark:border-slate-700 whitespace-nowrap pointer-events-none flex items-center gap-1.5 transition-all ${tooltipPositionClass}`}
                      >
                        <span className="font-bold text-brand-600 dark:text-brand-400">
                          #{idx + 1} {item.company.shortName}:
                        </span>
                        <span
                          className={`font-extrabold ${
                            isNegative
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.tooltipValue ??
                            item.displayValue ??
                            formatMetricValue(rawObsVal, unit, item.observation.currency)}
                        </span>
                        {(item.observation.volumeDefinition || volumeAnalysis.isVolumeMetric) &&
                          (() => {
                            const lbl = getVolumeDefinitionLabel(
                              item.observation.volumeDefinition,
                              language
                            );
                            const isKnown =
                              item.observation.volumeDefinition &&
                              item.observation.volumeDefinition !== 'unknown';
                            return (
                              <span
                                className={`text-[10px] px-1 py-0.5 rounded font-mono font-bold border ${
                                  isKnown
                                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                }`}
                              >
                                {lbl.full}
                              </span>
                            );
                          })()}
                        {isNegative && (
                          <span className="text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                            ({language === 'ko' ? '영업손실' : 'Loss'})
                          </span>
                        )}
                        {!item.observation.isComparable && (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                            ({language === 'ko' ? '비교주의' : 'Scope'})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Positive Zone: 180px tall (or 36px when all bars are negative), bars grow UPWARDS */}
                    <div
                      className={`w-full ${
                        hasPositive ? 'h-[180px]' : 'h-[36px]'
                      } flex flex-col justify-end items-center pb-0.5 shrink-0`}
                    >
                      {/* Rank badge shown for all positive/zero items (or above baseline for negative items) */}
                      {(isPositive || isZeroOrNull) && (
                        <span
                          className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded mb-1 shrink-0 ${getRankBadgeStyle(
                            idx,
                            false
                          )}`}
                        >
                          #{idx + 1}
                        </span>
                      )}

                      {isNegative && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded mb-1 shrink-0 ${getRankBadgeStyle(
                            idx,
                            true
                          )}`}
                        >
                          #{idx + 1}
                        </span>
                      )}

                      {/* Positive Value Label (shrink-0 + whitespace-nowrap prevents Flexbox min-height:0 crushing!) */}
                      {(isPositive || isZeroOrNull) && (
                        <div
                          className={`text-[10px] sm:text-[11px] font-mono font-extrabold mb-1.5 whitespace-nowrap shrink-0 ${
                            idx === 0
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-700 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-300'
                          }`}
                        >
                          {formattedValueStr}
                        </div>
                      )}

                      {/* Positive Bar */}
                      {(isPositive || isZeroOrNull) && (
                        <div className="w-full max-w-[34px] flex justify-center shrink-0">
                          <div
                            className={`w-full rounded-t transition-all duration-200 shrink-0 ${
                              isNull
                                ? 'bg-slate-200 dark:bg-slate-800 border-dashed border border-slate-300 dark:border-slate-700'
                                : isHovered
                                ? 'bg-gradient-to-t from-brand-500 to-brand-400 shadow-md scale-y-105 origin-bottom'
                                : idx === 0
                                ? 'bg-gradient-to-t from-brand-600 via-brand-500 to-amber-500 shadow-xs'
                                : item.observation.isComparable
                                ? 'bg-gradient-to-t from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-xs'
                                : 'bg-gradient-to-t from-amber-600 to-amber-500'
                            }`}
                            style={{ height: `${posBarHeight}px` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Horizontal Zero Baseline Segment */}
                    <div className="w-full h-[1.5px] bg-slate-300 dark:bg-slate-700 relative flex items-center justify-center shrink-0">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isNegative
                            ? 'bg-rose-500'
                            : isPositive
                            ? 'bg-brand-500'
                            : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    {/* Negative Zone (Only rendered when chart has negative values) */}
                    {hasNegative && (
                      <div
                        className={`w-full ${
                          hasPositive ? 'h-[110px]' : 'h-[160px]'
                        } flex flex-col justify-start items-center pt-0.5 shrink-0`}
                      >
                        {/* Negative Bar */}
                        {isNegative && (
                          <div className="w-full max-w-[34px] flex justify-center shrink-0">
                            <div
                              className={`w-full rounded-b transition-all duration-200 shrink-0 ${
                                isHovered
                                  ? 'bg-gradient-to-b from-rose-500 to-rose-600 shadow-md shadow-rose-500/30 scale-y-105 origin-top'
                                  : 'bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 shadow-xs'
                              }`}
                              style={{ height: `${negBarHeight}px` }}
                            />
                          </div>
                        )}

                        {/* Negative Value Label (shrink-0 + whitespace-nowrap so it never clips) */}
                        {isNegative && (
                          <div className="text-[10px] sm:text-[11px] font-mono text-rose-600 dark:text-rose-400 font-extrabold mt-1.5 whitespace-nowrap shrink-0">
                            {formattedValueStr}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Company Name Label */}
                    <div className="mt-2.5 text-center w-full px-0.5 flex flex-col items-center shrink-0">
                      <span
                        className={`text-[11px] font-semibold truncate block mx-auto max-w-[70px] ${
                          isHovered
                            ? isNegative
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-brand-600 dark:text-brand-400 font-bold'
                            : idx === 0 && !isNegative
                            ? 'text-slate-900 dark:text-white font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.company.shortName}
                      </span>
                      {(item.observation.volumeDefinition || volumeAnalysis.isVolumeMetric) &&
                        (() => {
                          const lbl = getVolumeDefinitionLabel(
                            item.observation.volumeDefinition,
                            language
                          );
                          const isKnown =
                            item.observation.volumeDefinition &&
                            item.observation.volumeDefinition !== 'unknown';
                          return (
                            <span
                              className={`text-[9px] font-mono font-medium px-1 py-0.2 rounded mt-0.5 border shrink-0 ${
                                isKnown
                                  ? 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-transparent'
                                  : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                              }`}
                            >
                              {lbl.short}
                            </span>
                          );
                        })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info & Legend */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {language === 'ko'
              ? '막대 또는 순위 카드를 클릭하면 공식 IR 출처 및 산식 확인'
              : 'Click any bar or row to inspect official IR provenance'}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {volumeAnalysis.retailCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-slate-600 dark:text-slate-300">
              <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold">
                {getVolumeDefinitionLabel('retail_deliveries', language).short}
              </span>
              <span>{getVolumeDefinitionLabel('retail_deliveries', language).full}</span>
            </span>
          )}
          {volumeAnalysis.wholesaleCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-slate-600 dark:text-slate-300">
              <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold">
                {getVolumeDefinitionLabel('wholesale_shipments', language).short}
              </span>
              <span>{getVolumeDefinitionLabel('wholesale_shipments', language).full}</span>
            </span>
          )}
          {volumeAnalysis.productionCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-slate-600 dark:text-slate-300">
              <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold">
                {getVolumeDefinitionLabel('production', language).short}
              </span>
              <span>{getVolumeDefinitionLabel('production', language).full}</span>
            </span>
          )}
          {volumeAnalysis.registrationsCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-slate-600 dark:text-slate-300">
              <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold">
                {getVolumeDefinitionLabel('registrations', language).short}
              </span>
              <span>{getVolumeDefinitionLabel('registrations', language).full}</span>
            </span>
          )}
          {volumeAnalysis.unclassifiedCount > 0 && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-slate-600 dark:text-slate-300">
              <span className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold">
                {getVolumeDefinitionLabel(undefined, language).short}
              </span>
              <span>{language === 'ko' ? '공시 기준 미분류' : 'Unclassified Perimeter'}</span>
            </span>
          )}
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-xs bg-brand-500 inline-block" />
            {language === 'ko' ? '공식 공시 (흑자)' : 'Reported (Profit)'}
          </span>
          {hasNegative && (
            <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              {language === 'ko' ? '영업손실 (적자)' : 'Operating Loss'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
