/**
 * AutoMetrics Intelligence — Official IR Live Source Ingestion Test Suite (STEP 5-1)
 *
 * Validates:
 * 1. Cryptographic raw-byte SHA-256 provenance
 * 2. Strict HTTPS transport validation (rejects HTTP, file, data, javascript, malformed)
 * 3. Controlled redirect policy (HTTPS -> HTTPS allowed, HTTPS -> HTTP rejected, loop/limit bounds)
 * 4. Deterministic timeout & cancellation via AbortController
 * 5. Bounded response sizes (Content-Length and chunked stream limits)
 * 6. Content-Type policy (application/pdf, text/html with parameterized charsets)
 * 7. Complete metadata preservation (originalUrl, finalUrl, httpStatus, contentType, byteLength, hash)
 * 8. Separation of transport security from official source document authorization
 * 9. Core architectural invariant: source_retrieved ≠ source_verified ≠ claim_verified
 */

import { createHash } from 'node:crypto';
import {
  fetchOfficialIrSource,
  computeRawByteSha256,
  parseContentType,
  validateTransportUrl,
  isAuthorizedOfficialSource,
  matchRegisteredSourceDocument,
  isPrivateOrLoopbackHost,
} from '../src/services/liveSourceFetcher';
import { SOURCE_DOCUMENTS } from '../src/data/sources';
import { LiveSourceDocument } from '../src/types/metrics';

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

/**
 * Creates a mock ReadableStream from Uint8Array chunks for streaming tests.
 */
function createMockStream(chunks: Uint8Array[], delayMs = 0): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

/**
 * Deterministic mock fetch handler builder for unit testing without internet access.
 */
type MockHandler = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response> | Response;

function createMockFetch(routes: Record<string, MockHandler>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const handler = routes[urlStr];
    if (handler) {
      return handler(input, init);
    }
    return new Response('Not Found', { status: 404, statusText: 'Not Found' });
  }) as typeof fetch;
}

console.log('🧪 Starting Official IR Live Source Ingestion Test Suite (STEP 5-1)...\n');

// ────────────────────────────────────────────────────────────────────────────
// 1. Raw Byte Cryptographic Provenance (STEP 5-1, Section 7)
// ────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Raw Byte Cryptographic Provenance ---');

const sampleBytesA = Buffer.from('Official BMW Group Financial Statements Q2 2026', 'utf-8');
const sampleBytesB = Buffer.from('Official BMW Group Financial Statements Q2 2026.', 'utf-8'); // 1-byte addition
const hashA = computeRawByteSha256(sampleBytesA);
const hashB = computeRawByteSha256(sampleBytesB);

assert(typeof hashA === 'string' && hashA.length === 64, 'SHA-256 produces 64-character string');
assert(/^[0-9a-f]{64}$/.test(hashA), 'SHA-256 digest is strictly lowercase hexadecimal');
assert(hashA !== hashB, 'raw bytes A != raw bytes B -> SHA-256(A) != SHA-256(B)');

// Same raw bytes produce identical hash
const hashA2 = computeRawByteSha256(Buffer.from('Official BMW Group Financial Statements Q2 2026', 'utf-8'));
assert(hashA === hashA2, 'Same raw bytes produce identical SHA-256 digest');

// One-bit / one-byte change alters the digest
const modifiedSingleByte = Buffer.from(sampleBytesA);
modifiedSingleByte[0] = modifiedSingleByte[0] ^ 1;
assert(computeRawByteSha256(modifiedSingleByte) !== hashA, 'Single-bit change completely alters SHA-256 digest');

// Whitespace and formatting differences: raw byte hashing must NOT normalize
const rawTextWithSingleSpace = Buffer.from('Revenue: €100', 'utf-8');
const rawTextWithDoubleSpace = Buffer.from('Revenue:  €100', 'utf-8');
assert(
  computeRawByteSha256(rawTextWithSingleSpace) !== computeRawByteSha256(rawTextWithDoubleSpace),
  'Whitespace difference ("Revenue: €100" vs "Revenue:  €100") produces distinct raw byte SHA-256'
);

