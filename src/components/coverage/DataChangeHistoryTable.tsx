import React, { useState, useMemo } from 'react';
import { DATA_CHANGE_HISTORY, ChangeCategory } from '../../data/dataChangeHistory';
import { getAllCompanies, getCompanyById } from '../../utils/metricQueries';
import { SOURCES_MAP } from '../../data/sources';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  History,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export const DataChangeHistoryTable: React.FC = () => {
  const { language } = useLanguage();
  const allCompanies = getAllCompanies();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: { id: string; labelKo: string; labelEn: string }[] = [
    { id: 'all', labelKo: '전체 변경 유형', labelEn: 'All Categories' },
    { id: 'new_quarterly_data', labelKo: '신규 분기 공시 데이터 반영', labelEn: 'New Quarterly Data' },
    { id: 'guidance_change', labelKo: '공식 가이던스 수정/재확인', labelEn: 'Guidance Revision' },
    { id: 'restatement', labelKo: '공식 재무제표 재작성 (Restatement)', labelEn: 'Official Restatement' },
    { id: 'scope_clarification', labelKo: '공시 기준/세그먼트 정밀 분류', labelEn: 'Scope Clarification' },
    { id: 'source_replacement', labelKo: '1차 원문 출처 문서 갱신', labelEn: 'Source Document Replacement' },
    { id: 'methodology_change', labelKo: '지표 산출 방법론 개선', labelEn: 'Methodology Refinement' },
    { id: 'coverage_expansion', labelKo: '역사적 데이터 커버리지 확장', labelEn: 'Coverage Expansion' },
  ];

  const filteredRecords = useMemo(() => {
    return DATA_CHANGE_HISTORY.filter((rec) => {
      if (selectedCompanyId !== 'all' && rec.companyId !== selectedCompanyId && rec.companyId !== 'all_companies') {
        return false;
      }
      if (selectedCategory !== 'all' && rec.changeCategory !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const reason = (language === 'ko' ? rec.reasonKo : rec.reasonEn).toLowerCase();
        const comp = getCompanyById(rec.companyId);
        const compName = (comp?.name || rec.companyId).toLowerCase();
        const metric = rec.metricId.toLowerCase();
        if (!reason.includes(q) && !compName.includes(q) && !metric.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCompanyId, selectedCategory, searchQuery, language]);

  const renderCategoryBadge = (cat: ChangeCategory) => {
    switch (cat) {
      case 'new_quarterly_data':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" />
            <span>{language === 'ko' ? '신규 분기 실적' : 'New Q3 Data'}</span>
          </span>
        );
      case 'guidance_change':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
            <TrendingDown className="w-3 h-3" />
            <span>{language === 'ko' ? '가이던스 수정' : 'Guidance Revision'}</span>
          </span>
        );
      case 'restatement':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" />
            <span>{language === 'ko' ? '실적 재작성' : 'Restatement'}</span>
          </span>
        );
      case 'scope_clarification':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
            <ShieldCheck className="w-3 h-3" />
            <span>{language === 'ko' ? '공시 기준 분류' : 'Scope Clarification'}</span>
          </span>
        );
      case 'source_replacement':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">
            <BookOpen className="w-3 h-3" />
            <span>{language === 'ko' ? '원문 출처 갱신' : 'Source Update'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            <span>{cat}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-6 space-y-4 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {language === 'ko' ? '공식 데이터 변경 및 갱신 이력 (Data Change History)' : 'Data Change History & Audit Ledger'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'ko'
              ? '신규 분기 실적 반영, 공식 가이던스 수정, 회계 세그먼트 정밀 분류 등 플랫폼의 모든 데이터 변경 내역을 1차 IR 공시 원문 링크와 함께 엄격히 관리합니다.'
              : 'Curated audit trail tracking all substantive quarterly additions, official guidance revisions, and scope adjustments with verified IR links.'}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Company Filter */}
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
          >
            <option value="all">{language === 'ko' ? '전체 제조사' : 'All Automakers'}</option>
            {allCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {language === 'ko' ? cat.labelKo : cat.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            language === 'ko'
              ? '변경 사유, 지표명, 기업명으로 검색...'
              : 'Search by reason, metric, or company name...'
          }
          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
        />
      </div>

      {/* Audit Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[850px] text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-28">{language === 'ko' ? '변경 일자' : 'Date'}</th>
              <th className="py-3 px-3 w-36">{language === 'ko' ? '제조사' : 'OEM'}</th>
              <th className="py-3 px-3 w-36">{language === 'ko' ? '지표 / 주기' : 'Metric & Period'}</th>
              <th className="py-3 px-3 w-32">{language === 'ko' ? '변경 유형' : 'Category'}</th>
              <th className="py-3 px-3 w-48">{language === 'ko' ? '이전 값 → 갱신 값' : 'Previous → New'}</th>
              <th className="py-3 px-3">{language === 'ko' ? '공식 변경 사유 및 근거' : 'Official Reason & Evidence'}</th>
              <th className="py-3 px-3 w-36 text-center">{language === 'ko' ? '1차 공시 출처' : 'Primary Source'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.map((rec) => {
              const comp = getCompanyById(rec.companyId);
              const sourceDoc = SOURCES_MAP[rec.sourceDocId];

              return (
                <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Date & Mode Badge */}
                  <td className="py-3 px-3 font-mono font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <div>{rec.changeDate}</div>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-semibold inline-block mt-0.5 ${
                        rec.isReconstructed
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {rec.isReconstructed
                        ? language === 'ko' ? '소급 검증' : 'Reconstructed'
                        : language === 'ko' ? '당기 공시' : 'Prospective Record'}
                    </span>
                  </td>

                  {/* OEM */}
                  <td className="py-3 px-3 font-medium">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {comp ? comp.name : rec.companyId === 'all_companies' ? '전체 공통 (All OEMs)' : rec.companyId}
                    </span>
                  </td>

                  {/* Metric & Period */}
                  <td className="py-3 px-3">
                    <div className="flex flex-col font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {rec.metricId}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {rec.period}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3">
                    {renderCategoryBadge(rec.changeCategory)}
                  </td>

                  {/* Previous -> New Value */}
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 line-through">
                        {rec.previousValue !== null ? String(rec.previousValue) : '신규(New)'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-brand-600 dark:text-brand-400">
                        {String(rec.newValue)}
                      </span>
                    </div>
                  </td>

                  {/* Reason & Evidence */}
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    <p className="leading-relaxed">
                      {language === 'ko' ? rec.reasonKo : rec.reasonEn}
                    </p>
                    {rec.comparabilityNotesKo && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block">
                        ℹ️ {language === 'ko' ? rec.comparabilityNotesKo : rec.comparabilityNotesEn}
                      </span>
                    )}
                  </td>

                  {/* Clickable Source Document */}
                  <td className="py-3 px-3 text-center font-mono text-[10px]">
                    {sourceDoc ? (
                      <a
                        href={sourceDoc.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-500/10 text-slate-700 dark:text-slate-300 hover:text-brand-600 transition"
                        title={`${sourceDoc.title} (${rec.pageOrLocator})`}
                      >
                        <span className="truncate max-w-[90px]">{rec.sourceDocId}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                      </a>
                    ) : (
                      <span className="text-slate-400 truncate max-w-[100px] block">
                        {rec.sourceDocId}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                      {rec.pageOrLocator}
                    </span>
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
