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

---

## STEP 5-5: Official OEM Investor Relations Source Integration & Pipeline

### 1. Official IR Source Registry (`OFFICIAL_IR_SOURCES`)
Rather than crawling arbitrary web pages or recursively traversing links, AutoMetrics Intelligence registers specific, audited Investor Relations endpoints:

```ts
export interface OfficialIrSource {
  id: string;
  companyId: string;
  url: string;
  documentType: DocumentType;
  reportingPeriod: string;
  periodType: PeriodType;
  expectedContentType: 'application/pdf' | 'text/html';
  officialDomain: string | string[];
  title: string;
  notes?: string;
  targetClaims?: SourceClaim[];
}
```

Registered sources currently include:
1. **Mercedes-Benz Group AG** (`mbg_2026_q2_results`): `https://group.mercedes-benz.com/investors/reports-news/financial-results/q2-2026.html` (Domains: `group.mercedes-benz.com`, `mercedes-benz.com`).
2. **BMW Group** (`bmw_2026_q2_statement`): `https://www.bmwgroup.com/en/investor-relations/financial-reports.html` (Domains: `www.bmwgroup.com`, `bmwgroup.com`).
3. **Tesla, Inc.** (`tsla_2026_q2_deck`): `https://digitalassets.tesla.com/tesla-contents/image/upload/IR/TSLA-Q2-2026-Update.pdf` (Domains: `digitalassets.tesla.com`, `ir.tesla.com`, `tesla.com`).

### 2. Officiality Gate & Redirect Security
- **Transport Security ≠ Officiality**: Simply using HTTPS does not make a site an authorized corporate disclosure. The URL must match the explicit `officialDomain` policy of the automaker.
- **Redirect Perimeter Enforcement**: If a request encounters HTTP 301/302/307 redirects, the fetcher tracks the `finalUrl` and verifies that the final destination remains within the authorized `officialDomain` perimeter. Redirects to unauthorized third parties are strictly rejected with `unauthorizedDomainRedirect`.

### 3. Complete End-to-End Pipeline Walkthrough
The unified pipeline (`executeOfficialSourcePipeline`) orchestrates:

```text
Registered Official Source (e.g. mbg_2026_q2_results)
  │
  ▼ [1. Domain Policy Check]
isUrlInOfficialDomain(url, officialDomain)
  │
  ▼ [2. Secure Fetch — STEP 5-1]
fetchOfficialIrSource(url) ──► Raw Bytes & SHA-256(Raw Bytes)
  │
  ▼ [3. Redirect Safety Check]
isUrlInOfficialDomain(finalUrl, officialDomain)
  │
  ▼ [4. Deterministic Extraction — STEP 5-2]
extractLiveDocument(liveDoc, rawBytes) ──► ExtractedLiveDocument
  │
  ▼ [5. Structured Evidence Binding — STEP 5-3]
bindLiveEvidence(extractedDoc, bindingParams) ──► LiveEvidenceCandidate
  │
  ▼ [6. Verification Engine Execution — STEP 5-4]
verifyClaimEvidence(claim, sourceDoc, rawValue, supportType, { liveCandidate })
  │
  ▼ [7. Validation & Anti-Forgery Gate]
validateClaimVerificationResult() + resolveClaimVerificationState()
  │
  ▼
OfficialSourcePipelineResult {
  success: true,
  verificationState: 'claim_verified',
  claimVerificationResult: {
    state: 'claim_verified',
    verificationOrigin: 'live_source',
    sourceContentHash: '<exact-wire-sha256>',
    verifiedMetricId: 'operating_margin',
    verifiedNumericValue: 4.0,
    verifiedScope: 'cars_segment',
    verifiedAccountingBasis: 'adjusted',
    verifiedPeriod: '2026-Q2',
    ...
  }
}
```

### 4. Reproducibility Limitations of Live Web Sources
1. **Endpoint Mutability**:
   Unlike Git repository content or immutable storage, live corporate web servers can modify HTML, rotate certificates, re-encode PDFs, or relocate reports without notice.
2. **Content-Addressed Immutability vs URL**:
   A URL is a mutable address, not a permanent identifier of content. The true cryptographic boundary is `contentHash = sha256(rawBytes)`.
3. **Byte Alteration Invariant**:
   If an official IR endpoint returns different bytes tomorrow (even a single byte or header change), the recomputed `contentHash` will differ. The system treats this as a distinct source version; prior verification results cannot be transferred or assumed valid without re-evaluating the new bytes.
