import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getCompanyById,
  getAllCompanies,
  getObservationsByCompany,
  getMetricById,
  getSourceDocById,
} from '../utils/metricQueries';
import { MetricObservation } from '../types/metrics';
import { formatMetricValue, getCurrencySymbol } from '../utils/metricCalculations';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { SOURCE_DOCUMENTS } from '../data/sources';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Zap,
  Info,
  FileText,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

export const CompanyDashboardPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const allCompanies = getAllCompanies();
  const currentCompany = getCompanyById(companyId || 'volkswagen_group') || allCompanies[0];

  const [selectedMetricId, setSelectedMetricId] = useState<string>('deliveries_global');
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  const observations = getObservationsByCompany(currentCompany.id);
  const companySources = SOURCE_DOCUMENTS.filter((s) => s.companyId === currentCompany.id);

  // Filter observations by the selected metric
  const filteredObs = observations.filter((obs) => obs.metricId === selectedMetricId);
  const selectedMetricDef = getMetricById(selectedMetricId);

  // Key KPI values
  const latestDel = observations.find((o) => o.metricId === 'deliveries_global' && o.period === '2024-FY');
  const latestRev = observations.find((o) => o.metricId === 'revenue' && o.period === '2024-FY');
  const latestMargin = observations.find((o) => o.metricId === 'operating_margin' && o.period === '2024-FY');
  const latestBev = observations.find((o) => o.metricId === 'bev_share' && o.period === '2024-FY');

  const availableMetrics = [
    { id: 'deliveries_global', label: 'Vehicle Deliveries', icon: TrendingUp },
    { id: 'revenue', label: 'Consolidated Revenue', icon: DollarSign },
    { id: 'operating_income', label: 'Operating Income / EBIT', icon: DollarSign },
    { id: 'operating_margin', label: 'Operating Margin', icon: TrendingUp },
    { id: 'bev_deliveries', label: 'BEV Deliveries', icon: Zap },
    { id: 'free_cash_flow_automotive', label: 'Automotive FCF', icon: DollarSign },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Back and Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Global Overview</span>
        </Link>

        {/* Company Quick Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Switch OEM:</span>
          <select
            value={currentCompany.id}
            onChange={(e) => navigate(`/company/${e.target.value}`)}
            aria-label="Select OEM"
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500 font-medium"
          >
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.hqCountry})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* OEM Header Dossier Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {currentCompany.name}
              </h1>
              {currentCompany.ticker && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-800 text-brand-300 border border-slate-700">
                  {currentCompany.ticker}
                </span>
              )}
            </div>
            {currentCompany.nativeName && (
              <p className="text-xs text-slate-400 font-mono">{currentCompany.nativeName}</p>
            )}
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              {currentCompany.description}
            </p>
          </div>

          {/* Quick Links / Official Portal */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <a
              href={currentCompany.irUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 rounded-lg transition"
            >
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Official IR Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={currentCompany.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Corporate Website</span>
            </a>
          </div>
        </div>

        {/* Corporate Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80 text-xs font-mono">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Headquarters</span>
            <span className="text-slate-200 font-bold">{currentCompany.hqCity}, {currentCompany.hqCountry}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Reporting Currency</span>
            <span className="text-slate-200 font-bold">{currentCompany.reportingCurrency} ({getCurrencySymbol(currentCompany.reportingCurrency)})</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Stock Exchange</span>
            <span className="text-slate-200 font-bold">{currentCompany.stockExchange || 'Public OEM'}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Fiscal Year End</span>
            <span className="text-slate-200 font-bold">{currentCompany.fiscalYearEnd}</span>
          </div>
        </div>
      </div>

      {/* Key Annual Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div
          onClick={() => latestDel && setActiveProvenanceObs(latestDel)}
          className="p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">FY2024 Sales / Deliveries</span>
            <TrendingUp className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 group-hover:text-brand-400 transition">
            {formatMetricValue(latestDel?.value, 'thousand_units')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{latestDel?.originalLabel || 'Deliveries to customers'}</span>
          </div>
        </div>

        {/* Revenue */}
        <div
          onClick={() => latestRev && setActiveProvenanceObs(latestRev)}
          className="p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">FY2024 Consolidated Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 group-hover:text-emerald-400 transition">
            {formatMetricValue(latestRev?.value, 'currency_millions', currentCompany.reportingCurrency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Functional: {currentCompany.reportingCurrency}
          </div>
        </div>

        {/* Operating Margin */}
        <div
          onClick={() => latestMargin && setActiveProvenanceObs(latestMargin)}
          className="p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">FY2024 Operating Margin</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 group-hover:text-amber-400 transition">
            {formatMetricValue(latestMargin?.value, 'percentage')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Operating EBIT / Revenue
          </div>
        </div>

        {/* BEV Share */}
        <div
          onClick={() => latestBev && setActiveProvenanceObs(latestBev)}
          className="p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">BEV Electrification Share</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 group-hover:text-emerald-400 transition">
            {formatMetricValue(latestBev?.value, 'percentage')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pure All-Electric Penetration
          </div>
        </div>
      </div>

      {/* Dynamic Metric Explorer */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Historical Trend Explorer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a financial or volume metric to inspect reported observations across quarters & years
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableMetrics.map((m) => {
              const isSelected = selectedMetricId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMetricId(m.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-500 shadow-xs'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Observations Table for this company & metric */}
        {filteredObs.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Reporting Period</th>
                  <th className="px-4 py-3">Original Label in IR</th>
                  <th className="px-4 py-3 text-right">Reported Value</th>
                  <th className="px-4 py-3">Accounting Type</th>
                  <th className="px-4 py-3">Source Citation</th>
                  <th className="px-4 py-3 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredObs.map((obs) => {
                  const src = obs.sourceDocId ? getSourceDocById(obs.sourceDocId) : undefined;
                  return (
                    <tr
                      key={obs.id}
                      onClick={() => setActiveProvenanceObs(obs)}
                      className="hover:bg-slate-850/60 transition cursor-pointer group"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">
                        {obs.period}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                        {obs.originalLabel || selectedMetricDef?.name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-brand-400 text-sm">
                        {formatMetricValue(obs.value, obs.unit, obs.currency || currentCompany.reportingCurrency)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                        {obs.valueType}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[200px]">
                        {src?.title || 'Official IR Filing'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[11px] text-brand-400 group-hover:underline flex items-center justify-center gap-1">
                          Why? <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs">
            No specific historical observations logged for {selectedMetricDef?.name} in this reporting series.
          </div>
        )}

        {/* Metric Definition & Comparability Box */}
        {selectedMetricDef && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Info className="w-4 h-4 text-brand-400" />
              <span>Standard Definition & Normalization Notes for {selectedMetricDef.name}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {selectedMetricDef.description}
            </p>
            <p className="text-slate-400 leading-relaxed font-mono text-[11px] pt-1 border-t border-slate-900">
              <strong className="text-slate-300">Comparability Note:</strong> {selectedMetricDef.comparabilityNotes}
            </p>
          </div>
        )}
      </div>

      {/* Official IR Source Documents Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" />
              Official Investor Relations Documents & Filings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct official primary publications referenced by AutoMetrics for {currentCompany.name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {companySources.map((doc) => (
            <div
              key={doc.id}
              className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {doc.period} • {doc.docType.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {doc.publicationDate}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-200 text-xs sm:text-sm">
                  {doc.title}
                </h3>
                {doc.notes && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {doc.notes}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Official IR
                </span>
                <a
                  href={doc.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 rounded border border-brand-500/20 transition"
                >
                  <span>Open PDF / Release</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provenance Audit Modal */}
      {activeProvenanceObs && (
        <ProvenanceModal
          observation={activeProvenanceObs}
          metric={getMetricById(activeProvenanceObs.metricId)}
          company={currentCompany}
          onClose={() => setActiveProvenanceObs(null)}
        />
      )}
    </div>
  );
};

