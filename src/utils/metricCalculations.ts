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
  MarginRelationshipRule,
  MarginCandidateResult,
  MarginTripletDiagnostic,
  MarginValidationChecks,
  MarginValidationResult,
  SourceDocument,
  Company,
  ProvenanceValidationResult,
  AuditFinding,
  DocumentedReportedKpi,
  ProxyMetricMapping,
  MarginValidationContext,
  ReportingScope,
  ScopeRelationshipRule,
} from '../types/metrics';
import {
  DocumentedScopeException,
  isProxyException,
  normalizeProxyException,
  validateProxyMappingCompatibility,
  DOCUMENTED_REPORTED_KPIS,
  PROXY_METRIC_MAPPINGS,
} from '../data/scopeExceptions';
import { SOURCES_MAP } from '../data/sources';

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
 * fiscal calendar alignment, currency, unit scale, and intrinsic comparability flags.
 */
export function checkObservationComparability(
  obsA: MetricObservation,
  obsB: MetricObservation
): ComparabilityResult {
  const reasons: string[] = [];

  // 0. Intrinsic metric comparability check
  const intrinsicA = obsA.isComparable !== false;
  const intrinsicB = obsB.isComparable !== false;
  if (!intrinsicA || !intrinsicB) {
    const nonComp = !intrinsicA ? obsA : obsB;
    reasons.push(
      `Observation flagged as intrinsically non-comparable (${nonComp.id}): ${nonComp.nonComparableReason || 'Standard cross-OEM comparison not supported'}`
    );
  }

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

  if (!intrinsicA || !intrinsicB || !definitionMatched || !periodMatched || !periodTypeMatched || !fiscalCalendarMatched) {
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

/**
 * getDimensionalObservationKey — Dimensional Identity
 *
 * Identifies an observation by its core measurement dimensions:
 * who reported what, for which period, under which scope, basis, volume perimeter, and currency.
 *
 * Two observations with the same dimensional key represent the SAME underlying data point
 * (even if sourced from different documents). Duplicate policy:
 *
 *  - Same key, same value, different sourceDocId → corroboration (INFO finding).
 *  - Same key, different value, different sourceDocId → conflict (REVIEW finding).
 *  - Same key, same value, same sourceDocId → exact duplicate (ERROR / blocking).
 *  - Same key, conflicting source metadata → source conflict (REVIEW finding).
 */
export function getDimensionalObservationKey(obs: MetricObservation): string {
  return [
    obs.companyId,
    obs.metricId,
    obs.period,
    obs.periodType,
    obs.reportingScope || 'unknown',
    obs.accountingBasis || 'unknown',
    obs.volumeDefinition || 'unknown',
    obs.currency || 'none',
    obs.valueType,
  ].join('|');
}

/**
 * getEvidenceIdentityKey — Evidence Identity
 *
 * Uniquely identifies a single reported observation including its evidence provenance.
 * Two observations may share a dimensional key but differ in evidence identity
 * (e.g., same metric from two different official sources = corroboration, not duplicate).
 */
export function getEvidenceIdentityKey(obs: MetricObservation): string {
  return [
    obs.companyId,
    obs.metricId,
    obs.period,
    obs.periodType,
    obs.reportingScope || 'unknown',
    obs.accountingBasis || 'unknown',
    obs.volumeDefinition || 'unknown',
    obs.currency || 'none',
    obs.valueType,
    obs.sourceDocId || 'no_source',
    obs.pageNumber !== undefined ? String(obs.pageNumber) : 'no_page',
    obs.tableReference || 'no_table',
    obs.originalLabel || 'no_label',
  ].join('|');
}

/**
 * getCanonicalObservationKey — backward-compatible alias for getDimensionalObservationKey.
 * @deprecated Use getDimensionalObservationKey or getEvidenceIdentityKey explicitly.
 */
export function getCanonicalObservationKey(obs: MetricObservation): string {
  return getDimensionalObservationKey(obs);
}


export const MARGIN_RELATIONSHIP_RULES: MarginRelationshipRule[] = [
  {
    id: 'reported_operating_margin',
    name: 'Reported Operating Margin (GAAP / IFRS)',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['reported'],
    denominatorAccountingBases: ['reported'],
    marginAccountingBases: ['reported'],
    allowedScopeRelationships: [{ relationshipType: 'same_scope' }],
  },
  {
    id: 'reported_ebit_margin',
    name: 'Reported EBIT Margin',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'ebit',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['reported'],
    denominatorAccountingBases: ['reported'],
    marginAccountingBases: ['reported'],
    allowedScopeRelationships: [{ relationshipType: 'same_scope' }],
  },
  {
    id: 'adjusted_operating_margin',
    name: 'Adjusted Operating Margin (Non-GAAP / Adjusted)',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['adjusted', 'non_gaap'],
    denominatorAccountingBases: ['reported', 'adjusted', 'non_gaap'],
    marginAccountingBases: ['adjusted', 'non_gaap'],
    allowedScopeRelationships: [{ relationshipType: 'same_scope' }],
  },
  {
    id: 'adjusted_ebit_margin',
    name: 'Adjusted EBIT Margin',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'adjusted_ebit',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['adjusted', 'non_gaap'],
    denominatorAccountingBases: ['reported', 'adjusted', 'non_gaap'],
    marginAccountingBases: ['adjusted', 'non_gaap'],
    allowedScopeRelationships: [{ relationshipType: 'same_scope' }],
  },
  {
    id: 'management_defined_margin',
    name: 'Management-Defined Return on Sales',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['management_defined'],
    denominatorAccountingBases: ['reported', 'management_defined'],
    marginAccountingBases: ['management_defined'],
    allowedScopeRelationships: [{ relationshipType: 'same_scope' }],
  },
];

export const OPERATING_MARGIN_RELATIONSHIP: DerivedMetricDefinition = {
  metricId: 'operating_margin',
  numeratorMetricIds: ['operating_income', 'ebit', 'adjusted_ebit'],
  denominatorMetricIds: ['revenue'],
  allowedAccountingBases: ['reported', 'adjusted', 'non_gaap', 'management_defined'],
};

/**
 * Evaluates whether observed scopes satisfy any allowed scope relationship rules (STEP 4-8, Task 5).
 * Shared by selectCompatibleMarginTriplets() and validateMarginTriplet().
 */
export function matchScopeRelationship(
  scopeRev?: ReportingScope,
  scopeProfit?: ReportingScope,
  scopeMargin?: ReportingScope,
  allowedRelationships?: ScopeRelationshipRule[]
): boolean {
  if (!allowedRelationships || !scopeRev || !scopeProfit || !scopeMargin) return false;
  if (scopeRev === 'unknown' || scopeProfit === 'unknown' || scopeMargin === 'unknown') return false;

  for (const scopeRel of allowedRelationships) {
    if (scopeRel.relationshipType === 'same_scope') {
      if (scopeRev === scopeProfit && scopeProfit === scopeMargin) {
        return true;
      }
    } else if (
      (scopeRel.relationshipType === 'segment_operating_margin' ||
        scopeRel.relationshipType === 'custom_scope_mapping') &&
      scopeRel.denominatorScope &&
      scopeRel.numeratorScope &&
      scopeRel.marginScope
    ) {
      if (
        scopeRev === scopeRel.denominatorScope &&
        scopeProfit === scopeRel.numeratorScope &&
        scopeMargin === scopeRel.marginScope
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Selects compatible margin candidate triplets from an observation pool.
 * Identifies the correct numerator (operating_income/ebit vs adjusted_ebit),
 * denominator (revenue), and margin without arbitrary candidate[0] selection.
 */
export function selectCompatibleMarginTriplets(
  observations: MetricObservation[],
  companyId: string,
  period: string,
  rules: MarginRelationshipRule[] = MARGIN_RELATIONSHIP_RULES
): MarginCandidateResult {
  const allRev = observations.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'revenue' && o.value !== null
  );
  const allProfit = observations.filter(
    (o) =>
      o.companyId === companyId &&
      o.period === period &&
      (o.metricId === 'operating_income' || o.metricId === 'ebit' || o.metricId === 'adjusted_ebit') &&
      o.value !== null
  );
  const allMargin = observations.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'operating_margin' && o.value !== null
  );

  const candidatesChecked = allRev.length + allProfit.length + allMargin.length;
  const reasons: string[] = [];

  if (allRev.length === 0 || allProfit.length === 0 || allMargin.length === 0) {
    if (allRev.length === 0) reasons.push('Missing revenue denominator candidate observation.');
    if (allProfit.length === 0) reasons.push('Missing operating profit numerator candidate observation.');
    if (allMargin.length === 0) reasons.push('Missing operating margin candidate observation.');
    return {
      status: 'missing',
      candidatesChecked,
      failedChecks: ['missing_candidates'],
      reasons,
    };
  }

  const compatibleTriplets: {
    rule: MarginRelationshipRule;
    rev: MetricObservation;
    profit: MetricObservation;
    margin: MetricObservation;
  }[] = [];

  const failedChecksSet = new Set<string>();

  for (const rule of rules) {
    const revCandidates = allRev.filter(
      (o) => o.metricId === rule.denominatorMetricId && rule.denominatorAccountingBases.includes(o.accountingBasis || 'unknown')
    );
    const profitCandidates = allProfit.filter(
      (o) => o.metricId === rule.numeratorMetricId && rule.numeratorAccountingBases.includes(o.accountingBasis || 'unknown')
    );
    const marginCandidates = allMargin.filter(
      (o) => o.metricId === rule.marginMetricId && rule.marginAccountingBases.includes(o.accountingBasis || 'unknown')
    );

    for (const rev of revCandidates) {
      for (const profit of profitCandidates) {
        for (const margin of marginCandidates) {
          const periodMatch = rev.period === profit.period && profit.period === margin.period;
          if (!periodMatch) failedChecksSet.add('period');

          const periodTypeMatch = rev.periodType === profit.periodType && profit.periodType === margin.periodType;
          if (!periodTypeMatch) failedChecksSet.add('periodType');

          const scopeMatch = matchScopeRelationship(
            rev.reportingScope,
            profit.reportingScope,
            margin.reportingScope,
            rule.allowedScopeRelationships
          );
          if (!scopeMatch) failedChecksSet.add('reportingScope');

          const currencyMatch =
            !!rev.currency && !!profit.currency && rev.currency === profit.currency;
          if (!currencyMatch) failedChecksSet.add('currency');

          const unitMatch = rev.unit === profit.unit && margin.unit === 'percentage';
          if (!unitMatch) failedChecksSet.add('unit');

          if (periodMatch && periodTypeMatch && scopeMatch && currencyMatch && unitMatch) {
            compatibleTriplets.push({ rule, rev, profit, margin });
          }
        }
      }
    }
  }

  // Build detailed candidate-specific diagnostics for every inspected triplet
  const diagnostics: MarginTripletDiagnostic[] = [];

  for (const margin of allMargin) {
    for (const profit of allProfit) {
      for (const rev of allRev) {
        const matchingTriplet = compatibleTriplets.find(
          (t) => t.rev.id === rev.id && t.profit.id === profit.id && t.margin.id === margin.id
        );

        if (matchingTriplet) {
          diagnostics.push({
            revenue: rev,
            profit,
            margin,
            ruleId: matchingTriplet.rule.id,
            failedChecks: [],
            reasons: [`Compatible under rule "${matchingTriplet.rule.name}".`],
          });
          continue;
        }

        // Triplet is incompatible — diagnose why
        const tripletFailedChecksSet = new Set<string>();
        const tripletReasons: string[] = [];

        // Check if any rule targets these metric definitions
        const relevantRules = rules.filter(
          (r) =>
            r.denominatorMetricId === rev.metricId &&
            r.numeratorMetricId === profit.metricId &&
            r.marginMetricId === margin.metricId
        );

        if (relevantRules.length === 0) {
          tripletFailedChecksSet.add('metricDefinition');
          tripletReasons.push(
            `No relationship rule for numerator "${profit.metricId}", denominator "${rev.metricId}", margin "${margin.metricId}".`
          );
        }

        const candidateRules = relevantRules;
        let selectedCandidateRule = relevantRules.length === 1 ? relevantRules[0] : undefined;

        // Evaluate checks against the candidate rules
        const periodMatch = rev.period === profit.period && profit.period === margin.period;
        if (!periodMatch) tripletFailedChecksSet.add('period');

        const periodTypeMatch = rev.periodType === profit.periodType && profit.periodType === margin.periodType;
        if (!periodTypeMatch) tripletFailedChecksSet.add('periodType');

        let basisMatch = false;
        let scopeMatch = false;

        for (const rule of candidateRules) {
          const revBasisOk = rule.denominatorAccountingBases.includes(rev.accountingBasis || 'unknown');
          const profitBasisOk = rule.numeratorAccountingBases.includes(profit.accountingBasis || 'unknown');
          const marginBasisOk = rule.marginAccountingBases.includes(margin.accountingBasis || 'unknown');
          if (revBasisOk && profitBasisOk && marginBasisOk) {
            basisMatch = true;
            selectedCandidateRule = rule;
          }

          for (const scopeRel of rule.allowedScopeRelationships) {
            if (scopeRel.relationshipType === 'same_scope') {
              if (
                !!rev.reportingScope &&
                !!profit.reportingScope &&
                !!margin.reportingScope &&
                rev.reportingScope !== 'unknown' &&
                rev.reportingScope === profit.reportingScope &&
                profit.reportingScope === margin.reportingScope
              ) {
                scopeMatch = true;
                break;
              }
            } else if (
              scopeRel.denominatorScope &&
              scopeRel.numeratorScope &&
              scopeRel.marginScope &&
              rev.reportingScope === scopeRel.denominatorScope &&
              profit.reportingScope === scopeRel.numeratorScope &&
              margin.reportingScope === scopeRel.marginScope
            ) {
              scopeMatch = true;
              break;
            }
          }
        }

        if (!basisMatch) tripletFailedChecksSet.add('accountingBasis');
        if (!scopeMatch) tripletFailedChecksSet.add('reportingScope');

        const currencyMatch = !!rev.currency && !!profit.currency && rev.currency === profit.currency;
        if (!currencyMatch) tripletFailedChecksSet.add('currency');

        const unitMatch = rev.unit === profit.unit && margin.unit === 'percentage';
        if (!unitMatch) tripletFailedChecksSet.add('unit');

        const failedChecks = Array.from(tripletFailedChecksSet);
        if (failedChecks.length === 0) failedChecks.push('accountingBasis');

        diagnostics.push({
          revenue: rev,
          profit,
          margin,
          ruleId: selectedCandidateRule?.id,
          failedChecks,
          reasons: tripletReasons.length > 0 ? tripletReasons : [`Failed checks: ${failedChecks.join(', ')}`],
        });
      }
    }
  }

  if (compatibleTriplets.length === 1) {
    return {
      status: 'matched',
      ruleId: compatibleTriplets[0].rule.id,
      revenue: compatibleTriplets[0].rev,
      profit: compatibleTriplets[0].profit,
      margin: compatibleTriplets[0].margin,
      candidatesChecked,
      reasons: [`Compatible margin triplet successfully matched under rule "${compatibleTriplets[0].rule.name}".`],
      diagnostics,
    };
  }

  if (compatibleTriplets.length > 1) {
    return {
      status: 'ambiguous',
      candidatesChecked,
      failedChecks: ['multiple_compatible_triplets'],
      reasons: [
        `Ambiguous candidate observations: found ${compatibleTriplets.length} valid compatible candidate triplets across rules.`,
      ],
      diagnostics,
    };
  }

  const failedChecks = Array.from(failedChecksSet);
  if (failedChecks.length === 0) {
    failedChecks.push('accountingBasis', 'metricDefinition');
  }

  const incompatibleReasons: string[] = [
    `Incompatible candidate triplet: candidates exist (${allRev.length} rev, ${allProfit.length} profit, ${allMargin.length} margin) but no semantic relationship rule was satisfied. Failed checks: ${failedChecks.join(', ')}.`,
  ];

  return {
    status: 'incompatible',
    candidatesChecked,
    failedChecks,
    reasons: incompatibleReasons,
    diagnostics,
  };
}

export interface MarginValidationOptions {
  proxyMapping?: ProxyMetricMapping | null;
  documentedKpi?: DocumentedReportedKpi | null;
  exception?: DocumentedScopeException | null;
  context?: MarginValidationContext | null;
  sourcesMap?: ReadonlyMap<string, SourceDocument> | Map<string, SourceDocument> | Record<string, SourceDocument> | null;
}

/**
 * Resolves a strongly-typed MarginValidationContext (STEP 4-7/4-8).
 * Distinguishes standard, documented_actual_segment, proxy_numerator, and inconsistent_or_invalid contexts.
 */
export function resolveMarginValidationContext(
  optionsOrException?: MarginValidationOptions | DocumentedScopeException | MarginValidationContext | null
): MarginValidationContext {
  if (!optionsOrException) {
    return { kind: 'standard' };
  }

  // Already a MarginValidationContext
  if ('kind' in optionsOrException && typeof (optionsOrException as any).kind === 'string') {
    return optionsOrException as MarginValidationContext;
  }

  let exception: DocumentedScopeException | null = null;
  let proxyMapping: ProxyMetricMapping | null = null;
  let documentedKpi: DocumentedReportedKpi | null = null;

  if ('id' in optionsOrException && 'numeratorScope' in optionsOrException) {
    // DocumentedScopeException
    exception = optionsOrException as DocumentedScopeException;
  } else {
    // MarginValidationOptions
    const opts = optionsOrException as MarginValidationOptions;
    if (opts.context) {
      return opts.context;
    }
    exception = opts.exception ?? null;
    proxyMapping = opts.proxyMapping ?? null;
    documentedKpi = opts.documentedKpi ?? null;
  }

  if (exception) {
    if (!proxyMapping && exception.proxyMappingId) {
      proxyMapping = PROXY_METRIC_MAPPINGS.find((p) => p.id === exception!.proxyMappingId) ?? null;
    }
    if (!documentedKpi && exception.reportedKpiId) {
      documentedKpi = DOCUMENTED_REPORTED_KPIS.find((k) => k.id === exception!.reportedKpiId) ?? null;
    }

    const norm = normalizeProxyException(exception);
    if (norm.isInconsistent) {
      return {
        kind: 'inconsistent_or_invalid',
        reason: norm.error || `Inconsistent proxy exception state in [${exception.id}].`,
        exception,
        mapping: proxyMapping,
        reportedKpi: documentedKpi,
      };
    }
  }

  const isProxy = proxyMapping !== null || isProxyException(exception);

  if (isProxy) {
    if (proxyMapping) {
      return {
        kind: 'proxy_numerator',
        mapping: proxyMapping,
        reportedKpi: documentedKpi,
        exception,
      };
    }
    if (exception) {
      const syntheticMapping: ProxyMetricMapping = {
        id: exception.proxyMappingId || exception.id,
        companyId: exception.companyId,
        period: exception.period,
        periodType: exception.periodType,
        targetMetricId: exception.marginMetricId,
        targetNumeratorSemantic:
          exception.companyId === 'bmw_group'
            ? 'automotive_segment_ebit'
            : exception.companyId === 'mercedes_benz'
            ? 'cars_adjusted_ebit'
            : exception.numeratorMetricId,
        targetScope: exception.marginScope,
        targetBasis: exception.marginBasis,
        proxyMetricId: exception.numeratorMetricId,
        proxyScope: exception.numeratorScope,
        proxyBasis: exception.numeratorBasis,
        denominatorMetricId: exception.denominatorMetricId,
        denominatorScope: exception.denominatorScope,
        denominatorBasis: exception.denominatorBasis,
        sourceDocIds: exception.sourceDocIds,
        evidence: exception.evidence,
        status: 'proxy_only',
        reason: exception.rationale,
      };
      return {
        kind: 'proxy_numerator',
        mapping: syntheticMapping,
        reportedKpi: documentedKpi,
        exception,
      };
    }
  }

  if (exception) {
    return {
      kind: 'documented_actual_segment',
      exception,
      reportedKpi: documentedKpi,
    };
  }

  return { kind: 'standard' };
}

export interface ExceptionDimensionValidationResult {
  isValid: boolean;
  reasons: string[];
  mismatches: string[];
}

/**
 * Revalidates that an exception's declared dimensions match the actual candidate observations (STEP 4-5, P1; STEP 4-7, P2-1).
 * An exception must never override unrelated metric, scope, or accounting-basis mismatches.
 */
export function validateExceptionDimensions(
  exception: DocumentedScopeException,
  revObs: MetricObservation,
  profitObs: MetricObservation,
  marginObs: MetricObservation
): ExceptionDimensionValidationResult {
  const reasons: string[] = [];
  const mismatches: string[] = [];

  // 1. Company ID
  if (
    exception.companyId !== revObs.companyId ||
    exception.companyId !== profitObs.companyId ||
    exception.companyId !== marginObs.companyId
  ) {
    mismatches.push('companyId');
    reasons.push(
      `Exception companyId "${exception.companyId}" does not match triplet observations: revenue (${revObs.companyId}), profit (${profitObs.companyId}), margin (${marginObs.companyId}).`
    );
  }

  // 2. Period
  if (
    exception.period &&
    (exception.period !== revObs.period ||
      exception.period !== profitObs.period ||
      exception.period !== marginObs.period)
  ) {
    mismatches.push('period');
    reasons.push(
      `Exception period "${exception.period}" does not match triplet observations: revenue (${revObs.period}), profit (${profitObs.period}), margin (${marginObs.period}).`
    );
  }

  // 2b. PeriodType (P2-1)
  if (
    exception.periodType &&
    (exception.periodType !== revObs.periodType ||
      exception.periodType !== profitObs.periodType ||
      exception.periodType !== marginObs.periodType)
  ) {
    mismatches.push('periodType');
    reasons.push(
      `Exception periodType "${exception.periodType}" does not match triplet observations: revenue (${revObs.periodType}), profit (${profitObs.periodType}), margin (${marginObs.periodType}).`
    );
  }

  // 3. Metric IDs
  if (exception.marginMetricId !== marginObs.metricId) {
    mismatches.push('marginMetricId');
    reasons.push(
      `Exception marginMetricId "${exception.marginMetricId}" does not match margin observation "${marginObs.metricId}".`
    );
  }
  if (exception.numeratorMetricId !== profitObs.metricId) {
    mismatches.push('numeratorMetricId');
    reasons.push(
      `Exception numeratorMetricId "${exception.numeratorMetricId}" does not match profit observation "${profitObs.metricId}".`
    );
  }
  if (exception.denominatorMetricId !== revObs.metricId) {
    mismatches.push('denominatorMetricId');
    reasons.push(
      `Exception denominatorMetricId "${exception.denominatorMetricId}" does not match revenue observation "${revObs.metricId}".`
    );
  }

  // 4. Reporting Scopes
  if (exception.marginScope !== marginObs.reportingScope) {
    mismatches.push('marginScope');
    reasons.push(
      `Exception marginScope "${exception.marginScope}" does not match margin observation "${marginObs.reportingScope}".`
    );
  }
  if (exception.numeratorScope !== profitObs.reportingScope) {
    mismatches.push('numeratorScope');
    reasons.push(
      `Exception numeratorScope "${exception.numeratorScope}" does not match profit observation "${profitObs.reportingScope}".`
    );
  }
  if (exception.denominatorScope !== revObs.reportingScope) {
    mismatches.push('denominatorScope');
    reasons.push(
      `Exception denominatorScope "${exception.denominatorScope}" does not match revenue observation "${revObs.reportingScope}".`
    );
  }

  // 5. Accounting Bases
  if (exception.marginBasis !== marginObs.accountingBasis) {
    mismatches.push('marginBasis');
    reasons.push(
      `Exception marginBasis "${exception.marginBasis}" does not match margin observation "${marginObs.accountingBasis}".`
    );
  }
  if (exception.numeratorBasis !== profitObs.accountingBasis) {
    mismatches.push('numeratorBasis');
    reasons.push(
      `Exception numeratorBasis "${exception.numeratorBasis}" does not match profit observation "${profitObs.accountingBasis}".`
    );
  }
  if (exception.denominatorBasis !== revObs.accountingBasis) {
    mismatches.push('denominatorBasis');
    reasons.push(
      `Exception denominatorBasis "${exception.denominatorBasis}" does not match revenue observation "${revObs.accountingBasis}".`
    );
  }

  return {
    isValid: mismatches.length === 0,
    reasons,
    mismatches,
  };
}

/**
 * Validates semantic and mathematical compatibility among revenue, operating profit, and reported margin.
 */
export function validateMarginTriplet(
  revObs?: MetricObservation | null,
  profitObs?: MetricObservation | null,
  marginObs?: MetricObservation | null,
  rules: MarginRelationshipRule[] = MARGIN_RELATIONSHIP_RULES,
  options?: MarginValidationOptions
): MarginValidationResult {
  const context = resolveMarginValidationContext(options);
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
    relationshipRule: false,
    valueValidity: false,
    verificationStatus: false,
    provenance: false,
  };

  const reasons: string[] = [];

  // Check 1: Value validity & non-null/finite check
  const valuesValid =
    !!revObs &&
    !!profitObs &&
    !!marginObs &&
    revObs.value !== null &&
    profitObs.value !== null &&
    marginObs.value !== null &&
    Number.isFinite(revObs.value) &&
    Number.isFinite(profitObs.value) &&
    Number.isFinite(marginObs.value);

  checks.valueValidity = valuesValid && (revObs ? revObs.value! > 0 : false);

  if (!valuesValid || !revObs || !profitObs || !marginObs) {
    if (!revObs) reasons.push('Missing revenue observation.');
    if (!profitObs) reasons.push('Missing operating profit observation.');
    if (!marginObs) reasons.push('Missing operating margin observation.');
    const failedChecks: (keyof MarginValidationChecks)[] = [
      'valueValidity',
      'period',
      'periodType',
      'scope',
      'accountingBasis',
      'currency',
      'unit',
      'metricDefinition',
      'relationshipRule',
      'verificationStatus',
      'provenance',
    ];
    return {
      status: 'needs_review',
      calculatedMargin: null,
      reportedMargin: marginObs?.value ?? null,
      difference: null,
      mathematicallyVerified: false,
      directMathematicalVerification: false,
      proxyLimitation: false,
      proxyScopeCompatibility: false,
      selectedObservationIds,
      failedChecks,
      checks,
      diagnostic: 'Incomplete observation triplet: missing or non-finite revenue, profit, or margin observation.',
      reasons,
    };
  }

  // Check 2: Semantic Relationship & Metric definition checks
  const matchingRule = rules.find(
    (r) =>
      r.denominatorMetricId === revObs.metricId &&
      r.numeratorMetricId === profitObs.metricId &&
      r.marginMetricId === marginObs.metricId &&
      r.denominatorAccountingBases.includes(revObs.accountingBasis || 'unknown') &&
      r.numeratorAccountingBases.includes(profitObs.accountingBasis || 'unknown') &&
      r.marginAccountingBases.includes(marginObs.accountingBasis || 'unknown')
  );

  checks.metricDefinition =
    (profitObs.metricId === 'operating_income' || profitObs.metricId === 'ebit' || profitObs.metricId === 'adjusted_ebit') &&
    revObs.metricId === 'revenue' &&
    marginObs.metricId === 'operating_margin';

  checks.relationshipRule = !!matchingRule;
  if (!checks.relationshipRule) {
    reasons.push(
      `No semantic relationship rule satisfied for numerator "${profitObs.metricId}" (${profitObs.accountingBasis}), denominator "${revObs.metricId}" (${revObs.accountingBasis}), and margin "${marginObs.metricId}" (${marginObs.accountingBasis}).`
    );
  }

  // Check 3: Period and periodType
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

  // Check 4: Reporting scope (same_scope, segment_operating_margin, custom_scope_mapping)
  const scopeRev = revObs.reportingScope;
  const scopeProfit = profitObs.reportingScope;
  const scopeMargin = marginObs.reportingScope;
  const scopeMatchesRule = matchingRule
    ? matchScopeRelationship(
        scopeRev,
        scopeProfit,
        scopeMargin,
        matchingRule.allowedScopeRelationships
      )
    : false;
  checks.scope = scopeMatchesRule;
  if (!checks.scope) {
    reasons.push(`Scope mismatch: Revenue (${scopeRev}), Profit (${scopeProfit}), Margin (${scopeMargin}).`);
  }

  // Check 5: Accounting basis
  checks.accountingBasis =
    !!revObs.accountingBasis &&
    !!profitObs.accountingBasis &&
    !!marginObs.accountingBasis &&
    revObs.accountingBasis !== 'unknown' &&
    profitObs.accountingBasis !== 'unknown' &&
    marginObs.accountingBasis !== 'unknown' &&
    (matchingRule
      ? matchingRule.denominatorAccountingBases.includes(revObs.accountingBasis) &&
        matchingRule.numeratorAccountingBases.includes(profitObs.accountingBasis) &&
        matchingRule.marginAccountingBases.includes(marginObs.accountingBasis)
      : false);
  if (!checks.accountingBasis) {
    reasons.push(`Accounting basis mismatch: Revenue (${revObs.accountingBasis}), Profit (${profitObs.accountingBasis}), Margin (${marginObs.accountingBasis}).`);
  }

  // Check 6: Currency
  checks.currency = !!revObs.currency && !!profitObs.currency && revObs.currency === profitObs.currency;
  if (!checks.currency) {
    reasons.push(`Currency mismatch: Revenue (${revObs.currency}), Profit (${profitObs.currency}).`);
  }

  // Check 7: Unit
  checks.unit = revObs.unit === profitObs.unit && marginObs.unit === 'percentage';
  if (!checks.unit) {
    reasons.push(`Unit scale mismatch: Revenue (${revObs.unit}), Profit (${profitObs.unit}), Margin (${marginObs.unit}).`);
  }

  // Check 8: Verification status (must be explicitly 'verified')
  const allVerified =
    revObs.verificationStatus === 'verified' &&
    profitObs.verificationStatus === 'verified' &&
    marginObs.verificationStatus === 'verified';
  checks.verificationStatus = allVerified;
  if (!checks.verificationStatus) {
    reasons.push(
      `Observation verification status is not verified: Revenue (${revObs.verificationStatus || 'unspecified'}), Profit (${profitObs.verificationStatus || 'unspecified'}), Margin (${marginObs.verificationStatus || 'unspecified'}).`
    );
  }

  // Check 9: Provenance
  const revProv = revObs.valueType !== 'reported' || !!revObs.sourceDocId;
  const profitProv = profitObs.valueType !== 'reported' || !!profitObs.sourceDocId;
  const marginProv = marginObs.valueType !== 'reported' || !!marginObs.sourceDocId;
  checks.provenance = revProv && profitProv && marginProv;
  if (!checks.provenance) {
    reasons.push('Provenance link missing on reported observation in margin triplet.');
  }

  const failedChecks = (Object.keys(checks) as (keyof MarginValidationChecks)[]).filter(
    (key) => checks[key] === false
  );

  // Inconsistent context check (STEP 4-7/4-8; STEP 4-12, Task 5)
  // When an exception is explicitly marked with nature='proxy_numerator' but has contradictory
  // flags (e.g. isProxy=false as tested in regression Tests 62 and 74), normalize it strictly
  // to candidate proxy evaluation so it is never treated as verified or documented.
  // Inconsistent non-proxy contexts remain strictly invalid and are never converted to proxy.
  let resolvedContext = context;
  if (context.kind === 'inconsistent_or_invalid') {
    const isLegacyInconsistentProxy =
      context.exception &&
      (context.exception.nature === 'proxy_numerator' || isProxyException(context.exception));

    if (isLegacyInconsistentProxy) {
      /* LEGACY FALLBACK (STEP 4-7 / STEP 4-8):
       * Inconsistent proxy exceptions (nature='proxy_numerator', isProxy=false as tested in Tests 62 and 74)
       * are normalized to candidate proxy evaluation so they can never be mistakenly accepted as standard verified exceptions.
       * The original inconsistency reason is preserved, and full proxy semantic, denominator contract,
       * and evidence validation are strictly enforced. Never allowed to produce verified or documented disposition.
       */
      const syntheticMapping: ProxyMetricMapping = context.mapping ?? {
        id: context.exception!.proxyMappingId || context.exception!.id,
        companyId: context.exception!.companyId,
        period: context.exception!.period,
        periodType: context.exception!.periodType,
        targetMetricId: context.exception!.marginMetricId,
        targetNumeratorSemantic:
          context.exception!.companyId === 'bmw_group'
            ? 'automotive_segment_ebit'
            : context.exception!.companyId === 'mercedes_benz'
            ? 'cars_adjusted_ebit'
            : context.exception!.numeratorMetricId,
        targetScope: context.exception!.marginScope,
        targetBasis: context.exception!.marginBasis,
        proxyMetricId: context.exception!.numeratorMetricId,
        proxyScope: context.exception!.numeratorScope,
        proxyBasis: context.exception!.numeratorBasis,
        denominatorMetricId: context.exception!.denominatorMetricId,
        denominatorScope: context.exception!.denominatorScope,
        denominatorBasis: context.exception!.denominatorBasis,
        sourceDocIds: context.exception!.sourceDocIds,
        evidence: context.exception!.evidence,
        status: 'proxy_only',
        reason: context.exception!.rationale,
      };

      resolvedContext = {
        kind: 'proxy_numerator',
        mapping: syntheticMapping,
        reportedKpi: context.reportedKpi,
        exception: context.exception,
      };
    } else {
      // Inconsistent non-proxy context remains strictly invalid (Task 5)
      return {
        status: 'invalid',
        calculatedMargin: null,
        reportedMargin: marginObs?.value ?? null,
        difference: null,
        mathematicallyVerified: false,
        directMathematicalVerification: false,
        proxyLimitation: false,
        proxyScopeCompatibility: false,
        selectedObservationIds,
        failedChecks: ['exception_consistency', 'scope'],
        checks: {
          ...checks,
          scope: false,
          accountingBasis: false,
        },
        reasons: [context.reason || 'Context is inconsistent or invalid.'],
        limitations: [context.reason || 'inconsistent_or_invalid'],
        diagnostic: `Context rejected as inconsistent or invalid: ${context.reason}`,
      };
    }
  }

  // Denominator check
  if (revObs.value! <= 0) {
    return {
      status: 'invalid',
      calculatedMargin: null,
      reportedMargin: marginObs.value,
      difference: null,
      mathematicallyVerified: false,
      selectedObservationIds,
      selectedRuleId: matchingRule?.id,
      exceptionId: resolvedContext.kind === 'documented_actual_segment' ? resolvedContext.exception.id : resolvedContext.kind === 'proxy_numerator' ? resolvedContext.exception?.id : undefined,
      proxyMappingId: resolvedContext.kind === 'proxy_numerator' ? resolvedContext.mapping.id : undefined,
      reportedKpiId: resolvedContext.kind === 'documented_actual_segment' || resolvedContext.kind === 'proxy_numerator' ? resolvedContext.reportedKpi?.id : undefined,
      failedChecks,
      checks,
      diagnostic: `Revenue denominator is non-positive (${revObs.value}); margin calculation is undefined.`,
      reasons: [...reasons, 'Non-positive revenue denominator.'],
    };
  }

  const calculatedMargin = Math.round(((profitObs.value! / revObs.value!) * 100) * 100) / 100;
  const reportedMargin = marginObs.value;
  const difference = Math.round(Math.abs(calculatedMargin - reportedMargin!) * 100) / 100;

  // Handle proxy exception or mapping (STEP 4-3, 4-4, 4-5, 4-6, 4-7, 4-8, 4-9)
  if (resolvedContext.kind === 'proxy_numerator') {
    const proxyMapping = resolvedContext.mapping;
    const legacyException = resolvedContext.exception;
    let isExceptionApplicable = true;
    const dimensionMismatches: string[] = [];

    const sourcesRegistry = options?.sourcesMap || SOURCES_MAP;
    const proxyCompat = validateProxyMappingCompatibility(proxyMapping, revObs, profitObs, marginObs, sourcesRegistry);
    if (!proxyCompat.isValid) {
      isExceptionApplicable = false;
      dimensionMismatches.push(...proxyCompat.mismatches);
      reasons.push(...proxyCompat.reasons);
    }

    if (legacyException) {
      const exceptionDimResult = validateExceptionDimensions(legacyException, revObs, profitObs, marginObs);
      if (!exceptionDimResult.isValid) {
        isExceptionApplicable = false;
        dimensionMismatches.push(...exceptionDimResult.mismatches);
        reasons.push(...exceptionDimResult.reasons);
      }
    }

    if (!isExceptionApplicable) {
      const uniqueMismatches = Array.from(new Set(dimensionMismatches));
      const failedProxyChecks = Array.from(new Set([
        ...failedChecks,
        ...(uniqueMismatches.some((m) => m === 'proxyScope' || m === 'targetScope' || m === 'denominatorScope') ? ['scope' as keyof MarginValidationChecks] : []),
        ...(uniqueMismatches.some((m) => m === 'proxyBasis' || m === 'targetBasis' || m === 'denominatorBasis') ? ['accountingBasis' as keyof MarginValidationChecks] : []),
        ...(uniqueMismatches.some((m) => m === 'period' || m === 'sourcePeriodMismatch' || m === 'missingSourcePeriod' || m === 'inconsistentSourcePeriods' || m === 'invalidPeriodFormat' || m === 'invalidPeriodTypeCombination') ? ['period' as keyof MarginValidationChecks] : []),
        ...(uniqueMismatches.some((m) => m === 'periodType' || m === 'sourcePeriodTypeMismatch' || m === 'missingSourcePeriodType' || m === 'inconsistentSourcePeriodTypes' || m === 'invalidPeriodTypeCombination') ? ['periodType' as keyof MarginValidationChecks] : []),
        ...(uniqueMismatches.some((m) => m === 'profitSourceDoc' || m === 'marginSourceDoc' || m === 'sourceMissing' || m === 'sourceUnverified' || m === 'sourceVerificationStatus' || m === 'sourceCompanyMismatch' || m === 'sourcePeriodMismatch' || m === 'sourcePeriodTypeMismatch' || m === 'inconsistentSourcePeriods' || m === 'inconsistentSourcePeriodTypes' || m === 'missingSourcePeriod' || m === 'missingSourcePeriodType' || m === 'sourceOfficialUrl' || m === 'sourcePublicationDate' || m === 'missingEvidenceLocator' || m === 'missingClaimEvidenceLocator' || m === 'missingClaimEvidence' || m.startsWith('missingClaimEvidence:')) ? ['provenance' as keyof MarginValidationChecks] : []),
        ...(uniqueMismatches.some((m) => m === 'targetNumeratorSemantic' || m === 'ambiguousProxyContract' || m === 'unsupportedProxyCompany' || m === 'deprecatedProxyContract' || m === 'evidencePurposeSupportMismatch' || m === 'unknownEvidencePurpose' || m === 'incompatibleEvidenceSupportPurpose' || m.startsWith('missingEvidenceSupport:') || m === 'proxyMetricId' || m === 'denominatorMetricId' || m === 'invalidMappingStatus' || m === 'emptyMappingId' || m === 'emptyMappingReason' || m === 'emptySourceDocIds' || m === 'emptyEvidence' || m === 'emptyTargetNumeratorSemantic' || m === 'missingClaimEvidenceLocator' || m === 'missingClaimEvidence' || m.startsWith('missingClaimEvidence:') || m === 'unknownClaimEvidenceType' || m === 'orphanClaimEvidence') ? ['metricDefinition' as keyof MarginValidationChecks] : []),
      ]));

      return {
        status: 'invalid',
        calculatedMargin: null,
        reportedMargin: marginObs.value,
        difference: null,
        mathematicallyVerified: false,
        directMathematicalVerification: false,
        proxyLimitation: false,
        proxyScopeCompatibility: false,
        proxyCompatibility: false,
        limitations: uniqueMismatches,
        selectedObservationIds,
        selectedRuleId: matchingRule?.id,
        exceptionId: legacyException?.id,
        proxyMappingId: proxyMapping.id,
        reportedKpiId: resolvedContext.reportedKpi?.id,
        failedChecks: failedProxyChecks.length > 0 ? failedProxyChecks : ['scope'],
        checks: {
          ...checks,
          scope: uniqueMismatches.some((m) => m === 'proxyScope' || m === 'targetScope' || m === 'denominatorScope') ? false : checks.scope,
          accountingBasis: uniqueMismatches.some((m) => m === 'proxyBasis' || m === 'targetBasis' || m === 'denominatorBasis') ? false : checks.accountingBasis,
          provenance: uniqueMismatches.some((m) => m === 'profitSourceDoc' || m === 'marginSourceDoc' || m === 'sourceMissing' || m === 'sourceUnverified' || m === 'sourceVerificationStatus' || m === 'sourceCompanyMismatch' || m === 'sourcePeriodMismatch' || m === 'inconsistentSourcePeriods' || m === 'sourceOfficialUrl' || m === 'sourcePublicationDate' || m === 'missingEvidenceLocator') ? false : checks.provenance,
        },
        diagnostic: `Proxy mapping [${proxyMapping.id}] rejected due to dimensional mismatch (${uniqueMismatches.join(', ')}): ${reasons.join('; ')}`,
        reasons: [
          `Proxy mapping rejected due to mismatch: ${uniqueMismatches.join(', ')}.`,
          ...reasons,
        ],
      };
    } else {
      // General integrity checks are NEVER waived for proxy exceptions (STEP 4-5, STEP 4-6, STEP 4-7, P1-5)
      // Explicit Precedence Policy (P1-5):
      // 1. valueValidity
      if (!checks.valueValidity) {
        return {
          status: 'invalid',
          calculatedMargin,
          reportedMargin,
          difference,
          mathematicallyVerified: false,
          selectedObservationIds,
          selectedRuleId: matchingRule?.id,
          exceptionId: legacyException?.id,
          proxyMappingId: proxyMapping.id,
          reportedKpiId: resolvedContext.reportedKpi?.id,
          failedChecks: ['valueValidity'],
          checks,
          diagnostic: `Invalid value in proxy triplet: ${reasons.join('; ')}`,
          reasons: ['Value validity failure cannot be overridden by proxy exception.'],
        };
      }

      // 2. currency
      if (!checks.currency) {
        return {
          status: 'invalid',
          calculatedMargin,
          reportedMargin,
          difference,
          mathematicallyVerified: false,
          selectedObservationIds,
          selectedRuleId: matchingRule?.id,
          exceptionId: legacyException?.id,
          proxyMappingId: proxyMapping.id,
          reportedKpiId: resolvedContext.reportedKpi?.id,
          failedChecks: ['currency'],
          checks,
          diagnostic: `Currency mismatch in proxy exception: Revenue (${revObs.currency}), Profit (${profitObs.currency}). Currency mismatch cannot be overridden by exception.`,
          reasons: ['Currency mismatch cannot be overridden by exception.'],
        };
      }

      // 3. unit
      if (!checks.unit) {
        return {
          status: 'invalid',
          calculatedMargin,
          reportedMargin,
          difference,
          mathematicallyVerified: false,
          selectedObservationIds,
          selectedRuleId: matchingRule?.id,
          exceptionId: legacyException?.id,
          proxyMappingId: proxyMapping.id,
          reportedKpiId: resolvedContext.reportedKpi?.id,
          failedChecks: ['unit'],
          checks,
          diagnostic: `Unit mismatch in proxy exception: Revenue (${revObs.unit}), Profit (${profitObs.unit}), Margin (${marginObs.unit}). Unit mismatch cannot be overridden by exception.`,
          reasons: ['Unit scale mismatch cannot be overridden by exception.'],
        };
      }

      // 4. provenance
      if (!checks.provenance) {
        return {
          status: 'invalid',
          calculatedMargin,
          reportedMargin,
          difference,
          mathematicallyVerified: false,
          selectedObservationIds,
          selectedRuleId: matchingRule?.id,
          exceptionId: legacyException?.id,
          proxyMappingId: proxyMapping.id,
          reportedKpiId: resolvedContext.reportedKpi?.id,
          failedChecks: ['provenance'],
          checks,
          diagnostic: `Provenance missing in proxy exception: reported observations must link to a valid source document. Provenance cannot be overridden by exception.`,
          reasons: ['Missing provenance cannot be overridden by exception.'],
        };
      }

      // 5. metricDefinition
      if (!checks.metricDefinition) {
        return {
          status: 'invalid',
          calculatedMargin,
          reportedMargin,
          difference,
          mathematicallyVerified: false,
          selectedObservationIds,
          selectedRuleId: matchingRule?.id,
          exceptionId: legacyException?.id,
          proxyMappingId: proxyMapping.id,
          reportedKpiId: resolvedContext.reportedKpi?.id,
          failedChecks: ['metricDefinition'],
          checks,
          diagnostic: `Invalid metric definition: exception cannot override invalid metric types. ${reasons.join('; ')}`,
          reasons: ['Metric definition mismatch cannot be overridden by exception.'],
        };
      }

      // 6. period & 7. periodType
      if (!checks.period || !checks.periodType) {
        return {
          status: 'invalid',
          calculatedMargin,
          reportedMargin,
          difference,
          mathematicallyVerified: false,
          selectedObservationIds,
          selectedRuleId: matchingRule?.id,
          exceptionId: legacyException?.id,
          proxyMappingId: proxyMapping.id,
          reportedKpiId: resolvedContext.reportedKpi?.id,
          failedChecks:
            !checks.period && !checks.periodType
              ? ['period', 'periodType']
              : !checks.period
              ? ['period']
              : ['periodType'],
          checks,
          diagnostic: `Period mismatch in proxy exception: ${reasons.join('; ')}`,
          reasons: ['Period mismatch cannot be overridden by exception.'],
        };
      }

      // 8. verificationStatus
      if (!checks.verificationStatus) {
        return {
          status: 'needs_review',
          calculatedMargin: null,
          reportedMargin: marginObs.value,
          difference: null,
          mathematicallyVerified: false,
          selectedObservationIds,
          selectedRuleId: matchingRule?.id,
          exceptionId: legacyException?.id,
          proxyMappingId: proxyMapping.id,
          reportedKpiId: resolvedContext.reportedKpi?.id,
          failedChecks: ['verificationStatus'],
          checks,
          diagnostic: `Proxy exception observation not verified: ${reasons.join('; ')}`,
          reasons: ['Proxy exception observations must be verified.'],
        };
      }

      // P2-2: Add explicit proxy checks to failedChecks
      const baseFailed = failedChecks.length > 0 ? failedChecks : ['scope'];
      const combinedFailedChecks = Array.from(new Set([
        ...baseFailed,
        'proxy_numerator',
        'mathematical_equivalence_unverified',
      ]));

      const rationale = legacyException?.rationale || proxyMapping.reason || 'Proxy numerator relationship';

      return {
        status: 'proxy_only',
        claimVerificationState: proxyCompat.claimVerificationState ?? 'locator_only',
        calculatedMargin: null,
        reportedMargin: marginObs.value,
        difference: null,
        mathematicallyVerified: false,
        directMathematicalVerification: false,
        proxyLimitation: true,
        proxyScopeCompatibility: true,
        proxyCompatibility: true,
        mathematicalEquivalence: false,
        limitations: ['proxy_numerator', 'mathematical_equivalence_unverified'],
        selectedObservationIds,
        selectedRuleId: matchingRule?.id,
        exceptionId: legacyException?.id,
        proxyMappingId: proxyMapping.id,
        reportedKpiId: resolvedContext.reportedKpi?.id,
        failedChecks: combinedFailedChecks,
        checks: { ...checks, scope: false },
        diagnostic: `Proxy numerator limitation: consolidated operating income cannot automatically become verified segment EBIT. Reported margin (${marginObs.value}%) preserved without independent mathematical verification per proxy mapping [${proxyMapping.id}]${legacyException ? ` / exception [${legacyException.id}]` : ''}.`,
        reasons: [
          'Proxy numerator relationship — not classified as verified calculation.',
          rationale,
        ],
      };
    }
  }

  // Handle documented actual segment exception
  if (resolvedContext.kind === 'documented_actual_segment') {
    const legacyException = resolvedContext.exception;
    const exceptionDimResult = validateExceptionDimensions(legacyException, revObs, profitObs, marginObs);
    if (!exceptionDimResult.isValid) {
      reasons.push(
        `Actual segment exception rejected: dimensional mismatch (${exceptionDimResult.mismatches.join(', ')}).`
      );
    } else {
      // Waive scope failure if explicitly covered by documented actual segment exception
      const scopeIdx = failedChecks.indexOf('scope');
      if (scopeIdx !== -1) {
        failedChecks.splice(scopeIdx, 1);
        checks.scope = true;
      }
    }
  }

  const allChecksPass = failedChecks.length === 0;

  if (!allChecksPass) {
    const isVerificationIssueOnly =
      failedChecks.includes('verificationStatus') &&
      !failedChecks.some((c) => c === 'valueValidity' || c === 'metricDefinition' || c === 'period' || c === 'periodType');

    return {
      status: isVerificationIssueOnly ? 'needs_review' : 'invalid',
      calculatedMargin,
      reportedMargin,
      difference,
      mathematicallyVerified: false,
      directMathematicalVerification: false,
      proxyLimitation: false,
      proxyScopeCompatibility: false,
      selectedObservationIds,
      selectedRuleId: matchingRule?.id,
      exceptionId: resolvedContext.kind === 'documented_actual_segment' ? resolvedContext.exception.id : undefined,
      proxyMappingId: undefined,
      reportedKpiId: resolvedContext.kind === 'documented_actual_segment' ? resolvedContext.reportedKpi?.id : undefined,
      failedChecks,
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
      mathematicallyVerified: false,
      directMathematicalVerification: false,
      proxyLimitation: false,
      proxyScopeCompatibility: false,
      selectedObservationIds,
      selectedRuleId: matchingRule?.id,
      exceptionId: resolvedContext.kind === 'documented_actual_segment' ? resolvedContext.exception.id : undefined,
      proxyMappingId: undefined,
      reportedKpiId: resolvedContext.kind === 'documented_actual_segment' ? resolvedContext.reportedKpi?.id : undefined,
      failedChecks: ['valueValidity'],
      checks: { ...checks, valueValidity: false },
      diagnostic: `Mathematical deviation of ${difference}%p exceeds 0.35%p threshold (reported: ${reportedMargin}%, calculated: ${calculatedMargin}%).`,
      reasons: ['Mathematical deviation exceeds 0.35%p tolerance.'],
    };
  }

  return {
    status: 'verified',
    calculatedMargin,
    reportedMargin,
    difference,
    mathematicallyVerified: true,
    directMathematicalVerification: true,
    proxyLimitation: false,
    proxyScopeCompatibility: false,
    selectedObservationIds,
    selectedRuleId: matchingRule?.id,
    exceptionId: resolvedContext.kind === 'documented_actual_segment' ? resolvedContext.exception.id : undefined,
    proxyMappingId: undefined,
    reportedKpiId: resolvedContext.kind === 'documented_actual_segment' ? resolvedContext.reportedKpi?.id : undefined,
    failedChecks: [],
    checks,
    diagnostic: `Margin verified under rule "${matchingRule?.name}". Calculated: ${calculatedMargin}%, Reported: ${reportedMargin}% (diff: ${difference}%p).`,
    reasons: ['Semantic margin triplet matched and verified within 0.35%p tolerance.'],
  };
}

/**
 * Maps a MarginValidationResult into a unified AuditFinding (P2).
 * Returns null if the triplet is clean verified.
 */
export function createAuditFindingFromMarginValidation(
  validation: MarginValidationResult,
  companyId: string,
  period: string,
  periodType?: string,
  optionsOrException?: DocumentedScopeException | MarginValidationOptions | MarginValidationContext | null
): AuditFinding | null {
  if (validation.status === 'verified') {
    return null;
  }

  const observationIds = Object.values(validation.selectedObservationIds).filter(Boolean) as string[];
  const item = `${companyId} (${period}${periodType ? `, ${periodType}` : ''})`;

  const context = resolveMarginValidationContext(optionsOrException);
  const selectedRuleId = validation.selectedRuleId;
  const exceptionId =
    validation.exceptionId ||
    (context.kind === 'documented_actual_segment'
      ? context.exception.id
      : context.kind === 'proxy_numerator'
      ? context.exception?.id
      : undefined);
  const proxyMappingId =
    validation.proxyMappingId ||
    (context.kind === 'proxy_numerator' ? context.mapping.id : undefined);
  const reportedKpiId =
    validation.reportedKpiId ||
    (context.kind === 'documented_actual_segment' || context.kind === 'proxy_numerator'
      ? context.reportedKpi?.id
      : undefined);

  if (validation.status === 'proxy_only') {
    const rationale =
      (context.kind === 'proxy_numerator' && context.exception?.rationale) ||
      (context.kind === 'proxy_numerator' && context.mapping.reason) ||
      validation.reasons.join('; ');
    const sourceDocIds: string[] | undefined =
      context.kind === 'proxy_numerator'
        ? (context.exception?.sourceDocIds ?? context.mapping.sourceDocIds)
        : undefined;

    return {
      severity: 'WARNING',
      disposition: 'review',
      category: 'SCOPE_MISMATCH',
      companyId,
      period,
      periodType,
      metricId: 'operating_margin',
      item,
      selectedRuleId,
      exceptionId,
      proxyMappingId,
      reportedKpiId,
      sourceDocIds,
      observationIds,
      failedChecks: validation.failedChecks,
      isProxy: true,
      claimVerificationState: validation.claimVerificationState ?? 'locator_only',
      mathematicallyVerified: false,
      detail: `[PROXY LIMITATION] Documented scope exception${exceptionId ? ` [${exceptionId}]` : ''}${proxyMappingId ? ` (proxy mapping [${proxyMappingId}])` : ''}: ${rationale} The headline margin KPI is officially documented by the OEM, but the available operating profit numerator is a consolidated group proxy. The margin is not independently verified mathematically. Human review or actual segment-level numerator data is required.`,
      documentationUrl: 'docs/data-audit-report.md',
    };
  }

  if (validation.status === 'invalid') {
    const isMathMismatch = validation.failedChecks.includes('valueValidity');
    return {
      severity: 'ERROR',
      disposition: 'blocking',
      category: isMathMismatch ? 'MATH_MISMATCH' : 'SCOPE_MISMATCH',
      companyId,
      period,
      periodType,
      metricId: 'operating_margin',
      item,
      selectedRuleId,
      exceptionId,
      proxyMappingId,
      reportedKpiId,
      observationIds,
      failedChecks: validation.failedChecks,
      mathematicallyVerified: false,
      detail: validation.diagnostic,
    };
  }

  if (validation.status === 'needs_review') {
    return {
      severity: 'WARNING',
      disposition: 'review',
      category: 'SCOPE_MISMATCH',
      companyId,
      period,
      periodType,
      metricId: 'operating_margin',
      item,
      selectedRuleId,
      exceptionId,
      proxyMappingId,
      reportedKpiId,
      observationIds,
      failedChecks: validation.failedChecks,
      mathematicallyVerified: false,
      detail: validation.diagnostic,
    };
  }

  if (validation.status === 'ambiguous') {
    return {
      severity: 'WARNING',
      disposition: 'blocking',
      category: 'AMBIGUOUS_SELECTION',
      companyId,
      period,
      periodType,
      metricId: 'operating_margin',
      item,
      selectedRuleId,
      exceptionId,
      proxyMappingId,
      reportedKpiId,
      observationIds,
      failedChecks: validation.failedChecks,
      mathematicallyVerified: false,
      detail: validation.diagnostic,
    };
  }

  return null;
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
