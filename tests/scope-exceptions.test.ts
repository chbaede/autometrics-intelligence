/**
 * AutoMetrics Intelligence — Scope Exception Registry Tests (STEP 4-3)
 *
 * Tests for:
 * 1. Company-only exception must be rejected
 * 2. Exact exception with valid source evidence is accepted
 * 3. Wrong metric relationship cannot become documented
 * 4. Wrong accounting basis cannot become documented
 * 5. Wrong scope cannot become documented without exact exception
 * 6. Missing source document prevents documented classification
 * 7. Reported operating income cannot be used for adjusted EBIT margin
 * 8. Adjusted EBIT cannot be used for reported operating margin
 * 9. Conflicting observations with the same dimensional key
 * 10. Corroborating observations from different official sources
 * 11. Quarterly vs annual period mismatch
 * 12. periodType-based audit grouping prevents mixing
 * 13. Strict mode fails on blocking findings
 * 14. Strict mode fails on review findings
 * 15. Strict mode passes with only documented findings
 * 16. Documented findings require evidence fields
 * 17. BEV scope incompatibilities are blocking (no documented exceptions)
 */

import {
  findDocumentedScopeException,
  DOCUMENTED_SCOPE_EXCEPTIONS,
} from '../src/data/scopeExceptions';
import {
  getDimensionalObservationKey,
  getEvidenceIdentityKey,
  getCanonicalObservationKey,
  validateMarginTriplet,
} from '../src/utils/metricCalculations';
import {
  MetricObservation,
  AuditFinding,
} from '../src/types/metrics';

let passed = 0;
let failed = 0;

