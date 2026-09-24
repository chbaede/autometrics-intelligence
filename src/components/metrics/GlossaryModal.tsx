import React, { useState } from 'react';
import { GLOSSARY_TERMS } from '../../data/glossary';
import { useLanguage } from '../../i18n/LanguageContext';
import { X, Search, BookOpen, Layers, DollarSign, FileCheck } from 'lucide-react';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filteredTerms = GLOSSARY_TERMS.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.term.toLowerCase().includes(q) ||
        item.fullName.toLowerCase().includes(q) ||
        item.fullNameKo.toLowerCase().includes(q) ||
        item.definitionEn.toLowerCase().includes(q) ||
        item.definitionKo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'automotive':
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
      case 'financial':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-400" />;
      case 'accounting':
        return <FileCheck className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 dark:border-slate-700 light:border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
                {t.terms.glossaryTitle}
              </h3>
              <p className="text-xs text-slate-400 light:text-slate-600">
                {language === 'ko'
                  ? '자동차 제조 및 기업 IR 재무 공시 핵심 약어 및 지표 풀이'
                  : 'Automotive OEM & financial reporting acronym definitions and methodology'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-800 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-100 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 space-y-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.terms.searchGlossary}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 dark:border-slate-700 light:border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 light:text-slate-600 text-[11px] mr-1">{t.terms.category}:</span>
            {[
              { id: 'all', label: language === 'ko' ? '전체' : 'All' },
              { id: 'automotive', label: t.terms.automotive },
              { id: 'financial', label: t.terms.financial },
              { id: 'accounting', label: t.terms.accounting },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                  activeCategory === cat.id
                    ? 'bg-brand-600 text-white border-brand-500'
                    : 'bg-slate-900 dark:bg-slate-900 light:bg-white text-slate-400 dark:text-slate-400 light:text-slate-700 border-slate-800 dark:border-slate-800 light:border-slate-300 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Terms List */}
        <div className="p-6 overflow-y-auto space-y-3.5 divide-y divide-slate-800/80 dark:divide-slate-800/80 light:divide-slate-200">
          {filteredTerms.map((item) => (
            <div key={item.term} className="pt-3.5 first:pt-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-brand-400 px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20">
                    {item.term}
                  </span>
                  <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-900 text-xs sm:text-sm">
                    {language === 'ko' ? item.fullNameKo : item.fullName}
                  </span>
                  <span className="text-[11px] text-slate-400 light:text-slate-500 font-mono hidden sm:inline">
                    ({language === 'ko' ? item.fullName : item.fullNameKo})
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-850 dark:bg-slate-850 light:bg-slate-100 text-slate-400 border border-slate-800 dark:border-slate-800 light:border-slate-300">
                  {getCategoryIcon(item.category)}
                  <span className="capitalize">{item.category}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-600 leading-relaxed pl-1">
                {language === 'ko' ? item.definitionKo : item.definitionEn}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-50 flex justify-between items-center text-xs text-slate-400">
          <span>{filteredTerms.length} terms cataloged</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 bg-slate-800 dark:bg-slate-800 light:bg-slate-200 hover:bg-slate-700 rounded-lg transition"
          >
            {t.global.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
};

