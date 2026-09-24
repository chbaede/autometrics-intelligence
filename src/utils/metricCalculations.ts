/**
 * Metric Calculation & Comparability Utilities for AutoMetrics Intelligence
 *
 * All functions strictly follow data integrity rules:
 * - Return null for invalid, non-finite, missing, or zero-denominator inputs.
 * - Never silently coerce missing values to zero.
 * - Handle negative numbers properly.
 * - Validate reporting scopes and accounting basis before direct comparison.
 */

import {
  MetricObservation,
  ComparabilityResult,
  ComparabilityLevel,
  VerificationStatus,
  BevShareCandidateResult,
  BevShareValidationResult,
  DerivedMetricDefinition,
  MarginCandidateResult,
  MarginValidationChecks,
  MarginValidationResult,
  SourceDocument,
  Company,
  ProvenanceValidationResult,
} from '../types/metrics';

export function calculateYoYGrowth(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current === null || current === undefined || !Number.isFinite(current)) return null;
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;

  const growth = ((current - previous) / Math.abs(previous)) * 100;
  return Number.isFinite(growth) ? Math.round(growth * 100) / 100 : null;
}

export function calculateQoQGrowth(
  current: number | null | undefined,
  previousQuarter: number | null | undefined
): number | null {
  return calculateYoYGrowth(current, previousQuarter);
}

export function calculateMargin(
  operatingIncome: number | null | undefined,
  revenue: number | null | undefined
): number | null {
  if (operatingIncome === null || operatingIncome === undefined || !Number.isFinite(operatingIncome)) return null;
  if (revenue === null || revenue === undefined || !Number.isFinite(revenue)) return null;
  if (revenue <= 0) return null;

  const margin = (operatingIncome / revenue) * 100;
  return Number.isFinite(margin) ? Math.round(margin * 100) / 100 : null;
}

export function calculateBEVShare(
  bevDeliveries: number | null | undefined,
  totalDeliveries: number | null | undefined
): number | null {
  if (bevDeliveries === null || bevDeliveries === undefined || !Number.isFinite(bevDeliveries)) return null;
  if (totalDeliveries === null || totalDeliveries === undefined || !Number.isFinite(totalDeliveries)) return null;
  if (totalDeliveries <= 0) return null;
  if (bevDeliveries < 0) return null;
  if (bevDeliveries > totalDeliveries) return null;

  const share = (bevDeliveries / totalDeliveries) * 100;
  return Number.isFinite(share) ? Math.round(share * 100) / 100 : null;
}

export function calculateGuidanceMidpoint(
  min: number | null | undefined,
  max: number | null | undefined,
  target?: number | null | undefined
): number | null {
  if (target !== undefined && target !== null && Number.isFinite(target)) {
    return target;
  }
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return Math.round(((min + max) / 2) * 100) / 100;
    }
  }
  if (min !== null && min !== undefined && Number.isFinite(min)) return min;
  if (max !== null && max !== undefined && Number.isFinite(max)) return max;
  return null;
}

export function calculateGuidanceRangeSpread(
  min: number | null | undefined,
  max: number | null | undefined
): number | null {
  if (min === null || min === undefined || max === null || max === undefined) return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return Math.round(Math.abs(max - min) * 100) / 100;
}

export function calculateCAGR(
  startValue: number | null | undefined,
  endValue: number | null | undefined,
  numYears: number
): number | null {
  if (startValue === null || startValue === undefined || !Number.isFinite(startValue)) return null;
  if (endValue === null || endValue === undefined || !Number.isFinite(endValue)) return null;
  if (numYears <= 0 || startValue <= 0 || endValue < 0) return null;

  const cagr = (Math.pow(endValue / startValue, 1 / numYears) - 1) * 100;
  return Number.isFinite(cagr) ? Math.round(cagr * 100) / 100 : null;
}

export function calculateRegionalShare(
  regionalVolume: number | null | undefined,
  globalVolume: number | null | undefined
): number | null {
  if (regionalVolume === null || regionalVolume === undefined || !Number.isFinite(regionalVolume)) return null;
  if (globalVolume === null || globalVolume === undefined || !Number.isFinite(globalVolume)) return null;
  if (globalVolume <= 0 || regionalVolume < 0) return null;

  const share = (regionalVolume / globalVolume) * 100;
  return Number.isFinite(share) ? Math.round(share * 100) / 100 : null;
}

export function formatMetricValue(
  value: number | null | undefined,
  unit: string,
  currencyCode?: string
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Not reported';
  }

  const currSymbol = currencyCode ? getCurrencySymbol(currencyCode) : '$';

  switch (unit) {
    case 'percentage':
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    case 'units':
      return `${value.toLocaleString()} units`;
    case 'thousand_units':
      return `${value.toLocaleString()}k units`;
    case 'currency_millions':
      return `${currSymbol}${value.toLocaleString()}M`;
    case 'currency_billions':
      return `${currSymbol}${value.toFixed(2)}B`;
    case 'ratio':
      return `${value.toFixed(2)}x`;
    default:
      return `${currSymbol}${value.toLocaleString()}`;
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  switch (currencyCode.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'CNY':
    case 'RMB':
      return '¥';
    case 'JPY':
      return '¥';
    case 'KRW':
      return '₩';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    case 'SEK':
      return 'kr ';
    default:
      return `${currencyCode} `;
  }
}

