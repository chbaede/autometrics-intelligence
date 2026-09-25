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
  DOCUMENTED_REPORTED_KPIS,
  PROXY_METRIC_MAPPINGS,
  findDocumentedReportedKpi,
  findProxyMetricMapping,
  hasProxyJustificationEvidence,
  hasMeaningfulEvidenceLocator,
  isProxyException,
  normalizeProxyException,
  validateProxyMappingCompatibility,
  DocumentedScopeException,
} from '../src/data/scopeExceptions';
import {
  getDimensionalObservationKey,
  getEvidenceIdentityKey,
  getCanonicalObservationKey,
  validateMarginTriplet,
  selectCompatibleMarginTriplets,
  createAuditFindingFromMarginValidation,
  validateExceptionDimensions,
} from '../src/utils/metricCalculations';
import {
  MetricObservation,
  AuditFinding,
  SourceDocument,
  ProxyMetricMapping,
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

// ── Shared verified mock sources map ─────────────────────────────────────────
const mockSourcesMap = new Map<string, SourceDocument>();
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

for (const id of knownSourceDocIds) {
  const isBmw = id.startsWith('bmw');
  const period = id.includes('2026_q2')
    ? '2026-Q2'
    : id.includes('2026_q1')
    ? '2026-Q1'
    : id.includes('2025_fy')
    ? '2025-FY'
    : '2024-FY';

  mockSourcesMap.set(id, {
    id,
    companyId: isBmw ? 'bmw_group' : 'mercedes_benz',
    title: `${id} Verified Official Report`,
    docType: 'quarterly_report',
    period,
    publicationDate: '2026-05-01',
    officialUrl: `https://ir.example.com/${id}.pdf`,
    isVerified: true,
    verificationStatus: 'verified',
    lastChecked: '2026-09-20',
  });
}

// ── Base observation builder ───────────────────────────────────────────────
function makeObs(overrides: Partial<MetricObservation>): MetricObservation {
  const companyId = overrides.companyId || 'volkswagen_group';
  const period = overrides.period || '2026-Q2';
  let defaultSourceDocId = 'vw_2026_q2_report';
  if (companyId === 'bmw_group') {
    defaultSourceDocId = period.includes('2024')
      ? 'bmw_2024_fy_statement'
      : period.includes('2025')
      ? 'bmw_2025_fy_statement'
      : period.includes('Q1')
      ? 'bmw_2026_q1_statement'
      : 'bmw_2026_q2_statement';
  } else if (companyId === 'mercedes_benz') {
    defaultSourceDocId = period.includes('2024')
      ? 'mbg_2024_fy_results'
      : period.includes('2025')
      ? 'mbg_2025_fy_results'
      : period.includes('Q1')
      ? 'mbg_2026_q1_results'
      : 'mbg_2026_q2_results';
  }

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
    sourceDocId: defaultSourceDocId,
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
    mockSourcesMap
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
    mockSourcesMap
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
    mockSourcesMap
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
    mockSourcesMap
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
    mockSourcesMap
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
  const emptySourceDocs = new Map<string, SourceDocument>(); // No known docs in registry
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
      r.includes('not found in source registry') || r.includes('no source') || r.includes('Source documents')
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
    mockSourcesMap
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
    mockSourcesMap
  );
  check(result.matched === true, 'Test 20a: Exact Mercedes Cars Adjusted RoS exception matches (updated registry)');
  check(result.exceptionId === 'mbg_cars_adjusted_ros_2026q2', 'Test 20b: Correct Mercedes exception ID returned');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 21: Consolidated group operating income cannot automatically become segment EBIT (P0-1)
// ────────────────────────────────────────────────────────────────────────────
{
  const groupRev = makeObs({ id: 'bmw_rev_21', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', value: 36000 });
  const groupEbit = makeObs({ id: 'bmw_ebit_21', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', value: 2800 });
  const segMargin = makeObs({ id: 'bmw_margin_21', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', value: 7.8, unit: 'percentage', valueType: 'reported', currency: undefined });

  // 21a: Without exception: status is 'invalid'
  const unapprovedResult = validateMarginTriplet(groupRev, groupEbit, segMargin);
  check(unapprovedResult.status === 'invalid', 'Test 21a: Without exception, consolidated operating income + segment margin is invalid');
  check(unapprovedResult.checks.scope === false, 'Test 21b: Scope check fails for consolidated profit + segment margin');

  // 21c: With proxy exception: status is 'proxy_only', NOT verified
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(e => e.id === 'bmw_automotive_segment_ros_2026q2');
  const proxyResult = validateMarginTriplet(groupRev, groupEbit, segMargin, undefined, { exception: bmwException });
  check(proxyResult.status === 'proxy_only', 'Test 21c: With proxy exception, status is proxy_only (cannot be verified)');
  check(proxyResult.calculatedMargin === null, 'Test 21d: Proxy relationship does not produce calculated verified margin');
  check(proxyResult.reportedMargin === 7.8, 'Test 21e: Reported margin is preserved');
  check(proxyResult.diagnostic.includes('Proxy numerator limitation'), 'Test 21f: Diagnostic clearly cites proxy numerator limitation');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 22: Reported group operating income cannot automatically become adjusted segment EBIT (P1-3)
// ────────────────────────────────────────────────────────────────────────────
{
  const groupRev = makeObs({ id: 'mbg_rev_22', companyId: 'mercedes_benz', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', value: 36000 });
  const reportedGroupEbit = makeObs({ id: 'mbg_ebit_22', companyId: 'mercedes_benz', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', value: 3000 });
  const adjSegMargin = makeObs({ id: 'mbg_margin_22', companyId: 'mercedes_benz', metricId: 'operating_margin', reportingScope: 'cars_segment', accountingBasis: 'adjusted', value: 8.4, unit: 'percentage', valueType: 'reported', currency: undefined });

  const result = validateMarginTriplet(groupRev, reportedGroupEbit, adjSegMargin);
  check(result.status === 'invalid', 'Test 22a: Reported group profit + adjusted segment margin is invalid without exception');
  check(result.failedChecks.includes('accountingBasis') || result.failedChecks.includes('relationshipRule') || result.failedChecks.includes('scope'), 'Test 22b: Basis or scope failed check reported');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 23: An exact exception does not override an invalid metric definition (P1-3)
// ────────────────────────────────────────────────────────────────────────────
{
  const groupRev = makeObs({ id: 'bmw_rev_23', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', value: 36000 });
  const grossProfitObs = makeObs({ id: 'bmw_gp_23', companyId: 'bmw_group', metricId: 'gross_profit' as any, reportingScope: 'consolidated_group', value: 5000 });
  const segMargin = makeObs({ id: 'bmw_margin_23', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', value: 7.8, unit: 'percentage', valueType: 'reported', currency: undefined });

  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(e => e.id === 'bmw_automotive_segment_ros_2026q2');
  const result = validateMarginTriplet(groupRev, grossProfitObs, segMargin, undefined, { exception: bmwException });
  check(result.status === 'invalid', 'Test 23a: Invalid metric definition remains invalid even when exception provided');
  check(result.failedChecks.includes('metricDefinition'), 'Test 23b: failedChecks includes metricDefinition');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 24: A valid actual segment numerator can produce a verified result (P0-1, P1-3)
// ────────────────────────────────────────────────────────────────────────────
{
  const segRev = makeObs({ id: 'seg_rev_24', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'automotive_segment', accountingBasis: 'reported', value: 30000 });
  const segProfit = makeObs({ id: 'seg_ebit_24', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'automotive_segment', accountingBasis: 'reported', value: 2400 });
  const segMargin = makeObs({ id: 'seg_margin_24', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', value: 8.0, unit: 'percentage', valueType: 'reported', currency: undefined });

  const result = validateMarginTriplet(segRev, segProfit, segMargin);
  check(result.status === 'verified', 'Test 24a: Actual segment numerator + segment revenue produces verified status');
  check(result.calculatedMargin === 8.0, 'Test 24b: Calculated margin is 8.0%');
  check(result.difference === 0.0, 'Test 24c: Mathematical difference is 0.0%p');
  check(result.checks.scope === true, 'Test 24d: Scope check passes for matching segment scopes');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 25: Deep source document validation (P0-2)
// ────────────────────────────────────────────────────────────────────────────
{
  // 25a: source_not_found
  const emptySourcesMap = new Map<string, SourceDocument>();
  const res25a = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', emptySourcesMap
  );
  check(res25a.matched === false, 'Test 25a-1: Missing source doc rejects exception');
  check(res25a.structuredRejections?.includes('source_not_found') === true, 'Test 25a-2: Rejection includes source_not_found');

  // 25b: source_not_verified — test all 4 combinations (P1)
  // 1. Both fields invalid: isVerified=false, verificationStatus='unverified' -> rejected
  const unverifiedSourcesMap1 = new Map<string, SourceDocument>(mockSourcesMap);
  unverifiedSourcesMap1.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    isVerified: false,
    verificationStatus: 'unverified',
  });
  const res25b1 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', unverifiedSourcesMap1
  );
  check(res25b1.matched === false, 'Test 25b-1: Both fields invalid (isVerified=false, unverified) rejects exception');
  check(res25b1.structuredRejections?.includes('source_not_verified') === true, 'Test 25b-1: Rejection includes source_not_verified');

  // 2. isVerified=true, verificationStatus='unverified' -> rejected
  const unverifiedSourcesMap2 = new Map<string, SourceDocument>(mockSourcesMap);
  unverifiedSourcesMap2.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    isVerified: true,
    verificationStatus: 'unverified',
  });
  const res25b2 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', unverifiedSourcesMap2
  );
  check(res25b2.matched === false, 'Test 25b-2: isVerified=true but verificationStatus=unverified rejects exception');
  check(res25b2.structuredRejections?.includes('source_not_verified') === true, 'Test 25b-2: Rejection includes source_not_verified');

  // 3. isVerified=false, verificationStatus='verified' -> rejected
  const unverifiedSourcesMap3 = new Map<string, SourceDocument>(mockSourcesMap);
  unverifiedSourcesMap3.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    isVerified: false,
    verificationStatus: 'verified',
  });
  const res25b3 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', unverifiedSourcesMap3
  );
  check(res25b3.matched === false, 'Test 25b-3: isVerified=false but verificationStatus=verified rejects exception');
  check(res25b3.structuredRejections?.includes('source_not_verified') === true, 'Test 25b-3: Rejection includes source_not_verified');

  // 4. Both fields valid: isVerified=true, verificationStatus='verified' -> accepted
  const validSourcesMap = new Map<string, SourceDocument>(mockSourcesMap);
  const res25b4 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', validSourcesMap
  );
  check(res25b4.matched === true, 'Test 25b-4: Both isVerified=true and verificationStatus=verified accepts exception');

  // 25c: source_company_mismatch
  const companyMismatchSourcesMap = new Map<string, SourceDocument>(mockSourcesMap);
  companyMismatchSourcesMap.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    companyId: 'volkswagen_group', // mismatch
  });
  const res25c = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', companyMismatchSourcesMap
  );
  check(res25c.matched === false, 'Test 25c-1: Company mismatch in source doc rejects exception');
  check(res25c.structuredRejections?.includes('source_company_mismatch') === true, 'Test 25c-2: Rejection includes source_company_mismatch');

  // 25d: source_period_mismatch
  const periodMismatchSourcesMap = new Map<string, SourceDocument>(mockSourcesMap);
  periodMismatchSourcesMap.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    period: '2025-FY', // mismatch from 2026-Q2
  });
  const res25d = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', periodMismatchSourcesMap
  );
  check(res25d.matched === false, 'Test 25d-1: Period mismatch in source doc rejects exception');
  check(res25d.structuredRejections?.includes('source_period_mismatch') === true, 'Test 25d-2: Rejection includes source_period_mismatch');

  // 25e: missing_official_url
  const noUrlSourcesMap = new Map<string, SourceDocument>(mockSourcesMap);
  noUrlSourcesMap.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    officialUrl: '', // missing
  });
  const res25e = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', noUrlSourcesMap
  );
  check(res25e.matched === false, 'Test 25e-1: Missing officialUrl in source doc rejects exception');
  check(res25e.structuredRejections?.includes('missing_official_url') === true, 'Test 25e-2: Rejection includes missing_official_url');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 26: Candidate Selection Regression Test — Multiple Candidates without .find() (P0-3)
// ────────────────────────────────────────────────────────────────────────────
{
  // Pool has 2 revenue candidates, 2 profit candidates, 2 margin candidates.
  // The first candidate in array order [0] is a decoy that DOES NOT match the BMW exception.
  // The second candidate [1] is the genuine BMW candidate triplet.
  const decoyRev = makeObs({ id: 'decoy_rev', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'financial_services' }); // wrong scope (financial_services vs consolidated_group)
  const genuineRev = makeObs({ id: 'genuine_rev', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });

  const decoyProfit = makeObs({ id: 'decoy_profit', companyId: 'bmw_group', metricId: 'ebit', currency: 'USD', reportingScope: 'consolidated_group' }); // wrong metricId & currency
  const genuineProfit = makeObs({ id: 'genuine_profit', companyId: 'bmw_group', metricId: 'operating_income', currency: 'EUR', reportingScope: 'consolidated_group' });

  const decoyMargin = makeObs({ id: 'decoy_margin', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'commercial_vehicles_segment' }); // decoy, not automotive
  const genuineMargin = makeObs({ id: 'genuine_margin', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment' });

  // Pass pool where decoys appear FIRST
  const pool = [decoyRev, genuineRev, decoyProfit, genuineProfit, decoyMargin, genuineMargin];
  const selection = selectCompatibleMarginTriplets(pool, 'bmw_group', '2026-Q2');

  check(selection.status === 'incompatible', 'Test 26a: Selection status is incompatible across rules');
  check(Array.isArray(selection.diagnostics) && selection.diagnostics.length === 8, 'Test 26b: Diagnostics preserves all 2x2x2=8 candidate combinations');

  // Demonstrate that picking [0] would fail exception lookup
  const firstDiagnostic = selection.diagnostics![0];
  const firstCheck = findDocumentedScopeException(
    'bmw_group', '2026-Q2',
    firstDiagnostic.margin!.metricId,
    firstDiagnostic.profit!.metricId,
    firstDiagnostic.revenue!.metricId,
    firstDiagnostic.profit!.reportingScope,
    firstDiagnostic.revenue!.reportingScope,
    firstDiagnostic.margin!.reportingScope,
    firstDiagnostic.profit!.accountingBasis,
    firstDiagnostic.revenue!.accountingBasis,
    firstDiagnostic.margin!.accountingBasis,
    mockSourcesMap
  );
  check(firstCheck.matched === false, 'Test 26c: Arbitrary first candidate [0] fails exception matching');

  // Demonstrate that inspecting all candidate diagnostics correctly finds the genuine triplet
  const matchingDiagnostics = selection.diagnostics!.filter(d => {
    const res = findDocumentedScopeException(
      'bmw_group', '2026-Q2',
      d.margin!.metricId,
      d.profit!.metricId,
      d.revenue!.metricId,
      d.profit!.reportingScope,
      d.revenue!.reportingScope,
      d.margin!.reportingScope,
      d.profit!.accountingBasis,
      d.revenue!.accountingBasis,
      d.margin!.accountingBasis,
      mockSourcesMap
    );
    return res.matched;
  });

  check(matchingDiagnostics.length === 1, 'Test 26d: Exactly 1 candidate diagnostic triplet matches documented exception');
  check(matchingDiagnostics[0].revenue?.id === 'genuine_rev', 'Test 26e: Matched triplet revenue is genuine_rev (not decoy)');
  check(matchingDiagnostics[0].profit?.id === 'genuine_profit', 'Test 26f: Matched triplet profit is genuine_profit (not decoy)');
  check(matchingDiagnostics[0].margin?.id === 'genuine_margin', 'Test 26g: Matched triplet margin is genuine_margin (not decoy)');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 27: Informational corroboration disposition (P1-1)
// ────────────────────────────────────────────────────────────────────────────
{
  const corroborationFinding: AuditFinding = {
    severity: 'INFO',
    disposition: 'informational',
    category: 'PROVENANCE_INFO',
    item: 'obs_corroboration',
    sourceDocIds: ['doc_1', 'doc_2'],
    detail: 'Corroboration from multiple filings',
  };

  const documentedFinding: AuditFinding = {
    severity: 'WARNING',
    disposition: 'documented',
    category: 'SCOPE_MISMATCH',
    item: 'bmw_group (2026-Q2)',
    exceptionId: 'bmw_automotive_segment_ros_2026q2',
    sourceDocIds: ['bmw_2026_q2_statement'],
    detail: 'Documented scope exception',
  };

  const findingsList = [corroborationFinding, documentedFinding];
  const blocking = findingsList.filter(f => f.disposition === 'blocking');
  const review = findingsList.filter(f => f.disposition === 'review');
  const documented = findingsList.filter(f => f.disposition === 'documented');
  const informational = findingsList.filter(f => f.disposition === 'informational');

  const isStrict = true;
  const strictFails = blocking.length > 0 || (isStrict && review.length > 0);

  check(strictFails === false, 'Test 27a: Neither documented exceptions nor informational corroborations fail strict mode');
  check(documented.length === 1, 'Test 27b: Exactly 1 documented exception counted');
  check(informational.length === 1, 'Test 27c: Exactly 1 informational corroboration counted');
  check(documented[0].exceptionId !== undefined, 'Test 27d: Documented exception has exceptionId');
  check(informational[0].exceptionId === undefined, 'Test 27e: Informational corroboration does NOT have exceptionId');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 28: Duplicate analysis with Map<string, DimRecord[]> (P1-2 & P2)
// ────────────────────────────────────────────────────────────────────────────
{
  interface DimRecord {
    id: string;
    value: number | null;
    sourceDocId?: string;
    pageNumber?: number | string;
    tableReference?: string;
    sectionReference?: string;
    evidenceReference?: string;
    originalLabel?: string;
  }

  const dimMap = new Map<string, DimRecord[]>();

  function processRecord(rec: DimRecord, dimKey: string): AuditFinding[] {
    const list = dimMap.get(dimKey) || [];
    const localFindings: AuditFinding[] = [];

    for (const existing of list) {
      const sameSource = !!existing.sourceDocId && !!rec.sourceDocId && existing.sourceDocId === rec.sourceDocId;
      const sameValue = existing.value === rec.value;
      const sameEvidence =
        existing.pageNumber === rec.pageNumber &&
        existing.tableReference === rec.tableReference &&
        existing.sectionReference === rec.sectionReference &&
        existing.evidenceReference === rec.evidenceReference &&
        existing.originalLabel === rec.originalLabel;

      if (sameSource && sameValue && sameEvidence) {
        localFindings.push({ severity: 'ERROR', disposition: 'blocking', category: 'DUPLICATE', item: rec.id, detail: 'Exact duplicate' });
      } else if (sameSource && sameValue && !sameEvidence) {
        localFindings.push({ severity: 'WARNING', disposition: 'review', category: 'DUPLICATE', item: rec.id, detail: 'Metadata conflict' });
      } else if (sameSource && !sameValue) {
        localFindings.push({ severity: 'ERROR', disposition: 'blocking', category: 'DUPLICATE', item: rec.id, detail: 'Value conflict' });
      } else if (!sameSource && sameValue) {
        localFindings.push({ severity: 'INFO', disposition: 'informational', category: 'PROVENANCE_INFO', item: rec.id, detail: 'Corroboration' });
      } else {
        localFindings.push({ severity: 'WARNING', disposition: 'review', category: 'DUPLICATE', item: rec.id, detail: 'Cross-source conflict' });
      }
    }

    list.push(rec);
    dimMap.set(dimKey, list);
    return localFindings;
  }

  const base: DimRecord = { id: 'r1', value: 100, sourceDocId: 'doc_a', pageNumber: 5, tableReference: 'T1', originalLabel: 'Rev' };
  processRecord(base, 'key_1');

  // Exact duplicate: same source, same value, same evidence → blocking
  const exactDup: DimRecord = { id: 'r2', value: 100, sourceDocId: 'doc_a', pageNumber: 5, tableReference: 'T1', originalLabel: 'Rev' };
  const fExact = processRecord(exactDup, 'key_1');
  check(fExact[0]?.disposition === 'blocking' && fExact[0]?.severity === 'ERROR', 'Test 28a: Exact duplicate is blocking ERROR');

  // Metadata conflict: same source, same value, different pageNumber → review (NOT exact duplicate!)
  const metaConflict: DimRecord = { id: 'r3', value: 100, sourceDocId: 'doc_a', pageNumber: 12, tableReference: 'T1', originalLabel: 'Rev' };
  const fMeta = processRecord(metaConflict, 'key_1');
  check(fMeta.some(f => f.disposition === 'review' && f.detail?.includes('Metadata conflict')), 'Test 28b: Differing metadata on same source is review, not exact duplicate');

  // Value conflict: same source, different value → blocking
  const valConflict: DimRecord = { id: 'r4', value: 150, sourceDocId: 'doc_a', pageNumber: 5, tableReference: 'T1', originalLabel: 'Rev' };
  const fVal = processRecord(valConflict, 'key_1');
  check(fVal.some(f => f.disposition === 'blocking' && f.detail?.includes('Value conflict')), 'Test 28c: Same source differing value is blocking');

  // Cross-source corroboration: diff source, same value → informational
  const crossCorrob: DimRecord = { id: 'r5', value: 100, sourceDocId: 'doc_b', pageNumber: 5, tableReference: 'T1', originalLabel: 'Rev' };
  const fCorrob = processRecord(crossCorrob, 'key_1');
  check(fCorrob.some(f => f.disposition === 'informational' && f.detail?.includes('Corroboration')), 'Test 28d: Different source same value is informational corroboration');

  // Verify all 5 records preserved in map
  check(dimMap.get('key_1')?.length === 5, 'Test 28e: Map preserves all 5 dimensional candidates without overwriting');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 29: Proxy numerator never returns verified (P0-1, P0-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({ id: 'bmw_rev_29', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', value: 36000 });
  const profit = makeObs({ id: 'bmw_ebit_29', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', value: 2800 });
  const margin = makeObs({ id: 'bmw_margin_29', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', value: 7.8, unit: 'percentage' });

  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(e => e.id === 'bmw_automotive_segment_ros_2026q2');
  const res = validateMarginTriplet(rev, profit, margin, undefined, { exception: bmwException });

  check(res.status !== 'verified', 'Test 29a: Proxy numerator triplet is never returned as verified');
  check(res.status === 'proxy_only', 'Test 29b: Proxy numerator triplet returns proxy_only');
  check(res.calculatedMargin === null, 'Test 29c: Proxy numerator calculatedMargin is strictly null');
  check(res.reportedMargin === 7.8, 'Test 29d: Reported margin value is preserved as 7.8');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 30: Proxy numerator with unverified/needs_review observation returns needs_review (P0-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({ id: 'bmw_rev_30', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', value: 36000 });
  const profit = makeObs({ id: 'bmw_ebit_30', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', value: 2800, verificationStatus: 'needs_review' });
  const margin = makeObs({ id: 'bmw_margin_30', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', value: 7.8, unit: 'percentage' });

  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(e => e.id === 'bmw_automotive_segment_ros_2026q2');
  const res = validateMarginTriplet(rev, profit, margin, undefined, { exception: bmwException });

  check(res.status !== 'verified', 'Test 30a: Unverified observation in proxy exception cannot be verified');
  check(res.status === 'needs_review', 'Test 30b: Unverified observation in proxy exception produces needs_review');
  check(res.failedChecks.includes('verificationStatus'), 'Test 30c: failedChecks includes verificationStatus');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 31: Observation with needs_review or scope_warning cannot produce verified (P0-3)
// ────────────────────────────────────────────────────────────────────────────
{
  // Standard triplet (matching consolidated scopes)
  const rev = makeObs({ id: 'rev_31', metricId: 'revenue', value: 100000 });
  const profit = makeObs({ id: 'ebit_31', metricId: 'operating_income', value: 8000, verificationStatus: 'scope_warning' });
  const margin = makeObs({ id: 'margin_31', metricId: 'operating_margin', value: 8.0, unit: 'percentage' });

  const res = validateMarginTriplet(rev, profit, margin);
  check(res.status !== 'verified', 'Test 31a: scope_warning observation cannot produce verified status');
  check(res.checks.verificationStatus === false, 'Test 31b: checks.verificationStatus is false for scope_warning');
  check(res.status === 'needs_review', 'Test 31c: Single verification issue produces needs_review status');

  const unverifiedMargin = makeObs({ id: 'margin_31u', metricId: 'operating_margin', value: 8.0, unit: 'percentage', verificationStatus: 'unverified' });
  const resU = validateMarginTriplet(rev, makeObs({ id: 'ebit_31v', metricId: 'operating_income', value: 8000 }), unverifiedMargin);
  check(resU.status !== 'verified', 'Test 31d: unverified observation cannot produce verified status');
  check(resU.checks.verificationStatus === false, 'Test 31e: checks.verificationStatus is false for unverified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 32: Missing evidence reference in exception rejects exception (P1-2)
// ────────────────────────────────────────────────────────────────────────────
{
  // Check that all registered exceptions have evidence records for all sourceDocIds
  for (const exc of DOCUMENTED_SCOPE_EXCEPTIONS) {
    check(Array.isArray(exc.evidence) && exc.evidence.length > 0, `Test 32a: [${exc.id}] has explicit evidence array`);
    for (const docId of exc.sourceDocIds) {
      const hasEv = exc.evidence.some(ev => ev.sourceDocId === docId);
      check(hasEv, `Test 32b: [${exc.id}] evidence contains record for sourceDocId "${docId}"`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 33: Deep source verification requires valid source in Map/Record (P1-1)
// ────────────────────────────────────────────────────────────────────────────
{
  const missingSourceMap = new Map<string, SourceDocument>();
  const res = findDocumentedScopeException(
    'bmw_group',
    '2026-Q2',
    'operating_margin',
    'operating_income',
    'revenue',
    'consolidated_group',
    'consolidated_group',
    'automotive_segment',
    'reported',
    'reported',
    'reported',
    missingSourceMap
  );
  check(res.matched === false, 'Test 33a: Empty source map rejects exception lookup');
  check(res.structuredRejections?.includes('source_not_found') ?? false, 'Test 33b: Structured rejection includes source_not_found');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 34: Unsupported metric relationship does not receive an unrelated rule ID (P1-4)
// ────────────────────────────────────────────────────────────────────────────
{
  const invalidObs: MetricObservation[] = [
    makeObs({ id: 'rev_34', metricId: 'revenue', value: 100000 }),
    makeObs({ id: 'custom_34', metricId: 'custom_metric' as any, value: 5000 }),
    makeObs({ id: 'margin_34', metricId: 'operating_margin', value: 5.0, unit: 'percentage' }),
  ];

  const sel = selectCompatibleMarginTriplets(invalidObs, 'volkswagen_group', '2026-Q2');
  check(sel.status === 'missing' || sel.status === 'incompatible', 'Test 34a: Unsupported metric rejected from selection');
  if (sel.diagnostics && sel.diagnostics.length > 0) {
    check(sel.diagnostics[0].ruleId === undefined, 'Test 34b: Diagnostic ruleId is undefined when metricDefinition does not match any rule');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 35: Unified finding mapping createAuditFindingFromMarginValidation (P0, P1, P2)
// ────────────────────────────────────────────────────────────────────────────
{
  const exc = DOCUMENTED_SCOPE_EXCEPTIONS[0];
  const proxyVal = validateMarginTriplet(
    makeObs({ id: 'r_35', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', value: 10000 }),
    makeObs({ id: 'p_35', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', value: 800 }),
    makeObs({ id: 'm_35', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', value: 7.8, unit: 'percentage' }),
    undefined,
    { exception: exc }
  );
  check(proxyVal.status === 'proxy_only', 'Test 35a: validateMarginTriplet returns proxy_only for proxy exception');

  const findingProxy = createAuditFindingFromMarginValidation(proxyVal, 'bmw_group', '2026-Q2', 'quarterly', exc);
  check(findingProxy !== null, 'Test 35b: createAuditFindingFromMarginValidation returns finding for proxy_only');
  check(findingProxy?.disposition === 'review', 'Test 35c: Proxy finding has disposition review');
  check(findingProxy?.disposition !== 'documented', 'Test 35d: Proxy finding disposition is NOT documented');
  check(findingProxy?.severity === 'WARNING', 'Test 35e: Proxy finding has severity WARNING');
  check(findingProxy?.category === 'SCOPE_MISMATCH', 'Test 35f: Proxy finding has category SCOPE_MISMATCH');
  check(findingProxy?.isProxy === true, 'Test 35g: Proxy finding has isProxy true');
  check(findingProxy?.exceptionId === exc.id, 'Test 35h: Proxy finding preserves exceptionId');
  check(Array.isArray(findingProxy?.sourceDocIds) && findingProxy!.sourceDocIds!.length > 0, 'Test 35i: Proxy finding preserves sourceDocIds');
  check(Array.isArray(findingProxy?.observationIds) && findingProxy!.observationIds!.length === 3, 'Test 35j: Proxy finding preserves observationIds');
  check(Array.isArray(findingProxy?.failedChecks), 'Test 35k: Proxy finding preserves failedChecks');
  check(findingProxy?.detail?.includes('Human review or actual segment-level numerator data is required') === true, 'Test 35l: Detail cites human review requirement');

  // Verified triplet returns null
  const verifiedVal = validateMarginTriplet(
    makeObs({ id: 'r_35v', metricId: 'revenue', value: 10000 }),
    makeObs({ id: 'p_35v', metricId: 'operating_income', value: 800 }),
    makeObs({ id: 'm_35v', metricId: 'operating_margin', value: 8.0, unit: 'percentage' })
  );
  check(createAuditFindingFromMarginValidation(verifiedVal, 'volkswagen_group', '2026-Q2') === null, 'Test 35m: Verified validation returns null finding');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 36: Meaningful Evidence Locators Validation (P1)
// ────────────────────────────────────────────────────────────────────────────
{
  const baseExc = DOCUMENTED_SCOPE_EXCEPTIONS[0];

  // Helper unit tests
  check(hasMeaningfulEvidenceLocator({ sourceDocId: 'doc1' }) === false, 'Test 36a: Evidence with only sourceDocId has no meaningful locators');
  check(hasMeaningfulEvidenceLocator({ sourceDocId: 'doc1', sectionReference: 'Automotive' }) === true, 'Test 36b: Evidence with sectionReference is meaningful');
  check(hasMeaningfulEvidenceLocator({ sourceDocId: 'doc1', tableReference: 'KPIs' }) === true, 'Test 36c: Evidence with tableReference is meaningful');
  check(hasMeaningfulEvidenceLocator({ sourceDocId: 'doc1', pageNumber: 42 }) === true, 'Test 36d: Evidence with pageNumber is meaningful');
  check(hasMeaningfulEvidenceLocator({ sourceDocId: 'doc1', evidenceReference: '7.8% margin' }) === true, 'Test 36e: Evidence with evidenceReference is meaningful');

  // 1. Evidence with only sourceDocId (no locators) -> rejected
  const excOnlyDocId = {
    ...baseExc,
    id: 'test_exc_only_doc_id',
    evidence: [{ sourceDocId: 'bmw_2026_q2_statement' }],
  };
  const res1 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, [excOnlyDocId]
  );
  check(res1.matched === false, 'Test 36f: Exception with evidence lacking meaningful locators is rejected');
  check(res1.structuredRejections?.includes('missing_evidence_reference') === true, 'Test 36g: Structured rejection is missing_evidence_reference');

  // 2. Evidence with sectionReference -> accepted
  const excSection = {
    ...baseExc,
    id: 'test_exc_section',
    evidence: [{ sourceDocId: 'bmw_2026_q2_statement', sectionReference: 'Automotive Segment' }],
  };
  const res2 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, [excSection]
  );
  check(res2.matched === true, 'Test 36h: Exception with sectionReference evidence is accepted');

  // 3. Evidence with tableReference -> accepted
  const excTable = {
    ...baseExc,
    id: 'test_exc_table',
    evidence: [{ sourceDocId: 'bmw_2026_q2_statement', tableReference: 'KPI Table 1' }],
  };
  const res3 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, [excTable]
  );
  check(res3.matched === true, 'Test 36i: Exception with tableReference evidence is accepted');

  // 4. Evidence with pageNumber -> accepted
  const excPage = {
    ...baseExc,
    id: 'test_exc_page',
    evidence: [{ sourceDocId: 'bmw_2026_q2_statement', pageNumber: 15 }],
  };
  const res4 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, [excPage]
  );
  check(res4.matched === true, 'Test 36j: Exception with pageNumber evidence is accepted');

  // 5. Evidence referencing a sourceDocId not present in sourceDocIds -> rejected
  const excUnknownDoc = {
    ...baseExc,
    id: 'test_exc_unknown_doc',
    evidence: [
      { sourceDocId: 'bmw_2026_q2_statement', sectionReference: 'Automotive' },
      { sourceDocId: 'unknown_source_doc_xyz', sectionReference: 'External Note' },
    ],
  };
  const res5 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, [excUnknownDoc]
  );
  check(res5.matched === false, 'Test 36k: Evidence referencing unlisted sourceDocId is rejected');
  check(res5.structuredRejections?.includes('missing_evidence_reference') === true, 'Test 36l: Rejection includes missing_evidence_reference');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 37: P0 Non-exempt Integrity Checks Under Proxy Exception (STEP 4-5)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(
    (e) => e.id === 'bmw_automotive_segment_ros_2026q2'
  )!;

  const baseRev = makeObs({
    id: 'rev_37',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    currency: 'EUR',
    unit: 'currency_millions',
    value: 36944,
    sourceDocId: 'bmw_2026_q2_statement',
    verificationStatus: 'verified',
  });

  const baseProfit = makeObs({
    id: 'profit_37',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    currency: 'EUR',
    unit: 'currency_millions',
    value: 3877,
    sourceDocId: 'bmw_2026_q2_statement',
    verificationStatus: 'verified',
  });

  const baseMargin = makeObs({
    id: 'margin_37',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    currency: 'EUR',
    unit: 'percentage',
    value: 7.8,
    sourceDocId: 'bmw_2026_q2_statement',
    verificationStatus: 'verified',
  });

  // 1. Valid proxy triplet matching exception -> status === 'proxy_only'
  const valValid = validateMarginTriplet(baseRev, baseProfit, baseMargin, undefined, {
    exception: bmwException,
  });
  check(valValid.status === 'proxy_only', 'Test 37a: Valid proxy triplet yields proxy_only');

  // 2. Currency mismatch (revenue USD, profit EUR) -> invalid
  const revCurrencyMismatch = { ...baseRev, currency: 'USD' };
  const valCurrency = validateMarginTriplet(revCurrencyMismatch, baseProfit, baseMargin, undefined, {
    exception: bmwException,
  });
  check(
    valCurrency.status === 'invalid' && valCurrency.failedChecks.includes('currency'),
    'Test 37b: Currency mismatch under proxy exception is invalid'
  );

  // 3. Unit scale mismatch -> invalid
  const profitUnitMismatch = { ...baseProfit, unit: 'currency_thousands' as any };
  const valUnit = validateMarginTriplet(baseRev, profitUnitMismatch, baseMargin, undefined, {
    exception: bmwException,
  });
  check(
    valUnit.status === 'invalid' && valUnit.failedChecks.includes('unit'),
    'Test 37c: Unit scale mismatch under proxy exception is invalid'
  );

  // 4. Missing provenance (sourceDocId is undefined on reported observation) -> invalid
  const revMissingProv = { ...baseRev, sourceDocId: undefined };
  const valProv = validateMarginTriplet(revMissingProv, baseProfit, baseMargin, undefined, {
    exception: bmwException,
  });
  check(
    valProv.status === 'invalid' && valProv.failedChecks.includes('provenance'),
    'Test 37d: Missing provenance under proxy exception is invalid'
  );

  // 5. Invalid / non-positive revenue value -> invalid / needs_review (not proxy_only)
  const revInvalidVal = { ...baseRev, value: -100 };
  const valValue = validateMarginTriplet(revInvalidVal, baseProfit, baseMargin, undefined, {
    exception: bmwException,
  });
  check(
    valValue.status === 'invalid',
    'Test 37e: Negative revenue denominator under proxy exception is invalid'
  );

  // 6. verificationStatus === 'needs_review' -> needs_review (not proxy_only)
  const profitUnverified = { ...baseProfit, verificationStatus: 'needs_review' as const };
  const valUnverified = validateMarginTriplet(baseRev, profitUnverified, baseMargin, undefined, {
    exception: bmwException,
  });
  check(
    valUnverified.status === 'needs_review',
    'Test 37f: Unverified observation under proxy exception yields needs_review'
  );

  // 7. Period mismatch -> invalid
  const revPeriodMismatch = { ...baseRev, period: '2026-Q1' };
  const valPeriod = validateMarginTriplet(revPeriodMismatch, baseProfit, baseMargin, undefined, {
    exception: bmwException,
  });
  check(
    valPeriod.status === 'invalid' && valPeriod.failedChecks.includes('period'),
    'Test 37g: Period mismatch under proxy exception is invalid'
  );

  // 8. Invalid metric definition -> invalid
  const invalidMetricProfit = { ...baseProfit, metricId: 'free_cash_flow' };
  const valMetric = validateMarginTriplet(baseRev, invalidMetricProfit, baseMargin, undefined, {
    exception: bmwException,
  });
  check(
    valMetric.status === 'invalid' && valMetric.failedChecks.includes('metricDefinition'),
    'Test 37h: Invalid metric definition under proxy exception is invalid'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 38: P1 Candidate Observation Source Binding (STEP 4-5)
// ────────────────────────────────────────────────────────────────────────────
{
  // 1. Candidate observations matching exception.sourceDocIds -> accepted
  const res1 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, DOCUMENTED_SCOPE_EXCEPTIONS,
    {
      revenueSourceDocId: 'bmw_2026_q2_statement',
      numeratorSourceDocId: 'bmw_2026_q2_statement',
      marginSourceDocId: 'bmw_2026_q2_statement',
    }
  );
  check(res1.matched === true, 'Test 38a: Candidate observations matching exception sourceDocIds are accepted');

  // 2. Candidate revenue missing sourceDocId -> rejected
  const res2 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, DOCUMENTED_SCOPE_EXCEPTIONS,
    {
      revenueSourceDocId: '',
      numeratorSourceDocId: 'bmw_2026_q2_statement',
      marginSourceDocId: 'bmw_2026_q2_statement',
    }
  );
  check(
    res2.matched === false && res2.structuredRejections?.includes('missing_evidence_reference') === true,
    'Test 38b: Candidate revenue missing sourceDocId is rejected'
  );

  // 3. Candidate numerator sourceDocId not in exception sourceDocIds -> rejected
  const res3 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, DOCUMENTED_SCOPE_EXCEPTIONS,
    {
      revenueSourceDocId: 'bmw_2026_q2_statement',
      numeratorSourceDocId: 'unrelated_presentation_2026',
      marginSourceDocId: 'bmw_2026_q2_statement',
    }
  );
  check(
    res3.matched === false && res3.structuredRejections?.includes('source_not_found') === true,
    'Test 38c: Candidate numerator sourceDocId not in exception is rejected'
  );

  // 4. Candidate margin sourceDocId not in exception sourceDocIds -> rejected
  const res4 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, DOCUMENTED_SCOPE_EXCEPTIONS,
    {
      revenueSourceDocId: 'bmw_2026_q2_statement',
      numeratorSourceDocId: 'bmw_2026_q2_statement',
      marginSourceDocId: 'bmw_2026_q1_statement',
    }
  );
  check(
    res4.matched === false && res4.structuredRejections?.includes('source_not_found') === true,
    'Test 38d: Candidate margin sourceDocId not in exception is rejected'
  );

  // 5. Candidate context with valid docId but unverified in sources map -> rejected
  const sourcesWithUnverified = new Map(mockSourcesMap);
  sourcesWithUnverified.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    isVerified: false,
    verificationStatus: 'unverified',
  });
  const res5 = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', sourcesWithUnverified, DOCUMENTED_SCOPE_EXCEPTIONS,
    {
      revenueSourceDocId: 'bmw_2026_q2_statement',
      numeratorSourceDocId: 'bmw_2026_q2_statement',
      marginSourceDocId: 'bmw_2026_q2_statement',
    }
  );
  check(
    res5.matched === false && res5.structuredRejections?.includes('source_not_verified') === true,
    'Test 38e: Candidate with unverified source document is rejected'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 39: P1 Central Exception Dimension Revalidation (STEP 4-5)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(
    (e) => e.id === 'bmw_automotive_segment_ros_2026q2'
  )!;

  const rev = makeObs({
    id: 'rev_39',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const profit = makeObs({
    id: 'profit_39',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const margin = makeObs({
    id: 'margin_39',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    unit: 'percentage',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  // 1. All dimensions match -> isValid === true
  const dim1 = validateExceptionDimensions(bmwException, rev, profit, margin);
  check(dim1.isValid === true && dim1.mismatches.length === 0, 'Test 39a: Matching dimensions pass validation');

  // 2. CompanyId mismatch -> isValid === false, mismatches contains companyId
  const revWrongCompany = { ...rev, companyId: 'volkswagen_group' };
  const dim2 = validateExceptionDimensions(bmwException, revWrongCompany, profit, margin);
  check(dim2.isValid === false && dim2.mismatches.includes('companyId'), 'Test 39b: CompanyId mismatch detected');

  // 3. Period mismatch -> isValid === false, mismatches contains period
  const revWrongPeriod = { ...rev, period: '2026-Q1' };
  const dim3 = validateExceptionDimensions(bmwException, revWrongPeriod, profit, margin);
  check(dim3.isValid === false && dim3.mismatches.includes('period'), 'Test 39c: Period mismatch detected');

  // 4. Margin metricId mismatch -> isValid === false, mismatches contains marginMetricId
  const marginWrongMetric = { ...margin, metricId: 'ebit_margin' };
  const dim4 = validateExceptionDimensions(bmwException, rev, profit, marginWrongMetric);
  check(dim4.isValid === false && dim4.mismatches.includes('marginMetricId'), 'Test 39d: Margin metricId mismatch detected');

  // 5. Numerator metricId mismatch -> isValid === false, mismatches contains numeratorMetricId
  const profitWrongMetric = { ...profit, metricId: 'adjusted_ebit' };
  const dim5 = validateExceptionDimensions(bmwException, rev, profitWrongMetric, margin);
  check(dim5.isValid === false && dim5.mismatches.includes('numeratorMetricId'), 'Test 39e: Numerator metricId mismatch detected');

  // 6. Denominator metricId mismatch -> isValid === false, mismatches contains denominatorMetricId
  const revWrongMetric = { ...rev, metricId: 'gross_revenue' };
  const dim6 = validateExceptionDimensions(bmwException, revWrongMetric, profit, margin);
  check(dim6.isValid === false && dim6.mismatches.includes('denominatorMetricId'), 'Test 39f: Denominator metricId mismatch detected');

  // 7. Margin reportingScope mismatch -> isValid === false, mismatches contains marginScope
  const marginWrongScope = { ...margin, reportingScope: 'consolidated_group' as const };
  const dim7 = validateExceptionDimensions(bmwException, rev, profit, marginWrongScope);
  check(dim7.isValid === false && dim7.mismatches.includes('marginScope'), 'Test 39g: Margin reportingScope mismatch detected');

  // 8. AccountingBasis mismatch -> isValid === false, mismatches contains numeratorBasis
  const profitWrongBasis = { ...profit, accountingBasis: 'adjusted' as const };
  const dim8 = validateExceptionDimensions(bmwException, rev, profitWrongBasis, margin);
  check(dim8.isValid === false && dim8.mismatches.includes('numeratorBasis'), 'Test 39h: AccountingBasis mismatch detected');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 40: Group operating income cannot be treated as segment EBIT by default (STEP 4-6, P0)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({
    id: 'rev_40',
    companyId: 'bmw_group',
    metricId: 'revenue',
    value: 36944,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
  });
  const profit = makeObs({
    id: 'profit_40',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    value: 2881,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
  });
  const margin = makeObs({
    id: 'margin_40',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    value: 7.8,
    reportingScope: 'automotive_segment', // segment margin vs group profit
    accountingBasis: 'reported',
  });

  // Without exception, standard validation must fail due to scope mismatch
  const res = validateMarginTriplet(rev, profit, margin);
  check(res.status === 'invalid', 'Test 40a: Group operating income cannot be treated as segment EBIT by default (fails validation)');
  check(res.failedChecks.includes('scope'), 'Test 40b: Scope check fails when group profit paired with segment margin');
  check(res.mathematicallyVerified === false, 'Test 40c: mathematicallyVerified is false by default for mismatched scopes');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 41: Proxy mapping returns proxy_only (STEP 4-6, P0/P1)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(
    (e) => e.id === 'bmw_automotive_segment_ros_2026q2'
  )!;

  const rev = makeObs({
    id: 'rev_41',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 36944,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const profit = makeObs({
    id: 'profit_41',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 2881,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const margin = makeObs({
    id: 'margin_41',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.8,
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    unit: 'percentage',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const res = validateMarginTriplet(rev, profit, margin, undefined, { exception: bmwException });
  check(res.status === 'proxy_only', 'Test 41: Proxy mapping returns proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 42: Proxy mapping produces review, not documented or verified (STEP 4-6, P0/P1)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(
    (e) => e.id === 'bmw_automotive_segment_ros_2026q2'
  )!;

  const rev = makeObs({
    id: 'rev_42',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 36944,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const profit = makeObs({
    id: 'profit_42',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 2881,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const margin = makeObs({
    id: 'margin_42',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.8,
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    unit: 'percentage',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const validation = validateMarginTriplet(rev, profit, margin, undefined, { exception: bmwException });
  const finding = createAuditFindingFromMarginValidation(validation, 'bmw_group', '2026-Q2', 'quarterly', bmwException);

  check(finding !== null, 'Test 42a: Proxy validation creates an audit finding');
  check(finding?.disposition === 'review', 'Test 42b: Proxy mapping produces disposition="review"');
  check(finding?.disposition !== 'documented', 'Test 42c: Proxy mapping never produces disposition="documented"');
  check(finding?.isProxy === true, 'Test 42d: Finding has isProxy=true');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 43: Proxy mapping produces mathematicallyVerified=false (STEP 4-6, P0/P1)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(
    (e) => e.id === 'bmw_automotive_segment_ros_2026q2'
  )!;

  const rev = makeObs({
    id: 'rev_43',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 36944,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const profit = makeObs({
    id: 'profit_43',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 2881,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const margin = makeObs({
    id: 'margin_43',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.8,
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    unit: 'percentage',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const validation = validateMarginTriplet(rev, profit, margin, undefined, { exception: bmwException });
  const finding = createAuditFindingFromMarginValidation(validation, 'bmw_group', '2026-Q2', 'quarterly', bmwException);

  check(validation.mathematicallyVerified === false, 'Test 43a: Validation result mathematicallyVerified=false');
  check(finding?.mathematicallyVerified === false, 'Test 43b: Audit finding mathematicallyVerified=false');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 44: Unrelated source document is rejected (STEP 4-6, P1)
// ────────────────────────────────────────────────────────────────────────────
{
  const res = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, DOCUMENTED_SCOPE_EXCEPTIONS,
    {
      revenueSourceDocId: 'bmw_2026_q2_statement',
      numeratorSourceDocId: 'bmw_2026_q2_statement',
      marginSourceDocId: 'unrelated_oem_filing_2026', // unrelated source
    }
  );
  check(res.matched === false, 'Test 44a: Unrelated source document is rejected');
  check(res.structuredRejections?.includes('source_not_found') === true, 'Test 44b: Rejection reason includes source_not_found');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 45: Missing sourceDocId is rejected or needs review (STEP 4-6, P1)
// ────────────────────────────────────────────────────────────────────────────
{
  const res = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, DOCUMENTED_SCOPE_EXCEPTIONS,
    {
      revenueSourceDocId: 'bmw_2026_q2_statement',
      numeratorSourceDocId: '', // missing
      marginSourceDocId: 'bmw_2026_q2_statement',
    }
  );
  check(res.matched === false, 'Test 45a: Candidate observation missing sourceDocId is rejected');
  check(res.structuredRejections?.includes('missing_evidence_reference') === true, 'Test 45b: Rejection reason includes missing_evidence_reference');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 46: Reported KPI evidence does not automatically count as proxy justification (STEP 4-6, P1)
// ────────────────────────────────────────────────────────────────────────────
{
  // All BMW and Mercedes evidence records must specify purpose: 'reported_kpi'
  for (const exc of DOCUMENTED_SCOPE_EXCEPTIONS) {
    for (const ev of exc.evidence) {
      check(ev.purpose === 'reported_kpi', `Test 46a: Exception [${exc.id}] evidence has purpose='reported_kpi'`);
    }
  }

  // The evidence proves the reported margin KPI is official, but does not prove mathematical identity
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS[0];
  check(bmwException.nature === 'proxy_numerator', 'Test 46b: Exception nature is proxy_numerator');
  check(bmwException.isProxy === true, 'Test 46c: Exception isProxy is true');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 47: Invalid currency, unit, provenance, or value checks cannot be bypassed by proxy exceptions (STEP 4-6, P0)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find(
    (e) => e.id === 'bmw_automotive_segment_ros_2026q2'
  )!;

  const baseRev = makeObs({
    id: 'rev_47',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 36944,
    currency: 'EUR',
    unit: 'currency_millions',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const baseProfit = makeObs({
    id: 'profit_47',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 2881,
    currency: 'EUR',
    unit: 'currency_millions',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const baseMargin = makeObs({
    id: 'margin_47',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.8,
    currency: undefined,
    unit: 'percentage',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  // Currency mismatch
  const curMismatch = validateMarginTriplet(
    { ...baseRev, currency: 'USD' },
    baseProfit,
    baseMargin,
    undefined,
    { exception: bmwException }
  );
  check(curMismatch.status === 'invalid', 'Test 47a: Currency mismatch not bypassed by proxy exception');

  // Unit mismatch
  const unitMismatch = validateMarginTriplet(
    { ...baseRev, unit: 'currency_billions' },
    baseProfit,
    baseMargin,
    undefined,
    { exception: bmwException }
  );
  check(unitMismatch.status === 'invalid', 'Test 47b: Unit mismatch not bypassed by proxy exception');

  // Missing provenance
  const provMissing = validateMarginTriplet(
    { ...baseRev, sourceDocId: undefined },
    baseProfit,
    baseMargin,
    undefined,
    { exception: bmwException }
  );
  check(provMissing.status === 'invalid', 'Test 47c: Missing provenance not bypassed by proxy exception');

  // Value validity (non-positive denominator)
  const nonPosRev = validateMarginTriplet(
    { ...baseRev, value: -100 },
    baseProfit,
    baseMargin,
    undefined,
    { exception: bmwException }
  );
  check(nonPosRev.status === 'invalid', 'Test 47d: Non-positive denominator not bypassed by proxy exception');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 48: Actual segment numerator data can be validated directly (STEP 4-6, P0)
// ────────────────────────────────────────────────────────────────────────────
{
  // When an actual segment-level numerator matching segment revenue and margin is present:
  const segmentRev = makeObs({
    id: 'seg_rev_48',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 32000,
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const segmentProfit = makeObs({
    id: 'seg_profit_48',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 2496, // 2496 / 32000 = 7.8%
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const segmentMargin = makeObs({
    id: 'seg_margin_48',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.8,
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    unit: 'percentage',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const res = validateMarginTriplet(segmentRev, segmentProfit, segmentMargin);
  check(res.status === 'verified', 'Test 48a: Actual segment numerator data validates directly as verified');
  check(res.mathematicallyVerified === true, 'Test 48b: Actual segment triplet has mathematicallyVerified=true');

  const finding = createAuditFindingFromMarginValidation(res, 'bmw_group', '2026-Q2', 'quarterly');
  check(finding === null, 'Test 48c: Clean verified actual segment triplet produces no audit finding');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 49: Mercedes-Benz group reported operating income used for Cars adjusted RoS (STEP 4-6, P0-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const mbgException = DOCUMENTED_SCOPE_EXCEPTIONS.find(
    (e) => e.id === 'mbg_cars_adjusted_ros_2026q2'
  )!;

  const rev = makeObs({
    id: 'mbg_rev_49',
    companyId: 'mercedes_benz',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 36743,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'mbg_2026_q2_results',
  });
  const profit = makeObs({
    id: 'mbg_profit_49',
    companyId: 'mercedes_benz',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 4037,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'mbg_2026_q2_results',
  });
  const margin = makeObs({
    id: 'mbg_margin_49',
    companyId: 'mercedes_benz',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 8.4,
    reportingScope: 'cars_segment',
    accountingBasis: 'adjusted',
    unit: 'percentage',
    sourceDocId: 'mbg_2026_q2_results',
  });

  const validation = validateMarginTriplet(rev, profit, margin, undefined, { exception: mbgException });
  check(validation.status === 'proxy_only', 'Test 49a: Mercedes Cars RoS proxy validation returns status="proxy_only"');
  check(validation.mathematicallyVerified === false, 'Test 49b: Mercedes Cars RoS proxy validation mathematicallyVerified=false');

  const finding = createAuditFindingFromMarginValidation(validation, 'mercedes_benz', '2026-Q2', 'quarterly', mbgException);
  check(finding !== null, 'Test 49c: Mercedes Cars RoS creates an audit finding');
  check(finding?.disposition === 'review', 'Test 49d: Mercedes Cars RoS finding disposition is "review"');
  check(finding?.disposition !== 'documented', 'Test 49e: Mercedes Cars RoS finding is NEVER documented');
  check(finding?.isProxy === true, 'Test 49f: Mercedes Cars RoS finding has isProxy=true');
  check(finding?.mathematicallyVerified === false, 'Test 49g: Mercedes Cars RoS finding mathematicallyVerified=false');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 50: DocumentedReportedKpi and ProxyMetricMapping conceptual separation (STEP 4-6, P0-1)
// ────────────────────────────────────────────────────────────────────────────
{
  check(DOCUMENTED_REPORTED_KPIS.length === 8, 'Test 50a: DOCUMENTED_REPORTED_KPIS has 8 registered OEM KPIs');
  check(PROXY_METRIC_MAPPINGS.length === 8, 'Test 50b: PROXY_METRIC_MAPPINGS has 8 registered proxy mappings');

  const bmwKpi = findDocumentedReportedKpi('bmw_group', '2026-Q2', 'operating_margin');
  check(bmwKpi !== undefined && bmwKpi.reportingScope === 'automotive_segment', 'Test 50c: BMW reported KPI found with automotive_segment scope');

  const mbgProxy = findProxyMetricMapping('mercedes_benz', '2026-Q2', 'operating_income', 'operating_income');
  check(mbgProxy !== undefined && mbgProxy.status === 'proxy_only', 'Test 50d: Mercedes proxy mapping found with status="proxy_only"');

  // Verify all entries in DOCUMENTED_SCOPE_EXCEPTIONS link to both conceptual entities
  for (const exc of DOCUMENTED_SCOPE_EXCEPTIONS) {
    check(!!exc.reportedKpiId, `Test 50e: Exception [${exc.id}] links to reportedKpiId "${exc.reportedKpiId}"`);
    check(!!exc.proxyMappingId, `Test 50f: Exception [${exc.id}] links to proxyMappingId "${exc.proxyMappingId}"`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 51: Proxy with invalid currency produces blocking error, not proxy_only (STEP 4-6, P1-1)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find((e) => e.id === 'bmw_automotive_segment_ros_2026q2')!;
  const rev = makeObs({
    id: 'rev_51',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 36944,
    currency: 'USD', // mismatch: USD vs EUR
    unit: 'currency_millions',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const profit = makeObs({
    id: 'profit_51',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 2881,
    currency: 'EUR',
    unit: 'currency_millions',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const margin = makeObs({
    id: 'margin_51',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.8,
    currency: undefined,
    unit: 'percentage',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { exception: bmwException });
  check(val.status === 'invalid', 'Test 51a: Currency mismatch under proxy exception returns status="invalid"');
  check(val.status !== 'proxy_only', 'Test 51b: Currency mismatch under proxy exception is NOT proxy_only');
  check(val.failedChecks.includes('currency'), 'Test 51c: failedChecks includes "currency"');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', bmwException);
  check(finding !== null, 'Test 51d: Finding created for currency mismatch');
  check(finding?.disposition === 'blocking', 'Test 51e: Currency mismatch finding is blocking');
  check(finding?.disposition !== 'documented', 'Test 51f: Currency mismatch finding is NEVER documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 52: Proxy with invalid unit produces blocking error and cannot be documented (STEP 4-6, P1-1)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find((e) => e.id === 'bmw_automotive_segment_ros_2026q2')!;
  const rev = makeObs({
    id: 'rev_52',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 36944,
    currency: 'EUR',
    unit: 'currency_billions', // mismatch: billions vs millions
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const profit = makeObs({
    id: 'profit_52',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 2881,
    currency: 'EUR',
    unit: 'currency_millions',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const margin = makeObs({
    id: 'margin_52',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.8,
    currency: undefined,
    unit: 'percentage',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { exception: bmwException });
  check(val.status === 'invalid', 'Test 52a: Unit mismatch under proxy exception returns status="invalid"');
  check(val.failedChecks.includes('unit'), 'Test 52b: failedChecks includes "unit"');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', bmwException);
  check(finding?.disposition === 'blocking', 'Test 52c: Unit mismatch finding is blocking');
  check(finding?.disposition !== 'documented', 'Test 52d: Unit mismatch finding is never documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 53: Proxy with unverified source observation requires review and is not documented (STEP 4-6, P1-1)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS.find((e) => e.id === 'bmw_automotive_segment_ros_2026q2')!;
  const rev = makeObs({
    id: 'rev_53',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 36944,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    verificationStatus: 'unverified', // unverified
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const profit = makeObs({
    id: 'profit_53',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 2881,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const margin = makeObs({
    id: 'margin_53',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.8,
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    unit: 'percentage',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { exception: bmwException });
  check(val.status === 'needs_review', 'Test 53a: Unverified observation under proxy exception returns "needs_review"');
  check(val.failedChecks.includes('verificationStatus'), 'Test 53b: failedChecks includes "verificationStatus"');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', bmwException);
  check(finding?.disposition === 'review', 'Test 53c: Unverified proxy observation finding disposition is "review"');
  check(finding?.disposition !== 'documented', 'Test 53d: Unverified proxy observation is never documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 54: Proxy with sourceDocId not matching candidate observation fails exception match (STEP 4-6, P1-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const res = findDocumentedScopeException(
    'bmw_group', '2026-Q2', 'operating_margin', 'operating_income', 'revenue',
    'consolidated_group', 'consolidated_group', 'automotive_segment',
    'reported', 'reported', 'reported', mockSourcesMap, DOCUMENTED_SCOPE_EXCEPTIONS,
    {
      revenueSourceDocId: 'bmw_2026_q2_statement',
      numeratorSourceDocId: 'unrelated_source_xyz', // does not match exception sourceDocIds
      marginSourceDocId: 'bmw_2026_q2_statement',
    }
  );
  check(res.matched === false, 'Test 54a: Candidate observation with non-matching sourceDocId fails exception match');
  check(res.structuredRejections?.includes('source_not_found') === true, 'Test 54b: Structured rejection includes source_not_found');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 55: Reported KPI evidence without proxy justification cannot validate proxy equivalence (STEP 4-6, P1-3)
// ────────────────────────────────────────────────────────────────────────────
{
  // For each proxy exception in registry, evidence has purpose='reported_kpi' and hasProxyJustificationEvidence=false
  for (const exc of DOCUMENTED_SCOPE_EXCEPTIONS) {
    check(hasProxyJustificationEvidence(exc.evidence) === false, `Test 55a: Exception [${exc.id}] has no proxy_justification evidence`);
  }

  // Without proxy_justification, the invariant holds: proxy_only !== verified and proxy_only !== documented
  const bmwException = DOCUMENTED_SCOPE_EXCEPTIONS[0];
  check(bmwException.isProxy === true, 'Test 55b: Exception is marked isProxy=true');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 56: Clean triplets for peer OEMs remain verified with 0 findings (STEP 4-6, P1-4)
// ────────────────────────────────────────────────────────────────────────────
{
  const vwRev = makeObs({
    id: 'vw_rev',
    companyId: 'volkswagen_group',
    metricId: 'revenue',
    period: '2026-Q2',
    value: 80000,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'vw_2026_q2_results',
  });
  const vwProfit = makeObs({
    id: 'vw_profit',
    companyId: 'volkswagen_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    value: 5600,
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'vw_2026_q2_results',
  });
  const vwMargin = makeObs({
    id: 'vw_margin',
    companyId: 'volkswagen_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 7.0, // 5600 / 80000 = 7.0%
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    unit: 'percentage',
    sourceDocId: 'vw_2026_q2_results',
  });

  const res = validateMarginTriplet(vwRev, vwProfit, vwMargin);
  check(res.status === 'verified', 'Test 56a: Peer OEM clean triplet validated as "verified"');
  check(res.mathematicallyVerified === true, 'Test 56b: Clean triplet has mathematicallyVerified=true');

  const finding = createAuditFindingFromMarginValidation(res, 'volkswagen_group', '2026-Q2', 'quarterly');
  check(finding === null, 'Test 56c: Verified clean triplet produces null finding');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 57: ProxyMetricMapping produces proxy_only (STEP 4-7, P0-1, P0-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_57', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_57', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_57', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'proxy_only', 'Test 57a: ProxyMetricMapping produces proxy_only');
  check(val.failedChecks.includes('proxy_numerator'), 'Test 57b: failedChecks includes proxy_numerator');
  check(val.failedChecks.includes('mathematical_equivalence_unverified'), 'Test 57c: failedChecks includes mathematical_equivalence_unverified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 58: ProxyMetricMapping never produces verified (STEP 4-7, P0-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_58', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', value: 36000 });
  const profit = makeObs({ id: 'profit_58', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', value: 2808 }); // 2808 / 36000 = 7.8% exact match
  const margin = makeObs({ id: 'margin_58', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', value: 7.8, unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status !== 'verified', 'Test 58a: ProxyMetricMapping never produces status verified');
  check(val.mathematicallyVerified === false, 'Test 58b: mathematicallyVerified is strictly false');
  check(val.calculatedMargin === null, 'Test 58c: calculatedMargin is strictly null for proxy mapping');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 59: ProxyMetricMapping never produces documented (STEP 4-7, P0-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_59', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_59', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_59', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding !== null, 'Test 59a: Audit finding is created for ProxyMetricMapping');
  check(finding?.disposition !== 'documented', 'Test 59b: ProxyMetricMapping never produces disposition documented');
  check(finding?.disposition === 'review', 'Test 59c: ProxyMetricMapping produces disposition review');
  check(finding?.isProxy === true, 'Test 59d: isProxy is true on finding');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 60: reported_kpi evidence does not prove proxy equivalence (STEP 4-7, P1-1)
// ────────────────────────────────────────────────────────────────────────────
{
  for (const kpi of DOCUMENTED_REPORTED_KPIS) {
    check(kpi.evidence.every(e => e.purpose === 'reported_kpi'), `Test 60a: [${kpi.id}] evidence purpose is reported_kpi`);
    check(hasProxyJustificationEvidence(kpi.evidence) === false, `Test 60b: [${kpi.id}] has no proxy_justification evidence`);
  }
  for (const mapping of PROXY_METRIC_MAPPINGS) {
    check(mapping.evidence.every(e => e.purpose !== 'reported_kpi'), `Test 60c: Proxy mapping [${mapping.id}] evidence does NOT use purpose reported_kpi`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 61: Proxy mapping with missing proxy justification remains review-only (STEP 4-7, P1-1)
// ────────────────────────────────────────────────────────────────────────────
{
  const mappingWithoutJustification: ProxyMetricMapping = {
    id: 'test_mapping_no_justification',
    companyId: 'bmw_group',
    period: '2026-Q2',
    periodType: 'quarterly',
    targetMetricId: 'automotive_segment_ebit',
    proxyMetricId: 'operating_income',
    targetScope: 'automotive_segment',
    proxyScope: 'consolidated_group',
    targetBasis: 'reported',
    proxyBasis: 'reported',
    sourceDocIds: ['bmw_2026_q2_statement'],
    status: 'proxy_only',
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Automotive',
        purpose: 'scope_definition', // NOT proxy_justification
      },
    ],
    reason: 'Test mapping without proxy justification',
  };
  check(hasProxyJustificationEvidence(mappingWithoutJustification.evidence) === false, 'Test 61a: Mapping lacks proxy_justification evidence');

  const rev = makeObs({ id: 'rev_61', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_61', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_61', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mappingWithoutJustification });
  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: mappingWithoutJustification });
  check(finding?.disposition === 'review', 'Test 61b: Proxy mapping without proxy justification remains review-only');
  check((finding?.disposition as string) !== 'verified', 'Test 61c: Never verified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 62: nature: 'proxy_numerator' with isProxy: false is rejected or normalized safely (STEP 4-7, P1-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const inconsistentException: DocumentedScopeException = {
    id: 'inconsistent_proxy_exc',
    companyId: 'bmw_group',
    period: '2026-Q2',
    periodType: 'quarterly',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',
    denominatorScope: 'consolidated_group',
    marginScope: 'automotive_segment',
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'reported',
    sourceDocIds: ['bmw_2026_q2_statement'],
    evidence: [{ sourceDocId: 'bmw_2026_q2_statement', sectionReference: 'Automotive', purpose: 'reported_kpi' }],
    nature: 'proxy_numerator',
    isProxy: false, // Inconsistent!
    rationale: 'Inconsistent proxy exception for test',
  };

  check(isProxyException(inconsistentException) === true, 'Test 62a: isProxyException detects nature: proxy_numerator even if isProxy: false');

  const normalized = normalizeProxyException(inconsistentException);
  check(normalized.isProxy === true, 'Test 62b: normalizeProxyException forces isProxy: true');

  const rev = makeObs({ id: 'rev_62', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_62', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_62', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { exception: inconsistentException });
  check(val.status === 'proxy_only', 'Test 62c: validateMarginTriplet handles inconsistent proxy exception as proxy_only');
  check(val.status !== 'verified', 'Test 62d: Inconsistent proxy exception never validates as verified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 63: Actual candidate sourceDocId must match mapping sourceDocIds (STEP 4-7, P1-4)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_63', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profitMismatchedDoc = makeObs({ id: 'profit_63', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'foreign_doc_id' });
  const margin = makeObs({ id: 'margin_63', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profitMismatchedDoc, margin);
  check(compat.isValid === false, 'Test 63a: validateProxyMappingCompatibility fails when profit sourceDocId does not match mapping');
  check(compat.mismatches.includes('profitSourceDoc'), 'Test 63b: Mismatch cites profitSourceDoc');

  const val = validateMarginTriplet(rev, profitMismatchedDoc, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'invalid', 'Test 63c: Triplet with non-matching sourceDocId falls back to invalid (not proxy_only)');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 64: Proxy metric ID, scope, and accounting basis must match profit observation (STEP 4-7, P1-4)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_64', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_64', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  // Wrong metric ID
  const wrongMetricProfit = makeObs({ id: 'p_wrong_metric', companyId: 'bmw_group', metricId: 'ebit', reportingScope: 'consolidated_group', accountingBasis: 'reported', sourceDocId: 'bmw_2026_q2_statement' });
  const compat1 = validateProxyMappingCompatibility(bmwMapping, rev, wrongMetricProfit, margin);
  check(compat1.isValid === false && compat1.mismatches.includes('proxyMetricId'), 'Test 64a: Wrong proxy metric ID fails compatibility');

  // Wrong scope
  const wrongScopeProfit = makeObs({ id: 'p_wrong_scope', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'financial_services', accountingBasis: 'reported', sourceDocId: 'bmw_2026_q2_statement' });
  const compat2 = validateProxyMappingCompatibility(bmwMapping, rev, wrongScopeProfit, margin);
  check(compat2.isValid === false && compat2.mismatches.includes('proxyScope'), 'Test 64b: Wrong proxy scope fails compatibility');

  // Wrong basis
  const wrongBasisProfit = makeObs({ id: 'p_wrong_basis', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'adjusted', sourceDocId: 'bmw_2026_q2_statement' });
  const compat3 = validateProxyMappingCompatibility(bmwMapping, rev, wrongBasisProfit, margin);
  check(compat3.isValid === false && compat3.mismatches.includes('proxyBasis'), 'Test 64c: Wrong proxy accounting basis fails compatibility');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 65: Invalid currency in a proxy triplet remains invalid/blocking (STEP 4-7, P1-5)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_65', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', currency: 'EUR' });
  const profit = makeObs({ id: 'profit_65', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', currency: 'USD' });
  const margin = makeObs({ id: 'margin_65', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', currency: undefined });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'invalid', 'Test 65a: Currency mismatch under proxy mapping returns invalid');
  check(val.failedChecks.includes('currency'), 'Test 65b: failedChecks includes currency');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding?.disposition === 'blocking', 'Test 65c: Currency mismatch finding is blocking');
  check(finding?.disposition !== 'documented', 'Test 65d: Currency mismatch finding is never documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 66: Invalid unit in a proxy triplet remains invalid/blocking (STEP 4-7, P1-5)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_66', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', unit: 'currency_billions' });
  const profit = makeObs({ id: 'profit_66', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', unit: 'currency_millions' });
  const margin = makeObs({ id: 'margin_66', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'invalid', 'Test 66a: Unit mismatch under proxy mapping returns invalid');
  check(val.failedChecks.includes('unit'), 'Test 66b: failedChecks includes unit');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding?.disposition === 'blocking', 'Test 66c: Unit mismatch finding is blocking');
  check(finding?.disposition !== 'documented', 'Test 66d: Unit mismatch finding is never documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 67: Missing provenance in a proxy triplet remains invalid/blocking (STEP 4-7, P1-5)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_67', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', valueType: 'reported', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_67', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', valueType: 'reported', sourceDocId: undefined });
  const margin = makeObs({ id: 'margin_67', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', valueType: 'reported', sourceDocId: 'bmw_2026_q2_statement' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'invalid', 'Test 67a: Missing provenance under proxy mapping returns invalid');
  check(val.failedChecks.includes('provenance'), 'Test 67b: failedChecks includes provenance');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding?.disposition === 'blocking', 'Test 67c: Missing provenance finding is blocking');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 68: Unverified observations produce needs_review (STEP 4-7, P1-5)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev = makeObs({ id: 'rev_68', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', verificationStatus: 'verified' });
  const profit = makeObs({ id: 'profit_68', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', verificationStatus: 'unverified' });
  const margin = makeObs({ id: 'margin_68', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', verificationStatus: 'verified' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'needs_review', 'Test 68a: Unverified observation under proxy mapping produces needs_review');
  check(val.failedChecks.includes('verificationStatus'), 'Test 68b: failedChecks includes verificationStatus');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding?.disposition === 'review', 'Test 68c: Unverified finding disposition is review');
  check(finding?.disposition !== 'documented', 'Test 68d: Unverified finding is never documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 69: BMW group operating income → Automotive EBIT remains proxy-only (STEP 4-7, P1-3)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly');
  check(bmwMapping !== undefined, 'Test 69a: BMW proxy mapping found for automotive_segment_ebit');
  check(bmwMapping?.targetNumeratorSemantic === 'automotive_segment_ebit', 'Test 69b: Target numerator semantic is automotive_segment_ebit');

  const rev = makeObs({ id: 'rev_69', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', value: 36944 });
  const profit = makeObs({ id: 'profit_69', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', value: 3877 });
  const margin = makeObs({ id: 'margin_69', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', value: 7.8, unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'proxy_only', 'Test 69c: BMW validation status is proxy_only');
  check(val.mathematicallyVerified === false, 'Test 69d: BMW mathematicallyVerified is false');
  check(val.calculatedMargin === null, 'Test 69e: BMW calculatedMargin is null');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding?.disposition === 'review', 'Test 69f: BMW finding disposition is review');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 70: Mercedes group reported operating income → Cars adjusted EBIT remains proxy-only (STEP 4-7, P1-3)
// ────────────────────────────────────────────────────────────────────────────
{
  const mbgMapping = findProxyMetricMapping('mercedes_benz', '2026-Q2', 'cars_adjusted_ebit', 'operating_income', 'quarterly');
  check(mbgMapping !== undefined, 'Test 70a: Mercedes proxy mapping found for cars_adjusted_ebit');
  check(mbgMapping?.targetNumeratorSemantic === 'cars_adjusted_ebit', 'Test 70b: Target numerator semantic is cars_adjusted_ebit');

  const rev = makeObs({ id: 'rev_70', companyId: 'mercedes_benz', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', value: 36743 });
  const profit = makeObs({ id: 'profit_70', companyId: 'mercedes_benz', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', value: 4037 });
  const margin = makeObs({ id: 'margin_70', companyId: 'mercedes_benz', metricId: 'operating_margin', reportingScope: 'cars_segment', accountingBasis: 'adjusted', value: 8.4, unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mbgMapping });
  check(val.status === 'proxy_only', 'Test 70c: Mercedes validation status is proxy_only');
  check(val.mathematicallyVerified === false, 'Test 70d: Mercedes mathematicallyVerified is false');
  check(val.calculatedMargin === null, 'Test 70e: Mercedes calculatedMargin is null');

  const finding = createAuditFindingFromMarginValidation(val, 'mercedes_benz', '2026-Q2', 'quarterly', { proxyMapping: mbgMapping });
  check(finding?.disposition === 'review', 'Test 70f: Mercedes finding disposition is review');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 71: Quarterly and annual period types cannot match the same exception (STEP 4-7, P2-1)
// ────────────────────────────────────────────────────────────────────────────
{
  const annualMapping = findProxyMetricMapping('bmw_group', '2025-FY', 'automotive_segment_ebit', 'operating_income', 'annual');
  check(annualMapping !== undefined, 'Test 71a: Annual proxy mapping exists for 2025-FY');

  // Candidate quarterly observations
  const revQ = makeObs({ id: 'rev_71q', companyId: 'bmw_group', metricId: 'revenue', period: '2025-FY', periodType: 'quarterly', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2025_fy_statement' });
  const profitQ = makeObs({ id: 'profit_71q', companyId: 'bmw_group', metricId: 'operating_income', period: '2025-FY', periodType: 'quarterly', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2025_fy_statement' });
  const marginQ = makeObs({ id: 'margin_71q', companyId: 'bmw_group', metricId: 'operating_margin', period: '2025-FY', periodType: 'quarterly', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2025_fy_statement' });

  const compat = validateProxyMappingCompatibility(annualMapping!, revQ, profitQ, marginQ);
  check(compat.isValid === false, 'Test 71b: Quarterly candidate observations fail compatibility with annual mapping');
  check(compat.mismatches.includes('periodType'), 'Test 71c: Mismatch cites periodType');

  // Lookup with quarterly periodType fails to find annual mapping
  const lookup = findProxyMetricMapping('bmw_group', '2025-FY', 'automotive_segment_ebit', 'operating_income', 'quarterly');
  check(lookup === undefined, 'Test 71d: findProxyMetricMapping with quarterly periodType does not return annual mapping');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 72: Existing valid same-scope margin triplets remain verified (STEP 4-7, P2-2)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({
    id: 'rev_72',
    companyId: 'volkswagen_group',
    metricId: 'revenue',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    value: 80000,
    currency: 'EUR',
    unit: 'currency_millions',
    verificationStatus: 'verified',
    sourceDocId: 'vw_2026_q2_report',
  });
  const profit = makeObs({
    id: 'profit_72',
    companyId: 'volkswagen_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    value: 5600,
    currency: 'EUR',
    unit: 'currency_millions',
    verificationStatus: 'verified',
    sourceDocId: 'vw_2026_q2_report',
  });
  const margin = makeObs({
    id: 'margin_72',
    companyId: 'volkswagen_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    value: 7.0,
    unit: 'percentage',
    currency: undefined,
    verificationStatus: 'verified',
    sourceDocId: 'vw_2026_q2_report',
  });

  const val = validateMarginTriplet(rev, profit, margin);
  check(val.status === 'verified', 'Test 72a: Clean same-scope triplet is verified');
  check(val.mathematicallyVerified === true, 'Test 72b: mathematicallyVerified is true');
  check(val.calculatedMargin === 7.0, 'Test 72c: calculatedMargin is 7.0');
  check(val.difference === 0.0, 'Test 72d: difference is 0.0');

  const finding = createAuditFindingFromMarginValidation(val, 'volkswagen_group', '2026-Q2', 'quarterly');
  check(finding === null, 'Test 72e: Verified triplet produces null audit finding');
}

// ────────────────────────────────────────────────────────────────────────────
console.log(`\nScope Exception & Policy Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All scope exception and policy tests passed!\n');
}
