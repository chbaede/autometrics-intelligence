import { COMPANIES_REGISTRY, COMPANIES_MAP } from '../src/data/companies';
import { METRIC_DEFINITIONS, METRICS_MAP } from '../src/data/metricDefinitions';
import { METRIC_OBSERVATIONS } from '../src/data/observations';
import { SOURCE_DOCUMENTS, SOURCES_MAP } from '../src/data/sources';
import { GUIDANCE_OBSERVATIONS } from '../src/data/guidance';
import { REGIONAL_OBSERVATIONS } from '../src/data/regionalObservations';

import { getDimensionalObservationKey, validateSourceClaims, validateSourceContentFixtures } from '../src/utils/metricCalculations';
import { DETERMINISTIC_SOURCE_CONTENT_FIXTURES } from '../src/data/scopeExceptions';

console.log('🚀 Running AutoMetrics Data Ingestion & Strict Integrity Validator...\n');

let errorCount = 0;
let warningCount = 0;
const observationKeys = new Set<string>();

console.log(`📊 Total Registered Automakers: ${COMPANIES_REGISTRY.length}`);
console.log(`📈 Total Metric Definitions: ${METRIC_DEFINITIONS.length}`);
console.log(`📑 Total Verified Primary Source Documents: ${SOURCE_DOCUMENTS.length}`);
console.log(`🔢 Total Metric Observations: ${METRIC_OBSERVATIONS.length}`);
console.log(`🎯 Total Guidance Targets: ${GUIDANCE_OBSERVATIONS.length}`);
console.log(`🗺️  Total Regional Observations: ${REGIONAL_OBSERVATIONS.length}\n`);

// 1. Source Document HTTPS & Comprehensive Metadata Integrity
const validPeriodTypes = ['quarterly', 'annual', 'semi_annual', 'monthly'];
const validVerificationStatuses = ['verified', 'unverified', 'pending_audit', 'disputed'];

SOURCE_DOCUMENTS.forEach((doc) => {
  if (!doc.officialUrl || !doc.officialUrl.startsWith('https://')) {
    console.error(`❌ Source ${doc.id}: Insecure or non-HTTPS URL (${doc.officialUrl})`);
    errorCount++;
  }
  if (!doc.companyId || !COMPANIES_MAP[doc.companyId]) {
    console.error(`❌ Source ${doc.id}: Unknown or missing companyId "${doc.companyId}"`);
    errorCount++;
  }
  if (!doc.period || !/^\d{4}-(Q[1-4]|FY|H[1-2])$/.test(doc.period)) {
    console.error(`❌ Source ${doc.id}: Missing or malformed period "${doc.period}"`);
    errorCount++;
  }
  if (!doc.periodType || !validPeriodTypes.includes(doc.periodType)) {
    console.error(`❌ Source ${doc.id}: Missing or invalid periodType "${doc.periodType}"`);
    errorCount++;
  }
  if (!doc.publicationDate || isNaN(Date.parse(doc.publicationDate))) {
    console.error(`❌ Source ${doc.id}: Missing or invalid publicationDate "${doc.publicationDate}"`);
    errorCount++;
  }
  if (!doc.verificationStatus || !validVerificationStatuses.includes(doc.verificationStatus)) {
    console.error(`❌ Source ${doc.id}: Missing or invalid verificationStatus "${doc.verificationStatus}"`);
    errorCount++;
  }
});

// Run source claims validator
const sourceClaimValResult = validateSourceClaims(SOURCE_DOCUMENTS, METRIC_OBSERVATIONS);
if (!sourceClaimValResult.valid) {
  for (const err of sourceClaimValResult.errors) {
    console.error(`❌ Source Claim Error (${err.code}): ${err.detail}`);
    errorCount++;
  }
}

// Run deterministic source content fixture validator (STEP 4-22, P1)
const fixtureValResult = validateSourceContentFixtures(DETERMINISTIC_SOURCE_CONTENT_FIXTURES, SOURCE_DOCUMENTS, METRIC_DEFINITIONS);
if (!fixtureValResult.valid) {
  for (const err of fixtureValResult.errors) {
    console.error(`❌ Source Content Fixture Error (${err.code}): ${err.detail}`);
    errorCount++;
  }
}

