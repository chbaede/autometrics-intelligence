import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Company, PeriodType } from '../../../types/metrics';
import { TermBadge } from '../TermBadge';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Layers, DollarSign, ExternalLink, X } from 'lucide-react';
import { formatLocalizedProfit, FX_BENCHMARK_METADATA } from '../../../utils/currencyUtils';

export interface ScatterPoint {
  company: Company;
  volumeThousand: number;
  marginPercent: number;
  operatingIncome?: number | null;
  revenue?: number | null;
  currency?: string;
}

interface MarginScatterChartProps {
  title: string;
  subtitle?: string;
  points: ScatterPoint[];
  periodType?: PeriodType;
  onSelectCompany?: (company: Company) => void;
}

export const MarginScatterChart: React.FC<MarginScatterChartProps> = ({
  title,
  subtitle,
  points,
  periodType,
  onSelectCompany,
}) => {
  const { language } = useLanguage();
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ScatterPoint | null>(null);

  const activePoint = selectedPoint || hovered;

  // Fail closed if periodType is undefined or if no points exist
  if (!periodType || !points || points.length === 0) return null;

  // Chart dimensions with generous padding for explicit axis titles and Y-axis tick clearance
  const width = 1060;
  const height = 600;
  const padLeft = 95;   // Expanded from 85 for clear Y-axis number visibility
  const padBottom = 80; // Expanded for explicit X-axis title
  const padRight = 55;
  const padTop = 65;    // Expanded from 55 for clean separation from top Y-axis title badge

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calculate dynamic axis bounds based on actual observations and explicit periodType
  const rawMaxVol = Math.max(...points.map((p) => p.volumeThousand), 500);
  const isAnnual = periodType === 'annual';
  const maxVolume = isAnnual
    ? Math.max(12000, Math.ceil((rawMaxVol * 1.08) / 1000) * 1000)
    : Math.max(3000, Math.ceil((rawMaxVol * 1.1) / 500) * 500);
  const volStep = isAnnual ? 2000 : 500;

  const rawMaxMargin = Math.max(...points.map((p) => p.marginPercent), 8);
  const maxMargin = rawMaxMargin > 12 ? 14 : 12;
  const minMargin = 0;
  const marginStep = 2;

  // Midpoints for 4 Quadrants
  const midVol = isAnnual ? 6000 : 1500;
  const midMargin = 7.0; // Industry weighted RoS benchmark

  const getX = (vol: number) => padLeft + (Math.min(maxVolume, Math.max(0, vol)) / maxVolume) * chartW;
  const getY = (margin: number) =>
    height - padBottom - ((Math.min(maxMargin, Math.max(minMargin, margin)) - minMargin) / (maxMargin - minMargin)) * chartH;

  // Generate X axis ticks
  const xTicks: number[] = [];
  for (let v = 0; v <= maxVolume; v += volStep) {
    xTicks.push(v);
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
    return '#64748b';
  };

  // Anti-collision label layout computation
  interface PlacedLabel {
    point: ScatterPoint;
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

  // Sort points to place high margin or high volume points first
  const sortedPoints = [...points].sort((a, b) => {
    return b.volumeThousand - a.volumeThousand;
  });

  sortedPoints.forEach((pt) => {
    const px = getX(pt.volumeThousand);
    const py = getY(pt.marginPercent);
    const curr = pt.currency || pt.company.reportingCurrency;
    
    // Converted Korean Won (KRW) profit display in Korean mode
    const profitStr = formatLocalizedProfit(pt.operatingIncome, curr, language);
    const volumeStr = pt.volumeThousand >= 1000
      ? `${(pt.volumeThousand / 1000).toFixed(2)}M`
      : `${Math.round(pt.volumeThousand)}k`;
    
    // Width and height of the modern mini-card (expanded for generous text spacing)
    const boxW = 176;
    const boxH = 46;
    const color = getOemColor(pt.company.name);

    // Multi-angle candidate offsets relative to (px, py)
    const candidates = [
      // Top-Right variants
      { dx: 20, dy: -52, hasLeader: true },
      { dx: 24, dy: -74, hasLeader: true },
      { dx: 28, dy: -96, hasLeader: true },
      // Top-Left variants
      { dx: -boxW - 20, dy: -52, hasLeader: true },
      { dx: -boxW - 24, dy: -74, hasLeader: true },
      { dx: -boxW - 28, dy: -96, hasLeader: true },
      // Bottom-Right variants
      { dx: 20, dy: 20, hasLeader: true },
      { dx: 24, dy: 46, hasLeader: true },
      { dx: 28, dy: 72, hasLeader: true },
      // Bottom-Left variants
      { dx: -boxW - 20, dy: 20, hasLeader: true },
      { dx: -boxW - 24, dy: 46, hasLeader: true },
      { dx: -boxW - 28, dy: 72, hasLeader: true },
      // Directly Above variants
      { dx: -boxW / 2, dy: -60, hasLeader: true },
      { dx: -boxW / 2, dy: -84, hasLeader: true },
      { dx: -boxW / 2, dy: -108, hasLeader: true },
      // Directly Below variants
      { dx: -boxW / 2, dy: 26, hasLeader: true },
      { dx: -boxW / 2, dy: 52, hasLeader: true },
      { dx: -boxW / 2, dy: 78, hasLeader: true },
      // Right-side bias options (essential for points near the left Y-axis boundary)
      { dx: 24, dy: -boxH / 2, hasLeader: true },
      { dx: 45, dy: -boxH / 2, hasLeader: true },
      { dx: 24, dy: -20, hasLeader: true },
      { dx: 24, dy: 14, hasLeader: true },
      { dx: 16, dy: -68, hasLeader: true },
      { dx: 16, dy: 44, hasLeader: true },
      // Left-side options (for points far enough to the right)
      { dx: -boxW - 30, dy: -boxH / 2, hasLeader: true },
      { dx: -boxW - 45, dy: -22, hasLeader: true },
      // Offset diagonals
      { dx: -boxW / 2 + 40, dy: -68, hasLeader: true },
      { dx: -boxW / 2 - 40, dy: -68, hasLeader: true },
      { dx: -boxW / 2 + 40, dy: 48, hasLeader: true },
      { dx: -boxW / 2 - 40, dy: 48, hasLeader: true },
    ];

    // Bounding areas of quadrant title badges to avoid obscuring them
    const quadrantBadges = [
      { x: padLeft + 8, y: padTop + 6, w: 260, h: 28 },
      { x: width - padRight - 265, y: padTop + 6, w: 260, h: 28 },
      { x: padLeft + 8, y: height - padBottom - 38, w: 265, h: 28 },
      { x: width - padRight - 255, y: height - padBottom - 38, w: 250, h: 28 },
    ];

    let bestCandidate = candidates[0];
    let minPenalty = Infinity;

    for (const c of candidates) {
      const bx = px + c.dx;
      const by = py + c.dy;
      let penalty = 0;

      // HARD PROHIBITION: Never allow cards to enter the Y-axis tick margin or protrude outside chart!
      if (bx < padLeft + 6) penalty += 10_000_000;
      if (bx + boxW > width - padRight - 6) penalty += 10_000_000;
      if (by < padTop + 6) penalty += 10_000_000;
      if (by + boxH > height - padBottom - 6) penalty += 10_000_000;

      // Check overlap with quadrant badges so text is never covered
      for (const q of quadrantBadges) {
        const oX = Math.max(0, Math.min(bx + boxW, q.x + q.w) - Math.max(bx, q.x));
        const oY = Math.max(0, Math.min(by + boxH, q.y + q.h) - Math.max(by, q.y));
        if (oX * oY > 0) {
          penalty += oX * oY * 100 + 5000;
        }
      }

      // Check overlap with other placed label boxes with 10px buffer
      for (const placed of placedLabels) {
        const overlapX = Math.max(0, Math.min(bx + boxW + 10, placed.boxX + placed.boxW + 10) - Math.max(bx - 10, placed.boxX - 10));
        const overlapY = Math.max(0, Math.min(by + boxH + 10, placed.boxY + placed.boxH + 10) - Math.max(by - 10, placed.boxY - 10));
        const overlapArea = overlapX * overlapY;
        if (overlapArea > 0) {
          penalty += overlapArea * 150 + 6000;
        }
      }

      // Check overlap with bubble markers with safe buffer
      for (const p of points) {
        const pointX = getX(p.volumeThousand);
        const pointY = getY(p.marginPercent);
        if (bx <= pointX + 16 && bx + boxW >= pointX - 16 && by <= pointY + 16 && by + boxH >= pointY - 16) {
          if (p.company.id !== pt.company.id) {
            penalty += 2500;
          }
        }
      }

      // Distance penalty
      penalty += Math.sqrt(c.dx * c.dx + c.dy * c.dy) * 0.8;

      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestCandidate = c;
      }
    }

    placedLabels.push({
      point: pt,
      x: px,
      y: py,
      boxX: px + bestCandidate.dx,
      boxY: py + bestCandidate.dy,
      boxW,
      boxH,
      color,
      hasLeader: bestCandidate.hasLeader || Math.abs(bestCandidate.dx) > 15 || Math.abs(bestCandidate.dy) > 25,
      profitStr,
      volumeStr,
    });
  });

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        {/* Row 1: Title & Main Category on Left, Core Axis Indicators on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Layers className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap break-keep">
              {title}
            </h3>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20 whitespace-nowrap">
              {language === 'ko' ? '4분면 전략 매트릭스' : '4-Quadrant Strategic Matrix'}
            </span>
          </div>

          {/* Axis & Card Value Indicators */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
              <span className="font-semibold">X: {language === 'ko' ? '판매량 (천 대)' : 'Deliveries (k)'}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold">Y: <TermBadge term="RoS" showIcon={false} /> {language === 'ko' ? '영업이익률 (%)' : 'Margin (%)'}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5 shadow-xs whitespace-nowrap">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="font-semibold">{language === 'ko' ? '카드: 한화(KRW) 환산 영업이익' : 'Card: EBIT in USD/Base'}</span>
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-mono whitespace-nowrap sm:ml-auto">
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
        {/* Style block for responsive SVG label density */}
        <style>{`
          @media (max-width: 640px) {
            .scatter-label-card:not(.scatter-card-active) .scatter-card-details {
              display: none;
            }
            .scatter-label-card:not(.scatter-card-active) rect.scatter-card-bg {
              height: 22px !important;
              width: 80px !important;
            }
            .scatter-label-card:not(.scatter-card-active) rect.scatter-card-indicator {
              height: 14px !important;
            }
            .scatter-label-card:not(.scatter-card-active) rect.scatter-card-badge {
              display: none;
            }
            .scatter-label-card:not(.scatter-card-active) text.scatter-card-margin {
              display: none;
            }
            .scatter-leader-line:not(.scatter-leader-active) {
              opacity: 0.15;
            }
          }
        `}</style>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Quadrant Tinted Background Panels */}
          {/* Top-Right: Scale & Profit Leaders */}
          <rect
            x={getX(midVol)}
            y={padTop}
            width={width - padRight - getX(midVol)}
            height={getY(midMargin) - padTop}
            className="fill-emerald-500/5 dark:fill-emerald-500/10"
            rx="8"
          />
          {/* Top-Left: Premium / High Margin */}
          <rect
            x={padLeft}
            y={padTop}
            width={getX(midVol) - padLeft}
            height={getY(midMargin) - padTop}
            className="fill-brand-500/5 dark:fill-brand-500/10"
            rx="8"
          />
          {/* Bottom-Right: High Volume Mass Market */}
          <rect
            x={getX(midVol)}
            y={getY(midMargin)}
            width={width - padRight - getX(midVol)}
            height={height - padBottom - getY(midMargin)}
            className="fill-amber-500/5 dark:fill-amber-500/10"
            rx="8"
          />
          {/* Bottom-Left: Transition / Restructuring */}
          <rect
            x={padLeft}
            y={getY(midMargin)}
            width={getX(midVol) - padLeft}
            height={height - padBottom - getY(midMargin)}
            className="fill-slate-500/5 dark:fill-slate-500/10"
            rx="8"
          />

          {/* Quadrant Dividing Crosshairs */}
          <line
            x1={getX(midVol)}
            y1={padTop}
            x2={getX(midVol)}
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
          {/* Top-Right: Scale & Profit Leaders */}
          <g transform={`translate(${width - padRight - (language === 'ko' ? 245 : 185)}, ${padTop + 10})`}>
            <rect
              width={language === 'ko' ? 235 : 175}
              height={22}
              rx={6}
              className="fill-emerald-500/10 dark:fill-emerald-500/15 stroke-emerald-500/25"
            />
            <text
              x={(language === 'ko' ? 235 : 175) / 2}
              y={15}
              textAnchor="middle"
              className="fill-emerald-700 dark:fill-emerald-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko' ? '★ 규모 & 고수익 리더 (Scale & Profit)' : '★ Scale & Profit Leaders'}
            </text>
          </g>

          {/* Top-Left: Premium & High Margin */}
          <g transform={`translate(${padLeft + 12}, ${padTop + 10})`}>
            <rect
              width={language === 'ko' ? 235 : 175}
              height={22}
              rx={6}
              className="fill-brand-500/10 dark:fill-brand-500/15 stroke-brand-500/25"
            />
            <text
              x={(language === 'ko' ? 235 : 175) / 2}
              y={15}
              textAnchor="middle"
              className="fill-brand-700 dark:fill-brand-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko' ? '프리미엄 럭셔리 & 고수익 (Premium)' : 'Premium & High Margin'}
            </text>
          </g>

          {/* Bottom-Left: Transition & Restructuring */}
          <g transform={`translate(${padLeft + 12}, ${height - padBottom - 32})`}>
            <rect
              width={language === 'ko' ? 235 : 185}
              height={22}
              rx={6}
              className="fill-slate-500/10 dark:fill-slate-500/15 stroke-slate-500/25"
            />
            <text
              x={(language === 'ko' ? 235 : 185) / 2}
              y={15}
              textAnchor="middle"
              className="fill-slate-700 dark:fill-slate-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko' ? '전동화 전환 & 체질 개선 (Transition)' : 'Transition & Restructuring'}
            </text>
          </g>

          {/* Bottom-Right: Mass Market Scale */}
          <g transform={`translate(${width - padRight - (language === 'ko' ? 220 : 160)}, ${height - padBottom - 32})`}>
            <rect
              width={language === 'ko' ? 210 : 150}
              height={22}
              rx={6}
              className="fill-amber-500/10 dark:fill-amber-500/15 stroke-amber-500/25"
            />
            <text
              x={(language === 'ko' ? 210 : 150) / 2}
              y={15}
              textAnchor="middle"
              className="fill-amber-700 dark:fill-amber-300 font-bold text-[10.5px] font-sans"
            >
              {language === 'ko' ? '대량 양산 볼륨 집중 (Mass Volume)' : 'Mass Market Scale'}
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
          {xTicks.map((vol) => {
            const x = getX(vol);
            return (
              <g key={`xtick-${vol}`}>
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
                  {vol >= 1000 ? `${(vol / 1000).toFixed(vol % 1000 === 0 ? 0 : 1)}M` : `${vol}k`}
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
                  x={padLeft - 12}
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
          <g transform={`translate(${padLeft - 80}, ${padTop - 44})`}>
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
              {language === 'ko' ? '▲ Y축: 영업이익률 RoS (%)' : '▲ Y: Operating Margin (%)'}
            </text>
          </g>

          {/* X-Axis Title (Bottom Center) */}
          <g transform={`translate(${padLeft + chartW / 2 - 165}, ${height - padBottom + 36})`}>
            <rect
              width={330}
              height={28}
              rx={7}
              className="fill-white dark:fill-slate-800 shadow-xs stroke-slate-200 dark:stroke-slate-700"
            />
            <text
              x={165}
              y={18.5}
              textAnchor="middle"
              className="fill-slate-800 dark:fill-slate-200 font-bold text-[11.5px] font-sans"
            >
              {language === 'ko'
                ? `➔ X축: 글로벌 ${isAnnual ? '연간' : '분기'} 판매량 / 인도 실적 (천 대 / 백만 대)`
                : `➔ X: Global ${isAnnual ? 'Annual' : 'Quarterly'} Vehicle Deliveries (k / M units)`}
            </text>
          </g>

          <defs>
            {placedLabels.map((lbl) => (
              <clipPath key={`clip-margin-${lbl.point.company.id}`} id={`clip-margin-${lbl.point.company.id}`}>
                <rect x="12" y="2" width="112" height="22" />
              </clipPath>
            ))}
          </defs>

          {/* LAYER 1: Leader Lines for Inactive Points */}
          {placedLabels
            .filter((lbl) => lbl.point.company.id !== activePoint?.company.id)
            .map((lbl) => {
              const targetX = lbl.boxX + lbl.boxW / 2;
              const targetY = lbl.boxY + lbl.boxH / 2;
              return (
                <line
                  key={`leader-${lbl.point.company.id}`}
                  x1={lbl.x}
                  y1={lbl.y}
                  x2={targetX}
                  y2={targetY}
                  stroke={lbl.color}
                  strokeWidth="1.2"
                  strokeDasharray={lbl.hasLeader ? '2 2' : 'none'}
                  strokeOpacity={lbl.hasLeader ? 0.6 : 0.25}
                  className="scatter-leader-line pointer-events-none"
                />
              );
            })}

          {/* LAYER 2: Bubble Dots for Inactive Points */}
          {placedLabels
            .filter((lbl) => lbl.point.company.id !== activePoint?.company.id)
            .map((lbl) => {
              const pt = lbl.point;
              return (
                <g
                  key={`bubble-${pt.company.id}`}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHovered(pt)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    const next = selectedPoint?.company.id === pt.company.id ? null : pt;
                    setSelectedPoint(next);
                    onSelectCompany?.(pt.company);
                  }}
                >
                  <circle
                    cx={lbl.x}
                    cy={lbl.y}
                    r={15}
                    fill={lbl.color}
                    fillOpacity={0.16}
                    className="transition-all duration-200"
                  />
                  <circle
                    cx={lbl.x}
                    cy={lbl.y}
                    r={8}
                    fill={lbl.color}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="shadow-sm transition-all duration-200"
                  />
                </g>
              );
            })}

          {/* LAYER 3: Mini Financial Cards for Inactive Points */}
          {placedLabels
            .filter((lbl) => lbl.point.company.id !== activePoint?.company.id)
            .map((lbl) => {
              const pt = lbl.point;
              return (
                <g
                  key={`card-${pt.company.id}`}
                  transform={`translate(${lbl.boxX}, ${lbl.boxY})`}
                  className="scatter-label-card cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHovered(pt)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    const next = selectedPoint?.company.id === pt.company.id ? null : pt;
                    setSelectedPoint(next);
                    onSelectCompany?.(pt.company);
                  }}
                >
                  {/* Card Background */}
                  <rect
                    x="0"
                    y="0"
                    width={lbl.boxW}
                    height={lbl.boxH}
                    rx="8"
                    className="scatter-card-bg transition-all shadow-xs fill-white/95 dark:fill-slate-900/95 stroke-slate-200 dark:stroke-slate-700/90"
                    strokeWidth={1}
                  />

                  {/* Left Accent Color Indicator Bar */}
                  <rect
                    x="0"
                    y="4"
                    width="4"
                    height={lbl.boxH - 8}
                    rx="2"
                    fill={lbl.color}
                    className="scatter-card-indicator"
                  />

                  {/* Row 1: Company Short Name (Protected from badge overlap by clipPath) */}
                  <text
                    x="12"
                    y="17"
                    clipPath={`url(#clip-margin-${pt.company.id})`}
                    className="font-extrabold text-[11px] font-sans fill-slate-900 dark:fill-slate-100"
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
                    className={`scatter-card-badge ${
                      pt.marginPercent >= 7.0
                        ? 'fill-emerald-500/15 dark:fill-emerald-400/20'
                        : 'fill-slate-100 dark:fill-slate-800'
                    }`}
                  />
                  <text
                    x={lbl.boxW - 27}
                    y="16.5"
                    textAnchor="middle"
                    className={`scatter-card-margin font-mono font-bold text-[10px] ${
                      pt.marginPercent >= 7.0
                        ? 'fill-emerald-700 dark:fill-emerald-400'
                        : 'fill-brand-700 dark:fill-brand-400'
                    }`}
                  >
                    {pt.marginPercent.toFixed(1)}%
                  </text>

                  {/* Row 2: Actual Profit Number & Deliveries */}
                  <g className="scatter-card-details">
                    <text
                      x="12"
                      y="35"
                      className="font-mono text-[9.5px] font-bold fill-emerald-700 dark:fill-emerald-400"
                    >
                      {lbl.profitStr}
                    </text>

                    <text
                      x={lbl.boxW - 10}
                      y="35"
                      textAnchor="end"
                      className="font-mono text-[9.5px] fill-slate-500 dark:fill-slate-400 font-semibold"
                    >
                      {lbl.volumeStr}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* LAYER 4: ACTIVE POINT (Hovered or Selected) Rendered On Top Of Everything */}
          {(() => {
            const activeLbl = placedLabels.find(
              (lbl) => lbl.point.company.id === activePoint?.company.id
            );
            if (!activeLbl) return null;
            const pt = activeLbl.point;
            const targetX = activeLbl.boxX + activeLbl.boxW / 2;
            const targetY = activeLbl.boxY + activeLbl.boxH / 2;

            return (
              <g key={`active-${pt.company.id}`} className="scatter-active-group">
                {/* Connecting Axis Guides */}
                <line
                  x1={activeLbl.x}
                  y1={activeLbl.y}
                  x2={activeLbl.x}
                  y2={height - padBottom}
                  stroke={activeLbl.color}
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
                <line
                  x1={padLeft}
                  y1={activeLbl.y}
                  x2={activeLbl.x}
                  y2={activeLbl.y}
                  stroke={activeLbl.color}
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />

                {/* Active Leader Line */}
                <line
                  x1={activeLbl.x}
                  y1={activeLbl.y}
                  x2={targetX}
                  y2={targetY}
                  stroke={activeLbl.color}
                  strokeWidth="1.8"
                  strokeDasharray={activeLbl.hasLeader ? '2 2' : 'none'}
                  strokeOpacity={0.8}
                  className="scatter-leader-line scatter-leader-active pointer-events-none"
                />

                {/* Outer Glow Circle */}
                <circle
                  cx={activeLbl.x}
                  cy={activeLbl.y}
                  r={22}
                  fill={activeLbl.color}
                  fillOpacity={0.35}
                  className="transition-all duration-200"
                />

                {/* Main Point Marker */}
                <circle
                  cx={activeLbl.x}
                  cy={activeLbl.y}
                  r={11}
                  fill={activeLbl.color}
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  className="shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    const next = selectedPoint?.company.id === pt.company.id ? null : pt;
                    setSelectedPoint(next);
                    onSelectCompany?.(pt.company);
                  }}
                />

                {/* Active Financial Card — Elevated with z-index effect */}
                <g
                  transform={`translate(${activeLbl.boxX}, ${activeLbl.boxY})`}
                  className="scatter-label-card scatter-card-active cursor-pointer"
                  onClick={() => {
                    const next = selectedPoint?.company.id === pt.company.id ? null : pt;
                    setSelectedPoint(next);
                    onSelectCompany?.(pt.company);
                  }}
                >
                  <rect
                    x="0"
                    y="0"
                    width={activeLbl.boxW}
                    height={activeLbl.boxH}
                    rx="8"
                    className="scatter-card-bg fill-white dark:fill-slate-850 shadow-xl"
                    style={{
                      stroke: activeLbl.color,
                      strokeWidth: 2,
                    }}
                  />

                  <rect
                    x="0"
                    y="4"
                    width="4"
                    height={activeLbl.boxH - 8}
                    rx="2"
                    fill={activeLbl.color}
                    className="scatter-card-indicator"
                  />

                  <text
                    x="12"
                    y="17"
                    clipPath={`url(#clip-margin-${pt.company.id})`}
                    className="font-extrabold text-[11px] font-sans fill-slate-950 dark:fill-white"
                  >
                    {pt.company.shortName}
                  </text>

                  {/* Margin % Pill Badge */}
                  <rect
                    x={activeLbl.boxW - 48}
                    y="5"
                    width="42"
                    height="16"
                    rx="4"
                    className={`scatter-card-badge ${
                      pt.marginPercent >= 7.0
                        ? 'fill-emerald-100 dark:fill-emerald-950/70 stroke-emerald-400 dark:stroke-emerald-600 stroke-1'
                        : 'fill-brand-100 dark:fill-brand-950/70 stroke-brand-400 dark:stroke-brand-600 stroke-1'
                    }`}
                  />
                  <text
                    x={activeLbl.boxW - 27}
                    y="16.5"
                    textAnchor="middle"
                    className={`scatter-card-margin font-mono font-bold text-[10px] ${
                      pt.marginPercent >= 7.0
                        ? 'fill-emerald-700 dark:fill-emerald-400'
                        : 'fill-brand-700 dark:fill-brand-400'
                    }`}
                  >
                    {pt.marginPercent.toFixed(1)}%
                  </text>

                  {/* Row 2: Actual Profit Number & Deliveries */}
                  <g className="scatter-card-details">
                    <text
                      x="12"
                      y="35"
                      className="font-mono text-[9.5px] font-bold fill-emerald-600 dark:fill-emerald-400"
                    >
                      {activeLbl.profitStr}
                    </text>

                    <text
                      x={activeLbl.boxW - 10}
                      y="35"
                      textAnchor="end"
                      className="font-mono text-[9.5px] fill-slate-800 dark:fill-slate-100 font-bold"
                    >
                      {activeLbl.volumeStr}
                    </text>
                  </g>
                </g>
              </g>
            );
          })()}
        </svg>

        {/* Dynamic Interactive Detail Panel (Clean adaptive design, NOT pitch black in light mode) */}
        {activePoint && (
          <div className="mt-4 p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
            {/* Left: Company Identity, Badges & Strategic Quadrant Info */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 ring-4 ring-slate-100 dark:ring-slate-800"
                style={{ backgroundColor: getOemColor(activePoint.company.name) }}
              >
                {activePoint.company.shortName.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {activePoint.company.name}
                  </h4>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    {activePoint.company.hqCountry} • {language === 'ko' ? '공시통화' : 'Currency'}: {activePoint.company.reportingCurrency}
                  </span>
                  {selectedPoint && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                      {language === 'ko' ? '선택됨' : 'Selected'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  {activePoint.marginPercent >= midMargin && activePoint.volumeThousand >= midVol
                    ? (language === 'ko' ? '★ 글로벌 규모 및 최고 수익성 선도 기업' : '★ Global Scale & High Profitability Leader')
                    : activePoint.marginPercent >= midMargin
                    ? (language === 'ko' ? '프리미엄 럭셔리 & 고수익 특화 기업' : 'Premium Luxury & High Margin Specialist')
                    : activePoint.volumeThousand >= midVol
                    ? (language === 'ko' ? '글로벌 대량 양산 볼륨 리더' : 'Global Mass Volume Leader')
                    : (language === 'ko' ? '전동화 전환 및 사업 구조개편 단계' : 'Electrification Transition & Restructuring Phase')}
                </p>
              </div>
            </div>

            {/* Right: Key Financial & Volume Numbers + Quick Link */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full md:w-auto justify-start md:justify-end">
              {/* KRW Converted Profit */}
              <div className="bg-white dark:bg-slate-800/90 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs grow xs:grow-0">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[10.5px] block font-sans font-medium">
                  {language === 'ko' ? '영업이익 (KRW 환산)' : 'Operating Profit (EBIT)'}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs sm:text-base">
                  {formatLocalizedProfit(activePoint.operatingIncome, activePoint.currency || activePoint.company.reportingCurrency, language, { showOriginal: true })}
                </span>
              </div>

              {/* Operating Margin */}
              <div className="bg-white dark:bg-slate-800/90 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs grow xs:grow-0">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[10.5px] block font-sans font-medium">
                  {language === 'ko' ? '영업이익률 (RoS)' : 'EBIT Margin (RoS)'}
                </span>
                <span className="text-brand-600 dark:text-brand-400 font-bold font-mono text-xs sm:text-base">
                  {activePoint.marginPercent.toFixed(1)}%
                </span>
              </div>

              {/* Deliveries */}
              <div className="bg-white dark:bg-slate-800/90 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs grow xs:grow-0">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[10.5px] block font-sans font-medium">
                  {language === 'ko' ? '글로벌 인도량' : 'Deliveries'}
                </span>
                <span className="text-slate-900 dark:text-white font-bold font-mono text-xs sm:text-base">
                  {activePoint.volumeThousand >= 1000
                    ? `${(activePoint.volumeThousand / 1000).toFixed(2)}M`
                    : `${Math.round(activePoint.volumeThousand)}k`}
                </span>
              </div>

              {/* Direct Company Dossier Link */}
              <Link
                to={`/company/${activePoint.company.id}`}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition grow xs:grow-0"
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
                  className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center justify-center"
                  title={language === 'ko' ? '선택 해제' : 'Deselect'}
                  aria-label="Deselect"
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