function check(condition: boolean, message: string): void {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('\n🔒 STEP 4-3 Scope Exception & Policy Tests\n');

// ── Shared known source docs set ───────────────────────────────────────────
const knownSourceDocIds = new Set<string>([
  'bmw_2026_q2_statement',
  'bmw_2026_q1_statement',
  'bmw_2025_fy_statement',
  'bmw_2024_fy_statement',
  'mbg_2026_q2_results',
  'mbg_2026_q1_results',
  'mbg_2025_fy_results',
  'mbg_2024_fy_results',
]);

// ── Base observation builder ───────────────────────────────────────────────
function makeObs(overrides: Partial<MetricObservation>): MetricObservation {
  return {
    id: 'test_obs',
    companyId: 'volkswagen_group',
    metricId: 'revenue',
    period: '2026-Q2',
    periodType: 'quarterly',
    calendarYear: 2026,
    calendarQuarter: 2,
    value: 100000,
    unit: 'currency_millions',
    currency: 'EUR',
    valueType: 'reported',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    isComparable: true,
    verificationStatus: 'verified',
    verificationMethod: 'official_pdf_filing',
    sourceDocId: 'vw_2026_q2_report',
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 1: Company-only exception must be rejected
// BMW with wrong metric relationship — company name alone is not enough
// ────────────────────────────────────────────────────────────────────────────
{
  const result = findDocumentedScopeException(
    'bmw_group',
    '2026-Q2',
    'operating_margin',
    'adjusted_ebit',          // Wrong: BMW registry uses 'operating_income'
    'revenue',
    'consolidated_group',     // Wrong scope
    'consolidated_group',
    'consolidated_group',
    'reported',
    'reported',
    'reported',
    knownSourceDocIds
  );
  check(result.matched === false, 'Test 1a: BMW with wrong numerator metricId is rejected');
  check(!!result.rejectionReasons && result.rejectionReasons.length > 0, 'Test 1b: Rejection includes reasons');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 2: Exact exception with valid source evidence is accepted
// Uses actual observation scopes from BMW data (operating_income = consolidated_group)
// ────────────────────────────────────────────────────────────────────────────
{
  const result = findDocumentedScopeException(
    'bmw_group',
    '2026-Q2',
    'operating_margin',
    'operating_income',
    'revenue',
    'consolidated_group',     // Actual data: BMW operating_income is consolidated_group
    'consolidated_group',     // Actual data: BMW revenue is consolidated_group
    'automotive_segment',     // Actual data: BMW margin is automotive_segment
    'reported',
    'reported',
    'reported',
    knownSourceDocIds
  );
  check(result.matched === true, 'Test 2a: Exact BMW exception match succeeds');
  check(result.exceptionId === 'bmw_automotive_segment_ros_2026q2', 'Test 2b: Correct exception ID returned');
  check(Array.isArray(result.sourceDocIds) && result.sourceDocIds!.length > 0, 'Test 2c: Source document IDs present');
  check(typeof result.rationale === 'string' && result.rationale.length > 10, 'Test 2d: Rationale is non-empty text');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 3: Wrong metric relationship cannot become documented
// ────────────────────────────────────────────────────────────────────────────
{
  const result = findDocumentedScopeException(
    'bmw_group',
    '2026-Q2',
    'operating_margin',
    'adjusted_ebit',         // Wrong numerator — BMW uses operating_income
    'revenue',
    'automotive_segment',
    'consolidated_group',
    'automotive_segment',
    'adjusted',              // Wrong basis
    'reported',
    'adjusted',
    knownSourceDocIds
  );
  check(result.matched === false, 'Test 3: Wrong numerator metric + adjusted basis is rejected for BMW');
  check(
    result.rejectionReasons?.some(r => r.includes('numeratorMetricId') || r.includes('numeratorBasis')) ?? false,
    'Test 3b: Rejection cites specific mismatch dimension'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 4: Wrong accounting basis cannot become documented
// ────────────────────────────────────────────────────────────────────────────
{
  const result = findDocumentedScopeException(
    'bmw_group',
    '2026-Q2',
    'operating_margin',
    'operating_income',
    'revenue',
    'automotive_segment',
    'consolidated_group',
    'automotive_segment',
    'adjusted',    // Wrong: BMW exception requires 'reported'
    'reported',
    'reported',
    knownSourceDocIds
  );
  check(result.matched === false, 'Test 4: Wrong numeratorBasis (adjusted vs reported) is rejected for BMW');
  check(
    result.rejectionReasons?.some(r => r.includes('numeratorBasis')) ?? false,
    'Test 4b: Rejection cites numeratorBasis mismatch'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 5: Wrong scope cannot become documented without exact exception
// VW has no registered exceptions — all incompatible triplets are blocking
// ────────────────────────────────────────────────────────────────────────────
{
  const result = findDocumentedScopeException(
    'volkswagen_group',
    '2026-Q2',
    'operating_margin',
    'operating_income',
    'revenue',
    'automotive_segment',
    'consolidated_group',
    'automotive_segment',
    'reported',
    'reported',
    'reported',
    knownSourceDocIds
  );
  check(result.matched === false, 'Test 5: Unknown company with scope mismatch is not approved as documented');
  check(
    result.rejectionReasons?.[0]?.includes('volkswagen_group') ?? false,
    'Test 5b: Rejection reason mentions company'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 6: Missing source document prevents documented classification
// ────────────────────────────────────────────────────────────────────────────
{
  const emptySourceDocs = new Set<string>(); // No known docs in registry
  const result = findDocumentedScopeException(
    'bmw_group',
    '2026-Q2',
    'operating_margin',
    'operating_income',
    'revenue',
    'automotive_segment',
    'consolidated_group',
    'automotive_segment',
    'reported',
    'reported',
    'reported',
    emptySourceDocs
  );
  check(result.matched === false, 'Test 6: Missing source document prevents documented classification');
  check(
    result.rejectionReasons?.some(r =>
      r.includes('not found in registry') || r.includes('no source') || r.includes('Source documents')
    ) ?? false,
    'Test 6b: Rejection cites missing source document'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 7: Reported operating income cannot be used for adjusted EBIT margin
// ────────────────────────────────────────────────────────────────────────────
{
  const baseRev = makeObs({
    id: 'rev7', metricId: 'revenue', value: 100000,
    reportingScope: 'consolidated_group', accountingBasis: 'reported',
    verificationStatus: 'verified', sourceDocId: 'vw_2026_q2_report'
  });
  const wrongProfit = makeObs({
    id: 'profit7', metricId: 'operating_income', value: 5000,
    reportingScope: 'consolidated_group', accountingBasis: 'reported',
    verificationStatus: 'verified', sourceDocId: 'vw_2026_q2_report'
  });
  // Margin with adjusted basis — no rule maps reported operating_income → adjusted margin
  const adjMargin = makeObs({
    id: 'margin7', metricId: 'operating_margin', value: 5.0,
    unit: 'percentage', valueType: 'derived',
    reportingScope: 'consolidated_group', accountingBasis: 'adjusted',
    currency: undefined, verificationStatus: 'verified',
    sourceDocId: 'vw_2026_q2_report'
  });
  const result = validateMarginTriplet(baseRev, wrongProfit, adjMargin);
  check(
    result.checks.relationshipRule === false || result.status === 'invalid',
    'Test 7: Reported operating_income fails adjusted EBIT margin rule'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 8: Adjusted EBIT cannot be used for reported operating margin
// ────────────────────────────────────────────────────────────────────────────
{
  const baseRev = makeObs({
    id: 'rev8', metricId: 'revenue', value: 100000,
    reportingScope: 'consolidated_group', accountingBasis: 'reported',
    verificationStatus: 'verified', sourceDocId: 'vw_2026_q2_report'
  });
  const adjEbit = makeObs({
    id: 'adj_ebit8', metricId: 'adjusted_ebit', value: 5000,
    reportingScope: 'consolidated_group', accountingBasis: 'adjusted',
    verificationStatus: 'verified', sourceDocId: 'vw_2026_q2_report'
  });
  // Margin with reported basis — no rule maps adjusted_ebit → reported margin
  const repMargin = makeObs({
    id: 'margin8', metricId: 'operating_margin', value: 5.0,
    unit: 'percentage', valueType: 'derived',
    reportingScope: 'consolidated_group', accountingBasis: 'reported',
    currency: undefined, verificationStatus: 'verified',
    sourceDocId: 'vw_2026_q2_report'
  });
  const result = validateMarginTriplet(baseRev, adjEbit, repMargin);
  check(
    result.checks.relationshipRule === false || result.status === 'invalid',
    'Test 8: Adjusted EBIT fails reported operating margin rule'
  );
  check(result.failedChecks.includes('relationshipRule'), 'Test 8b: failedChecks includes relationshipRule');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 9: Conflicting observations with the same dimensional key
// Same source doc, same dimensions, different values → conflict (blocking)
// ────────────────────────────────────────────────────────────────────────────
{
  const obs1 = makeObs({ id: 'obs9a', value: 100, sourceDocId: 'doc_1' });
  const obs2 = makeObs({ id: 'obs9b', value: 200, sourceDocId: 'doc_1' });

  const key1 = getDimensionalObservationKey(obs1);
  const key2 = getDimensionalObservationKey(obs2);
  check(key1 === key2, 'Test 9a: Same dimensional key for matching dimensions');
  check(obs1.value !== obs2.value, 'Test 9b: Values differ — this would be a blocking conflict');

  // Evidence keys also match here (same source doc, same other metadata)
  const evKey1 = getEvidenceIdentityKey(obs1);
  const evKey2 = getEvidenceIdentityKey(obs2);
  check(evKey1 === evKey2, 'Test 9c: Evidence keys match for same source doc (exact duplicate conflict case)');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 10: Corroborating observations from different official sources
// Same value, different source docs → corroboration (INFO, non-blocking)
// ────────────────────────────────────────────────────────────────────────────
{
  const obs1 = makeObs({ id: 'corr10a', value: 100, sourceDocId: 'doc_primary' });
  const obs2 = makeObs({ id: 'corr10b', value: 100, sourceDocId: 'doc_secondary' });

  const dimKey1 = getDimensionalObservationKey(obs1);
  const dimKey2 = getDimensionalObservationKey(obs2);
  const evKey1 = getEvidenceIdentityKey(obs1);
  const evKey2 = getEvidenceIdentityKey(obs2);

  check(dimKey1 === dimKey2, 'Test 10a: Same dimensional key for corroborating observations');
  check(evKey1 !== evKey2, 'Test 10b: Different evidence keys for different source documents');
  check(obs1.value === obs2.value, 'Test 10c: Values are same (corroboration, not conflict)');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 11: Quarterly vs annual period mismatch
// ────────────────────────────────────────────────────────────────────────────
{
  const qObs = makeObs({ id: 'q11', period: '2026-Q2', periodType: 'quarterly', value: 25000 });
  const aObs = makeObs({ id: 'a11', period: '2026-FY', periodType: 'annual', value: 100000 });

  check(
    getDimensionalObservationKey(qObs) !== getDimensionalObservationKey(aObs),
    'Test 11a: Quarterly and annual observations have different dimensional keys'
  );

  // Period mismatch in margin triplet
  const annualRev = makeObs({
    id: 'arev11', period: '2026-FY', periodType: 'annual', metricId: 'revenue',
    value: 100000, sourceDocId: 'vw_2026_fy_report', verificationStatus: 'verified'
  });
  const quarterlyProfit = makeObs({
    id: 'qprofit11', period: '2026-Q2', periodType: 'quarterly', metricId: 'operating_income',
    value: 5000, sourceDocId: 'vw_2026_q2_report', verificationStatus: 'verified'
  });
  const quarterlyMargin = makeObs({
    id: 'qmargin11', period: '2026-Q2', periodType: 'quarterly', metricId: 'operating_margin',
    value: 5.0, unit: 'percentage', valueType: 'derived', currency: undefined,
    sourceDocId: 'vw_2026_q2_report', verificationStatus: 'verified'
  });

  const result = validateMarginTriplet(annualRev, quarterlyProfit, quarterlyMargin);
  check(
    result.checks.period === false || result.checks.periodType === false,
    'Test 11b: Period/periodType mismatch detected by validateMarginTriplet'
  );
  check(result.status === 'invalid', 'Test 11c: Quarterly/annual mismatch results in invalid status');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 12: periodType in dimensional key prevents quarterly/annual mixing
// ────────────────────────────────────────────────────────────────────────────
{
  const qObs = makeObs({ id: 'q12', period: '2026-H1', periodType: 'quarterly' });
  const sObs = makeObs({ id: 's12', period: '2026-H1', periodType: 'semi_annual' });

  check(
    getDimensionalObservationKey(qObs) !== getDimensionalObservationKey(sObs),
    'Test 12: Different periodTypes produce different dimensional keys (no mixing)'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 13: Strict mode fails on blocking findings
// ────────────────────────────────────────────────────────────────────────────
{
  const findings: AuditFinding[] = [
    { severity: 'ERROR', disposition: 'blocking', category: 'MATH_MISMATCH', item: 'test', detail: 'error' },
  ];
  const blockingCount = findings.filter(f => f.disposition === 'blocking').length;
  const reviewCount = findings.filter(f => f.disposition === 'review').length;
  const isStrict = true;
  const willFail = blockingCount > 0 || (isStrict && reviewCount > 0);
  check(willFail === true, 'Test 13: Strict mode fails when blocking finding is present');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 14: Strict mode fails on review findings (no blocking present)
// ────────────────────────────────────────────────────────────────────────────
{
  const findings: AuditFinding[] = [
    { severity: 'WARNING', disposition: 'review', category: 'SCOPE_MISMATCH', item: 'test', detail: 'review' },
  ];
  const blockingCount = findings.filter(f => f.disposition === 'blocking').length;
  const reviewCount = findings.filter(f => f.disposition === 'review').length;
  const isStrict = true;
  const willFail = blockingCount > 0 || (isStrict && reviewCount > 0);
  check(willFail === true, 'Test 14: Strict mode fails when review finding is present');
  check(blockingCount === 0, 'Test 14b: No blocking findings in this case (only review)');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 15: Strict mode passes with only documented findings (no blocking/review)
// ────────────────────────────────────────────────────────────────────────────
{
  const findings: AuditFinding[] = [
    {
      severity: 'WARNING',
      disposition: 'documented',
      category: 'SCOPE_MISMATCH',
      item: 'bmw_group (2026-Q2)',
      exceptionId: 'bmw_automotive_segment_ros_2026q2',
      sourceDocIds: ['bmw_2026_q2_statement'],
      detail: 'Documented exception with evidence',
    },
  ];
  const blockingCount = findings.filter(f => f.disposition === 'blocking').length;
  const reviewCount = findings.filter(f => f.disposition === 'review').length;
  const isStrict = true;
  const willFail = blockingCount > 0 || (isStrict && reviewCount > 0);
  check(willFail === false, 'Test 15: Strict mode passes when only documented findings exist');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 16: Documented findings require evidence fields (exceptionId + sourceDocIds)
// ────────────────────────────────────────────────────────────────────────────
{
  const withEvidence: AuditFinding = {
    severity: 'WARNING',
    disposition: 'documented',
    category: 'SCOPE_MISMATCH',
    exceptionId: 'some_exception_id',
    sourceDocIds: ['doc_001'],
    detail: 'has evidence',
  };
  const withoutEvidence: AuditFinding = {
    severity: 'WARNING',
    disposition: 'documented',
    category: 'SCOPE_MISMATCH',
    // No exceptionId, no sourceDocIds
    detail: 'no evidence',
  };

  const hasEvidence = (f: AuditFinding) => !!f.exceptionId && !!f.sourceDocIds && f.sourceDocIds.length > 0;
  check(hasEvidence(withEvidence) === true, 'Test 16a: Documented finding with evidence passes check');
  check(hasEvidence(withoutEvidence) === false, 'Test 16b: Documented finding without evidence fails check');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 17: BEV scope incompatibilities are blocking — no documented exceptions
// ────────────────────────────────────────────────────────────────────────────
{
  // Verify DOCUMENTED_SCOPE_EXCEPTIONS contains no BEV-related entries
  const bevExceptions = DOCUMENTED_SCOPE_EXCEPTIONS.filter(e =>
    e.marginMetricId?.includes('bev') ||
    e.numeratorMetricId?.includes('bev') ||
    e.denominatorMetricId?.includes('bev')
  );
  check(bevExceptions.length === 0, 'Test 17a: No BEV-related entries in DOCUMENTED_SCOPE_EXCEPTIONS');

  // Attempting to look up BEV exception returns no match
  const bevResult = findDocumentedScopeException(
    'tesla',
    '2026-Q2',
    'bev_share',
    'bev_deliveries',
    'deliveries_global',
    'consolidated_group',
    'consolidated_group',
    'consolidated_group',
    'reported',
    'reported',
    'reported',
    knownSourceDocIds
  );
  check(bevResult.matched === false, 'Test 17b: BEV triplet returns no documented exception (blocking by policy)');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 18: All registry exceptions have at least one sourceDocId
// ────────────────────────────────────────────────────────────────────────────
{
  const withoutDocs = DOCUMENTED_SCOPE_EXCEPTIONS.filter(
    e => !e.sourceDocIds || e.sourceDocIds.length === 0
  );
  check(withoutDocs.length === 0, 'Test 18: All registry exceptions have at least one sourceDocId');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 19: getDimensionalObservationKey and getCanonicalObservationKey are equivalent
// ────────────────────────────────────────────────────────────────────────────
{
  const obs = makeObs({});
  check(
    getDimensionalObservationKey(obs) === getCanonicalObservationKey(obs),
    'Test 19: getDimensionalObservationKey === getCanonicalObservationKey (backward compat)'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 20: Mercedes exact exception match (updated to match actual data scopes)
// ────────────────────────────────────────────────────────────────────────────
{
  // Mercedes data: operating_income (consolidated_group, reported) as numerator
  // margin: cars_segment, adjusted
  const result = findDocumentedScopeException(
    'mercedes_benz',
    '2026-Q2',
    'operating_margin',
    'operating_income',       // Actual data: operating_income (not adjusted_ebit)
    'revenue',
    'consolidated_group',     // Actual data: consolidated_group
    'consolidated_group',     // Actual data: consolidated_group
    'cars_segment',           // Actual margin scope
    'reported',               // Actual numerator basis
    'reported',
    'adjusted',               // Margin basis
    knownSourceDocIds
  );
  check(result.matched === true, 'Test 20a: Exact Mercedes Cars Adjusted RoS exception matches (updated registry)');
  check(result.exceptionId === 'mbg_cars_adjusted_ros_2026q2', 'Test 20b: Correct Mercedes exception ID returned');
}

// ────────────────────────────────────────────────────────────────────────────
console.log(`\nScope Exception & Policy Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All scope exception and policy tests passed!\n');
}
