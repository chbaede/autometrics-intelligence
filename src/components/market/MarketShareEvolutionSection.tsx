import React, { useState, useMemo } from 'react';
import {
  getMarketDenominator,
} from '../../data/marketShareData';
import { getAllCompanies, getObservations, getRegionalObservations } from '../../utils/metricQueries';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  PieChart,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const MarketShareEvolutionSection: React.FC = () => {
  const { language } = useLanguage();
  const allCompanies = getAllCompanies();

  const [selectedMarketId, setSelectedMarketId] = useState<'global' | 'europe' | 'china' | 'united_states'>('global');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-Q3');

  const availableMarkets = [
    { id: 'global', nameKo: '글로벌 전체 시장', nameEn: 'Global Light Vehicle Market' },
    { id: 'europe', nameKo: '유럽 (ACEA 기준)', nameEn: 'Europe (ACEA Registrations)' },
    { id: 'china', nameKo: '중국 (CPCA 소매 기준)', nameEn: 'China (CPCA Retail Deliveries)' },
    { id: 'united_states', nameKo: '미국 (BEA 소매 기준)', nameEn: 'United States (BEA Retail Sales)' },
  ];

  const availablePeriods = ['2026-Q3', '2026-Q2', '2026-Q1', '2025-FY', '2024-FY'];

  // Current market denominator
  const currentDenominator = useMemo(() => {
    return getMarketDenominator(selectedMarketId, selectedPeriod);
  }, [selectedMarketId, selectedPeriod]);

  // Previous comparison period for YoY/QoQ calculation
  const previousComparisonPeriod = useMemo(() => {
    if (selectedPeriod === '2026-Q3') return '2025-Q3';
    if (selectedPeriod === '2026-Q2') return '2025-Q2';
    if (selectedPeriod === '2026-Q1') return '2025-Q1';
    if (selectedPeriod === '2025-FY') return '2024-FY';
    return undefined;
  }, [selectedPeriod]);

  const prevDenominator = useMemo(() => {
    if (!previousComparisonPeriod) return undefined;
    return getMarketDenominator(selectedMarketId, previousComparisonPeriod);
  }, [selectedMarketId, previousComparisonPeriod]);

  // Compile OEM share records for selected market and period
  const marketShareRows = useMemo(() => {
    if (!currentDenominator) return [];

    const totalDenom = currentDenominator.totalMarketVolume;

    return allCompanies.map((comp) => {
      let numeratorVolume: number | null = null;
      let unavailableReason: string | undefined = undefined;
      let sourceDocId: string | undefined = undefined;

      if (selectedMarketId === 'global') {
        const obs = getObservations([comp.id], ['deliveries_global'], selectedPeriod)[0];
        if (obs && obs.value !== null && obs.value !== undefined) {
          numeratorVolume = obs.value;
          sourceDocId = obs.sourceDocId;
        } else {
          unavailableReason = language === 'ko' ? '해당 분기 글로벌 총량 미공시' : 'Global volume not disclosed for period';
        }
      } else {
        // Query regional observations for the specific market
        const regObsList = getRegionalObservations(selectedMarketId);
        const regObs = regObsList.find((o) => o.companyId === comp.id && o.period === selectedPeriod);

        if (regObs && regObs.value !== null && regObs.value !== undefined) {
          numeratorVolume = regObs.value;
          sourceDocId = regObs.sourceDocId;
        } else {
          // Identify specific OEM disclosure policy
          if (comp.id === 'tesla') {
            unavailableReason =
              language === 'ko'
                ? '테슬라 IR 정책상 분기별 대륙별 단독 인도량 미공시 (연간 10-K에만 보고)'
                : 'Tesla IR omits disaggregated quarterly regional volumes (reported only annually in 10-K)';
          } else {
            unavailableReason =
              language === 'ko'
                ? '해당 분기 공식 IR 원문에 해당 권역 세부 인도량 미공시'
                : 'Regional deliveries not disaggregated in official quarterly filing';
          }
        }
      }

      // Calculate share %
      const marketShare = numeratorVolume !== null ? (numeratorVolume / totalDenom) * 100 : null;

      // YoY Calculation if previous period exists
      let yoyPpDelta: number | null = null;
      if (marketShare !== null && prevDenominator) {
        let prevNumerator: number | null = null;
        if (selectedMarketId === 'global') {
          const prevObs = previousComparisonPeriod
            ? getObservations([comp.id], ['deliveries_global'], previousComparisonPeriod)[0]
            : undefined;
          if (prevObs && prevObs.value) prevNumerator = prevObs.value;
        } else if (previousComparisonPeriod) {
          const regObsPrev = getRegionalObservations(selectedMarketId).find(
            (o) => o.companyId === comp.id && o.period === previousComparisonPeriod
          );
          if (regObsPrev && regObsPrev.value) prevNumerator = regObsPrev.value;
        }

        if (prevNumerator !== null && prevDenominator.totalMarketVolume > 0) {
          const prevShare = (prevNumerator / prevDenominator.totalMarketVolume) * 100;
          yoyPpDelta = Number((marketShare - prevShare).toFixed(2));
        }
      }

      return {
        company: comp,
        numeratorVolume,
        marketShare,
        yoyPpDelta,
        unavailableReason,
        sourceDocId,
      };
    })
      .sort((a, b) => (b.marketShare ?? -1) - (a.marketShare ?? -1));
  }, [allCompanies, currentDenominator, prevDenominator, selectedMarketId, selectedPeriod, previousComparisonPeriod, language]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-6 space-y-5 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {language === 'ko' ? '글로벌 및 주요 권역별 시장 점유율 변화 (Market Share Evolution)' : 'Market Share Evolution & Official Denominators'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'ko'
              ? '임의 추정치를 철저히 배제하고, 공식 등록 기관(ACEA, CPCA, BEA, OICA)의 전체 시장 모수(분모)와 OEM 공식 실적(분자)을 매칭하여 실제 시장 점유율 및 증감을 산출합니다.'
              : 'Grounded strictly in verified industry authority totals (denominators) matched against official OEM disclosures (numerators) with percentage-point evolution.'}
          </p>
        </div>

        {/* Market & Period Selectors */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Market Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">
            {availableMarkets.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMarketId(m.id as any)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedMarketId === m.id
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {language === 'ko' ? m.nameKo.split(' ')[0] : m.nameEn.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Period Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-bold">
            {availablePeriods.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedPeriod === p
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Denominator Transparency Banner */}
      {currentDenominator ? (
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>
                {language === 'ko' ? currentDenominator.marketNameKo : currentDenominator.marketNameEn} 공식 시장 모수 (분모)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                {currentDenominator.authorityName}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-normal">
              {currentDenominator.vehicleScope} • {currentDenominator.notes}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                {language === 'ko' ? '전체 시장 규모 (모수)' : 'Total Market Volume'}
              </span>
              <span className="text-base font-extrabold font-mono text-brand-600 dark:text-brand-400">
                {(currentDenominator.totalMarketVolume / 1000).toFixed(2)}M 대
                <span className="text-xs text-slate-400 font-normal ml-1">
                  ({Math.round(currentDenominator.totalMarketVolume).toLocaleString()}k)
                </span>
              </span>
            </div>
            <a
              href={currentDenominator.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition"
              title={currentDenominator.sourceTitle}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-200">
          {language === 'ko'
            ? '선택한 시장 및 기간에 대한 공식 모수(분모)가 등록되지 않았습니다. 임의 추정치를 배제하기 위해 시장 점유율 계산을 중단합니다.'
            : 'Official market denominator data unavailable for selected parameters. Market share calculations suspended to prevent data fabrication.'}
        </div>
      )}

      {/* Market Share Evolution Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-12 text-center">#</th>
              <th className="py-3 px-3">{language === 'ko' ? '완성차 제조사' : 'OEM'}</th>
              <th className="py-3 px-3 text-right">{language === 'ko' ? '공식 인도량 (분자)' : 'OEM Deliveries (Numerator)'}</th>
              <th className="py-3 px-3 text-right">{language === 'ko' ? '전체 시장 (분모)' : 'Market Total (Denominator)'}</th>
              <th className="py-3 px-3 text-right">{language === 'ko' ? '시장 점유율 (%)' : 'Market Share (%)'}</th>
              <th className="py-3 px-3 text-right">{language === 'ko' ? 'YoY 증감 (pp)' : 'YoY Change (pp)'}</th>
              <th className="py-3 px-3 text-center">{language === 'ko' ? '데이터 상태' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {marketShareRows.map((row, idx) => {
              const isAvailable = row.marketShare !== null;

              return (
                <tr key={row.company.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Rank */}
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                    {isAvailable ? idx + 1 : '-'}
                  </td>

                  {/* Company */}
                  <td className="py-3 px-3 font-medium">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {row.company.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {row.company.hqCountry} • {row.company.ticker}
                      </span>
                    </div>
                  </td>

                  {/* Numerator */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.numeratorVolume !== null ? (
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {row.numeratorVolume >= 1000
                          ? `${(row.numeratorVolume / 1000).toFixed(2)}M 대`
                          : `${Math.round(row.numeratorVolume).toLocaleString()}k 대`}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Denominator */}
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {currentDenominator
                      ? `${(currentDenominator.totalMarketVolume / 1000).toFixed(2)}M 대`
                      : '-'}
                  </td>

                  {/* Market Share % */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.marketShare !== null ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div
                            className="bg-brand-600 dark:bg-brand-400 h-full rounded-full"
                            style={{ width: `${Math.min(row.marketShare * 4, 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-sm text-brand-600 dark:text-brand-400">
                          {row.marketShare.toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* YoY Change in percentage points */}
                  <td className="py-3 px-3 text-right font-mono">
                    {row.yoyPpDelta !== null ? (
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded ${
                          row.yoyPpDelta > 0
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                            : row.yoyPpDelta < 0
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                            : 'text-slate-500'
                        }`}
                      >
                        {row.yoyPpDelta > 0 ? `+${row.yoyPpDelta}` : row.yoyPpDelta} pp
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">-</span>
                    )}
                  </td>

                  {/* Status & Caveat */}
                  <td className="py-3 px-3 text-center">
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'ko' ? '검증 완료' : 'Verified'}</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium cursor-help"
                        title={row.unavailableReason}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{language === 'ko' ? '공시 제외' : 'Omitted in IR'}</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Disclaimers & Methodology */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
          <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
          <span>{language === 'ko' ? '시장 점유율 산출 원칙 및 한계 고지' : 'Market Share Methodology & Zero-Fabrication Invariants'}</span>
        </div>
        <p className="leading-relaxed">
          {language === 'ko'
            ? '본 플랫폼은 출처가 불분명한 외부 추정치로 분모를 임의 대체하지 않습니다. 유럽은 ACEA 승용 신규 등록, 중국은 CPCA 승용 소매 인도, 미국은 BEA 경량차 판매 통계를 단일 기준으로 적용합니다. 테슬라 등 분기보고서에서 대륙별 세부 인도량을 공시하지 않는 제조사는 임의 추정하지 않고 엄격히 "공시 제외"로 표기합니다.'
            : 'Denominator figures are strictly taken from official authority datasets (ACEA, CPCA, BEA, OICA). Automakers that do not disaggregate quarterly deliveries by continent in their investor disclosures (such as Tesla quarterly filings) are transparently marked as omitted rather than estimated.'}
        </p>
      </div>
    </div>
  );
};
