import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getCompanyById,
  getAllCompanies,
  getObservationsByCompany,
  getMetricById,
  getSourceDocById,
  getDistinctPeriods,
} from '../utils/metricQueries';
import { MetricObservation } from '../types/metrics';
import { formatMetricValue, getCurrencySymbol } from '../utils/metricCalculations';
import { MetricLineChart } from '../components/metrics/charts/MetricLineChart';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { TermBadge } from '../components/metrics/TermBadge';
import { useLanguage } from '../i18n/LanguageContext';
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
  const { language, t } = useLanguage();
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const allCompanies = getAllCompanies();
  const currentCompany = getCompanyById(companyId || 'volkswagen_group') || allCompanies[0];
  const periods = getDistinctPeriods();

  const [selectedMetricId, setSelectedMetricId] = useState<string>('deliveries_global');
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  const observations = getObservationsByCompany(currentCompany.id);
  const companySources = SOURCE_DOCUMENTS.filter((s) => s.companyId === currentCompany.id);

  // Filter observations by the selected metric
  const filteredObs = observations.filter((obs) => obs.metricId === selectedMetricId);
  const selectedMetricDef = getMetricById(selectedMetricId);

  // Key KPI values from latest period or FY2025/FY2024
  const latestDel = observations.find((o) => o.metricId === 'deliveries_global' && (o.period === '2026-Q2' || o.period === '2025-FY' || o.period === '2024-FY'));
  const latestRev = observations.find((o) => o.metricId === 'revenue' && (o.period === '2026-Q2' || o.period === '2025-FY' || o.period === '2024-FY'));
  const latestMargin = observations.find((o) => o.metricId === 'operating_margin' && (o.period === '2026-Q2' || o.period === '2025-FY' || o.period === '2024-FY'));
  const latestBev = observations.find((o) => o.metricId === 'bev_share' && (o.period === '2026-Q2' || o.period === '2025-FY' || o.period === '2024-FY'));

  const availableMetrics = [
    { id: 'deliveries_global', label: language === 'ko' ? '차량 인도량' : 'Vehicle Deliveries', icon: TrendingUp },
    { id: 'revenue', label: language === 'ko' ? '연결 매출액' : 'Consolidated Revenue', icon: DollarSign },
    { id: 'operating_income', label: language === 'ko' ? '영업이익 (EBIT)' : 'Operating Income (EBIT)', icon: DollarSign },
    { id: 'operating_margin', label: language === 'ko' ? '영업이익률 (RoS)' : 'Operating Margin (RoS)', icon: TrendingUp },
    { id: 'bev_deliveries', label: language === 'ko' ? '순수전기차 인도량' : 'BEV Deliveries', icon: Zap },
    { id: 'bev_share', label: language === 'ko' ? '전기차 점유율' : 'BEV Share', icon: Zap },
  ];

  // Single OEM Historical Line Chart
  const trendPeriods = periods.slice(0, 5).reverse();
  const chartData = trendPeriods.map((p) => {
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
      {/* Back and Selector Bar */}
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentCompany.name}
              </h1>
              {currentCompany.ticker && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-300 border border-slate-200 dark:border-slate-700">
                  {currentCompany.ticker}
                </span>
              )}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
              {language === 'ko' ? '본사 소재지' : 'Headquarters'}
            </span>
            <span className="text-slate-900 dark:text-slate-200 font-bold">
              {currentCompany.hqCity}, {currentCompany.hqCountry}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
              {language === 'ko' ? '공시 통화' : 'Reporting Currency'}
            </span>
            <span className="text-slate-900 dark:text-slate-200 font-bold">
              {currentCompany.reportingCurrency} ({getCurrencySymbol(currentCompany.reportingCurrency)})
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
              {language === 'ko' ? '상장 거래소' : 'Stock Exchange'}
            </span>
            <span className="text-slate-900 dark:text-slate-200 font-bold">
              {currentCompany.stockExchange || 'Public OEM'}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">
              {language === 'ko' ? '결산월' : 'Fiscal Year End'}
            </span>
            <span className="text-slate-900 dark:text-slate-200 font-bold">
              {currentCompany.fiscalYearEnd}
            </span>
          </div>
        </div>
      </div>

      {/* Key Annual Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div
          onClick={() => latestDel && setActiveProvenanceObs(latestDel)}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">
              {latestDel?.period} {language === 'ko' ? '인도 실적' : 'Deliveries'} (<TermBadge term="OEM" />)
            </span>
            <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
            {formatMetricValue(latestDel?.value, 'thousand_units')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{latestDel?.originalLabel || 'Deliveries to customers'}</span>
          </div>
        </div>

        {/* Revenue */}
        <div
          onClick={() => latestRev && setActiveProvenanceObs(latestRev)}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">
              {latestRev?.period} {language === 'ko' ? '연결 매출액' : 'Revenue'}
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
            {formatMetricValue(latestRev?.value, 'currency_millions', currentCompany.reportingCurrency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Functional: {currentCompany.reportingCurrency}
          </div>
        </div>

        {/* Operating Margin */}
        <div
          onClick={() => latestMargin && setActiveProvenanceObs(latestMargin)}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">
              {latestMargin?.period} {language === 'ko' ? '영업이익률' : 'Operating Margin'} (<TermBadge term="RoS" />)
            </span>
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
            {formatMetricValue(latestMargin?.value, 'percentage')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Operating <TermBadge term="EBIT" /> / Revenue
          </div>
        </div>

        {/* BEV Share */}
        <div
          onClick={() => latestBev && setActiveProvenanceObs(latestBev)}
          className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">
              <TermBadge term="BEV" /> {language === 'ko' ? '전동화 비중' : 'Adoption Share'}
            </span>
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
            {formatMetricValue(latestBev?.value, 'percentage')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pure All-Electric Penetration
          </div>
        </div>
      </div>

      {/* Historical Trend Line Visualizer */}
      <MetricLineChart
        title={`${currentCompany.name} — ${selectedMetricDef?.name || 'Historical Trend'}`}
        subtitle={language === 'ko' ? '분기 및 연간 실적 추이 시각화' : 'Tracking quarterly trajectory and annual milestones'}
        series={singleSeries}
        unit={selectedMetricDef?.unit || 'units'}
        onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
      />

      {/* Dynamic Metric Explorer */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-6">
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
                        {obs.period}
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-4">
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
                    {doc.publicationDate}
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
