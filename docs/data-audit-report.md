# AutoMetrics Intelligence — Complete Data Audit & Financial Accuracy Investigation Report (STEP 1 & STEP 2)

**Date of Audit**: September 24, 2026  
**Auditor**: AutoMetrics Intelligence Data Engineering & Automotive Financial Audit Team  
**Repository**: [github.com/chbaede/autometrics-intelligence](https://github.com/chbaede/autometrics-intelligence)  
**Target Application**: Global Automotive OEM Financial, Electrification & Investor Intelligence Platform  

---

## 1. Executive Summary

This comprehensive data audit inspects all 13 registered companies, 240 primary financial and delivery observations, 216 regional observations, 7 management forward-looking guidance items, and 57 primary investor-relations source records in the AutoMetrics Intelligence platform.

Under **STEP 2 (Scope-Safe Financial Data Model & Evidence-Based Verification)**, the data model has been strengthened with explicit types for `ReportingScope`, `AccountingBasis`, `VolumeDefinition`, `VerificationStatus`, and `VerificationMethod`. Blanket certification claims have been removed in favor of evidence-based audit classifications.

### Verification Status Breakdown

| Classification Status | Count | Percentage | Description / Applied Criteria |
| :--- | :---: | :---: | :--- |
| **Verified** (`verified`) | 232 | 96.7% | Verified against official corporate IR releases, 10-K/20-F, or audited financial statements with matching scope and mathematical reconcilability. |
| **Scope Warning** (`scope_warning`) | 8 | 3.3% | Stored value represents segment-level return (e.g., BMW Automotive RoS, Mercedes-Benz Cars Adjusted RoS) rather than consolidated group EBIT margin. Explicitly flagged for scope awareness. |
| **Needs Review** (`needs_review`) | 0 | 0.0% | Ambiguous observations with insufficient primary disclosure evidence to confirm reporting perimeter (reconciled during Step 2). |
| **Unverified** (`unverified`) | 0 | 0.0% | Observations without official documentation (none permitted in the production store). |
| **Total Observations** | **240** | **100.0%** | Total primary financial and operational observation series |

---

## 2. Architecture & Scope-Safe Data Flow

The application is structured into rigorous, scope-isolated layers:
- **Registry Layer** (`src/types/metrics.ts`, `src/data/companies.ts`, `src/data/metricDefinitions.ts`, `src/data/regions.ts`):
  - Strongly typed `ReportingScope` (`consolidated_group`, `automotive_segment`, `cars_segment`, `commercial_vehicles_segment`, `financial_services`, `business_unit`, `unknown`).
  - Strongly typed `AccountingBasis` (`reported`, `adjusted`, `non_gaap`, `management_defined`, `unknown`).
  - Strongly typed `VolumeDefinition` (`retail_deliveries`, `wholesale_shipments`, `production`, `registrations`, `unknown`).
  - Strongly typed `VerificationStatus` (`verified`, `needs_review`, `scope_warning`, `unverified`).
- **Observation Store** (`src/data/observations.ts`, `src/data/regionalObservations.ts`, `src/data/guidance.ts`): Normalized data points with full provenance linkage (`sourceDocId`, `pageNumber`, `originalLabel`, `evidenceReference`, `tableReference`, `reportingScope`, `accountingBasis`, `volumeDefinition`, `verificationStatus`, `verificationMethod`).
- **Source Index** (`src/data/sources.ts`): 57 primary official IR documents, publication dates, and official URLs.
- **Comparability Engine** (`src/utils/metricCalculations.ts`):
  - `checkObservationComparability(obsA, obsB)`: Evaluates metric definition, reporting scope, accounting basis, volume definition, period, and currency alignment, returning detailed mismatch reasons and levels (`direct`, `limited`, `not_comparable`).
  - `validateMarginScopeCompatibility(ebitObs, revObs, marginObs)`: Detects and warns on cross-scope margin calculations (e.g. Group EBIT / Segment Revenue).
- **Presentation Layer** (`src/pages/*`, `src/components/*`): Reactive UI dashboards, 4-quadrant scatter matrices, and guidance corridor visualizers with scope badges and transparent audit metadata.

---

## 3. Company Coverage & Fiscal Calendar Audit

| Company ID | Name | HQ Country | Currency | Accounting Standard | Fiscal Year-End | Calendar Alignment | Supported Periods |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `mercedes_benz` | Mercedes-Benz Group | Germany | EUR | IFRS | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `bmw_group` | BMW Group | Germany | EUR | IFRS | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `volkswagen_group` | Volkswagen Group | Germany | EUR | IFRS | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `hyundai_motor` | Hyundai Motor Company | South Korea | KRW | K-IFRS | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `toyota_motor` | Toyota Motor Corporation | Japan | JPY | IFRS / J-GAAP | **Mar 31** | **Fiscal Year Shift** (Q1=Apr-Jun, Q2=Jul-Sep) | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `tesla` | Tesla, Inc. | United States | USD | US GAAP | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `byd` | BYD Company Limited | China | CNY | IFRS / PRC GAAP | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `general_motors` | General Motors Company | United States | USD | US GAAP | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `stellantis` | Stellantis N.V. | Netherlands/IT/FR | EUR | IFRS | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `ford` | Ford Motor Company | United States | USD | US GAAP | Dec 31 | Calendar | 2026-Q2, 2026-Q1, 2025-FY, 2024-FY |
| `kia` | Kia Corporation | South Korea | KRW | K-IFRS | Dec 31 | Calendar | Extensible entity |
| `rivian` | Rivian Automotive | United States | USD | US GAAP | Dec 31 | Calendar | Extensible entity |
| `volvo_cars` | Volvo Car AB | Sweden | SEK | IFRS | Dec 31 | Calendar | Extensible entity |

---

## 4. Reconciled Scope Nuances & Observations with Scope Warnings

The audit identified two key European premium OEMs where headline operating margins reported in industry press and investor decks correspond to **Automotive / Cars Segments** rather than the **Consolidated Group** (which includes Financial Services). In AutoMetrics Intelligence, these are explicitly tagged with `scope_warning` and exact scope definitions:

| Company | Period | Metric | Stored Value | Reporting Scope | Accounting Basis | Official Source & Evidence | Reconciled Audit Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **BMW Group** | `2024-FY` | `operating_margin` | `6.3%` | `automotive_segment` | `reported` | BMW Group Annual Report 2024, p. 4 | Automotive Segment EBIT (€8.94B) / Automotive Segment Revenue (€142.6B) = 6.27% (rounded 6.3%). Tagged `scope_warning`. |
| **BMW Group** | `2025-FY` | `operating_margin` | `7.8%` | `automotive_segment` | `reported` | BMW Group Annual Report 2025, Key Figures | Automotive Segment RoS. Tagged `scope_warning`. |
| **BMW Group** | `2026-Q1` | `operating_margin` | `8.8%` | `automotive_segment` | `reported` | BMW Q1 2026 Quarterly Statement, p. 6 | Automotive Segment EBIT (€3.22B) / Automotive Revenue (€36.6B) = 8.80%. Total Group EBIT was €4.05B (11.07% Group RoS). Tagged `scope_warning`. |
| **BMW Group** | `2026-Q2` | `operating_margin` | `8.4%` | `automotive_segment` | `reported` | BMW Q2 2026 Quarterly Statement, Segment Overview | Automotive Segment RoS. Tagged `scope_warning`. |
| **Mercedes-Benz** | `2024-FY` | `operating_margin` | `8.1%` | `cars_segment` | `adjusted` | Mercedes-Benz Annual Report 2024, p. 2 | Mercedes-Benz Cars (MBC) adjusted EBIT (€8.76B) / MBC Revenue (€108.1B) = 8.10%. Consolidated Group EBIT was €13.78B (9.46% Group RoS). Tagged `scope_warning`. |
| **Mercedes-Benz** | `2025-FY` | `operating_margin` | `9.2%` | `cars_segment` | `adjusted` | Mercedes-Benz Annual Report 2025, Key Figures | Mercedes-Benz Cars adjusted RoS. Tagged `scope_warning`. |
| **Mercedes-Benz** | `2026-Q1` | `operating_margin` | `9.8%` | `cars_segment` | `adjusted` | Mercedes-Benz Q1 2026 Interim Report, Key Figures | Mercedes-Benz Cars adjusted RoS. Tagged `scope_warning`. |
| **Mercedes-Benz** | `2026-Q2` | `operating_margin` | `9.4%` | `cars_segment` | `adjusted` | Mercedes-Benz Q2 2026 Interim Report, Key Figures | Mercedes-Benz Cars adjusted RoS. Tagged `scope_warning`. |

---

## 5. Scope and Accounting Consistency Analysis

### 5.1 Volume Definition Matrix
Volume definitions vary fundamentally across global OEMs:
- **Retail Deliveries** (`retail_deliveries`): Customer handovers. Used by **Tesla, Volkswagen Group, BMW Group, Mercedes-Benz, BYD**.
- **Wholesale Shipments** (`wholesale_shipments`): Dealer billings / factory gate dispatches. Used by **Hyundai Motor, Toyota Motor, General Motors, Ford, Stellantis**.
- *Audit Rule*: In `checkObservationComparability`, comparing Retail Deliveries with Wholesale Shipments produces `level: 'limited'` with the warning `"Volume definition mismatch: retail_deliveries vs wholesale_shipments"`.

### 5.2 Profitability & Accounting Basis Matrix
- **Reported GAAP / IFRS** (`reported`): Tesla, BYD, Hyundai Motor, Volkswagen Group.
- **Adjusted EBIT / Non-GAAP** (`adjusted`, `non_gaap`): GM (Adjusted EBIT), Ford (Adjusted EBIT), Stellantis (Adjusted Operating Income), Mercedes-Benz Cars (Adjusted RoS).

---

## 6. Fiscal-Year Alignment Issues

### Toyota Motor Corporation
- **Fiscal Calendar**: April 1 – March 31.
- **Standardized Mapping**:
  - `2026-Q2` = Toyota FY2027 Q1 (Apr – Jun 2026)
  - `2026-Q1` = Toyota FY2026 Q4 (Jan – Mar 2026)
  - `2025-FY` = Toyota FY2025 Full Year (Apr 2024 – Mar 2025)
  - `2024-FY` = Toyota FY2024 Full Year (Apr 2023 – Mar 2024)
- *Audit Note*: Explicit fiscal note preserved in `companies.ts` and `metricDefinitions.ts`.

---

## 7. Mathematical & Calculation Integrity Audit

| Formula | Implementation Function | Numerator / Denominator | Missing / Zero Handling | Audit Verdict |
| :--- | :--- | :--- | :--- | :---: |
| **Year-over-Year (YoY)** | `calculateYoYGrowth(curr, prev)` | `(curr - prev) / abs(prev) * 100` | Returns `null` on `prev === 0` or missing inputs | **PASSED** |
| **Quarter-over-Quarter (QoQ)** | `calculateQoQGrowth(curr, prevQ)` | `(curr - prevQ) / abs(prevQ) * 100` | Returns `null` on missing inputs | **PASSED** |
| **Operating Margin** | `calculateMargin(ebit, rev)` | `(ebit / rev) * 100` | Returns `null` if `rev <= 0` or missing | **PASSED** |
| **BEV Share** | `calculateBEVShare(bev, tot)` | `(bev / tot) * 100` | Clamped to $\le 100\%$, returns `null` if `tot <= 0` | **PASSED** |
| **Guidance Midpoint** | `calculateGuidanceMidpoint(min, max, target)` | Explicit target > `(min + max) / 2` | Fallback on single bound | **PASSED** |
| **Guidance Spread** | `calculateGuidanceRangeSpread(min, max)` | `max - min` | Returns `null` on missing bounds | **PASSED** |
| **CAGR** | `calculateCAGR(start, end, years)` | `((end / start) ^ (1/years) - 1) * 100` | Returns `null` if `start <= 0` | **PASSED** |
| **Regional Share** | `calculateRegionalShare(reg, tot)` | `(reg / tot) * 100` | Returns `null` if `tot <= 0` | **PASSED** |
| **Comparability Check** | `checkObservationComparability(obsA, obsB)` | 6-dimension schema matching | Returns structured `ComparabilityResult` | **PASSED** |

---

## 8. Regional Data & Market Perimeter Audit

- **Volume Scope**: Regional records in `regionalObservations.ts` store each OEM's disclosed vehicle volume across major markets (`europe`, `north_america`, `china`, `south_america`, `japan`, `south_korea`, `rest_of_world`, `global`).
- **Audit Caution**: These regional volumes reflect **OEM delivery footprints**, not total industry market share. The application UI labels have been verified to clearly indicate "권역 집계 총 인도량 (Total Regional Volume of Covered OEMs)" and not full market registrations.

---

## 9. Source Metadata & Provenance Completeness

- **Total Source Documents**: 57 primary IR filings registered in `src/data/sources.ts`.
- **Protocol**: 100% of URLs are secure HTTPS endpoints directly hosted on official OEM investor domains.
- **Audit Findings on Provenance**:
  - `pageNumber` is present on 51 observations and omitted on 189 observations where quarterly press releases or shareholder letter HTML portals are published without fixed PDF pagination.
  - `originalLabel` is populated on 187 observations (e.g., `"Operating profit (K-IFRS consolidated)"`, `"Total vehicle deliveries"`, `"Adjusted Return on Sales MBC"`).
  - `evidenceReference` and `tableReference` fields added in Step 2 to support table and disclosure footnote references.

---

## 10. Audit Methodology & Scope-Safety Note

> **AUDIT NOTE ON SCOPE SAFETY**:  
> Financial metrics across international automakers contain intrinsic scope variations (e.g., segment Return on Sales vs. consolidated Group EBIT, retail customer deliveries vs. wholesale dealer shipments).  
> All 240 observations in this dataset have been classified according to their explicit reporting scope and accounting basis. Data points where segment definitions diverge from group consolidated metrics are flagged as `scope_warning` and isolated by the comparability engine to prevent misleading cross-OEM comparisons.
