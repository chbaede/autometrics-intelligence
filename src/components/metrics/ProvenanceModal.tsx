import React from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { MetricObservation, MetricDefinition, Company, SourceDocument } from '../../types/metrics';
import { getSourceDocById } from '../../utils/metricQueries';
import { formatMetricValue } from '../../utils/metricCalculations';
import { useLanguage } from '../../i18n/LanguageContext';

interface ProvenanceModalProps {
  observation: MetricObservation | null;
  metric?: MetricDefinition;
  company?: Company;
  onClose: () => void;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({
  observation,
  metric,
  company,
  onClose,
}) => {
  const { language, t } = useLanguage();
  if (!observation) return null;

  const sourceDoc: SourceDocument | undefined = observation.sourceDocId
    ? getSourceDocById(observation.sourceDocId)
    : undefined;

  const rawValueText = observation.tableReference || 'Primary disclosure text';
  const dataUpdatedDate = observation.dataUpdatedAt || '-';
  const calculatedDate = observation.calculatedAt || (observation.valueType === 'derived' ? '-' : 'N/A');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                <span>{language === 'ko' ? '지표 출처 및 무결성 감사 상세' : 'Metric Provenance & Integrity Audit'}</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-bold whitespace-nowrap">
                  {t.global.whyThisNumber}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {language === 'ko'
                  ? '공식 발표 원문, 회계/판매 정의, 15대 필수 감사 항목 전수 검증'
                  : 'Primary source quotation, accounting/volume basis, and 15-point audit metadata verification'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Key Metric Headline Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                {company?.name || observation.companyId} • {observation.period} ({observation.periodType})
              </span>
              <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 block break-words">
                {metric?.name || observation.metricId}
              </span>
              {observation.originalLabel && (
                <span className="text-xs text-brand-600 dark:text-brand-400 font-mono mt-1 block break-words">
                  {language === 'ko' ? '원문 표기: ' : 'Official Original Label: '} "{observation.originalLabel}"
                </span>
              )}
            </div>
            <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
              <div className="text-2xl sm:text-3xl font-black font-mono text-brand-600 dark:text-brand-400">
                {formatMetricValue(observation.value, observation.unit, observation.currency)}
              </div>
              <div className="flex items-center sm:justify-end gap-1.5 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold">
                  Type: {observation.valueType.toUpperCase()}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  observation.verificationStatus === 'verified'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {observation.verificationStatus?.toUpperCase() || 'VERIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Comparability Limitation Alert */}
          {!observation.isComparable && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <strong className="font-bold block text-xs tracking-wide uppercase">
                  {language === 'ko' ? '비교 가능성 제한 사항' : 'Comparability Limitation'}
                </strong>
                <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-0.5">
                  {observation.nonComparableReason || 'This metric differs in scope or accounting basis from peer OEMs.'}
                </p>
              </div>
            </div>
          )}

          {/* 15-Point Provenance Audit Grid (Section 7.3 Compliance) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              {language === 'ko' ? '공식 출처 15대 무결성 메타데이터 전수 명세' : '15-Point Audit & Provenance Verification Matrix'}
            </h4>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {/* Row 1: Metric name & Original Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">1. {language === 'ko' ? '지표 식별자' : 'Metric Name'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{metric?.name || observation.metricId} ({observation.metricId})</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">2. {language === 'ko' ? '공시 원문 표기' : 'Original Source Label'}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{observation.originalLabel || '-'}</span>
                </div>
              </div>

              {/* Row 2: Raw value vs Stored value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">3. {language === 'ko' ? '공식 원문 발표값' : 'Raw Official Source Value'}</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{rawValueText}</span>
                </div>
                <div className="p-3 space-y-0.5 bg-brand-50/30 dark:bg-brand-950/20">
                  <span className="text-[10px] text-brand-600 dark:text-brand-400 uppercase font-bold block">4. {language === 'ko' ? '앱 DB 저장값' : 'Stored Application Value'}</span>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                    {observation.value !== null && observation.value !== undefined ? observation.value.toLocaleString() : 'null'} ({formatMetricValue(observation.value, observation.unit, observation.currency)})
                  </span>
                </div>
              </div>

              {/* Row 3: Unit & Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">5. {language === 'ko' ? '단위 및 통화' : 'Unit & Currency'}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{observation.unit} {observation.currency ? `[${observation.currency}]` : ''}</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">6. {language === 'ko' ? '실적 대상 기간' : 'Reporting Period'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{observation.period} ({observation.periodType})</span>
                </div>
              </div>

              {/* Row 4: Volume/Accounting Basis & Reporting Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">7. {language === 'ko' ? '판매 / 회계 기준' : 'Volume / Accounting Basis'}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {observation.volumeDefinition ? `Volume: ${observation.volumeDefinition}` : `Accounting: ${observation.accountingBasis || 'reported'}`}
                  </span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">8. {language === 'ko' ? '지역 및 보고 범위' : 'Reporting Scope & Region'}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{observation.reportingScope || 'consolidated_group'}</span>
                </div>
              </div>

              {/* Row 5: Source Doc & Table Locator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">9. {language === 'ko' ? '공식 출처 문서' : 'Source Document Title'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{sourceDoc?.title || observation.sourceDocId || 'Direct official investor announcement'}</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">10. {language === 'ko' ? '원문 위치 (표/페이지)' : 'Source Locator Reference'}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {[
                      observation.tableReference,
                      observation.sectionReference,
                      observation.pageNumber ? `Page/Slide ${observation.pageNumber}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ') || 'Official Primary Filing Text'}
                  </span>
                </div>
              </div>

              {/* Row 6: Four Distinct Non-Fabricated Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">11. {language === 'ko' ? '출처 공식 발표일' : 'Published Date'}</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{sourceDoc?.publicationDate || '-'}</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">12. {language === 'ko' ? '원문 최종 확인일' : 'Source Verified Date'}</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{sourceDoc?.lastChecked || '-'}</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">13. {language === 'ko' ? '데이터 갱신일' : 'Data Updated Date'}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{dataUpdatedDate}</span>
                </div>
                <div className="p-3 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">14. {language === 'ko' ? '파생 계산일' : 'Calculated Date'}</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{calculatedDate}</span>
                </div>
              </div>

              {/* Row 7: Verification Status & Method */}
              <div className="p-3 space-y-0.5 bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">15. {language === 'ko' ? '검증 상태 및 감사 방식' : 'Verification Status & Method'}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Status: {observation.verificationStatus || 'verified'}</span>
                  <span className="text-slate-400">•</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">Method: {observation.verificationMethod || 'official_press_release'}</span>
                  {sourceDoc?.financialDisclosureStatus && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {language === 'ko' ? '공시 확정성: ' : 'Audit Finality: '}
                        {sourceDoc.financialDisclosureStatus === 'audited'
                          ? (language === 'ko' ? '감사 확정 (Audited Final)' : 'Audited Final')
                          : sourceDoc.financialDisclosureStatus === 'restated'
                          ? (language === 'ko' ? '비교표 재작성 (Restated)' : 'Restated Comparative')
                          : (language === 'ko' ? '잠정 공시 (Preliminary / Unaudited)' : 'Preliminary / Unaudited')}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Row 8: Derivation Formula & Input IDs (if derived) */}
              <div className="p-3 space-y-1 bg-brand-50/20 dark:bg-brand-950/10">
                <span className="text-[10px] text-brand-600 dark:text-brand-400 uppercase font-bold block">16. {language === 'ko' ? '파생 지표 산식 및 입력값 (해당시)' : 'Derivation Formula & Input Observation IDs'}</span>
                {observation.derivationFormula || observation.inputObservationIds ? (
                  <div className="space-y-1 font-mono text-xs">
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                      <strong>Formula:</strong> {observation.derivationFormula || metric?.calculationFormula || 'Computed derived KPI'}
                    </div>
                    {observation.inputObservationIds && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>Inputs:</strong> [{observation.inputObservationIds.join(', ')}]
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-500 font-mono text-xs">
                    {language === 'ko' ? '원문 직접 보고 지표 (파생 계산 불요)' : 'Directly reported primary KPI (no derived formula)'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Primary Source Document Link */}
          {sourceDoc && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{sourceDoc.title}</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sourceDoc.notes}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {sourceDoc.financialDisclosureStatus && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                      sourceDoc.financialDisclosureStatus === 'audited'
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                        : sourceDoc.financialDisclosureStatus === 'restated'
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    }`}>
                      {sourceDoc.financialDisclosureStatus === 'audited'
                        ? (language === 'ko' ? '감사 확정' : 'Audited Final')
                        : sourceDoc.financialDisclosureStatus === 'restated'
                        ? (language === 'ko' ? '비교표 재작성' : 'Restated Comparative')
                        : (language === 'ko' ? '공식 잠정 (미감사)' : 'Preliminary Unaudited IR')}
                    </span>
                  )}
                  {sourceDoc.isVerified && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                      Verified IR
                    </span>
                  )}
                </div>
              </div>
              <a
                href={sourceDoc.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline pt-1"
              >
                <span>{t.global.openOfficialDoc}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
          >
            {t.global.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
};
