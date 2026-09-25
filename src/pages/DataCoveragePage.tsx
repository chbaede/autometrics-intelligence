import React, { useState } from 'react';
import {
  getDataQualityReport,
  getCoverageMatrix,
  getDistinctPeriods,
  getObservations,
  getCompanyById,
} from '../utils/metricQueries';
import { MetricObservation } from '../types/metrics';
import { formatPeriodLabel } from '../utils/metricCalculations';
import { useLanguage } from '../i18n/LanguageContext';
import { DataTable } from '../components/metrics/DataTable';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import {
  TableProperties,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Clock,
  Database,
  ExternalLink,
  Calendar,
} from 'lucide-react';

export const DataCoveragePage: React.FC = () => {
  const { language } = useLanguage();
  const qualityReport = getDataQualityReport();
  const { companies, periods, matrix } = getCoverageMatrix();
  const distinctPeriods = getDistinctPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(distinctPeriods[0] || '2026-Q2');
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  const tableObservations = getObservations(undefined, undefined, selectedPeriod);

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <TableProperties className="w-4 h-4" /> {language === 'ko' ? '데이터 무결성 및 공시 투명성' : 'Data Integrity & Provenance Transparency'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '데이터 수집 현황 및 공식 IR 공시 종합 테이블' : 'Data Coverage & Verified IR Disclosures Terminal'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '글로벌 완성차 기업별 분기/연간 실적 데이터 수집 범위와 검증된 공식 출처 링크를 투명하게 공개합니다. 매트릭스 내 "Available"을 클릭하면 해당 분기 공식 IR 원문 공시(PDF/IR웹)가 새 탭에서 즉시 열리며, 하단 종합 테이블에서 전체 지표와 원문 라벨을 검증할 수 있습니다.'
            : 'Full public audit disclosure of coverage breadth, verified source linkages, and accounting comparability across global automotive corporations. Click any "Available" badge to open the original official IR filing in a new tab.'}
        </p>
      </div>

      {/* Quality Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{language === 'ko' ? '총 검증 데이터 수' : 'Total Observations'}</span>
            <Database className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {qualityReport.totalObservations}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Verified data points</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{language === 'ko' ? '공식 출처 검증률' : 'Verified IR Sources'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {qualityReport.verifiedSourcesRatio}%
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">57 Primary Official Links</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{language === 'ko' ? '가이던스 목표 레코드' : 'Guidance Targets'}</span>
            <FileCheck2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {qualityReport.totalGuidanceObservations}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {language === 'ko' ? '2026/2025년 목표 전망' : '2026/2025 Outlook'}
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{language === 'ko' ? '최근 공시 주기' : 'Reporting Cycle'}</span>
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {qualityReport.lastUpdated}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Q2 2026 Cycle</span>
        </div>
      </div>

      {/* Coverage Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              {language === 'ko' ? '완성차 제조사별 분기 공시 가용성 매트릭스' : 'Automaker Reporting Period Availability Matrix'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ko'
                ? '각 분기별 "Available" 클릭 시 제조사 공식 IR 원문 보고서(PDF/IR 발표자료)가 새 페이지로 열립니다.'
                : 'Click any "Available" badge to open that period’s primary official IR disclosure directly in a new tab.'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ko' ? '완성차 기업명' : 'Automaker'}
                </th>
                <th className="px-3 py-3 font-semibold text-slate-500 dark:text-slate-400 text-center">
                  HQ
                </th>
                <th className="px-3 py-3 font-semibold text-slate-500 dark:text-slate-400 text-center">
                  Currency
                </th>
                {periods.map((p) => (
                  <th
                    key={p}
                    className="px-3 py-3 font-mono font-bold text-slate-700 dark:text-slate-300 text-center"
                  >
                    {formatPeriodLabel(p, language)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {companies.map((c) => {
                const comp = getCompanyById(c.id);
                const compName = comp?.name || c.name;
                const ticker = comp?.ticker;
                const hqCountry = comp?.hqCountry || '-';
                const reportingCurrency = comp?.reportingCurrency || '-';
                const officialIRUrl = comp?.financialResultsUrl || comp?.irUrl || c.irUrl;

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{compName}</span>
                        {ticker && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {ticker}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500 dark:text-slate-400">
                      {hqCountry}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-slate-600 dark:text-slate-300">
                      {reportingCurrency}
                    </td>
                    {periods.map((p) => {
                      const cell = matrix[c.id]?.[p];
                      const status = cell?.status || 'missing';
                      const targetUrl = cell?.sourceUrl || officialIRUrl;
                      const tooltipText = cell?.sourceTitle
                        ? `${cell.sourceTitle} (${language === 'ko' ? '새 탭에서 공식 문서 열기' : 'Open in new tab'})`
                        : `${compName} ${p} IR (${language === 'ko' ? '새 탭에서 열기' : 'Open in new tab'})`;

                      return (
                        <td key={p} className="px-3 py-3 text-center">
                          {status === 'available' && (
                            <a
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={tooltipText}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 text-[10px] font-semibold transition-all group shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 group-hover:scale-110 transition-transform shrink-0" />
                              <span>Available</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                            </a>
                          )}
                          {status === 'non_comparable' && (
                            <a
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={tooltipText}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 text-[10px] font-semibold transition-all group shadow-xs"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
                              <span>Scope</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                            </a>
                          )}
                          {status === 'missing' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 text-[10px]">
                              N/R
                            </span>
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

      {/* Complete Official IR Disclosures Data Table */}
      <div className="space-y-4">
        {/* Period Filter for Table */}
        <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'ko' ? '공시 조회 기간 선택:' : 'Select Period:'}
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap">
              {distinctPeriods.map((p) => (
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
          </div>
        </div>

        <DataTable
          title={language === 'ko' ? '글로벌 완성차 공식 IR 공시 종합 데이터 테이블' : 'Global OEM Consolidated Investor Relations Disclosures'}
          subtitle={language === 'ko' ? '원문 표기 라벨, 회계 기준, 통화 및 데이터 감사 직결' : 'Preserved original accounting labels, reported units, and direct audit traces'}
          observations={tableObservations}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      </div>

      {/* Methodology Commitment */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          {language === 'ko' ? '가공 및 조작 없는 순수 1차 공식 IR 공시 원칙' : 'Commitment to Primary Verified Official IR Disclosures'}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {language === 'ko'
            ? 'AutoMetrics Intelligence는 공시되지 않은 분기 수치를 임의로 보간(Interpolation)하거나 추정하지 않습니다. 반기 또는 연간 보고서만 발행하는 기업의 경우 해당 분기를 투명하게 "미보고(N/R)"로 표기합니다. 모든 매트릭스의 "Available" 셀을 클릭하면 기업이 공식 배포한 IR 발표자료 및 감사보고서 원문 링크가 새 탭에서 즉시 열립니다.'
            : 'AutoMetrics Intelligence never estimates or interpolates missing quarterly figures without explicit notice. If an OEM only publishes semi-annual or annual statements, interim quarters are transparently marked as "Not reported". Every "Available" link directs immediately to the primary verified IR filing in a new tab.'}
        </p>
      </div>

      {/* Data Provenance Modal */}
      <ProvenanceModal
        observation={activeProvenanceObs}
        onClose={() => setActiveProvenanceObs(null)}
      />
    </div>
  );
};
