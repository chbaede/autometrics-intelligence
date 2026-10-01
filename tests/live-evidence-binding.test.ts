/**
 * AutoMetrics Intelligence — Live Evidence Binding Test Suite (STEP 5-3)
 *
 * Validates:
 * 1. Deterministic value & unit parsing (percentages, billions, millions, thousand units, pure numbers)
 * 2. Locator resolution (structured locators, pattern locators, block-level matching)
 * 3. Structured live evidence candidate creation with cryptographic binding
 * 4. Architectural invariant: candidate creation does NOT create claim_verified
 * 5. Anti-forgery validation gates:
 *    - verificationOrigin completeness & validity ('live_source' only)
 *    - sourceContentHash SHA-256 cryptographic validity & source binding
 *    - sourceDocId binding & mismatch detection
 *    - metricId semantic identity & mismatch detection
 *    - rawValue & numericValue verification with unit awareness
 *    - unit, scope, accountingBasis, period, periodType completeness & match
 *    - supportType compatibility & mismatch detection
 *    - locator & evidenceText presence
 * 6. Bridge to existing claim verification engine (candidateToVerificationResult -> validateClaimVerificationResult)
 * 7. Coexistence with repository_fixture verification without interference
 */

import {
  bindLiveEvidence,
  candidateToVerificationResult,
  parseValueAndUnit,
  resolveLocator,
  validateLiveEvidenceCandidate,
} from '../src/services/liveEvidenceBinder';
import {
  ClaimEvidenceLocator,
  ExtractedLiveDocument,
  LiveSourceDocument,
  SourceDocument,
} from '../src/types/metrics';
import { validateClaimVerificationResult } from '../src/data/scopeExceptions';

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
// Helpers & Mock Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const ALT_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function createMockLiveDoc(overrides?: Partial<LiveSourceDocument>): LiveSourceDocument {
  return {
    id: 'test_ir_q2_2026',
    sourceDocId: 'test_ir_q2_2026',
    url: 'https://ir.example.com/reports/2026-q2.pdf',
    finalUrl: 'https://ir.example.com/reports/2026-q2.pdf',
    retrievedAt: '2026-07-31T07:00:00.000Z',
    httpStatus: 200,
    contentType: 'application/pdf',
    contentLength: 1048576,
    contentHash: VALID_SHA256,
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
    ...overrides,
  };
}

