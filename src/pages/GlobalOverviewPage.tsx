import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllCompanies,
  getObservations,
  getAllGuidance,
  getDistinctPeriods,
  getCompanyById,
} from '../utils/metricQueries';
import { getScheduledDisclosure } from '../data/scheduledDisclosures';
import { MetricObservation, PeriodType, VolumeDefinition } from '../types/metrics';
import {
  formatPeriodLabel,
  matchesVolumeFilter,
} from '../utils/metricCalculations';
import {
  validateScatterObservationCompatibility,
  resolveCanonicalPeriodType,
  ProfitFilterMode,
  isOperatingLossObservation,
  matchesProfitFilterMode,
} from '../utils/scatterDataUtils';
import { MetricBarChart } from '../components/metrics/charts/MetricBarChart';
import { MetricLineChart } from '../components/metrics/charts/MetricLineChart';
import { GuidanceRangeChart } from '../components/metrics/charts/GuidanceRangeChart';
import { PowertrainMixChart } from '../components/metrics/charts/PowertrainMixChart';
import { MarginScatterChart } from '../components/metrics/charts/MarginScatterChart';
import { ProfitScatterChart } from '../components/metrics/charts/ProfitScatterChart';
import { GlobalStockComparisonSection } from '../components/metrics/charts/GlobalStockComparisonSection';
import { DataTable } from '../components/metrics/DataTable';
import { ProvenanceModal } from '../components/metrics/ProvenanceModal';
import { GoogleAdBanner } from '../components/common/GoogleAdBanner';
import { SEO } from '../components/common/SEO';
import { useLanguage } from '../i18n/LanguageContext';
import {
  convertMillionsToKRW,
  convertMillionsToUSD,
  formatOriginalCurrencyCompact,
} from '../utils/currencyUtils';
import { METRIC_OBSERVATIONS } from '../data/observations';
import { SOURCE_DOCUMENTS } from '../data/sources';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Filter,
  Check,
  ExternalLink,
  TableProperties,
  EyeOff,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Layers,
} from 'lucide-react';

