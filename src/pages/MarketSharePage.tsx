import React, { useState } from 'react';
import { MarketShareEvolutionSection } from '../components/market/MarketShareEvolutionSection';
import { RegionalAnalysisPage } from './RegionalAnalysisPage';
import { SEO } from '../components/common/SEO';
import { useLanguage } from '../i18n/LanguageContext';
import { PieChart, Globe2 } from 'lucide-react';

export const MarketSharePage: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'market_share' | 'regional_deliveries'>('market_share');

  return (
    <div className="space-y-6 pb-12">
      <SEO
        title={language === 'ko' ? '글로벌 및 권역별 시장 점유율 분석' : 'Market Share Evolution & Regional Footprint'}
        description={
          language === 'ko'
            ? '공식 산업 등록 기관(ACEA, CPCA, BEA, OICA) 전체 시장 모수 기반 글로벌, 유럽, 중국, 미국 시장 점유율 추이 및 권역별 인도량 실적 분석'
            : 'Track automotive market share evolution across Global, European, Chinese, and US markets backed by verified registration authority totals.'
        }
        canonicalPath="/market-share"
      />

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <PieChart className="w-4 h-4 text-brand-500" />
          <span>{language === 'ko' ? '시장 점유율 & 대륙별 인도 인텔리전스' : 'Market Share & Regional Footprint Intelligence'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '글로벌 및 대륙별 시장 점유율 분석' : 'Market Share Evolution & Regional Volumes'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '유럽(ACEA), 중국(CPCA), 미국(BEA)의 공식 등록 전체 시장 모수와 각 제조사의 공식 IR 인도량을 매칭하여 실질 점유율을 계산합니다. 단순 판매 대수 분석은 권역별 세부 인도량 탭에서 확인하실 수 있습니다.'
            : 'Ground market share in official authority datasets (ACEA, CPCA, BEA, OICA). Compare percentage-point gains/losses over time or inspect raw geographic delivery volumes.'}
        </p>

        {/* View Mode Switcher */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('market_share')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'market_share'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '시장 점유율 추이 (Market Share)' : 'Market Share Evolution'}</span>
          </button>
          <button
            onClick={() => setActiveTab('regional_deliveries')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'regional_deliveries'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '권역별 세부 인도량 (Regional Footprints)' : 'Regional Delivery Footprints'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'market_share' ? (
        <MarketShareEvolutionSection />
      ) : (
        <RegionalAnalysisPage />
      )}
    </div>
  );
};
