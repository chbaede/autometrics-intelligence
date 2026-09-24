import React, { useState } from 'react';
import { REGIONS_REGISTRY } from '../data/regions';
import { getRegionalObservations, getCompanyById, getSourceDocById } from '../utils/metricQueries';
import { RegionId } from '../types/metrics';
import { formatMetricValue } from '../utils/metricCalculations';
import { TermBadge } from '../components/metrics/TermBadge';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Globe2,
  MapPin,
  Building2,
  Info,
  ExternalLink,
} from 'lucide-react';

export const RegionalAnalysisPage: React.FC = () => {
  const { language } = useLanguage();
  const regionsList = Object.values(REGIONS_REGISTRY);
  const [selectedRegionId, setSelectedRegionId] = useState<RegionId>('europe');

  const selectedRegion = REGIONS_REGISTRY[selectedRegionId];
  const observations = getRegionalObservations(selectedRegionId);

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <Globe2 className="w-4 h-4" /> {language === 'ko' ? '지역별 시장 분포 및 판매 점유율' : 'Regional Market Distribution & Footprint'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
          {language === 'ko' ? '글로벌 완성차 권역별 실적 인텔리전스' : 'Global OEM Regional Volume Intelligence'}
        </h1>
        <p className="text-slate-300 dark:text-slate-300 light:text-slate-600 text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '유럽, 북미, 중국, 한국, 인도 등 주요 완성차 시장에서의 제조사별 실적 분배를 분석합니다. 각 OEM의 공식 공시 범위(Perimeter)를 왜곡 없이 그대로 보존합니다.'
            : 'Detailed breakdown of vehicle sales and customer deliveries across key automotive territories. Preserves official regional perimeter definitions without blurring geographic borders.'}
        </p>
      </div>

      {/* Region Selector Pills */}
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 p-4 space-y-3">
        <label className="text-xs font-bold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider block">
          {language === 'ko' ? '분석 대상 권역 선택' : 'Select Geographic Market'}
        </label>
        <div className="flex flex-wrap gap-2">
          {regionsList.map((reg) => {
            const isSelected = selectedRegionId === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegionId(reg.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-500 shadow-xs'
                    : 'bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-slate-400 border-slate-800 dark:border-slate-800 light:border-slate-300 hover:text-slate-200 light:hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{language === 'ko' ? reg.nameKo : reg.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Region Definition Card */}
      <div className="bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 p-5 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-slate-200 dark:text-slate-200 light:text-slate-900 font-bold text-sm">
          <Info className="w-4 h-4 text-brand-400" />
          <span>
            {language === 'ko' ? '권역 공시 정의:' : 'Regional Reporting Definition:'}{' '}
            {language === 'ko' ? selectedRegion.nameKo : selectedRegion.name}
          </span>
        </div>
        <p className="text-slate-300 dark:text-slate-300 light:text-slate-600">{selectedRegion.description}</p>
        <p className="text-slate-400 light:text-slate-500 font-mono text-[11px] pt-1.5 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
          <strong className="text-slate-300 dark:text-slate-300 light:text-slate-800">
            {language === 'ko' ? '회계 및 공시 적용 범위:' : 'Accounting / IR Scope:'}
          </strong>{' '}
          {selectedRegion.officialDefinitionNotes}
        </p>
      </div>

      {/* Regional Deliveries Table & Breakdown */}
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white rounded-2xl border border-slate-800 dark:border-slate-800 light:border-slate-200 p-6 shadow-md space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-400" />
            {language === 'ko' ? selectedRegion.nameKo : selectedRegion.name}{' '}
            {language === 'ko' ? '완성차 인도 실적 (FY2024)' : 'OEM Deliveries (FY2024)'}
          </h3>
          <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5">
            {language === 'ko'
              ? '완성차 제조사 공식 공시 기준 지역별 인도량 및 판매량'
              : 'Reported vehicle deliveries and market segment breakdowns'}
          </p>
        </div>

        {observations.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 dark:bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-600 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
                <tr>
                  <th className="px-4 py-3">{language === 'ko' ? '완성차 제조사' : 'Automaker'} (<TermBadge term="OEM" />)</th>
                  <th className="px-4 py-3">{language === 'ko' ? 'IR 원문 지역 표기' : 'Original Region Label in IR'}</th>
                  <th className="px-4 py-3 text-right">{language === 'ko' ? '인도량' : 'Volume'}</th>
                  <th className="px-4 py-3">{language === 'ko' ? '공시 상세 사항' : 'Reporting Notes'}</th>
                  <th className="px-4 py-3">{language === 'ko' ? '출처 인용' : 'Source Citation'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 dark:divide-slate-850 light:divide-slate-200">
                {observations.map((regObs) => {
                  const comp = getCompanyById(regObs.companyId);
                  const src = getSourceDocById(regObs.sourceDocId);

                  return (
                    <tr key={regObs.id} className="hover:bg-slate-850/60 dark:hover:bg-slate-850/60 light:hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-200 dark:text-slate-200 light:text-slate-900">
                        {comp?.name || regObs.companyId}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 dark:text-slate-300 light:text-slate-700 text-[11px]">
                        "{regObs.originalRegionLabel}"
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-brand-400 text-sm">
                        {formatMetricValue(regObs.value, regObs.unit)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 light:text-slate-600 text-xs">
                        {regObs.regionalDefinitionNotes || 'Consolidated regional delivery figure.'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 light:text-slate-600 text-xs">
                        {src ? (
                          <a
                            href={src.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <span className="truncate max-w-[160px]">{src.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
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
          <div className="p-8 text-center bg-slate-950 dark:bg-slate-950 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-400 text-xs">
            No specific OEM regional dispatches recorded for {selectedRegion.name} in this reporting series.
          </div>
        )}
      </div>

      {/* Global Regional Distribution Insights */}
      <div className="p-5 bg-slate-900 dark:bg-slate-900 light:bg-white rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider">
          {language === 'ko' ? '지역별 회계 및 통계 무결성 원칙' : 'Regional Accounting Integrity Note'}
        </h3>
        <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed">
          AutoMetrics preserves verbatim regional perimeters: For example, Volkswagen Group isolates "China (incl. HK)" including JV partners FAW-VW and SAIC-VW; BMW Group classifies "Europe" inclusive of Germany and the UK; Stellantis reports "Enlarged Europe". We do not synthesize artificial global aggregates across incompatible geographical perimeters.
        </p>
      </div>
    </div>
  );
};
