/**
 * AutoMetrics Intelligence — Complete Scope-Safe Data & Financial Integrity Audit Script
 *
 * Implements Phase 11, Step 2, and Step 2 Fix requirements:
 * - Differentiates mathematical mismatch, scope mismatch, accounting basis mismatch, and unit mismatch
 * - Candidate-based triplet matching (avoids arbitrary .find() selection)
 * - Scope-aware margin validation (Consolidated Group vs Automotive Segment vs Cars Segment)
 * - Category-based required metadata verification
 * - Exit code behavior: Exit 1 on critical blocking ERROR / needs_review / math mismatch in --strict, Exit 0 on clean run.
 */

import { COMPANIES_REGISTRY, COMPANIES_MAP } from '../src/data/companies';
import { METRIC_DEFINITIONS, METRICS_MAP } from '../src/data/metricDefinitions';
import { METRIC_OBSERVATIONS } from '../src/data/observations';
import { SOURCE_DOCUMENTS, SOURCES_MAP } from '../src/data/sources';
import { GUIDANCE_OBSERVATIONS } from '../src/data/guidance';
import { REGIONAL_OBSERVATIONS } from '../src/data/regionalObservations';
import { validateMarginScopeCompatibility } from '../src/utils/metricCalculations';
import { MetricObservation } from '../src/types/metrics';

const isStrict = process.argv.includes('--strict');

interface AuditFinding {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  category:
    | 'DUPLICATE'
    | 'FOREIGN_KEY'
    | 'MATH_MISMATCH'
    | 'SCOPE_MISMATCH'
    | 'ACCOUNTING_BASIS_MISMATCH'
    | 'SOURCE_METADATA'
    | 'FISCAL_CALENDAR'
    | 'REQUIRED_METADATA';
  item: string;
  detail: string;
}

const findings: AuditFinding[] = [];

console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('🔍 AutoMetrics Intelligence — Scope-Safe Data & Financial Audit Engine (v2.1)');
console.log('═════════════════════════════════════════════════════════════════════════════\n');

// 1. Core Inventory Count
console.log(`[INVENTORY] Registered Automakers:           ${COMPANIES_REGISTRY.length}`);
console.log(`[INVENTORY] Metric Definitions:              ${METRIC_DEFINITIONS.length}`);
console.log(`[INVENTORY] Financial & Volume Observations: ${METRIC_OBSERVATIONS.length}`);
console.log(`[INVENTORY] Primary Source Documents:        ${SOURCE_DOCUMENTS.length}`);
console.log(`[INVENTORY] Forward-Looking Guidance Items:  ${GUIDANCE_OBSERVATIONS.length}`);
console.log(`[INVENTORY] Regional Delivery Observations:  ${REGIONAL_OBSERVATIONS.length}\n`);

// 2. Structural & Duplicate Check
const obsKeys = new Map<string, string>();
METRIC_OBSERVATIONS.forEach((obs) => {
  const key = `${obs.companyId}|${obs.metricId}|${obs.period}`;
  if (obsKeys.has(key)) {
    findings.push({
      severity: 'ERROR',
      category: 'DUPLICATE',
      item: obs.id,
      detail: `Duplicate observation key for ${key} (existing: ${obsKeys.get(key)})`,
    });
  } else {
    obsKeys.set(key, obs.id);
  }
});

// 3. Foreign Key & Entity Integrity Check
METRIC_OBSERVATIONS.forEach((obs) => {
  if (!COMPANIES_MAP[obs.companyId]) {
    findings.push({
      severity: 'ERROR',
      category: 'FOREIGN_KEY',
      item: obs.id,
      detail: `Unknown companyId: ${obs.companyId}`,
    });
  }
  if (!METRICS_MAP[obs.metricId]) {
    findings.push({
      severity: 'ERROR',
      category: 'FOREIGN_KEY',
      item: obs.id,
      detail: `Unknown metricId: ${obs.metricId}`,
    });
  }
  if (obs.sourceDocId && !SOURCES_MAP[obs.sourceDocId]) {
    findings.push({
      severity: 'ERROR',
      category: 'FOREIGN_KEY',
      item: obs.id,
      detail: `Missing sourceDocId in sources registry: ${obs.sourceDocId}`,
    });
  }
  if (obs.valueType === 'reported' && !obs.sourceDocId) {
    findings.push({
      severity: 'WARNING',
      category: 'SOURCE_METADATA',
      item: obs.id,
      detail: `Reported observation is missing sourceDocId link`,
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
        category: 'REQUIRED_METADATA',
        item: obs.id,
        detail: `Financial metric "${obs.metricId}" is missing required reportingScope.`,
      });
    }
    if (!obs.accountingBasis || obs.accountingBasis === 'unknown') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        detail: `Financial metric "${obs.metricId}" is missing required accountingBasis.`,
      });
    }
    if (obs.unit.startsWith('currency') && !obs.currency) {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
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
        category: 'REQUIRED_METADATA',
        item: obs.id,
        detail: `Delivery metric "${obs.metricId}" is missing required volumeDefinition.`,
      });
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
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
        category: 'REQUIRED_METADATA',
        item: obs.id,
        detail: `Derived metric "${obs.metricId}" is missing required verificationStatus.`,
      });
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      missingMetadataCount++;
      findings.push({
        severity: 'ERROR',
        category: 'REQUIRED_METADATA',
        item: obs.id,
        detail: `Derived metric "${obs.metricId}" is missing required reportingScope.`,
      });
    }
  }
});