export function formatPeriodLabel(period: string, lang: 'ko' | 'en' = 'ko'): string {
  if (!period) return '';
  if (period === '2024-FY') return lang === 'ko' ? '2024년도' : '2024 (Full Year)';
  if (period === '2025-FY') return lang === 'ko' ? '2025년도' : '2025 (Full Year)';
  if (period === '2026-FY') return lang === 'ko' ? '2026년도' : '2026 (Full Year)';
  if (period === '2026-Q1') return lang === 'ko' ? '2026년 1분기' : '2026 Q1';
  if (period === '2026-Q2') return lang === 'ko' ? '2026년 2분기' : '2026 Q2';
  if (period === '2026-Q3') return lang === 'ko' ? '2026년 3분기' : '2026 Q3';
  if (period === '2026-Q4') return lang === 'ko' ? '2026년 4분기' : '2026 Q4';
  if (period.endsWith('-FY')) {
    const y = period.replace('-FY', '');
    return lang === 'ko' ? `${y}년도` : `${y} (Full Year)`;
  }
  if (period.includes('-Q')) {
    const [y, q] = period.split('-Q');
    return lang === 'ko' ? `${y}년 ${q}분기` : `${y} Q${q}`;
  }
  return period;
}

import { COMPANIES_MAP } from '../data/companies';

/**
 * Reusable comparison validation engine.
 * Checks definition, scope, accounting basis, volume definition, period, period type,
 * fiscal calendar alignment, currency, and unit scale.
 */
export function checkObservationComparability(
  obsA: MetricObservation,
  obsB: MetricObservation
): ComparabilityResult {
  const reasons: string[] = [];

  // 1. Metric definition check
  const definitionMatched = obsA.metricId === obsB.metricId;
  if (!definitionMatched) {
    reasons.push(`Metric definition mismatch: "${obsA.metricId}" vs "${obsB.metricId}"`);
  }

  // 2. Reporting Scope check (must exist, not be 'unknown', and match)
  const scopeA = obsA.reportingScope;
  const scopeB = obsB.reportingScope;
  const scopeMatched =
    !!scopeA && !!scopeB && scopeA !== 'unknown' && scopeB !== 'unknown' && scopeA === scopeB;
  if (!scopeMatched) {
    reasons.push(`Reporting scope mismatch: "${scopeA || 'unknown'}" vs "${scopeB || 'unknown'}"`);
  }

  // 3. Accounting Basis check (must exist, not be 'unknown', and match)
  const basisA = obsA.accountingBasis;
  const basisB = obsB.accountingBasis;
  const accountingBasisMatched =
    !!basisA && !!basisB && basisA !== 'unknown' && basisB !== 'unknown' && basisA === basisB;
  if (!accountingBasisMatched) {
    reasons.push(`Accounting basis mismatch: "${basisA || 'unknown'}" vs "${basisB || 'unknown'}"`);
  }

  // 4. Volume Definition check (for volume/delivery metrics)
  let volumeDefinitionMatched = true;
  const isVolumeMetric =
    obsA.unit === 'units' ||
    obsA.unit === 'thousand_units' ||
    !!obsA.volumeDefinition ||
    !!obsB.volumeDefinition ||
    obsA.metricId.includes('deliveries') ||
    obsB.metricId.includes('deliveries');

  if (isVolumeMetric) {
    const volA = obsA.volumeDefinition;
    const volB = obsB.volumeDefinition;
    volumeDefinitionMatched =
      !!volA && !!volB && volA !== 'unknown' && volB !== 'unknown' && volA === volB;
    if (!volumeDefinitionMatched) {
      reasons.push(`Volume perimeter mismatch: "${volA || 'unknown'}" vs "${volB || 'unknown'}"`);
    }
  }

  // 5. Period match
  const periodMatched = obsA.period === obsB.period;
  if (!periodMatched) {
    reasons.push(`Reporting period mismatch: "${obsA.period}" vs "${obsB.period}"`);
  }

  // 6. Period Type match
  const periodTypeMatched = obsA.periodType === obsB.periodType;
  if (!periodTypeMatched) {
    reasons.push(`Period type mismatch: "${obsA.periodType}" vs "${obsB.periodType}"`);
  }

  // 7. Fiscal Calendar match
  let fiscalCalendarMatched = true;
  const compA = COMPANIES_MAP[obsA.companyId];
  const compB = COMPANIES_MAP[obsB.companyId];
  if (compA && compB && compA.fiscalYearEnd !== compB.fiscalYearEnd) {
    fiscalCalendarMatched = false;
    reasons.push(
      `Fiscal calendar misalignment: ${compA.name} (${compA.fiscalYearEnd}) vs ${compB.name} (${compB.fiscalYearEnd})`
    );
  }

  // 8. Currency match
  let currencyMatched = true;
  const isCurrencyMetric =
    obsA.unit.startsWith('currency') ||
    obsB.unit.startsWith('currency') ||
    !!obsA.currency ||
    !!obsB.currency;
  if (isCurrencyMetric) {
    currencyMatched = !!obsA.currency && !!obsB.currency && obsA.currency === obsB.currency;
    if (!currencyMatched) {
      reasons.push(`Functional currency difference: "${obsA.currency || 'unspecified'}" vs "${obsB.currency || 'unspecified'}"`);
    }
  }

  // 9. Unit match
  const unitMatched = obsA.unit === obsB.unit;
  if (!unitMatched) {
    reasons.push(`Unit scale mismatch: "${obsA.unit}" vs "${obsB.unit}"`);
  }

  // Evaluation of comparability levels
  let level: ComparabilityLevel = 'direct';
  let directlyComparable = false;
  let limitedComparisonAllowed = false;

  const checks = {
    definitionMatched,
    scopeMatched,
    accountingBasisMatched,
    volumeDefinitionMatched,
    periodMatched,
    periodTypeMatched,
    fiscalCalendarMatched,
    currencyMatched,
    unitMatched,
  };

  if (!definitionMatched || !periodMatched || !periodTypeMatched || !fiscalCalendarMatched) {
    level = 'not_comparable';
    directlyComparable = false;
    limitedComparisonAllowed = false;
  } else if (!scopeMatched || !accountingBasisMatched || !volumeDefinitionMatched || !currencyMatched || !unitMatched) {
    level = 'limited';
    directlyComparable = false;
    limitedComparisonAllowed = true;
  } else {
    level = 'direct';
    directlyComparable = true;
    limitedComparisonAllowed = true;
  }

  return {
    directlyComparable,
    limitedComparisonAllowed,
    level,
    reasons,
    checks,
  };
}

