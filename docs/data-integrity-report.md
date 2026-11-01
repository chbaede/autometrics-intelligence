# AutoMetrics Intelligence — Data Integrity Report

## Audit Status

**Audited Source Commit:** 2658a2ca1d4ecdae2007599756a68610835ea149  
**Report Generation Commit:** 2658a2ca1d4ecdae2007599756a68610835ea149  
**Working Tree:** dirty  
**Audit Engine:** 3.2.0  
**Data Registry:** 1.0.0  
**Generated:** 2026-11-01T17:22:09.974Z  
**Node.js:** v22.21.1  
**Branch:** main

---

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ⚪ NOT RUN (exit -): Not executed in current audit-data pass (use --execute-all to execute and capture all) |
| `npm test` | ⚪ NOT RUN (exit -): Not executed in current audit-data pass (use --execute-all to execute and capture all) |
| `npm run validate-data` | ⚪ NOT RUN (exit -): Not executed in current audit-data pass (use --execute-all to execute and capture all) |
| `npm run validate-source-claims` | ⚪ NOT RUN (exit -): Not executed in current audit-data pass (use --execute-all to execute and capture all) |
| `npm run audit-data` | ✅ PASS (exit 0): 0 blocking findings, 8 review findings |
| `npm run audit-data -- --strict` | ⚪ NOT RUN (exit -): Alternative audit mode not executed in current pass |
| `npm run lint` | ⚪ NOT RUN (exit -): Not executed in current audit-data pass (use --execute-all to execute and capture all) |
| `npm run build` | ⚪ NOT RUN (exit -): Not executed in current audit-data pass (use --execute-all to execute and capture all) |

---

## Inventory

| Resource | Count |
|----------|-------|
| Registered Automakers | 16 |
| Metric Definitions | 17 |
| Financial & Volume Observations | 464 |
| Primary Source Documents | 96 |
| Documents with Source Claims | 35 |
| Forward-Looking Guidance Items | 20 |
| Regional Delivery Observations | 362 |
| Source Claims Audited | 183 |

---

## Audit Summary

### Source Claims Verification
- Total Source Claims: **183** across **35** source documents
- Claims Audited: **183**
- Mismatches: **0**
- Consistency Rate: **100% consistent** (internal claim-to-observation schema consistency; live source verification evaluated by IR audit pipeline)

### Regional Delivery & Reporting Status (2026-Q3)
- Disaggregated regional figures: **Volvo Cars** is the sole OEM with reported regional disaggregation (Europe, China, US, North America).
- Global totals only: 8 reporting OEMs (Tesla, VW Group, GM, Ford, Hyundai, MBG, Stellantis, BYD).
- Fail-closed policy: Unpopulated regional segments are left empty without estimation or silent fallback.

### BYD Metric Semantics (2026-Q3)
- Net profit attributable to shareholders (RMB 10,020M) is recorded as `net_income`.
- Standalone Q3 operating profit is not separately reported under CASBE; operating income and derived operating margin are omitted to prevent invalid metric constructs.

### Performance Driver Claim Validation Engine
- Fail-Closed YoY Growth Recalculation: All 13 YoY growth claims strictly verified against resolved prior observations using `((current - prior) / |prior|) * 100` with 0.25% tolerance; missing comparison data fails closed with blocking error.
- Mathematical Percentage-Point Validation: Percentage-point changes verified via `currentPercentage - priorPercentage` with 0.05%p tolerance.
- Locator & Fixture Verification: Validates PDF page numbers and section references against available content fixtures and source metadata.
- Bilingual Narrative Consistency: Resolves Korean and English references and verifies absence of numeric/directional discrepancies.

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
