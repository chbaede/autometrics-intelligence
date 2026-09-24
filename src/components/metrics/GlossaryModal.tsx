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
        return <Layers className="w-3.5 h-3.5 text-blue-500" />;
      case 'financial':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
      case 'accounting':
        return <FileCheck className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.terms.glossaryTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ko'
                  ? '자동차 제조 및 기업 IR 재무 공시 핵심 약어 및 지표 풀이'
                  : 'Automotive OEM & financial reporting acronym definitions and methodology'}
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

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.terms.searchGlossary}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 transition shadow-inner"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              {t.terms.category}:
            </span>
            {[
              { id: 'all', label: language === 'ko' ? '전체 보기' : 'All Categories' },
              { id: 'automotive', label: t.terms.automotive },
              { id: 'financial', label: t.terms.financial },
              { id: 'accounting', label: t.terms.accounting },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activeCategory === cat.id
                    ? 'bg-brand-600 text-white font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Term Cards List */}
        <div className="p-6 overflow-y-auto space-y-3.5">
          {filteredTerms.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {language === 'ko' ? '검색어와 일치하는 용어가 없습니다.' : 'No matching acronyms or terms found.'}
            </div>
          ) : (
            filteredTerms.map((item) => (
              <div
                key={item.term}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 transition space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-black text-xs border border-brand-500/20">
                      {item.term}
                    </span>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {language === 'ko' ? item.fullNameKo : item.fullName}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                      ({language === 'ko' ? item.fullName : item.fullNameKo})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {getCategoryIcon(item.category)}
                    <span className="capitalize">{item.category}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {language === 'ko' ? item.definitionKo : item.definitionEn}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{filteredTerms.length} {language === 'ko' ? '개 용어 등록됨' : 'definitions registered'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
          >
            {language === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