export const OPERATING_MARGIN_RELATIONSHIP: DerivedMetricDefinition = {
  metricId: 'operating_margin',
  numeratorMetricIds: ['operating_income', 'ebit', 'adjusted_ebit'],
  denominatorMetricIds: ['revenue'],
  allowedAccountingBases: ['reported', 'adjusted', 'non_gaap', 'management_defined'],
};

/**
 * Selects compatible margin candidate triplets from an observation pool.
 * Identifies the correct numerator (operating_income/ebit vs adjusted_ebit),
 * denominator (revenue), and margin without arbitrary candidate[0] selection.
 */
export function selectCompatibleMarginTriplets(
  observations: MetricObservation[],
  companyId: string,
  period: string
): MarginCandidateResult {
  const revCandidates = observations.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'revenue' && o.value !== null
  );
  const profitCandidates = observations.filter(
    (o) =>
      o.companyId === companyId &&
      o.period === period &&
      (o.metricId === 'operating_income' || o.metricId === 'ebit' || o.metricId === 'adjusted_ebit') &&
      o.value !== null
  );
  const marginCandidates = observations.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'operating_margin' && o.value !== null
  );

  const candidatesChecked = revCandidates.length + profitCandidates.length + marginCandidates.length;
  const reasons: string[] = [];

  if (revCandidates.length === 0 || profitCandidates.length === 0 || marginCandidates.length === 0) {
    if (revCandidates.length === 0) reasons.push('Missing revenue denominator candidate observation.');
    if (profitCandidates.length === 0) reasons.push('Missing operating profit numerator candidate observation.');
    if (marginCandidates.length === 0) reasons.push('Missing operating margin candidate observation.');
    return {
      status: 'missing',
      candidatesChecked,
      reasons,
    };
  }

  const compatibleTriplets: {
    rev: MetricObservation;
    profit: MetricObservation;
    margin: MetricObservation;
  }[] = [];

  for (const rev of revCandidates) {
    for (const profit of profitCandidates) {
      for (const margin of marginCandidates) {
        const periodMatch = rev.period === profit.period && profit.period === margin.period;
        const periodTypeMatch = rev.periodType === profit.periodType && profit.periodType === margin.periodType;
        const scopeMatch =
          !!rev.reportingScope &&
          !!profit.reportingScope &&
          !!margin.reportingScope &&
          rev.reportingScope !== 'unknown' &&
          rev.reportingScope === profit.reportingScope &&
          profit.reportingScope === margin.reportingScope;
        const basisMatch =
          !!rev.accountingBasis &&
          !!profit.accountingBasis &&
          !!margin.accountingBasis &&
          rev.accountingBasis !== 'unknown' &&
          rev.accountingBasis === profit.accountingBasis &&
          profit.accountingBasis === margin.accountingBasis;
        const currencyMatch =
          !!rev.currency && !!profit.currency && rev.currency === profit.currency;
        const unitMatch = rev.unit === profit.unit && margin.unit === 'percentage';

        if (periodMatch && periodTypeMatch && scopeMatch && basisMatch && currencyMatch && unitMatch) {
          compatibleTriplets.push({ rev, profit, margin });
        }
      }
    }
  }

  if (compatibleTriplets.length === 1) {
    return {
      status: 'matched',
      revenue: compatibleTriplets[0].rev,
      profit: compatibleTriplets[0].profit,
      margin: compatibleTriplets[0].margin,
      candidatesChecked,
      reasons: ['Compatible margin triplet successfully matched across all metadata dimensions.'],
    };
  }

  if (compatibleTriplets.length > 1) {
    return {
      status: 'ambiguous',
      candidatesChecked,
      reasons: [
        `Ambiguous candidate observations: found ${compatibleTriplets.length} valid compatible candidate triplets.`,
      ],
    };
  }

  return {
    status: 'incompatible',
    candidatesChecked,
    reasons: [
      'Incompatible candidate triplet: candidates exist but have mismatched reportingScope, accountingBasis, currency, or unit.',
    ],
  };
}

/**
 * Validates semantic and mathematical compatibility among revenue, operating profit, and reported margin.
 */
