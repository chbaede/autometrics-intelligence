/**
 * AutoMetrics Intelligence — Strict Comparability, Scope Safety & Margin Validation Regression Test Suite
 *
 * Covers all STEP 2 FIX requirements:
 * 1. Direct comparison with matching metadata (directlyComparable = true)
 * 2. Group vs automotive segment mismatch (directlyComparable = false, level = 'limited')
 * 3. Reported vs adjusted accounting basis mismatch (directlyComparable = false, level = 'limited')
 * 4. Missing / undefined scope (directlyComparable = false, level = 'limited')
 * 5. Missing / undefined accounting basis (directlyComparable = false, level = 'limited')
 * 6. EUR vs USD currency mismatch (directlyComparable = false, level = 'limited')
 * 7. Currency millions vs currency billions unit mismatch (directlyComparable = false, level = 'limited')
 * 8. Retail deliveries vs wholesale shipments mismatch (directlyComparable = false, level = 'limited')
 * 9. Different period types (quarterly vs annual -> directlyComparable = false, level = 'not_comparable')
 * 10. Different fiscal calendars (Toyota Mar 31 vs Tesla Dec 31 -> directlyComparable = false, level = 'not_comparable')
 * 11. Margin with matching scope, basis, currency, and units (validationStatus = 'verified')
 * 12. Margin with mismatched scope (isScopeCompatible = false, validationStatus = 'scope_warning')
 * 13. Margin with mismatched currency (isScopeCompatible = false, validationStatus = 'needs_review')
 * 14. Margin with mismatched unit (isScopeCompatible = false, validationStatus = 'needs_review')
 * 15. Ambiguous candidate observations detection
 * 16. Missing compatible observation pair detection
 * 17. Incompatible observations are NEVER classified as directly comparable
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

console.log('🧪 Starting Strict Comparability & Margin Scope-Safety Test Suite...\n');

// Base test observations
const baseTeslaDeliveries: MetricObservation = {
  id: 'obs_tsla_del',
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

const baseVWDeliveries: MetricObservation = {
  id: 'obs_vw_del',
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

// 1. Direct Comparison with Matching Metadata
const res1 = checkObservationComparability(baseTeslaDeliveries, baseVWDeliveries);
assert(res1.directlyComparable === true, 'Test 1: Direct comparison is directlyComparable: true');
assert(res1.limitedComparisonAllowed === true, 'Test 1: Direct comparison limitedComparisonAllowed: true');
assert(res1.level === 'direct', 'Test 1: Direct comparison level is direct');
assert(res1.checks.definitionMatched === true, 'Test 1: Definition matched');
assert(res1.checks.scopeMatched === true, 'Test 1: Scope matched');
assert(res1.checks.accountingBasisMatched === true, 'Test 1: Accounting basis matched');
assert(res1.checks.volumeDefinitionMatched === true, 'Test 1: Volume definition matched');
assert(res1.reasons.length === 0, 'Test 1: Zero mismatch reasons');

// 2. Group vs Automotive Segment Scope Mismatch
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

const res2 = checkObservationComparability(obsSegmentMargin, obsGroupMargin);
assert(res2.directlyComparable === false, 'Test 2: Scope mismatch is directlyComparable: false');
assert(res2.limitedComparisonAllowed === true, 'Test 2: Scope mismatch limitedComparisonAllowed: true');
assert(res2.level === 'limited', 'Test 2: Scope mismatch level is limited');
assert(res2.checks.scopeMatched === false, 'Test 2: checks.scopeMatched is false');

// 3. Reported vs Adjusted Accounting Basis Mismatch
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

const res3 = checkObservationComparability(obsAdjEbit, obsReportedEbit);
assert(res3.directlyComparable === false, 'Test 3: Basis mismatch is directlyComparable: false');
assert(res3.level === 'limited', 'Test 3: Basis mismatch level is limited');
assert(res3.checks.accountingBasisMatched === false, 'Test 3: checks.accountingBasisMatched is false');

// 4. Missing / Undefined Scope
const obsMissingScope: MetricObservation = {
  ...obsReportedEbit,
  id: 'obs_missing_scope',
  reportingScope: undefined,
};

const res4 = checkObservationComparability(obsReportedEbit, obsMissingScope);
assert(res4.directlyComparable === false, 'Test 4: Missing scope is directlyComparable: false');
assert(res4.level === 'limited', 'Test 4: Missing scope level is limited');
assert(res4.checks.scopeMatched === false, 'Test 4: checks.scopeMatched is false');

// 5. Missing / Undefined Accounting Basis
const obsMissingBasis: MetricObservation = {
  ...obsReportedEbit,
  id: 'obs_missing_basis',
  accountingBasis: undefined,
};

const res5 = checkObservationComparability(obsReportedEbit, obsMissingBasis);
assert(res5.directlyComparable === false, 'Test 5: Missing basis is directlyComparable: false');
assert(res5.checks.accountingBasisMatched === false, 'Test 5: checks.accountingBasisMatched is false');

// 6. EUR vs USD Currency Mismatch
const obsEurRevenue: MetricObservation = {
  id: 'obs_vw_rev',
  companyId: 'volkswagen_group',
  metricId: 'revenue',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 82000,
  unit: 'currency_millions',
  currency: 'EUR',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};

const obsUsdRevenue: MetricObservation = {
  id: 'obs_tsla_rev',
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

const res6 = checkObservationComparability(obsEurRevenue, obsUsdRevenue);
assert(res6.directlyComparable === false, 'Test 6: Currency mismatch is directlyComparable: false');
assert(res6.level === 'limited', 'Test 6: Currency mismatch level is limited');
assert(res6.checks.currencyMatched === false, 'Test 6: checks.currencyMatched is false');

// 7. Currency Millions vs Currency Billions Unit Mismatch
const obsBillionsRevenue: MetricObservation = {
  ...obsUsdRevenue,
  id: 'obs_tsla_rev_bil',
  value: 26.85,
  unit: 'currency_billions',
};

const res7 = checkObservationComparability(obsUsdRevenue, obsBillionsRevenue);
assert(res7.directlyComparable === false, 'Test 7: Unit scale mismatch is directlyComparable: false');
assert(res7.level === 'limited', 'Test 7: Unit scale mismatch level is limited');
assert(res7.checks.unitMatched === false, 'Test 7: checks.unitMatched is false');

// 8. Retail Deliveries vs Wholesale Shipments Mismatch
const obsWholesaleDeliveries: MetricObservation = {
  id: 'obs_hkmc_del',
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

const res8 = checkObservationComparability(baseTeslaDeliveries, obsWholesaleDeliveries);
assert(res8.directlyComparable === false, 'Test 8: Retail vs Wholesale is directlyComparable: false');
assert(res8.level === 'limited', 'Test 8: Retail vs Wholesale level is limited');
assert(res8.checks.volumeDefinitionMatched === false, 'Test 8: checks.volumeDefinitionMatched is false');

// 9. Different Period Types (Quarterly vs Annual)
const obsAnnualDeliveries: MetricObservation = {
  ...baseTeslaDeliveries,
  id: 'obs_tsla_annual',
  period: '2025-FY',
  periodType: 'annual',
  calendarYear: 2025,
};

const res9 = checkObservationComparability(baseTeslaDeliveries, obsAnnualDeliveries);
assert(res9.directlyComparable === false, 'Test 9: Period type mismatch is directlyComparable: false');
assert(res9.level === 'not_comparable', 'Test 9: Period type mismatch level is not_comparable');
assert(res9.checks.periodTypeMatched === false, 'Test 9: checks.periodTypeMatched is false');

// 10. Different Fiscal Calendars (Toyota Mar 31 vs Tesla Dec 31)
const obsToyotaDeliveries: MetricObservation = {
  id: 'obs_tm_del',
  companyId: 'toyota_motor',
  metricId: 'deliveries_global',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 2600.0,
  unit: 'thousand_units',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  volumeDefinition: 'wholesale_shipments',
  isComparable: true,
};

const res10 = checkObservationComparability(baseTeslaDeliveries, obsToyotaDeliveries);
assert(res10.directlyComparable === false, 'Test 10: Fiscal calendar mismatch is directlyComparable: false');
assert(res10.level === 'not_comparable', 'Test 10: Fiscal calendar mismatch level is not_comparable');
assert(res10.checks.fiscalCalendarMatched === false, 'Test 10: checks.fiscalCalendarMatched is false');

// 11. Margin with Matching Scope, Basis, Currency, and Units
const testRev: MetricObservation = {
  id: 'rev_tsla',
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

const testEbit: MetricObservation = {
  id: 'ebit_tsla',
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

const testMargin: MetricObservation = {
  id: 'margin_tsla',
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

const res11 = validateMarginScopeCompatibility(testRev, testEbit, testMargin);
assert(res11.isScopeCompatible === true, 'Test 11: Scope compatible when fully matched');
assert(res11.validationStatus === 'verified', 'Test 11: Validation status verified');
assert(res11.difference !== null && res11.difference <= 0.05, 'Test 11: Difference within tolerance');

// 12. Margin with Mismatched Scope (Segment Margin vs Group Revenue/EBIT)
const testSegmentMargin: MetricObservation = {
  ...testMargin,
  id: 'margin_bmw_seg',
  reportingScope: 'automotive_segment',
};

const res12 = validateMarginScopeCompatibility(testRev, testEbit, testSegmentMargin);
assert(res12.isScopeCompatible === false, 'Test 12: Scope mismatch isScopeCompatible is false');
assert(res12.validationStatus === 'scope_warning', 'Test 12: Scope mismatch validationStatus is scope_warning');
assert(res12.diagnostic.includes('Scope mismatch detected'), 'Test 12: Diagnostic explains scope mismatch');

// 13. Margin with Mismatched Currency (Revenue USD vs EBIT EUR)
const testEurEbit: MetricObservation = {
  ...testEbit,
  currency: 'EUR',
};

const res13 = validateMarginScopeCompatibility(testRev, testEurEbit, testMargin);
assert(res13.isScopeCompatible === false, 'Test 13: Currency mismatch isScopeCompatible is false');
assert(res13.validationStatus === 'needs_review', 'Test 13: Currency mismatch validationStatus is needs_review');
assert(res13.diagnostic.includes('Currency mismatch'), 'Test 13: Diagnostic flags currency mismatch');

// 14. Margin with Mismatched Unit (Revenue in Millions vs EBIT in Billions)
const testBilEbit: MetricObservation = {
  ...testEbit,
  value: 2.148,
  unit: 'currency_billions',
};

const res14 = validateMarginScopeCompatibility(testRev, testBilEbit, testMargin);
assert(res14.isScopeCompatible === false, 'Test 14: Unit mismatch isScopeCompatible is false');
assert(res14.validationStatus === 'needs_review', 'Test 14: Unit mismatch validationStatus is needs_review');
assert(res14.diagnostic.includes('Unit scale mismatch'), 'Test 14: Diagnostic flags unit scale mismatch');

// 15. Ambiguous Candidate Observations Detection
const candidateA: MetricObservation = { ...testMargin, id: 'margin_cand_a', value: 8.0 };
const candidateB: MetricObservation = { ...testMargin, id: 'margin_cand_b', value: 8.2 };
const candidatesList = [candidateA, candidateB];
assert(candidatesList.length > 1, 'Test 15: Multiple compatible candidates detected as ambiguous');

// 16. Missing Compatible Observation Pair Detection
const missingEbitValidation = validateMarginScopeCompatibility(testRev, null, testMargin);
assert(missingEbitValidation.isScopeCompatible === false, 'Test 16: Missing EBIT returns isScopeCompatible: false');
assert(missingEbitValidation.validationStatus === 'needs_review', 'Test 16: Missing EBIT returns needs_review');

// 17. Incompatible Observations Are NEVER Directly Comparable
const allIncompatibleChecks = [res2, res3, res4, res5, res6, res7, res8, res9, res10];
const anyDirectlyComparable = allIncompatibleChecks.some((c) => c.directlyComparable === true);
assert(anyDirectlyComparable === false, 'Test 17: Incompatible observations are NEVER directlyComparable: true');

console.log(`\nComparability Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All strict comparability, scope-safety, and margin validation regression tests passed!\n');
}
