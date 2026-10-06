/**
 * Compatibility validation and point construction for Scatter Matrix Charts
 *
 * Enforces strict observation compatibility:
 * - Period and PeriodType alignment across EBIT, Margin, and Deliveries
 * - Unit contracts (currency_millions for EBIT, percentage for Margin)
 * - Supported currency verification
 * - Accounting basis & reporting scope compatibility
 * - Full preservation of loss-making entities (negative EBIT and negative margins)
 */

import { Company, MetricObservation, PeriodType } from '../types/metrics';
import {
  DOCUMENTED_SCOPE_EXCEPTIONS,
  findDocumentedScopeException,
  DocumentedScopeException,
} from '../data/scopeExceptions';
import { SOURCES_MAP } from '../data/sources';
import { FX_RATES_TO_KRW } from './currencyUtils';

export interface CompatibleScatterPoint {
  company: Company;
  volumeThousand: number;
  marginPercent: number;
  operatingIncome: number;
  revenue?: number | null;
  currency: string;
  period: string;
  periodType: PeriodType;
  isProxy?: boolean;
  proxyExceptionId?: string;
  reason?: string;
}

export interface CompatibilityValidationResult {
  valid: boolean;
  point?: CompatibleScatterPoint;
  reason?: string;
}

/**
 * Validates observation compatibility and builds a typed scatter point.
 * Preserves loss-making companies (negative EBIT / negative margin).
 */
export function validateScatterObservationCompatibility(
  company: Company,
  selectedPeriod: string,
  targetPeriodType: PeriodType,
  ebitObs?: MetricObservation | null,
  marginObs?: MetricObservation | null,
  volObs?: MetricObservation | null,
  revObs?: MetricObservation | null
): CompatibilityValidationResult {
  if (!ebitObs || ebitObs.value === null || ebitObs.value === undefined || !Number.isFinite(ebitObs.value)) {
    return { valid: false, reason: 'missing_or_invalid_ebit' };
  }

  if (!marginObs || marginObs.value === null || marginObs.value === undefined || !Number.isFinite(marginObs.value)) {
    return { valid: false, reason: 'missing_or_invalid_margin' };
  }

  // 1. Period match
  if (ebitObs.period !== selectedPeriod || marginObs.period !== selectedPeriod) {
    return { valid: false, reason: 'period_mismatch' };
  }
  if (volObs && volObs.period !== selectedPeriod) {
    return { valid: false, reason: 'volume_period_mismatch' };
  }

  // 2. Period type match
  if (ebitObs.periodType !== targetPeriodType || marginObs.periodType !== targetPeriodType) {
    return { valid: false, reason: 'period_type_mismatch' };
  }
  if (volObs && volObs.periodType !== targetPeriodType) {
    return { valid: false, reason: 'volume_period_type_mismatch' };
  }

  // 3. Unit contract enforcement
  let normalizedEbit = ebitObs.value;
  if (ebitObs.unit === 'currency_billions') {
    normalizedEbit = ebitObs.value * 1000;
  } else if (ebitObs.unit !== 'currency_millions') {
    return { valid: false, reason: `unsupported_ebit_unit: ${ebitObs.unit}` };
  }

  if (marginObs.unit !== 'percentage') {
    return { valid: false, reason: `unsupported_margin_unit: ${marginObs.unit}` };
  }

  let normalizedVol = 0;
  if (volObs && volObs.value !== null && Number.isFinite(volObs.value)) {
    const v = volObs.value;
    if (volObs.unit === 'thousand_units') {
      normalizedVol = v;
    } else if (volObs.unit === 'units') {
      normalizedVol = v / 1000;
    } else {
      return { valid: false, reason: `unsupported_volume_unit: ${volObs.unit}` };
    }
  }

  // 4. Currency verification
  const currency = (ebitObs.currency || company.reportingCurrency || '').toUpperCase();
  if (!currency) {
    return { valid: false, reason: 'missing_currency' };
  }
  if (!(currency in FX_RATES_TO_KRW)) {
    return { valid: false, reason: `unsupported_currency: ${currency}` };
  }

  // 5. Accounting basis and reporting scope compatibility
  let isProxy = false;
  let proxyExceptionId: string | undefined;
  let exceptionRationale: string | undefined;

  if (ebitObs.accountingBasis !== marginObs.accountingBasis || ebitObs.reportingScope !== marginObs.reportingScope) {
    if (!revObs) {
      return {
        valid: false,
        reason: 'missing_revenue_observation_for_scope_exception',
      };
    }

    const exceptionResult = resolveDocumentedScopeException({
      companyId: company.id,
      period: selectedPeriod,
      periodType: targetPeriodType,
      ebitObs,
      marginObs,
      revObs,
    });

    if (exceptionResult.matched) {
      isProxy = exceptionResult.isProxy ?? true;
      proxyExceptionId = exceptionResult.exceptionId;
      exceptionRationale = exceptionResult.rationale;
    } else {
      return {
        valid: false,
        reason: `incompatible_basis_or_scope: ebit(${ebitObs.reportingScope}/${ebitObs.accountingBasis}) vs margin(${marginObs.reportingScope}/${marginObs.accountingBasis})${
          exceptionResult.reason ? ` - ${exceptionResult.reason}` : ''
        }`,
      };
    }
  }

  return {
    valid: true,
    point: {
      company,
      volumeThousand: normalizedVol,
      marginPercent: marginObs.value,
      operatingIncome: normalizedEbit,
      revenue: revObs && Number.isFinite(revObs.value) ? revObs.value : null,
      currency,
      period: selectedPeriod,
      periodType: targetPeriodType,
      isProxy,
      proxyExceptionId,
      reason: exceptionRationale,
    },
  };
}

