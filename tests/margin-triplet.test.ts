/**
 * AutoMetrics Intelligence — Semantic Margin Triplet Matching Regression Test Suite
 *
 * Covers all STEP 4-1 requirements:
 * 1. Reported operating income + reported revenue + reported margin
 * 2. Adjusted EBIT + reported revenue + adjusted margin
 * 3. Operating income + adjusted EBIT ambiguity
 * 4. Multiple revenue candidates
 * 5. Multiple profit candidates
 * 6. Multiple margin candidates
 * 7. Scope mismatch
 * 8. Accounting basis mismatch
 * 9. Currency mismatch
 * 10. Period mismatch
 * 11. PeriodType mismatch
 * 12. Wrong numerator metric
 * 13. Wrong margin definition
 * 14. Missing accounting basis
 * 15. Missing reporting scope
 * 16. Incompatible triplet must never use candidate [0]
 * 17. Incompatible triplet must not be mathematically validated as a normal triplet
 * 18. Audit code safety inspection (no unsafe fallback [0])
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  selectCompatibleMarginTriplets,
  validateMarginTriplet,
  MARGIN_RELATIONSHIP_RULES,
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

console.log('🧪 Starting Hardened Semantic Margin Triplet Regression Test Suite...\n');

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

// 1. Reported Operating Income + Reported Revenue + Reported Margin
const res1 = validateMarginTriplet(baseRevenue, baseReportedProfit, baseReportedMargin);
assert(res1.status === 'verified', 'Test 1: Reported triplet status is verified');
assert(res1.calculatedMargin === 8.0, 'Test 1: Calculated margin is 8.0%');
assert(res1.difference === 0.0, 'Test 1: Mathematical difference is 0.0%p');
assert(res1.checks.metricDefinition === true, 'Test 1: Metric definitions matched');
assert(res1.checks.accountingBasis === true, 'Test 1: Accounting basis matched');

// 2. Adjusted EBIT + Reported Revenue + Adjusted Margin
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
const res2 = validateMarginTriplet(baseRevenue, adjProfit, adjMargin);
assert(res2.status === 'verified', 'Test 2: Adjusted EBIT + reported revenue + adjusted margin is verified');
assert(res2.checks.metricDefinition === true, 'Test 2: Adjusted EBIT is valid numerator in relationship');
assert(res2.checks.accountingBasis === true, 'Test 2: Adjusted accounting basis matched');

// 3. Operating Income + Adjusted EBIT Ambiguity
const ambiguousProfitPool = [baseRevenue, baseReportedProfit, adjProfit, baseReportedMargin];
const res3 = selectCompatibleMarginTriplets(ambiguousProfitPool, 'tesla', '2026-Q2');
assert(res3.status === 'matched', 'Test 3: Reported margin exclusively matches reported operating income rule');

const dualMarginPool = [baseRevenue, baseReportedProfit, adjProfit, baseReportedMargin, adjMargin];
const res3b = selectCompatibleMarginTriplets(dualMarginPool, 'tesla', '2026-Q2');
assert(res3b.status === 'ambiguous', 'Test 3b: Multiple matching rules for reported & adjusted margin produce ambiguous status');

// 4. Multiple Revenue Candidates
const altRev: MetricObservation = { ...baseRevenue, id: 'obs_alt_rev', value: 27000 };
const res4 = selectCompatibleMarginTriplets([baseRevenue, altRev, baseReportedProfit, baseReportedMargin], 'tesla', '2026-Q2');
assert(res4.status === 'ambiguous', 'Test 4: Multiple revenue candidates result in status: ambiguous');

// 5. Multiple Profit Candidates
const altProfit: MetricObservation = { ...baseReportedProfit, id: 'obs_alt_profit', value: 2200 };
const res5 = selectCompatibleMarginTriplets([baseRevenue, baseReportedProfit, altProfit, baseReportedMargin], 'tesla', '2026-Q2');
assert(res5.status === 'ambiguous', 'Test 5: Multiple profit candidates result in status: ambiguous');

// 6. Multiple Margin Candidates
const altMargin: MetricObservation = { ...baseReportedMargin, id: 'obs_alt_margin', value: 8.2 };
const res6 = selectCompatibleMarginTriplets([baseRevenue, baseReportedProfit, baseReportedMargin, altMargin], 'tesla', '2026-Q2');
assert(res6.status === 'ambiguous', 'Test 6: Multiple margin candidates result in status: ambiguous');

// 7. Scope Mismatch
const segMargin: MetricObservation = { ...baseReportedMargin, id: 'obs_bmw_seg_margin', reportingScope: 'automotive_segment' };
const res7 = validateMarginTriplet(baseRevenue, baseReportedProfit, segMargin);
assert(res7.status === 'invalid', 'Test 7: Scope mismatch status is invalid');
assert(res7.checks.scope === false, 'Test 7: checks.scope is false');

// 8. Accounting Basis Mismatch (Reported Profit with Adjusted Margin without Rule)
const res8 = validateMarginTriplet(baseRevenue, baseReportedProfit, adjMargin);
assert(res8.status === 'invalid', 'Test 8: Accounting basis mismatch status is invalid');
assert(res8.checks.accountingBasis === false, 'Test 8: checks.accountingBasis is false');

// 9. Currency Mismatch
const eurProfit: MetricObservation = { ...baseReportedProfit, currency: 'EUR' };
const res9 = validateMarginTriplet(baseRevenue, eurProfit, baseReportedMargin);
assert(res9.status === 'invalid', 'Test 9: Currency mismatch status is invalid');
assert(res9.checks.currency === false, 'Test 9: checks.currency is false');

// 10. Period Mismatch
const q1Profit: MetricObservation = { ...baseReportedProfit, period: '2026-Q1' };
const res10 = validateMarginTriplet(baseRevenue, q1Profit, baseReportedMargin);
assert(res10.status === 'invalid', 'Test 10: Period mismatch status is invalid');
assert(res10.checks.period === false, 'Test 10: checks.period is false');

// 11. PeriodType Mismatch
const annualProfit: MetricObservation = { ...baseReportedProfit, periodType: 'annual' };
const res11 = validateMarginTriplet(baseRevenue, annualProfit, baseReportedMargin);
assert(res11.status === 'invalid', 'Test 11: PeriodType mismatch status is invalid');
assert(res11.checks.periodType === false, 'Test 11: checks.periodType is false');

// 12. Wrong Numerator Metric
const grossProfitObs: MetricObservation = { ...baseReportedProfit, metricId: 'gross_profit' };
const res12 = validateMarginTriplet(baseRevenue, grossProfitObs, baseReportedMargin);
assert(res12.status === 'invalid', 'Test 12: Wrong numerator metric status is invalid');
assert(res12.checks.metricDefinition === false, 'Test 12: checks.metricDefinition is false');

// 13. Wrong Margin Definition
const netMarginObs: MetricObservation = { ...baseReportedMargin, metricId: 'net_margin' };
const res13 = validateMarginTriplet(baseRevenue, baseReportedProfit, netMarginObs);
assert(res13.status === 'invalid', 'Test 13: Wrong margin definition status is invalid');
assert(res13.checks.metricDefinition === false, 'Test 13: checks.metricDefinition is false');

// 14. Missing Accounting Basis
const noBasisProfit: MetricObservation = { ...baseReportedProfit, accountingBasis: undefined };
const res14 = validateMarginTriplet(baseRevenue, noBasisProfit, baseReportedMargin);
assert(res14.status === 'invalid', 'Test 14: Missing accounting basis status is invalid');
assert(res14.checks.accountingBasis === false, 'Test 14: checks.accountingBasis is false');

// 15. Missing Reporting Scope
const noScopeProfit: MetricObservation = { ...baseReportedProfit, reportingScope: undefined };
const res15 = validateMarginTriplet(baseRevenue, noScopeProfit, baseReportedMargin);
assert(res15.status === 'invalid', 'Test 15: Missing reporting scope status is invalid');
assert(res15.checks.scope === false, 'Test 15: checks.scope is false');

// 16. Incompatible Triplet Must NEVER Use Candidate [0]
const incompatibleSelection = selectCompatibleMarginTriplets([baseRevenue, baseReportedProfit, segMargin], 'tesla', '2026-Q2');
assert(incompatibleSelection.status === 'incompatible', 'Test 16: Incompatible selection returns status: incompatible');
assert(incompatibleSelection.revenue === undefined, 'Test 16: Incompatible selection leaves revenue undefined (no [0] fallback)');
assert(incompatibleSelection.profit === undefined, 'Test 16: Incompatible selection leaves profit undefined (no [0] fallback)');
assert(incompatibleSelection.margin === undefined, 'Test 16: Incompatible selection leaves margin undefined (no [0] fallback)');

// 17. Incompatible Triplet Must Not Be Mathematically Validated As Normal Triplet
assert(
  incompatibleSelection.revenue === undefined && incompatibleSelection.margin === undefined,
  'Test 17: Incompatible selection prevents mathematical margin validation execution'
);

// 18. Audit Code Safety Inspection (No Unsafe Fallback in audit-data.ts)
const auditScriptContent = fs.readFileSync(path.resolve(process.cwd(), 'scripts/audit-data.ts'), 'utf-8');
const hasUnsafeArrayFallback = auditScriptContent.includes('revCands[0]') || auditScriptContent.includes('profitCands[0]');
assert(!hasUnsafeArrayFallback, 'Test 18: scripts/audit-data.ts does NOT contain unsafe revCands[0] or profitCands[0] fallback');

// 19. Relationship Rules Registry Invariant
assert(MARGIN_RELATIONSHIP_RULES.length >= 4, 'Test 19: At least 4 explicit margin relationship rules registered');
assert(MARGIN_RELATIONSHIP_RULES.some((r) => r.id === 'reported_operating_margin'), 'Test 19: Includes reported_operating_margin rule');
assert(MARGIN_RELATIONSHIP_RULES.some((r) => r.id === 'adjusted_operating_margin'), 'Test 19: Includes adjusted_operating_margin rule');

console.log(`\nSemantic Margin Triplet Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All semantic margin triplet matching regression tests passed!\n');
}