4. **Offline Test Determinism**:
   To ensure that build pipelines and CI never depend on external server availability or transient network outages, standard test suites (`npm test`) use deterministic mock transport representations of authentic live disclosures. Real live network requests are isolated to optional test commands (`npm run test:live`).
5. **DNS Rebinding Limitation**:
   In production environments with public DNS resolvers, a hostname could resolve to a benign IP during pre-flight checks and later resolve to a private IP during fetch. True anti-rebinding requires custom socket-level connection binding / IP pinning, an egress proxy with strict DNS validation, or RFC 6761 local domain filtering at the network level. The application-layer checks implemented here guard against host-header and URL-level redirection attacks, but do not replace kernel- or network-level DNS pinning.

### 5. Evidence-to-Document Block Resolution (STEP 5 Remediation)
To eliminate verification forgery gaps, live evidence is strictly bound to an authoritative extracted document content block:
1. `bindLiveEvidence()` resolves the supplied locator against `ExtractedLiveDocument.blocks`.
2. Exactly one matching block is required; zero or ambiguous matches strictly fail with `blockResolutionStatus: 'failed'`.
3. Authoritative evidence text is derived directly from the matched block (`matchedBlock.text`), ignoring unverified caller claims.
4. The claimed raw value is verified to be present in the matched block's text.
5. `verifyClaimEvidence()` and `validateClaimVerificationResult()` enforce that the resolved `blockId` exists in the extracted document, its text matches the candidate evidence text, and the claimed value appears in the block text.
6. Synthesized fallback `SourceDocument` metadata instances remain strictly `isVerified: false` (`verificationStatus: 'unverified'`).

### 6. Mandatory Live Evidence Binding & Security Hardening (STEP 5 Remediation Round 2)
1. **Mandatory Extracted Document Gate (P0-1)**:
   - For all live verification paths (`verificationOrigin === 'live_source'`), `extractedLiveDocument` is strictly mandatory.
   - If missing in `verifyClaimEvidence()`, the verification immediately downgrades to `source_verified` with `failureReason: 'liveExtractedDocumentMissing'`.
   - If missing in `validateClaimVerificationResult()`, validation fails with `verificationExtractedDocumentMissing`.
   - The candidate's `blockId` must resolve to exactly one block in `extractedLiveDocument.blocks`. Zero or multiple matches fail with `verificationBlockNotFound` or `verificationBlockAmbiguous`.
   - Candidate `sourceDocId` and `sourceContentHash` must match the extracted document's source document.
   - Authoritative block text and raw values are verified against the resolved block.
2. **Strict Token-Boundary Numeric Matching (P0-2)**:
   - `isValuePresentInBlock()` enforces explicit token boundaries with lookbehind and lookahead: `(?<![\d.])` and `(?![\d.])`.
   - Preserves signs (`-4.0` does not match `4.0`).
   - Rejects numeric substrings (`4.0` does not match `14.0` or `4.01`).
   - Preserves percentage semantics (`4.0%` does not match pure number `4.0`).
   - Normalizes thousands separators (`1,200` matches `1200`).
   - Respects scale and unit semantics (`€1.2 billion` does not match `1.2 million`).
   - Ambiguity rejection: If multiple tokens in the block match the target value/unit, returns `false` (fails ambiguous resolution).
3. **DNS/IP SSRF Protection (P1-1)**:
   - `fetchOfficialIrSource()` resolves hostnames to IP addresses before dispatching the initial request and before following every redirect hop.
   - Rejects private, loopback, link-local, carrier-grade, reserved, multicast, or non-public IP addresses.
   - Configurable `dnsLookupFn` allows complete network independence and deterministic unit testing.
   - In production deployments, DNS rebinding mitigations (e.g. egress proxy or socket-level IP pinning) should be combined with pre-flight resolution.
4. **Registered Claims vs Verified Claims & Mock Tagging (P1-2)**:
   - `targetClaims` in the official IR registry represent explicit targets/expectations to be verified, never pre-verified claims.
   - Pipeline executions via mock HTTP transports are explicitly tagged with `isMockVerification: true` and cannot be counted as real live-source verifications.

---

### 7. Evidence-to-Claim Semantic Binding (STEP 5 Remediation Round 3, P0)

Prior to Round 3, the live verification path verified that numeric tokens appeared in an extracted document block and checked that candidate metadata matched the requested claim. However, the candidate's `metricId`, `scope`, `accountingBasis`, `period`, and related dimensions could still be caller-supplied. Numeric presence alone does not prove these dimensions (e.g. a block containing `Cars division: 4.0%` must not automatically prove `metric = operating_margin`, `accountingBasis = adjusted`, and `period = 2026-Q2`).

