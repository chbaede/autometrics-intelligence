import { COMPANIES_REGISTRY } from '../src/data/companies';
import { METRIC_DEFINITIONS } from '../src/data/metricDefinitions';
import { METRIC_OBSERVATIONS } from '../src/data/observations';
import { SOURCE_DOCUMENTS } from '../src/data/sources';
import { GUIDANCE_OBSERVATIONS } from '../src/data/guidance';
import { REGIONAL_OBSERVATIONS } from '../src/data/regionalObservations';

console.log('🚀 Running AutoMetrics Data Ingestion & Integrity Validator...\n');

let errorCount = 0;
let warningCount = 0;

console.log(`📊 Total Registered Automakers: ${COMPANIES_REGISTRY.length}`);
console.log(`📈 Total Metric Definitions: ${METRIC_DEFINITIONS.length}`);
console.log(`📑 Total Verified Primary Source Documents: ${SOURCE_DOCUMENTS.length}`);
console.log(`🔢 Total Metric Observations: ${METRIC_OBSERVATIONS.length}`);
console.log(`🎯 Total Guidance Targets: ${GUIDANCE_OBSERVATIONS.length}`);
console.log(`🗺️  Total Regional Observations: ${REGIONAL_OBSERVATIONS.length}\n`);

// Check HTTPS on all sources
SOURCE_DOCUMENTS.forEach((doc) => {
  if (!doc.officialUrl.startsWith('https://')) {
    console.error(`❌ Source ${doc.id}: Insecure or non-HTTPS URL (${doc.officialUrl})`);
    errorCount++;
  }
});

// Check non-comparable reasons
METRIC_OBSERVATIONS.forEach((obs) => {
  if (!obs.isComparable && !obs.nonComparableReason) {
    console.error(`❌ Observation ${obs.id}: Missing nonComparableReason explanation`);
    errorCount++;
  }
});

if (errorCount === 0) {
  console.log('✨ Data Validation Succeeded! Zero integrity errors detected.\n');
  process.exit(0);
} else {
  console.error(`💥 Validation failed with ${errorCount} errors and ${warningCount} warnings.\n`);
  process.exit(1);
}

