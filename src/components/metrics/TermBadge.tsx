import React, { useState } from 'react';
import { GLOSSARY_MAP } from '../../data/glossary';
import { useLanguage } from '../../i18n/LanguageContext';
import { HelpCircle } from 'lucide-react';

interface TermBadgeProps {
  term: string;
  className?: string;
  showIcon?: boolean;
}

export const TermBadge: React.FC<TermBadgeProps> = ({
  term,
  className = '',
  showIcon = true,
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const glossaryItem = GLOSSARY_MAP[term];

  if (!glossaryItem) {
    return <span className={className}>{term}</span>;
  }

  const fullName = language === 'ko' ? glossaryItem.fullNameKo : glossaryItem.fullName;
  const definition = language === 'ko' ? glossaryItem.definitionKo : glossaryItem.definitionEn;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-300 border border-slate-200 dark:border-slate-700 hover:border-brand-500/40 transition cursor-help ${className}`}
        aria-label={`Definition for ${term}`}
      >
        <span>{term}</span>
        {showIcon && <HelpCircle className="w-3 h-3 text-brand-600 dark:text-brand-400 opacity-80" />}
      </button>

      {/* Tooltip */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-72 p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl border border-brand-500/50 dark:border-brand-500/40 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-none">
          <div className="flex items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-brand-600 dark:text-brand-400 font-mono">{term}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[190px]">
              {fullName}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {definition}
          </p>
        </div>
      )}
    </span>
  );
};