#### Strict Document-Derived Dimension Proof
1. **Traceability Gate**: Every path producing `state: 'claim_verified'` from a live source requires authoritative, document-derived evidence for every necessary claim dimension:
   - `metricId`: Proven by explicit metric labels in cell text, row headers, column headers, or section headings (e.g. `Return on Sales`, `EBIT margin`, `Operating profit`).
   - `rawValue` / `numericValue`: Proven by exact token-boundary numeric matching in the cell or block text.
   - `unit`: Proven by explicit unit tokens (`%`, `million`, `billion`, `units`) or document table headers.
   - `scope`: Proven by explicit segment/division labels (`Mercedes-Benz Cars`, `Automotive Segment`, `Consolidated Group`).
   - `accountingBasis`: Proven by explicit accounting basis indicators (`Adjusted`, `Adj.`, `Bereinigt`, `Reported`, `Before special items`).
   - `period` & `periodType`: Proven by explicit reporting periods in column headers, row headers, section headings, or document title (`Q2 2026`, `2026-Q2`, `Three Months Ended June 30, 2026`).
   - `tableCoordinates`: Table index, row index, column index, and resolved column/row headers.
2. **Anti-Contradiction Gate**: Caller-supplied metadata cannot override contradictory document text. For example, if a table row specifies `Adjusted Return on Sales: 4.0%`, a caller claiming `reported` basis is strictly rejected with `accountingBasisMismatch`.
3. **Multi-Metric Ambiguity Rejection**: Unstructured blocks containing multiple metrics and numbers without structured token pairing strictly fail with `ambiguousDimensionEvidence`.
4. **Mandatory Downgrade**: If an extracted block provides the numeric value but lacks document proof for one or more dimensions, verification strictly downgrades to `source_verified` and records specific diagnostic failure codes:
   - `unprovenMetricSemantic`
   - `unprovenAccountingBasis`
   - `unprovenReportingScope`
   - `unprovenReportingPeriod`
   - `unprovenUnit`
   - `ambiguousDimensionEvidence`

---

### 8. Structured Table Extraction & Semantic Association (STEP 5 Remediation Round 3, P1)

Financial reports present data predominantly in structured tables. The extraction and binding layers preserve complete two-dimensional table structures:
1. **Multi-Level Headers (`colspan` & `rowspan`)**:
   - The HTML extractor (`extractHtmlDocument`) tracks active `rowspan` and `colspan` attributes across rows.
   - Generates composite, hierarchical column headers (e.g. `Three Months Ended June 30, 2026 | Adjusted`).
2. **Comparative Periods Side-by-Side**:
   - Accurately associates adjacent columns with distinct reporting periods (e.g. `Q2 2026` vs `Q2 2025`).
3. **Repeated Value Disambiguation**:
   - When identical numeric values appear across multiple columns (e.g. `4.0%` in Q2 2026 and `4.0%` in Q2 2025), the binder disambiguates cell coordinates using column headers matching the claimed period and accounting basis.
4. **Coordinate Tracking**:
   - `LiveEvidenceCandidate` and `ClaimVerifiedResult` carry `tableCoordinates` (`tableIndex`, `rowIndex`, `columnIndex`, `columnHeader`, `rowHeader`) and `provenDimensions` (`ProvenanceClaimDimensions`) ensuring full audit traceability.

---

### 9. DNS Rebinding & Socket Pinning Limitations

- **Preflight DNS Check vs Socket Pinning**: The preflight DNS resolution check in `fetchOfficialIrSource()` verifies that the target domain does not resolve to a private or loopback IP before dispatching the HTTP request or following a redirect.
- **Limitation**: In standard Node.js `fetch()`, the preflight resolution and the underlying socket connection use separate DNS queries. If an attacker controls the authoritative nameserver and sets a 0-second TTL (DNS rebinding), the IP could theoretically change between preflight and socket connection.
- **Production Architecture Requirement**: For production environments requiring strict protection against DNS rebinding, deployment architecture must enforce:
  1. An egress HTTP proxy with strict destination IP validation, OR
  2. A custom socket-level dispatcher (e.g. `undici` `Agent` with `connect` options) that pins the socket connection directly to the preflight-validated IP address, OR
  3. Network-level DNS firewall / egress filtering rules.



