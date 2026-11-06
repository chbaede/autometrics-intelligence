import React, { useState, useMemo } from 'react';
import {
  getMarketDenominator,
  validateMarketShareCompatibility,
  inferObservationVehicleScope,
  MarketDenominator,
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
  Layers,
} from 'lucide-react';

export const MarketShareEvolutionSection: React.FC = () => {
  const { language } = useLanguage();
  const allCompanies = getAllCompanies();

  const [selectedMarketId, setSelectedMarketId] = useState<'global' | 'europe' | 'china' | 'united_states'>('global');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-Q3');

  const availableMarkets = [
    { id: 'global', nameKo: '글로벌 전체 시장', nameEn: 'Global Light Vehicle Market' },
    { id: 'europe', nameKo: '유럽 (ACEA 승용 기준)', nameEn: 'Europe (ACEA Registrations)' },
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
      let volumeDefinition: string | undefined = undefined;
      let reportingScope: string | undefined = undefined;
      let regionId: string | undefined = selectedMarketId;

      if (selectedMarketId === 'global') {
        const obs = getObservations([comp.id], ['deliveries_global'], selectedPeriod)[0];
        if (obs && obs.value !== null && obs.value !== undefined) {
          numeratorVolume = obs.value;
          sourceDocId = obs.sourceDocId;
          volumeDefinition = obs.volumeDefinition;
          reportingScope = obs.reportingScope;
        }
      } else {
        // Query regional observations for the specific market
        const regObsList = getRegionalObservations(selectedMarketId);
        const regObs = regObsList.find((o) => o.companyId === comp.id && o.period === selectedPeriod);

        if (regObs && regObs.value !== null && regObs.value !== undefined) {
          numeratorVolume = regObs.value;
          sourceDocId = regObs.sourceDocId;
          volumeDefinition = regObs.volumeDefinition;
          reportingScope = regObs.reportingScope;
          regionId = regObs.regionId;
        }
      }

      const vehicleScopeType = inferObservationVehicleScope({
        reportingScope,
        companyId: comp.id,
      });

      // Run strict compatibility validation
      const compatCheck = validateMarketShareCompatibility(
        {
          companyId: comp.id,
          marketId: selectedMarketId,
          period: selectedPeriod,
          observationValue: numeratorVolume,
          volumeDefinition,
          vehicleScopeType,
          reportingScope,
          regionId,
          unit: 'thousand_units',
        },
        currentDenominator
      );

      let marketShare: number | null = null;
      let yoyPpDelta: number | null = null;
      let isCompatible = compatCheck.isCompatible;

      if (isCompatible && numeratorVolume !== null && totalDenom > 0) {
        marketShare = Number(((numeratorVolume / totalDenom) * 100).toFixed(2));

        // Prior period calculation
        if (prevDenominator && previousComparisonPeriod) {
          let prevNumerator: number | null = null;
          let prevVolDef: string | undefined = undefined;
          let prevScope: string | undefined = undefined;

          if (selectedMarketId === 'global') {
            const prevObs = getObservations([comp.id], ['deliveries_global'], previousComparisonPeriod)[0];
            if (prevObs && prevObs.value) {
              prevNumerator = prevObs.value;
              prevVolDef = prevObs.volumeDefinition;
              prevScope = prevObs.reportingScope;
            }
          } else {
            const regObsPrev = getRegionalObservations(selectedMarketId).find(
              (o) => o.companyId === comp.id && o.period === previousComparisonPeriod
            );
            if (regObsPrev && regObsPrev.value) {
              prevNumerator = regObsPrev.value;
              prevVolDef = regObsPrev.volumeDefinition;
              prevScope = regObsPrev.reportingScope;
            }
          }

          const prevVehicleScope = inferObservationVehicleScope({
            reportingScope: prevScope,
            companyId: comp.id,
          });

          const prevCompat = validateMarketShareCompatibility(
            {
              companyId: comp.id,
              marketId: selectedMarketId,
              period: previousComparisonPeriod,
              observationValue: prevNumerator,
              volumeDefinition: prevVolDef,
              vehicleScopeType: prevVehicleScope,
              regionId: selectedMarketId,
              unit: 'thousand_units',
            },
            prevDenominator
          );

          if (prevCompat.isCompatible && prevNumerator !== null && prevDenominator.totalMarketVolume > 0) {
            const prevShare = (prevNumerator / prevDenominator.totalMarketVolume) * 100;
            yoyPpDelta = Number((marketShare - prevShare).toFixed(2));
          }
        }
      } else {
        unavailableReason = language === 'ko' ? compatCheck.rejectionReasonKo : compatCheck.rejectionReasonEn;
      }

      return {
        company: comp,
        numeratorVolume,
        marketShare,
        yoyPpDelta,
        unavailableReason,
        sourceDocId,
        isCompatible,
        incompatibilityCategory: compatCheck.incompatibilityCategory,
        volumeDefinition,
      };
    })
      .sort((a, b) => {
        if (a.marketShare !== null && b.marketShare !== null) {
          return b.marketShare - a.marketShare;
        }
        if (a.marketShare !== null) return -1;
        if (b.marketShare !== null) return 1;
        return a.company.shortName.localeCompare(b.company.shortName);
      });
  }, [allCompanies, currentDenominator, prevDenominator, selectedMarketId, selectedPeriod, previousComparisonPeriod, language]);

  const renderStatusBadge = (denom: MarketDenominator) => {
    if (denom.verificationStatus === 'verified' && denom.derivationMethod === 'directly_reported') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold">
          {language === 'ko' ? '공식 발표치 (Verified)' : 'Officially Reported'}
        </span>
      );
    }
    if (denom.verificationStatus === 'calculated' || denom.derivationMethod === 'calculated_from_monthly_sum') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono text-[10px] font-bold">
          {language === 'ko' ? '월별 집계 합산 (Calculated)' : 'Calculated From Monthly Data'}
        </span>
      );
    }
    if (denom.verificationStatus === 'estimated' || denom.derivationMethod === 'analytical_estimate') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono text-[10px] font-bold">
          {language === 'ko' ? '분석적 추정치 (Estimated)' : 'Analytical Estimate (Never Green)'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
        {language === 'ko' ? '검증 미등록 (Unverified)' : 'Unverified / Unavailable'}
      </span>
    );
  };

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
              ? '임의 추정치를 철저히 배제하고, 공식 등록 기관(ACEA, CPCA, BEA, OICA)의 전체 시장 모수(분모)와 OEM 공식 실적(분자)을 엄격한 회계 공시 기준(소매 vs 도매 분리)에 따라 검증하여 산출합니다.'
              : 'Grounded strictly in verified industry authority totals (denominators) matched against official OEM disclosures (numerators) with strict retail vs wholesale perimeter compatibility gates.'}
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
        <div className="space-y-3">
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 flex-wrap">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>
                  {language === 'ko' ? currentDenominator.marketNameKo : currentDenominator.marketNameEn} 공식 시장 모수 (분모)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                  {currentDenominator.authorityName}
                </span>
                {renderStatusBadge(currentDenominator)}
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-normal">
                <span className="font-semibold text-slate-700 dark:text-slate-300">범위:</span> {currentDenominator.vehicleScope} • <span className="font-semibold text-slate-700 dark:text-slate-300">지역:</span> {currentDenominator.geographicScope}
              </p>
              {currentDenominator.derivationFormula && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                  {language === 'ko' ? '합산 산출식:' : 'Formula:'} {currentDenominator.derivationFormula}
                </p>
              )}
              <p className="text-[11px] text-slate-400 font-mono">
                출처 원문: {currentDenominator.sourceTitle} ({currentDenominator.sourceLocator})
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  {language === 'ko' ? '공식 전체 시장 모수' : 'Total Market Denominator'}
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

          {!currentDenominator.isCalculationEnabled && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">
                  {language === 'ko' ? '시장 점유율 산출 비활성화 알림 (Calculation Suspended)' : 'Market Share Calculation Suspended'}
                </span>
                <p className="leading-relaxed">
                  {language === 'ko' ? currentDenominator.disabledReasonKo : currentDenominator.disabledReasonEn}
                </p>
              </div>
            </div>
          )}
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
        <table className="w-full text-left border-collapse min-w-[750px] text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-12 text-center">#</th>
              <th className="py-3 px-3">{language === 'ko' ? '완성차 제조사' : 'OEM'}</th>
              <th className="py-3 px-3 text-right">{language === 'ko' ? '공식 인도량 (분자)' : 'OEM Deliveries (Numerator)'}</th>
              <th className="py-3 px-3 text-right">{language === 'ko' ? '전체 시장 (분모)' : 'Market Total (Denominator)'}</th>
              <th className="py-3 px-3 text-right">{language === 'ko' ? '시장 점유율 (%)' : 'Market Share (%)'}</th>
              <th className="py-3 px-3 text-right">{language === 'ko' ? 'YoY 증감 (pp)' : 'YoY Change (pp)'}</th>
              <th className="py-3 px-3 text-center">{language === 'ko' ? '공시 호환성 상태' : 'Compatibility Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {marketShareRows.map((row, idx) => {
              const isCompatible = row.isCompatible && row.marketShare !== null;

              return (
                <tr key={row.company.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Rank */}
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                    {isCompatible && currentDenominator?.isCalculationEnabled ? idx + 1 : '-'}
                  </td>

                  {/* Company */}
                  <td className="py-3 px-3 font-medium">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {row.company.name}
                        </span>
                        {row.volumeDefinition === 'wholesale_shipments' && (
                          <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            도매(Wholesale)
                          </span>
                        )}
                      </div>
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
                    {!currentDenominator?.isCalculationEnabled ? (
                      <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold">
                        {language === 'ko' ? '산출 비활성화' : 'Disabled'}
                      </span>
                    ) : isCompatible && row.marketShare !== null ? (
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
                      <span className="text-slate-400 font-mono">N/A</span>
                    )}
                  </td>

                  {/* YoY Change in percentage points */}
                  <td className="py-3 px-3 text-right font-mono">
                    {currentDenominator?.isCalculationEnabled && isCompatible && row.yoyPpDelta !== null ? (
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
                    {isCompatible ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'ko' ? '검증 완료' : 'Verified'}</span>
                      </span>
                    ) : (
                      <div
                        className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium cursor-help px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 max-w-[170px] truncate"
                        title={row.unavailableReason}
                      >
                        {row.incompatibilityCategory === 'wholesale_vs_retail' ? (
                          <>
                            <Layers className="w-3 h-3 shrink-0" />
                            <span className="truncate">{language === 'ko' ? '도매 vs 소매 불일치' : 'Perimeter Mismatch'}</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate">{language === 'ko' ? '공시 제외' : 'Omitted in IR'}</span>
                          </>
                        )}
                      </div>
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
          <span>{language === 'ko' ? '시장 점유율 산출 원칙 및 회계 기준 호환성 규약' : 'Market Share Strict Accounting Invariants'}</span>
        </div>
        <p className="leading-relaxed">
          {language === 'ko'
            ? '1. [회계 기준 일치 원칙] ACEA(유럽), CPCA(중국), BEA(미국)는 등록 및 소매(Retail) 통계입니다. 현대차, 기아, 토요타 등 딜러 도매 출하량(Wholesale)만 공시하는 권역 수치는 소매 시장 분모와 나눗셈 시 분모 왜곡이 발생하므로 자동 차단(Incompatible)됩니다. 2. [임의 추정 금지] 테슬라 등 분기보고서에서 대륙별 세부 인도량을 공시하지 않는 제조사는 임의 추정하지 않고 엄격히 "공시 제외"로 표기합니다.'
            : '1. [Perimeter Invariant] Regional authorities (ACEA, CPCA, BEA) publish retail registrations. Automakers reporting wholesale dealer shipments cannot be mathematically divided by retail totals without perimeter distortion and are fail-closed as Incompatible. 2. [Zero-Fabrication] Automakers omitting quarterly regional volumes (such as Tesla Form 10-Q) are transparently marked as omitted rather than estimated.'}
        </p>
      </div>
    </div>
  );
};
