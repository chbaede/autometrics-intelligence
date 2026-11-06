import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllCompanies, getObservations } from '../../utils/metricQueries';
import { VolumeDefinition, MetricObservation } from '../../types/metrics';
import { matchesVolumeFilter } from '../../utils/metricCalculations';
import { convertMillionsToKRW, convertMillionsToUSD, formatOriginalCurrencyCompact } from '../../utils/currencyUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Trophy,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

export type SortField =
  | 'deliveries'
  | 'revenue'
  | 'operating_income'
  | 'operating_margin'
  | 'bev_share'
  | 'name';

interface OEMCompetitiveLeaderboardProps {
  activePeriod: string;
  onSelectPeriod: (period: string) => void;
  availablePeriods: string[];
  onSelectObservation?: (obs: MetricObservation) => void;
}

export const OEMCompetitiveLeaderboard: React.FC<OEMCompetitiveLeaderboardProps> = ({
  activePeriod,
  onSelectPeriod,
  availablePeriods,
  onSelectObservation,
}) => {
  const { language } = useLanguage();
  const allCompanies = getAllCompanies();

  const [sortField, setSortField] = useState<SortField>('operating_income');
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [volumeFilter, setVolumeFilter] = useState<'all' | VolumeDefinition>('all');
  const [currencyMode, setCurrencyMode] = useState<'KRW' | 'USD'>('KRW');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(false);
    }
  };

  // Compile full OEM metrics for active period
  const leaderboardData = useMemo(() => {
    return allCompanies.map((comp) => {
      const delObs = getObservations([comp.id], ['deliveries_global'], activePeriod).find((o) =>
        matchesVolumeFilter(o, 'deliveries_global', volumeFilter)
      );
      const revObs = getObservations([comp.id], ['revenue'], activePeriod)[0];
      const ebitObs = getObservations([comp.id], ['operating_income'], activePeriod)[0];
      const marginObs = getObservations([comp.id], ['operating_margin'], activePeriod)[0];
      const bevObs = getObservations([comp.id], ['bev_share'], activePeriod)[0];

      // Normalized Revenue & EBIT
      const curr = comp.reportingCurrency || 'USD';
      let normRevenue = 0;
      let normEbit = 0;

      if (currencyMode === 'KRW') {
        normRevenue = revObs?.value ? (convertMillionsToKRW(revObs.value, curr) || 0) / 1_000_000_000_000 : 0;
        normEbit = ebitObs?.value ? (convertMillionsToKRW(ebitObs.value, curr) || 0) / 1_000_000_000_000 : 0;
      } else {
        normRevenue = revObs?.value ? (convertMillionsToUSD(revObs.value, curr) || 0) / 1_000_000_000 : 0;
        normEbit = ebitObs?.value ? (convertMillionsToUSD(ebitObs.value, curr) || 0) / 1_000_000_000 : 0;
      }

      const deliveriesVal = delObs?.value ?? 0;
      const marginVal = marginObs?.value ?? -999;
      const bevVal = bevObs?.value ?? 0;

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

  // Sort rows
  const sortedData = useMemo(() => {
    return [...leaderboardData].sort((a, b) => {
      let valA = 0;
      let valB = 0;

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
        case 'name':
          return sortAscending
            ? a.company.shortName.localeCompare(b.company.shortName)
            : b.company.shortName.localeCompare(a.company.shortName);
        default:
          valA = a.normEbit;
          valB = b.normEbit;
      }

      return sortAscending ? valA - valB : valB - valA;
    });
  }, [leaderboardData, sortField, sortAscending]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4 p-4 sm:p-6 transition-colors">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {language === 'ko' ? '글로벌 완성차 다면적 종합 경쟁력 랭킹' : 'Global OEM Multi-Metric Competitive Leaderboard'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'ko'
              ? '판매량, 매출액, 실제 영업수익, 마진율 및 전동화 비중을 단일 화면에서 교차 비교 및 정렬합니다.'
              : 'Sort and rank global automakers side-by-side across volume, revenue, absolute operating profit, and electrification mix.'}
          </p>
        </div>

        {/* Controls: Period, Volume Filter, Currency */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono">
            {availablePeriods.slice(0, 5).map((p) => (
              <button
                key={p}
                onClick={() => onSelectPeriod(p)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  activePeriod === p
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">
            <button
              onClick={() => setCurrencyMode('KRW')}
              className={`px-2 py-1 rounded-lg transition ${
                currencyMode === 'KRW'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              KRW(조원)
            </button>
            <button
              onClick={() => setCurrencyMode('USD')}
              className={`px-2 py-1 rounded-lg transition ${
                currencyMode === 'USD'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              USD($B)
            </button>
          </div>

          {/* Volume Definition Filter */}
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
              return (
                <tr
                  key={row.company.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Rank */}
                  <td className="py-3 px-3 text-center font-mono font-bold">
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
                    {row.deliveriesVal > 0 ? (
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
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Revenue */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.normRevenue > 0 ? (
                      <div className="flex flex-col items-end">
                        <span
                          className="font-bold cursor-pointer hover:underline text-slate-900 dark:text-slate-100"
                          onClick={() => row.revenueObs && onSelectObservation?.(row.revenueObs)}
                        >
                          {currencyMode === 'KRW'
                            ? `₩${row.normRevenue >= 10 ? row.normRevenue.toFixed(1) : row.normRevenue.toFixed(2)}조`
                            : `$${row.normRevenue >= 10 ? row.normRevenue.toFixed(1) : row.normRevenue.toFixed(2)}B`}
                        </span>
                        {row.revenueObs?.value && (
                          <span className="text-[10px] text-slate-400">
                            {formatOriginalCurrencyCompact(row.revenueObs.value, row.company.reportingCurrency)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Operating Profit */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.ebitObs?.value !== undefined && row.ebitObs.value !== null ? (
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
                        <span className="text-[10px] text-slate-400">
                          {formatOriginalCurrencyCompact(row.ebitObs.value, row.company.reportingCurrency)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Operating Margin */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.marginVal !== -999 ? (
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
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* BEV Share */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.bevVal > 0 ? (
                      <span
                        className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                        onClick={() => row.bevObs && onSelectObservation?.(row.bevObs)}
                      >
                        {row.bevVal}%
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">0%</span>
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
              ? '① 판매량: 고객 인도(소매)와 딜러 출하(도매) 공시 기준을 엄격히 구분하여 표시합니다. ② 수익성: 메르세데스-벤츠의 경우 승용차(Cars) 부문 단독 조정 RoS가 표시되며, 그 외 제조사는 연결 그룹 기준입니다. ③ 일본 제조사(도요타 등)는 3월 결산 법인으로서 해당 연도 2분기(7~9월)가 달력 기준 3분기(2026-Q3)에 정렬됩니다.'
              : '① Volume: Clearly discriminates retail customer handovers from wholesale dealer dispatches. ② Margins: Mercedes-Benz displays Cars Division adjusted RoS; other OEMs report consolidated group EBIT. ③ Japanese OEMs align Q2 of their fiscal year ending March to calendar Q3 (July-September).'}
          </p>
        </div>
      </div>
    </div>
  );
};
