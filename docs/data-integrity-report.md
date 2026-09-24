# AutoMetrics Intelligence — Data Integrity Report

**Generated:** 2026-09-25T00:49:00+02:00
**Commit SHA:** cd2b64237eded1b0e37d93e6ac99115ccc600756 (pre-STEP 4-2 commit; STEP 4-2 pending push)
**Node.js Version:** v22.21.1
**npm Version:** (see package-lock.json)

---

## Summary

| Metric | Value |
|--------|-------|
| Total companies | 13 |
| Total metric definitions | 17 |
| Total observations | 240 |
| Total source documents | 57 |
| Total guidance observations | 7 |
| Total regional observations | 216 |

---

## Verification Suite Results

| Command | Exit Code | Result |
|---------|-----------|--------|
| `npm run typecheck` | 0 | ✅ PASS |
| `npm test` | 0 | ✅ PASS |
| `npm run validate-data` | 0 | ✅ PASS |
| `npm run audit-data` | 0 | ✅ PASS |
| `npm run audit-data -- --strict` | 0 | ✅ PASS |
| `npm run build` | 0 | ✅ PASS |

---

## Test Coverage

| Test Suite | Total | Passed | Failed |
|-----------|-------|--------|--------|
| Comparability tests | 75 | 75 | 0 |
| BEV share validation tests | 40 | 40 | 0 |
| Semantic margin triplet tests | 40 | 40 | 0 |
| Source provenance tests | 23 | 23 | 0 |
| Data integrity gate + STEP 4-2 | 34 | 34 | 0 |
| **Total** | **212** | **212** | **0** |

---

## Audit Findings

| Category | Count |
|----------|-------|
| Blocking errors | 0 |
| Review findings | 0 |
| Documented findings | 8 |

### Documented Findings (8)

All 8 documented findings are known, verified automotive reporting divergences:

| # | Company | Period | Category | Reason |
|---|---------|--------|----------|--------|
| 1 | BMW Group | 2026-Q2 | SCOPE_MISMATCH | Automotive Segment RoS vs Group margin — different scope |
| 2 | BMW Group | 2026-Q1 | SCOPE_MISMATCH | Automotive Segment RoS vs Group margin — different scope |
| 3 | BMW Group | 2025-FY | SCOPE_MISMATCH | Automotive Segment RoS vs Group margin — different scope |
| 4 | BMW Group | 2024-FY | SCOPE_MISMATCH | Automotive Segment RoS vs Group margin — different scope |
| 5 | Mercedes-Benz | 2026-Q2 | SCOPE_MISMATCH | Mercedes-Benz Cars Adjusted RoS vs Group reported — basis mismatch |
| 6 | Mercedes-Benz | 2026-Q1 | SCOPE_MISMATCH | Mercedes-Benz Cars Adjusted RoS vs Group reported — basis mismatch |
| 7 | Mercedes-Benz | 2025-FY | SCOPE_MISMATCH | Mercedes-Benz Cars Adjusted RoS vs Group reported — basis mismatch |
| 8 | Mercedes-Benz | 2024-FY | SCOPE_MISMATCH | Mercedes-Benz Cars Adjusted RoS vs Group reported — basis mismatch |

These divergences are industry-standard practice: BMW reports Automotive Segment RoS (not Group EBIT margin), and Mercedes-Benz reports Cars Division Adjusted RoS. See `docs/data-audit-report.md` for detailed evidence.

---

## STEP 4-2 Implementation Summary

### Changes Completed

1. **`src/types/metrics.ts`**
   - Added `FindingDisposition = 'blocking' | 'review' | 'documented'`
   - Added `AuditFinding` interface (exported, compatible with legacy `item`/`detail` fields)
   - Added `ScopeRelationshipRule` with `relationshipType`
   - Expanded `MarginValidationChecks` to 11 explicit checks
   - Added `failedChecks: (keyof MarginValidationChecks)[]` to `MarginValidationResult`
   - Added `ValidatedMetricObservation` and `RawMetricObservation` types

2. **`src/utils/metricCalculations.ts`**
   - `getCanonicalObservationKey(obs)` — canonical 7-dimensional identity key
   - `MARGIN_RELATIONSHIP_RULES` updated with `ScopeRelationshipRule[]`
   - `selectCompatibleMarginTriplets()` — semantic triplet matching, no `[0]` fallback
   - `validateMarginTriplet()` — 11-check validation returning `failedChecks`

3. **`scripts/audit-data.ts`**
   - Strict exit-code policy: fail on `blocking` or `review` dispositions only
   - Separate counters: Margin Selection, Margin Validation, BEV Selection, BEV Validation, Provenance, Metadata
   - `getCanonicalObservationKey` for canonical duplicate detection
   - Imports `AuditFinding` from `src/types/metrics`

4. **`scripts/validate-data.ts`**
   - `getCanonicalObservationKey` duplicate check (SET-based, respects scope/basis dimensions)

5. **`tests/data-integrity-gate.test.ts`**
   - 10 original anti-regression tests + 10 new STEP 4-2 tests
   - Tests: strict disposition logic, canonical duplicate identity, margin provenance, failedChecks array, scope relationship rules

6. **`tests/margin-triplet.test.ts`**
   - Test fixtures updated with `sourceDocId` and `verificationStatus` for provenance checks

---

## Ambiguous Margin Triplets

| Company | Period | Status |
|---------|--------|--------|
| BMW Group | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY | `incompatible` (documented: Automotive Segment RoS scope) |
| Mercedes-Benz | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY | `incompatible` (documented: Cars Division Adjusted RoS basis) |

All other companies: `matched` or `missing` (no observations for that period).

---

## Missing Required Metadata

| Field | Count | Notes |
|-------|-------|-------|
| Page number | 189 / 240 | Informational; not required for non-page-referenced observations |
| Original reported label | 53 / 240 | Informational; required for reconciliation-grade verification |
| Non-calendar fiscal year | 1 entity | Toyota Motor Corporation (FY End: Mar 31) |

---

> [!NOTE]
> This report is generated automatically from the audit scripts. For evidence and reconciliation details, see `docs/data-audit-report.md`.
