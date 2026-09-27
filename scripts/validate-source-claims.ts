import { SOURCE_DOCUMENTS } from '../src/data/sources';
import { METRIC_OBSERVATIONS } from '../src/data/observations';
import { validateSourceClaims } from '../src/utils/metricCalculations';

console.log('🔍 Running Source Claim Integrity Validator...\n');

const result = validateSourceClaims(SOURCE_DOCUMENTS, METRIC_OBSERVATIONS);

let totalClaims = 0;
let docsWithClaims = 0;
for (const doc of SOURCE_DOCUMENTS) {
  if (doc.sourceClaims && doc.sourceClaims.length > 0) {
    docsWithClaims++;
    totalClaims += doc.sourceClaims.length;
  }
}

console.log(`📑 Total Source Documents: ${SOURCE_DOCUMENTS.length}`);
console.log(`📑 Documents with Source Claims: ${docsWithClaims}`);
console.log(`🔢 Total Source Claims Audited: ${totalClaims}`);

if (!result.valid) {
  console.error(`\n💥 Source Claim Validation FAILED with ${result.errors.length} errors:\n`);
  result.errors.forEach((err, idx) => {
    console.error(`  [${idx + 1}] ${err.code.toUpperCase()}`);
    console.error(`      Doc:     ${err.sourceDocId}`);
    console.error(`      Company: ${err.companyId}`);
    console.error(`      Period:  ${err.period}`);
    console.error(`      Metric:  ${err.metricId}`);
    console.error(`      Detail:  ${err.detail}`);
    if (err.observationId) {
      console.error(`      Obs ID:  ${err.observationId}`);
    }
    if (err.expected !== undefined && err.actual !== undefined) {
      console.error(`      Expected: ${JSON.stringify(err.expected)} | Actual: ${JSON.stringify(err.actual)}`);
    }
    console.error('');
  });
  process.exit(1);
}

console.log(`\n✨ All ${totalClaims} source claims across ${docsWithClaims} documents are 100% consistent with observations and document metadata.\n`);
process.exit(0);

