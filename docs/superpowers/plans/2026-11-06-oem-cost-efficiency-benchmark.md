# OEM Cost & Efficiency Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-grade OEM Cost & Efficiency Benchmark feature in AutoMetrics Intelligence, comparing operational and financial productivity across 16 global automakers with full source traceability, currency conversions, and transparent proxy/estimate classifications.

**Architecture:** Extend `/rankings` with a third view (`OEMCostEfficiencyBenchmark`), backed by a dedicated, typed data registry (`src/data/efficiencyBenchmarkData.ts`) and pure calculation module (`src/utils/efficiencyCalculations.ts`). Surface compact efficiency cards on `CompanyDashboardPage.tsx` with deep-linking to rankings.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, React Router 6, tsx test runner.

**Spec:** User request specifying Priority A (Rev/Emp, Profit/Emp, Rev/Veh, Profit/Veh) & Priority B (R&D %, CapEx %, Rev/CapEx) metrics, coverage of all 16 OEMs, default to 2025-FY with 2024-FY and 2026-LTM-est periods, and explicit estimate disclosures.

## Global Constraints

- Preserve existing navigation routes, visual identity, responsive Tailwind layout, and dark mode.
- Non-breaking changes: `leaderboard` and `head_to_head` on `/rankings` must continue working identically.
- Full bilingual localization (Korean `ko` and English `en`).
- Currency handling: absolute monetary metrics (Rev/Emp, Profit/Emp, Rev/Veh, Profit/Veh) support KRW, USD, and functional currency; percentage and ratio metrics preserve original values.
- Explicit disclosures: Never present consolidated group revenue/profit divided by vehicle delivery as verified automotive metrics without a 'proxy' indicator; 2026 LTM numbers must carry an explicit 'estimate' classification and update commitment disclaimer.

## Review Focus

1. Zero denominators (e.g., missing headcount or CapEx) must yield `null` safely without `NaN` or `Infinity`.
2. Negative operating income (e.g., Stellantis, Rivian, Volvo Cars) must render negative profit per employee and negative profit per vehicle with correct formatting and minus signs.
3. Fiscal calendar boundaries (Toyota, Honda, Nissan FY ended March 31) must be clearly labeled as March-ended fiscal years.
4. Division perimeter mismatch: Group revenue vs automotive segment revenue must be flagged as `proxy` when segment revenue is unavailable.
5. Deep-linking: clicking the efficiency card on `CompanyDashboardPage` must navigate to `/rankings?tab=efficiency&oem=<companyId>` and preselect/highlight the OEM.

---

### Task 1: Efficiency Data Model & Benchmark Data Registry

**Files:**
- Create: `src/types/efficiency.ts`
- Create: `src/data/efficiencyBenchmarkData.ts`
- Test: `tests/cost-efficiency-data.test.ts`

- [ ] **Step 1.1**: Define TypeScript interfaces in `src/types/efficiency.ts`
  - `HeadcountType`: `'average' | 'year_end' | 'full_time_equivalent'`
  - `HeadcountScope`: `'consolidated_group' | 'automotive_segment'`
  - `EfficiencyMetricClassification`: `'reported' | 'calculated' | 'estimated' | 'proxy'`
  - `OEMEfficiencyRecord`: company metadata, headcount, group/auto revenue & EBIT, R&D, CapEx, retail/wholesale volume, pre-computed & raw values, classifications, and source citations.

- [ ] **Step 1.2**: Write failing data validation test `tests/cost-efficiency-data.test.ts`
  - Verify that all 16 registered automakers are included.
  - Verify presence of `2025-FY`, `2024-FY`, and `2026-LTM-est` records.
  - Verify non-zero headcount for all major OEMs.
  - Verify all sourceDocIds point to valid registered sources in `SOURCE_DOCUMENTS`.

- [ ] **Step 1.3**: Populate `src/data/efficiencyBenchmarkData.ts`
  - Compile verified data for 16 OEMs for `2025-FY`, `2024-FY`, and `2026-LTM-est` (using officially reported Q1-Q3 annualized data with clear estimate badges).
  - Include exact citations: document titles, URLs, and pages.

