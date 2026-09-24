/**
 * AutoMetrics Intelligence — BEV Share Validation & Candidate Selection Regression Test Suite
 *
 * Covers all STEP 3-1 requirements:
 * 1. Valid BEV share (validationStatus = 'verified', isValid = true)
 * 2. Zero total deliveries (isValid = false, diagnostic: total deliveries must be positive)
 * 3. Negative BEV deliveries (isValid = false, diagnostic: BEV deliveries cannot be negative)
 * 4. BEV deliveries greater than total deliveries (isValid = false, diagnostic: cannot exceed total)
 * 5. Different reporting scopes (validationStatus = 'scope_warning', isValid = false)
 * 6. Different volume definitions (validationStatus = 'scope_warning', isValid = false)
 * 7. Different accounting bases (validationStatus = 'scope_warning', isValid = false)
 * 8. Missing candidate (status = 'missing')
 * 9. Multiple compatible candidates (status = 'ambiguous', no first-candidate selection)
 * 10. Different units (validationStatus = 'needs_review', isValid = false)
 * 11. Different periods (validationStatus = 'needs_review', isValid = false)
 * 12. Reported share deviation above threshold (validationStatus = 'needs_review', isValid = false)
 */

import {
  calculateBEVShare,
  validateBEVShare,
  selectCompatibleBevShareTriplets,
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

console.log('🧪 Starting BEV Share Validation & Candidate Selection Test Suite...\n');

// Standard Base Observations
const baseTot: MetricObservation = {
  id: 'obs_vw_del_2026_q2',
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

const baseBev: MetricObservation = {
  id: 'obs_vw_bev_2026_q2',
  companyId: 'volkswagen_group',
  metricId: 'bev_deliveries',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 202.0,
  unit: 'thousand_units',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  volumeDefinition: 'retail_deliveries',
  isComparable: true,
};

const baseShare: MetricObservation = {
  id: 'obs_vw_share_2026_q2',
  companyId: 'volkswagen_group',
  metricId: 'bev_share',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 9.0,
  unit: 'percentage',
  valueType: 'derived',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  volumeDefinition: 'retail_deliveries',
  verificationStatus: 'verified',
  isComparable: true,
};

// 1. Valid BEV Share Validation
const res1 = validateBEVShare(baseTot, baseBev, baseShare);
assert(res1.isValid === true, 'Test 1: Valid BEV share is isValid: true');
assert(res1.validationStatus === 'verified', 'Test 1: Valid BEV share status is verified');
assert(res1.calculatedShare === 9.0, 'Test 1: Calculated share is 9.0%');
assert(res1.difference === 0.0, 'Test 1: Math difference is 0.0%p');
assert(res1.matchedObservationIds.length === 3, 'Test 1: Matched 3 observation IDs');

// 2. Zero Total Deliveries
const obsZeroTot: MetricObservation = { ...baseTot, value: 0 };
const res2 = validateBEVShare(obsZeroTot, baseBev, baseShare);
assert(res2.isValid === false, 'Test 2: Zero total deliveries is isValid: false');
assert(res2.validationStatus === 'needs_review', 'Test 2: Zero total deliveries is needs_review');
assert(res2.diagnostic.includes('positive'), 'Test 2: Diagnostic mentions positive total deliveries');

// 3. Negative BEV Deliveries
const obsNegBev: MetricObservation = { ...baseBev, value: -10 };
const res3 = validateBEVShare(baseTot, obsNegBev, baseShare);
assert(res3.isValid === false, 'Test 3: Negative BEV deliveries is isValid: false');
assert(res3.validationStatus === 'needs_review', 'Test 3: Negative BEV deliveries is needs_review');
assert(res3.diagnostic.includes('negative'), 'Test 3: Diagnostic mentions negative BEV');

// 4. BEV Deliveries Greater Than Total Deliveries
const obsOverBev: MetricObservation = { ...baseBev, value: 3000.0 };
const res4 = validateBEVShare(baseTot, obsOverBev, baseShare);
assert(res4.isValid === false, 'Test 4: BEV > Total deliveries is isValid: false');
assert(res4.validationStatus === 'needs_review', 'Test 4: BEV > Total deliveries is needs_review');
assert(res4.diagnostic.includes('cannot exceed'), 'Test 4: Diagnostic explains BEV cannot exceed total');

// 5. Different Reporting Scopes (e.g. segment vs group)
const obsSegBev: MetricObservation = { ...baseBev, reportingScope: 'automotive_segment' };
const res5 = validateBEVShare(baseTot, obsSegBev, baseShare);
assert(res5.isValid === false, 'Test 5: Scope mismatch is isValid: false');
assert(res5.validationStatus === 'scope_warning', 'Test 5: Scope mismatch status is scope_warning');
assert(res5.diagnostic.includes('Reporting scope mismatch'), 'Test 5: Diagnostic notes scope mismatch');

// 6. Different Volume Definitions (Retail vs Wholesale)
const obsWholesaleBev: MetricObservation = { ...baseBev, volumeDefinition: 'wholesale_shipments' };
const res6 = validateBEVShare(baseTot, obsWholesaleBev, baseShare);
assert(res6.isValid === false, 'Test 6: Volume definition mismatch is isValid: false');
assert(res6.validationStatus === 'scope_warning', 'Test 6: Volume definition status is scope_warning');
assert(res6.diagnostic.includes('Volume definition mismatch'), 'Test 6: Diagnostic notes volume mismatch');

// 7. Different Accounting Bases
const obsAdjBev: MetricObservation = { ...baseBev, accountingBasis: 'adjusted' };
const res7 = validateBEVShare(baseTot, obsAdjBev, baseShare);
assert(res7.isValid === false, 'Test 7: Accounting basis mismatch is isValid: false');
assert(res7.validationStatus === 'scope_warning', 'Test 7: Accounting basis status is scope_warning');
assert(res7.diagnostic.includes('Accounting basis mismatch'), 'Test 7: Diagnostic notes accounting basis mismatch');

// 8. Missing Candidate in selectCompatibleBevShareTriplets
const incompleteObservations = [baseTot, baseBev]; // missing share
const res8 = selectCompatibleBevShareTriplets(incompleteObservations, 'volkswagen_group', '2026-Q2');
assert(res8.status === 'missing', 'Test 8: Missing candidate returns status: missing');
assert(res8.reasons.some((r) => r.includes('Missing reported BEV share')), 'Test 8: Reason identifies missing share');

// 9. Multiple Compatible Candidates (Ambiguous Selection)
const duplicateShare: MetricObservation = { ...baseShare, id: 'obs_vw_share_alt', value: 9.2 };
const ambiguousObservations = [baseTot, baseBev, baseShare, duplicateShare];
const res9 = selectCompatibleBevShareTriplets(ambiguousObservations, 'volkswagen_group', '2026-Q2');
assert(res9.status === 'ambiguous', 'Test 9: Multiple compatible triplets return status: ambiguous');
assert(res9.reasons.some((r) => r.includes('Ambiguous candidate observations')), 'Test 9: Reason explains ambiguity');

// 10. Different Units (e.g. thousand_units vs units)
const obsUnitsBev: MetricObservation = { ...baseBev, unit: 'units', value: 202000 };
const res10 = validateBEVShare(baseTot, obsUnitsBev, baseShare);
assert(res10.isValid === false, 'Test 10: Unit mismatch is isValid: false');
assert(res10.validationStatus === 'needs_review', 'Test 10: Unit mismatch status is needs_review');
assert(res10.diagnostic.includes('Unit scale mismatch'), 'Test 10: Diagnostic notes unit mismatch');

// 11. Different Periods (e.g. 2026-Q2 vs 2026-Q1)
const obsQ1Bev: MetricObservation = { ...baseBev, period: '2026-Q1' };
const res11 = validateBEVShare(baseTot, obsQ1Bev, baseShare);
assert(res11.isValid === false, 'Test 11: Period mismatch is isValid: false');
assert(res11.validationStatus === 'needs_review', 'Test 11: Period mismatch status is needs_review');
assert(res11.diagnostic.includes('Period mismatch'), 'Test 11: Diagnostic notes period mismatch');

// 12. Reported Share Deviation Above Threshold
const obsDeviatedShare: MetricObservation = { ...baseShare, value: 12.5 }; // calculated is 9.0%, diff is 3.5%p > 0.35%p
const res12 = validateBEVShare(baseTot, baseBev, obsDeviatedShare);
assert(res12.isValid === false, 'Test 12: Math deviation > 0.35%p is isValid: false');
assert(res12.validationStatus === 'needs_review', 'Test 12: Math deviation status is needs_review');
assert(res12.diagnostic.includes('Mathematical deviation'), 'Test 12: Diagnostic explains mathematical deviation');

// 13. Test calculateBEVShare pure function bounds
assert(calculateBEVShare(202, 2244) === 9.0, 'Test 13: calculateBEVShare pure calculation works');
assert(calculateBEVShare(2500, 2244) === null, 'Test 13: calculateBEVShare returns null when bev > tot');
assert(calculateBEVShare(-10, 2244) === null, 'Test 13: calculateBEVShare returns null when bev < 0');
assert(calculateBEVShare(100, 0) === null, 'Test 13: calculateBEVShare returns null when tot is 0');

console.log(`\nBEV Share Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All BEV share validation & candidate selection regression tests passed!\n');
}
