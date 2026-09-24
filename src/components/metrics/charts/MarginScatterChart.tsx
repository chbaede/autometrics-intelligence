import React, { useState } from 'react';
import { Company } from '../../../types/metrics';
import { TermBadge } from '../TermBadge';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Layers } from 'lucide-react';

interface ScatterPoint {
  company: Company;
  volumeThousand: number;
  marginPercent: number;
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
  const width = 1000;
  const height = 520;
  const padLeft = 70;
  const padBottom = 55;
  const padRight = 50;
  const padTop = 40;

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
  }

  const placedLabels: PlacedLabel[] = [];

  // Sort points to place isolated or extreme points first
  const sortedPoints = [...points].sort((a, b) => {
    return b.volumeThousand - a.volumeThousand;
  });

  sortedPoints.forEach((pt) => {
    const px = getX(pt.volumeThousand);
    const py = getY(pt.marginPercent);
    const nameLen = pt.company.shortName.length;
    const nameWidth = nameLen <= 3 ? 34 : nameLen * 7.5 + 6;
    const numWidth = 40;
    const boxW = Math.max(122, Math.round(nameWidth + numWidth + 24));
    const boxH = 32;
    const color = getOemColor(pt.company.name);

    // 12 Candidate offsets (dx, dy) relative to (px, py)
    const candidates = [
      { dx: 18, dy: -38, hasLeader: true },
      { dx: -boxW - 18, dy: -38, hasLeader: true },
      { dx: 18, dy: 16, hasLeader: true },
      { dx: -boxW - 18, dy: 16, hasLeader: true },
      { dx: -boxW / 2, dy: -46, hasLeader: true },
      { dx: -boxW / 2, dy: 30, hasLeader: true },
      { dx: 26, dy: -58, hasLeader: true },
      { dx: -boxW - 26, dy: -58, hasLeader: true },
      { dx: 26, dy: 44, hasLeader: true },
      { dx: -boxW - 26, dy: 44, hasLeader: true },
      { dx: -boxW / 2, dy: -68, hasLeader: true },
      { dx: -boxW / 2, dy: 54, hasLeader: true },
    ];

    let bestCandidate = candidates[0];
    let minPenalty = Infinity;

    for (const c of candidates) {
      const bx = px + c.dx;
      const by = py + c.dy;
      let penalty = 0;

      // Check boundary violation
      if (bx < padLeft + 5) penalty += (padLeft + 5 - bx) * 100;
      if (bx + boxW > width - padRight - 5) penalty += (bx + boxW - (width - padRight - 5)) * 100;
      if (by < padTop + 5) penalty += (padTop + 5 - by) * 100;
      if (by + boxH > height - padBottom - 5) penalty += (by + boxH - (height - padBottom - 5)) * 100;

      // Check overlap with other placed label boxes with 8px buffer
      for (const placed of placedLabels) {
        const overlapX = Math.max(0, Math.min(bx + boxW + 8, placed.boxX + placed.boxW + 8) - Math.max(bx - 8, placed.boxX - 8));
        const overlapY = Math.max(0, Math.min(by + boxH + 8, placed.boxY + placed.boxH + 8) - Math.max(by - 8, placed.boxY - 8));
        const overlapArea = overlapX * overlapY;
        if (overlapArea > 0) {
          penalty += overlapArea * 60 + 1200;
        }
      }

      // Check overlap with point markers
      for (const p of points) {
        const pointX = getX(p.volumeThousand);
        const pointY = getY(p.marginPercent);
        if (bx <= pointX + 12 && bx + boxW >= pointX - 12 && by <= pointY + 12 && by + boxH >= pointY - 12) {
          if (p.company.id !== pt.company.id) {
            penalty += 900;
          }
        }
      }

      // Small penalty for larger displacement
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
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold">
              {language === 'ko' ? '4분면 전략 매트릭스' : '4-Quadrant Strategic Matrix'}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Axis Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span>X: {language === 'ko' ? '판매량 (천 대)' : 'Deliveries (k units)'}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Y: <TermBadge term="RoS" showIcon={false} /> {language === 'ko' ? '영업이익률 (%)' : 'EBIT Margin (%)'}</span>
          </div>
        </div>
      </div>

      {/* SVG Scatter Plot Container */}
      <div className="relative w-full overflow-hidden bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 p-2">
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
            y={padTop + 24}
            textAnchor="end"
            className="fill-emerald-600 dark:fill-emerald-400 font-extrabold text-[12px] font-sans tracking-wide"
          >
            {language === 'ko' ? '★ 규모 & 고수익 리더 (Scale & Profit Leaders)' : '★ Scale & Profit Leaders'}
          </text>
          <text
            x={padLeft + 15}
            y={padTop + 24}
            className="fill-brand-600 dark:fill-brand-400 font-extrabold text-[12px] font-sans tracking-wide"
          >
            {language === 'ko' ? '프리미엄 럭셔리 & 고수익 (Premium & High Margin)' : 'Premium & High Margin'}
          </text>
          <text
            x={padLeft + 15}
            y={height - padBottom - 16}
            className="fill-slate-500 dark:fill-slate-400 font-bold text-[11px] font-sans tracking-wide"
          >
            {language === 'ko' ? '전환 및 구조개편 (Transition & Restructuring)' : 'Transition & Restructuring'}
          </text>
          <text
            x={width - padRight - 15}
            y={height - padBottom - 16}
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

          {/* Scatter Data Points & Connecting Badges */}
          {placedLabels.map((lbl) => {
            const pt = lbl.point;
            const x = lbl.x;
            const y = lbl.y;
            const isHovered = hovered?.company.id === pt.company.id;
            const color = lbl.color;

            return (
              <g
                key={pt.company.id}
                className="cursor-pointer transition-transform duration-150"
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
                  r={isHovered ? 24 : 16}
                  fill={color}
                  fillOpacity={isHovered ? 0.35 : 0.18}
                  className="transition-all duration-200"
                />

                {/* Main Bubble */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 12 : 9}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="shadow-lg transition-all duration-200"
                />

                {/* Collision-Free Comprehensive Metric Badge */}
                <g transform={`translate(${lbl.boxX}, ${lbl.boxY})`}>
                  <rect
                    x="0"
                    y="0"
                    width={lbl.boxW}
                    height={lbl.boxH}
                    rx="6"
                    className={`transition-colors shadow-sm ${
                      isHovered
                        ? 'fill-slate-900 text-white stroke-brand-500 stroke-2'
                        : 'fill-white/95 dark:fill-slate-900/95 stroke-slate-300 dark:stroke-slate-700'
                    }`}
                  />
                  {/* OEM Color Dot inside badge */}
                  <circle
                    cx="10"
                    cy="12"
                    r="3.5"
                    fill={color}
                  />
                  {/* Company Name */}
                  <text
                    x="18"
                    y="15"
                    className={`font-bold text-[10.5px] font-sans ${
                      isHovered ? 'fill-white' : 'fill-slate-900 dark:fill-slate-100'
                    }`}
                  >
                    {pt.company.shortName}
                  </text>
                  {/* Value Pill Box */}
                  <rect
                    x={lbl.boxW - 44}
                    y="4"
                    width="38"
                    height="16"
                    rx="4"
                    className={isHovered ? 'fill-brand-500/30' : 'fill-brand-500/10 dark:fill-brand-400/20'}
                  />
                  {/* Margin Percentage Value */}
                  <text
                    x={lbl.boxW - 25}
                    y="15.5"
                    textAnchor="middle"
                    className="fill-brand-600 dark:fill-brand-400 font-mono font-bold text-[10px]"
                  >
                    {pt.marginPercent.toFixed(1)}%
                  </text>

                  {/* Line 2: Delivery Volume & Strategic Role */}
                  <text
                    x="18"
                    y="27"
                    className={`font-mono text-[9px] ${
                      isHovered ? 'fill-slate-300' : 'fill-slate-500 dark:fill-slate-400'
                    }`}
                  >
                    {language === 'ko' ? '인도:' : 'Vol:'} {pt.volumeThousand >= 1000 ? `${(pt.volumeThousand / 1000).toFixed(2)}M` : `${pt.volumeThousand}k`}
                    <tspan className="font-sans font-semibold text-[8px] fill-slate-400 dark:fill-slate-500" dx="4">
                      • {pt.marginPercent >= midMargin && pt.volumeThousand >= midVol ? (language === 'ko' ? '수익 리더' : 'Leader') : pt.marginPercent >= midMargin ? (language === 'ko' ? '프리미엄' : 'Premium') : (language === 'ko' ? '양산 볼륨' : 'Volume')}
                    </tspan>
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
