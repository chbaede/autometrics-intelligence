import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCoverageMatrix,
  getDistinctPeriods,
  getObservations,
  getCompanyById,
} from '../utils/metricQueries';
import { METRIC_OBSERVATIONS } from '../data/observations';
import { SOURCE_DOCUMENTS } from '../data/sources';
import { getCompanyDataFreshness, getReportingSeasonSummary } from '../utils/dataFreshness';
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
  const { companies, periods, matrix } = getCoverageMatrix();
  const distinctPeriods = getDistinctPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(distinctPeriods[0] || '2026-Q3');
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  const tableObservations = getObservations(undefined, undefined, selectedPeriod);

  // 5 Specific Coverage Metrics (Section 7.4)
  const allObs = METRIC_OBSERVATIONS;
  const validObs = allObs.filter((o) => o.value !== null && o.value !== undefined);
  const verifiedObs = allObs.filter((o) => o.verificationStatus === 'verified');
  const derivedObs = allObs.filter((o) => o.valueType === 'derived');
  const verifiedDerived = derivedObs.filter(
    (o) => o.verificationStatus === 'verified' && (o.derivationFormula || o.inputObservationIds)
  );

  const sourceCoverageRatio = Math.round(
    (SOURCE_DOCUMENTS.filter((s) => s.isVerified && s.officialUrl).length / (SOURCE_DOCUMENTS.length || 1)) * 100
  );
  const observationCoverageRatio = Math.round((validObs.length / (allObs.length || 1)) * 100);
  const officialVerificationCoverageRatio = Math.round((verifiedObs.length / (allObs.length || 1)) * 100);
  const calculationVerificationCoverageRatio = Math.round(
    (verifiedDerived.length / (derivedObs.length || 1)) * 100
  );

  const q3FreshnessList = companies.map((c) => getCompanyDataFreshness(c.id, '2026-Q3'));
  const totalRequiredCount = q3FreshnessList.reduce(
    (acc, f) => acc + (f.requiredMetricsCoverage?.requiredCount || 0),
    0
  );
  const totalVerifiedRequiredCount = q3FreshnessList.reduce(
    (acc, f) => acc + (f.requiredMetricsCoverage?.verifiedCount || 0),
    0
  );
  const requiredMetricCoverageRatio =
    totalRequiredCount > 0 ? Math.round((totalVerifiedRequiredCount / totalRequiredCount) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
            <TableProperties className="w-4 h-4" /> {language === 'ko' ? '데이터 무결성 및 공시 투명성' : 'Data Integrity & Provenance Transparency'}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {language === 'ko' ? '2026.11.01 최신 업데이트 버전 기준' : 'Updated Nov 1, 2026 Version'}
          </span>
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

      {/* 5 Distinct Quality & Coverage Metrics (Section 7.4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'ko' ? '출처 등록률' : 'Source Coverage'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
            {sourceCoverageRatio}%
          </div>
          <span className="text-[10px] text-slate-500 block">
            {SOURCE_DOCUMENTS.length} official documents
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'ko' ? '관측값 수집률' : 'Observation Coverage'}</span>
            <Database className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-brand-600 dark:text-brand-400">
            {observationCoverageRatio}%
          </div>
          <span className="text-[10px] text-slate-500 block">
            {validObs.length} / {allObs.length} points
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'ko' ? '원문 검증 완료율' : 'Official Verification'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {officialVerificationCoverageRatio}%
          </div>
          <span className="text-[10px] text-slate-500 block">
            {verifiedObs.length} verified observations
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'ko' ? 'Q3 필수 지표 반영률' : 'Required Metric Cov.'}</span>
            <FileCheck2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
            {requiredMetricCoverageRatio}%
          </div>
          <span className="text-[10px] text-slate-500 block">
            {totalVerifiedRequiredCount} / {totalRequiredCount} required metrics
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">{language === 'ko' ? '계산 검증 완료율' : 'Calc. Verification'}</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-sky-600 dark:text-sky-400">
            {calculationVerificationCoverageRatio}%
          </div>
          <span className="text-[10px] text-slate-500 block">
            {verifiedDerived.length} verified derived KPIs
          </span>
        </div>
      </div>

      {/* 2026-Q3 Reporting Season & Required Metrics Inspection Terminal */}
      {(() => {
        const season = getReportingSeasonSummary('2026-Q3');
        const publishedCount = season.reportedCount + season.partialCount + season.publishedPendingDataCount;
        const dataIngestedCount = season.reportedCount + season.partialCount;

        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{language === 'ko' ? '2026년 3분기(2026-Q3) 어닝 시즌 공시 및 검증 종합 현황' : '2026 Q3 Earnings Season Disclosure & Verification Terminal'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'ko'
                      ? '등록 16개 글로벌 제조사의 공식 IR 발표 여부, 필수 지표 커버리지 및 원문 대조 검증 상태'
                      : 'Audit breakdown across all 16 global OEMs: primary filing status, required metric coverage, and IR verification'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold font-mono text-[11px]">
                  {season.reportedCount} {language === 'ko' ? '공식 검증 완료' : 'Verified'}
                </span>
                {season.partialCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold font-mono text-[11px]">
                    {season.partialCount} {language === 'ko' ? '일부 반영' : 'Partial'}
                  </span>
                )}
                {season.publishedPendingDataCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold font-mono text-[11px]">
                    {season.publishedPendingDataCount} {language === 'ko' ? '데이터 대기' : 'Pending Ingestion'}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold font-mono text-[11px]">
                  {season.scheduledCount} {language === 'ko' ? '공시 예정' : 'Scheduled'}
                </span>
              </div>
            </div>

            {/* 7 Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">{language === 'ko' ? '공식 발표 확인' : 'Disclosed'}</span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">{publishedCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">{language === 'ko' ? '데이터 반영' : 'Data Ingested'}</span>
                <span className="text-base font-extrabold font-mono text-brand-600 dark:text-brand-400">{dataIngestedCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block">{language === 'ko' ? '전체 지표 검증' : 'Fully Verified'}</span>
                <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{season.reportedCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 block">{language === 'ko' ? '일부 지표 반영' : 'Partial'}</span>
                <span className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">{season.partialCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 block">{language === 'ko' ? '데이터 누락/대기' : 'Pending Ingestion'}</span>
                <span className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400">{season.publishedPendingDataCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60">
                <span className="text-[10px] text-sky-700 dark:text-sky-400 block">{language === 'ko' ? '공시 예정' : 'Scheduled'}</span>
                <span className="text-base font-extrabold font-mono text-sky-600 dark:text-sky-400">{season.scheduledCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">{language === 'ko' ? '공시 여부 미확인' : 'Unconfirmed'}</span>
                <span className="text-base font-extrabold font-mono text-slate-400">{season.unconfirmedCount}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">{language === 'ko' ? '제조사' : 'Automaker'}</th>
                <th className="py-2.5 px-3">{language === 'ko' ? '공시 상태' : 'Status'}</th>
                <th className="py-2.5 px-3 text-center">{language === 'ko' ? '인도량' : 'Deliveries'}</th>
                <th className="py-2.5 px-3 text-center">{language === 'ko' ? '매출액' : 'Revenue'}</th>
                <th className="py-2.5 px-3 text-center">{language === 'ko' ? '영업이익' : 'EBIT'}</th>
                <th className="py-2.5 px-3 text-center">{language === 'ko' ? '영업이익률' : 'Margin'}</th>
                <th className="py-2.5 px-3 text-center">{language === 'ko' ? '전기차(BEV)' : 'BEV'}</th>
                <th className="py-2.5 px-3 text-center">{language === 'ko' ? '순이익' : 'Net Income'}</th>
                <th className="py-2.5 px-3 text-right">{language === 'ko' ? '커버리지' : 'Coverage'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {companies.map((c) => {
                const freshness = getCompanyDataFreshness(c.id, '2026-Q3');
                const obs = METRIC_OBSERVATIONS.filter((o) => o.companyId === c.id && o.period === '2026-Q3' && o.value !== null);

                const hasDel = obs.some((o) => o.metricId === 'deliveries_global');
                const hasRev = obs.some((o) => o.metricId === 'revenue');
                const hasEbit = obs.some((o) => o.metricId === 'operating_income');
                const hasMargin = obs.some((o) => o.metricId === 'operating_margin');
                const hasBev = obs.some((o) => o.metricId === 'bev_deliveries');
                const hasNet = obs.some((o) => o.metricId === 'net_income');

                // Determine applicability
                const isByd = c.id === 'byd';
                const isScheduled = freshness.status === 'scheduled';

                const renderCell = (present: boolean, notApplicable = false) => {
                  if (isScheduled) return <span className="text-slate-400 font-mono text-[11px]">⏳</span>;
                  if (notApplicable) return <span className="text-slate-400 font-mono text-[10px]">⊘ N/A</span>;
                  if (present) return <span className="text-emerald-600 font-bold text-xs">✓</span>;
                  return <span className="text-amber-500 font-semibold text-[11px]">⚠ 미반영</span>;
                };

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      <Link to={`/companies/${c.id}`} className="hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5">
                        <span>{c.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({getCompanyById(c.id)?.ticker || c.id})</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        freshness.status === 'verified_official'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : freshness.status === 'scheduled'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                          : freshness.status === 'published_pending_data'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {freshness.status === 'verified_official' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {freshness.status === 'scheduled' && <Clock className="w-3 h-3 text-sky-600" />}
                        <span>{language === 'ko' ? freshness.statusLabelKo : freshness.statusLabelEn}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">{renderCell(hasDel)}</td>
                    <td className="py-2.5 px-3 text-center">{renderCell(hasRev)}</td>
                    <td className="py-2.5 px-3 text-center">{renderCell(hasEbit, isByd)}</td>
                    <td className="py-2.5 px-3 text-center">{renderCell(hasMargin, isByd)}</td>
                    <td className="py-2.5 px-3 text-center">{renderCell(hasBev)}</td>
                    <td className="py-2.5 px-3 text-center">{renderCell(hasNet, !['byd', 'kia'].includes(c.id))}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {freshness.requiredMetricsCoverage ? (
                        <span className="text-slate-800 dark:text-slate-200">
                          {freshness.requiredMetricsCoverage.ratio}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  })()}

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
                          {status === 'scheduled' && (
                            <span
                              title={cell?.sourceTitle || (language === 'ko' ? '공시 예정' : 'Scheduled')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[10px] font-semibold transition-all shadow-xs cursor-default"
                            >
                              <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                              <span>{language === 'ko' ? '공시 예정' : 'Scheduled'}</span>
                            </span>
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
