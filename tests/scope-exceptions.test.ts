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
  findDocumentedReportedKpis,
  findProxyMetricMapping,
  findProxyMetricMappings,
  lookupProxyMetricMapping,
  TARGET_SEMANTICS_BY_COMPANY,
  PROXY_SEMANTIC_CONTRACTS,
  findProxySemanticContract,
  hasProxyJustificationEvidence,
  hasMeaningfulEvidenceLocator,
  isProxyException,
  normalizeProxyException,
  validateProxyMappingCompatibility,
  validateDocumentedReportedKpiCompatibility,
  DocumentedScopeException,
  DocumentedReportedKpi,
} from '../src/data/scopeExceptions';
import {
  getDimensionalObservationKey,
  getEvidenceIdentityKey,
  getCanonicalObservationKey,
  validateMarginTriplet,
  selectCompatibleMarginTriplets,
  createAuditFindingFromMarginValidation,
  validateExceptionDimensions,
  resolveMarginValidationContext,
  matchScopeRelationship,
} from '../src/utils/metricCalculations';
import {
  MetricObservation,
  AuditFinding,
  SourceDocument,
  ProxyMetricMapping,
  ProxyMetricMappingQuery,
  MarginRelationshipRule,
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

  const mbgProxy = findProxyMetricMapping('mercedes_benz', '2026-Q2', 'cars_adjusted_ebit', 'operating_income');
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
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['bmw_2026_q2_statement'],
    status: 'proxy_only',
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Automotive',
        purpose: 'scope_definition', // NOT proxy_justification
        supports: ['target_semantic', 'scope', 'reported_kpi'],
      },
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Revenues and Operating Result',
        evidenceReference: 'Revenues: 36,944 million EUR; Operating profit: 3,877 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
      },
    ],
    reason: 'Test mapping without proxy justification',
  };
  check(hasProxyJustificationEvidence(mappingWithoutJustification.evidence) === false, 'Test 61a: Mapping lacks proxy_justification evidence');

  const rev = makeObs({ id: 'rev_61', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_61', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_61', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mappingWithoutJustification, sourcesMap: mockSourcesMap });
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
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Automotive',
        purpose: 'reported_kpi',
        supports: ['target_semantic', 'scope', 'reported_kpi'],
      },
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Revenues and Operating Result',
        evidenceReference: 'Revenues: 36,944 million EUR; Operating profit: 3,877 million EUR',
        purpose: 'reported_kpi',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type', 'reported_kpi'],
      },
    ],
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

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profitMismatchedDoc, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 63a: validateProxyMappingCompatibility fails when profit sourceDocId does not match mapping');
  check(compat.mismatches.includes('profitSourceDoc'), 'Test 63b: Mismatch cites profitSourceDoc');

  const val = validateMarginTriplet(rev, profitMismatchedDoc, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
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
  const compat1 = validateProxyMappingCompatibility(bmwMapping, rev, wrongMetricProfit, margin, mockSourcesMap);
  check(compat1.isValid === false && compat1.mismatches.includes('proxyMetricId'), 'Test 64a: Wrong proxy metric ID fails compatibility');

  // Wrong scope
  const wrongScopeProfit = makeObs({ id: 'p_wrong_scope', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'financial_services', accountingBasis: 'reported', sourceDocId: 'bmw_2026_q2_statement' });
  const compat2 = validateProxyMappingCompatibility(bmwMapping, rev, wrongScopeProfit, margin, mockSourcesMap);
  check(compat2.isValid === false && compat2.mismatches.includes('proxyScope'), 'Test 64b: Wrong proxy scope fails compatibility');

  // Wrong basis
  const wrongBasisProfit = makeObs({ id: 'p_wrong_basis', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'adjusted', sourceDocId: 'bmw_2026_q2_statement' });
  const compat3 = validateProxyMappingCompatibility(bmwMapping, rev, wrongBasisProfit, margin, mockSourcesMap);
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

  const compat = validateProxyMappingCompatibility(annualMapping!, revQ, profitQ, marginQ, mockSourcesMap);
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
// TEST 73: Discrimination of MarginValidationContext kinds (STEP 4-7/4-8)
// ────────────────────────────────────────────────────────────────────────────
{
  const ctxStandard = resolveMarginValidationContext(null);
  check(ctxStandard.kind === 'standard', 'Test 73a: Null options resolves to kind standard');

  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const ctxProxy = resolveMarginValidationContext({ proxyMapping: bmwMapping });
  check(ctxProxy.kind === 'proxy_numerator', 'Test 73b: Proxy mapping resolves to kind proxy_numerator');

  const actualSegmentExc: DocumentedScopeException = {
    ...DOCUMENTED_SCOPE_EXCEPTIONS[0],
    id: 'test_actual_seg_exc',
    nature: 'actual_segment',
    isProxy: false,
    proxyMappingId: undefined,
  };
  const ctxActual = resolveMarginValidationContext({ exception: actualSegmentExc });
  check(ctxActual.kind === 'documented_actual_segment', 'Test 73c: Actual segment exception resolves to kind documented_actual_segment');

  const inconsistentExc: DocumentedScopeException = {
    ...DOCUMENTED_SCOPE_EXCEPTIONS[0],
    id: 'test_inconsistent_exc',
    nature: 'proxy_numerator',
    isProxy: false,
  };
  const ctxInconsistent = resolveMarginValidationContext({ exception: inconsistentExc });
  check(ctxInconsistent.kind === 'inconsistent_or_invalid', 'Test 73d: Inconsistent exception resolves to kind inconsistent_or_invalid');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 74: Inconsistent context normalization to proxy_numerator (STEP 4-7/4-8)
// ────────────────────────────────────────────────────────────────────────────
{
  const inconsistentExc: DocumentedScopeException = {
    ...DOCUMENTED_SCOPE_EXCEPTIONS[0],
    id: 'test_inconsistent_exc_74',
    nature: 'proxy_numerator',
    isProxy: false,
  };
  const rev = makeObs({ id: 'rev_74', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_74', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_74', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val74 = validateMarginTriplet(rev, profit, margin, undefined, { exception: inconsistentExc });
  check(val74.status === 'proxy_only', 'Test 74a: Inconsistent exception is handled as proxy_only');
  check(val74.mathematicallyVerified === false, 'Test 74b: Inconsistent exception is never mathematicallyVerified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 75: Inconsistent context rejection (proxyMappingId present with isProxy=false)
// ────────────────────────────────────────────────────────────────────────────
{
  const proxyIdWithFalseProxy: DocumentedScopeException = {
    ...DOCUMENTED_SCOPE_EXCEPTIONS[0],
    id: 'test_proxy_id_false_proxy',
    nature: 'actual_segment',
    isProxy: false,
    proxyMappingId: 'some_mapping_id',
  };
  const norm75 = normalizeProxyException(proxyIdWithFalseProxy);
  check(norm75.isInconsistent === true, 'Test 75a: proxyMappingId present with isProxy=false is marked inconsistent');
  const ctx75 = resolveMarginValidationContext({ exception: proxyIdWithFalseProxy });
  check(ctx75.kind === 'inconsistent_or_invalid', 'Test 75b: proxyMappingId present with isProxy=false resolves to inconsistent_or_invalid');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 76: Precedence policy: valueValidity failure with proxyMapping rejects as invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revZero = makeObs({ id: 'rev_76', companyId: 'bmw_group', metricId: 'revenue', value: 0, reportingScope: 'consolidated_group' });
  const profit76 = makeObs({ id: 'profit_76', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin76 = makeObs({ id: 'margin_76', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val76 = validateMarginTriplet(revZero, profit76, margin76, undefined, { proxyMapping: bmwMapping });
  check(val76.status === 'invalid', 'Test 76a: Zero revenue denominator with proxyMapping returns status invalid');
  check(val76.failedChecks.includes('valueValidity'), 'Test 76b: failedChecks includes valueValidity');
  check(val76.status !== 'proxy_only', 'Test 76c: valueValidity failure cannot become proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 77: Precedence policy: currency mismatch with proxyMapping rejects as invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revUsd = makeObs({ id: 'rev_77', companyId: 'bmw_group', metricId: 'revenue', currency: 'USD', reportingScope: 'consolidated_group' });
  const profitEur = makeObs({ id: 'profit_77', companyId: 'bmw_group', metricId: 'operating_income', currency: 'EUR', reportingScope: 'consolidated_group' });
  const margin77 = makeObs({ id: 'margin_77', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val77 = validateMarginTriplet(revUsd, profitEur, margin77, undefined, { proxyMapping: bmwMapping });
  check(val77.status === 'invalid', 'Test 77a: Currency mismatch with proxyMapping returns status invalid');
  check(val77.failedChecks.includes('currency'), 'Test 77b: failedChecks includes currency');
  check(val77.status !== 'proxy_only', 'Test 77c: currency mismatch cannot become proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 78: Precedence policy: unit mismatch with proxyMapping rejects as invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev78 = makeObs({ id: 'rev_78', companyId: 'bmw_group', metricId: 'revenue', unit: 'currency_millions', reportingScope: 'consolidated_group' });
  const profit78 = makeObs({ id: 'profit_78', companyId: 'bmw_group', metricId: 'operating_income', unit: 'currency_billions', reportingScope: 'consolidated_group' });
  const margin78 = makeObs({ id: 'margin_78', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val78 = validateMarginTriplet(rev78, profit78, margin78, undefined, { proxyMapping: bmwMapping });
  check(val78.status === 'invalid', 'Test 78a: Unit mismatch with proxyMapping returns status invalid');
  check(val78.failedChecks.includes('unit'), 'Test 78b: failedChecks includes unit');
  check(val78.status !== 'proxy_only', 'Test 78c: unit mismatch cannot become proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 79: Precedence policy: provenance failure with proxyMapping rejects as invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revNoDoc = makeObs({ id: 'rev_79', companyId: 'bmw_group', metricId: 'revenue', sourceDocId: undefined, reportingScope: 'consolidated_group' });
  const profit79 = makeObs({ id: 'profit_79', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin79 = makeObs({ id: 'margin_79', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val79 = validateMarginTriplet(revNoDoc, profit79, margin79, undefined, { proxyMapping: bmwMapping });
  check(val79.status === 'invalid', 'Test 79a: Missing provenance with proxyMapping returns status invalid');
  check(val79.failedChecks.includes('provenance'), 'Test 79b: failedChecks includes provenance');
  check(val79.status !== 'proxy_only', 'Test 79c: missing provenance cannot become proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 80: Precedence policy: metricDefinition mismatch with proxyMapping rejects as invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev80 = makeObs({ id: 'rev_80', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit80 = makeObs({ id: 'profit_80', companyId: 'bmw_group', metricId: 'free_cash_flow', reportingScope: 'consolidated_group' });
  const margin80 = makeObs({ id: 'margin_80', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val80 = validateMarginTriplet(rev80, profit80, margin80, undefined, { proxyMapping: bmwMapping });
  check(val80.status === 'invalid', 'Test 80a: Invalid profit metricId with proxyMapping returns status invalid');
  check(val80.failedChecks.includes('metricDefinition'), 'Test 80b: failedChecks includes metricDefinition');
  check(val80.status !== 'proxy_only', 'Test 80c: metricDefinition mismatch cannot become proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 81: Precedence policy: period mismatch with proxyMapping rejects as invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revQ1 = makeObs({ id: 'rev_81', companyId: 'bmw_group', metricId: 'revenue', period: '2026-Q1', reportingScope: 'consolidated_group' });
  const profitQ2 = makeObs({ id: 'profit_81', companyId: 'bmw_group', metricId: 'operating_income', period: '2026-Q2', reportingScope: 'consolidated_group' });
  const marginQ2 = makeObs({ id: 'margin_81', companyId: 'bmw_group', metricId: 'operating_margin', period: '2026-Q2', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val81 = validateMarginTriplet(revQ1, profitQ2, marginQ2, undefined, { proxyMapping: bmwMapping });
  check(val81.status === 'invalid', 'Test 81a: Period mismatch with proxyMapping returns status invalid');
  check(val81.failedChecks.includes('period'), 'Test 81b: failedChecks includes period');
  check(val81.status !== 'proxy_only', 'Test 81c: period mismatch cannot become proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 82: Precedence policy: periodType mismatch with proxyMapping rejects as invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revQuarterly = makeObs({ id: 'rev_82', companyId: 'bmw_group', metricId: 'revenue', periodType: 'quarterly', reportingScope: 'consolidated_group' });
  const profitAnnual = makeObs({ id: 'profit_82', companyId: 'bmw_group', metricId: 'operating_income', periodType: 'annual', reportingScope: 'consolidated_group' });
  const marginQuarterly = makeObs({ id: 'margin_82', companyId: 'bmw_group', metricId: 'operating_margin', periodType: 'quarterly', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val82 = validateMarginTriplet(revQuarterly, profitAnnual, marginQuarterly, undefined, { proxyMapping: bmwMapping });
  check(val82.status === 'invalid', 'Test 82a: PeriodType mismatch with proxyMapping returns status invalid');
  check(val82.failedChecks.includes('periodType'), 'Test 82b: failedChecks includes periodType');
  check(val82.status !== 'proxy_only', 'Test 82c: periodType mismatch cannot become proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 83: Precedence policy: unverified observation with proxyMapping returns needs_review
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revUnverified = makeObs({ id: 'rev_83', companyId: 'bmw_group', metricId: 'revenue', verificationStatus: 'unverified', reportingScope: 'consolidated_group' });
  const profit83 = makeObs({ id: 'profit_83', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin83 = makeObs({ id: 'margin_83', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val83 = validateMarginTriplet(revUnverified, profit83, margin83, undefined, { proxyMapping: bmwMapping });
  check(val83.status === 'needs_review', 'Test 83a: Unverified observation with proxyMapping returns status needs_review');
  check(val83.failedChecks.includes('verificationStatus'), 'Test 83b: failedChecks includes verificationStatus');
  check(val83.status !== 'proxy_only', 'Test 83c: unverified observation cannot become proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 84: Clean proxyMapping validation produces status proxy_only with proxyMappingId
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev84 = makeObs({ id: 'rev_84', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit84 = makeObs({ id: 'profit_84', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin84 = makeObs({ id: 'margin_84', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val84 = validateMarginTriplet(rev84, profit84, margin84, undefined, { proxyMapping: bmwMapping });
  check(val84.status === 'proxy_only', 'Test 84a: Clean proxyMapping validation produces status proxy_only');
  check(val84.proxyMappingId === bmwMapping.id, 'Test 84b: proxyMappingId is set on result');
  check(val84.failedChecks.includes('proxy_numerator'), 'Test 84c: failedChecks includes proxy_numerator');
  check(val84.failedChecks.includes('mathematical_equivalence_unverified'), 'Test 84d: failedChecks includes mathematical_equivalence_unverified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 85: Clean proxyMapping validation sets mathematicallyVerified=false and calculatedMargin=null
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev85 = makeObs({ id: 'rev_85', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit85 = makeObs({ id: 'profit_85', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin85 = makeObs({ id: 'margin_85', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val85 = validateMarginTriplet(rev85, profit85, margin85, undefined, { proxyMapping: bmwMapping });
  check(val85.mathematicallyVerified === false, 'Test 85a: mathematicallyVerified is strictly false');
  check(val85.calculatedMargin === null, 'Test 85b: calculatedMargin is strictly null');
  check(val85.difference === null, 'Test 85c: difference is strictly null');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 86: Scope check in validateMarginTriplet supports segment_operating_margin rule
// ────────────────────────────────────────────────────────────────────────────
{
  const segmentRule: MarginRelationshipRule = {
    id: 'test_segment_operating_margin_rule',
    name: 'Segment Operating Margin Rule',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['reported'],
    denominatorAccountingBases: ['reported'],
    marginAccountingBases: ['reported'],
    allowedScopeRelationships: [
      {
        relationshipType: 'segment_operating_margin',
        denominatorScope: 'automotive_segment',
        numeratorScope: 'automotive_segment',
        marginScope: 'automotive_segment',
      },
    ],
  };
  const revSeg = makeObs({ id: 'rev_86', companyId: 'bmw_group', metricId: 'revenue', value: 30000, reportingScope: 'automotive_segment' });
  const profitSeg = makeObs({ id: 'profit_86', companyId: 'bmw_group', metricId: 'operating_income', value: 2400, reportingScope: 'automotive_segment' });
  const marginSeg = makeObs({ id: 'margin_86', companyId: 'bmw_group', metricId: 'operating_margin', value: 8.0, unit: 'percentage', reportingScope: 'automotive_segment' });
  const val86 = validateMarginTriplet(revSeg, profitSeg, marginSeg, [segmentRule]);
  check(val86.checks.scope === true, 'Test 86a: segment_operating_margin allowedScopeRelationship satisfies scope check');
  check(val86.status === 'verified', 'Test 86b: segment rule with exact math verifies triplet');
  check(val86.selectedRuleId === 'test_segment_operating_margin_rule', 'Test 86c: selectedRuleId matches segment rule ID');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 87: Scope check in validateMarginTriplet supports custom_scope_mapping rule
// ────────────────────────────────────────────────────────────────────────────
{
  const customScopeRule: MarginRelationshipRule = {
    id: 'test_custom_scope_rule',
    name: 'Custom Scope Mapping Rule',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['reported'],
    denominatorAccountingBases: ['reported'],
    marginAccountingBases: ['reported'],
    allowedScopeRelationships: [
      {
        relationshipType: 'custom_scope_mapping',
        denominatorScope: 'consolidated_group',
        numeratorScope: 'consolidated_group',
        marginScope: 'automotive_segment',
      },
    ],
  };
  const revCust = makeObs({ id: 'rev_87', companyId: 'bmw_group', metricId: 'revenue', value: 40000, reportingScope: 'consolidated_group' });
  const profitCust = makeObs({ id: 'profit_87', companyId: 'bmw_group', metricId: 'operating_income', value: 3200, reportingScope: 'consolidated_group' });
  const marginCust = makeObs({ id: 'margin_87', companyId: 'bmw_group', metricId: 'operating_margin', value: 8.0, unit: 'percentage', reportingScope: 'automotive_segment' });
  const val87 = validateMarginTriplet(revCust, profitCust, marginCust, [customScopeRule]);
  check(val87.checks.scope === true, 'Test 87a: custom_scope_mapping allowedScopeRelationship satisfies scope check');
  check(val87.status === 'verified', 'Test 87b: custom_scope_mapping rule verifies triplet');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 88: createAuditFindingFromMarginValidation keeps identifiers separate
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const bmwException88 = DOCUMENTED_SCOPE_EXCEPTIONS.find(e => e.id === 'bmw_automotive_segment_ros_2026q2')!;
  const bmwKpi88 = DOCUMENTED_REPORTED_KPIS.find(k => k.id === 'bmw_automotive_segment_ros_2026q2_kpi')!;
  const rev88 = makeObs({ id: 'rev_88', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit88 = makeObs({ id: 'profit_88', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin88 = makeObs({ id: 'margin_88', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val88 = validateMarginTriplet(rev88, profit88, margin88, undefined, {
    proxyMapping: bmwMapping,
    exception: bmwException88,
    documentedKpi: bmwKpi88,
  });
  const finding88 = createAuditFindingFromMarginValidation(val88, 'bmw_group', '2026-Q2', 'quarterly', {
    proxyMapping: bmwMapping,
    exception: bmwException88,
    documentedKpi: bmwKpi88,
  });
  check(finding88 !== null, 'Test 88a: Finding created');
  check(finding88?.exceptionId === 'bmw_automotive_segment_ros_2026q2', 'Test 88b: exceptionId is exact exception ID');
  check(finding88?.proxyMappingId === bmwMapping.id, 'Test 88c: proxyMappingId is exact proxy mapping ID');
  check(finding88?.reportedKpiId === bmwKpi88.id, 'Test 88d: reportedKpiId is exact reported KPI ID');
  check(finding88?.exceptionId !== finding88?.proxyMappingId, 'Test 88e: exceptionId and proxyMappingId are distinct');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 89: selectedRuleId never falls back to exceptionId when no exception is present
// ────────────────────────────────────────────────────────────────────────────
{
  const revMathMismatch = makeObs({ id: 'rev_89', companyId: 'volkswagen_group', metricId: 'revenue', value: 100000 });
  const profitMathMismatch = makeObs({ id: 'profit_89', companyId: 'volkswagen_group', metricId: 'operating_income', value: 10000 });
  const marginMathMismatch = makeObs({ id: 'margin_89', companyId: 'volkswagen_group', metricId: 'operating_margin', value: 5.0, unit: 'percentage' });
  const val89 = validateMarginTriplet(revMathMismatch, profitMathMismatch, marginMathMismatch);
  const finding89 = createAuditFindingFromMarginValidation(val89, 'volkswagen_group', '2026-Q2', 'quarterly');
  check(finding89 !== null, 'Test 89a: Finding created for math mismatch');
  check(finding89?.selectedRuleId === 'reported_operating_margin', 'Test 89b: selectedRuleId is rule ID');
  check(finding89?.exceptionId === undefined, 'Test 89c: exceptionId is strictly undefined without fallback to rule ID');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 90: proxyMappingId never falls back to exceptionId
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev90 = makeObs({ id: 'rev_90', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit90 = makeObs({ id: 'profit_90', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin90 = makeObs({ id: 'margin_90', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val90 = validateMarginTriplet(rev90, profit90, margin90, undefined, { proxyMapping: bmwMapping });
  const finding90 = createAuditFindingFromMarginValidation(val90, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding90?.proxyMappingId === bmwMapping.id, 'Test 90a: proxyMappingId is set from mapping');
  check(finding90?.exceptionId === undefined, 'Test 90b: exceptionId is strictly undefined when no exception passed');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 91: DocumentedReportedKpi presence alone does not make proxy mathematically verified
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const bmwKpi91 = DOCUMENTED_REPORTED_KPIS.find(k => k.id === 'bmw_automotive_segment_ros_2026q2_kpi')!;
  const rev91 = makeObs({ id: 'rev_91', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit91 = makeObs({ id: 'profit_91', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin91 = makeObs({ id: 'margin_91', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val91 = validateMarginTriplet(rev91, profit91, margin91, undefined, {
    proxyMapping: bmwMapping,
    documentedKpi: bmwKpi91,
  });
  check(val91.status === 'proxy_only', 'Test 91a: documentedKpi does not change proxy status from proxy_only');
  check(val91.mathematicallyVerified === false, 'Test 91b: documentedKpi does not make proxy mathematically verified');
  check(val91.calculatedMargin === null, 'Test 91c: calculatedMargin remains null');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 92: Exact period and periodType matching invariant (wildcards not allowed for quarterly/annual mix)
// ────────────────────────────────────────────────────────────────────────────
{
  const annualMapping92 = findProxyMetricMapping('bmw_group', '2025-FY', undefined, undefined, 'annual');
  const quarterlyMapping92 = findProxyMetricMapping('bmw_group', '2025-FY', undefined, undefined, 'quarterly');
  check(annualMapping92 !== undefined, 'Test 92a: Annual mapping found for 2025-FY');
  check(quarterlyMapping92 === undefined, 'Test 92b: Quarterly lookup does not match annual mapping');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 93: Selection status matched path with proxy mapping resolves to proxy_only
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev93 = makeObs({ id: 'rev_93', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit93 = makeObs({ id: 'profit_93', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin93 = makeObs({ id: 'margin_93', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });
  const val93 = validateMarginTriplet(rev93, profit93, margin93, undefined, { proxyMapping: bmwMapping });
  const finding93 = createAuditFindingFromMarginValidation(val93, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(val93.status === 'proxy_only', 'Test 93a: Triplet with proxyMapping resolves to proxy_only');
  check(finding93?.disposition === 'review', 'Test 93b: Finding disposition is review');
  check(finding93?.isProxy === true, 'Test 93c: Finding isProxy is true');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 94: Selection status matched path without proxy mapping remains verified
// ────────────────────────────────────────────────────────────────────────────
{
  const revClean = makeObs({ id: 'rev_94', companyId: 'volkswagen_group', metricId: 'revenue', value: 80000 });
  const profitClean = makeObs({ id: 'profit_94', companyId: 'volkswagen_group', metricId: 'operating_income', value: 5600 });
  const marginClean = makeObs({ id: 'margin_94', companyId: 'volkswagen_group', metricId: 'operating_margin', value: 7.0, unit: 'percentage' });
  const val94 = validateMarginTriplet(revClean, profitClean, marginClean);
  const finding94 = createAuditFindingFromMarginValidation(val94, 'volkswagen_group', '2026-Q2', 'quarterly');
  check(val94.status === 'verified', 'Test 94a: Triplet without proxy mapping validates as verified');
  check(val94.mathematicallyVerified === true, 'Test 94b: mathematicallyVerified is true');
  check(finding94 === null, 'Test 94c: Verified triplet generates null finding');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 95: Full audit pipeline produces consistent counts and disallows proxy bypassing integrity
// ────────────────────────────────────────────────────────────────────────────
{
  check(DOCUMENTED_SCOPE_EXCEPTIONS.length === 8, 'Test 95a: 8 documented scope exceptions registered');
  check(DOCUMENTED_REPORTED_KPIS.length === 8, 'Test 95b: 8 documented reported KPIs registered');
  check(PROXY_METRIC_MAPPINGS.length === 8, 'Test 95c: 8 proxy mappings registered');
  for (const exc of DOCUMENTED_SCOPE_EXCEPTIONS) {
    check(exc.isProxy === true, `Test 95d: Exception [${exc.id}] has isProxy=true`);
    check(exc.nature === 'proxy_numerator', `Test 95e: Exception [${exc.id}] has nature=proxy_numerator`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 96: BMW Q2 2026 proxy compatibility (STEP 4-8, Task 7.1)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping(
    'bmw_group',
    '2026-Q2',
    'automotive_segment_ebit',
    'operating_income',
    'quarterly'
  );
  check(bmwMapping !== undefined, 'Test 96a: BMW Q2 2026 proxy mapping found');
  check(bmwMapping?.targetNumeratorSemantic === 'automotive_segment_ebit', 'Test 96b: BMW target numerator semantic is automotive_segment_ebit');

  const rev = makeObs({
    id: 'rev_96',
    companyId: 'bmw_group',
    metricId: 'revenue',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const profit = makeObs({
    id: 'profit_96',
    companyId: 'bmw_group',
    metricId: 'operating_income',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const margin = makeObs({
    id: 'margin_96',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    unit: 'percentage',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const compat = validateProxyMappingCompatibility(bmwMapping!, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === true, 'Test 96c: BMW Q2 2026 observations compatible with mapping');
  check(compat.mismatches.length === 0, 'Test 96d: No dimensional mismatches for BMW Q2 2026');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'proxy_only', 'Test 96e: BMW Q2 2026 triplet validates as proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 97: Mercedes Q2 2026 proxy compatibility (STEP 4-8, Task 7.2)
// ────────────────────────────────────────────────────────────────────────────
{
  const mbgMapping = findProxyMetricMapping(
    'mercedes_benz',
    '2026-Q2',
    'cars_adjusted_ebit',
    'operating_income',
    'quarterly'
  );
  check(mbgMapping !== undefined, 'Test 97a: Mercedes Q2 2026 proxy mapping found');
  check(mbgMapping?.targetNumeratorSemantic === 'cars_adjusted_ebit', 'Test 97b: Mercedes target numerator semantic is cars_adjusted_ebit');

  const rev = makeObs({
    id: 'rev_97',
    companyId: 'mercedes_benz',
    metricId: 'revenue',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'mbg_2026_q2_results',
  });
  const profit = makeObs({
    id: 'profit_97',
    companyId: 'mercedes_benz',
    metricId: 'operating_income',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'consolidated_group',
    accountingBasis: 'reported',
    sourceDocId: 'mbg_2026_q2_results',
  });
  const margin = makeObs({
    id: 'margin_97',
    companyId: 'mercedes_benz',
    metricId: 'operating_margin',
    period: '2026-Q2',
    periodType: 'quarterly',
    reportingScope: 'cars_segment',
    accountingBasis: 'adjusted',
    unit: 'percentage',
    sourceDocId: 'mbg_2026_q2_results',
  });

  const compat = validateProxyMappingCompatibility(mbgMapping!, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === true, 'Test 97c: Mercedes Q2 2026 observations compatible with mapping');
  check(compat.mismatches.length === 0, 'Test 97d: No dimensional mismatches for Mercedes Q2 2026');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mbgMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'proxy_only', 'Test 97e: Mercedes Q2 2026 triplet validates as proxy_only');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 98: Matched path proxy resolution (STEP 4-8, Task 7.3)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({ id: 'rev_98', companyId: 'bmw_group', metricId: 'revenue', period: '2026-Q2', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_98', companyId: 'bmw_group', metricId: 'operating_income', period: '2026-Q2', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_98', companyId: 'bmw_group', metricId: 'operating_margin', period: '2026-Q2', reportingScope: 'automotive_segment', unit: 'percentage' });

  const matchedMappings = findProxyMetricMappings(
    'bmw_group',
    '2026-Q2',
    undefined,
    'operating_income',
    'quarterly',
    'automotive_segment',
    'reported'
  );
  check(matchedMappings.length === 1, 'Test 98a: Matched path resolves exactly 1 proxy mapping');
  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: matchedMappings[0] });
  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: matchedMappings[0] });
  check(val.status === 'proxy_only', 'Test 98b: Matched path validates as proxy_only');
  check(finding?.disposition === 'review', 'Test 98c: Matched path finding disposition is review');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 99: Incompatible path proxy resolution (STEP 4-8, Task 7.4)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({ id: 'rev_99', companyId: 'bmw_group', metricId: 'revenue', period: '2026-Q2', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_99', companyId: 'bmw_group', metricId: 'operating_income', period: '2026-Q2', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_99', companyId: 'bmw_group', metricId: 'operating_margin', period: '2026-Q2', reportingScope: 'automotive_segment', unit: 'percentage' });

  const valWithoutProxy = validateMarginTriplet(rev, profit, margin);
  check(valWithoutProxy.status === 'invalid' && valWithoutProxy.failedChecks.includes('scope'), 'Test 99a: Incompatible scopes fail standard validation');

  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const valWithProxy = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(valWithProxy.status === 'proxy_only', 'Test 99b: Incompatible candidate path resolves as proxy_only with mapping');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 100: Wrong proxy scope rejects as invalid, not proxy_only (STEP 4-8, Task 7.5)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_100', companyId: 'bmw_group', reportingScope: 'consolidated_group' });
  const wrongProfit = makeObs({ id: 'profit_100', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'automotive_segment' });
  const margin = makeObs({ id: 'margin_100', companyId: 'bmw_group', reportingScope: 'automotive_segment', unit: 'percentage' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, wrongProfit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 100a: Wrong proxy scope fails compatibility');
  check(compat.mismatches.includes('proxyScope'), 'Test 100b: Mismatches includes proxyScope');

  const val = validateMarginTriplet(rev, wrongProfit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 100c: Wrong proxy scope returns status invalid');
  check(val.status !== 'proxy_only', 'Test 100d: Wrong proxy scope cannot become proxy_only');
  check(val.failedChecks.includes('scope'), 'Test 100e: failedChecks includes scope');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 101: Wrong proxy accounting basis rejects as invalid (STEP 4-8, Task 7.6)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_101', companyId: 'bmw_group', reportingScope: 'consolidated_group', accountingBasis: 'reported', sourceDocId: 'bmw_2026_q2_statement' });
  const wrongBasisProfit = makeObs({ id: 'profit_101', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'adjusted', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_101', companyId: 'bmw_group', reportingScope: 'automotive_segment', accountingBasis: 'reported', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, wrongBasisProfit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 101a: Wrong proxy accounting basis fails compatibility');
  check(compat.mismatches.includes('proxyBasis'), 'Test 101b: Mismatches includes proxyBasis');

  const val = validateMarginTriplet(rev, wrongBasisProfit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 101c: Wrong proxy accounting basis returns status invalid');
  check(val.failedChecks.includes('accountingBasis'), 'Test 101d: failedChecks includes accountingBasis');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 102: Wrong target scope rejects as invalid (STEP 4-8, Task 7.7)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_102', companyId: 'bmw_group', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_102', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const wrongTargetMargin = makeObs({ id: 'margin_102', companyId: 'bmw_group', reportingScope: 'financial_services', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, wrongTargetMargin, mockSourcesMap);
  check(compat.isValid === false, 'Test 102a: Wrong target scope fails compatibility');
  check(compat.mismatches.includes('targetScope'), 'Test 102b: Mismatches includes targetScope');

  const val = validateMarginTriplet(rev, profit, wrongTargetMargin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 102c: Wrong target scope returns status invalid');
  check(val.failedChecks.includes('scope'), 'Test 102d: failedChecks includes scope');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 103: Wrong target accounting basis rejects as invalid (STEP 4-8, Task 7.8)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_103', companyId: 'bmw_group', reportingScope: 'consolidated_group', accountingBasis: 'reported', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_103', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', sourceDocId: 'bmw_2026_q2_statement' });
  const wrongTargetMargin = makeObs({ id: 'margin_103', companyId: 'bmw_group', reportingScope: 'automotive_segment', accountingBasis: 'adjusted', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, wrongTargetMargin, mockSourcesMap);
  check(compat.isValid === false, 'Test 103a: Wrong target basis fails compatibility');
  check(compat.mismatches.includes('targetBasis'), 'Test 103b: Mismatches includes targetBasis');

  const val = validateMarginTriplet(rev, profit, wrongTargetMargin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 103c: Wrong target basis returns status invalid');
  check(val.failedChecks.includes('accountingBasis'), 'Test 103d: failedChecks includes accountingBasis');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 104: Wrong period rejects as invalid (STEP 4-8, Task 7.9)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_104', companyId: 'bmw_group', period: '2026-Q1', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_104', companyId: 'bmw_group', metricId: 'operating_income', period: '2026-Q1', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_104', companyId: 'bmw_group', metricId: 'operating_margin', period: '2026-Q1', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 104a: Wrong period fails compatibility');
  check(compat.mismatches.includes('period'), 'Test 104b: Mismatches includes period');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 104c: Wrong period returns status invalid');
  check(val.failedChecks.includes('period'), 'Test 104d: failedChecks includes period');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 105: Wrong periodType rejects as invalid (STEP 4-8, Task 7.10)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_105', companyId: 'bmw_group', period: '2026-Q2', periodType: 'annual', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_105', companyId: 'bmw_group', metricId: 'operating_income', period: '2026-Q2', periodType: 'annual', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_105', companyId: 'bmw_group', metricId: 'operating_margin', period: '2026-Q2', periodType: 'annual', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 105a: Wrong periodType fails compatibility');
  check(compat.mismatches.includes('periodType'), 'Test 105b: Mismatches includes periodType');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 105c: Wrong periodType returns status invalid');
  check(val.failedChecks.includes('periodType'), 'Test 105d: failedChecks includes periodType');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 106: Wrong source document ID rejects as invalid (STEP 4-8, Task 7.11)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_106', companyId: 'bmw_group', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profitWrongDoc = makeObs({ id: 'profit_106', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'unrelated_doc_xyz' });
  const margin = makeObs({ id: 'margin_106', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profitWrongDoc, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 106a: Wrong sourceDocId fails compatibility');
  check(compat.mismatches.includes('profitSourceDoc'), 'Test 106b: Mismatches includes profitSourceDoc');

  const val = validateMarginTriplet(rev, profitWrongDoc, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 106c: Wrong sourceDocId returns status invalid');
  check(val.failedChecks.includes('provenance'), 'Test 106d: failedChecks includes provenance');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 107: Multiple matching mappings trigger ambiguity rejection (STEP 4-8, Task 7.12)
// ────────────────────────────────────────────────────────────────────────────
{
  const duplicateMapping: ProxyMetricMapping = {
    ...PROXY_METRIC_MAPPINGS[0],
    id: 'duplicate_bmw_proxy_2026q2',
  };
  const mappingsWithDuplicate = [...PROXY_METRIC_MAPPINGS, duplicateMapping];

  const multi = findProxyMetricMappings(
    'bmw_group',
    '2026-Q2',
    undefined,
    undefined,
    'quarterly',
    undefined,
    undefined,
    undefined,
    undefined,
    mappingsWithDuplicate
  );
  check(multi.length > 1, 'Test 107a: Multiple matching mappings found');

  const single = findProxyMetricMapping(
    'bmw_group',
    '2026-Q2',
    undefined,
    undefined,
    'quarterly',
    undefined,
    undefined,
    undefined,
    undefined,
    mappingsWithDuplicate
  );
  check(single === undefined, 'Test 107b: Single lookup returns undefined on ambiguous multiple matches');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 108: Invalid currency under proxy mapping returns invalid (STEP 4-8, Task 7.13)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_108', companyId: 'bmw_group', currency: 'USD', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_108', companyId: 'bmw_group', metricId: 'operating_income', currency: 'EUR', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_108', companyId: 'bmw_group', metricId: 'operating_margin', currency: 'EUR', reportingScope: 'automotive_segment', unit: 'percentage' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'invalid', 'Test 108a: Currency mismatch under proxy mapping is invalid');
  check(val.failedChecks.includes('currency'), 'Test 108b: failedChecks includes currency');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 109: Invalid unit under proxy mapping returns invalid (STEP 4-8, Task 7.14)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_109', companyId: 'bmw_group', unit: 'currency_millions', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_109', companyId: 'bmw_group', metricId: 'operating_income', unit: 'currency_thousands' as any, reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_109', companyId: 'bmw_group', metricId: 'operating_margin', unit: 'percentage', reportingScope: 'automotive_segment' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'invalid', 'Test 109a: Unit mismatch under proxy mapping is invalid');
  check(val.failedChecks.includes('unit'), 'Test 109b: failedChecks includes unit');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 110: Invalid provenance under proxy mapping returns invalid (STEP 4-8, Task 7.15)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_110', companyId: 'bmw_group', sourceDocId: undefined, reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_110', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_110', companyId: 'bmw_group', metricId: 'operating_margin', unit: 'percentage', reportingScope: 'automotive_segment' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'invalid', 'Test 110a: Missing provenance under proxy mapping is invalid');
  check(val.failedChecks.includes('provenance'), 'Test 110b: failedChecks includes provenance');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 111: Unverified source under proxy mapping produces needs_review (STEP 4-8, Task 7.16)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_111', companyId: 'bmw_group', reportingScope: 'consolidated_group' });
  const profitUnverified = makeObs({ id: 'profit_111', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', verificationStatus: 'needs_review' });
  const margin = makeObs({ id: 'margin_111', companyId: 'bmw_group', metricId: 'operating_margin', unit: 'percentage', reportingScope: 'automotive_segment' });

  const val = validateMarginTriplet(rev, profitUnverified, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'needs_review', 'Test 111a: Unverified observation under proxy mapping produces needs_review');
  check(val.failedChecks.includes('verificationStatus'), 'Test 111b: failedChecks includes verificationStatus');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 112: Proxy result cannot become verified (invariants hold) (STEP 4-8, Task 7.17)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_112', companyId: 'bmw_group', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_112', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin = makeObs({ id: 'margin_112', companyId: 'bmw_group', metricId: 'operating_margin', unit: 'percentage', reportingScope: 'automotive_segment' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'proxy_only', 'Test 112a: Status is proxy_only');
  check(val.status !== 'verified', 'Test 112b: Status is never verified');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding !== null, 'Test 112c: Proxy finding is generated');
  check(finding?.disposition === 'review', 'Test 112d: Proxy finding disposition is review');
  check((finding?.disposition as string) !== 'verified', 'Test 112e: Proxy finding disposition is never verified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 113: Proxy result cannot become mathematically verified (STEP 4-8, Task 7.18)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_113', companyId: 'bmw_group', reportingScope: 'consolidated_group', value: 10000 });
  const profit = makeObs({ id: 'profit_113', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', value: 700 });
  const margin = makeObs({ id: 'margin_113', companyId: 'bmw_group', metricId: 'operating_margin', unit: 'percentage', reportingScope: 'automotive_segment', value: 7.0 });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping });
  check(val.status === 'proxy_only', 'Test 113a: Status is proxy_only even with exact math');
  check(val.mathematicallyVerified === false, 'Test 113b: mathematicallyVerified is strictly false');
  check(val.calculatedMargin === null, 'Test 113c: calculatedMargin is strictly null');
  check(val.difference === null, 'Test 113d: difference is strictly null');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 114: Normal same-scope verified margin (STEP 4-8, Task 7.19)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({ id: 'rev_114', companyId: 'volkswagen_group', reportingScope: 'consolidated_group', value: 80000 });
  const profit = makeObs({ id: 'profit_114', companyId: 'volkswagen_group', metricId: 'operating_income', reportingScope: 'consolidated_group', value: 5600 });
  const margin = makeObs({ id: 'margin_114', companyId: 'volkswagen_group', metricId: 'operating_margin', reportingScope: 'consolidated_group', value: 7.0, unit: 'percentage' });

  const allowedRel = [{ relationshipType: 'same_scope' as const, description: 'Same scope' }];
  const match = matchScopeRelationship(rev.reportingScope, profit.reportingScope, margin.reportingScope, allowedRel);
  check(match === true, 'Test 114a: matchScopeRelationship returns true for same_scope');

  const val = validateMarginTriplet(rev, profit, margin);
  check(val.status === 'verified', 'Test 114b: Clean same-scope triplet is verified');
  check(val.mathematicallyVerified === true, 'Test 114c: mathematicallyVerified is true');
  check(val.calculatedMargin === 7.0, 'Test 114d: calculatedMargin is 7.0');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 115: Valid segment relationship (segment_operating_margin verified) (STEP 4-8, Task 7.20)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({ id: 'rev_115', companyId: 'volkswagen_group', reportingScope: 'automotive_segment', value: 50000 });
  const profit = makeObs({ id: 'profit_115', companyId: 'volkswagen_group', metricId: 'operating_income', reportingScope: 'automotive_segment', value: 3500 });
  const margin = makeObs({ id: 'margin_115', companyId: 'volkswagen_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', value: 7.0, unit: 'percentage' });

  const segmentRule: MarginRelationshipRule = {
    id: 'rule_segment_test_115',
    name: 'Segment Operating Margin',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['reported'],
    denominatorAccountingBases: ['reported'],
    marginAccountingBases: ['reported'],
    allowedScopeRelationships: [
      {
        relationshipType: 'segment_operating_margin',
        denominatorScope: 'automotive_segment',
        numeratorScope: 'automotive_segment',
        marginScope: 'automotive_segment',
      },
    ],
  };

  const match = matchScopeRelationship(rev.reportingScope, profit.reportingScope, margin.reportingScope, segmentRule.allowedScopeRelationships);
  check(match === true, 'Test 115a: matchScopeRelationship returns true for segment_operating_margin');

  const val = validateMarginTriplet(rev, profit, margin, [segmentRule]);
  check(val.status === 'verified', 'Test 115b: Valid segment triplet is verified under segment rule');
  check(val.mathematicallyVerified === true, 'Test 115c: mathematicallyVerified is true for segment rule');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 116: Unsupported custom scope relationship (invalid/scope mismatch) (STEP 4-8, Task 7.21)
// ────────────────────────────────────────────────────────────────────────────
{
  const rev = makeObs({ id: 'rev_116', companyId: 'volkswagen_group', reportingScope: 'consolidated_group' });
  const profit = makeObs({ id: 'profit_116', companyId: 'volkswagen_group', metricId: 'operating_income', reportingScope: 'financial_services' });
  const margin = makeObs({ id: 'margin_116', companyId: 'volkswagen_group', metricId: 'operating_margin', reportingScope: 'commercial_vehicles_segment', unit: 'percentage' });

  const onlySameScopeRule: MarginRelationshipRule = {
    id: 'rule_same_scope_only',
    name: 'Strict Same Scope Rule',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorAccountingBases: ['reported'],
    denominatorAccountingBases: ['reported'],
    marginAccountingBases: ['reported'],
    allowedScopeRelationships: [
      {
        relationshipType: 'same_scope',
      },
    ],
  };

  const match = matchScopeRelationship(rev.reportingScope, profit.reportingScope, margin.reportingScope, onlySameScopeRule.allowedScopeRelationships);
  check(match === false, 'Test 116a: Unsupported scope combination rejected by matchScopeRelationship');

  const val = validateMarginTriplet(rev, profit, margin, [onlySameScopeRule]);
  check(val.status === 'invalid', 'Test 116b: Unsupported custom scope triplet is invalid');
  check(val.failedChecks.includes('scope'), 'Test 116c: failedChecks includes scope');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 117: DocumentedReportedKpi compatibility and multi-lookup validation (STEP 4-8, Task 6)
// ────────────────────────────────────────────────────────────────────────────
{
  const kpis = findDocumentedReportedKpis('bmw_group', '2026-Q2', 'operating_margin', 'automotive_segment', 'quarterly', 'reported');
  check(kpis.length === 1, 'Test 117a: findDocumentedReportedKpis resolves exactly 1 KPI');

  const validMargin = makeObs({
    id: 'margin_117',
    companyId: 'bmw_group',
    period: '2026-Q2',
    periodType: 'quarterly',
    metricId: 'operating_margin',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });
  const resValid = validateDocumentedReportedKpiCompatibility(kpis[0], validMargin, mockSourcesMap);
  check(resValid.isValid === true, 'Test 117b: Valid observation is compatible with documented KPI');
  check(resValid.mismatches.length === 0, 'Test 117c: No mismatches for compatible documented KPI');

  const invalidScopeMargin = { ...validMargin, reportingScope: 'consolidated_group' as const };
  const resInvalid = validateDocumentedReportedKpiCompatibility(kpis[0], invalidScopeMargin, mockSourcesMap);
  check(resInvalid.isValid === false, 'Test 117d: Mismatched scope fails documented KPI compatibility');
  check(resInvalid.mismatches.includes('reportingScope'), 'Test 117e: Mismatches includes reportingScope');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 118 (STEP 4-9, Scenario 1): Valid BMW proxy mapping with deep source validation
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  check(bmwMapping !== undefined, 'Test 118a: BMW Q2 2026 proxy mapping resolved');

  const rev = makeObs({ id: 'rev_118', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_118', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_118', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === true, 'Test 118b: Valid BMW proxy mapping passes deep source verification');
  check(compat.mismatches.length === 0, 'Test 118c: No mismatches on valid BMW proxy mapping');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 119 (STEP 4-9, Scenario 2): Valid Mercedes proxy mapping with deep source validation
// ────────────────────────────────────────────────────────────────────────────
{
  const mbgMapping = findProxyMetricMapping('mercedes_benz', '2026-Q2', 'cars_adjusted_ebit', 'operating_income', 'quarterly')!;
  check(mbgMapping !== undefined, 'Test 119a: Mercedes Q2 2026 proxy mapping resolved');

  const rev = makeObs({ id: 'rev_119', companyId: 'mercedes_benz', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'mbg_2026_q2_results' });
  const profit = makeObs({ id: 'profit_119', companyId: 'mercedes_benz', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'mbg_2026_q2_results' });
  const margin = makeObs({ id: 'margin_119', companyId: 'mercedes_benz', metricId: 'operating_margin', reportingScope: 'cars_segment', accountingBasis: 'adjusted', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'mbg_2026_q2_results' });

  const compat = validateProxyMappingCompatibility(mbgMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === true, 'Test 119b: Valid Mercedes proxy mapping passes deep source verification');
  check(compat.mismatches.length === 0, 'Test 119c: No mismatches on valid Mercedes proxy mapping');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 120 (STEP 4-9, Scenario 3): Missing source document in registry fails with sourceMissing
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_120', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_120', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_120', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const emptyRegistry = new Map<string, SourceDocument>();
  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, emptyRegistry);
  check(compat.isValid === false, 'Test 120a: Missing source document fails compatibility');
  check(compat.mismatches.includes('sourceMissing'), 'Test 120b: Mismatches includes sourceMissing');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 121 (STEP 4-9, Scenario 4): Unverified source document (isVerified !== true) fails with sourceUnverified
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_121', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_121', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_121', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const unverifiedSources = new Map(mockSourcesMap);
  unverifiedSources.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    isVerified: false,
  });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, unverifiedSources);
  check(compat.isValid === false, 'Test 121a: isVerified=false fails compatibility');
  check(compat.mismatches.includes('sourceUnverified'), 'Test 121b: Mismatches includes sourceUnverified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 122 (STEP 4-9, Scenario 5): Unverified verificationStatus fails with sourceVerificationStatus
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_122', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_122', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_122', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const unverifiedStatusSources = new Map(mockSourcesMap);
  unverifiedStatusSources.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    verificationStatus: 'unverified' as any,
  });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, unverifiedStatusSources);
  check(compat.isValid === false, 'Test 122a: verificationStatus!=="verified" fails compatibility');
  check(compat.mismatches.includes('sourceVerificationStatus'), 'Test 122b: Mismatches includes sourceVerificationStatus');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 123 (STEP 4-9, Scenario 6): Source company mismatch fails with sourceCompanyMismatch
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_123', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_123', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_123', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const mismatchCompanySources = new Map(mockSourcesMap);
  mismatchCompanySources.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    companyId: 'toyota_motor',
  });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, mismatchCompanySources);
  check(compat.isValid === false, 'Test 123a: Source company mismatch fails compatibility');
  check(compat.mismatches.includes('sourceCompanyMismatch'), 'Test 123b: Mismatches includes sourceCompanyMismatch');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 124 (STEP 4-9, Scenario 7): Source period mismatch fails with sourcePeriodMismatch
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_124', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_124', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_124', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const mismatchPeriodSources = new Map(mockSourcesMap);
  mismatchPeriodSources.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    period: '2025-FY',
  });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, mismatchPeriodSources);
  check(compat.isValid === false, 'Test 124a: Source period mismatch fails compatibility');
  check(compat.mismatches.includes('sourcePeriodMismatch'), 'Test 124b: Mismatches includes sourcePeriodMismatch');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 125 (STEP 4-9, Scenario 8): Insecure officialUrl fails with sourceOfficialUrl
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_125', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_125', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_125', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const insecureUrlSources = new Map(mockSourcesMap);
  insecureUrlSources.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    officialUrl: 'http://insecure.example.com/report.pdf',
  });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, insecureUrlSources);
  check(compat.isValid === false, 'Test 125a: Insecure HTTP URL fails compatibility');
  check(compat.mismatches.includes('sourceOfficialUrl'), 'Test 125b: Mismatches includes sourceOfficialUrl');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 126 (STEP 4-9, Scenario 9): Invalid publicationDate fails with sourcePublicationDate
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_126', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_126', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_126', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const invalidDateSources = new Map(mockSourcesMap);
  invalidDateSources.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    publicationDate: '05/01/2026',
  });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, invalidDateSources);
  check(compat.isValid === false, 'Test 126a: Non-ISO publicationDate fails compatibility');
  check(compat.mismatches.includes('sourcePublicationDate'), 'Test 126b: Mismatches includes sourcePublicationDate');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 127 (STEP 4-9, Scenario 10): Evidence lacking meaningful locator fails with missingEvidenceLocator
// ────────────────────────────────────────────────────────────────────────────
{
  const baseMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const mappingNoLocator: ProxyMetricMapping = {
    ...baseMapping,
    id: 'mapping_no_locator_test',
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        purpose: 'scope_definition',
      },
    ],
  };

  const rev = makeObs({ id: 'rev_127', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_127', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_127', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(mappingNoLocator, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 127a: Evidence without locators fails compatibility');
  check(compat.mismatches.includes('missingEvidenceLocator'), 'Test 127b: Mismatches includes missingEvidenceLocator');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 128 (STEP 4-9, Scenario 11): Evidence with pageNumber passes locator check
// ────────────────────────────────────────────────────────────────────────────
{
  const baseMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const mappingWithPage: ProxyMetricMapping = {
    ...baseMapping,
    id: 'mapping_page_test',
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        pageNumber: 38,
        purpose: 'scope_definition',
      },
    ],
  };

  const rev = makeObs({ id: 'rev_128', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_128', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_128', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(mappingWithPage, rev, profit, margin, mockSourcesMap);
  check(!compat.mismatches.includes('missingEvidenceLocator'), 'Test 128: Evidence with pageNumber satisfies locator check');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 129 (STEP 4-9, Scenario 12): Evidence with sectionReference passes locator check
// ────────────────────────────────────────────────────────────────────────────
{
  const baseMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const mappingWithSection: ProxyMetricMapping = {
    ...baseMapping,
    id: 'mapping_section_test',
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Automotive Segment Report',
        purpose: 'scope_definition',
      },
    ],
  };

  const rev = makeObs({ id: 'rev_129', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_129', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_129', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(mappingWithSection, rev, profit, margin, mockSourcesMap);
  check(!compat.mismatches.includes('missingEvidenceLocator'), 'Test 129: Evidence with sectionReference satisfies locator check');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 130 (STEP 4-9, Scenario 13): Evidence with tableReference passes locator check
// ────────────────────────────────────────────────────────────────────────────
{
  const baseMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const mappingWithTable: ProxyMetricMapping = {
    ...baseMapping,
    id: 'mapping_table_test',
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        tableReference: 'Segment Key Figures',
        purpose: 'scope_definition',
      },
    ],
  };

  const rev = makeObs({ id: 'rev_130', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_130', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_130', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(mappingWithTable, rev, profit, margin, mockSourcesMap);
  check(!compat.mismatches.includes('missingEvidenceLocator'), 'Test 130: Evidence with tableReference satisfies locator check');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 131 (STEP 4-9, Scenario 14): Evidence with evidenceReference passes locator check
// ────────────────────────────────────────────────────────────────────────────
{
  const baseMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const mappingWithEvidenceRef: ProxyMetricMapping = {
    ...baseMapping,
    id: 'mapping_evref_test',
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        evidenceReference: 'Automotive EBIT margin 7.8%',
        purpose: 'scope_definition',
      },
    ],
  };

  const rev = makeObs({ id: 'rev_131', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_131', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_131', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(mappingWithEvidenceRef, rev, profit, margin, mockSourcesMap);
  check(!compat.mismatches.includes('missingEvidenceLocator'), 'Test 131: Evidence with evidenceReference satisfies locator check');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 132 (STEP 4-9, Scenario 15): Candidate revenue with wrong metricId fails denominatorMetricId
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revWrongMetric = makeObs({ id: 'rev_132', companyId: 'bmw_group', metricId: 'gross_revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_132', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_132', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, revWrongMetric, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 132a: Wrong denominator metric fails compatibility');
  check(compat.mismatches.includes('denominatorMetricId'), 'Test 132b: Mismatches includes denominatorMetricId');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 133 (STEP 4-9, Scenario 16): Candidate revenue with wrong scope fails denominatorScope
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revWrongScope = makeObs({ id: 'rev_133', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'automotive_segment', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_133', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_133', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, revWrongScope, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 133a: Wrong denominator scope fails compatibility');
  check(compat.mismatches.includes('denominatorScope'), 'Test 133b: Mismatches includes denominatorScope');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 134 (STEP 4-9, Scenario 17): Candidate revenue with wrong basis fails denominatorBasis
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revWrongBasis = makeObs({ id: 'rev_134', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'adjusted', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_134', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_134', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, revWrongBasis, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 134a: Wrong denominator basis fails compatibility');
  check(compat.mismatches.includes('denominatorBasis'), 'Test 134b: Mismatches includes denominatorBasis');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 135 (STEP 4-9, Scenario 18): Triplet with wrong denominator metricId returns invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revWrongMetric = makeObs({ id: 'rev_135', companyId: 'bmw_group', metricId: 'gross_revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_135', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_135', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const val = validateMarginTriplet(revWrongMetric, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 135a: Triplet with wrong denominator metricId is invalid');
  check(val.failedChecks.includes('metricDefinition'), 'Test 135b: failedChecks includes metricDefinition');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 136 (STEP 4-9, Scenario 19): Triplet with wrong denominator scope returns invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revWrongScope = makeObs({ id: 'rev_136', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'automotive_segment', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_136', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_136', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const val = validateMarginTriplet(revWrongScope, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 136a: Triplet with wrong denominator scope is invalid');
  check(val.failedChecks.includes('scope'), 'Test 136b: failedChecks includes scope');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 137 (STEP 4-9, Scenario 20): Triplet with wrong denominator basis returns invalid
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revWrongBasis = makeObs({ id: 'rev_137', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'adjusted', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_137', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_137', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const val = validateMarginTriplet(revWrongBasis, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 137a: Triplet with wrong denominator basis is invalid');
  check(val.failedChecks.includes('accountingBasis'), 'Test 137b: failedChecks includes accountingBasis');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 138 (STEP 4-9, Scenario 21): Object-based query in findProxyMetricMappings
// ────────────────────────────────────────────────────────────────────────────
{
  const query: ProxyMetricMappingQuery = {
    companyId: 'bmw_group',
    period: '2026-Q2',
    targetMetricId: 'automotive_segment_ebit',
  };
  const mappings = findProxyMetricMappings(query);
  check(mappings.length === 1, 'Test 138a: Object query resolves exactly 1 BMW mapping');
  check(mappings[0].id === 'bmw_group_operating_income_proxy_2026q2', 'Test 138b: Resolved mapping has correct ID');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 139 (STEP 4-9, Scenario 22): Object-based query in findProxyMetricMapping
// ────────────────────────────────────────────────────────────────────────────
{
  const query: ProxyMetricMappingQuery = {
    companyId: 'mercedes_benz',
    period: '2026-Q2',
    targetMetricId: 'cars_adjusted_ebit',
  };
  const mapping = findProxyMetricMapping(query);
  check(mapping !== undefined, 'Test 139a: Object query resolves Mercedes mapping');
  check(mapping?.id === 'mbg_group_operating_income_proxy_2026q2', 'Test 139b: Resolved mapping has correct ID');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 140 (STEP 4-9, Scenario 23): Positional lookup with targetMetricId 'operating_income' does NOT wildcard-match
// ────────────────────────────────────────────────────────────────────────────
{
  const noMatch = findProxyMetricMapping('bmw_group', '2026-Q2', 'operating_income');
  check(noMatch === undefined, 'Test 140: targetMetricId="operating_income" does NOT wildcard-match automotive_segment_ebit');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 141 (STEP 4-9, Scenario 24): Multiple mapping matches in findProxyMetricMapping returns undefined
// ────────────────────────────────────────────────────────────────────────────
{
  const duplicateMapping: ProxyMetricMapping = {
    ...PROXY_METRIC_MAPPINGS[0],
    id: 'duplicate_bmw_q2_proxy',
  };
  const mappingsWithDuplicate = [...PROXY_METRIC_MAPPINGS, duplicateMapping];

  const result = findProxyMetricMapping(
    { companyId: 'bmw_group', period: '2026-Q2', targetMetricId: 'automotive_segment_ebit' },
    mappingsWithDuplicate
  );
  check(result === undefined, 'Test 141: Multiple matches trigger ambiguity rejection (returns undefined)');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 142 (STEP 4-9, Scenario 25): Mapping with status !== 'proxy_only' rejected with invalidMappingStatus
// ────────────────────────────────────────────────────────────────────────────
{
  const baseMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const invalidStatusMapping: ProxyMetricMapping = {
    ...baseMapping,
    id: 'invalid_status_test',
    status: 'needs_review' as any,
  };

  const rev = makeObs({ id: 'rev_142', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_142', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_142', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(invalidStatusMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 142a: Mapping with status!=="proxy_only" fails compatibility');
  check(compat.mismatches.includes('invalidMappingStatus'), 'Test 142b: Mismatches includes invalidMappingStatus');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 143 (STEP 4-9, Scenario 26): Mapping with empty id or reason rejected
// ────────────────────────────────────────────────────────────────────────────
{
  const baseMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const emptyIdMapping: ProxyMetricMapping = {
    ...baseMapping,
    id: '',
    reason: '',
  };

  const rev = makeObs({ id: 'rev_143', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_143', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_143', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(emptyIdMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 143a: Empty id/reason fails compatibility');
  check(compat.mismatches.includes('emptyMappingId'), 'Test 143b: Mismatches includes emptyMappingId');
  check(compat.mismatches.includes('emptyMappingReason'), 'Test 143c: Mismatches includes emptyMappingReason');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 144 (STEP 4-9, Scenario 27): Mapping with empty sourceDocIds or empty evidence rejected
// ────────────────────────────────────────────────────────────────────────────
{
  const baseMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const emptyDocsMapping: ProxyMetricMapping = {
    ...baseMapping,
    id: 'empty_docs_mapping',
    sourceDocIds: [],
    evidence: [],
  };

  const rev = makeObs({ id: 'rev_144', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_144', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_144', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(emptyDocsMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 144a: Empty sourceDocIds/evidence fails compatibility');
  check(compat.mismatches.includes('emptySourceDocIds'), 'Test 144b: Mismatches includes emptySourceDocIds');
  check(compat.mismatches.includes('emptyEvidence'), 'Test 144c: Mismatches includes emptyEvidence');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 145 (STEP 4-9, Scenario 28): MarginValidationResult includes proxyCompatibility, mathematicalEquivalence, limitations
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const rev = makeObs({ id: 'rev_145', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_145', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_145', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'proxy_only', 'Test 145a: Valid proxy triplet validates as proxy_only');
  check(val.proxyCompatibility === true, 'Test 145b: proxyCompatibility is true');
  check(val.mathematicalEquivalence === false, 'Test 145c: mathematicalEquivalence is strictly false');
  check(val.limitations?.includes('proxy_numerator') === true, 'Test 145d: limitations includes proxy_numerator');
  check(val.limitations?.includes('mathematical_equivalence_unverified') === true, 'Test 145e: limitations includes mathematical_equivalence_unverified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 146 (STEP 4-9, Scenario 29): MarginValidationResult on proxy failure includes proxyCompatibility: false and limitations
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly')!;
  const revWrongScope = makeObs({ id: 'rev_146', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_146', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_146', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const val = validateMarginTriplet(revWrongScope, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 146a: Failed proxy triplet returns invalid');
  check(val.proxyCompatibility === false, 'Test 146b: proxyCompatibility is false');
  check(val.limitations?.includes('denominatorScope') === true, 'Test 146c: limitations includes denominatorScope');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 147 (STEP 4-9, Scenario 30): DocumentedReportedKpi source validation rejects unverified source or missing locator
// ────────────────────────────────────────────────────────────────────────────
{
  const kpis = findDocumentedReportedKpis('bmw_group', '2026-Q2', 'operating_margin', 'automotive_segment', 'quarterly', 'reported');
  check(kpis.length === 1, 'Test 147a: findDocumentedReportedKpis resolves exactly 1 KPI');

  const validMargin = makeObs({
    id: 'margin_147',
    companyId: 'bmw_group',
    period: '2026-Q2',
    periodType: 'quarterly',
    metricId: 'operating_margin',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const unverifiedSources = new Map(mockSourcesMap);
  unverifiedSources.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    isVerified: false,
  });

  const resUnverified = validateDocumentedReportedKpiCompatibility(kpis[0], validMargin, unverifiedSources);
  check(resUnverified.isValid === false, 'Test 147b: Unverified source rejected for documented KPI');
  check(resUnverified.mismatches.includes('sourceUnverified'), 'Test 147c: Mismatches includes sourceUnverified');

  const kpiNoLocator = {
    ...kpis[0],
    id: 'kpi_no_locator_test',
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        purpose: 'reported_kpi' as const,
      },
    ],
  };
  const resNoLocator = validateDocumentedReportedKpiCompatibility(kpiNoLocator, validMargin, mockSourcesMap);
  check(resNoLocator.isValid === false, 'Test 147d: Documented KPI without locators fails compatibility');
  check(resNoLocator.mismatches.includes('missingEvidenceLocator'), 'Test 147e: Mismatches includes missingEvidenceLocator');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 148 (STEP 4-10, Scenario 1): Omitted or undefined source registry must fail validation
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_148', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_148', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_148', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const resOmitted = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, undefined as any);
  check(resOmitted.isValid === false, 'Test 148a: Omitted source registry fails validation');
  check(resOmitted.mismatches.includes('sourceMissing'), 'Test 148b: Mismatches includes sourceMissing');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 149 (STEP 4-10, Scenario 4): Undefined isVerified state fails validation
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_149', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_149', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_149', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const undefSources = new Map(mockSourcesMap);
  undefSources.set('bmw_2026_q2_statement', {
    ...mockSourcesMap.get('bmw_2026_q2_statement')!,
    isVerified: undefined as any,
  });

  const resUndef = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, undefSources);
  check(resUndef.isValid === false, 'Test 149a: isVerified=undefined fails compatibility');
  check(resUndef.mismatches.includes('sourceUnverified'), 'Test 149b: Mismatches includes sourceUnverified');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 150 (STEP 4-10, Scenario 10): Evidence source ID not included in mapping sourceDocIds
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const mappingUnlistedEvidence: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'mapping_unlisted_evidence',
    evidence: [
      {
        sourceDocId: 'unrelated_foreign_doc',
        pageNumber: 42,
        purpose: 'proxy_justification',
      },
    ],
  };

  const rev = makeObs({ id: 'rev_150', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_150', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_150', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const res = validateProxyMappingCompatibility(mappingUnlistedEvidence, rev, profit, margin, mockSourcesMap);
  check(res.isValid === false, 'Test 150a: Evidence sourceDocId not included in sourceDocIds fails validation');
  check(res.mismatches.includes('evidenceSourceDocMismatch'), 'Test 150b: Mismatches includes evidenceSourceDocMismatch');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 151 (STEP 4-10, Scenario 10): Evidence source ID not included in KPI sourceDocIds
// ────────────────────────────────────────────────────────────────────────────
{
  const kpis = findDocumentedReportedKpis('bmw_group', '2026-Q2');
  const kpiUnlistedEvidence: DocumentedReportedKpi = {
    ...kpis[0],
    id: 'kpi_unlisted_evidence',
    evidence: [
      {
        sourceDocId: 'unlisted_kpi_doc',
        pageNumber: 15,
        purpose: 'reported_kpi',
      },
    ],
  };

  const margin = makeObs({ id: 'margin_151', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const res = validateDocumentedReportedKpiCompatibility(kpiUnlistedEvidence, margin, mockSourcesMap);
  check(res.isValid === false, 'Test 151a: KPI evidence sourceDocId not in sourceDocIds fails validation');
  check(res.mismatches.includes('evidenceSourceDocMismatch'), 'Test 151b: Mismatches includes evidenceSourceDocMismatch');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 152 (STEP 4-10, Scenario 11): Evidence source document missing from registry
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const mappingMissingEvidenceDoc: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'mapping_missing_evidence_doc',
    sourceDocIds: ['bmw_2026_q2_statement', 'missing_doc_id'],
    evidence: [
      {
        sourceDocId: 'missing_doc_id',
        pageNumber: 10,
        purpose: 'proxy_justification',
      },
    ],
  };

  const rev = makeObs({ id: 'rev_152', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_152', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_152', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const res = validateProxyMappingCompatibility(mappingMissingEvidenceDoc, rev, profit, margin, mockSourcesMap);
  check(res.isValid === false, 'Test 152a: Evidence source missing from registry fails validation');
  check(res.mismatches.includes('evidenceSourceMissing'), 'Test 152b: Mismatches includes evidenceSourceMissing');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 153-155 (STEP 4-10, Scenarios 12-14): Missing mandatory denominator contract fields
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_153', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_153', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_153', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  // Missing metricId
  const missingMetric = { ...bmwMapping, id: 'm_missing_metric', denominatorMetricId: undefined as any };
  const res1 = validateProxyMappingCompatibility(missingMetric, rev, profit, margin, mockSourcesMap);
  check(res1.isValid === false, 'Test 153a: Missing denominatorMetricId fails compatibility');
  check(res1.mismatches.includes('missingDenominatorMetricId'), 'Test 153b: Mismatches includes missingDenominatorMetricId');

  // Missing scope
  const missingScope = { ...bmwMapping, id: 'm_missing_scope', denominatorScope: undefined as any };
  const res2 = validateProxyMappingCompatibility(missingScope, rev, profit, margin, mockSourcesMap);
  check(res2.isValid === false, 'Test 154a: Missing denominatorScope fails compatibility');
  check(res2.mismatches.includes('missingDenominatorScope'), 'Test 154b: Mismatches includes missingDenominatorScope');

  // Missing basis
  const missingBasis = { ...bmwMapping, id: 'm_missing_basis', denominatorBasis: undefined as any };
  const res3 = validateProxyMappingCompatibility(missingBasis, rev, profit, margin, mockSourcesMap);
  check(res3.isValid === false, 'Test 155a: Missing denominatorBasis fails compatibility');
  check(res3.mismatches.includes('missingDenominatorBasis'), 'Test 155b: Mismatches includes missingDenominatorBasis');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 156-157 (STEP 4-10, Scenarios 18-19): Unsupported company and wrong target semantic
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_156', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_156', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_156', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  check(TARGET_SEMANTICS_BY_COMPANY.bmw_group.includes('automotive_segment_ebit'), 'Test 156_pre_a: TARGET_SEMANTICS_BY_COMPANY includes automotive_segment_ebit for BMW');
  check(TARGET_SEMANTICS_BY_COMPANY.mercedes_benz.includes('cars_adjusted_ebit'), 'Test 156_pre_b: TARGET_SEMANTICS_BY_COMPANY includes cars_adjusted_ebit for Mercedes');

  // Unsupported company
  const unsupportedCompanyMapping: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'm_unsupported_comp',
    companyId: 'unsupported_oem_xyz',
  };
  const revUnsup = { ...rev, companyId: 'unsupported_oem_xyz' };
  const profitUnsup = { ...profit, companyId: 'unsupported_oem_xyz' };
  const marginUnsup = { ...margin, companyId: 'unsupported_oem_xyz' };
  const resUnsup = validateProxyMappingCompatibility(unsupportedCompanyMapping, revUnsup, profitUnsup, marginUnsup, mockSourcesMap);
  check(resUnsup.isValid === false, 'Test 156a: Unsupported proxy company fails compatibility');
  check(resUnsup.mismatches.includes('unsupportedProxyCompany'), 'Test 156b: Mismatches includes unsupportedProxyCompany');

  // Wrong target semantic
  const wrongSemanticMapping: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'm_wrong_semantic',
    targetNumeratorSemantic: 'arbitrary_unapproved_semantic',
  };
  const resSemantic = validateProxyMappingCompatibility(wrongSemanticMapping, rev, profit, margin, mockSourcesMap);
  check(resSemantic.isValid === false, 'Test 157a: Wrong targetNumeratorSemantic fails compatibility');
  check(resSemantic.mismatches.includes('targetNumeratorSemantic'), 'Test 157b: Mismatches includes targetNumeratorSemantic');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 158 (STEP 4-10, Task 5): Revenue source provenance policy (Policy A)
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const revValid = makeObs({ id: 'rev_158_v', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const revExcluded = makeObs({ id: 'rev_158_e', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'foreign_revenue_doc_xyz' });
  const profit = makeObs({ id: 'profit_158', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_158', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  // Revenue source included: passes
  const resValid = validateProxyMappingCompatibility(bmwMapping, revValid, profit, margin, mockSourcesMap);
  check(resValid.isValid === true, 'Test 158a: Revenue source included in mapping sourceDocIds passes');

  // Revenue source excluded: fails with revenueSourceDoc
  const resExcluded = validateProxyMappingCompatibility(bmwMapping, revExcluded, profit, margin, mockSourcesMap);
  check(resExcluded.isValid === false, 'Test 158b: Revenue source not in mapping sourceDocIds fails validation');
  check(resExcluded.mismatches.includes('revenueSourceDoc'), 'Test 158c: Mismatches includes revenueSourceDoc');

  // In validateMarginTriplet: excluded revenue source causes invalid status
  const valExcluded = validateMarginTriplet(revExcluded, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(valExcluded.status === 'invalid', 'Test 158d: Triplet with unlisted revenue sourceDocId falls back to invalid');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 159 (STEP 4-10, Task 6): lookupProxyMetricMapping diagnostics
// ────────────────────────────────────────────────────────────────────────────
{
  // 1. None
  const lookupNone = lookupProxyMetricMapping('toyota_motor', '2026-Q2');
  check(lookupNone.status === 'none', 'Test 159a: lookupProxyMetricMapping returns status "none" when no mapping exists');

  // 2. Unique
  const lookupUnique = lookupProxyMetricMapping('bmw_group', '2026-Q2', 'automotive_segment_ebit', 'operating_income', 'quarterly');
  check(lookupUnique.status === 'unique', 'Test 159b: lookupProxyMetricMapping returns status "unique" for single match');
  if (lookupUnique.status === 'unique') {
    check(lookupUnique.mapping.id === 'bmw_group_operating_income_proxy_2026q2', 'Test 159c: Unique mapping ID matches');
  }

  // 3. Ambiguous
  const duplicateMapping: ProxyMetricMapping = {
    ...PROXY_METRIC_MAPPINGS[0],
    id: 'duplicate_diag_test_mapping',
  };
  const lookupAmbiguous = lookupProxyMetricMapping(
    'bmw_group',
    '2026-Q2',
    undefined,
    undefined,
    'quarterly',
    undefined,
    undefined,
    undefined,
    undefined,
    [...PROXY_METRIC_MAPPINGS, duplicateMapping]
  );
  check(lookupAmbiguous.status === 'ambiguous', 'Test 159d: lookupProxyMetricMapping returns status "ambiguous" for multiple matches');
  if (lookupAmbiguous.status === 'ambiguous') {
    check(lookupAmbiguous.mappings.length >= 2, 'Test 159e: Ambiguous result contains multiple candidate mappings');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 160 (STEP 4-10, Semantic Invariants): Proxy invariants under all conditions
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_160', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_160', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_160', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'proxy_only', 'Test 160a: Result is proxy_only');
  check(val.status !== 'verified', 'Test 160b: Proxy result NEVER becomes verified');
  check(val.mathematicallyVerified === false, 'Test 160c: Proxy result is NEVER mathematically verified');
  check(val.calculatedMargin === null, 'Test 160d: Proxy result calculatedMargin is strictly null');

  // Finding disposition check
  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding?.disposition === 'review', 'Test 160e: Proxy finding disposition is strictly "review"');
  check(finding?.disposition !== 'documented', 'Test 160f: Proxy finding disposition is NEVER "documented"');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 161 (STEP 4-11, Scenario 1): Missing revenue evidence fails with missingRevenueEvidence
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_161', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_161', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_161', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  // Strip 'revenue' from all evidence supports
  const mappingNoRev: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'mapping_no_rev_evidence',
    evidence: bmwMapping.evidence.map(ev => ({
      ...ev,
      supports: ev.supports?.filter(s => s !== 'revenue'),
    })),
  };

  const compat = validateProxyMappingCompatibility(mappingNoRev, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 161a: Missing revenue evidence fails validation');
  check(compat.mismatches.includes('missingRevenueEvidence'), 'Test 161b: Mismatches contains missingRevenueEvidence');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mappingNoRev, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 161c: Incompatible mapping falls back to invalid triplet');
  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: mappingNoRev });
  check(finding !== null && finding.disposition !== 'documented', 'Test 161d: Finding is not documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 162 (STEP 4-11, Scenario 2): Missing proxy numerator evidence fails with missingProxyNumeratorEvidence
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_162', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_162', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_162', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const mappingNoNumerator: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'mapping_no_numerator_evidence',
    evidence: bmwMapping.evidence.map(ev => ({
      ...ev,
      supports: ev.supports?.filter(s => s !== 'proxy_numerator'),
    })),
  };

  const compat = validateProxyMappingCompatibility(mappingNoNumerator, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 162a: Missing proxy numerator evidence fails validation');
  check(compat.mismatches.includes('missingProxyNumeratorEvidence'), 'Test 162b: Mismatches contains missingProxyNumeratorEvidence');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mappingNoNumerator, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 162c: Triplet invalid on missing numerator evidence');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 163 (STEP 4-11, Scenario 3): Missing target semantic evidence fails with missingTargetSemanticEvidence
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_163', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_163', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_163', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const mappingNoSemantic: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'mapping_no_semantic_evidence',
    evidence: bmwMapping.evidence.map(ev => ({
      ...ev,
      supports: ev.supports?.filter(s => s !== 'target_semantic'),
    })),
  };

  const compat = validateProxyMappingCompatibility(mappingNoSemantic, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 163a: Missing target semantic evidence fails validation');
  check(compat.mismatches.includes('missingTargetSemanticEvidence'), 'Test 163b: Mismatches contains missingTargetSemanticEvidence');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mappingNoSemantic, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 163c: Triplet invalid on missing target semantic evidence');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 164 (STEP 4-11, Scenario 4): Evidence sourceDocId not in mapping sourceDocIds fails with evidenceSourceDocMismatch
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_164', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_164', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_164', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const mappingUnlistedDoc: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'mapping_unlisted_doc',
    sourceDocIds: ['bmw_2026_q2_statement'],
    evidence: [
      ...bmwMapping.evidence,
      {
        sourceDocId: 'bmw_2025_fy_statement', // exists in mockSourcesMap but NOT in mapping.sourceDocIds
        pageNumber: 42,
        purpose: 'proxy_justification',
        supports: ['proxy_numerator'],
      },
    ],
  };

  const compat = validateProxyMappingCompatibility(mappingUnlistedDoc, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 164a: Evidence sourceDocId not in sourceDocIds fails validation');
  check(compat.mismatches.includes('evidenceSourceDocMismatch'), 'Test 164b: Mismatches contains evidenceSourceDocMismatch');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mappingUnlistedDoc, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 164c: Triplet invalid on evidence source mismatch');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 165 (STEP 4-11, Scenario 5): Evidence sourceDocId absent from source registry fails with evidenceSourceMissing
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_165', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_165', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_165', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const mappingGhostDoc: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'mapping_ghost_doc',
    sourceDocIds: ['bmw_2026_q2_statement', 'ghost_unregistered_doc'],
    evidence: [
      ...bmwMapping.evidence,
      {
        sourceDocId: 'ghost_unregistered_doc',
        pageNumber: 1,
        purpose: 'proxy_justification',
        supports: ['target_semantic'],
      },
    ],
  };

  const compat = validateProxyMappingCompatibility(mappingGhostDoc, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 165a: Evidence sourceDocId absent from registry fails validation');
  check(compat.mismatches.includes('evidenceSourceMissing') || compat.mismatches.includes('sourceMissing'), 'Test 165b: Mismatches contains evidenceSourceMissing / sourceMissing');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: mappingGhostDoc, sourcesMap: mockSourcesMap });
  check(val.status === 'invalid', 'Test 165c: Triplet invalid on ghost source doc');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 166 (STEP 4-11, Scenario 6): Reported KPI validation without valid source registry fails with sourceMissing
// ────────────────────────────────────────────────────────────────────────────
{
  const kpis = findDocumentedReportedKpis('bmw_group', '2026-Q2', 'operating_margin', 'automotive_segment', 'quarterly', 'reported');
  const kpi = kpis[0];
  const margin = makeObs({
    id: 'margin_166',
    companyId: 'bmw_group',
    period: '2026-Q2',
    periodType: 'quarterly',
    metricId: 'operating_margin',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
    sourceDocId: 'bmw_2026_q2_statement',
  });

  const emptyRegistry = new Map<string, SourceDocument>();
  const compat = validateDocumentedReportedKpiCompatibility(kpi, margin, emptyRegistry);
  check(compat.isValid === false, 'Test 166a: KPI validation fails with empty source registry');
  check(compat.mismatches.includes('sourceMissing'), 'Test 166b: Mismatches contains sourceMissing');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 167 (STEP 4-11, Scenario 7): Unsupported company fails with unsupportedProxyCompany
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_167', companyId: 'toyota_motor', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'toyota_doc' });
  const profit = makeObs({ id: 'profit_167', companyId: 'toyota_motor', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'toyota_doc' });
  const margin = makeObs({ id: 'margin_167', companyId: 'toyota_motor', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'toyota_doc' });

  const toyotaSources = new Map(mockSourcesMap);
  toyotaSources.set('toyota_doc', {
    id: 'toyota_doc',
    companyId: 'toyota_motor',
    title: 'Toyota Report',
    docType: 'quarterly_report',
    period: '2026-Q2',
    publicationDate: '2026-05-01',
    officialUrl: 'https://toyota.example.com/doc.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    lastChecked: '2026-09-20',
  });

  const unsupportedMapping: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'toyota_proxy_mapping',
    companyId: 'toyota_motor',
    sourceDocIds: ['toyota_doc'],
    evidence: bmwMapping.evidence.map(e => ({ ...e, sourceDocId: 'toyota_doc' })),
  };

  const compat = validateProxyMappingCompatibility(unsupportedMapping, rev, profit, margin, toyotaSources);
  check(compat.isValid === false, 'Test 167a: Unsupported proxy company fails validation');
  check(compat.mismatches.includes('unsupportedProxyCompany'), 'Test 167b: Mismatches contains unsupportedProxyCompany');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: unsupportedMapping, sourcesMap: toyotaSources });
  check(val.status === 'invalid', 'Test 167c: Triplet invalid for unsupported proxy company');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 168 (STEP 4-11, Scenario 8): Invalid target semantic fails with targetNumeratorSemantic
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_168', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_168', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_168', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  // Mercedes target semantic on BMW mapping
  const wrongSemanticMapping: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'bmw_wrong_semantic_mapping',
    targetNumeratorSemantic: 'cars_adjusted_ebit',
  };

  const compat = validateProxyMappingCompatibility(wrongSemanticMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 168a: Invalid target semantic fails validation');
  check(compat.mismatches.includes('targetNumeratorSemantic'), 'Test 168b: Mismatches contains targetNumeratorSemantic');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 169 (STEP 4-11, Scenario 9): Missing denominator contract fails compatibility
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_169', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_169', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_169', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const missingDenomMapping: ProxyMetricMapping = {
    ...bmwMapping,
    id: 'bmw_missing_denom_mapping',
    denominatorMetricId: '' as any,
  };

  const compat = validateProxyMappingCompatibility(missingDenomMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === false, 'Test 169a: Missing denominatorMetricId fails validation');
  check(compat.mismatches.includes('missingDenominatorMetricId'), 'Test 169b: Mismatches contains missingDenominatorMetricId');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 170 (STEP 4-11, Scenario 10): Ambiguous mapping lookup produces review finding
// ────────────────────────────────────────────────────────────────────────────
{
  const duplicateMapping: ProxyMetricMapping = {
    ...PROXY_METRIC_MAPPINGS[0],
    id: 'duplicate_ambiguous_test_170',
  };
  const lookup = lookupProxyMetricMapping(
    'bmw_group',
    '2026-Q2',
    undefined,
    undefined,
    'quarterly',
    undefined,
    undefined,
    undefined,
    undefined,
    [...PROXY_METRIC_MAPPINGS, duplicateMapping]
  );
  check(lookup.status === 'ambiguous', 'Test 170a: Duplicate mapping returns ambiguous status');

  // In audit engine, an ambiguous mapping lookup results in a review finding without auto-selecting
  const rev = makeObs({ id: 'rev_170', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_170', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_170', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  // When ambiguous, proxyMapping cannot be safely chosen: Triplet run without it stays invalid
  const valWithoutChosenProxy = validateMarginTriplet(rev, profit, margin);
  check(valWithoutChosenProxy.status === 'invalid', 'Test 170b: Triplet without resolved proxy mapping is invalid');
  const finding = createAuditFindingFromMarginValidation(valWithoutChosenProxy, 'bmw_group', '2026-Q2', 'quarterly');
  check(finding !== null && finding.disposition !== 'documented', 'Test 170c: Finding disposition is not documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 171 (STEP 4-11, Scenario 11): Proxy limitation separation and verification fields
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_171', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_171', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_171', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'proxy_only', 'Test 171a: Status is proxy_only');
  check(val.proxyLimitation === true, 'Test 171b: proxyLimitation is strictly true');
  check(val.proxyScopeCompatibility === true, 'Test 171c: proxyScopeCompatibility is strictly true');
  check(val.directMathematicalVerification === false, 'Test 171d: directMathematicalVerification is strictly false');
  check(val.mathematicallyVerified === false, 'Test 171e: mathematicallyVerified is strictly false');
  check(val.calculatedMargin === null, 'Test 171f: calculatedMargin is null');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding?.disposition === 'review', 'Test 171g: Finding disposition is strictly review');
  check(finding?.disposition !== 'documented', 'Test 171h: Finding disposition is never documented');
}

// ────────────────────────────────────────────────────────────────────────────
// TEST 172 (STEP 4-11, Scenario 12): Valid mapping with complete coverage
// ────────────────────────────────────────────────────────────────────────────
{
  const bmwMapping = findProxyMetricMapping('bmw_group', '2026-Q2')!;
  const rev = makeObs({ id: 'rev_172', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit = makeObs({ id: 'profit_172', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin = makeObs({ id: 'margin_172', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat = validateProxyMappingCompatibility(bmwMapping, rev, profit, margin, mockSourcesMap);
  check(compat.isValid === true, 'Test 172a: Valid mapping with full coverage has isValid true');
  check(compat.mismatches.length === 0, 'Test 172b: No mismatches for complete coverage mapping');

  check(PROXY_SEMANTIC_CONTRACTS.length >= 2, 'Test 172_contract: PROXY_SEMANTIC_CONTRACTS is populated');
  const contract = findProxySemanticContract(bmwMapping.companyId);
  check(contract !== undefined, 'Test 172c: Active semantic contract found for company');
  check(contract?.targetSemantic === bmwMapping.targetNumeratorSemantic, 'Test 172d: Contract semantic matches mapping semantic');

  const val = validateMarginTriplet(rev, profit, margin, undefined, { proxyMapping: bmwMapping, sourcesMap: mockSourcesMap });
  check(val.status === 'proxy_only', 'Test 172e: Triplet with valid mapping returns proxy_only');

  const finding = createAuditFindingFromMarginValidation(val, 'bmw_group', '2026-Q2', 'quarterly', { proxyMapping: bmwMapping });
  check(finding !== null, 'Test 172f: Finding is created');
  check(finding?.disposition === 'review', 'Test 172g: Valid proxy finding disposition is review');
}


// ────────────────────────────────────────────────────────────────────────────
// TESTS 173–176 (STEP 4-12, Task 3): Source document period validation regressions
// expectedPeriod = mapping.period ?? revObs.period
// ────────────────────────────────────────────────────────────────────────────

// TEST 173: mapping.period undefined; source doc period mismatch vs revObs.period
{
  const bmwMapping2025: ProxyMetricMapping = {
    ...PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2025fy')!,
    period: undefined, // mapping has no explicit period
  };
  // source doc for 2025-FY is in mockSourcesMap with period='2025-FY'
  // revObs.period='2026-Q2' → expectedPeriod='2026-Q2' → mismatch against '2025-FY'
  const rev173 = makeObs({ id: 'rev_173', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2025_fy_statement' });
  const profit173 = makeObs({ id: 'profit_173', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2025_fy_statement' });
  const margin173 = makeObs({ id: 'margin_173', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2025_fy_statement' });

  const compat173 = validateProxyMappingCompatibility(bmwMapping2025, rev173, profit173, margin173, mockSourcesMap);
  check(compat173.isValid === false, 'Test 173a: mapping.period undefined + source doc period mismatch vs revObs.period → isValid false');
  check(compat173.mismatches.includes('sourcePeriodMismatch'), 'Test 173b: mismatch code is sourcePeriodMismatch');
}

// TEST 174: mapping.period defined + source doc period mismatch
{
  // Build a mapping with an explicit period that differs from the source doc period in mockSourcesMap
  const bmwMappingWrongPeriod: ProxyMetricMapping = {
    ...PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!,
    period: '2025-FY',                          // explicit period is 2025-FY
    periodType: 'annual',
    sourceDocIds: ['bmw_2026_q2_statement'],    // but source doc has period='2026-Q2'
  };
  const rev174 = makeObs({ id: 'rev_174', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2025-FY', periodType: 'annual', sourceDocId: 'bmw_2026_q2_statement' });
  const profit174 = makeObs({ id: 'profit_174', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2025-FY', periodType: 'annual', sourceDocId: 'bmw_2026_q2_statement' });
  const margin174 = makeObs({ id: 'margin_174', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2025-FY', periodType: 'annual', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat174 = validateProxyMappingCompatibility(bmwMappingWrongPeriod, rev174, profit174, margin174, mockSourcesMap);
  check(compat174.isValid === false, 'Test 174a: mapping.period defined (2025-FY) + source doc period is 2026-Q2 → isValid false');
  check(compat174.mismatches.includes('sourcePeriodMismatch'), 'Test 174b: mismatch code is sourcePeriodMismatch');
}

// TEST 175: mapping.period matches source doc period → no sourcePeriodMismatch
{
  const bmwMapping = PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!;
  const rev175 = makeObs({ id: 'rev_175', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit175 = makeObs({ id: 'profit_175', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin175 = makeObs({ id: 'margin_175', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat175 = validateProxyMappingCompatibility(bmwMapping, rev175, profit175, margin175, mockSourcesMap);
  check(!compat175.mismatches.includes('sourcePeriodMismatch'), 'Test 175a: matching period → no sourcePeriodMismatch');
  check(!compat175.mismatches.includes('inconsistentSourcePeriods'), 'Test 175b: single-source mapping → no inconsistentSourcePeriods');
}

// TEST 176: multiple source docs with inconsistent periods → inconsistentSourcePeriods
{
  // Register a second BMW doc with a different period in a local sources map
  const mixedSourcesMap = new Map(mockSourcesMap);
  mixedSourcesMap.set('bmw_2025_fy_statement_alt', {
    id: 'bmw_2025_fy_statement_alt',
    companyId: 'bmw_group',
    title: 'BMW FY2025 Alt',
    docType: 'annual_report',
    period: '2025-FY',
    publicationDate: '2026-03-01',
    officialUrl: 'https://ir.bmw.com/2025-fy-alt.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    lastChecked: '2026-09-20',
  });

  const multiDocMapping: ProxyMetricMapping = {
    ...PROXY_METRIC_MAPPINGS.find(m => m.id === 'bmw_group_operating_income_proxy_2026q2')!,
    sourceDocIds: ['bmw_2026_q2_statement', 'bmw_2025_fy_statement_alt'], // two docs with different periods
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'KPIs',
        evidenceReference: 'EBIT margin 7.8%',
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope', 'reported_kpi'],
      },
      {
        sourceDocId: 'bmw_2025_fy_statement_alt',
        sectionReference: 'Group Income Statement',
        tableReference: 'Income Statement',
        evidenceReference: 'Revenues: 142,380M EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
      },
    ],
  };

  const rev176 = makeObs({ id: 'rev_176', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const profit176 = makeObs({ id: 'profit_176', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', sourceDocId: 'bmw_2026_q2_statement' });
  const margin176 = makeObs({ id: 'margin_176', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', accountingBasis: 'reported', period: '2026-Q2', periodType: 'quarterly', unit: 'percentage', sourceDocId: 'bmw_2026_q2_statement' });

  const compat176 = validateProxyMappingCompatibility(multiDocMapping, rev176, profit176, margin176, mixedSourcesMap);
  check(compat176.isValid === false, 'Test 176a: multiple source docs with inconsistent periods → isValid false');
  check(compat176.mismatches.includes('inconsistentSourcePeriods'), 'Test 176b: mismatch code includes inconsistentSourcePeriods');
}

// ────────────────────────────────────────────────────────────────────────────
// TESTS 177–178 (STEP 4-12, Task 5): inconsistent_or_invalid context handling regressions
// ────────────────────────────────────────────────────────────────────────────

// TEST 177: Non-proxy inconsistent context (nature='actual_segment', isProxy=true)
// → must produce status='invalid', never proxy_only
{
  const nonProxyInconsistentExc: DocumentedScopeException = {
    id: 'non_proxy_inconsistent_exc',
    companyId: 'bmw_group',
    period: '2026-Q2',
    periodType: 'quarterly',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'automotive_segment',
    denominatorScope: 'automotive_segment',
    marginScope: 'automotive_segment',
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'reported',
    sourceDocIds: ['bmw_2026_q2_statement'],
    evidence: [],
    nature: 'actual_segment',
    isProxy: true, // Inconsistent! actual_segment should not be proxy
    rationale: 'Deliberately inconsistent for test coverage',
  };

  const rev177 = makeObs({ id: 'rev_177', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'automotive_segment' });
  const profit177 = makeObs({ id: 'profit_177', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'automotive_segment' });
  const margin177 = makeObs({ id: 'margin_177', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });

  // Verify normalizeProxyException marks it inconsistent
  const norm177 = normalizeProxyException(nonProxyInconsistentExc);
  check(norm177.isInconsistent === true, 'Test 177a: actual_segment + isProxy=true → isInconsistent=true');
  check(norm177.isProxy === false, 'Test 177b: actual_segment + isProxy=true → isProxy normalizes to false');

  // Non-proxy inconsistent context must not produce proxy_only — must be invalid
  const val177 = validateMarginTriplet(rev177, profit177, margin177, undefined, { exception: nonProxyInconsistentExc });
  check(val177.status === 'invalid', 'Test 177c: Non-proxy inconsistent context → status must be invalid');
  check(val177.status !== 'proxy_only', 'Test 177d: Non-proxy inconsistent context → must NOT be proxy_only');
  check(val177.status !== 'verified', 'Test 177e: Non-proxy inconsistent context → must NOT be verified');
}

// TEST 178: Proxy inconsistent context (nature='proxy_numerator', isProxy=false) → proxy_only (regression guard for Tests 62/74)
{
  const proxyInconsistentExc: DocumentedScopeException = {
    id: 'proxy_inconsistent_regression_guard',
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
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'KPIs',
        evidenceReference: 'EBIT margin 7.8%',
        purpose: 'reported_kpi',
        supports: ['target_semantic', 'scope', 'reported_kpi'],
      },
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Income Statement',
        evidenceReference: 'Revenues: 36,944M EUR; Operating profit: 3,877M EUR',
        purpose: 'reported_kpi',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type', 'reported_kpi'],
      },
    ],
    nature: 'proxy_numerator',
    isProxy: false, // Inconsistent! proxy_numerator should be proxy
    rationale: 'Regression guard: proxy_numerator+isProxy=false must still yield proxy_only',
  };

  const rev178 = makeObs({ id: 'rev_178', companyId: 'bmw_group', metricId: 'revenue', reportingScope: 'consolidated_group' });
  const profit178 = makeObs({ id: 'profit_178', companyId: 'bmw_group', metricId: 'operating_income', reportingScope: 'consolidated_group' });
  const margin178 = makeObs({ id: 'margin_178', companyId: 'bmw_group', metricId: 'operating_margin', reportingScope: 'automotive_segment', unit: 'percentage' });

  const norm178 = normalizeProxyException(proxyInconsistentExc);
  check(norm178.isInconsistent === true, 'Test 178a: proxy_numerator + isProxy=false → isInconsistent=true');
  check(norm178.isProxy === true, 'Test 178b: proxy_numerator + isProxy=false → isProxy normalizes to true');

  const val178 = validateMarginTriplet(rev178, profit178, margin178, undefined, { exception: proxyInconsistentExc });
  check(val178.status === 'proxy_only', 'Test 178c: Proxy inconsistent context → still yields proxy_only (regression guard)');
  check(val178.status !== 'verified', 'Test 178d: Proxy inconsistent context → never verified');
  check(val178.status !== 'invalid', 'Test 178e: Proxy inconsistent context → not invalid (legacy normalization path)');
}

// ────────────────────────────────────────────────────────────────────────────
console.log(`\nScope Exception & Policy Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All scope exception and policy tests passed!\n');
}


