import React from 'react';
import { Company } from '../../../types/metrics';
import { formatMetricValue } from '../../../utils/metricCalculations';
import { TermBadge } from '../TermBadge';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Zap, Info } from 'lucide-react';

interface PowertrainMixItem {
  company: Company;
  totalDeliveries: number;
  bevVolume: number;
  phevVolume?: number;
  phevReported?: boolean;
}

interface PowertrainMixChartProps {
  title: string;
  subtitle?: string;
  data: PowertrainMixItem[];
}

export const PowertrainMixChart: React.FC<PowertrainMixChartProps> = ({
  title,
  subtitle,
  data,
}) => {
  const { language } = useLanguage();
  if (!data || data.length === 0) return null;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              {language === 'ko' ? '전동화 비중 분석' : 'Powertrain Breakdown'}
            </span>
          </div>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <TermBadge term="BEV" showIcon={false} /> {language === 'ko' ? '(순수 전기차)' : '(100% BEV)'}
          </div>
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
            <TermBadge term="PHEV" showIcon={false} /> {language === 'ko' ? '(공시 시)' : '(Disclosed)'}
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-700" />
            <span>{language === 'ko' ? '내연기관 / 일반 HEV' : 'ICE / Conventional HEV'}</span>
          </div>
        </div>
      </div>

      {/* Stacked Bars List */}
      <div className="space-y-3.5 pt-1">
        {data.map((item) => {
          const total = item.totalDeliveries || 1;
          const bevPct = Math.min(100, (item.bevVolume / total) * 100);
          const isPureBEV = item.company.id === 'tesla';
          const hasPHEVDisclosed = item.phevReported ?? (item.company.id === 'byd');
          const phevVol = hasPHEVDisclosed ? (item.phevVolume || 0) : 0;
          const phevPct = hasPHEVDisclosed ? Math.min(100 - bevPct, (phevVol / total) * 100) : 0;
          const icePct = Math.max(0, 100 - bevPct - phevPct);

          return (
            <div key={item.company.id} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {item.company.name}
                  </span>
                  {isPureBEV && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      {language === 'ko' ? '순수 전기차 전용' : 'Pure BEV'}
                    </span>
                  )}
                  {!isPureBEV && !hasPHEVDisclosed && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {language === 'ko' ? '(PHEV 별도 미공시)' : '(PHEV not split in IR)'}
                    </span>
                  )}
                </div>

                <div className="font-mono text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-2">
                  <span>
                    {language === 'ko' ? '총 인도' : 'Total'}: {formatMetricValue(item.totalDeliveries, 'thousand_units')}
                  </span>
                  <span>•</span>
                  <span>
                    BEV:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {bevPct.toFixed(1)}%
                    </strong>
                  </span>
                  {hasPHEVDisclosed && phevPct > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        PHEV:{' '}
                        <strong className="text-sky-600 dark:text-sky-400 font-bold">
                          {phevPct.toFixed(1)}%
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-5 w-full bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden flex border border-slate-200 dark:border-slate-800 shadow-inner">
                {/* BEV Segment */}
                {bevPct > 0 && (
                  <div
                    className="h-full bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center text-[10px] font-mono text-slate-950 font-bold"
                    style={{ width: `${bevPct}%` }}
                    title={`BEV: ${item.bevVolume.toFixed(1)}k units (${bevPct.toFixed(1)}%)`}
                  >
                    {bevPct >= 8 && `${bevPct.toFixed(0)}% BEV`}
                  </div>
                )}

                {/* PHEV Segment (Only if explicitly reported by OEM) */}
                {phevPct > 0 && (
                  <div
                    className="h-full bg-sky-500 hover:bg-sky-400 transition-colors flex items-center justify-center text-[10px] font-mono text-slate-950 font-bold"
                    style={{ width: `${phevPct}%` }}
                    title={`PHEV: ${phevVol.toFixed(1)}k units (${phevPct.toFixed(1)}%)`}
                  >
                    {phevPct >= 8 && `${phevPct.toFixed(0)}% PHEV`}
                  </div>
                )}

                {/* ICE / HEV Segment */}
                {icePct > 0 && (
                  <div
                    className="h-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-700 dark:text-slate-300"
                    style={{ width: `${icePct}%` }}
                    title={
                      hasPHEVDisclosed
                        ? `ICE / HEV: ${(item.totalDeliveries - item.bevVolume - phevVol).toFixed(1)}k units (${icePct.toFixed(1)}%)`
                        : `ICE / HEV (PHEV 미구분 포함): ${(item.totalDeliveries - item.bevVolume).toFixed(1)}k units (${icePct.toFixed(1)}%)`
                    }
                  >
                    {icePct >= 18 && (
                      <span>
                        {icePct.toFixed(0)}% {hasPHEVDisclosed ? 'ICE/HEV' : (language === 'ko' ? '내연/HEV' : 'ICE/HEV')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footnote on Disclosure Reality */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {language === 'ko'
            ? '공시 기준 안내: Tesla는 100% 순수 전기차 제조사이며, BYD는 신에너지차(NEV) 내 순수 전기차(BEV)와 플러그인(DM-i/p)을 분리 공시합니다. 그 외 완성차 제조사는 분기 헤드라인 IR에서 PHEV를 독립 항목으로 분리하지 않고 일반 내연기관/HEV와 통합 공시하므로 [PHEV 별도 미공시]로 처리됩니다.'
            : 'Disclosure Note: Tesla is 100% BEV; BYD explicitly separates BEV and PHEV (DM-i/p); other global OEMs report BEV volume separately while grouping PHEVs into total electrified/combustion lines in standard quarterly releases.'}
        </p>
      </div>
    </div>
  );
};
