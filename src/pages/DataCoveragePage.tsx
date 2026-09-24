import React from 'react';
import { getDataQualityReport, getCoverageMatrix } from '../utils/metricQueries';
import {
  TableProperties,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  Clock,
  Database,
} from 'lucide-react';

export const DataCoveragePage: React.FC = () => {
  const qualityReport = getDataQualityReport();
  const { companies, periods, matrix } = getCoverageMatrix();

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <TableProperties className="w-4 h-4" /> Data Integrity & Provenance Transparency
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Data Coverage & Quality Matrix
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          Full public audit disclosure of coverage breadth, verified source linkages, and accounting comparability across global automotive corporations.
        </p>
      </div>

      {/* Quality Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">Total Observations</span>
            <Database className="w-4 h-4 text-brand-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-100">
            {qualityReport.totalObservations}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Verified data points</span>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">Verified IR Sources</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {qualityReport.verifiedSourcesRatio}%
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Direct official links</span>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">Guidance Targets</span>
            <FileCheck2 className="w-4 h-4 text-brand-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-100">
            {qualityReport.totalGuidanceObservations}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">FY2025 Outlook Records</span>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">Last Audited</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-100">
            {qualityReport.lastUpdated}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Q1 2025 Reporting Cycle</span>
        </div>
      </div>

      {/* Coverage Matrix Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-brand-400" />
              Automaker Reporting Period Availability Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Status of verified data points across reporting quarters and full-year statements
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Available
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Special Scope
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <XCircle className="w-3.5 h-3.5" /> Non-Quarterly
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Automaker</th>
                {periods.map((p) => (
                  <th key={p} className="px-4 py-3 text-center">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-mono">
              {companies.map((comp) => (
                <tr key={comp.id} className="hover:bg-slate-850/50">
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    {comp.name}
                  </td>
                  {periods.map((p) => {
                    const status = matrix[comp.id]?.[p] || 'missing';
                    return (
                      <td key={p} className="px-4 py-3 text-center">
                        {status === 'available' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Available
                          </span>
                        )}
                        {status === 'non_comparable' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> Scope Note
                          </span>
                        )}
                        {status === 'missing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800 text-[10px]">
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
      <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
          Commitment to Zero Fabricated Data
        </h3>
        <p className="text-slate-400 leading-relaxed">
          AutoMetrics Intelligence never estimates or interpolates missing quarterly figures without explicit notice. If an OEM only publishes semi-annual or annual statements, interim quarters are transparently marked as "Not reported". Every calculation formula is mathematically bounded and unit-tested before rendering.
        </p>
      </div>
    </div>
  );
};

