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
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { formatMetricValue } from '../utils/metricCalculations';
import {
  BarChart2,
  AlertTriangle,
  Check,
  Filter,
  Layers,
} from 'lucide-react';

export const CompanyComparisonPage: React.FC = () => {
  const allCompanies = getAllCompanies();
  const allMetrics = getAllMetrics().filter(
    (m) => m.category === 'sales' || m.category === 'financial' || m.category === 'electrification'
  );
  const periods = getDistinctPeriods();

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([
    'volkswagen_group',
    'toyota_motor',
    'tesla',
    'byd',
    'hyundai_motor',
    'bmw_group',
  ]);
  const [selectedMetricId, setSelectedMetricId] = useState<string>('deliveries_global');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2024-FY');
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

  // Get observations
  const observations = getObservations(selectedCompanies, [selectedMetricId], selectedPeriod)
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((item) => item.company);

  // Check if there are non-comparable items
  const nonComparableItems = observations.filter((item) => !item.observation.isComparable);

  // Cross-metric summary table items
  const metricsToCompare = ['deliveries_global', 'bev_share', 'revenue', 'operating_margin'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <BarChart2 className="w-4 h-4" /> Multi-OEM Quantitative Comparison Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Cross-Company OEM Benchmark
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          Compare between 2 and 8 global automakers side-by-side. View reported volumes, electric vehicle mix, operating margins, and accounting provenance with strict comparability warnings.
        </p>
      </div>

      {/* Comparison Controls */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-5">
        {/* 1. Company Multi-Select (2-8) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-brand-400" />
              Select Automakers ({selectedCompanies.length} / 8 selected)
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Choose 2 to 8 OEMs for cross-comparison
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allCompanies.map((c) => {
              const isSelected = selectedCompanies.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCompany(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand-600/20 text-brand-300 border-brand-500/50 shadow-xs'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-400" />}
                  <span>{c.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({c.hqCountry})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Metric & Period Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Comparison Metric
            </label>
            <select
              value={selectedMetricId}
              onChange={(e) => setSelectedMetricId(e.target.value)}
              aria-label="Select comparison metric"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              {allMetrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Reporting Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              aria-label="Select reporting period"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparability Warning Banner if needed */}
      {nonComparableItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Comparability Notice for {selectedMetricDef?.name}</span>
          </div>
          <p className="text-xs leading-relaxed">
            Certain selected companies report metrics under differing regulatory definitions or accounting scopes:
          </p>
          <ul className="list-disc list-inside text-xs text-amber-200/90 pl-1 space-y-0.5">
            {nonComparableItems.map((item) => (
              <li key={item.company.id}>
                <strong>{item.company.name}:</strong> {item.observation.nonComparableReason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Comparative Chart */}
      <MetricBarChart
        title={`${selectedMetricDef?.name || 'Metric Comparison'} (${selectedPeriod})`}
        subtitle={`Comparing ${selectedCompanies.length} selected global automakers`}
        observations={observations}
        unit={selectedMetricDef?.unit || 'units'}
        onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
      />

      {/* Multi-Metric Side-by-Side Matrix Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-400" />
              Side-by-Side Multi-Metric Matrix ({selectedPeriod})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive side-by-side view across sales, electrification, and operating profitability
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Metric</th>
                {selectedCompanies.map((cid) => {
                  const comp = getCompanyById(cid);
                  return (
                    <th key={cid} className="px-4 py-3 text-right">
                      {comp?.shortName || cid}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {metricsToCompare.map((mId) => {
                const metricDef = getMetricById(mId);
                return (
                  <tr key={mId} className="hover:bg-slate-850/40">
                    <td className="px-4 py-3 font-semibold text-slate-200">
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
                          className="px-4 py-3 text-right font-mono text-slate-100 cursor-pointer hover:text-brand-400"
                        >
                          {obs ? (
                            <span className="font-bold">
                              {formatMetricValue(obs.value, obs.unit, obs.currency || comp?.reportingCurrency)}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-normal">N/R</span>
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