const crlfBytes = Buffer.from('Line1\r\nLine2', 'utf-8');
const lfBytes = Buffer.from('Line1\nLine2', 'utf-8');
assert(
  computeRawByteSha256(crlfBytes) !== computeRawByteSha256(lfBytes),
  'Line-ending difference (CRLF vs LF) produces distinct raw byte SHA-256'
);

const paddedBytes = Buffer.from('  Trim me  ', 'utf-8');
const unpaddedBytes = Buffer.from('Trim me', 'utf-8');
assert(
  computeRawByteSha256(paddedBytes) !== computeRawByteSha256(unpaddedBytes),
  'Surrounding whitespace difference produces distinct raw byte SHA-256 (no pre-trimming)'
);

// ────────────────────────────────────────────────────────────────────────────
// 2. Transport URL Validation & Security (STEP 5-1, Section 2 & 9)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Transport URL Validation & Security ---');

assert(
  validateTransportUrl('https://ir.bmwgroup.com/report.pdf').valid === true,
  'Valid HTTPS URL passes transport validation'
);

assert(
  validateTransportUrl('http://ir.bmwgroup.com/report.pdf').errorCode === 'unsupportedProtocol',
  'Insecure HTTP URL rejected with unsupportedProtocol'
);

assert(
  validateTransportUrl('file:///etc/passwd').errorCode === 'unsupportedProtocol',
  'file:// URL rejected with unsupportedProtocol'
);

assert(
  validateTransportUrl('data:text/html;base64,PHNjcmlwdD4=').errorCode === 'unsupportedProtocol',
  'data: URL rejected with unsupportedProtocol'
);

assert(
  validateTransportUrl('javascript:alert(1)').errorCode === 'unsupportedProtocol',
  'javascript: URL rejected with unsupportedProtocol'
);

assert(
  validateTransportUrl('not-a-valid-url').errorCode === 'invalidUrl',
  'Malformed URL rejected with invalidUrl'
);

assert(
  validateTransportUrl('').errorCode === 'invalidUrl',
  'Empty string URL rejected with invalidUrl'
);

assert(
  validateTransportUrl('https://').errorCode === 'invalidUrl',
  'URL without hostname rejected with invalidUrl'
);

// SSRF loopback / private IP filtering
assert(
  isPrivateOrLoopbackHost('localhost') === true,
  'isPrivateOrLoopbackHost identifies "localhost"'
);
assert(
  isPrivateOrLoopbackHost('127.0.0.1') === true,
  'isPrivateOrLoopbackHost identifies "127.0.0.1"'
);
assert(
  isPrivateOrLoopbackHost('10.0.0.1') === true,
  'isPrivateOrLoopbackHost identifies 10.0.0.0/8'
);
assert(
  isPrivateOrLoopbackHost('192.168.1.1') === true,
  'isPrivateOrLoopbackHost identifies 192.168.0.0/16'
);
assert(
  isPrivateOrLoopbackHost('172.20.0.1') === true,
  'isPrivateOrLoopbackHost identifies 172.16.0.0/12'
);
assert(
  isPrivateOrLoopbackHost('ir.bmwgroup.com') === false,
  'isPrivateOrLoopbackHost allows public domain "ir.bmwgroup.com"'
);

assert(
  validateTransportUrl('https://127.0.0.1/report.pdf').errorCode === 'invalidUrl',
  'Loopback HTTPS URL rejected by default SSRF policy'
);
assert(
  validateTransportUrl('https://localhost/report.pdf').errorCode === 'invalidUrl',
  'localhost HTTPS URL rejected by default SSRF policy'
);
assert(
  validateTransportUrl('https://127.0.0.1/report.pdf', { allowLocalhost: true }).valid === true,
  'Loopback HTTPS URL allowed when allowLocalhost is explicitly enabled'
);