- [ ] **Step 1.4**: Run tests and verify
  - Run `npx tsx tests/cost-efficiency-data.test.ts` to ensure 100% pass.

- [ ] **Step 1.5**: Commit Task 1
  - `git add src/types/efficiency.ts src/data/efficiencyBenchmarkData.ts tests/cost-efficiency-data.test.ts`
  - `git commit -m "feat(efficiency): create efficiency data model and multi-OEM benchmark registry"`

---

### Task 2: Pure Efficiency Calculation Engine & Currency Normalizer

**Files:**
- Create: `src/utils/efficiencyCalculations.ts`
- Test: `tests/cost-efficiency-calculations.test.ts`

- [ ] **Step 2.1**: Write comprehensive unit tests in `tests/cost-efficiency-calculations.test.ts`
  - Test `calculateRevenuePerEmployee` (normal case, zero headcount, null revenue).
  - Test `calculateProfitPerEmployee` (positive profit, negative operating loss, zero headcount).
  - Test `calculateRevenuePerVehicle` & `calculateProfitPerVehicle` (automotive vs group proxy).
  - Test `calculateRdIntensity` and `calculateCapexIntensity` (percentages, missing expenditure).
  - Test `calculateRevenuePerCapex` (ratio).
  - Test currency conversion integration (`convertMillionsToUSD`, `convertMillionsToKRW`).

- [ ] **Step 2.2**: Implement calculation functions in `src/utils/efficiencyCalculations.ts`
  - Export math functions with robust defensive checks (return `null` for non-finite or zero denominators).
  - Export formatting helpers for revenue/employee, profit/employee, revenue/vehicle, profit/vehicle with localized KRW (억/만 원), USD ($/k$), and EUR/JPY/CNY symbols.
  - Export classification badge resolution helpers.

- [ ] **Step 2.3**: Run calculation tests
  - Run `npx tsx tests/cost-efficiency-calculations.test.ts` and confirm all assertions pass.

- [ ] **Step 2.4**: Commit Task 2
  - `git add src/utils/efficiencyCalculations.ts tests/cost-efficiency-calculations.test.ts`
  - `git commit -m "feat(efficiency): implement efficiency calculation engine and currency normalizer"`

---

### Task 3: UI Component — `OEMCostEfficiencyBenchmark`

**Files:**
- Create: `src/components/rankings/OEMCostEfficiencyBenchmark.tsx`
- Test: visual and build verification

- [ ] **Step 3.1**: Build the header, period selector, and estimate disclaimer
  - Period toggle: `2025-FY (공식 결산 / Full Year)`, `2024-FY (공식 결산 / Full Year)`, `2026-LTM-est (1~3분기 기반 연환산 추정치 / Q1-Q3 Annualized Estimate)`.
  - Prominent estimate banner when `2026-LTM-est` is selected: explains that metrics are calculated using Q1-Q3 cumulative results, clearly labeled as interim estimates, and will be updated upon official full-year annual report publication.
  - Currency toggle: `KRW (원화 억/만)`, `USD ($/k$)`, `Functional (공시 원통화)`.

- [ ] **Step 3.2**: Build Summary Headline KPI Cards
  - Cards for: Industry Median Revenue / Employee, Median Operating Profit / Employee, Median Revenue / Vehicle, Median R&D Intensity %, Median CapEx Intensity %.

- [ ] **Step 3.3**: Build the interactive sortable table
  - Columns: Rank, OEM, Volume Scope, Headcount, Rev/Emp, Profit/Emp, Rev/Vehicle, Profit/Vehicle, R&D %, CapEx %, Rev/CapEx, Data Quality Badge.
  - Sorting support on every numeric column (ascending / descending).
  - Company search/filter input.
  - Highlighting row when `highlightCompanyId` prop is provided.
  - Clickable row / badge to open provenance details.

- [ ] **Step 3.4**: Build the interactive comparison bar chart
  - Chart metric selector dropdown (Rev/Emp, Profit/Emp, Rev/Vehicle, Profit/Vehicle, R&D %, CapEx %, Rev/CapEx).
  - Horizontal or vertical bars with OEM colors, hover tooltips, and sorting toggle.
  - Disclose that high metrics do not necessarily mean operational superiority (e.g. outsourcing vs vertical integration note).

