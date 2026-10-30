import React, { useState } from 'react';
import { Company, MetricObservation } from '../../types/metrics';
import { useLanguage } from '../../i18n/LanguageContext';
import { ScheduledDisclosure } from '../../data/scheduledDisclosures';
import {
  formatMetricValue,
  getCurrencySymbol,
  getVolumeDefinitionLabel,
  formatPeriodLabel,
} from '../../utils/metricCalculations';
import {
  formatLocalizedProfit,
} from '../../utils/currencyUtils';
import {
  TrendingUp,
  DollarSign,
  Info,
  BarChart3,
  Clock,
} from 'lucide-react';

interface QuarterlyPerformanceChartsProps {
  company: Company;
  observations: MetricObservation[];
  activePeriod: string;
  onSelectPeriod?: (period: string) => void;
  onSelectObservation?: (obs: MetricObservation) => void;
  scheduledDisclosure?: ScheduledDisclosure;
}

export const QuarterlyPerformanceCharts: React.FC<QuarterlyPerformanceChartsProps> = ({
  company,
  observations,
  activePeriod,
  onSelectPeriod,
  onSelectObservation,
  scheduledDisclosure,
}) => {
  const { language } = useLanguage();
  const [viewMode, setViewMode] = useState<'all' | 'deliveries' | 'operating_income' | 'operating_margin'>('all');

  // Strict quarterly sequence: 2026-Q1, 2026-Q2, 2026-Q3 (Never mix Annual FY with quarters)
  const quarterPeriods = ['2026-Q1', '2026-Q2', '2026-Q3'];

  // Helper to retrieve an observation for a given metric and quarter
  const getObs = (metricId: string, period: string): MetricObservation | undefined => {
    return observations.find((o) => o.metricId === metricId && o.period === period);
  };

  // Special handling for BYD Q3 (reports Net Profit under CASBE instead of Operating Income)
  const getProfitObs = (period: string): { obs: MetricObservation | undefined; isNetProfit: boolean } => {
    const op = getObs('operating_income', period);
    if (op) return { obs: op, isNetProfit: false };

    if (company.id === 'byd' && period === '2026-Q3') {
      const net = getObs('net_income', period);
      return { obs: net, isNetProfit: true };
    }
    return { obs: undefined, isNetProfit: false };
  };

  // Format volume in localized units (천 대 or 만 대 in Korean)
  const formatVolumeDisplay = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '-';
    if (language === 'ko') {
      if (val >= 100) {
        return `${(val / 10).toFixed(1)}만 대 (${val.toLocaleString()}천 대)`;
      }
      return `${val.toLocaleString()}천 대`;
    }
    return `${val.toLocaleString()}k units`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-md space-y-6">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {language === 'ko'
                ? `${company.name} 분기별 3대 핵심 실적 추이`
                : `${company.name} Quarterly Performance Suite`}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ko'
              ? '판매량(인도량), 영업이익(EBIT), 영업이익률(RoS)을 분기 단위로 명확히 분리하여 시각화합니다.'
              : 'Dedicated quarterly progression tracking sales volume, operating profit, and operating margin.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              viewMode === 'all'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'ko' ? '3대 지표 한눈에' : 'All 3 Charts'}
          </button>
          <button
            onClick={() => setViewMode('deliveries')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              viewMode === 'deliveries'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'ko' ? '판매량' : 'Volume'}
          </button>
          <button
            onClick={() => setViewMode('operating_income')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              viewMode === 'operating_income'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'ko' ? '영업이익' : 'Operating Profit'}
          </button>
          <button
            onClick={() => setViewMode('operating_margin')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              viewMode === 'operating_margin'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'ko' ? '영업이익률' : 'Margin'}
          </button>
        </div>
      </div>

      {/* Grid of the 3 Dedicated Charts */}
      <div
        className={`grid gap-6 ${
          viewMode === 'all' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
        }`}
      >
        {/* ======================================================== */}
        {/* CHART 1: QUARTERLY VEHICLE DELIVERIES / SALES VOLUME */}
        {/* ======================================================== */}
        {(viewMode === 'all' || viewMode === 'deliveries') && (
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {language === 'ko' ? '분기별 판매량 / 인도량' : 'Quarterly Deliveries / Sales'}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'ko' ? '글로벌 완성차 인도·출하 실적' : 'Worldwide unit delivery volume'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume Definition Badge */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  {language === 'ko' ? '집계 기준:' : 'Definition:'}
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {getVolumeDefinitionLabel(getObs('deliveries_global', activePeriod)?.volumeDefinition, language).full}
                </span>
              </div>

              {/* Bars Progression */}
              <div className="mt-5 space-y-3">
                {quarterPeriods.map((period, idx) => {
                  const obs = getObs('deliveries_global', period);
                  const isScheduled = !obs && period === '2026-Q3' && scheduledDisclosure;
                  const prevObs = idx > 0 ? getObs('deliveries_global', quarterPeriods[idx - 1]) : undefined;
                  const qoq = obs?.value && prevObs?.value ? ((obs.value - prevObs.value) / prevObs.value) * 100 : null;
                  const isCurrentActive = period === activePeriod;

                  // Max scale calculation for bars
                  const allVals = quarterPeriods
                    .map((p) => getObs('deliveries_global', p)?.value)
                    .filter((v): v is number => typeof v === 'number');
                  const maxVolume = allVals.length > 0 ? Math.max(...allVals) * 1.15 : 1000;
                  const barWidthPct = obs?.value ? Math.min(100, Math.max(12, (obs.value / maxVolume) * 100)) : 0;

                  return (
                    <div
                      key={period}
                      onClick={() => {
                        if (obs && onSelectObservation) onSelectObservation(obs);
                        if (onSelectPeriod) onSelectPeriod(period);
                      }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isCurrentActive
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatPeriodLabel(period, language)}
                          </span>
                          {isCurrentActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-semibold">
                              {language === 'ko' ? '선택됨' : 'Active'}
                            </span>
                          )}
                        </div>

                        {obs ? (
                          <div className="flex items-center gap-2">
                            {qoq !== null && (
                              <span
                                className={`text-[11px] font-mono font-semibold flex items-center ${
                                  qoq >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {qoq >= 0 ? `+${qoq.toFixed(1)}%` : `${qoq.toFixed(1)}%`}
                              </span>
                            )}
                            <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                              {formatVolumeDisplay(obs.value)}
                            </span>
                          </div>
                        ) : isScheduled ? (
                          <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3" />
                            {scheduledDisclosure.scheduledDateKo.split(' ')[0]} {language === 'ko' ? '공시 예정' : 'Scheduled'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {language === 'ko' ? '공시 없음' : 'Unreported'}
                          </span>
                        )}
                      </div>

                      {/* Bar Fill */}
                      {obs?.value ? (
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCurrentActive
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                : 'bg-gradient-to-r from-blue-400 to-blue-500 opacity-80'
                            }`}
                            style={{ width: `${barWidthPct}%` }}
                          />
                        </div>
                      ) : isScheduled ? (
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 border border-dashed border-amber-400/50" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation Footer Box */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold mb-1">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{language === 'ko' ? '판매량 지표 해설' : 'Volume Metric Guide'}</span>
              </div>
              <p>
                {language === 'ko'
                  ? '해당 분기 전 세계 고객에게 인도(소매)되거나 딜러망으로 출하(도매)된 완성차 총 대수입니다. 소매 인도와 도매 출하는 집계 시점이 다르므로 직접 비교 시 유의하세요.'
                  : 'Total vehicles delivered to retail end customers or shipped wholesale to dealers during the quarter.'}
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CHART 2: QUARTERLY OPERATING PROFIT (EBIT) */}
        {/* ======================================================== */}
        {(viewMode === 'all' || viewMode === 'operating_income') && (
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {language === 'ko' ? '분기별 영업이익 / EBIT' : 'Quarterly Operating Profit / EBIT'}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'ko'
                        ? `순수 본업 영업손익 (${company.reportingCurrency})`
                        : `Operating earnings (${company.reportingCurrency})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Functional Currency Badge */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  {language === 'ko' ? '공시 통화:' : 'Reporting Currency:'}
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {company.reportingCurrency} ({getCurrencySymbol(company.reportingCurrency)})
                </span>
              </div>

              {/* Profit Progression */}
              <div className="mt-5 space-y-3">
                {quarterPeriods.map((period) => {
                  const { obs, isNetProfit } = getProfitObs(period);
                  const isScheduled = !obs && period === '2026-Q3' && scheduledDisclosure;
                  const isCurrentActive = period === activePeriod;

                  const isLoss = obs?.value !== null && obs?.value !== undefined && obs.value < 0;

                  return (
                    <div
                      key={period}
                      onClick={() => {
                        if (obs && onSelectObservation) onSelectObservation(obs);
                        if (onSelectPeriod) onSelectPeriod(period);
                      }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isCurrentActive
                          ? isLoss
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 shadow-xs'
                            : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatPeriodLabel(period, language)}
                          </span>
                          {isNetProfit && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                              {language === 'ko' ? '당기순이익' : 'Net Profit'}
                            </span>
                          )}
                          {isCurrentActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-semibold">
                              {language === 'ko' ? '선택됨' : 'Active'}
                            </span>
                          )}
                        </div>

                        {obs?.value !== null && obs?.value !== undefined ? (
                          <div className="text-right">
                            <span
                              className={`font-mono font-extrabold text-sm block ${
                                isLoss
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {formatLocalizedProfit(obs.value, obs.currency || company.reportingCurrency, language, {
                                showOriginal: true,
                              })}
                            </span>
                          </div>
                        ) : isScheduled ? (
                          <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3" />
                            {scheduledDisclosure.scheduledDateKo.split(' ')[0]} {language === 'ko' ? '공시 예정' : 'Scheduled'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {language === 'ko' ? '미공시' : 'Not reported'}
                          </span>
                        )}
                      </div>

                      {/* Status / Label note */}
                      {obs && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                          <span className="truncate max-w-[200px]">
                            {obs.originalLabel || (isNetProfit ? 'Net profit attributable' : 'Operating profit')}
                          </span>
                          <span className="font-mono font-semibold">
                            {isLoss ? (language === 'ko' ? '⚠️ 영업적자' : '⚠️ Operating Deficit') : (language === 'ko' ? '✅ 영업흑자' : '✅ Profitable')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation Footer Box */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold mb-1">
                <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{language === 'ko' ? '영업이익 지표 해설' : 'Operating Profit Guide'}</span>
              </div>
              <p>
                {language === 'ko'
                  ? '자동차 제조 및 모빌리티 본업에서 창출한 순수 영업손익(EBIT)입니다. 일회성 비용(포르쉐 지분 손상차손, 보증 충당금 등)이 반영될 수 있습니다.'
                  : 'Measures underlying operating earnings (EBIT) before tax and interest. Includes restructuring or impairment charges where officially recognized.'}
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CHART 3: QUARTERLY OPERATING MARGIN (RoS %) */}
        {/* ======================================================== */}
        {(viewMode === 'all' || viewMode === 'operating_margin') && (
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {language === 'ko' ? '분기별 영업이익률 (RoS)' : 'Quarterly Operating Margin (RoS)'}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'ko' ? '매출액 대비 영업이익 비율 (%)' : 'Operating profit / Revenue ratio (%)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benchmark Reference Tag */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  {language === 'ko' ? '글로벌 업계 기준선:' : 'Industry Benchmark:'}
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  ~6.0% (Median)
                </span>
              </div>

              {/* Margin Progression */}
              <div className="mt-5 space-y-3">
                {quarterPeriods.map((period) => {
                  let obs = getObs('operating_margin', period);

                  // If BYD Q3, calculate net margin from net_income / revenue
                  let isNetMargin = false;
                  if (!obs && company.id === 'byd' && period === '2026-Q3') {
                    const rev = getObs('revenue', period)?.value;
                    const net = getObs('net_income', period)?.value;
                    if (rev && net) {
                      obs = {
                        id: 'byd_2026_q3_derived_net_margin',
                        companyId: 'byd',
                        metricId: 'net_margin',
                        period: '2026-Q3',
                        periodType: 'quarterly',
                        calendarYear: 2026,
                        value: Number(((net / rev) * 100).toFixed(1)),
                        unit: 'percentage',
                        currency: 'RMB',
                        valueType: 'derived',
                        verificationStatus: 'verified',
                        verificationMethod: 'derived_calculation',
                        isComparable: true,
                        originalLabel: 'Net Profit Margin (归母净利率)',
                      };
                      isNetMargin = true;
                    }
                  }

                  const isScheduled = !obs && period === '2026-Q3' && scheduledDisclosure;
                  const isCurrentActive = period === activePeriod;

                  const marginVal = obs?.value;
                  const isLoss = marginVal !== null && marginVal !== undefined && marginVal < 0;
                  const isHighProfit = marginVal !== null && marginVal !== undefined && marginVal >= 8.0;

                  return (
                    <div
                      key={period}
                      onClick={() => {
                        if (obs && onSelectObservation) onSelectObservation(obs);
                        if (onSelectPeriod) onSelectPeriod(period);
                      }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isCurrentActive
                          ? isLoss
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 shadow-xs'
                            : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatPeriodLabel(period, language)}
                          </span>
                          {isNetMargin && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                              {language === 'ko' ? '순이익률' : 'Net Margin'}
                            </span>
                          )}
                          {isCurrentActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-600 text-white font-semibold">
                              {language === 'ko' ? '선택됨' : 'Active'}
                            </span>
                          )}
                        </div>

                        {marginVal !== null && marginVal !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                isLoss
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                                  : isHighProfit
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                              }`}
                            >
                              {isLoss
                                ? language === 'ko' ? '적자' : 'Deficit'
                                : isHighProfit
                                ? language === 'ko' ? '고수익' : 'Top Tier'
                                : language === 'ko' ? '양호' : 'Solid'}
                            </span>
                            <span
                              className={`font-mono font-extrabold text-sm ${
                                isLoss
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isHighProfit
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {formatMetricValue(marginVal, 'percentage')}
                            </span>
                          </div>
                        ) : isScheduled ? (
                          <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3" />
                            {scheduledDisclosure.scheduledDateKo.split(' ')[0]} {language === 'ko' ? '공시 예정' : 'Scheduled'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {language === 'ko' ? '미산출' : 'N/A'}
                          </span>
                        )}
                      </div>

                      {/* Margin Progress Bar */}
                      {marginVal !== null && marginVal !== undefined ? (
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden relative">
                          {/* 6% benchmark marker line */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
                            style={{ left: `${(6.0 / 15) * 100}%` }}
                            title="Industry Benchmark (6.0%)"
                          />
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLoss
                                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                                : isHighProfit
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                                : 'bg-gradient-to-r from-amber-400 to-amber-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(10, (Math.abs(marginVal) / 15) * 100))}%`,
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation Footer Box */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold mb-1">
                <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{language === 'ko' ? '영업이익률 지표 해설' : 'Operating Margin Guide'}</span>
              </div>
              <p>
                {language === 'ko'
                  ? '매출액 대비 영업이익의 비율(Return on Sales)로 완성차 제조사의 가격 결정력, 모델 믹스(고수익 SUV·하이브리드 비중), 원가 통제 경쟁력을 나타냅니다.'
                  : 'Measures operating profitability as a percentage of consolidated sales revenue. Reflects pricing power, product mix, and production cost discipline.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