// ────────────────────────────────────────────────────────────────────────────
// 3. Content-Type Policy & Parameter Parsing (STEP 5-1, Section 3)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Content-Type Policy & Parameter Parsing ---');

const parsedPdf = parseContentType('application/pdf');
assert(parsedPdf?.mediaType === 'application/pdf', 'Parses plain application/pdf');

const parsedPdfBinary = parseContentType('application/pdf; charset=binary');
assert(
  parsedPdfBinary?.mediaType === 'application/pdf' && parsedPdfBinary.parameters.charset === 'binary',
  'Parses application/pdf with charset parameter'
);

const parsedHtmlUtf8 = parseContentType('text/html; charset=utf-8');
assert(
  parsedHtmlUtf8?.mediaType === 'text/html' && parsedHtmlUtf8.parameters.charset === 'utf-8',
  'Parses text/html with charset=utf-8'
);

const parsedQuoted = parseContentType('text/html; charset="UTF-8"');
assert(
  parsedQuoted?.mediaType === 'text/html' && parsedQuoted.parameters.charset === 'UTF-8',
  'Strips quotes from parameterized charset'
);

assert(parseContentType(null) === null, 'Returns null for null Content-Type');
assert(parseContentType('') === null, 'Returns null for empty Content-Type');
assert(parseContentType('   ') === null, 'Returns null for whitespace Content-Type');

// ────────────────────────────────────────────────────────────────────────────
// 4. Successful Ingestion & Metadata Preservation (STEP 5-1, Section 2 & 8)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Successful Ingestion & Metadata Preservation ---');

