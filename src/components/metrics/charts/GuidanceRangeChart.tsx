import React, { useState } from 'react';
import { GuidanceObservation } from '../../../types/metrics';
import { getCompanyById, getSourceDocById } from '../../../utils/metricQueries';
import { Target, CheckCircle2, TrendingUp, TrendingDown, Compass, ExternalLink, History, Layers } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';

export type GuidanceStageFilter = 'latest' | 'q2' | 'initial' | 'trajectory';

interface GuidanceRangeChartProps {
  guidanceList: GuidanceObservation[];
  onSelectGuidance?: (item: GuidanceObservation) => void;
  defaultStage?: GuidanceStageFilter;
  showStageSelector?: boolean;
}

export const GuidanceRangeChart: React.FC<GuidanceRangeChartProps> = ({
  guidanceList,
  onSelectGuidance,
  defaultStage = 'latest',
  showStageSelector = true,
}) => {
  const { language } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<GuidanceStageFilter>(defaultStage);

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
    if (n.includes('kia')) return '#059669';
    if (n.includes('toyota')) return '#dc2626';
    if (n.includes('tesla')) return '#e11d48';
    if (n.includes('byd')) return '#2563eb';
    if (n.includes('gm') || n.includes('general')) return '#4f46e5';
    if (n.includes('stellantis')) return '#7c3aed';
    if (n.includes('ford')) return '#1d4ed8';
    if (n.includes('geely')) return '#0284c7';
    if (n.includes('rivian')) return '#d97706';
    if (n.includes('volvo')) return '#475569';
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

  // Helper to resolve guidance numbers based on active stage
  const getStageValues = (g: GuidanceObservation, stage: GuidanceStageFilter) => {
    if (stage === 'latest' || stage === 'trajectory') {
      const min = g.min ?? g.target ?? 0;
      const max = g.max ?? g.target ?? min;
      const mid = g.midpoint ?? (min + max) / 2;
      return { min, max, mid, status: g.status, label: language === 'ko' ? 'Q3 최신' : 'Q3 Latest' };
    }

    const history = g.revisionHistory || [];
    const matchedRev = history.find((r) => r.stage === stage);
    if (matchedRev && (matchedRev.min !== undefined || matchedRev.target !== undefined)) {
      const min = matchedRev.min ?? matchedRev.target ?? 0;
      const max = matchedRev.max ?? matchedRev.target ?? min;
      const mid = matchedRev.midpoint ?? (min + max) / 2;
      return {
        min,
        max,
        mid,
        status: matchedRev.status,
        label: language === 'ko' ? (matchedRev.stageLabelKo || matchedRev.stage) : (matchedRev.stageLabel || matchedRev.stage),
      };
    }

    // Fallback if stage not present in history
    const min = g.min ?? g.target ?? 0;
    const max = g.max ?? g.target ?? min;
    const mid = g.midpoint ?? (min + max) / 2;
    return { min, max, mid, status: g.status, label: language === 'ko' ? '공시치' : 'Reported' };
  };

  // Helper for trajectory calculation: find initial vs latest shift
  const getTrajectoryDelta = (g: GuidanceObservation) => {
    const history = g.revisionHistory || [];
    const initRev = history.find((r) => r.stage === 'initial');
    const initMid = initRev?.midpoint ?? (initRev?.min !== undefined && initRev?.max !== undefined ? (initRev.min + initRev.max) / 2 : undefined);
    const currMid = g.midpoint ?? (g.min !== undefined && g.max !== undefined ? (g.min + g.max) / 2 : undefined);

    if (initMid !== undefined && currMid !== undefined) {
      const delta = currMid - initMid;
      return {
        initMid,
        currMid,
        delta: Math.round(delta * 10) / 10,
        initMin: initRev?.min,
        initMax: initRev?.max,
      };
    }
    return null;
  };

  // Sort strictly by active stage midpoint descending (#1 highest margin target to lowest)
  const sortedGuidance = [...marginGuidanceList].sort((a, b) => {
    const valA = getStageValues(a, selectedStage).mid;
    const valB = getStageValues(b, selectedStage).mid;
    if (valB !== valA) return valB - valA;
    return (b.midpoint ?? 0) - (a.midpoint ?? 0);
  });

  const hoveredGuidance = sortedGuidance.find((g) => g.id === hoveredId);
  const hoveredSrc = hoveredGuidance ? getSourceDocById(hoveredGuidance.sourceDocId) : null;

  return (
    <div className="p-3.5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        {/* Top: Icon + Title + Stage Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {language === 'ko'
                ? '2026년 완성차 OEM 연간 재무 가이던스 목표 밴드 (가이던스 코리더)'
                : '2026 Automotive OEM Annual Margin Target Guidance Corridors'}
            </h3>
          </div>

          {/* Interactive Stage Switcher */}
          {showStageSelector && (
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedStage('latest')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStage === 'latest'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ko' ? 'Q3 최신 전망' : 'Latest Q3'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('q2')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStage === 'q2'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ko' ? 'Q2 점검' : 'Q2 Revision'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('initial')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStage === 'initial'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ko' ? '연초 초기 목표' : 'Initial FY'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('trajectory')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  selectedStage === 'trajectory'
                    ? 'bg-brand-600 text-white shadow-xs font-bold'
                    : 'text-brand-600 dark:text-brand-400 hover:text-brand-700'
                }`}
              >
                <Layers className="w-3 h-3" />
                {language === 'ko' ? '변동 궤적 비교' : 'Trajectory'}
              </button>
            </div>
          )}
        </div>

        {/* Bottom row: Subtitle on left, Legend on right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedStage === 'trajectory'
              ? (language === 'ko'
                  ? '연초 초기 공시치(연한 점선 밴드) 대비 2026-Q3 최신 전망(실선 밴드)으로의 가이던스 상향/하향 변동 궤적 비교'
                  : 'Comparison of trajectory shift from Initial FY targets (ghost band) to Latest Q3 disclosures (solid band)')
              : (language === 'ko'
                  ? '완성차 제조사 경영진이 공식 발표한 2026년도 연간 영업이익률 목표 밴드(최소 ~ 최대) 및 중간값 통합 비교'
                  : 'Official management target ranges (min ~ max) and midpoint comparison across global automakers')}
          </p>

          {/* Legend */}
          <div className="flex items-center gap-3.5 text-xs text-slate-600 dark:text-slate-300 shrink-0 whitespace-nowrap self-start sm:self-auto">
            {selectedStage === 'trajectory' && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3.5 h-2 rounded-xs border border-dashed border-slate-400 dark:border-slate-500 bg-slate-200/40 dark:bg-slate-700/40 shrink-0" />
                <span className="text-[11px] font-medium">{language === 'ko' ? '연초 밴드' : 'Initial Band'}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-xs bg-brand-500/30 border border-brand-500 shrink-0" />
              <span className="font-medium">
                {selectedStage === 'trajectory'
                  ? (language === 'ko' ? 'Q3 최신 밴드' : 'Q3 Band')
                  : (language === 'ko' ? '목표 밴드' : 'Target Band')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rotate-45 bg-amber-400 border border-slate-900 dark:border-white shadow-xs shrink-0" />
              <span className="font-medium">{language === 'ko' ? '중앙값' : 'Midpoint'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Horizontal Comparative Chart Area */}
      <div className="relative w-full bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        {/* Scale Top Axis */}
        <div className="hidden sm:flex items-center gap-3 px-3 mb-2">
          {/* Left spacer matching company header */}
          <div className="w-[160px] shrink-0" />

          {/* Center axis ticks matching the exact corridor track width */}
          <div className="relative flex-1 h-6">
            {tickSteps.map((tick) => {
              const leftPct = ((tick - scaleMin) / scaleSpan) * 100;
              return (
                <div
                  key={tick}
                  className="absolute top-0 bottom-0 flex flex-col items-center -translate-x-1/2"
                  style={{ left: `${leftPct}%` }}
                >
                  <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                    {tick}%
                  </span>
                  <div className="w-px h-2 bg-slate-400 dark:bg-slate-600 mt-0.5" />
                </div>
              );
            })}
          </div>

          {/* Right spacer matching summary badge */}
          <div className="w-[120px] shrink-0" />
        </div>

        {/* Unified OEM Rows */}
        <div className="space-y-3 sm:space-y-2.5">
          {sortedGuidance.map((g) => {
            const company = getCompanyById(g.companyId);
            const { min, max, mid, status } = getStageValues(g, selectedStage);
            const trajectory = getTrajectoryDelta(g);
            const color = company ? getOemColor(company.name) : '#64748b';

            const leftPct = Math.max(0, Math.min(100, ((min - scaleMin) / scaleSpan) * 100));
            const widthPct = Math.max(3, Math.min(100 - leftPct, ((max - min) / scaleSpan) * 100));
            const midPct = Math.max(0, Math.min(100, ((mid - scaleMin) / scaleSpan) * 100));
            const isHovered = hoveredId === g.id;

            // Ghost band for trajectory mode
            let initLeftPct = 0;
            let initWidthPct = 0;
            if (selectedStage === 'trajectory' && trajectory && trajectory.initMin !== undefined && trajectory.initMax !== undefined) {
              initLeftPct = Math.max(0, Math.min(100, ((trajectory.initMin - scaleMin) / scaleSpan) * 100));
              initWidthPct = Math.max(3, Math.min(100 - initLeftPct, ((trajectory.initMax - trajectory.initMin) / scaleSpan) * 100));
            }

            return (
              <div
                key={g.id}
                onMouseEnter={() => setHoveredId(g.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectGuidance?.(g)}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:py-2 sm:px-3 rounded-xl transition cursor-pointer border ${
                  isHovered
                    ? 'bg-brand-50/90 dark:bg-brand-500/10 border-brand-300 dark:border-brand-500/40 shadow-xs'
                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100/90 dark:hover:bg-slate-800/60'
                }`}
              >
                {/* Mobile Top Header: Company Name, Status, and Target Range */}
                <div className="flex items-center justify-between gap-2 sm:w-[160px] shrink-0 sm:pr-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      title={company?.name || g.companyId}
                      className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate"
                    >
                      {company?.shortName || g.companyId}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:hidden">
                    {getStatusBadge(status)}
                    <span className="font-mono font-bold text-[11px] text-brand-700 dark:text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20">
                      {min === max ? `${min}%` : `${min}% ~ ${max}%`}
                    </span>
                  </div>
                  <div className="hidden sm:inline-flex">
                    {getStatusBadge(status)}
                  </div>
                </div>

                {/* Center Corridor Bar Column (Full width on mobile, fluid flex-1 on desktop) */}
                <div className="relative w-full sm:flex-1 h-8 sm:h-9">
                  {/* Background Track with Grid Guidelines */}
                  <div className="relative w-full h-full bg-slate-100/90 dark:bg-slate-900/90 rounded-lg border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-inner flex items-center">
                    {tickSteps.map((tick) => {
                      const pos = ((tick - scaleMin) / scaleSpan) * 100;
                      return (
                        <div
                          key={tick}
                          className="absolute top-0 bottom-0 w-px border-r border-dashed border-slate-300 dark:border-slate-800"
                          style={{ left: `${pos}%` }}
                        />
                      );
                    })}

                    {/* Ghost corridor band for Trajectory mode (shows where initial guidance sat) */}
                    {selectedStage === 'trajectory' && trajectory && trajectory.initMin !== undefined && trajectory.initMax !== undefined && (
                      <div
                        className="absolute top-1 bottom-1 rounded-md border border-dashed border-slate-400 dark:border-slate-600 bg-slate-300/30 dark:bg-slate-700/30 pointer-events-none"
                        style={{
                          left: `${initLeftPct}%`,
                          width: `${initWidthPct}%`,
                        }}
                        title={`${language === 'ko' ? '연초 초기 목표치' : 'Initial Target'}: ${trajectory.initMin}% ~ ${trajectory.initMax}%`}
                      />
                    )}

                    {/* Active Target Corridor Band */}
                    <div
                      className="absolute top-1 bottom-1 rounded-md transition-all shadow-xs flex items-center justify-between px-2"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: `${color}28`,
                        border: `2px solid ${color}`,
                      }}
                    />

                    {/* Midpoint Diamond Marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-45 bg-amber-400 border-2 border-slate-950 dark:border-white shadow-md z-10 transition-transform"
                      style={{
                        left: `calc(${midPct}% - 7px)`,
                      }}
                      title={`${language === 'ko' ? '중앙값' : 'Midpoint'}: ${mid}%`}
                    />
                  </div>
                </div>

                {/* Desktop Right Summary Badge */}
                <div className="hidden sm:flex items-center justify-end gap-1.5 w-[120px] shrink-0 text-right">
                  {selectedStage === 'trajectory' && trajectory && trajectory.delta !== 0 ? (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        trajectory.delta > 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {trajectory.delta > 0 ? `+${trajectory.delta}%p` : `${trajectory.delta}%p`}
                    </span>
                  ) : null}
                  <span className="inline-block whitespace-nowrap font-mono font-bold text-xs text-brand-700 dark:text-brand-300 bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/20 shadow-2xs">
                    {min === max ? `${min}%` : `${min}% ~ ${max}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Verbatim Statement Drawer on Hover */}
        {hoveredGuidance && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <p className="text-slate-600 dark:text-slate-300 italic text-[11.5px] line-clamp-1 pr-3">
              "{language === 'ko' && hoveredGuidance.translationKo ? hoveredGuidance.translationKo : hoveredGuidance.originalText}"
            </p>
            {hoveredSrc ? (
              <a
                href={hoveredSrc.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline shrink-0"
              >
                <span>{language === 'ko' ? '공식 IR 원문' : 'Audit Link'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
        <span>
          * {language === 'ko' ? '가이던스는 각 완성차 제조사의 공식 2026 Q3 실적발표 자료 및 사업보고서 공시 기준입니다.' : 'Guidance corridors represent primary disclosures from official OEM Q3 earnings releases and filings.'}
        </span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-brand-600 dark:text-brand-400">
          <History className="w-3 h-3" />
          {language === 'ko' ? '연초 / Q2 / Q3 3단계 변동 이력 보관 완료' : 'Multi-stage revision history preserved'}
        </span>
      </div>
    </div>
  );
};
