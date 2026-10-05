import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Company, PeriodType } from '../../../types/metrics';
import { TermBadge } from '../TermBadge';
import { useLanguage } from '../../../i18n/LanguageContext';
import { TrendingUp, DollarSign, ExternalLink, X, Scale } from 'lucide-react';
import {
  formatLocalizedProfit,
  convertMillionsToKRW,
  convertMillionsToUSD,
  FX_BENCHMARK_METADATA,
} from '../../../utils/currencyUtils';
import { ScatterPoint } from './MarginScatterChart';

interface ProfitScatterChartProps {
  title: string;
  subtitle?: string;
  points: ScatterPoint[];
  period?: string;
  periodType?: PeriodType;
  onSelectCompany?: (company: Company) => void;
}

interface ProcessedPoint extends ScatterPoint {
  profitNormalized: number;
}

export const ProfitScatterChart: React.FC<ProfitScatterChartProps> = ({
  title,
  subtitle,
  points,
  period,
  periodType,
  onSelectCompany,
}) => {
  const { language } = useLanguage();
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ScatterPoint | null>(null);

  // 1. Explicit Period Type Determination (Never infer from value magnitude)
  const isAnnual =
    periodType === 'annual' ||
    (period ? period.toUpperCase().includes('FY') : false);

  // 2. Normalization helper: Same conversion basis across coordinates, labels, and panels
  // In Korean: KRW in Trillions (조원)
  // In English: USD in Billions ($B)
  const getNormalizedProfit = (pt: ScatterPoint): number | null => {
    const curr = pt.currency || pt.company.reportingCurrency;
    const rawIncome = pt.operatingIncome;
    if (rawIncome === null || rawIncome === undefined || !Number.isFinite(rawIncome)) {
      return null;
    }
    if (language === 'ko') {
      const won = convertMillionsToKRW(rawIncome, curr);
      return won !== null ? won / 1_000_000_000_000 : null;
    } else {
      const usd = convertMillionsToUSD(rawIncome, curr);
      return usd !== null ? usd / 1_000_000_000 : null;
    }
  };

  // 3. Filter valid points — PRESERVE loss-making companies (negative EBIT and negative margins)
  // Memoized so effect doesn't re-run and selection isn't cleared on unrelated re-renders
  const processedPoints = useMemo<ProcessedPoint[]>(() => {
    const list: ProcessedPoint[] = [];
    (points || []).forEach((p) => {
      if (
        p.operatingIncome !== undefined &&
        p.operatingIncome !== null &&
        Number.isFinite(p.operatingIncome) &&
        Number.isFinite(p.marginPercent)
      ) {
        const profitNorm = getNormalizedProfit(p);
        if (profitNorm !== null && Number.isFinite(profitNorm)) {
          list.push({
            ...p,
            profitNormalized: profitNorm,
          });
        }
      }
    });
    return list;
  }, [points, language]);

  // 4. Synchronize selection to prevent stale data when period/points change
  useEffect(() => {
    if (selectedPoint) {
      const exists = processedPoints.some((p) => p.company.id === selectedPoint.company.id);
      if (!exists) {
        setSelectedPoint(null);
      }
    }
  }, [processedPoints, selectedPoint]);

  // Resolve current active selection strictly from current processed points
  const resolvedSelectedPoint = selectedPoint
    ? processedPoints.find((p) => p.company.id === selectedPoint.company.id) ?? null
    : null;

  const resolvedHovered = hovered
    ? processedPoints.find((p) => p.company.id === hovered.company.id) ?? null
    : null;

  const activePoint = resolvedSelectedPoint || resolvedHovered;

  if (processedPoints.length === 0) return null;

  // Chart layout dimensions
  const width = 1060;
  const height = 620;
  const padLeft = 90;
  const padBottom = 85;
  const padRight = 55;
  const padTop = 55;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // 5. Calculate X-axis bounds from both positive and negative observed profit
  const observedMinProfit = Math.min(...processedPoints.map((p) => p.profitNormalized));
  const observedMaxProfit = Math.max(...processedPoints.map((p) => p.profitNormalized));

  let minProfit: number;
  let maxProfit: number;
  let profitStep: number;

  if (language === 'ko') {
    if (isAnnual) {
      minProfit = observedMinProfit < 0 ? Math.floor(observedMinProfit / 5) * 5 : 0;
      maxProfit = Math.max(minProfit + 30, Math.ceil((Math.max(observedMaxProfit, 10) * 1.1) / 10) * 10);
      profitStep = (maxProfit - minProfit) > 50 ? 10 : 5;
    } else {
      minProfit = observedMinProfit < 0 ? Math.floor(observedMinProfit) : 0;
      maxProfit = Math.max(minProfit + 8, Math.ceil((Math.max(observedMaxProfit, 4) * 1.1) / 2) * 2);
      profitStep = (maxProfit - minProfit) > 12 ? 2 : 1;
    }
  } else {
    if (isAnnual) {
      minProfit = observedMinProfit < 0 ? Math.floor(observedMinProfit / 5) * 5 : 0;
      maxProfit = Math.max(minProfit + 25, Math.ceil((Math.max(observedMaxProfit, 10) * 1.1) / 5) * 5);
      profitStep = (maxProfit - minProfit) > 40 ? 10 : 5;
    } else {
      minProfit = observedMinProfit < 0 ? Math.floor(observedMinProfit) : 0;
      maxProfit = Math.max(minProfit + 6, Math.ceil(Math.max(observedMaxProfit, 3) * 1.15));
      profitStep = (maxProfit - minProfit) > 10 ? 2 : 1;
    }
  }

  // 6. Calculate Y-axis bounds from both positive and negative observed margins
  const observedMinMargin = Math.min(...processedPoints.map((p) => p.marginPercent));
  const observedMaxMargin = Math.max(...processedPoints.map((p) => p.marginPercent));

  let minMargin: number;
  let maxMargin: number;
  let marginStep: number;

  if (observedMinMargin < 0) {
    if (observedMinMargin < -25) {
      minMargin = Math.floor(observedMinMargin / 10) * 10;
      maxMargin = Math.max(14, Math.ceil(observedMaxMargin / 5) * 5);
      marginStep = (maxMargin - minMargin) > 50 ? 10 : 5;
    } else {
      minMargin = Math.floor(observedMinMargin / 5) * 5;
      maxMargin = Math.max(12, Math.ceil(observedMaxMargin / 2) * 2);
      marginStep = 2;
    }
  } else {
    minMargin = 0;
    maxMargin = observedMaxMargin > 12 ? 14 : 12;
    marginStep = 2;
  }

  // 7. Semantically aligned analytical reference thresholds
  const midMargin = 7.0; // Analytical Reference: 7.0% Return on Sales
  const midProfitKRW = isAnnual ? 12.0 : 3.5;
  const midProfitUSD = (midProfitKRW * 1_000_000_000_000) / (1380.0 * 1_000_000_000); // ~8.70 $B annual, ~2.54 $B quarterly
  const midProfit = language === 'ko' ? midProfitKRW : midProfitUSD;

  // Coordinate projections
  const getX = (profitVal: number) =>
    padLeft +
    ((Math.min(maxProfit, Math.max(minProfit, profitVal)) - minProfit) /
      (maxProfit - minProfit)) *
      chartW;

  const getY = (marginVal: number) =>
    height -
    padBottom -
    ((Math.min(maxMargin, Math.max(minMargin, marginVal)) - minMargin) /
      (maxMargin - minMargin)) *
      chartH;

  // Generate X axis ticks
  const xTicks: number[] = [];
  const startXTick = Math.ceil(minProfit / profitStep) * profitStep;
  for (let p = startXTick; p <= maxProfit; p += profitStep) {
    xTicks.push(p);
  }

  // Generate Y axis ticks
  const yTicks: number[] = [];
  const startYTick = Math.ceil(minMargin / marginStep) * marginStep;
  for (let m = startYTick; m <= maxMargin; m += marginStep) {
    yTicks.push(m);
  }

  // OEM distinct brand colors
  const getOemColor = (compName: string) => {
    const n = compName.toLowerCase();
    if (n.includes('toyota')) return '#dc2626';
    if (n.includes('tesla')) return '#e11d48';
    if (n.includes('byd')) return '#2563eb';
    if (n.includes('volkswagen')) return '#0284c7';
    if (n.includes('hyundai')) return '#0369a1';
    if (n.includes('bmw')) return '#0891b2';
    if (n.includes('mercedes')) return '#0d9488';
    if (n.includes('gm') || n.includes('general')) return '#4f46e5';
    if (n.includes('stellantis')) return '#7c3aed';
    if (n.includes('ford')) return '#1d4ed8';
    if (n.includes('kia')) return '#b91c1c';
    if (n.includes('honda')) return '#c2410c';
    if (n.includes('nissan')) return '#9333ea';
    if (n.includes('geely')) return '#0284c7';
    if (n.includes('rivian')) return '#d97706';
    if (n.includes('volvo')) return '#0f766e';
    return '#64748b';
  };

  // Anti-collision label layout
  interface PlacedLabel {
    point: ProcessedPoint;
    profitVal: number;
    x: number;
    y: number;
    boxX: number;
    boxY: number;
    boxW: number;
    boxH: number;
    color: string;
    hasLeader: boolean;
    profitStr: string;
    volumeStr: string;
  }

  const placedLabels: PlacedLabel[] = [];

  const sortedPoints = [...processedPoints].sort(
    (a, b) => b.profitNormalized - a.profitNormalized
  );

  sortedPoints.forEach((pt) => {
    const profitVal = pt.profitNormalized;
    const px = getX(profitVal);
    const py = getY(pt.marginPercent);
    const curr = pt.currency || pt.company.reportingCurrency;

    const profitStr = formatLocalizedProfit(pt.operatingIncome, curr, language);
    const volumeStr =
      pt.volumeThousand >= 1000
        ? `${(pt.volumeThousand / 1000).toFixed(2)}M`
        : pt.volumeThousand > 0
        ? `${Math.round(pt.volumeThousand)}k`
        : '-';

    const boxW = 162;
    const boxH = 44;
    const color = getOemColor(pt.company.name);

    const candidates = [
      { dx: 18, dy: -50, hasLeader: true },
      { dx: -boxW - 18, dy: -50, hasLeader: true },
      { dx: 18, dy: 18, hasLeader: true },
      { dx: -boxW - 18, dy: 18, hasLeader: true },
      { dx: -boxW / 2, dy: -56, hasLeader: true },
      { dx: -boxW / 2, dy: 24, hasLeader: true },
      { dx: 24, dy: -70, hasLeader: true },
      { dx: -boxW - 24, dy: -70, hasLeader: true },
      { dx: 24, dy: 44, hasLeader: true },
      { dx: -boxW - 24, dy: 44, hasLeader: true },
      { dx: -boxW / 2, dy: -80, hasLeader: true },
      { dx: -boxW / 2, dy: 64, hasLeader: true },
      { dx: 32, dy: -22, hasLeader: true },
      { dx: -boxW - 32, dy: -22, hasLeader: true },
    ];

    let bestCandidate = candidates[0];
    let minPenalty = Infinity;

    for (const c of candidates) {
      const bx = px + c.dx;
      const by = py + c.dy;
      let penalty = 0;

      if (bx < padLeft + 4) penalty += (padLeft + 4 - bx) * 120;
      if (bx + boxW > width - padRight - 4)
        penalty += (bx + boxW - (width - padRight - 4)) * 120;
      if (by < padTop + 4) penalty += (padTop + 4 - by) * 120;
      if (by + boxH > height - padBottom - 4)
        penalty += (by + boxH - (height - padBottom - 4)) * 120;

      for (const placed of placedLabels) {
        const overlapX = Math.max(
          0,
          Math.min(bx + boxW + 8, placed.boxX + placed.boxW + 8) -
            Math.max(bx - 8, placed.boxX - 8)
        );
        const overlapY = Math.max(
          0,
          Math.min(by + boxH + 8, placed.boxY + placed.boxH + 8) -
            Math.max(by - 8, placed.boxY - 8)
        );
        const overlapArea = overlapX * overlapY;
        if (overlapArea > 0) {
          penalty += overlapArea * 70 + 1500;
        }
      }

      for (const p of processedPoints) {
        const pointX = getX(p.profitNormalized);
        const pointY = getY(p.marginPercent);
        if (
          bx <= pointX + 16 &&
          bx + boxW >= pointX - 16 &&
          by <= pointY + 16 &&
          by + boxH >= pointY - 16
        ) {
          if (p.company.id !== pt.company.id) {
            penalty += 1200;
          }
        }
      }

      penalty += Math.sqrt(c.dx * c.dx + c.dy * c.dy);

      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestCandidate = c;
      }
    }

    placedLabels.push({
      point: pt,
      profitVal,
      x: px,
      y: py,
      boxX: px + bestCandidate.dx,
      boxY: py + bestCandidate.dy,
      boxW,
      boxH,
      color,
      hasLeader:
        bestCandidate.hasLeader ||
        Math.abs(bestCandidate.dx) > 15 ||
        Math.abs(bestCandidate.dy) > 25,
      profitStr,
      volumeStr,
    });
  });

  const xUnitLabel = language === 'ko' ? '조원' : '$B';

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap break-keep">
              {title}
            </h3>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 whitespace-nowrap">
              {language === 'ko'
                ? '4분면 절대수익 매트릭스'
                : '4-Quadrant Operating Profit Matrix'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold">
                X:{' '}
                {language === 'ko'
                  ? '영업이익 (조원, 환율정규화)'
                  : 'Operating Profit ($B, Normalized)'}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold">
                Y: <TermBadge term="RoS" showIcon={false} />{' '}
                {language === 'ko' ? '영업이익률 (%)' : 'Margin (%)'}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5 shadow-xs whitespace-nowrap">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="font-semibold">
                {language === 'ko'
                  ? '카드: 환산 영업이익 / 인도량'
                  : 'Card: EBIT / Deliveries'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 break-keep">
              {subtitle}
            </p>
          )}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap sm:ml-auto">
            <Scale className="w-3 h-3 text-slate-500 shrink-0" />
            <span>
              {language === 'ko'
                ? FX_BENCHMARK_METADATA.descriptionKo
                : FX_BENCHMARK_METADATA.descriptionEn}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Scatter Plot Container */}
      <div className="relative w-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Quadrant Tinted Background Panels */}
          {/* Top-Right: High Profit & High Margin Leaders */}
          <rect
            x={getX(midProfit)}
            y={padTop}
            width={width - padRight - getX(midProfit)}
            height={getY(midMargin) - padTop}
            className="fill-emerald-500/5 dark:fill-emerald-500/10"
            rx="8"
          />
          {/* Top-Left: High Margin Specialists */}
          <rect
            x={padLeft}
            y={padTop}
            width={getX(midProfit) - padLeft}
            height={getY(midMargin) - padTop}
            className="fill-brand-500/5 dark:fill-brand-500/10"
            rx="8"
          />
          {/* Bottom-Right: High Profit Scale, Lower Margin */}
          <rect
            x={getX(midProfit)}
            y={getY(midMargin)}
            width={width - padRight - getX(midProfit)}
            height={height - padBottom - getY(midMargin)}
            className="fill-amber-500/5 dark:fill-amber-500/10"
            rx="8"
          />
          {/* Bottom-Left: Restructuring & Turnaround (Includes Losses) */}
          <rect
            x={padLeft}
            y={getY(midMargin)}
            width={getX(midProfit) - padLeft}
            height={height - padBottom - getY(midMargin)}
            className="fill-slate-500/5 dark:fill-slate-500/10"
            rx="8"
          />

          {/* Zero Axis Guideline for Profit (if loss exists) */}
          {minProfit < 0 && maxProfit > 0 && (
            <line
              x1={getX(0)}
              y1={padTop}
              x2={getX(0)}
              y2={height - padBottom}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth="1.2"
              className="opacity-70"
            />
          )}

          {/* Zero Axis Guideline for Margin (if negative margin exists) */}
          {minMargin < 0 && maxMargin > 0 && (
            <line
              x1={padLeft}
              y1={getY(0)}
              x2={width - padRight}
              y2={getY(0)}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth="1.2"
              className="opacity-70"
            />
          )}

          {/* Analytical Reference Dividing Crosshairs */}
          <line
            x1={getX(midProfit)}
            y1={padTop}
            x2={getX(midProfit)}
            y2={height - padBottom}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            className="opacity-50"
          />
          <line
            x1={padLeft}
            y1={getY(midMargin)}
            x2={width - padRight}
            y2={getY(midMargin)}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            className="opacity-50"
          />

          {/* Analytical Reference Badges */}
          {/* Top-Right: Leaders */}
          <g
            transform={`translate(${width - padRight - (language === 'ko' ? 255 : 205)}, ${padTop + 10})`}
          >
            <rect
              width={language === 'ko' ? 245 : 195}
              height={22}
              rx={6}
              className="fill-emerald-500/10 dark:fill-emerald-500/15 stroke-emerald-500/25"
            />
            <text
              x={(language === 'ko' ? 245 : 195) / 2}
              y={15}
              textAnchor="middle"
              className="fill-emerald-700 dark:fill-emerald-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko'
                ? '★ 절대이익 & 고수익 리더 (Leaders)'
                : '★ Profit & Margin Powerhouses'}
            </text>
          </g>

          {/* Top-Left: Specialists */}
          <g transform={`translate(${padLeft + 12}, ${padTop + 10})`}>
            <rect
              width={language === 'ko' ? 245 : 185}
              height={22}
              rx={6}
              className="fill-brand-500/10 dark:fill-brand-500/15 stroke-brand-500/25"
            />
            <text
              x={(language === 'ko' ? 245 : 185) / 2}
              y={15}
              textAnchor="middle"
              className="fill-brand-700 dark:fill-brand-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko'
                ? '고마진 실속형 / 틈새 고수익 (Specialists)'
                : 'High Margin Specialists'}
            </text>
          </g>

          {/* Bottom-Left: Turnaround */}
          <g transform={`translate(${padLeft + 12}, ${height - padBottom - 32})`}>
            <rect
              width={language === 'ko' ? 255 : 205}
              height={22}
              rx={6}
              className="fill-slate-500/10 dark:fill-slate-500/15 stroke-slate-500/25"
            />
            <text
              x={(language === 'ko' ? 255 : 205) / 2}
              y={15}
              textAnchor="middle"
              className="fill-slate-700 dark:fill-slate-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko'
                ? '수익성 개선 & 사업 체질 전환 (Turnaround)'
                : 'Restructuring & Turnaround'}
            </text>
          </g>

          {/* Bottom-Right: Scale */}
          <g
            transform={`translate(${width - padRight - (language === 'ko' ? 245 : 185)}, ${height - padBottom - 32})`}
          >
            <rect
              width={language === 'ko' ? 235 : 175}
              height={22}
              rx={6}
              className="fill-amber-500/10 dark:fill-amber-500/15 stroke-amber-500/25"
            />
            <text
              x={(language === 'ko' ? 235 : 175) / 2}
              y={15}
              textAnchor="middle"
              className="fill-amber-700 dark:fill-amber-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko'
                ? '대규모 이익 / 마진 개선 필요 (Scale)'
                : 'High Scale, Lower Margin'}
            </text>
          </g>

          {/* Axes Lines */}
          <line
            x1={padLeft}
            y1={height - padBottom}
            x2={width - padRight}
            y2={height - padBottom}
            stroke="#64748b"
            strokeWidth="2"
          />
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={height - padBottom}
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* X Axis Grid & Ticks */}
          {xTicks.map((profitTick) => {
            const x = getX(profitTick);
            return (
              <g key={`xtick-${profitTick}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={height - padBottom}
                  stroke="#cbd5e1"
                  className="dark:stroke-slate-800/80 opacity-50"
                  strokeWidth="1"
                />
                <line
                  x1={x}
                  y1={height - padBottom}
                  x2={x}
                  y2={height - padBottom + 6}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={height - padBottom + 22}
                  textAnchor="middle"
                  className={`text-[11px] font-mono font-bold ${
                    profitTick < 0
                      ? 'fill-rose-600 dark:fill-rose-400'
                      : 'fill-slate-600 dark:fill-slate-400'
                  }`}
                >
                  {language === 'ko'
                    ? `${profitTick}${xUnitLabel}`
                    : profitTick < 0
                    ? `-$${Math.abs(profitTick)}${xUnitLabel}`
                    : `$${profitTick}${xUnitLabel}`}
                </text>
              </g>
            );
          })}

          {/* Y Axis Grid & Ticks */}
          {yTicks.map((m) => {
            const y = getY(m);
            return (
              <g key={`ytick-${m}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#cbd5e1"
                  className="dark:stroke-slate-800/80 opacity-50"
                  strokeWidth="1"
                />
                <line
                  x1={padLeft - 6}
                  y1={y}
                  x2={padLeft}
                  y2={y}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className={`text-[11px] font-mono font-bold ${
                    m < 0
                      ? 'fill-rose-600 dark:fill-rose-400'
                      : 'fill-slate-600 dark:fill-slate-400'
                  }`}
                >
                  {m}%
                </text>
              </g>
            );
          })}

          {/* EXPLICIT AXIS TITLES */}
          {/* Y-Axis Title (Top Left) */}
          <g transform={`translate(${padLeft - 80}, ${padTop - 40})`}>
            <rect
              width={170}
              height={26}
              rx={7}
              className="fill-white dark:fill-slate-800 shadow-xs stroke-slate-200 dark:stroke-slate-700"
            />
            <text
              x={85}
              y={17.5}
              textAnchor="middle"
              className="fill-slate-800 dark:fill-slate-200 font-bold text-[11px] font-sans"
            >
              {language === 'ko'
                ? '▲ Y축: 영업이익률 RoS (%)'
                : '▲ Y: Operating Margin (%)'}
            </text>
          </g>

          {/* X-Axis Title (Bottom Center) */}
          <g
            transform={`translate(${padLeft + chartW / 2 - 190}, ${height - padBottom + 40})`}
          >
            <rect
              width={380}
              height={28}
              rx={7}
              className="fill-white dark:fill-slate-800 shadow-xs stroke-slate-200 dark:stroke-slate-700"
            />
            <text
              x={190}
              y={18.5}
              textAnchor="middle"
              className="fill-slate-800 dark:fill-slate-200 font-bold text-[11.5px] font-sans"
            >
              {language === 'ko'
                ? `➔ X축: 글로벌 절대 영업이익 규모 (${xUnitLabel} 정규화 / 손익 반영)`
                : `➔ X: Absolute Operating Profit / EBIT (Normalized ${xUnitLabel} / Reflects Losses)`}
            </text>
          </g>

          {/* Leader Lines from Bubbles to Label Boxes */}
          {placedLabels.map((lbl) => {
            const targetX = lbl.boxX + lbl.boxW / 2;
            const targetY = lbl.boxY + lbl.boxH / 2;
            return (
              <g key={`leader-${lbl.point.company.id}`}>
                <line
                  x1={lbl.x}
                  y1={lbl.y}
                  x2={targetX}
                  y2={targetY}
                  stroke={lbl.color}
                  strokeWidth="1.2"
                  strokeDasharray={lbl.hasLeader ? '2 2' : 'none'}
                  strokeOpacity={lbl.hasLeader ? 0.6 : 0.25}
                />
              </g>
            );
          })}

          {/* Scatter Data Points & Mini Cards */}
          {placedLabels.map((lbl) => {
            const pt = lbl.point;
            const x = lbl.x;
            const y = lbl.y;
            const isHovered = hovered?.company.id === pt.company.id;
            const isSelected = selectedPoint?.company.id === pt.company.id;
            const isActive = isHovered || isSelected;
            const color = lbl.color;
            const isLoss = pt.operatingIncome !== undefined && pt.operatingIncome !== null && pt.operatingIncome < 0;

            return (
              <g
                key={pt.company.id}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(pt)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  const next =
                    selectedPoint?.company.id === pt.company.id ? null : pt;
                  setSelectedPoint(next);
                  onSelectCompany?.(pt.company);
                }}
              >
                {/* Connecting Axis Guides on Active */}
                {isActive && (
                  <>
                    <line
                      x1={x}
                      y1={y}
                      x2={x}
                      y2={height - padBottom}
                      stroke={color}
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={x}
                      y2={y}
                      stroke={color}
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                  </>
                )}

                {/* Outer Glow Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 22 : 15}
                  fill={color}
                  fillOpacity={isActive ? 0.35 : 0.16}
                  className="transition-all duration-200"
                />

                {/* Main Point Marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 11 : 8}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="shadow-lg transition-all duration-200"
                />

                {/* Modern Institutional Financial Card */}
                <g transform={`translate(${lbl.boxX}, ${lbl.boxY})`}>
                  <rect
                    x="0"
                    y="0"
                    width={lbl.boxW}
                    height={lbl.boxH}
                    rx="8"
                    className={`transition-all shadow-sm ${
                      isActive
                        ? 'fill-white dark:fill-slate-800 shadow-md'
                        : 'fill-white/95 dark:fill-slate-900/95 stroke-slate-200 dark:stroke-slate-700/90'
                    }`}
                    style={{
                      stroke: isActive ? color : undefined,
                      strokeWidth: isActive ? 2 : 1,
                    }}
                  />

                  {/* Left Accent Color Indicator Bar */}
                  <rect
                    x="0"
                    y="4"
                    width="4"
                    height={lbl.boxH - 8}
                    rx="2"
                    fill={color}
                  />

                  {/* Row 1: Company Short Name */}
                  <text
                    x="12"
                    y="17"
                    className={`font-extrabold text-[11.5px] font-sans ${
                      isActive
                        ? 'fill-slate-950 dark:fill-white'
                        : 'fill-slate-900 dark:fill-slate-100'
                    }`}
                  >
                    {pt.company.shortName}
                  </text>

                  {/* Margin % Pill Badge */}
                  <rect
                    x={lbl.boxW - 48}
                    y="5"
                    width="42"
                    height="16"
                    rx="4"
                    className={
                      pt.marginPercent < 0
                        ? 'fill-rose-100 dark:fill-rose-950/70 stroke-rose-400 dark:stroke-rose-600 stroke-1'
                        : pt.marginPercent >= 7.0
                        ? 'fill-emerald-500/15 dark:fill-emerald-400/20'
                        : 'fill-slate-100 dark:fill-slate-800'
                    }
                  />
                  <text
                    x={lbl.boxW - 27}
                    y={16.5}
                    textAnchor="middle"
                    className={`font-mono font-bold text-[10px] ${
                      pt.marginPercent < 0
                        ? 'fill-rose-700 dark:fill-rose-400'
                        : pt.marginPercent >= 7.0
                        ? 'fill-emerald-700 dark:fill-emerald-400'
                        : 'fill-brand-700 dark:fill-brand-400'
                    }`}
                  >
                    {pt.marginPercent.toFixed(1)}%
                  </text>

                  {/* Row 2: Actual Profit Number & Deliveries */}
                  <text
                    x="12"
                    y="34"
                    className={`font-mono text-[9.5px] font-bold ${
                      isLoss
                        ? 'fill-rose-600 dark:fill-rose-400'
                        : isActive
                        ? 'fill-emerald-600 dark:fill-emerald-400'
                        : 'fill-emerald-700 dark:fill-emerald-400'
                    }`}
                  >
                    {lbl.profitStr}
                  </text>

                  {/* Deliveries Count */}
                  <text
                    x={lbl.boxW - 8}
                    y="34"
                    textAnchor="end"
                    className={`font-mono text-[9.5px] ${
                      isActive
                        ? 'fill-slate-700 dark:fill-slate-200 font-bold'
                        : 'fill-slate-500 dark:fill-slate-400 font-semibold'
                    }`}
                  >
                    {lbl.volumeStr}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Interactive Detail Panel */}
        {activePoint && (
          <div className="mt-4 p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
            {/* Left: Company Identity, Badges & Strategic Quadrant Info */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 ring-4 ring-slate-100 dark:ring-slate-800"
                style={{
                  backgroundColor: getOemColor(activePoint.company.name),
                }}
              >
                {activePoint.company.shortName.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {activePoint.company.name}
                  </h4>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    {activePoint.company.hqCountry} •{' '}
                    {language === 'ko' ? '공시통화' : 'Currency'}:{' '}
                    {activePoint.company.reportingCurrency}
                  </span>
                  {resolvedSelectedPoint && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {language === 'ko' ? '선택됨' : 'Selected'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {activePoint.marginPercent >= midMargin &&
                  (getNormalizedProfit(activePoint) ?? 0) >= midProfit
                    ? language === 'ko'
                      ? '★ 절대 영업이익 규모와 고수익률을 동시 달성한 핵심 리더'
                      : '★ Premier Profit Leader with massive earnings scale and high margins'
                    : activePoint.marginPercent >= midMargin
                    ? language === 'ko'
                      ? '고마진 실속형 / 뛰어난 수익성 효율을 보유한 특화 기업'
                      : 'High Margin Specialist with superior profitability efficiency'
                    : (getNormalizedProfit(activePoint) ?? 0) >= midProfit
                    ? language === 'ko'
                      ? '대규모 절대 이익 창출 (수익성 개선 여력 존재)'
                      : 'High Absolute Profit Scale with margin expansion opportunities'
                    : (activePoint.operatingIncome ?? 0) < 0
                    ? language === 'ko'
                      ? '영업적자 기록 기업 / 흑자 전환 및 체질 개선 추진 단계'
                      : 'Operating loss recorded / Turnaround & restructuring phase'
                    : language === 'ko'
                    ? '수익성 개선 및 영업이익 확대를 위한 구조개편 단계'
                    : 'Restructuring & operational turnaround phase'}
                </p>
              </div>
            </div>

            {/* Right: Key Financial & Volume Numbers + Quick Link */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Converted Profit */}
              <div className="bg-white dark:bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 text-[10.5px] block font-sans font-medium">
                  {language === 'ko'
                    ? '영업이익 (환율 환산)'
                    : 'Operating Profit (Normalized)'}
                </span>
                <span
                  className={`font-bold font-mono text-sm sm:text-base ${
                    (activePoint.operatingIncome ?? 0) < 0
                      ? 'text-rose-600 dark:rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatLocalizedProfit(
                    activePoint.operatingIncome,
                    activePoint.currency ||
                      activePoint.company.reportingCurrency,
                    language,
                    { showOriginal: true }
                  )}
                </span>
              </div>

              {/* Operating Margin */}
              <div className="bg-white dark:bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 text-[10.5px] block font-sans font-medium">
                  {language === 'ko' ? '영업이익률 (RoS)' : 'EBIT Margin (RoS)'}
                </span>
                <span
                  className={`font-bold font-mono text-sm sm:text-base ${
                    activePoint.marginPercent < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-brand-600 dark:text-brand-400'
                  }`}
                >
                  {activePoint.marginPercent.toFixed(1)}%
                </span>
              </div>

              {/* Deliveries */}
              <div className="bg-white dark:bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 text-[10.5px] block font-sans font-medium">
                  {language === 'ko' ? '글로벌 인도량' : 'Deliveries'}
                </span>
                <span className="text-slate-900 dark:text-white font-bold font-mono text-sm sm:text-base">
                  {activePoint.volumeThousand >= 1000
                    ? `${(activePoint.volumeThousand / 1000).toFixed(2)}M`
                    : activePoint.volumeThousand > 0
                    ? `${Math.round(activePoint.volumeThousand).toLocaleString()}k`
                    : '-'}
                </span>
              </div>

              {/* Direct Company Dossier Link */}
              <Link
                to={`/company/${activePoint.company.id}`}
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <span>{language === 'ko' ? '상세 분석' : 'Deep Dive'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              {/* Dismiss Button if selected */}
              {resolvedSelectedPoint && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPoint(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  title={language === 'ko' ? '선택 해제' : 'Deselect'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
