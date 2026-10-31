/**
 * AutoMetrics Intelligence — Performance Claim Audit Engine (v3.2)
 *
 * Production module for auditing structured performance-driver claims:
 * - Fail-closed YoY and QoQ growth rate recalculation with unified dimensional compatibility
 * - Arithmetic percentage-point difference validation for share/margin metrics
 * - Multi-tiered verification classification:
 *     metadata_validated | locator_validated | evidence_validated |
 *     observation_consistent | numeric_claim_verified | live_source_verified | unverified
 * - Rigorous live-source pipeline result validation (eliminates caller-controlled boolean trust)
 * - Source document metadata, locator validity, and content fixture verification
 * - Bilingual (Korean/English) narrative reference resolution and dimensional consistency
 */

import {
  MetricObservation,
  SourceDocument,
  OfficialSourcePipelineResult,
  ClaimVerifiedResult,
  ClaimEvidenceLocator,
} from '../types/metrics';
import {
  StructuredPerformanceClaim,
  CompanyPerformanceDriver,
  PerformanceDriverItem,
} from '../data/performanceDrivers';
import { METRIC_OBSERVATIONS, OFFICIAL_COMPARISON_OBSERVATIONS } from '../data/observations';
import { SOURCES_MAP } from '../data/sources';
import {
  DETERMINISTIC_SOURCE_CONTENT_FIXTURES,
  SourceDocumentContentSnippet,
  validateClaimVerificationResult,
} from '../data/scopeExceptions';
import { METRICS_MAP } from '../data/metricDefinitions';
import { isUrlInOfficialDomain, OFFICIAL_IR_SOURCES_MAP } from '../data/officialSources';
import { computeRawByteSha256 } from './cryptoUtils';

export type ClaimVerificationLevel =
  | 'metadata_validated'
  | 'locator_validated'
  | 'evidence_validated'
  | 'observation_consistent'
  | 'numeric_claim_verified'
  | 'live_source_verified'
  | 'unverified';

export interface PerformanceClaimAuditFinding {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  disposition: 'blocking' | 'review' | 'documented' | 'informational';
  category: 'SOURCE_CLAIM_INTEGRITY' | 'SCOPE_MISMATCH' | 'CALCULATION_DISCREPANCY' | 'PERIOD_ALIGNMENT';
  item: string;
  detail: string;
  claimId?: string;
  metricId?: string;
  companyId?: string;
  period?: string;
}

export interface ValidatePerformanceClaimOptions {
  observations?: MetricObservation[];
  sourcesMap?: Record<string, SourceDocument>;
  contentFixtures?: Partial<SourceDocumentContentSnippet>[];
  toleranceYoY?: number; // default: 0.25 (%)
  toleranceQoQ?: number; // default: 0.25 (%)
  tolerancePercentagePoints?: number; // default: 0.05 (%p)
  /**
   * @deprecated Boolean flag alone cannot establish live verification.
   * Genuinely verified live evidence must be passed via `livePipelineResult`.
   */
  isLiveSource?: boolean;
  /**
   * Authentic result produced by executeOfficialSourcePipeline / verifyOfficialSourceClaim.
   */
  livePipelineResult?: OfficialSourcePipelineResult;
  /**
   * Authentic claim verification result produced by the claim verification engine.
   */
  claimVerificationResult?: ClaimVerifiedResult;
}

export interface StructuredPerformanceClaimAuditResult {
  claimId: string;
  isValid: boolean;
  verificationLevel: ClaimVerificationLevel;
  findings: PerformanceClaimAuditFinding[];
  recalculatedGrowthYoY?: number | null;
  recalculatedGrowthQoQ?: number | null;
  recalculatedChangePp?: number | null;
  matchedObservationId?: string;
  comparisonObservationId?: string;
  comparisonObservationQoQId?: string;
  evidenceSource: 'deterministic_fixture' | 'live_pipeline' | 'metadata_only' | 'unverified';
}

/**
 * Returns default observations array combining standard core observations
 * and official comparative baseline observations from primary filings.
 */
export function getDefaultAuditObservations(): MetricObservation[] {
  return [...METRIC_OBSERVATIONS, ...OFFICIAL_COMPARISON_OBSERVATIONS];
}

/**
 * Calculates the expected prior-year period (for YoY) or preceding quarter (for QoQ).
 * Returns null if cadence is invalid or period format cannot be parsed.
 */
export function getExpectedPriorPeriod(period: string, cadence: 'YoY' | 'QoQ'): string | null {
  const qMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (qMatch) {
    const year = parseInt(qMatch[1], 10);
    const quarter = parseInt(qMatch[2], 10);
    if (cadence === 'YoY') {
      return `${year - 1}-Q${quarter}`;
    } else {
      if (quarter === 1) {
        return `${year - 1}-Q4`;
      } else {
        return `${year}-Q${quarter - 1}`;
      }
    }
  }
  const fyMatch = period.match(/^(\d{4})-FY$/);
  if (fyMatch) {
    const year = parseInt(fyMatch[1], 10);
    if (cadence === 'YoY') {
      return `${year - 1}-FY`;
    }
    return null; // QoQ is undefined for annual disclosures
  }
  return null;
}

/**
 * Compares two numbers with unit-aware precision/tolerance rules.
 */
export function matchNumericValues(expected: number, actual: number, unit?: string): boolean {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
    return false;
  }
  if (unit === 'percentage') {
    return Math.abs(expected - actual) <= 0.05;
  }
  if (unit === 'units') {
    return Math.abs(expected - actual) <= 1;
  }
  return Math.abs(expected - actual) <= 0.01;
}

/**
 * Extracts percentage numbers from narrative text (e.g., "-11.3%", "+3.8% YoY", "2.7%p").
 */
function extractPercentages(text: string): number[] {
  const matches = text.match(/[+-]?\d+(?:\.\d+)?(?=\s*%(?:p)?)/g);
  if (!matches) return [];
  return matches.map((m) => parseFloat(m)).filter((n) => Number.isFinite(n));
}

/**
 * Shared comparison observation resolution & dimensional compatibility validator (P2).
 * Unifies YoY growth, QoQ growth, and percentage-point difference checks.
 */
interface UnifiedComparisonValidationResult {
  valid: boolean;
  priorObs?: MetricObservation;
  comparisonObservationId?: string;
  calculatedDiffOrGrowth?: number;
  findings: PerformanceClaimAuditFinding[];
}

