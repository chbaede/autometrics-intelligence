/**
 * AutoMetrics Intelligence — Complete Scope-Safe Data & Financial Integrity Audit Script (v3.0)
 *
 * Key improvements in v3.0:
 *  - Company-name-only exception logic replaced with evidence-backed registry (STEP 4-2, P0)
 *  - `documented` disposition requires exact exception match + source doc verification
 *  - AuditFinding now carries exceptionId, sourceDocIds, observationIds, failedChecks
 *  - Duplicate detection uses getDimensionalObservationKey with corroboration policy
 *  - Audit grouping includes periodType to prevent quarterly/annual mixing
 *  - BEV scope incompatibilities are blocking (no documented exceptions for BEV)
 *  - Finding disposition semantics explicitly documented in src/types/metrics.ts
 */

import { COMPANIES_REGISTRY, COMPANIES_MAP } from '../src/data/companies';
import { METRIC_DEFINITIONS, METRICS_MAP } from '../src/data/metricDefinitions';
import { METRIC_OBSERVATIONS } from '../src/data/observations';
import { SOURCE_DOCUMENTS, SOURCES_MAP } from '../src/data/sources';
import { GUIDANCE_OBSERVATIONS } from '../src/data/guidance';
import { REGIONAL_OBSERVATIONS } from '../src/data/regionalObservations';
import {
  selectCompatibleMarginTriplets,
  validateMarginTriplet,
  createAuditFindingFromMarginValidation,
  selectCompatibleBevShareTriplets,
  validateBEVShare,
  validateObservationProvenance,
  getDimensionalObservationKey,
  MarginValidationOptions,
} from '../src/utils/metricCalculations';
import { AuditFinding, PeriodType } from '../src/types/metrics';
import {
  findDocumentedScopeException,
  findDocumentedReportedKpis,
  findProxyMetricMappings,
  DOCUMENTED_SCOPE_EXCEPTIONS,
  DOCUMENTED_REPORTED_KPIS,
  PROXY_METRIC_MAPPINGS,
} from '../src/data/scopeExceptions';

const isStrict = process.argv.includes('--strict');

const findings: AuditFinding[] = [];

console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('🔍 AutoMetrics Intelligence — Scope-Safe Data & Financial Audit Engine (v3.0)');
console.log('═════════════════════════════════════════════════════════════════════════════\n');

// 1. Inventory counts
console.log(`[INVENTORY] Registered Automakers:           ${COMPANIES_REGISTRY.length}`);
console.log(`[INVENTORY] Metric Definitions:              ${METRIC_DEFINITIONS.length}`);
console.log(`[INVENTORY] Financial & Volume Observations: ${METRIC_OBSERVATIONS.length}`);
console.log(`[INVENTORY] Primary Source Documents:        ${SOURCE_DOCUMENTS.length}`);
console.log(`[INVENTORY] Forward-Looking Guidance Items:  ${GUIDANCE_OBSERVATIONS.length}`);
console.log(`[INVENTORY] Regional Delivery Observations:  ${REGIONAL_OBSERVATIONS.length}\n`);

// ────────────────────────────────────────────────────────────────────────────
// 2. Duplicate Detection with Dimensional Identity Policy
//    Policy (P1-1, P1-2, P2):
//    - Preserves all dimensional observations in Map<string, DimRecord[]>
//    - Compares each observation against all previous matching observations:
//      * same dimensional key + same source + same value + same evidence → exact duplicate, blocking
//      * same dimensional key + same source + same value + different evidence → metadata conflict, review
//      * same dimensional key + same source + different value → blocking conflict
//      * same dimensional key + different source + same value → corroboration, informational
//      * same dimensional key + different source + different value → review conflict
// ────────────────────────────────────────────────────────────────────────────
interface DimRecord {
  id: string;
  value: number | null;
  sourceDocId?: string;
  pageNumber?: number | string;
  tableReference?: string;
  sectionReference?: string;
  evidenceReference?: string;
  originalLabel?: string;
}
const dimensionalMap = new Map<string, DimRecord[]>();

