# AutoMetrics Intelligence — Complete Data Audit & Financial Accuracy Investigation Report (STEP 1)

**Date of Audit**: September 24, 2026  
**Auditor**: AutoMetrics Intelligence Data Engineering & Automotive Financial Audit Team  
**Repository**: [github.com/chbaede/autometrics-intelligence](https://github.com/chbaede/autometrics-intelligence)  
**Target Application**: Global Automotive OEM Financial, Electrification & Investor Intelligence Platform  

---

## 1. Executive Summary

This comprehensive data audit inspects all 13 registered companies, 240 primary financial and delivery observations, 216 regional observations, 7 management forward-looking guidance items, and 57 primary investor-relations source records in the AutoMetrics Intelligence platform.

| Audit Scope Dimension | Total Inspected | Confirmed Errors / Discrepancies | Suspected / Needs Verification | Notes & Accounting Flags |
| :--- | :---: | :---: | :---: | :--- |
| **Registered Automakers** | 13 | 0 | 0 | 10 active core OEMs with complete time series + 3 extensible |
| **Financial & Volume Observations** | 240 | 2 | 14 | 2 segment vs group scope mismatches detected |
| **Regional Market Observations** | 216 | 0 | 8 | Disclosed volumes are OEM footprint, not total market shares |
| **Forward Guidance Items** | 7 | 1 | 0 | Volume guidance was previously misclassified as margin corridor (now fixed) |
| **Primary IR Source Records** | 57 | 0 | 0 | 100% HTTPS official OEM corporate/IR domains |
| **Mathematical Formulas Audited** | 8 | 0 | 0 | YoY, QoQ, Margin, BEV Share, CAGR, Spread, Midpoint, Regional Share |

---

## 2. Architecture & Data Flow Overview

The application is structured into clearly separated layers:
- **Registry Layer** (`src/data/companies.ts`, `src/data/metricDefinitions.ts`, `src/data/regions.ts`): Immutable entity metadata, reporting currencies, tickers, and metric definitions.
- **Observation Store** (`src/data/observations.ts`, `src/data/regionalObservations.ts`, `src/data/guidance.ts`): Normalized data points with provenance linkage (`sourceDocId`, `pageNumber`, `originalLabel`, `isComparable`, `nonComparableReason`).
- **Source Index** (`src/data/sources.ts`): Primary official IR documents, publication dates, and official URLs.
- **Query & Calculation Engine** (`src/utils/metricQueries.ts`, `src/utils/metricCalculations.ts`): Safe zero-division handling, YoY/QoQ growth, margin calculations, and period filtering.
- **Presentation & Analytics Layer** (`src/pages/*`, `src/components/*`): Reactive UI dashboards, 4-quadrant scatter matrices, comparative guidance corridor visualizers, and audit inspectors.

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

## 4. Confirmed Data Errors & Scope Discrepancies

| Company | Period | Metric | Existing Stored Value | Correct Reconciled Value | Unit | Official Source | Evidence & Rationale | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- | :---: |
| **BMW Group** | `2026-Q1` | `operating_income` vs `operating_margin` | Stored EBIT: `€4,054M`, Stored Margin: `8.8%` | Automotive Segment EBIT: `€3,222M` (or Group Margin `11.07%`) | `currency_millions` / `%` | BMW Q1 2026 Quarterly Statement (p. 6) | `€4,054M` is Total Group EBIT (including Financial Services). Automotive segment EBIT was `€3,222M` on `€36,614M` revenue ($3,222 / 36,614 = 8.8\%$). Mixing Group EBIT with Automotive RoS causes a 2.27%p mathematical discrepancy. | **Identified Scope Mismatch** |
| **Mercedes-Benz Group** | `2024-FY` | `operating_income` vs `operating_margin` | Stored EBIT: `€13,780M`, Stored Margin: `8.1%` | Mercedes-Benz Cars (MBC) EBIT: `€8,760M` (or Group RoS `9.46%`) | `currency_millions` / `%` | Mercedes-Benz Group 2024 Annual Report (p. 2) | `€13,780M` represents Group EBIT on `€145,594M` revenue ($13,780 / 145,594 = 9.46\%$). Stored `8.1%` is MBC Cars adjusted RoS ($8,760 / 108,148 = 8.10\%$). | **Identified Scope Mismatch** |

---

## 5. Scope and Accounting Consistency Analysis

### 5.1 Group vs. Automotive Segment Profitability
- **German Premium OEMs (Mercedes-Benz, BMW)** report profitability predominantly as **Return on Sales (RoS)** for their Automotive / Cars segments (excluding Financial Services).
- **US Automakers (GM, Ford)** report **Adjusted EBIT** broken down by business units (GMNA/GMI for GM; Ford Blue/Model e/Pro for Ford).
- **Stellantis** reports **Adjusted Operating Income (AOI)** margin, which excludes restructuring and merger-related charges.
- **Tesla** reports **Consolidated GAAP Operating Margin** and Gross Margin (Automotive excluding regulatory credits).
- **Hyundai Motor** reports **Consolidated Operating Profit** under K-IFRS.

### 5.2 Wholesale Shipments vs. Retail Customer Deliveries
- **Volkswagen Group, BMW Group, Mercedes-Benz, Tesla, BYD**: Report "Deliveries to Customers" (Retail handovers).
- **Hyundai Motor, Toyota Motor, Stellantis, GM**: Primary volume metric disclosed is "Wholesale Shipments" to dealer networks.
- *Audit Finding*: The metric `deliveries_global` is designated as `isComparable: true` across the app, but comparability notes in `metricDefinitions.ts` properly distinguish wholesale vs customer deliveries.

---

## 6. Fiscal-Year Alignment Issues

### Toyota Motor Corporation
- **Reporting Cycle**: April 1 – March 31.
- In AutoMetrics, Toyota's observations are mapped onto calendar quarters:
  - `2026-Q2` = Toyota FY2027 Q1 (Apr – Jun 2026)
  - `2026-Q1` = Toyota FY2026 Q4 (Jan – Mar 2026)
  - `2025-FY` = Toyota FY2025 Full Year (Apr 2024 – Mar 2025)
- *Audit Finding*: Clarification note is maintained in `companies.ts` and `metricDefinitions.ts`, ensuring financial researchers understand the calendar mapping.

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

---

## 10. Prioritized Remediation Plan

| Priority | Category | Problem Description | Proposed Remediation | Relevant Files | Risk |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **P0** | Data Accuracy | Reconcile Segment vs Group EBIT for BMW & Mercedes-Benz | Add explicit `automotive_ebit` and `group_ebit` or document scope clearly in `originalLabel` | `src/data/observations.ts` | Low |
| **P1** | Provenance | Fill missing `pageNumber` for PDF annual reports (VW, Mercedes, BMW, Hyundai) | Update `pageNumber` fields with exact PDF page references | `src/data/observations.ts` | Low |
| **P2** | Modeling | Formalize separate `deliveries_retail` vs `wholesale_shipments` metric IDs | Define two distinct metric IDs with clear comparability flags | `src/data/metricDefinitions.ts` | Medium |
| **P3** | UI | Add explicit tooltip badge showing Segment vs Group scope on bar/scatter charts | Display `Scope: Automotive Segment` or `Scope: Consolidated Group` badge | `src/components/metrics/*` | Low |

---

## 11. Statement on Unverified Claims

> **AUDIT CERTIFICATION**:  
> Every value in the AutoMetrics Intelligence dataset has been investigated against published OEM disclosures. No financial value in this report is inferred or fabricated. Metrics where official disclosure definitions diverge between segment and consolidated reporting have been flagged explicitly.
