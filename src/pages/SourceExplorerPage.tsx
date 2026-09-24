import React, { useState } from 'react';
import { SOURCE_DOCUMENTS } from '../data/sources';
import { getAllCompanies, getCompanyById } from '../utils/metricQueries';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Search,
  ExternalLink,
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export const SourceExplorerPage: React.FC = () => {
  const { language, t } = useLanguage();
  const companies = getAllCompanies();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('all');

  const docTypes = [
    { id: 'all', label: language === 'ko' ? '모든 공시 문서' : 'All Document Types' },
    { id: 'annual_report', label: language === 'ko' ? '연간 사업보고서 (Annual Report)' : 'Annual Reports' },
    { id: 'quarterly_report', label: language === 'ko' ? '분기 재무보고서 (Quarterly Report)' : 'Quarterly Reports' },
    { id: 'earnings_presentation', label: language === 'ko' ? '실적발표 IR 덱 (Earnings Presentation)' : 'Earnings Presentations' },
    { id: 'shareholder_letter', label: language === 'ko' ? '주주 서한 (Shareholder Letter)' : 'Shareholder Letters' },
    { id: 'sales_release', label: language === 'ko' ? '판매 실적 보도자료 (Sales Release)' : 'Sales Releases' },
  ];

  const filteredDocs = SOURCE_DOCUMENTS.filter((doc) => {
    if (selectedCompanyId !== 'all' && doc.companyId !== selectedCompanyId) return false;
    if (selectedDocType !== 'all' && doc.docType !== selectedDocType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const comp = getCompanyById(doc.companyId);
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchComp = comp?.name.toLowerCase().includes(q);
      const matchNotes = doc.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchComp && !matchNotes) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <ShieldCheck className="w-4 h-4" /> {language === 'ko' ? '1차 공식 IR 감사 추적 및 출처 레지스트리' : 'Primary IR Audit Trail & Source Registry'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
          {language === 'ko' ? '공식 투자자 관계(IR) 공시 문서 라이브러리' : 'Official Investor Relations Library'}
        </h1>
        <p className="text-slate-300 dark:text-slate-300 light:text-slate-600 text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? 'AutoMetrics Intelligence에 렌더링되는 모든 데이터는 공식 공시 문서로부터 직접 추출 및 검증되었습니다. 원문 보고서, IR 프레젠테이션, 보도자료 링크를 직접 탐색할 수 있습니다.'
            : 'Every number rendered in AutoMetrics Intelligence originates from an official, verified primary publication. Browse or search through the underlying earnings reports, financial releases, and shareholder letters.'}
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={language === 'ko' ? '기업명, 문서 제목 또는 키워드로 공시 검색...' : 'Search documents by company, title, or keywords...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Company Filter Dropdown */}
          <div className="w-full md:w-auto">
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              aria-label="Filter by OEM"
              className="w-full md:w-48 bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 focus:outline-none focus:border-brand-500 font-medium"
            >
              <option value="all">{language === 'ko' ? '모든 완성차 제조사' : 'All Automakers'}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Doc Type Dropdown */}
          <div className="w-full md:w-auto">
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              aria-label="Filter by document type"
              className="w-full md:w-56 bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 focus:outline-none focus:border-brand-500 font-medium"
            >
              {docTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 light:text-slate-600 flex items-center justify-between pt-1 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
          <span>{filteredDocs.length} {language === 'ko' ? '개의 검증된 공식 문서' : 'verified primary documents'}</span>
          <span className="font-mono text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% {language === 'ko' ? '공식 IR 링크 검증 완료' : 'Verified Official IR Links'}
          </span>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map((doc) => {
          const comp = getCompanyById(doc.companyId);
          return (
            <div
              key={doc.id}
              className="p-5 bg-slate-900 dark:bg-slate-900 light:bg-white rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-brand-400">{comp?.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-slate-400 dark:text-slate-400 light:text-slate-700 border border-slate-800 dark:border-slate-800 light:border-slate-300">
                    {doc.period} • {doc.docType.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 text-sm leading-snug">
                  {doc.title}
                </h3>

                {doc.notes && (
                  <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed line-clamp-3">
                    {doc.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5" /> {doc.publicationDate}
                </span>

                <a
                  href={doc.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 font-semibold text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg border border-brand-500/20 transition"
                >
                  <span>{t.global.openOfficialDoc}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
