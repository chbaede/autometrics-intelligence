/**
 * AutoMetrics Intelligence — Live PDF/HTML Document Extraction Test Suite (STEP 5-2)
 *
 * Validates:
 * 1. Deterministic PDF text extraction (text-based, multi-page, empty/no-text, FlateDecode-compressed)
 * 2. Scanned image-only PDF detection (returns extractionUnavailable without faking OCR)
 * 3. Malformed PDF detection (invalidDocument)
 * 4. Structured HTML extraction (title, headings, paragraphs, tables, entity decoding)
 * 5. Malformed / minimal HTML handling
 * 6. Cryptographic provenance preservation (contentHash, originalUrl, finalUrl, sourceKind survive intact)
 * 7. Derived text hash calculation (strictly distinguished from wire raw-byte contentHash)
 * 8. Determinism (same bytes + parser produce identical representation)
 * 9. Content-Type dispatching & error models (unsupportedContentType, emptyDocument)
 * 10. Architectural boundary: extraction does NOT verify claims (source_retrieved ≠ source_verified ≠ claim_verified)
 */

import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import {
  extractLiveDocument,
  extractPdfDocument,
  extractHtmlDocument,
  decodeHtmlEntities,
  decodePdfLiteralString,
  decodePdfHexString,
  computeDerivedTextHash,
  PDF_EXTRACTION_METHOD,
  PDF_EXTRACTION_VERSION,
  HTML_EXTRACTION_METHOD,
  HTML_EXTRACTION_VERSION,
} from '../src/services/liveDocumentExtractor';
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
 * Creates a valid, minimal single-page text PDF buffer for testing.
 */
function createSinglePagePdf(text: string, compressed = false): Uint8Array {
  let streamBytes = Buffer.from(`BT\n/F1 12 Tf\n72 700 Td\n(${text}) Tj\nET`);
  let filterStr = '';
  if (compressed) {
    streamBytes = deflateSync(streamBytes);
    filterStr = '/Filter /FlateDecode';
  }

  const prefix = Buffer.from(
    `%PDF-1.4\n` +
      `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n` +
      `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n` +
      `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n` +
      `4 0 obj << /Length ${streamBytes.length} ${filterStr} >>\nstream\n`,
    'latin1'
  );
  const suffix = Buffer.from(`\nendstream\nendobj\nxref\n0 5\ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n250\n%%EOF`, 'latin1');

  return new Uint8Array(Buffer.concat([prefix, streamBytes, suffix]));
}

/**
 * Creates a valid multi-page PDF buffer with separate text on each page.
 */
function createMultiPagePdf(pages: string[]): Uint8Array {
  let body = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n`;
  const pageObjIds: string[] = [];
  const streamObjs: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageId = 3 + i * 2;
    const streamId = pageId + 1;
    pageObjIds.push(`${pageId} 0 R`);

    const streamData = `BT /F1 12 Tf 72 700 Td (${pages[i]}) Tj ET`;
    streamObjs.push(
      `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamId} 0 R >> endobj\n` +
        `${streamId} 0 obj << /Length ${streamData.length} >>\nstream\n${streamData}\nendstream\nendobj\n`
    );
  }

  body += `2 0 obj << /Type /Pages /Kids [${pageObjIds.join(' ')}] /Count ${pages.length} >> endobj\n`;
  body += streamObjs.join('');
  body += `xref\n0 ${3 + pages.length * 2}\ntrailer << /Size ${3 + pages.length * 2} /Root 1 0 R >>\nstartxref\n500\n%%EOF`;

  return new Uint8Array(Buffer.from(body, 'latin1'));
}

/**
 * Creates an empty PDF (page exists, but content stream has no text).
 */
function createEmptyTextPdf(): Uint8Array {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj
4 0 obj << /Length 0 >>
stream
endstream
endobj
trailer << /Root 1 0 R >>
%%EOF`;
  return new Uint8Array(Buffer.from(content, 'latin1'));
}

