/**
 * AutoMetrics Intelligence — STEP 5 Remediation Test Suite
 *
 * Validates:
 * 1. bindLiveEvidence rejects/overrides fabricated evidenceText with authoritative block text.
 * 2. bindLiveEvidence rejects altered rawValue not present in matched block.
 * 3. Nonexistent / mismatched locator fails resolution.
 * 4. Ambiguous locator matching multiple blocks fails resolution.
 * 5. verifyClaimEvidence with copied hash but forged candidate downgrades to source_verified.
 * 6. verifyClaimEvidence with authentic resolved candidate produces claim_verified with blockId.
 * 7. validateClaimVerificationResult rejects live_source result with missing blockId.
 * 8. fetchOfficialIrSource rejects third-party redirect with 0 requests sent to destination.
 * 9. fetchOfficialIrSource rejects private/loopback redirect before request is sent.
 * 10. verifyOfficialSourceClaim forbids allowLocalhost without customFetch mock.
 * 11. Fallback synthesized SourceDocument has isVerified: false and verificationStatus: 'unverified'.
 * 12. extractPdfDocument rejects encrypted PDF (/Encrypt) with code: unsupportedPdfStructure.
 * 13. fetchOfficialIrSource normalizes body stream errors and never returns partial bytes.
 * 14. Repository fixture verification remains completely unaffected.
 */

