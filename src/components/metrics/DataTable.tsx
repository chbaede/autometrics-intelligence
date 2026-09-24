import React, { useState } from 'react';
import { Download, HelpCircle, AlertTriangle, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import { MetricObservation, Company } from '../../types/metrics';
import { formatMetricValue } from '../../utils/metricCalculations';
import { getCompanyById } from '../../utils/metricQueries';
import { useLanguage } from '../../i18n/LanguageContext';

interface DataTableProps {
  title: string;
  subtitle?: string;
  observations: MetricObservation[];
  onSelectObservation?: (obs: MetricObservation) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  title,
  subtitle,
  observations,
  onSelectObservation,
}) => {
  const { language } = useLanguage();
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const populatedData = observations.map((obs) => ({
    company: getCompanyById(obs.companyId) || ({
      id: obs.companyId,
      name: obs.companyId,
      shortName: obs.companyId,
      hqCountry: '',
      hqCity: '',
      website: '',
      irUrl: '',
      region: 'global',
      reportingCurrency: obs.currency || 'USD',
      fiscalYearEnd: '12-31',
      supportedDocuments: [],
      description: '',
    } as unknown as Company),
    observation: obs,
  }));

  const sortedData = [...populatedData].sort((a, b) => {
    const valA = a.observation.value ?? -Infinity;
    const valB = b.observation.value ?? -Infinity;
    return sortAsc ? valA - valB : valB - valA;
  });

  const exportCSV = () => {
    const headers = ['Company', 'Metric', 'Period', 'Reported Value', 'Unit', 'Currency', 'Comparable', 'Source ID'];
    const rows = sortedData.map((item) => [
      item.company.name,
      item.observation.metricId,
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
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col space-y-4">
      {/* Header with Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold">
              {sortedData.length} records
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortAsc ? '오름차순 (Asc)' : '내림차순 (Desc)'}</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-lg border border-brand-200 dark:border-brand-800 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition shadow-xs"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Accessible Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">{language === 'ko' ? '제조사 (OEM)' : 'Company'}</th>
              <th className="px-4 py-3">{language === 'ko' ? '지표 항목' : 'Metric'}</th>
              <th className="px-4 py-3">{language === 'ko' ? '공시 주기' : 'Period'}</th>
              <th className="px-4 py-3 text-right">{language === 'ko' ? '공시 실적 수치' : 'Reported Value'}</th>
              <th className="px-4 py-3">{language === 'ko' ? '회계 기준 및 단위' : 'Basis & Unit'}</th>
              <th className="px-4 py-3 text-center">{language === 'ko' ? '출처 감사' : 'Provenance'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {sortedData.map((item) => {
              const val = item.observation.value;
              const curr = item.observation.currency || item.company.reportingCurrency;

              return (
                <tr
                  key={item.observation.id}
                  onClick={() => onSelectObservation?.(item.observation)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    <div className="flex items-center gap-2">
                      <span>{item.company.name}</span>
                      {!item.observation.isComparable && (
                        <span
                          title={item.observation.nonComparableReason}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 font-semibold"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" /> Non-comp
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                    {item.observation.originalLabel || item.observation.metricId}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                    {item.observation.period}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatMetricValue(val, item.observation.unit, curr)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {curr} • {item.observation.valueType}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
                      title={language === 'ko' ? '공시 원문 및 산식 감사' : 'Inspect Source & Calculation'}
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