export interface ResolveScopeExceptionParams {
  companyId: string;
  period: string;
  periodType: PeriodType;
  ebitObs: MetricObservation;
  marginObs: MetricObservation;
  revObs?: MetricObservation | null;
  sources?: Record<string, any>;
  exceptions?: DocumentedScopeException[];
}

export interface ResolveScopeExceptionResult {
  matched: boolean;
  exceptionId?: string;
  isProxy?: boolean;
  rationale?: string;
  reason?: string;
}

/**
 * Resolves documented scope exception by strictly verifying all dimensions:
 * companyId, period, periodType, metric IDs, reporting scopes, accounting bases,
 * and authoritative source document registrations. Fail closed on any mismatch.
 */
export function resolveDocumentedScopeException({
  companyId,
  period,
  periodType,
  ebitObs,
  marginObs,
  revObs,
  sources = SOURCES_MAP,
  exceptions = DOCUMENTED_SCOPE_EXCEPTIONS,
}: ResolveScopeExceptionParams): ResolveScopeExceptionResult {
  // Fail closed if required observations or fields are missing/empty
  if (!companyId || !period || !periodType || !ebitObs || !marginObs) {
    return {
      matched: false,
      reason: 'missing_required_exception_parameters',
    };
  }

  // Derive candidate exception targets matching company and period
  const matchingCandidates = exceptions.filter(
    (e) => e.companyId === companyId && (e.period === undefined || e.period === period)
  );

  if (matchingCandidates.length === 0) {
    return {
      matched: false,
      reason: `no_documented_exception: ${companyId} / ${period}`,
    };
  }

  // Find candidate exception that matches the specific numerator and margin metric IDs
  const matchingCandidate = matchingCandidates.find(
    (e) => e.numeratorMetricId === ebitObs.metricId && e.marginMetricId === marginObs.metricId
  );

  const denominatorMetricId = matchingCandidate?.denominatorMetricId || revObs?.metricId || 'revenue';
  const denominatorScope = revObs?.reportingScope || matchingCandidate?.denominatorScope;
  const denominatorBasis = revObs?.accountingBasis || matchingCandidate?.denominatorBasis;

  const observationContext = {
    numeratorSourceDocId: ebitObs.sourceDocId,
    marginSourceDocId: marginObs.sourceDocId,
    revenueSourceDocId: revObs?.sourceDocId,
    periodType,
  };

  const validationResult = findDocumentedScopeException(
    companyId,
    period,
    marginObs.metricId,
    ebitObs.metricId,
    denominatorMetricId,
    ebitObs.reportingScope,
    denominatorScope,
    marginObs.reportingScope,
    ebitObs.accountingBasis,
    denominatorBasis,
    marginObs.accountingBasis,
    sources,
    exceptions,
    observationContext
  );

  if (validationResult.matched) {
    return {
      matched: true,
      exceptionId: validationResult.exceptionId,
      isProxy: validationResult.isProxy,
      rationale: validationResult.rationale,
    };
  }

  return {
    matched: false,
    reason: validationResult.rejectionReasons?.join('; ') || 'scope_exception_validation_failed',
  };
}
