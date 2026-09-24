/**
 * Unit Test Suite for Comparability Engine & Scope-Aware Margin Validation
 */

import { checkObservationComparability, validateMarginScopeCompatibility } from '../src/utils/metricCalculations';
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

console.log('🧪 Starting Comparability Engine & Scope-Safety Test Suite...\n');

// 1. Direct Match Test (Same metric, scope, basis, period, volume definition)
const obsA: MetricObservation = {
  id: 'obs_a',
  companyId: 'tesla',
  metricId: 'deliveries_global',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 466.14,
  unit: 'thousand_units',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  volumeDefinition: 'retail_deliveries',
  isComparable: true,
};

const obsB: MetricObservation = {
  id: 'obs_b',
  companyId: 'volkswagen_group',
  metricId: 'deliveries_global',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 2244.0,
  unit: 'thousand_units',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  volumeDefinition: 'retail_deliveries',
  isComparable: true,
};

const directResult = checkObservationComparability(obsA, obsB);
assert(directResult.comparable === true, 'Direct Comparison: Should be comparable');
assert(directResult.level === 'direct', 'Direct Comparison: Level must be direct');
assert(directResult.scopeMatched === true, 'Direct Comparison: Scope matched');
assert(directResult.accountingBasisMatched === true, 'Direct Comparison: Accounting basis matched');

// 2. Volume Definition Mismatch (Retail Deliveries vs Wholesale Shipments)
const obsWholesale: MetricObservation = {
  id: 'obs_ws',
  companyId: 'hyundai_motor',
  metricId: 'deliveries_global',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 1050.0,
  unit: 'thousand_units',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  volumeDefinition: 'wholesale_shipments',
  isComparable: true,
};

const retailVsWholesale = checkObservationComparability(obsA, obsWholesale);
assert(retailVsWholesale.level === 'limited', 'Volume Mismatch: Level must be limited when comparing retail vs wholesale');
assert(retailVsWholesale.reasons.some((r) => r.includes('Volume perimeter mismatch')), 'Volume Mismatch: Reason contains perimeter mismatch');

// 3. Reporting Scope Mismatch (Consolidated Group vs Automotive Segment)
const obsSegmentMargin: MetricObservation = {
  id: 'obs_bmw_margin',
  companyId: 'bmw_group',
  metricId: 'operating_margin',
  period: '2026-Q1',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 8.8,
  unit: 'percentage',
  valueType: 'reported',
  reportingScope: 'automotive_segment',
  accountingBasis: 'reported',
  isComparable: true,
};

const obsGroupMargin: MetricObservation = {
  id: 'obs_tsla_margin',
  companyId: 'tesla',
  metricId: 'operating_margin',
  period: '2026-Q1',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 6.4,
  unit: 'percentage',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};

const scopeResult = checkObservationComparability(obsSegmentMargin, obsGroupMargin);
assert(scopeResult.level === 'limited', 'Scope Mismatch: Level must be limited when comparing segment vs group margin');
assert(scopeResult.scopeMatched === false, 'Scope Mismatch: scopeMatched must be false');

// 4. Accounting Basis Mismatch (Reported GAAP vs Adjusted EBIT)
const obsAdjEbit: MetricObservation = {
  id: 'obs_gm_ebit',
  companyId: 'general_motors',
  metricId: 'operating_income',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 4100,
  unit: 'currency_millions',
  currency: 'USD',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'adjusted',
  isComparable: true,
};

const obsReportedEbit: MetricObservation = {
  id: 'obs_tsla_ebit',
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

const basisResult = checkObservationComparability(obsAdjEbit, obsReportedEbit);
assert(basisResult.level === 'limited', 'Basis Mismatch: Level must be limited when comparing reported vs adjusted');
assert(basisResult.accountingBasisMatched === false, 'Basis Mismatch: accountingBasisMatched must be false');

// 5. Incompatible Metric Definition Mismatch
const diffMetricResult = checkObservationComparability(obsA, obsGroupMargin);
assert(diffMetricResult.comparable === false, 'Different Metric: Should be non-comparable');
assert(diffMetricResult.level === 'not_comparable', 'Different Metric: Level must be not_comparable');

// 6. Scope-Aware Margin Validation
const revObs: MetricObservation = {
  id: 'rev',
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

const ebitObs: MetricObservation = {
  id: 'ebit',
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

const marginObs: MetricObservation = {
  id: 'margin',
  companyId: 'tesla',
  metricId: 'operating_margin',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 8.0,
  unit: 'percentage',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};

const validMarginCheck = validateMarginScopeCompatibility(revObs, ebitObs, marginObs);
assert(validMarginCheck.isScopeCompatible === true, 'Margin Validator: Scope compatible when all are consolidated_group');
assert(validMarginCheck.validationStatus === 'verified', 'Margin Validator: Status verified');

// Scope Mismatch Case in Margin Validator
const incompatibleMarginObs: MetricObservation = {
  ...marginObs,
  reportingScope: 'automotive_segment',
};

const invalidMarginCheck = validateMarginScopeCompatibility(revObs, ebitObs, incompatibleMarginObs);
assert(invalidMarginCheck.isScopeCompatible === false, 'Margin Validator: Catches automotive_segment vs group mismatch');
assert(invalidMarginCheck.validationStatus === 'scope_warning', 'Margin Validator: Status scope_warning');

console.log(`\nComparability Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All comparability and scope validation tests passed cleanly!\n');
}
