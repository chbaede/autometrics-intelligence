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

/**
 * Reusable comparison validation engine.
 * Checks definition, scope, accounting basis, volume definition, period, and currency.
 */
export function checkObservationComparability(
  obsA: MetricObservation,
  obsB: MetricObservation
): ComparabilityResult {
  const reasons: string[] = [];

  const definitionMatched = obsA.metricId === obsB.metricId;
  if (!definitionMatched) {
    reasons.push(`Metric definitions differ: "${obsA.metricId}" vs "${obsB.metricId}"`);
  }

  // Scope check
  const scopeA = obsA.reportingScope || 'unknown';
  const scopeB = obsB.reportingScope || 'unknown';
  const scopeMatched = scopeA === scopeB && scopeA !== 'unknown';
  if (!scopeMatched) {
    reasons.push(`Reporting scope mismatch: "${scopeA}" vs "${scopeB}"`);
  }

  // Accounting basis check
  const basisA = obsA.accountingBasis || 'unknown';
  const basisB = obsB.accountingBasis || 'unknown';
  const accountingBasisMatched = basisA === basisB && basisA !== 'unknown';
  if (!accountingBasisMatched) {
    reasons.push(`Accounting basis mismatch: "${basisA}" vs "${basisB}"`);
  }

  // Volume definition check
  let definitionVolumeMatched = true;
  if (obsA.volumeDefinition || obsB.volumeDefinition) {
    const volA = obsA.volumeDefinition || 'unknown';
    const volB = obsB.volumeDefinition || 'unknown';
    definitionVolumeMatched = volA === volB && volA !== 'unknown';
    if (!definitionVolumeMatched) {
      reasons.push(`Volume perimeter mismatch: "${volA}" vs "${volB}"`);
    }
  }

  // Period match
  const periodMatched = obsA.period === obsB.period && obsA.periodType === obsB.periodType;
  if (!periodMatched) {
    reasons.push(`Reporting period mismatch: "${obsA.period}" vs "${obsB.period}"`);
  }

  // Currency match for financial metrics
  let currencyMatched = true;
  if (obsA.unit.startsWith('currency') || obsB.unit.startsWith('currency')) {
    currencyMatched = obsA.currency === obsB.currency && !!obsA.currency;
    if (!currencyMatched) {
      reasons.push(`Functional currency difference: "${obsA.currency}" vs "${obsB.currency}"`);
    }
  }

  // Determine Level
  let level: ComparabilityLevel = 'direct';
  let comparable = true;

  if (!definitionMatched || !periodMatched) {
    level = 'not_comparable';
    comparable = false;
  } else if (!scopeMatched || !accountingBasisMatched || !definitionVolumeMatched || !currencyMatched) {
    level = 'limited';
    comparable = true;
  } else {
    level = 'direct';
    comparable = true;
  }

  return {
    comparable,
    level,
    reasons,
    scopeMatched,
    accountingBasisMatched,
    definitionMatched,
    periodMatched,
    currencyMatched,
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
 * Ensures that numerator and denominator scopes & bases match before calculating and asserting margin.
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
      reportedMargin: null,
      difference: null,
      diagnostic: 'Incomplete observation triplet for revenue, EBIT, and margin.',
    };
  }

  if (revObs.value <= 0) {
    return {
      isScopeCompatible: false,
      validationStatus: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      diagnostic: 'Revenue is non-positive; margin calculation undefined.',
    };
  }

  const calculatedMargin = Math.round(((ebitObs.value / revObs.value) * 100) * 100) / 100;
  const reportedMargin = marginObs.value;
  const difference = Math.round(Math.abs(calculatedMargin - reportedMargin) * 100) / 100;

  const scopeRev = revObs.reportingScope || 'unknown';
  const scopeEbit = ebitObs.reportingScope || 'unknown';
  const scopeMargin = marginObs.reportingScope || 'unknown';

  const basisEbit = ebitObs.accountingBasis || 'unknown';
  const basisMargin = marginObs.accountingBasis || 'unknown';

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

  if (basisEbit !== basisMargin) {
    return {
      isScopeCompatible: false,
      validationStatus: 'scope_warning',
      calculatedMargin,
      reportedMargin,
      difference,
      diagnostic: `Accounting basis mismatch: EBIT is ${basisEbit}, Margin is ${basisMargin}.`,
    };
  }

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
    diagnostic: 'Scope, accounting basis, and mathematical margin calculation fully reconciled.',
  };
}
