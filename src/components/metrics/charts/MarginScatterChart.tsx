import React, { useState } from 'react';
import { Company } from '../../../types/metrics';
import { TermBadge } from '../TermBadge';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Layers, DollarSign } from 'lucide-react';

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
  onSelectCompany?: (company: Company) => void;
}

export const MarginScatterChart: React.FC<MarginScatterChartProps> = ({
  title,
  subtitle,
  points,
  onSelectCompany,
}) => {
  const { language } = useLanguage();
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);

  if (!points || points.length === 0) return null;

  // Chart dimensions
  const width = 1040;
  const height = 560;
  const padLeft = 75;
  const padBottom = 60;
  const padRight = 55;
  const padTop = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calculate dynamic axis bounds based on actual observations
  const rawMaxVol = Math.max(...points.map((p) => p.volumeThousand), 500);
  const isAnnual = rawMaxVol > 4000;
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

  // Format compact profit (EBIT/Operating Income)
  const formatCompactProfit = (amountMillions?: number | null, currency = 'USD'): string => {
    if (amountMillions === undefined || amountMillions === null) return '-';
    const curr = currency.toUpperCase();
    
    if (curr === 'KRW') {
      // Millions KRW: 1,000,000M = 1.00조
      if (amountMillions >= 1000000) {
        return `₩${(amountMillions / 1000000).toFixed(2)}조`;
      }
      return `₩${Math.round(amountMillions / 100).toLocaleString()}억`;
    }
    
    if (curr === 'JPY') {
      // Millions JPY: 1,000,000M = 1.00조엔
      if (amountMillions >= 1000000) {
        return `¥${(amountMillions / 1000000).toFixed(2)}조`;
      }
      return `¥${Math.round(amountMillions / 100).toLocaleString()}억`;
    }
    
    if (curr === 'CNY') {
      // Millions CNY: 10,000M = 100억元
      if (amountMillions >= 10000) {
        return `¥${(amountMillions / 1000).toFixed(1)}B`;
      }
      return `¥${(amountMillions / 1000).toFixed(2)}B`;
    }

    if (curr === 'EUR') {
      // Millions EUR
      if (amountMillions >= 1000) {
        return `€${(amountMillions / 1000).toFixed(2)}B`;
      }
      return `€${amountMillions}M`;
    }

    // Default USD
    if (amountMillions >= 1000) {
      return `$${(amountMillions / 1000).toFixed(2)}B`;
    }
    return `$${amountMillions}M`;
  };

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
    const profitStr = formatCompactProfit(pt.operatingIncome, pt.currency || pt.company.reportingCurrency);
    const volumeStr = pt.volumeThousand >= 1000
      ? `${(pt.volumeThousand / 1000).toFixed(2)}M`
      : `${Math.round(pt.volumeThousand)}k`;
    
    // Width and height of the modern mini-card
    const boxW = 152;
    const boxH = 40;
    const color = getOemColor(pt.company.name);

    // 14 Smart candidate offsets relative to (px, py)
    const candidates = [
      { dx: 16, dy: -46, hasLeader: true },
      { dx: -boxW - 16, dy: -46, hasLeader: true },
      { dx: 16, dy: 16, hasLeader: true },
      { dx: -boxW - 16, dy: 16, hasLeader: true },
      { dx: -boxW / 2, dy: -52, hasLeader: true },
      { dx: -boxW / 2, dy: 24, hasLeader: true },
      { dx: 22, dy: -66, hasLeader: true },
      { dx: -boxW - 22, dy: -66, hasLeader: true },
      { dx: 22, dy: 44, hasLeader: true },
      { dx: -boxW - 22, dy: 44, hasLeader: true },
      { dx: -boxW / 2, dy: -78, hasLeader: true },
      { dx: -boxW / 2, dy: 60, hasLeader: true },
      { dx: 30, dy: -20, hasLeader: true },
      { dx: -boxW - 30, dy: -20, hasLeader: true },
    ];

    let bestCandidate = candidates[0];
    let minPenalty = Infinity;

    for (const c of candidates) {
      const bx = px + c.dx;
      const by = py + c.dy;
      let penalty = 0;

      // Check boundary violation
      if (bx < padLeft + 4) penalty += (padLeft + 4 - bx) * 120;
      if (bx + boxW > width - padRight - 4) penalty += (bx + boxW - (width - padRight - 4)) * 120;
      if (by < padTop + 4) penalty += (padTop + 4 - by) * 120;
      if (by + boxH > height - padBottom - 4) penalty += (by + boxH - (height - padBottom - 4)) * 120;

      // Check overlap with other placed label boxes with 8px buffer
      for (const placed of placedLabels) {
        const overlapX = Math.max(0, Math.min(bx + boxW + 8, placed.boxX + placed.boxW + 8) - Math.max(bx - 8, placed.boxX - 8));
        const overlapY = Math.max(0, Math.min(by + boxH + 8, placed.boxY + placed.boxH + 8) - Math.max(by - 8, placed.boxY - 8));
        const overlapArea = overlapX * overlapY;
        if (overlapArea > 0) {
          penalty += overlapArea * 70 + 1500;
        }
      }

      // Check overlap with bubble markers
      for (const p of points) {
        const pointX = getX(p.volumeThousand);
        const pointY = getY(p.marginPercent);
        if (bx <= pointX + 14 && bx + boxW >= pointX - 14 && by <= pointY + 14 && by + boxH >= pointY - 14) {
          if (p.company.id !== pt.company.id) {
            penalty += 1000;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20">
              {language === 'ko' ? '4분면 전략 매트릭스' : '4-Quadrant Strategic Matrix'}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Legend / Metrics Guide */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>X: {language === 'ko' ? '판매량 (천 대)' : 'Deliveries (k)'}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Y: <TermBadge term="RoS" showIcon={false} /> {language === 'ko' ? '영업이익률 (%)' : 'Margin (%)'}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5 shadow-sm">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === 'ko' ? '카드: 실제 영업이익' : 'Card: Actual EBIT'}</span>
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

          {/* Quadrant Header Watermarks */}
          <text
            x={width - padRight - 15}
            y={padTop + 22}
            textAnchor="end"
            className="fill-emerald-600 dark:fill-emerald-400 font-extrabold text-[12px] font-sans tracking-wide"
          >
            {language === 'ko' ? '★ 규모 & 고수익 리더 (Scale & Profit Leaders)' : '★ Scale & Profit Leaders'}
          </text>
          <text
            x={padLeft + 15}
            y={padTop + 22}
            className="fill-brand-600 dark:fill-brand-400 font-extrabold text-[12px] font-sans tracking-wide"
          >
            {language === 'ko' ? '프리미엄 럭셔리 & 고수익 (Premium & High Margin)' : 'Premium & High Margin'}
          </text>
          <text
            x={padLeft + 15}
            y={height - padBottom - 14}
            className="fill-slate-500 dark:fill-slate-400 font-bold text-[11px] font-sans tracking-wide"
          >
            {language === 'ko' ? '전환 및 구조개편 (Transition & Restructuring)' : 'Transition & Restructuring'}
          </text>
          <text
            x={width - padRight - 15}
            y={height - padBottom - 14}
            textAnchor="end"
            className="fill-amber-600 dark:fill-amber-400 font-bold text-[11px] font-sans tracking-wide"
          >
            {language === 'ko' ? '대량생산 볼륨 집중 (Mass Market Scale)' : 'Mass Market Scale'}
          </text>

          {/* Axes Lines */}
          <line
            x1={padLeft}
            y1={height - padBottom}
            x2={width - padRight}
            y2={height - padBottom}
            stroke="#64748b"
            strokeWidth="1.5"
          />
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={height - padBottom}
            stroke="#64748b"
            strokeWidth="1.5"
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
                <text
                  x={x}
                  y={height - padBottom + 20}
                  textAnchor="middle"
                  className="fill-slate-600 dark:fill-slate-400 text-[11px] font-mono font-semibold"
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
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-600 dark:fill-slate-400 text-[11px] font-mono font-semibold"
                >
                  {m}%
                </text>
              </g>
            );
          })}

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
            const color = lbl.color;

            return (
              <g
                key={pt.company.id}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(pt)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectCompany?.(pt.company)}
              >
                {/* Connecting Axis Guides on Hover */}
                {isHovered && (
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
                  r={isHovered ? 22 : 15}
                  fill={color}
                  fillOpacity={isHovered ? 0.35 : 0.16}
                  className="transition-all duration-200"
                />

                {/* Main Point Marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 11 : 8}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="shadow-lg transition-all duration-200"
                />

                {/* Modern Institutional Financial Card */}
                <g transform={`translate(${lbl.boxX}, ${lbl.boxY})`}>
                  {/* Card Background */}
                  <rect
                    x="0"
                    y="0"
                    width={lbl.boxW}
                    height={lbl.boxH}
                    rx="7"
                    className={`transition-all shadow-sm ${
                      isHovered
                        ? 'fill-slate-900 text-white stroke-brand-500 stroke-2 filter drop-shadow-md'
                        : 'fill-white/95 dark:fill-slate-900/95 stroke-slate-200 dark:stroke-slate-700/90'
                    }`}
                  />
                  
                  {/* Left Accent Color Indicator Bar */}
                  <rect
                    x="0"
                    y="4"
                    width="3.5"
                    height={lbl.boxH - 8}
                    rx="1.5"
                    fill={color}
                  />

                  {/* Row 1: Company Short Name */}
                  <text
                    x="10"
                    y="15"
                    className={`font-bold text-[11px] font-sans ${
                      isHovered ? 'fill-white' : 'fill-slate-900 dark:fill-slate-100'
                    }`}
                  >
                    {pt.company.shortName}
                  </text>

                  {/* Margin % Pill Badge */}
                  <rect
                    x={lbl.boxW - 46}
                    y="4"
                    width="40"
                    height="16"
                    rx="4"
                    className={
                      isHovered
                        ? 'fill-brand-500/40'
                        : pt.marginPercent >= 7.0
                        ? 'fill-emerald-500/15 dark:fill-emerald-400/20'
                        : 'fill-brand-500/10 dark:fill-brand-400/20'
                    }
                  />
                  <text
                    x={lbl.boxW - 26}
                    y="15.5"
                    textAnchor="middle"
                    className={`font-mono font-bold text-[10px] ${
                      pt.marginPercent >= 7.0
                        ? 'fill-emerald-600 dark:fill-emerald-400'
                        : 'fill-brand-600 dark:fill-brand-400'
                    }`}
                  >
                    {pt.marginPercent.toFixed(1)}%
                  </text>

                  {/* Row 2: Actual Profit Number & Deliveries */}
                  <text
                    x="10"
                    y="31"
                    className={`font-mono text-[9.5px] font-semibold ${
                      isHovered ? 'fill-emerald-300' : 'fill-emerald-600 dark:fill-emerald-400'
                    }`}
                  >
                    {lbl.profitStr}
                  </text>

                  {/* Deliveries Count */}
                  <text
                    x={lbl.boxW - 6}
                    y="31"
                    textAnchor="end"
                    className={`font-mono text-[9px] ${
                      isHovered ? 'fill-slate-300' : 'fill-slate-500 dark:fill-slate-400'
                    }`}
                  >
                    {lbl.volumeStr}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Interactive Detail Tooltip */}
        {hovered && (
          <div className="mt-3 p-3.5 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <span
                className="w-3.5 h-3.5 rounded-full ring-2 ring-white/30"
                style={{ backgroundColor: getOemColor(hovered.company.name) }}
              />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {hovered.company.name} ({hovered.company.shortName})
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 font-normal">
                    {hovered.company.hqCountry} • {hovered.company.reportingCurrency}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {hovered.marginPercent >= midMargin && hovered.volumeThousand >= midVol
                    ? (language === 'ko' ? '★ 글로벌 규모 및 최고 수익성 선도 기업' : '★ Global Scale & High Profitability Leader')
                    : hovered.marginPercent >= midMargin
                    ? (language === 'ko' ? '프리미엄 럭셔리 & 고수익 특화 기업' : 'Premium Luxury & High Margin Specialist')
                    : hovered.volumeThousand >= midVol
                    ? (language === 'ko' ? '글로벌 대량 양산 볼륨 리더' : 'Global Mass Volume Leader')
                    : (language === 'ko' ? '전동화 전환 및 사업 구조개편 단계' : 'Electrification Transition & Restructuring Phase')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block font-sans">
                  {language === 'ko' ? '영업이익 (EBIT)' : 'Operating Profit (EBIT)'}
                </span>
                <span className="text-emerald-400 font-bold text-sm">
                  {formatCompactProfit(hovered.operatingIncome, hovered.currency || hovered.company.reportingCurrency)}
                </span>
              </div>

              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block font-sans">
                  {language === 'ko' ? '영업이익률 (RoS)' : 'EBIT Margin (RoS)'}
                </span>
                <span className="text-brand-400 font-bold text-sm">
                  {hovered.marginPercent.toFixed(1)}%
                </span>
              </div>

              <div className="bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block font-sans">
                  {language === 'ko' ? '글로벌 인도량' : 'Global Deliveries'}
                </span>
                <span className="text-white font-bold text-sm">
                  {hovered.volumeThousand >= 1000
                    ? `${(hovered.volumeThousand / 1000).toFixed(2)}M`
                    : `${Math.round(hovered.volumeThousand).toLocaleString()}k`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
