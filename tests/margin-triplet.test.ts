/**
 * AutoMetrics Intelligence — Semantic Margin Triplet Matching Regression Test Suite
 *
 * Covers all STEP 3-2 requirements:
 * 1. Revenue + reported EBIT + reported margin (verified)
 * 2. Revenue + adjusted EBIT + adjusted margin (verified)
 * 3. Revenue + reported EBIT + adjusted margin (invalid / basis mismatch)
 * 4. Multiple EBIT candidates (ambiguity detection)
 * 5. Scope mismatch (group vs segment)
 * 6. Accounting basis mismatch (reported vs adjusted)
 * 7. Currency mismatch (USD vs EUR)
 * 8. Unit mismatch (millions vs billions)
 * 9. Period mismatch (2026-Q1 vs 2026-Q2)
 * 10. Margin unit mismatch (units != percentage)
 * 11. Missing revenue
 * 12. Missing profit
 * 13. Missing margin
 * 14. Ambiguous compatible triplets
 * 15. Rounding tolerance within 0.35%p
 * 16. Negative operating profit (valid negative margin)
 */

import {
  selectCompatibleMarginTriplets,
  validateMarginTriplet,
  OPERATING_MARGIN_RELATIONSHIP,
} from '../src/utils/metricCalculations';
import { MetricObservation } from '../src/types/metrics';

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

console.log('🧪 Starting Semantic Margin Triplet Regression Test Suite...\n');

// Standard Base Observations
const baseRevenue: MetricObservation = {
  id: 'obs_tsla_rev_2026_q2',
  companyId: 'tesla',
  metricId: 'revenue',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 26850,
  unit: 'currency_millions',
  currency: 'USD',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};

const baseReportedProfit: MetricObservation = {
  id: 'obs_tsla_ebit_2026_q2',
  companyId: 'tesla',
  metricId: 'operating_income',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 2148,
  unit: 'currency_millions',
  currency: 'USD',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};

const baseReportedMargin: MetricObservation = {
  id: 'obs_tsla_margin_2026_q2',
  companyId: 'tesla',
  metricId: 'operating_margin',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 8.0,
  unit: 'percentage',
  valueType: 'derived',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  verificationStatus: 'verified',
  isComparable: true,
};

// 1. Revenue + Reported EBIT + Reported Margin (Verified)
const res1 = validateMarginTriplet(baseRevenue, baseReportedProfit, baseReportedMargin);
assert(res1.status === 'verified', 'Test 1: Reported triplet status is verified');
assert(res1.calculatedMargin === 8.0, 'Test 1: Calculated margin is 8.0%');
assert(res1.difference === 0.0, 'Test 1: Mathematical difference is 0.0%p');
assert(res1.checks.metricDefinition === true, 'Test 1: Metric definitions matched');
assert(res1.checks.accountingBasis === true, 'Test 1: Accounting basis matched');

// 2. Revenue + Adjusted EBIT + Adjusted Margin (Verified)
const adjRevenue: MetricObservation = { ...baseRevenue, accountingBasis: 'adjusted' };
const adjProfit: MetricObservation = {
  ...baseReportedProfit,
  id: 'obs_gm_adj_ebit',
  metricId: 'adjusted_ebit',
  accountingBasis: 'adjusted',
  value: 3000,
};
const adjMargin: MetricObservation = {
  ...baseReportedMargin,
  id: 'obs_gm_adj_margin',
  accountingBasis: 'adjusted',
  value: 11.17, // 3000 / 26850 * 100 = 11.173%
};

const res2 = validateMarginTriplet(adjRevenue, adjProfit, adjMargin);
assert(res2.status === 'verified', 'Test 2: Adjusted triplet status is verified');
assert(res2.checks.metricDefinition === true, 'Test 2: Adjusted EBIT is valid numerator in relationship');
assert(res2.checks.accountingBasis === true, 'Test 2: Adjusted accounting bases matched');

// 3. Revenue + Reported EBIT + Adjusted Margin (Invalid / Basis Mismatch)
const res3 = validateMarginTriplet(baseRevenue, baseReportedProfit, adjMargin);
assert(res3.status === 'invalid', 'Test 3: Reported profit with adjusted margin is invalid');
assert(res3.checks.accountingBasis === false, 'Test 3: Accounting basis check is false');
assert(res3.reasons.some((r) => r.includes('Accounting basis mismatch')), 'Test 3: Reason includes basis mismatch');

// 4. Multiple EBIT Candidates Selection (Ambiguity Detection)
const secondProfitCandidate: MetricObservation = {
  ...baseReportedProfit,
  id: 'obs_tsla_ebit_cand2',
  value: 2200,
};
const multipleCandidateList = [baseRevenue, baseReportedProfit, secondProfitCandidate, baseReportedMargin];
const res4 = selectCompatibleMarginTriplets(multipleCandidateList, 'tesla', '2026-Q2');
assert(res4.status === 'ambiguous', 'Test 4: Multiple profit candidates result in status: ambiguous');
assert(res4.reasons.some((r) => r.includes('Ambiguous candidate observations')), 'Test 4: Reason cites ambiguous candidates');

// 5. Scope Mismatch (Group Revenue vs Segment Margin)
const segMargin: MetricObservation = {
  ...baseReportedMargin,
  id: 'obs_bmw_seg_margin',
  reportingScope: 'automotive_segment',
};
const res5 = validateMarginTriplet(baseRevenue, baseReportedProfit, segMargin);
assert(res5.status === 'invalid', 'Test 5: Scope mismatch status is invalid');
assert(res5.checks.scope === false, 'Test 5: checks.scope is false');

