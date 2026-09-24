import React, { useState, useMemo } from 'react';
import { Download, HelpCircle, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

type SortField = 'company' | 'metric' | 'period' | 'value';

export const DataTable: React.FC<DataTableProps> = ({
  title,
  subtitle,
  observations,
  onSelectObservation,
}) => {
  const { language } = useLanguage();
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const populatedData = useMemo(() => {
    return observations.map((obs) => ({
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
  }, [observations]);

  // Filter and Sort Data
  const processedData = useMemo(() => {
    let result = [...populatedData];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.company.name.toLowerCase().includes(q) ||
          item.observation.metricId.toLowerCase().includes(q) ||
          (item.observation.originalLabel && item.observation.originalLabel.toLowerCase().includes(q)) ||
          item.observation.period.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'company') {
        comparison = a.company.name.localeCompare(b.company.name);
        if (comparison === 0) {
          comparison = a.observation.metricId.localeCompare(b.observation.metricId);
        }
      } else if (sortField === 'metric') {
        comparison = (a.observation.originalLabel || a.observation.metricId).localeCompare(
          b.observation.originalLabel || b.observation.metricId
        );
      } else if (sortField === 'period') {
        comparison = a.observation.period.localeCompare(b.observation.period);
      } else if (sortField === 'value') {
        const valA = a.observation.value ?? -Infinity;
        const valB = b.observation.value ?? -Infinity;
        comparison = valA - valB;
      }

      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [populatedData, searchQuery, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'company' ? true : false);
    }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const headers = ['Company', 'Metric', 'Period', 'Reported Value', 'Unit', 'Currency', 'Comparable', 'Source ID'];
    const rows = processedData.map((item) => [
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
    const jsonStr = JSON.stringify(processedData, null, 2);
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
      {/* Header with Search and Export Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-bold">
              {processedData.length} {language === 'ko' ? '건 공시' : 'records'}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Search Input & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={language === 'ko' ? '제조사 또는 지표명 검색...' : 'Search OEM or metric...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 w-48 sm:w-56"
            />
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-xl border border-brand-200 dark:border-brand-800/80 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition shadow-xs"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Accessible Table with Sortable Column Headers */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
            <tr>
              <th
                onClick={() => handleSort('company')}
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-1">
                  <span>{language === 'ko' ? '제조사 (OEM)' : 'Company'}</span>
                  {sortField === 'company' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-brand-500" /> : <ArrowDown className="w-3 h-3 text-brand-500" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('metric')}
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-1">
                  <span>{language === 'ko' ? '지표 항목' : 'Metric'}</span>
                  {sortField === 'metric' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-brand-500" /> : <ArrowDown className="w-3 h-3 text-brand-500" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('period')}
                className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-1">
                  <span>{language === 'ko' ? '공시 주기' : 'Period'}</span>
                  {sortField === 'period' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-brand-500" /> : <ArrowDown className="w-3 h-3 text-brand-500" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('value')}
                className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{language === 'ko' ? '공시 실적 수치' : 'Reported Value'}</span>
                  {sortField === 'value' ? (
                    sortAsc ? <ArrowUp className="w-3 h-3 text-brand-500" /> : <ArrowDown className="w-3 h-3 text-brand-500" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3">{language === 'ko' ? '회계 기준 및 단위' : 'Basis & Unit'}</th>
              <th className="px-4 py-3 text-center">{language === 'ko' ? '출처 감사' : 'Provenance'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  {language === 'ko' ? '검색 조건과 일치하는 공시 데이터가 없습니다.' : 'No matching disclosures found.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
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
                            <AlertTriangle className="w-2.5 h-2.5" /> Scope
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>
            {language === 'ko' ? '페이지당 표시:' : 'Rows per page:'}
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            aria-label="Rows per page"
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 font-mono"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="font-mono">
            ({(currentPage - 1) * pageSize + 1} – {Math.min(currentPage * pageSize, processedData.length)} / {processedData.length})
          </span>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono px-2 text-slate-700 dark:text-slate-300 font-bold">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
