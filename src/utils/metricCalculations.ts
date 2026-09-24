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

  const share = (bevDeliveries / totalDeliveries) * 100;
  return Number.isFinite(share) ? Math.min(100, Math.round(share * 100) / 100) : null;
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
