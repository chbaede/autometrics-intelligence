import React, { useState } from 'react';
import {
  getAllCompanies,
  getAllMetrics,
  getObservations,
  getCompanyById,
  getMetricById,
  getDistinctPeriods,
} from '../utils/metricQueries';
import { MetricObservation } from '../types/metrics';
import { MetricBarChart } from '../components/metrics/charts/MetricBarChart';
import { MetricLineChart } from '../components/metrics/charts/MetricLineChart';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { GoogleAdBanner } from '../components/common/GoogleAdBanner';
import { useLanguage } from '../i18n/LanguageContext';
import { formatMetricValue, formatPeriodLabel } from '../utils/metricCalculations';
import {
  BarChart2,
  AlertTriangle,
  Check,
  Filter,
  Layers,
} from 'lucide-react';

export const CompanyComparisonPage: React.FC = () => {
  const { language } = useLanguage();
  const allCompanies = getAllCompanies();
  const allMetrics = getAllMetrics().filter(
    (m) => m.category === 'sales' || m.category === 'financial' || m.category === 'electrification'
  );
  const periods = getDistinctPeriods();

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([
    'mercedes_benz',
    'bmw_group',
    'volkswagen_group',
    'hyundai_motor',
    'toyota_motor',
    'tesla',
  ]);
  const [selectedMetricId, setSelectedMetricId] = useState<string>('deliveries_global');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0] || '2026-Q2');
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  const toggleCompany = (companyId: string) => {
    if (selectedCompanies.includes(companyId)) {
      if (selectedCompanies.length > 2) {
        setSelectedCompanies(selectedCompanies.filter((id) => id !== companyId));
      }
    } else {
      if (selectedCompanies.length < 8) {
        setSelectedCompanies([...selectedCompanies, companyId]);
      }
    }
  };

  const selectedMetricDef = getMetricById(selectedMetricId);

  // Get observations for Bar Chart
  const observations = getObservations(selectedCompanies, [selectedMetricId], selectedPeriod)
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((item) => item.company);

  // Check if there are non-comparable items
  const nonComparableItems = observations.filter((item) => !item.observation.isComparable);

  // Multi-Company Line Series
  const lineChartColors = ['#0c93e7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#a855f7'];
  const trendPeriods = periods.slice(0, 5).reverse();

  const lineSeries = selectedCompanies.slice(0, 5).map((cid, idx) => {
    const comp = getCompanyById(cid)!;
    const data = trendPeriods.map((p) => {
      const obs = getObservations([cid], [selectedMetricId], p)[0];
      return {
        period: p,
        value: obs ? obs.value : null,
        observation: obs,
      };
    });
    return {
      company: comp,
      data,
      color: lineChartColors[idx % lineChartColors.length],
    };
  });

  // Cross-metric summary table items
  const metricsToCompare = ['deliveries_global', 'bev_share', 'revenue', 'operating_margin'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <BarChart2 className="w-4 h-4" /> {language === 'ko' ? '글로벌 OEM 정량 실적 비교 엔진' : 'Multi-OEM Quantitative Comparison Engine'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '글로벌 완성차 다자간 실적 비교 벤치마크' : 'Cross-Company OEM Benchmark'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '2개에서 최대 8개 완성차 기업을 선택하여 판매량, 순수전기차 비중, 매출액, 영업이익률을 다각도로 비교 분석합니다. 회계 기준 차이에 따른 비교 한계 경고를 명확히 표시합니다.'
            : 'Compare between 2 and 8 global automakers side-by-side. View reported volumes, electric vehicle mix, operating margins, and accounting provenance with strict comparability warnings.'}
        </p>
      </div>

      {/* Comparison Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-5 shadow-md">
        {/* 1. Company Multi-Select (2-8) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              {language === 'ko' ? '비교 대상 기업 선택' : 'Select Automakers'} ({selectedCompanies.length} / 8)
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {language === 'ko' ? '2 ~ 8개 기업 선택' : '2 ~ 8 OEMs'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allCompanies.map((c) => {
              const isSelected = selectedCompanies.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCompany(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/50 shadow-xs font-bold'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />}
                  <span>{c.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({c.hqCountry})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Metric & Period Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              {language === 'ko' ? '비교 지표 선택' : 'Comparison Metric'}
            </label>
            <select
              value={selectedMetricId}
              onChange={(e) => setSelectedMetricId(e.target.value)}
              aria-label="Select comparison metric"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-brand-500"
            >
              {allMetrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              {language === 'ko' ? '공시 기준 기간' : 'Reporting Period'}
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              aria-label="Select reporting period"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-brand-500 font-mono"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p, language)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparability Warning Banner */}
      {nonComparableItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Comparability Notice for {selectedMetricDef?.name}</span>
          </div>
          <p className="text-xs leading-relaxed">
            Certain selected companies report metrics under differing regulatory definitions or accounting scopes:
          </p>
          <ul className="list-disc list-inside text-xs text-amber-700/90 dark:text-amber-200/90 pl-1 space-y-0.5">
            {nonComparableItems.map((item) => (
              <li key={item.company.id}>
                <strong>{item.company.name}:</strong> {item.observation.nonComparableReason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Comparative Bar Chart */}
      <MetricBarChart
        title={`${selectedMetricDef?.name || 'Metric Comparison'} (${selectedPeriod})`}
        subtitle={`Comparing ${selectedCompanies.length} selected global automakers`}
        observations={observations}
        unit={selectedMetricDef?.unit || 'units'}
        onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
      />

      {/* Historical Multi-Quarter Trend Line Chart */}
      <MetricLineChart
        title={`${selectedMetricDef?.name || 'Trend Comparison'} — Historical Trajectory`}
        subtitle="Cross-quarter multi-period comparison for top selected OEMs"
        series={lineSeries}
        unit={selectedMetricDef?.unit || 'units'}
        onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
      />

      {/* Google AdSense Sponsored Display Unit */}
      <div className="w-full">
        <GoogleAdBanner slot="9426228178" client="ca-pub-6854824605420161" />
      </div>

      {/* Multi-Metric Side-by-Side Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-md">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            {language === 'ko' ? '다변수 비교 매트릭스 테이블' : 'Side-by-Side Multi-Metric Matrix'} ({selectedPeriod})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comprehensive side-by-side view across sales, electrification, and operating profitability
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">{language === 'ko' ? '비교 지표' : 'Metric'}</th>
                {selectedCompanies.map((cid) => {
                  const comp = getCompanyById(cid);
                  return (
                    <th key={cid} className="px-4 py-3 text-right font-bold">
                      {comp?.shortName || cid}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
              {metricsToCompare.map((mId) => {
                const metricDef = getMetricById(mId);
                return (
                  <tr key={mId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      <div>{metricDef?.name}</div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {metricDef?.unit.replace('_', ' ')}
                      </span>
                    </td>
                    {selectedCompanies.map((cid) => {
                      const obs = getObservations([cid], [mId], selectedPeriod)[0];
                      const comp = getCompanyById(cid);
                      return (
                        <td
                          key={cid}
                          onClick={() => obs && setActiveProvenanceObs(obs)}
                          className="px-4 py-3 text-right font-mono text-slate-900 dark:text-slate-100 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400"
                        >
                          {obs ? (
                            <span className="font-bold">
                              {formatMetricValue(obs.value, obs.unit, obs.currency || comp?.reportingCurrency)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">N/R</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provenance Audit Modal */}
      {activeProvenanceObs && (
        <ProvenanceModal
          observation={activeProvenanceObs}
          metric={getMetricById(activeProvenanceObs.metricId)}
          company={getCompanyById(activeProvenanceObs.companyId)}
          onClose={() => setActiveProvenanceObs(null)}
        />
      )}
    </div>
  );
};