function resolveAndValidateComparisonObservation(
  claim: StructuredPerformanceClaim,
  driver: CompanyPerformanceDriver,
  matchingObs: MetricObservation | undefined,
  observations: MetricObservation[],
  calculationType: 'YoY_growth' | 'QoQ_growth' | 'percentage_points',
  tolerance: number,
  claimItem: string
): UnifiedComparisonValidationResult {
  const findings: PerformanceClaimAuditFinding[] = [];

  // 1. Determine expected & target comparison period
  let targetPeriod: string | undefined;
  if (calculationType === 'YoY_growth' || calculationType === 'percentage_points') {
    const expectedYoY = getExpectedPriorPeriod(driver.period, 'YoY');
    if (!claim.comparisonPeriod || claim.comparisonPeriod.trim() === '') {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail:
          calculationType === 'percentage_points'
            ? `Claim specifies changeYoYPercentagePoints (${claim.changeYoYPercentagePoints}%p) but lacks comparisonPeriod.`
            : `Claim specifies growthRateYoY (${claim.growthRateYoY}%) but lacks comparisonPeriod.`,
        claimId: claim.claimId,
      });
      return { valid: false, findings };
    }
    if (expectedYoY && claim.comparisonPeriod !== expectedYoY) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'PERIOD_ALIGNMENT',
        item: claimItem,
        detail: `Claim comparisonPeriod '${claim.comparisonPeriod}' is not the prior-year period for '${driver.period}' (expected '${expectedYoY}').`,
        claimId: claim.claimId,
      });
    }
    targetPeriod = claim.comparisonPeriod;
  } else if (calculationType === 'QoQ_growth') {
    const expectedQoQ = getExpectedPriorPeriod(driver.period, 'QoQ');
    targetPeriod = claim.comparisonPeriodQoQ || (expectedQoQ ?? undefined);
    if (!targetPeriod) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'PERIOD_ALIGNMENT',
        item: claimItem,
        detail: `QoQ growth rate cannot be calculated for non-quarterly period '${driver.period}'.`,
        claimId: claim.claimId,
      });
      return { valid: false, findings };
    }
    if (claim.comparisonPeriodQoQ && expectedQoQ && claim.comparisonPeriodQoQ !== expectedQoQ) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'PERIOD_ALIGNMENT',
        item: claimItem,
        detail: `Claim comparisonPeriodQoQ '${claim.comparisonPeriodQoQ}' is not the preceding comparable quarter for '${driver.period}' (expected '${expectedQoQ}').`,
        claimId: claim.claimId,
      });
    }
  }

  // 2. Validate current observation existence and finiteness
  if (!matchingObs || matchingObs.value == null || !Number.isFinite(matchingObs.value)) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'CALCULATION_DISCREPANCY',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: current observation missing or invalid for metric '${claim.metricId}' in ${driver.period}.`,
      claimId: claim.claimId,
    });
    return { valid: false, findings };
  }

  // 3. Resolve prior-period observation candidates
  let priorCandidates = observations.filter(
    (o) => o.companyId === driver.companyId && o.period === targetPeriod && o.metricId === claim.metricId
  );

  if (priorCandidates.length > 1 && claim.reportingScope) {
    const scoped = priorCandidates.filter((o) => o.reportingScope === claim.reportingScope);
    if (scoped.length > 0) priorCandidates = scoped;
  }
  if (priorCandidates.length > 1 && claim.accountingBasis) {
    const based = priorCandidates.filter((o) => o.accountingBasis === claim.accountingBasis);
    if (based.length > 0) priorCandidates = based;
  }
  if (priorCandidates.length > 1 && matchingObs.periodType) {
    const typed = priorCandidates.filter((o) => o.periodType === matchingObs.periodType);
    if (typed.length > 0) priorCandidates = typed;
  }

  if (priorCandidates.length === 0) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'CALCULATION_DISCREPANCY',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: comparison observation missing for metric '${claim.metricId}' in ${targetPeriod}.`,
      claimId: claim.claimId,
    });
    return { valid: false, findings };
  }

  if (priorCandidates.length > 1) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'CALCULATION_DISCREPANCY',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: ambiguous comparison observations (${priorCandidates.length}) found for metric '${claim.metricId}' in ${targetPeriod}.`,
      claimId: claim.claimId,
    });
    return { valid: false, findings };
  }

  const priorObs = priorCandidates[0];
  const comparisonObservationId = priorObs.id;

  // 4. Validate prior value finiteness
  if (priorObs.value == null || !Number.isFinite(priorObs.value)) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'CALCULATION_DISCREPANCY',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: comparison observation value is missing or non-finite for metric '${claim.metricId}' in ${targetPeriod}.`,
      claimId: claim.claimId,
    });
    return { valid: false, priorObs, comparisonObservationId, findings };
  }

  // 5. Shared Dimensional Compatibility Checks
  if (priorObs.companyId !== driver.companyId) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: companyId mismatch between comparison (${priorObs.companyId}) and current (${driver.companyId}).`,
      claimId: claim.claimId,
    });
  }

  if (priorObs.metricId !== claim.metricId) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: metricId mismatch between comparison (${priorObs.metricId}) and current (${claim.metricId}).`,
      claimId: claim.claimId,
    });
  }

  // Period type comparability (quarterly vs annual)
  if (priorObs.periodType !== matchingObs.periodType) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'PERIOD_ALIGNMENT',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: incompatible periodType between comparison (${priorObs.periodType}) and current (${matchingObs.periodType}).`,
      claimId: claim.claimId,
    });
  }

  if (priorObs.isComparable === false) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'CALCULATION_DISCREPANCY',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: comparison observation ${priorObs.id} is flagged as non-comparable.`,
      claimId: claim.claimId,
    });
  }

  // Unit compatibility
  const currUnit = matchingObs.unit ?? claim.unit;
  if (priorObs.unit !== currUnit) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: unit mismatch between comparison (${priorObs.unit}) and current (${currUnit}).`,
      claimId: claim.claimId,
    });
  }

  if (calculationType === 'percentage_points') {
    if (priorObs.unit !== 'percentage' || currUnit !== 'percentage') {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Cannot validate percentage point change: unit must be 'percentage' (got comparison: ${priorObs.unit}, current: ${currUnit}).`,
        claimId: claim.claimId,
      });
    }
  }

  // Currency compatibility
  const currCurr = matchingObs.currency ?? claim.currency;
  if (priorObs.currency && currCurr && priorObs.currency !== currCurr) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: currency mismatch between comparison (${priorObs.currency}) and current (${currCurr}).`,
      claimId: claim.claimId,
    });
  }

  // Reporting scope compatibility
  const targetScope = claim.reportingScope ?? matchingObs.reportingScope;
  if (priorObs.reportingScope && targetScope && priorObs.reportingScope !== targetScope) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: reportingScope mismatch between comparison (${priorObs.reportingScope}) and current (${targetScope}).`,
      claimId: claim.claimId,
    });
  }

  // Accounting basis compatibility
  const targetBasis = claim.accountingBasis ?? matchingObs.accountingBasis;
  if (priorObs.accountingBasis && targetBasis && priorObs.accountingBasis !== targetBasis) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: claimItem,
      detail: `Cannot validate ${calculationType}: accountingBasis mismatch between comparison (${priorObs.accountingBasis}) and current (${targetBasis}).`,
      claimId: claim.claimId,
    });
  }

  // If dimensional checks failed, fail closed and do not perform arithmetic
  if (findings.some((f) => f.disposition === 'blocking')) {
    return { valid: false, priorObs, comparisonObservationId, findings };
  }

  // 6. Arithmetic Calculations & Tolerance Checks
  if (calculationType === 'YoY_growth' || calculationType === 'QoQ_growth') {
    if (priorObs.value === 0) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'CALCULATION_DISCREPANCY',
        item: claimItem,
        detail: `Prior period value is zero; ${calculationType === 'QoQ_growth' ? 'QoQ ' : ''}percentage growth rate cannot be computed.`,
        claimId: claim.claimId,
      });
      return { valid: false, priorObs, comparisonObservationId, findings };
    }

    const calculatedGrowth = ((matchingObs.value - priorObs.value) / Math.abs(priorObs.value)) * 100;
    if (!Number.isFinite(calculatedGrowth)) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'CALCULATION_DISCREPANCY',
        item: claimItem,
        detail: `Calculated growth rate is non-finite (${calculatedGrowth}).`,
        claimId: claim.claimId,
      });
      return { valid: false, priorObs, comparisonObservationId, findings };
    }

    const targetClaimedRate = calculationType === 'QoQ_growth' ? claim.growthRateQoQ : claim.growthRateYoY;
    if (targetClaimedRate !== undefined) {
      if (!Number.isFinite(targetClaimedRate)) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: `Claimed ${calculationType} (${targetClaimedRate}) must be a finite number.`,
          claimId: claim.claimId,
        });
        return { valid: false, priorObs, comparisonObservationId, findings };
      }
      const diff = Math.abs(calculatedGrowth - targetClaimedRate);
      if (diff > tolerance) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail:
            calculationType === 'QoQ_growth'
              ? `Claimed QoQ growth rate (${targetClaimedRate}%) diverges from calculated QoQ growth rate (${calculatedGrowth.toFixed(2)}%) between ${targetPeriod} (${priorObs.value}) and ${driver.period} (${matchingObs.value}).`
              : `Claimed YoY growth rate (${targetClaimedRate}%) diverges from calculated growth rate (${calculatedGrowth.toFixed(2)}%) between ${targetPeriod} (${priorObs.value}) and ${driver.period} (${matchingObs.value}).`,
          claimId: claim.claimId,
        });
      }
    }

    return {
      valid: findings.length === 0,
      priorObs,
      comparisonObservationId,
      calculatedDiffOrGrowth: calculatedGrowth,
      findings,
    };
  } else {
    // percentage_points
    const calculatedDiff = matchingObs.value - priorObs.value;
    if (!Number.isFinite(calculatedDiff)) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'CALCULATION_DISCREPANCY',
        item: claimItem,
        detail: `Calculated percentage point change is non-finite (${calculatedDiff}).`,
        claimId: claim.claimId,
      });
      return { valid: false, priorObs, comparisonObservationId, findings };
    }

    if (claim.changeYoYPercentagePoints !== undefined) {
      if (!Number.isFinite(claim.changeYoYPercentagePoints)) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: `Claimed percentage point change (${claim.changeYoYPercentagePoints}%p) must be a finite number.`,
          claimId: claim.claimId,
        });
        return { valid: false, priorObs, comparisonObservationId, findings };
      }
      const diff = Math.abs(calculatedDiff - claim.changeYoYPercentagePoints);
      if (diff > tolerance) {
        const pctGrowth = priorObs.value !== 0
          ? ((matchingObs.value - priorObs.value) / Math.abs(priorObs.value)) * 100
          : undefined;
        const isPctGrowthMatch = pctGrowth !== undefined && Math.abs(pctGrowth - claim.changeYoYPercentagePoints) <= tolerance;

        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: isPctGrowthMatch
            ? `Claimed percentage point change (${claim.changeYoYPercentagePoints}%p) appears to be a percentage change (${pctGrowth.toFixed(2)}%), not percentage points (${calculatedDiff.toFixed(2)}%p) between ${targetPeriod} (${priorObs.value}) and ${driver.period} (${matchingObs.value}).`
            : `Claimed percentage point change (${claim.changeYoYPercentagePoints}%p) diverges from calculated change (${calculatedDiff.toFixed(2)}%p) between ${targetPeriod} (${priorObs.value}) and ${driver.period} (${matchingObs.value}).`,
          claimId: claim.claimId,
        });
      }
    }

    return {
      valid: findings.length === 0,
      priorObs,
      comparisonObservationId,
      calculatedDiffOrGrowth: calculatedDiff,
      findings,
    };
  }
}

