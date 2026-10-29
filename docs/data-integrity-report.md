# AutoMetrics Intelligence — Data Integrity Report

## Audit Status

**Commit:** a60f1275080593a5616ea620a4c8c9de40731519  
**Generated:** 2026-10-29T22:52:27.283Z  
**Node.js:** v22.21.1  
**Branch:** main

---

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run test` | ✅ All test suites passed |
| `npm run validate-data` | ✅ 0 errors |
| `npm run validate-source-claims` | ✅ 0 errors (158 audited, 0 mismatches) |
| `npm run audit-data` | ✅ 0 blocking, 8 review, 0 documented exceptions, 0 corroborations (exit code 0) |
| `npm run audit-data -- --strict` | ⚠️ 0 blocking, 8 review (exit code 1 as expected by strict policy) |
| `npm run build` | ✅ Production bundle built successfully |

---

## Inventory

| Resource | Count |
|----------|-------|
| Registered Automakers | 16 |
| Metric Definitions | 17 |
| Financial & Volume Observations | 438 |
| Primary Source Documents | 91 |
| Documents with Source Claims | 31 |
| Forward-Looking Guidance Items | 20 |
| Regional Delivery Observations | 357 |
| Source Claims Audited | 158 |

---

## Audit Summary

### Source Claims Verification
- Total Source Claims: **158** across **31** source documents
- Claims Audited: **158**
- Mismatches: **0**
- Verification Rate: **100% verified**

### Finding Dispositions

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
Under the proxy integrity policy, **`proxy_only` observations are classified as `disposition: 'review'`** (never `documented` and never `verified`). While the KPI and exception rationale are documented, the margin cannot be mathematically calculated from available group figures without actual segment-level EBIT.

- **Normal mode (`npm run audit-data`)**: Exits with code 0 (0 blocking findings).
- **Strict mode (`npm run audit-data -- --strict`)**: Exits with code 1 (8 review findings requiring segment-level data).

### BMW Group Automotive Segment EBIT margin (4 periods)
BMW Group reports its headline margin KPI ("Automotive EBIT margin") at the Automotive Segment level, while revenue and operating_income are reported at the consolidated group level.

### Mercedes-Benz Cars Segment Adjusted RoS (4 periods)
Mercedes-Benz Group reports the "Adjusted Return on Sales (RoS)" for the Mercedes-Benz Cars segment with adjusted accounting basis at the cars_segment level, while the observable numerator (operating_income) is at consolidated_group scope with reported basis.
