import React, { useState } from 'react';
import { OEMCompetitiveLeaderboard } from '../components/rankings/OEMCompetitiveLeaderboard';
import { CompanyComparisonPage } from './CompanyComparisonPage';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { MetricObservation } from '../types/metrics';
import { getDistinctPeriods } from '../utils/metricQueries';
import { SEO } from '../components/common/SEO';
import { useLanguage } from '../i18n/LanguageContext';
import { Trophy, BarChart2 } from 'lucide-react';

export const RankingsPage: React.FC = () => {
  const { language } = useLanguage();
  const periods = getDistinctPeriods();
  const [activePeriod, setActivePeriod] = useState<string>(periods[0] || '2026-Q3');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'head_to_head'>('leaderboard');
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  return (
    <div className="space-y-6 pb-12">
      <SEO
        title={language === 'ko' ? '글로벌 완성차 경쟁력 종합 랭킹' : 'Global OEM Competitive Rankings'}
        description={
          language === 'ko'
            ? '글로벌 16개 주요 완성차 OEM의 분기별 판매량, 매출액, 실제 영업이익, 영업이익률 및 전동화 비중 종합 비교 순위 및 다자간 벤치마크'
            : 'Comprehensive competitive rankings comparing global automotive OEMs across deliveries, revenues, operating profits, margins, and BEV mix.'
        }
        canonicalPath="/rankings"
      />

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>{language === 'ko' ? '글로벌 OEM 종합 랭킹 & 다자간 비교' : 'OEM Competitive Ranking & Benchmark Engine'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '글로벌 완성차 경쟁력 랭킹 및 벤치마크' : 'Automotive Competitive Rankings & Benchmark'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '공식 IR 공시 데이터를 바탕으로 16개 글로벌 완성차 제조사의 판매 규모, 매출, 실제 영업수익, 이익률 및 전동화 비중을 단일 종합 순위표에서 비교하거나 지표별 1:1 맞춤 비교를 수행합니다.'
            : 'Evaluate the top 16 global automakers side-by-side using official investor relations disclosures. Rank by volume, revenue, absolute operating profit, or drill down into head-to-head metric comparisons.'}
        </p>

        {/* View Mode Switcher */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '종합 경쟁력 랭킹 (Leaderboard)' : 'Competitive Leaderboard'}</span>
          </button>
          <button
            onClick={() => setActiveTab('head_to_head')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'head_to_head'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '지표별 다자간 비교 (Head-to-Head)' : 'Metric Comparison Engine'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'leaderboard' ? (
        <OEMCompetitiveLeaderboard
          activePeriod={activePeriod}
          onSelectPeriod={setActivePeriod}
          availablePeriods={periods}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      ) : (
        <CompanyComparisonPage />
      )}

      {/* Provenance Modal */}
      <ProvenanceModal
        observation={activeProvenanceObs}
        onClose={() => setActiveProvenanceObs(null)}
      />
    </div>
  );
};