export function validateMarginTriplet(
  revObs?: MetricObservation | null,
  profitObs?: MetricObservation | null,
  marginObs?: MetricObservation | null
): MarginValidationResult {
  const selectedObservationIds = {
    revenue: revObs?.id,
    profit: profitObs?.id,
    margin: marginObs?.id,
  };

  const checks: MarginValidationChecks = {
    period: false,
    periodType: false,
    scope: false,
    accountingBasis: false,
    currency: false,
    unit: false,
    metricDefinition: false,
  };

  const reasons: string[] = [];

  if (!revObs || !profitObs || !marginObs || revObs.value === null || profitObs.value === null || marginObs.value === null) {
    if (!revObs) reasons.push('Missing revenue observation.');
    if (!profitObs) reasons.push('Missing operating profit observation.');
    if (!marginObs) reasons.push('Missing operating margin observation.');
    return {
      status: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs?.value ?? null,
      difference: null,
      selectedObservationIds,
      checks,
      diagnostic: 'Incomplete observation triplet: missing revenue, profit, or margin observation.',
      reasons,
    };
  }

  // 1. Metric definition checks
  const validNumerator = OPERATING_MARGIN_RELATIONSHIP.numeratorMetricIds.includes(profitObs.metricId);
  const validDenominator = OPERATING_MARGIN_RELATIONSHIP.denominatorMetricIds.includes(revObs.metricId);
  const validMargin = marginObs.metricId === OPERATING_MARGIN_RELATIONSHIP.metricId;
  checks.metricDefinition = validNumerator && validDenominator && validMargin;
  if (!checks.metricDefinition) {
    reasons.push(
      `Metric definition mismatch: Revenue (${revObs.metricId}), Profit (${profitObs.metricId}), Margin (${marginObs.metricId}).`
    );
  }

  // 2. Period and periodType
  checks.period = revObs.period === profitObs.period && revObs.period === marginObs.period;
  if (!checks.period) {
    reasons.push(`Period mismatch: Revenue (${revObs.period}), Profit (${profitObs.period}), Margin (${marginObs.period}).`);
  }

  checks.periodType = revObs.periodType === profitObs.periodType && revObs.periodType === marginObs.periodType;
  if (!checks.periodType) {
    reasons.push(
      `Period type mismatch: Revenue (${revObs.periodType}), Profit (${profitObs.periodType}), Margin (${marginObs.periodType}).`
    );
  }

  // 3. Reporting scope
  const scopeRev = revObs.reportingScope;
  const scopeProfit = profitObs.reportingScope;
  const scopeMargin = marginObs.reportingScope;
  checks.scope =
    !!scopeRev &&
    !!scopeProfit &&
    !!scopeMargin &&
    scopeRev !== 'unknown' &&
    scopeRev === scopeProfit &&
    scopeProfit === scopeMargin;
  if (!checks.scope) {
    reasons.push(`Scope mismatch: Revenue (${scopeRev}), Profit (${scopeProfit}), Margin (${scopeMargin}).`);
  }

  // 4. Accounting basis
  const basisRev = revObs.accountingBasis;
  const basisProfit = profitObs.accountingBasis;
  const basisMargin = marginObs.accountingBasis;
  checks.accountingBasis =
    !!basisRev &&
    !!basisProfit &&
    !!basisMargin &&
    basisRev !== 'unknown' &&
    basisRev === basisProfit &&
    basisProfit === basisMargin;
  if (!checks.accountingBasis) {
    reasons.push(`Accounting basis mismatch: Revenue (${basisRev}), Profit (${basisProfit}), Margin (${basisMargin}).`);
  }

  // 5. Currency
  checks.currency = !!revObs.currency && !!profitObs.currency && revObs.currency === profitObs.currency;
  if (!checks.currency) {
    reasons.push(`Currency mismatch: Revenue (${revObs.currency}), Profit (${profitObs.currency}).`);
  }

  // 6. Unit
  checks.unit = revObs.unit === profitObs.unit && marginObs.unit === 'percentage';
  if (!checks.unit) {
    reasons.push(`Unit scale mismatch: Revenue (${revObs.unit}), Profit (${profitObs.unit}), Margin (${marginObs.unit}).`);
  }

  // Value checks
  if (revObs.value <= 0) {
    return {
      status: 'invalid',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      selectedObservationIds,
      checks,
      diagnostic: `Revenue denominator is non-positive (${revObs.value}); margin calculation is undefined.`,
      reasons: [...reasons, 'Non-positive revenue denominator.'],
    };
  }

  const calculatedMargin = Math.round(((profitObs.value / revObs.value) * 100) * 100) / 100;
  const reportedMargin = marginObs.value;
  const difference = Math.round(Math.abs(calculatedMargin - reportedMargin) * 100) / 100;

  const allChecksPass = Object.values(checks).every((c) => c === true);

  if (!allChecksPass) {
    return {
      status: 'invalid',
      calculatedMargin,
      reportedMargin,
      difference,
      selectedObservationIds,
      checks,
      diagnostic: reasons.join('; '),
      reasons,
    };
  }

  if (difference > 0.35) {
    return {
      status: 'invalid',
      calculatedMargin,
      reportedMargin,
      difference,
      selectedObservationIds,
      checks,
      diagnostic: `Mathematical deviation of ${difference}%p exceeds 0.35%p threshold (reported: ${reportedMargin}%, calculated: ${calculatedMargin}%).`,
      reasons: ['Mathematical deviation exceeds 0.35%p tolerance.'],
    };
  }

  return {
    status: 'verified',
    calculatedMargin,
    reportedMargin,
    difference,
    selectedObservationIds,
    checks,
    diagnostic: 'Revenue, operating profit, and reported margin are semantically and mathematically verified.',
    reasons: [],
  };
}

export interface ScopeMarginValidation {
  isScopeCompatible: boolean;
  validationStatus: VerificationStatus;
  calculatedMargin: number | null;
  reportedMargin: number | null;
  difference: number | null;
  diagnostic: string;
}

