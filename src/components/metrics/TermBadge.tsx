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
        className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-brand-500/20 text-slate-300 hover:text-brand-300 border border-slate-700 hover:border-brand-500/40 transition cursor-help ${className}`}
        aria-label={`Definition for ${term}`}
      >
        <span>{term}</span>
        {showIcon && <HelpCircle className="w-3 h-3 text-brand-400 opacity-70" />}
      </button>

      {/* Tooltip */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 p-3 bg-slate-900/98 text-slate-100 rounded-xl shadow-2xl border border-brand-500/40 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-none">
          <div className="flex items-center justify-between gap-1 border-b border-slate-850 pb-1.5 mb-1.5">
            <span className="font-bold text-brand-400 font-mono">{term}</span>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
              {fullName}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {definition}
          </p>
        </div>
      )}
    </span>
  );
};

