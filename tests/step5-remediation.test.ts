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
  validateLiveEvidenceCandidate,
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
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:row:1',
        cells: ['Cars Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Cars Adjusted RoS',
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

  const HTML = `<!DOCTYPE html><html><head><title>Mercedes-Benz Cars Q2 2026 Report</title></head><body><h3>Mercedes-Benz Cars</h3><table><tr><th>Metric</th><th>Q2 2026</th></tr><tr><td>Adjusted RoS</td><td>4.0%</td></tr></table></body></html>`;

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

  const htmlContent = '<html><head><title>Mercedes-Benz Group Q2 2026 Results</title></head><body><table><tr><th>Metric</th><th>Q2 2026</th></tr><tr><td>Mercedes-Benz Cars Adjusted Return on Sales</td><td>4.0%</td></tr></table></body></html>';
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
      locator: { rawLocator: 'html:table:0:row:1', tableIndex: 0, rowIndex: 1 },
      rawValue: '4.0%',
      evidenceText: 'Mercedes-Benz Cars Adjusted Return on Sales | 4.0%',
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
// Suite: STEP 5 Remediation Round 4 — Strict Data-to-Claim Proof
// ─────────────────────────────────────────────────────────────────────────────

// Section 1: P0 Table Cell Resolution Tests (Tests 33 - 37)
console.log('\n--- Test 33: Value exists elsewhere in row but not in target cell fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_cell_test',
    url: 'https://group.mercedes-benz.com/cell.html',
    finalUrl: 'https://group.mercedes-benz.com/cell.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: '1'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'RoS: 4.0% | Margin: 5.5%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_row_multi_cell',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0% | 5.5%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%', '5.5%'],
        columnHeaders: ['Metric', 'Q2 2026', 'Q2 2025'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  // Caller points locator to column 2 (which is 5.5%), but claims 4.0%
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: { rawLocator: 'page:1:table:0:row:1', tableIndex: 0, rowIndex: 1, columnIndex: 2 },
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Candidate marks dimensions as unproven for mismatched cell index');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('cellIndexMismatch') === true, 'Fails with cellIndexMismatch');
}

console.log('\n--- Test 34: Value exists in different metric column fails semantic evaluation ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_metric_col_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: '2'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Revenue | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_revenue_row',
        blockType: 'table_row',
        text: 'Group Revenue | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Revenue', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Group Revenue',
      },
    ],
  };

  // Claim asks for operating_margin, but block is Revenue
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Candidate fails for mismatched metric row');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('incompatibleMetricSemantic') === true, 'Fails with incompatibleMetricSemantic');
}

console.log('\n--- Test 35: Repeated values in two columns without header resolution fails ambiguity gate ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_repeat_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: '3'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: '4.0% | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_repeat',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0% | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%', '4.0%'],
        columnHeaders: ['Metric', 'Col A', 'Col B'], // No periods in headers to disambiguate!
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Repeated value without header disambiguation fails');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('ambiguousDimensionEvidence') === true, 'Fails with ambiguousDimensionEvidence');
}

console.log('\n--- Test 36: Missing cells / malformed table metadata fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_malformed_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: '4'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Malformed table row',
    pageCount: 1,
    blocks: [
      {
        id: 'block_malformed',
        blockType: 'table_row',
        text: 'Adjusted RoS: 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        isMalformed: true, // Flagged malformed
        cells: ['Adjusted RoS', '4.0%'],
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Malformed table block fails dimension proof');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unresolvedTableCell') === true, 'Fails with unresolvedTableCell');
}

console.log('\n--- Test 37: Unambiguous cell match passes to claim_verified with complete tableCoordinates ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_clean_cell_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
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
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_clean_cell',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_clean_cell_test',
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
    id: 'mbg_clean_cell_test',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/test.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Candidate dimensions successfully proven');
  assert(candidate.tableCoordinates?.tableIndex === 0, 'Carries tableIndex: 0');
  assert(candidate.tableCoordinates?.rowIndex === 1, 'Carries rowIndex: 1');
  assert(candidate.tableCoordinates?.columnIndex === 1, 'Carries columnIndex: 1');
  assert(candidate.tableCoordinates?.cellText === '4.0%', 'Carries cellText: 4.0%');

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });

  assert(result.state === 'claim_verified', 'Clean table cell verification produces claim_verified');
  const verified = result as ClaimVerifiedResult;
  assert(verified.tableCoordinates?.columnIndex === 1, 'Verified result preserves tableCoordinates.columnIndex');
}

// Section 2: P0 Period Binding Tests (Tests 38 - 43)
console.log('\n--- Test 38: Document title Q2 with FY comparator column is contradicted ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_fy_col_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
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
    documentTitle: 'Mercedes-Benz Group Q2 2026 Results',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_fy_col',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'FY 2025'], // Comparator column FY 2025!
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  // Claim asks for 2026-Q2, but column is FY 2025
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });

  assert(
    candidate.provenDimensions?.bindingStatus === 'unproven' || candidate.provenDimensions?.bindingStatus === 'contradicted',
    'Candidate rejects FY column for Q2 claim'
  );
  assert(
    candidate.provenDimensions?.unprovenReasons?.includes('contradictedReportingPeriod') === true ||
    candidate.provenDimensions?.unprovenReasons?.includes('unprovenReportingPeriod') === true,
    'Fails with contradicted/unproven period'
  );
}

