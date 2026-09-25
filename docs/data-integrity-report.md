# AutoMetrics Intelligence — Data Integrity Report

## STEP 4-5 Completion Status

**Commit:** (pending)  
**Generated:** 2026-09-25T08:21:00+02:00  
**Node.js:** v22.21.1  
**Branch:** main

---

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run test` | ✅ 2032 / 2032 assertions passed (8 suites, 162 in scope-exceptions) |
| `npm run validate-data` | ✅ 0 errors |
| `npm run audit-data` | ✅ 0 blocking, 8 review, 0 documented exceptions, 0 corroborations (exit code 0) |
| `npm run audit-data -- --strict` | ⚠️ 0 blocking, 8 review (exit code 1 as expected by strict policy) |
| `npm run build` | ✅ built in 1.45s |

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
| incompatible (with candidate resolution) | 8 |

### Margin Validation

| Status | Count |
|--------|-------|
| verified | 32 |
| proxy_only (preserved reported margin, null calculated margin) | 8 |
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

| Category | Count | Strict Fails? |
|----------|-------|---------------|
| Blocking | 0 | Yes (all modes) |
| Review | 8 | Yes (--strict only) |
| Documented (with evidence) | 0 | No |
| Documented (without evidence) | 0 | Yes (promoted to blocking) |
| Informational (corroborations) | 0 | No |

---

## Documented Proxy Exceptions & Review Findings (8 total)

All 8 documented findings are automotive industry scope disclosure conventions where consolidated group operating income is used as an observable proxy approximation for segment EBIT.
Under the STEP 4-4 Final Fix policy, **`proxy_only` observations are classified as `disposition: 'review'`** (never `documented` and never `verified`). While the KPI and exception rationale are documented, the margin cannot be mathematically calculated from available group figures without actual segment-level EBIT.

- **Normal mode (`npm run audit-data`)**: Exits with code 0 (0 blocking findings).
- **Strict mode (`npm run audit-data -- --strict`)**: Exits with code 1 (8 review findings requiring human verification or segment-level data).

### BMW Group Automotive Segment EBIT margin (4 periods)

BMW Group reports its headline margin KPI ("Automotive EBIT margin") at the Automotive Segment level, while revenue and operating_income are reported at the consolidated group level. The group operating_income is a proxy substitute for segment EBIT.

| Exception ID | Period | Nature | Proxy? | Source Doc | Evidence | Disposition |
|-------------|--------|--------|--------|------------|----------|-------------|
| `bmw_automotive_segment_ros_2026q2` | 2026-Q2 | `proxy_numerator` | Yes | `bmw_2026_q2_statement` | Automotive Segment Key Performance Indicators | `review` |
| `bmw_automotive_segment_ros_2026q1` | 2026-Q1 | `proxy_numerator` | Yes | `bmw_2026_q1_statement` | Automotive Segment Key Performance Indicators | `review` |
| `bmw_automotive_segment_ros_2025fy` | 2025-FY | `proxy_numerator` | Yes | `bmw_2025_fy_statement` | Automotive Segment Key Performance Indicators | `review` |
| `bmw_automotive_segment_ros_2024fy` | 2024-FY | `proxy_numerator` | Yes | `bmw_2024_fy_statement` | Automotive Segment Key Performance Indicators | `review` |

### Mercedes-Benz Cars Segment Adjusted RoS (4 periods)

Mercedes-Benz Group reports the "Adjusted Return on Sales (RoS)" for the Mercedes-Benz Cars segment with adjusted accounting basis at the cars_segment level, while the observable numerator (operating_income) is at consolidated_group scope with reported basis.

| Exception ID | Period | Nature | Proxy? | Source Doc | Evidence | Disposition |
|-------------|--------|--------|--------|------------|----------|-------------|
| `mbg_cars_adjusted_ros_2026q2` | 2026-Q2 | `proxy_numerator` | Yes | `mbg_2026_q2_results` | Mercedes-Benz Cars Division KPIs | `review` |
| `mbg_cars_adjusted_ros_2026q1` | 2026-Q1 | `proxy_numerator` | Yes | `mbg_2026_q1_results` | Mercedes-Benz Cars Division KPIs | `review` |
| `mbg_cars_adjusted_ros_2025fy` | 2025-FY | `proxy_numerator` | Yes | `mbg_2025_fy_results` | Mercedes-Benz Cars Division KPIs | `review` |
| `mbg_cars_adjusted_ros_2024fy` | 2024-FY | `proxy_numerator` | Yes | `mbg_2024_fy_results` | Mercedes-Benz Cars Division KPIs | `review` |

---

## Architectural & Semantic Hardening (STEP 4-5)

### P0: Proxy Exception Integrity Guard (Never Waive General Data Integrity)
- In `validateMarginTriplet()`, proxy exceptions only allow explicitly documented scope/numerator differences.
- General data integrity checks are never waived:
  - Missing, non-finite, or negative revenue denominator returns `status: 'invalid'`.
  - Currency mismatch returns `status: 'invalid'`.
  - Unit scale mismatch returns `status: 'invalid'`.
  - Missing provenance (`sourceDocId`) returns `status: 'invalid'`.
  - Period or periodType mismatch returns `status: 'invalid'`.
  - Metric definition mismatch returns `status: 'invalid'`.
  - Verification status not `'verified'` returns `status: 'needs_review'`.
- Only when all general integrity checks pass does a proxy exception yield `status: 'proxy_only'`.

### P1-1: Candidate Observation Source Binding
- In `findDocumentedScopeException()`, added `observationContext: ExceptionObservationContext` parameter.
- Triplet revenue, profit numerator, and margin candidate observations are strictly validated:
  - Must have defined, non-empty `sourceDocId`.
  - Must be explicitly present in exception `sourceDocIds`.
  - Must be verified in the source registry.

### P1-2: Central Exception Dimension Revalidation
- Created `validateExceptionDimensions(exception, revObs, profitObs, marginObs)` to revalidate all 5 dimensional facets:
  - `companyId`
  - `period`
  - metric IDs (`marginMetricId`, `numeratorMetricId`, `denominatorMetricId`)
  - reporting scopes (`marginScope`, `numeratorScope`, `denominatorScope`)
  - accounting bases (`marginBasis`, `numeratorBasis`, `denominatorBasis`)
- If any dimension mismatches, the exception is rejected from being applied to the candidate triplet.

### P2: Clarified `marginSelectionMissing` Definition
- In `scripts/audit-data.ts`, documented that `marginSelectionMissing` represents an incomplete triplet where `operating_margin` was officially reported by the OEM, but the required revenue denominator or profit numerator is missing from the dataset.

---

## Test Coverage Summary

| Test Suite | Description | Tests | Status |
|-----------|-------------|-------|--------|
| `calculations.test.ts` | Mathematical calculation helpers | 35 | ✅ All passed |
| `data-integrity.test.ts` | Relational & foreign key constraints | 1623 | ✅ All passed |
| `comparability.test.ts` | Comparability contract & dimensions | 75 | ✅ All passed |
| `bev-share.test.ts` | Candidate selection & BEV share validation | 40 | ✅ All passed |
| `margin-triplet.test.ts` | Margin relationship rules & candidate triplets | 40 | ✅ All passed |
| `provenance.test.ts` | Source provenance cross-validation | 23 | ✅ All passed |
| `data-integrity-gate.test.ts` | Exit-code policy & regression guards | 34 | ✅ All passed |
| `scope-exceptions.test.ts` | Proxy validation, observation binding, dimension revalidation, strict exit | 162 | ✅ All passed |
| **Total** | | **2032** | ✅ **0 failures** |