/**
 * Scope-aware margin validator.
 * Validates revenue, EBIT, and margin period, period type, reporting scope,
 * accounting basis for all observations, currency, unit scale, positive revenue,
 * and mathematical difference threshold.
 */
export function validateMarginScopeCompatibility(
  revObs?: MetricObservation | null,
  ebitObs?: MetricObservation | null,
  marginObs?: MetricObservation | null
): ScopeMarginValidation {
  if (!revObs || !ebitObs || !marginObs || revObs.value === null || ebitObs.value === null || marginObs.value === null) {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs?.value ?? null,
      difference: null,
      diagnostic: 'Incomplete observation triplet: missing revenue, EBIT, or margin observation.',
    };
  }

  // 1. Period and PeriodType checks
  if (revObs.period !== ebitObs.period || revObs.period !== marginObs.period) {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      diagnostic: `Period mismatch among revenue (${revObs.period}), EBIT (${ebitObs.period}), and margin (${marginObs.period}).`,
    };
  }

  if (revObs.periodType !== ebitObs.periodType || revObs.periodType !== marginObs.periodType) {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      diagnostic: `Period type mismatch among revenue (${revObs.periodType}), EBIT (${ebitObs.periodType}), and margin (${marginObs.periodType}).`,
    };
  }

  // 2. Revenue denominator check
  if (revObs.value <= 0) {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      diagnostic: `Revenue denominator is non-positive (${revObs.value}); margin calculation is undefined.`,
    };
  }

  // 3. Metric unit checks
  if (marginObs.unit !== 'percentage') {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      diagnostic: `Margin metric unit must be "percentage" (found "${marginObs.unit}").`,
    };
  }

  if (revObs.unit !== ebitObs.unit) {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      diagnostic: `Unit scale mismatch between Revenue (${revObs.unit}) and EBIT (${ebitObs.unit}).`,
    };
  }

  // 4. Currency checks
  if (!revObs.currency || !ebitObs.currency || revObs.currency !== ebitObs.currency) {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      diagnostic: `Currency mismatch or missing currency: Revenue is "${revObs.currency || 'missing'}", EBIT is "${ebitObs.currency || 'missing'}".`,
    };
  }

  // Calculate mathematical margin and difference
  const calculatedMargin = Math.round(((ebitObs.value / revObs.value) * 100) * 100) / 100;
  const reportedMargin = marginObs.value;
  const difference = Math.round(Math.abs(calculatedMargin - reportedMargin) * 100) / 100;

  // 5. Reporting Scope check
  const scopeRev = revObs.reportingScope;
  const scopeEbit = ebitObs.reportingScope;
  const scopeMargin = marginObs.reportingScope;

  if (!scopeRev || !scopeEbit || !scopeMargin || scopeRev === 'unknown' || scopeEbit === 'unknown' || scopeMargin === 'unknown') {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin,
      reportedMargin,
      difference,
      diagnostic: `Missing or unknown reporting scope: Revenue (${scopeRev || 'missing'}), EBIT (${scopeEbit || 'missing'}), Margin (${scopeMargin || 'missing'}).`,
    };
  }

  if (scopeRev !== scopeEbit || scopeRev !== scopeMargin || scopeEbit !== scopeMargin) {
    return {
      isScopeCompatible: false,
      validationStatus: 'scope_warning',
      calculatedMargin,
      reportedMargin,
      difference,
      diagnostic: `Scope mismatch detected: Revenue is ${scopeRev}, EBIT is ${scopeEbit}, Margin is ${scopeMargin}. Math gap: ${difference}%p.`,
    };
  }

  // 6. Accounting Basis check (check revenue vs EBIT, and EBIT vs Margin)
  const basisRev = revObs.accountingBasis;
  const basisEbit = ebitObs.accountingBasis;
  const basisMargin = marginObs.accountingBasis;

  if (!basisRev || !basisEbit || !basisMargin || basisRev === 'unknown' || basisEbit === 'unknown' || basisMargin === 'unknown') {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin,
      reportedMargin,
      difference,
      diagnostic: `Missing or unknown accounting basis: Revenue (${basisRev || 'missing'}), EBIT (${basisEbit || 'missing'}), Margin (${basisMargin || 'missing'}).`,
    };
  }

  if (basisRev !== basisEbit) {
    return {
      isScopeCompatible: false,
      validationStatus: 'scope_warning',
      calculatedMargin,
      reportedMargin,
      difference,
      diagnostic: `Accounting basis mismatch between Revenue (${basisRev}) and EBIT (${basisEbit}).`,
    };
  }

  if (basisEbit !== basisMargin) {
    return {
      isScopeCompatible: false,
      validationStatus: 'scope_warning',
      calculatedMargin,
      reportedMargin,
      difference,
      diagnostic: `Accounting basis mismatch between EBIT (${basisEbit}) and Margin (${basisMargin}).`,
    };
  }

  // 7. Mathematical deviation check
  if (difference > 0.35) {
    return {
      isScopeCompatible: true,
      validationStatus: 'needs_review',
      calculatedMargin,
      reportedMargin,
      difference,
      diagnostic: `Mathematical deviation of ${difference}%p exceeds 0.35%p threshold despite matching scopes.`,
    };
  }

  return {
    isScopeCompatible: true,
    validationStatus: 'verified',
    calculatedMargin,
    reportedMargin,
    difference,
    diagnostic: 'Scope, accounting basis, currency, unit, and mathematical margin calculation fully reconciled.',
  };
}

