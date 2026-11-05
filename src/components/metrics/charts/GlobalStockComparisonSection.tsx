import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCompanyById, getObservationsByCompany } from '../../../utils/metricQueries';
import {
  getCompanyStockHistory,
  STOCK_DISCLOSURE_PERIODS,
  QuarterlyStockDisclosurePoint,
} from '../../../data/stockPriceHistory';
import { StockEarningsCorrelationChart } from '../../company/StockEarningsCorrelationChart';
import { useLanguage } from '../../../i18n/LanguageContext';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  LineChart as LineIcon,
  ExternalLink,
  Calendar,
  Eye,
  BarChart3,
} from 'lucide-react';

interface GlobalStockComparisonSectionProps {
  selectedCompanyIds: string[];
  activePeriod?: string;
}

function formatPriceCompact(
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

const OEM_BRAND_COLORS: Record<string, string> = {
  toyota_motor: '#dc2626',
  tesla: '#e11d48',
  byd: '#2563eb',
  volkswagen_group: '#0284c7',
  hyundai_motor: '#0369a1',
  bmw_group: '#0891b2',
  mercedes_benz: '#0d9488',
  general_motors: '#4f46e5',
  stellantis: '#7c3aed',
  ford: '#1d4ed8',
  kia: '#c8102e',
  geely: '#059669',
  honda_motor: '#b91c1c',
  nissan_motor: '#991b1b',
  volvo_cars: '#1e3a8a',
  rivian: '#d97706',
};

export const GlobalStockComparisonSection: React.FC<GlobalStockComparisonSectionProps> = ({
  selectedCompanyIds,
  activePeriod = '2026-Q3',
}) => {
  const { language } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'indexed_overlay' | 'spotlight'>('grid');
  const [spotlightCompanyId, setSpotlightCompanyId] = useState<string>(
    selectedCompanyIds[0] || 'toyota_motor'
  );
  const [highlightedOemId, setHighlightedOemId] = useState<string | null>(null);
  const [hoveredPeriod, setHoveredPeriod] = useState<string>('2026-Q3');

  // Build enriched stock profiles for selected companies
  const items = selectedCompanyIds
    .map((id) => {
      const company = getCompanyById(id);
      const profile = getCompanyStockHistory(id);
      if (!company || !profile) return null;

      const reported = profile.points.filter(
        (p): p is QuarterlyStockDisclosurePoint & { closePrice: number } =>
          p.closePrice !== null && Number.isFinite(p.closePrice)
      );
      const first = reported[0];
      const latest = reported[reported.length - 1];
      const cumReturnPct =
        first && latest && first.closePrice > 0
          ? ((latest.closePrice - first.closePrice) / first.closePrice) * 100
          : 0;

      return {
        company,
        profile,
        first,
        latest,
        cumReturnPct,
        color: OEM_BRAND_COLORS[company.id] || '#0c93e7',
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.cumReturnPct - a.cumReturnPct);

  if (items.length === 0) return null;

  const effectiveSpotlightId = items.some((i) => i.company.id === spotlightCompanyId)
    ? spotlightCompanyId
    : items[0].company.id;
  const spotlightCompany = getCompanyById(effectiveSpotlightId)!;
  const spotlightObs = getObservationsByCompany(effectiveSpotlightId);

  // Dimensions for Indexed Multi-Line Chart (2024-Q1 = 100)
  const svgW = 1060;
  const svgH = 380;
  const padL = 78;
  const padR = 40;
  const padT = 36;
  const padB = 54;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const indexedSeries = items.map((item) => {
    const basePrice = item.first?.closePrice || 1;
    const pts = STOCK_DISCLOSURE_PERIODS.map((period, idx) => {
      const p = item.profile.points.find((pt) => pt.period === period);
      const indexedVal =
        p?.closePrice !== null && p?.closePrice !== undefined
          ? (p.closePrice / basePrice) * 100
          : null;
      return {
        period,
        idx,
        indexedVal,
        point: p,
      };
    });
    return {
      ...item,
      pts,
    };
  });

  const allIndexedVals = indexedSeries.flatMap((s) =>
    s.pts.map((p) => p.indexedVal).filter((v): v is number => v !== null && Number.isFinite(v))
  );
  const minIdxVal = Math.max(20, Math.floor((Math.min(...allIndexedVals, 80) - 10) / 10) * 10);
  const maxIdxVal = Math.ceil((Math.max(...allIndexedVals, 130) + 15) / 10) * 10;
  const idxRange = maxIdxVal - minIdxVal || 100;

  const getOverlayX = (i: number) =>
    padL + (i / (STOCK_DISCLOSURE_PERIODS.length - 1)) * plotW;
  const getOverlayY = (val: number) =>
    padT + plotH - ((val - minIdxVal) / idxRange) * plotH;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-md space-y-6">
      {/* Section Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {language === 'ko'
                ? '글로벌 완성차 분기 공시일 기준 주가 & 수익성(영업이익·이익률) 비교 (2024 Q1 ~ 2026 Q3)'
                : 'Global OEM Quarterly Disclosure Stock Price & Profitability Benchmark (2024 Q1 – 2026 Q3)'}
            </h2>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              {language === 'ko' ? '11개 분기 공시일 기준' : '11 Quarterly Disclosures'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ko'
              ? '2024년 1분기부터 각 사의 공식 실적 발표일 종가 흐름과 영업이익률·영업이익 추이를 한눈에 대조합니다. 카드를 클릭하면 기업별 상세 주가·실적 연동 차트가 열립니다.'
              : 'Track each automaker’s stock price anchored to official quarterly earnings release dates alongside operating margins and profits.'}
          </p>
        </div>

        {/* 3-Mode View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start lg:self-auto border border-slate-200 dark:border-slate-700/80 overflow-x-auto max-w-full">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>
              {language === 'ko' ? 'OEM별 주가·마진 카드' : 'OEM Stock & Margin Grid'}
            </span>
          </button>
          <button
            onClick={() => setViewMode('indexed_overlay')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              viewMode === 'indexed_overlay'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span>
              {language === 'ko' ? '누적 수익률 오버레이 (24.1Q=100)' : 'Indexed Return (24Q1=100)'}
            </span>
          </button>
          <button
            onClick={() => setViewMode('spotlight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              viewMode === 'spotlight'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>
              {language === 'ko' ? '기업별 주가 vs 이익 정밀 대조' : 'Stock vs. Profit Spotlight'}
            </span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW MODE 1: OEM SMALL MULTIPLES GRID (Stock Line + Margin Bars)   */}
      {/* =================================================================== */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map(({ company, profile, first, latest, cumReturnPct, color }) => {
              const pts = profile.points;
              const validPrices = pts
                .map((p) => p.closePrice)
                .filter((v): v is number => v !== null && Number.isFinite(v));
              const minP = Math.min(...validPrices);
              const maxP = Math.max(...validPrices);
              const rangeP = maxP - minP || 1;

              const validMargins = pts
                .map((p) => p.operatingMargin)
                .filter((v): v is number => v !== null && Number.isFinite(v));
              const minM = Math.min(0, ...validMargins);
              const maxM = Math.max(10, ...validMargins);
              const rangeM = maxM - minM || 1;

              const miniW = 240;
              const miniH = 86;
              const mPadX = 8;
              const mPadY = 12;
              const innerW = miniW - mPadX * 2;
              const innerH = miniH - mPadY * 2;

              const priceCoords = pts
                .map((p, i) =>
                  p.closePrice !== null
                    ? {
                        x: mPadX + (i / (pts.length - 1)) * innerW,
                        y: mPadY + innerH - ((p.closePrice - minP) / rangeP) * innerH,
                      }
                    : null
                )
                .filter((c): c is NonNullable<typeof c> => c !== null);

              const miniPath = priceCoords
                .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
                .join(' ');

              const zeroMarginY = mPadY + innerH - ((0 - minM) / rangeM) * innerH;

              return (
                <div
                  key={company.id}
                  onClick={() => {
                    setSpotlightCompanyId(company.id);
                    setViewMode('spotlight');
                  }}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-brand-500/60 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                >
                  {/* Top Row: Name, Ticker & Cumulative Return Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                            {company.shortName}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                          {profile.primaryTicker} • {profile.exchangeLabel.split(' ')[0]}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold shrink-0 ${
                          cumReturnPct >= 0
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        {cumReturnPct >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {cumReturnPct >= 0 ? `+${cumReturnPct.toFixed(1)}%` : `${cumReturnPct.toFixed(1)}%`}
                      </span>
                    </div>

                    {/* Price & Latest Disclosure Date Row */}
                    <div className="mt-2.5 flex items-baseline justify-between gap-2 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {language === 'ko'
                            ? `최신 공시 종가 (${latest?.period})`
                            : `Latest (${latest?.period})`}
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
                          {formatPriceCompact(
                            latest?.closePrice ?? null,
                            profile.stockCurrencySymbol,
                            profile.priceDecimals,
                            profile.stockCurrency
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">
                          {language === 'ko' ? '영업이익률' : 'Op. Margin'}
                        </span>
                        <span
                          className={`text-xs font-extrabold ${
                            (latest?.operatingMargin ?? 0) < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {latest?.operatingMargin !== null && latest?.operatingMargin !== undefined
                            ? `${latest.operatingMargin.toFixed(1)}%`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Mini Combo Sparkline: Stock Line + Margin Bars */}
                    <div className="mt-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800/80 p-1.5">
                      <svg viewBox={`0 0 ${miniW} ${miniH}`} className="w-full h-16">
                        {/* Margin Bars in Background */}
                        {pts.map((p, i) => {
                          if (p.operatingMargin === null) return null;
                          const x = mPadX + (i / (pts.length - 1)) * innerW;
                          const barW = 10;
                          const valY =
                            mPadY + innerH - ((p.operatingMargin - minM) / rangeM) * innerH;
                          const topY = Math.min(valY, zeroMarginY);
                          const barH = Math.max(2, Math.abs(zeroMarginY - valY));
                          return (
                            <rect
                              key={p.period}
                              x={x - barW / 2}
                              y={topY}
                              width={barW}
                              height={barH}
                              rx={1.5}
                              className={
                                p.operatingMargin < 0
                                  ? 'fill-rose-500/25'
                                  : 'fill-emerald-500/25'
                              }
                            />
                          );
                        })}

                        {/* Stock Price Line */}
                        {miniPath && (
                          <path
                            d={miniPath}
                            fill="none"
                            stroke={color}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Start & End Dots */}
                        {priceCoords.length > 0 && (
                          <>
                            <circle
                              cx={priceCoords[0].x}
                              cy={priceCoords[0].y}
                              r="2.8"
                              fill={color}
                            />
                            <circle
                              cx={priceCoords[priceCoords.length - 1].x}
                              cy={priceCoords[priceCoords.length - 1].y}
                              r="3.5"
                              fill={color}
                              stroke="#fff"
                              strokeWidth="1"
                            />
                          </>
                        )}
                      </svg>
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-1">
                        <span>
                          24.1Q ({first?.disclosureDate.slice(5)})
                        </span>
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">
                          {latest?.period.replace('20', '')} ({latest?.disclosureDate})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-brand-600 dark:text-brand-400 font-semibold group-hover:underline">
                      {language === 'ko' ? '주가·이익 상세 대조' : 'Inspect Stock vs. Profit'}
                    </span>
                    <Link
                      to={`/company/${company.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 font-mono text-[10px]"
                      title={language === 'ko' ? '기업 전용 대시보드로 이동' : 'Open Company Dashboard'}
                    >
                      <span>IR</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW MODE 2: INDEXED CUMULATIVE RETURN OVERLAY (2024-Q1 = 100)      */}
      {/* =================================================================== */}
      {viewMode === 'indexed_overlay' && (
        <div className="space-y-4">
          {/* OEM Highlighter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {language === 'ko' ? '기업 강조:' : 'Highlight OEM:'}
            </span>
            <button
              onClick={() => setHighlightedOemId(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                highlightedOemId === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {language === 'ko' ? '전체 표시' : 'Show All'}
            </button>
            {items.map((item) => {
              const isHigh = highlightedOemId === item.company.id;
              return (
                <button
                  key={item.company.id}
                  onClick={() =>
                    setHighlightedOemId(isHigh ? null : item.company.id)
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    isHigh
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.company.shortName}</span>
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      item.cumReturnPct >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {item.cumReturnPct >= 0
                      ? `+${item.cumReturnPct.toFixed(0)}%`
                      : `${item.cumReturnPct.toFixed(0)}%`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Multi-Line Indexed SVG */}
          <div className="relative w-full overflow-x-auto bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-2 sm:p-3">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-auto min-w-[660px]"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Y-Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const val = minIdxVal + t * idxRange;
                const y = getOverlayY(val);
                return (
                  <g key={i}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={svgW - padR}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padL - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 dark:fill-slate-400 font-mono text-[11px] font-semibold"
                    >
                      {Math.round(val)} ({val >= 100 ? `+${Math.round(val - 100)}%` : `${Math.round(val - 100)}%`})
                    </text>
                  </g>
                );
              })}

              {/* Base 100 Reference Line (2024-Q1 = 100) */}
              {minIdxVal <= 100 && maxIdxVal >= 100 && (
                <line
                  x1={padL}
                  y1={getOverlayY(100)}
                  x2={svgW - padR}
                  y2={getOverlayY(100)}
                  stroke="#64748b"
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                />
              )}

              {/* X-Axis Period Ticks */}
              {STOCK_DISCLOSURE_PERIODS.map((period, idx) => {
                const x = getOverlayX(idx);
                const isHov = hoveredPeriod === period;
                return (
                  <g
                    key={period}
                    onMouseEnter={() => setHoveredPeriod(period)}
                    className="cursor-pointer"
                  >
                    {isHov && (
                      <line
                        x1={x}
                        y1={padT}
                        x2={x}
                        y2={padT + plotH}
                        stroke="#0c93e7"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}
                    <text
                      x={x}
                      y={padT + plotH + 24}
                      textAnchor="middle"
                      className={`font-mono text-[11px] ${
                        isHov
                          ? 'fill-brand-600 dark:fill-brand-400 font-extrabold'
                          : 'fill-slate-600 dark:fill-slate-400 font-bold'
                      }`}
                    >
                      {period.replace('20', "'")}
                    </text>
                    <rect
                      x={x - plotW / STOCK_DISCLOSURE_PERIODS.length / 2}
                      y={padT}
                      width={plotW / STOCK_DISCLOSURE_PERIODS.length}
                      height={plotH + 35}
                      fill="transparent"
                    />
                  </g>
                );
              })}

              {/* OEM Lines */}
              {indexedSeries.map((s) => {
                const isHighlighted = highlightedOemId === s.company.id;
                const isDimmed = highlightedOemId !== null && !isHighlighted;
                const coords = s.pts
                  .filter((p): p is typeof p & { indexedVal: number } => p.indexedVal !== null)
                  .map((p) => ({
                    x: getOverlayX(p.idx),
                    y: getOverlayY(p.indexedVal),
                    p,
                  }));

                const d = coords
                  .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
                  .join(' ');

                return (
                  <g
                    key={s.company.id}
                    style={{ opacity: isDimmed ? 0.16 : 1 }}
                    onClick={() =>
                      setHighlightedOemId(isHighlighted ? null : s.company.id)
                    }
                    className="cursor-pointer transition-opacity"
                  >
                    <path
                      d={d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={isHighlighted ? 3.5 : 2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {coords.map((c) => (
                      <circle
                        key={c.p.period}
                        cx={c.x}
                        cy={c.y}
                        r={isHighlighted || c.p.period === hoveredPeriod ? 4.5 : 2.8}
                        fill={s.color}
                        stroke="#fff"
                        strokeWidth="1"
                      />
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Hovered Period Leaderboard Strip */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                {language === 'ko'
                  ? `${hoveredPeriod} 공시 시점 기업별 주가 지수 (2024-Q1 = 100) 및 영업이익률`
                  : `${hoveredPeriod} Disclosure Snapshot (Indexed 2024-Q1 = 100 & Operating Margin)`}
              </span>
              <span className="text-[11px] text-slate-500">
                {language === 'ko'
                  ? '기업을 클릭하면 정밀 주가 vs 이익 차트로 전환됩니다'
                  : 'Click any OEM to open full Stock vs. Profit chart'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {indexedSeries.map((s) => {
                const ptObj = s.pts.find((p) => p.period === hoveredPeriod);
                const pt = ptObj?.point;
                const idxVal = ptObj?.indexedVal;
                const chgFrom24Q1 = idxVal !== null && idxVal !== undefined ? idxVal - 100 : null;
                return (
                  <div
                    key={s.company.id}
                    onClick={() => {
                      setSpotlightCompanyId(s.company.id);
                      setViewMode('spotlight');
                    }}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500 transition cursor-pointer text-xs font-mono"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-sans font-bold text-slate-900 dark:text-white truncate">
                        {s.company.shortName}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          (chgFrom24Q1 ?? 0) >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {chgFrom24Q1 !== null
                          ? `${chgFrom24Q1 >= 0 ? '+' : ''}${chgFrom24Q1.toFixed(1)}%`
                          : '예정'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-[10px] text-slate-500 mt-1">
                      <span>
                        {formatPriceCompact(
                          pt?.closePrice ?? null,
                          s.profile.stockCurrencySymbol,
                          s.profile.priceDecimals,
                          s.profile.stockCurrency
                        )}
                      </span>
                      <span>
                        {pt?.operatingMargin !== null && pt?.operatingMargin !== undefined
                          ? `RoS ${pt.operatingMargin.toFixed(1)}%`
                          : pt?.isScheduled
                          ? pt.disclosureDate.slice(5)
                          : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW MODE 3: SINGLE-OEM STOCK VS. EARNINGS INTERACTIVE SPOTLIGHT    */}
      {/* =================================================================== */}
      {viewMode === 'spotlight' && spotlightCompany && (
        <div className="space-y-4">
          {/* Quick Company Selector Bar */}
          <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">
              {language === 'ko' ? '분석 기업 선택:' : 'Select OEM:'}
            </span>
            {items.map((item) => {
              const isSel = item.company.id === effectiveSpotlightId;
              return (
                <button
                  key={item.company.id}
                  onClick={() => setSpotlightCompanyId(item.company.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-brand-600 text-white border-brand-500 shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.company.shortName}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({item.profile.primaryTicker})
                  </span>
                </button>
              );
            })}
          </div>

          <StockEarningsCorrelationChart
            company={spotlightCompany}
            observations={spotlightObs}
            activePeriod={activePeriod}
          />
        </div>
      )}
    </div>
  );
};
