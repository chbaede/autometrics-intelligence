# AutoMetrics Intelligence — Data Integrity Report

## Audit Status

**Commit:** e00eae6ccd05bfb870e92054db9b81280678c3b5  
**Generated:** 2026-10-30T06:20:24.180Z  
**Node.js:** v22.21.1  
**Branch:** main

---

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run test` | ✅ All test suites passed |
| `npm run validate-data` | ✅ 0 errors |
| `npm run validate-source-claims` | ✅ 0 errors (157 audited, 0 mismatches) |
| `npm run audit-data` | ✅ 0 blocking, 8 review, 0 documented exceptions, 0 corroborations (exit code 0) |
| `npm run audit-data -- --strict` | ⚠️ 0 blocking, 8 review (exit code 1 as expected by strict policy) |
| `npm run build` | ✅ Production bundle built successfully |

---

## Inventory

| Resource | Count |
|----------|-------|
| Registered Automakers | 16 |
| Metric Definitions | 17 |
| Financial & Volume Observations | 437 |
| Primary Source Documents | 91 |
| Documents with Source Claims | 31 |
| Forward-Looking Guidance Items | 20 |
| Regional Delivery Observations | 357 |
| Source Claims Audited | 157 |

---

## Audit Summary

### Source Claims Verification
- Total Source Claims: **157** across **31** source documents
- Claims Audited: **157**
- Mismatches: **0**
- Consistency Rate: **100% consistent** (internal claim-to-observation schema consistency; live source verification evaluated by IR audit pipeline)

### Regional Delivery & Reporting Status (2026-Q3)
- Disaggregated regional figures: **Volvo Cars** is the sole OEM with reported regional disaggregation (Europe, China, US, North America).
- Global totals only: 8 reporting OEMs (Tesla, VW Group, GM, Ford, Hyundai, MBG, Stellantis, BYD).
- Fail-closed policy: Unpopulated regional segments are left empty without estimation or silent fallback.

### BYD Metric Semantics (2026-Q3)
- Net profit attributable to shareholders (RMB 10,020M) is recorded as `net_income`.
- Standalone Q3 operating profit is not separately reported under CASBE; operating income and derived operating margin are omitted to prevent invalid metric constructs.

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
