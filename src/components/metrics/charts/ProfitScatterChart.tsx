import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Company } from '../../../types/metrics';
import { TermBadge } from '../TermBadge';
import { useLanguage } from '../../../i18n/LanguageContext';
import { TrendingUp, DollarSign, RefreshCw, ExternalLink, X } from 'lucide-react';
import {
  formatLocalizedProfit,
  convertMillionsToKRW,
  convertMillionsToUSD,
} from '../../../utils/currencyUtils';
import { ScatterPoint } from './MarginScatterChart';

interface ProfitScatterChartProps {
  title: string;
  subtitle?: string;
  points: ScatterPoint[];
  onSelectCompany?: (company: Company) => void;
}

export const ProfitScatterChart: React.FC<ProfitScatterChartProps> = ({
  title,
  subtitle,
  points,
  onSelectCompany,
}) => {
  const { language } = useLanguage();
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ScatterPoint | null>(null);

  const activePoint = selectedPoint || hovered;

  // Filter to only include points that have valid operating income and positive margin
  const validPoints = (points || []).filter(
    (p) =>
      p.operatingIncome !== undefined &&
      p.operatingIncome !== null &&
      Number.isFinite(p.operatingIncome) &&
      p.marginPercent > 0
  );

  if (validPoints.length === 0) return null;

  // Chart dimensions with generous padding for explicit axis titles
  const width = 1060;
  const height = 600;
  const padLeft = 85;
  const padBottom = 80;
  const padRight = 55;
  const padTop = 55;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Helper to extract normalized profit value for each point based on active language
  // In Korean: KRW in Trillions (조원)
  // In English: USD in Billions ($B)
  const getNormalizedProfit = (pt: ScatterPoint): number => {
    const curr = pt.currency || pt.company.reportingCurrency;
    const rawIncome = pt.operatingIncome ?? 0;
    if (language === 'ko') {
      const won = convertMillionsToKRW(rawIncome, curr);
      return won ? won / 1_000_000_000_000 : 0;
    } else {
      const usd = convertMillionsToUSD(rawIncome, curr);
      return usd ? usd / 1_000_000_000 : 0;
    }
  };

  const rawMaxProfit = Math.max(...validPoints.map(getNormalizedProfit), 1);

  // Dynamic bounds for X-axis (Operating Profit)
  let maxProfit: number;
  let profitStep: number;
  let midProfit: number;

  if (language === 'ko') {
    const isAnnual = rawMaxProfit > 18;
    if (isAnnual) {
      maxProfit = Math.max(50, Math.ceil((rawMaxProfit * 1.1) / 10) * 10);
      profitStep = 10;
      midProfit = 12.0;
    } else {
      maxProfit = Math.max(10, Math.ceil((rawMaxProfit * 1.1) / 2) * 2);
      profitStep = 2;
      midProfit = 3.5;
    }
  } else {
    const isAnnual = rawMaxProfit > 14;
    if (isAnnual) {
      maxProfit = Math.max(35, Math.ceil((rawMaxProfit * 1.1) / 5) * 5);
      profitStep = 5;
      midProfit = 9.0;
    } else {
      maxProfit = Math.max(8, Math.ceil(rawMaxProfit * 1.15));
      profitStep = maxProfit > 8 ? 2 : 1;
      midProfit = 2.5;
    }
  }

  // Bounds for Y-axis (Operating Margin %)
  const rawMaxMargin = Math.max(...validPoints.map((p) => p.marginPercent), 8);
  const maxMargin = rawMaxMargin > 12 ? 14 : 12;
  const minMargin = 0;
  const marginStep = 2;
  const midMargin = 7.0; // Industry benchmark Return on Sales

  const getX = (profitVal: number) =>
    padLeft + (Math.min(maxProfit, Math.max(0, profitVal)) / maxProfit) * chartW;

  const getY = (margin: number) =>
    height -
    padBottom -
    ((Math.min(maxMargin, Math.max(minMargin, margin)) - minMargin) /
      (maxMargin - minMargin)) *
      chartH;

  // Generate X axis ticks
  const xTicks: number[] = [];
  for (let p = 0; p <= maxProfit; p += profitStep) {
    xTicks.push(p);
  }

  // Generate Y axis ticks
  const yTicks: number[] = [];
  for (let m = minMargin; m <= maxMargin; m += marginStep) {
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
    return '#64748b';
  };

  // Anti-collision label layout computation
  interface PlacedLabel {
    point: ScatterPoint;
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

  // Sort points to place high profit or high margin points first
  const sortedPoints = [...validPoints].sort((a, b) => {
    return getNormalizedProfit(b) - getNormalizedProfit(a);
  });

  sortedPoints.forEach((pt) => {
    const profitVal = getNormalizedProfit(pt);
    const px = getX(profitVal);
    const py = getY(pt.marginPercent);
    const curr = pt.currency || pt.company.reportingCurrency;

    // Converted profit display
    const profitStr = formatLocalizedProfit(pt.operatingIncome, curr, language);
    const volumeStr =
      pt.volumeThousand >= 1000
        ? `${(pt.volumeThousand / 1000).toFixed(2)}M`
        : `${Math.round(pt.volumeThousand)}k`;

    // Width and height of the mini-card
    const boxW = 162;
    const boxH = 44;
    const color = getOemColor(pt.company.name);

    // Smart candidate offsets relative to (px, py)
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

      // Check boundary violation
      if (bx < padLeft + 4) penalty += (padLeft + 4 - bx) * 120;
      if (bx + boxW > width - padRight - 4)
        penalty += (bx + boxW - (width - padRight - 4)) * 120;
      if (by < padTop + 4) penalty += (padTop + 4 - by) * 120;
      if (by + boxH > height - padBottom - 4)
        penalty += (by + boxH - (height - padBottom - 4)) * 120;

      // Check overlap with other placed label boxes with 8px buffer
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

      // Check overlap with bubble markers with safe buffer
      for (const p of validPoints) {
        const pointX = getX(getNormalizedProfit(p));
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

      // Distance penalty
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
        {/* Row 1: Title & Main Category on Left, Core Axis Indicators on Right */}
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

          {/* Axis & Card Value Indicators */}
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

        {/* Row 2: Subtitle on Left, Exchange Rate on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 break-keep">
              {subtitle}
            </p>
          )}
          {language === 'ko' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-mono whitespace-nowrap sm:ml-auto">
              <RefreshCw className="w-3 h-3 text-blue-500 shrink-0" />
              <span>
                실시간 기준환율 (USD 1,380 · EUR 1,500 · JPY 9.2 · CNY 192)
              </span>
            </div>
          )}
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
          {/* Top-Right: Scale & Profit Leaders */}
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
          {/* Bottom-Left: Restructuring & Margin Recovery */}
          <rect
            x={padLeft}
            y={getY(midMargin)}
            width={getX(midProfit) - padLeft}
            height={height - padBottom - getY(midMargin)}
            className="fill-slate-500/5 dark:fill-slate-500/10"
            rx="8"
          />

          {/* Quadrant Dividing Crosshairs */}
          <line
            x1={getX(midProfit)}
            y1={padTop}
            x2={getX(midProfit)}
            y2={height - padBottom}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            className="opacity-40"
          />
          <line
            x1={padLeft}
            y1={getY(midMargin)}
            x2={width - padRight}
            y2={getY(midMargin)}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            className="opacity-40"
          />

          {/* Quadrant Watermark Badges with Rounded Pill Containers */}
          {/* Top-Right: Profit & Margin Leaders */}
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

          {/* Top-Left: High Margin Specialists */}
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

          {/* Bottom-Left: Turnaround & Restructuring */}
          <g
            transform={`translate(${padLeft + 12}, ${height - padBottom - 32})`}
          >
            <rect
              width={language === 'ko' ? 245 : 195}
              height={22}
              rx={6}
              className="fill-slate-500/10 dark:fill-slate-500/15 stroke-slate-500/25"
            />
            <text
              x={(language === 'ko' ? 245 : 195) / 2}
              y={15}
              textAnchor="middle"
              className="fill-slate-700 dark:fill-slate-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko'
                ? '수익성 개선 & 사업 체질 전환 (Turnaround)'
                : 'Restructuring & Turnaround'}
            </text>
          </g>

          {/* Bottom-Right: High Scale, Margin Diluted */}
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
                  className="fill-slate-600 dark:fill-slate-400 text-[11px] font-mono font-bold"
                >
                  {language === 'ko'
                    ? `${profitTick}${xUnitLabel}`
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
                  className="fill-slate-600 dark:fill-slate-400 text-[11px] font-mono font-bold"
                >
                  {m}%
                </text>
              </g>
            );
          })}

          {/* EXPLICIT AXIS TITLES */}
          {/* Y-Axis Title (Top Left) */}
          <g transform={`translate(${padLeft - 75}, ${padTop - 40})`}>
            <rect
              width={160}
              height={26}
              rx={7}
              className="fill-white dark:fill-slate-800 shadow-xs stroke-slate-200 dark:stroke-slate-700"
            />
            <text
              x={80}
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
            transform={`translate(${padLeft + chartW / 2 - 175}, ${height - padBottom + 36})`}
          >
            <rect
              width={350}
              height={28}
              rx={7}
              className="fill-white dark:fill-slate-800 shadow-xs stroke-slate-200 dark:stroke-slate-700"
            />
            <text
              x={175}
              y={18.5}
              textAnchor="middle"
              className="fill-slate-800 dark:fill-slate-200 font-bold text-[11.5px] font-sans"
            >
              {language === 'ko'
                ? '➔ X축: 글로벌 절대 영업이익 규모 (한화 조원 환산)'
                : '➔ X: Absolute Operating Profit / EBIT (Normalized $B)'}
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
                      isActive
                        ? pt.marginPercent >= 7.0
                          ? 'fill-emerald-100 dark:fill-emerald-950/70 stroke-emerald-400 dark:stroke-emerald-600 stroke-1'
                          : 'fill-brand-100 dark:fill-brand-950/70 stroke-brand-400 dark:stroke-brand-600 stroke-1'
                        : pt.marginPercent >= 7.0
                        ? 'fill-emerald-500/15 dark:fill-emerald-400/20'
                        : 'fill-slate-100 dark:fill-slate-800'
                    }
                  />
                  <text
                    x={lbl.boxW - 27}
                    y="16.5"
                    textAnchor="middle"
                    className={`font-mono font-bold text-[10px] ${
                      pt.marginPercent >= 7.0
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
                      isActive
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
                  {selectedPoint && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {language === 'ko' ? '선택됨' : 'Selected'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {activePoint.marginPercent >= midMargin &&
                  getNormalizedProfit(activePoint) >= midProfit
                    ? language === 'ko'
                      ? '★ 절대 영업이익 규모와 고수익률을 동시 달성한 핵심 리더'
                      : '★ Premier Profit Leader with massive earnings scale and high margins'
                    : activePoint.marginPercent >= midMargin
                    ? language === 'ko'
                      ? '고마진 실속형 / 뛰어난 수익성 효율을 보유한 특화 기업'
                      : 'High Margin Specialist with superior profitability efficiency'
                    : getNormalizedProfit(activePoint) >= midProfit
                    ? language === 'ko'
                      ? '규모의 경제로 대규모 절대 이익 창출 (이익률 제고 여력 존재)'
                      : 'High Absolute Profit Scale with margin expansion opportunities'
                    : language === 'ko'
                    ? '수익성 개선 및 영업이익 정상화를 위한 구조개편 단계'
                    : 'Restructuring & operational turnaround phase'}
                </p>
              </div>
            </div>

            {/* Right: Key Financial & Volume Numbers + Quick Link */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* KRW Converted Profit */}
              <div className="bg-white dark:bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 text-[10.5px] block font-sans font-medium">
                  {language === 'ko'
                    ? '영업이익 (환율 환산)'
                    : 'Operating Profit (EBIT)'}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm sm:text-base">
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
                <span className="text-brand-600 dark:text-brand-400 font-bold font-mono text-sm sm:text-base">
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
                    : `${Math.round(activePoint.volumeThousand).toLocaleString()}k`}
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
              {selectedPoint && (
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
