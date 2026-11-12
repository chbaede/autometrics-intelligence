import React, { useState } from 'react';
import { Company, MetricObservation } from '../../types/metrics';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getCompanyStockHistory,
  QuarterlyStockDisclosurePoint,
} from '../../data/stockPriceHistory';
import { formatLocalizedProfit } from '../../utils/currencyUtils';
import { formatMetricValue } from '../../utils/metricCalculations';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart2,
  Activity,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StockEarningsCorrelationChartProps {
  company: Company;
  observations: MetricObservation[];
  activePeriod: string;
  onSelectPeriod?: (period: string) => void;
  onSelectObservation?: (obs: MetricObservation) => void;
}

type OverlayMetricMode =
  | 'operating_income'
  | 'operating_margin'
  | 'revenue'
  | 'deliveries'
  | 'price_only';

function formatStockPrice(
  price: number | null,
  symbol: string,
  decimals: number,
  currency: string
): string {
  if (price === null || !Number.isFinite(price)) return '-';
  if (currency === 'KRW' || currency === 'JPY') {
    return `${symbol}${Math.round(price).toLocaleString()}`;
  }
  return `${symbol}${price.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatCompactOverlayValue(
  pt: QuarterlyStockDisclosurePoint,
  mode: OverlayMetricMode,
  reportingCurrency: string,
  language: 'ko' | 'en'
): string {
  if (mode === 'price_only') return '';
  if (mode === 'operating_income') {
    if (pt.operatingIncome === null) return '-';
    return formatLocalizedProfit(pt.operatingIncome, reportingCurrency, language, {
      showOriginal: true,
    });
  }
  if (mode === 'operating_margin') {
    if (pt.operatingMargin === null) return '-';
    return `${pt.operatingMargin > 0 ? '+' : ''}${pt.operatingMargin.toFixed(1)}%`;
  }
  if (mode === 'revenue') {
    if (pt.revenue === null) return '-';
    return formatLocalizedProfit(pt.revenue, reportingCurrency, language, {
      showOriginal: true,
    });
  }
  if (mode === 'deliveries') {
    if (pt.deliveries === null) return '-';
    return language === 'ko'
      ? `${pt.deliveries.toFixed(1)}천 대`
      : `${pt.deliveries.toFixed(1)}k`;
  }
  return '-';
}

export const StockEarningsCorrelationChart: React.FC<StockEarningsCorrelationChartProps> = ({
  company,
  observations,
  activePeriod,
  onSelectPeriod,
  onSelectObservation,
}) => {
  const { language } = useLanguage();
  const stockProfile = getCompanyStockHistory(company.id);

  const [overlayMode, setOverlayMode] = useState<OverlayMetricMode>('operating_income');
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    if (activePeriod.includes('Q')) return activePeriod;
    return '2026-Q3';
  });
  const [hoveredQuarter, setHoveredQuarter] = useState<string | null>(null);
  const [showFullTable, setShowFullTable] = useState<boolean>(false);

  if (!stockProfile) return null;

  const points = stockProfile.points;
  const reportedPoints = points.filter(
    (p): p is QuarterlyStockDisclosurePoint & { closePrice: number } =>
      p.closePrice !== null && Number.isFinite(p.closePrice)
  );

  const firstPoint = reportedPoints[0];
  const latestPoint = reportedPoints[reportedPoints.length - 1];

  const cumulativeReturnPct =
    firstPoint && latestPoint && firstPoint.closePrice > 0
      ? ((latestPoint.closePrice - firstPoint.closePrice) / firstPoint.closePrice) * 100
      : 0;

  const highPoint = reportedPoints.reduce(
    (max, p) => (p.closePrice > max.closePrice ? p : max),
    reportedPoints[0]
  );
  const lowPoint = reportedPoints.reduce(
    (min, p) => (p.closePrice < min.closePrice ? p : min),
    reportedPoints[0]
  );

  // Active inspected point (hovered or selected)
  const effectiveQuarter =
    hoveredQuarter ||
    (points.some((p) => p.period === activePeriod) ? activePeriod : selectedQuarter);
  const activePoint =
    points.find((p) => p.period === effectiveQuarter) || latestPoint || points[points.length - 1];
  const activeIndex = points.findIndex((p) => p.period === activePoint.period);
  const prevPoint = activeIndex > 0 ? points[activeIndex - 1] : undefined;

  const qoqPriceChangePct =
    activePoint.closePrice !== null &&
    prevPoint?.closePrice !== null &&
    prevPoint?.closePrice !== undefined &&
    prevPoint.closePrice > 0
      ? ((activePoint.closePrice - prevPoint.closePrice) / prevPoint.closePrice) * 100
      : null;

  // SVG Layout dimensions
  const width = 1080;
  const height = 400;
  const padLeft = 88;
  const padRight = overlayMode === 'price_only' ? 45 : 92;
  const padTop = 44;
  const padBottom = 68;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Left Axis Scale (Stock Price)
  const priceValues = reportedPoints.map((p) => p.closePrice);
  const rawMinPrice = Math.min(...priceValues);
  const rawMaxPrice = Math.max(...priceValues);
  const priceSpan = rawMaxPrice - rawMinPrice || rawMaxPrice * 0.2 || 10;
  const minPrice = Math.max(0, rawMinPrice - priceSpan * 0.18);
  const maxPrice = rawMaxPrice + priceSpan * 0.18;
  const priceRange = maxPrice - minPrice || 1;

  // Right Axis Scale (Overlay Financial / Volume Metric)
  const getOverlayRawValue = (pt: QuarterlyStockDisclosurePoint): number | null => {
    if (overlayMode === 'operating_income') return pt.operatingIncome;
    if (overlayMode === 'operating_margin') return pt.operatingMargin;
    if (overlayMode === 'revenue') return pt.revenue;
    if (overlayMode === 'deliveries') return pt.deliveries;
    return null;
  };

  const overlayValues = points
    .map((p) => getOverlayRawValue(p))
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const minOverlay = overlayValues.length > 0 ? Math.min(0, ...overlayValues) : 0;
  const maxOverlay = overlayValues.length > 0 ? Math.max(0, ...overlayValues) : 100;
  const paddedMinOverlay = minOverlay < 0 ? minOverlay * 1.15 : 0;
  const paddedMaxOverlay = maxOverlay > 0 ? maxOverlay * 1.25 : 10;
  const totalOverlayRange = paddedMaxOverlay - paddedMinOverlay || 1;

  const getX = (idx: number) => {
    if (points.length <= 1) return padLeft + chartW / 2;
    return padLeft + (idx / (points.length - 1)) * chartW;
  };

  const getPriceY = (price: number) => {
    return padTop + chartH - ((price - minPrice) / priceRange) * chartH;
  };

  const getOverlayY = (val: number) => {
    return padTop + chartH - ((val - paddedMinOverlay) / totalOverlayRange) * chartH;
  };

  const zeroOverlayY = getOverlayY(0);

  // Build SVG path for stock price line and area
  const validPriceCoords = points
    .map((pt, idx) =>
      pt.closePrice !== null
        ? { x: getX(idx), y: getPriceY(pt.closePrice), pt, idx }
        : null
    )
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const linePath = validPriceCoords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    validPriceCoords.length > 1
      ? `${linePath} L ${validPriceCoords[validPriceCoords.length - 1].x.toFixed(1)} ${(
          padTop + chartH
        ).toFixed(1)} L ${validPriceCoords[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`
      : '';

  const handleQuarterClick = (pt: QuarterlyStockDisclosurePoint) => {
    setSelectedQuarter(pt.period);
    if (onSelectPeriod && ['2026-Q1', '2026-Q2', '2026-Q3'].includes(pt.period)) {
      onSelectPeriod(pt.period);
    }
    if (onSelectObservation) {
      const targetMetric =
        overlayMode === 'operating_income'
          ? 'operating_income'
          : overlayMode === 'operating_margin'
          ? 'operating_margin'
          : overlayMode === 'revenue'
          ? 'revenue'
          : 'deliveries_global';
      const matchingObs = observations.find(
        (o) => o.period === pt.period && o.metricId === targetMetric
      );
      if (matchingObs) onSelectObservation(matchingObs);
    }
  };

  const overlayLabel =
    overlayMode === 'operating_income'
      ? language === 'ko'
        ? '분기 영업이익 (EBIT)'
        : 'Operating Profit (EBIT)'
      : overlayMode === 'operating_margin'
      ? language === 'ko'
        ? '영업이익률 (RoS %)'
        : 'Operating Margin (%)'
      : overlayMode === 'revenue'
      ? language === 'ko'
        ? '분기 매출액 (Revenue)'
        : 'Quarterly Revenue'
      : overlayMode === 'deliveries'
      ? language === 'ko'
        ? '글로벌 판매량 (천 대)'
        : 'Deliveries (k units)'
      : '';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-md space-y-6">
      {/* Header & Overlay Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {language === 'ko'
                ? `${company.name} 분기별 공시일 기준 주가 및 수익성 연동 추이 (2024 Q1 ~ 2026 Q3)`
                : `${company.name} Quarterly Disclosure Stock Price & Earnings Trajectory (2024 Q1 – 2026 Q3)`}
            </h2>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
              {stockProfile.primaryTicker} • {stockProfile.stockCurrency}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ko'
              ? '2024년 1분기부터 각 분기 공식 실적 발표일(IR 공시일) 당일 종가와 분기별 영업이익·이익률·매출·판매량을 동시 비교합니다.'
              : 'Anchors closing stock prices to exact official quarterly earnings disclosure dates (2024-Q1 to 2026-Q3) overlaid against quarterly profitability and volume.'}
          </p>
        </div>

        {/* Comparison Metric Selector Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl self-start lg:self-auto overflow-x-auto max-w-full border border-slate-200 dark:border-slate-700/80">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 whitespace-nowrap hidden sm:inline">
            {language === 'ko' ? '실적 대조:' : 'Compare with:'}
          </span>
          {(
            [
              {
                id: 'operating_income',
                labelKo: '주가 vs 영업이익',
                labelEn: 'vs. Operating Profit',
              },
              {
                id: 'operating_margin',
                labelKo: '주가 vs 영업이익률',
                labelEn: 'vs. Margin (%)',
              },
              {
                id: 'revenue',
                labelKo: '주가 vs 매출액',
                labelEn: 'vs. Revenue',
              },
              {
                id: 'deliveries',
                labelKo: '주가 vs 판매량',
                labelEn: 'vs. Deliveries',
              },
              {
                id: 'price_only',
                labelKo: '주가 단독',
                labelEn: 'Price Only',
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setOverlayMode(tab.id)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                overlayMode === tab.id
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ko' ? tab.labelKo : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Stock Performance Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Latest Disclosure Price */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {language === 'ko'
              ? `최신 공시일 종가 (${latestPoint?.period})`
              : `Latest Disclosure Close (${latestPoint?.period})`}
          </span>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
              {formatStockPrice(
                latestPoint?.closePrice ?? null,
                stockProfile.stockCurrencySymbol,
                stockProfile.priceDecimals,
                stockProfile.stockCurrency
              )}
            </span>
            <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-semibold">
              {latestPoint?.disclosureDate}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 truncate">
            {stockProfile.exchangeLabel} ({stockProfile.primaryTicker})
          </span>
        </div>

        {/* Card 2: Cumulative Return since 2024-Q1 */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {language === 'ko'
              ? '2024-Q1 공시일 대비 누적 수익률'
              : 'Cumulative Return (vs. 2024-Q1)'}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {cumulativeReturnPct >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span
              className={`text-xl sm:text-2xl font-extrabold font-mono ${
                cumulativeReturnPct >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {cumulativeReturnPct >= 0 ? `+${cumulativeReturnPct.toFixed(1)}%` : `${cumulativeReturnPct.toFixed(1)}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 truncate">
            {formatStockPrice(
              firstPoint?.closePrice ?? null,
              stockProfile.stockCurrencySymbol,
              stockProfile.priceDecimals,
              stockProfile.stockCurrency
            )}{' '}
            ({firstPoint?.disclosureDate}) →{' '}
            {formatStockPrice(
              latestPoint?.closePrice ?? null,
              stockProfile.stockCurrencySymbol,
              stockProfile.priceDecimals,
              stockProfile.stockCurrency
            )}
          </span>
        </div>

        {/* Card 3: Latest Earnings Day Reaction */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {language === 'ko'
              ? `최근 실적 발표 당일 주가 반응 (${latestPoint?.period})`
              : `Latest Earnings-Day Reaction (${latestPoint?.period})`}
          </span>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span
              className={`text-xl sm:text-2xl font-extrabold font-mono ${
                (latestPoint?.earningsDayChangePct ?? 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {latestPoint?.earningsDayChangePct !== null &&
              latestPoint?.earningsDayChangePct !== undefined
                ? `${latestPoint.earningsDayChangePct >= 0 ? '+' : ''}${latestPoint.earningsDayChangePct.toFixed(1)}%`
                : '-'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              {language === 'ko' ? '공시 당일 등락' : '1-Day Move'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 truncate">
            {language === 'ko'
              ? `발표일: ${latestPoint?.disclosureDate}`
              : `Disclosed: ${latestPoint?.disclosureDate}`}
          </span>
        </div>

        {/* Card 4: 2024-2026 Disclosure Range (High / Low) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {language === 'ko'
              ? '2024~2026 공시일 기준 최고 / 최저가'
              : '2024–2026 Disclosure High / Low'}
          </span>
          <div className="flex items-baseline justify-between gap-1 mt-1 font-mono">
            <div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                HIGH ({highPoint?.period})
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {formatStockPrice(
                  highPoint?.closePrice ?? null,
                  stockProfile.stockCurrencySymbol,
                  stockProfile.priceDecimals,
                  stockProfile.stockCurrency
                )}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                LOW ({lowPoint?.period})
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {formatStockPrice(
                  lowPoint?.closePrice ?? null,
                  stockProfile.stockCurrencySymbol,
                  stockProfile.priceDecimals,
                  stockProfile.stockCurrency
                )}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 truncate">
            {language === 'ko' ? '총 11개 분기 공시 시점 추적' : '11 quarterly disclosure checkpoints'}
          </span>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-1 rounded-full bg-brand-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-brand-600 border-2 border-white dark:border-slate-900 -ml-3.5" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {language === 'ko'
                ? `좌측 축(선): 분기 공시일 종가 (${stockProfile.stockCurrencySymbol})`
                : `Left Axis (Line): Stock Close on Disclosure Date (${stockProfile.stockCurrencySymbol})`}
            </span>
          </div>
          {overlayMode !== 'price_only' && (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-emerald-500/35 border border-emerald-500/70 inline-block" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {language === 'ko'
                  ? `우측 축(막대): ${overlayLabel}`
                  : `Right Axis (Bars): ${overlayLabel}`}
              </span>
            </div>
          )}
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {language === 'ko'
            ? '💡 각 분기 포인트를 클릭/호버하면 공시일 주가 반응 및 실적 원인이 아래에 표시됩니다'
            : '💡 Click or hover any quarter point to inspect disclosure date stock reaction & earnings driver'}
        </span>
      </div>

      {/* Main Dual-Axis Combo SVG Chart */}
      <div className="relative w-full overflow-x-auto bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[680px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={`stockAreaGrad-${company.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c93e7" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#0c93e7" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Left Y-Axis (Stock Price) Ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const val = minPrice + t * priceRange;
            const y = getPriceY(val);
            const rightVal = paddedMinOverlay + t * totalOverlayRange;
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800/90"
                  strokeDasharray={i === 0 ? undefined : '4 4'}
                  strokeWidth="1"
                />
                {/* Left Axis Label: Stock Price */}
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-600 dark:fill-slate-400 font-mono text-[11px] font-semibold"
                >
                  {formatStockPrice(
                    val,
                    stockProfile.stockCurrencySymbol,
                    stockProfile.priceDecimals,
                    stockProfile.stockCurrency
                  )}
                </text>

                {/* Right Axis Label: Overlay Metric */}
                {overlayMode !== 'price_only' && (
                  <text
                    x={width - padRight + 10}
                    y={y + 4}
                    textAnchor="start"
                    className="fill-emerald-700 dark:fill-emerald-400 font-mono text-[10px] font-semibold"
                  >
                    {overlayMode === 'operating_margin'
                      ? `${rightVal.toFixed(1)}%`
                      : overlayMode === 'deliveries'
                      ? `${Math.round(rightVal).toLocaleString()}k`
                      : Math.abs(rightVal) >= 1000000
                      ? `${(rightVal / 1000000).toFixed(1)}T`
                      : Math.abs(rightVal) >= 1000
                      ? `${(rightVal / 1000).toFixed(1)}B`
                      : `${Math.round(rightVal)}M`}
                  </text>
                )}
              </g>
            );
          })}

          {/* Zero Baseline for Overlay Bars if negative values exist */}
          {overlayMode !== 'price_only' && paddedMinOverlay < 0 && (
            <line
              x1={padLeft}
              y1={zeroOverlayY}
              x2={width - padRight}
              y2={zeroOverlayY}
              stroke="#f43f5e"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.7"
            />
          )}

          {/* Layer 1: Overlay Metric Bars (Operating Profit / Margin / Revenue / Deliveries) */}
          {overlayMode !== 'price_only' &&
            points.map((pt, idx) => {
              const rawVal = getOverlayRawValue(pt);
              if (rawVal === null || !Number.isFinite(rawVal)) return null;
              const xCenter = getX(idx);
              const barW = Math.min(38, (chartW / points.length) * 0.46);
              const valY = getOverlayY(rawVal);
              const topY = Math.min(valY, zeroOverlayY);
              const barH = Math.max(3, Math.abs(zeroOverlayY - valY));
              const isNegative = rawVal < 0;
              const isSelected = pt.period === effectiveQuarter;

              return (
                <g
                  key={`bar-${pt.period}`}
                  onClick={() => handleQuarterClick(pt)}
                  onMouseEnter={() => setHoveredQuarter(pt.period)}
                  onMouseLeave={() => setHoveredQuarter(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={xCenter - barW / 2}
                    y={topY}
                    width={barW}
                    height={barH}
                    rx={4}
                    className={
                      isNegative
                        ? isSelected
                          ? 'fill-rose-500/55 stroke-rose-600 dark:stroke-rose-400'
                          : 'fill-rose-500/30 stroke-rose-500/60'
                        : isSelected
                        ? 'fill-emerald-500/55 stroke-emerald-600 dark:stroke-emerald-400'
                        : 'fill-emerald-500/25 stroke-emerald-500/60'
                    }
                    strokeWidth={isSelected ? 1.8 : 1}
                  />
                </g>
              );
            })}

          {/* Layer 2: Stock Price Shaded Area & Connected Line */}
          {areaPath && <path d={areaPath} fill={`url(#stockAreaGrad-${company.id})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0c93e7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Layer 3: X-Axis Labels (Quarter + Exact Disclosure Date) & Interactive Stock Nodes */}
          {points.map((pt, idx) => {
            const x = getX(idx);
            const isSelected = pt.period === effectiveQuarter;
            const shortQuarter = pt.period.replace('20', "'").replace('-', ' ');
            const shortDate = pt.disclosureDate.slice(2).replace(/-/g, '.'); // YY.MM.DD

            return (
              <g
                key={`node-${pt.period}`}
                onClick={() => handleQuarterClick(pt)}
                onMouseEnter={() => setHoveredQuarter(pt.period)}
                onMouseLeave={() => setHoveredQuarter(null)}
                className="cursor-pointer"
              >
                {/* Vertical Hover/Active Guide Line */}
                {isSelected && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + chartH}
                    stroke="#0c93e7"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.65"
                  />
                )}

                {/* X-Axis Quarter Label */}
                <text
                  x={x}
                  y={padTop + chartH + 20}
                  textAnchor="middle"
                  className={`font-mono text-[11px] ${
                    isSelected
                      ? 'fill-brand-600 dark:fill-brand-400 font-extrabold'
                      : 'fill-slate-700 dark:fill-slate-300 font-bold'
                  }`}
                >
                  {shortQuarter}
                </text>

                {/* X-Axis Exact Disclosure Date Label */}
                <text
                  x={x}
                  y={padTop + chartH + 36}
                  textAnchor="middle"
                  className={`font-mono text-[9.5px] ${
                    pt.isScheduled
                      ? 'fill-amber-600 dark:fill-amber-400 font-bold'
                      : isSelected
                      ? 'fill-sky-600 dark:fill-sky-400 font-bold'
                      : 'fill-slate-400 dark:fill-slate-500'
                  }`}
                >
                  {pt.isScheduled ? `${shortDate}${language === 'ko' ? '(예정)' : ' (Est.)'}` : shortDate}
                </text>

                {/* Stock Price Point & Label */}
                {pt.closePrice !== null ? (
                  <>
                    <circle
                      cx={x}
                      cy={getPriceY(pt.closePrice)}
                      r={isSelected ? 6.5 : 4.5}
                      className={
                        isSelected
                          ? 'fill-brand-600 stroke-white dark:stroke-slate-900'
                          : 'fill-white dark:fill-slate-900 stroke-brand-600 dark:stroke-brand-400'
                      }
                      strokeWidth={isSelected ? 2.5 : 2.2}
                    />

                    {/* Price Label Above Point */}
                    <text
                      x={x}
                      y={getPriceY(pt.closePrice) - 12}
                      textAnchor="middle"
                      className={`font-mono text-[10px] ${
                        isSelected
                          ? 'fill-brand-700 dark:fill-brand-300 font-extrabold'
                          : 'fill-slate-700 dark:fill-slate-300 font-semibold'
                      }`}
                    >
                      {formatStockPrice(
                        pt.closePrice,
                        stockProfile.stockCurrencySymbol,
                        stockProfile.priceDecimals,
                        stockProfile.stockCurrency
                      )}
                    </text>

                    {/* Earnings Day Reaction Pill on Selected or Key Movers */}
                    {pt.earningsDayChangePct !== null &&
                      (isSelected || Math.abs(pt.earningsDayChangePct) >= 4.0) && (
                        <text
                          x={x}
                          y={getPriceY(pt.closePrice) - 24}
                          textAnchor="middle"
                          className={`font-mono text-[9px] font-bold ${
                            pt.earningsDayChangePct >= 0
                              ? 'fill-emerald-600 dark:fill-emerald-400'
                              : 'fill-rose-600 dark:fill-rose-400'
                          }`}
                        >
                          ({pt.earningsDayChangePct >= 0 ? '+' : ''}
                          {pt.earningsDayChangePct.toFixed(1)}%)
                        </text>
                      )}
                  </>
                ) : (
                  /* Scheduled Future Disclosure Marker */
                  <g>
                    <circle
                      cx={x}
                      cy={padTop + chartH / 2}
                      r={5}
                      className="fill-amber-500/20 stroke-amber-500"
                      strokeDasharray="2 2"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={padTop + chartH / 2 - 10}
                      textAnchor="middle"
                      className="fill-amber-600 dark:fill-amber-400 font-mono text-[9.5px] font-bold"
                    >
                      {language === 'ko' ? '공시 예정' : 'Scheduled'}
                    </text>
                  </g>
                )}

                {/* Invisible wide hit target for smooth hover/click */}
                <rect
                  x={x - chartW / points.length / 2}
                  y={padTop}
                  width={chartW / points.length}
                  height={chartH + 45}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Quarter Disclosure Deep-Dive Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-slate-50 via-white to-brand-50/30 dark:from-slate-950/90 dark:via-slate-900 dark:to-brand-950/20 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-brand-600 text-white font-mono text-xs font-extrabold">
              {activePoint.period}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              {language === 'ko' ? '공식 실적 발표일: ' : 'Disclosure Date: '}
              <span className="text-sky-600 dark:text-sky-400">{activePoint.disclosureDate}</span>
            </span>
            {activePoint.isScheduled && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                {language === 'ko' ? '발표 예정' : 'Scheduled Release'}
              </span>
            )}
          </div>

          {/* Quick Quarter Stepper Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {points.map((p) => (
              <button
                key={p.period}
                onClick={() => handleQuarterClick(p)}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition ${
                  p.period === activePoint.period
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {p.period.replace('20', "'")}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics & Catalyst Grid for Selected Quarter */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">
              {language === 'ko' ? '공시일 종가' : 'Close on Disclosure'}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5 block">
              {formatStockPrice(
                activePoint.closePrice,
                stockProfile.stockCurrencySymbol,
                stockProfile.priceDecimals,
                stockProfile.stockCurrency
              )}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">
              {language === 'ko' ? '공시 당일 / 직전분기비' : '1-Day / QoQ Move'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-sm font-extrabold ${
                  (activePoint.earningsDayChangePct ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {activePoint.earningsDayChangePct !== null
                  ? `${activePoint.earningsDayChangePct >= 0 ? '+' : ''}${activePoint.earningsDayChangePct.toFixed(1)}%`
                  : '-'}
              </span>
              {qoqPriceChangePct !== null && (
                <span className="text-[10px] text-slate-500">
                  (QoQ {qoqPriceChangePct >= 0 ? `+${qoqPriceChangePct.toFixed(1)}%` : `${qoqPriceChangePct.toFixed(1)}%`})
                </span>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">
              {activePoint.isNetProfitBasis
                ? language === 'ko'
                  ? '분기 순이익 (CASBE)'
                  : 'Net Profit (CASBE)'
                : language === 'ko'
                ? '분기 영업이익 (EBIT)'
                : 'Operating Profit'}
            </span>
            <span
              className={`text-sm font-extrabold mt-0.5 block truncate ${
                (activePoint.operatingIncome ?? 0) < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {activePoint.operatingIncome !== null
                ? formatLocalizedProfit(
                    activePoint.operatingIncome,
                    company.reportingCurrency,
                    language,
                    { showOriginal: true }
                  )
                : '-'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 block">
              {language === 'ko' ? '영업이익률 (RoS)' : 'Operating Margin'}
            </span>
            <span
              className={`text-sm font-extrabold mt-0.5 block ${
                (activePoint.operatingMargin ?? 0) < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {activePoint.operatingMargin !== null ? `${activePoint.operatingMargin.toFixed(1)}%` : '-'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 block">
              {language === 'ko' ? '분기 판매량 / 매출' : 'Deliveries / Revenue'}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
              {activePoint.deliveries !== null ? `${activePoint.deliveries.toLocaleString()}k` : '-'} •{' '}
              {activePoint.revenue !== null
                ? formatMetricValue(activePoint.revenue, 'currency_millions', company.reportingCurrency)
                : '-'}
            </span>
          </div>
        </div>

        {/* Catalyst Note */}
        <div className="flex items-start gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white mr-1.5">
              {language === 'ko' ? '공시 핵심 동인 및 주가 반응 배경:' : 'Disclosure Catalyst & Market Reaction:'}
            </span>
            <span>{language === 'ko' ? activePoint.catalystKo : activePoint.catalystEn}</span>
          </div>
        </div>
      </div>

      {/* Collapsible Full 11-Quarter Audit Table (2024-Q1 ~ 2026-Q3) */}
      <div className="pt-1">
        <button
          onClick={() => setShowFullTable(!showFullTable)}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition border border-slate-200 dark:border-slate-700"
        >
          <span className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            {language === 'ko'
              ? '2024 Q1 ~ 2026 Q3 전 분기 공시일별 주가 및 실적 전체 데이터 테이블 보기 (11개 분기)'
              : 'View Full 2024 Q1 – 2026 Q3 Quarterly Disclosure Stock & Earnings Table (11 Quarters)'}
          </span>
          {showFullTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFullTable && (
          <div className="mt-3 overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5">{language === 'ko' ? '분기' : 'Quarter'}</th>
                  <th className="px-3.5 py-2.5">{language === 'ko' ? '공식 발표일' : 'Disclosure Date'}</th>
                  <th className="px-3.5 py-2.5 text-right">{language === 'ko' ? '공시일 종가' : 'Close Price'}</th>
                  <th className="px-3.5 py-2.5 text-right">{language === 'ko' ? '당일 반응' : '1-Day Move'}</th>
                  <th className="px-3.5 py-2.5 text-right">{language === 'ko' ? '판매량' : 'Deliveries'}</th>
                  <th className="px-3.5 py-2.5 text-right">{language === 'ko' ? '영업이익' : 'Operating Profit'}</th>
                  <th className="px-3.5 py-2.5 text-right">{language === 'ko' ? '이익률' : 'Margin'}</th>
                  <th className="px-3.5 py-2.5">{language === 'ko' ? '핵심 요약' : 'Catalyst'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {[...points].reverse().map((pt) => {
                  const isActive = pt.period === activePoint.period;
                  return (
                    <tr
                      key={pt.period}
                      onClick={() => handleQuarterClick(pt)}
                      className={`cursor-pointer transition ${
                        isActive
                          ? 'bg-brand-50/70 dark:bg-brand-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {pt.period}
                      </td>
                      <td className="px-3.5 py-2.5 text-sky-600 dark:text-sky-400 font-semibold whitespace-nowrap">
                        {pt.disclosureDate}
                        {pt.isScheduled && (
                          <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">
                            ({language === 'ko' ? '예정' : 'Sched'})
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatStockPrice(
                          pt.closePrice,
                          stockProfile.stockCurrencySymbol,
                          stockProfile.priceDecimals,
                          stockProfile.stockCurrency
                        )}
                      </td>
                      <td
                        className={`px-3.5 py-2.5 text-right font-bold whitespace-nowrap ${
                          (pt.earningsDayChangePct ?? 0) >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {pt.earningsDayChangePct !== null
                          ? `${pt.earningsDayChangePct >= 0 ? '+' : ''}${pt.earningsDayChangePct.toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {pt.deliveries !== null ? `${pt.deliveries.toLocaleString()}k` : '-'}
                      </td>
                      <td
                        className={`px-3.5 py-2.5 text-right font-bold whitespace-nowrap ${
                          (pt.operatingIncome ?? 0) < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatCompactOverlayValue(pt, 'operating_income', company.reportingCurrency, language)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {pt.operatingMargin !== null ? `${pt.operatingMargin.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-3.5 py-2.5 font-sans text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {language === 'ko' ? pt.catalystKo : pt.catalystEn}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
