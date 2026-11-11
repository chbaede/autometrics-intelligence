import React from 'react';
import { Link } from 'react-router-dom';
import { getCompanyEfficiencyRecord } from '../../data/efficiencyBenchmarkData';
import {
  convertEfficiencyAmount,
  formatEfficiencyCurrency,
  formatEfficiencyPercentage,
} from '../../utils/efficiencyCalculations';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  TrendingUp,
  Users,
  Car,
  Cpu,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface CompanyEfficiencyCardProps {
  companyId: string;
}

export const CompanyEfficiencyCard: React.FC<CompanyEfficiencyCardProps> = ({ companyId }) => {
  const { language } = useLanguage();
  const record =
    getCompanyEfficiencyRecord(companyId, '2026-LTM-est') ||
    getCompanyEfficiencyRecord(companyId, '2025-FY');

  if (!record) {
    return null;
  }

  const isProfitEmpNeg = record.profitPerEmployee < 0;

  // Convert to localized display values (KRW for ko, USD for en)
  const targetCurrency = language === 'ko' ? 'KRW' : 'USD';
  const displayRevEmp = convertEfficiencyAmount(record.revenuePerEmployee, record.reportingCurrency, targetCurrency);
  const displayProfitEmp = convertEfficiencyAmount(record.profitPerEmployee, record.reportingCurrency, targetCurrency);
  const displayRevVeh = convertEfficiencyAmount(record.revenuePerVehicle, record.reportingCurrency, targetCurrency);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'ko' ? '원가 구조 및 운영 생산성 지표' : 'Operational Cost & Efficiency Benchmark'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {language === 'ko'
                ? record.isEstimate
                  ? '2026년 1~3분기 연환산 실적 기반 인당 생산성 및 투자 집약도 (추정치)'
                  : '공식 사업보고서 결산 기반 인당 생산성 및 투자 집약도'
                : record.isEstimate
                ? 'Annualized 9M interim productivity and investment intensity (Estimate)'
                : 'Audited full-year productivity and investment intensity'}
            </p>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold self-start sm:self-center ${
            record.isEstimate
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          {record.isEstimate ? (
            <AlertTriangle className="w-3 h-3 text-amber-500" />
          ) : (
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
          )}
          <span>
            {record.period} {record.fiscalYearEnd.includes('Mar') ? '(3월 결산)' : ''}
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Rev / Emp */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Users className="w-3 h-3 text-blue-500" />
            <span>{language === 'ko' ? '인당 매출' : 'Rev / Emp'}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
            {formatEfficiencyCurrency(displayRevEmp, targetCurrency, language, 'employee')}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            <span className="font-mono">{record.headcount.toLocaleString()}</span>
            {language === 'ko' ? '명 (' : ' emp ('}
            {record.periodType === 'ltm_estimate'
              ? (language === 'ko' ? '2026 추정/최신공시' : '2026 Est.')
              : (language === 'ko' ? `${record.period.slice(0, 4)}년 말 공시` : `${record.period.slice(0, 4)} Year-End`)}
            )
          </div>
        </div>

        {/* Profit / Emp */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>{language === 'ko' ? '인당 영업이익' : 'Profit / Emp'}</span>
          </div>
          <div
            className={`text-sm sm:text-base font-bold font-mono ${
              isProfitEmpNeg ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatEfficiencyCurrency(displayProfitEmp, targetCurrency, language, 'employee')}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {language === 'ko' ? '영업이익 ÷ 인원' : 'EBIT / Headcount'}
          </div>
        </div>

        {/* Rev / Veh */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Car className="w-3 h-3 text-violet-500" />
            <span>{language === 'ko' ? '대당 매출' : 'Rev / Veh'}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
            {formatEfficiencyCurrency(displayRevVeh, targetCurrency, language, 'vehicle')}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {record.comparableVolumeUsed.toLocaleString()}k {language === 'ko' ? '대 출하' : 'units'}
          </div>
        </div>

        {/* R&D % */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Cpu className="w-3 h-3 text-sky-500" />
            <span>{language === 'ko' ? 'R&D 집약도' : 'R&D %'}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
            {formatEfficiencyPercentage(record.rdIntensity)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {language === 'ko' ? '매출액 대비 R&D' : 'R&D as % of Rev'}
          </div>
        </div>

        {/* CapEx % */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Layers className="w-3 h-3 text-amber-500" />
            <span>{language === 'ko' ? 'CapEx 집약도' : 'CapEx %'}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
            {formatEfficiencyPercentage(record.capexIntensity)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {language === 'ko' ? '설비투자 집약도' : 'CapEx as % of Rev'}
          </div>
        </div>
      </div>

      {/* Deep-Link to Rankings */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-slate-400">
          {language === 'ko'
            ? '16개 전체 글로벌 제조사 순위표 및 대당 영업이익, CapEx 배수 상세 분석을 확인하세요.'
            : 'Compare across all 16 automakers with detailed profit per vehicle and CapEx multiple analysis.'}
        </span>
        <Link
          to={`/rankings?tab=efficiency&oem=${companyId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-brand-200 dark:border-brand-500/20 transition self-start sm:self-center shrink-0"
        >
          <span>{language === 'ko' ? '16개사 전체 벤치마크 비교하기' : 'Explore Full Benchmark in Rankings'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
