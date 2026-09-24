import { COMPANIES_REGISTRY, COMPANIES_MAP } from '../src/data/companies';
import { METRIC_DEFINITIONS, METRICS_MAP } from '../src/data/metricDefinitions';
import { METRIC_OBSERVATIONS } from '../src/data/observations';
import { SOURCE_DOCUMENTS, SOURCES_MAP } from '../src/data/sources';
import { GUIDANCE_OBSERVATIONS } from '../src/data/guidance';
import { REGIONAL_OBSERVATIONS } from '../src/data/regionalObservations';

console.log('🚀 Running AutoMetrics Data Ingestion & Strict Integrity Validator...\n');

let errorCount = 0;
let warningCount = 0;

console.log(`📊 Total Registered Automakers: ${COMPANIES_REGISTRY.length}`);
console.log(`📈 Total Metric Definitions: ${METRIC_DEFINITIONS.length}`);
console.log(`📑 Total Verified Primary Source Documents: ${SOURCE_DOCUMENTS.length}`);
console.log(`🔢 Total Metric Observations: ${METRIC_OBSERVATIONS.length}`);
console.log(`🎯 Total Guidance Targets: ${GUIDANCE_OBSERVATIONS.length}`);
console.log(`🗺️  Total Regional Observations: ${REGIONAL_OBSERVATIONS.length}\n`);

// 1. Source Document HTTPS & Integrity
SOURCE_DOCUMENTS.forEach((doc) => {
  if (!doc.officialUrl.startsWith('https://')) {
    console.error(`❌ Source ${doc.id}: Insecure or non-HTTPS URL (${doc.officialUrl})`);
    errorCount++;
  }
  if (!COMPANIES_MAP[doc.companyId]) {
    console.error(`❌ Source ${doc.id}: Unknown companyId ${doc.companyId}`);
    errorCount++;
  }
});

// 2. Metric Observations Strict Required Metadata Check by Category
METRIC_OBSERVATIONS.forEach((obs) => {
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
  if (obs.sourceDocId && !SOURCES_MAP[obs.sourceDocId]) {
    console.error(`❌ Observation ${obs.id}: Unknown sourceDocId "${obs.sourceDocId}"`);
    errorCount++;
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

