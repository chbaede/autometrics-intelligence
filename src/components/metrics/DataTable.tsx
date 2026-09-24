import React, { useState } from 'react';
import { Download, HelpCircle, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { MetricObservation, Company } from '../../types/metrics';
import { formatMetricValue } from '../../utils/metricCalculations';

interface DataTableProps {
  title: string;
  observations: {
    company: Company;
    observation: MetricObservation;
  }[];
  unit: string;
  onSelectObservation?: (obs: MetricObservation) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  title,
  observations,
  unit,
  onSelectObservation,
}) => {
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sortedData = [...observations].sort((a, b) => {
    const valA = a.observation.value ?? -Infinity;
    const valB = b.observation.value ?? -Infinity;
    return sortAsc ? valA - valB : valB - valA;
  });

  const exportCSV = () => {
    const headers = ['Company', 'Period', 'Metric Value', 'Unit', 'Currency', 'Comparable', 'Source Document'];
    const rows = sortedData.map((item) => [
      item.company.name,
      item.observation.period,
      item.observation.value ?? 'Not reported',
      item.observation.unit,
      item.observation.currency || item.company.reportingCurrency,
      item.observation.isComparable ? 'Yes' : 'No',
      item.observation.sourceDocId || 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const jsonStr = JSON.stringify(sortedData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_data.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 shadow-md flex flex-col space-y-3">
      {/* Header with Export Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          {title}
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            {sortedData.length} records
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 rounded border border-slate-800 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort {sortAsc ? 'Asc' : 'Desc'}</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded border border-brand-500/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Accessible Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-2.5">Company</th>
              <th className="px-4 py-2.5">Period</th>
              <th className="px-4 py-2.5 text-right">Reported Value</th>
              <th className="px-4 py-2.5">Accounting Basis</th>
              <th className="px-4 py-2.5 text-center">Provenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {sortedData.map((item) => {
              const val = item.observation.value;
              const curr = item.observation.currency || item.company.reportingCurrency;

              return (
                <tr
                  key={item.observation.id}
                  onClick={() => onSelectObservation?.(item.observation)}
                  className="hover:bg-slate-850/60 transition cursor-pointer group"
                >
                  <td className="px-4 py-3 font-medium text-slate-200 group-hover:text-brand-400">
                    <div className="flex items-center gap-2">
                      <span>{item.company.name}</span>
                      {!item.observation.isComparable && (
                        <span
                          title={item.observation.nonComparableReason}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" /> Non-comp
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                    {item.observation.period}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">
                    {formatMetricValue(val, unit, curr)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {curr} • {item.observation.valueType}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="p-1 text-slate-400 hover:text-brand-400 transition"
                      title="Inspect Source & Calculation"
                    >
                      <HelpCircle className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

