/**
 * AutoMetrics Intelligence — Evidence Verification Regression Gate Test Suite (STEP 4-24)
 *
 * Dedicated regression gate permanently protecting evidence/provenance invariants:
 * SourceDocument → SourceClaim → Evidence Fixture → SHA-256 integrity → metric
 * → numeric value → unit → scope → accounting basis → period → period type
 * → support type → claim_verified
 */

import {
  hashFixtureContent,
  validateSourceContentFixtures,
} from '../src/utils/metricCalculations';
import {
  verifyClaimEvidence,
  validateClaimVerificationResult,
  resolveClaimVerificationState,
  SourceDocumentContentSnippet,
} from '../src/data/scopeExceptions';
import { METRIC_DEFINITIONS } from '../src/data/metricDefinitions';
import {
  SourceDocument,
  ClaimEvidenceLocator,
  ClaimVerifiedResult,
  ScopeExceptionEvidence,
} from '../src/types/metrics';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

console.log('🧪 Starting Evidence Verification Regression Gate Test Suite (STEP 4-24)...\n');

// ────────────────────────────────────────────────────────────────────────────
// Baseline Test Fixtures
// ────────────────────────────────────────────────────────────────────────────

const baselineDoc: SourceDocument = {
  id: 'test_baseline_doc_2026q2',
  companyId: 'bmw_group',
  title: 'BMW Group Baseline Test Report Q2 2026',
  docType: 'quarterly_report',
  period: '2026-Q2',
  periodType: 'quarterly',
  publicationDate: '2026-08-01',
  officialUrl: 'https://example.com/test_baseline',
  isVerified: true,
  verificationStatus: 'verified',
  lastChecked: '2026-09-27',
};

const baselineExtractedText = 'Automotive Segment EBIT: €629 million with Automotive EBIT margin of 2.3%';
const baselineContentHash = hashFixtureContent(baselineExtractedText);

const baselineFixture: SourceDocumentContentSnippet = {
  sourceDocId: 'test_baseline_doc_2026q2',
  sectionLocator: 'Financial Results / Automotive Segment',
  extractedText: baselineExtractedText,
  contentHash: baselineContentHash,
  verifiedValue: '2.3',
  verifiedMetricId: 'operating_margin',
  verifiedNumericValue: 2.3,
  verifiedUnit: 'percentage',
  verifiedScope: 'automotive_segment',
  verifiedAccountingBasis: 'reported',
  verifiedPeriod: '2026-Q2',
  verifiedPeriodType: 'quarterly',
  supportType: 'reported_kpi',
};

