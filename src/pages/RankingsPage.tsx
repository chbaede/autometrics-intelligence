import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OEMCompetitiveLeaderboard } from '../components/rankings/OEMCompetitiveLeaderboard';
import { CompanyComparisonPage } from './CompanyComparisonPage';
import { OEMCostEfficiencyBenchmark } from '../components/rankings/OEMCostEfficiencyBenchmark';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { MetricObservation } from '../types/metrics';
import { getDistinctPeriods } from '../utils/metricQueries';
import { SEO } from '../components/common/SEO';
import { useLanguage } from '../i18n/LanguageContext';
import { Trophy, BarChart2, Coins } from 'lucide-react';

export const RankingsPage: React.FC = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const highlightOem = searchParams.get('oem') || undefined;

  const periods = getDistinctPeriods();
  const [activePeriod, setActivePeriod] = useState<string>(periods[0] || '2026-Q3');

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'head_to_head' | 'cost_efficiency'>(() => {
    if (urlTab === 'efficiency' || urlTab === 'cost_efficiency') return 'cost_efficiency';
    if (urlTab === 'head_to_head') return 'head_to_head';
    return 'leaderboard';
  });

  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);

  // Synchronize activeTab when URL query parameter changes
  useEffect(() => {
    if (urlTab === 'efficiency' || urlTab === 'cost_efficiency') {
      setActiveTab('cost_efficiency');
    } else if (urlTab === 'head_to_head') {
      setActiveTab('head_to_head');
    } else if (urlTab === 'leaderboard') {
      setActiveTab('leaderboard');
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'leaderboard' | 'head_to_head' | 'cost_efficiency') => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'cost_efficiency') {
        next.set('tab', 'efficiency');
      } else if (tab === 'head_to_head') {
        next.set('tab', 'head_to_head');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <SEO
        title={
          activeTab === 'cost_efficiency'
            ? language === 'ko'
              ? '글로벌 완성차 원가·생산성 벤치마크 (Cost & Efficiency)'
              : 'OEM Cost & Efficiency Benchmark'
            : language === 'ko'
            ? '글로벌 완성차 경쟁력 종합 랭킹'
            : 'Global OEM Competitive Rankings'
        }
        description={
          language === 'ko'
            ? '글로벌 16개 주요 완성차 OEM의 판매량, 매출액, 영업이익, 이익률 및 직원 인당 생산성, 차량 대당 수익성, R&D/CapEx 투자 집약도 종합 벤치마크'
            : 'Comprehensive competitive rankings and efficiency benchmark comparing global automotive OEMs across deliveries, margins, rev/emp, profit/veh, and R&D/CapEx.'
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
            ? '공식 IR 공시 데이터를 바탕으로 16개 글로벌 완성차 제조사의 판매 규모, 매출, 영업이익, 이익률 및 원가·생산성(인당 매출/이익, 대당 매출/이익, R&D/CapEx 집약도)을 종합 벤치마크합니다.'
            : 'Evaluate the top 16 global automakers side-by-side using official investor relations disclosures. Rank by volume, absolute operating profit, head-to-head metric comparisons, or operational cost & efficiency.'}
        </p>

        {/* View Mode Switcher (3 Tabs) */}
        <div className="pt-2 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleTabChange('leaderboard')}
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
            onClick={() => handleTabChange('head_to_head')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'head_to_head'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '지표별 다자간 비교 (Head-to-Head)' : 'Metric Comparison Engine'}</span>
          </button>
          <button
            onClick={() => handleTabChange('cost_efficiency')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'cost_efficiency'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '원가·생산성 벤치마크 (Cost & Efficiency)' : 'Cost & Efficiency Benchmark'}</span>
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
      ) : activeTab === 'head_to_head' ? (
        <CompanyComparisonPage />
      ) : (
        <OEMCostEfficiencyBenchmark
          initialPeriod="2025-FY"
          highlightCompanyId={highlightOem}
        />
      )}

      {/* Provenance Modal */}
      <ProvenanceModal
        observation={activeProvenanceObs}
        onClose={() => setActiveProvenanceObs(null)}
      />
    </div>
  );
};