// 2. Metric Observations Strict Required Metadata Check by Category
METRIC_OBSERVATIONS.forEach((obs) => {
  // Check dimensional duplicate
  const canonicalKey = getDimensionalObservationKey(obs);
  if (observationKeys.has(canonicalKey)) {
    console.error(`❌ Duplicate Observation Key: "${canonicalKey}" (Obs ID: ${obs.id})`);
    errorCount++;
  } else {
    observationKeys.add(canonicalKey);
  }

  const metricDef = METRICS_MAP[obs.metricId];
  if (!metricDef) {
    console.error(`❌ Observation ${obs.id}: Unknown metricId "${obs.metricId}"`);
    errorCount++;
    return;
  }
  if (!COMPANIES_MAP[obs.companyId]) {
    console.error(`❌ Observation ${obs.id}: Unknown companyId "${obs.companyId}"`);
    errorCount++;
    return;
  }
  if (obs.sourceDocId) {
    const sourceDoc = SOURCES_MAP[obs.sourceDocId];
    if (!sourceDoc) {
      console.error(`❌ Observation ${obs.id}: Unknown sourceDocId "${obs.sourceDocId}"`);
      errorCount++;
    } else {
      if (sourceDoc.companyId && sourceDoc.companyId !== obs.companyId) {
        console.error(`❌ Observation ${obs.id}: companyId "${obs.companyId}" does not match source doc company "${sourceDoc.companyId}"`);
        errorCount++;
      }
      if (sourceDoc.period && sourceDoc.period !== obs.period) {
        console.error(`❌ Observation ${obs.id}: period "${obs.period}" does not match source doc period "${sourceDoc.period}"`);
        errorCount++;
      }
    }
  }

  // Non-comparable explanation check
  if (!obs.isComparable && !obs.nonComparableReason) {
    console.error(`❌ Observation ${obs.id}: Missing nonComparableReason explanation`);
    errorCount++;
  }

  // Financial Metrics: reportingScope required, accountingBasis required, currency required where applicable
  if (metricDef.category === 'financial' || obs.unit.startsWith('currency')) {
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      console.error(`❌ Financial Observation ${obs.id}: Missing or unknown reportingScope ("${obs.reportingScope}")`);
      errorCount++;
    }
    if (!obs.accountingBasis || obs.accountingBasis === 'unknown') {
      console.error(`❌ Financial Observation ${obs.id}: Missing or unknown accountingBasis ("${obs.accountingBasis}")`);
      errorCount++;
    }
    if (obs.unit.startsWith('currency') && !obs.currency) {
      console.error(`❌ Financial Observation ${obs.id}: Missing currency`);
      errorCount++;
    }
  }

  // Delivery / Sales Metrics: volumeDefinition required, reportingScope required
  if (metricDef.category === 'sales' || obs.unit === 'units' || obs.unit === 'thousand_units' || obs.metricId.includes('deliveries')) {
    if (!obs.volumeDefinition || obs.volumeDefinition === 'unknown') {
      console.error(`❌ Delivery Observation ${obs.id}: Missing or unknown volumeDefinition ("${obs.volumeDefinition}")`);
      errorCount++;
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      console.error(`❌ Delivery Observation ${obs.id}: Missing or unknown reportingScope ("${obs.reportingScope}")`);
      errorCount++;
    }
  }

  // Derived / Calculated Metrics: verificationStatus required, reportingScope required
  if (obs.valueType === 'derived' || metricDef.category === 'electrification' || obs.metricId === 'operating_margin') {
    if (!obs.verificationStatus || obs.verificationStatus === 'unverified') {
      console.error(`❌ Derived Observation ${obs.id}: Missing or unverified verificationStatus ("${obs.verificationStatus}")`);
      errorCount++;
    }
    if (!obs.reportingScope || obs.reportingScope === 'unknown') {
      console.error(`❌ Derived Observation ${obs.id}: Missing or unknown reportingScope ("${obs.reportingScope}")`);
      errorCount++;
    }
  }
});

// 3. Guidance Observations Checks
GUIDANCE_OBSERVATIONS.forEach((g) => {
  if (!COMPANIES_MAP[g.companyId]) {
    console.error(`❌ Guidance ${g.id}: Unknown companyId "${g.companyId}"`);
    errorCount++;
  }
  if (!METRICS_MAP[g.metricId]) {
    console.error(`❌ Guidance ${g.id}: Unknown metricId "${g.metricId}"`);
    errorCount++;
  }
  if (!SOURCES_MAP[g.sourceDocId]) {
    console.error(`❌ Guidance ${g.id}: Unknown sourceDocId "${g.sourceDocId}"`);
    errorCount++;
  }
});

// 4. Regional Observations Checks
REGIONAL_OBSERVATIONS.forEach((reg) => {
  if (!COMPANIES_MAP[reg.companyId]) {
    console.error(`❌ Regional ${reg.id}: Unknown companyId "${reg.companyId}"`);
    errorCount++;
  }
  if (!SOURCES_MAP[reg.sourceDocId]) {
    console.error(`❌ Regional ${reg.id}: Unknown sourceDocId "${reg.sourceDocId}"`);
    errorCount++;
  }
});

if (errorCount === 0) {
  console.log('✨ Strict Data Validation Succeeded! Zero integrity or metadata errors detected.\n');
  process.exit(0);
} else {
  console.error(`💥 Validation failed with ${errorCount} errors and ${warningCount} warnings.\n`);
  process.exit(1);
}