METRIC_OBSERVATIONS.forEach((obs) => {
  const dimKey = getDimensionalObservationKey(obs);
  const currentRecord: DimRecord = {
    id: obs.id,
    value: obs.value,
    sourceDocId: obs.sourceDocId,
    pageNumber: obs.pageNumber,
    tableReference: obs.tableReference,
    sectionReference: obs.sectionReference,
    evidenceReference: obs.evidenceReference,
    originalLabel: obs.originalLabel,
  };

  const existingList = dimensionalMap.get(dimKey);
  if (!existingList) {
    dimensionalMap.set(dimKey, [currentRecord]);
    return;
  }

  for (const existing of existingList) {
    const sameSource = !!existing.sourceDocId && !!obs.sourceDocId && existing.sourceDocId === obs.sourceDocId;
    const sameValue = existing.value === obs.value;
    const sameEvidence =
      existing.pageNumber === obs.pageNumber &&
      existing.tableReference === obs.tableReference &&
      existing.sectionReference === obs.sectionReference &&
      existing.evidenceReference === obs.evidenceReference &&
      existing.originalLabel === obs.originalLabel;

    if (sameSource && sameValue && sameEvidence) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'DUPLICATE',
        item: obs.id,
        observationIds: [existing.id, obs.id],
        detail: `Exact duplicate: same dimensional key, same source doc "${obs.sourceDocId}", same value (${obs.value}), and identical evidence metadata. Conflicts with ${existing.id}.`,
      });
    } else if (sameSource && sameValue && !sameEvidence) {
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'DUPLICATE',
        item: obs.id,
        observationIds: [existing.id, obs.id],
        detail: `Metadata conflict: same dimensional key, same source doc "${obs.sourceDocId}", same value (${obs.value}), but differing evidence metadata. Conflicts with ${existing.id}.`,
      });
    } else if (sameSource && !sameValue) {
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'DUPLICATE',
        item: obs.id,
        observationIds: [existing.id, obs.id],
        detail: `Value conflict: same dimensional key, same source doc "${obs.sourceDocId}", but value differs (${existing.value} vs ${obs.value}). Conflicts with ${existing.id}.`,
      });
    } else if (!sameSource && sameValue) {
      // Corroboration — informational only, not blocking
      findings.push({
        severity: 'INFO',
        disposition: 'informational',
        category: 'PROVENANCE_INFO',
        item: obs.id,
        observationIds: [existing.id, obs.id],
        sourceDocIds: [existing.sourceDocId || 'unknown', obs.sourceDocId || 'unknown'],
        detail: `Corroboration: same dimensional key from different sources ("${existing.sourceDocId}" vs "${obs.sourceDocId}") with identical value (${obs.value}). Non-blocking corroboration.`,
      });
    } else {
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'DUPLICATE',
        item: obs.id,
        observationIds: [existing.id, obs.id],
        failedChecks: ['value_conflict'],
        detail: `Cross-source value conflict: same dimensional key, source "${existing.sourceDocId}" has value ${existing.value}, source "${obs.sourceDocId}" has value ${obs.value}. Requires human review.`,
      });
    }
  }

  existingList.push(currentRecord);
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Source Document Provenance & Entity Cross-Validation
// ────────────────────────────────────────────────────────────────────────────
let provenanceValidCount = 0;
let provenanceWarningsCount = 0;
let provenanceErrorsCount = 0;