// 5. Candidate-Based Margin Scope Validation (Replacing unsafe .find())
const companyPeriods = new Set<string>();
METRIC_OBSERVATIONS.forEach((obs) => {
  companyPeriods.add(`${obs.companyId}|${obs.period}`);
});

let scopeAwareChecks = 0;
let scopeWarningsCount = 0;
let mathMismatchCount = 0;
let ambiguousCombinationsCount = 0;
let missingPairCount = 0;

companyPeriods.forEach((cp) => {
  const [companyId, period] = cp.split('|');

  // Collect candidate observations
  const revCandidates = METRIC_OBSERVATIONS.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'revenue' && o.value !== null
  );
  const ebitCandidates = METRIC_OBSERVATIONS.filter(
    (o) =>
      o.companyId === companyId &&
      o.period === period &&
      (o.metricId === 'operating_income' || o.metricId === 'ebit' || o.metricId === 'adjusted_ebit') &&
      o.value !== null
  );
  const marginCandidates = METRIC_OBSERVATIONS.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'operating_margin' && o.value !== null
  );

  if (marginCandidates.length > 0 && (revCandidates.length === 0 || ebitCandidates.length === 0)) {
    missingPairCount++;
    findings.push({
      severity: 'WARNING',
      category: 'SCOPE_MISMATCH',
      item: `${companyId} (${period})`,
      detail: `Reported margin exists but missing compatible revenue (${revCandidates.length}) or EBIT (${ebitCandidates.length}) candidate.`,
    });
    return;
  }

  if (revCandidates.length > 0 && ebitCandidates.length > 0 && marginCandidates.length > 0) {
    scopeAwareChecks++;

    // Look for fully compatible triplets
    const compatibleTriplets: { rev: MetricObservation; ebit: MetricObservation; margin: MetricObservation }[] = [];

    for (const rev of revCandidates) {
      for (const ebit of ebitCandidates) {
        for (const margin of marginCandidates) {
          if (
            rev.reportingScope === ebit.reportingScope &&
            ebit.reportingScope === margin.reportingScope &&
            rev.accountingBasis === ebit.accountingBasis &&
            ebit.accountingBasis === margin.accountingBasis &&
            rev.currency === ebit.currency &&
            rev.unit === ebit.unit
          ) {
            compatibleTriplets.push({ rev, ebit, margin });
          }
        }
      }
    }

    if (compatibleTriplets.length > 1) {
      ambiguousCombinationsCount++;
      findings.push({
        severity: 'WARNING',
        category: 'SCOPE_MISMATCH',
        item: `${companyId} (${period})`,
        detail: `Ambiguous candidates: found ${compatibleTriplets.length} compatible candidate triplets.`,
      });
    } else if (compatibleTriplets.length === 1) {
      const { rev, ebit, margin } = compatibleTriplets[0];
      const validation = validateMarginScopeCompatibility(rev, ebit, margin);

      if (validation.validationStatus === 'needs_review') {
        mathMismatchCount++;
        findings.push({
          severity: 'WARNING',
          category: 'MATH_MISMATCH',
          item: `${companyId} (${period})`,
          detail: validation.diagnostic,
        });
      }
    } else {
      // No fully compatible triplet exists across scopes/bases (e.g. BMW / Mercedes-Benz segment margins)
      const validation = validateMarginScopeCompatibility(revCandidates[0], ebitCandidates[0], marginCandidates[0]);
      if (validation.validationStatus === 'scope_warning') {
        scopeWarningsCount++;
        findings.push({
          severity: 'WARNING',
          category: 'SCOPE_MISMATCH',
          item: `${companyId} (${period})`,
          detail: validation.diagnostic,
        });
      } else if (validation.validationStatus === 'needs_review') {
        mathMismatchCount++;
        findings.push({
          severity: 'WARNING',
          category: 'MATH_MISMATCH',
          item: `${companyId} (${period})`,
          detail: validation.diagnostic,
        });
      }
    }
  }
});

