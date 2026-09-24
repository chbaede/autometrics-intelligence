import React from 'react';
import { Company } from '../../../types/metrics';
import { formatMetricValue } from '../../../utils/metricCalculations';
import { TermBadge } from '../TermBadge';
import { useLanguage } from '../../../i18n/LanguageContext';

interface PowertrainMixItem {
  company: Company;
  totalDeliveries: number;
  bevVolume: number;
  phevVolume?: number;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <TermBadge term="BEV" showIcon={false} /> {language === 'ko' ? '(100% 전기차)' : '(100% Electric)'}
          </div>
          <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
            <TermBadge term="PHEV" showIcon={false} /> {language === 'ko' ? '(플러그인)' : '(Plug-in)'}
          </div>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-700" />
            <span>{language === 'ko' ? '내연기관' : 'ICE'} / <TermBadge term="HEV" showIcon={false} /></span>
          </div>
        </div>
      </div>

      {/* Stacked Bars List */}
      <div className="space-y-3.5 pt-1">
        {data.map((item) => {
          const total = item.totalDeliveries || 1;
          const bevPct = Math.min(100, (item.bevVolume / total) * 100);
          const phevPct = Math.min(100 - bevPct, ((item.phevVolume || 0) / total) * 100);
          const icePct = Math.max(0, 100 - bevPct - phevPct);

          return (
            <div key={item.company.id} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {item.company.name}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                  {language === 'ko' ? '총 인도량' : 'Total'}: {formatMetricValue(item.totalDeliveries, 'thousand_units')} • {language === 'ko' ? 'BEV 비중' : 'BEV Share'}:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{bevPct.toFixed(1)}%</strong>
                </span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-5 w-full bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden flex border border-slate-200 dark:border-slate-800 shadow-inner">
                {/* BEV Segment */}
                {bevPct > 0 && (
                  <div
                    className="h-full bg-emerald-500 hover:bg-emerald-400 transition flex items-center justify-center text-[10px] font-mono text-slate-950 font-bold"
                    style={{ width: `${bevPct}%` }}
                    title={`BEV: ${item.bevVolume.toFixed(1)}k units (${bevPct.toFixed(1)}%)`}
                  >
                    {bevPct >= 10 && `${bevPct.toFixed(0)}%`}
                  </div>
                )}

                {/* PHEV Segment */}
                {phevPct > 0 && (
                  <div
                    className="h-full bg-sky-500 hover:bg-sky-400 transition flex items-center justify-center text-[10px] font-mono text-slate-950 font-bold"
                    style={{ width: `${phevPct}%` }}
                    title={`PHEV: ${(item.phevVolume || 0).toFixed(1)}k units (${phevPct.toFixed(1)}%)`}
                  >
                    {phevPct >= 10 && `${phevPct.toFixed(0)}%`}
                  </div>
                )}

                {/* ICE Segment */}
                {icePct > 0 && (
                  <div
                    className="h-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-700 dark:text-slate-400"
                    style={{ width: `${icePct}%` }}
                    title={`ICE / Hybrid: ${(item.totalDeliveries - item.bevVolume - (item.phevVolume || 0)).toFixed(1)}k units (${icePct.toFixed(1)}%)`}
                  >
                    {icePct >= 15 && `${icePct.toFixed(0)}%`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