// 6. Accounting Basis Mismatch (Reported Revenue vs Adjusted EBIT)
const res6 = validateMarginTriplet(baseRevenue, adjProfit, adjMargin);
assert(res6.status === 'invalid', 'Test 6: Reported revenue with adjusted profit is invalid');
assert(res6.checks.accountingBasis === false, 'Test 6: checks.accountingBasis is false');

// 7. Currency Mismatch (USD Revenue vs EUR Profit)
const eurProfit: MetricObservation = { ...baseReportedProfit, currency: 'EUR' };
const res7 = validateMarginTriplet(baseRevenue, eurProfit, baseReportedMargin);
assert(res7.status === 'invalid', 'Test 7: Currency mismatch status is invalid');
assert(res7.checks.currency === false, 'Test 7: checks.currency is false');

// 8. Unit Mismatch (Millions Revenue vs Billions Profit)
const bilProfit: MetricObservation = { ...baseReportedProfit, unit: 'currency_billions', value: 2.148 };
const res8 = validateMarginTriplet(baseRevenue, bilProfit, baseReportedMargin);
assert(res8.status === 'invalid', 'Test 8: Unit mismatch status is invalid');
assert(res8.checks.unit === false, 'Test 8: checks.unit is false');

// 9. Period Mismatch (2026-Q2 Revenue vs 2026-Q1 Profit)
const q1Profit: MetricObservation = { ...baseReportedProfit, period: '2026-Q1' };
const res9 = validateMarginTriplet(baseRevenue, q1Profit, baseReportedMargin);
assert(res9.status === 'invalid', 'Test 9: Period mismatch status is invalid');
assert(res9.checks.period === false, 'Test 9: checks.period is false');

// 10. Margin Unit Mismatch (unit != 'percentage')
const invalidUnitMargin: MetricObservation = { ...baseReportedMargin, unit: 'currency_millions' };
const res10 = validateMarginTriplet(baseRevenue, baseReportedProfit, invalidUnitMargin);
assert(res10.status === 'invalid', 'Test 10: Non-percentage margin unit is invalid');
assert(res10.checks.unit === false, 'Test 10: checks.unit is false');

// 11. Missing Revenue
const res11 = validateMarginTriplet(null, baseReportedProfit, baseReportedMargin);
assert(res11.status === 'needs_review', 'Test 11: Missing revenue status is needs_review');
assert(res11.reasons.some((r) => r.includes('Missing revenue')), 'Test 11: Reason identifies missing revenue');

// 12. Missing Profit
const res12 = validateMarginTriplet(baseRevenue, null, baseReportedMargin);
assert(res12.status === 'needs_review', 'Test 12: Missing profit status is needs_review');
assert(res12.reasons.some((r) => r.includes('Missing operating profit')), 'Test 12: Reason identifies missing profit');

// 13. Missing Margin
const res13 = validateMarginTriplet(baseRevenue, baseReportedProfit, null);
assert(res13.status === 'needs_review', 'Test 13: Missing margin status is needs_review');
assert(res13.reasons.some((r) => r.includes('Missing operating margin')), 'Test 13: Reason identifies missing margin');

// 14. Ambiguous Compatible Triplets in selectCompatibleMarginTriplets
const altRevenue: MetricObservation = { ...baseRevenue, id: 'obs_alt_rev', value: 27000 };
const ambiguousPool = [baseRevenue, altRevenue, baseReportedProfit, baseReportedMargin];
const res14 = selectCompatibleMarginTriplets(ambiguousPool, 'tesla', '2026-Q2');
assert(res14.status === 'ambiguous', 'Test 14: Multiple compatible triplets status is ambiguous');

// 15. Rounding Tolerance Check (deviation <= 0.35%p is verified, > 0.35%p is invalid)
const slightDiffMargin: MetricObservation = { ...baseReportedMargin, value: 8.1 }; // 8.0 vs 8.1 (diff = 0.1 <= 0.35)
const res15Pass = validateMarginTriplet(baseRevenue, baseReportedProfit, slightDiffMargin);
assert(res15Pass.status === 'verified', 'Test 15a: Deviation 0.1%p within 0.35%p tolerance is verified');

const largeDiffMargin: MetricObservation = { ...baseReportedMargin, value: 9.5 }; // diff = 1.5 > 0.35
const res15Fail = validateMarginTriplet(baseRevenue, baseReportedProfit, largeDiffMargin);
assert(res15Fail.status === 'invalid', 'Test 15b: Deviation 1.5%p exceeding 0.35%p tolerance is invalid');
assert(res15Fail.diagnostic.includes('Mathematical deviation'), 'Test 15b: Diagnostic notes mathematical deviation');

// 16. Negative Operating Profit (Operating Loss)
const lossProfit: MetricObservation = { ...baseReportedProfit, value: -1342.5 }; // -1342.5 / 26850 * 100 = -5.0%
const lossMargin: MetricObservation = { ...baseReportedMargin, value: -5.0 };
const res16 = validateMarginTriplet(baseRevenue, lossProfit, lossMargin);
assert(res16.status === 'verified', 'Test 16: Negative operating profit produces valid verified negative margin');
assert(res16.calculatedMargin === -5.0, 'Test 16: Calculated negative margin is -5.0%');
assert(res16.difference === 0.0, 'Test 16: Zero mathematical deviation on operating loss');

// Relationship Model check
assert(OPERATING_MARGIN_RELATIONSHIP.numeratorMetricIds.includes('operating_income'), 'Relationship: includes operating_income');
assert(OPERATING_MARGIN_RELATIONSHIP.numeratorMetricIds.includes('adjusted_ebit'), 'Relationship: includes adjusted_ebit');
assert(OPERATING_MARGIN_RELATIONSHIP.denominatorMetricIds.includes('revenue'), 'Relationship: includes revenue');

console.log(`\nSemantic Margin Triplet Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All semantic margin triplet matching regression tests passed!\n');
}
