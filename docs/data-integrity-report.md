# AutoMetrics Intelligence — Data Integrity Report

## STEP 4-3 Completion Status

**Commit:** (pending)  
**Generated:** 2026-09-25T07:27:00+02:00  
**Node.js:** v22.21.1  
**Branch:** main

---

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run test` | ✅ 309 / 309 passed |
| `npm run validate-data` | ✅ 0 errors |
| `npm run audit-data` | ✅ 0 blocking, 8 documented |
| `npm run audit-data -- --strict` | ✅ 0 blocking, 0 review |
| `npm run build` | ✅ built in 1.41s |

---

## Inventory

| Resource | Count |
|----------|-------|
| Registered Automakers | 13 |
| Metric Definitions | 17 |
| Financial & Volume Observations | 240 |
| Primary Source Documents | 57 |
| Forward-Looking Guidance Items | 7 |
| Regional Delivery Observations | 216 |

---

## Audit Summary

### Margin Selection (grouped by companyId|period|periodType)

| Status | Count |
|--------|-------|
| matched | 32 |
| missing | 0 |
| ambiguous | 0 |
| incompatible (documented) | 8 |

### Margin Validation

| Status | Count |
|--------|-------|
| verified | 32 |
| needs_review | 0 |
| invalid | 0 |

### BEV Selection

| Status | Count |
|--------|-------|
| matched | 40 |
| missing | 0 |
| ambiguous | 0 |
| incompatible | 0 |

### BEV Validation

| Status | Count |
|--------|-------|
| verified | 40 |
| needs_review | 0 |
| scope_warning | 0 |

### Provenance

| Status | Count |
|--------|-------|
| valid | 240 |
| warnings | 0 |
| errors | 0 |

### Missing Required Metadata

| Field | Count |
|-------|-------|
| Missing required fields | 0 |
| Observations without page number | 189 / 240 |
| Observations without original label | 53 / 240 |

---

## Finding Dispositions

| Category | Count |
|----------|-------|
| Blocking | 0 |
| Review | 0 |
| Documented (with evidence) | 8 |
| Documented (without evidence) | 0 |

---

## Documented Findings (8 total — evidence-backed)

All 8 documented findings are automotive industry scope disclosure conventions backed by official source documents.

### BMW Group Automotive Segment EBIT margin (4 periods)

BMW Group reports its headline margin KPI ("Automotive EBIT margin") at the Automotive Segment level, while revenue and operating_income are reported at the consolidated group level. This is an established BMW Group reporting convention disclosed in each quarterly interim statement.

| Exception ID | Period | Source Doc |
|-------------|--------|------------|
| `bmw_automotive_segment_ros_2026q2` | 2026-Q2 | `bmw_2026_q2_statement` |
| `bmw_automotive_segment_ros_2026q1` | 2026-Q1 | `bmw_2026_q1_statement` |
| `bmw_automotive_segment_ros_2025fy` | 2025-FY | `bmw_2025_fy_statement` |
| `bmw_automotive_segment_ros_2024fy` | 2024-FY | `bmw_2024_fy_statement` |

### Mercedes-Benz Cars Segment Adjusted RoS (4 periods)

Mercedes-Benz Group reports the "Adjusted Return on Sales (RoS)" for the Mercedes-Benz Cars segment with adjusted accounting basis at the cars_segment level, while the observable numerator (operating_income) is at consolidated_group scope. This is a standing Mercedes-Benz reporting policy.

| Exception ID | Period | Source Doc |
|-------------|--------|------------|
| `mbg_cars_adjusted_ros_2026q2` | 2026-Q2 | `mbg_2026_q2_results` |
| `mbg_cars_adjusted_ros_2026q1` | 2026-Q1 | `mbg_2026_q1_results` |
| `mbg_cars_adjusted_ros_2025fy` | 2025-FY | `mbg_2025_fy_results` |
| `mbg_cars_adjusted_ros_2024fy` | 2024-FY | `mbg_2024_fy_results` |

---

## STEP 4-3 Changes

### New Files

| File | Purpose |
|------|---------|
| `src/data/scopeExceptions.ts` | Strongly-typed exception registry with `findDocumentedScopeException()` |
| `tests/scope-exceptions.test.ts` | 39 new tests for exception policy, duplicate identity, BEV policy, strict mode |

### Modified Files

| File | Change |
|------|--------|
| `src/types/metrics.ts` | Extended `AuditFinding` with `exceptionId`, `sourceDocIds`, `observationIds`, `failedChecks`, `periodType`; added disposition semantics comment |
| `src/utils/metricCalculations.ts` | Added `getDimensionalObservationKey()`, `getEvidenceIdentityKey()`; `getCanonicalObservationKey()` is now a deprecated alias |
| `scripts/audit-data.ts` | Full rewrite (v3.0): registry-based exception lookup, `periodType` in grouping key, BEV blocking policy, duplicate corroboration detection |
| `scripts/validate-data.ts` | Updated to use `getDimensionalObservationKey()` |
| `package.json` | Added `scope-exceptions.test.ts` to test script |

---

## Exception Policy

### Margin scope exceptions
- Approved via `DOCUMENTED_SCOPE_EXCEPTIONS` registry in `src/data/scopeExceptions.ts`
- Requires exact match on: `companyId`, `period`, `marginMetricId`, `numeratorMetricId`, `denominatorMetricId`, `numeratorScope`, `denominatorScope`, `marginScope`, `numeratorBasis`, `denominatorBasis`, `marginBasis`, `sourceDocIds`
- Company name alone is never sufficient for approval
- Missing source documents reject the exception

### BEV scope exceptions
- **Not supported** — BEV scope incompatibilities are always `blocking`
- Rationale: BEV share is a standardized count-based metric; scope divergence is a data error, not a reporting convention
- Tested in `tests/scope-exceptions.test.ts` (Tests 17a, 17b)

---

## Duplicate Identity Policy

| Scenario | Disposition |
|----------|-------------|
| Same dimensional key, same sourceDocId, same value | `blocking` (exact duplicate) |
| Same dimensional key, same sourceDocId, different value | `blocking` (value conflict) |
| Same dimensional key, different sourceDocId, same value | `documented` (corroboration, INFO) |
| Same dimensional key, different sourceDocId, different value | `review` (source conflict) |

### Key functions
- `getDimensionalObservationKey(obs)` — 9-dimension key for measurement identity
- `getEvidenceIdentityKey(obs)` — 13-dimension key including provenance metadata
- `getCanonicalObservationKey(obs)` — deprecated alias for `getDimensionalObservationKey`

---

## Finding Semantics

| Severity | Disposition | Meaning | Fails audit? |
|----------|------------|---------|-------------|
| ERROR | blocking | Hard structural error | Always |
| WARNING | blocking | Validation failure | Always |
| WARNING | review | Unresolved ambiguity | Strict mode only |
| WARNING | documented | Approved exception with evidence | Never |
| INFO | documented | Informational corroboration | Never |

---

## Test Coverage

| Test Suite | Tests |
|-----------|-------|
| calculations.test.ts | 35 |
| data-integrity.test.ts | 1623 |
| comparability.test.ts | 75 |
| bev-share.test.ts | 40 |
| margin-triplet.test.ts | 40 |
| provenance.test.ts | 23 |
| data-integrity-gate.test.ts | 34 |
| scope-exceptions.test.ts | 39 |
| **Total** | **309** |

---

## Remaining Limitations

1. **189/240 observations missing page numbers** — informational only, not blocking
2. **53/240 observations missing original labels** — informational only, not blocking
3. **Toyota non-calendar fiscal year** — tracked, not blocking
4. **BMW numerator proxy** — BMW operating_income (consolidated_group) is used as a proxy for Automotive EBIT, since segment-level Automotive EBIT is not separately observable in the current data model. The exception is documented and evidence-backed.
5. **Mercedes numerator proxy** — Same situation; Cars Adjusted EBIT is embedded in group filings.