/**
 * Selects compatible BEV share candidate triplets from a list of observations.
 * Matches on: companyId, period, periodType, reportingScope, accountingBasis, volumeDefinition, unit.
 * Never arbitrarily selects candidates[0].
 */
export function selectCompatibleBevShareTriplets(
  observations: MetricObservation[],
  companyId: string,
  period: string
): BevShareCandidateResult {
  const totCandidates = observations.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'deliveries_global' && o.value !== null
  );
  const bevCandidates = observations.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'bev_deliveries' && o.value !== null
  );
  const shareCandidates = observations.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'bev_share' && o.value !== null
  );

  const candidatesChecked = totCandidates.length + bevCandidates.length + shareCandidates.length;
  const reasons: string[] = [];

  if (totCandidates.length === 0 || bevCandidates.length === 0 || shareCandidates.length === 0) {
    if (totCandidates.length === 0) reasons.push('Missing total deliveries candidate observation.');
    if (bevCandidates.length === 0) reasons.push('Missing BEV deliveries candidate observation.');
    if (shareCandidates.length === 0) reasons.push('Missing reported BEV share candidate observation.');
    return {
      status: 'missing',
      candidatesChecked,
      reasons,
    };
  }

  const compatibleTriplets: {
    tot: MetricObservation;
    bev: MetricObservation;
    share: MetricObservation;
  }[] = [];

  for (const tot of totCandidates) {
    for (const bev of bevCandidates) {
      for (const share of shareCandidates) {
        const periodTypeMatch = tot.periodType === bev.periodType && bev.periodType === share.periodType;
        const scopeMatch =
          !!tot.reportingScope &&
          !!bev.reportingScope &&
          !!share.reportingScope &&
          tot.reportingScope !== 'unknown' &&
          tot.reportingScope === bev.reportingScope &&
          bev.reportingScope === share.reportingScope;
        const basisMatch =
          !!tot.accountingBasis &&
          !!bev.accountingBasis &&
          !!share.accountingBasis &&
          tot.accountingBasis !== 'unknown' &&
          tot.accountingBasis === bev.accountingBasis &&
          bev.accountingBasis === share.accountingBasis;
        const volumeMatch =
          !!tot.volumeDefinition &&
          !!bev.volumeDefinition &&
          tot.volumeDefinition !== 'unknown' &&
          tot.volumeDefinition === bev.volumeDefinition &&
          (!share.volumeDefinition || share.volumeDefinition === tot.volumeDefinition);
        const unitMatch = tot.unit === bev.unit && share.unit === 'percentage';

        if (periodTypeMatch && scopeMatch && basisMatch && volumeMatch && unitMatch) {
          compatibleTriplets.push({ tot, bev, share });
        }
      }
    }
  }

  if (compatibleTriplets.length === 1) {
    return {
      status: 'matched',
      totalDelivery: compatibleTriplets[0].tot,
      bevDelivery: compatibleTriplets[0].bev,
      reportedShare: compatibleTriplets[0].share,
      candidatesChecked,
      reasons: ['Compatible BEV share triplet successfully matched across all metadata dimensions.'],
    };
  }

  if (compatibleTriplets.length > 1) {
    return {
      status: 'ambiguous',
      candidatesChecked,
      reasons: [
        `Ambiguous candidate observations: found ${compatibleTriplets.length} valid compatible candidate triplets.`,
      ],
    };
  }

  return {
    status: 'incompatible',
    candidatesChecked,
    reasons: [
      'Incompatible candidate triplet: candidates exist but have mismatched reportingScope, accountingBasis, volumeDefinition, or unit.',
    ],
  };
}

/**
 * Validates a BEV share triplet.
 * Validates mathematical accuracy, volume perimeter, reporting scope, accounting basis, and value bounds.
 */