/**
 * Validates a live official source pipeline result against a performance claim (P1).
 * Replaces caller-controlled boolean trust with an authentic verification check.
 */
function validateLivePipelineVerification(
  claim: StructuredPerformanceClaim,
  driver: CompanyPerformanceDriver,
  options: ValidatePerformanceClaimOptions | undefined,
  sourcesMap: Record<string, SourceDocument>
): { valid: boolean; failureReasons: string[] } {
  const liveResult = options?.livePipelineResult;
  if (!liveResult) {
    return {
      valid: false,
      failureReasons: ['No validated live pipeline result provided (isLiveSource boolean alone cannot establish live verification)'],
    };
  }

  const failureReasons: string[] = [];

  // 1. Pipeline execution status
  if (!liveResult.success) {
    failureReasons.push(`Live pipeline execution failed: ${liveResult.errorMessage || liveResult.errorCode || 'unsuccessful'}`);
  }
  if (liveResult.verificationState !== 'claim_verified') {
    failureReasons.push(`Verification state is '${liveResult.verificationState}', expected 'claim_verified'`);
  }

  // 1b. Cryptographic raw-byte authenticity gate (P1-A, P1-B)
  // Validation MUST be strictly bound to actual downloaded wire bytes, not caller-supplied strings
  const rawBytes = liveResult.rawBytes;
  if (!rawBytes || !(rawBytes instanceof Uint8Array || Buffer.isBuffer(rawBytes)) || rawBytes.byteLength === 0) {
    failureReasons.push('Actual downloaded source wire bytes (rawBytes) missing or empty in live pipeline result; cryptographic source authenticity cannot be established');
  }

  const computedRawHash = rawBytes && rawBytes.byteLength > 0
    ? computeRawByteSha256(rawBytes)
    : undefined;

  // 2. Official source identity & allowlist binding
  if (!liveResult.officialSource) {
    failureReasons.push('Official source definition missing from live pipeline result');
  } else {
    if (claim.sourceDocId && liveResult.officialSource.id !== claim.sourceDocId) {
      failureReasons.push(`Source document ID mismatch: pipeline is for '${liveResult.officialSource.id}', claim cites '${claim.sourceDocId}'`);
    }
    if (liveResult.officialSource.companyId !== driver.companyId) {
      failureReasons.push(`Company mismatch: pipeline source is '${liveResult.officialSource.companyId}', claim company is '${driver.companyId}'`);
    }
    if (!OFFICIAL_IR_SOURCES_MAP.has(liveResult.officialSource.id) && !sourcesMap[liveResult.officialSource.id]) {
      failureReasons.push(`Official source '${liveResult.officialSource.id}' is not in approved official source registry`);
    }
    const targetPeriod = claim.period || driver.period;
    if (liveResult.officialSource.reportingPeriod && targetPeriod && liveResult.officialSource.reportingPeriod !== targetPeriod) {
      failureReasons.push(`Official source reporting period '${liveResult.officialSource.reportingPeriod}' does not match claim/driver period '${targetPeriod}'`);
    }
  }

  // 3. Live document transport & URL allowlist check
  const liveDoc = liveResult.liveDocument;
  if (!liveDoc) {
    failureReasons.push('Live source document record missing from pipeline result');
  } else {
    if (liveDoc.httpStatus !== 200) {
      failureReasons.push(`HTTP status was ${liveDoc.httpStatus}, expected 200`);
    }
    if (liveDoc.contentType !== 'application/pdf' && !liveDoc.contentType.includes('text/html')) {
      failureReasons.push(`Unsupported or unverified Content-Type: '${liveDoc.contentType}'`);
    }
    if (liveResult.officialSource?.officialDomain) {
      if (!isUrlInOfficialDomain(liveDoc.url, liveResult.officialSource.officialDomain)) {
        failureReasons.push(`Disallowed initial URL: '${liveDoc.url}' is outside official domain perimeter`);
      }
      if (!isUrlInOfficialDomain(liveDoc.finalUrl, liveResult.officialSource.officialDomain)) {
        failureReasons.push(`Disallowed final URL: '${liveDoc.finalUrl}' is outside official domain perimeter`);
      }
    }
    if (!/^[0-9a-f]{64}$/.test(liveDoc.contentHash)) {
      failureReasons.push(`Invalid raw-byte contentHash format: '${liveDoc.contentHash}'`);
    }
    if (computedRawHash && liveDoc.contentHash !== computedRawHash) {
      failureReasons.push(`Cryptographic raw byte hash mismatch: calculated SHA-256 '${computedRawHash}' does not match live document contentHash '${liveDoc.contentHash}'`);
    }
  }

  // 4. Extracted document & block resolution
  const extractedDoc = liveResult.extractedDocument;
  const verResult =
    liveResult.claimVerificationResult && liveResult.claimVerificationResult.state === 'claim_verified'
      ? (liveResult.claimVerificationResult as ClaimVerifiedResult)
      : undefined;

  if (!extractedDoc) {
    failureReasons.push('Extracted live document missing from pipeline result');
  } else {
    if (!extractedDoc.extractionVersion || extractedDoc.extractionVersion.trim() === '') {
      failureReasons.push('Extraction version missing from extracted live document');
    }
    if (computedRawHash && extractedDoc.sourceDocument?.contentHash && extractedDoc.sourceDocument.contentHash !== computedRawHash) {
      failureReasons.push(`Extracted document contentHash '${extractedDoc.sourceDocument.contentHash}' does not match calculated raw byte hash '${computedRawHash}'`);
    }
    const blockId = verResult?.blockId ?? liveResult.evidenceCandidate?.blockId;
    if (!blockId) {
      failureReasons.push('Evidence block ID missing from live verification candidate');
    } else {
      const matchingBlock = extractedDoc.blocks?.find((b) => b.id === blockId);
      if (!matchingBlock) {
        failureReasons.push(`Evidence block '${blockId}' could not be resolved in extracted document blocks`);
      } else {
        const blockText = matchingBlock.text || (matchingBlock as any).content || '';
        const claimValueStr = String(claim.value);
        const hasValueInText = blockText.includes(claimValueStr);
        const hasValueInCells = matchingBlock.cells?.some((c) => c.includes(claimValueStr));
        const hasValueInNumerics = (matchingBlock as any).numericValues?.some((v: number) => matchNumericValues(claim.value, v, claim.unit));
        if (!hasValueInText && !hasValueInCells && !hasValueInNumerics) {
          failureReasons.push(`Evidence block '${blockId}' text does not contain or support claimed value ${claim.value}`);
        }
      }
    }
  }

  // 5. Claim semantic and dimensional binding
  const cand = liveResult.evidenceCandidate;

  const verifiedMetric = verResult?.verifiedMetricId ?? cand?.metricId;
  if (verifiedMetric && verifiedMetric !== claim.metricId) {
    failureReasons.push(`Evidence metric '${verifiedMetric}' does not match claim metric '${claim.metricId}'`);
  }

  const verifiedNum = verResult?.verifiedNumericValue ?? cand?.numericValue;
  if (verifiedNum === undefined || verifiedNum === null) {
    failureReasons.push('Verified numeric value missing from live verification result');
  } else if (!matchNumericValues(claim.value, verifiedNum, claim.unit)) {
    failureReasons.push(`Verified numeric value (${verifiedNum}) contradicts claimed value (${claim.value})`);
  }

  const verifiedUnit = verResult?.verifiedUnit ?? cand?.unit;
  if (claim.unit && verifiedUnit && verifiedUnit !== claim.unit) {
    failureReasons.push(`Verified unit '${verifiedUnit}' does not match claimed unit '${claim.unit}'`);
  }

  const verifiedScope = verResult?.verifiedScope ?? cand?.scope;
  if (claim.reportingScope && verifiedScope && verifiedScope !== claim.reportingScope) {
    failureReasons.push(`Verified scope '${verifiedScope}' does not match claimed scope '${claim.reportingScope}'`);
  }

  const verifiedBasis = verResult?.verifiedAccountingBasis ?? cand?.accountingBasis;
  if (claim.accountingBasis && verifiedBasis && verifiedBasis !== claim.accountingBasis) {
    failureReasons.push(`Verified accounting basis '${verifiedBasis}' does not match claimed basis '${claim.accountingBasis}'`);
  }

  const targetPeriod = claim.period || driver.period;
  const verifiedPeriod = verResult?.verifiedPeriod ?? cand?.period;
  if (verifiedPeriod && targetPeriod && verifiedPeriod !== targetPeriod) {
    failureReasons.push(`Verified period '${verifiedPeriod}' does not match claim/driver period '${targetPeriod}'`);
  }

  // 6. Cryptographic Content Hash Binding & Anti-Forgery Check
  if (verResult && liveDoc) {
    if (verResult.sourceContentHash !== liveDoc.contentHash) {
      failureReasons.push(`Cryptographic content hash mismatch: result hash '${verResult.sourceContentHash}' does not match wire hash '${liveDoc.contentHash}'`);
    }
    if (computedRawHash && verResult.sourceContentHash !== computedRawHash) {
      failureReasons.push(`Cryptographic content hash mismatch: result hash '${verResult.sourceContentHash}' does not match wire byte hash '${computedRawHash}'`);
    }
    if (claim.sourceDocId && verResult.sourceDocId && verResult.sourceDocId !== claim.sourceDocId) {
      failureReasons.push(`Source document ID mismatch: verification result sourceDocId '${verResult.sourceDocId}' does not match claim sourceDocId '${claim.sourceDocId}'`);
    }
  }

  // 7. Validate through existing production claim verification gate
  if (verResult && liveResult.officialSource) {
    const claimLocator: ClaimEvidenceLocator = {
      sourceDocId: liveResult.officialSource.id,
      claimedValue: String(claim.value),
      claimedMetricId: claim.metricId,
      claimedNumericValue: claim.value,
      claimedUnit: claim.unit as any,
      claimedScope: claim.reportingScope as any,
      claimedAccountingBasis: claim.accountingBasis as any,
      claimedPeriod: targetPeriod,
    };
    const targetSourceDoc: SourceDocument = sourcesMap[liveResult.officialSource.id] || {
      id: liveResult.officialSource.id,
      companyId: liveResult.officialSource.companyId,
      title: liveResult.officialSource.title,
      docType: liveResult.officialSource.documentType,
      period: liveResult.officialSource.reportingPeriod,
      periodType: liveResult.officialSource.periodType,
      publicationDate: '2026-07-31',
      officialUrl: liveResult.officialSource.url,
      isVerified: true,
      verificationStatus: 'verified',
      lastChecked: '2026-07-31',
    };

    const valResult = validateClaimVerificationResult(
      claimLocator,
      targetSourceDoc,
      String(claim.value),
      verResult,
      'reported_kpi',
      {
        expectedOrigin: 'live_source',
        expectedContentHash: liveDoc?.contentHash,
        extractedLiveDocument: extractedDoc,
        requireBlockBinding: true,
      }
    );

    if (!valResult.valid) {
      failureReasons.push(...valResult.mismatches);
    }
  }

  return {
    valid: failureReasons.length === 0,
    failureReasons,
  };
}