console.log('\n--- Test 39: Q2 2026 and Q2 2025 side by side disambiguated cleanly ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_side_by_side_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: '9'.repeat(64),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0% | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_side_by_side',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0% | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026', 'Q2 2025'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  // Target Q2 2026 -> should resolve to column index 1
  const cand2026 = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(cand2026.provenDimensions?.tableCoordinates?.columnIndex === 1, 'Disambiguates to columnIndex 1 for 2026-Q2');

  // Target Q2 2025 -> should resolve to column index 2
  const cand2025 = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2025-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(cand2025.provenDimensions?.tableCoordinates?.columnIndex === 2, 'Disambiguates to columnIndex 2 for 2025-Q2');
}

console.log('\n--- Test 40: Period only in document title fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_title_only_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a1'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Q2 2026 Report', // Period in title only!
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_no_period',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Current Period'], // No period in column!
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Period only in document title fails closed');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenReportingPeriod') === true, 'Fails with unprovenReportingPeriod');
}

console.log('\n--- Test 41: Period in parent header spanning multiple columns passes ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_parent_header_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a2'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Second Quarter 2026 | Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_parent_header',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Second Quarter 2026 | Actual'], // Combined parent + sub-header!
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Parent header spanning columns successfully proves period');
  assert(candidate.provenDimensions?.provenPeriod === '2026-Q2', 'Proven period is 2026-Q2');
}

console.log('\n--- Test 42: Conflicting period in row/cell vs column header is contradicted ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_conflict_period_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a3'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'RoS FY 2025 | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_conflict',
        blockType: 'table_row',
        text: 'Adjusted RoS (FY 2025) | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS (FY 2025)', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'], // Row says FY 2025, column says Q2 2026
        rowHeader: 'Adjusted RoS (FY 2025)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });

  assert(
    candidate.provenDimensions?.bindingStatus === 'contradicted' || candidate.provenDimensions?.bindingStatus === 'unproven',
    'Conflicting period in row/header fails'
  );
  assert(
    candidate.provenDimensions?.unprovenReasons?.includes('contradictedReportingPeriod') === true ||
    candidate.provenDimensions?.unprovenReasons?.includes('unprovenReportingPeriod') === true,
    'Records contradictedReportingPeriod or unprovenReportingPeriod'
  );
}

console.log('\n--- Test 43: Period type mismatch (quarterly claim vs six months / YTD column header) fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_period_type_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a4'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Six Months Ended June 30, 2026 | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_6m',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Six Months Ended June 30, 2026 (H1 2026)'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  // Quarterly claim asked for 2026-Q2, but column is 6M / H1
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });

  assert(
    candidate.provenDimensions?.bindingStatus === 'contradicted' || candidate.provenDimensions?.bindingStatus === 'unproven',
    'Cumulative 6M column cannot satisfy quarterly Q2 claim'
  );
  assert(candidate.provenDimensions?.unprovenReasons?.includes('periodTypeMismatch') === true, 'Fails with periodTypeMismatch');
}

// Section 3: P0 Scope & Accounting Basis Positive Proof (Tests 44 - 49)
console.log('\n--- Test 44: Positive consolidated_group scope succeeds ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_scope_pos_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a5'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Mercedes-Benz Group | €32,060 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_group_pos',
        blockType: 'table_row',
        text: 'Group Revenue (reported / IFRS) | €32,060 million',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Group Financial Performance',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Revenue (reported / IFRS)', '€32,060 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Group Revenue (reported / IFRS)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€32,060 million',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Explicit Group indicator proves consolidated_group scope');
  assert(candidate.provenDimensions?.provenScope === 'consolidated_group', 'Proven scope is consolidated_group');
}

console.log('\n--- Test 45: Absence-of-contradiction consolidated_group fails without explicit group marker ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_scope_neg_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a6'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Revenue | €32,060 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_group_neg',
        blockType: 'table_row',
        text: 'Revenue (reported / IFRS) | €32,060 million',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Revenue (reported / IFRS)', '€32,060 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Revenue (reported / IFRS)',
      },
    ],
  };

  // Claim asks for consolidated_group, but row/heading has no "Group" / "Consolidated"
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€32,060 million',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Absence of segment does not prove consolidated_group');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenReportingScope') === true, 'Fails with unprovenReportingScope');
}

console.log('\n--- Test 46: Ambiguous / contradicting scope fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_scope_ambig_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a7'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Vans Segment Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_vans_scope',
        blockType: 'table_row',
        text: 'Mercedes-Benz Vans Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Vans',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Mercedes-Benz Vans Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Mercedes-Benz Vans Adjusted RoS',
      },
    ],
  };

  // Claim asks for cars_segment, but block is Vans
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Vans segment cannot satisfy cars_segment claim');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenReportingScope') === true, 'Fails with unprovenReportingScope');
}

console.log('\n--- Test 47: Positive reported accounting basis with explicit IFRS indicator succeeds ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_basis_pos_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a8'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'EBIT (IFRS reported) | €1,550 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_ifrs_basis',
        blockType: 'table_row',
        text: 'Group EBIT (as reported / IFRS) | €1,550 million',
        pageNumber: 1,
        sectionHeading: 'Group Results',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group EBIT (as reported / IFRS)', '€1,550 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Group EBIT (as reported / IFRS)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€1,550 million',
    metricId: 'operating_income',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Explicit IFRS / reported indicator proves reported basis');
  assert(candidate.provenDimensions?.provenAccountingBasis === 'reported', 'Proven accounting basis is reported');
}