function createMockExtractedDoc(overrides?: Partial<ExtractedLiveDocument>): ExtractedLiveDocument {
  const liveDoc = createMockLiveDoc();
  return {
    sourceDocument: liveDoc,
    extractionMethod: 'deterministic_text_stream',
    extractionVersion: '1.0.0',
    extractedAt: '2026-07-31T07:01:00.000Z',
    pageCount: 3,
    blocks: [
      {
        id: 'p1_b1',
        blockType: 'heading',
        text: 'Mercedes-Benz Group Q2 2026 Key Figures',
        pageNumber: 1,
        locator: 'page:1:block:0',
      },
      {
        id: 'p2_b1',
        blockType: 'table_row',
        text: 'Mercedes-Benz Cars Adjusted Return on Sales: 4.0%',
        pageNumber: 2,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:2:table:0:row:1',
      },
      {
        id: 'p3_b1',
        blockType: 'paragraph',
        text: 'Group Revenue reached €36,743 million in the second quarter of 2026.',
        pageNumber: 3,
        sectionHeading: 'Group Financial Performance',
        paragraphIndex: 2,
        locator: 'page:3:p:2',
      },
    ],
    extractedText: 'Mercedes-Benz Group Q2 2026 Key Figures\nAdjusted Return on Sales: 4.0%',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Value and Unit Parsing (STEP 5-3, Section 3)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 1: Value and Unit Parsing ---');

// Percentages
{
  const r1 = parseValueAndUnit('12.4%');
  assert(r1.numericValue === 12.4 && r1.unit === 'percentage' && r1.rawValue === '12.4%', 'Parse positive percentage (12.4%)');

  const r2 = parseValueAndUnit('-3.5%');
  assert(r2.numericValue === -3.5 && r2.unit === 'percentage' && r2.rawValue === '-3.5%', 'Parse negative percentage (-3.5%)');

  const r3 = parseValueAndUnit('+2.3%');
  assert(r3.numericValue === 2.3 && r3.unit === 'percentage', 'Parse explicitly signed percentage (+2.3%)');
}

// Billions and currency conversions
{
  const r1 = parseValueAndUnit('€1.2 billion', 'currency_millions');
  assert(r1.numericValue === 1200 && r1.unit === 'currency_millions' && r1.rawValue === '€1.2 billion', 'Parse €1.2 billion normalized to millions (1200)');

  const r2 = parseValueAndUnit('1.2bn', 'currency_millions');
  assert(r2.numericValue === 1200 && r2.unit === 'currency_millions', 'Parse 1.2bn normalized to millions');

  const r3 = parseValueAndUnit('$1.2B', 'currency_billions');
  assert(r3.numericValue === 1.2 && r3.unit === 'currency_billions', 'Parse $1.2B in currency_billions');
}

// Millions
{
  const r1 = parseValueAndUnit('1,200 million');
  assert(r1.numericValue === 1200 && r1.unit === 'currency_millions', 'Parse "1,200 million"');

  const r2 = parseValueAndUnit('€629m');
  assert(r2.numericValue === 629 && r2.unit === 'currency_millions', 'Parse "€629m"');

  const r3 = parseValueAndUnit('28,240M');
  assert(r3.numericValue === 28240 && r3.unit === 'currency_millions', 'Parse "28,240M"');
}

// Thousand units & Units
{
  const r1 = parseValueAndUnit('480.13 thousand units');
  assert(r1.numericValue === 480.13 && r1.unit === 'thousand_units', 'Parse "480.13 thousand units"');

  const r2 = parseValueAndUnit('480.13k');
  assert(r2.numericValue === 480.13 && r2.unit === 'thousand_units', 'Parse "480.13k"');

  const r3 = parseValueAndUnit('412,300 units');
  assert(r3.numericValue === 412300 && r3.unit === 'units', 'Parse "412,300 units"');
}

// Pure numbers
{
  const r1 = parseValueAndUnit('2.3');
  assert(r1.numericValue === 2.3 && r1.normalizedValue === '2.3', 'Parse pure float "2.3"');

  const r2 = parseValueAndUnit('1,200');
  assert(r2.numericValue === 1200 && r2.normalizedValue === '1200', 'Parse comma formatted pure integer "1,200"');

  const r3 = parseValueAndUnit('-10.5');
  assert(r3.numericValue === -10.5 && r3.normalizedValue === '-10.5', 'Parse negative number "-10.5"');
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Locator Resolution (STEP 5-3, Section 9)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 2: Locator Resolution ---');

{
  const extractedDoc = createMockExtractedDoc();

  // Pattern string locator
  const loc1 = resolveLocator('page:2:table:0:row:1');
  assert(loc1.structuredLocator.page === 2 && loc1.structuredLocator.tableIndex === 0 && loc1.structuredLocator.rowIndex === 1, 'Parse string pattern page:2:table:0:row:1');

  // Block matching locator
  const loc2 = resolveLocator('page:2:table:0:row:1', extractedDoc.blocks);
  assert(loc2.matchedBlock !== undefined && loc2.matchedBlock.sectionHeading === 'Mercedes-Benz Cars', 'Resolve locator to matching block in ExtractedLiveDocument');

  // Paragraph pattern locator
  const loc3 = resolveLocator('page:3:p:2');
  assert(loc3.structuredLocator.page === 3 && loc3.structuredLocator.paragraphIndex === 2, 'Parse paragraph locator page:3:p:2');

  // Pre-structured locator pass-through
  const preStructured = { page: 1, section: 'Intro', rawLocator: 'page:1' };
  const loc4 = resolveLocator(preStructured);
  assert(loc4.structuredLocator === preStructured, 'Pre-structured locator passes through intact');
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: Live Evidence Binding & Architectural Boundary (STEP 5-3, Sections 1 & 2)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 3: Live Evidence Binding & Invariants ---');

{
  const extractedDoc = createMockExtractedDoc();

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:2:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'cars_adjusted_ebit_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    supportType: 'reported_kpi',
    unit: 'percentage',
  });

  // Source cryptographic binding
  assert(candidate.sourceDocId === 'test_ir_q2_2026', 'Candidate bound to correct sourceDocId');
  assert(candidate.sourceContentHash === VALID_SHA256, 'Candidate bound to exact SHA-256 contentHash');
  assert(candidate.verificationOrigin === 'live_source', 'Candidate origin is strictly "live_source"');

  // Semantic binding
  assert(candidate.metricId === 'cars_adjusted_ebit_margin', 'Candidate bound to metricId');
  assert(candidate.rawValue === '4.0%', 'Candidate preserves rawValue "4.0%"');
  assert(candidate.numericValue === 4.0, 'Candidate parses numericValue 4.0');
  assert(candidate.unit === 'percentage', 'Candidate unit is percentage');
  assert(candidate.scope === 'cars_segment', 'Candidate scope is cars_segment');
  assert(candidate.accountingBasis === 'adjusted', 'Candidate accountingBasis is adjusted');
  assert(candidate.period === '2026-Q2', 'Candidate period is 2026-Q2');
  assert(candidate.periodType === 'quarterly', 'Candidate periodType is quarterly');
  assert(candidate.supportType === 'reported_kpi', 'Candidate supportType is reported_kpi');
  assert(candidate.locator.page === 2, 'Candidate locator page is 2');
  assert(candidate.evidenceText.includes('Adjusted Return on Sales: 4.0%'), 'Candidate includes evidenceText from matched block');

  // CRITICAL ARCHITECTURAL BOUNDARY: Candidate does NOT claim claim_verified
  assert(!('state' in candidate), 'Architectural gate: LiveEvidenceCandidate does NOT have state: "claim_verified"');
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: Anti-Forgery Validation Gates (STEP 5-3, Section 10)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 4: Anti-Forgery Validation Gates ---');

{
  const extractedDoc = createMockExtractedDoc();
  const liveDoc = extractedDoc.sourceDocument;

  const validCandidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:2:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'cars_adjusted_ebit_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    supportType: 'reported_kpi',
    unit: 'percentage',
  });

  const matchingClaim: ClaimEvidenceLocator = {
    sourceDocId: 'test_ir_q2_2026',
    claimedValue: '4.0%',
    claimedMetricId: 'cars_adjusted_ebit_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const matchingSourceDoc: SourceDocument = {
    id: 'test_ir_q2_2026',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Q2 2026 Results',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://ir.example.com/reports/2026-q2.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    lastChecked: '2026-07-31',
  };

  // 1. Valid candidate passes
  const validRes = validateLiveEvidenceCandidate(validCandidate, matchingClaim, matchingSourceDoc, {
    sourceDocument: liveDoc,
    supportType: 'reported_kpi',
  });
  assert(validRes.valid && validRes.mismatches.length === 0, 'Valid live candidate passes validation completely');

  // 2. Missing candidate
  const rMiss = validateLiveEvidenceCandidate(null, matchingClaim, matchingSourceDoc);
  assert(!rMiss.valid && rMiss.mismatches.includes('verificationCandidateMissing'), 'Rejects null candidate (verificationCandidateMissing)');

  // 3. verificationOrigin missing / invalid
  const forgedOrigin1 = { ...validCandidate, verificationOrigin: undefined as any };
  const rOrigin1 = validateLiveEvidenceCandidate(forgedOrigin1, matchingClaim, matchingSourceDoc);
  assert(!rOrigin1.valid && rOrigin1.mismatches.includes('verificationOriginMissing'), 'Rejects missing verificationOrigin (verificationOriginMissing)');

  const forgedOrigin2 = { ...validCandidate, verificationOrigin: 'repository_fixture' as any };
  const rOrigin2 = validateLiveEvidenceCandidate(forgedOrigin2, matchingClaim, matchingSourceDoc);
  assert(!rOrigin2.valid && rOrigin2.mismatches.includes('verificationOriginInvalid'), 'Rejects invalid verificationOrigin (verificationOriginInvalid)');

  // 4. sourceContentHash missing / invalid / mismatch
  const forgedHash1 = { ...validCandidate, sourceContentHash: '' };
  const rHash1 = validateLiveEvidenceCandidate(forgedHash1, matchingClaim, matchingSourceDoc);
  assert(!rHash1.valid && rHash1.mismatches.includes('verificationContentHashMissing'), 'Rejects missing sourceContentHash (verificationContentHashMissing)');

  const forgedHash2 = { ...validCandidate, sourceContentHash: 'not-a-valid-sha256' };
  const rHash2 = validateLiveEvidenceCandidate(forgedHash2, matchingClaim, matchingSourceDoc);
  assert(!rHash2.valid && rHash2.mismatches.includes('verificationContentHashInvalid'), 'Rejects invalid hex hash (verificationContentHashInvalid)');

  const forgedHash3 = { ...validCandidate, sourceContentHash: ALT_SHA256 };
  const rHash3 = validateLiveEvidenceCandidate(forgedHash3, matchingClaim, matchingSourceDoc, { sourceDocument: liveDoc });
  assert(!rHash3.valid && rHash3.mismatches.includes('verificationContentHashMismatch'), 'Rejects hash mismatch against live sourceDocument (verificationContentHashMismatch)');

  // 5. sourceDocId mismatch
  const forgedDoc = { ...validCandidate, sourceDocId: 'wrong_document_id' };
  const rDoc = validateLiveEvidenceCandidate(forgedDoc, matchingClaim, matchingSourceDoc);
  assert(!rDoc.valid && rDoc.mismatches.includes('verificationSourceDocMismatch'), 'Rejects mismatched sourceDocId (verificationSourceDocMismatch)');

  // 6. Metric semantic mismatch & missing
  const forgedMetric1 = { ...validCandidate, metricId: undefined };
  const rMetric1 = validateLiveEvidenceCandidate(forgedMetric1, matchingClaim, matchingSourceDoc);
  assert(!rMetric1.valid && rMetric1.mismatches.includes('verificationMetricMissing'), 'Rejects missing metricId when claimed (verificationMetricMissing)');

  const forgedMetric2 = { ...validCandidate, metricId: 'revenue' };
  const rMetric2 = validateLiveEvidenceCandidate(forgedMetric2, matchingClaim, matchingSourceDoc);
  assert(!rMetric2.valid && rMetric2.mismatches.includes('verificationMetricMismatch'), 'Rejects mismatched metricId (verificationMetricMismatch)');

  // 7. Value & numeric value mismatch
  const forgedVal1 = { ...validCandidate, rawValue: '' };
  const rVal1 = validateLiveEvidenceCandidate(forgedVal1, matchingClaim, matchingSourceDoc);
  assert(!rVal1.valid && rVal1.mismatches.includes('verificationValueMissing'), 'Rejects missing rawValue (verificationValueMissing)');

  const forgedVal2 = { ...validCandidate, rawValue: '5.2%', normalizedValue: '5.2', numericValue: 5.2 };
  const rVal2 = validateLiveEvidenceCandidate(forgedVal2, matchingClaim, matchingSourceDoc);
  assert(
    !rVal2.valid &&
      rVal2.mismatches.includes('verificationValueMismatch') &&
      rVal2.mismatches.includes('verificationNumericValueMismatch'),
    'Rejects mismatched value & numericValue (verificationValueMismatch + verificationNumericValueMismatch)'
  );

  // 8. Unit mismatch & missing
  const forgedUnit1 = { ...validCandidate, unit: undefined };
  const rUnit1 = validateLiveEvidenceCandidate(forgedUnit1, matchingClaim, matchingSourceDoc);
  assert(!rUnit1.valid && rUnit1.mismatches.includes('verificationUnitMissing'), 'Rejects missing unit when claimed (verificationUnitMissing)');

  const forgedUnit2 = { ...validCandidate, unit: 'currency_millions' as any };
  const rUnit2 = validateLiveEvidenceCandidate(forgedUnit2, matchingClaim, matchingSourceDoc);
  assert(!rUnit2.valid && rUnit2.mismatches.includes('verificationUnitMismatch'), 'Rejects mismatched unit (verificationUnitMismatch)');

  // 9. Scope mismatch & missing
  const forgedScope1 = { ...validCandidate, scope: undefined };
  const rScope1 = validateLiveEvidenceCandidate(forgedScope1, matchingClaim, matchingSourceDoc);
  assert(!rScope1.valid && rScope1.mismatches.includes('verificationScopeMissing'), 'Rejects missing scope when claimed (verificationScopeMissing)');

  const forgedScope2 = { ...validCandidate, scope: 'consolidated_group' as any };
  const rScope2 = validateLiveEvidenceCandidate(forgedScope2, matchingClaim, matchingSourceDoc);
  assert(!rScope2.valid && rScope2.mismatches.includes('verificationScopeMismatch'), 'Rejects mismatched scope (verificationScopeMismatch)');

  // 10. Accounting basis mismatch & missing
  const forgedBasis1 = { ...validCandidate, accountingBasis: undefined };
  const rBasis1 = validateLiveEvidenceCandidate(forgedBasis1, matchingClaim, matchingSourceDoc);
  assert(!rBasis1.valid && rBasis1.mismatches.includes('verificationAccountingBasisMissing'), 'Rejects missing accountingBasis (verificationAccountingBasisMissing)');

  const forgedBasis2 = { ...validCandidate, accountingBasis: 'reported' as any };
  const rBasis2 = validateLiveEvidenceCandidate(forgedBasis2, matchingClaim, matchingSourceDoc);
  assert(!rBasis2.valid && rBasis2.mismatches.includes('verificationAccountingBasisMismatch'), 'Rejects mismatched accountingBasis (verificationAccountingBasisMismatch)');

  // 11. Period mismatch & missing
  const forgedPeriod1 = { ...validCandidate, period: undefined };
  const rPeriod1 = validateLiveEvidenceCandidate(forgedPeriod1, matchingClaim, matchingSourceDoc);
  assert(!rPeriod1.valid && rPeriod1.mismatches.includes('verificationPeriodMissing'), 'Rejects missing period when claimed (verificationPeriodMissing)');

  const forgedPeriod2 = { ...validCandidate, period: '2025-FY' };
  const rPeriod2 = validateLiveEvidenceCandidate(forgedPeriod2, matchingClaim, matchingSourceDoc);
  assert(!rPeriod2.valid && rPeriod2.mismatches.includes('verificationPeriodMismatch'), 'Rejects mismatched period (verificationPeriodMismatch)');

  // 12. Period type mismatch & missing
  const forgedPType1 = { ...validCandidate, periodType: undefined };
  const rPType1 = validateLiveEvidenceCandidate(forgedPType1, matchingClaim, matchingSourceDoc);
  assert(!rPType1.valid && rPType1.mismatches.includes('verificationPeriodTypeMissing'), 'Rejects missing periodType (verificationPeriodTypeMissing)');

  const forgedPType2 = { ...validCandidate, periodType: 'annual' as any };
  const rPType2 = validateLiveEvidenceCandidate(forgedPType2, matchingClaim, matchingSourceDoc);
  assert(!rPType2.valid && rPType2.mismatches.includes('verificationPeriodTypeMismatch'), 'Rejects mismatched periodType (verificationPeriodTypeMismatch)');

  // 13. Support type compatibility and mismatch
  const rSuppCompat = validateLiveEvidenceCandidate(validCandidate, matchingClaim, matchingSourceDoc, {
    supportType: 'numeric_margin_value', // compatible with reported_kpi
  });
  assert(rSuppCompat.valid, 'Accepts compatible reported_kpi <-> numeric_margin_value');

  const rSuppMismatch = validateLiveEvidenceCandidate(validCandidate, matchingClaim, matchingSourceDoc, {
    supportType: 'denominator',
  });
  assert(!rSuppMismatch.valid && rSuppMismatch.mismatches.includes('verificationSupportTypeMismatch'), 'Rejects incompatible supportType (verificationSupportTypeMismatch)');

  // 14. Locator & evidenceText missing
  const forgedLoc = { ...validCandidate, locator: {} };
  const rLoc = validateLiveEvidenceCandidate(forgedLoc, matchingClaim, matchingSourceDoc);
  assert(!rLoc.valid && rLoc.mismatches.includes('verificationLocatorMissing'), 'Rejects empty locator (verificationLocatorMissing)');

  const forgedText = { ...validCandidate, evidenceText: '' };
  const rText = validateLiveEvidenceCandidate(forgedText, matchingClaim, matchingSourceDoc);
  assert(!rText.valid && rText.mismatches.includes('verificationEvidenceTextMissing'), 'Rejects empty evidenceText (verificationEvidenceTextMissing)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5: Bridge to Existing Claim Verification Engine (STEP 5-3, Section 10)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 5: Bridge to Existing Claim Verification Engine ---');

{
  const extractedDoc = createMockExtractedDoc();

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:2:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'cars_adjusted_ebit_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    supportType: 'reported_kpi',
    unit: 'percentage',
  });

  const matchingClaim: ClaimEvidenceLocator = {
    sourceDocId: 'test_ir_q2_2026',
    claimedValue: '4.0%',
    claimedMetricId: 'cars_adjusted_ebit_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const matchingSourceDoc: SourceDocument = {
    id: 'test_ir_q2_2026',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Q2 2026 Results',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://ir.example.com/reports/2026-q2.pdf',
    isVerified: true,
    verificationStatus: 'verified',
    lastChecked: '2026-07-31',
  };

  // Convert candidate to ClaimVerifiedResult
  const verificationResult = candidateToVerificationResult(candidate);

  assert(verificationResult.state === 'claim_verified', 'Bridged result has state: claim_verified');
  assert(verificationResult.verificationOrigin === 'live_source', 'Bridged result has verificationOrigin: live_source');
  assert(verificationResult.sourceContentHash === VALID_SHA256, 'Bridged result carries exact SHA-256 hash');

  // Verify against existing validateClaimVerificationResult()
  const valResult = validateClaimVerificationResult(
    matchingClaim,
    matchingSourceDoc,
    matchingClaim.claimedValue,
    verificationResult,
    'reported_kpi',
    {
      expectedNumericValue: matchingClaim.claimedNumericValue,
      requireContentHash: true,
      extractedLiveDocument: extractedDoc,
    }
  );

  assert(valResult.valid && valResult.mismatches.length === 0, 'Bridged result cleanly passes existing validateClaimVerificationResult() engine');

  // Tampering the candidate's bridged result fails the existing engine
  const tamperedResult = { ...verificationResult, verifiedMetricId: 'revenue' };
  const tamperedVal = validateClaimVerificationResult(
    matchingClaim,
    matchingSourceDoc,
    matchingClaim.claimedValue,
    tamperedResult,
    'reported_kpi',
    { requireContentHash: true, extractedLiveDocument: extractedDoc }
  );
  assert(!tamperedVal.valid && tamperedVal.mismatches.includes('verificationMetricMismatch'), 'Existing engine rejects tampered metric from bridged result');
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
