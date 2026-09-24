import { COMPANIES_REGISTRY, COMPANIES_MAP } from '../src/data/companies';
import { METRIC_DEFINITIONS, METRICS_MAP } from '../src/data/metricDefinitions';
import { METRIC_OBSERVATIONS } from '../src/data/observations';
import { SOURCE_DOCUMENTS, SOURCES_MAP } from '../src/data/sources';
import { GUIDANCE_OBSERVATIONS } from '../src/data/guidance';
import { REGIONAL_OBSERVATIONS } from '../src/data/regionalObservations';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

console.log('🧪 Starting Data Integrity & Schema Validation Suite...\n');

// 1. Companies Registry Integrity
assert(COMPANIES_REGISTRY.length >= 10, 'Company Registry: Has at least 10 companies registered');
COMPANIES_REGISTRY.forEach((c) => {
  assert(!!c.id && !!c.name && !!c.irUrl && !!c.reportingCurrency, `Company ${c.name}: has required metadata`);
});

// 2. Metrics Registry Integrity
assert(METRIC_DEFINITIONS.length >= 10, 'Metric Definitions: Has at least 10 metrics registered');
METRIC_DEFINITIONS.forEach((m) => {
  assert(!!m.id && !!m.name && !!m.category && !!m.unit, `Metric ${m.id}: has valid definition`);
});

// 3. Observations Integrity & Source Linkages
const seenObsKeys = new Set<string>();
METRIC_OBSERVATIONS.forEach((obs) => {
  const key = `${obs.companyId}_${obs.metricId}_${obs.period}`;
  assert(!seenObsKeys.has(key), `Observation uniqueness: ${key} is not duplicated`);
  seenObsKeys.add(key);

  assert(!!COMPANIES_MAP[obs.companyId], `Observation ${obs.id}: companyId ${obs.companyId} exists in registry`);
  assert(!!METRICS_MAP[obs.metricId], `Observation ${obs.id}: metricId ${obs.metricId} exists in registry`);

  if (obs.sourceDocId) {
    assert(!!SOURCES_MAP[obs.sourceDocId], `Observation ${obs.id}: sourceDocId ${obs.sourceDocId} exists in sources`);
  }

  if (!obs.isComparable) {
    assert(!!obs.nonComparableReason, `Observation ${obs.id}: Non-comparable metric has explicit nonComparableReason`);
  }
});

// 4. Source Documents Verification
SOURCE_DOCUMENTS.forEach((doc) => {
  assert(doc.officialUrl.startsWith('https://'), `Source ${doc.id}: officialUrl must be HTTPS`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(doc.publicationDate), `Source ${doc.id}: valid ISO publication date`);
  assert(!!COMPANIES_MAP[doc.companyId], `Source ${doc.id}: company ${doc.companyId} exists`);
});

// 5. Guidance Integrity
GUIDANCE_OBSERVATIONS.forEach((g) => {
  assert(!!COMPANIES_MAP[g.companyId], `Guidance ${g.id}: companyId ${g.companyId} exists`);
  assert(!!METRICS_MAP[g.metricId], `Guidance ${g.id}: metricId ${g.metricId} exists`);
  assert(!!SOURCES_MAP[g.sourceDocId], `Guidance ${g.id}: sourceDocId ${g.sourceDocId} exists`);
  if (g.min !== undefined && g.max !== undefined) {
    assert(g.min <= g.max, `Guidance ${g.id}: min (${g.min}) <= max (${g.max})`);
  }
});

// 6. Regional Observations Integrity
REGIONAL_OBSERVATIONS.forEach((reg) => {
  assert(!!COMPANIES_MAP[reg.companyId], `Regional ${reg.id}: companyId ${reg.companyId} exists`);
  assert(!!SOURCES_MAP[reg.sourceDocId], `Regional ${reg.id}: sourceDocId ${reg.sourceDocId} exists`);
});

console.log(`\nIntegrity Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Data Integrity Tests Passed Cleanly!\n');
}