METRIC_OBSERVATIONS.forEach((obs) => {
  const sourceDoc = obs.sourceDocId ? SOURCES_MAP[obs.sourceDocId] : null;
  const company = COMPANIES_MAP[obs.companyId];

  const provenanceResult = validateObservationProvenance(obs, sourceDoc, company);

  if (provenanceResult.valid && provenanceResult.severity === 'INFO') {
    provenanceValidCount++;
  } else if (provenanceResult.severity === 'ERROR') {
    provenanceErrorsCount++;
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'SOURCE_METADATA',
      item: obs.id,
      observationIds: [obs.id],
      detail: provenanceResult.reasons.join('; '),
    });
  } else if (provenanceResult.severity === 'WARNING') {
    provenanceWarningsCount++;
    findings.push({
      severity: 'WARNING',
      disposition: 'review',
      category: 'SOURCE_METADATA',
      item: obs.id,
      observationIds: [obs.id],
      detail: provenanceResult.reasons.join('; '),
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Strict Required Metadata Validation by Metric Category
// ────────────────────────────────────────────────────────────────────────────
let missingMetadataCount = 0;
METRIC_OBSERVATIONS.forEach((obs) => {
  const metricDef = METRICS_MAP[obs.metricId];
  if (!metricDef) return;

  if (metricDef.category === 'financial' || obs.unit.startsWith('currency')) {
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        failedChecks: ['reportingScope'],
        detail: `Financial metric "${obs.metricId}" is missing required reportingScope.`,
      });
    }
    if (!obs.accountingBasis || obs.accountingBasis === 'unknown') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        failedChecks: ['accountingBasis'],
        detail: `Financial metric "${obs.metricId}" is missing required accountingBasis.`,
      });
    }
    if (obs.unit.startsWith('currency') && !obs.currency) {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        failedChecks: ['currency'],
        detail: `Financial metric "${obs.metricId}" is missing required currency.`,
      });
    }
  }

  if (metricDef.category === 'sales' || obs.unit === 'units' || obs.unit === 'thousand_units' || obs.metricId.includes('deliveries')) {
    if (!obs.volumeDefinition || obs.volumeDefinition === 'unknown') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        failedChecks: ['volumeDefinition'],
        detail: `Delivery metric "${obs.metricId}" is missing required volumeDefinition.`,
      });
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        failedChecks: ['reportingScope'],
        detail: `Delivery metric "${obs.metricId}" is missing required reportingScope.`,
      });
    }
  }

  if (obs.valueType === 'derived' || metricDef.category === 'electrification' || obs.metricId === 'operating_margin') {
    if (!obs.verificationStatus || obs.verificationStatus === 'unverified') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        failedChecks: ['verificationStatus'],
        detail: `Derived metric "${obs.metricId}" is missing required verificationStatus.`,
      });
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        failedChecks: ['reportingScope'],
        detail: `Derived metric "${obs.metricId}" is missing required reportingScope.`,
      });
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Candidate-Based Margin Scope Validation & Verification
//
//    Grouping key includes periodType to prevent quarterly/annual mixing.
//    Documented exceptions require exact registry match — never company name alone.
// ────────────────────────────────────────────────────────────────────────────
// Group by companyId|period|periodType (includes periodType for mixing prevention)
const companyPeriodTypes = new Set<string>();
METRIC_OBSERVATIONS.forEach((obs) => {
  companyPeriodTypes.add(`${obs.companyId}|${obs.period}|${obs.periodType}`);
});

let marginSelectionMatched = 0;
let marginSelectionMissing = 0;
let marginSelectionAmbiguous = 0;
let marginSelectionIncompatible = 0;

let marginValidationVerified = 0;
let marginValidationProxyOnly = 0;
let marginValidationNeedsReview = 0;
let marginValidationInvalid = 0;

