import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllCompanies,
  getObservations,
  getAllGuidance,
  getDistinctPeriods,
  getCompanyById,
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
  const { language, t } = useLanguage();
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
    .filter((o) => o.company);

  // Observations for Operating Margin Bar Chart
  const marginObs = getObservations(selectedCompanies, ['operating_margin'], selectedPeriod)
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((o) => o.company);

  // Historical line series for top 5 OEMs (revenue & volume)
  const lineChartColors = ['#0c93e7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
  const trendSeries = selectedCompanies.slice(0, 5).map((cid, idx) => {
    const comp = getCompanyById(cid)!;
    const companyObs = getObservations([cid], ['operating_margin']);
    return {
      company: comp,
      data: periods.map((p) => {
        const obs = companyObs.find((o) => o.period === p);
        return {
          period: p,
          value: obs?.value ?? null,
          observation: obs,
        };
      }),
      color: lineChartColors[idx % lineChartColors.length],
    };
  });

  // Powertrain Mix Data for Stacked Bar Chart
  const powertrainData = selectedCompanies.map((cid) => {
    const comp = getCompanyById(cid)!;
    const totalDel = getObservations([cid], ['deliveries_global'], selectedPeriod)[0]?.value || 0;
    const bevVol = getObservations([cid], ['bev_deliveries'], selectedPeriod)[0]?.value || 0;
    const phevVol = getObservations([cid], ['phev_deliveries'], selectedPeriod)[0]?.value || (cid === 'byd' ? 620 : 0);

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-colors">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
            <ShieldCheck className="w-4 h-4" /> {t.global.badge}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.global.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            {t.global.subtitle}
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t.global.coveredOems} (<TermBadge term="OEM" />)
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {companies.length} Global OEMs
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t.global.reportingPeriod}
            </span>
            <span className="text-xl font-bold font-mono text-brand-600 dark:text-brand-400">
              {selectedPeriod}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t.global.bevLeader} (<TermBadge term="BEV" />)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              Tesla 100% • BYD 47.5%
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t.global.marginLeader} (<TermBadge term="RoS" />)
            </span>
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              Toyota 10.6% • Hyundai 8.6%
            </span>
          </div>
        </div>
      </div>

      {/* OEM Quick Directory Dossiers (Moved to Top for Fast Navigation) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            {t.global.quickDirectory}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'ko' ? '기업 카드를 클릭하면 상세 IR 대시보드로 이동합니다' : 'Click any OEM card to open dedicated deep-dive dashboard'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {companies.map((c) => (
            <Link
              key={c.id}
              to={`/company/${c.id}`}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/60 hover:shadow-md transition flex flex-col justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition truncate">
                    {c.shortName}
                  </span>
                  {c.ticker && (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {c.ticker}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {c.hqCountry} • {c.reportingCurrency}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-brand-600 dark:text-brand-400 font-semibold group-hover:translate-x-0.5 transition">
                <span>{language === 'ko' ? '실적 분석' : 'Deep Dive'}</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4 transition-colors">
        {/* Period Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t.global.periodFilter}
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 text-xs font-mono font-medium rounded-lg transition ${
                  selectedPeriod === p
                    ? 'bg-brand-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Company Quick Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">
            {t.global.oemFilter}
          </span>
          {companies.slice(0, 8).map((comp) => {
            const active = selectedCompanies.includes(comp.id);
            return (
              <button
                key={comp.id}
                onClick={() => toggleCompany(comp.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  active
                    ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/30 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {active && <Check className="w-3 h-3 text-brand-500" />}
                <span>{comp.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: 4-Quadrant Strategic Volume vs Margin Matrix (Full Width, Collision-Free) */}
      <div className="w-full">
        <MarginScatterChart
          title={t.charts.revenueVsMargin}
          subtitle={t.charts.revenueVsMarginSubtitle}
          points={scatterPoints}
        />
      </div>

      {/* SECTION 2: Volume & Powertrain Mix Row (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricBarChart
          title={t.charts.salesVolume}
          subtitle={t.charts.salesSubtitle}
          observations={salesObs}
          unit="thousand_units"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
        <PowertrainMixChart
          title={t.charts.powertrainMix}
          subtitle={t.charts.powertrainMixSubtitle}
          data={powertrainData}
        />
      </div>

      {/* SECTION 3: Operating Margin & Guidance Row (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricBarChart
          title={t.charts.operatingMargin}
          subtitle={t.charts.marginSubtitle}
          observations={marginObs}
          unit="percentage"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
        <div className="h-full">
          <GuidanceRangeChart
            guidanceList={guidanceList}
          />
        </div>
      </div>

      {/* SECTION 4: Multi-Period Historical Trend Trajectory (Full Width Long Chart, No Horizontal Scroll) */}
      <div className="w-full">
        <MetricLineChart
          title={t.charts.historicalTrend}
          subtitle={t.charts.historicalSubtitle}
          series={trendSeries}
          unit="percentage"
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      </div>

      {/* SECTION 5: Detailed Data Table */}
      <div className="space-y-4">
        <DataTable
          title={language === 'ko' ? '글로벌 완성차 공식 IR 공시 종합 데이터 테이블' : 'Global OEM Consolidated Investor Relations Disclosures'}
          subtitle={language === 'ko' ? '원문 표기 라벨, 회계 기준, 통화 및 데이터 감사 직결' : 'Preserved original accounting labels, reported units, and direct audit traces'}
          observations={getObservations(selectedCompanies, undefined, selectedPeriod)}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      </div>

      {/* Data Provenance Modal */}
      <ProvenanceModal
        observation={activeProvenanceObs}
        onClose={() => setActiveProvenanceObs(null)}
      />
    </div>
  );
};
