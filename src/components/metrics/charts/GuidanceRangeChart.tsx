import React, { useState } from 'react';
import { GuidanceObservation } from '../../../types/metrics';
import { getCompanyById } from '../../../utils/metricQueries';
import { Target, CheckCircle2, TrendingUp, TrendingDown, Compass, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';

interface GuidanceRangeChartProps {
  guidanceList: GuidanceObservation[];
  onSelectGuidance?: (item: GuidanceObservation) => void;
}

export const GuidanceRangeChart: React.FC<GuidanceRangeChartProps> = ({
  guidanceList,
  onSelectGuidance,
}) => {
  const { language } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter strictly for Margin/Return on Sales percentage guidance (excludes volume guidance)
  const marginGuidanceList = (guidanceList || []).filter(
    (g) => g.metricId === 'guidance_operating_margin' || g.unit === 'percentage'
  );

  if (marginGuidanceList.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
        {language === 'ko' ? '표시할 경영진 연간 가이던스 공시가 없습니다.' : 'No forward-looking guidance statements available.'}
      </div>
    );
  }

  // Scale bounds: 0% to 14%
  const scaleMin = 0;
  const scaleMax = 14;
  const scaleSpan = scaleMax - scaleMin;
  const tickSteps = [0, 2, 4, 6, 8, 10, 12, 14];

  // OEM distinct brand colors
  const getOemColor = (compName: string) => {
    const n = compName.toLowerCase();
    if (n.includes('mercedes')) return '#0d9488';
    if (n.includes('bmw')) return '#0891b2';
    if (n.includes('volkswagen')) return '#0284c7';
    if (n.includes('hyundai')) return '#0369a1';
    if (n.includes('toyota')) return '#dc2626';
    if (n.includes('tesla')) return '#e11d48';
    if (n.includes('byd')) return '#2563eb';
    if (n.includes('gm') || n.includes('general')) return '#4f46e5';
    if (n.includes('stellantis')) return '#7c3aed';
    if (n.includes('ford')) return '#1d4ed8';
    return '#64748b';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'raised':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
            <TrendingUp className="w-2.5 h-2.5" /> {language === 'ko' ? '상향' : 'Raised'}
          </span>
        );
      case 'lowered':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold shrink-0">
            <TrendingDown className="w-2.5 h-2.5" /> {language === 'ko' ? '하향' : 'Lowered'}
          </span>
        );
      case 'reaffirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold shrink-0">
            <CheckCircle2 className="w-2.5 h-2.5" /> {language === 'ko' ? '유지' : 'Reaffirmed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold shrink-0">
            <Target className="w-2.5 h-2.5" /> {language === 'ko' ? '공시' : 'Initial'}
          </span>
        );
    }
  };

  // Sort: Mercedes first, then BMW, VW, GM, Stellantis, Hyundai
  const sortedGuidance = [...marginGuidanceList].sort((a, b) => {
    const order = ['mercedes_benz', 'bmw_group', 'volkswagen_group', 'hyundai_motor', 'general_motors', 'stellantis'];
    const idxA = order.indexOf(a.companyId);
    const idxB = order.indexOf(b.companyId);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (b.midpoint ?? 0) - (a.midpoint ?? 0);
  });

  const hoveredGuidance = sortedGuidance.find((g) => g.id === hoveredId);

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'ko'
                ? '2026년 완성차 OEM 연간 재무 가이던스 목표 밴드 (가이던스 코리더)'
                : '2026 Automotive OEM Annual Margin Target Guidance Corridors'}
            </h3>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20">
              {language === 'ko' ? '연간 수익성 목표 밴드' : 'Unified Corridor Chart'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ko'
              ? '완성차 제조사 경영진이 공식 발표한 2026년도 연간 영업이익률 목표 밴드(최소 ~ 최대) 및 중간값 통합 비교'
              : 'Official management target ranges (min ~ max) and midpoint comparison across global automakers'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2.5 rounded bg-brand-500/30 border border-brand-500" />
            <span>{language === 'ko' ? '목표 밴드' : 'Target Band'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-amber-400 border border-white dark:border-slate-900 shadow-xs" />
            <span>{language === 'ko' ? '중앙값' : 'Midpoint'}</span>
          </div>
        </div>
      </div>

      {/* Unified Horizontal Comparative Chart Area */}
      <div className="relative w-full overflow-x-auto bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        {/* Scale Top Axis */}
        <div className="relative h-6 w-full pl-[185px] pr-[110px]">
          <div className="relative w-full h-full">
            {tickSteps.map((tick) => {
              const leftPct = ((tick - scaleMin) / scaleSpan) * 100;
              return (
                <div
                  key={tick}
                  className="absolute top-0 bottom-0 flex flex-col items-center -translate-x-1/2"
                  style={{ left: `${leftPct}%` }}
                >
                  <span className="text-[10.5px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    {tick}%
                  </span>
                  <div className="w-px h-2 bg-slate-300 dark:bg-slate-700 mt-0.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Unified OEM Rows */}
        <div className="space-y-2.5 pt-1 pb-1">
          {sortedGuidance.map((g) => {
            const company = getCompanyById(g.companyId);
            const min = g.min ?? g.target ?? 0;
            const max = g.max ?? g.target ?? min;
            const mid = g.midpoint ?? (min + max) / 2;
            const color = company ? getOemColor(company.name) : '#64748b';

            const leftPct = Math.max(0, Math.min(100, ((min - scaleMin) / scaleSpan) * 100));
            const widthPct = Math.max(3, Math.min(100 - leftPct, ((max - min) / scaleSpan) * 100));
            const midPct = Math.max(0, Math.min(100, ((mid - scaleMin) / scaleSpan) * 100));
            const isHovered = hoveredId === g.id;

            return (
              <div
                key={g.id}
                onMouseEnter={() => setHoveredId(g.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectGuidance?.(g)}
                className={`flex items-center gap-3 py-2 px-2.5 rounded-xl transition cursor-pointer border ${
                  isHovered
                    ? 'bg-brand-50/90 dark:bg-brand-500/10 border-brand-300 dark:border-brand-500/40 shadow-xs'
                    : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
              >
                {/* Left Column: Full Company Name & Status (175px width, No Truncation) */}
                <div className="w-[175px] shrink-0 flex items-center justify-between pr-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {company?.shortName || g.companyId}
                    </span>
                  </div>
                  {getStatusBadge(g.status)}
                </div>

                {/* Center Corridor Bar Column (Fluid flex-1) */}
                <div className="relative flex-1 h-8">
                  {/* Background Track with Grid Guidelines */}
                  <div className="relative w-full h-full bg-slate-100/80 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner flex items-center">
                    {tickSteps.map((tick) => {
                      const pos = ((tick - scaleMin) / scaleSpan) * 100;
                      return (
                        <div
                          key={tick}
                          className="absolute top-0 bottom-0 w-px border-r border-dashed border-slate-300 dark:border-slate-800/80"
                          style={{ left: `${pos}%` }}
                        />
                      );
                    })}

                    {/* Target Corridor Band */}
                    <div
                      className="absolute top-1 bottom-1 rounded-md transition-all shadow-xs flex items-center justify-between px-2"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: `${color}28`,
                        border: `1.5px solid ${color}`,
                      }}
                    >
                      {/* Visual bar content */}
                    </div>

                    {/* Midpoint Diamond Marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rotate-45 bg-amber-400 border-2 border-slate-900 dark:border-white shadow-md z-10 transition-transform"
                      style={{
                        left: `calc(${midPct}% - 7px)`,
                      }}
                      title={`Midpoint: ${mid}%`}
                    />
                  </div>
                </div>

                {/* Right Summary Badge (100px width) */}
                <div className="w-[100px] shrink-0 text-right pr-1">
                  <span className="font-mono font-bold text-xs sm:text-[13px] text-brand-700 dark:text-brand-300 bg-brand-500/10 px-2.5 py-1 rounded-md border border-brand-500/20">
                    {min === max ? `${min}%` : `${min}% ~ ${max}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Verbatim Statement Drawer on Hover */}
        {hoveredGuidance && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs animate-fadeIn">
            <p className="text-slate-600 dark:text-slate-300 italic text-[11px] line-clamp-1 pr-3">
              "{hoveredGuidance.originalText}"
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline shrink-0">
              <span>{language === 'ko' ? '공식 IR 원문 확인' : 'Audit Link'}</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
        * {language === 'ko' ? '가이던스는 각 완성차 제조사의 공식 연간 실적발표 자료 및 사업보고서 공시 기준입니다.' : 'Guidance corridors represent primary disclosures from official OEM IR conferences and filings.'}
      </div>
    </div>
  );
};
