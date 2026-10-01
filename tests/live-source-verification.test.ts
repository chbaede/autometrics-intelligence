/**
 * AutoMetrics Intelligence — Live Source Evidence Verification & claim_verified Integration Suite (STEP 5-4)
 *
 * Validates:
 * 1. Live evidence candidates verified through existing verifyClaimEvidence() pipeline.
 * 2. Successful verification produces state: 'claim_verified' with verificationOrigin: 'live_source'.
 * 3. Exact raw-source SHA-256 provenance is preserved on the verification result.
 * 4. All semantic dimensions (metric, value, unit, scope, basis, period, periodType, supportType) enforced.
 * 5. Complete set of forged live result tests (17 required dimensions):
 *    - missing verificationOrigin (verificationOriginMissing)
 *    - repository_fixture origin on a live source (verificationOriginMismatch)
 *    - sourceDocId mismatch (verificationSourceDocMismatch)
 *    - sourceContentHash mismatch (verificationContentHashMismatch)
 *    - metric mismatch & missing (verificationMetricMismatch, verificationMetricMissing)
 *    - value mismatch & missing (verificationValueMismatch, verificationValueMissing)
 *    - numeric mismatch & missing (verificationNumericValueMismatch, verificationNumericValueMissing)
 *    - unit mismatch & missing (verificationUnitMismatch, verificationUnitMissing)
 *    - scope mismatch & missing (verificationScopeMismatch, verificationScopeMissing)
 *    - accounting basis mismatch & missing (verificationAccountingBasisMismatch, verificationAccountingBasisMissing)
 *    - period mismatch & missing (verificationPeriodMismatch, verificationPeriodMissing)
 *    - period type mismatch & missing (verificationPeriodTypeMismatch, verificationPeriodTypeMissing)
 *    - support type mismatch (verificationSupportTypeMismatch)
 *    - engineId missing (verificationEngineIdMissing)
 *    - engineVersion missing (verificationEngineVersionMissing)
 *    - verificationMethod invalid (verificationMethodMissing)
 *    - verifiedAt invalid (verificationTimestampInvalid)
 * 6. Downgrade gate: resolveClaimVerificationState() strictly downgrades any forged result to 'source_verified'.
 * 7. Live vs fixture compatibility:
 *    - valid repository_fixture -> claim_verified
 *    - valid live_source -> claim_verified
 *    - forged repository_fixture -> source_verified
 *    - forged live_source -> source_verified
 * 8. Origin immutability:
 *    - live_source cannot be verified as repository_fixture
 *    - repository_fixture cannot masquerade as live_source
 * 9. Deterministic offline execution: zero network calls in CI.
 */