companyPeriodTypes.forEach((cpt) => {
  const [companyId, period, periodType] = cpt.split('|');

  // Filter observations by companyId, period, AND periodType to prevent mixing
  const periodObservations = METRIC_OBSERVATIONS.filter(
    (o) => o.companyId === companyId && o.period === period && o.periodType === periodType
  );

  const selection = selectCompatibleMarginTriplets(periodObservations, companyId, period);

  if (selection.status === 'matched') {
    marginSelectionMatched++;

    // Resolve proxy mapping or documented KPI if applicable (STEP 4-8, Task 2 & Task 3)
    const proxyMatches = (selection.profit && selection.margin)
      ? findProxyMetricMappings(
          companyId,
          period,
          undefined,
          selection.profit.metricId,
          periodType as PeriodType,
          selection.margin.reportingScope,
          selection.margin.accountingBasis,
          selection.profit.reportingScope,
          selection.profit.accountingBasis
        )
      : [];

    if (proxyMatches.length > 1) {
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SCOPE_MISMATCH',
        companyId,
        period,
        periodType,
        item: `${companyId} (${period}, ${periodType})`,
        detail: `Ambiguous proxy metric mapping lookup: ${proxyMatches.length} candidates matched. Human review required.`,
      });
    }

    const proxyMapping = proxyMatches.length === 1 ? proxyMatches[0] : undefined;

    const kpiMatches = selection.margin
      ? findDocumentedReportedKpis(
          companyId,
          period,
          selection.margin.metricId,
          selection.margin.reportingScope,
          periodType as PeriodType,
          selection.margin.accountingBasis
        )
      : [];

    if (kpiMatches.length > 1) {
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SCOPE_MISMATCH',
        companyId,
        period,
        periodType,
        item: `${companyId} (${period}, ${periodType})`,
        detail: `Ambiguous documented reported KPI lookup: ${kpiMatches.length} candidates matched. Human review required.`,
      });
    }

    const documentedKpi = kpiMatches.length === 1 ? kpiMatches[0] : undefined;

    const validationOptions: MarginValidationOptions = {};
    if (proxyMapping) {
      validationOptions.proxyMapping = proxyMapping;
    }
    if (documentedKpi) {
      validationOptions.documentedKpi = documentedKpi;
    }

    const validation = validateMarginTriplet(
      selection.revenue,
      selection.profit,
      selection.margin,
      undefined,
      validationOptions
    );

    if (validation.status === 'verified') {
      marginValidationVerified++;
    } else if (validation.status === 'proxy_only') {
      marginValidationProxyOnly++;
    } else if (validation.status === 'needs_review') {
      marginValidationNeedsReview++;
    } else if (validation.status === 'invalid') {
      marginValidationInvalid++;
    }

    const finding = createAuditFindingFromMarginValidation(
      validation,
      companyId,
      period,
      periodType,
      validationOptions
    );
    if (finding) {
      findings.push(finding);
    }
  } else if (selection.status === 'ambiguous') {
    marginSelectionAmbiguous++;
    findings.push({
      severity: 'WARNING',
      disposition: 'blocking',
      category: 'AMBIGUOUS_SELECTION',
      item: `${companyId} (${period}, ${periodType})`,
      detail: selection.reasons.join('; '),
    });
  } else if (selection.status === 'incompatible') {
    marginSelectionIncompatible++;

    // ── Candidate resolution flow (P0-1, P1-3) ────────────────────────────────
    // Use candidate triplets preserved by selectCompatibleMarginTriplets()
    // Never use arbitrary candidate selection; resolve to single match or flag ambiguity.
    const candidateDiagnostics =
      selection.diagnostics && selection.diagnostics.length > 0 ? selection.diagnostics : [];

    const validCandidateMatches: {
      diagnostic: (typeof candidateDiagnostics)[number];
      exception: (typeof DOCUMENTED_SCOPE_EXCEPTIONS)[number];
      proxyMapping?: (typeof PROXY_METRIC_MAPPINGS)[number];
      documentedKpi?: (typeof DOCUMENTED_REPORTED_KPIS)[number];
    }[] = [];

    for (const diagnostic of candidateDiagnostics) {
      if (!diagnostic.margin || !diagnostic.profit || !diagnostic.revenue) continue;

      const exceptionResult = findDocumentedScopeException(
        companyId,
        period,
        diagnostic.margin.metricId,
        diagnostic.profit.metricId,
        diagnostic.revenue.metricId,
        diagnostic.profit.reportingScope,
        diagnostic.revenue.reportingScope,
        diagnostic.margin.reportingScope,
        diagnostic.profit.accountingBasis,
        diagnostic.revenue.accountingBasis,
        diagnostic.margin.accountingBasis,
        SOURCES_MAP,
        DOCUMENTED_SCOPE_EXCEPTIONS,
        {
          revenueSourceDocId: diagnostic.revenue.sourceDocId,
          numeratorSourceDocId: diagnostic.profit.sourceDocId,
          marginSourceDocId: diagnostic.margin.sourceDocId,
          periodType: diagnostic.revenue.periodType,
        }
      );

      if (exceptionResult.matched && exceptionResult.exceptionId) {
        const exc = DOCUMENTED_SCOPE_EXCEPTIONS.find((e) => e.id === exceptionResult.exceptionId);
        if (exc) {
          const proxyMapping = exc.proxyMappingId
            ? PROXY_METRIC_MAPPINGS.find((p) => p.id === exc.proxyMappingId)
            : undefined;
          const documentedKpi = exc.reportedKpiId
            ? DOCUMENTED_REPORTED_KPIS.find((k) => k.id === exc.reportedKpiId)
            : undefined;
          validCandidateMatches.push({ diagnostic, exception: exc, proxyMapping, documentedKpi });
        }
      }
    }

    if (validCandidateMatches.length === 1) {
      const match = validCandidateMatches[0];
      const validation = validateMarginTriplet(
        match.diagnostic.revenue,
        match.diagnostic.profit,
        match.diagnostic.margin,
        undefined,
        {
          proxyMapping: match.proxyMapping,
          documentedKpi: match.documentedKpi,
          exception: match.exception,
        }
      );

      if (validation.status === 'verified') {
        marginValidationVerified++;
      } else if (validation.status === 'proxy_only') {
        marginValidationProxyOnly++;
      } else if (validation.status === 'needs_review') {
        marginValidationNeedsReview++;
      } else if (validation.status === 'invalid') {
        marginValidationInvalid++;
      }

      const finding = createAuditFindingFromMarginValidation(
        validation,
        companyId,
        period,
        periodType,
        {
          proxyMapping: match.proxyMapping,
          documentedKpi: match.documentedKpi,
          exception: match.exception,
        }
      );
      if (finding) {
        findings.push(finding);
      }
    } else if (validCandidateMatches.length > 1) {
      findings.push({
        severity: 'WARNING',
        disposition: 'blocking',
        category: 'AMBIGUOUS_SELECTION',
        item: `${companyId} (${period}, ${periodType})`,
        detail: `Ambiguous candidate exception match: ${validCandidateMatches.length} candidate triplets matched documented exceptions.`,
      });
    } else {
      findings.push({
        severity: 'WARNING',
        disposition: 'blocking',
        category: 'SCOPE_MISMATCH',
        item: `${companyId} (${period}, ${periodType})`,
        detail: `Incompatible margin triplet — no approved documented exception found for candidate observations. ${selection.reasons.join('; ')}`,
      });
    }
  } else if (selection.status === 'missing') {
    // marginSelectionMissing Definition (STEP 4-5, P2):
    // Incomplete triplet where operating_margin was officially reported by the OEM,
    // but the required revenue denominator or profit numerator is missing from the dataset.
    // If no operating_margin was reported for this period, no finding is generated.
    const marginCands = periodObservations.filter(
      (o) => o.metricId === 'operating_margin' && o.value !== null
    );
    if (marginCands.length > 0) {
      marginSelectionMissing++;
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SCOPE_MISMATCH',
        item: `${companyId} (${period}, ${periodType})`,
        detail: selection.reasons.join('; '),
      });
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 6. BEV Share Candidate-Based Consistency Check
//
//    BEV scope exceptions are NOT supported via documented exceptions.
//    All BEV scope incompatibilities are blocking or review findings.
//    Rationale: BEV share is a standardized count-based metric where scope
//    divergence is a data error, not a reporting convention.
//
//    This policy is intentional and tested in tests/scope-exceptions.test.ts.
// ────────────────────────────────────────────────────────────────────────────
let bevSelectionMatched = 0;
let bevSelectionMissing = 0;
let bevSelectionAmbiguous = 0;
let bevSelectionIncompatible = 0;

