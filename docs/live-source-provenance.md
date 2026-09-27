# Official IR Live Source Ingestion & Extraction Provenance Architecture (STEP 5-1 & STEP 5-2)

## Overview

AutoMetrics Intelligence strictly separates source document ingestion, cryptographic byte-level wire provenance, and document extraction from claim/metric verification.

```
Official IR HTTPS URL
  │
  ▼
Secure Transport Ingestion (HTTPS only, redirect-safe, timeout/size bounded) [STEP 5-1]
  │
  ▼
Exact Raw Response Bytes
  │
  ▼
SHA-256(Raw Response Bytes) ───► LiveSourceDocument (Transport Provenance Only)
                                       │
                                       ▼
Deterministic Document Extractor (PDF / HTML Structural Extraction) [STEP 5-2]
  │
  ▼
ExtractedLiveDocument (Extraction Provenance + Content Blocks + Locators)
  │
  ▼ (STEP 5-3+, NOT in STEP 5-2)
Claim Verification Engine (Parser / Rule Engine)
  │
  ▼
ClaimVerifiedResult
```

---

## Provenance Layers: Retrieval vs Extraction vs Claim Verification

| Dimension | Retrieval Provenance (STEP 5-1) | Extraction Provenance (STEP 5-2) | Claim Verification (STEP 5-3+) |
|:---|:---|:---|:---|
| **Subject** | Wire HTTP transport & raw bytes | Parsed document text & structure | Specific financial claim / metric |
| **Output Type** | `LiveSourceDocument` | `ExtractedLiveDocument` | `ClaimVerifiedResult` |
| **Authoritative Hash** | `contentHash` = `SHA-256(raw wire bytes)` | Retains `contentHash`; optional `derivedTextHash` = `SHA-256(extractedText)` | Binds claim to `sourceContentHash` |
| **State Boundary** | `source_retrieved` | Extracted content representation | `claim_verified` |
| **Locators** | Document URL / Final URL | `page:N:block:M`, `html:h1:0`, `html:table:0:row:1` | Specific table/page locator |

---

## Provenance Models: `repository_fixture` vs `live_source`

AutoMetrics Intelligence supports two distinct evidence verification origins:

| Dimension | `repository_fixture` | `live_source` |
|:---|:---|:---|
| **Storage & Origin** | Deterministic repository-controlled test fixtures (`DETERMINISTIC_SOURCE_CONTENT_FIXTURES`) | Retrieved at runtime from an official Investor Relations (IR) HTTPS endpoint |
| **Content Hash Target** | Binds canonical normalized extracted text (`sha256(normalizeFixtureExtractedText(text))`) | Binds **exact raw HTTP response bytes** (`sha256(rawBytes)`) directly from the wire |
| **Network Dependency** | Zero network access; 100% offline and deterministic | Secure HTTPS live transport; offline mock transport in CI |
| **Security Scope** | Static integrity against repository fixture tampering | Transport security, redirect guards, SSRF mitigation, and byte-level wire provenance |
| **Verification State** | Capable of supporting `claim_verified` when evaluated by verification engine | Produces `LiveSourceDocument` / `ExtractedLiveDocument`. Never produces `claim_verified` alone |

---

## Critical Invariant: Extraction Does Not Mean Claim Verified

```text
source_retrieved ≠ document_extracted ≠ source_verified ≠ claim_verified
```

1. **`source_retrieved`** (STEP 5-1):
   The live document has been securely retrieved via HTTPS, verified against protocol, timeout, and response size limits, and its exact raw response bytes have been cryptographically hashed with SHA-256. At this stage, **zero metrics, values, scopes, periods, or accounting bases are verified**.

2. **`document_extracted`** (STEP 5-2):
   The raw response bytes are parsed into deterministic textual content blocks preserving structural order, headings, paragraphs, table rows, and page numbers. **Successful extraction does not mean source_verified or claim_verified**. Zero financial claims are validated.

3. **`source_verified`**:
   The source document identity, publication date, and official URL match an authorized entry in the primary `SOURCE_DOCUMENTS` registry.

4. **`claim_verified`** (STEP 5-3+):
   An authentic verification engine (e.g. parser, rule engine) has inspected the extracted content and proved the exact claimed metric, numeric value, unit, scope, accounting basis, and period.

> [!IMPORTANT]
> A successful document extraction produces an `ExtractedLiveDocument`. It **MUST NEVER** produce a `ClaimVerifiedResult` or claim that any financial metric has been verified. Metric claim verification is deferred to subsequent dedicated verification engines (STEP 5-3+).

---

## Extraction Engines & Locators

### 1. PDF Text Extractor (`deterministic_pdf_extractor`, v1.0.0)
- Parses PDF indirect objects and page trees (`/Type /Page`).
- Extracts text from content streams (`BT ... ET`, `Tj`, `TJ`, `'`).
- Decompresses `/Filter /FlateDecode` streams with Node `zlib.inflateSync`.
- Tracks 1-indexed page numbers and assigns deterministic locators: `page:${pageNumber}:block:${index}`.
- Detects image-only / scanned PDFs (`/Subtype /Image`) without text and explicitly returns `extractionUnavailable` rather than faking OCR.

### 2. HTML Structural Extractor (`structured_html_extractor`, v1.0.0)
- Strips `<script>`, `<style>`, `<noscript>`, `<svg>`, and HTML comments.
- Auto-closes unclosed tags in malformed HTML.
- Extracts `<title>` as `documentTitle` (`html:title`).
- Extracts headings (`<h1>`–`<h6>`) with level tracking (`html:h${level}:${index}`).
- Extracts paragraphs (`<p>`) with parent section heading tracking (`html:p:${index}`).
- Extracts table rows (`<tr>`) formatted as column-delimited text (`html:table:${tableIndex}:row:${rowIndex}`).
- Decodes HTML entities (`&amp;`, `&lt;`, `&gt;`, `&euro;`, decimal and hex numeric entities).

---

## Security & Transport Controls

The `liveSourceFetcher` and `liveDocumentExtractor` enforce strict security boundaries:

- **HTTPS-Only Enforcement**: Rejects `http:`, `file:`, `data:`, `javascript:`, and malformed URLs.
- **Manual Redirect Security**:
  - Allows `HTTPS -> HTTPS` redirects up to a maximum limit (default: 5).
  - Rejects `HTTPS -> HTTP` downgrade redirects with `redirectProtocolRejected`.
  - Detects and rejects redirect loops with `redirectLimitExceeded`.
- **Bounded Execution**: Explicit `AbortController` cancellation enforces deterministic request timeouts.
- **Bounded Resource Consumption**: Checks `Content-Length` headers and streams chunks up to `maxResponseBytes` (default: 20 MB) to prevent denial-of-service / memory exhaustion.
- **Content-Type Policy**: Recognizes `application/pdf` and `text/html` (with parameterized charsets); rejects unsupported MIME types.
- **SSRF Mitigation**: Rejects private and loopback address targets (`localhost`, `127.0.0.1`, RFC 1918 subnets) by default unless explicitly permitted in testing harnesses.
- **No Script Execution / No Crawling**: HTML and PDF content is extracted statically without executing scripts or following secondary links.
