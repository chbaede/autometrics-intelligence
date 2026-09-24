import React from 'react';
import { getDataQualityReport, getCoverageMatrix } from '../utils/metricQueries';
import { TermBadge } from '../components/metrics/TermBadge';
import { useLanguage } from '../i18n/LanguageContext';
import {
  TableProperties,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Clock,
  Database,
} from 'lucide-react';

export const DataCoveragePage: React.FC = () => {
  const { language } = useLanguage();
  const qualityReport = getDataQualityReport();
  const { companies, periods, matrix } = getCoverageMatrix();

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <TableProperties className="w-4 h-4" /> {language === 'ko' ? '데이터 무결성 및 공시 투명성' : 'Data Integrity & Provenance Transparency'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '데이터 수집 현황 및 품질 감사 매트릭스' : 'Data Coverage & Quality Matrix'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '글로벌 완성차 기업별 분기/연간 실적 데이터 수집 범위와 검증된 공식 출처 링크를 투명하게 공개합니다.'
            : 'Full public audit disclosure of coverage breadth, verified source linkages, and accounting comparability across global automotive corporations.'}
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
          <span className="text-[11px] text-slate-500 block mt-1">Direct official links</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{language === 'ko' ? '가이던스 목표 레코드' : 'Guidance Targets'}</span>
            <FileCheck2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {qualityReport.totalGuidanceObservations}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">FY2025 Outlook Records</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{language === 'ko' ? '최근 감사 일자' : 'Last Audited'}</span>
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {qualityReport.lastUpdated}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Q2 2026 Reporting Cycle</span>
        </div>
      </div>

      {/* Coverage Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              {language === 'ko' ? '완성차 제조사별 분기 공시 가용성 매트릭스' : 'Automaker Reporting Period Availability Matrix'} (<TermBadge term="OEM" />)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Status of verified data points across reporting quarters and full-year statements
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> {language === 'ko' ? '수집 완료' : 'Available'}
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> {language === 'ko' ? '특수 범위' : 'Special Scope'}
            </span>
            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              {language === 'ko' ? '미보고' : 'N/R (Not Reported)'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">{language === 'ko' ? '완성차 제조사' : 'Automaker'}</th>
                {periods.map((p) => (
                  <th key={p} className="px-4 py-3 text-center">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {companies.map((comp) => (
                <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200 font-sans">
                    {comp.name}
                  </td>
                  {periods.map((p) => {
                    const status = matrix[comp.id]?.[p] || 'missing';
                    return (
                      <td key={p} className="px-4 py-3 text-center">
                        {status === 'available' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Available
                          </span>
                        )}
                        {status === 'non_comparable' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> Scope
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology Commitment */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px]">
          {language === 'ko' ? '가공 및 조작 없는 순수 원문 데이터 원칙' : 'Commitment to Zero Fabricated Data'}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {language === 'ko'
            ? 'AutoMetrics Intelligence는 공시되지 않은 분기 수치를 임의로 보간(Interpolation)하거나 추정하지 않습니다. 반기 또는 연간 보고서만 발행하는 기업의 경우 해당 분기를 투명하게 "미보고(N/R)"로 표기합니다. 모든 지표 산식은 엄격한 단위 테스트를 통과한 수학적 수식만을 적용합니다.'
            : 'AutoMetrics Intelligence never estimates or interpolates missing quarterly figures without explicit notice. If an OEM only publishes semi-annual or annual statements, interim quarters are transparently marked as "Not reported". Every calculation formula is mathematically bounded and unit-tested before rendering.'}
        </p>
      </div>
    </div>
  );
};
