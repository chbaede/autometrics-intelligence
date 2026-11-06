/**
 * AutoMetrics Intelligence — Phase 1 Capabilities Unit & Regression Test Suite
 *
 * Validates:
 * 1. Market Denominators & Market Share Calculation Invariants
 * 2. Data Change History Schema & Audit Trace Invariants
 * 3. Financial Performance Decomposition Math & Classification Invariants
 */

import {
  MARKET_DENOMINATORS,
  getMarketDenominator,
} from '../src/data/marketShareData';
import {
  DATA_CHANGE_HISTORY,
  getFilteredChangeHistory,
} from '../src/data/dataChangeHistory';
import {
  FINANCIAL_DECOMPOSITIONS,
} from '../src/data/financialDecompositions';
import { COMPANIES_MAP } from '../src/data/companies';

console.log('🧪 Starting Phase 1 Capabilities Test Suite...\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failCount++;
  }
}

// ========================================================
// 1. Market Denominator & Market Share Invariants
// ========================================================
console.log('📊 Suite 1: Market Denominators & Grounding Invariants');

assert(MARKET_DENOMINATORS.length >= 15, `Suite 1-1: Registered denominators count is ${MARKET_DENOMINATORS.length} (>= 15)`);

const markets = ['global', 'europe', 'china', 'united_states'] as const;
for (const m of markets) {
  const q3Denom = getMarketDenominator(m, '2026-Q3');
  assert(Boolean(q3Denom), `Suite 1-2 [${m}]: 2026-Q3 denominator exists`);
  if (q3Denom) {
    assert(q3Denom.totalMarketVolume > 0, `Suite 1-2b [${m}]: Market volume is positive (${q3Denom.totalMarketVolume}k)`);
    assert(q3Denom.authorityName.length > 0, `Suite 1-2c [${m}]: Has official authority name (${q3Denom.authorityName})`);
    assert(q3Denom.sourceUrl.startsWith('http'), `Suite 1-2d [${m}]: Has valid source URL`);
  }
}

// Test market share math calculation
const europeQ3 = getMarketDenominator('europe', '2026-Q3');
if (europeQ3) {
  const mockDelivery = 551.083; // BMW Group
  const calculatedShare = (mockDelivery / europeQ3.totalMarketVolume) * 100;
  assert(calculatedShare > 0 && calculatedShare < 100, `Suite 1-3: Calculated share is plausible (${calculatedShare.toFixed(2)}%)`);
}

// Test fail-closed behavior on missing denominator
const nonExistentDenom = getMarketDenominator('europe', '1990-Q1');
assert(nonExistentDenom === undefined, 'Suite 1-4: Non-existent denominator safely returns undefined');

// ========================================================
// 2. Data Change History Invariants
// ========================================================
console.log('\n📜 Suite 2: Data Change History & Audit Trail Invariants');

assert(DATA_CHANGE_HISTORY.length >= 10, `Suite 2-1: Change history records count is ${DATA_CHANGE_HISTORY.length} (>= 10)`);

DATA_CHANGE_HISTORY.forEach((rec) => {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(rec.changeDate), `Suite 2-2 [${rec.id}]: Valid ISO date (${rec.changeDate})`);
  assert(rec.companyId === 'all_companies' || Boolean(COMPANIES_MAP[rec.companyId]), `Suite 2-3 [${rec.id}]: Company ID exists (${rec.companyId})`);
  assert(rec.reasonKo.length > 5 && rec.reasonEn.length > 5, `Suite 2-4 [${rec.id}]: Detailed bilingual reasons provided`);
  assert(rec.sourceDocId.length > 0, `Suite 2-5 [${rec.id}]: Associated with sourceDocId (${rec.sourceDocId})`);
  assert(rec.newValue !== undefined && rec.newValue !== null, `Suite 2-6 [${rec.id}]: New value is documented`);
});

// Test filtering helper
const toyotaChanges = getFilteredChangeHistory({ companyId: 'toyota_motor' });
assert(toyotaChanges.length >= 1, `Suite 2-7: Toyota change history found (${toyotaChanges.length} records)`);

const restatements = getFilteredChangeHistory({ category: 'official_restatement' });
assert(restatements.length >= 1, `Suite 2-8: Official restatement records found (${restatements.length} records)`);

// ========================================================
// 3. Financial Performance Decomposition Invariants
// ========================================================
console.log('\n💰 Suite 3: Financial Performance Decomposition Invariants');

assert(FINANCIAL_DECOMPOSITIONS.length >= 5, `Suite 3-1: Decompositions count is ${FINANCIAL_DECOMPOSITIONS.length} (>= 5)`);

FINANCIAL_DECOMPOSITIONS.forEach((decomp) => {
  const comp = COMPANIES_MAP[decomp.companyId];
  assert(Boolean(comp), `Suite 3-2 [${decomp.companyId}]: Company is registered`);

  // Math consistency check: margin delta in basis points
  const expectedMarginDeltaBps = Math.round((decomp.currentOperatingMargin - decomp.previousOperatingMargin) * 100);
  assert(
    Math.abs(decomp.marginChangeYoYBasisPoints - expectedMarginDeltaBps) <= 5,
    `Suite 3-3 [${decomp.companyId}]: Margin delta bps matches math (${decomp.marginChangeYoYBasisPoints} bps vs expected ${expectedMarginDeltaBps} bps)`
  );

  // Revenue YoY percentage check
  if (decomp.previousRevenue > 0) {
    const expectedRevYoY = Number((((decomp.currentRevenue - decomp.previousRevenue) / decomp.previousRevenue) * 100).toFixed(1));
    assert(
      Math.abs(decomp.revenueChangeYoYPercentage - expectedRevYoY) <= 0.5,
      `Suite 3-4 [${decomp.companyId}]: Revenue YoY % matches math (${decomp.revenueChangeYoYPercentage}% vs expected ${expectedRevYoY}%)`
    );
  }

  // Factor walk check
  assert(decomp.contributingFactors.length >= 2, `Suite 3-5 [${decomp.companyId}]: Has at least 2 contributing factors (${decomp.contributingFactors.length})`);

  decomp.contributingFactors.forEach((factor, fIdx) => {
    assert(factor.nameKo.length > 0 && factor.nameEn.length > 0, `Suite 3-6 [${decomp.companyId}#${fIdx}]: Factor has bilingual title`);
    assert(factor.explanationKo.length > 0, `Suite 3-7 [${decomp.companyId}#${fIdx}]: Factor has explanation`);
    assert(factor.sourceDocId.length > 0, `Suite 3-8 [${decomp.companyId}#${fIdx}]: Factor links to source document`);
  });

  // Explicit unavailable information check
  assert(decomp.unavailableInformationKo.length > 0, `Suite 3-9 [${decomp.companyId}]: Transparently states unavailable information`);
});

// Final tally
console.log(`\nResults: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Phase 1 Capabilities Tests passed cleanly!');
}