async function runFetchTests() {
  const testPdfBytes = Buffer.from('%PDF-1.7 BMW Group Q2 2026 Earnings Report Raw Data', 'utf-8');
  const expectedPdfHash = createHash('sha256').update(testPdfBytes).digest('hex');

  const mockSuccessFetch = createMockFetch({
    'https://ir.bmwgroup.com/q2-2026.pdf': () =>
      new Response(testPdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(testPdfBytes.byteLength),
        },
      }),
    'https://ir.bmwgroup.com/annual.html': () =>
      new Response('<html><body><h1>BMW Group Annual Report</h1></body></html>', {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }),
  });

  const pdfResult = await fetchOfficialIrSource('https://ir.bmwgroup.com/q2-2026.pdf', {
    fetchFn: mockSuccessFetch,
    allowLocalhost: true,
  });

  assert(pdfResult.success === true, 'Successful PDF retrieval returns success: true');
  if (pdfResult.success) {
    const doc = pdfResult.document;
    assert(doc.url === 'https://ir.bmwgroup.com/q2-2026.pdf', 'Original URL preserved');
    assert(doc.finalUrl === 'https://ir.bmwgroup.com/q2-2026.pdf', 'Final URL preserved');
    assert(doc.httpStatus === 200, 'HTTP status 200 preserved');
    assert(doc.contentType === 'application/pdf', 'Content-Type preserved');
    assert(doc.contentLength === testPdfBytes.byteLength, 'Byte length matches exact raw bytes');
    assert(doc.contentHash === expectedPdfHash, 'Content hash matches SHA-256 of exact raw bytes');
    assert(doc.hashAlgorithm === 'sha256', 'Hash algorithm is sha256');
    assert(doc.sourceKind === 'official_ir', 'Source kind is official_ir');
    assert(!isNaN(Date.parse(doc.retrievedAt)), 'Retrieval timestamp is valid ISO-8601');
    assert(pdfResult.rawBytes.byteLength === testPdfBytes.byteLength, 'rawBytes preserved in fetch result');
  }

  const htmlResult = await fetchOfficialIrSource('https://ir.bmwgroup.com/annual.html', {
    fetchFn: mockSuccessFetch,
    allowLocalhost: true,
  });

  assert(htmlResult.success === true, 'Successful HTML retrieval with charset parameter returns success: true');
  if (htmlResult.success) {
    assert(htmlResult.document.contentType === 'text/html; charset=utf-8', 'Parameterized Content-Type preserved');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Redirect Security Controls (STEP 5-1, Section 2 & 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Redirect Security Controls ---');

  const mockRedirectFetch = createMockFetch({
    // HTTPS -> HTTPS redirect (valid)
    'https://bmw.com/ir': () =>
      new Response(null, {
        status: 301,
        headers: { Location: 'https://ir.bmwgroup.com/q2-2026.pdf' },
      }),
    'https://ir.bmwgroup.com/q2-2026.pdf': () =>
      new Response(testPdfBytes, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),

    // HTTPS -> HTTP redirect (insecure downgrade)
    'https://insecure-redirect.com/doc': () =>
      new Response(null, {
        status: 302,
        headers: { Location: 'http://insecure-redirect.com/doc.pdf' },
      }),

    // Redirect loop
    'https://loop.com/a': () =>
      new Response(null, {
        status: 302,
        headers: { Location: 'https://loop.com/b' },
      }),
    'https://loop.com/b': () =>
      new Response(null, {
        status: 302,
        headers: { Location: 'https://loop.com/a' },
      }),

    // Exceed max redirects (chain of 6 redirects)
    'https://chain.com/1': () => new Response(null, { status: 302, headers: { Location: 'https://chain.com/2' } }),
    'https://chain.com/2': () => new Response(null, { status: 302, headers: { Location: 'https://chain.com/3' } }),
    'https://chain.com/3': () => new Response(null, { status: 302, headers: { Location: 'https://chain.com/4' } }),
    'https://chain.com/4': () => new Response(null, { status: 302, headers: { Location: 'https://chain.com/5' } }),
    'https://chain.com/5': () => new Response(null, { status: 302, headers: { Location: 'https://chain.com/6' } }),
    'https://chain.com/6': () => new Response(null, { status: 302, headers: { Location: 'https://chain.com/7' } }),
    'https://chain.com/7': () => new Response(testPdfBytes, { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
  });

  // Test HTTPS -> HTTPS redirect
  const redirResult = await fetchOfficialIrSource('https://bmw.com/ir', {
    fetchFn: mockRedirectFetch,
    allowLocalhost: true,
  });
  assert(redirResult.success === true, 'HTTPS -> HTTPS redirect succeeds');
  if (redirResult.success) {
    assert(redirResult.document.url === 'https://bmw.com/ir', 'Redirect preserves original URL');
    assert(redirResult.document.finalUrl === 'https://ir.bmwgroup.com/q2-2026.pdf', 'Redirect records destination finalUrl');
  }

  // Test HTTPS -> HTTP redirect rejected
  const downgradeResult = await fetchOfficialIrSource('https://insecure-redirect.com/doc', {
    fetchFn: mockRedirectFetch,
    allowLocalhost: true,
  });
  assert(downgradeResult.success === false, 'HTTPS -> HTTP downgrade redirect fails');
  if (!downgradeResult.success) {
    assert(
      downgradeResult.error.code === 'redirectProtocolRejected',
      'HTTPS -> HTTP downgrade returns redirectProtocolRejected error code'
    );
  }

  // Test redirect loop rejected
  const loopResult = await fetchOfficialIrSource('https://loop.com/a', {
    fetchFn: mockRedirectFetch,
    allowLocalhost: true,
  });
  assert(loopResult.success === false, 'Redirect loop fails');
  if (!loopResult.success) {
    assert(
      loopResult.error.code === 'redirectLimitExceeded',
      'Redirect loop returns redirectLimitExceeded error code'
    );
  }

  // Test redirect limit exceeded (max 5)
  const limitResult = await fetchOfficialIrSource('https://chain.com/1', {
    fetchFn: mockRedirectFetch,
    maxRedirects: 5,
    allowLocalhost: true,
  });
  assert(limitResult.success === false, 'Exceeding max redirects fails');
  if (!limitResult.success) {
    assert(
      limitResult.error.code === 'redirectLimitExceeded',
      'Exceeding max redirects returns redirectLimitExceeded error code'
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. HTTP Status Validation (STEP 5-1, Section 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. HTTP Status Validation ---');

  const mockHttpErrorFetch = createMockFetch({
    'https://ir.test.com/404': () => new Response('File Not Found', { status: 404, statusText: 'Not Found' }),
    'https://ir.test.com/500': () => new Response('Internal Server Error', { status: 500, statusText: 'Server Error' }),
    'https://ir.test.com/403': () => new Response('Forbidden', { status: 403, statusText: 'Forbidden' }),
  });

  const res404 = await fetchOfficialIrSource('https://ir.test.com/404', { fetchFn: mockHttpErrorFetch, allowLocalhost: true });
  assert(res404.success === false && res404.error.code === 'httpError', 'HTTP 404 rejected with httpError');
  if (!res404.success) assert(res404.error.httpStatus === 404, 'HTTP 404 preserves httpStatus 404');

  const res500 = await fetchOfficialIrSource('https://ir.test.com/500', { fetchFn: mockHttpErrorFetch, allowLocalhost: true });
  assert(res500.success === false && res500.error.code === 'httpError', 'HTTP 500 rejected with httpError');
  if (!res500.success) assert(res500.error.httpStatus === 500, 'HTTP 500 preserves httpStatus 500');

  const res403 = await fetchOfficialIrSource('https://ir.test.com/403', { fetchFn: mockHttpErrorFetch, allowLocalhost: true });
  assert(res403.success === false && res403.error.code === 'httpError', 'HTTP 403 rejected with httpError');

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Request Timeout Enforcement (STEP 5-1, Section 2 & 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Request Timeout Enforcement ---');

  const mockSlowFetch: typeof fetch = (async (_input: any, init?: RequestInit) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(new Response(testPdfBytes, { status: 200, headers: { 'Content-Type': 'application/pdf' } }));
      }, 500);

      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  }) as typeof fetch;

  const timeoutResult = await fetchOfficialIrSource('https://ir.test.com/slow-report.pdf', {
    fetchFn: mockSlowFetch,
    timeoutMs: 50, // Short timeout
    allowLocalhost: true,
  });

  assert(timeoutResult.success === false, 'Slow request triggers abort timeout');
  if (!timeoutResult.success) {
    assert(timeoutResult.error.code === 'requestTimeout', 'Timeout returns requestTimeout error code');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Response Size Limit Enforcement (STEP 5-1, Section 2 & 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Response Size Limit Enforcement ---');

  const mockLargeFetch = createMockFetch({
    // Exceeds via Content-Length header
    'https://ir.test.com/stated-too-large.pdf': () =>
      new Response(Buffer.alloc(100), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': '50000000', // 50 MB stated
        },
      }),

    // Exceeds via streaming chunks without stated Content-Length
    'https://ir.test.com/streamed-too-large.pdf': () => {
      const chunk1 = Buffer.alloc(1024, 0x41);
      const chunk2 = Buffer.alloc(1024, 0x42);
      const stream = createMockStream([chunk1, chunk2]);
      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
    },
  });

  // Stated Content-Length check
  const statedLargeResult = await fetchOfficialIrSource('https://ir.test.com/stated-too-large.pdf', {
    fetchFn: mockLargeFetch,
    maxResponseBytes: 10 * 1024 * 1024, // 10 MB limit
    allowLocalhost: true,
  });
  assert(statedLargeResult.success === false, 'Stated Content-Length exceeding limit is rejected');
  if (!statedLargeResult.success) {
    assert(statedLargeResult.error.code === 'responseTooLarge', 'Returns responseTooLarge on oversized Content-Length');
  }

  // Streamed chunk check
  const streamLargeResult = await fetchOfficialIrSource('https://ir.test.com/streamed-too-large.pdf', {
    fetchFn: mockLargeFetch,
    maxResponseBytes: 1500, // 1.5 KB limit, but stream sends 2 KB
    allowLocalhost: true,
  });
  assert(streamLargeResult.success === false, 'Streamed chunks exceeding limit are rejected mid-stream');
  if (!streamLargeResult.success) {
    assert(streamLargeResult.error.code === 'responseTooLarge', 'Returns responseTooLarge on oversized streamed chunks');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Content-Type Policy Enforcement (STEP 5-1, Section 3 & 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 9. Content-Type Policy Enforcement ---');

  const mockContentTypeFetch = createMockFetch({
    'https://ir.test.com/missing-ct': () =>
      new Response(new Uint8Array(4), { status: 200 }), // No Content-Type header
    'https://ir.test.com/json-data': () =>
      new Response('{"data": 1}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    'https://ir.test.com/zip-file': () =>
      new Response(Buffer.alloc(10), { status: 200, headers: { 'Content-Type': 'application/zip' } }),
    'https://ir.test.com/image-png': () =>
      new Response(Buffer.alloc(10), { status: 200, headers: { 'Content-Type': 'image/png' } }),
  });

  const missingCtResult = await fetchOfficialIrSource('https://ir.test.com/missing-ct', {
    fetchFn: mockContentTypeFetch,
    allowLocalhost: true,
  });
  assert(missingCtResult.success === false, 'Missing Content-Type header rejected');
  if (!missingCtResult.success) {
    assert(missingCtResult.error.code === 'missingContentType', 'Missing Content-Type returns missingContentType');
  }

  const jsonResult = await fetchOfficialIrSource('https://ir.test.com/json-data', {
    fetchFn: mockContentTypeFetch,
    allowLocalhost: true,
  });
  assert(jsonResult.success === false, 'application/json rejected by default policy');
  if (!jsonResult.success) {
    assert(jsonResult.error.code === 'unsupportedContentType', 'application/json returns unsupportedContentType');
  }

  const zipResult = await fetchOfficialIrSource('https://ir.test.com/zip-file', {
    fetchFn: mockContentTypeFetch,
    allowLocalhost: true,
  });
  assert(zipResult.success === false, 'application/zip rejected by default policy');
  if (!zipResult.success) {
    assert(zipResult.error.code === 'unsupportedContentType', 'application/zip returns unsupportedContentType');
  }

  const imageResult = await fetchOfficialIrSource('https://ir.test.com/image-png', {
    fetchFn: mockContentTypeFetch,
    allowLocalhost: true,
  });
  assert(imageResult.success === false, 'image/png rejected by default policy');
  if (!imageResult.success) {
    assert(imageResult.error.code === 'unsupportedContentType', 'image/png returns unsupportedContentType');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Separation of Concerns & Official Source Authorization (STEP 5-1, Section 5)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 10. Official Source Authorization & Separation of Concerns ---');

  // Verify that an arbitrary HTTPS website is NOT marked as an authorized OEM IR source
  const arbitraryUrl = 'https://some-random-investor-site.com/q2.pdf';
  const authArbitrary = isAuthorizedOfficialSource(arbitraryUrl);
  assert(authArbitrary.authorized === false, 'Arbitrary HTTPS website is NOT recognized as authorized official IR source');

  // Verify that an official primary source document from registry IS recognized
  const officialTeslaUrl = 'https://digitalassets.tesla.com/tesla-contents/image/upload/IR/TSLA-Q2-2026-Update.pdf';
  const authTesla = isAuthorizedOfficialSource(officialTeslaUrl);
  assert(authTesla.authorized === true, 'Registered official Tesla IR document is recognized as authorized source');
  assert(authTesla.companyId === 'tesla', 'Matches correct companyId "tesla"');
  assert(authTesla.sourceDoc?.id === 'tsla_2026_q2_deck', 'Matches registered sourceDocId "tsla_2026_q2_deck"');

  // Verify direct matchRegisteredSourceDocument with SOURCE_DOCUMENTS
  const matchedDoc = matchRegisteredSourceDocument(officialTeslaUrl, SOURCE_DOCUMENTS);
  assert(matchedDoc?.id === 'tsla_2026_q2_deck', 'matchRegisteredSourceDocument matches registered document');
  const matchedNone = matchRegisteredSourceDocument(arbitraryUrl, SOURCE_DOCUMENTS);
  assert(matchedNone === undefined, 'matchRegisteredSourceDocument returns undefined for unregistered document');

  // Retrieval with requireSourceAuthorization: true
  const mockAuthorizedFetch = createMockFetch({
    [officialTeslaUrl]: () =>
      new Response(testPdfBytes, { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
    [arbitraryUrl]: () =>
      new Response(testPdfBytes, { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
  });

  const authFetchSuccess = await fetchOfficialIrSource(officialTeslaUrl, {
    fetchFn: mockAuthorizedFetch,
    requireSourceAuthorization: true,
    allowLocalhost: true,
  });
  assert(authFetchSuccess.success === true, 'Authorized URL fetch succeeds when requireSourceAuthorization: true');
  if (authFetchSuccess.success) {
    const liveDoc: LiveSourceDocument = authFetchSuccess.document;
    assert(liveDoc.sourceDocId === 'tsla_2026_q2_deck', 'Associates registered sourceDocId');
    assert(liveDoc.companyId === 'tesla', 'Associates registered companyId');
  }

  const authFetchFailure = await fetchOfficialIrSource(arbitraryUrl, {
    fetchFn: mockAuthorizedFetch,
    requireSourceAuthorization: true,
    allowLocalhost: true,
  });
  assert(authFetchFailure.success === false, 'Unauthorized URL rejected when requireSourceAuthorization: true');
  if (!authFetchFailure.success) {
    assert(authFetchFailure.error.code === 'unauthorizedSource', 'Returns unauthorizedSource error code');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Architectural Boundary: source_retrieved ≠ source_verified ≠ claim_verified (STEP 5-1, Section 6)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 11. Invariant: source_retrieved ≠ source_verified ≠ claim_verified ---');

  if (pdfResult.success) {
    const doc: LiveSourceDocument = pdfResult.document;
    const docAsAny: any = doc;
    assert(docAsAny.state === undefined, 'LiveSourceDocument does NOT possess state property');
    assert(docAsAny.verifiedValue === undefined, 'LiveSourceDocument does NOT possess verifiedValue property');
    assert(docAsAny.verifiedMetricId === undefined, 'LiveSourceDocument does NOT possess verifiedMetricId property');
    assert(docAsAny.verifiedNumericValue === undefined, 'LiveSourceDocument does NOT possess verifiedNumericValue property');
    assert(docAsAny.verifiedScope === undefined, 'LiveSourceDocument does NOT possess verifiedScope property');
    assert(docAsAny.verifiedAccountingBasis === undefined, 'LiveSourceDocument does NOT possess verifiedAccountingBasis property');
    assert(docAsAny.verifiedPeriod === undefined, 'LiveSourceDocument does NOT possess verifiedPeriod property');
    assert(doc.sourceKind === 'official_ir', 'Document is explicitly identified as sourceKind: "official_ir"');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Final Test Report
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=============================================================================');
  console.log(`Live Source Ingestion Test Results: ${passed} passed, ${failed} failed.`);
  console.log('=============================================================================');

  if (failed > 0) {
    console.error(`\n❌ Live Source Ingestion test suite FAILED with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 All live source ingestion and cryptographic provenance tests passed!');
  }
}

runFetchTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