export const GlobalOverviewPage: React.FC = () => {
  const { language, t } = useLanguage();
  const companies = getAllCompanies();
  const periods = getDistinctPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0] || '2026-Q3');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(() =>
    companies.map((c) => c.id)
  );
  const [profitMetricType, setProfitMetricType] = useState<'operating_income' | 'revenue'>('operating_income');
  const [activeProvenanceObs, setActiveProvenanceObs] = useState<MetricObservation | null>(null);
  const [showInlineTable, setShowInlineTable] = useState<boolean>(false);
  const [profitFilterMode, setProfitFilterMode] = useState<ProfitFilterMode>('all');
  const [volumeDefinitionFilter, setVolumeDefinitionFilter] = useState<'all' | VolumeDefinition>('all');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [trendCadence, setTrendCadence] = useState<'quarterly' | 'annual'>('quarterly');
  const [scatterMode, setScatterMode] = useState<'profit' | 'revenue'>('profit');

  const [topFiveMode, setTopFiveMode] = useState<boolean>(false);

  // Top 5 OEMs by global deliveries (normalized to thousand units) for a given period and volume definition
  const getTopFiveCompanyIds = (
    period: string,
    vDef: 'all' | VolumeDefinition = volumeDefinitionFilter
  ): string[] =>
    getObservations(undefined, ['deliveries_global'], period)
      .filter((o) => {
        if (o.value === null || o.value === undefined || !Number.isFinite(o.value)) return false;
        return matchesVolumeFilter(o, 'deliveries_global', vDef);
      })
      .map((o) => ({
        id: o.companyId,
        vol: o.unit === 'units' ? (o.value as number) / 1000 : (o.value as number),
      }))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 5)
      .map((o) => o.id);

  // Keep Top 5 selection in sync with the selected period and volume definition
  useEffect(() => {
    if (!topFiveMode) return;
    const ids = getTopFiveCompanyIds(selectedPeriod, volumeDefinitionFilter);
    if (ids.length > 0) setSelectedCompanies(ids);
  }, [topFiveMode, selectedPeriod, volumeDefinitionFilter]);

  // Toggle company filter
  const toggleCompany = (companyId: string) => {
    setTopFiveMode(false);
    if (selectedCompanies.includes(companyId)) {
      if (selectedCompanies.length > 2) {
        setSelectedCompanies(selectedCompanies.filter((id) => id !== companyId));
      }
    } else {
      setSelectedCompanies([...selectedCompanies, companyId]);
    }
  };

  const selectAllCompanies = () => {
    setTopFiveMode(false);
    setSelectedCompanies(companies.map((c) => c.id));
  };

  const selectTopFive = () => {
    const ids = getTopFiveCompanyIds(selectedPeriod, volumeDefinitionFilter);
    if (ids.length > 0) {
      setSelectedCompanies(ids);
      setTopFiveMode(true);
    }
  };

  // Canonical operating-loss evaluation for a given company and period
  const isCompanyLossInPeriod = (cid: string, period: string): boolean => {
    const ebitObs = getObservations([cid], ['operating_income'], period)[0];
    const marginObsItem = getObservations([cid], ['operating_margin'], period)[0];
    return isOperatingLossObservation(ebitObs, marginObsItem);
  };

  const matchesPeriodProfitFilter = (cid: string, period: string, mode: ProfitFilterMode): boolean => {
    const ebitObs = getObservations([cid], ['operating_income'], period)[0];
    const marginObsItem = getObservations([cid], ['operating_margin'], period)[0];
    return matchesProfitFilterMode(mode, ebitObs, marginObsItem);
  };

  // Companies among selectedCompanies that recorded an operating loss in selectedPeriod
  const lossCompaniesInPeriod = selectedCompanies
    .filter((cid) => isCompanyLossInPeriod(cid, selectedPeriod))
    .map((cid) => getCompanyById(cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const lossCompanyNames = lossCompaniesInPeriod.map((c) => c.shortName).join(', ');

  const profitFilteredCompanyIds = selectedCompanies.filter((cid) =>
    matchesPeriodProfitFilter(cid, selectedPeriod, profitFilterMode)
  );

  const profitFilterBadgeLabel =
    profitFilterMode === 'exclude_loss'
      ? lossCompaniesInPeriod.length > 0
        ? language === 'ko'
          ? `영업손실 제외 (${lossCompanyNames})`
          : `Operating Loss Excluded (${lossCompanyNames})`
        : language === 'ko'
        ? '영업손실 제외'
        : 'Operating Loss Excluded'
      : profitFilterMode === 'loss_only'
      ? lossCompaniesInPeriod.length > 0
        ? language === 'ko'
          ? `영업손실만 포함: ${lossCompanyNames} (${lossCompaniesInPeriod.length}개사)`
          : `Operating Loss Only: ${lossCompanyNames} (${lossCompaniesInPeriod.length})`
        : language === 'ko'
        ? '영업손실만 포함'
        : 'Operating Loss Only'
      : language === 'ko'
      ? '전체 포함 (영업이익·영업손실 통합)'
      : 'All Included (Profit & Loss)';

  const appendFilterSubtitle = (baseSubtitle: string): string => {
    if (profitFilterMode === 'exclude_loss') {
      return lossCompaniesInPeriod.length > 0
        ? `${baseSubtitle} (${language === 'ko' ? `영업손실 제외: ${lossCompanyNames}` : `Operating loss excluded: ${lossCompanyNames}`})`
        : `${baseSubtitle} (${language === 'ko' ? '영업손실 제외' : 'Operating loss excluded'})`;
    }
    if (profitFilterMode === 'loss_only') {
      return lossCompaniesInPeriod.length > 0
        ? `${baseSubtitle} (${language === 'ko' ? `영업손실만 포함: ${lossCompanyNames}` : `Operating loss only: ${lossCompanyNames}`})`
        : `${baseSubtitle} (${language === 'ko' ? '영업손실만 포함' : 'Operating loss only'})`;
    }
    return baseSubtitle;
  };

  // Observations for Sales Bar Chart (ranked descending) - filtered by volumeDefinitionFilter if active
  const allPeriodSalesObs = getObservations(selectedCompanies, ['deliveries_global'], selectedPeriod);

  const salesObs = allPeriodSalesObs
    .filter((obs) => matchesVolumeFilter(obs, 'deliveries_global', volumeDefinitionFilter))
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((o) => o.company)
    .sort((a, b) => (b.observation.value ?? -Infinity) - (a.observation.value ?? -Infinity));

  // Observations for Actual Earnings Bar Chart (Operating Income or Revenue, ranked descending)
  // Normalized to KRW Trillions (ko) or USD Billions (en) for cross-OEM comparability
  const earningsObs = getObservations(
    profitFilteredCompanyIds,
    [profitMetricType],
    selectedPeriod
  )
    .map((obs) => {
      const company = getCompanyById(obs.companyId)!;
      const rawVal = obs.value;
      const curr = obs.currency || company?.reportingCurrency || 'USD';

      let normalizedValue: number | undefined;
      let displayValue: string | undefined;
      let tooltipValue: string | undefined;

      if (rawVal !== null && rawVal !== undefined && Number.isFinite(rawVal)) {
        if (language === 'ko') {
          const krwWon = convertMillionsToKRW(rawVal, curr);
          if (krwWon !== null) {
            const trillion = krwWon / 1_000_000_000_000;
            normalizedValue = trillion;
            const sign = trillion < 0 ? '-' : '';
            const absTrillion = Math.abs(trillion);
            displayValue = `${sign}₩${absTrillion >= 10 ? absTrillion.toFixed(1) : absTrillion.toFixed(2)}조`;
            const origCompact = formatOriginalCurrencyCompact(rawVal, curr);
            tooltipValue = `${displayValue} (${origCompact})`;
          }
        } else {
          const usd = convertMillionsToUSD(rawVal, curr);
          if (usd !== null) {
            const billion = usd / 1_000_000_000;
            normalizedValue = billion;
            const sign = billion < 0 ? '-' : '';
            const absBillion = Math.abs(billion);
            displayValue = `${sign}$${absBillion >= 10 ? absBillion.toFixed(1) : absBillion.toFixed(2)}B`;
            const origCompact = formatOriginalCurrencyCompact(rawVal, curr);
            tooltipValue = `${displayValue} (${origCompact})`;
          }
        }
      }

      return {
        company,
        observation: obs,
        normalizedValue,
        displayValue,
        tooltipValue,
      };
    })
    .filter((o) => o.company)
    .sort((a, b) => (b.normalizedValue ?? (b.observation.value ?? -Infinity)) - (a.normalizedValue ?? (a.observation.value ?? -Infinity)));

  // Observations for Operating Margin Bar Chart (ranked descending)
  const marginObs = getObservations(
    profitFilteredCompanyIds,
    ['operating_margin'],
    selectedPeriod
  )
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((o) => o.company)
    .sort((a, b) => (b.observation.value ?? -Infinity) - (a.observation.value ?? -Infinity));

  // Unfiltered margin observations for headline KPI card
  const allMarginObsForKpi = getObservations(
    selectedCompanies,
    ['operating_margin'],
    selectedPeriod
  )
    .map((obs) => ({
      company: getCompanyById(obs.companyId)!,
      observation: obs,
    }))
    .filter((o) => o.company && o.observation.value !== null && Number.isFinite(o.observation.value))
    .sort((a, b) => (b.observation.value ?? -Infinity) - (a.observation.value ?? -Infinity));

  // Top 1 & 2 Sales Volume Leaders for Headline KPI card
  const salesLeader1 = salesObs[0];
  const salesLeader2 = salesObs[1];

  const marginLeader1 = allMarginObsForKpi[0];
  const marginLeader2 = allMarginObsForKpi[1];

  // OEM distinct brand colors helper for line chart
  const getOemColor = (compName: string, idx: number) => {
    const n = compName.toLowerCase();
    if (n.includes('toyota')) return '#dc2626';
    if (n.includes('tesla')) return '#e11d48';
    if (n.includes('byd')) return '#2563eb';
    if (n.includes('volkswagen')) return '#0284c7';
    if (n.includes('hyundai')) return '#0369a1';
    if (n.includes('bmw')) return '#0891b2';
    if (n.includes('mercedes')) return '#0d9488';
    if (n.includes('gm') || n.includes('general')) return '#4f46e5';
    if (n.includes('stellantis')) return '#7c3aed';
    if (n.includes('ford')) return '#1d4ed8';
    if (n.includes('kia')) return '#c8102e';
    if (n.includes('geely')) return '#0284c7';
    if (n.includes('honda')) return '#b91c1c';
    if (n.includes('nissan')) return '#991b1b';
    if (n.includes('volvo')) return '#1e3a8a';
    if (n.includes('rivian')) return '#d97706';
    const palette = ['#0c93e7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    return palette[idx % palette.length];
  };

  // Cadence-separated Historical Trend Periods (Never mix Quarterly with Annual)
  const trendPeriods = trendCadence === 'quarterly'
    ? ['2026-Q1', '2026-Q2', '2026-Q3']
    : ['2024-FY', '2025-FY'];

  // Historical line series for selected OEMs (respecting profitFilterMode)
  const trendSeries = selectedCompanies
    .filter((cid) => {
      if (profitFilterMode === 'all') return true;
      const ebitInPeriod = getObservations([cid], ['operating_income'], selectedPeriod)[0];
      const marginInPeriod = getObservations([cid], ['operating_margin'], selectedPeriod)[0];
      if (ebitInPeriod || marginInPeriod) {
        return matchesProfitFilterMode(profitFilterMode, ebitInPeriod, marginInPeriod);
      }
      // If company has not yet reported selectedPeriod (e.g. scheduled in 2026-Q3):
      // In 'loss_only' mode for selectedPeriod, only show companies with confirmed loss in selectedPeriod.
      if (profitFilterMode === 'loss_only') return false;
      // In 'exclude_loss' mode, check latest reported period so historical loss outliers don't distort Y-axis
      const latestEbit = getObservations([cid], ['operating_income'])[0];
      const latestMargin = getObservations([cid], ['operating_margin'])[0];
      return matchesProfitFilterMode('exclude_loss', latestEbit, latestMargin);
    })
    .map((cid, idx) => {
      const comp = getCompanyById(cid)!;
      const companyObs = getObservations([cid], ['operating_margin']);
      return {
        company: comp,
        data: trendPeriods.map((p) => {
          const obs = companyObs.find((o) => o.period === p);
          return {
            period: p,
            value: obs?.value ?? null,
            observation: obs,
          };
        }),
        color: getOemColor(comp?.name || cid, idx),
      };
    });

  // Powertrain Mix Data for Stacked Bar Chart (ranked by BEV share descending)
  const powertrainData = selectedCompanies.map((cid) => {
    const comp = getCompanyById(cid)!;
    const bevObs = getObservations([cid], ['bev_deliveries'], selectedPeriod)[0];
    const bevVol = bevObs?.value || 0;
    const delObservations = getObservations([cid], ['deliveries_global'], selectedPeriod);
    const matchedDel = bevObs?.volumeDefinition
      ? delObservations.find((o) => o.volumeDefinition === bevObs.volumeDefinition)
      : undefined;
    const totalDel = (matchedDel || delObservations[0])?.value || 0;
    const phevObs = getObservations([cid], ['phev_deliveries'], selectedPeriod)[0];
    const phevVol = phevObs?.value || 0;
    const phevReported = Boolean(phevObs);

    return {
      company: comp,
      totalDeliveries: totalDel,
      bevVolume: bevVol,
      phevVolume: phevVol,
      phevReported,
    };
  })
    .filter((d) => d.totalDeliveries > 0)
    .sort((a, b) => (b.bevVolume / (b.totalDeliveries || 1)) - (a.bevVolume / (a.totalDeliveries || 1)));

  // Scatter matrix points (Volume vs Margin vs Profit) - respects profitFilterMode and preserves negative margins when included
  const scatterPoints = profitFilteredCompanyIds
    .map((cid) => {
      const comp = getCompanyById(cid);
      const volObs = getObservations([cid], ['deliveries_global'], selectedPeriod)[0];
      const marginObsItem = getObservations([cid], ['operating_margin'], selectedPeriod)[0];
      const ebit = getObservations([cid], ['operating_income'], selectedPeriod)[0]?.value;
      const rev = getObservations([cid], ['revenue'], selectedPeriod)[0]?.value;
      if (
        !comp ||
        volObs?.value === null ||
        volObs?.value === undefined ||
        volObs.value <= 0 ||
        marginObsItem?.value === null ||
        marginObsItem?.value === undefined
      ) {
        return null;
      }
      return {
        company: comp,
        volumeThousand: volObs.value,
        marginPercent: marginObsItem.value,
        operatingIncome: ebit,
        revenue: rev,
        currency: comp.reportingCurrency,
      };
    })
    .filter((pt): pt is NonNullable<typeof pt> => pt !== null);

  // Resolve canonical periodType strictly from canonical observations for selectedPeriod
  // Fail closed: do not infer or guess from string pattern matching
  // Fails closed (returns undefined) if mixed periodTypes or zero periodTypes exist
  const allPeriodObs = getObservations(undefined, undefined, selectedPeriod);
  const currentPeriodType: PeriodType | undefined = resolveCanonicalPeriodType(allPeriodObs);

  // Profit Scatter matrix points (Absolute Operating Profit vs Margin)
  // Preserves loss-making companies and strictly validates observation compatibility
  // Dynamically filters according to profitFilterMode ('all' | 'exclude_loss' | 'loss_only')
  // Fails closed if currentPeriodType is unrecognized or undefined
  const profitScatterPoints = currentPeriodType
    ? profitFilteredCompanyIds
        .map((cid) => {
          const comp = getCompanyById(cid);
          if (!comp) return null;
          const ebitObs = getObservations([cid], ['operating_income'], selectedPeriod)[0];
          const marginObs = getObservations([cid], ['operating_margin'], selectedPeriod)[0];
          const volObs = getObservations([cid], ['deliveries_global'], selectedPeriod)[0];
          const revObs = getObservations([cid], ['revenue'], selectedPeriod)[0];

          const validation = validateScatterObservationCompatibility(
            comp,
            selectedPeriod,
            currentPeriodType,
            ebitObs,
            marginObs,
            volObs,
            revObs
          );

          return validation.valid && validation.point ? validation.point : null;
        })
        .filter((pt): pt is NonNullable<typeof pt> => pt !== null)
    : [];

  // Guidance data
  const guidanceList = getAllGuidance().filter((g) => selectedCompanies.includes(g.companyId));

  return (
    <div className="space-y-8 pb-12">
      <SEO
        title={language === 'ko' ? '글로벌 완성차 실적 종합 개요 대시보드' : 'Global Automotive OEM Overview'}
        description={
          language === 'ko'
            ? '글로벌 16대 완성차 기업(현대차, 기아, 도요타, 폭스바겐, BYD, 테슬라, BMW, 벤츠, GM, 포드, 스텔란티스 등) 공식 IR 공시 기반 실시간 실적 비교, 영업이익률, 전동화(BEV) 믹스 및 공시일 주가 분석 대시보드'
            : 'Official IR-backed quarterly financial, delivery, operating margin, and electric vehicle mix intelligence for top 16 global automakers.'
        }
        canonicalPath="/"
      />
      {/* Top Banner & KPI Headline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-xl relative overflow-hidden transition-colors">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-mono font-semibold">
              <ShieldCheck className="w-4 h-4" /> {t.global.badge}
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.global.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            {t.global.subtitle}
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 truncate">
              {t.global.coveredOems}
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-slate-100 truncate">
              {selectedCompanies.length === companies.length
                ? `${companies.length} ${language === 'ko' ? '개 완성차' : 'Global OEMs'}`
                : `${selectedCompanies.length}/${companies.length} ${language === 'ko' ? '개 완성차' : 'OEMs'}`}
            </span>
          </div>
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 truncate">
              {t.global.reportingPeriod}
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-brand-600 dark:text-brand-400 truncate">
              {formatPeriodLabel(selectedPeriod, language)}
            </span>
          </div>
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 truncate">
              {t.global.salesLeader}
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
              {salesLeader1 ? (
                <>
                  <span className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                    {salesLeader1.company.shortName}{' '}
                    {(salesLeader1.observation.value ?? 0) >= 1000
                      ? `${((salesLeader1.observation.value ?? 0) / 1000).toFixed(2)}M`
                      : `${Math.round(salesLeader1.observation.value ?? 0).toLocaleString()}k`}
                  </span>
                  {salesLeader2 && (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                      • {salesLeader2.company.shortName}{' '}
                      {(salesLeader2.observation.value ?? 0) >= 1000
                        ? `${((salesLeader2.observation.value ?? 0) / 1000).toFixed(2)}M`
                        : `${Math.round(salesLeader2.observation.value ?? 0).toLocaleString()}k`}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm font-mono text-slate-400 dark:text-slate-500">-</span>
              )}
            </div>
          </div>
          <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 truncate">
              {t.global.marginLeader}
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
              {marginLeader1 ? (
                <>
                  <span className="text-lg sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400 truncate">
                    {marginLeader1.company.shortName} {marginLeader1.observation.value}%
                  </span>
                  {marginLeader2 && (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                      • {marginLeader2.company.shortName} {marginLeader2.observation.value}%
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm font-mono text-slate-400 dark:text-slate-500">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OEM Quick Directory Dossiers (Fast Navigation) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            {t.global.quickDirectory}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'ko' ? '기업 카드를 클릭하면 상세 IR 대시보드로 이동합니다' : 'Click any OEM card to open dedicated deep-dive dashboard'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {companies.map((c) => {
            const hasData = getObservations([c.id], undefined, selectedPeriod).length > 0;
            const scheduled = !hasData ? getScheduledDisclosure(c.id, selectedPeriod) : undefined;
            return (
              <Link
                key={c.id}
                to={`/company/${c.id}`}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/60 hover:shadow-md transition flex flex-col justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition truncate">
                      {c.shortName}
                    </span>
                    {scheduled ? (
                      <span
                        className="text-[9px] font-mono px-1 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-semibold"
                        title={language === 'ko' ? scheduled.notesKo : scheduled.notesEn}
                      >
                        {language === 'ko' ? '공시 예정' : 'Scheduled'}
                      </span>
                    ) : c.ticker ? (
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {c.ticker}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {c.hqCountry} • {c.reportingCurrency}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-brand-600 dark:text-brand-400 font-semibold group-hover:translate-x-0.5 transition">
                  <span>{language === 'ko' ? '실적 분석' : 'Deep Dive'}</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Interactive Filter Toolbar (Sticky so period & filters are always visible when scrolling) */}
      <div className="sticky top-16 z-20 p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-md space-y-3 transition-all">
        {/* Top Filter Row: Period Selector + Outlier / Collapse Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center gap-2 min-w-0 max-w-full overflow-x-auto py-0.5 scrollbar-thin">
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap hidden xs:inline">
                {t.global.periodFilter}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`min-h-[36px] sm:min-h-[32px] px-2.5 sm:px-3 py-1.5 text-xs font-sans font-semibold rounded-lg transition whitespace-nowrap ${
                    selectedPeriod === p
                      ? 'bg-brand-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {formatPeriodLabel(p, language)}
                </button>
              ))}
            </div>
            <span className="hidden xl:inline-flex text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 whitespace-nowrap">
              {language === 'ko' ? `조회 공시 주기: ${selectedPeriod}` : `Active Period: ${selectedPeriod}`}
            </span>
          </div>

          {/* Quick Actions: Profitability Filter Mode (Exclude Loss / Loss Only / All) & Mobile OEM Drawer Trigger */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-between sm:justify-end">
            <div
              className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full"
              role="group"
              aria-label={language === 'ko' ? '영업손익 필터' : 'Operating Profit/Loss Filter'}
            >
              <button
                type="button"
                onClick={() => setProfitFilterMode('exclude_loss')}
                className={`min-h-[34px] sm:min-h-[30px] text-[11px] font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                  profitFilterMode === 'exclude_loss'
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
                title={
                  language === 'ko'
                    ? `선택된 공시 주기(${selectedPeriod})에서 영업손실(적자)을 기록한 기업(${lossCompanyNames || '없음'})을 제외하여 차트 스케일을 최적화합니다`
                    : `Exclude OEMs with an operating loss in ${selectedPeriod} (${lossCompanyNames || 'none'}) to optimize chart scale`
                }
              >
                <EyeOff className="w-3 h-3 shrink-0" />
                <span>{language === 'ko' ? '영업손실 제외' : 'Exclude Loss'}</span>
                {lossCompaniesInPeriod.length > 0 && (
                  <span className="font-mono text-[10px] opacity-80">
                    (-{lossCompaniesInPeriod.length})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setProfitFilterMode('loss_only')}
                className={`min-h-[34px] sm:min-h-[30px] text-[11px] font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                  profitFilterMode === 'loss_only'
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
                title={
                  language === 'ko'
                    ? `선택된 공시 주기(${selectedPeriod})에서 영업손실(적자)을 기록한 기업(${lossCompanyNames || '없음'})만 집중 비교합니다`
                    : `Show only OEMs that recorded an operating loss in ${selectedPeriod} (${lossCompanyNames || 'none'})`
                }
              >
                <span>{language === 'ko' ? '영업손실만 포함' : 'Loss Only'}</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({lossCompaniesInPeriod.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setProfitFilterMode('all')}
                className={`min-h-[34px] sm:min-h-[30px] text-[11px] font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                  profitFilterMode === 'all'
                    ? 'bg-brand-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
                title={
                  language === 'ko'
                    ? '영업이익 흑자 기업과 영업손실 적자 기업을 모두 포함하여 전체 표시합니다'
                    : 'Include all OEMs (both profitable and operating-loss companies)'
                }
              >
                <span>{language === 'ko' ? '전체 포함' : 'All'}</span>
              </button>
            </div>

            {/* Mobile OEM Filter Toggle */}
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden min-h-[36px] sm:min-h-[32px] text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
              aria-label="Toggle OEM filters"
            >
              <Filter className="w-3 h-3 text-brand-600 dark:text-brand-400" />
              <span>{selectedCompanies.length}/{companies.length}</span>
              {mobileFiltersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Company Quick Toggles (Desktop Always Visible, Mobile Collapsible) */}
        <div className={`${mobileFiltersOpen ? 'flex' : 'hidden lg:flex'} flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800`}>
          <div className="flex items-center gap-1 mr-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1 whitespace-nowrap">
              {t.global.oemFilter} ({selectedCompanies.length}/{companies.length})
            </span>
            <button
              onClick={selectAllCompanies}
              className="min-h-[30px] text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline px-2 py-0.5 rounded bg-brand-500/10 flex items-center"
            >
              {language === 'ko' ? '전체 선택' : 'All'}
            </button>
            <button
              onClick={selectTopFive}
              aria-pressed={topFiveMode}
              title={language === 'ko' ? `${selectedPeriod} 판매량 기준 상위 5개 (기간 변경 시 자동 갱신)` : `Top 5 by deliveries in ${selectedPeriod} (auto-updates with period)`}
              className={`min-h-[30px] text-[11px] font-semibold hover:underline px-2 py-0.5 rounded flex items-center ${topFiveMode ? 'bg-brand-600 text-white' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
            >
              {language === 'ko' ? '상위 5개' : 'Top 5'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {companies.map((comp) => {
              const active = selectedCompanies.includes(comp.id);
              return (
                <button
                  key={comp.id}
                  onClick={() => toggleCompany(comp.id)}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    active
                      ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/30 font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-brand-500" />}
                  <span>{comp.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 1: Core Volume & Profitability Benchmarks (Ranked Descending - One Chart Per Row) */}
      <div className="flex flex-col gap-6 w-full">
        <MetricBarChart
          title={
            volumeDefinitionFilter === 'retail_deliveries'
              ? (language === 'ko' ? '글로벌 소매 판매량 (Retail Deliveries)' : 'Global Retail Deliveries')
              : volumeDefinitionFilter === 'wholesale_shipments'
              ? (language === 'ko' ? '글로벌 도매 출하량 (Wholesale Shipments)' : 'Global Wholesale Shipments')
              : volumeDefinitionFilter === 'production'
              ? (language === 'ko' ? '글로벌 생산량 (Production)' : 'Global Production Volume')
              : volumeDefinitionFilter === 'registrations'
              ? (language === 'ko' ? '글로벌 신규 등록 (Registrations)' : 'Global Vehicle Registrations')
              : t.charts.salesVolume
          }
          subtitle={
            volumeDefinitionFilter === 'retail_deliveries'
              ? (language === 'ko' ? '소매 인도(Retail Deliveries) 공시 기업 단일 기준 비교' : 'Same-definition comparison: Customer handovers (Retail Deliveries)')
              : volumeDefinitionFilter === 'wholesale_shipments'
              ? (language === 'ko' ? '도매 출하(Wholesale Shipments) 공시 기업 단일 기준 비교' : 'Same-definition comparison: Dealer dispatches (Wholesale Shipments)')
              : volumeDefinitionFilter === 'production'
              ? (language === 'ko' ? '생산량(Production) 공시 기업 단일 기준 비교' : 'Same-definition comparison: Factory production output')
              : volumeDefinitionFilter === 'registrations'
              ? (language === 'ko' ? '신규 등록(Registrations) 공시 기업 단일 기준 비교' : 'Same-definition comparison: Official vehicle registrations')
              : (language === 'ko' ? '소매 인도 및 도매 출하 공시 혼합 랭킹 (상단에서 동일 기준 필터 선택 가능)' : 'Mixed Retail & Wholesale ranking (same-definition filters available above)')
          }
          observations={salesObs}
          unit="thousand_units"
          periodBadge={selectedPeriod}
          headerAction={
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setVolumeDefinitionFilter('all')}
                className={`px-2 py-1 rounded-md transition ${
                  volumeDefinitionFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={language === 'ko' ? '전체 공시 (소매 인도 + 도매 출하 혼합)' : 'All Volume Definitions (Mixed)'}
              >
                {language === 'ko' ? '전체' : 'All'}
              </button>
              <button
                onClick={() => setVolumeDefinitionFilter('retail_deliveries')}
                className={`px-2 py-1 rounded-md transition ${
                  volumeDefinitionFilter === 'retail_deliveries'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={language === 'ko' ? '고객 인도 기준(소매) 공시 기업만 비교' : 'Retail Deliveries Only'}
              >
                {language === 'ko' ? '소매 인도' : 'Retail'}
              </button>
              <button
                onClick={() => setVolumeDefinitionFilter('wholesale_shipments')}
                className={`px-2 py-1 rounded-md transition ${
                  volumeDefinitionFilter === 'wholesale_shipments'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={language === 'ko' ? '딜러 출하 기준(도매) 공시 기업만 비교' : 'Wholesale Shipments Only'}
              >
                {language === 'ko' ? '도매 출하' : 'Wholesale'}
              </button>
            </div>
          }
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
        <MetricBarChart
          title={
            profitMetricType === 'operating_income'
              ? t.charts.earningsProfit
              : t.charts.earningsRevenue
          }
          subtitle={appendFilterSubtitle(
            profitMetricType === 'operating_income'
              ? t.charts.earningsProfitSubtitle
              : t.charts.earningsRevenueSubtitle
          )}
          observations={earningsObs}
          unit={language === 'ko' ? '조원 (KRW)' : 'USD ($B)'}
          periodBadge={selectedPeriod}
          headerAction={
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setProfitMetricType('operating_income')}
                className={`px-2.5 py-1 rounded-md transition ${
                  profitMetricType === 'operating_income'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ko' ? '영업이익 (EBIT)' : 'Operating Profit'}
              </button>
              <button
                onClick={() => setProfitMetricType('revenue')}
                className={`px-2.5 py-1 rounded-md transition ${
                  profitMetricType === 'revenue'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {language === 'ko' ? '총 매출액 (Revenue)' : 'Total Revenue'}
              </button>
            </div>
          }
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
        <MetricBarChart
          title={t.charts.operatingMargin}
          subtitle={appendFilterSubtitle(t.charts.marginSubtitle)}
          observations={marginObs}
          unit="percentage"
          periodBadge={selectedPeriod}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      </div>

      {/* SECTION 2: 4-Quadrant Strategic Positioning Matrix (Unified View) */}
      <div className="w-full space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>
                {language === 'ko'
                  ? '글로벌 완성차 전략적 포지셔닝 4분면 매트릭스'
                  : 'OEM Strategic Positioning 4-Quadrant Matrix'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {scatterMode === 'profit'
                ? appendFilterSubtitle(t.charts.profitVsMarginSubtitle)
                : appendFilterSubtitle(t.charts.revenueVsMarginSubtitle)}
            </p>
          </div>

          {/* Matrix Mode Switcher: Profit vs Revenue */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setScatterMode('profit')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                scatterMode === 'profit'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ko' ? '영업이익 vs 영업이익률' : 'Operating Profit vs Margin'}
            </button>
            <button
              onClick={() => setScatterMode('revenue')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                scatterMode === 'revenue'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ko' ? '매출 규모 vs 영업이익률' : 'Revenue Scale vs Margin'}
            </button>
          </div>
        </div>

        {scatterMode === 'profit' ? (
          <ProfitScatterChart
            title={t.charts.profitVsMargin}
            subtitle={appendFilterSubtitle(t.charts.profitVsMarginSubtitle)}
            points={profitScatterPoints}
            period={selectedPeriod}
            periodType={currentPeriodType}
            outlierExcluded={profitFilterMode === 'exclude_loss'}
            profitFilterMode={profitFilterMode}
            onProfitFilterModeChange={setProfitFilterMode}
            lossCompanyCount={lossCompaniesInPeriod.length}
            filterBadgeLabel={profitFilterBadgeLabel}
          />
        ) : (
          <MarginScatterChart
            title={t.charts.revenueVsMargin}
            subtitle={appendFilterSubtitle(t.charts.revenueVsMarginSubtitle)}
            points={scatterPoints}
            periodType={currentPeriodType}
            profitFilterMode={profitFilterMode}
            onProfitFilterModeChange={setProfitFilterMode}
            lossCompanyCount={lossCompaniesInPeriod.length}
            filterBadgeLabel={profitFilterBadgeLabel}
          />
        )}
      </div>

      {/* SECTION 3: Multi-Period Historical Trend Trajectory */}
      <div className="w-full space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>{t.charts.historicalTrend}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {appendFilterSubtitle(
                trendCadence === 'quarterly'
                  ? language === 'ko'
                    ? '분기별 영업이익률 추이 (비율 왜곡 방지를 위해 분기 집계 주기 분리)'
                    : 'Quarterly Operating Margin Trajectory (Strictly separated from annual cadence)'
                  : language === 'ko'
                    ? '연간 종합 영업이익률 마일스톤 (2024~2025 FY)'
                    : 'Annual Milestone Operating Margin (2024~2025 FY)'
              )}
            </p>
          </div>
          {/* Cadence Switcher: Quarterly vs Annual */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setTrendCadence('quarterly')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                trendCadence === 'quarterly'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ko' ? '분기별 추이 (2026-Q1~Q3)' : 'Quarterly (2026-Q1~Q3)'}
            </button>
            <button
              onClick={() => setTrendCadence('annual')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                trendCadence === 'annual'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ko' ? '연간 마일스톤 (2024~2025 FY)' : 'Annual (2024~2025 FY)'}
            </button>
          </div>
        </div>

        <MetricLineChart
          title={`${t.charts.historicalTrend} (${trendCadence === 'quarterly' ? 'Quarterly' : 'Annual'})`}
          subtitle={appendFilterSubtitle(t.charts.historicalSubtitle)}
          series={trendSeries}
          unit="percentage"
          activePeriod={selectedPeriod}
          onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
        />
      </div>

      {/* SECTION 3-B: 2024 Q1 ~ 2026 Q3 Quarterly Disclosure Stock Price & Earnings Benchmark */}
      <div className="w-full">
        <GlobalStockComparisonSection
          selectedCompanyIds={selectedCompanies}
          activePeriod={selectedPeriod}
        />
      </div>

      {/* SECTION 4: Strategic Guidance Corridors & Powertrain Electrification Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <GuidanceRangeChart
          guidanceList={guidanceList}
        />
        <PowertrainMixChart
          title={t.charts.powertrainMix}
          subtitle={t.charts.powertrainMixSubtitle}
          data={powertrainData}
        />
      </div>

      {/* Google AdSense Sponsored Display Unit */}
      <div className="w-full my-2">
        <GoogleAdBanner slot="9426228178" client="ca-pub-6854824605420161" />
      </div>

      {/* SECTION 5: Dedicated Data Table Hub Card & Collapsible Terminal */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-brand-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-6 shadow-md dark:shadow-xl border border-slate-200/90 dark:border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 border border-brand-500/20 dark:border-brand-500/30">
              {language === 'ko' ? '공식 IR 데이터 허브' : 'Official Disclosures Hub'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {METRIC_OBSERVATIONS.length}+ Verified Points • {SOURCE_DOCUMENTS.length} Primary Sources
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {language === 'ko'
              ? '글로벌 완성차 공식 IR 공시 종합 데이터 및 출처 감사 테이블'
              : 'Global OEM Consolidated Disclosures & Audit Registry'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'ko'
              ? '제조사별 원문 표기 회계 라벨, 통화, 감사 출처(PDF/IR 링크) 및 회계 기준 상세 내역은 전용 데이터 커버리지 페이지에서 전체 검색 및 필터링할 수 있습니다.'
              : 'View all original accounting labels, reported units, official PDF filing traces, and deep audit data in the dedicated Data Coverage terminal.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowInlineTable(!showInlineTable)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-600 transition flex items-center gap-1.5 shadow-xs"
          >
            <TableProperties className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>
              {showInlineTable
                ? (language === 'ko' ? '테이블 접기' : 'Hide Table')
                : (language === 'ko' ? '인라인 테이블 펼치기' : 'Expand Table Inline')}
            </span>
          </button>

          <Link
            to="/coverage"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white dark:text-slate-950 bg-brand-600 hover:bg-brand-500 dark:bg-brand-400 dark:hover:bg-brand-300 transition flex items-center gap-1.5 shadow-sm font-sans"
          >
            <span>{language === 'ko' ? '데이터 커버리지 전용 페이지' : 'Data Coverage Page'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {showInlineTable && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <DataTable
            title={language === 'ko' ? '글로벌 완성차 공식 IR 공시 종합 데이터 테이블' : 'Global OEM Consolidated Investor Relations Disclosures'}
            subtitle={language === 'ko' ? '원문 표기 라벨, 회계 기준, 통화 및 데이터 감사 직결' : 'Preserved original accounting labels, reported units, and direct audit traces'}
            observations={getObservations(selectedCompanies, undefined, selectedPeriod)}
            onSelectObservation={(obs) => setActiveProvenanceObs(obs)}
          />
        </div>
      )}

      {/* Data Provenance Modal */}
      <ProvenanceModal
        observation={activeProvenanceObs}
        onClose={() => setActiveProvenanceObs(null)}
      />
    </div>
  );
};