import {
  verifyClaimEvidence,
  validateClaimVerificationResult,
  resolveClaimVerificationState,
  DETERMINISTIC_SOURCE_CONTENT_FIXTURES,
} from '../src/data/scopeExceptions';
import {
  bindLiveEvidence,
} from '../src/services/liveEvidenceBinder';
import {
  ClaimEvidenceLocator,
  ClaimVerifiedResult,
  ExtractedLiveDocument,
  LiveEvidenceCandidate,
  LiveSourceDocument,
  ScopeExceptionEvidence,
  SourceDocument,
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

// ─────────────────────────────────────────────────────────────────────────────
// Mock Fixtures & Setup
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const ALT_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

const mockLiveDoc: LiveSourceDocument = {
  id: 'mbg_2026_q2_live_report',
  sourceDocId: 'mbg_2026_q2_live_report',
  url: 'https://group.mercedes-benz.com/investors/reports/q2-2026.pdf',
  finalUrl: 'https://group.mercedes-benz.com/investors/reports/q2-2026.pdf',
  retrievedAt: '2026-07-31T07:00:00.000Z',
  httpStatus: 200,
  contentType: 'application/pdf',
  contentLength: 1048576,
  contentHash: VALID_SHA256,
  hashAlgorithm: 'sha256',
  sourceKind: 'official_ir',
};

const mockSourceDoc: SourceDocument & { sourceKind: 'official_ir'; contentHash: string } = {
  id: 'mbg_2026_q2_live_report',
  companyId: 'mercedes_benz',
  title: 'Mercedes-Benz Group Q2 2026 Interim Report',
  docType: 'quarterly_report',
  period: '2026-Q2',
  periodType: 'quarterly',
  publicationDate: '2026-07-31',
  officialUrl: 'https://group.mercedes-benz.com/investors/reports/q2-2026.pdf',
  isVerified: true,
  verificationStatus: 'verified',
  lastChecked: '2026-07-31',
  sourceKind: 'official_ir',
  contentHash: VALID_SHA256,
};

const mockExtractedDoc: ExtractedLiveDocument = {
  sourceDocument: mockLiveDoc,
  extractionMethod: 'deterministic_text_stream',
  extractionVersion: '1.0.0',
  extractedAt: '2026-07-31T07:01:00.000Z',
  pageCount: 15,
  blocks: [
    {
      id: 'p2_kpi',
      blockType: 'table_row',
      text: 'Mercedes-Benz Cars Adjusted Return on Sales: 4.0%',
      pageNumber: 2,
      sectionHeading: 'Mercedes-Benz Cars',
      tableIndex: 1,
      rowIndex: 2,
      locator: 'page:2:table:1:row:2',
    },
  ],
  extractedText: 'Mercedes-Benz Cars Adjusted Return on Sales: 4.0%',
};

const mockClaim: ClaimEvidenceLocator = {
  sourceDocId: 'mbg_2026_q2_live_report',
  claimedValue: '4.0%',
  claimedMetricId: 'cars_adjusted_ebit_margin',
  claimedNumericValue: 4.0,
  claimedUnit: 'percentage',
  claimedScope: 'cars_segment',
  claimedAccountingBasis: 'adjusted',
  claimedPeriod: '2026-Q2',
  claimedPeriodType: 'quarterly',
  locator: 'page:2:table:1:row:2',
};

const mockEvidenceList: ScopeExceptionEvidence[] = [
  {
    sourceDocId: 'mbg_2026_q2_live_report',
    sectionReference: 'Mercedes-Benz Cars',
    tableReference: 'Division KPIs',
    evidenceReference: 'Adjusted Return on Sales 4.0%',
    purpose: 'reported_kpi',
    supports: ['reported_kpi'],
    supportEvidence: {
      reported_kpi: mockClaim,
    },
  },
];

// Generate valid candidate via live evidence binder
const validCandidate: LiveEvidenceCandidate = bindLiveEvidence(mockExtractedDoc, {
  locator: 'page:2:table:1:row:2',
  rawValue: '4.0%',
  metricId: 'cars_adjusted_ebit_margin',
  scope: 'cars_segment',
  accountingBasis: 'adjusted',
  period: '2026-Q2',
  periodType: 'quarterly',
  supportType: 'reported_kpi',
  unit: 'percentage',
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Live Evidence Verification via verifyClaimEvidence()
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 1: Live Evidence Verification Engine Integration ---');

{
  const result = verifyClaimEvidence(
    mockClaim,
    mockSourceDoc,
    '4.0%',
    'reported_kpi',
    {
      liveCandidate: validCandidate,
      liveSourceDocument: mockLiveDoc,
      expectedOrigin: 'live_source',
      expectedNumericValue: 4.0,
      extractedLiveDocument: mockExtractedDoc,
    }
  );

  assert(result.state === 'claim_verified', 'Live candidate produces state: claim_verified');
  assert(result.verificationOrigin === 'live_source', 'Verification origin is explicitly live_source');

  const verifiedRes = result as ClaimVerifiedResult;
  assert(verifiedRes.sourceDocId === 'mbg_2026_q2_live_report', 'Preserves sourceDocId');
  assert(verifiedRes.sourceContentHash === VALID_SHA256, 'Preserves exact raw wire response SHA-256 hash');
  assert(verifiedRes.verifiedMetricId === 'cars_adjusted_ebit_margin', 'Preserves verifiedMetricId');
  assert(verifiedRes.verifiedNumericValue === 4.0, 'Preserves verifiedNumericValue');
  assert(verifiedRes.verifiedUnit === 'percentage', 'Preserves verifiedUnit');
  assert(verifiedRes.verifiedScope === 'cars_segment', 'Preserves verifiedScope');
  assert(verifiedRes.verifiedAccountingBasis === 'adjusted', 'Preserves verifiedAccountingBasis');
  assert(verifiedRes.verifiedPeriod === '2026-Q2', 'Preserves verifiedPeriod');
  assert(verifiedRes.verifiedPeriodType === 'quarterly', 'Preserves verifiedPeriodType');
  assert(verifiedRes.claimSupportType === 'reported_kpi', 'Preserves claimSupportType');
  assert(Boolean(verifiedRes.engineId), 'Preserves engineId');
  assert(Boolean(verifiedRes.engineVersion), 'Preserves engineVersion');
  assert(Boolean(verifiedRes.verificationMethod), 'Preserves verificationMethod');
  assert(Boolean(verifiedRes.verifiedAt), 'Preserves verifiedAt');

  // Verify that valid result passes existing validateClaimVerificationResult()
  const validation = validateClaimVerificationResult(
    mockClaim,
    mockSourceDoc,
    '4.0%',
    verifiedRes,
    'reported_kpi',
    { expectedOrigin: 'live_source', expectedContentHash: VALID_SHA256, extractedLiveDocument: mockExtractedDoc }
  );
  assert(validation.valid && validation.mismatches.length === 0, 'Verified live result cleanly passes validateClaimVerificationResult()');

  // Verify promotion in resolveClaimVerificationState()
  const resolvedState = resolveClaimVerificationState(
    mockEvidenceList,
    true,
    verifiedRes,
    {
      claim: mockClaim,
      sourceDoc: mockSourceDoc,
      expectedValue: '4.0%',
      supportType: 'reported_kpi',
      expectedOrigin: 'live_source',
      expectedContentHash: VALID_SHA256,
      extractedLiveDocument: mockExtractedDoc,
    }
  );
  assert(resolvedState === 'claim_verified', 'Valid live verification result promotes to claim_verified in resolveClaimVerificationState()');
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Anti-Forgery & Downgrade Gate (17 Required Failure Dimensions)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 2: Forged Live Result Tests & Strict Downgrade Gate ---');

{
  const baselineResult: ClaimVerifiedResult = verifyClaimEvidence(
    mockClaim,
    mockSourceDoc,
    '4.0%',
    'reported_kpi',
    {
      liveCandidate: validCandidate,
      liveSourceDocument: mockLiveDoc,
      expectedOrigin: 'live_source',
      expectedNumericValue: 4.0,
      extractedLiveDocument: mockExtractedDoc,
    }
  ) as ClaimVerifiedResult;

  const forgeryCases: Array<{
    dimension: string;
    corrupt: Partial<ClaimVerifiedResult>;
    expectedMismatch: string;
    overrideOptions?: { expectedOrigin?: 'repository_fixture' | 'live_source'; expectedContentHash?: string };
    overrideDoc?: any;
  }> = [
    // 1. Missing verificationOrigin
    {
      dimension: 'missing verificationOrigin',
      corrupt: { verificationOrigin: undefined as any },
      expectedMismatch: 'verificationOriginMissing',
    },
    // 2. repository_fixture origin on a live source (Origin Immutability)
    {
      dimension: 'repository_fixture origin on a live source',
      corrupt: { verificationOrigin: 'repository_fixture' },
      expectedMismatch: 'verificationOriginMismatch',
      overrideDoc: mockSourceDoc, // sourceKind: 'official_ir'
    },
    // 3. sourceDocId mismatch
    {
      dimension: 'sourceDocId mismatch',
      corrupt: { sourceDocId: 'bmw_2026_q2_report' },
      expectedMismatch: 'verificationSourceDocMismatch',
    },
    // 4. sourceContentHash mismatch
    {
      dimension: 'sourceContentHash mismatch',
      corrupt: { sourceContentHash: ALT_SHA256 },
      expectedMismatch: 'verificationContentHashMismatch',
      overrideOptions: { expectedContentHash: VALID_SHA256 },
    },
    // 5. metric mismatch & missing
    {
      dimension: 'metric mismatch',
      corrupt: { verifiedMetricId: 'group_revenue' },
      expectedMismatch: 'verificationMetricMismatch',
    },
    {
      dimension: 'metric missing',
      corrupt: { verifiedMetricId: undefined },
      expectedMismatch: 'verificationMetricMissing',
    },
    // 6. value mismatch & missing
    {
      dimension: 'value mismatch',
      corrupt: { verifiedValue: '5.2%' },
      expectedMismatch: 'verificationValueMismatch',
    },
    {
      dimension: 'value missing',
      corrupt: { verifiedValue: '' },
      expectedMismatch: 'verificationValueMissing',
    },
    // 7. numeric mismatch & missing
    {
      dimension: 'numeric mismatch',
      corrupt: { verifiedNumericValue: 5.2 },
      expectedMismatch: 'verificationNumericValueMismatch',
    },
    {
      dimension: 'numeric missing',
      corrupt: { verifiedNumericValue: undefined },
      expectedMismatch: 'verificationNumericValueMissing',
    },
    // 8. unit mismatch & missing
    {
      dimension: 'unit mismatch',
      corrupt: { verifiedUnit: 'currency_millions' },
      expectedMismatch: 'verificationUnitMismatch',
    },
    {
      dimension: 'unit missing',
      corrupt: { verifiedUnit: undefined },
      expectedMismatch: 'verificationUnitMissing',
    },
    // 9. scope mismatch & missing
    {
      dimension: 'scope mismatch',
      corrupt: { verifiedScope: 'consolidated_group' },
      expectedMismatch: 'verificationScopeMismatch',
    },
    {
      dimension: 'scope missing',
      corrupt: { verifiedScope: undefined },
      expectedMismatch: 'verificationScopeMissing',
    },
    // 10. accounting basis mismatch & missing
    {
      dimension: 'accounting basis mismatch',
      corrupt: { verifiedAccountingBasis: 'reported' },
      expectedMismatch: 'verificationAccountingBasisMismatch',
    },
    {
      dimension: 'accounting basis missing',
      corrupt: { verifiedAccountingBasis: undefined },
      expectedMismatch: 'verificationAccountingBasisMissing',
    },
    // 11. period mismatch & missing
    {
      dimension: 'period mismatch',
      corrupt: { verifiedPeriod: '2025-FY' },
      expectedMismatch: 'verificationPeriodMismatch',
    },
    {
      dimension: 'period missing',
      corrupt: { verifiedPeriod: undefined },
      expectedMismatch: 'verificationPeriodMissing',
    },
    // 12. period type mismatch & missing
    {
      dimension: 'period type mismatch',
      corrupt: { verifiedPeriodType: 'annual' },
      expectedMismatch: 'verificationPeriodTypeMismatch',
    },
    {
      dimension: 'period type missing',
      corrupt: { verifiedPeriodType: undefined },
      expectedMismatch: 'verificationPeriodTypeMissing',
    },
    // 13. support type mismatch
    {
      dimension: 'support type mismatch',
      corrupt: { claimSupportType: 'denominator' },
      expectedMismatch: 'verificationSupportTypeMismatch',
    },
    // 14. engineId missing
    {
      dimension: 'engineId missing',
      corrupt: { engineId: '' },
      expectedMismatch: 'verificationEngineIdMissing',
    },
    // 15. engineVersion missing
    {
      dimension: 'engineVersion missing',
      corrupt: { engineVersion: '' },
      expectedMismatch: 'verificationEngineVersionMissing',
    },
    // 16. verificationMethod invalid
    {
      dimension: 'verificationMethod invalid',
      corrupt: { verificationMethod: 'unverified_guess' as any },
      expectedMismatch: 'verificationMethodMissing',
    },
    // 17. verifiedAt invalid
    {
      dimension: 'verifiedAt invalid',
      corrupt: { verifiedAt: 'invalid-iso-date' },
      expectedMismatch: 'verificationTimestampInvalid',
    },
  ];

  for (const { dimension, corrupt, expectedMismatch, overrideOptions, overrideDoc } of forgeryCases) {
    const forgedResult: ClaimVerifiedResult = {
      ...baselineResult,
      ...corrupt,
    };

    // 1. Validator must detect forgery and emit specific error
    const validation = validateClaimVerificationResult(
      mockClaim,
      overrideDoc ?? mockSourceDoc,
      '4.0%',
      forgedResult,
      'reported_kpi',
      {
        expectedNumericValue: 4.0,
        expectedOrigin: overrideOptions?.expectedOrigin ?? 'live_source',
        expectedContentHash: overrideOptions?.expectedContentHash ?? VALID_SHA256,
        extractedLiveDocument: mockExtractedDoc,
      }
    );

    assert(
      !validation.valid && validation.mismatches.includes(expectedMismatch),
      `Validator rejects forged live result (${dimension}) with ${expectedMismatch}`
    );

    // 2. resolveClaimVerificationState must strictly downgrade forged result to source_verified
    const downgradedState = resolveClaimVerificationState(
      mockEvidenceList,
      true,
      forgedResult,
      {
        claim: mockClaim,
        sourceDoc: overrideDoc ?? mockSourceDoc,
        expectedValue: '4.0%',
        supportType: 'reported_kpi',
        expectedOrigin: overrideOptions?.expectedOrigin ?? 'live_source',
        expectedContentHash: overrideOptions?.expectedContentHash ?? VALID_SHA256,
        extractedLiveDocument: mockExtractedDoc,
      }
    );

    assert(
      downgradedState === 'source_verified',
      `State resolver strictly downgrades forged result (${dimension}) to source_verified`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: Live vs Fixture Compatibility & Origin Immutability (Section 6 & 7)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 3: Live vs Fixture Compatibility & Origin Immutability ---');

{
  const fixtureSnippet = DETERMINISTIC_SOURCE_CONTENT_FIXTURES[0]; // bmw_2026_q2_statement
  const fixtureClaim: ClaimEvidenceLocator = {
    sourceDocId: fixtureSnippet.sourceDocId,
    claimedValue: fixtureSnippet.verifiedValue,
    claimedMetricId: fixtureSnippet.verifiedMetricId,
    claimedNumericValue: fixtureSnippet.verifiedNumericValue,
    claimedUnit: fixtureSnippet.verifiedUnit,
    claimedScope: fixtureSnippet.verifiedScope,
    claimedAccountingBasis: fixtureSnippet.verifiedAccountingBasis,
    claimedPeriod: fixtureSnippet.verifiedPeriod,
    claimedPeriodType: fixtureSnippet.verifiedPeriodType,
  };
  const fixtureDoc: SourceDocument = {
    id: fixtureSnippet.sourceDocId,
    companyId: 'bmw_group',
    title: 'BMW Group Q2 2026 Statement',
    docType: 'quarterly_report',
    period: fixtureSnippet.verifiedPeriod ?? '2026-Q2',
    periodType: fixtureSnippet.verifiedPeriodType ?? 'quarterly',
    publicationDate: '2026-08-01',
    officialUrl: 'https://bmwgroup.com/ir/q2-2026.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    lastChecked: '2026-08-01',
  };

  // 1. Valid repository_fixture -> claim_verified
  const fixtureRes = verifyClaimEvidence(fixtureClaim, fixtureDoc, fixtureSnippet.verifiedValue, fixtureSnippet.supportType);
  assert(fixtureRes.state === 'claim_verified', 'Valid repository_fixture produces claim_verified');
  assert(fixtureRes.verificationOrigin === 'repository_fixture', 'Fixture result origin is repository_fixture');

  // 2. Valid live_source -> claim_verified
  const liveRes = verifyClaimEvidence(
    mockClaim,
    mockSourceDoc,
    '4.0%',
    'reported_kpi',
    { liveCandidate: validCandidate, expectedOrigin: 'live_source', extractedLiveDocument: mockExtractedDoc }
  );
  assert(liveRes.state === 'claim_verified', 'Valid live_source produces claim_verified');
  assert(liveRes.verificationOrigin === 'live_source', 'Live result origin is live_source');

  // 3. Forged fixture -> source_verified
  const forgedFixture = verifyClaimEvidence(
    { ...fixtureClaim, claimedNumericValue: 99.9 },
    fixtureDoc,
    '99.9',
    fixtureSnippet.supportType
  );
  assert(forgedFixture.state === 'source_verified', 'Forged fixture value downgrades to source_verified');

  // 4. Forged live_source -> source_verified
  const forgedLive = verifyClaimEvidence(
    { ...mockClaim, claimedNumericValue: 99.9 },
    mockSourceDoc,
    '99.9%',
    'reported_kpi',
    { liveCandidate: validCandidate, expectedOrigin: 'live_source', extractedLiveDocument: mockExtractedDoc }
  );
  assert(forgedLive.state === 'source_verified', 'Forged live value downgrades to source_verified');

  // 5. Origin immutability: masquerading repository_fixture as live_source
  const masqueradingLive = {
    ...(fixtureRes as ClaimVerifiedResult),
    verificationOrigin: 'live_source' as const,
  };
  const valMasquerade1 = validateClaimVerificationResult(
    fixtureClaim,
    fixtureDoc,
    fixtureSnippet.verifiedValue,
    masqueradingLive,
    fixtureSnippet.supportType,
    { expectedOrigin: 'repository_fixture' }
  );
  assert(
    !valMasquerade1.valid && valMasquerade1.mismatches.includes('verificationOriginMismatch'),
    'Origin immutability: cannot relabel repository_fixture as live_source'
  );

  // 6. Origin immutability: masquerading live_source as repository_fixture on live doc
  const masqueradingFixture = {
    ...(liveRes as ClaimVerifiedResult),
    verificationOrigin: 'repository_fixture' as const,
  };
  const valMasquerade2 = validateClaimVerificationResult(
    mockClaim,
    mockSourceDoc, // sourceKind === 'official_ir'
    '4.0%',
    masqueradingFixture,
    'reported_kpi'
  );
  assert(
    !valMasquerade2.valid && valMasquerade2.mismatches.includes('verificationOriginMismatch'),
    'Origin immutability: cannot relabel live_source as repository_fixture against official IR live doc'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n=============================================================================`);
console.log(`Live Source Verification Test Results: ${passed} passed, ${failed} failed.`);
console.log(`=============================================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All live source verification and claim_verified tests passed!\n');
}
