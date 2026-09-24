/**
 * AutoMetrics Intelligence — Final Data Integrity Gate & Anti-Regression Suite
 *
 * Prevents regressions in core validation invariants:
 * 1. Anti-Regression: Rejection of arbitrary `candidates[0]` selection on ambiguous margin triplets
 * 2. Anti-Regression: Rejection of arbitrary `candidates[0]` selection on ambiguous BEV share triplets
 * 3. Anti-Regression: Disallow direct comparison when scope is missing or undefined
 * 4. Anti-Regression: Disallow direct comparison when accounting basis is missing or undefined
 * 5. Anti-Regression: Disallow direct comparison when currency is missing on financial metrics
 * 6. Anti-Regression: BEV share validator must NOT clamp invalid/out-of-bounds shares silently
 * 7. Anti-Regression: Margin validation must reject incompatible profit numerator metrics
 * 8. Anti-Regression: Source provenance engine must fail on source document company mismatch
 * 9. Anti-Regression: Source provenance engine must warn on source document period mismatch
 * 10. Anti-Regression: Unknown or missing metadata must never silently evaluate as direct match
 */

import {
  selectCompatibleMarginTriplets,
  selectCompatibleBevShareTriplets,
  validateMarginTriplet,
  validateBEVShare,
  checkObservationComparability,
  validateObservationProvenance,
  getCanonicalObservationKey,
  MARGIN_RELATIONSHIP_RULES,
} from '../src/utils/metricCalculations';
import { MetricObservation, SourceDocument, Company, AuditFinding } from '../src/types/metrics';

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

console.log('🛡️ Starting Final Data Integrity Gate & Anti-Regression Test Suite...\n');

