import React from 'react';
import { X, ExternalLink, ShieldCheck, AlertTriangle, FileText, Calendar, Calculator, Info } from 'lucide-react';
import { MetricObservation, MetricDefinition, Company, SourceDocument } from '../../types/metrics';
import { getSourceDocById } from '../../utils/metricQueries';
import { formatMetricValue, getCurrencySymbol } from '../../utils/metricCalculations';

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
  if (!observation) return null;

  const sourceDoc: SourceDocument | undefined = observation.sourceDocId
    ? getSourceDocById(observation.sourceDocId)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Data Provenance & Source Audit
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  Why this number?
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Transparent calculation method, source citation, and comparability disclosure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Key Value Highlight Card */}
          <div className="p-4 rounded-lg bg-slate-850 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                {company?.name || observation.companyId} • {observation.period}
              </span>
              <span className="text-lg font-semibold text-slate-200 block">
                {metric?.name || observation.metricId}
              </span>
              {observation.originalLabel && (
                <span className="text-xs text-slate-400 font-mono mt-1 block">
                  Original Label: "{observation.originalLabel}"
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-brand-400">
                {formatMetricValue(observation.value, observation.unit, observation.currency)}
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono inline-block mt-1">
                Type: {observation.valueType.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Comparability Warning if Non-Comparable */}
          {!observation.isComparable && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="font-semibold block text-xs tracking-wide uppercase">
                  Comparability Limitation
                </strong>
                <p className="text-xs text-amber-200/90 mt-0.5">
                  {observation.nonComparableReason || 'This metric differs in scope or accounting basis from peer OEMs.'}
                </p>
              </div>
            </div>
          )}

          {/* Calculation Formula / Methodology */}
          {metric?.calculationFormula && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-brand-400" />
                Calculation Formula
              </label>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                {metric.calculationFormula}
              </div>
            </div>
          )}

          {/* Metric Definition & Standard Notes */}
          {metric?.comparabilityNotes && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400" />
                Normalization & Standard Definition
              </label>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-850 p-3 rounded-lg border border-slate-800">
                {metric.comparabilityNotes}
              </p>
            </div>
          )}

          {/* Source Document Details */}
          {sourceDoc ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-400" />
                Official Primary Source Reference
              </label>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">{sourceDoc.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Published: {sourceDoc.publicationDate}
                      </span>
                      {observation.pageNumber && (
                        <span>• Page / Slide {observation.pageNumber}</span>
                      )}
                      <span>• Doc Type: {sourceDoc.docType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <a
                    href={sourceDoc.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 rounded-lg transition shrink-0"
                  >
                    <span>View Official IR</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                {sourceDoc.notes && (
                  <p className="text-xs text-slate-400 border-t border-slate-850 pt-2">
                    {sourceDoc.notes}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 text-xs text-slate-400">
              Direct source document metadata unavailable for this entry.
            </div>
          )}

          {/* Reporting Basis & Currency Disclosure */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-850 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Reporting Currency</span>
              <span className="font-semibold text-slate-200 font-mono">
                {observation.currency || company?.reportingCurrency || 'USD'} ({getCurrencySymbol(observation.currency || company?.reportingCurrency || 'USD')})
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-850 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Headquarters & Jurisdiction</span>
              <span className="font-semibold text-slate-200">
                {company?.hqCity}, {company?.hqCountry}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close Audit Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