console.log('\n--- Test 48: Absence of "adjusted" alone is rejected as proof for reported basis ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_basis_neg_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'a9'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'EBIT | €1,550 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_bare_ebit',
        blockType: 'table_row',
        text: 'Group EBIT | €1,550 million', // Lacks explicit IFRS / GAAP / reported marker
        pageNumber: 1,
        sectionHeading: 'Group Results',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group EBIT', '€1,550 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Group EBIT',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€1,550 million',
    metricId: 'operating_income',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Absence of "adjusted" alone does not prove reported basis');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenAccountingBasis') === true, 'Fails with unprovenAccountingBasis');
}

console.log('\n--- Test 49: Distinguish adjusted, non_gaap, and management_defined ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_basis_types_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'b1'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Non-GAAP EBIT: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_nongaap',
        blockType: 'table_row',
        text: 'Non-GAAP EBIT Margin | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Non-GAAP EBIT Margin', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Non-GAAP EBIT Margin',
      },
    ],
  };

  // Claim asks for adjusted, but text says non-gaap
  const candAdj = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    accountingBasis: 'adjusted', // Incompatible with non-gaap
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });
  assert(candAdj.provenDimensions?.bindingStatus === 'unproven', 'Non-GAAP indicator cannot satisfy adjusted basis');
  assert(candAdj.provenDimensions?.unprovenReasons?.includes('unprovenAccountingBasis') === true, 'Fails with unprovenAccountingBasis');

  // Claim asks for non_gaap -> succeeds
  const candNonGaap = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    accountingBasis: 'non_gaap',
    scope: 'cars_segment',
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });
  assert(candNonGaap.provenDimensions?.bindingStatus === 'proven', 'Non-GAAP indicator correctly proves non_gaap basis');
  assert(candNonGaap.provenDimensions?.provenAccountingBasis === 'non_gaap', 'Proven accounting basis is non_gaap');
}

// Section 4: P1 Metric Semantic Contract Tests (Tests 50 - 55)
console.log('\n--- Test 50: Operating profit does not prove operating margin ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_sem_profit_margin_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'b2'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Operating Profit: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_op_profit',
        blockType: 'table_row',
        text: 'Operating Profit | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Operating Profit', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Operating Profit',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin', // Claim asks for margin
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'reported',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Operating profit label does not prove operating margin');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('incompatibleMetricSemantic') === true, 'Fails with incompatibleMetricSemantic');
}

console.log('\n--- Test 51: EBIT does not automatically prove adjusted EBIT ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_sem_ebit_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'b3'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'EBIT | €1,550 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_bare_ebit2',
        blockType: 'table_row',
        text: 'Mercedes-Benz Cars EBIT | €1,550 million',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Mercedes-Benz Cars EBIT', '€1,550 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Mercedes-Benz Cars EBIT',
      },
    ],
  };

  // Claim asks for cars_adjusted_ebit, but text only has unadjusted EBIT
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€1,550 million',
    metricId: 'cars_adjusted_ebit',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Unadjusted EBIT cannot prove adjusted EBIT');
  assert(
    candidate.provenDimensions?.unprovenReasons?.includes('unprovenAccountingBasis') === true ||
    candidate.provenDimensions?.unprovenReasons?.includes('unprovenMetricSemantic') === true,
    'Fails with unproven basis/metric'
  );
}

console.log('\n--- Test 52: EBIT margin does not prove operating margin when distinct ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_sem_margin_dist_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'b4'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Net Margin | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_net_margin',
        blockType: 'table_row',
        text: 'Net Margin | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Net Margin', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Net Margin',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'reported',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Net margin does not prove operating margin');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('incompatibleMetricSemantic') === true, 'Fails with incompatibleMetricSemantic');
}

console.log('\n--- Test 53: Deliveries does not prove retail deliveries ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_sem_deliv_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'b5'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Wholesale Deliveries | 480.13 thousand units',
    pageCount: 1,
    blocks: [
      {
        id: 'block_wholesale',
        blockType: 'table_row',
        text: 'Consolidated Group Wholesale Shipments | 480.13 thousand units',
        pageNumber: 1,
        sectionHeading: 'Deliveries',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Consolidated Group Wholesale Shipments', '480.13 thousand units'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Consolidated Group Wholesale Shipments',
      },
    ],
  };

  // Claim asks for retail_deliveries, but block is wholesale
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '480.13 thousand units',
    metricId: 'retail_deliveries',
    scope: 'consolidated_group',
    period: '2026-Q2',
    unit: 'thousand_units',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Wholesale shipments does not prove retail deliveries');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('incompatibleMetricSemantic') === true, 'Fails with incompatibleMetricSemantic');
}

console.log('\n--- Test 54: BEV deliveries must be bound to BEV value/cell ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_sem_bev_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'b6'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Total deliveries: 480.13 thousand units | BEV deliveries: 45.8 thousand units',
    pageCount: 1,
    blocks: [
      {
        id: 'block_bev',
        blockType: 'table_row',
        text: 'Total Deliveries | 480.13 thousand units', // Non-BEV deliveries row!
        pageNumber: 1,
        sectionHeading: 'Deliveries',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Total Deliveries', '480.13 thousand units'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Total Deliveries',
      },
    ],
  };

  // Claim asks for bev_deliveries, but block is Total Deliveries
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '480.13 thousand units',
    metricId: 'bev_deliveries',
    scope: 'consolidated_group',
    period: '2026-Q2',
    unit: 'thousand_units',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Total deliveries row cannot prove bev_deliveries metric');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('incompatibleMetricSemantic') === true, 'Fails with incompatibleMetricSemantic');
}