/**
 * Audits a single structured performance claim and returns a comprehensive structured audit result.
 */
export function auditStructuredPerformanceClaim(
  claim: StructuredPerformanceClaim,
  driver: CompanyPerformanceDriver,
  options?: ValidatePerformanceClaimOptions
): StructuredPerformanceClaimAuditResult {
  const findings: PerformanceClaimAuditFinding[] = [];

  const observations = options?.observations ?? getDefaultAuditObservations();
  const sourcesMap = options?.sourcesMap ?? SOURCES_MAP;
  const contentFixtures = options?.contentFixtures ?? DETERMINISTIC_SOURCE_CONTENT_FIXTURES;
  const toleranceYoY = options?.toleranceYoY ?? 0.25;
  const toleranceQoQ = options?.toleranceQoQ ?? 0.25;
  const tolerancePercentagePoints = options?.tolerancePercentagePoints ?? 0.05;

  let recalculatedGrowthYoY: number | null = null;
  let recalculatedGrowthQoQ: number | null = null;
  let recalculatedChangePp: number | null = null;
  let matchedObservationId: string | undefined;
  let comparisonObservationId: string | undefined;
  let comparisonObservationQoQId: string | undefined;
  let evidenceSource: 'deterministic_fixture' | 'live_pipeline' | 'metadata_only' | 'unverified' = 'metadata_only';

  let hasResolvedLocator = false;
  let hasResolvedEvidenceText = false;
  let hasAuthoritativeSourceEvidence = false;

  const claimItem = `PerformanceClaim: ${claim.claimId || `${driver.companyId}-${driver.period}-${claim.metricId}`}`;

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Base Identifiers and Scope Alignment
  // ────────────────────────────────────────────────────────────────────────────
  if (!claim.claimId || claim.claimId.trim() === '') {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: 'Structured claim missing required claimId.',
      claimId: claim.claimId,
      companyId: driver.companyId,
      period: driver.period,
    });
  }

  if (claim.companyId && claim.companyId !== driver.companyId) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: claimItem,
      detail: `Claim companyId '${claim.companyId}' does not match driver companyId '${driver.companyId}'.`,
      claimId: claim.claimId,
      companyId: claim.companyId,
      period: claim.period,
    });
  }

  if (claim.period && claim.period !== driver.period) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'PERIOD_ALIGNMENT',
      item: claimItem,
      detail: `Claim period '${claim.period}' does not match driver period '${driver.period}'.`,
      claimId: claim.claimId,
      companyId: claim.companyId,
      period: claim.period,
    });
  }

  if (!claim.metricId || claim.metricId.trim() === '') {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: `Claim '${claim.claimId}' missing required metricId.`,
      claimId: claim.claimId,
    });
  } else if (claim.claimCategory === 'primary_observation' && !METRICS_MAP[claim.metricId]) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: `Claim metricId '${claim.metricId}' is not registered in METRIC_DEFINITIONS.`,
      claimId: claim.claimId,
    });
  }

  if (typeof claim.value !== 'number' || !Number.isFinite(claim.value)) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: `Claim '${claim.claimId}' has invalid non-numeric value: ${claim.value}.`,
      claimId: claim.claimId,
    });
  }

  if (!claim.unit) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: `Claim '${claim.claimId}' missing required unit.`,
      claimId: claim.claimId,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Source Document Integrity & Period Alignment
  // ────────────────────────────────────────────────────────────────────────────
  let claimDoc: SourceDocument | undefined;
  if (!claim.sourceDocId || claim.sourceDocId.trim() === '') {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: `Claim '${claim.claimId}' lacks required sourceDocId.`,
      claimId: claim.claimId,
    });
  } else {
    claimDoc = sourcesMap[claim.sourceDocId];
    if (!claimDoc) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `SourceDocId '${claim.sourceDocId}' does not exist in SOURCES_MAP.`,
        claimId: claim.claimId,
      });
    } else {
      if (claimDoc.companyId !== driver.companyId) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SCOPE_MISMATCH',
          item: claimItem,
          detail: `SourceDoc companyId '${claimDoc.companyId}' does not match claim companyId '${driver.companyId}'.`,
          claimId: claim.claimId,
        });
      }
      if (claimDoc.period !== driver.period) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'PERIOD_ALIGNMENT',
          item: claimItem,
          detail: `SourceDoc period '${claimDoc.period}' does not match claim period '${driver.period}'.`,
          claimId: claim.claimId,
        });
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Source Locator & Evidence Validation Against Available Content Fixtures
  // ────────────────────────────────────────────────────────────────────────────
  if (!claim.sourceLocator || claim.sourceLocator.trim() === '') {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: 'Structured claim lacks required sourceLocator.',
      claimId: claim.claimId,
    });
  } else if (contentFixtures && contentFixtures.length > 0 && claim.sourceDocId) {
    const docFixtures = contentFixtures.filter((f) => f.sourceDocId === claim.sourceDocId);
    if (docFixtures.length > 0) {
      const targetPeriod = claim.period || driver.period;
      const targetPeriodType = claim.periodType || 'quarterly';

      // Direct numeric contradiction check in available fixtures (matching target period)
      const metricFixture = docFixtures.find(
        (f) =>
          f.verifiedMetricId === claim.metricId &&
          (!f.verifiedPeriod || f.verifiedPeriod === targetPeriod) &&
          (!f.verifiedPeriodType || f.verifiedPeriodType === targetPeriodType) &&
          f.verifiedNumericValue !== undefined &&
          Number.isFinite(f.verifiedNumericValue)
      );
      if (
        metricFixture &&
        metricFixture.verifiedNumericValue !== undefined &&
        !matchNumericValues(claim.value, metricFixture.verifiedNumericValue, claim.unit)
      ) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Claim value ${claim.value} contradicts source content fixture verified value ${metricFixture.verifiedNumericValue}.`,
          claimId: claim.claimId,
        });
      }

      // Section locator resolution against available fixtures
      const trimmedLoc = claim.sourceLocator.trim().toLowerCase();
      const resolvingFixture = docFixtures.find((f) => {
        if (!f.sectionLocator) return false;
        const trimmedSec = f.sectionLocator.trim().toLowerCase();
        if (trimmedLoc === trimmedSec) return true;
        if (trimmedSec.startsWith(trimmedLoc + ' /') || trimmedSec.startsWith(trimmedLoc + ' —') || trimmedSec.startsWith(trimmedLoc + ':')) {
          return true;
        }
        if (trimmedLoc.startsWith(trimmedSec + ' /') || trimmedLoc.startsWith(trimmedSec + ' —') || trimmedLoc.startsWith(trimmedSec + ':')) {
          return true;
        }
        if (trimmedSec.includes(trimmedLoc) && trimmedLoc.length >= 8) {
          return true;
        }
        if (trimmedLoc.includes(trimmedSec) && trimmedSec.length >= 8) {
          return true;
        }
        return false;
      });

      if (!resolvingFixture) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Claim sourceLocator '${claim.sourceLocator}' does not resolve against available source content fixtures.`,
          claimId: claim.claimId,
        });
      } else {
        hasResolvedLocator = true;
      }

      // Check if a fixture completely verifies the numeric claim
      const matchingCandidateFixtures = docFixtures.filter((f) => {
        if (!f.verifiedMetricId || f.verifiedMetricId !== claim.metricId) return false;
        if (f.verifiedNumericValue === undefined || !Number.isFinite(f.verifiedNumericValue)) return false;
        if (!matchNumericValues(claim.value, f.verifiedNumericValue, claim.unit)) return false;
        if (!f.verifiedPeriod || f.verifiedPeriod !== targetPeriod) return false;
        if (f.verifiedPeriodType && targetPeriodType && f.verifiedPeriodType !== targetPeriodType) return false;
        if (f.verifiedUnit && claim.unit && f.verifiedUnit !== claim.unit) return false;
        if (f.verifiedScope && claim.reportingScope && f.verifiedScope !== claim.reportingScope) return false;
        if (f.verifiedAccountingBasis && claim.accountingBasis && f.verifiedAccountingBasis !== claim.accountingBasis) {
          return false;
        }
        return true;
      });

      if (matchingCandidateFixtures.length > 1) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Multiple ambiguous source content fixtures (${matchingCandidateFixtures.length}) match claim dimensions for metric '${claim.metricId}' and period '${targetPeriod}'.`,
          claimId: claim.claimId,
        });
      } else if (matchingCandidateFixtures.length === 1) {
        hasAuthoritativeSourceEvidence = true;
        evidenceSource = 'deterministic_fixture';
      }
    }
  }

  if (!claim.verifiedEvidence || claim.verifiedEvidence.trim() === '') {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: 'Structured claim lacks required verifiedEvidence.',
      claimId: claim.claimId,
    });
  } else if (claim.verifiedEvidence.trim().length < 8) {
    findings.push({
      severity: 'WARNING',
      disposition: 'review',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: 'Structured claim verifiedEvidence is suspiciously brief; requires human auditor verification.',
      claimId: claim.claimId,
    });
  } else if (contentFixtures && contentFixtures.length > 0 && claim.sourceDocId) {
    const targetPeriod = claim.period || driver.period;
    const docFixtures = contentFixtures.filter((f) => f.sourceDocId === claim.sourceDocId);
    const matchingEvidence = docFixtures.find((f) => {
      if (!f.extractedText) return false;
      // Must not come from an unrelated reporting period
      if (f.verifiedPeriod && targetPeriod && f.verifiedPeriod !== targetPeriod) return false;
      const textMatches =
        claim.verifiedEvidence.includes(f.extractedText) || f.extractedText.includes(claim.verifiedEvidence);
      if (!textMatches) return false;
      // Evidence must support the claimed metric
      if (f.verifiedMetricId && f.verifiedMetricId !== claim.metricId) return false;
      // Evidence must support the claimed numeric value
      const valStr = String(claim.value);
      const supportsNum =
        (f.verifiedNumericValue !== undefined && matchNumericValues(claim.value, f.verifiedNumericValue, claim.unit)) ||
        f.extractedText.includes(valStr);
      return supportsNum;
    });
    if (matchingEvidence) {
      hasResolvedEvidenceText = true;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Current-Period Observation Matching
  // ────────────────────────────────────────────────────────────────────────────
  let matchingObsCandidates = observations.filter(
    (o) => o.companyId === driver.companyId && o.period === driver.period && o.metricId === claim.metricId
  );

  if (matchingObsCandidates.length > 1 && claim.reportingScope) {
    const scoped = matchingObsCandidates.filter((o) => o.reportingScope === claim.reportingScope);
    if (scoped.length > 0) matchingObsCandidates = scoped;
  }
  if (matchingObsCandidates.length > 1 && claim.accountingBasis) {
    const based = matchingObsCandidates.filter((o) => o.accountingBasis === claim.accountingBasis);
    if (based.length > 0) matchingObsCandidates = based;
  }

  let matchingObs: MetricObservation | undefined;
  if (matchingObsCandidates.length > 1) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: claimItem,
      detail: `Ambiguous matching observations (${matchingObsCandidates.length}) found for metric '${claim.metricId}' in ${driver.period}.`,
      claimId: claim.claimId,
    });
    matchingObs = matchingObsCandidates[0];
  } else if (matchingObsCandidates.length === 1) {
    matchingObs = matchingObsCandidates[0];
    matchedObservationId = matchingObs.id;
  }

  if (!matchingObs) {
    if (claim.claimCategory === 'primary_observation') {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `Claim categorized as 'primary_observation' but no matching observation was found for metric '${claim.metricId}' in ${driver.period}.`,
        claimId: claim.claimId,
      });
    } else if (claim.claimCategory !== 'narrative_disclosure') {
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `Structured claim lacks primary observation and is not explicitly designated as 'narrative_disclosure'.`,
        claimId: claim.claimId,
      });
    }
  } else {
    // Verify numerical consistency with internal observation
    const valueMatches = matchingObs.value != null && matchNumericValues(claim.value, matchingObs.value, claim.unit);
    if (!valueMatches) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'CALCULATION_DISCREPANCY',
        item: claimItem,
        detail: `Structured claim value ${claim.value} (${claim.unit}) contradicts observation value ${matchingObs.value} (${matchingObs.unit}).`,
        claimId: claim.claimId,
      });
    }

    if (matchingObs.unit !== claim.unit) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Structured claim unit '${claim.unit}' contradicts observation unit '${matchingObs.unit}'.`,
        claimId: claim.claimId,
      });
    }

    if (claim.currency && matchingObs.currency && claim.currency !== matchingObs.currency) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Structured claim currency '${claim.currency}' contradicts observation currency '${matchingObs.currency}'.`,
        claimId: claim.claimId,
      });
    }

    if (claim.reportingScope && matchingObs.reportingScope && claim.reportingScope !== matchingObs.reportingScope) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Claim reportingScope '${claim.reportingScope}' contradicts observation scope '${matchingObs.reportingScope}'.`,
        claimId: claim.claimId,
      });
    }

    if (claim.accountingBasis && matchingObs.accountingBasis && claim.accountingBasis !== matchingObs.accountingBasis) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Claim accountingBasis '${claim.accountingBasis}' contradicts observation accountingBasis '${matchingObs.accountingBasis}'.`,
        claimId: claim.claimId,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5. YoY Growth Rate Validation via Unified Validator (Fail-Closed, P2)
  // ────────────────────────────────────────────────────────────────────────────
  if (claim.growthRateYoY !== undefined) {
    const yoyResult = resolveAndValidateComparisonObservation(
      claim,
      driver,
      matchingObs,
      observations,
      'YoY_growth',
      toleranceYoY,
      claimItem
    );
    comparisonObservationId = yoyResult.comparisonObservationId;
    if (yoyResult.calculatedDiffOrGrowth !== undefined) {
      recalculatedGrowthYoY = yoyResult.calculatedDiffOrGrowth;
    }
    findings.push(...yoyResult.findings);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5b. QoQ Growth Rate Validation via Unified Validator (Fail-Closed, P2)
  // ────────────────────────────────────────────────────────────────────────────
  if (claim.growthRateQoQ !== undefined) {
    const qoqResult = resolveAndValidateComparisonObservation(
      claim,
      driver,
      matchingObs,
      observations,
      'QoQ_growth',
      toleranceQoQ,
      claimItem
    );
    comparisonObservationQoQId = qoqResult.comparisonObservationId;
    if (qoqResult.calculatedDiffOrGrowth !== undefined) {
      recalculatedGrowthQoQ = qoqResult.calculatedDiffOrGrowth;
    }
    findings.push(...qoqResult.findings);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 6. Percentage Point Change Validation via Unified Validator (Fail-Closed, P2)
  // ────────────────────────────────────────────────────────────────────────────
  if (claim.changeYoYPercentagePoints !== undefined) {
    if (claim.growthRateYoY !== undefined) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: 'Claim specifies both changeYoYPercentagePoints and growthRateYoY. Percentage metrics must use percentage points only to prevent semantic confusion.',
        claimId: claim.claimId,
      });
    }

    if (claim.unit !== 'percentage') {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Claim specifies changeYoYPercentagePoints but unit is '${claim.unit}', not 'percentage'.`,
        claimId: claim.claimId,
      });
    }

    const metricDef = METRICS_MAP[claim.metricId];
    const isShareOrRateMetric =
      claim.unit === 'percentage' ||
      (metricDef && (metricDef.unit === 'percentage' || metricDef.dataType === 'percentage')) ||
      claim.metricId.includes('share') ||
      claim.metricId.includes('margin');

    if (!isShareOrRateMetric) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Percentage point change cannot be applied to non-share metric '${claim.metricId}'.`,
        claimId: claim.claimId,
      });
    }

    const ppResult = resolveAndValidateComparisonObservation(
      claim,
      driver,
      matchingObs,
      observations,
      'percentage_points',
      tolerancePercentagePoints,
      claimItem
    );
    if (!comparisonObservationId) {
      comparisonObservationId = ppResult.comparisonObservationId;
    }
    if (ppResult.calculatedDiffOrGrowth !== undefined) {
      recalculatedChangePp = ppResult.calculatedDiffOrGrowth;
    }
    findings.push(...ppResult.findings);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 7. Bilingual Narrative Reference & Semantic/Directional Consistency (P2)
  // ────────────────────────────────────────────────────────────────────────────
  const allNarrativeTextKo = [
    driver.headlineKo,
    driver.summaryKo,
    ...driver.drivers.map((d: PerformanceDriverItem) => `${d.titleKo} ${d.descriptionKo}`),
  ]
    .filter(Boolean)
    .join(' ');

  const allNarrativeTextEn = [
    driver.headlineEn,
    driver.summaryEn,
    ...driver.drivers.map((d: PerformanceDriverItem) => `${d.titleEn} ${d.descriptionEn}`),
  ]
    .filter(Boolean)
    .join(' ');

  if (!claim.narrativeRefKo || claim.narrativeRefKo.trim() === '') {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: 'Structured claim lacks required narrativeRefKo.',
      claimId: claim.claimId,
    });
  } else {
    if (!allNarrativeTextKo.includes(claim.narrativeRefKo)) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `narrativeRefKo "${claim.narrativeRefKo}" cannot be found in the Korean headline, summary, or driver text.`,
        claimId: claim.claimId,
      });
    } else if (claim.narrativeRefKo.trim().length < 4) {
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `narrativeRefKo "${claim.narrativeRefKo}" is too brief or trivial to reliably bind claim evidence.`,
        claimId: claim.claimId,
      });
    }
  }

  if (!claim.narrativeRefEn || claim.narrativeRefEn.trim() === '') {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: 'Structured claim lacks required narrativeRefEn.',
      claimId: claim.claimId,
    });
  } else {
    if (!allNarrativeTextEn.includes(claim.narrativeRefEn)) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `narrativeRefEn "${claim.narrativeRefEn}" cannot be found in the English headline, summary, or driver text.`,
        claimId: claim.claimId,
      });
    } else if (claim.narrativeRefEn.trim().length < 4) {
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `narrativeRefEn "${claim.narrativeRefEn}" is too brief or trivial to reliably bind claim evidence.`,
        claimId: claim.claimId,
      });
    }
  }

  // Deep Semantic & Directional Validation across Narrative References
  if (claim.narrativeRefKo && claim.narrativeRefEn) {
    // A. Conflicting period check
    const currentQMatch = driver.period.match(/^(\d{4})-Q([1-4])$/);
    if (currentQMatch) {
      const currentQuarter = currentQMatch[2];
      const otherQuarters = ['1', '2', '3', '4'].filter(
        (q) => q !== currentQuarter && (!claim.comparisonPeriodQoQ || !claim.comparisonPeriodQoQ.endsWith(`-Q${q}`))
      );
      for (const oq of otherQuarters) {
        const regexKo = new RegExp(`(?:^|\\s|\\()${oq}분기(?:\\s|\\)|$)`);
        const regexEn = new RegExp(`\\bQ${oq}\\b`, 'i');
        if (regexKo.test(claim.narrativeRefKo) || regexEn.test(claim.narrativeRefEn)) {
          findings.push({
            severity: 'ERROR',
            disposition: 'blocking',
            category: 'PERIOD_ALIGNMENT',
            item: claimItem,
            detail: `Narrative reference explicitly cites conflicting reporting quarter ('Q${oq}') for a ${driver.period} claim.`,
            claimId: claim.claimId,
          });
          break;
        }
      }
    }

    // B. Conflicting metric check (volume vs financial)
    const isVolumeClaim =
      claim.metricId === 'deliveries_global' ||
      claim.metricId === 'wholesale_shipments' ||
      claim.metricId === 'bev_deliveries' ||
      claim.metricId === 'hev_deliveries';
    const isFinancialClaim =
      claim.metricId === 'revenue' ||
      claim.metricId === 'operating_income' ||
      claim.metricId === 'net_income' ||
      claim.metricId === 'free_cash_flow';

    const hasFinancialKo = /매출|영업이익|순이익|손실|EBIT/i.test(claim.narrativeRefKo);
    const hasVolumeKo = /인도|판매|출하|대\b/i.test(claim.narrativeRefKo);
    const hasFinancialEn = /revenue|operating profit|operating income|EBIT|net income|loss|\$|€|₩|RMB/i.test(claim.narrativeRefEn);
    const hasVolumeEn = /deliveries|sales|wholesales|shipments|volume|units|vehicles/i.test(claim.narrativeRefEn);

    if (isVolumeClaim && hasFinancialKo && !hasVolumeKo && hasFinancialEn && !hasVolumeEn) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Narrative reference describes revenue/profit metrics rather than claimed volume metric '${claim.metricId}'.`,
        claimId: claim.claimId,
      });
    }

    if (isFinancialClaim && hasVolumeKo && !hasFinancialKo && hasVolumeEn && !hasFinancialEn) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: claimItem,
        detail: `Narrative reference describes vehicle volume metrics rather than claimed financial metric '${claim.metricId}'.`,
        claimId: claim.claimId,
      });
    }

    // C. Percentage vs Percentage Point confusion check
    if (claim.changeYoYPercentagePoints !== undefined) {
      const koHasPp = /%p|퍼센트포인트|포인트/i.test(claim.narrativeRefKo);
      const enHasPp = /%p|percentage point|pts|points/i.test(claim.narrativeRefEn);
      const enHasGrowthConfusion = /(?:grew|growth|increased|rose|up)\s+[+-]?\d+(?:\.\d+)?%\s*(?:YoY)?/i.test(claim.narrativeRefEn);
      const koHasGrowthConfusion = /[+-]?\d+(?:\.\d+)?%\s*(?:증가|성장|상승)/i.test(claim.narrativeRefKo);

      if (!koHasPp && koHasGrowthConfusion) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Percentage point change claim (${claim.changeYoYPercentagePoints}%p) confused with percentage growth in Korean narrative ("${claim.narrativeRefKo}").`,
          claimId: claim.claimId,
        });
      }
      if (!enHasPp && enHasGrowthConfusion) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Percentage point change claim (${claim.changeYoYPercentagePoints}%p) confused with percentage growth in English narrative ("${claim.narrativeRefEn}").`,
          claimId: claim.claimId,
        });
      }
    }

    // D. Growth rate numerical discrepancy check
    const koPercentages = extractPercentages(claim.narrativeRefKo);
    const enPercentages = extractPercentages(claim.narrativeRefEn);

    if (koPercentages.length > 0 && enPercentages.length > 0) {
      let minDiscrepancy = Infinity;
      for (const kp of koPercentages) {
        for (const ep of enPercentages) {
          const d = Math.abs(kp - ep);
          if (d < minDiscrepancy) minDiscrepancy = d;
        }
      }
      if (minDiscrepancy > 1.0) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Material discrepancy between Korean narrative ("${claim.narrativeRefKo}") and English narrative ("${claim.narrativeRefEn}"). Numeric rates differ by ${minDiscrepancy.toFixed(2)} percentage points.`,
          claimId: claim.claimId,
        });
      }
    }

    // E. Directional inconsistency check between Ko and En
    const koPos = /증가|성장|상승|\+/.test(claim.narrativeRefKo);
    const koNeg = /감소|하락|축소|감축|-/.test(claim.narrativeRefKo);
    const enLower = claim.narrativeRefEn.toLowerCase();
    const enPos = /increase|growth|surge|expand|up|\+/.test(enLower);
    const enNeg = /decrease|decline|drop|fell|down|-/.test(enLower);

    if ((koPos && !koNeg && enNeg && !enPos) || (koNeg && !koPos && enPos && !enNeg)) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `Directional contradiction between Korean narrative ("${claim.narrativeRefKo}") and English narrative ("${claim.narrativeRefEn}").`,
        claimId: claim.claimId,
      });
    }

    // F. Directional consistency check against claimed growth sign
    if (claim.growthRateYoY !== undefined) {
      if (claim.growthRateYoY < 0 && koPos && !koNeg) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Negative YoY growth (${claim.growthRateYoY}%) contradicts positive Korean narrative description ("${claim.narrativeRefKo}").`,
          claimId: claim.claimId,
        });
      }
      if (claim.growthRateYoY > 0 && koNeg && !koPos) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Positive YoY growth (+${claim.growthRateYoY}%) contradicts negative Korean narrative description ("${claim.narrativeRefKo}").`,
          claimId: claim.claimId,
        });
      }
      if (claim.growthRateYoY < 0 && enPos && !enNeg) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Negative YoY growth (${claim.growthRateYoY}%) contradicts positive English narrative description ("${claim.narrativeRefEn}").`,
          claimId: claim.claimId,
        });
      }
      if (claim.growthRateYoY > 0 && enNeg && !enPos) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Positive YoY growth (+${claim.growthRateYoY}%) contradicts negative English narrative description ("${claim.narrativeRefEn}").`,
          claimId: claim.claimId,
        });
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 8. Live Source Verification Pipeline Gate (P1)
  // ────────────────────────────────────────────────────────────────────────────
  let isLiveVerified = false;
  if (options?.livePipelineResult) {
    const liveVal = validateLivePipelineVerification(claim, driver, options, sourcesMap);
    if (liveVal.valid) {
      isLiveVerified = true;
      evidenceSource = 'live_pipeline';
    } else {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `Live source verification failed: ${liveVal.failureReasons.join('; ')}`,
        claimId: claim.claimId,
      });
    }
  } else if (options?.isLiveSource) {
    // Insecure caller-controlled boolean alone is rejected from establishing live_source_verified
    findings.push({
      severity: 'WARNING',
      disposition: 'review',
      category: 'SOURCE_CLAIM_INTEGRITY',
      item: claimItem,
      detail: 'isLiveSource boolean flag alone cannot establish live verification; requires validated livePipelineResult from trusted pipeline.',
      claimId: claim.claimId,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 9. Multi-Tiered Verification Level Classification (P1)
  // ────────────────────────────────────────────────────────────────────────────
  const hasBlocking = findings.some((f) => f.disposition === 'blocking');
  let verificationLevel: ClaimVerificationLevel = 'unverified';

  if (!hasBlocking) {
    if (isLiveVerified) {
      verificationLevel = 'live_source_verified';
    } else if (hasAuthoritativeSourceEvidence) {
      verificationLevel = 'numeric_claim_verified';
    } else if (matchingObs && matchingObs.value != null && matchNumericValues(claim.value, matchingObs.value, claim.unit)) {
      verificationLevel = 'observation_consistent';
    } else if (hasResolvedEvidenceText) {
      verificationLevel = 'evidence_validated';
    } else if (hasResolvedLocator) {
      verificationLevel = 'locator_validated';
    } else {
      verificationLevel = 'metadata_validated';
    }
  }

  return {
    claimId: claim.claimId,
    isValid: !hasBlocking,
    verificationLevel,
    findings,
    recalculatedGrowthYoY,
    recalculatedGrowthQoQ,
    recalculatedChangePp,
    matchedObservationId,
    comparisonObservationId,
    comparisonObservationQoQId,
    evidenceSource,
  };
}

/**
 * Validates a single structured performance claim against driver context, observations,
 * source metadata, content fixtures, and bilingual narrative text.
 * Delegates to auditStructuredPerformanceClaim and returns its findings array.
 */
export function validatePerformanceClaim(
  claim: StructuredPerformanceClaim,
  driver: CompanyPerformanceDriver,
  options?: ValidatePerformanceClaimOptions
): PerformanceClaimAuditFinding[] {
  const result = auditStructuredPerformanceClaim(claim, driver, options);
  return result.findings;
}

/**
 * Audits all performance drivers and their structured claims.
 */
export function auditPerformanceDrivers(
  drivers: CompanyPerformanceDriver[],
  options?: ValidatePerformanceClaimOptions
): PerformanceClaimAuditFinding[] {
  const findings: PerformanceClaimAuditFinding[] = [];

  for (const driver of drivers) {
    if (!driver.structuredClaims || driver.structuredClaims.length === 0) continue;
    for (const claim of driver.structuredClaims) {
      const claimFindings = validatePerformanceClaim(claim, driver, options);
      findings.push(...claimFindings);
    }
  }

  return findings;
}
