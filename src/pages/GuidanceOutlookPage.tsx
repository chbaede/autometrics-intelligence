import React from 'react';
import { getAllGuidance, getCompanyById, getSourceDocById } from '../utils/metricQueries';
import { GuidanceRangeChart } from '../components/metrics/charts/GuidanceRangeChart';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Compass,
  AlertTriangle,
  ExternalLink,
  FileText,
  Calendar,
} from 'lucide-react';

export const GuidanceOutlookPage: React.FC = () => {
  const { language } = useLanguage();
  const guidanceList = getAllGuidance();

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
          <Compass className="w-4 h-4" /> {language === 'ko' ? '경영진 공식 가이던스 및 전망' : 'Forward-Looking Guidance & Management Outlook'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === 'ko' ? '완성차 OEM 연간 재무 가이던스 목표 밴드' : 'OEM Financial Guidance & Target Corridors'}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm max-w-3xl leading-relaxed">
          {language === 'ko'
            ? '연간 사업보고서 및 실적발표회(Earnings Call)에서 공식 발표된 경영진의 목표 범위입니다. 영업이익률(RoS), 판매량 목표치, 전제조건 및 리스크 요인을 추적합니다.'
            : 'Official management projections published in annual results and earnings conferences. Tracks target corridors, operating return on sales (RoS) assumptions, and revision histories.'}
        </p>
      </div>

      {/* Forward-Looking Disclaimer Notice */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900 dark:text-slate-200 block mb-0.5">
            {language === 'ko' ? '미래 예측 진술(Forward-Looking Statement) 면책 공시' : 'Forward-Looking Information Safe Harbor'}
          </strong>
          <span>
            {language === 'ko'
              ? '가이던스는 경영진의 예상치로 매크로 경제, 원자재 가격, 공급망 및 관세 등 다양한 외부 변수에 따라 실제 실적과 다를 수 있습니다. AutoMetrics는 공식 발표 없이 가이던스를 임의로 추정하거나 변경하지 않습니다.'
              : 'Guidance targets represent executive management projections subject to substantial geopolitical, supply chain, and macroeconomic uncertainties. AutoMetrics logs exact verbatim disclosures and never infers or fabricates guidance changes without an official company release.'}
          </span>
        </div>
      </div>

      {/* Guidance Corridors Range Visualizer */}
      <GuidanceRangeChart guidanceList={guidanceList} />

      {/* Comprehensive Guidance Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            {language === 'ko' ? '경영진 공식 공시 원문 및 목표 범위' : 'Official Management Statements & Target Ranges'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ko' ? '공시 원문 전문, 발표 일자, 핵심 사업 전제조건' : 'Verbatim guidance text, publication dates, and key operational assumptions'}
          </p>
        </div>

        <div className="space-y-4 pt-2">
          {guidanceList.map((g) => {
            const comp = getCompanyById(g.companyId);
            const src = getSourceDocById(g.sourceDocId);

            return (
              <div
                key={g.id}
                className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{comp?.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-brand-700 dark:text-brand-400 font-semibold">
                      {language === 'ko' ? `${g.reportingYear}년도 연간 목표 전망` : `${g.reportingYear} Annual Outlook`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Published: {g.publicationDate}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold">
                      {g.unit === 'percentage' ? `Target: ${g.min}% – ${g.max}%` : `Target: ${g.min?.toLocaleString()} – ${g.max?.toLocaleString()}k`}
                    </span>
                  </div>
                </div>

                {/* Quoted Statement */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 italic font-mono">
                  "{g.originalText}"
                </div>

                {/* Assumptions and Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  {g.assumptions && g.assumptions.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        {language === 'ko' ? '경영진 핵심 전제조건' : 'Management Assumptions'}
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                        {g.assumptions.map((ass, i) => (
                          <li key={i}>{ass}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {g.riskNotes && (
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                        {language === 'ko' ? '주요 위험 요인' : 'Key Risk Factors'}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300">{g.riskNotes}</p>
                    </div>
                  )}
                </div>

                {/* Source Link */}
                {src && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-md">Source: {src.title}</span>
                    <a
                      href={src.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0 font-medium"
                    >
                      <span>{language === 'ko' ? '공식 발표 자료 보기' : 'View Official Release'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