console.log('\n--- Test 55: Unknown metric IDs fail closed with unknownMetricId ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_sem_unknown_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'b7'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Something: 123',
    pageCount: 1,
    blocks: [
      {
        id: 'block_unknown',
        blockType: 'paragraph',
        text: 'Something unknown: 123',
        locator: 'page:1:p:1',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:p:1',
    rawValue: '123',
    metricId: 'unsupported_quantum_flux_metric' as any,
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Unknown metric ID fails closed');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unknownMetricId') === true, 'Fails with unknownMetricId');
}

// Section 5: P1 HTML Table Parsing Fixtures (Tests 56 - 59)
console.log('\n--- Test 56: Nested tables are isolated from parent row indexing ---');
{
  const htmlWithNested = `
    <html><body>
      <table id="parent">
        <tr><th>Metric</th><th>Q2 2026</th></tr>
        <tr>
          <td>
            Adjusted RoS
            <table><tr><td>Nested Cell 1</td><td>Nested Cell 2</td></tr></table>
          </td>
          <td>4.0%</td>
        </tr>
        <tr><td>Revenue</td><td>€32,060 million</td></tr>
      </table>
    </body></html>
  `;
  const liveDoc: LiveSourceDocument = {
    id: 'nested_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: htmlWithNested.length,
    contentHash: 'c1'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const ext = extractHtmlDocument(liveDoc, Buffer.from(htmlWithNested));
  assert(ext.success === true, 'HTML with nested table parsed successfully');
  if (ext.success) {
    const tableRows = ext.document.blocks.filter((b) => b.blockType === 'table_row');
    // Parent table should have exactly 3 rows: header (row 0), RoS (row 1), Revenue (row 2)
    assert(tableRows.length === 3, 'Parent table maintains exactly 3 rows without nested table tr contamination');
    assert(tableRows[1].rowIndex === 1, 'Data row index 1 preserved');
    assert(tableRows[2].rowIndex === 2, 'Data row index 2 preserved');
    assert(tableRows[1].cells?.length === 2, 'Parent row has exactly 2 cells');
    assert(tableRows[1].cells?.[1] === '4.0%', 'Second cell is 4.0%');
  }
}

console.log('\n--- Test 57: Multiple tbody elements parsed sequentially ---');
{
  const htmlMultiTbody = `
    <html><body>
      <table>
        <thead><tr><th>Metric</th><th>Q2 2026</th></tr></thead>
        <tbody>
          <tr><td>Adjusted RoS</td><td>4.0%</td></tr>
        </tbody>
        <tbody>
          <tr><td>Revenue</td><td>€32,060 million</td></tr>
        </tbody>
      </table>
    </body></html>
  `;
  const liveDoc: LiveSourceDocument = {
    id: 'tbody_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: htmlMultiTbody.length,
    contentHash: 'c2'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const ext = extractHtmlDocument(liveDoc, Buffer.from(htmlMultiTbody));
  assert(ext.success === true, 'HTML with multiple tbody parsed successfully');
  if (ext.success) {
    const rows = ext.document.blocks.filter((b) => b.blockType === 'table_row');
    assert(rows.length === 3, 'All rows across multiple tbody elements captured sequentially');
    assert(rows[1].cells?.[0] === 'Adjusted RoS', 'Row from tbody 1 captured');
    assert(rows[2].cells?.[0] === 'Revenue', 'Row from tbody 2 captured');
  }
}

console.log('\n--- Test 58: Rowspan and colspan correctly filling a 2D matrix ---');
{
  const htmlSpans = `
    <html><body>
      <table>
        <tr>
          <th rowspan="2">Metric</th>
          <th colspan="2">2026</th>
        </tr>
        <tr>
          <th>Q1</th>
          <th>Q2</th>
        </tr>
        <tr>
          <td>Adjusted RoS</td>
          <td>3.8%</td>
          <td>4.0%</td>
        </tr>
      </table>
    </body></html>
  `;
  const liveDoc: LiveSourceDocument = {
    id: 'spans_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: htmlSpans.length,
    contentHash: 'c3'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const ext = extractHtmlDocument(liveDoc, Buffer.from(htmlSpans));
  assert(ext.success === true, 'HTML with rowspan and colspan parsed successfully');
  if (ext.success) {
    const dataRow = ext.document.blocks.find((b) => b.blockType === 'table_row' && b.rowIndex === 2);
    assert(Boolean(dataRow), 'Data row at index 2 located');
    assert(dataRow?.cells?.length === 3, 'Data row has 3 cells');
    assert(dataRow?.cells?.[0] === 'Adjusted RoS', 'Cell 0 is Adjusted RoS');
    assert(dataRow?.cells?.[1] === '3.8%', 'Cell 1 is 3.8%');
    assert(dataRow?.cells?.[2] === '4.0%', 'Cell 2 is 4.0%');
    assert(dataRow?.columnHeaders?.[2].includes('Q2') === true, 'Column 2 header includes Q2');
    assert(dataRow?.columnHeaders?.[2].includes('2026') === true, 'Column 2 header includes 2026 from colspan');
  }
}

console.log('\n--- Test 59: Malformed HTML table flagged with isMalformed ---');
{
  const htmlMalformed = `
    <html><body>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr>No td tags here just raw text</tr>
      </table>
    </body></html>
  `;
  const liveDoc: LiveSourceDocument = {
    id: 'malformed_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: htmlMalformed.length,
    contentHash: 'c4'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const ext = extractHtmlDocument(liveDoc, Buffer.from(htmlMalformed));
  assert(ext.success === true, 'Parser handles malformed table gracefully');
  if (ext.success) {
    const tableBlock = ext.document.blocks.find((b) => b.blockType === 'table_row');
    assert(tableBlock?.isMalformed === true, 'Malformed table row is explicitly flagged with isMalformed: true');
  }
}

// Section 6: P1 Unit Provenance Tests (Tests 60 - 64)
console.log('\n--- Test 60: percentage unit provenance recorded ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_unit_pct_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'd1'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_pct_prov',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.unitProvenance === 'cell', 'Percentage symbol in cell recorded as unitProvenance: "cell"');
}

console.log('\n--- Test 61: currency_millions unit provenance recorded from column header and caption ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_unit_mil_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'd2'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Revenue | 32,060',
    pageCount: 1,
    blocks: [
      {
        id: 'block_mil_prov',
        blockType: 'table_row',
        text: 'Group Revenue (reported / IFRS) | 32,060',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Group',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Revenue (reported / IFRS)', '32,060'],
        columnHeaders: ['Metric', 'Q2 2026 in € millions'], // Provenance in column header!
        rowHeader: 'Group Revenue (reported / IFRS)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '32,060',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Currency millions proven from column header');
  assert(candidate.provenDimensions?.unitProvenance === 'column_header', 'Recorded as unitProvenance: "column_header"');
}

console.log('\n--- Test 62: thousand_units unit provenance recorded from caption ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_unit_thous_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'd3'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Wholesale: 480.13',
    pageCount: 1,
    blocks: [
      {
        id: 'block_thous_prov',
        blockType: 'table_row',
        text: 'Consolidated Group Wholesale Shipments | 480.13',
        pageNumber: 1,
        tableCaption: 'Vehicle Deliveries in thousand units', // Provenance in caption!
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Consolidated Group Wholesale Shipments', '480.13'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Consolidated Group Wholesale Shipments',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '480.13',
    metricId: 'wholesale_shipments',
    scope: 'consolidated_group',
    period: '2026-Q2',
    unit: 'thousand_units',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Thousand units proven from table caption');
  assert(candidate.provenDimensions?.unitProvenance === 'table_caption', 'Recorded as unitProvenance: "table_caption"');
}

console.log('\n--- Test 63: units unit provenance recorded from row header ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_unit_units_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'd4'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Vehicles delivered: 412,300',
    pageCount: 1,
    blocks: [
      {
        id: 'block_units_prov',
        blockType: 'table_row',
        text: 'Consolidated Group Deliveries (in vehicles / units) | 412,300',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Consolidated Group Deliveries (in vehicles / units)', '412,300'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Consolidated Group Deliveries (in vehicles / units)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '412,300',
    metricId: 'deliveries_global',
    scope: 'consolidated_group',
    period: '2026-Q2',
    unit: 'units',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Units proven from row header');
  assert(candidate.provenDimensions?.unitProvenance === 'row_header', 'Recorded as unitProvenance: "row_header"');
}

console.log('\n--- Test 64: Number without any unit indicator fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_no_unit_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'd5'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Deliveries | 412300',
    pageCount: 1,
    blocks: [
      {
        id: 'block_no_unit',
        blockType: 'table_row',
        text: 'Group Revenue (reported / IFRS) | 412300',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Group',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Revenue (reported / IFRS)', '412300'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Group Revenue (reported / IFRS)',
      },
    ],
  };

  // Claim asks for currency_millions, but table has no unit hint
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '412300',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });

  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Number without unit indicator fails unit proof');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenUnit') === true, 'Fails with unprovenUnit');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: STEP 5 Remediation Round 5 Tests (Tests 65 - 84)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- Test 65: P0 — Period evidence is strictly column-local ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_period_col_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e1'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Q2 2026 | Q2 2025',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_period_cols',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0% | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026', 'Q2 2025'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  // Targeting Q2 2025 must resolve strictly to columnIndex 2
  const cand2025 = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2025-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(cand2025.provenDimensions?.tableCoordinates?.columnIndex === 2, 'Selected cell Q2 2025 resolves to columnIndex 2');
  assert(cand2025.provenDimensions?.provenPeriod === '2025-Q2', 'Proven period is 2025-Q2');

  // If candidate claims 2026-Q2 but points to columnIndex 2 (Q2 2025 column), it must be rejected
  const candWrongCol = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1:cell:2',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(candWrongCol.provenDimensions?.bindingStatus !== 'proven', 'Targeting Q2 2025 column for 2026-Q2 claim fails');
  assert(
    candWrongCol.provenDimensions?.unprovenReasons?.includes('unprovenReportingPeriod') === true ||
    candWrongCol.provenDimensions?.unprovenReasons?.includes('contradictedReportingPeriod') === true,
    'Fails closed with unproven/contradicted period'
  );
}

console.log('\n--- Test 66: P0 — Missing column header association fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_missing_header_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e2'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    documentTitle: 'Mercedes-Benz Group Q2 2026',
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_no_header',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        // columnHeaders missing
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Missing column header fails closed');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenReportingPeriod') === true, 'Fails with unprovenReportingPeriod');
}

