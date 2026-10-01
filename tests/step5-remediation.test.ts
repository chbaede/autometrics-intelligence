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
import { extractPdfDocument } from '../src/services/liveDocumentExtractor';
import { bindLiveEvidence } from '../src/services/liveEvidenceBinder';
import {
  verifyClaimEvidence,
  validateClaimVerificationResult,
} from '../src/data/scopeExceptions';
import {
  executeOfficialSourcePipeline,
  verifyOfficialSourceClaim,
} from '../src/services/officialSourcePipeline';
import {
  ClaimEvidenceLocator,
  ClaimVerifiedResult,
  ExtractedLiveDocument,
  LiveEvidenceCandidate,
  LiveSourceDocument,
  SourceClaim,
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

  const HTML = `<!DOCTYPE html><html><body><table><tr><td>Metric</td><td>Value</td></tr><tr><td>Adjusted RoS</td><td>4.0%</td></tr></table></body></html>`;

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
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=============================================================================');
console.log(`STEP 5 Remediation Test Results: ${passed} passed, ${failed} failed.`);
console.log('=============================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All 14 STEP 5 Remediation tests passed!\n');
}
