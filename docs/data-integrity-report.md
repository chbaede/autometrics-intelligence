# AutoMetrics Intelligence — Data Integrity Report

## STEP 4-4 Completion Status

**Commit:** (pending)  
**Generated:** 2026-09-25T07:55:00+02:00  
**Node.js:** v22.21.1  
**Branch:** main

---

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run test` | ✅ 1987 / 1987 assertions passed (8 suites, 117 in scope-exceptions) |
| `npm run validate-data` | ✅ 0 errors |
| `npm run audit-data` | ✅ 0 blocking, 0 review, 8 documented exceptions, 0 corroborations |
| `npm run audit-data -- --strict` | ✅ 0 blocking, 0 review, exit code 0 |
| `npm run build` | ✅ built in 1.32s |

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
| Review | 0 | Yes (--strict only) |
| Documented (with evidence) | 8 | No |
| Documented (without evidence) | 0 | Yes (promoted to blocking) |
| Informational (corroborations) | 0 | No |

---

## Documented Proxy Exceptions (8 total — evidence-backed)

All 8 documented findings are automotive industry scope disclosure conventions where consolidated group operating income is used as an observable proxy approximation for segment EBIT. They are classified as `proxy_only` and are NOT treated as mathematically verified segment margins.

### BMW Group Automotive Segment EBIT margin (4 periods)

BMW Group reports its headline margin KPI ("Automotive EBIT margin") at the Automotive Segment level, while revenue and operating_income are reported at the consolidated group level. The group operating_income is a proxy substitute for segment EBIT.

| Exception ID | Period | Nature | Proxy? | Source Doc | Evidence |
|-------------|--------|--------|--------|------------|----------|
| `bmw_automotive_segment_ros_2026q2` | 2026-Q2 | `proxy_numerator` | Yes | `bmw_2026_q2_statement` | Automotive Segment Key Performance Indicators |
| `bmw_automotive_segment_ros_2026q1` | 2026-Q1 | `proxy_numerator` | Yes | `bmw_2026_q1_statement` | Automotive Segment Key Performance Indicators |
| `bmw_automotive_segment_ros_2025fy` | 2025-FY | `proxy_numerator` | Yes | `bmw_2025_fy_statement` | Automotive Segment Key Performance Indicators |
| `bmw_automotive_segment_ros_2024fy` | 2024-FY | `proxy_numerator` | Yes | `bmw_2024_fy_statement` | Automotive Segment Key Performance Indicators |

### Mercedes-Benz Cars Segment Adjusted RoS (4 periods)

Mercedes-Benz Group reports the "Adjusted Return on Sales (RoS)" for the Mercedes-Benz Cars segment with adjusted accounting basis at the cars_segment level, while the observable numerator (operating_income) is at consolidated_group scope with reported basis.

| Exception ID | Period | Nature | Proxy? | Source Doc | Evidence |
|-------------|--------|--------|--------|------------|----------|
| `mbg_cars_adjusted_ros_2026q2` | 2026-Q2 | `proxy_numerator` | Yes | `mbg_2026_q2_results` | Mercedes-Benz Cars Division KPIs |
| `mbg_cars_adjusted_ros_2026q1` | 2026-Q1 | `proxy_numerator` | Yes | `mbg_2026_q1_results` | Mercedes-Benz Cars Division KPIs |
| `mbg_cars_adjusted_ros_2025fy` | 2025-FY | `proxy_numerator` | Yes | `mbg_2025_fy_results` | Mercedes-Benz Cars Division KPIs |
| `mbg_cars_adjusted_ros_2024fy` | 2024-FY | `proxy_numerator` | Yes | `mbg_2024_fy_results` | Mercedes-Benz Cars Division KPIs |

---

## Architectural & Semantic Hardening (STEP 4-4)

### P0-1: Unified Proxy Validation Flow
- In `scripts/audit-data.ts`, candidate evaluation feeds resolved documented exceptions directly into `validateMarginTriplet(rev, profit, margin, undefined, { exception })`.
- Derives audit status and findings strictly from `validation.status` via `createAuditFindingFromMarginValidation()`.
- Added `marginValidationProxyOnly` counter to distinguish clean mathematical margin verifications (32) from proxy-approximated reported margins (8).

### P0-2: Strict Proxy Numerator Semantics
- Triplet validation with `exception.isProxy: true` returns `status: 'proxy_only'` with `calculatedMargin: null`.
- Proxy numerator relationships can NEVER produce `status: 'verified'`.
- Preserves the reported margin value without asserting independent mathematical equality.

### P0-3: Strict VerificationStatus Requirement
- In `validateMarginTriplet()`, tightened observation verification check: all three observations (revenue, profit, margin) must explicitly have `verificationStatus === 'verified'`.
- Any observation with `needs_review`, `scope_warning`, or `unverified` fails verification and sets `checks.verificationStatus = false`, returning `status: 'needs_review'`.

### P1-1: Removal of Set<string> Bypass
- In `findDocumentedScopeException()`, removed `Set<string>` from the parameter signature.
- Requires `ReadonlyMap<string, SourceDocument> | Record<string, SourceDocument>`, ensuring all source documents undergo deep verification (verified status, companyId match, period match, valid HTTPS official URL).

### P1-2: Explicit Evidence Record Requirement
- Added `ScopeExceptionEvidence` interface (`sourceDocId`, `pageNumber?`, `sectionReference?`, `tableReference?`, `evidenceReference?`).
- Required all documented exceptions in `DOCUMENTED_SCOPE_EXCEPTIONS` to contain explicit evidence records for every referenced `sourceDocId`.
- Exceptions missing evidence are rejected with structured rejection `missing_evidence_reference`.

### P1-3: Candidate Resolution Flow
- Replaced indiscriminate finding emissions across all candidate diagnostics in `audit-data.ts`.
- Evaluates candidate diagnostics against documented exceptions:
  - Exactly 1 match: resolves candidate triplet and validates it with exception.
  - Multiple matches: flags `AMBIGUOUS_SELECTION` (blocking).
  - 0 matches: flags `SCOPE_MISMATCH` (blocking).

### P1-4: Deterministic Rule Assignment
- In `selectCompatibleMarginTriplets()`, removed arbitrary first-rule fallback `candidateRules[0]` when no relationship rule matches metric definitions.
- Sets `ruleId = undefined` for unsupported metric combinations, preventing misleading rule attribution.

### P2: Unified Audit Finding Mapping
- Exported `createAuditFindingFromMarginValidation()` from `src/utils/metricCalculations.ts`.
- Standardizes mapping from `MarginValidationResult` to `AuditFinding`:
  - `verified` -> returns `null`
  - `proxy_only` -> returns documented `SCOPE_MISMATCH` warning with full exception & evidence trail
  - `needs_review` -> returns review `SCOPE_MISMATCH` warning
  - `invalid` -> returns blocking `MATH_MISMATCH` or `SCOPE_MISMATCH` error
  - `ambiguous` -> returns blocking `AMBIGUOUS_SELECTION` warning

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
| `scope-exceptions.test.ts` | Proxy validation, deep source checks, duplicate map, unified findings | 117 | ✅ All passed |
| **Total** | | **1987** | ✅ **0 failures** |