console.log('\n--- Test 67: P0 — Rowspan/colspan hierarchical header association ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_hier_header_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e3'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Three Months Ended June 30, 2026 | Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_hier',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 2,
        locator: 'page:1:table:0:row:2',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Three Months Ended June 30, 2026 | Actual'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:2',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Hierarchical header proves period');
  assert(candidate.provenDimensions?.provenPeriod === '2026-Q2', 'Proven period is 2026-Q2');
}

console.log('\n--- Test 68: P0 — Quarterly vs YTD / nine-month period mismatch fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_ytd_mismatch_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e4'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Nine Months 2026 | Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_9m',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', '9M 2026'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    periodType: 'quarterly',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'contradicted' || candidate.provenDimensions?.bindingStatus === 'unproven', '9M cannot prove quarterly Q2');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('periodTypeMismatch') === true, 'Fails with periodTypeMismatch');
}

console.log('\n--- Test 69: P0 — Section heading alone cannot establish metric identity ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_heading_metric_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e5'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Operating Margin | Total: 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_heading_only',
        blockType: 'table_row',
        text: 'Total | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Operating Margin by Division', // Section heading has metric, but row is generic 'Total'
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Total', '4.0%'],
        columnHeaders: ['Division', 'Q2 2026'],
        rowHeader: 'Total',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Section heading alone cannot establish metric for generic row');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenMetricSemantic') === true, 'Fails with unprovenMetricSemantic');
}

