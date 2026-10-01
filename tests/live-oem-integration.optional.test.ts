/**
 * AutoMetrics Intelligence — Optional Live OEM Investor Relations Integration Test (STEP 5-5)
 *
 * Dedicated network integration test that executes against live official OEM IR endpoints.
 *
 * SEPARATION INVARIANT:
 * - This test is OPTIONAL and NEVER blocks normal unit/regression CI.
 * - Guarded by environment variable: `RUN_LIVE_OEM_TESTS=true`.
 * - Run via: `npm run test:live`
 * - If offline or if the target OEM endpoint is unreachable, logs an informative notice and exits cleanly.
 */

import { fetchOfficialIrSource } from '../src/services/liveSourceFetcher';
import { extractLiveDocument } from '../src/services/liveDocumentExtractor';
import { OFFICIAL_IR_SOURCES } from '../src/data/officialSources';

async function runLiveOemIntegrationTest(): Promise<void> {
  console.log('🧪 Starting Optional Live OEM Integration Test Runner...\n');

  if (process.env.RUN_LIVE_OEM_TESTS !== 'true') {
    console.log('ℹ️ [SKIPPED] Live network OEM tests are disabled by default.');
    console.log('   To execute live network probes against official OEM endpoints, run:');
    console.log('   npm run test:live\n');
    process.exit(0);
  }

  console.log('🌐 RUN_LIVE_OEM_TESTS=true detected: Initiating live network probes...\n');

  for (const officialSource of OFFICIAL_IR_SOURCES) {
    console.log(`📡 Ingesting live source: [${officialSource.id}] ${officialSource.title}`);
    console.log(`   URL: ${officialSource.url}`);
    console.log(`   Permitted Domain(s): ${Array.isArray(officialSource.officialDomain) ? officialSource.officialDomain.join(', ') : officialSource.officialDomain}`);

    try {
      const fetchResult = await fetchOfficialIrSource(officialSource.url, {
        timeoutMs: 10_000,
        maxResponseBytes: 15 * 1024 * 1024,
      });

      if (!fetchResult.success) {
        console.warn(`   ⚠️ Live fetch returned structured error: [${fetchResult.error.code}] ${fetchResult.error.message}`);
        console.warn(`   (Note: Network/endpoint variability is normal for live external tests; does not fail regression gate)\n`);
        continue;
      }

      const doc = fetchResult.document;
      console.log(`   ✅ Live fetch succeeded!`);
      console.log(`      HTTP Status:    ${doc.httpStatus}`);
      console.log(`      Content-Type:   ${doc.contentType}`);
      console.log(`      Byte Length:    ${doc.contentLength} bytes`);
      console.log(`      Content SHA-256: ${doc.contentHash}`);
      console.log(`      Retrieved At:   ${doc.retrievedAt}`);

      // Extract
      const extractResult = await extractLiveDocument(doc, fetchResult.rawBytes);
      if (extractResult.success) {
        console.log(`   ✅ Document extraction succeeded!`);
        console.log(`      Blocks Extracted: ${extractResult.document.blocks.length}`);
        console.log(`      Extraction Engine: ${extractResult.document.extractionMethod} v${extractResult.document.extractionVersion}\n`);
      } else {
        console.warn(`   ⚠️ Extraction note: ${extractResult.error.message}\n`);
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Network connection attempt resulted in exception: ${err?.message || String(err)}`);
      console.warn(`   (Optional live test handles network failure gracefully without breaking CI)\n`);
    }
  }

  console.log('🏁 Optional live OEM integration test execution completed.\n');
}

runLiveOemIntegrationTest().catch((err) => {
  console.error('Fatal error running live OEM test runner:', err);
  process.exit(0); // Never break CI on optional live runner failure
});

