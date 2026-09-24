# AutoMetrics Intelligence — Data Integrity & Verification Gate Report

**Date of Execution**: 2026-09-25T00:36:00Z  
**Engine Version**: AutoMetrics Intelligence Scope-Safe Data & Financial Audit Engine v2.2 (Hardened Semantic Triplet Engine)  
**Git Commit SHA**: `77938df04e28741363da671158a436573c7885b5`  
**Runtime Environment**: Node.js `v22.21.1` / npm `10.9.4` / TypeScript `~5.6.2`  

---

## 1. System Inventory & Verification Summary

```json
{
  "auditReport": {
    "engine": "AutoMetrics Intelligence Scope-Safe Data & Financial Audit Engine v2.2",
    "timestamp": "2026-09-25T00:36:00Z",
    "commitSha": "77938df04e28741363da671158a436573c7885b5",
    "environment": {
      "nodeVersion": "v22.21.1",
      "npmVersion": "10.9.4",
      "os": "macOS (darwin-arm64)"
    },
    "inventory": {
      "totalCompanies": 13,
      "totalMetricDefinitions": 17,
      "totalFinancialAndVolumeObservations": 240,
      "totalRegionalObservations": 216,
      "totalForwardLookingGuidanceItems": 7,
      "totalPrimarySourceDocuments": 57
    },
    "findings": {
      "totalFindings": 8,
      "errors": 0,
      "warnings": 8,
      "information": 0
    },
    "dataIntegrityMetrics": {
      "matchedMarginTriplets": 32,
      "incompatibleMarginTriplets": 8,
      "ambiguousMarginTriplets": 0,
      "missingMarginTriplets": 0,
      "matchedBevTriplets": 40,
      "ambiguousBevTriplets": 0,
      "missingRequiredMetadata": 0,
      "sourceProvenanceErrors": 0,
      "sourceProvenanceWarnings": 0,
      "mathematicalMismatches": 0,
      "unresolvedReviewCases": 0,
      "scopeAwareMarginChecks": 32,
      "bevShareConsistencyChecks": 40,
      "documentedScopeWarnings": 8
    }
  }
}
```

---

## 2. Command Execution Results

| Command | Exit Code | Result | Key Summary Output |
| :--- | :---: | :---: | :--- |
| `npm run typecheck` | 0 | **PASS** | 0 TypeScript errors across the entire codebase |
| `npm test` | 0 | **PASS** | 7 / 7 test suites passed (95 assertions passed across `calculations`, `data-integrity`, `comparability`, `bev-share`, `margin-triplet`, `provenance`, `data-integrity-gate`) |
| `npm run validate-data` | 0 | **PASS** | Strict schema & integrity validation passed with 0 errors |
| `npm run audit-data` | 0 | **PASS** | Hardened semantic audit passed with 0 blocking errors (8 documented segment warnings) |
| `npm run audit-data -- --strict` | 0 | **PASS** | Strict mode audit passed with 0 unconfigured errors |
| `npm run build` | 0 | **PASS** | Vite production build generated clean distribution artifacts |

---

## 3. Exit Code & Strict Verification Policy

- **Regular Audit (`audit-data`)**:
  - Exits with `code 1` (FAIL) if any blocking structural errors exist (`errors.length > 0`), including missing foreign keys, unresolved candidate triplets, schema deviations, or invalid formulas.
  - Exits with `code 0` (PASS) when all data links are intact and segment-level scope warnings are properly categorized.
- **Strict Audit (`audit-data --strict`)**:
  - Exits with `code 1` (FAIL) on any blocking errors, mathematical mismatches, ambiguous candidate combinations, missing required metadata, or unexpected non-scope warnings.
  - Exits with `code 0` (PASS) only when zero unexpected warnings occur.
- **Candidate Triplet Matching Policy**:
  - Arbitrary `candidates[0]` selection is strictly forbidden. Fallback array index accesses have been completely removed.
  - When candidate selection returns `'ambiguous'` or `'incompatible'`, the engine refuses to assemble or calculate a fallback triplet.
- **Evidence Verification Standard**:
  - Every reported observation requires a verified HTTPS primary IR source link with valid publication date and evidence reference.

---

## 4. Documented Segment Scope Warnings (8 Items)

The 8 documented warnings correspond to legitimate automotive reporting disclosures where headline margins diverge in scope:
1. **BMW Group (4 periods: 2024-FY, 2025-FY, 2026-Q1, 2026-Q2)**: Headline RoS disclosure corresponds to the *Automotive Segment* rather than *Consolidated Group*.
2. **Mercedes-Benz Group (4 periods: 2024-FY, 2025-FY, 2026-Q1, 2026-Q2)**: Headline RoS disclosure corresponds to *Mercedes-Benz Cars Segment (Adjusted)* rather than *Consolidated Group*.

---

## 5. Known Limitations & Unresolved Data Issues

1. **Exact PDF Page Number Coverage**:
   - Currently, 51 / 240 observations have exact page numbers recorded (`pageNumber`), while 189 / 240 reference section/table citations without page numbers.
2. **Original Reported Labels**:
   - 187 / 240 observations have exact original reported labels (`originalLabel`), while 53 / 240 use standardized metric titles.
3. **Fiscal Year Shift (Toyota Motor Corporation)**:
   - Toyota operates on an April 1 – March 31 fiscal year. AutoMetrics maps Toyota's FY2026 Q1 (Apr-Jun) and Q2 (Jul-Sep) to the respective calendar quarters, flagging fiscal calendar misalignment when comparing directly against calendar-year peers.