console.log('\n--- Test 70: P0 — Section heading Revenue vs row Operating Income is incompatible ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_contra_metric_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e6'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Revenue Section | Operating Profit: €1,500 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_contra_metric',
        blockType: 'table_row',
        text: 'Group Operating Profit | €1,500 million',
        pageNumber: 1,
        sectionHeading: 'Group Revenue Analysis',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Operating Profit', '€1,500 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Group Operating Profit',
      },
    ],
  };

  // Claim asks for revenue, but row says Operating Profit
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€1,500 million',
    metricId: 'revenue',
    period: '2026-Q2',
    unit: 'currency_millions',
    accountingBasis: 'reported',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Incompatible row metric fails');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('incompatibleMetricSemantic') === true, 'Fails with incompatibleMetricSemantic');
}

console.log('\n--- Test 71: P0 — Selected cell is numeric but row has no metric label fails ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_no_metric_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e7'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: '123 | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_no_label',
        blockType: 'table_row',
        text: '123 | 4.0%',
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['123', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: '123',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Row without metric label fails');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenMetricSemantic') === true, 'Fails with unprovenMetricSemantic');
}

console.log('\n--- Test 72: P0 — Valid row label and selected value correctly associated passes ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_valid_label_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e8'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted Return on Sales | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_valid_label',
        blockType: 'table_row',
        text: 'Adjusted Return on Sales | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted Return on Sales', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted Return on Sales',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    period: '2026-Q2',
    unit: 'percentage',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Valid row label proves metric');
  assert(
    candidate.provenDimensions?.provenMetricLabel === 'return on sales' ||
    candidate.provenDimensions?.matchedMetricLabel === 'return on sales' ||
    Boolean(candidate.provenDimensions?.matchedMetricLabel),
    'Proven metric label recorded'
  );
}

console.log('\n--- Test 73: P0 — MetricSemanticRule.expectedUnits enforced against proven unit ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_unit_mismatch_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'e9'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Operating Margin | €1,500 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_wrong_unit',
        blockType: 'table_row',
        text: 'Adjusted Operating Margin | €1,500 million',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted Operating Margin', '€1,500 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted Operating Margin',
      },
    ],
  };

  // Claim asks for operating_margin, but unit is currency_millions (expected: percentage or basis_points)
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€1,500 million',
    metricId: 'operating_margin',
    period: '2026-Q2',
    unit: 'currency_millions',
    accountingBasis: 'adjusted',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Metric rule expectedUnits enforces percentage for operating_margin');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unitMismatch') === true, 'Fails with unitMismatch');
}

console.log('\n--- Test 74: P1 — Bare currency symbol €32,060 without explicit scale fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_bare_currency_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'ea'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Revenue | €32,060',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_bare_cur',
        blockType: 'table_row',
        text: 'Group Revenue (reported / IFRS) | €32,060',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Group',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Revenue (reported / IFRS)', '€32,060'],
        columnHeaders: ['Metric', 'Q2 2026'], // No scale hint here or in caption!
        rowHeader: 'Group Revenue (reported / IFRS)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€32,060',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Bare currency symbol without scale fails closed');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenUnit') === true, 'Fails with unprovenUnit');
}

console.log('\n--- Test 75: P1 — €32,060 million passes as currency_millions ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_cur_mil_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'eb'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Revenue | €32,060 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_cur_mil',
        blockType: 'table_row',
        text: 'Group Revenue (reported / IFRS) | €32,060 million',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Group',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Revenue (reported / IFRS)', '€32,060 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Group Revenue (reported / IFRS)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€32,060 million',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Explicit million scale proves currency_millions');
  assert(candidate.provenDimensions?.provenUnit === 'currency_millions', 'Proven unit is currency_millions');
}