// 6. BEV Share Candidate-Based Consistency Check
let bevShareChecks = 0;
companyPeriods.forEach((cp) => {
  const [companyId, period] = cp.split('|');
  const totDelCandidates = METRIC_OBSERVATIONS.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'deliveries_global' && o.value !== null
  );
  const bevDelCandidates = METRIC_OBSERVATIONS.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'bev_deliveries' && o.value !== null
  );
  const bevShareCandidates = METRIC_OBSERVATIONS.filter(
    (o) => o.companyId === companyId && o.period === period && o.metricId === 'bev_share' && o.value !== null
  );

  if (totDelCandidates.length > 0 && bevDelCandidates.length > 0 && bevShareCandidates.length > 0) {
    bevShareChecks++;
    const tot = totDelCandidates[0].value!;
    const bev = bevDelCandidates[0].value!;
    const reportedShare = bevShareCandidates[0].value!;

    if (tot > 0) {
      const calculatedShare = (bev / tot) * 100;
      const diff = Math.abs(calculatedShare - reportedShare);
      if (diff > 0.35) {
        mathMismatchCount++;
        findings.push({
          severity: 'WARNING',
          category: 'MATH_MISMATCH',
          item: `${companyId} (${period})`,
          detail: `Reported BEV share is ${reportedShare}%, but calculated is ${calculatedShare.toFixed(2)}% (${bev}k / ${tot}k).`,
        });
      }
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

// Classify and tally
const errors = findings.filter((f) => f.severity === 'ERROR');
const warnings = findings.filter((f) => f.severity === 'WARNING');
const infos = findings.filter((f) => f.severity === 'INFO');

// Output Audit Summary
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log('📊 AUDIT EXECUTION SUMMARY');
console.log('═════════════════════════════════════════════════════════════════════════════');
console.log(`- Scope-Aware Margin Checks:                         ${scopeAwareChecks}`);
console.log(`- Segment vs Group Scope Warnings:                   ${scopeWarningsCount}`);
console.log(`- Mathematical Deviation Warnings:                   ${mathMismatchCount}`);
console.log(`- Ambiguous Candidate Combinations:                  ${ambiguousCombinationsCount}`);
console.log(`- Missing Candidate Observation Pairs:               ${missingPairCount}`);
console.log(`- Missing Required Category Metadata:                ${missingMetadataCount}`);
console.log(`- BEV Share Consistency Checks:                      ${bevShareChecks}`);
console.log(`- Observations missing exact page number:            ${missingPageCount} / ${METRIC_OBSERVATIONS.length}`);
console.log(`- Observations missing original reported label:      ${missingOriginalLabelCount} / ${METRIC_OBSERVATIONS.length}`);
console.log(`- Non-Calendar Fiscal Year Entities:                 ${fiscalYearMisalignments.join(', ')}\n`);

console.log(`Total Findings: ${findings.length} (${errors.length} Errors, ${warnings.length} Warnings, ${infos.length} Info)\n`);

findings.forEach((f, idx) => {
  const icon = f.severity === 'ERROR' ? '❌' : f.severity === 'WARNING' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [${idx + 1}] [${f.severity}] [${f.category}] ${f.item}:`);
  console.log(`    ${f.detail}\n`);
});

console.log('═════════════════════════════════════════════════════════════════════════════');
const blockingErrors = findings.filter((f) => f.severity === 'ERROR');
const unexpectedWarnings = findings.filter((f) => f.severity === 'WARNING' && f.category !== 'SCOPE_MISMATCH');

if (blockingErrors.length > 0) {
  console.error(`💥 Audit failed with ${blockingErrors.length} blocking structural errors.`);
  process.exit(1);
} else if (isStrict && unexpectedWarnings.length > 0) {
  console.error(`⚠️ Strict mode failed with ${unexpectedWarnings.length} unexpected warnings.`);
  process.exit(1);
} else {
  console.log(`✨ Scope-Safe Audit Passed with 0 blocking errors. (${scopeWarningsCount} documented segment scope warnings)`);
  process.exit(0);
}
