import React, { useState } from 'react';
import { MetricObservation, Company } from '../../../types/metrics';
import { formatMetricValue } from '../../../utils/metricCalculations';
import { HelpCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';

interface MetricBarChartProps {
  title: string;
  subtitle?: string;
  observations: {
    company: Company;
    observation: MetricObservation;
  }[];
  unit: string;
  onSelectObservation?: (obs: MetricObservation) => void;
}

export const MetricBarChart: React.FC<MetricBarChartProps> = ({
  title,
  subtitle,
  observations,
  unit,
  onSelectObservation,
}) => {
  const { language } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!observations || observations.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
        {language === 'ko' ? '선택한 필터 조건에 해당하는 데이터가 없습니다.' : 'No comparative observations available for the selected filters.'}
      </div>
    );
  }

  // Calculate scales
  const validValues = observations
    .map((o) => o.observation.value)
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const maxVal = validValues.length > 0 ? Math.max(...validValues, 0) : 100;
  const minVal = validValues.length > 0 ? Math.min(...validValues, 0) : 0;
  const range = maxVal - minVal || 1;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col">
      {/* Chart Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {title}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {unit.replace('_', ' ')}
            </span>
          </h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[420px] h-[220px] flex items-end justify-around gap-2 px-4 pb-8 pt-6 border-b border-slate-200 dark:border-slate-800 relative">
          {/* Zero baseline if minVal < 0 */}
          {minVal < 0 && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-slate-300 dark:border-slate-700 pointer-events-none"
              style={{
                bottom: `${(Math.abs(minVal) / range) * 160 + 32}px`,
              }}
            />
          )}

          {observations.map((item, idx) => {
            const val = item.observation.value;
            const isNull = val === null || !Number.isFinite(val);
            const valNum = isNull ? 0 : val;
            const barHeightPct = isNull ? 4 : Math.max(4, (Math.abs(valNum) / (maxVal || 1)) * 140);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.company.id}
                className="flex-1 flex flex-col items-center group relative cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectObservation?.(item.observation)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-20 px-2.5 py-1 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow-lg text-[11px] font-mono border border-slate-700 whitespace-nowrap pointer-events-none">
                    <span className="font-semibold text-brand-400">{item.company.shortName}: </span>
                    {formatMetricValue(val, unit, item.observation.currency)}
                    {!item.observation.isComparable && (
                      <span className="text-amber-400 ml-1.5">({language === 'ko' ? '비교주의' : 'Non-comparable'})</span>
                    )}
                  </div>
                )}

                {/* Value Label */}
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5 truncate group-hover:text-brand-600 dark:group-hover:text-brand-300 font-medium">
                  {isNull ? 'N/R' : valNum >= 1000 ? `${(valNum / 1000).toFixed(1)}k` : valNum.toFixed(1)}
                </div>

                {/* Vertical Bar */}
                <div className="w-full max-w-[38px] flex items-end justify-center">
                  <div
                    className={`w-full rounded-t transition-all duration-200 ${
                      isNull
                        ? 'bg-slate-200 dark:bg-slate-800 border-dashed border border-slate-300 dark:border-slate-700'
                        : item.observation.isComparable
                        ? 'bg-gradient-to-t from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-xs'
                        : 'bg-gradient-to-t from-amber-600 to-amber-500'
                    }`}
                    style={{ height: `${barHeightPct}px` }}
                  />
                </div>

                {/* Company Label */}
                <div className="mt-2 text-center">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate block max-w-[55px]">
                    {item.company.shortName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>{language === 'ko' ? '막대를 클릭하면 공식 IR 출처 및 산식 확인' : 'Click any bar to inspect official IR provenance'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand-500 inline-block" /> {language === 'ko' ? '공식 공시' : 'Reported'}
          </span>
        </div>
      </div>
    </div>
  );
};