- [ ] **Step 3.5**: Build the Methodology & Definitions Drawer/Modal
  - Detailed glossary explaining each metric's formula, automotive vs group scope differences, wholesale vs retail caveats, and limitations.

- [ ] **Step 3.6**: Commit Task 3
  - `git add src/components/rankings/OEMCostEfficiencyBenchmark.tsx`
  - `git commit -m "feat(efficiency): create OEMCostEfficiencyBenchmark component with table, chart, and KPI cards"`

---

### Task 4: Integrate into `RankingsPage.tsx` with URL Tab & OEM Deep-Linking

**Files:**
- Modify: `src/pages/RankingsPage.tsx`
- Test: build and browser routing

- [ ] **Step 4.1**: Update `RankingsPage.tsx`
  - Add `'cost_efficiency'` to `activeTab` state.
  - Add third tab button: `원가·생산성 벤치마크 (Cost & Efficiency)`.
  - Read query parameters using `useSearchParams`: if `?tab=efficiency`, set tab to `cost_efficiency`; if `&oem=<id>`, pass to `OEMCostEfficiencyBenchmark` as `highlightCompanyId`.
  - Update page title & SEO description to mention efficiency and productivity benchmark.

- [ ] **Step 4.2**: Verify build and type safety
  - Run `npm run typecheck` and verify no TypeScript errors.

- [ ] **Step 4.3**: Commit Task 4
  - `git add src/pages/RankingsPage.tsx`
  - `git commit -m "feat(rankings): integrate Cost & Efficiency view into Rankings page with deep-linking"`

---

### Task 5: Integrate Efficiency Summary Card on `CompanyDashboardPage.tsx`

**Files:**
- Create: `src/components/company/CompanyEfficiencyCard.tsx`
- Modify: `src/pages/CompanyDashboardPage.tsx`

- [ ] **Step 5.1**: Build `CompanyEfficiencyCard.tsx`
  - Compact card showing the selected OEM's efficiency metrics for `2025-FY`:
    - Revenue per Employee
    - Operating Profit per Employee
    - Revenue per Vehicle
    - R&D Intensity (%)
    - CapEx Intensity (%)
  - Industry rank or quartile indicator (e.g., "글로벌 상위 25%").
  - "전체 16개 OEM과 벤치마크 비교하기" button linking to `/rankings?tab=efficiency&oem=${currentCompany.id}`.

- [ ] **Step 5.2**: Mount card in `CompanyDashboardPage.tsx`
  - Add in the corporate overview or financial section without disrupting existing layout.

- [ ] **Step 5.3**: Commit Task 5
  - `git add src/components/company/CompanyEfficiencyCard.tsx src/pages/CompanyDashboardPage.tsx`
  - `git commit -m "feat(company): add compact operational efficiency benchmark card to CompanyDashboard"`

---

### Task 6: Full Integration Tests, Linting, Build & Final Audit

**Files:**
- Create: `tests/phase2-efficiency-benchmark.test.ts`
- Modify: `package.json` (add test to `test` script)

- [ ] **Step 6.1**: Create comprehensive Phase 2 gate test suite
  - Test all 16 OEMs in `efficiencyBenchmarkData.ts`.
  - Test all 7 core efficiency metrics calculated accurately.
  - Test negative operating margin companies (Stellantis, Rivian, Volvo Cars).
  - Test currency conversion reproducibility.
  - Test 2026-LTM-est contains explicit estimation flags and disclaimer.
  - Test deep-link parameter handling.

- [ ] **Step 6.2**: Run full verification pipeline
  - `npm run typecheck`
  - `npm run lint`
  - `npm run validate-data`
  - `npm run validate-source-claims`
  - `npm test`
  - `npm run build`
  - `npm run audit-data -- --execute-all`

- [ ] **Step 6.3**: Commit and push
  - Commit all test and doc updates.
  - Push to `origin/main`.
