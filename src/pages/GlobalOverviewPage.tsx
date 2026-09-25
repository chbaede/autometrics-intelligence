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
import { formatPeriodLabel } from '../utils/metricCalculations';
import { MetricBarChart } from '../components/metrics/charts/MetricBarChart';
import { MetricLineChart } from '../components/metrics/charts/MetricLineChart';
import { GuidanceRangeChart } from '../components/metrics/charts/GuidanceRangeChart';
import { PowertrainMixChart } from '../components/metrics/charts/PowertrainMixChart';
import { MarginScatterChart } from '../components/metrics/charts/MarginScatterChart';
import { DataTable } from '../components/metrics/DataTable';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { GoogleAdBanner } from '../components/common/GoogleAdBanner';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  Check,
  ExternalLink,
  TableProperties,
} from 'lucide-react';

export const GlobalOverviewPage: React.FC = () => {
  const { language, t } = useLanguage();
  const companies = getAllCompanies();
  const periods = getDistinctPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0] || '2026-Q2');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([
    'mercedes_benz',
    'bmw_group',
    'volkswagen_group',
    'hyundai_motor',
    'toyota_motor',
    'tesla',
    'byd',
    'general_motors',
    'stellantis',
    'ford',
  ]);
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);
  const [showInlineTable, setShowInlineTable] = useState<boolean>(false);

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

  // Observations for Sales Bar Chart (ranked descending)
  const salesObs = getObservations(selectedCompanies, ['deliveries_global'], selectedPeriod)
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((o) => o.company)
    .sort((a, b) => (b.observation.value ?? -Infinity) - (a.observation.value ?? -Infinity));

  // Observations for Operating Margin Bar Chart (ranked descending)
  const marginObs = getObservations(selectedCompanies, ['operating_margin'], selectedPeriod)
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((o) => o.company)
    .sort((a, b) => (b.observation.value ?? -Infinity) - (a.observation.value ?? -Infinity));

  // OEM distinct brand colors helper for line chart
  const getOemColor = (compName: string, idx: number) => {
    const n = compName.toLowerCase();
    if (n.includes('toyota')) return '#dc2626';
    if (n.includes('tesla')) return '#e11d48';
    if (n.includes('byd')) return '#2563eb';
    if (n.includes('volkswagen')) return '#0284c7';
    if (n.includes('hyundai')) return '#0369a1';
    if (n.includes('bmw')) return '#0891b2';
    if (n.includes('mercedes')) return '#0d9488';
    if (n.includes('gm') || n.includes('general')) return '#4f46e5';
    if (n.includes('stellantis')) return '#7c3aed';
    if (n.includes('ford')) return '#1d4ed8';
    const palette = ['#0c93e7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    return palette[idx % palette.length];
  };

  // Historical line series for ALL selected OEMs
  const trendSeries = selectedCompanies.map((cid, idx) => {
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
      color: getOemColor(comp?.name || cid, idx),
    };
  });

  // Powertrain Mix Data for Stacked Bar Chart
  const powertrainData = selectedCompanies.map((cid) => {
    const comp = getCompanyById(cid)!;
    const totalDel = getObservations([cid], ['deliveries_global'], selectedPeriod)[0]?.value || 0;
    const bevVol = getObservations([cid], ['bev_deliveries'], selectedPeriod)[0]?.value || 0;
    const phevVol = getObservations([cid], ['phev_deliveries'], selectedPeriod)[0]?.value || (cid === 'byd' ? 620 : 0);
    const phevReported = cid === 'byd';

    return {
      company: comp,
      totalDeliveries: totalDel,
      bevVolume: bevVol,
      phevVolume: phevVol,
      phevReported,
    };
  }).filter((d) => d.totalDeliveries > 0);

  // Scatter matrix points (Volume vs Margin vs Profit)
  const scatterPoints = selectedCompanies.map((cid) => {
    const comp = getCompanyById(cid)!;
    const vol = getObservations([cid], ['deliveries_global'], selectedPeriod)[0]?.value || 0;
    const margin = getObservations([cid], ['operating_margin'], selectedPeriod)[0]?.value || 0;
    const ebit = getObservations([cid], ['operating_income'], selectedPeriod)[0]?.value;
    const rev = getObservations([cid], ['revenue'], selectedPeriod)[0]?.value;
    return {
      company: comp,
      volumeThousand: vol,
      marginPercent: margin,
      operatingIncome: ebit,
      revenue: rev,
      currency: comp.reportingCurrency,
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
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t.global.coveredOems}
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {companies.length} {language === 'ko' ? '개 완성차' : 'Global OEMs'}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t.global.reportingPeriod}
            </span>
            <span className="text-xl font-bold font-mono text-brand-600 dark:text-brand-400 truncate">
              {formatPeriodLabel(selectedPeriod, language)}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t.global.bevLeader}
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                Tesla 100%
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                • BYD 47.5%
              </span>
            </div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              {t.global.marginLeader}
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                Toyota 10.6%
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                • Hyundai 8.6%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* OEM Quick Directory Dossiers (Fast Navigation) */}
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

      {/* Interactive Filter Toolbar (Sticky so period & filters are always visible when scrolling) */}
      <div className="sticky top-16 z-20 p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-md flex flex-wrap items-center justify-between gap-3 transition-all">
        {/* Period Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
            {t.global.periodFilter}
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 text-xs font-sans font-semibold rounded-lg transition ${
                  selectedPeriod === p
                    ? 'bg-brand-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {formatPeriodLabel(p, language)}
              </button>
            ))}
          </div>
          <span className="hidden lg:inline-flex text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 whitespace-nowrap">
            {language === 'ko' ? `조회 공시 주기: ${selectedPeriod}` : `Active Period: ${selectedPeriod}`}
          </span>
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

      {/* SECTION 1: Core Volume & Profitability Benchmarks (Ranked Descending) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <MetricBarChart
          title={t.charts.salesVolume}
          subtitle={t.charts.salesSubtitle}
          observations={salesObs}
          unit="thousand_units"
          periodBadge={selectedPeriod}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
        <MetricBarChart
          title={t.charts.operatingMargin}
          subtitle={t.charts.marginSubtitle}
          observations={marginObs}
          unit="percentage"
          periodBadge={selectedPeriod}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      </div>

      {/* SECTION 2: 4-Quadrant Strategic Volume vs Margin Matrix */}
      <div className="w-full">
        <MarginScatterChart
          title={t.charts.revenueVsMargin}
          subtitle={t.charts.revenueVsMarginSubtitle}
          points={scatterPoints}
        />
      </div>

      {/* SECTION 3: Multi-Period Historical Trend Trajectory */}
      <div className="w-full">
        <MetricLineChart
          title={t.charts.historicalTrend}
          subtitle={t.charts.historicalSubtitle}
          series={trendSeries}
          unit="percentage"
          activePeriod={selectedPeriod}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      </div>

      {/* SECTION 4: Strategic Guidance Corridors & Powertrain Electrification Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <GuidanceRangeChart
          guidanceList={guidanceList}
        />
        <PowertrainMixChart
          title={t.charts.powertrainMix}
          subtitle={t.charts.powertrainMixSubtitle}
          data={powertrainData}
        />
      </div>

      {/* Google AdSense Sponsored Display Unit */}
      <div className="w-full my-2">
        <GoogleAdBanner slot="9426228178" client="ca-pub-6854824605420161" />
      </div>

      {/* SECTION 5: Dedicated Data Table Hub Card & Collapsible Terminal */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-brand-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 text-slate-900 dark:text-white rounded-2xl p-6 sm:p-7 shadow-md dark:shadow-xl border border-slate-200/90 dark:border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-colors">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 border border-brand-500/20 dark:border-brand-500/30">
              {language === 'ko' ? '공식 IR 데이터 허브' : 'Official Disclosures Hub'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              240+ Verified Points • 57 Primary Sources
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {language === 'ko'
              ? '글로벌 완성차 공식 IR 공시 종합 데이터 및 출처 감사 테이블'
              : 'Global OEM Consolidated Disclosures & Audit Registry'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'ko'
              ? '제조사별 원문 표기 회계 라벨, 통화, 감사 출처(PDF/IR 링크) 및 회계 기준 상세 내역은 전용 데이터 커버리지 페이지에서 전체 검색 및 필터링할 수 있습니다.'
              : 'View all original accounting labels, reported units, official PDF filing traces, and deep audit data in the dedicated Data Coverage terminal.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setShowInlineTable(!showInlineTable)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-600 transition flex items-center gap-1.5 shadow-xs"
          >
            <TableProperties className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>
              {showInlineTable
                ? (language === 'ko' ? '테이블 접기' : 'Hide Table')
                : (language === 'ko' ? '현재 화면에서 테이블 펼치기' : 'Expand Table Inline')}
            </span>
          </button>

          <Link
            to="/coverage"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white dark:text-slate-950 bg-brand-600 hover:bg-brand-500 dark:bg-brand-400 dark:hover:bg-brand-300 transition flex items-center gap-1.5 shadow-sm font-sans"
          >
            <span>{language === 'ko' ? '데이터 커버리지 전용 페이지 이동' : 'Go to Data Coverage Page'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {showInlineTable && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <DataTable
            title={language === 'ko' ? '글로벌 완성차 공식 IR 공시 종합 데이터 테이블' : 'Global OEM Consolidated Investor Relations Disclosures'}
            subtitle={language === 'ko' ? '원문 표기 라벨, 회계 기준, 통화 및 데이터 감사 직결' : 'Preserved original accounting labels, reported units, and direct audit traces'}
            observations={getObservations(selectedCompanies, undefined, selectedPeriod)}
            onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
          />
        </div>
      )}

      {/* Data Provenance Modal */}
      <ProvenanceModal
        observation={activeProvenanceObs}
        onClose={() => setActiveProvenanceObs(null)}
      />
    </div>
  );
};