export function validateBEVShare(
  totObs?: MetricObservation | null,
  bevObs?: MetricObservation | null,
  shareObs?: MetricObservation | null
): BevShareValidationResult {
  const matchedObservationIds: string[] = [];
  if (totObs?.id) matchedObservationIds.push(totObs.id);
  if (bevObs?.id) matchedObservationIds.push(bevObs.id);
  if (shareObs?.id) matchedObservationIds.push(shareObs.id);

  if (!totObs || !bevObs || !shareObs || totObs.value === null || bevObs.value === null || shareObs.value === null) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare: shareObs?.value ?? null,
      difference: null,
      diagnostic: 'Incomplete observation triplet for BEV share validation.',
      reasons: ['Missing total deliveries, BEV deliveries, or reported BEV share observation.'],
      matchedObservationIds,
    };
  }

  // 1. Period and PeriodType checks
  if (totObs.period !== bevObs.period || totObs.period !== shareObs.period) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Period mismatch among total deliveries (${totObs.period}), BEV deliveries (${bevObs.period}), and share (${shareObs.period}).`,
      reasons: ['Period mismatch across observations.'],
      matchedObservationIds,
    };
  }

  if (totObs.periodType !== bevObs.periodType || totObs.periodType !== shareObs.periodType) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Period type mismatch among total deliveries (${totObs.periodType}), BEV deliveries (${bevObs.periodType}), and share (${shareObs.periodType}).`,
      reasons: ['Period type mismatch across observations.'],
      matchedObservationIds,
    };
  }

  // 2. Reporting scope checks
  const scopeTot = totObs.reportingScope;
  const scopeBev = bevObs.reportingScope;
  const scopeShare = shareObs.reportingScope;
  if (!scopeTot || !scopeBev || !scopeShare || scopeTot === 'unknown' || scopeBev === 'unknown' || scopeShare === 'unknown') {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Missing or unknown reporting scope: Total (${scopeTot || 'missing'}), BEV (${scopeBev || 'missing'}), Share (${scopeShare || 'missing'}).`,
      reasons: ['Missing reporting scope.'],
      matchedObservationIds,
    };
  }

  if (scopeTot !== scopeBev || scopeTot !== scopeShare || scopeBev !== scopeShare) {
    return {
      isValid: false,
      validationStatus: 'scope_warning',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Reporting scope mismatch: Total (${scopeTot}), BEV (${scopeBev}), Share (${scopeShare}).`,
      reasons: ['Reporting scope mismatch.'],
      matchedObservationIds,
    };
  }

  // 3. Accounting basis checks
  const basisTot = totObs.accountingBasis;
  const basisBev = bevObs.accountingBasis;
  const basisShare = shareObs.accountingBasis;
  if (!basisTot || !basisBev || !basisShare || basisTot === 'unknown' || basisBev === 'unknown' || basisShare === 'unknown') {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Missing or unknown accounting basis: Total (${basisTot || 'missing'}), BEV (${basisBev || 'missing'}), Share (${basisShare || 'missing'}).`,
      reasons: ['Missing accounting basis.'],
      matchedObservationIds,
    };
  }

  if (basisTot !== basisBev || basisTot !== basisShare || basisBev !== basisShare) {
    return {
      isValid: false,
      validationStatus: 'scope_warning',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Accounting basis mismatch: Total (${basisTot}), BEV (${basisBev}), Share (${basisShare}).`,
      reasons: ['Accounting basis mismatch.'],
      matchedObservationIds,
    };
  }

  // 4. Volume definition checks
  const volTot = totObs.volumeDefinition;
  const volBev = bevObs.volumeDefinition;
  const volShare = shareObs.volumeDefinition;
  if (!volTot || !volBev || volTot === 'unknown' || volBev === 'unknown') {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Missing or unknown volume definition on volume metrics: Total (${volTot || 'missing'}), BEV (${volBev || 'missing'}).`,
      reasons: ['Missing volume definition.'],
      matchedObservationIds,
    };
  }

  if (volTot !== volBev || (volShare && volShare !== 'unknown' && volShare !== volTot)) {
    return {
      isValid: false,
      validationStatus: 'scope_warning',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Volume definition mismatch: Total (${volTot}), BEV (${volBev})${volShare ? `, Share (${volShare})` : ''}.`,
      reasons: ['Volume definition mismatch.'],
      matchedObservationIds,
    };
  }

  // 5. Metric unit checks
  if (totObs.unit !== bevObs.unit) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `Unit scale mismatch between Total deliveries (${totObs.unit}) and BEV deliveries (${bevObs.unit}).`,
      reasons: ['Unit scale mismatch.'],
      matchedObservationIds,
    };
  }

  if (shareObs.unit !== 'percentage') {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare: shareObs.value,
      difference: null,
      diagnostic: `BEV share metric unit must be "percentage" (found "${shareObs.unit}").`,
      reasons: ['Invalid BEV share unit.'],
      matchedObservationIds,
    };
  }

  // 6. Numerical & mathematical bounds checks
  const totalDeliveries = totObs.value;
  const bevDeliveries = bevObs.value;
  const reportedShare = shareObs.value;

  if (totalDeliveries <= 0) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare,
      difference: null,
      diagnostic: `Total deliveries must be positive (${totalDeliveries}); BEV share is undefined.`,
      reasons: ['Non-positive total deliveries.'],
      matchedObservationIds,
    };
  }

  if (bevDeliveries < 0) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare,
      difference: null,
      diagnostic: `BEV deliveries cannot be negative (${bevDeliveries}).`,
      reasons: ['Negative BEV deliveries.'],
      matchedObservationIds,
    };
  }

  if (bevDeliveries > totalDeliveries) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare,
      difference: null,
      diagnostic: `BEV deliveries (${bevDeliveries}) cannot exceed total vehicle deliveries (${totalDeliveries}).`,
      reasons: ['BEV deliveries exceed total deliveries.'],
      matchedObservationIds,
    };
  }

  if (reportedShare < 0 || reportedShare > 100) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare: null,
      reportedShare,
      difference: null,
      diagnostic: `Reported BEV share (${reportedShare}%) is outside the valid range [0, 100].`,
      reasons: ['Reported share out of [0, 100] bounds.'],
      matchedObservationIds,
    };
  }

  const calculatedShare = Math.round(((bevDeliveries / totalDeliveries) * 100) * 100) / 100;
  const difference = Math.round(Math.abs(calculatedShare - reportedShare) * 100) / 100;

  if (difference > 0.35) {
    return {
      isValid: false,
      validationStatus: 'needs_review',
      calculatedShare,
      reportedShare,
      difference,
      diagnostic: `Mathematical deviation of ${difference}%p exceeds 0.35%p threshold (reported: ${reportedShare}%, calculated: ${calculatedShare}%).`,
      reasons: ['Mathematical deviation exceeds threshold.'],
      matchedObservationIds,
    };
  }

  return {
    isValid: true,
    validationStatus: 'verified',
    calculatedShare,
    reportedShare,
    difference,
    diagnostic: 'BEV share calculation, volume definition, reporting scope, and mathematical consistency fully verified.',
    reasons: [],
    matchedObservationIds,
  };
}

