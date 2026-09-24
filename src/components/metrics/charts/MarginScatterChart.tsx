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
  const width = 920;
  const height = 480;
  const padLeft = 70;
  const padBottom = 55;
  const padRight = 40;
  const padTop = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calculate dynamic axis maximums based on actual observations
  const rawMaxVol = Math.max(...points.map((p) => p.volumeThousand), 500);
  const maxVolume = rawMaxVol > 3500 ? 12000 : 3500;
  const volStep = maxVolume > 3500 ? 2000 : 500;

  const rawMaxMargin = Math.max(...points.map((p) => p.marginPercent), 10);
  const maxMargin = Math.max(14, Math.ceil((rawMaxMargin + 2) / 2) * 2);
  const minMargin = 0;
  const marginStep = 2;

  // Midpoints for 4 Quadrants
  const midVol = maxVolume / 2;
  const midMargin = maxMargin / 2;

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
              4-Quadrant Strategic Matrix
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
      <div className="relative w-full overflow-x-auto bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[700px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Quadrant Tinted Background Panels */}
          {/* Top-Right: Scale & Profit Leaders */}
          <rect
            x={getX(midVol)}
            y={padTop}
            width={chartW / 2}
            height={chartH / 2}
            className="fill-emerald-500/5 dark:fill-emerald-500/10"
            rx="8"
          />
          {/* Top-Left: Premium / High Margin */}
          <rect
            x={padLeft}
            y={padTop}
            width={chartW / 2}
            height={chartH / 2}
            className="fill-brand-500/5 dark:fill-brand-500/10"
            rx="8"
          />
          {/* Bottom-Right: High Volume Mass Market */}
          <rect
            x={getX(midVol)}
            y={getY(midMargin)}
            width={chartW / 2}
            height={chartH / 2}
            className="fill-amber-500/5 dark:fill-amber-500/10"
            rx="8"
          />
          {/* Bottom-Left: Transition / Restructuring */}
          <rect
            x={padLeft}
            y={getY(midMargin)}
            width={chartW / 2}
            height={chartH / 2}
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

          {/* Scatter Data Points & Connecting Badges */}
          {points.map((pt) => {
            const x = getX(pt.volumeThousand);
            const y = getY(pt.marginPercent);
            const isHovered = hovered?.company.id === pt.company.id;
            const color = getOemColor(pt.company.name);

            return (
              <g
                key={pt.company.id}
                className="cursor-pointer transition-transform duration-150"
                onMouseEnter={() => setHovered(pt)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectCompany?.(pt.company)}
              >
                {/* Connecting Leader Line on Hover */}
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

                {/* Label Box (Always clear and visible) */}
                <g transform={`translate(${x + 12}, ${y - 12})`}>
                  <rect
                    x="0"
                    y="-12"
                    width={pt.company.shortName.length * 7.5 + 46}
                    height="22"
                    rx="6"
                    className="fill-white/95 dark:fill-slate-900/95 stroke-slate-300 dark:stroke-slate-700 shadow-sm"
                  />
                  <text
                    x="6"
                    y="3"
                    className="fill-slate-900 dark:fill-slate-100 font-bold text-[10px] font-sans"
                  >
                    {pt.company.shortName}
                  </text>
                  <text
                    x={pt.company.shortName.length * 7.5 + 10}
                    y="3"
                    className="fill-brand-600 dark:fill-brand-400 font-mono font-bold text-[10px]"
                  >
                    {pt.marginPercent.toFixed(1)}%
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* OEM Quadrant Breakdown Table (Quick Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {points
          .sort((a, b) => b.marginPercent - a.marginPercent)
          .map((pt) => {
            const color = getOemColor(pt.company.name);
            const isLeader = pt.marginPercent >= midMargin && pt.volumeThousand >= midVol;
            const isLuxury = pt.marginPercent >= midMargin && pt.volumeThousand < midVol;

            return (
              <div
                key={pt.company.id}
                onClick={() => onSelectCompany?.(pt.company)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-xs transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: color }}
                  />
                  <div className="truncate">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate block">
                      {pt.company.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Vol: {pt.volumeThousand >= 1000 ? `${(pt.volumeThousand / 1000).toFixed(2)}M` : `${pt.volumeThousand}k`}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-black text-xs text-brand-600 dark:text-brand-400 block">
                    {pt.marginPercent.toFixed(1)}%
                  </span>
                  <span className="text-[9px] font-sans font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {isLeader ? 'Leader' : isLuxury ? 'Premium' : 'Volume'}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
