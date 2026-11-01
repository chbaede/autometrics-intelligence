import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getCompanyById,
  getAllCompanies,
  getObservationsByCompany,
  getMetricById,
  getSourceDocById,
} from '../utils/metricQueries';
import { MetricObservation } from '../types/metrics';
import {
  formatMetricValue,
  getCurrencySymbol,
  formatPeriodLabel,
  getVolumeDefinitionLabel,
  comparePeriodsDescending,
} from '../utils/metricCalculations';
import {
  formatLocalizedProfit,
} from '../utils/currencyUtils';
import { MetricLineChart } from '../components/metrics/charts/MetricLineChart';
import { QuarterlyPerformanceCharts } from '../components/company/QuarterlyPerformanceCharts';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { GoogleAdBanner } from '../components/common/GoogleAdBanner';
import { useLanguage } from '../i18n/LanguageContext';
import { SOURCE_DOCUMENTS } from '../data/sources';
import { getScheduledDisclosure } from '../data/scheduledDisclosures';
import { getCompanyDataFreshness } from '../utils/dataFreshness';
import { getPerformanceDriver, getAvailablePerformanceDriverPeriods } from '../data/performanceDrivers';
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
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const CompanyDashboardPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const allCompanies = getAllCompanies();
  const currentCompany = getCompanyById(companyId || 'mercedes_benz') || allCompanies[0];

  const observations = getObservationsByCompany(currentCompany.id);
  const companySources = SOURCE_DOCUMENTS.filter((s) => s.companyId === currentCompany.id);
  const scheduledQ3 = getScheduledDisclosure(currentCompany.id, '2026-Q3');

  // Check if this OEM has reported 2026-Q3 data
  const hasQ3Observations = observations.some((o) => o.period === '2026-Q3');
  const defaultPeriod = hasQ3Observations ? '2026-Q3' : '2026-Q2';

  // Active period state (user can toggle between 2026-Q3, 2026-Q2, 2026-Q1, 2025-FY, 2024-FY)
  const [activePeriod, setActivePeriod] = useState<string>(defaultPeriod);
  const [selectedMetricId, setSelectedMetricId] = useState<string>('deliveries_global');
  const [trendCadence, setTrendCadence] = useState<'quarterly' | 'annual'>('quarterly');
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  const activeFreshness = getCompanyDataFreshness(currentCompany.id, activePeriod);

  // Synchronize default period when switching OEM
  useEffect(() => {
    const hasQ3 = observations.some((o) => o.period === '2026-Q3');
    setActivePeriod(hasQ3 ? '2026-Q3' : '2026-Q2');
  }, [currentCompany.id]);

  // Display periods list
  const displayPeriodsList = Array.from(new Set(['2026-Q3', '2026-Q2', '2026-Q1', '2025-FY', '2024-FY']));

  // Key KPI values from activePeriod
  const periodDel = observations.find((o) => o.metricId === 'deliveries_global' && o.period === activePeriod);
  const periodRev = observations.find((o) => o.metricId === 'revenue' && o.period === activePeriod);
  const periodMargin = observations.find((o) => o.metricId === 'operating_margin' && o.period === activePeriod);
  const periodIncome = observations.find((o) => o.metricId === 'operating_income' && o.period === activePeriod);
  const periodBev = observations.find((o) => o.metricId === 'bev_share' && o.period === activePeriod);
  const periodNetIncome = observations.find((o) => o.metricId === 'net_income' && o.period === activePeriod);

  // Special BYD handling for 2026-Q3 (reports Net Profit under CASBE instead of Operating Income)
  const isBydQ3 = currentCompany.id === 'byd' && activePeriod === '2026-Q3';
  const bydNetMargin = isBydQ3 && periodRev?.value && periodNetIncome?.value
    ? Number(((periodNetIncome.value / periodRev.value) * 100).toFixed(1))
    : null;

  // Official qualitative performance drivers for activePeriod (strictly exact match, no silent fallback)
  const performanceDriver = getPerformanceDriver(currentCompany.id, activePeriod);
  const availableDriverPeriods = getAvailablePerformanceDriverPeriods(currentCompany.id);

  const availableMetrics = [
    { id: 'deliveries_global', label: language === 'ko' ? '차량 인도량' : 'Vehicle Deliveries', icon: TrendingUp },
    { id: 'revenue', label: language === 'ko' ? '연결 매출액' : 'Consolidated Revenue', icon: DollarSign },
    { id: 'operating_income', label: language === 'ko' ? '영업이익 (EBIT)' : 'Operating Income (EBIT)', icon: DollarSign },
    { id: 'operating_margin', label: language === 'ko' ? '영업이익률 (RoS)' : 'Operating Margin (RoS)', icon: TrendingUp },
    { id: 'bev_deliveries', label: language === 'ko' ? '순수전기차 인도량' : 'BEV Deliveries', icon: Zap },
    { id: 'bev_share', label: language === 'ko' ? '전기차 점유율' : 'BEV Share', icon: Zap },
  ];

  // Filter observations by the selected metric for table explorer and sort newest (2026-Q3) first
  const filteredObs = [...observations]
    .filter((obs) => obs.metricId === selectedMetricId)
    .sort((a, b) => comparePeriodsDescending(a.period, b.period));
  const selectedMetricDef = getMetricById(selectedMetricId);

  // Cadence-separated Historical Trend Line Visualizer (Never mix Quarterly with Annual)
  const chartPeriods = trendCadence === 'quarterly'
    ? ['2026-Q1', '2026-Q2', '2026-Q3']
    : ['2024-FY', '2025-FY'];

  const chartData = chartPeriods.map((p) => {
    const obs = observations.find((o) => o.metricId === selectedMetricId && o.period === p);
    return {
      period: p,
      value: obs ? obs.value : null,
      observation: obs,
    };
  });

  const singleSeries = [
    {
      company: currentCompany,
      data: chartData,
      color: '#0c93e7',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Navigation & Company Quick Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'ko' ? '← 글로벌 오버뷰로 돌아가기' : '← Back to Global Overview'}</span>
        </Link>

        {/* Company Quick Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {language === 'ko' ? 'OEM 전환:' : 'Switch OEM:'}
          </span>
          <select
            value={currentCompany.id}
            onChange={(e) => navigate(`/company/${e.target.value}`)}
            aria-label="Select OEM"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-brand-500 font-medium shadow-xs"
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentCompany.name}
              </h1>
              {currentCompany.ticker && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-300 border border-slate-200 dark:border-slate-700">
                  {currentCompany.ticker}
                </span>
              )}
              {hasQ3Observations ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {language === 'ko' ? '2026-Q3 실적 공시 완료' : '2026-Q3 Reported'}
                </span>
              ) : scheduledQ3 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  {language === 'ko' ? `2026-Q3 공시 예정: ${scheduledQ3.scheduledDate}` : `2026-Q3 Scheduled: ${scheduledQ3.scheduledDate}`}
                </span>
              ) : null}
            </div>
            {currentCompany.nativeName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{currentCompany.nativeName}</p>
            )}
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              {currentCompany.description}
            </p>
          </div>

          {/* Quick Links / Official Portal */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <a
              href={currentCompany.irUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 rounded-xl transition shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>{language === 'ko' ? '공식 IR 포털 바로가기' : 'Official IR Portal'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={currentCompany.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition border border-slate-200 dark:border-slate-700"
            >
              <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>{language === 'ko' ? '기업 공식 홈페이지' : 'Corporate Website'}</span>
            </a>
          </div>
        </div>

        {/* Corporate Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold truncate">
              {language === 'ko' ? '본사 소재지' : 'Headquarters'}
            </span>
            <span className="text-slate-900 dark:text-slate-200 font-bold block truncate">
              {currentCompany.hqCity}, {currentCompany.hqCountry}
            </span>
          </div>
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold truncate">
              {language === 'ko' ? '공시 통화' : 'Reporting Currency'}
            </span>
            <span className="text-slate-900 dark:text-slate-200 font-bold block truncate">
              {currentCompany.reportingCurrency} ({getCurrencySymbol(currentCompany.reportingCurrency)})
            </span>
          </div>
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold truncate">
              {language === 'ko' ? '상장 거래소' : 'Stock Exchange'}
            </span>
            <span className="text-slate-900 dark:text-slate-200 font-bold block truncate">
              {currentCompany.stockExchange || 'Public OEM'}
            </span>
          </div>
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold truncate">
              {language === 'ko' ? '결산월' : 'Fiscal Year End'}
            </span>
            <span className="text-slate-900 dark:text-slate-200 font-bold block truncate">
              {currentCompany.fiscalYearEnd}
            </span>
          </div>
        </div>

        {/* 3-Date Temporal Provenance & Data Freshness Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                {language === 'ko' ? '데이터 기준 및 출처 시점:' : 'Temporal Provenance:'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                {language === 'ko' ? '보고 기간: ' : 'Reporting Period: '}
                <span className="text-brand-600 dark:text-brand-400">{formatPeriodLabel(activePeriod, language)}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                {language === 'ko' ? '공식 발표일: ' : 'Source Disclosed: '}
                <span className="text-sky-600 dark:text-sky-400">
                  {activeFreshness.sourcePublishedAt || (activeFreshness.status === 'scheduled' ? `${activeFreshness.scheduledDate} (예정)` : '미공시')}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'ko' ? '시스템 갱신일: ' : 'System Updated: '}
                <span className="text-emerald-600 dark:text-emerald-400">{activeFreshness.dataUpdatedAt || '2026-11-01'}</span>
              </span>
            </div>

            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[11px] ${
                activeFreshness.status === 'verified_official'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : activeFreshness.status === 'scheduled'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
              }`}>
                {activeFreshness.status === 'verified_official' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                {language === 'ko' ? activeFreshness.statusLabelKo : activeFreshness.statusLabelEn}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Disclosure Notification Banner (for OEMs without Q3 yet) */}
      {scheduledQ3 && !hasQ3Observations && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                  {language === 'ko' ? '📢 2026-Q3 공식 경영실적 공시 예정' : '📢 2026-Q3 Earnings Release Scheduled'}
                </span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {language === 'ko' ? scheduledQ3.scheduledDateKo : scheduledQ3.scheduledDateEn}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {language === 'ko' ? scheduledQ3.notesKo : scheduledQ3.notesEn}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'ko'
                  ? '※ AutoMetrics는 미공시 기간에 대해 추정치를 임의 입력하지 않으며, 현재 가장 최근 공식 확정 실적인 2026-Q2 기준으로 표시됩니다.'
                  : '※ AutoMetrics enforces fail-closed data integrity. Unreported quarters are never fabricated; currently displaying latest verified 2026-Q2 results.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivePeriod('2026-Q2')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs whitespace-nowrap self-start sm:self-auto"
          >
            {language === 'ko' ? '2026-Q2 확정 실적 확인' : 'View Verified 2026-Q2'}
          </button>
        </div>
      )}

      {/* Period Selector Pills Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {language === 'ko' ? '공시 분기/연도 선택:' : 'Select Reporting Period:'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {displayPeriodsList.map((p) => {
            const isSelected = activePeriod === p;
            const hasData = observations.some((o) => o.period === p);
            const isQ3Scheduled = p === '2026-Q3' && !hasData && scheduledQ3;

            return (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-500 shadow-xs'
                    : isQ3Scheduled
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                    : hasData
                    ? 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'bg-slate-50/50 dark:bg-slate-950/30 text-slate-400 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}
              >
                <span>{formatPeriodLabel(p, language)}</span>
                {p === '2026-Q3' && hasData && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold">
                    {language === 'ko' ? '최신' : 'Latest'}
                  </span>
                )}
                {isQ3Scheduled && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
                    {language === 'ko' ? '예정' : 'Sched.'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Headline KPI Cards for Active Period */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono truncate">
              {formatPeriodLabel(activePeriod, language)} {language === 'ko' ? '공시 실적 헤드라인' : 'Reported Headline KPIs'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            {language === 'ko' ? '카드를 클릭하면 공식 출처와 감사 근거가 열립니다' : 'Click any card to inspect official provenance'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Sales Deliveries */}
          <div
            onClick={() => periodDel && setActiveProvenanceObs(periodDel)}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between min-w-0"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">
                  {language === 'ko' ? '글로벌 판매량 / 인도량' : 'Global Deliveries'}
                </span>
                <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                {periodDel?.value ? formatMetricValue(periodDel.value, 'thousand_units') : '-'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 min-w-0">
              <span className="truncate min-w-0 flex-1 mr-1">
                {periodDel?.originalLabel || (language === 'ko' ? '완성차 인도량' : 'Vehicle Deliveries')}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold shrink-0">
                {getVolumeDefinitionLabel(periodDel?.volumeDefinition, language).full}
              </span>
            </div>
          </div>

          {/* Revenue */}
          <div
            onClick={() => periodRev && setActiveProvenanceObs(periodRev)}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between min-w-0"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">
                  {language === 'ko' ? '연결 매출액' : 'Consolidated Revenue'}
                </span>
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {periodRev?.value
                  ? formatMetricValue(periodRev.value, 'currency_millions', currentCompany.reportingCurrency)
                  : '-'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 min-w-0">
              <span className="shrink-0">{currentCompany.reportingCurrency}</span>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate text-right">
                {formatLocalizedProfit(periodRev?.value, currentCompany.reportingCurrency, language)}
              </span>
            </div>
          </div>

          {/* Operating Profit / Net Profit */}
          <div
            onClick={() => {
              if (periodIncome) setActiveProvenanceObs(periodIncome);
              else if (periodNetIncome) setActiveProvenanceObs(periodNetIncome);
            }}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between min-w-0"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">
                  {isBydQ3
                    ? language === 'ko' ? '당기순이익 (CASBE)' : 'Net Profit (CASBE)'
                    : language === 'ko' ? '영업이익 (EBIT)' : 'Operating Profit (EBIT)'}
                </span>
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div
                className={`text-2xl font-bold font-mono transition ${
                  (periodIncome?.value ?? periodNetIncome?.value ?? 0) < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                }`}
              >
                {periodIncome?.value !== null && periodIncome?.value !== undefined
                  ? formatLocalizedProfit(periodIncome.value, periodIncome.currency || currentCompany.reportingCurrency, language, { showOriginal: true })
                  : periodNetIncome?.value !== null && periodNetIncome?.value !== undefined
                  ? formatLocalizedProfit(periodNetIncome.value, periodNetIncome.currency || currentCompany.reportingCurrency, language, { showOriginal: true })
                  : '-'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 min-w-0">
              <span className="truncate min-w-0 flex-1 mr-1">
                {periodIncome?.originalLabel || periodNetIncome?.originalLabel || (isBydQ3 ? 'Net profit attributable' : 'Operating profit')}
              </span>
              <span className="font-mono text-[10px] font-semibold text-brand-600 dark:text-brand-400 shrink-0">
                {isBydQ3 ? 'PRC GAAP' : periodIncome?.accountingBasis === 'adjusted' ? 'Non-GAAP' : 'IFRS'}
              </span>
            </div>
          </div>

          {/* Operating Margin / Net Margin */}
          <div
            onClick={() => periodMargin && setActiveProvenanceObs(periodMargin)}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between min-w-0"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">
                  {isBydQ3
                    ? language === 'ko' ? '순이익률 (Net Margin)' : 'Net Profit Margin'
                    : language === 'ko' ? '영업이익률 (RoS)' : 'Operating Margin (RoS)'}
                </span>
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <div
                className={`text-2xl font-bold font-mono transition ${
                  (periodMargin?.value ?? bydNetMargin ?? 0) < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                }`}
              >
                {periodMargin?.value !== null && periodMargin?.value !== undefined
                  ? formatMetricValue(periodMargin.value, 'percentage')
                  : bydNetMargin !== null
                  ? `${bydNetMargin.toFixed(1)}%`
                  : '-'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 min-w-0">
              <span className="truncate min-w-0 flex-1 mr-1">{isBydQ3 ? 'Net Profit / Revenue' : 'Operating EBIT / Revenue'}</span>
              <span className="font-mono text-[10px] font-semibold shrink-0">
                {(periodMargin?.value ?? bydNetMargin ?? 0) >= 8.0
                  ? '🌟 Top Tier'
                  : (periodMargin?.value ?? bydNetMargin ?? 0) < 0
                  ? '⚠️ Deficit'
                  : '✅ Healthy'}
              </span>
            </div>
          </div>

          {/* BEV Share */}
          <div
            onClick={() => periodBev && setActiveProvenanceObs(periodBev)}
            className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between min-w-0"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold">
                  {language === 'ko' ? '전기차(BEV) 점유율' : 'BEV Share'}
                </span>
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {periodBev?.value ? formatMetricValue(periodBev.value, 'percentage') : '-'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 min-w-0">
              <span className="truncate min-w-0 flex-1 mr-1">
                {periodBev?.originalLabel || (language === 'ko' ? '순수 전기차 비중' : 'All-Electric Share')}
              </span>
              <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                {periodBev?.value ? `${periodBev.value.toFixed(1)}%` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED QUARTERLY PERFORMANCE CHARTS (판매량, 영업이익, 영업이익률) */}
      <QuarterlyPerformanceCharts
        company={currentCompany}
        observations={observations}
        activePeriod={activePeriod}
        onSelectPeriod={(p) => setActivePeriod(p)}
        onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        scheduledDisclosure={scheduledQ3}
      />

      {/* OFFICIAL PERFORMANCE DRIVERS & MANAGEMENT COMMENTARY */}
      {performanceDriver ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {language === 'ko' ? '공식 실적 분석 및 경영진 설명 (IR 공시)' : 'Official IR Performance Drivers & Commentary'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'ko'
                  ? `${currentCompany.name} 공식 IR 자료 및 분기보고서에 명시된 ${formatPeriodLabel(performanceDriver.period, language)} 실적 변동 원인 분석`
                  : `Primary management explanations cited from ${currentCompany.name} official filings for ${formatPeriodLabel(performanceDriver.period, language)}`}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-bold text-brand-700 dark:text-brand-300 border border-slate-200 dark:border-slate-700">
                {performanceDriver.period}
              </span>
            </div>
          </div>

          {/* Headline & Executive Summary Box */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-brand-50/50 via-slate-50 to-white dark:from-brand-950/20 dark:via-slate-950/40 dark:to-slate-900 border border-brand-200/60 dark:border-brand-900/40 space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 break-words">
              <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <span>{language === 'ko' ? performanceDriver.headlineKo : performanceDriver.headlineEn}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {language === 'ko' ? performanceDriver.summaryKo : performanceDriver.summaryEn}
            </p>
          </div>

          {/* Structured Quantitative Financial Claims (P0/P1 Verified Evidence) */}
          {performanceDriver.structuredClaims && performanceDriver.structuredClaims.length > 0 && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ko' ? '공식 검증 핵심 정량 지표 (Primary Source Claims)' : 'Verified Primary Quantitative Claims'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {language === 'ko' ? '1차 공시 문서 대조 완료' : 'Reconciled with IR filings'}
                </span>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2.5">
                {performanceDriver.structuredClaims.map((claim, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-w-0"
                  >
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {language === 'ko' ? claim.metricLabelKo : claim.metricLabelEn}
                    </span>
                    <div className="flex items-baseline justify-between gap-1 mt-1">
                      <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                        {formatMetricValue(claim.value, claim.unit, claim.currency || currentCompany.reportingCurrency)}
                      </span>
                      {claim.growthRateYoY !== undefined && (
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            claim.growthRateYoY > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : claim.growthRateYoY < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {claim.growthRateYoY > 0 ? `+${claim.growthRateYoY}%` : `${claim.growthRateYoY}%`}
                        </span>
                      )}
                      {claim.changeYoYPercentagePoints !== undefined && (
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            claim.changeYoYPercentagePoints > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : claim.changeYoYPercentagePoints < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {claim.changeYoYPercentagePoints > 0 ? `+${claim.changeYoYPercentagePoints}%p` : `${claim.changeYoYPercentagePoints}%p`}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 truncate mt-1">
                      {claim.sourceLocator}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorized Key Driver Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {performanceDriver.drivers.map((driver, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between min-w-0 break-words"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {driver.category === 'profitability'
                        ? language === 'ko' ? '💰 수익성' : '💰 Profitability'
                        : driver.category === 'volume'
                        ? language === 'ko' ? '🚗 판매량/인도' : '🚗 Volume'
                        : driver.category === 'margin'
                        ? language === 'ko' ? '📈 마진/가격' : '📈 Margin'
                        : driver.category === 'electrification'
                        ? language === 'ko' ? '⚡ 전동화' : '⚡ EV / Tech'
                        : driver.category === 'one_off'
                        ? language === 'ko' ? '⚠️ 일회성 비용' : '⚠️ One-off'
                        : driver.category === 'macro'
                        ? language === 'ko' ? '🌐 거시 환경' : '🌐 Macro'
                        : language === 'ko' ? '🎯 사업 전략' : '🎯 Strategy'}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        driver.impact === 'positive'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : driver.impact === 'negative'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {driver.impact === 'positive'
                        ? language === 'ko' ? '호재 요인' : 'Positive Driver'
                        : driver.impact === 'negative'
                        ? language === 'ko' ? '부담 요인' : 'Headwind'
                        : language === 'ko' ? '중립 / 과도기' : 'Neutral'}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === 'ko' ? driver.titleKo : driver.titleEn}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {language === 'ko' ? driver.descriptionKo : driver.descriptionEn}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Primary Source Citation Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span className="font-semibold">{language === 'ko' ? '공식 출처 근거:' : 'Official IR Citation:'}</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {language === 'ko' ? performanceDriver.sourceCitationKo : performanceDriver.sourceCitationEn}
              </span>
            </div>
            {performanceDriver.sourceDocId && (
              <button
                onClick={() => {
                  const doc = getSourceDocById(performanceDriver.sourceDocId);
                  if (doc?.officialUrl) window.open(doc.officialUrl, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline self-start sm:self-auto"
              >
                <span>{language === 'ko' ? '원본 IR 문서 열기' : 'Open Official Document'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty State: No commentary for this exact period — never silently fallback to a different period */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>
              {language === 'ko'
                ? `${formatPeriodLabel(activePeriod, language)} 공식 IR 경영진 설명 자료 없음`
                : `No official IR management commentary available for ${formatPeriodLabel(activePeriod, language)}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {language === 'ko'
              ? `선택하신 공시 주기(${activePeriod})에 대해 등록된 공식 IR 정성 분석 자료가 없습니다. AutoMetrics는 타 주기의 분석을 임의로 대체 표시하지 않습니다.`
              : `No verified qualitative IR commentary is registered for ${activePeriod}. AutoMetrics never silently substitutes commentary from a different period.`}
          </p>
          {availableDriverPeriods.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {language === 'ko' ? '공식 해설 등록 주기:' : 'Available commentary periods:'}
              </span>
              {availableDriverPeriods.map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800 transition shadow-2xs"
                >
                  {formatPeriodLabel(p, language)} {language === 'ko' ? '공식 분석 보기' : 'Commentary'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historical Trend Line Visualizer (Cadence Separated) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>{language === 'ko' ? '지표별 연속 추이 탐색기' : 'Multi-Period Trend Visualizer'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ko'
                ? `선택한 지표(${selectedMetricDef?.name})의 기간별 공식 실적 변화를 추적합니다. (비율 왜곡 방지를 위해 분기/연간 집계 주기 분리)`
                : 'Quarterly and annual cadences are strictly separated to prevent distorted comparisons.'}
            </p>
          </div>
          {/* Cadence Switcher: Quarterly vs Annual */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setTrendCadence('quarterly')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                trendCadence === 'quarterly'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {language === 'ko' ? '분기별 추이 (2026-Q1~Q3)' : 'Quarterly'}
            </button>
            <button
              onClick={() => setTrendCadence('annual')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                trendCadence === 'annual'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {language === 'ko' ? '연간 마일스톤 (2024~2025 FY)' : 'Annual'}
            </button>
          </div>
        </div>

        {/* Metric Selector Pills inside Trend Explorer */}
        <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
            {language === 'ko' ? '추이 지표 선택:' : 'Select Metric:'}
          </span>
          {availableMetrics.map((m) => {
            const isSelected = selectedMetricId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMetricId(m.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <MetricLineChart
          title={`${currentCompany.name} — ${selectedMetricDef?.name || 'Historical Trend'} (${trendCadence === 'quarterly' ? 'Quarterly' : 'Annual'})`}
          subtitle={
            trendCadence === 'quarterly'
              ? language === 'ko'
                ? `${selectedMetricDef?.name || '선택 지표'}의 분기별 실적 추이 시각화 (동일 분기 주기)`
                : `Tracking quarterly trajectory of ${selectedMetricDef?.name || 'metric'}`
              : language === 'ko'
                ? `${selectedMetricDef?.name || '선택 지표'}의 연간 종합 실적 마일스톤`
                : `Tracking annual milestone progression of ${selectedMetricDef?.name || 'metric'}`
          }
          series={singleSeries}
          unit={selectedMetricDef?.unit || 'units'}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      </div>

      {/* Google AdSense Sponsored Display Unit */}
      <div className="w-full">
        <GoogleAdBanner slot="9426228178" client="ca-pub-6854824605420161" />
      </div>

      {/* Dynamic Metric Explorer */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {language === 'ko' ? '지표별 상세 공시 데이터 탐색' : 'Historical Trend Explorer'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ko'
                ? '원하는 재무 및 판매 지표를 선택하여 분기/연간 공시 데이터를 확인하세요.'
                : 'Select a financial or volume metric to inspect reported observations across quarters & years'}
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Observations Table */}
        {filteredObs.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">{language === 'ko' ? '공시 주기' : 'Reporting Period'}</th>
                  <th className="px-4 py-3">{t.global.originalLabel}</th>
                  <th className="px-4 py-3 text-right">{t.global.reportedValue}</th>
                  <th className="px-4 py-3">{t.global.accountingBasis}</th>
                  <th className="px-4 py-3">{t.global.sourceCitation}</th>
                  <th className="px-4 py-3 text-center">{language === 'ko' ? '검증' : 'Audit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {filteredObs.map((obs) => {
                  const src = obs.sourceDocId ? getSourceDocById(obs.sourceDocId) : undefined;
                  return (
                    <tr
                      key={obs.id}
                      onClick={() => setActiveProvenanceObs(obs)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={obs.period === '2026-Q3' ? 'text-brand-600 dark:text-brand-400 font-extrabold' : ''}>
                            {obs.period}
                          </span>
                          {obs.period === '2026-Q3' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                              {language === 'ko' ? '최신 3Q' : 'Latest Q3'}
                            </span>
                          )}
                          <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                            ({formatPeriodLabel(obs.period, language)})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {obs.originalLabel || selectedMetricDef?.name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-brand-600 dark:text-brand-400 text-sm">
                        {formatMetricValue(obs.value, obs.unit, obs.currency || currentCompany.reportingCurrency)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        {obs.valueType}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px]">
                        {src?.title || 'Official IR Filing'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[11px] text-brand-600 dark:text-brand-400 group-hover:underline flex items-center justify-center gap-1 font-semibold">
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
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No specific historical observations logged for {selectedMetricDef?.name} in this reporting series.
          </div>
        )}

        {/* Metric Definition & Comparability Box */}
        {selectedMetricDef && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
              <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Standard Definition & Normalization Notes for {selectedMetricDef.name}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {selectedMetricDef.description}
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-mono text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <strong className="text-slate-700 dark:text-slate-300">Comparability Note:</strong> {selectedMetricDef.comparabilityNotes}
            </p>
          </div>
        )}
      </div>

      {/* Official IR Source Documents Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-md space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            {language === 'ko' ? '공식 IR 공시 문서 및 출처 목록' : 'Official Investor Relations Documents & Filings'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Direct official primary publications referenced by AutoMetrics for {currentCompany.name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {companySources.map((doc) => (
            <div
              key={doc.id}
              className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold">
                    {doc.period} • {doc.docType.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {language === 'ko' ? `공시: ${doc.publicationDate} | 확인: ${doc.lastChecked}` : `Pub: ${doc.publicationDate} | Chk: ${doc.lastChecked}`}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">
                  {doc.title}
                </h3>
                {doc.notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {doc.notes}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Official IR
                </span>
                <a
                  href={doc.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 rounded-lg border border-brand-200 dark:border-brand-500/20 transition"
                >
                  <span>{t.global.openOfficialDoc}</span>
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