/**
 * Cross-validates an observation against its associated SourceDocument and Company entity.
 * Validates entity alignment, period alignment, official HTTPS URLs, verification status,
 * verification methods, and evidence references.
 */
export function validateObservationProvenance(
  obs: MetricObservation,
  sourceDoc?: SourceDocument | null,
  company?: Company | null
): ProvenanceValidationResult {
  const reasons: string[] = [];
  let severity: 'ERROR' | 'WARNING' | 'INFO' = 'INFO';

  // 0. Company Registry Check
  if (company && company.id !== obs.companyId) {
    reasons.push(`Company mismatch: observation has "${obs.companyId}", but company object is "${company.id}".`);
    severity = 'ERROR';
  }

  // 1. Derived Observations
  if (obs.valueType === 'derived') {
    if (!obs.verificationStatus || obs.verificationStatus === 'unverified') {
      reasons.push('Derived observation is missing a valid verificationStatus.');
      return { valid: false, severity: 'ERROR', reasons };
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      reasons.push('Derived observation is missing required reportingScope.');
      return { valid: false, severity: 'ERROR', reasons };
    }
    return {
      valid: true,
      severity: 'INFO',
      reasons: ['Derived observation has valid verification status, reporting scope, and calculation metadata.'],
    };
  }

  // 2. Reported Observations: sourceDocId is required
  if (!obs.sourceDocId) {
    reasons.push('Reported observation is missing required sourceDocId link.');
    return { valid: false, severity: 'ERROR', reasons };
  }

  if (!sourceDoc) {
    reasons.push(`Referenced source document "${obs.sourceDocId}" does not exist in registry.`);
    return { valid: false, severity: 'ERROR', reasons };
  }

  // 3. Entity Linkage Check: source companyId must match observation companyId
  if (sourceDoc.companyId !== obs.companyId) {
    reasons.push(
      `Source company mismatch: observation belongs to "${obs.companyId}", but source document belongs to "${sourceDoc.companyId}".`
    );
    severity = 'ERROR';
  }

  // 4. Period Alignment Check
  if (sourceDoc.period && sourceDoc.period !== 'all' && sourceDoc.period !== obs.period) {
    const isQ4DeckForFY =
      sourceDoc.period.endsWith('-Q4') &&
      obs.period.endsWith('-FY') &&
      obs.period.split('-FY')[0] === sourceDoc.period.split('-Q4')[0];
    const isAnnualReportForPeriod =
      sourceDoc.period.endsWith('-FY') &&
      obs.period.startsWith(sourceDoc.period.split('-FY')[0]);

    if (!isAnnualReportForPeriod && !isQ4DeckForFY) {
      reasons.push(
        `Source period mismatch: observation period is "${obs.period}", but source document period is "${sourceDoc.period}".`
      );
      if (severity !== 'ERROR') severity = 'WARNING';
    }
  }

  // 5. Official Source URL Check
  if (!sourceDoc.officialUrl || !sourceDoc.officialUrl.startsWith('https://')) {
    reasons.push(`Source document "${sourceDoc.id}" is missing a valid secure HTTPS officialUrl.`);
    severity = 'ERROR';
  }

  // 6. Source Publication Date Check
  if (!sourceDoc.publicationDate || !/^\d{4}-\d{2}-\d{2}$/.test(sourceDoc.publicationDate)) {
    reasons.push(`Source document "${sourceDoc.id}" has invalid or missing publicationDate.`);
    severity = 'ERROR';
  }

  // 7. Source Verification Status
  if (!sourceDoc.isVerified || sourceDoc.verificationStatus === 'unverified') {
    reasons.push(`Source document "${sourceDoc.id}" is not marked as verified.`);
    if (severity !== 'ERROR') severity = 'WARNING';
  }

  // 8. Observation Verification Status & Method
  if (!obs.verificationStatus || obs.verificationStatus === 'unverified') {
    reasons.push('Reported observation is missing or unverified verificationStatus.');
    severity = 'ERROR';
  }

  if (!obs.verificationMethod || obs.verificationMethod === 'unverified') {
    reasons.push('Reported observation is missing required verificationMethod.');
    severity = 'ERROR';
  }

  // 9. Financial Specific checks
  if (obs.unit.startsWith('currency')) {
    if (!obs.currency) {
      reasons.push('Financial observation is missing required currency.');
      severity = 'ERROR';
    }
    if (!obs.accountingBasis || obs.accountingBasis === 'unknown') {
      reasons.push('Financial observation is missing required accountingBasis.');
      severity = 'ERROR';
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      reasons.push('Financial observation is missing required reportingScope.');
      severity = 'ERROR';
    }
  }

  // 10. Volume Specific checks
  if (obs.unit === 'units' || obs.unit === 'thousand_units' || obs.metricId.includes('deliveries')) {
    if (!obs.volumeDefinition || obs.volumeDefinition === 'unknown') {
      reasons.push('Volume observation is missing required volumeDefinition.');
      severity = 'ERROR';
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      reasons.push('Volume observation is missing required reportingScope.');
      severity = 'ERROR';
    }
  }

  // 11. Evidence Reference Note
  if (!obs.originalLabel && !obs.evidenceReference && !obs.pageNumber && !obs.tableReference) {
    reasons.push('Observation has no original label or evidence page/table reference.');
    if (severity !== 'ERROR') severity = 'WARNING';
  }

  const valid = severity !== 'ERROR';
  return {
    valid,
    severity,
    reasons: reasons.length > 0 ? reasons : ['Observation provenance and source document cross-validation verified.'],
  };
}
