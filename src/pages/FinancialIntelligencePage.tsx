import React from 'react';
import { FinancialDecompositionCard } from '../components/financials/FinancialDecompositionCard';
import { SEO } from '../components/common/SEO';
import { useLanguage } from '../i18n/LanguageContext';
import { Calculator } from 'lucide-react';

export const FinancialIntelligencePage: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="space-y-6 pb-12">
      <SEO
        title={language === 'ko' ? '완성차 재무 실적 변동 요인 심층 분해' : 'Financial Performance Decomposition'}
        description={
          language === 'ko'
            ? '글로벌 완성차 OEM의 매출, 영업이익, 영업이익률 변동 원인 심층 분해. 물량, 믹스/가격, 원자재 비용, 환율, 일회성 요인별 공식 공시 분석.'
            : 'Deconstruct why automotive revenues, operating profits, and margins moved with driver walks across volume, price/mix, raw materials, FX, and one-offs.'
        }
        canonicalPath="/financials"
      />

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-mono font-semibold">
          <Calculator className="w-4 h-4" />
          <span>{language === 'ko' ? '재무 실적 요인 분해 인텔리전스' : 'Financial Performance Decomposition Engine'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '글로벌 완성차 재무 실적 변동 요인 심층 분석' : 'Automotive Financial Performance Decomposition'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '단순한 매출·영업이익 추이 확인을 넘어, 실적이 전년 대비 왜 변했는지 공식 IR 공시와 경영진 설명에 근거하여 판매 물량, 믹스/가격, 원가/원자재, 환율(FX), 일회성 충당금 요인별로 엄격히 분해합니다.'
            : 'Move beyond high-level financial charts. Deconstruct quarterly revenue and margin variance into volume, price/mix, raw materials, FX effects, and one-off warranty provisions backed by primary filings.'}
        </p>
      </div>

      {/* Main Decomposition Component */}
      <FinancialDecompositionCard />
    </div>
  );
};