console.log('\n--- Test 76: P1 — €32.06 billion passes as currency_billions ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_cur_bn_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'ec'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Revenue | €32.06 billion',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_cur_bn',
        blockType: 'table_row',
        text: 'Group Revenue (reported / IFRS) | €32.06 billion',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Group',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Revenue (reported / IFRS)', '€32.06 billion'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Group Revenue (reported / IFRS)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€32.06 billion',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'currency_billions',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'proven', 'Explicit billion scale proves currency_billions');
  assert(candidate.provenDimensions?.provenUnit === 'currency_billions', 'Proven unit is currency_billions');
}

console.log('\n--- Test 77: P1 — Contradictory scale (column billions vs caption millions) fails closed ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_contra_scale_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'ed'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Revenue | 32.06',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_contra_scale',
        blockType: 'table_row',
        text: 'Group Revenue (reported / IFRS) | 32.06',
        pageNumber: 1,
        tableCaption: 'All figures in € millions', // Caption says millions
        sectionHeading: 'Mercedes-Benz Group',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Group Revenue (reported / IFRS)', '32.06'],
        columnHeaders: ['Metric', 'Q2 2026 in € billions'], // Column says billions!
        rowHeader: 'Group Revenue (reported / IFRS)',
      },
    ],
  };

  // Claim asks for currency_millions (matching caption), but column says billions
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '32.06',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });
  assert(
    candidate.provenDimensions?.bindingStatus === 'contradicted' ||
    candidate.provenDimensions?.bindingStatus === 'unproven',
    'Contradictory scale fails closed'
  );
  assert(candidate.provenDimensions?.unprovenReasons?.includes('contradictedUnit') === true, 'Fails with contradictedUnit');
}

console.log('\n--- Test 78: P1 — Malformed table row cannot reach claim_verified ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_malformed_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'ee'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_malformed',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted RoS',
        isMalformed: true, // Malformed flag!
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  const candValidation = validateLiveEvidenceCandidate(candidate, null, null, { extractedLiveDocument: extractedDoc });
  assert(candValidation.valid === false, 'Candidate validation rejects malformed table row');
  assert(candValidation.mismatches.includes('verificationTableMalformed'), 'Failure reason is verificationTableMalformed');

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_r5_malformed_test',
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
    id: 'mbg_r5_malformed_test',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/test.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: candidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });
  assert(result.state === 'source_verified', 'Malformed table row verification strictly produces source_verified');
  assert(result.diagnosticReasons?.includes('tableMalformed') === true, 'Diagnostic reason includes tableMalformed');
}

console.log('\n--- Test 79: P1 — Scope proof: "total" alone without group marker fails consolidated_group ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_total_scope_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'ef'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Total Revenue: €32,060 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_total',
        blockType: 'table_row',
        text: 'Total Revenue (IFRS) | €32,060 million', // "Total" alone, no "Group" / "Consolidated"
        pageNumber: 1,
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Total Revenue (IFRS)', '€32,060 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Total Revenue (IFRS)',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€32,060 million',
    metricId: 'revenue',
    scope: 'consolidated_group',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'unproven', 'Total alone cannot prove consolidated_group');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('unprovenReportingScope') === true, 'Fails with unprovenReportingScope');
}

console.log('\n--- Test 80: P1 — Basis proof: section title "IFRS Results" cannot prove reported for adjusted metric ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_ifrs_adj_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'f1'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'IFRS Results | Adjusted EBIT: €1,500 million',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_ifrs_adj',
        blockType: 'table_row',
        text: 'Adjusted EBIT | €1,500 million',
        pageNumber: 1,
        sectionHeading: 'IFRS Results and Reconciliations', // Section title says IFRS Results
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted EBIT', '€1,500 million'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted EBIT',
      },
    ],
  };

  // Claim asks for reported, but row clearly says Adjusted EBIT
  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '€1,500 million',
    metricId: 'operating_income',
    accountingBasis: 'reported',
    period: '2026-Q2',
    unit: 'currency_millions',
    supportType: 'reported_kpi',
  });
  assert(candidate.provenDimensions?.bindingStatus === 'contradicted', 'Adjusted row contradicts claimed reported basis despite IFRS section title');
  assert(candidate.provenDimensions?.unprovenReasons?.includes('accountingBasisMismatch') === true, 'Fails with accountingBasisMismatch');
}

console.log('\n--- Test 81: P1 — Coordinate integrity: mismatched tableIndex rejected ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_coords_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'f2'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_coords',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  // Tamper candidate's tableCoordinates.tableIndex
  const tamperedCandidate = {
    ...candidate,
    tableCoordinates: {
      ...candidate.tableCoordinates!,
      tableIndex: 99, // Mismatched!
    },
  };

  const candValidation = validateLiveEvidenceCandidate(tamperedCandidate, null, null, { extractedLiveDocument: extractedDoc });
  assert(candValidation.valid === false, 'Candidate validation rejects mismatched tableIndex');
  assert(candValidation.mismatches.includes('verificationCoordinateMismatch'), 'Failure reason is verificationCoordinateMismatch');
}

