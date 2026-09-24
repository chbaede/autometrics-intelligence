import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllCompanies,
  getObservations,
  getAllGuidance,
  getDistinctPeriods,
  getCompanyById,
  getMetricById,
} from '../utils/metricQueries';
import { MetricObservation } from '../types/metrics';
import { MetricBarChart } from '../components/metrics/charts/MetricBarChart';
import { GuidanceRangeChart } from '../components/metrics/charts/GuidanceRangeChart';
import { DataTable } from '../components/metrics/DataTable';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  Check,
  ExternalLink,
} from 'lucide-react';

export const GlobalOverviewPage: React.FC = () => {
  const companies = getAllCompanies();
  const periods = getDistinctPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2024-FY');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    companies.slice(0, 8).map((c) => c.id)
  );
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  // Toggle company filter
  const toggleCompany = (companyId: string) => {
    if (selectedCompanies.includes(companyId)) {
      if (selectedCompanies.length > 2) {
        setSelectedCompanies(selectedCompanies.filter((id) => id !== companyId));
      }
    } else {
      setSelectedCompanies([...selectedCompanies, companyId]);
    }
  };

  // Observations for Sales
  const salesObs = getObservations(selectedCompanies, ['deliveries_global'], selectedPeriod)
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((item) => item.company);

  // Observations for Operating Margin
  const marginObs = getObservations(selectedCompanies, ['operating_margin'], selectedPeriod)
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((item) => item.company);

  // Observations for BEV Deliveries
  const bevObs = getObservations(selectedCompanies, ['bev_share'], selectedPeriod)
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((item) => item.company);

  // Guidance data
  const guidanceList = getAllGuidance().filter((g) => selectedCompanies.includes(g.companyId));

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & KPI Headline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
            <ShieldCheck className="w-4 h-4" /> Official IR Disclosures • Audit-Backed
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Global OEM Performance Intelligence
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Consolidated vehicle volume, electrification adoption, operating profit margins, and forward-looking guidance synthesized strictly from official quarterly filings and investor presentations.
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">OEMs Covered</span>
            <span className="text-xl font-bold font-mono text-slate-100">{companies.length} Global OEMs</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Reporting Period</span>
            <span className="text-xl font-bold font-mono text-brand-400">{selectedPeriod}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">BEV Share Leader</span>
            <span className="text-xl font-bold font-mono text-emerald-400">Tesla (100%) / BYD (41.3%)</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Top Operating Margin</span>
            <span className="text-xl font-bold font-mono text-amber-400">Toyota (11.9%)</span>
          </div>
        </div>
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Period:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition ${
                  selectedPeriod === p
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Company Quick Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> OEMs:
          </span>
          {companies.slice(0, 10).map((c) => {
            const isSelected = selectedCompanies.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCompany(c.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition flex items-center gap-1 ${
                  isSelected
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-brand-400" />}
                <span>{c.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Key Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Global Deliveries Bar Chart */}
        <MetricBarChart
          title={`Global Vehicle Deliveries (${selectedPeriod})`}
          subtitle="Customer deliveries and wholesale shipments (thousand units)"
          observations={salesObs}
          unit="thousand_units"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />

        {/* 2. Operating Margin Comparison */}
        <MetricBarChart
          title={`Operating Profit / EBIT Margin (${selectedPeriod})`}
          subtitle="Core operating profitability as percentage of sales revenue"
          observations={marginObs}
          unit="percentage"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />

        {/* 3. BEV Electrification Share */}
        <MetricBarChart
          title={`Battery Electric Vehicle (BEV) Delivery Share (${selectedPeriod})`}
          subtitle="Pure all-electric deliveries as % of total vehicle sales volume"
          observations={bevObs}
          unit="percentage"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />

        {/* 4. FY2025 Management Guidance Targets */}
        <GuidanceRangeChart
          guidanceList={guidanceList}
        />
      </div>

      {/* High-Density Comparative Data Table */}
      <DataTable
        title={`OEM Financial & Volume Dataset (${selectedPeriod})`}
        observations={salesObs}
        unit="thousand_units"
        onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
      />

      {/* Company Quick Directory Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-400" />
          Global OEM Intelligence Dossiers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {companies.slice(0, 10).map((c) => (
            <Link
              key={c.id}
              to={`/company/${c.id}`}
              className="p-4 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 hover:border-brand-500/40 transition flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {c.reportingCurrency}
                  </span>
                  <span className="text-xs text-slate-500">{c.hqCountry}</span>
                </div>
                <h3 className="font-bold text-slate-100 group-hover:text-brand-400 transition text-sm">
                  {c.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {c.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-brand-400 font-medium">
                <span>View Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
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

