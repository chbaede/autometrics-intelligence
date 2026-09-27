# Official IR Live Source Ingestion & Cryptographic Provenance Architecture (STEP 5-1)

## Overview

AutoMetrics Intelligence strictly separates source document ingestion and cryptographic byte-level provenance from claim/metric verification. 

```
Official IR HTTPS URL
  │
  ▼
Secure Transport Ingestion (HTTPS only, redirect-safe, timeout/size bounded)
  │
  ▼
Exact Raw Response Bytes
  │
  ▼
SHA-256(Raw Response Bytes) ───► LiveSourceDocument (Transport Provenance Only)
                                       │
                                       ▼ (STEP 5-2+, NOT in STEP 5-1)
                                 Claim Verification Engine (Parser / Rule Engine)
                                       │
                                       ▼
                                 ClaimVerifiedResult
```

---

## Provenance Models: `repository_fixture` vs `live_source`

AutoMetrics Intelligence supports two distinct evidence verification origins:

| Dimension | `repository_fixture` | `live_source` |
|:---|:---|:---|
| **Storage & Origin** | Deterministic repository-controlled test fixtures (`DETERMINISTIC_SOURCE_CONTENT_FIXTURES`) | Retrieved at runtime from an official Investor Relations (IR) HTTPS endpoint |
| **Content Hash Target** | Binds canonical normalized extracted text (`sha256(normalizeFixtureExtractedText(text))`) | Binds **exact raw HTTP response bytes** (`sha256(rawBytes)`) directly from the wire |
| **Network Dependency** | Zero network access; 100% offline and deterministic | Secure HTTPS live transport; offline mock transport in CI |
| **Security Scope** | Static integrity against repository fixture tampering | Transport security, redirect guards, SSRF mitigation, and byte-level wire provenance |
| **Verification State** | Capable of supporting `claim_verified` when evaluated by verification engine | In STEP 5-1: produces `LiveSourceDocument` (`source_retrieved`). Never produces `claim_verified` |

---

## Critical Invariant: Retrieval Does Not Equal Verification

```text
source_retrieved ≠ source_verified ≠ claim_verified
```

1. **`source_retrieved`**:
   The live document has been securely retrieved via HTTPS, verified against protocol, timeout, and response size limits, and its exact raw response bytes have been cryptographically hashed with SHA-256. At this stage, **zero metrics, values, scopes, periods, or accounting bases are verified**.

2. **`source_verified`**:
   The source document identity, publication date, and official URL match an authorized entry in the primary `SOURCE_DOCUMENTS` registry.

3. **`claim_verified`**:
   An authentic verification engine (e.g. parser, rule engine) has inspected the document content and proved the exact claimed metric, numeric value, unit, scope, accounting basis, and period.

> [!IMPORTANT]
> A successful HTTP retrieval produces a `LiveSourceDocument` and raw response bytes. It **MUST NEVER** produce a `ClaimVerifiedResult` or claim that any financial metric has been verified. Metric claim verification is deferred to subsequent dedicated verification engines (STEP 5-2+).

---

## Security & Transport Controls

The `liveSourceFetcher` enforces strict security boundaries:

- **HTTPS-Only Enforcement**: Rejects `http:`, `file:`, `data:`, `javascript:`, and malformed URLs.
- **Manual Redirect Security**:
  - Allows `HTTPS -> HTTPS` redirects up to a maximum limit (default: 5).
  - Rejects `HTTPS -> HTTP` downgrade redirects with `redirectProtocolRejected`.
  - Detects and rejects redirect loops with `redirectLimitExceeded`.
- **Bounded Execution**: Explicit `AbortController` cancellation enforces deterministic request timeouts.
- **Bounded Resource Consumption**: Checks `Content-Length` headers and streams chunks up to `maxResponseBytes` (default: 20 MB) to prevent denial-of-service / memory exhaustion.
- **Content-Type Policy**: Recognizes `application/pdf` and `text/html` (with parameterized charsets); rejects unsupported MIME types.
- **SSRF Mitigation**: Rejects private and loopback address targets (`localhost`, `127.0.0.1`, RFC 1918 subnets) by default unless explicitly permitted in testing harnesses.
- **Separation of Transport vs Authorization**: Valid transport retrieval does not implicitly authorize a URL as an official OEM IR source. Source authorization is strictly evaluated against the `SOURCE_DOCUMENTS` registry.
