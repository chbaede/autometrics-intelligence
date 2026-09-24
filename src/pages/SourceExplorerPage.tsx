import React, { useState } from 'react';
import { SOURCE_DOCUMENTS } from '../data/sources';
import { getAllCompanies, getCompanyById } from '../utils/metricQueries';
import {
  Search,
  ExternalLink,
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export const SourceExplorerPage: React.FC = () => {
  const companies = getAllCompanies();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('all');

  const docTypes = [
    { id: 'all', label: 'All Document Types' },
    { id: 'annual_report', label: 'Annual Reports' },
    { id: 'quarterly_report', label: 'Quarterly Reports' },
    { id: 'earnings_presentation', label: 'Earnings Presentations' },
    { id: 'shareholder_letter', label: 'Shareholder Letters' },
    { id: 'sales_release', label: 'Sales Releases' },
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <ShieldCheck className="w-4 h-4" /> Primary IR Audit Trail & Source Registry
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Official Investor Relations Library
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          Every number rendered in AutoMetrics Intelligence originates from an official, verified primary publication. Browse or search through the underlying earnings reports, financial releases, and shareholder letters.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents by company, title, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Company Filter Dropdown */}
          <div className="w-full md:w-auto">
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              aria-label="Filter by OEM"
              className="w-full md:w-48 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Automakers</option>
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
              className="w-full md:w-48 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              {docTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span>Showing {filteredDocs.length} verified primary documents</span>
          <span className="font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Verified Official IR Links
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
              className="p-5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-brand-400">{comp?.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {doc.period} • {doc.docType.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-sm leading-snug">
                  {doc.title}
                </h3>

                {doc.notes && (
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {doc.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5" /> {doc.publicationDate}
                </span>

                <a
                  href={doc.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 font-semibold text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg border border-brand-500/20 transition"
                >
                  <span>Open Official Document</span>
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

