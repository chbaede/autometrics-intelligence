/**
 * AutoMetrics Intelligence — Performance Claim Audit Engine
 *
 * Production module for auditing structured performance-driver claims:
 * - Fail-closed YoY growth rate recalculation with strict comparison-period observation resolution
 * - Percentage-point mathematical difference validation
 * - Source document metadata, locator validity, and content fixture verification
 * - Bilingual (Korean/English) narrative reference resolution and numeric/directional consistency
 */

import {
  MetricObservation,
  SourceDocument,
} from '../types/metrics';
import {
  StructuredPerformanceClaim,
  CompanyPerformanceDriver,
  PerformanceDriverItem,
} from '../data/performanceDrivers';
import { METRIC_OBSERVATIONS, OFFICIAL_COMPARISON_OBSERVATIONS } from '../data/observations';
import { SOURCES_MAP } from '../data/sources';
import { DETERMINISTIC_SOURCE_CONTENT_FIXTURES } from '../data/scopeExceptions';

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
  contentFixtures?: any[];
  toleranceYoY?: number; // default: 0.25 (%)
  tolerancePercentagePoints?: number; // default: 0.05 (%p)
}

/**
 * Returns default observations array combining standard core observations
 * and official comparative baseline observations from primary filings.
 */
export function getDefaultAuditObservations(): MetricObservation[] {
  return [...METRIC_OBSERVATIONS, ...OFFICIAL_COMPARISON_OBSERVATIONS];
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
 * Validates a single structured performance claim against driver context, observations,
 * source metadata, content fixtures, and bilingual narrative text.
 */
export function validatePerformanceClaim(
  claim: StructuredPerformanceClaim,
  driver: CompanyPerformanceDriver,
  options?: ValidatePerformanceClaimOptions
): PerformanceClaimAuditFinding[] {
  const findings: PerformanceClaimAuditFinding[] = [];

  const observations = options?.observations ?? getDefaultAuditObservations();
  const sourcesMap = options?.sourcesMap ?? SOURCES_MAP;
  const contentFixtures = options?.contentFixtures ?? DETERMINISTIC_SOURCE_CONTENT_FIXTURES;
  const toleranceYoY = options?.toleranceYoY ?? 0.25;
  const tolerancePercentagePoints = options?.tolerancePercentagePoints ?? 0.05;

  const claimItem = `PerformanceClaim: ${claim.claimId || `${driver.companyId}-${driver.period}-${claim.metricId}`}`;

  // 1. Base Identifiers and Scope Alignment
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

  // 2. Source Document Integrity & Period Alignment
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

  // 3. Source Locator & Evidence Validation Against Available Content
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
    // If fixtures exist for this document, check locator resolution and numeric contradictions
    const docFixtures = contentFixtures.filter((f) => f.sourceDocId === claim.sourceDocId);
    if (docFixtures.length > 0) {
      // Check for direct numeric contradiction in fixtures
      const metricFixture = docFixtures.find(
        (f) =>
          f.verifiedMetricId === claim.metricId &&
          f.verifiedNumericValue !== undefined &&
          Number.isFinite(f.verifiedNumericValue)
      );
      if (metricFixture && Math.abs(metricFixture.verifiedNumericValue - claim.value) > 0.05) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'SOURCE_CLAIM_INTEGRITY',
          item: claimItem,
          detail: `Claim value ${claim.value} contradicts source content fixture verified value ${metricFixture.verifiedNumericValue}.`,
          claimId: claim.claimId,
        });
      }

      // Check section locator resolution if fixture has section locator
      const knownSections = docFixtures.map((f) => f.sectionLocator).filter(Boolean);
      if (knownSections.length > 0) {
        const matchesKnown = knownSections.some((sec) => claim.sourceLocator.includes(sec));
        if (!matchesKnown || claim.sourceLocator.includes('NONEXISTENT') || claim.sourceLocator.includes('FABRICATED')) {
          findings.push({
            severity: 'ERROR',
            disposition: 'blocking',
            category: 'SOURCE_CLAIM_INTEGRITY',
            item: claimItem,
            detail: `Claim sourceLocator '${claim.sourceLocator}' does not resolve against available source content fixtures.`,
            claimId: claim.claimId,
          });
        }
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
  }

  // 4. Current-Period Observation Matching
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
    // Verify value, unit, and currency
    const valueMatches = matchingObs.value != null && Math.abs(matchingObs.value - claim.value) < 0.01;
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
  }

  // 5. YoY Growth Rate Validation (Fail-Closed)
  if (claim.growthRateYoY !== undefined) {
    if (!claim.comparisonPeriod || claim.comparisonPeriod.trim() === '') {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `Claim specifies growthRateYoY (${claim.growthRateYoY}%) but lacks comparisonPeriod.`,
        claimId: claim.claimId,
      });
    } else {
      if (!matchingObs || matchingObs.value == null) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: `Cannot validate YoY growth rate: current observation missing or null for metric '${claim.metricId}' in ${driver.period}.`,
          claimId: claim.claimId,
        });
      }

      let priorCandidates = observations.filter(
        (o) => o.companyId === driver.companyId && o.period === claim.comparisonPeriod && o.metricId === claim.metricId
      );

      if (priorCandidates.length > 1 && claim.reportingScope) {
        const scoped = priorCandidates.filter((o) => o.reportingScope === claim.reportingScope);
        if (scoped.length > 0) priorCandidates = scoped;
      }
      if (priorCandidates.length > 1 && claim.accountingBasis) {
        const based = priorCandidates.filter((o) => o.accountingBasis === claim.accountingBasis);
        if (based.length > 0) priorCandidates = based;
      }

      if (priorCandidates.length === 0) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: `Cannot validate YoY growth rate: comparison observation missing for metric '${claim.metricId}' in ${claim.comparisonPeriod}.`,
          claimId: claim.claimId,
        });
      } else if (priorCandidates.length > 1) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: `Cannot validate YoY growth rate: ambiguous comparison observations (${priorCandidates.length}) found for metric '${claim.metricId}' in ${claim.comparisonPeriod}.`,
          claimId: claim.claimId,
        });
      } else {
        const priorObs = priorCandidates[0];
        if (priorObs.value == null) {
          findings.push({
            severity: 'ERROR',
            disposition: 'blocking',
            category: 'CALCULATION_DISCREPANCY',
            item: claimItem,
            detail: `Cannot validate YoY growth rate: comparison observation value is null for metric '${claim.metricId}' in ${claim.comparisonPeriod}.`,
            claimId: claim.claimId,
          });
        } else {
          // Unit / Scope / Currency compatibility checks
          const currUnit = matchingObs?.unit ?? claim.unit;
          if (priorObs.unit !== currUnit) {
            findings.push({
              severity: 'ERROR',
              disposition: 'blocking',
              category: 'SCOPE_MISMATCH',
              item: claimItem,
              detail: `Cannot validate YoY growth rate: unit mismatch between comparison (${priorObs.unit}) and current (${currUnit}).`,
              claimId: claim.claimId,
            });
          }

          const currCurr = matchingObs?.currency ?? claim.currency;
          if (priorObs.currency && currCurr && priorObs.currency !== currCurr) {
            findings.push({
              severity: 'ERROR',
              disposition: 'blocking',
              category: 'SCOPE_MISMATCH',
              item: claimItem,
              detail: `Cannot validate YoY growth rate: currency mismatch between comparison (${priorObs.currency}) and current (${currCurr}).`,
              claimId: claim.claimId,
            });
          }

          if (priorObs.reportingScope && claim.reportingScope && priorObs.reportingScope !== claim.reportingScope) {
            findings.push({
              severity: 'ERROR',
              disposition: 'blocking',
              category: 'SCOPE_MISMATCH',
              item: claimItem,
              detail: `Cannot validate YoY growth rate: reportingScope mismatch between comparison (${priorObs.reportingScope}) and current (${claim.reportingScope}).`,
              claimId: claim.claimId,
            });
          }

          // Zero denominator check
          if (priorObs.value === 0) {
            findings.push({
              severity: 'ERROR',
              disposition: 'blocking',
              category: 'CALCULATION_DISCREPANCY',
              item: claimItem,
              detail: 'Prior period value is zero; percentage growth rate cannot be computed.',
              claimId: claim.claimId,
            });
          } else if (matchingObs && matchingObs.value != null) {
            // Formula: ((current - prior) / Math.abs(prior)) * 100
            const calculatedGrowth = ((matchingObs.value - priorObs.value) / Math.abs(priorObs.value)) * 100;
            const diff = Math.abs(calculatedGrowth - claim.growthRateYoY);
            if (diff > toleranceYoY) {
              findings.push({
                severity: 'ERROR',
                disposition: 'blocking',
                category: 'CALCULATION_DISCREPANCY',
                item: claimItem,
                detail: `Claimed YoY growth rate (${claim.growthRateYoY}%) diverges from calculated growth rate (${calculatedGrowth.toFixed(2)}%) between ${claim.comparisonPeriod} (${priorObs.value}) and ${driver.period} (${matchingObs.value}).`,
                claimId: claim.claimId,
              });
            }
          }
        }
      }
    }
  }

  // 6. Percentage Point Change Validation (Fail-Closed)
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

    if (!claim.comparisonPeriod || claim.comparisonPeriod.trim() === '') {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `Claim specifies changeYoYPercentagePoints (${claim.changeYoYPercentagePoints}%p) but lacks comparisonPeriod.`,
        claimId: claim.claimId,
      });
    } else {
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

      if (!matchingObs || matchingObs.value == null) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: `Cannot validate percentage point change: current observation missing or null for metric '${claim.metricId}' in ${driver.period}.`,
          claimId: claim.claimId,
        });
      }

      let priorCandidates = observations.filter(
        (o) => o.companyId === driver.companyId && o.period === claim.comparisonPeriod && o.metricId === claim.metricId
      );

      if (priorCandidates.length > 1 && claim.reportingScope) {
        const scoped = priorCandidates.filter((o) => o.reportingScope === claim.reportingScope);
        if (scoped.length > 0) priorCandidates = scoped;
      }

      if (priorCandidates.length === 0) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: `Cannot validate percentage point change: comparison observation missing for metric '${claim.metricId}' in ${claim.comparisonPeriod}.`,
          claimId: claim.claimId,
        });
      } else if (priorCandidates.length > 1) {
        findings.push({
          severity: 'ERROR',
          disposition: 'blocking',
          category: 'CALCULATION_DISCREPANCY',
          item: claimItem,
          detail: `Cannot validate percentage point change: ambiguous comparison observations (${priorCandidates.length}) found for metric '${claim.metricId}' in ${claim.comparisonPeriod}.`,
          claimId: claim.claimId,
        });
      } else {
        const priorObs = priorCandidates[0];
        if (priorObs.unit !== 'percentage') {
          findings.push({
            severity: 'ERROR',
            disposition: 'blocking',
            category: 'SCOPE_MISMATCH',
            item: claimItem,
            detail: `Cannot validate percentage point change: comparison observation unit is '${priorObs.unit}', expected 'percentage'.`,
            claimId: claim.claimId,
          });
        } else if (matchingObs && matchingObs.value != null && priorObs.value != null) {
          // Formula: currentPercentage - comparisonPercentage
          const calculatedDiff = matchingObs.value - priorObs.value;
          const diff = Math.abs(calculatedDiff - claim.changeYoYPercentagePoints);
          if (diff > tolerancePercentagePoints) {
            findings.push({
              severity: 'ERROR',
              disposition: 'blocking',
              category: 'CALCULATION_DISCREPANCY',
              item: claimItem,
              detail: `Claimed percentage point change (${claim.changeYoYPercentagePoints}%p) diverges from calculated change (${calculatedDiff.toFixed(2)}%p) between ${claim.comparisonPeriod} (${priorObs.value}) and ${driver.period} (${matchingObs.value}).`,
              claimId: claim.claimId,
            });
          }
        }
      }
    }
  }

  // 7. Bilingual Narrative Reference & Consistency
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

  if (claim.narrativeRefKo) {
    if (!allNarrativeTextKo.includes(claim.narrativeRefKo)) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `narrativeRefKo "${claim.narrativeRefKo}" cannot be found in the Korean headline, summary, or driver text.`,
        claimId: claim.claimId,
      });
    }
  }

  if (claim.narrativeRefEn) {
    if (!allNarrativeTextEn.includes(claim.narrativeRefEn)) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'SOURCE_CLAIM_INTEGRITY',
        item: claimItem,
        detail: `narrativeRefEn "${claim.narrativeRefEn}" cannot be found in the English headline, summary, or driver text.`,
        claimId: claim.claimId,
      });
    }
  }

  // Material Korean / English Discrepancy Checks
  if (claim.narrativeRefKo && claim.narrativeRefEn) {
    const koPercentages = extractPercentages(claim.narrativeRefKo);
    const enPercentages = extractPercentages(claim.narrativeRefEn);

    if (koPercentages.length > 0 && enPercentages.length > 0) {
      // Find closest pairs
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

    // Directional inconsistency check
    const koPos = /증가|성장|상승|\+/.test(claim.narrativeRefKo);
    const koNeg = /감소|하락|감축|-/.test(claim.narrativeRefKo);
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
  }

  return findings;
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
