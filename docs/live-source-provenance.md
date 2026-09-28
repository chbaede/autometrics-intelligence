# Official IR Live Source Ingestion, Extraction, Evidence Binding & Verification Architecture (STEP 5-1 to STEP 5-4)

## Overview

AutoMetrics Intelligence strictly separates source document ingestion, cryptographic byte-level wire provenance, document extraction, evidence candidate binding, and claim/metric verification.

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
  ▼
Live Evidence Binder [STEP 5-3]
  │
  ▼
LiveEvidenceCandidate (Cryptographically Bound Candidate; NO claim_verified)
  │
  ▼
Unified Claim Verification Engine (verifyClaimEvidence) [STEP 5-4]
  │
  ▼
ClaimVerifiedResult (state: 'claim_verified', verificationOrigin: 'live_source')
```

---

## Provenance Layers: Retrieval vs Extraction vs Evidence Candidate vs Claim Verification

| Dimension | Retrieval Provenance (STEP 5-1) | Extraction Provenance (STEP 5-2) | Live Evidence Candidate (STEP 5-3) | Claim Verification (STEP 5-4) |
|:---|:---|:---|:---|:---|
| **Subject** | Wire HTTP transport & raw bytes | Parsed document text & structure | Structured candidate bound to location & metric | Final verified claim / observation |
| **Output Type** | `LiveSourceDocument` | `ExtractedLiveDocument` | `LiveEvidenceCandidate` | `ClaimVerifiedResult` |
| **Authoritative Hash** | `contentHash` = `SHA-256(raw wire bytes)` | Retains wire `contentHash`; optional derived hash | Bound to wire `sourceContentHash` + `sourceDocId` | Provenance-validated against `sourceContentHash` |
| **State Boundary** | `source_retrieved` | Extracted structural representation | Candidate evidence only (unverified claim) | `claim_verified` |
| **Locators** | Document URL / Final URL | `page:N:block:M`, `html:h1:0`, `html:table:0:row:1` | Structured `LiveEvidenceLocator` | Verified locator & inspection diagnostics |

---

## Provenance Models: `repository_fixture` vs `live_source`

AutoMetrics Intelligence supports two distinct evidence verification origins:

| Dimension | `repository_fixture` | `live_source` |
|:---|:---|:---|
| **Storage & Origin** | Deterministic repository-controlled test fixtures (`DETERMINISTIC_SOURCE_CONTENT_FIXTURES`) | Retrieved at runtime from an official Investor Relations (IR) HTTPS endpoint |
| **Content Hash Target** | Binds canonical normalized extracted text (`sha256(normalizeFixtureExtractedText(text))`) | Binds **exact raw HTTP response bytes** (`sha256(rawBytes)`) directly from the wire |
| **Network Dependency** | Zero network access; 100% offline and deterministic | Secure HTTPS live transport; offline mock transport in CI |
| **Security Scope** | Static integrity against repository fixture tampering | Transport security, redirect guards, SSRF mitigation, and byte-level wire provenance |
| **Verification State** | Capable of supporting `claim_verified` when evaluated by verification engine | Capable of supporting `claim_verified` when candidate passes all verification invariants |

---

## Critical Invariant: Retrieval ≠ Extraction ≠ Candidate ≠ Claim Verified

```text
source_retrieved ≠ document_extracted ≠ evidence_bound (candidate) ≠ source_verified ≠ claim_verified
```

1. **`source_retrieved`** (STEP 5-1):
   The live document has been securely retrieved via HTTPS, verified against protocol, timeout, and response size limits, and its exact raw response bytes have been cryptographically hashed with SHA-256. At this stage, **zero metrics, values, scopes, periods, or accounting bases are verified**.

2. **`document_extracted`** (STEP 5-2):
   The raw response bytes are parsed into deterministic textual content blocks preserving structural order, headings, paragraphs, table rows, and page numbers. **Successful extraction does not mean source_verified or claim_verified**. Zero financial claims are validated.

3. **`evidence_bound (candidate)`** (STEP 5-3):
   An explicitly identified document location is bound to target metric dimensions (`metricId`, `rawValue`, `numericValue`, `unit`, `scope`, `accountingBasis`, `period`, `periodType`, `supportType`, `locator`, `evidenceText`) and cryptographically anchored to `sourceContentHash` and `sourceDocId`. **The candidate possesses NO verification state and does NOT verify any claim**.

4. **`source_verified`**:
   The source document identity, publication date, and official URL match an authorized entry in the primary `SOURCE_DOCUMENTS` registry.

5. **`claim_verified`** (STEP 5-4):
   An authentic verification engine (`verifyClaimEvidence()`) evaluates the candidate against the source content and proves the exact claimed metric, numeric value, unit, scope, accounting basis, and period.

---

## STEP 5-4: Live Source Evidence Verification & `claim_verified` Integration

### 1. Single Unified Verification Path (No Second Engine)
AutoMetrics Intelligence strictly avoids parallel or relaxed verification paths for live sources. The same core functions:
- `verifyClaimEvidence()`
- `validateClaimVerificationResult()`
- `resolveClaimVerificationState()`

evaluate both `repository_fixture` and `live_source` evidence with identical semantic rigor.

### 2. Live Claim Verification Output
When a valid live-source evidence candidate satisfies every semantic invariant, it produces:
```ts
{
  state: 'claim_verified',
  verificationOrigin: 'live_source',
  sourceDocId: string,
  sourceContentHash: string, // exact raw response byte SHA-256
  verifiedValue: string,
  verifiedMetricId: string,
  verifiedNumericValue: number,
  verifiedUnit: MetricUnit,
  verifiedScope: ReportingScope,
  verifiedAccountingBasis: AccountingBasis,
  verifiedPeriod: string,
  verifiedPeriodType: PeriodType,
  claimSupportType: EvidenceSupportType,
  verificationMethod: ClaimVerificationEngineMethod,
  engineId: string,
  engineVersion: string,
  verifiedAt: string,
  diagnostics: ClaimVerificationDiagnostics,
}
```

### 3. Cryptographic Provenance Hash Requirement
- For `repository_fixture`: the content hash binds to canonical normalized fixture text.
- For `live_source`: the content hash binds to the **exact raw wire HTTP response bytes**.
- **Crucial Rule**: The live hash proves transport integrity and identifies which exact source bytes were processed. It does **not** treat the hash as proof that the financial claim itself is true. The claim is only verified when metric, value, unit, scope, accounting basis, period, period type, and support type match.

### 4. Strict Downgrade Gate (Anti-Forgery)
A live verification result is strictly downgraded to `source_verified` by `resolveClaimVerificationState()` whenever any required semantic or provenance dimension is missing or mismatched:
1. `missing verificationOrigin` (`verificationOriginMissing`)
2. `repository_fixture origin on a live source` (`verificationOriginMismatch`)
3. `sourceDocId mismatch` (`verificationSourceDocMismatch`)
4. `sourceContentHash mismatch` (`verificationContentHashMismatch`)
5. `metric mismatch & missing` (`verificationMetricMismatch`, `verificationMetricMissing`)
6. `value mismatch & missing` (`verificationValueMismatch`, `verificationValueMissing`)
7. `numeric mismatch & missing` (`verificationNumericValueMismatch`, `verificationNumericValueMissing`)
8. `unit mismatch & missing` (`verificationUnitMismatch`, `verificationUnitMissing`)
9. `scope mismatch & missing` (`verificationScopeMismatch`, `verificationScopeMissing`)
10. `accounting basis mismatch & missing` (`verificationAccountingBasisMismatch`, `verificationAccountingBasisMissing`)
11. `period mismatch & missing` (`verificationPeriodMismatch`, `verificationPeriodMissing`)
12. `period type mismatch & missing` (`verificationPeriodTypeMismatch`, `verificationPeriodTypeMissing`)
13. `support type mismatch` (`verificationSupportTypeMismatch`)
14. `engineId missing` (`verificationEngineIdMissing`)
15. `engineVersion missing` (`verificationEngineVersionMissing`)
16. `verificationMethod invalid` (`verificationMethodMissing`)
17. `verifiedAt invalid` (`verificationTimestampInvalid`)

### 5. Origin Immutability & Architectural Boundary
- A `repository_fixture` result cannot be relabeled as `live_source`.
- A `live_source` result cannot be relabeled as `repository_fixture` against an official IR live document.
- **Architectural Boundary & Limitation**: Current origin immutability relies on document metadata binding (`sourceKind === 'official_ir'`), validator origin expectation enforcement (`expectedOrigin`), and cryptographic fixture table segregation. A live source retrieval does not yet generate an asymmetric digital signature from the OEM; transport TLS guarantees authenticity from the server, but end-to-end cryptographic non-repudiation across offline storage remains bounded to the repository's SHA-256 fixture registry.

---

## Live Evidence Binder & Candidate Model (STEP 5-3)

The live evidence binder (`src/services/liveEvidenceBinder.ts`) produces structured evidence candidates and enforces cryptographic and semantic anti-forgery invariants:

### 1. Deterministic Value & Unit Parsing (`parseValueAndUnit`)
- **Percentages**: e.g. `12.4%`, `-3.5%`, `+2.3%`.
- **Billions & Conversions**: `€1.2 billion`, `1.2bn`, `$1.2B` (normalizes to millions when target unit is `currency_millions` while preserving verbatim `rawValue`).
- **Millions**: `1,200 million`, `€629m`, `28,240M`.
- **Thousand units & Units**: `480.13 thousand units`, `480.13k`, `412,300 units`.
- **Pure numbers**: `2.3`, `1,200`, `-10.5`.

### 2. Deterministic Locator Resolution (`resolveLocator`)
- Pattern-based string locators (`page:2:block:1`, `page:2:table:0:row:1`, `page:3:p:2`).
- Block-level matching against `ExtractedLiveDocument.blocks` to pull verbatim evidence context.
- Pre-structured `LiveEvidenceLocator` passthrough.

### 3. Anti-Forgery Candidate Validation Gates (`validateLiveEvidenceCandidate`)
- **`verificationOrigin`**: Must exist and be strictly `'live_source'` (`verificationOriginMissing`, `verificationOriginInvalid`).
- **`sourceContentHash`**: Must exist, be a valid 64-character lowercase hex digest, and match the target source document (`verificationContentHashMissing`, `verificationContentHashInvalid`, `verificationContentHashMismatch`).
- **`sourceDocId`**: Must match target source document and claim (`verificationSourceDocMismatch`).
- **Semantic Completeness & Matching**:
  - `metricId` (`verificationMetricMissing`, `verificationMetricMismatch`).
  - `rawValue` & `numericValue` (`verificationValueMissing`, `verificationValueMismatch`, `verificationNumericValueMissing`, `verificationNumericValueMismatch`).
  - `unit` (`verificationUnitMissing`, `verificationUnitMismatch`).
  - `scope` (`verificationScopeMissing`, `verificationScopeMismatch`).
  - `accountingBasis` (`verificationAccountingBasisMissing`, `verificationAccountingBasisMismatch`).
  - `period` (`verificationPeriodMissing`, `verificationPeriodMismatch`).
  - `periodType` (`verificationPeriodTypeMissing`, `verificationPeriodTypeMismatch`).
  - `supportType` (`verificationSupportTypeMismatch` with `reported_kpi` <-> `numeric_margin_value` compatibility).
  - `locator` & `evidenceText` (`verificationLocatorMissing`, `verificationEvidenceTextMissing`).

### 4. Bridge to Claim Verification Engine (`candidateToVerificationResult`)
- Converts `LiveEvidenceCandidate` into `ClaimVerifiedResult` with `verificationOrigin: 'live_source'`.
- Seamlessly evaluates against existing `validateClaimVerificationResult()` without weakening fixture verification.

---

## Extraction Engines & Locators (STEP 5-2)

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

## Security & Transport Controls (STEP 5-1)

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
