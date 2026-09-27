# AutoMetrics Intelligence — Complete Data Audit & Financial Accuracy Investigation Report

**Status**: Current (Generated)  
**Generated At**: 2026-09-27T14:02:51.871Z  
**Audited Source Commit SHA**: e7b68f4b91be2ad84944521858ec0b0997918935  
**Auditor**: AutoMetrics Intelligence Data Engineering & Automotive Financial Audit Team  
**Repository**: [github.com/chbaede/autometrics-intelligence](https://github.com/chbaede/autometrics-intelligence)  
**Target Application**: Global Automotive OEM Financial, Electrification & Investor Intelligence Platform  

---

## 1. Executive Summary & Audit Metrics

This comprehensive data audit inspects all 16 registered automakers, 384 primary financial and delivery observations, 344 regional delivery observations, 20 management forward-looking guidance items, and 82 verified primary source documents in the AutoMetrics Intelligence platform.

Through **STEP 4-19 to STEP 4-22**, the evidence and verification layers were hardened with:
1. **Source Claim Integrity Validator**: Deterministically audits all `SourceClaim` entries against `SourceDocument` metadata and `MetricObservation` records across 10 error codes (`sourceClaimCompanyMismatch`, `sourceClaimPeriodMismatch`, `sourceClaimPeriodTypeMismatch`, `sourceClaimMetricMismatch`, `sourceClaimValueMismatch`, `sourceClaimUnitMismatch`, `sourceClaimScopeMismatch`, `sourceClaimAccountingBasisMismatch`, `sourceClaimWithoutObservation`, `ambiguousSourceClaimObservation`).
2. **Numeric Claim Verification Engine**: Strongly binds claims to exact numbers, preventing semantic-only verification (`claim_verified` requires exact numeric match within unit-aware tolerance).
3. **Locator Contradiction Rejection**: Explicitly rejects locators that contain numbers contradicting extracted source document snippets.
4. **Historical Value Reuse Detection**: Actively detects and prevents reuse of identical historical values across periods without explicit justification (`allowHistoricalDuplicate`).
5. **Deterministic Fixture Integrity & Separation**: Separates offline repository fixtures (`fixture_verified`) from live HTTP retrieval (`live_source_verified`), ensuring complete cryptographic fixture validation.
6. **Proxy Mapping Invariants**: Preserves strict proxy safety invariants (`proxy_only`, `disposition: review`, `mathematicallyVerified: false`).

### Verification & Audit Summary

| Metric / Dimension | Value | Status / Policy |
| :--- | :---: | :--- |
| **Total Registered Automakers** | 16 | Complete global OEM coverage |
| **Total Metric Observations** | 384 | 100% audited and scoped |
| **Total Regional Observations** | 344 | Aligned with primary source decks |
| **Total Guidance Targets** | 20 | Verified against IR presentations |
| **Total Verified Primary Sources** | 82 | HTTPS endpoints, audited metadata |
| **Documents with Source Claims** | 22 | Verified primary reports |
| **Total Source Claims Audited** | 113 | 100% consistent with observations |
| **Source Claim Mismatches** | **0** | **0 errors (100% match)** |
| **Blocking Findings** | **0** | **Pass (0 blocking errors)** |
| **Review Findings** | **8** | Conservative proxy limitations (BMW / MBG) |
| **Documented Exceptions** | **0** | Strict evidence requirement enforced |
| **Informational Corroborations** | **0** | No unverified cross-source duplicates |

---

## 2. Definitional Policies & Reference Ontologies

### 2.1 Reporting Scope Definitions
- **`consolidated_group`**: Entire corporate entity including automotive manufacturing, captive financial services, mobility solutions, and software subsidiaries (e.g., Total Volkswagen Group, Total Tesla, Inc., Total BMW Group).
- **`automotive_segment`**: Automotive manufacturing and sales operations excluding financial services and motorcycle divisions (e.g., BMW Automotive Segment, GM Automotive).
- **`cars_segment`**: Passenger car vehicle division specifically (e.g., Mercedes-Benz Cars segment distinct from Mercedes-Benz Vans).
- **`commercial_vehicles_segment`**: Commercial vans, trucks, and bus divisions.
- **`financial_services`**: Captive financing, leasing, and insurance operations.
- **`business_unit`**: Sub-segment or brand-level disclosures.

### 2.2 Accounting Basis Definitions
- **`reported`**: Standard audited GAAP / IFRS disclosures (e.g., US GAAP Operating Income, IFRS Operating Profit, K-IFRS 영업이익).
- **`adjusted`**: Management non-GAAP operating results adjusted for special items, restructuring, impairment, or legal provisions (e.g., GM Adjusted EBIT, Mercedes-Benz Cars Adjusted EBIT, Stellantis Adjusted Operating Income).
- **`non_gaap`**: Non-standard financial measures defined under SEC Regulation G / ESMA guidelines.
- **`management_defined`**: Proprietary internal KPI allocations.

### 2.3 Volume Perimeter Definitions
- **`retail_deliveries`**: Physical handovers to end-consumer customers (used by Tesla, Volkswagen Group, BMW Group, Mercedes-Benz, BYD, Volvo).
- **`wholesale_shipments`**: Factory gate dispatches and billings to independent franchised dealers (used by Hyundai Motor, Toyota Motor, General Motors, Ford, Stellantis).
- **`production`**: Total assembled vehicles at manufacturing facilities.
- **`registrations`**: Official government motor vehicle registry filings.

### 2.4 Deterministic Fixture Provenance & Separation Policy (STEP 4-23)
- **Deterministic Repository Fixtures (`fixture_verified` / `repository_fixture`)**:
  - Deterministic repository fixtures are protected by SHA-256 content integrity validation.
  - These fixtures are not live HTTP retrievals.
  - `DETERMINISTIC_SOURCE_CONTENT_FIXTURES` represent offline repository test and audit fixtures extracted from verified official publications.
  - They are cryptographically hashed and schema-validated by `validateSourceContentFixtures` against recomputed SHA-256 digests.
  - They MUST NOT be described as live or runtime HTTP downloads from corporate investor websites.
- **Live Source Verification (`live_source_verified` / `live_source`)**:
  - Live verification requires an active HTTPS retrieval probe, document content fetch, and cryptographic payload validation at execution time.
- **Semantic vs Numeric Claim Verification Separation**:
  - Semantic fixtures without an exact `verifiedNumericValue` verify only document locator existence and metric semantic identity (`source_verified`).
  - To achieve `claim_verified`, the fixture must contain a finite `verifiedNumericValue` and match the claimed numeric value within strict unit-aware tolerance.

---

## 3. Command Execution & Verification Results

| Command | Exit Code | Result | Key Summary Output |
| :--- | :---: | :---: | :--- |
| `npm run typecheck` | 0 | **PASS** | 0 TypeScript errors across the entire codebase |
| `npm test` | 0 | **PASS** | Complete unit and integration regression test suite passed |
| `npm run validate-source-claims` | 0 | **PASS** | All 113 source claims across 22 documents validated with 0 errors |
| `npm run validate-data` | 0 | **PASS** | Strict schema, HTTPS, metadata, fixtures & source claims integrity passed with 0 errors |
| `npm run audit-data` | 0 | **PASS** | Scope-safe semantic audit passed with 0 blocking errors (8 proxy review findings) |
| `npm run lint` | 0 | **PASS** | ESLint verified clean codebase with zero errors |
| `npm run build` | 0 | **PASS** | Vite production build generated clean distribution artifacts |

---

## 4. Documented Proxy Scope Review Findings (8 Items)

The 8 review findings represent legitimate, documented automotive reporting perimeter divergences where headline margin KPIs are reported at segment level while the accessible operating profit numerator is at consolidated group level:
1. **BMW Group (4 periods: 2024-FY, 2025-FY, 2026-Q1, 2026-Q2)**:
   - Headline margin: `Automotive EBIT margin` (`automotive_segment`, `reported`).
   - Observable numerator: Group EBIT (`consolidated_group`, `reported`).
   - Safety Status: Marked as `proxy_only`, `disposition: review`, `mathematicallyVerified: false`.
2. **Mercedes-Benz Group (4 periods: 2024-FY, 2025-FY, 2026-Q1, 2026-Q2)**:
   - Headline margin: `Adjusted Return on Sales (RoS)` (`cars_segment`, `adjusted`).
   - Observable numerator: Group EBIT (`consolidated_group`, `reported`).
   - Safety Status: Marked as `proxy_only`, `disposition: review`, `mathematicallyVerified: false`.

---

## 5. Audit Disposition & Strict Invariants

- **Zero Tolerance for Unbacked Claims**: Numeric claims cannot achieve `claim_verified` through declarative metadata alone; verification requires a deterministic content fixture or cryptographic extraction binding.
- **Strict Source Binding**: Source claims are bound to the exact document, metric, period, unit, scope, and accounting basis.
- **No Stale Historical Reuse**: All historical values reused across periods are audited, preventing copy-paste artifacts.
- **Fixture Provenance Transparency**: Fixtures are explicitly identified as offline repository fixtures, protected by SHA-256 content integrity validation, and not live HTTP retrievals.

---

### Audit Execution Metadata & Provenance
- **Audited Source Commit SHA**: `e7b68f4b91be2ad84944521858ec0b0997918935`
- **Generated at**: `2026-09-27T14:02:51.871Z`
- **Source claim validation**: `PASS`
- **Data audit**: `PASS`