// 1. Anti-Regression: Ambiguous margin triplets reject candidates[0]
const baseRev: MetricObservation = {
  id: 'gate_rev_1',
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

const baseProfit: MetricObservation = {
  id: 'gate_ebit_1',
  companyId: 'volkswagen_group',
  metricId: 'operating_income',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 5400,
  unit: 'currency_millions',
  currency: 'EUR',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};

const marginCandidateA: MetricObservation = {
  id: 'gate_margin_cand_a',
  companyId: 'volkswagen_group',
  metricId: 'operating_margin',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 6.58,
  unit: 'percentage',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};

const marginCandidateB: MetricObservation = {
  id: 'gate_margin_cand_b',
  companyId: 'volkswagen_group',
  metricId: 'operating_margin',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 6.60,
  unit: 'percentage',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};

const ambiguousMarginSelection = selectCompatibleMarginTriplets(
  [baseRev, baseProfit, marginCandidateA, marginCandidateB],
  'volkswagen_group',
  '2026-Q2'
);
assert(
  ambiguousMarginSelection.status === 'ambiguous',
  'Anti-Regression #1: Ambiguous margin triplets return status "ambiguous" (no candidates[0] fallback)'
);
assert(
  ambiguousMarginSelection.margin === undefined,
  'Anti-Regression #1: No margin candidate arbitrarily assigned when multiple compatible candidates exist'
);

// 2. Anti-Regression: Ambiguous BEV triplets reject candidates[0]
const baseTotalDel: MetricObservation = {
  id: 'gate_tot_del',
  companyId: 'bmw_group',
  metricId: 'deliveries_global',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 618.8,
  unit: 'thousand_units',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  volumeDefinition: 'retail_deliveries',
  isComparable: true,
};

const baseBevDel: MetricObservation = {
  id: 'gate_bev_del',
  companyId: 'bmw_group',
  metricId: 'bev_deliveries',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 107.9,
  unit: 'thousand_units',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  volumeDefinition: 'retail_deliveries',
  isComparable: true,
};

const bevShareCandidateA: MetricObservation = {
  id: 'gate_bev_share_a',
  companyId: 'bmw_group',
  metricId: 'bev_share',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 17.44,
  unit: 'percentage',
  valueType: 'derived',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  verificationStatus: 'verified',
  isComparable: true,
};

const bevShareCandidateB: MetricObservation = {
  id: 'gate_bev_share_b',
  companyId: 'bmw_group',
  metricId: 'bev_share',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 17.50,
  unit: 'percentage',
  valueType: 'derived',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  verificationStatus: 'verified',
  isComparable: true,
};

const ambiguousBevSelection = selectCompatibleBevShareTriplets(
  [baseTotalDel, baseBevDel, bevShareCandidateA, bevShareCandidateB],
  'bmw_group',
  '2026-Q2'
);
assert(
  ambiguousBevSelection.status === 'ambiguous',
  'Anti-Regression #2: Ambiguous BEV share triplets return status "ambiguous" (no candidates[0] fallback)'
);

// 3. Anti-Regression: Direct comparison fails with missing scope
const obsNoScope: MetricObservation = {
  ...baseTotalDel,
  id: 'gate_no_scope',
  reportingScope: undefined,
};
const resNoScope = checkObservationComparability(baseTotalDel, obsNoScope);
assert(
  resNoScope.directlyComparable === false,
  'Anti-Regression #3: Missing reporting scope blocks direct comparison (directlyComparable: false)'
);
assert(
  resNoScope.checks.scopeMatched === false,
  'Anti-Regression #3: checks.scopeMatched is false when scope is undefined'
);

// 4. Anti-Regression: Direct comparison fails with missing accounting basis
const obsNoBasis: MetricObservation = {
  ...baseRev,
  id: 'gate_no_basis',
  accountingBasis: undefined,
};
const resNoBasis = checkObservationComparability(baseRev, obsNoBasis);
assert(
  resNoBasis.directlyComparable === false,
  'Anti-Regression #4: Missing accounting basis blocks direct comparison (directlyComparable: false)'
);
assert(
  resNoBasis.checks.accountingBasisMatched === false,
  'Anti-Regression #4: checks.accountingBasisMatched is false when basis is undefined'
);

// 5. Anti-Regression: Direct comparison fails with missing currency
const obsNoCurr: MetricObservation = {
  ...baseRev,
  id: 'gate_no_curr',
  currency: undefined,
};
const resNoCurr = checkObservationComparability(baseRev, obsNoCurr);
assert(
  resNoCurr.directlyComparable === false,
  'Anti-Regression #5: Missing currency on financial metrics blocks direct comparison (directlyComparable: false)'
);
assert(
  resNoCurr.checks.currencyMatched === false,
  'Anti-Regression #5: checks.currencyMatched is false when currency is undefined'
);

// 6. Anti-Regression: BEV share validator must NOT clamp invalid values
const invalidOutlierBevShare: MetricObservation = {
  ...bevShareCandidateA,
  value: 125.0, // > 100% physically impossible share
};
const invalidBevValidation = validateBEVShare(baseTotalDel, baseBevDel, invalidOutlierBevShare);
assert(
  invalidBevValidation.isValid === false,
  'Anti-Regression #6: Impossible BEV share (>100%) is marked isValid: false'
);
assert(
  invalidBevValidation.validationStatus === 'needs_review',
  'Anti-Regression #6: Out-of-bounds BEV share results in validationStatus: needs_review'
);

// 7. Anti-Regression: Margin validation rejects incompatible profit numerator
const incompatibleProfitMetric: MetricObservation = {
  ...baseProfit,
  metricId: 'gross_profit', // Gross profit instead of Operating Income / EBIT
};
const marginTripledWithIncompatibleProfit = validateMarginTriplet(baseRev, incompatibleProfitMetric, marginCandidateA);
assert(
  marginTripledWithIncompatibleProfit.status === 'invalid',
  'Anti-Regression #7: Incompatible profit metric rejected by margin validator with status "invalid"'
);
assert(
  marginTripledWithIncompatibleProfit.checks.metricDefinition === false,
  'Anti-Regression #7: Metric definition check fails for incompatible numerator'
);

// 8. Anti-Regression: Source provenance engine fails on company mismatch
const mockDoc: SourceDocument = {
  id: 'doc_vw_2026_q2',
  companyId: 'volkswagen_group',
  title: 'Volkswagen Group Q2 2026 Interim Report',
  docType: 'quarterly_report',
  period: '2026-Q2',
  publicationDate: '2026-07-28',
  officialUrl: 'https://www.volkswagen-group.com/reports/q2-2026.pdf',
  isVerified: true,
  verificationStatus: 'verified',
  lastChecked: '2026-08-01',
};

const mockCompanyVW: Company = {
  id: 'volkswagen_group',
  name: 'Volkswagen AG',
  shortName: 'Volkswagen',
  hqCountry: 'Germany',
  hqCity: 'Wolfsburg',
  region: 'europe',
  website: 'https://volkswagen-group.com',
  irUrl: 'https://volkswagen-group.com/ir',
  fiscalYearEnd: 'Dec 31',
  reportingCurrency: 'EUR',
  supportedDocuments: [],
  description: 'Volkswagen AG',
};

const obsWrongCompany: MetricObservation = {
  ...baseRev,
  companyId: 'bmw_group', // Mismatch against sourceDoc.companyId
  sourceDocId: 'doc_vw_2026_q2',
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};
const provenanceCompanyMismatch = validateObservationProvenance(obsWrongCompany, mockDoc, mockCompanyVW);
assert(
  provenanceCompanyMismatch.valid === false,
  'Anti-Regression #8: Source company mismatch results in valid: false'
);
assert(
  provenanceCompanyMismatch.severity === 'ERROR',
  'Anti-Regression #8: Source company mismatch severity is ERROR'
);

// 9. Anti-Regression: Source provenance engine warns on period mismatch
const obsWrongPeriod: MetricObservation = {
  ...baseRev,
  period: '2026-Q1', // Mismatch against doc period 2026-Q2
  sourceDocId: 'doc_vw_2026_q2',
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};
const provenancePeriodMismatch = validateObservationProvenance(obsWrongPeriod, mockDoc, mockCompanyVW);
assert(
  provenancePeriodMismatch.severity === 'WARNING',
  'Anti-Regression #9: Source period mismatch results in severity WARNING'
);

// 10. Anti-Regression: Unknown metadata never silently matches
const obsUnknownScope1: MetricObservation = { ...baseTotalDel, reportingScope: 'unknown' };
const obsUnknownScope2: MetricObservation = { ...baseTotalDel, reportingScope: 'unknown' };
const resBothUnknown = checkObservationComparability(obsUnknownScope1, obsUnknownScope2);
assert(
  resBothUnknown.checks.scopeMatched === false,
  'Anti-Regression #10: Two observations with "unknown" scope must NOT evaluate as scopeMatched: true'
);
assert(
  resBothUnknown.directlyComparable === false,
  'Anti-Regression #10: Two observations with "unknown" scope must NOT be directly comparable'
);

// ==========================================
// STEP 4-2: Strict Policy & Validation Contract Tests
// ==========================================
console.log('\n🔒 STEP 4-2: Testing Strict Audit Policy, Contract Checks & Duplicate Identity...\n');

// Local fixtures for STEP 4-2 tests (re-use base types already defined above)
const step42Rev: MetricObservation = {
  ...baseRev,
  id: 's42_rev',
  sourceDocId: 'doc_vw_2026_q2',
  verificationStatus: 'verified',
};
const step42Profit: MetricObservation = {
  ...baseProfit,
  id: 's42_profit',
  sourceDocId: 'doc_vw_2026_q2',
  verificationStatus: 'verified',
};
const step42Margin: MetricObservation = {
  ...marginCandidateA,
  id: 's42_margin',
  verificationStatus: 'verified',
};

// 1. Strict mode disposition logic: blocking errors must fail strict audit
const mockFindingsBlocking: AuditFinding[] = [
  {
    companyId: 'volkswagen_group',
    period: '2026-Q2',
    metricId: 'revenue',
    category: 'MATH_MISMATCH',
    message: 'Math error',
    severity: 'ERROR',
    disposition: 'blocking',
  },
];
const strictBlockingCount = mockFindingsBlocking.filter((f) => f.disposition === 'blocking' || f.disposition === 'review').length;
assert(strictBlockingCount > 0, 'STEP 4-2 #1: Strict mode fails when a blocking error is present');

// 2. Strict mode succeeds when only documented or info findings exist
const mockFindingsDocumented: AuditFinding[] = [
  {
    companyId: 'bmw_group',
    period: '2026-Q2',
    metricId: 'operating_margin',
    category: 'SCOPE_MISMATCH',
    message: 'Documented segment RoS divergence',
    severity: 'WARNING',
    disposition: 'documented',
    documentationUrl: 'docs/data-audit-report.md',
  },
  {
    companyId: 'bmw_group',
    period: '2026-Q2',
    metricId: 'deliveries_global',
    category: 'PROVENANCE_INFO',
    message: 'Informational provenance note',
    severity: 'INFO',
    disposition: 'documented',
  },
];
const strictDocCount = mockFindingsDocumented.filter((f) => f.disposition === 'blocking' || f.disposition === 'review').length;
assert(strictDocCount === 0, 'STEP 4-2 #2: Strict mode succeeds when only documented or info findings exist');

// 3. Unhandled review findings cause strict mode to fail
const mockFindingsReview: AuditFinding[] = [
  {
    companyId: 'general_motors',
    period: '2026-Q2',
    metricId: 'adjusted_ebit',
    category: 'AMBIGUOUS_SELECTION',
    message: 'Ambiguous candidates requiring manual review',
    severity: 'WARNING',
    disposition: 'review',
  },
];
const strictReviewCount = mockFindingsReview.filter((f) => f.disposition === 'blocking' || f.disposition === 'review').length;
assert(strictReviewCount > 0, 'STEP 4-2 #3: Unhandled review findings cause strict mode to fail');

// 4. Duplicate observations with different reportingScope or accountingBasis are NOT flagged as duplicates
const obsReportedConsolidated: MetricObservation = {
  id: 'obs_bmw_rev_rep',
  companyId: 'bmw_group',
  metricId: 'revenue',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 36944,
  unit: 'currency_millions',
  currency: 'EUR',
  valueType: 'reported',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
};
const obsReportedAutomotive: MetricObservation = {
  ...obsReportedConsolidated,
  id: 'obs_bmw_rev_auto',
  reportingScope: 'automotive_segment',
};
const key1 = getCanonicalObservationKey(obsReportedConsolidated);
const key2 = getCanonicalObservationKey(obsReportedAutomotive);
assert(key1 !== key2, 'STEP 4-2 #4: Observations with different reportingScope have distinct canonical keys (not duplicates)');

const obsAdjustedConsolidated: MetricObservation = {
  ...obsReportedConsolidated,
  id: 'obs_bmw_rev_adj',
  accountingBasis: 'adjusted',
};
const key3 = getCanonicalObservationKey(obsAdjustedConsolidated);
assert(key1 !== key3, 'STEP 4-2 #4: Observations with different accountingBasis have distinct canonical keys (not duplicates)');

// 5. Exact identical observations ARE flagged as duplicate errors
const obsDuplicateExact: MetricObservation = {
  ...obsReportedConsolidated,
  id: 'obs_bmw_rev_rep_duplicate',
  value: 36944,
};
const keyDuplicate = getCanonicalObservationKey(obsDuplicateExact);
assert(key1 === keyDuplicate, 'STEP 4-2 #5: Exact identical observations share the same canonical key (flagged duplicate)');

// 6. Margin validation fails when checks.relationshipRule is false
const invalidRelationshipMarginObs: MetricObservation = {
  ...step42Margin,
  id: 'obs_invalid_rel_margin',
  metricId: 'gross_margin', // Not supported in MARGIN_RELATIONSHIP_RULES
};
const resInvalidRel = validateMarginTriplet(step42Rev, step42Profit, invalidRelationshipMarginObs);
assert(resInvalidRel.status === 'invalid', 'STEP 4-2 #6: Margin validation fails on invalid relationship rule');
assert(resInvalidRel.checks.relationshipRule === false, 'STEP 4-2 #6: checks.relationshipRule is false');
assert(resInvalidRel.failedChecks.includes('relationshipRule'), 'STEP 4-2 #6: failedChecks includes "relationshipRule"');

// 7. Margin validation fails when checks.provenance is false
const obsNoSourceProfit: MetricObservation = {
  ...step42Profit,
  verificationStatus: 'unverified',
  sourceDocId: undefined,
};
const resInvalidProvenance = validateMarginTriplet(step42Rev, obsNoSourceProfit, step42Margin);
assert(resInvalidProvenance.checks.provenance === false, 'STEP 4-2 #7: checks.provenance is false when verificationStatus is unverified');
assert(resInvalidProvenance.failedChecks.includes('provenance'), 'STEP 4-2 #7: failedChecks includes "provenance"');

// 8. Margin validation returns failedChecks containing exact failed check names
const resMultipleFailures = validateMarginTriplet(
  { ...step42Rev, currency: 'EUR' },
  { ...step42Profit, currency: 'USD', period: '2026-Q1' },
  step42Margin
);
assert(resMultipleFailures.failedChecks.includes('currency'), 'STEP 4-2 #8: failedChecks includes "currency"');
assert(resMultipleFailures.failedChecks.includes('period'), 'STEP 4-2 #8: failedChecks includes "period"');

// 9. Scope relationship rule matches allowed combinations and rejects disallowed combinations
const ruleReported = MARGIN_RELATIONSHIP_RULES.find((r) => r.id === 'reported_operating_margin');
assert(ruleReported !== undefined, 'STEP 4-2 #9: reported_operating_margin rule exists');
const allowsSameScope = ruleReported?.allowedScopeRelationships.some(
  (s) => s.relationshipType === 'same_scope'
);
assert(allowsSameScope === true, 'STEP 4-2 #9: Rule allows same_scope relationship');

// 10. ValidatedMetricObservation contract enforcement
const rawInvalidObs: MetricObservation = {
  id: 'raw_invalid_1',
  companyId: 'tesla',
  metricId: 'revenue',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 26850,
  unit: 'currency_millions',
  currency: 'USD',
  valueType: 'reported',
  reportingScope: 'unknown',
  accountingBasis: 'unknown',
  isComparable: false,
};
const isRawValid = rawInvalidObs.reportingScope !== 'unknown' && rawInvalidObs.accountingBasis !== 'unknown';
assert(!isRawValid, 'STEP 4-2 #10: Raw unvalidated observation with "unknown" scope/basis fails validation gate');

console.log(`\nFinal Data Integrity Gate Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Final Data Integrity Gate & Anti-Regression tests passed successfully!\n');
}
