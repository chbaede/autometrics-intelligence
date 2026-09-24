/**
 * AutoMetrics Intelligence — Complete Scope-Safe Data & Financial Integrity Audit Script (v2.2)
 *
 * Implements hardened validation policy with explicit finding dispositions,
 * separate metric counters, and canonical observation identity keys.
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
  selectCompatibleBevShareTriplets,
  validateBEVShare,
  validateObservationProvenance,
  getCanonicalObservationKey,
} from '../src/utils/metricCalculations';
import { AuditFinding } from '../src/types/metrics';

const isStrict = process.argv.includes('--strict');

const findings: AuditFinding[] = [];

console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('🔍 AutoMetrics Intelligence — Scope-Safe Data & Financial Audit Engine (v2.2)');
console.log('═════════════════════════════════════════════════════════════════════════════\n');

// 1. Inventory counts
console.log(`[INVENTORY] Registered Automakers:           ${COMPANIES_REGISTRY.length}`);
console.log(`[INVENTORY] Metric Definitions:              ${METRIC_DEFINITIONS.length}`);
console.log(`[INVENTORY] Financial & Volume Observations: ${METRIC_OBSERVATIONS.length}`);
console.log(`[INVENTORY] Primary Source Documents:        ${SOURCE_DOCUMENTS.length}`);
console.log(`[INVENTORY] Forward-Looking Guidance Items:  ${GUIDANCE_OBSERVATIONS.length}`);
console.log(`[INVENTORY] Regional Delivery Observations:  ${REGIONAL_OBSERVATIONS.length}\n`);

// 2. Canonical Identity & Duplicate Check
const canonicalObsMap = new Map<string, string>();
METRIC_OBSERVATIONS.forEach((obs) => {
  const canonicalKey = getCanonicalObservationKey(obs);
  if (canonicalObsMap.has(canonicalKey)) {
    findings.push({
      severity: 'ERROR',
      disposition: 'blocking',
      category: 'DUPLICATE',
      item: obs.id,
      detail: `Exact duplicate observation key: [${canonicalKey}] (conflicts with ${canonicalObsMap.get(canonicalKey)})`,
    });
  } else {
    canonicalObsMap.set(canonicalKey, obs.id);
  }
});

// 3. Source Document Provenance & Entity Cross-Validation
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
      detail: provenanceResult.reasons.join('; '),
    });
  } else if (provenanceResult.severity === 'WARNING') {
    provenanceWarningsCount++;
    findings.push({
      severity: 'WARNING',
      disposition: 'review',
      category: 'SOURCE_METADATA',
      item: obs.id,
      detail: provenanceResult.reasons.join('; '),
    });
  }
});

// 4. Strict Required Metadata Validation by Metric Category
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
        detail: `Derived metric "${obs.metricId}" is missing required reportingScope.`,
      });
    }
  }
});

// 5. Candidate-Based Margin Scope Validation & Verification
const companyPeriods = new Set<string>();
METRIC_OBSERVATIONS.forEach((obs) => {
  companyPeriods.add(`${obs.companyId}|${obs.period}`);
});

let marginSelectionMatched = 0;
let marginSelectionMissing = 0;
let marginSelectionAmbiguous = 0;
let marginSelectionIncompatible = 0;

let marginValidationVerified = 0;
let marginValidationNeedsReview = 0;
let marginValidationInvalid = 0;

companyPeriods.forEach((cp) => {
  const [companyId, period] = cp.split('|');
  const selection = selectCompatibleMarginTriplets(METRIC_OBSERVATIONS, companyId, period);

  if (selection.status === 'matched') {
    marginSelectionMatched++;
    const validation = validateMarginTriplet(selection.revenue, selection.profit, selection.margin);

    if (validation.status === 'verified') {
      marginValidationVerified++;
    } else if (validation.status === 'invalid') {
      marginValidationInvalid++;
      findings.push({
        severity: 'ERROR',
        disposition: 'blocking',
        category: 'MATH_MISMATCH',
        item: `${companyId} (${period})`,
        detail: validation.diagnostic,
      });
    } else if (validation.status === 'needs_review') {
      marginValidationNeedsReview++;
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SCOPE_MISMATCH',
        item: `${companyId} (${period})`,
        detail: validation.diagnostic,
      });
    }
  } else if (selection.status === 'ambiguous') {
    marginSelectionAmbiguous++;
    findings.push({
      severity: 'WARNING',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: `${companyId} (${period})`,
      detail: selection.reasons.join('; '),
    });
  } else if (selection.status === 'incompatible') {
    marginSelectionIncompatible++;
    // Documented segment-scope divergence check (BMW Group Automotive RoS, Mercedes-Benz Cars Adjusted RoS)
    const isDocumentedScopeDivergence =
      (companyId === 'bmw_group' || companyId === 'mercedes_benz') &&
      selection.failedChecks?.some((c) => c === 'reportingScope' || c === 'accountingBasis' || c === 'metricDefinition');

    findings.push({
      severity: 'WARNING',
      disposition: isDocumentedScopeDivergence ? 'documented' : 'blocking',
      category: 'SCOPE_MISMATCH',
      item: `${companyId} (${period})`,
      detail: selection.reasons.join('; '),
    });
  } else if (selection.status === 'missing') {
    const marginCands = METRIC_OBSERVATIONS.filter(
      (o) => o.companyId === companyId && o.period === period && o.metricId === 'operating_margin' && o.value !== null
    );
    if (marginCands.length > 0) {
      marginSelectionMissing++;
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SCOPE_MISMATCH',
        item: `${companyId} (${period})`,
        detail: selection.reasons.join('; '),
      });
    }
  }
});

// 6. BEV Share Candidate-Based Consistency Check
let bevSelectionMatched = 0;
let bevSelectionMissing = 0;
let bevSelectionAmbiguous = 0;
let bevSelectionIncompatible = 0;

let bevValidationVerified = 0;
let bevValidationNeedsReview = 0;
let bevValidationScopeWarning = 0;

companyPeriods.forEach((cp) => {
  const [companyId, period] = cp.split('|');
  const selection = selectCompatibleBevShareTriplets(METRIC_OBSERVATIONS, companyId, period);

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
        item: `${companyId} (${period})`,
        detail: validation.diagnostic,
      });
    } else if (validation.validationStatus === 'scope_warning') {
      bevValidationScopeWarning++;
      findings.push({
        severity: 'WARNING',
        disposition: 'review',
        category: 'SCOPE_MISMATCH',
        item: `${companyId} (${period})`,
        detail: validation.diagnostic,
      });
    }
  } else if (selection.status === 'ambiguous') {
    bevSelectionAmbiguous++;
    findings.push({
      severity: 'WARNING',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: `${companyId} (${period})`,
      detail: selection.reasons.join('; '),
    });
  } else if (selection.status === 'incompatible') {
    bevSelectionIncompatible++;
    findings.push({
      severity: 'WARNING',
      disposition: 'blocking',
      category: 'SCOPE_MISMATCH',
      item: `${companyId} (${period})`,
      detail: selection.reasons.join('; '),
    });
  } else if (selection.status === 'missing') {
    const shareCands = METRIC_OBSERVATIONS.filter(
      (o) => o.companyId === companyId && o.period === period && o.metricId === 'bev_share' && o.value !== null
    );
    if (shareCands.length > 0) {
      bevSelectionMissing++;
    }
  }
});

// 7. Source Provenance Completeness
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

// Output Audit Summary
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('📊 AUDIT EXECUTION SUMMARY & SEPARATE COUNTERS');
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log(`Margin Selection:`);
console.log(`  matched:      ${marginSelectionMatched}`);
console.log(`  missing:      ${marginSelectionMissing}`);
console.log(`  ambiguous:    ${marginSelectionAmbiguous}`);
console.log(`  incompatible: ${marginSelectionIncompatible}\n`);

console.log(`Margin Validation:`);
console.log(`  verified:     ${marginValidationVerified}`);
console.log(`  needs_review: ${marginValidationNeedsReview}`);
console.log(`  invalid:      ${marginValidationInvalid}\n`);

console.log(`BEV Selection:`);
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

console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('📊 AUDIT DISPOSITION & STRICT EXIT POLICY');
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log(`Blocking findings:   ${blockingFindings.length}`);
console.log(`Review findings:     ${reviewFindings.length}`);
console.log(`Documented findings: ${documentedFindings.length}`);
console.log(`Strict exit policy:  ${isStrict ? 'FAIL on any blocking or review findings (only documented findings allowed)' : 'FAIL on blocking findings only'}`);

const willFail = blockingFindings.length > 0 || (isStrict && reviewFindings.length > 0);
const exitCode = willFail ? 1 : 0;
console.log(`Strict exit code:    ${exitCode}\n`);

if (findings.length > 0) {
  console.log(`Findings Detail (${findings.length} total):`);
  findings.forEach((f, idx) => {
    const icon = f.disposition === 'blocking' ? '❌' : f.disposition === 'documented' ? 'ℹ️' : '⚠️';
    console.log(`${icon} [${idx + 1}] [${f.severity}] [DISPOSITION: ${f.disposition}] [${f.category}] ${f.item}:`);
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
  console.log(`✨ Scope-Safe Audit Passed with 0 blocking errors. (${documentedFindings.length} documented segment scope disclosures)`);
  process.exit(0);
}
