import React, { useState, useMemo } from 'react';
import { REGIONS_REGISTRY } from '../data/regions';
import { getRegionalObservations, getCompanyById, getSourceDocById } from '../utils/metricQueries';
import { RegionId } from '../types/metrics';
import { formatMetricValue, formatPeriodLabel } from '../utils/metricCalculations';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Globe2,
  MapPin,
  Building2,
  Info,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Award,
  Filter,
} from 'lucide-react';

export const RegionalAnalysisPage: React.FC = () => {
  const { language } = useLanguage();
  const regionsList = Object.values(REGIONS_REGISTRY);
  const [selectedRegionId, setSelectedRegionId] = useState<RegionId>('global');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-Q2');

  const selectedRegion = REGIONS_REGISTRY[selectedRegionId];
  const allRegionObservations = getRegionalObservations(selectedRegionId);

  const availablePeriods = useMemo(() => {
    const pSet = new Set<string>();
    allRegionObservations.forEach((o) => pSet.add(o.period));
    return ['all', ...Array.from(pSet).sort().reverse()];
  }, [allRegionObservations]);

  // Filter observations by period
  const filteredObservations = useMemo(() => {
    if (selectedPeriod === 'all') {
      return [...allRegionObservations].sort((a, b) => b.value - a.value);
    }
    return allRegionObservations
      .filter((o) => o.period === selectedPeriod)
      .sort((a, b) => b.value - a.value);
  }, [allRegionObservations, selectedPeriod]);

  // Calculate Region Stats for selected period
  const totalVolume = filteredObservations.reduce((sum, o) => sum + o.value, 0);
  const topOem = filteredObservations[0];
  const topOemComp = topOem ? getCompanyById(topOem.companyId) : null;
  const maxVolume = topOem?.value || 1;

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <Globe2 className="w-4 h-4" /> {language === 'ko' ? '글로벌 전체 및 주요 권역별 시장 분석' : 'Global & Regional Automotive Market Distribution'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '글로벌 및 대륙 권역별 완성차 인도 실적 인텔리전스' : 'Global & Regional OEM Volume Intelligence'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '전 세계 글로벌 총 인도량부터 유럽, 북미, 중국, 남미, 아시아 등 핵심 대륙별 시장에서의 주요 완성차 OEM 실적을 공식 IR 공시 기준으로 왜곡 없이 직접 비교 분석합니다.'
            : 'Explore consolidated global totals and audited regional delivery footprints across Europe, North America, China, South America, and Asia with 100% official IR backing.'}
        </p>
      </div>

      {/* Region Selector Pills */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            {language === 'ko' ? '1. 분석 대상 권역 선택' : '1. Select Geographic Market'}
          </label>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '2. 공시 주기 선택:' : '2. Period Filter:'}</span>
            <div className="flex items-center gap-1">
              {availablePeriods.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans font-semibold transition ${
                    selectedPeriod === p
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p === 'all' ? (language === 'ko' ? '전체' : 'All') : formatPeriodLabel(p, language)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {regionsList.map((reg) => {
            const isSelected = selectedRegionId === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegionId(reg.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{language === 'ko' ? reg.nameKo : reg.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>{language === 'ko' ? '권역 집계 총 인도량' : 'Total Regional Volume'}</span>
            <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatMetricValue(totalVolume, 'thousand_units')}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {selectedPeriod === 'all' ? (language === 'ko' ? '전체 공시 누적' : 'All periods aggregate') : `${selectedPeriod} ${language === 'ko' ? '공시 기준' : 'period disclosure'}`}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>{language === 'ko' ? '권역 1위 제조사' : 'Market Leader'}</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-400 truncate">
            {topOemComp?.name || '-'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {topOem ? `${formatMetricValue(topOem.value, 'thousand_units')} (${((topOem.value / (totalVolume || 1)) * 100).toFixed(1)}% 점유)` : '-'}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>{language === 'ko' ? '공시 제조사 수' : 'Disclosing OEMs'}</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {new Set(filteredObservations.map((o) => o.companyId)).size} <span className="text-sm font-sans font-normal text-slate-500">{language === 'ko' ? '개사' : 'OEMs'}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {language === 'ko' ? '100% 공식 IR 검증 완료' : '100% Verified primary IR'}
          </div>
        </div>
      </div>

      {/* Visual Comparison Bar Chart */}
      {filteredObservations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                {language === 'ko' ? selectedRegion.nameKo : selectedRegion.name}{' '}
                {language === 'ko' ? '완성차 인도량 비교 차트' : 'OEM Volume Distribution Chart'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedPeriod === 'all'
                  ? (language === 'ko' ? '전체 공시 기간 기준 정렬' : 'All reporting periods sorted by volume')
                  : `${selectedPeriod} ${language === 'ko' ? '공시 실적 기준' : 'period reported volume'}`}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {language === 'ko' ? '단위: 천 대 (k units)' : 'Unit: Thousand units'}
            </span>
          </div>

          <div className="space-y-2.5 pt-2">
            {filteredObservations.slice(0, 10).map((obs, idx) => {
              const comp = getCompanyById(obs.companyId);
              const pctOfMax = (obs.value / maxVolume) * 100;
              const shareOfTotal = (obs.value / (totalVolume || 1)) * 100;

              return (
                <div key={obs.id} className="space-y-1 group">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[11px] w-4">{idx + 1}.</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{comp?.name || obs.companyId}</span>
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {obs.period}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500 text-[11px]">({shareOfTotal.toFixed(1)}%)</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">
                        {formatMetricValue(obs.value, obs.unit)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-500 group-hover:from-brand-500 group-hover:to-brand-300"
                      style={{ width: `${Math.max(pctOfMax, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Region Definition Card */}
      <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
          <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>
            {language === 'ko' ? '권역 공시 정의:' : 'Regional Reporting Definition:'}{' '}
            {language === 'ko' ? selectedRegion.nameKo : selectedRegion.name}
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-300">{selectedRegion.description}</p>
        <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px] pt-1.5 border-t border-slate-200 dark:border-slate-800">
          <strong className="text-slate-700 dark:text-slate-300">
            {language === 'ko' ? '회계 및 공시 적용 범위:' : 'Accounting / IR Scope:'}
          </strong>{' '}
          {selectedRegion.officialDefinitionNotes}
        </p>
      </div>

      {/* Regional Deliveries Table & Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            {language === 'ko' ? selectedRegion.nameKo : selectedRegion.name}{' '}
            {language === 'ko' ? '공식 공시 상세 테이블' : 'Official Disclosures Table'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ko'
              ? '완성차 제조사 공식 공시 기준 지역별 인도량 및 출처 링크'
              : 'Reported vehicle deliveries and verified primary IR source links'}
          </p>
        </div>

        {filteredObservations.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">{language === 'ko' ? '완성차 제조사' : 'Automaker'}</th>
                  <th className="px-4 py-3">{language === 'ko' ? '공시 주기' : 'Period'}</th>
                  <th className="px-4 py-3">{language === 'ko' ? 'IR 원문 지역 표기' : 'Original Region Label in IR'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ko' ? '인도량' : 'Volume'}</th>
                  <th className="px-4 py-3">{language === 'ko' ? '공식 출처 (새 탭)' : 'Official Source (New Tab)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                {filteredObservations.map((regObs) => {
                  const comp = getCompanyById(regObs.companyId);
                  const src = getSourceDocById(regObs.sourceDocId);

                  return (
                    <tr key={regObs.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {comp?.name || regObs.companyId}
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-600 dark:text-slate-300 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                          {formatPeriodLabel(regObs.period, language)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                        "{regObs.originalRegionLabel}"
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-brand-600 dark:text-brand-400 text-sm">
                        {formatMetricValue(regObs.value, regObs.unit)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {src ? (
                          <a
                            href={src.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium group"
                          >
                            <span className="truncate max-w-[200px]">{src.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 group-hover:scale-110 transition-transform" />
                          </a>
                        ) : (
                          'Official Filing'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            {language === 'ko'
              ? `선택한 ${selectedRegion.nameKo} 권역에 대해 ${selectedPeriod} 공시 데이터가 없습니다.`
              : `No specific OEM regional dispatches recorded for ${selectedRegion.name} in this reporting series.`}
          </div>
        )}
      </div>

      {/* Global Regional Distribution Insights */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-md">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {language === 'ko' ? '지역별 회계 및 통계 무결성 원칙' : 'Regional Accounting Integrity Note'}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {language === 'ko'
            ? 'AutoMetrics Intelligence는 기업별 공식 공시 범위(Perimeter)를 가공 없이 보존합니다. 예컨대 폭스바겐 그룹의 중국 수치는 합작법인(FAW-VW, SAIC-VW)을 포함하며, BMW 그룹은 유럽 범위에 독일과 영국을 포함하고, 스텔란티스는 "Enlarged Europe"으로 공시합니다. 추정이나 임의 보정 없이 100% 제조사 공식 IR 원문 데이터를 원칙으로 합니다.'
            : 'AutoMetrics preserves verbatim regional perimeters: For example, Volkswagen Group isolates "China (incl. HK)" including JV partners FAW-VW and SAIC-VW; BMW Group classifies "Europe" inclusive of Germany and the UK; Stellantis reports "Enlarged Europe". We do not synthesize artificial global aggregates across incompatible geographical perimeters.'}
        </p>
      </div>
    </div>
  );
};