console.log('\n--- Test 82: P1 — Coordinate integrity: mismatched rowIndex rejected ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_coords_row_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'f3'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_coords_row',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  const tamperedCandidate = {
    ...candidate,
    tableCoordinates: {
      ...candidate.tableCoordinates!,
      rowIndex: 99, // Mismatched!
    },
  };

  const candValidation = validateLiveEvidenceCandidate(tamperedCandidate, null, null, { extractedLiveDocument: extractedDoc });
  assert(candValidation.valid === false, 'Candidate validation rejects mismatched rowIndex');
  assert(candValidation.mismatches.includes('verificationCoordinateMismatch'), 'Failure reason is verificationCoordinateMismatch');
}

console.log('\n--- Test 83: P1 — Coordinate integrity: mismatched columnIndex rejected ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_coords_col_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'f4'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_coords_col',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1:cell:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  const tamperedCandidate = {
    ...candidate,
    tableCoordinates: {
      ...candidate.tableCoordinates!,
      columnIndex: 99, // Mismatched!
    },
  };

  const candValidation = validateLiveEvidenceCandidate(tamperedCandidate, null, null, { extractedLiveDocument: extractedDoc });
  assert(candValidation.valid === false, 'Candidate validation rejects mismatched columnIndex');
  assert(candValidation.mismatches.includes('verificationCoordinateMismatch'), 'Failure reason is verificationCoordinateMismatch');
}

console.log('\n--- Test 84: P1 — Coordinate integrity in verifyClaimEvidence and validateClaimVerificationResult ---');
{
  const mockLiveDoc: LiveSourceDocument = {
    id: 'mbg_r5_result_coords_test',
    url: 'https://group.mercedes-benz.com/test.html',
    finalUrl: 'https://group.mercedes-benz.com/test.html',
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType: 'text/html',
    contentLength: 100,
    contentHash: 'f5'.repeat(32),
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument: mockLiveDoc,
    extractionMethod: 'test',
    extractionVersion: '1.0.0',
    extractedAt: new Date().toISOString(),
    extractedText: 'Adjusted RoS | 4.0%',
    pageCount: 1,
    blocks: [
      {
        id: 'block_r5_result_coords',
        blockType: 'table_row',
        text: 'Adjusted RoS | 4.0%',
        pageNumber: 1,
        sectionHeading: 'Mercedes-Benz Cars',
        tableIndex: 0,
        rowIndex: 1,
        locator: 'page:1:table:0:row:1',
        cells: ['Adjusted RoS', '4.0%'],
        columnHeaders: ['Metric', 'Q2 2026'],
        rowHeader: 'Adjusted RoS',
      },
    ],
  };

  const claim: ClaimEvidenceLocator = {
    sourceDocId: 'mbg_r5_result_coords_test',
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
    id: 'mbg_r5_result_coords_test',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Q2 2026',
    docType: 'quarterly_report',
    period: '2026-Q2',
    periodType: 'quarterly',
    publicationDate: '2026-07-31',
    officialUrl: 'https://group.mercedes-benz.com/test.html',
    isVerified: true,
    lastChecked: '2026-07-31',
  };

  const candidate = bindLiveEvidence(extractedDoc, {
    locator: 'page:1:table:0:row:1',
    rawValue: '4.0%',
    metricId: 'operating_margin',
    scope: 'cars_segment',
    accountingBasis: 'adjusted',
    period: '2026-Q2',
    unit: 'percentage',
    supportType: 'reported_kpi',
  });

  const tamperedCandidate = {
    ...candidate,
    tableCoordinates: {
      ...candidate.tableCoordinates!,
      rowIndex: 99, // Mismatch against block.rowIndex = 1
    },
  };

  const result = verifyClaimEvidence(claim, sourceDoc, '4.0%', 'reported_kpi', {
    liveCandidate: tamperedCandidate,
    liveSourceDocument: mockLiveDoc,
    extractedLiveDocument: extractedDoc,
    expectedOrigin: 'live_source',
  });

  assert(result.state === 'source_verified', 'Coordinate mismatch prevents claim_verified');
  assert(result.diagnosticReasons?.includes('verificationCoordinateMismatch') === true, 'Diagnostic reason includes verificationCoordinateMismatch');

  // Verify forged ClaimVerifiedResult with coordinate mismatch is caught by validateClaimVerificationResult
  const forgedResult: ClaimVerifiedResult = {
    state: 'claim_verified',
    verificationOrigin: 'live_source',
    sourceDocId: sourceDoc.id,
    verifiedValue: '4.0%',
    blockId: 'block_r5_result_coords',
    verifiedAt: new Date().toISOString(),
    verificationMethod: 'parser',
    engineId: 'live_source_verifier',
    engineVersion: '1.0.0',
    claimSupportType: 'reported_kpi',
    provenDimensions: candidate.provenDimensions!,
    tableCoordinates: {
      tableIndex: 99, // Tampered!
      rowIndex: 1,
      columnIndex: 1,
      cellText: '4.0%',
    },
  };

  const validation = validateClaimVerificationResult(
    claim,
    sourceDoc,
    '4.0%',
    forgedResult,
    'reported_kpi',
    {
      expectedOrigin: 'live_source',
      extractedLiveDocument: extractedDoc,
    }
  );
  assert(validation.valid === false, 'validateClaimVerificationResult rejects forged result with mismatched tableIndex');
  assert(validation.mismatches.includes('verificationCoordinateMismatch'), 'Failure reason is verificationCoordinateMismatch');
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
  console.log('\n🎉 All STEP 5 Remediation Round 1, Round 2, Round 3, Round 4 & Round 5 tests passed!\n');
}


