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
  periodBadge?: string;
  sortByValue?: boolean;
  onSelectObservation?: (obs: MetricObservation) => void;
}

export const MetricBarChart: React.FC<MetricBarChartProps> = ({
  title,
  subtitle,
  observations,
  unit,
  periodBadge,
  sortByValue = true,
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

  // Sort observations in descending order (highest value first) by default
  const sortedObservations = sortByValue
    ? [...observations].sort((a, b) => {
        const valA = a.observation.value ?? -Infinity;
        const valB = b.observation.value ?? -Infinity;
        return valB - valA;
      })
    : observations;

  // Calculate scales
  const validValues = sortedObservations
    .map((o) => o.observation.value)
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const maxVal = validValues.length > 0 ? Math.max(...validValues, 0) : 100;
  const minVal = validValues.length > 0 ? Math.min(...validValues, 0) : 0;
  const range = maxVal - minVal || 1;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col">
      {/* Chart Header */}
      <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap">
              {title}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold">
              {unit.replace('_', ' ')}
            </span>
            {periodBadge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-bold border border-brand-500/20 whitespace-nowrap">
                📅 {periodBadge}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
              {language === 'ko' ? '높은순 정렬' : 'Ranked'}
            </span>
          </div>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Dynamic Hover/Active Status in Header */}
        {hoveredIndex !== null && sortedObservations[hoveredIndex] && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 rounded-lg text-xs font-mono animate-fadeIn">
            <span className="font-bold text-brand-700 dark:text-brand-300">
              {sortedObservations[hoveredIndex].company.shortName}:
            </span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100">
              {formatMetricValue(sortedObservations[hoveredIndex].observation.value, unit, sortedObservations[hoveredIndex].observation.currency)}
            </span>
          </div>
        )}
      </div>

      {/* SVG Bar Chart Container with Ample Headroom */}
      <div className="relative w-full overflow-x-auto pt-8 pb-2">
        <div className="min-w-[440px] h-[240px] flex items-end justify-around gap-2 px-5 pb-8 pt-10 border-b border-slate-200 dark:border-slate-800 relative">
          {/* Zero baseline if minVal < 0 */}
          {minVal < 0 && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-slate-300 dark:border-slate-700 pointer-events-none"
              style={{
                bottom: `${(Math.abs(minVal) / range) * 130 + 32}px`,
              }}
            />
          )}

          {sortedObservations.map((item, idx) => {
            const val = item.observation.value;
            const isNull = val === null || !Number.isFinite(val);
            const valNum = isNull ? 0 : val;
            const barHeightPct = isNull ? 4 : Math.max(6, (Math.abs(valNum) / (maxVal || 1)) * 125);
            const isHovered = hoveredIndex === idx;

            // Safe horizontal positioning to prevent first and last items from being clipped by scroll container
            const tooltipPositionClass =
              idx === 0
                ? 'left-0'
                : idx === sortedObservations.length - 1
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2';

            return (
              <div
                key={item.company.id}
                className="flex-1 flex flex-col items-center group relative cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectObservation?.(item.observation)}
              >
                {/* Floating Tooltip inside container: clean light theme in day mode, sleek slate in dark mode */}
                {isHovered && (
                  <div
                    className={`absolute -top-8 z-30 px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg shadow-lg shadow-slate-300/50 dark:shadow-slate-950/60 text-[11px] font-mono border border-slate-200 dark:border-slate-700 whitespace-nowrap pointer-events-none flex items-center gap-1.5 transition-all ${tooltipPositionClass}`}
                  >
                    <span className="font-bold text-brand-600 dark:text-brand-400">#{idx + 1} {item.company.shortName}:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatMetricValue(val, unit, item.observation.currency)}
                    </span>
                    {!item.observation.isComparable && (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] font-medium">({language === 'ko' ? '비교주의' : 'Scope'})</span>
                    )}
                  </div>
                )}

                {/* Rank indicator for top 3 */}
                {idx < 3 && !isNull && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1 rounded mb-0.5 ${
                      idx === 0
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60'
                        : idx === 1
                        ? 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                )}

                {/* Value Label */}
                <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 mb-1.5 truncate group-hover:text-brand-600 dark:group-hover:text-brand-300 font-bold">
                  {isNull
                    ? 'N/R'
                    : unit === 'percentage'
                    ? `${valNum.toFixed(1)}%`
                    : unit === 'thousand_units'
                    ? valNum >= 1000
                      ? `${(valNum / 1000).toFixed(2)}M`
                      : `${Math.round(valNum).toLocaleString()}k`
                    : valNum >= 1000
                    ? `${(valNum / 1000).toFixed(1)}k`
                    : valNum.toFixed(1)}
                </div>

                {/* Vertical Bar */}
                <div className="w-full max-w-[36px] flex items-end justify-center">
                  <div
                    className={`w-full rounded-t transition-all duration-200 ${
                      isNull
                        ? 'bg-slate-200 dark:bg-slate-800 border-dashed border border-slate-300 dark:border-slate-700'
                        : isHovered
                        ? 'bg-gradient-to-t from-brand-500 to-brand-400 shadow-md scale-y-105 origin-bottom'
                        : item.observation.isComparable
                        ? 'bg-gradient-to-t from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-xs'
                        : 'bg-gradient-to-t from-amber-600 to-amber-500'
                    }`}
                    style={{ height: `${barHeightPct}px` }}
                  />
                </div>

                {/* Company Label */}
                <div className="mt-2 text-center w-full px-0.5">
                  <span
                    className={`text-[11px] font-semibold truncate block mx-auto max-w-[64px] ${
                      isHovered ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
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