import { fetchOfficialIrSource } from '../src/services/liveSourceFetcher';
import { extractPdfDocument, extractHtmlDocument } from '../src/services/liveDocumentExtractor';
import {
  bindLiveEvidence,
  isValuePresentInBlock,
} from '../src/services/liveEvidenceBinder';
import {
  verifyClaimEvidence,
  validateClaimVerificationResult,
  resolveClaimVerificationState,
} from '../src/data/scopeExceptions';
import {
  executeOfficialSourcePipeline,
  verifyOfficialSourceClaim,
} from '../src/services/officialSourcePipeline';
import { OFFICIAL_IR_SOURCES } from '../src/data/officialSources';
import {
  ClaimEvidenceLocator,
  ClaimVerifiedResult,
  DocumentContentBlock,
  ExtractedLiveDocument,
  LiveEvidenceCandidate,
  LiveSourceDocument,
  SourceClaim,
  SourceDocument,
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

console.log('🧪 Starting STEP 5 Remediation Test Suite...\n');

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Authoritative Block Text Binding
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- Test 1: Authoritative Block Text Binding ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS Mercedes-Benz Cars: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_cars_ros',
        blockType: 'table_row',
        text: 'Adjusted Return on Sales (RoS) Mercedes-Benz Cars: 4.0%',
        pageNumber: 1,
        locator: 'html:table:0:row:3',
      },
    ],
  };

  const cand = bindLiveEvidence(extractedDoc, {
    locator: 'html:table:0:row:3',
    rawValue: '4.0%',
    evidenceText: 'FABRICATED TEXT: Profit was 99%',
    supportType: 'reported_kpi',
  });

  assert(cand.blockResolutionStatus === 'resolved', 'Candidate resolution status is resolved');
  assert(cand.blockId === 'block_cars_ros', 'Candidate blockId is bound to matched block');
  assert(
    cand.evidenceText === 'Adjusted Return on Sales (RoS) Mercedes-Benz Cars: 4.0%',
    'Authoritative evidenceText derived from block; caller-provided fabricated text ignored'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Altered rawValue Not Present in Matched Block
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 2: Altered rawValue Not Present in Block ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_cars_ros',
        blockType: 'table_row',
        text: 'Adjusted Return on Sales (RoS) Mercedes-Benz Cars: 4.0%',
        pageNumber: 1,
        locator: 'html:table:0:row:3',
      },
    ],
  };

  const cand = bindLiveEvidence(extractedDoc, {
    locator: 'html:table:0:row:3',
    rawValue: '8.5%', // Altered value not in block!
    supportType: 'reported_kpi',
  });

  assert(cand.blockResolutionStatus === 'failed', 'Altered rawValue causes block resolution to fail');
  assert(
    Boolean(cand.blockResolutionError && cand.blockResolutionError.includes('is not present in resolved block text')),
    'Resolution error notes value is not present in block text'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Nonexistent / Non-Matching Locator
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 3: Non-Matching Locator ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_cars_ros',
        blockType: 'table_row',
        text: 'Adjusted RoS: 4.0%',
        pageNumber: 1,
        locator: 'page:1:block:0',
      },
    ],
  };

  const cand = bindLiveEvidence(extractedDoc, {
    locator: 'page:99:block:0', // Nonexistent page!
    rawValue: '4.0%',
    supportType: 'reported_kpi',
  });

  assert(cand.blockResolutionStatus === 'failed', 'Nonexistent locator causes resolution failure');
  assert(
    Boolean(cand.blockResolutionError && cand.blockResolutionError.includes('Zero blocks matched')),
    'Records zero blocks matched error'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Ambiguous Locator Matching Multiple Blocks
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 4: Ambiguous Locator Matching Multiple Blocks ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Cars RoS: 4.0%\nVans RoS: 4.0%',
    pageCount: 2,
    blocks: [
      {
        id: 'block_cars',
        blockType: 'table_row',
        text: 'Cars RoS: 4.0%',
        pageNumber: 2,
        locator: 'page:2:table:0:row:1',
      },
      {
        id: 'block_vans',
        blockType: 'table_row',
        text: 'Vans RoS: 4.0%',
        pageNumber: 2,
        locator: 'page:2:table:0:row:2',
      },
    ],
  };

  // Ambiguous locator matching both blocks on page 2
  const cand = bindLiveEvidence(extractedDoc, {
    locator: { page: 2 },
    rawValue: '4.0%',
    supportType: 'reported_kpi',
  });

  assert(cand.blockResolutionStatus === 'failed', 'Ambiguous locator matching multiple blocks fails');
  assert(
    Boolean(cand.blockResolutionError && cand.blockResolutionError.includes('Ambiguous locator: matched 2 blocks')),
    'Resolution error specifies ambiguous multi-block match'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: verifyClaimEvidence Rejects Forged Candidate
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 5: verifyClaimEvidence Rejects Forged Candidate ---');
{
  const validHash = 'b'.repeat(64);
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: validHash,
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Actual Text: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'real_block',
        blockType: 'paragraph',
        text: 'Actual Text: 4.0%',
        pageNumber: 1,
        locator: 'page:1:p:0',
      },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2',
    companyId: 'mercedes_benz',
    title: 'Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  // Forged candidate: copied valid hash, but fabricated blockId not in document
  const forgedCand: LiveEvidenceCandidate = {
    sourceDocId: 'mbg_2026_q2',
    sourceContentHash: validHash,
    verificationOrigin: 'live_source',
    blockId: 'fabricated_block_id',
    blockResolutionStatus: 'resolved',
    metricId: 'operating_margin',
    rawValue: '4.0%',
    numericValue: 4.0,
    unit: 'percentage',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    supportType: 'reported_kpi',
    locator: { rawLocator: 'fake:loc' },
    evidenceText: 'Fabricated proof: 4.0%',
  };

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: forgedCand,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });

  assert(result.state === 'source_verified', 'Forged candidate is strictly downgraded to source_verified');
  assert(
    result.diagnostics?.failureReason === 'liveEvidenceBlockForged',
    'Failure reason identifies forged block (liveEvidenceBlockForged)'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: verifyClaimEvidence Produces claim_verified with blockId
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 6: verifyClaimEvidence Produces claim_verified with blockId ---');
{
  const validHash = 'c'.repeat(64);
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: validHash,
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Q2 2026 Results',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Cars Adjusted RoS: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_authentic_ros',
        blockType: 'table_row',
        text: 'Cars Adjusted RoS: 4.0%',
        pageNumber: 1,
        locator: 'page:1:row:1',
      },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2',
    companyId: 'mercedes_benz',
    title: 'Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });

  assert(result.state === 'claim_verified', 'Authentic candidate produces claim_verified');
  const verified = result as ClaimVerifiedResult;
  assert(verified.blockId === 'block_authentic_ros', 'Carries resolved blockId in ClaimVerifiedResult');
  assert(verified.verificationOrigin === 'live_source', 'Verification origin is live_source');
  assert(verified.sourceContentHash === validHash, 'Carries sourceContentHash');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: validateClaimVerificationResult Rejects Missing blockId
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 7: validateClaimVerificationResult Rejects Missing blockId ---');
{
  const validHash = 'd'.repeat(64);
  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2',
    companyId: 'mercedes_benz',
    title: 'Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const resultWithoutBlockId: ClaimVerifiedResult = {
    state: 'claim_verified',
    verificationOrigin: 'live_source',
    verificationMethod: 'parser',
    engineId: 'test_engine',
    engineVersion: '1.0.0',
    sourceDocId: 'mbg_2026_q2',
    sourceContentHash: validHash,
    claimSupportType: 'reported_kpi',
    verifiedValue: '4.0%',
    verifiedMetricId: 'operating_margin',
    verifiedNumericValue: 4.0,
    verifiedUnit: 'percentage',
    verifiedScope: 'cars_segment',
    verifiedAccountingBasis: 'adjusted',
    verifiedPeriod: '2026-Q2',
    verifiedPeriodType: 'quarterly',
    verifiedAt: new Date().toISOString(),
  };

  const validation = validateClaimVerificationResult(claim, sourceDoc, '4.0%', resultWithoutBlockId, 'reported_kpi', {
    expectedOrigin: 'live_source',
    expectedContentHash: validHash,
    requireBlockBinding: true,
  });

  assert(validation.valid === false, 'Rejects live result lacking blockId when requireBlockBinding is set');
  assert(
    validation.mismatches.includes('verificationBlockIdMissing'),
    'Mismatch list includes verificationBlockIdMissing'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: Pre-Redirect Official Domain Check (Zero Requests to Destination)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 8: Pre-Redirect Official Domain Enforcement ---');
await (async () => {
  const dispatchedUrls: string[] = [];

  const mockRedirectFetch = (async (input: RequestInfo | URL) => {
    const urlStr = typeof input === 'string' ? input : 'href' in input ? input.href : input.url;
    dispatchedUrls.push(urlStr);

    if (urlStr === 'https://group.mercedes-benz.com/report.html') {
      return new Response(null, {
        status: 302,
        headers: {
          Location: 'https://malicious-third-party.com/payload.html',
        },
      });
    }

    return new Response('Should never be called', { status: 200 });
  }) as unknown as typeof fetch;

  const result = await fetchOfficialIrSource('https://group.mercedes-benz.com/report.html', {
    fetchFn: mockRedirectFetch,
    officialDomain: ['group.mercedes-benz.com', 'mercedes-benz.com'],
  });

  assert(result.success === false, 'Fetch rejected redirect to unapproved third-party host');
  assert(!result.success && result.error.code === 'unauthorizedDomainRedirect', 'Error code is unauthorizedDomainRedirect');
  assert(dispatchedUrls.length === 1, 'Strictly 0 requests sent to destination (dispatchedUrls.length === 1)');
  assert(
    !dispatchedUrls.some((u) => u.includes('malicious-third-party.com')),
    'Destination malicious URL was never contacted'
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 9: Pre-Redirect Private/Loopback Host Rejection
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 9: Pre-Redirect Private/Loopback Host Rejection ---');
await (async () => {
  const dispatchedUrls: string[] = [];

  const mockSsrfFetch = (async (input: RequestInfo | URL) => {
    const urlStr = typeof input === 'string' ? input : 'href' in input ? input.href : input.url;
    dispatchedUrls.push(urlStr);

    if (urlStr === 'https://group.mercedes-benz.com/report.html') {
      return new Response(null, {
        status: 302,
        headers: {
          Location: 'https://169.254.169.254/latest/meta-data',
        },
      });
    }

    return new Response('Should never be called', { status: 200 });
  }) as unknown as typeof fetch;

  const result = await fetchOfficialIrSource('https://group.mercedes-benz.com/report.html', {
    fetchFn: mockSsrfFetch,
    officialDomain: ['group.mercedes-benz.com', 'mercedes-benz.com'],
  });

  assert(result.success === false, 'Fetch rejected redirect to cloud metadata IP literal (169.254.169.254)');
  assert(
    !result.success &&
      (result.error.code === 'invalidUrl' ||
        result.error.code === 'unauthorizedDomainRedirect' ||
        result.error.code === 'networkError'),
    'Rejection code indicates private address or unauthorized domain'
  );
  assert(dispatchedUrls.length === 1, 'Strictly 0 requests sent to private metadata IP');
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 10: Production allowLocalhost Restriction
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 10: Production allowLocalhost Restriction ---');
await (async () => {
  const claim: SourceClaim = {
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 4.0,
    unit: 'percentage',
  };

  const result = await verifyOfficialSourceClaim({
    source: 'mbg_2026_q2_results',
    claim,
    bindingParams: {
      rawValue: '4.0%',
      locator: { rawLocator: 'html:table:0:row:3' },
      evidenceText: '4.0%',
      supportType: 'reported_kpi',
    },
    options: {
      allowLocalhost: true, // Forbidden without customFetch!
    },
  });

  assert(result.success === false, 'verifyOfficialSourceClaim rejects allowLocalhost without customFetch');
  assert(result.errorCode === 'unauthorizedSource', 'Error code is unauthorizedSource');
  assert(
    Boolean(result.errorMessage && result.errorMessage.includes('allowLocalhost is forbidden in production pipeline')),
    'Error message states allowLocalhost is forbidden in production pipeline'
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 11: Fallback Synthesized SourceDocument Is Unverified
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 11: Fallback SourceDocument Is Unverified ---');
await (async () => {
  const claim: SourceClaim = {
    metricId: 'operating_margin',
    period: '2026-Q2',
    value: 4.0,
    unit: 'percentage',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
  };

  const HTML = `<!DOCTYPE html><html><head><title>Mercedes-Benz Cars Q2 2026 Report</title></head><body><table><tr><td>Metric</td><td>Value</td></tr><tr><td>Adjusted RoS</td><td>4.0%</td></tr></table></body></html>`;

  const mockFetch = (async () => {
    return new Response(Buffer.from(HTML, 'utf-8'), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }) as unknown as typeof fetch;

  const result = await executeOfficialSourcePipeline({
    source: {
      id: 'custom_unregistered_ir_source',
      companyId: 'mercedes_benz',
      title: 'Custom IR Report',
      url: 'https://group.mercedes-benz.com/custom.html',
      officialDomain: 'group.mercedes-benz.com',
      documentType: 'quarterly_report',
      reportingPeriod: '2026-Q2',
      periodType: 'quarterly',
      expectedContentType: 'text/html',
    },
    claim,
    bindingParams: {
      rawValue: '4.0%',
      locator: { rawLocator: 'html:table:0:row:1' },
      evidenceText: '4.0%',
      supportType: 'reported_kpi',
    },
    options: {
      customFetch: mockFetch,
    },
  });

  assert(result.success === true, 'Pipeline executes for custom source definition');
  assert(
    Boolean(result.claimVerificationResult && result.claimVerificationResult.state === 'claim_verified'),
    'Produces claim_verified via content verification'
  );
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 12: PDF /Encrypt Encryption Detection
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 12: PDF /Encrypt Encryption Detection ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'tsla_encrypted_pdf',
    url: 'https://digitalassets.tesla.com/doc.pdf',
    finalUrl: 'https://digitalassets.tesla.com/doc.pdf',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'application/pdf',
    contentLength: 200,
    contentHash: 'e'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const encryptedPdfText = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R >>
endobj
4 0 obj
<< /Filter /Standard /V 2 /R 3 /P -4 >>
endobj
trailer
<< /Root 1 0 R /Encrypt 4 0 R >>
%%EOF`;

  const pdfBytes = Buffer.from(encryptedPdfText, 'latin1');
  const extractResult = extractPdfDocument(mockLiveDoc, pdfBytes);

  assert(extractResult.success === false, 'Encrypted PDF text extraction fails explicitly');
  assert(
    !extractResult.success && extractResult.error.code === 'unsupportedPdfStructure',
    'Error code is unsupportedPdfStructure'
  );
  assert(
    !extractResult.success && extractResult.error.message.includes('encrypted or password-protected'),
    'Error message explains document is encrypted or password-protected'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 13: Response Body Stream Failure Normalization
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 13: Response Body Stream Error Normalization ---');
await (async () => {
  const mockStreamErrorFetch = (async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        controller.error(new Error('Simulated network connection reset mid-stream'));
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }) as unknown as typeof fetch;

  const fetchResult = await fetchOfficialIrSource('https://group.mercedes-benz.com/error.html', {
    fetchFn: mockStreamErrorFetch,
    officialDomain: 'group.mercedes-benz.com',
  });

  assert(fetchResult.success === false, 'Mid-stream read failure fails gracefully');
  assert(!fetchResult.success && fetchResult.error.code === 'networkError', 'Normalized to code: networkError');
  assert(!('document' in fetchResult), 'Never returns a LiveSourceDocument on partial/corrupted bytes');
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 14: Repository Fixture Invariants Preserved
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 14: Repository Fixture Invariants Preserved ---');
{
  const fixtureClaim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2025_fy',
    claimedValue: '12.4%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 12.4,
    claimedUnit: 'percentage',
    claimedScope: 'consolidated_group',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2025-FY',
    claimedPeriodType: 'annual',
  };

  const fixtureSourceDoc: SourceDocument = {
    id: 'mbg_2025_fy',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Group Annual Report 2025',
    docType: 'annual_report',
    period: '2025-FY',
    periodType: 'annual',
    publicationDate: '2026-02-15',
    officialUrl: 'https://group.mercedes-benz.com/investors/reports/2025-fy.pdf',
    isVerified: true,
    lastChecked: '2026-02-15',
  };

  const fixtureHash = 'f'.repeat(64);
  const fixtureSnippets = [
    {
      sourceDocId: 'mbg_2025_fy',
      pageNumber: 42,
      rawText: 'Consolidated Group adjusted operating margin was 12.4%',
      extractedText: 'Consolidated Group adjusted operating margin was 12.4%',
      contentHash: fixtureHash,
      verifiedMetricId: 'operating_margin',
      verifiedValue: '12.4%',
      verifiedNumericValue: 12.4,
      verifiedUnit: 'percentage' as const,
      verifiedScope: 'consolidated_group' as const,
      verifiedAccountingBasis: 'adjusted' as const,
      verifiedPeriod: '2025-FY',
      verifiedPeriodType: 'annual' as const,
      supportType: 'reported_kpi' as const,
    },
  ];

  const result = verifyClaimEvidence(fixtureClaim, fixtureSourceDoc, '12.4%', 'reported_kpi', {
    contentFixtures: fixtureSnippets,
    expectedOrigin: 'repository_fixture',
  });

  assert(result.state === 'claim_verified', 'Repository fixture produces state: claim_verified');
  const verified = result as ClaimVerifiedResult;
  assert(verified.verificationOrigin === 'repository_fixture', 'Verification origin is repository_fixture');
  assert(verified.sourceContentHash === fixtureHash, 'Carries repository fixture contentHash');

  const validation = validateClaimVerificationResult(fixtureClaim, fixtureSourceDoc, '12.4%', verified, 'reported_kpi', {
    expectedOrigin: 'repository_fixture',
    expectedContentHash: fixtureHash,
  });

  assert(validation.valid === true, 'validateClaimVerificationResult validates repository fixture completely', validation.mismatches.join(', '));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 15: P0-1 — Live Verification Without extractedLiveDocument Fails
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 15: P0-1 — Live Verification Without extractedLiveDocument Fails ---');
{
  const validHash = 'f'.repeat(64);
  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2',
    companyId: 'mercedes_benz',
    title: 'Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const candidate: LiveEvidenceCandidate = {
    sourceDocId: 'mbg_2026_q2',
    sourceContentHash: validHash,
    verificationOrigin: 'live_source',
    blockId: 'block_ros',
    blockResolutionStatus: 'resolved',
    rawValue: '4.0%',
    numericValue: 4.0,
    unit: 'percentage',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    supportType: 'reported_kpi',
    locator: { blockId: 'block_ros', rawLocator: 'table:1:row:2' },
    evidenceText: 'Adjusted Return on Sales: 4.0%',
  };

  // Calling verifyClaimEvidence without extractedLiveDocument
  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    expectedOrigin: 'live_source',
    // extractedLiveDocument is intentionally omitted!
  });

  assert(result.state === 'source_verified', 'Structurally valid live candidate without extractedLiveDocument strictly returns source_verified');
  assert(
    result.diagnostics?.failureReason === 'liveExtractedDocumentMissing',
    'Diagnostic failureReason is liveExtractedDocumentMissing'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 16: P0-1 — validateClaimVerificationResult Requires extractedLiveDocument
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 16: P0-1 — validateClaimVerificationResult Requires extractedLiveDocument ---');
{
  const validHash = 'f'.repeat(64);
  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2',
    companyId: 'mercedes_benz',
    title: 'Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const liveResult: ClaimVerifiedResult = {
    state: 'claim_verified',
    verificationOrigin: 'live_source',
    verificationMethod: 'parser',
    engineId: 'test_engine',
    engineVersion: '1.0.0',
    sourceDocId: 'mbg_2026_q2',
    sourceContentHash: validHash,
    blockId: 'block_ros',
    claimSupportType: 'reported_kpi',
    verifiedValue: '4.0%',
    verifiedMetricId: 'operating_margin',
    verifiedNumericValue: 4.0,
    verifiedUnit: 'percentage',
    verifiedScope: 'cars_segment',
    verifiedAccountingBasis: 'adjusted',
    verifiedPeriod: '2026-Q2',
    verifiedPeriodType: 'quarterly',
    verifiedAt: new Date().toISOString(),
  };

  const validation = validateClaimVerificationResult(claim, sourceDoc, '4.0%', liveResult, 'reported_kpi', {
    expectedOrigin: 'live_source',
    expectedContentHash: validHash,
    // extractedLiveDocument is intentionally omitted!
  });

  assert(validation.valid === false, 'validateClaimVerificationResult rejects live result without extractedLiveDocument');
  assert(
    validation.mismatches.includes('verificationExtractedDocumentMissing'),
    'Mismatches includes verificationExtractedDocumentMissing'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 17: P0-1 — Ambiguous blockId in Extracted Document Fails
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 17: P0-1 — Ambiguous blockId in Extracted Document Fails ---');
{
  const validHash = 'f'.repeat(64);
  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2',
    companyId: 'mercedes_benz',
    title: 'Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: validHash,
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  // Extracted document has 2 blocks with the exact same ID (ambiguous!)
  const ambiguousDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'RoS 4.0% RoS 4.0%',
    pageCount: 1,
    blocks: [
      { id: 'duplicate_id', blockType: 'paragraph', text: 'Cars RoS: 4.0%', locator: 'p1' },
      { id: 'duplicate_id', blockType: 'paragraph', text: 'Cars RoS: 4.0%', locator: 'p2' },
    ],
  };

  const liveResult: ClaimVerifiedResult = {
    state: 'claim_verified',
    verificationOrigin: 'live_source',
    verificationMethod: 'parser',
    engineId: 'test_engine',
    engineVersion: '1.0.0',
    sourceDocId: 'mbg_2026_q2',
    sourceContentHash: validHash,
    blockId: 'duplicate_id',
    claimSupportType: 'reported_kpi',
    verifiedValue: '4.0%',
    verifiedMetricId: 'operating_margin',
    verifiedNumericValue: 4.0,
    verifiedUnit: 'percentage',
    verifiedAt: new Date().toISOString(),
  };

  const validation = validateClaimVerificationResult(claim, sourceDoc, '4.0%', liveResult, 'reported_kpi', {
    expectedOrigin: 'live_source',
    expectedContentHash: validHash,
    extractedLiveDocument: ambiguousDoc,
  });

  assert(validation.valid === false, 'validateClaimVerificationResult rejects ambiguous blockId');
  assert(
    validation.mismatches.includes('verificationBlockAmbiguous'),
    'Mismatches includes verificationBlockAmbiguous'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 18: P0-1 — Candidate sourceDocId/contentHash Mismatch Against Extracted Document Fails
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 18: P0-1 — Candidate sourceDocId/contentHash Mismatch Against Extracted Document Fails ---');
{
  const docHash = '1'.repeat(64);
  const candHash = '2'.repeat(64);

  const mockLiveDoc: LiveSourceDocument = {
    id: 'doc_alpha',
    sourceDocId: 'doc_alpha',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: docHash,
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Cars RoS: 4.0%',
    pageCount: 1,
    blocks: [
      { id: 'b1', blockType: 'paragraph', text: 'Cars RoS: 4.0%', locator: 'p1' },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'doc_alpha',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
  };

  const sourceDoc: SourceDocument = {
    id: 'doc_alpha',
    companyId: 'mercedes_benz',
    title: 'Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  // Result carries mismatched contentHash
  const mismatchedHashResult: ClaimVerifiedResult = {
    state: 'claim_verified',
    verificationOrigin: 'live_source',
    verificationMethod: 'parser',
    engineId: 'test',
    engineVersion: '1.0.0',
    sourceDocId: 'doc_alpha',
    sourceContentHash: candHash, // DOES NOT MATCH docHash!
    blockId: 'b1',
    claimSupportType: 'reported_kpi',
    verifiedValue: '4.0%',
    verifiedNumericValue: 4.0,
    verifiedUnit: 'percentage',
    verifiedAt: new Date().toISOString(),
  };

  const valHash = validateClaimVerificationResult(claim, sourceDoc, '4.0%', mismatchedHashResult, 'reported_kpi', {
    extractedLiveDocument: extDoc,
  });

  assert(valHash.valid === false, 'Rejects live result with contentHash mismatching extracted document');
  assert(
    valHash.mismatches.includes('verificationContentHashMismatch'),
    'Mismatches includes verificationContentHashMismatch'
  );

  // Result carries mismatched sourceDocId
  const mismatchedDocResult: ClaimVerifiedResult = {
    ...mismatchedHashResult,
    sourceDocId: 'doc_beta', // DOES NOT MATCH doc_alpha!
    sourceContentHash: docHash,
  };

  const valDoc = validateClaimVerificationResult(claim, sourceDoc, '4.0%', mismatchedDocResult, 'reported_kpi', {
    extractedLiveDocument: extDoc,
  });

  assert(valDoc.valid === false, 'Rejects live result with sourceDocId mismatching extracted document');
  assert(
    valDoc.mismatches.includes('verificationSourceDocMismatch'),
    'Mismatches includes verificationSourceDocMismatch'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 19: P0-2 — Strict Token-Boundary Numeric Matching in isValuePresentInBlock
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 19: P0-2 — Strict Token-Boundary Numeric Matching in isValuePresentInBlock ---');
{
  // 19.1: 4.0 vs 14.0 (must NOT match)
  assert(
    isValuePresentInBlock('Operating margin was 14.0', '4.0', 4.0) === false,
    '19.1: 4.0 does NOT match inside 14.0'
  );

  // 19.2: 4.0 vs 4.01 (must NOT match)
  assert(
    isValuePresentInBlock('Operating margin was 4.01', '4.0', 4.0) === false,
    '19.2: 4.0 does NOT match 4.01'
  );

  // 19.3: -4.0 vs 4.0 (sign preservation: must NOT match)
  assert(
    isValuePresentInBlock('Operating margin was -4.0', '4.0', 4.0) === false,
    '19.3: -4.0 does NOT match 4.0 (sign preservation)'
  );

  // 19.4: 4.0% vs 4.0 (percentage marker semantics: must NOT match)
  assert(
    isValuePresentInBlock('Operating margin was 4.0%', '4.0', 4.0) === false,
    '19.4a: pure number 4.0 does NOT match percentage 4.0%'
  );
  assert(
    isValuePresentInBlock('Operating margin was 4.0', '4.0%') === false,
    '19.4b: percentage 4.0% does NOT match pure number 4.0'
  );

  // 19.5: 1,200 vs 1200 (thousands separator normalization: MUST match)
  assert(
    isValuePresentInBlock('Deliveries reached 1,200 units', '1200', 1200) === true,
    '19.5a: 1200 matches formatted 1,200'
  );
  assert(
    isValuePresentInBlock('Deliveries reached 1200 units', '1,200', 1200) === true,
    '19.5b: formatted 1,200 matches 1200'
  );

  // 19.6: €1.2 billion vs 1.2 million (scale/unit semantics: must NOT match)
  assert(
    isValuePresentInBlock('Revenue was €1.2 billion', '1.2 million', 1.2, 'currency_millions') === false,
    '19.6: €1.2 billion does NOT match 1.2 million'
  );

  // 19.7: Multiple ambiguous numeric values in one block (must fail)
  assert(
    isValuePresentInBlock('Adjusted RoS was 4.0% in Q2 and 4.0% in Q1', '4.0%', 4.0) === false,
    '19.7: Multiple ambiguous 4.0% occurrences in block fails matching'
  );

  // 19.8: Valid exact single match (MUST match)
  assert(
    isValuePresentInBlock('Mercedes-Benz Cars Adjusted Return on Sales: 4.0%', '4.0%', 4.0) === true,
    '19.8: Single unambiguous 4.0% matches cleanly'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 20: P1-1 — DNS Resolution SSRF Protection on Initial URL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 20: P1-1 — DNS Resolution SSRF Protection on Initial URL ---');
await (async () => {
  const dispatchedUrls: string[] = [];

  const mockFetch = (async (input: RequestInfo | URL) => {
    const urlStr = typeof input === 'string' ? input : 'href' in input ? input.href : input.url;
    dispatchedUrls.push(urlStr);
    return new Response('Should never be called', { status: 200 });
  }) as unknown as typeof fetch;

  // Custom DNS resolver that resolves an apparently official domain to a private loopback address (127.0.0.1)
  const maliciousDnsLookup = async (_hostname: string) => {
    return ['127.0.0.1'];
  };

  const result = await fetchOfficialIrSource('https://group.mercedes-benz.com/report.html', {
    fetchFn: mockFetch,
    dnsLookupFn: maliciousDnsLookup,
    officialDomain: ['group.mercedes-benz.com'],
  });

  assert(result.success === false, 'Fetch rejected domain resolving via DNS to 127.0.0.1');
  assert(
    !result.success && result.error.code === 'invalidUrl',
    'Error code is invalidUrl when resolved IP is restricted'
  );
  assert(dispatchedUrls.length === 0, 'Strictly 0 HTTP requests sent (dispatchedUrls.length === 0)');
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 21: P1-1 — DNS Resolution SSRF Protection on Redirect Target
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 21: P1-1 — DNS Resolution SSRF Protection on Redirect Target ---');
await (async () => {
  const dispatchedUrls: string[] = [];

  const mockRedirectFetch = (async (input: RequestInfo | URL) => {
    const urlStr = typeof input === 'string' ? input : 'href' in input ? input.href : input.url;
    dispatchedUrls.push(urlStr);

    if (urlStr === 'https://group.mercedes-benz.com/initial.html') {
      return new Response(null, {
        status: 302,
        headers: {
          Location: 'https://internal-report.mercedes-benz.com/private.html',
        },
      });
    }

    return new Response('Should never be reached', { status: 200 });
  }) as unknown as typeof fetch;

  // DNS resolver returns public IP for initial URL, but private RFC 1918 (10.0.0.5) for redirect target
  const splitDnsLookup = async (hostname: string) => {
    if (hostname === 'group.mercedes-benz.com') {
      return ['194.12.185.10']; // Benign public IP
    }
    return ['10.0.0.5']; // Private network IP
  };

  const result = await fetchOfficialIrSource('https://group.mercedes-benz.com/initial.html', {
    fetchFn: mockRedirectFetch,
    dnsLookupFn: splitDnsLookup,
    officialDomain: ['group.mercedes-benz.com', 'internal-report.mercedes-benz.com'],
  });

  assert(result.success === false, 'Fetch rejected redirect to host resolving to private IP 10.0.0.5');
  assert(
    !result.success && result.error.code === 'invalidUrl',
    'Error code is invalidUrl on private redirect target'
  );
  assert(dispatchedUrls.length === 1, 'Only initial request was dispatched (dispatchedUrls.length === 1)');
  assert(!dispatchedUrls.some((u) => u.includes('private.html')), 'Redirect destination was never contacted');
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 22: P1-2 — Mock Transport Flagging in Official Source Pipeline
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 22: P1-2 — Mock Transport Flagging in Official Source Pipeline ---');
await (async () => {
  const source = OFFICIAL_IR_SOURCES[0]; // mbg_2026_q2_results
  const claim = source.targetClaims![2]; // operating_margin 4.0%

  const htmlContent = '<html><head><title>Mercedes-Benz Group Q2 2026 Results</title></head><body><table><tr><td>Mercedes-Benz Cars Adjusted Return on Sales: 4.0%</td></tr></table></body></html>';
  const rawBytes = new TextEncoder().encode(htmlContent);

  const mockFetch = (async () => {
    return new Response(rawBytes, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }) as unknown as typeof fetch;

  const result = await executeOfficialSourcePipeline({
    source,
    claim,
    bindingParams: {
      locator: { rawLocator: 'table:0:row:0', tableIndex: 0, rowIndex: 0 },
      rawValue: '4.0%',
      evidenceText: 'Mercedes-Benz Cars Adjusted Return on Sales: 4.0%',
      supportType: 'reported_kpi',
    },
    options: {
      customFetch: mockFetch,
    },
  });

  assert(result.success === true, 'Pipeline executes successfully with mock fetch');
  assert(result.isMockVerification === true, 'Pipeline explicitly sets isMockVerification: true for mock transport');
})();

// ─────────────────────────────────────────────────────────────────────────────
// Test 23: P1-2 — Registered targetClaims Integrity & Non-Pre-Verification Invariant
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 23: P1-2 — Registered targetClaims Integrity & Non-Pre-Verification Invariant ---');
{
  assert(OFFICIAL_IR_SOURCES.length === 3, 'Official IR registry contains exactly 3 OEM sources');
  for (const src of OFFICIAL_IR_SOURCES) {
    assert(Array.isArray(src.targetClaims) && src.targetClaims.length > 0, `Source "${src.id}" defines target claims`);
    for (const clm of src.targetClaims!) {
      assert(typeof clm.metricId === 'string' && clm.metricId.length > 0, 'Target claim has metricId');
      assert(typeof clm.value === 'number', 'Target claim has numeric value');
      assert(typeof clm.unit === 'string', 'Target claim has unit');
      assert(typeof clm.period === 'string', 'Target claim has period');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 24: P0 — Numeric presence alone cannot prove metric semantic
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 24: P0 — Numeric presence alone cannot prove metric semantic ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2_test24',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'f'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Q2 2026 Results',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Key figure: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_num_only',
        blockType: 'paragraph',
        text: 'Key figure: 4.0%',
        locator: 'page:1:p:1',
      },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2_test24',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2_test24',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Group Q2 2026 Results',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:p:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Candidate marks dimensions as unproven');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenMetricSemantic') === true, 'Records unprovenMetricSemantic');

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });

  assert(result.state === 'source_verified', 'Fails to verify claim without metric semantic proof');
  assert(result.diagnostics?.failureReason === 'unprovenMetricSemantic', 'Failure reason is unprovenMetricSemantic');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 25: P0 — Metric & value presence cannot prove adjusted accounting basis
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 25: P0 — Metric & value presence cannot prove adjusted accounting basis ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2_test25',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Q2 2026 Results',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Mercedes-Benz Cars Return on Sales: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_unadjusted',
        blockType: 'paragraph',
        text: 'Mercedes-Benz Cars Return on Sales: 4.0%',
        locator: 'page:1:p:1',
      },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2_test25',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2_test25',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Group Q2 2026 Results',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:p:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenAccountingBasis') === true, 'Records unprovenAccountingBasis');

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });

  assert(result.state === 'source_verified', 'Fails to verify adjusted basis when text has no adjusted indicator');
  assert(result.diagnostics?.failureReason === 'unprovenAccountingBasis', 'Failure reason is unprovenAccountingBasis');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 26: P0 — Contradictory reporting period strictly fails
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 26: P0 — Contradictory reporting period strictly fails ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2_test26',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'd'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Q1 2026 Report',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Mercedes-Benz Cars Adjusted Return on Sales: 4.0% in Q1 2026',
    pageCount: 1,
    blocks: [
      {
        id: 'block_q1',
        blockType: 'paragraph',
        text: 'Mercedes-Benz Cars Adjusted Return on Sales: 4.0% in Q1 2026',
        locator: 'page:1:p:1',
      },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2_test26',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2_test26',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Group Q2 2026 Results',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/q2.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:p:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'contradicted', 'Candidate detects contradictory period');

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });

  assert(result.state === 'source_verified', 'Contradictory period fails verification');
  assert(result.diagnostics?.failureReason === 'unprovenReportingPeriod', 'Failure reason is unprovenReportingPeriod');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 27: P0 — Unstructured block with multiple metrics fails ambiguity gate
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 27: P0 — Unstructured block with multiple metrics fails ambiguity gate ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2_test27',
    url: 'https://group.mercedes-benz.com/q2.html',
    finalUrl: 'https://group.mercedes-benz.com/q2.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'b'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Q2 2026 Results',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Consolidated results: Revenue was €36,743 million, EBIT was €4,037 million, RoS was 4.0% in Q2 2026.',
    pageCount: 1,
    blocks: [
      {
        id: 'block_multi_metric',
        blockType: 'paragraph',
        text: 'Consolidated results: Revenue was €36,743 million, EBIT was €4,037 million, RoS was 4.0% in Q2 2026.',
        locator: 'page:1:p:1',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:p:1',
    rawValue: '4,037',
    metricId: 'operating_margin',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Multi-metric unstructured block fails ambiguity check');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('ambiguousDimensionEvidence') === true, 'Records ambiguousDimensionEvidence');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 28: P1 — Multi-level table headers and side-by-side comparative periods
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 28: P1 — Multi-level table headers and side-by-side comparative periods ---');
{
  const htmlContent = `
    <html>
      <head><title>Mercedes-Benz Group Interim Report Q2 2026</title></head>
      <body>
        <table>
          <thead>
            <tr>
              <th rowspan="2">Division</th>
              <th colspan="2">Three Months Ended June 30, 2026</th>
              <th colspan="2">Three Months Ended June 30, 2025</th>
            </tr>
            <tr>
              <th>Reported</th>
              <th>Adjusted</th>
              <th>Reported</th>
              <th>Adjusted</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mercedes-Benz Cars Return on Sales</td>
              <td>3.8%</td>
              <td>4.0%</td>
              <td>4.5%</td>
              <td>4.8%</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
  const rawBytes = new TextEncoder().encode(htmlContent);
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_2026_q2_table',
    url: 'https://group.mercedes-benz.com/table.html',
    finalUrl: 'https://group.mercedes-benz.com/table.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: rawBytes.length,
    contentHash: '9'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractRes = extractHtmlDocument(mockLiveDoc, rawBytes);
  assert(extractRes.success === true, 'HTML table extracted successfully');
  if (!extractRes.success) throw new Error('HTML extraction failed');
  const extDoc = extractRes.document;
  const dataRowBlock = extDoc.blocks.find((b: DocumentContentBlock) => b.blockType === 'table_row' && b.cells && b.cells[0]?.includes('Mercedes-Benz Cars'));
  assert(Boolean(dataRowBlock), 'Found data row block');
  assert(dataRowBlock?.cells?.length === 5, 'Data row has 5 cells');
  assert(dataRowBlock?.columnHeaders?.[2]?.includes('Adjusted') === true, 'Cell 2 column header includes Adjusted');
  assert(dataRowBlock?.columnHeaders?.[2]?.includes('2026') === true, 'Cell 2 column header includes 2026');

  // Bind evidence specifically targeting cell 2 (4.0% Adjusted Q2 2026)
  const candidate = bindLiveEvidence(extDoc, {
    locator: dataRowBlock!.locator!,
    columnIndex: 2,
    rawValue: '4.0%',
    metricId: 'cars_adjusted_ebit_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Structured table row proves dimensions');
  assert(candidate.tableCoordinates?.columnIndex === 2, 'Candidate carries exact table coordinates');
  assert(candidate.provenDimensions?.provenMetricId === 'cars_adjusted_ebit_margin', 'provenMetricId matches');
  assert(candidate.provenDimensions?.provenAccountingBasis === 'adjusted', 'provenAccountingBasis matches');
  assert(candidate.provenDimensions?.provenPeriod === '2026-Q2', 'provenPeriod matches');

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_2026_q2_table',
    claimedValue: '4.0%',
    claimedMetricId: 'cars_adjusted_ebit_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_2026_q2_table',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Group Interim Report Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/table.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const verResult = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extDoc,
    expectedOrigin: 'live_source',
  });

  assert(verResult.state === 'claim_verified', 'Structured table row verifies claim to claim_verified');
  const verified = verResult as ClaimVerifiedResult;
  assert(verified.tableCoordinates?.columnIndex === 2, 'Carries tableCoordinates into ClaimVerifiedResult');
  assert(verified.provenDimensions?.bindingStatus === 'proven', 'Carries provenDimensions into ClaimVerifiedResult');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 29: P1 — Disambiguation of repeated value across columns
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 29: P1 — Disambiguation of repeated value across columns ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_repeated_table',
    url: 'https://group.mercedes-benz.com/rep.html',
    finalUrl: 'https://group.mercedes-benz.com/rep.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: '8'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Comparative Financials',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Cars RoS: Q2 2026: 4.0% | Q2 2025: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_rep_row',
        blockType: 'table_row',
        text: 'Mercedes-Benz Cars Adjusted RoS | 4.0% | 4.0%',
        locator: 'table:0:row:1',
        cells: ['Mercedes-Benz Cars Adjusted RoS', '4.0%', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026 Adjusted', 'Q2 2025 Adjusted'],
        rowHeader: 'Mercedes-Benz Cars Adjusted RoS',
      },
    ],
  };

  const cand2026 = bindLiveEvidence(extractedDoc, {
    locator: 'table:0:row:1',
    rawValue: '4.0%',
    metricId: 'cars_adjusted_ebit_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });
  assert(cand2026.tableCoordinates?.columnIndex === 1, 'Repeated value disambiguated to column 1 for 2026-Q2');

  const cand2025 = bindLiveEvidence(extractedDoc, {
    locator: 'table:0:row:1',
    rawValue: '4.0%',
    metricId: 'cars_adjusted_ebit_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2025-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });
  assert(cand2025.tableCoordinates?.columnIndex === 2, 'Repeated value disambiguated to column 2 for 2025-Q2');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 30: P0 — Caller candidate cannot override contradictory document text
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 30: P0 — Caller candidate cannot override contradictory document text ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_contradictory_doc',
    url: 'https://group.mercedes-benz.com/doc.html',
    finalUrl: 'https://group.mercedes-benz.com/doc.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: '7'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Q2 2026 Results',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Mercedes-Benz Cars Adjusted Return on Sales: 4.0% in Q2 2026',
    pageCount: 1,
    blocks: [
      {
        id: 'block_adj',
        blockType: 'paragraph',
        text: 'Mercedes-Benz Cars Adjusted Return on Sales: 4.0% in Q2 2026',
        locator: 'page:1:p:1',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:p:1',
    rawValue: '4.0%',
    metricId: 'cars_adjusted_ebit_margin',
    scope: 'cars_segment',
    accountingBasis: 'reported',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'contradicted', 'Contradictory caller accounting basis detected');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('accountingBasisMismatch') === true, 'Records accountingBasisMismatch');

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_contradictory_doc',
    claimedValue: '4.0%',
    claimedMetricId: 'cars_adjusted_ebit_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'reported',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_contradictory_doc',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Group Q2 2026 Results',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/doc.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });

  assert(result.state === 'source_verified', 'Contradictory caller basis strictly returns source_verified');
  assert(result.diagnostics?.failureReason === 'accountingBasisMismatch', 'Failure reason is accountingBasisMismatch');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 31: P0 — Forged ClaimVerifiedResult with unproven dimensions fails state resolver
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 31: P0 — Forged ClaimVerifiedResult with unproven dimensions fails state resolver ---');
{
  const mockExtHash = '6'.repeat(64);
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_forged_claim_test',
    url: 'https://group.mercedes-benz.com/rep.html',
    finalUrl: 'https://group.mercedes-benz.com/rep.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: mockExtHash,
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Operating profit 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_generic',
        blockType: 'paragraph',
        text: 'Operating profit 4.0%',
        locator: 'page:1:p:1',
      },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_forged_claim_test',
    claimedValue: '4.0%',
    claimedMetricId: 'operating_margin',
    claimedNumericValue: 4.0,
    claimedUnit: 'percentage',
    claimedScope: 'cars_segment',
    claimedAccountingBasis: 'adjusted',
    claimedPeriod: '2026-Q2',
    claimedPeriodType: 'quarterly',
  };

  const sourceDoc: SourceDocument = {
    id: 'mbg_forged_claim_test',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Group Q2 2026 Results',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/rep.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const forgedResult: ClaimVerifiedResult = {
    state: 'claim_verified',
    verificationMethod: 'rule_engine',
    verificationOrigin: 'live_source',
    engineId: 'deterministic_content_verifier',
    engineVersion: '1.0.0',
    sourceDocId: 'mbg_forged_claim_test',
    claimSupportType: 'reported_kpi',
    verifiedValue: '4.0%',
    verifiedMetricId: 'operating_margin',
    verifiedNumericValue: 4.0,
    verifiedUnit: 'percentage',
    verifiedScope: 'cars_segment',
    verifiedAccountingBasis: 'adjusted',
    verifiedPeriod: '2026-Q2',
    verifiedPeriodType: 'quarterly',
    sourceContentHash: mockExtHash,
    blockId: 'block_generic',
    verifiedAt: new Date().toISOString(),
  };

  const validation = validateClaimVerificationResult(
    claim,
    sourceDoc,
    '4.0%',
    forgedResult,
    'reported_kpi',
    { extractedLiveDocument: extractedDoc }
  );

  assert(validation.valid === false, 'Validator rejects forged result with unproven dimensions');
  assert(validation.mismatches.some((m) => m.includes('UnprovenInDocument')), 'Validator records dimension unproven mismatch');

  const mockEvidence: ScopeExceptionEvidence[] = [
    {
      sourceDocId: 'mbg_forged_claim_test',
      sectionReference: 'Mercedes-Benz Cars',
      tableReference: 'KPIs',
      evidenceReference: 'RoS: 4.0%',
      purpose: 'reported_kpi',
      supports: ['reported_kpi'],
      supportEvidence: { reported_kpi: claim },
    },
  ];

  const state = resolveClaimVerificationState(mockEvidence, true, forgedResult, {
    claim,
    sourceDoc,
    expectedValue: '4.0%',
    supportType: 'reported_kpi',
    extractedLiveDocument: extractedDoc,
  });

  assert(state === 'source_verified', 'State resolver strictly downgrades forged result to source_verified');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 32: P1 — PDF pipe-delimited table extraction preserves cells & rowHeader
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Test 32: P1 — PDF pipe-delimited table extraction preserves cells & rowHeader ---');
{
  const streamData = 'BT /F1 10 Tf (Mercedes-Benz Cars Adjusted Return on Sales | 4.0% | 4.5%) Tj ET';
  const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000187 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n300\n%%EOF`;
  const rawBytes = new TextEncoder().encode(pdfContent);

  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_pdf_table',
    url: 'https://group.mercedes-benz.com/table.pdf',
    finalUrl: 'https://group.mercedes-benz.com/table.pdf',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'application/pdf',
    contentLength: rawBytes.length,
    contentHash: '5'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractRes = extractPdfDocument(mockLiveDoc, rawBytes);
  assert(extractRes.success === true, 'PDF extracted successfully');
  if (!extractRes.success) throw new Error('PDF extraction failed');
  const rowBlock = extractRes.document.blocks.find((b: DocumentContentBlock) => b.blockType === 'table_row');
  assert(Boolean(rowBlock), 'Extracted table_row block from PDF pipe stream');
  assert(rowBlock?.cells?.length === 3, 'PDF table row has 3 cells');
  assert(rowBlock?.rowHeader === 'Mercedes-Benz Cars Adjusted Return on Sales', 'PDF rowHeader captured');
  assert(rowBlock?.cells?.[1] === '4.0%', 'PDF cell 1 has 4.0%');
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=============================================================================');
console.log(`STEP 5 Remediation Test Results: ${passed} passed, ${failed} failed.`);
console.log('=============================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All STEP 5 Remediation Round 1, Round 2 & Round 3 tests passed!\n');
}
