import React, { useState, useMemo } from 'react';
import { MetricObservation } from '../../types/metrics';
import { getAllCompanies, getObservations } from '../../utils/metricQueries';
import { convertMillionsToKRW, convertMillionsToUSD } from '../../utils/currencyUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Trophy,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  HelpCircle,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface OEMCompetitiveLeaderboardProps {
  activePeriod?: string;
  onSelectPeriod?: (period: string) => void;
  availablePeriods?: string[];
  onSelectObservation?: (obs: MetricObservation) => void;
}

type SortField = 'deliveries' | 'revenue' | 'operating_income' | 'operating_margin' | 'bev_share' | 'name';
type CurrencyMode = 'KRW' | 'USD';
type VolumeFilter = 'all' | 'retail_deliveries' | 'wholesale_shipments';

export const OEMCompetitiveLeaderboard: React.FC<OEMCompetitiveLeaderboardProps> = ({
  activePeriod: controlledPeriod,
  onSelectPeriod: setControlledPeriod,
  availablePeriods: controlledPeriods,
  onSelectObservation,
}) => {
  const { language } = useLanguage();
  const allCompanies = getAllCompanies();

  const [internalPeriod, setInternalPeriod] = useState<string>('2026-Q3');
  const activePeriod = controlledPeriod ?? internalPeriod;
  const setActivePeriod = setControlledPeriod ?? setInternalPeriod;

  const [sortField, setSortField] = useState<SortField>('operating_income');
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('KRW');
  const [volumeFilter, setVolumeFilter] = useState<VolumeFilter>('all');

  const availablePeriods = controlledPeriods ?? ['2026-Q3', '2026-Q2', '2026-Q1', '2025-FY', '2024-FY'];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(false);
    }
  };

  // Compile full OEM metrics for active period without artificial fallback values
  const leaderboardData = useMemo(() => {
    return allCompanies.map((comp) => {
      const delObs = getObservations([comp.id], ['deliveries_global'], activePeriod).find((o) =>
        matchesVolumeFilter(o, 'deliveries_global', volumeFilter)
      );
      const revObs = getObservations([comp.id], ['revenue'], activePeriod)[0];
      const ebitObs = getObservations([comp.id], ['operating_income'], activePeriod)[0];
      const marginObs = getObservations([comp.id], ['operating_margin'], activePeriod)[0];
      const bevObs = getObservations([comp.id], ['bev_share'], activePeriod)[0];

      // Normalized Revenue & EBIT (Strict typed null for missing observations)
      const curr = comp.reportingCurrency || 'USD';
      let normRevenue: number | null = null;
      let normEbit: number | null = null;

      if (revObs && revObs.value !== null && revObs.value !== undefined) {
        if (currencyMode === 'KRW') {
          const converted = convertMillionsToKRW(revObs.value, curr);
          normRevenue = converted !== null ? converted / 1_000_000_000_000 : null;
        } else {
          const converted = convertMillionsToUSD(revObs.value, curr);
          normRevenue = converted !== null ? converted / 1_000_000_000 : null;
        }
      }

      if (ebitObs && ebitObs.value !== null && ebitObs.value !== undefined) {
        if (currencyMode === 'KRW') {
          const converted = convertMillionsToKRW(ebitObs.value, curr);
          normEbit = converted !== null ? converted / 1_000_000_000_000 : null;
        } else {
          const converted = convertMillionsToUSD(ebitObs.value, curr);
          normEbit = converted !== null ? converted / 1_000_000_000 : null;
        }
      }

      const deliveriesVal: number | null =
        delObs && delObs.value !== null && delObs.value !== undefined ? delObs.value : null;
      const marginVal: number | null =
        marginObs && marginObs.value !== null && marginObs.value !== undefined ? marginObs.value : null;
      const bevVal: number | null =
        bevObs && bevObs.value !== null && bevObs.value !== undefined ? bevObs.value : null;

      return {
        company: comp,
        deliveriesObs: delObs,
        revenueObs: revObs,
        ebitObs: ebitObs,
        marginObs: marginObs,
        bevObs: bevObs,
        deliveriesVal,
        normRevenue,
        normEbit,
        marginVal,
        bevVal,
      };
    });
  }, [allCompanies, activePeriod, volumeFilter, currencyMode]);

  // Sort rows: Missing (null) values must always be placed at the bottom regardless of sort order
  const sortedData = useMemo(() => {
    return [...leaderboardData].sort((a, b) => {
      if (sortField === 'name') {
        return sortAscending
          ? a.company.shortName.localeCompare(b.company.shortName)
          : b.company.shortName.localeCompare(a.company.shortName);
      }

      let valA: number | null = null;
      let valB: number | null = null;

      switch (sortField) {
        case 'deliveries':
          valA = a.deliveriesVal;
          valB = b.deliveriesVal;
          break;
        case 'revenue':
          valA = a.normRevenue;
          valB = b.normRevenue;
          break;
        case 'operating_income':
          valA = a.normEbit;
          valB = b.normEbit;
          break;
        case 'operating_margin':
          valA = a.marginVal;
          valB = b.marginVal;
          break;
        case 'bev_share':
          valA = a.bevVal;
          valB = b.bevVal;
          break;
        default:
          valA = a.normEbit;
          valB = b.normEbit;
      }

      // Null handling: missing observations always sink to the bottom
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      return sortAscending ? valA - valB : valB - valA;
    });
  }, [leaderboardData, sortField, sortAscending]);

  // Compute eligible OEM count for active sort field
  const eligibleOemCount = useMemo(() => {
    return leaderboardData.filter((row) => {
      switch (sortField) {
        case 'deliveries':
          return row.deliveriesVal !== null;
        case 'revenue':
          return row.normRevenue !== null;
        case 'operating_income':
          return row.normEbit !== null;
        case 'operating_margin':
          return row.marginVal !== null;
        case 'bev_share':
          return row.bevVal !== null;
        case 'name':
          return true;
        default:
          return row.normEbit !== null;
      }
    }).length;
  }, [leaderboardData, sortField]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4 p-4 sm:p-6 transition-colors">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {language === 'ko' ? '글로벌 완성차 공식 실적 순위 (OEM Leaderboard)' : 'OEM Competitive Ranking Leaderboard'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'ko'
              ? '완성차 제조사의 공식 IR 원문 공시 데이터를 기반으로 실적 순위를 비교 분석합니다. 결측치는 0으로 왜곡하지 않고 N/A로 투명하게 표시합니다.'
              : 'Grounded in primary investor relations disclosures. Missing interim data is explicitly treated as N/A and excluded from ranking scores.'}
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1">
            {language === 'ko' ? '공시 기준:' : 'Period:'}
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {availablePeriods.map((period) => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition ${
                  activePeriod === period
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Bar: Currency Toggle & Volume Scope Selector & Eligible OEM Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Currency Toggle */}
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              {language === 'ko' ? '환산 통화:' : 'Currency:'}
            </span>
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 font-bold font-mono">
              <button
                onClick={() => setCurrencyMode('KRW')}
                className={`px-2 py-0.5 rounded ${
                  currencyMode === 'KRW'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                KRW (조 원)
              </button>
              <button
                onClick={() => setCurrencyMode('USD')}
                className={`px-2 py-0.5 rounded ${
                  currencyMode === 'USD'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                USD ($B)
              </button>
            </div>
          </div>

          {/* Eligible Count Badge */}
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {language === 'ko'
                ? `유효 비교 제조사: ${eligibleOemCount}개사 (미공시 ${allCompanies.length - eligibleOemCount}개사)`
                : `Eligible Ranked OEMs: ${eligibleOemCount} / ${allCompanies.length}`}
            </span>
          </div>
        </div>

        {/* Volume Perimeter Scope Filter */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            {language === 'ko' ? '판매량 공시 기준:' : 'Volume Perimeter:'}
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
            <button
              onClick={() => setVolumeFilter('all')}
              className={`px-2 py-1 rounded-lg transition ${
                volumeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
              title="전체 공시 (소매 인도 + 도매 출하)"
            >
              {language === 'ko' ? '전체 공시' : 'All'}
            </button>
            <button
              onClick={() => setVolumeFilter('retail_deliveries')}
              className={`px-2 py-1 rounded-lg transition ${
                volumeFilter === 'retail_deliveries'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
              title="소매 인도 기준만 비교"
            >
              {language === 'ko' ? '소매 인도' : 'Retail'}
            </button>
            <button
              onClick={() => setVolumeFilter('wholesale_shipments')}
              className={`px-2 py-1 rounded-lg transition ${
                volumeFilter === 'wholesale_shipments'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
              title="도매 출하 기준만 비교"
            >
              {language === 'ko' ? '도매 출하' : 'Wholesale'}
            </button>
          </div>
        </div>
      </div>

      {/* Analytical Benchmark FX Rate Disclaimer */}
      <div className="px-3 py-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
        <span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {language === 'ko' ? '분석용 표준 고정 환율 안내:' : 'Standardized Analytical Benchmark FX Rates:'}
          </span>{' '}
          1 USD = 1,350 KRW | 1 EUR = 1,470 KRW | 100 JPY = 900 KRW | 1 CNY = 188 KRW | 1 SEK = 130 KRW
        </span>
        <span className="italic text-slate-400">
          {language === 'ko' ? '※ 기업 간 수평 비교용 분석 환율이며 개별 기업의 과거 실거래 환율이 아닙니다.' : '※ Fixed analytical benchmark for cross-OEM comparability, not transaction spot rates.'}
        </span>
      </div>

      {/* Leaderboard Table Container */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[760px] text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-12 text-center">#</th>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer hover:text-brand-600 transition select-none"
              >
                <div className="flex items-center gap-1">
                  <span>{language === 'ko' ? '완성차 OEM' : 'Automaker'}</span>
                  {sortField === 'name' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('deliveries')}
                className="py-3 px-3 cursor-pointer hover:text-brand-600 transition select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{language === 'ko' ? '글로벌 판매량' : 'Deliveries'}</span>
                  {sortField === 'deliveries' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('revenue')}
                className="py-3 px-3 cursor-pointer hover:text-brand-600 transition select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{language === 'ko' ? `매출액 (${currencyMode})` : `Revenue (${currencyMode})`}</span>
                  {sortField === 'revenue' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('operating_income')}
                className="py-3 px-3 cursor-pointer hover:text-brand-600 transition select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{language === 'ko' ? `영업이익 (${currencyMode})` : `Operating Profit (${currencyMode})`}</span>
                  {sortField === 'operating_income' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('operating_margin')}
                className="py-3 px-3 cursor-pointer hover:text-brand-600 transition select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{language === 'ko' ? '영업이익률 (%)' : 'Operating Margin (%)'}</span>
                  {sortField === 'operating_margin' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('bev_share')}
                className="py-3 px-3 cursor-pointer hover:text-brand-600 transition select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{language === 'ko' ? '전기차(BEV) 비중' : 'BEV Share (%)'}</span>
                  {sortField === 'bev_share' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-3 px-3 text-center">{language === 'ko' ? '공시 출처' : 'Source'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedData.map((row, idx) => {
              // Determine whether this row has a valid value for the active sort field
              let activeVal: number | null = null;
              switch (sortField) {
                case 'deliveries':
                  activeVal = row.deliveriesVal;
                  break;
                case 'revenue':
                  activeVal = row.normRevenue;
                  break;
                case 'operating_income':
                  activeVal = row.normEbit;
                  break;
                case 'operating_margin':
                  activeVal = row.marginVal;
                  break;
                case 'bev_share':
                  activeVal = row.bevVal;
                  break;
                case 'name':
                  activeVal = 1;
                  break;
                default:
                  activeVal = row.normEbit;
              }

              const isEligibleForRank = activeVal !== null;

              return (
                <tr
                  key={row.company.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Rank */}
                  <td className="py-3 px-3 text-center font-mono font-bold">
                    {isEligibleForRank ? (
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-extrabold'
                            : idx === 1
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold'
                            : idx === 2
                            ? 'bg-amber-700/15 text-amber-800 dark:text-amber-300 font-bold'
                            : 'text-slate-400 font-mono'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Company Name & Ticker */}
                  <td className="py-3 px-3 font-medium">
                    <Link
                      to={`/company/${row.company.id}`}
                      className="group flex flex-col hover:text-brand-600 dark:hover:text-brand-400 transition"
                    >
                      <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:underline flex items-center gap-1.5">
                        {row.company.shortName}
                        <span className="text-[10px] text-slate-400 font-mono font-normal">
                          ({row.company.hqCountry})
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {row.company.reportingCurrency} • {row.company.ticker}
                      </span>
                    </Link>
                  </td>

                  {/* Deliveries */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.deliveriesVal !== null ? (
                      <div className="flex flex-col items-end">
                        <span
                          className="font-bold cursor-pointer hover:underline text-slate-900 dark:text-slate-100"
                          onClick={() => row.deliveriesObs && onSelectObservation?.(row.deliveriesObs)}
                        >
                          {row.deliveriesVal >= 1000
                            ? `${(row.deliveriesVal / 1000).toFixed(2)}M`
                            : `${Math.round(row.deliveriesVal).toLocaleString()}k`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {row.deliveriesObs?.volumeDefinition === 'wholesale_shipments'
                            ? (language === 'ko' ? '도매' : 'Wholesale')
                            : (language === 'ko' ? '소매' : 'Retail')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono" title="해당 분기 미공시">N/A</span>
                    )}
                  </td>

                  {/* Revenue */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.normRevenue !== null ? (
                      <div className="flex flex-col items-end">
                        <span
                          className="font-bold cursor-pointer hover:underline text-slate-900 dark:text-slate-100"
                          onClick={() => row.revenueObs && onSelectObservation?.(row.revenueObs)}
                        >
                          {currencyMode === 'KRW'
                            ? `₩${row.normRevenue >= 10 ? row.normRevenue.toFixed(1) : row.normRevenue.toFixed(2)}조`
                            : `$${row.normRevenue >= 10 ? row.normRevenue.toFixed(1) : row.normRevenue.toFixed(2)}B`}
                        </span>
                        {row.revenueObs?.value !== undefined && row.revenueObs.value !== null && (
                          <span className="text-[10px] text-slate-400">
                            {formatOriginalCurrencyCompact(row.revenueObs.value, row.company.reportingCurrency)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono" title="해당 분기 미공시">N/A</span>
                    )}
                  </td>

                  {/* Operating Profit */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.normEbit !== null ? (
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-bold cursor-pointer hover:underline ${
                            row.normEbit < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                          onClick={() => row.ebitObs && onSelectObservation?.(row.ebitObs)}
                        >
                          {currencyMode === 'KRW'
                            ? `${row.normEbit < 0 ? '-' : ''}₩${Math.abs(row.normEbit).toFixed(2)}조`
                            : `${row.normEbit < 0 ? '-' : ''}$${Math.abs(row.normEbit).toFixed(2)}B`}
                        </span>
                        {row.ebitObs?.value !== undefined && row.ebitObs.value !== null && (
                          <span className="text-[10px] text-slate-400">
                            {formatOriginalCurrencyCompact(row.ebitObs.value, row.company.reportingCurrency)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono" title="해당 분기 미공시">N/A</span>
                    )}
                  </td>

                  {/* Operating Margin */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.marginVal !== null ? (
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded cursor-pointer hover:underline ${
                            row.marginVal >= 8
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : row.marginVal >= 4
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : row.marginVal >= 0
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-extrabold'
                          }`}
                          onClick={() => row.marginObs && onSelectObservation?.(row.marginObs)}
                        >
                          {row.marginVal}%
                        </span>
                        {row.marginObs?.reportingScope === 'cars_segment' && (
                          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-sans">
                            {language === 'ko' ? '승용 부문(Cars)' : 'Cars Seg.'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono" title="해당 분기 미공시">N/A</span>
                    )}
                  </td>

                  {/* BEV Share */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.bevVal !== null ? (
                      <span
                        className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                        onClick={() => row.bevObs && onSelectObservation?.(row.bevObs)}
                      >
                        {row.bevVal}%
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono" title="해당 분기 미공시">N/A</span>
                    )}
                  </td>

                  {/* Provenance Audit Link */}
                  <td className="py-3 px-3 text-center">
                    {row.ebitObs || row.marginObs || row.deliveriesObs ? (
                      <button
                        onClick={() => {
                          const targetObs = row.ebitObs || row.marginObs || row.deliveriesObs;
                          if (targetObs) onSelectObservation?.(targetObs);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title={language === 'ko' ? '공식 IR 공시 원문 출처 확인' : 'View Verified Primary IR Filing'}
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Strict Comparability Guidance Notes */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {language === 'ko' ? '정량 비교 유의사항 (Comparability Invariant):' : 'Comparability Invariants:'}
          </span>
          <p>
            {language === 'ko'
              ? '① 판매량: 고객 인도(소매)와 딜러 출하(도매) 공시 기준을 엄격히 구분하여 표시합니다. ② 수익성: 메르세데스-벤츠의 경우 승용차(Cars) 부문 단독 조정 RoS가 표시되며, 그 외 제조사는 연결 그룹 기준입니다. ③ 일본 제조사(도요타 등)는 3월 결산 법인으로서 해당 연도 2분기(7~9월)가 달력 기준 3분기(2026-Q3)에 정렬됩니다. ④ 결측치: 중간 분기보고서에서 해당 지표를 공시하지 않는 기업은 0으로 처리하지 않고 N/A로 제외합니다.'
              : '① Volume: Clearly discriminates retail customer handovers from wholesale dealer dispatches. ② Margins: Mercedes-Benz displays Cars Division adjusted RoS; other OEMs report consolidated group EBIT. ③ Japanese OEMs align Q2 of their fiscal year ending March to calendar Q3 (July-September). ④ Missing data: Automakers omitting specific metrics in quarterly interim reports are explicitly treated as N/A rather than zero.'}
          </p>
        </div>
      </div>
    </div>
  );
};

function matchesVolumeFilter(obs: MetricObservation | undefined, _metricId: string, filter: VolumeFilter): boolean {
  if (!obs) return false;
  if (filter === 'all') return true;
  return obs.volumeDefinition === filter;
}

function formatOriginalCurrencyCompact(val: number, currency: string): string {
  if (currency === 'KRW') {
    return `${(val / 1_000_000).toFixed(1)}조`;
  }
  if (currency === 'JPY') {
    return `¥${(val / 1_000).toFixed(1)}B`;
  }
  if (currency === 'EUR') {
    return `€${(val / 1_000).toFixed(1)}B`;
  }
  if (currency === 'USD') {
    return `$${(val / 1_000).toFixed(1)}B`;
  }
  if (currency === 'CNY') {
    return `¥${(val / 1_000).toFixed(1)}B`;
  }
  if (currency === 'SEK') {
    return `${(val / 1_000).toFixed(1)}B SEK`;
  }
  return `${val.toLocaleString()} ${currency}`;
}