/**
 * Creates a scanned image-only PDF containing image XObjects and no text streams.
 */
function createScannedImagePdf(): Uint8Array {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /XObject << /Im1 4 0 R >> >> >> endobj
4 0 obj << /Type /XObject /Subtype /Image /Width 100 /Height 100 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 10 >>
stream
0123456789
endstream
endobj
trailer << /Root 1 0 R >>
%%EOF`;
  return new Uint8Array(Buffer.from(content, 'latin1'));
}

/**
 * Helper to build mock LiveSourceDocument with authentic cryptographic hash of rawBytes.
 */
function createMockLiveSource(
  rawBytes: Uint8Array,
  contentType: string,
  url = 'https://ir.example.com/document'
): LiveSourceDocument {
  const contentHash = createHash('sha256').update(rawBytes).digest('hex');
  return {
    id: `live_${contentHash.slice(0, 16)}`,
    url,
    finalUrl: url,
    retrievedAt: new Date().toISOString(),
    httpStatus: 200,
    contentType,
    contentLength: rawBytes.byteLength,
    contentHash,
    hashAlgorithm: 'sha256',
    sourceKind: 'official_ir',
  };
}

console.log('🧪 Starting Live PDF/HTML Document Extraction Test Suite (STEP 5-2)...\n');

// ────────────────────────────────────────────────────────────────────────────
// 1. PDF String Decoding Helpers (STEP 5-2, Section 2)
// ────────────────────────────────────────────────────────────────────────────
console.log('--- 1. PDF String & Hex Decoding ---');

assert(decodePdfLiteralString('Hello World') === 'Hello World', 'Decodes plain literal string');
assert(decodePdfLiteralString('Hello\\nWorld') === 'Hello\nWorld', 'Decodes escaped newline (\\n)');
assert(decodePdfLiteralString('Parenthesis: \\(test\\)') === 'Parenthesis: (test)', 'Decodes escaped parentheses');
assert(decodePdfLiteralString('Backslash: \\\\') === 'Backslash: \\', 'Decodes escaped backslash');
assert(decodePdfLiteralString('Tab: \\t') === 'Tab: \t', 'Decodes escaped tab');
assert(decodePdfLiteralString('\\101\\102\\103') === 'ABC', 'Decodes octal escapes (\\101 -> A)');

assert(decodePdfHexString('48656c6c6f') === 'Hello', 'Decodes ASCII hexadecimal string');
assert(decodePdfHexString('2026') === ' &\x00' || decodePdfHexString('4142') === 'AB', 'Decodes arbitrary hex pairs');

// ────────────────────────────────────────────────────────────────────────────
// 2. Deterministic PDF Text Extraction (STEP 5-2, Section 2)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Deterministic PDF Text Extraction ---');

// A. Valid text-based single page PDF (uncompressed)
const sampleText = 'BMW Group Q2 2026 Automotive EBIT Margin: 2.3%';
const pdfBytes = createSinglePagePdf(sampleText, false);
const livePdfSource = createMockLiveSource(pdfBytes, 'application/pdf');

const pdfResult = extractPdfDocument(livePdfSource, pdfBytes);
assert(pdfResult.success === true, 'Extracts plain text from uncompressed PDF');
if (pdfResult.success) {
  assert(pdfResult.document.extractedText.includes(sampleText), 'Extracted text contains original string');
  assert(pdfResult.document.pageCount === 1, 'Page count is 1 for single-page PDF');
  assert(pdfResult.document.blocks.length >= 1, 'Produces structured content blocks');
  assert(pdfResult.document.blocks[0].pageNumber === 1, 'Block is attributed to Page 1');
  assert(pdfResult.document.blocks[0].locator.startsWith('page:1:'), 'Block contains page:1: locator');
  assert(pdfResult.document.extractionMethod === PDF_EXTRACTION_METHOD, 'Records explicit PDF extraction method');
  assert(pdfResult.document.extractionVersion === PDF_EXTRACTION_VERSION, 'Records explicit PDF extraction version');
}

// B. Valid text-based PDF with FlateDecode compression
const compressedPdfBytes = createSinglePagePdf('Tesla Deliveries Q2 2026: 480.13k units', true);
const liveCompressedSource = createMockLiveSource(compressedPdfBytes, 'application/pdf');
const compResult = extractPdfDocument(liveCompressedSource, compressedPdfBytes);

assert(compResult.success === true, 'Extracts text from /Filter /FlateDecode compressed PDF');
if (compResult.success) {
  assert(
    compResult.document.extractedText.includes('Tesla Deliveries Q2 2026: 480.13k units'),
    'Decompresses and extracts string from Flate stream'
  );
}

// C. Multi-page PDF extraction
const multiPageBytes = createMultiPagePdf([
  'Page 1: Mercedes-Benz Cars Results',
  'Page 2: Adjusted RoS: 4.1%',
  'Page 3: Industrial Free Cash Flow: €1.8B',
]);
const liveMultiSource = createMockLiveSource(multiPageBytes, 'application/pdf');
const multiResult = extractPdfDocument(liveMultiSource, multiPageBytes);

assert(multiResult.success === true, 'Extracts text from multi-page PDF');
if (multiResult.success) {
  assert(multiResult.document.pageCount === 3, 'Reports pageCount = 3');
  assert(multiResult.document.blocks.some((b) => b.pageNumber === 1), 'Has Page 1 blocks');
  assert(multiResult.document.blocks.some((b) => b.pageNumber === 2), 'Has Page 2 blocks');
  assert(multiResult.document.blocks.some((b) => b.pageNumber === 3), 'Has Page 3 blocks');
  assert(multiResult.document.extractedText.includes('Adjusted RoS: 4.1%'), 'Contains Page 2 text');
}

// D. Empty / no-text PDF
const emptyPdfBytes = createEmptyTextPdf();
const liveEmptySource = createMockLiveSource(emptyPdfBytes, 'application/pdf');
const emptyResult = extractPdfDocument(liveEmptySource, emptyPdfBytes);

assert(emptyResult.success === true, 'Empty text PDF succeeds with empty extracted text');
if (emptyResult.success) {
  assert(emptyResult.document.extractedText === '', 'Extracted text is empty string');
  assert(emptyResult.document.blocks.length === 0, 'Produces 0 blocks for empty text PDF');
}

// E. Unsupported / scanned image-only PDF (no OCR)
const scannedBytes = createScannedImagePdf();
const liveScannedSource = createMockLiveSource(scannedBytes, 'application/pdf');
const scannedResult = extractPdfDocument(liveScannedSource, scannedBytes);

assert(scannedResult.success === false, 'Scanned image-only PDF fails extraction cleanly');
if (!scannedResult.success) {
  assert(
    scannedResult.error.code === 'extractionUnavailable',
    'Returns extractionUnavailable code for image-only PDF'
  );
  assert(
    scannedResult.error.message.includes('OCR is not supported'),
    'Explicitly reports that OCR is not supported rather than pretending OCR succeeded'
  );
}

// F. Malformed PDF (missing %PDF header)
const malformedPdfBytes = Buffer.from('NOT A REAL PDF FILE 12345', 'utf-8');
const liveMalformedSource = createMockLiveSource(malformedPdfBytes, 'application/pdf');
const malformedResult = extractPdfDocument(liveMalformedSource, malformedPdfBytes);

assert(malformedResult.success === false, 'Malformed PDF fails validation');
if (!malformedResult.success) {
  assert(malformedResult.error.code === 'invalidDocument', 'Returns invalidDocument error code');
}

// ────────────────────────────────────────────────────────────────────────────
// 3. HTML Entity Decoding Helpers (STEP 5-2, Section 3)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. HTML Entity Decoding ---');

assert(decodeHtmlEntities('&amp; &lt; &gt; &quot; &#39;') === '& < > " \'', 'Decodes basic XML/HTML entities');
assert(decodeHtmlEntities('&euro;100 &pound;50 &yen;1000') === '€100 £50 ¥1000', 'Decodes currency entities (€, £, ¥)');
assert(decodeHtmlEntities('&copy; 2026 &reg;') === '© 2026 ®', 'Decodes copyright/trademark entities');
assert(decodeHtmlEntities('Item&#32;One') === 'Item One', 'Decodes decimal numeric entities (&#32;)');
assert(decodeHtmlEntities('Item&#x20;Two') === 'Item Two', 'Decodes hex numeric entities (&#x20;)');

// ────────────────────────────────────────────────────────────────────────────
// 4. Structured HTML Document Extraction (STEP 5-2, Section 3 & 6)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Structured HTML Document Extraction ---');

const sampleHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tesla, Inc. Q2 2026 Financial Results</title>
  <style>body { font-family: sans-serif; }</style>
  <script>console.log("Ignored script");</script>
</head>
<body>
  <!-- Navigation Header Comment -->
  <header>
    <h1>Q2 2026 Executive Summary</h1>
  </header>
  <main>
    <p>Tesla produced over 410k vehicles and delivered over 480k vehicles in Q2 2026.</p>
    <h2>Financial Highlights</h2>
    <p>Total revenues were up 12% YoY to $28.24B in Q2.</p>
    <table>
      <thead>
        <tr><th>Financial Metric</th><th>Q2-2026</th><th>Q2-2025</th></tr>
      </thead>
      <tbody>
        <tr><td>Revenues ($M)</td><td>28,240</td><td>25,500</td></tr>
        <tr><td>Operating Income ($M)</td><td>398</td><td>1,605</td></tr>
        <tr><td>Operating Margin (%)</td><td>1.4%</td><td>6.3%</td></tr>
      </tbody>
    </table>
    <ul>
      <li>Automotive segment revenue: $21.5B</li>
      <li>Energy storage deployments: 9.4 GWh</li>
    </ul>
  </main>
</body>
</html>
`;

const htmlBytes = Buffer.from(sampleHtml, 'utf-8');
const liveHtmlSource = createMockLiveSource(htmlBytes, 'text/html; charset=utf-8');
const htmlResult = extractHtmlDocument(liveHtmlSource, htmlBytes);

assert(htmlResult.success === true, 'Extracts structured content from HTML');
if (htmlResult.success) {
  const doc = htmlResult.document;
  assert(doc.documentTitle === 'Tesla, Inc. Q2 2026 Financial Results', 'Extracts <title> as documentTitle');
  assert(doc.extractionMethod === HTML_EXTRACTION_METHOD, 'Records explicit HTML extraction method');
  assert(doc.extractionVersion === HTML_EXTRACTION_VERSION, 'Records explicit HTML extraction version');

  // Verify Heading extraction
  const h1 = doc.blocks.find((b) => b.blockType === 'heading' && b.headingLevel === 1);
  assert(h1?.text === 'Q2 2026 Executive Summary', 'Extracts <h1> text');
  assert(h1?.locator === 'html:h1:0', 'Provides deterministic locator for <h1>');

  // Verify Paragraph extraction
  const p0 = doc.blocks.find((b) => b.blockType === 'paragraph' && b.paragraphIndex === 0);
  assert(
    Boolean(p0?.text.includes('Tesla produced over 410k vehicles')),
    'Extracts paragraph text without HTML tags'
  );
  assert(p0?.sectionHeading === 'Q2 2026 Executive Summary', 'Attaches current section heading to paragraph');
  assert(p0?.locator === 'html:p:0', 'Provides deterministic locator for paragraph');

  // Verify Table Row extraction
  const tableRows = doc.blocks.filter((b) => b.blockType === 'table_row');
  assert(tableRows.length === 4, 'Extracts 4 table rows (1 header + 3 data rows)');
  assert(tableRows[0].text === 'Financial Metric | Q2-2026 | Q2-2025', 'Formats header row with column separator');
  assert(tableRows[3].text === 'Operating Margin (%) | 1.4% | 6.3%', 'Formats operating margin data row correctly');
  assert(tableRows[3].locator === 'html:table:0:row:3', 'Provides deterministic locator for table row');

  // Verify List Item extraction
  const listItems = doc.blocks.filter((b) => b.blockType === 'list_item');
  assert(listItems.length === 2, 'Extracts list items');
  assert(listItems[0].text.includes('Automotive segment revenue'), 'Extracts list item text');

  // Verify Scripts and Styles are excluded
  assert(!doc.extractedText.includes('Ignored script'), 'Script contents are excluded from extractedText');
  assert(!doc.extractedText.includes('font-family'), 'Style contents are excluded from extractedText');
  assert(!doc.extractedText.includes('Navigation Header Comment'), 'HTML comments are excluded');
}

// Minimal / Malformed HTML test
const malformedHtml = '<h1>Unclosed Heading<p>Paragraph with missing closing tags and <b>nested';
const malformedBytes = Buffer.from(malformedHtml, 'utf-8');
const liveMalformedHtmlSource = createMockLiveSource(malformedBytes, 'text/html');
const malformedHtmlResult = extractHtmlDocument(liveMalformedHtmlSource, malformedBytes);

assert(malformedHtmlResult.success === true, 'Malformed HTML handled gracefully without crashing');
if (malformedHtmlResult.success) {
  assert(
    malformedHtmlResult.document.extractedText.includes('Unclosed Heading'),
    'Extracts heading text despite missing closing tags'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Cryptographic Provenance Preservation (STEP 5-2, Section 1 & 5)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Cryptographic Provenance Preservation ---');

const expectedStandaloneHash = createHash('sha256').update('test-sample').digest('hex');
assert(
  computeDerivedTextHash('test-sample') === expectedStandaloneHash,
  'computeDerivedTextHash generates canonical SHA-256'
);

const originalHash = livePdfSource.contentHash;

if (pdfResult.success) {
  const doc = pdfResult.document;
  assert(doc.sourceDocument.contentHash === originalHash, 'sourceDocument.contentHash survives extraction completely intact');
  assert(doc.sourceDocument.url === livePdfSource.url, 'Original URL survives extraction');
  assert(doc.sourceDocument.finalUrl === livePdfSource.finalUrl, 'Final URL survives extraction');
  assert(doc.sourceDocument.sourceKind === 'official_ir', 'sourceKind remains official_ir');
  assert(doc.sourceDocument.hashAlgorithm === 'sha256', 'hashAlgorithm remains sha256');
  assert(doc.sourceDocument.retrievedAt === livePdfSource.retrievedAt, 'retrievedAt timestamp preserved');

  // Verify derivedTextHash is distinct from raw-byte contentHash
  assert(doc.derivedTextHash !== undefined, 'derivedTextHash is present on ExtractedLiveDocument');
  assert(doc.derivedTextHash !== doc.sourceDocument.contentHash, 'derivedTextHash != raw-byte contentHash');
  assert(/^[0-9a-f]{64}$/.test(doc.derivedTextHash!), 'derivedTextHash is a valid 64-character lowercase SHA-256');
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Extraction Determinism (STEP 5-2, Section 4)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Extraction Determinism ---');

const run1 = extractPdfDocument(livePdfSource, pdfBytes);
const run2 = extractPdfDocument(livePdfSource, pdfBytes);

assert(run1.success && run2.success, 'Both runs succeed');
if (run1.success && run2.success) {
  assert(run1.document.extractedText === run2.document.extractedText, 'Same raw bytes produce exact same extractedText');
  assert(run1.document.derivedTextHash === run2.document.derivedTextHash, 'Same raw bytes produce exact same derivedTextHash');
  assert(run1.document.blocks.length === run2.document.blocks.length, 'Same raw bytes produce identical block count');
  assert(
    JSON.stringify(run1.document.blocks) === JSON.stringify(run2.document.blocks),
    'Same raw bytes produce identical structural content blocks'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 7. Universal Dispatcher & Error Models (STEP 5-2, Section 1 & 7)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n--- 7. Universal Dispatcher & Error Models ---');

async function testDispatcher() {
  // A. Dispatch to PDF
  const dispPdf = await extractLiveDocument(livePdfSource, pdfBytes);
  assert(dispPdf.success === true, 'extractLiveDocument routes application/pdf correctly');
  if (dispPdf.success) {
    assert(dispPdf.document.extractionMethod === PDF_EXTRACTION_METHOD, 'Dispatched to PDF extractor');
  }

  // B. Dispatch to HTML
  const dispHtml = await extractLiveDocument(liveHtmlSource, htmlBytes);
  assert(dispHtml.success === true, 'extractLiveDocument routes text/html correctly');
  if (dispHtml.success) {
    assert(dispHtml.document.extractionMethod === HTML_EXTRACTION_METHOD, 'Dispatched to HTML extractor');
  }

  // C. Unsupported Content-Type
  const zipBytes = Buffer.from('PK\x03\x04 fake zip content', 'latin1');
  const zipSource = createMockLiveSource(zipBytes, 'application/zip');
  const dispZip = await extractLiveDocument(zipSource, zipBytes);
  assert(dispZip.success === false, 'Rejects unsupported Content-Type (application/zip)');
  if (!dispZip.success) {
    assert(dispZip.error.code === 'unsupportedContentType', 'Returns unsupportedContentType code');
    assert(dispZip.sourceDocument.contentHash === zipSource.contentHash, 'Preserves sourceDocument on error');
  }

  // D. Empty raw bytes (0 bytes)
  const emptyBytes = new Uint8Array(0);
  const emptySource = createMockLiveSource(emptyBytes, 'application/pdf');
  const dispEmpty = await extractLiveDocument(emptySource, emptyBytes);
  assert(dispEmpty.success === false, 'Rejects 0-byte buffer');
  if (!dispEmpty.success) {
    assert(dispEmpty.error.code === 'emptyDocument', 'Returns emptyDocument code');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Invariant: extraction ≠ claim_verified (STEP 5-2, Section 10)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Invariant: extraction does NOT verify claims ---');

  if (dispPdf.success) {
    const docAsAny: any = dispPdf.document;
    assert(docAsAny.state === undefined, 'ExtractedLiveDocument does NOT possess state property');
    assert(docAsAny.verifiedValue === undefined, 'ExtractedLiveDocument does NOT possess verifiedValue property');
    assert(docAsAny.verifiedMetricId === undefined, 'ExtractedLiveDocument does NOT possess verifiedMetricId property');
    assert(docAsAny.verifiedNumericValue === undefined, 'ExtractedLiveDocument does NOT possess verifiedNumericValue property');
    assert(docAsAny.verifiedScope === undefined, 'ExtractedLiveDocument does NOT possess verifiedScope property');
    assert(docAsAny.verifiedAccountingBasis === undefined, 'ExtractedLiveDocument does NOT possess verifiedAccountingBasis property');
    assert(docAsAny.verifiedPeriod === undefined, 'ExtractedLiveDocument does NOT possess verifiedPeriod property');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Final Test Report
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=============================================================================');
  console.log(`Live Document Extraction Test Results: ${passed} passed, ${failed} failed.`);
  console.log('=============================================================================');

  if (failed > 0) {
    console.error(`\n❌ Live Document Extraction test suite FAILED with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 All live document extraction and provenance tests passed!');
  }
}

testDispatcher().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
