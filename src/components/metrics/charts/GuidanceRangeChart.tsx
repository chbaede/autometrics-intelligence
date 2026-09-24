import React from 'react';
import { GuidanceObservation } from '../../../types/metrics';
import { getCompanyById } from '../../../utils/metricQueries';
import { Target, CheckCircle2, TrendingUp, TrendingDown, Compass, ExternalLink } from 'lucide-react';
import { TermBadge } from '../TermBadge';
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

  if (!guidanceList || guidanceList.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
        {language === 'ko' ? '표시할 경영진 가이던스 공시가 없습니다.' : 'No forward-looking guidance statements available.'}
      </div>
    );
  }

  // Calibration scale from 0% to 12%
  const scaleMin = 0;
  const scaleMax = 12;
  const scaleSpan = scaleMax - scaleMin;
  const tickSteps = [0, 2, 4, 6, 8, 10, 12];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'raised':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            <TrendingUp className="w-3 h-3" /> {language === 'ko' ? '상향 조정' : 'Raised'}
          </span>
        );
      case 'lowered':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold">
            <TrendingDown className="w-3 h-3" /> {language === 'ko' ? '하향 조정' : 'Lowered'}
          </span>
        );
      case 'reaffirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> {language === 'ko' ? '유지/재확인' : 'Reaffirmed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold">
            <Target className="w-3 h-3" /> {language === 'ko' ? '최초 공시' : 'Initial'}
          </span>
        );
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'ko'
                ? 'FY2026 연간 영업이익률 목표 가이던스 코리더 (Guidance Corridors)'
                : 'FY2026 Operating / EBIT Margin Target Guidance Corridors'}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold">
              Corridor Matrix
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ko'
              ? '완성차 제조사 경영진이 공식 발표한 연간 수익성 목표 밴드(Min ~ Max) 및 중앙값(Midpoint) 시각화'
              : 'Official management target ranges (%) with midpoint indicators and corridor benchmarks'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-brand-500/30 border border-brand-500 dark:border-brand-400" />
            <span>{language === 'ko' ? '목표 범위' : 'Target Range'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 dark:bg-amber-400 shadow-xs" />
            <span>{language === 'ko' ? '중앙값' : 'Midpoint'}</span>
          </div>
        </div>
      </div>

      {/* Calibration Scale Header */}
      <div className="space-y-4">
        {/* Scale Top Legend Bar */}
        <div className="relative h-6 w-full hidden sm:block">
          <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200 dark:bg-slate-800" />
          {tickSteps.map((tick) => {
            const leftPct = ((tick - scaleMin) / scaleSpan) * 100;
            return (
              <div
                key={tick}
                className="absolute bottom-0 flex flex-col items-center -translate-x-1/2"
                style={{ left: `${leftPct}%` }}
              >
                <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 mb-1">
                  {tick}%
                </span>
                <div className="w-px h-1.5 bg-slate-300 dark:bg-slate-700" />
              </div>
            );
          })}
        </div>

        {/* Guidance Items List */}
        <div className="space-y-3">
          {guidanceList.map((g) => {
            const company = getCompanyById(g.companyId);
            const min = g.min ?? g.target ?? 0;
            const max = g.max ?? g.target ?? min;
            const mid = g.midpoint ?? (min + max) / 2;

            const leftPct = Math.max(0, Math.min(100, ((min - scaleMin) / scaleSpan) * 100));
            const widthPct = Math.max(4, Math.min(100 - leftPct, ((max - min) / scaleSpan) * 100));
            const midPct = Math.max(0, Math.min(100, ((mid - scaleMin) / scaleSpan) * 100));

            return (
              <div
                key={g.id}
                onClick={() => onSelectGuidance?.(g)}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 dark:hover:border-brand-500/50 hover:shadow-md transition cursor-pointer space-y-3 group"
              >
                {/* Upper Meta Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-xs text-brand-600 dark:text-brand-400 shadow-xs shrink-0">
                      {company?.shortName.slice(0, 2).toUpperCase() || 'OEM'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                          {company?.name || g.companyId}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          FY{g.reportingYear}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(g.status)}
                    <div className="px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white shadow-xs">
                      {min === max ? (
                        <span>Target: {min}%</span>
                      ) : (
                        <span>
                          {min}% – {max}% <span className="text-amber-600 dark:text-amber-400 ml-1 font-semibold">(Mid: {mid}%)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visual Corridor Bar Area */}
                <div className="relative pt-1 pb-2">
                  {/* Background Grid Lines */}
                  <div className="relative h-7 w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-inner">
                    {tickSteps.map((tick) => {
                      const pos = ((tick - scaleMin) / scaleSpan) * 100;
                      return (
                        <div
                          key={tick}
                          className="absolute top-0 bottom-0 w-px border-r border-dashed border-slate-200 dark:border-slate-800/60"
                          style={{ left: `${pos}%` }}
                        />
                      );
                    })}

                    {/* Target Corridor Band */}
                    <div
                      className="absolute top-1 bottom-1 bg-gradient-to-r from-brand-500/30 to-brand-600/40 dark:from-brand-500/25 dark:to-brand-400/35 border-y-2 border-brand-500 dark:border-brand-400 rounded-md transition group-hover:brightness-110 shadow-xs"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      {/* Range Min Label inside */}
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-brand-900 dark:text-brand-200 hidden sm:inline">
                        {min}%
                      </span>
                      {/* Range Max Label inside */}
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-brand-900 dark:text-brand-200 hidden sm:inline">
                        {max}%
                      </span>
                    </div>

                    {/* Midpoint Diamond Marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rotate-45 bg-amber-400 dark:bg-amber-400 border-2 border-white dark:border-slate-900 shadow-md z-10"
                      style={{
                        left: `calc(${midPct}% - 7px)`,
                      }}
                      title={`Midpoint: ${mid}%`}
                    />
                  </div>
                </div>

                {/* Verbatim Statement Summary */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <p className="line-clamp-1 italic text-[11px] pr-2">
                    "{g.originalText}"
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 group-hover:underline shrink-0">
                    <span>{language === 'ko' ? '출처 상세' : 'Audit Details'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer explanation */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          * {language === 'ko' ? '가이던스는 각 제조사의 공식 연간 실적발표 자료 및 보고서 기준' : 'Guidance corridors represent primary disclosures from official OEM IR conferences and filings.'}
        </span>
        <TermBadge term="RoS" />
      </div>
    </div>
  );
};