let bevValidationVerified = 0;
let bevValidationNeedsReview = 0;
let bevValidationScopeWarning = 0;

companyPeriodTypes.forEach((cpt) => {
  const [companyId, period, periodType] = cpt.split('|');

  // Use periodType-filtered observations to prevent quarterly/annual mixing
  const periodObservations = METRIC_OBSERVATIONS.filter(
    (o) => o.companyId === companyId && o.period === period && o.periodType === periodType
  );

  const selection = selectCompatibleBevShareTriplets(periodObservations, companyId, period);

  if (selection.status === 'matched') {
    bevSelectionMatched++;
    const validation = validateBEVShare(selection.totalDelivery, selection.bevDelivery, selection.reportedShare);

    if (validation.validationStatus === 'verified') {
      bevValidationVerified++;
    } else if (validation.validationStatus === 'needs_review') {
      bevValidationNeedsReview++;
      findings.push({
        severity: 'WARNING',
        disposition: 'blocking',
        category: 'MATH_MISMATCH',
        item: `${companyId} (${period}, ${periodType})`,
        observationIds: validation.matchedObservationIds,
        detail: validation.diagnostic,
      });
    } else if (validation.validationStatus === 'scope_warning') {
      bevValidationScopeWarning++;
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SCOPE_MISMATCH',
        item: `${companyId} (${period}, ${periodType})`,
        observationIds: validation.matchedObservationIds,
        detail: validation.diagnostic,
      });
    }
  } else if (selection.status === 'ambiguous') {
    bevSelectionAmbiguous++;
    findings.push({
      severity: 'WARNING',
      disposition: 'blocking',
      category: 'AMBIGUOUS_SELECTION',
      item: `${companyId} (${period}, ${periodType})`,
      detail: selection.reasons.join('; '),
    });
  } else if (selection.status === 'incompatible') {
    // BEV scope incompatibility is always blocking — no documented exceptions supported.
    bevSelectionIncompatible++;
    findings.push({
      severity: 'WARNING',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: `${companyId} (${period}, ${periodType})`,
      detail: `BEV scope incompatibility (blocking — documented exceptions not supported for BEV): ${selection.reasons.join('; ')}`,
    });
  } else if (selection.status === 'missing') {
    const shareCands = periodObservations.filter(
      (o) => o.metricId === 'bev_share' && o.value !== null
    );
    if (shareCands.length > 0) {
      bevSelectionMissing++;
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Source Provenance Completeness
// ────────────────────────────────────────────────────────────────────────────
let missingPageCount = 0;
let missingOriginalLabelCount = 0;

METRIC_OBSERVATIONS.forEach((obs) => {
  if (!obs.pageNumber) missingPageCount++;
  if (!obs.originalLabel) missingOriginalLabelCount++;
});

// 8. Fiscal Year / Calendar Alignment Check
const fiscalYearMisalignments: string[] = [];
COMPANIES_REGISTRY.forEach((comp) => {
  if (comp.fiscalYearEnd !== 'Dec 31') {
    fiscalYearMisalignments.push(`${comp.name} (FY End: ${comp.fiscalYearEnd})`);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Output Audit Summary
// ────────────────────────────────────────────────────────────────────────────
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('📊 AUDIT EXECUTION SUMMARY & SEPARATE COUNTERS');
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log(`Margin Selection (grouped by companyId|period|periodType):`);
console.log(`  matched:      ${marginSelectionMatched}`);
console.log(`  missing:      ${marginSelectionMissing}`);
console.log(`  ambiguous:    ${marginSelectionAmbiguous}`);
console.log(`  incompatible: ${marginSelectionIncompatible}\n`);

console.log(`Margin Validation:`);
console.log(`  verified:     ${marginValidationVerified}`);
console.log(`  proxy_only:   ${marginValidationProxyOnly}`);
console.log(`  needs_review: ${marginValidationNeedsReview}`);
console.log(`  invalid:      ${marginValidationInvalid}\n`);

console.log(`BEV Selection (grouped by companyId|period|periodType):`);
console.log(`  matched:      ${bevSelectionMatched}`);
console.log(`  missing:      ${bevSelectionMissing}`);
console.log(`  ambiguous:    ${bevSelectionAmbiguous}`);
console.log(`  incompatible: ${bevSelectionIncompatible}\n`);

console.log(`BEV Validation:`);
console.log(`  verified:      ${bevValidationVerified}`);
console.log(`  needs_review:  ${bevValidationNeedsReview}`);
console.log(`  scope_warning: ${bevValidationScopeWarning}\n`);

console.log(`Provenance:`);
console.log(`  valid:    ${provenanceValidCount}`);
console.log(`  warnings: ${provenanceWarningsCount}`);
console.log(`  errors:   ${provenanceErrorsCount}\n`);

console.log(`Metadata:`);
console.log(`  missing required fields:             ${missingMetadataCount}`);
console.log(`  observations missing page number:    ${missingPageCount} / ${METRIC_OBSERVATIONS.length}`);
console.log(`  observations missing original label: ${missingOriginalLabelCount} / ${METRIC_OBSERVATIONS.length}`);
console.log(`  non-calendar fiscal year entities:   ${fiscalYearMisalignments.join(', ')}\n`);

const blockingFindings = findings.filter((f) => f.disposition === 'blocking');
const reviewFindings = findings.filter((f) => f.disposition === 'review');
const documentedFindings = findings.filter((f) => f.disposition === 'documented');
const informationalFindings = findings.filter((f) => f.disposition === 'informational');

// Validate documented findings: each must have evidence (exceptionId + sourceDocIds)
const documentedWithoutEvidence = documentedFindings.filter(
  (f) => !f.exceptionId || !f.sourceDocIds || f.sourceDocIds.length === 0
);
if (documentedWithoutEvidence.length > 0) {
  documentedWithoutEvidence.forEach((f) => {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'UNCATEGORIZED',
      item: f.item ?? 'unknown',
      detail: `Documented finding missing required evidence: exceptionId="${f.exceptionId ?? 'missing'}", sourceDocIds=${JSON.stringify(f.sourceDocIds ?? [])}`,
    });
  });
}

console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('📊 AUDIT DISPOSITION & STRICT EXIT POLICY');
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log(`Blocking findings:            ${blockingFindings.length}`);
console.log(`Review findings:              ${reviewFindings.length}`);
console.log(`Documented exceptions:        ${documentedFindings.length}`);
console.log(`  - with evidence:            ${documentedFindings.length - documentedWithoutEvidence.length}`);
console.log(`  - without evidence:         ${documentedWithoutEvidence.length}`);
console.log(`Informational corroborations: ${informationalFindings.length}`);
console.log(
  `Strict exit policy:           ${
    isStrict
      ? 'FAIL on any blocking or review findings (only documented exceptions and informational corroborations allowed)'
      : 'FAIL on blocking findings only'
  }`
);

const willFail = blockingFindings.length > 0 || (isStrict && reviewFindings.length > 0);
const exitCode = willFail ? 1 : 0;
console.log(`Strict exit code:             ${exitCode}\n`);

if (findings.length > 0) {
  console.log(`Findings Detail (${findings.length} total):`);
  findings.forEach((f, idx) => {
    const icon =
      f.disposition === 'blocking'
        ? '❌'
        : f.disposition === 'documented'
        ? 'ℹ️'
        : f.disposition === 'informational'
        ? '💬'
        : '⚠️';
    const excStr = f.exceptionId ? ` [Exception: ${f.exceptionId}]` : '';
    const proxyStr = f.proxyMappingId ? ` [Proxy: ${f.proxyMappingId}]` : '';
    const kpiStr = f.reportedKpiId ? ` [KPI: ${f.reportedKpiId}]` : '';
    const evidenceStr = `${excStr}${proxyStr}${kpiStr}`;
    console.log(`${icon} [${idx + 1}] [${f.severity}] [DISPOSITION: ${f.disposition}] [${f.category}] ${f.item}:${evidenceStr}`);
    console.log(`    ${f.detail}\n`);
  });
}

console.log('═════════════════════════════════════════════════════════════════════════════');
if (blockingFindings.length > 0) {
  console.error(`💥 Audit failed with ${blockingFindings.length} blocking structural errors.`);
  process.exit(1);
} else if (isStrict && reviewFindings.length > 0) {
  console.error(`⚠️ Strict mode failed with ${reviewFindings.length} review findings.`);
  process.exit(1);
} else {
  const docCount = documentedFindings.length - documentedWithoutEvidence.length;
  console.log(
    `✨ Scope-Safe Audit Passed with 0 blocking errors. (${docCount} evidence-backed documented exceptions, ${informationalFindings.length} corroborations)`
  );
  process.exit(0);
}
