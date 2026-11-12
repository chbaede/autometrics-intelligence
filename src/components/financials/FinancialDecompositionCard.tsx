import React, { useState } from 'react';
import {
  FINANCIAL_DECOMPOSITIONS,
  getFinancialDecomposition,
} from '../../data/financialDecompositions';
import { getCompanyById } from '../../utils/metricQueries';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Calculator,
  Layers,
  ShieldCheck,
  FileText,
  Info,
  Calendar,
} from 'lucide-react';

export const FinancialDecompositionCard: React.FC = () => {
  const { language } = useLanguage();

  // Available OEMs with decompositions (13 companies)
  const supportedCompanyIds = FINANCIAL_DECOMPOSITIONS.map((d) => d.companyId);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(supportedCompanyIds[0] || 'toyota_motor');

  const decomposition = getFinancialDecomposition(selectedCompanyId, '2026-Q3') || FINANCIAL_DECOMPOSITIONS[0];

  const formatCurrency = (val: number, curr: string) => {
    if (curr === 'KRW') {
      const tril = val / 1000000;
      return language === 'ko' ? `₩${tril.toFixed(1)}조` : `₩${tril.toFixed(2)}T`;
    }
    if (curr === 'JPY') {
      const tril = val / 1000000;
      return language === 'ko' ? `¥${tril.toFixed(2)}조` : `¥${tril.toFixed(2)}T`;
    }
    if (curr === 'EUR') {
      return `€${(val / 1000).toFixed(1)}B`;
    }
    if (curr === 'SEK') {
      return `${(val / 1000).toFixed(1)}B SEK`;
    }
    if (curr === 'CNY') {
      return `¥${(val / 1000).toFixed(1)}B`;
    }
    return `$${(val / 1000).toFixed(1)}B`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-6 space-y-6 transition-colors">
      {/* Top Header & OEM Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {language === 'ko'
                ? '분기 실적 변동 요인 심층 분해 (Financial Performance Decomposition)'
                : 'Financial Performance Decomposition & Driver Walk'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'ko'
              ? '단순 차트 확인을 넘어, 매출과 영업이익이 왜 변했는지 공식 공시 팩트와 수학적 산출 지표, 경영진 분석 요인으로 엄격히 분해합니다. (총 13개 주요 글로벌 OEM 지원)'
              : 'Beyond high-level charts: Deconstruct why profitability changed into reported facts, calculated metrics, and official driver commentary across 13 major global OEMs.'}
          </p>
        </div>

        {/* Company Quick Selector Dropdown & Period Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-brand-500" />
            <span>{decomposition.period}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
              {language === 'ko' ? '분석 제조사:' : 'Select OEM:'}
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden"
            >
              {supportedCompanyIds.map((cid) => {
                const c = getCompanyById(cid);
                return (
                  <option key={cid} value={cid}>
                    {c ? c.name : cid}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Scope & Fiscal Calendar Alignment Banner (if applicable) */}
      {(decomposition.segmentReportingNotesKo || decomposition.derivationFormula) && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              {language === 'ko'
                ? '회계 보고 범위 및 결산 주기 안내 (Accounting Scope & Period Classification)'
                : 'Accounting Scope & Period Classification Note'}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 ml-1">
              {decomposition.periodClassification === 'derived_quarter'
                ? (language === 'ko' ? '누적 차감 산출' : 'Derived Standalone')
                : (language === 'ko' ? '단독 분기 보고' : 'Standalone Quarter')}
            </span>
          </div>
          <p className="leading-relaxed">
            {language === 'ko' ? decomposition.segmentReportingNotesKo : decomposition.segmentReportingNotesEn}
          </p>
          {decomposition.derivationFormula && (
            <p className="text-[11px] font-mono text-blue-800 dark:text-blue-300">
              📐 {decomposition.derivationFormula}
            </p>
          )}
        </div>
      )}

      {/* Automotive Segment Metrics Mini-Card (if distinguished from Group) */}
      {decomposition.automotiveSegmentMetrics && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {language === 'ko' ? '🚗 자동차 사업 부문(Automotive Segment) 단독 실적:' : '🚗 Dedicated Automotive Segment Standalone:'}
            </span>
            <p className="text-slate-500 text-[11px]">
              {language === 'ko'
                ? '그룹 통합 실적(금융·리스·모빌리티 포함)과 별도로 공시된 순수 완성차 제조 부문 지표입니다.'
                : 'Pure vehicle manufacturing operations segregated from financial services & mobility arms.'}
            </p>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">{language === 'ko' ? '부문 매출' : 'Segment Rev'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(decomposition.automotiveSegmentMetrics.revenue, decomposition.currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{language === 'ko' ? '부문 EBIT' : 'Segment EBIT'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(decomposition.automotiveSegmentMetrics.operatingProfit, decomposition.currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{language === 'ko' ? '부문 EBIT 마진' : 'Segment Margin'}</span>
              <span className="font-extrabold text-brand-600 dark:text-brand-400">
                {decomposition.automotiveSegmentMetrics.operatingMargin}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delta KPI Summary (What changed & How much?) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Revenue Delta */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider">{language === 'ko' ? '연결 매출액 변동' : 'Revenue YoY'}</span>
            <span className="font-mono text-[11px]">{decomposition.period} vs {decomposition.comparisonPeriod}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
              {formatCurrency(decomposition.currentRevenue, decomposition.currency)}
            </span>
            <span
              className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                decomposition.revenueChangeYoYPercentage >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {decomposition.revenueChangeYoYPercentage >= 0 ? '+' : ''}
              {decomposition.revenueChangeYoYPercentage}% YoY
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {language === 'ko' ? '전년 동기:' : 'Prior Year:'} {formatCurrency(decomposition.previousRevenue, decomposition.currency)}
          </p>
        </div>

        {/* Operating Profit Delta */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider">{language === 'ko' ? '영업이익 변동' : 'Operating Profit YoY'}</span>
            <span className="font-mono text-[11px]">{decomposition.currency}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-xl font-extrabold font-mono ${
                decomposition.currentOperatingProfit < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {formatCurrency(decomposition.currentOperatingProfit, decomposition.currency)}
            </span>
            <span
              className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                decomposition.profitChangeYoYPercentage >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {decomposition.profitChangeYoYPercentage >= 0 ? '+' : ''}
              {decomposition.profitChangeYoYPercentage}% YoY
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {language === 'ko' ? '전년 동기:' : 'Prior Year:'} {formatCurrency(decomposition.previousOperatingProfit, decomposition.currency)}
          </p>
        </div>

        {/* Operating Margin Delta */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider">{language === 'ko' ? '영업이익률 변동' : 'Operating Margin YoY'}</span>
            <span className="font-mono text-[11px]">RoS / EBIT Margin</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-xl font-extrabold font-mono ${
                decomposition.currentOperatingMargin < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-brand-600 dark:text-brand-400'
              }`}
            >
              {decomposition.currentOperatingMargin}%
            </span>
            <span
              className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                decomposition.marginChangeYoYBasisPoints >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {decomposition.marginChangeYoYBasisPoints >= 0 ? '+' : ''}
              {decomposition.marginChangeYoYBasisPoints} bps
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {language === 'ko' ? '전년 동기:' : 'Prior Year:'} {decomposition.previousOperatingMargin}%
          </p>
        </div>
      </div>

      {/* Contributing Factors Walk (Why did it change?) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>{language === 'ko' ? '공식 실적 변동 기여 요인 분석 (Contributing Factors Walk)' : 'Contributing Factors Analysis'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {decomposition.contributingFactors.map((factor, idx) => {
            const isPos = factor.impactType === 'positive';
            const isNeg = factor.impactType === 'negative';

            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isPos ? 'bg-emerald-500' : isNeg ? 'bg-rose-500' : 'bg-blue-500'
                      }`}
                    />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {language === 'ko' ? factor.nameKo : factor.nameEn}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      isPos
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : isNeg
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                    }`}
                  >
                    {isPos
                      ? language === 'ko' ? '수익성 개선 (+)' : 'Positive'
                      : isNeg
                      ? language === 'ko' ? '수익성 둔화 (-)' : 'Negative'
                      : language === 'ko' ? '중립 (Neutral)' : 'Neutral'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {language === 'ko' ? factor.explanationKo : factor.explanationEn}
                </p>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-850">
                  <span className="font-mono text-slate-500">
                    {factor.isDisclosedNumeric && factor.quantifiedAmount !== undefined ? (
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {factor.quantifiedAmount > 0 ? '+' : ''}
                        {factor.quantifiedAmount.toLocaleString()} {factor.quantifiedUnit}
                      </span>
                    ) : (
                      <span className="italic text-slate-400 text-[10px]">
                        {language === 'ko' ? '방향성 공시 (정량 수치 미공시)' : 'Directional Commentary (Unquantified)'}
                      </span>
                    )}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {factor.pageOrLocator}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4-Level Information Classification Grid (Strict Methodology) */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{language === 'ko' ? '데이터 투명성 4단계 분류 체계' : '4-Tier Data Transparency Taxonomy'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Reported Facts */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              {language === 'ko' ? '1. 공식 공시 팩트 (Reported Facts)' : '1. Reported Facts'}
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {language === 'ko'
                ? '매출, 연결 영업이익, 인도량, 승용 부문 RoS 등 공시 원문에 공식 기재된 확정 수치.'
                : 'Audited or officially reported figures from primary IR filings (revenue, EBIT, deliveries, segment RoS).'}
            </p>
          </div>

          {/* 2. Calculated Metrics */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              {language === 'ko' ? '2. 산출 지표 (Calculated Metrics)' : '2. Calculated Metrics'}
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {language === 'ko'
                ? 'YoY 증감률, 마진 bps 변화, 통화 환산 등 검증된 수식으로 투명하게 도출된 파생 지표.'
                : 'Derived metrics transparently computed via reproducible formulas (YoY deltas, bps changes, FX conversions).'}
            </p>
          </div>

          {/* 3. Analytical Interpretation */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              {language === 'ko' ? '3. 공식 경영진 코멘터리 (Interpretation)' : '3. Management Commentary'}
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {language === 'ko'
                ? '어닝스 콜 및 실적 보고서에서 경영진이 공식 지목한 변동 원인 및 전략적 설명.'
                : 'Official earnings drivers and strategic context cited by management in filings and earnings calls.'}
            </p>
          </div>

          {/* 4. Unavailable Information */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              {language === 'ko' ? '4. 미공시 정보 (Unavailable Info)' : '4. Unavailable Info'}
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {language === 'ko'
                ? '임의 추정하지 않고 명시적으로 비워둔 항목 (차종별 단독 마진, 공급사 구상권 등).'
                : 'Explicitly undisclosed elements left unfabricated (e.g., model-level margins, supplier recovery details).'}
            </p>
          </div>
        </div>

        {/* Unavailable Information Explicit Bullets */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2">
            {language === 'ko' ? '해당 기업 공식 미공시 항목:' : 'Explicitly Undisclosed Elements:'}
          </span>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            {(language === 'ko' ? decomposition.unavailableInformationKo : decomposition.unavailableInformationEn).map(
              (item, i) => (
                <li key={i}>{item}</li>
              )
            )}
          </ul>
        </div>
      </div>

      {/* Source Citation Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-brand-500" />
          <span className="font-mono">{decomposition.sourceCitation}</span>
        </div>
        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
          ID: {decomposition.primarySourceDocId}
        </span>
      </div>
    </div>
  );
};
