import React, { useState, useMemo } from 'react';
import {
  getAvailableEfficiencyPeriods,
  getEfficiencyRecordsByPeriod,
} from '../../data/efficiencyBenchmarkData';
import { OEMEfficiencyRecord } from '../../types/efficiency';
import {
  convertEfficiencyAmount,
  formatEfficiencyCurrency,
  formatEfficiencyPercentage,
  formatEfficiencyRatio,
} from '../../utils/efficiencyCalculations';
import { getCompanyById } from '../../utils/metricQueries';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Users,
  Car,
  TrendingUp,
  Cpu,
  Layers,
  ArrowUpDown,
  Search,
  Info,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Coins,
  BarChart3,
  HelpCircle,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface OEMCostEfficiencyBenchmarkProps {
  initialPeriod?: string;
  highlightCompanyId?: string;
}

type SortField =
  | 'revenuePerEmployee'
  | 'profitPerEmployee'
  | 'revenuePerVehicle'
  | 'profitPerVehicle'
  | 'rdIntensity'
  | 'capexIntensity'
  | 'revenuePerCapex'
  | 'headcount'
  | 'name';

type CurrencyMode = 'KRW' | 'USD' | 'FUNCTIONAL';

export const OEMCostEfficiencyBenchmark: React.FC<OEMCostEfficiencyBenchmarkProps> = ({
  initialPeriod,
  highlightCompanyId,
}) => {
  const { language } = useLanguage();
  const availablePeriods = getAvailableEfficiencyPeriods();

  const [activePeriod, setActivePeriod] = useState<string>(initialPeriod || '2025-FY');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('KRW');
  const [sortField, setSortField] = useState<SortField>('profitPerEmployee');
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChartMetric, setSelectedChartMetric] = useState<
    | 'revenuePerEmployee'
    | 'profitPerEmployee'
    | 'revenuePerVehicle'
    | 'profitPerVehicle'
    | 'rdIntensity'
    | 'capexIntensity'
    | 'revenuePerCapex'
  >('profitPerEmployee');
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);
  const [selectedProvenanceRecord, setSelectedProvenanceRecord] = useState<OEMEfficiencyRecord | null>(null);

  const rawRecords = useMemo(() => {
    return getEfficiencyRecordsByPeriod(activePeriod);
  }, [activePeriod]);

  // Normalized records with converted currencies
  const processedRecords = useMemo(() => {
    return rawRecords.map((r) => {
      const company = getCompanyById(r.companyId);
      const revEmp = convertEfficiencyAmount(r.revenuePerEmployee, r.reportingCurrency, currencyMode);
      const profitEmp = convertEfficiencyAmount(r.profitPerEmployee, r.reportingCurrency, currencyMode);
      const revVeh = convertEfficiencyAmount(r.revenuePerVehicle, r.reportingCurrency, currencyMode);
      const profitVeh = convertEfficiencyAmount(r.profitPerVehicle, r.reportingCurrency, currencyMode);

      return {
        ...r,
        company,
        displayRevEmp: revEmp,
        displayProfitEmp: profitEmp,
        displayRevVeh: revVeh,
        displayProfitVeh: profitVeh,
      };
    });
  }, [rawRecords, currencyMode]);

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return processedRecords
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const nameKo = r.company?.nativeName?.toLowerCase() || r.company?.shortName?.toLowerCase() || '';
        const nameEn = r.company?.name?.toLowerCase() || '';
        return nameKo.includes(q) || nameEn.includes(q) || r.companyId.includes(q);
      })
      .sort((a, b) => {
        let valA: number | string | null = null;
        let valB: number | string | null = null;

        switch (sortField) {
          case 'name':
            valA = a.company?.name || a.companyId;
            valB = b.company?.name || b.companyId;
            return sortAscending ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
          case 'headcount':
            valA = a.headcount;
            valB = b.headcount;
            break;
          case 'revenuePerEmployee':
            valA = a.displayRevEmp;
            valB = b.displayRevEmp;
            break;
          case 'profitPerEmployee':
            valA = a.displayProfitEmp;
            valB = b.displayProfitEmp;
            break;
          case 'revenuePerVehicle':
            valA = a.displayRevVeh;
            valB = b.displayRevVeh;
            break;
          case 'profitPerVehicle':
            valA = a.displayProfitVeh;
            valB = b.displayProfitVeh;
            break;
          case 'rdIntensity':
            valA = a.rdIntensity;
            valB = b.rdIntensity;
            break;
          case 'capexIntensity':
            valA = a.capexIntensity;
            valB = b.capexIntensity;
            break;
          case 'revenuePerCapex':
            valA = a.revenuePerCapex;
            valB = b.revenuePerCapex;
            break;
        }

        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;
        return sortAscending ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [processedRecords, searchQuery, sortField, sortAscending]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(false);
    }
  };

  // Industry Medians for KPI summary cards
  const medians = useMemo(() => {
    const calcMedian = (nums: (number | null)[]): number | null => {
      const valid = nums.filter((n): n is number => n !== null && Number.isFinite(n)).sort((a, b) => a - b);
      if (valid.length === 0) return null;
      const mid = Math.floor(valid.length / 2);
      return valid.length % 2 !== 0 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
    };

    return {
      revEmp: calcMedian(processedRecords.map((r) => r.displayRevEmp)),
      profitEmp: calcMedian(processedRecords.map((r) => r.displayProfitEmp)),
      revVeh: calcMedian(processedRecords.map((r) => r.displayRevVeh)),
      rdPct: calcMedian(processedRecords.map((r) => r.rdIntensity)),
      capexPct: calcMedian(processedRecords.map((r) => r.capexIntensity)),
    };
  }, [processedRecords]);

  // Bar chart dataset sorted by selectedChartMetric
  const chartData = useMemo(() => {
    return [...processedRecords]
      .filter((r) => {
        const val =
          selectedChartMetric === 'revenuePerEmployee'
            ? r.displayRevEmp
            : selectedChartMetric === 'profitPerEmployee'
            ? r.displayProfitEmp
            : selectedChartMetric === 'revenuePerVehicle'
            ? r.displayRevVeh
            : selectedChartMetric === 'profitPerVehicle'
            ? r.displayProfitVeh
            : selectedChartMetric === 'rdIntensity'
            ? r.rdIntensity
            : selectedChartMetric === 'capexIntensity'
            ? r.capexIntensity
            : r.revenuePerCapex;
        return val !== null && Number.isFinite(val);
      })
      .map((r) => {
        let numericValue = 0;
        let formattedValue = '';
        const curr = currencyMode === 'FUNCTIONAL' ? r.reportingCurrency : currencyMode;

        switch (selectedChartMetric) {
          case 'revenuePerEmployee':
            numericValue = r.displayRevEmp || 0;
            formattedValue = formatEfficiencyCurrency(numericValue, curr, language, 'employee');
            break;
          case 'profitPerEmployee':
            numericValue = r.displayProfitEmp || 0;
            formattedValue = formatEfficiencyCurrency(numericValue, curr, language, 'employee');
            break;
          case 'revenuePerVehicle':
            numericValue = r.displayRevVeh || 0;
            formattedValue = formatEfficiencyCurrency(numericValue, curr, language, 'vehicle');
            break;
          case 'profitPerVehicle':
            numericValue = r.displayProfitVeh || 0;
            formattedValue = formatEfficiencyCurrency(numericValue, curr, language, 'vehicle');
            break;
          case 'rdIntensity':
            numericValue = r.rdIntensity || 0;
            formattedValue = formatEfficiencyPercentage(numericValue);
            break;
          case 'capexIntensity':
            numericValue = r.capexIntensity || 0;
            formattedValue = formatEfficiencyPercentage(numericValue);
            break;
          case 'revenuePerCapex':
            numericValue = r.revenuePerCapex || 0;
            formattedValue = formatEfficiencyRatio(numericValue);
            break;
        }

        return {
          companyId: r.companyId,
          name: language === 'ko' ? r.company?.nativeName || r.company?.shortName || r.companyName : r.companyName,
          value: numericValue,
          formattedValue,
          logoUrl: r.company?.logoUrl,
          isHighlight: r.companyId === highlightCompanyId,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [processedRecords, selectedChartMetric, currencyMode, language, highlightCompanyId]);

  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    const maxVal = Math.max(...chartData.map((d) => Math.abs(d.value)));
    return maxVal > 0 ? maxVal : 1;
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* View Header & Operational Efficiency Explanation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-200 dark:border-brand-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{language === 'ko' ? '글로벌 완성차 원가·생산성 벤치마크' : 'OEM Cost & Efficiency Benchmark'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'ko' ? '완성차 제조사별 원가 구조 및 운영 효율성 비교' : 'OEM Operational Productivity & Investment Efficiency'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-4xl leading-relaxed">
              {language === 'ko'
                ? '글로벌 16개 주요 완성차 OEM의 인당 생산성(직원 1인당 매출 및 영업이익), 대당 수익성(차량 1대당 매출 및 영업이익), 미래 투자 집약도(R&D 집약도 %, 설비투자 CapEx 집약도 %, CapEx 대비 매출 배수)를 공식 공시 사업보고서 기반으로 정밀 벤치마크합니다.'
                : 'Benchmark operational productivity and investment efficiency across 16 global automakers. Compare revenue and profit per employee, per vehicle, alongside R&D and CapEx intensities grounded in official annual disclosures.'}
            </p>
          </div>

          {/* Methodology Button */}
          <button
            onClick={() => setShowMethodologyModal(true)}
            className="self-start md:self-center inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
          >
            <HelpCircle className="w-4 h-4 text-brand-500" />
            <span>{language === 'ko' ? '산식 및 지표 정의 (Methodology)' : 'Formulas & Definitions'}</span>
          </button>
        </div>

        {/* Control Toolbar: Period & Currency Selection */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Period Toggle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-semibold">{language === 'ko' ? '분석 기간:' : 'Period:'}</span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              {availablePeriods.map((period) => {
                const isActive = activePeriod === period;
                const isEst = period.includes('LTM-est');
                return (
                  <button
                    key={period}
                    onClick={() => setActivePeriod(period)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      isActive
                        ? isEst
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {isEst && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>
                      {period === '2025-FY'
                        ? language === 'ko'
                          ? '2025-FY (공식 결산)'
                          : '2025-FY (Official)'
                        : period === '2024-FY'
                        ? language === 'ko'
                          ? '2024-FY (공식 결산)'
                          : '2024-FY (Official)'
                        : language === 'ko'
                        ? '2026-LTM-est (1~3분기 기반 추정치)'
                        : '2026-LTM-est (Interim Estimate)'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">{language === 'ko' ? '비교 통화:' : 'Currency:'}</span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => setCurrencyMode('KRW')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  currencyMode === 'KRW'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                KRW (원화 억/만)
              </button>
              <button
                onClick={() => setCurrencyMode('USD')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  currencyMode === 'USD'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                USD ($ / k$)
              </button>
              <button
                onClick={() => setCurrencyMode('FUNCTIONAL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  currencyMode === 'FUNCTIONAL'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {language === 'ko' ? '원통화 (Functional)' : 'Original Currency'}
              </button>
            </div>
          </div>
        </div>

        {/* 2026 Estimate Notice Banner */}
        {activePeriod === '2026-LTM-est' && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold">
                {language === 'ko' ? '2026년 잠정 연환산(LTM) 추정치 안내:' : 'Interim 2026 LTM Analytical Estimate:'}
              </span>{' '}
              <span>
                {language === 'ko'
                  ? '2026-LTM-est 데이터는 2026년 1, 2, 3분기 공식 공시 데이터(인도량, 매출, 영업이익)를 바탕으로 연환산하여 도출한 분석 추정치입니다. 기업별 연간 사업보고서 및 결산단신이 공식 발표되는 즉시 공식 확정치로 업데이트됩니다.'
                  : 'The 2026-LTM-est metrics are interim analytical estimates derived from officially disclosed Q1, Q2, and Q3 cumulative results. They will be updated to audited full-year values once annual filings become available.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Headline Benchmark KPI Cards (Industry Medians) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Rev / Emp */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>{language === 'ko' ? '중간값: 인당 매출' : 'Median: Rev / Emp'}</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {formatEfficiencyCurrency(medians.revEmp, currencyMode, language, 'employee')}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {language === 'ko' ? '16개사 중앙값 (연간 매출 ÷ 총 직원수)' : 'Median revenue per employee'}
          </p>
        </div>

        {/* Card 2: Profit / Emp */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === 'ko' ? '중간값: 인당 영업이익' : 'Median: Profit / Emp'}</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {formatEfficiencyCurrency(medians.profitEmp, currencyMode, language, 'employee')}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {language === 'ko' ? '16개사 중앙값 (영업이익 ÷ 총 직원수)' : 'Median operating profit per employee'}
          </p>
        </div>

        {/* Card 3: Rev / Vehicle */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Car className="w-3.5 h-3.5 text-violet-500" />
            <span>{language === 'ko' ? '중간값: 대당 매출' : 'Median: Rev / Veh'}</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {formatEfficiencyCurrency(medians.revVeh, currencyMode, language, 'vehicle')}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {language === 'ko' ? '차량 부문 매출 ÷ 출하/인도량' : 'Automotive revenue per vehicle'}
          </p>
        </div>

        {/* Card 4: R&D % */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Cpu className="w-3.5 h-3.5 text-sky-500" />
            <span>{language === 'ko' ? '중간값: R&D 집약도' : 'Median: R&D Intensity'}</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {formatEfficiencyPercentage(medians.rdPct)}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {language === 'ko' ? 'R&D 투자액 ÷ 총매출 × 100' : 'R&D expenditure as % of revenue'}
          </p>
        </div>

        {/* Card 5: CapEx % */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'ko' ? '중간값: CapEx 집약도' : 'Median: CapEx Intensity'}</span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
            {formatEfficiencyPercentage(medians.capexPct)}
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {language === 'ko' ? '설비투자액 ÷ 총매출 × 100' : 'Capital expenditures as % of revenue'}
          </p>
        </div>
      </div>

      {/* Interactive Benchmark Comparison Bar Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'ko' ? '지표별 16개사 시각화 랭킹' : 'Efficiency Distribution Across Automakers'}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              {language === 'ko' ? '원하는 생산성 또는 투자 지표를 선택하여 순위를 직관적으로 확인하세요.' : 'Select a productivity or investment ratio to visualize manufacturer rankings.'}
            </p>
          </div>

          {/* Metric Selector Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedChartMetric}
              onChange={(e) => setSelectedChartMetric(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value="profitPerEmployee">{language === 'ko' ? '직원 1인당 영업이익' : 'Profit per Employee'}</option>
              <option value="revenuePerEmployee">{language === 'ko' ? '직원 1인당 매출' : 'Revenue per Employee'}</option>
              <option value="revenuePerVehicle">{language === 'ko' ? '차량 1대당 매출' : 'Revenue per Vehicle'}</option>
              <option value="profitPerVehicle">{language === 'ko' ? '차량 1대당 영업이익' : 'Profit per Vehicle'}</option>
              <option value="rdIntensity">{language === 'ko' ? 'R&D 집약도 (%)' : 'R&D Intensity (%)'}</option>
              <option value="capexIntensity">{language === 'ko' ? 'CapEx 집약도 (%)' : 'CapEx Intensity (%)'}</option>
              <option value="revenuePerCapex">{language === 'ko' ? 'CapEx 대비 매출 (배수)' : 'Revenue per CapEx (x)'}</option>
            </select>
          </div>
        </div>

        {/* Visual Horizontal Bars */}
        <div className="space-y-2 pt-2">
          {chartData.map((item, idx) => {
            const isNegative = item.value < 0;
            const barWidthPercent = Math.min(100, Math.max(3, (Math.abs(item.value) / maxChartValue) * 100));

            return (
              <div
                key={item.companyId}
                className={`flex items-center gap-3 p-2 rounded-xl transition ${
                  item.isHighlight
                    ? 'bg-brand-50/80 dark:bg-brand-950/40 ring-1 ring-brand-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="w-5 text-right font-mono text-xs font-bold text-slate-400">
                  {idx + 1}
                </span>

                {/* Company Name */}
                <div className="w-32 sm:w-44 shrink-0 flex items-center gap-2 truncate">
                  {item.logoUrl ? (
                    <img src={item.logoUrl} alt={item.name} className="w-4 h-4 object-contain shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>

                {/* Bar Container */}
                <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative flex items-center">
                  <div
                    style={{ width: `${barWidthPercent}%` }}
                    className={`h-full transition-all duration-300 rounded-lg ${
                      isNegative
                        ? 'bg-rose-500 dark:bg-rose-600'
                        : item.isHighlight
                        ? 'bg-brand-600 dark:bg-brand-500'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    }`}
                  />
                  <span
                    className={`absolute right-2 font-mono text-[11px] font-bold ${
                      barWidthPercent > 60
                        ? 'text-white'
                        : isNegative
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.formattedValue}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Business Model Caution Note */}
        <div className="pt-2 flex items-start gap-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            {language === 'ko'
              ? '유의사항: 높은 인당 매출이나 대당 매출이 반드시 우수한 경영 성과를 의미하는 것은 아닙니다. 예를 들어, 핵심 부품을 자체 제조하지 않고 외주(Outsourcing)에 의존하는 기업은 고정 인건비가 적어 인당 매출이 과대하게 보일 수 있으며, 금융 서비스(Financial Services) 매출 포함 여부에 따라서도 차이가 발생합니다.'
              : 'Caution: Higher revenue or profit metrics do not inherently imply superior management efficiency. Outsourcing manufacturing or heavy vertical integration materially influences headcount ratios, alongside the consolidation of captive financial services.'}
          </span>
        </div>
      </div>

      {/* Sortable OEM Efficiency Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        {/* Table Search & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'ko' ? '전체 OEM 원가 및 효율성 상세 비교표' : 'Detailed OEM Efficiency Benchmark Table'}
            </h3>
            <span className="text-xs font-mono font-medium text-slate-400">
              ({filteredRecords.length}/{rawRecords.length})
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ko' ? '제조사 검색...' : 'Filter automaker...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-3 w-8 text-center">#</th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>{language === 'ko' ? '완성차 OEM' : 'Automaker'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right" onClick={() => handleSort('headcount')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ko' ? '임직원수' : 'Workforce'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right" onClick={() => handleSort('revenuePerEmployee')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ko' ? '인당 매출' : 'Rev / Emp'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right" onClick={() => handleSort('profitPerEmployee')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ko' ? '인당 영업이익' : 'Profit / Emp'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right" onClick={() => handleSort('revenuePerVehicle')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ko' ? '대당 매출' : 'Rev / Veh'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right" onClick={() => handleSort('profitPerVehicle')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ko' ? '대당 영업이익' : 'Profit / Veh'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right" onClick={() => handleSort('rdIntensity')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ko' ? 'R&D %' : 'R&D %'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right" onClick={() => handleSort('capexIntensity')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ko' ? 'CapEx %' : 'CapEx %'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white text-right" onClick={() => handleSort('revenuePerCapex')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ko' ? 'Rev / CapEx' : 'Rev / CapEx'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">{language === 'ko' ? '품질·출처' : 'Provenance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredRecords.map((rec, idx) => {
                const isHighlight = rec.companyId === highlightCompanyId;
                const curr = currencyMode === 'FUNCTIONAL' ? rec.reportingCurrency : currencyMode;
                const isProfitEmpNeg = (rec.displayProfitEmp || 0) < 0;
                const isProfitVehNeg = (rec.displayProfitVeh || 0) < 0;

                return (
                  <tr
                    key={rec.companyId}
                    className={`transition ${
                      isHighlight
                        ? 'bg-brand-50/80 dark:bg-brand-950/40 font-semibold'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    {/* OEM Name with link */}
                    <td className="py-3 px-3 font-sans">
                      <Link
                        to={`/company/${rec.companyId}`}
                        className="flex items-center gap-2 group font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        {rec.company?.logoUrl ? (
                          <img src={rec.company.logoUrl} alt={rec.companyName} className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                        )}
                        <span className="truncate">{language === 'ko' ? rec.company?.nativeName || rec.company?.shortName || rec.companyName : rec.companyName}</span>
                        {rec.fiscalYearEnd.includes('Mar') && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                            3월 결산
                          </span>
                        )}
                      </Link>
                    </td>

                    {/* Headcount */}
                    <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 font-mono">
                      {rec.headcount.toLocaleString()}
                    </td>

                    {/* Rev / Emp */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatEfficiencyCurrency(rec.displayRevEmp, curr, language, 'employee')}
                    </td>

                    {/* Profit / Emp */}
                    <td
                      className={`py-3 px-3 text-right font-bold ${
                        isProfitEmpNeg
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatEfficiencyCurrency(rec.displayProfitEmp, curr, language, 'employee')}
                    </td>

                    {/* Rev / Veh */}
                    <td className="py-3 px-3 text-right text-slate-800 dark:text-slate-200">
                      {formatEfficiencyCurrency(rec.displayRevVeh, curr, language, 'vehicle')}
                    </td>

                    {/* Profit / Veh */}
                    <td
                      className={`py-3 px-3 text-right font-semibold ${
                        isProfitVehNeg
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatEfficiencyCurrency(rec.displayProfitVeh, curr, language, 'vehicle')}
                    </td>

                    {/* R&D % */}
                    <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatEfficiencyPercentage(rec.rdIntensity)}
                    </td>

                    {/* CapEx % */}
                    <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatEfficiencyPercentage(rec.capexIntensity)}
                    </td>

                    {/* Rev / CapEx */}
                    <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatEfficiencyRatio(rec.revenuePerCapex)}
                    </td>

                    {/* Quality / Provenance Badge */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedProvenanceRecord(rec)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold transition hover:scale-105 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        title={language === 'ko' ? '출처 문서 및 산출 근거 보기' : 'View Source Citation & Formula'}
                      >
                        {rec.isEstimate ? (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {language === 'ko' ? '추정치' : 'Est'}
                          </span>
                        ) : rec.metricClassifications.revenuePerVehicle === 'proxy' ? (
                          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                            <Info className="w-2.5 h-2.5" />
                            {language === 'ko' ? '프록시' : 'Proxy'}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            {language === 'ko' ? '공식 검증' : 'Verified'}
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology & Definition Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {language === 'ko' ? '원가 및 생산성 벤치마크 지표 정의 및 산출식' : 'Efficiency Metrics Methodology & Limitations'}
                </h3>
              </div>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  1. 직원 1인당 매출 및 영업이익 (Revenue & Operating Profit per Employee)
                </div>
                <div>산식: 매출액 ÷ 총 임직원수 / 영업이익 ÷ 총 임직원수</div>
                <div className="text-[11px] text-slate-400">
                  설명: 각 사의 공식 연말 또는 연평균 재직 인원수(Headcount)를 기준으로 산출합니다. 외주 비율이 높거나 부품 조달을 외부에서 주로 수행하는 기업은 인당 생산성 수치가 높게 나타날 수 있습니다.
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  2. 차량 1대당 매출 및 영업이익 (Revenue & Operating Profit per Vehicle)
                </div>
                <div>산식: 자동차 부문 매출액 ÷ 출하/인도량 / 자동차 부문 영업이익 ÷ 출하/인도량</div>
                <div className="text-[11px] text-slate-400">
                  설명: 금융 서비스 자회사를 제외한 순수 자동차 부문 매출과 이익을 우선 사용하며, 부문 분리가 공시되지 않는 기업(테슬라, 리비안 등)은 그룹 수치를 프록시로 명시하여 표기합니다.
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  3. R&D 집약도 및 CapEx 집약도 (R&D & CapEx Intensity)
                </div>
                <div>산식: R&D 투자액 ÷ 총매출 × 100 (%) / 설비투자(CapEx) ÷ 총매출 × 100 (%)</div>
                <div className="text-[11px] text-slate-400">
                  설명: IFRS(개발비 자본화 허용)와 US-GAAP(전액 당기비용화 원칙) 간 회계 차이가 존재하며, 각 사의 공식 현금흐름표 및 주석 공시를 일관되게 적용하였습니다.
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  4. CapEx 대비 매출 배수 (Revenue per Unit of CapEx)
                </div>
                <div>산식: 총매출 ÷ 설비투자액(CapEx)</div>
                <div className="text-[11px] text-slate-400">
                  설명: 1달러 또는 1원의 설비투자가 창출하는 매출의 규모를 나타내는 기술적(descriptive) 비율이며, 투자 수익률(ROIC)의 절대적 증거는 아닙니다.
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-brand-500 transition"
              >
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provenance Detail Modal */}
      {selectedProvenanceRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedProvenanceRecord.companyName} — {selectedProvenanceRecord.period} {language === 'ko' ? '원천 출처 정보' : 'Source Provenance'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProvenanceRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === 'ko' ? '공식 출처 문서:' : 'Primary Document:'}</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-xs truncate">
                  {selectedProvenanceRecord.sourceCitation}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === 'ko' ? '페이지 / 섹션 위치:' : 'Page Locator:'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedProvenanceRecord.pageOrLocator}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === 'ko' ? '인력 기준 / 범위:' : 'Headcount Scope:'}</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {language === 'ko' ? selectedProvenanceRecord.headcountNotesKo : selectedProvenanceRecord.headcountNotesEn}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{language === 'ko' ? '결산월:' : 'Fiscal Year End:'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedProvenanceRecord.fiscalYearEnd}</span>
              </div>
              {selectedProvenanceRecord.isEstimate && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                  <div className="font-bold mb-0.5">{language === 'ko' ? '추정치 산출 방식:' : 'Estimation Methodology:'}</div>
                  <div>{language === 'ko' ? selectedProvenanceRecord.estimateBasisNotesKo : selectedProvenanceRecord.estimateBasisNotesEn}</div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <a
                href={selectedProvenanceRecord.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                <span>{language === 'ko' ? '공식 원본 보고서 열람' : 'Open Primary Source'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedProvenanceRecord(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