const baselineClaim: ClaimEvidenceLocator = {
  sourceDocId: 'test_baseline_doc_2026q2',
  sectionReference: 'Financial Results',
  tableReference: 'Automotive Segment',
  originalLabel: 'Automotive EBIT margin',
  claimedMetricId: 'operating_margin',
  claimedNumericValue: 2.3,
  claimedUnit: 'percentage',
  claimedScope: 'automotive_segment',
  claimedAccountingBasis: 'reported',
  claimedPeriod: '2026-Q2',
  claimedPeriodType: 'quarterly',
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Valid Fixture Baseline (P0-2)
// ────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Valid Fixture Baseline ---');

{
  const fixtureVal = validateSourceContentFixtures([baselineFixture], [baselineDoc], METRIC_DEFINITIONS);
  assert(fixtureVal.valid === true, 'Baseline fixture passes validateSourceContentFixtures', JSON.stringify(fixtureVal.errors));
  assert(fixtureVal.errors.length === 0, 'Baseline fixture has zero validation errors');

  const claimRes = verifyClaimEvidence(baselineClaim, baselineDoc, '2.3', 'reported_kpi', {
    contentFixtures: [baselineFixture],
  });
  assert(claimRes.state === 'claim_verified', 'Baseline claim resolves to claim_verified');
  assert(claimRes.verificationOrigin === 'repository_fixture', 'Baseline claim verificationOrigin is repository_fixture');
  assert(claimRes.sourceContentHash === baselineContentHash, 'Baseline claim contains correct SHA-256 sourceContentHash');
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Cryptographic Integrity Regression Tests (P0-3)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Cryptographic Integrity Regression Tests ---');

{
  // Test A: Correct hash validation
  const testA_hash = hashFixtureContent(baselineExtractedText);
  assert(testA_hash === baselineContentHash, 'Test A: Canonical hashFixtureContent produces identical digest');
  const testA_val = validateSourceContentFixtures(
    [{ ...baselineFixture, contentHash: testA_hash }],
    [baselineDoc],
    METRIC_DEFINITIONS
  );
  assert(testA_val.valid === true, 'Test A: Fixture with correct SHA-256 hash is valid');

  // Test B: One-character tampering
  const tamperedText = baselineExtractedText + '.';
  const testB_val = validateSourceContentFixtures(
    [{ ...baselineFixture, extractedText: tamperedText, contentHash: baselineContentHash }],
    [baselineDoc],
    METRIC_DEFINITIONS
  );
  assert(testB_val.valid === false, 'Test B: Rejects one-character tampered fixture content');
  assert(
    testB_val.errors.some((e) => e.code === 'fixtureContentHashMismatch'),
    'Test B: Emits fixtureContentHashMismatch error on tampered text'
  );

  // Test C: Invalid hash formats
  const invalidHashes = [
    { label: 'short text "abc"', hash: 'abc' },
    { label: 'prefix placeholder "sha256-invalid"', hash: 'sha256-invalid' },
    { label: '63 hex chars (too short)', hash: 'a'.repeat(63) },
    { label: '65 hex chars (too long)', hash: 'a'.repeat(65) },
    { label: '64 non-hex characters', hash: 'g'.repeat(64) },
    { label: 'uppercase hex', hash: baselineContentHash.toUpperCase() },
  ];

  for (const { label, hash } of invalidHashes) {
    const res = validateSourceContentFixtures(
      [{ ...baselineFixture, contentHash: hash }],
      [baselineDoc],
      METRIC_DEFINITIONS
    );
    assert(res.valid === false, `Test C: Rejects invalid hash format (${label})`);
    assert(
      res.errors.some((e) => e.code === 'fixtureInvalidContentHash'),
      `Test C: Emits fixtureInvalidContentHash for (${label})`
    );
  }

  // Test D: Recomputed hash after modifying text
  const modifiedText = 'Automotive Segment EBIT: €700 million with Automotive EBIT margin of 2.5%';
  const recomputedHash = hashFixtureContent(modifiedText);
  const testD_val = validateSourceContentFixtures(
    [{ ...baselineFixture, extractedText: modifiedText, contentHash: recomputedHash }],
    [baselineDoc],
    METRIC_DEFINITIONS
  );
  assert(testD_val.valid === true, 'Test D: Recomputed hash succeeds when modified text matches new hash');
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Numeric Verification Regression Tests (P0-4)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Numeric Verification Regression Tests ---');

{
  const integerFixtureText = 'Automotive Segment EBIT result was €629 million';
  const integerFixture: SourceDocumentContentSnippet = {
    sourceDocId: baselineDoc.id,
    sectionLocator: 'Operating Results',
    extractedText: integerFixtureText,
    contentHash: hashFixtureContent(integerFixtureText),
    verifiedValue: '629',
    verifiedMetricId: 'operating_income',
    verifiedNumericValue: 629,
    verifiedUnit: 'currency_millions',
    verifiedScope: 'automotive_segment',
    verifiedAccountingBasis: 'reported',
    verifiedPeriod: '2026-Q2',
    verifiedPeriodType: 'quarterly',
    supportType: 'reported_kpi',
  };

  // Exact integer match (629 vs 629)
  const exactRes = verifyClaimEvidence(
    {
      sourceDocId: baselineDoc.id,
      claimedMetricId: 'operating_income',
      claimedNumericValue: 629,
      claimedUnit: 'currency_millions',
      claimedScope: 'automotive_segment',
      claimedAccountingBasis: 'reported',
      claimedPeriod: '2026-Q2',
    },
    baselineDoc,
    '629',
    'reported_kpi',
    { contentFixtures: [integerFixture] }
  );
  assert(exactRes.state === 'claim_verified', 'Verifies exact numeric match (629 vs 629)');

  // Numeric mismatch (630 vs 629)
  const mismatchRes = verifyClaimEvidence(
    {
      sourceDocId: baselineDoc.id,
      claimedMetricId: 'operating_income',
      claimedNumericValue: 630,
      claimedUnit: 'currency_millions',
      claimedScope: 'automotive_segment',
      claimedAccountingBasis: 'reported',
      claimedPeriod: '2026-Q2',
    },
    baselineDoc,
    '630',
    'reported_kpi',
    { contentFixtures: [integerFixture] }
  );
  assert(mismatchRes.state === 'source_verified', 'Rejects numeric mismatch (630 vs 629)');
  assert(mismatchRes.diagnostics?.failureReason === 'numericValueMismatch', 'Emits numericValueMismatch for 630 vs 629');

  // Percentage match (2.3% vs 2.3%)
  const pctMatchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(pctMatchRes.state === 'claim_verified', 'Verifies exact percentage match (2.3% vs 2.3%)');

  // Percentage mismatch (2.4% vs 2.3%)
  const pctMismatchRes = verifyClaimEvidence(
    { ...baselineClaim, claimedNumericValue: 2.4 },
    baselineDoc,
    '2.4',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(pctMismatchRes.state === 'source_verified', 'Rejects percentage mismatch (2.4% vs 2.3%)');
  assert(pctMismatchRes.diagnostics?.failureReason === 'numericValueMismatch', 'Emits numericValueMismatch for 2.4% vs 2.3%');
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Metric Semantic Binding (P0-5)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Metric Semantic Binding ---');

{
  // Matching metric
  const matchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(matchRes.state === 'claim_verified', 'Verifies matching metric (operating_margin vs operating_margin)');

  // Wrong metric with identical numeric value
  const wrongMetricRes = verifyClaimEvidence(
    { ...baselineClaim, claimedMetricId: 'revenue' },
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(wrongMetricRes.state === 'source_verified', 'Rejects wrong metric despite equal numeric value (revenue vs operating_margin)');
  assert(wrongMetricRes.diagnostics?.failureReason === 'metricMismatch', 'Emits metricMismatch diagnostic');
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Unit Binding (P0-6)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Unit Binding ---');

{
  // Matching unit
  const matchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(matchRes.state === 'claim_verified', 'Verifies matching unit (percentage vs percentage)');

  // Wrong unit with identical number
  const wrongUnitRes = verifyClaimEvidence(
    { ...baselineClaim, claimedUnit: 'currency_millions' },
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(wrongUnitRes.state === 'source_verified', 'Rejects wrong unit despite equal number (currency_millions vs percentage)');
  assert(wrongUnitRes.diagnostics?.failureReason === 'unitMismatch', 'Emits unitMismatch diagnostic');
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Scope Binding (P0-7)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Scope Binding ---');

{
  // Matching scope
  const matchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(matchRes.state === 'claim_verified', 'Verifies matching scope (automotive_segment vs automotive_segment)');

  // Wrong scope
  const wrongScopeRes = verifyClaimEvidence(
    { ...baselineClaim, claimedScope: 'consolidated_group' },
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(wrongScopeRes.state === 'source_verified', 'Rejects consolidated_group scope against segment fixture');
  assert(wrongScopeRes.diagnostics?.failureReason === 'scopeMismatch', 'Emits scopeMismatch diagnostic');
}

// ────────────────────────────────────────────────────────────────────────────
// 7. Accounting Basis Binding (P0-8)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 7. Accounting Basis Binding ---');

{
  // Matching accounting basis
  const matchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(matchRes.state === 'claim_verified', 'Verifies matching accounting basis (reported vs reported)');

  // Wrong accounting basis
  const wrongAcctRes = verifyClaimEvidence(
    { ...baselineClaim, claimedAccountingBasis: 'adjusted' },
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(wrongAcctRes.state === 'source_verified', 'Rejects adjusted accounting basis against reported fixture');
  assert(wrongAcctRes.diagnostics?.failureReason === 'accountingBasisMismatch', 'Emits accountingBasisMismatch diagnostic');
}

// ────────────────────────────────────────────────────────────────────────────
// 8. Period Binding (P0-9)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 8. Period Binding ---');

{
  // Matching period
  const matchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(matchRes.state === 'claim_verified', 'Verifies matching period (2026-Q2 vs 2026-Q2)');

  // Wrong period
  const wrongPeriodRes = verifyClaimEvidence(
    { ...baselineClaim, claimedPeriod: '2026-Q1' },
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(wrongPeriodRes.state === 'source_verified', 'Rejects wrong period (2026-Q1 vs 2026-Q2)');
  assert(wrongPeriodRes.diagnostics?.failureReason === 'periodMismatch', 'Emits periodMismatch diagnostic');
}

// ────────────────────────────────────────────────────────────────────────────
// 9. Period Type Binding (P0-10)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 9. Period Type Binding ---');

{
  // Matching period type
  const matchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(matchRes.state === 'claim_verified', 'Verifies matching period type (quarterly vs quarterly)');

  // Wrong period type
  const wrongPeriodTypeRes = verifyClaimEvidence(
    { ...baselineClaim, claimedPeriodType: 'annual' },
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(wrongPeriodTypeRes.state === 'source_verified', 'Rejects annual periodType against quarterly fixture');
  assert(wrongPeriodTypeRes.diagnostics?.failureReason === 'periodTypeMismatch', 'Emits periodTypeMismatch diagnostic');
}

// ────────────────────────────────────────────────────────────────────────────
// 10. Support Type Binding (P0-11)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 10. Support Type Binding ---');

{
  // Matching support type
  const matchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(matchRes.state === 'claim_verified', 'Verifies matching supportType (reported_kpi vs reported_kpi)');

  // Wrong support type
  const wrongSupportRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'scope', // incompatible with reported_kpi
    { contentFixtures: [baselineFixture] }
  );
  assert(wrongSupportRes.state === 'source_verified', 'Rejects incompatible supportType (scope vs reported_kpi)');
  assert(wrongSupportRes.diagnostics?.failureReason === 'supportTypeMismatch', 'Emits supportTypeMismatch diagnostic');

  // Intentional compatibility: numeric_margin_value matches reported_kpi
  const marginMatchRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'numeric_margin_value',
    { contentFixtures: [baselineFixture] }
  );
  assert(marginMatchRes.state === 'claim_verified', 'Preserves intentional compatibility: numeric_margin_value matches reported_kpi');
}

// ────────────────────────────────────────────────────────────────────────────
// 11. Semantic-Only Fixture Protection (P0-12)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 11. Semantic-Only Fixture Protection ---');

{
  const semanticOnlyFixture: SourceDocumentContentSnippet = {
    sourceDocId: baselineDoc.id,
    sectionLocator: 'Operating Margin Discussion',
    extractedText: 'Discussion of automotive operating margin dynamics',
    contentHash: hashFixtureContent('Discussion of automotive operating margin dynamics'),
    verifiedValue: 'operating_margin',
    verifiedMetricId: 'operating_margin',
    verifiedUnit: 'percentage',
    verifiedScope: 'automotive_segment',
    verifiedAccountingBasis: 'reported',
    verifiedPeriod: '2026-Q2',
    verifiedPeriodType: 'quarterly',
    supportType: 'reported_kpi',
    // Deliberately NO verifiedNumericValue
  };

  const semanticRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [semanticOnlyFixture] }
  );
  assert(semanticRes.state === 'source_verified', 'Rejects semantic-only fixture for numeric claim');
  assert(semanticRes.diagnostics?.failureReason === 'numericValueMissing', 'Emits numericValueMissing diagnostic');
}

// ────────────────────────────────────────────────────────────────────────────
// 12. Locator Contradiction Protection (P0-13)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 12. Locator Contradiction Protection ---');

{
  // Fixture text says 2.3%, but claim locator says 2.4%
  const contradictoryClaim: ClaimEvidenceLocator = {
    ...baselineClaim,
    claimedNumericValue: 2.4,
    locator: 'Financial Results / Automotive Segment / Automotive EBIT margin 2.4%',
  };

  const contradictionRes = verifyClaimEvidence(
    contradictoryClaim,
    baselineDoc,
    '2.4',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(contradictionRes.state === 'source_verified', 'Rejects claim when locator contradicts fixture extracted text');
  assert(
    contradictionRes.diagnostics?.failureReason === 'locatorNumericContradiction' ||
    contradictionRes.diagnostics?.failureReason === 'numericValueMismatch',
    'Emits locator numeric contradiction / value mismatch diagnostic'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 13. Source Document Binding (P0-14)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 13. Source Document Binding ---');

{
  const wrongDoc: SourceDocument = {
    ...baselineDoc,
    id: 'mbg_2026_q2_results',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Q2 2026 Results',
  };

  // Claim requests baselineDoc, but source doc is mbg
  const wrongDocRes = verifyClaimEvidence(
    baselineClaim,
    wrongDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );
  assert(wrongDocRes.state === 'source_verified', 'Rejects claim when source document does not match claim sourceDocId');
  assert(wrongDocRes.diagnostics?.failureReason === 'sourceDocMismatch', 'Emits sourceDocMismatch diagnostic');

  // Fixture belongs to another doc
  const foreignFixture: SourceDocumentContentSnippet = {
    ...baselineFixture,
    sourceDocId: 'mbg_2026_q2_results',
    contentHash: hashFixtureContent(baselineExtractedText),
  };
  const foreignFixtureRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [foreignFixture] }
  );
  assert(foreignFixtureRes.state === 'source_verified', 'Rejects fixture belonging to different sourceDocId');
}

// ────────────────────────────────────────────────────────────────────────────
// 14. Verification Result Validation & Anti-Forgery (P0-15)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 14. Verification Result Validation & Anti-Forgery ---');

{
  const validResult: ClaimVerifiedResult = {
    state: 'claim_verified',
    verificationMethod: 'rule_engine',
    verificationOrigin: 'repository_fixture',
    engineId: 'deterministic_content_verifier',
    engineVersion: '1.0.0',
    sourceDocId: baselineDoc.id,
    claimSupportType: 'reported_kpi',
    verifiedValue: '2.3',
    verifiedMetricId: 'operating_margin',
    verifiedNumericValue: 2.3,
    verifiedUnit: 'percentage',
    verifiedScope: 'automotive_segment',
    verifiedAccountingBasis: 'reported',
    verifiedPeriod: '2026-Q2',
    verifiedPeriodType: 'quarterly',
    sourceContentHash: baselineContentHash,
    verifiedAt: new Date().toISOString(),
  };

  const vBase = validateClaimVerificationResult(baselineClaim, baselineDoc, '2.3', validResult);
  assert(vBase.valid === true, 'Authentic ClaimVerificationResult is valid', JSON.stringify(vBase.mismatches));

  // Corruption tests
  const corruptions: Array<{ label: string; corrupt: Partial<ClaimVerifiedResult>; expectedMismatch: string; options?: any }> = [
    { label: 'wrong sourceDocId', corrupt: { sourceDocId: 'forged_doc' }, expectedMismatch: 'verificationSourceDocMismatch' },
    { label: 'wrong claimSupportType', corrupt: { claimSupportType: 'scope' }, expectedMismatch: 'verificationSupportTypeMismatch' },
    { label: 'missing verifiedValue', corrupt: { verifiedValue: '' }, expectedMismatch: 'verificationValueMissing' },
    { label: 'mismatched verifiedValue', corrupt: { verifiedValue: '9.9' }, expectedMismatch: 'verificationValueMismatch' },
    { label: 'wrong verifiedMetricId', corrupt: { verifiedMetricId: 'revenue' }, expectedMismatch: 'verificationMetricMismatch' },
    { label: 'missing verifiedNumericValue', corrupt: { verifiedNumericValue: undefined }, expectedMismatch: 'verificationNumericValueMissing' },
    { label: 'mismatched verifiedNumericValue', corrupt: { verifiedNumericValue: 9.9 }, expectedMismatch: 'verificationNumericValueMismatch' },
    { label: 'wrong verifiedUnit', corrupt: { verifiedUnit: 'currency_millions' }, expectedMismatch: 'verificationUnitMismatch' },
    { label: 'wrong verifiedScope', corrupt: { verifiedScope: 'consolidated_group' }, expectedMismatch: 'verificationScopeMismatch' },
    { label: 'wrong verifiedAccountingBasis', corrupt: { verifiedAccountingBasis: 'adjusted' }, expectedMismatch: 'verificationAccountingBasisMismatch' },
    { label: 'wrong verifiedPeriod', corrupt: { verifiedPeriod: '2025-FY' }, expectedMismatch: 'verificationPeriodMismatch' },
    { label: 'wrong verifiedPeriodType', corrupt: { verifiedPeriodType: 'annual' }, expectedMismatch: 'verificationPeriodTypeMismatch' },
    { label: 'missing engineId', corrupt: { engineId: '' }, expectedMismatch: 'verificationEngineIdMissing' },
    { label: 'missing engineVersion', corrupt: { engineVersion: '' }, expectedMismatch: 'verificationEngineVersionMissing' },
    { label: 'invalid verificationMethod', corrupt: { verificationMethod: 'magic' as any }, expectedMismatch: 'verificationMethodMissing' },
    { label: 'invalid verifiedAt timestamp', corrupt: { verifiedAt: 'not-a-date' }, expectedMismatch: 'verificationTimestampInvalid' },
    { label: 'missing contentHash when required', corrupt: { sourceContentHash: '' }, expectedMismatch: 'verificationContentHashMissing', options: { requireContentHash: true } },
  ];

  for (const { label, corrupt, expectedMismatch, options } of corruptions) {
    const corruptedResult: ClaimVerifiedResult = { ...validResult, ...corrupt };
    const val = validateClaimVerificationResult(baselineClaim, baselineDoc, '2.3', corruptedResult, 'reported_kpi', options);
    assert(val.valid === false, `Rejects corrupted verification result (${label})`);
    assert(
      val.mismatches.includes(expectedMismatch),
      `Emits ${expectedMismatch} for (${label})`
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 15. Explicit Provenance Origin & Distinction (P1)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 15. Explicit Provenance Origin & Distinction ---');

{
  const verifiedRes = verifyClaimEvidence(
    baselineClaim,
    baselineDoc,
    '2.3',
    'reported_kpi',
    { contentFixtures: [baselineFixture] }
  );

  assert(
    verifiedRes.verificationOrigin === 'repository_fixture',
    'Provenance origin is explicitly set to "repository_fixture"'
  );
  assert(
    verifiedRes.verificationOrigin !== 'live_source',
    'Deterministic repository fixture is NOT identified as "live_source"'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 16. State Resolution Integration (P0-1)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 16. State Resolution Integration ---');

{
  const mockEvidence: ScopeExceptionEvidence[] = [
    {
      sourceDocId: baselineDoc.id,
      sectionReference: 'Financial Results',
      tableReference: 'Automotive Segment',
      evidenceReference: 'Automotive EBIT margin 2.3%',
      purpose: 'reported_kpi',
      supports: ['reported_kpi'],
      supportEvidence: {
        reported_kpi: baselineClaim,
      },
    },
  ];

  // 1. Without verificationResult -> stays source_verified if sources verified
  const unverifiedState = resolveClaimVerificationState(mockEvidence, true);
  assert(unverifiedState === 'source_verified', 'Without engine verification result, resolves to source_verified');

  // 2. With valid ClaimVerifiedResult -> resolves to claim_verified
  const validEngineResult: ClaimVerifiedResult = {
    state: 'claim_verified',
    verificationMethod: 'rule_engine',
    verificationOrigin: 'repository_fixture',
    engineId: 'deterministic_content_verifier',
    engineVersion: '1.0.0',
    sourceDocId: baselineDoc.id,
    claimSupportType: 'reported_kpi',
    verifiedValue: '2.3',
    verifiedMetricId: 'operating_margin',
    verifiedNumericValue: 2.3,
    verifiedUnit: 'percentage',
    verifiedScope: 'automotive_segment',
    verifiedAccountingBasis: 'reported',
    verifiedPeriod: '2026-Q2',
    verifiedPeriodType: 'quarterly',
    sourceContentHash: baselineContentHash,
    verifiedAt: new Date().toISOString(),
  };

  const verifiedState = resolveClaimVerificationState(
    mockEvidence,
    true,
    validEngineResult,
    { claim: baselineClaim, sourceDoc: baselineDoc, expectedValue: '2.3', supportType: 'reported_kpi' }
  );
  assert(verifiedState === 'claim_verified', 'Valid ClaimVerificationResult promotes evidence to claim_verified');

  // 3. Forged engine result with mismatched sourceDocId -> fails to claim_verified
  const forgedResult: ClaimVerifiedResult = {
    ...validEngineResult,
    sourceDocId: 'forged_doc_id',
  };
  const forgedState = resolveClaimVerificationState(
    mockEvidence,
    true,
    forgedResult,
    { claim: baselineClaim, sourceDoc: baselineDoc, expectedValue: '2.3', supportType: 'reported_kpi' }
  );
  assert(forgedState === 'source_verified', 'Forged engine result fails validation and does NOT promote to claim_verified');
}

// ────────────────────────────────────────────────────────────────────────────
// Final Summary & Exit Code
// ────────────────────────────────────────────────────────────────────────────
console.log(`\n=============================================================================`);
console.log(`Evidence Verification Regression Results: ${passed} passed, ${failed} failed.`);
console.log(`=============================================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All evidence verification regression gate tests passed!\n');
}
