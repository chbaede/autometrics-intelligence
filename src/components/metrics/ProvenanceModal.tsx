import { X, ExternalLink, ShieldCheck, AlertTriangle, FileText, Calendar, Calculator } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {language === 'ko' ? '데이터 감사 및 공시 출처 검증' : 'Data Provenance & Source Audit'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-bold">
                  {t.global.whyThisNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ko' ? '투명한 산식, 공시 원문 인용 및 비교가능성 검증' : 'Transparent calculation method, source citation, and comparability disclosure'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Key Value Highlight Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                {company?.name || observation.companyId} • {observation.period}
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 block">
                {metric?.name || observation.metricId}
              </span>
              {observation.originalLabel && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 block">
                  {t.global.originalLabel}: "{observation.originalLabel}"
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-mono text-brand-600 dark:text-brand-400">
                {formatMetricValue(observation.value, observation.unit, observation.currency)}
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono inline-block mt-1 font-semibold">
                Type: {observation.valueType.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Comparability Warning if Non-Comparable */}
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

          {/* Calculation Methodology */}
          {metric?.calculationFormula && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                {language === 'ko' ? '산출 공식 및 방법론' : 'Calculation Methodology'}
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                {metric.calculationFormula}
              </div>
            </div>
          )}

          {/* Primary Source Document Citation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              {t.global.sourceCitation}
            </h4>

            {sourceDoc ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {sourceDoc.title}
                    </h5>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Published: {sourceDoc.publicationDate}
                      </span>
                      {observation.pageNumber && (
                        <span>• Page/Slide: {observation.pageNumber}</span>
                      )}
                    </div>
                  </div>
                  {sourceDoc.isVerified && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                      Verified IR
                    </span>
                  )}
                </div>

                {sourceDoc.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    {sourceDoc.notes}
                  </p>
                )}

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
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Source Document ID: {observation.sourceDocId || 'Direct official investor announcement'}
              </div>
            )}
          </div>
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
