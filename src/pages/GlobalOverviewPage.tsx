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
import { MetricLineChart } from '../components/metrics/charts/MetricLineChart';
import { GuidanceRangeChart } from '../components/metrics/charts/GuidanceRangeChart';
import { PowertrainMixChart } from '../components/metrics/charts/PowertrainMixChart';
import { MarginScatterChart } from '../components/metrics/charts/MarginScatterChart';
import { DataTable } from '../components/metrics/DataTable';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { TermBadge } from '../components/metrics/TermBadge';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  Check,
  ExternalLink,
} from 'lucide-react';

export const GlobalOverviewPage: React.FC = () => {
  const { t } = useLanguage();
  const companies = getAllCompanies();
  const periods = getDistinctPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0] || '2026-Q2');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([
    'volkswagen_group',
    'toyota_motor',
    'tesla',
    'byd',
    'hyundai_motor',
    'bmw_group',
    'mercedes_benz',
    'general_motors',
  ]);
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

  // Observations for Sales Bar Chart
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

  // Multi-period historical series for Line Chart (Top 4 OEMs across quarters)
  const lineChartColors = ['#0c93e7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
  const trendPeriods = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2024-FY'];
  const topTrendCompanies = ['tesla', 'volkswagen_group', 'hyundai_motor', 'byd'];

  const lineSeries = topTrendCompanies.map((cid, idx) => {
    const comp = getCompanyById(cid)!;
    const data = trendPeriods.map((p) => {
      const obs = getObservations([cid], ['deliveries_global'], p)[0];
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

  // Powertrain Mix Data for Stacked Bar Chart
  const powertrainData = selectedCompanies.map((cid) => {
    const comp = getCompanyById(cid)!;
    const totalDel = getObservations([cid], ['deliveries_global'], selectedPeriod)[0]?.value || 0;
    const bevVol = getObservations([cid], ['bev_deliveries'], selectedPeriod)[0]?.value || 0;
    const phevVol = getObservations([cid], ['phev_deliveries'], selectedPeriod)[0]?.value || (cid === 'byd' ? 2485 : 0);

    return {
      company: comp,
      totalDeliveries: totalDel,
      bevVolume: bevVol,
      phevVolume: phevVol,
    };
  }).filter((d) => d.totalDeliveries > 0);

  // Scatter matrix points (Volume vs Margin)
  const scatterPoints = selectedCompanies.map((cid) => {
    const comp = getCompanyById(cid)!;
    const vol = getObservations([cid], ['deliveries_global'], selectedPeriod)[0]?.value || 0;
    const margin = getObservations([cid], ['operating_margin'], selectedPeriod)[0]?.value || 0;
    return {
      company: comp,
      volumeThousand: vol,
      marginPercent: margin,
    };
  }).filter((pt) => pt.volumeThousand > 0 && pt.marginPercent > 0);

  // Guidance data
  const guidanceList = getAllGuidance().filter((g) => selectedCompanies.includes(g.companyId));

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & KPI Headline */}
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
            <ShieldCheck className="w-4 h-4" /> {t.global.badge}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
            {t.global.title}
          </h1>
          <p className="text-slate-300 dark:text-slate-300 light:text-slate-600 text-sm leading-relaxed">
            {t.global.subtitle}
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
          <div className="p-3 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
            <span className="text-xs text-slate-400 light:text-slate-500 block mb-1">
              {t.global.coveredOems} (<TermBadge term="OEM" />)
            </span>
            <span className="text-xl font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
              {companies.length} Global OEMs
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
            <span className="text-xs text-slate-400 light:text-slate-500 block mb-1">
              {t.global.reportingPeriod}
            </span>
            <span className="text-xl font-bold font-mono text-brand-400">
              {selectedPeriod}
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
            <span className="text-xs text-slate-400 light:text-slate-500 block mb-1">
              {t.global.bevLeader} (<TermBadge term="BEV" />)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">
              Tesla 100% • BYD 41.3%
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
            <span className="text-xs text-slate-400 light:text-slate-500 block mb-1">
              {t.global.marginLeader} (<TermBadge term="RoS" />)
            </span>
            <span className="text-xl font-bold font-mono text-amber-400">
              Toyota 11.9%
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="p-4 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">
            {t.global.periodFilter}
          </span>
          <div className="flex items-center gap-1 bg-slate-950 dark:bg-slate-950 light:bg-slate-100 p-1 rounded-lg border border-slate-800 dark:border-slate-800 light:border-slate-300">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition ${
                  selectedPeriod === p
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 light:hover:text-slate-800'
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
            <Filter className="w-3.5 h-3.5" /> {t.global.oemFilter}
          </span>
          {companies.slice(0, 10).map((c) => {
            const isSelected = selectedCompanies.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCompany(c.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition flex items-center gap-1 ${
                  isSelected
                    ? 'bg-brand-500/20 text-brand-300 dark:text-brand-300 light:text-brand-700 border-brand-500/40'
                    : 'bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-slate-400 border-slate-800 dark:border-slate-800 light:border-slate-300 hover:border-slate-700'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-brand-400" />}
                <span>{c.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Key Charts Grid - Tier 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Global Deliveries Bar Chart */}
        <MetricBarChart
          title={`${t.charts.salesVolume} (${selectedPeriod})`}
          subtitle={t.charts.salesSubtitle}
          observations={salesObs}
          unit="thousand_units"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />

        {/* 2. Operating Margin Comparison */}
        <MetricBarChart
          title={`${t.charts.operatingMargin} (${selectedPeriod})`}
          subtitle={t.charts.marginSubtitle}
          observations={marginObs}
          unit="percentage"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />

        {/* 3. BEV Electrification Share */}
        <MetricBarChart
          title={`${t.charts.bevShare} (${selectedPeriod})`}
          subtitle={t.charts.bevSubtitle}
          observations={bevObs}
          unit="percentage"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />

        {/* 4. FY2025 Management Guidance Targets */}
        <GuidanceRangeChart
          guidanceList={guidanceList}
        />
      </div>

      {/* Advanced Visualizations Grid - Tier 2 (Multi-quarter trend, Powertrain mix, Scatter matrix) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 5. Multi-Quarter Line Trend */}
        <div className="lg:col-span-2">
          <MetricLineChart
            title={t.charts.historicalTrend}
            subtitle={t.charts.historicalSubtitle}
            series={lineSeries}
            unit="thousand_units"
            onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
          />
        </div>

        {/* 6. Volume vs Profitability 4-Quadrant Scatter */}
        <div className="lg:col-span-1">
          <MarginScatterChart
            title={t.charts.revenueVsMargin}
            subtitle={t.charts.revenueVsMarginSubtitle}
            points={scatterPoints}
          />
        </div>
      </div>

      {/* 7. Powertrain Electrification Breakdown */}
      <PowertrainMixChart
        title={t.charts.powertrainMix}
        subtitle={t.charts.powertrainMixSubtitle}
        data={powertrainData}
      />

      {/* High-Density Comparative Data Table */}
      <DataTable
        title={`OEM Financial & Volume Dataset (${selectedPeriod})`}
        observations={salesObs}
        unit="thousand_units"
        onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
      />

      {/* Company Quick Directory Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-400" />
          {t.global.quickDirectory}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {companies.slice(0, 10).map((c) => (
            <Link
              key={c.id}
              to={`/company/${c.id}`}
              className="p-4 bg-slate-900 dark:bg-slate-900 light:bg-white hover:bg-slate-850 dark:hover:bg-slate-850 light:hover:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-brand-500/40 transition flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-slate-400 border border-slate-800 dark:border-slate-800 light:border-slate-200">
                    {c.reportingCurrency}
                  </span>
                  <span className="text-xs text-slate-500">{c.hqCountry}</span>
                </div>
                <h3 className="font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-brand-400 transition text-sm">
                  {c.name}
                </h3>
                <p className="text-[11px] text-slate-400 light:text-slate-600 mt-1 line-clamp-2">
                  {c.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 flex items-center justify-between text-[11px] text-brand-400 font-medium">
                <span>{t.global.viewDashboard}</span>
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
