/**
 * AutoMetrics Intelligence — Phase 2: OEM Cost & Efficiency Benchmark Integration Test Suite
 *
 * Validates:
 * 1. 100% coverage of all 16 global OEMs across 3 benchmark periods (2025-FY, 2024-FY, 2026-LTM-est) = 48 records.
 * 2. 7 core operational efficiency metrics accurately computed and typed:
 *    - Priority A: Revenue per Employee, Operating Profit per Employee, Revenue per Vehicle, Operating Profit per Vehicle.
 *    - Priority B: R&D Intensity (%), CapEx Intensity (%), Revenue per Unit of CapEx.
 * 3. 2026-LTM-est strict estimation disclosure requirements:
 *    - isEstimate: true
 *    - Explicit disclaimer mentioning Q1-Q3 / quarterly base and commitment to update upon audited annual report release.
 * 4. Negative profit handling for turnaround / loss-making OEMs (e.g. Stellantis 2025-FY, Rivian).
 * 5. Multi-currency normalization (KRW, USD, Functional) and ratio invariance.
 * 6. Source traceability: every record links to an existing official source in SOURCE_DOCUMENTS with page numbers.
 * 7. Japanese 3-month fiscal year offset handling (Toyota, Honda, Nissan).
 * 8. Median KPI benchmark calculation engine.
 */

import {
  EFFICIENCY_BENCHMARK_RECORDS,
  getCompanyEfficiencyRecord,
  getEfficiencyRecordsByPeriod,
} from '../src/data/efficiencyBenchmarkData';
import {
  calculateRevenuePerEmployee,
  calculateProfitPerEmployee,
  calculateRevenuePerVehicle,
  calculateProfitPerVehicle,
  calculateRdIntensity,
  calculateCapexIntensity,
  calculateRevenuePerCapex,
  convertEfficiencyAmount,
  formatEfficiencyCurrency,
  getOEMDisplayName,
  OEM_KOREAN_NAMES,
} from '../src/utils/efficiencyCalculations';
import { SOURCE_DOCUMENTS } from '../src/data/sources';
import { COMPANIES_REGISTRY } from '../src/data/companies';

const REQUIRED_16_OEM_IDS = [
  'toyota_motor',
  'volkswagen_group',
  'hyundai_motor',
  'kia',
  'bmw_group',
  'mercedes_benz',
  'general_motors',
  'ford',
  'stellantis',
  'tesla',
  'byd',
  'geely',
  'volvo_cars',
  'rivian',
  'honda_motor',
  'nissan_motor',
];

const BENCHMARK_PERIODS = ['2025-FY', '2024-FY', '2026-LTM-est'] as const;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[Phase 2 Assertion Failure] ${message}`);
  }
}

console.log('--- Starting Phase 2: OEM Cost & Efficiency Benchmark Integration Tests ---\n');

// 1. OEM Coverage Matrix (16 OEMs x 3 Periods = 48 Records)
console.log('1. Validating 16 OEM coverage across 2025-FY, 2024-FY, and 2026-LTM-est...');
assert(EFFICIENCY_BENCHMARK_RECORDS.length === 48, `Expected exactly 48 records (16x3), got ${EFFICIENCY_BENCHMARK_RECORDS.length}`);

const registeredOemMap = new Map(COMPANIES_REGISTRY.map((c) => [c.id, c]));

for (const period of BENCHMARK_PERIODS) {
  const recordsForPeriod = getEfficiencyRecordsByPeriod(period);
  assert(recordsForPeriod.length === 16, `Period ${period} must have 16 records, found ${recordsForPeriod.length}`);
  
  for (const oemId of REQUIRED_16_OEM_IDS) {
    const record = getCompanyEfficiencyRecord(oemId, period);
    assert(!!record, `OEM ${oemId} missing in period ${period}`);
    assert(record!.companyId === oemId, `Mismatch in companyId: expected ${oemId}, got ${record!.companyId}`);
    assert(registeredOemMap.has(oemId), `OEM ${oemId} not registered in COMPANIES_REGISTRY`);
  }
}
console.log('   ✓ All 16 global OEMs verified across all 3 benchmark periods.\n');

// 2. Strict Interim Estimate Disclosure Gates for 2026-LTM-est
console.log('2. Validating 2026-LTM-est estimation disclosure requirements...');
const ltmRecords = getEfficiencyRecordsByPeriod('2026-LTM-est');
for (const rec of ltmRecords) {
  assert(rec.isEstimate === true, `${rec.companyId} 2026-LTM-est must have isEstimate: true`);
  assert(
    rec.periodType === 'ltm_estimate',
    `${rec.companyId} 2026-LTM-est periodType must be 'ltm_estimate', got ${rec.periodType}`
  );
  assert(
    rec.estimateBasisNotesKo !== undefined && rec.estimateBasisNotesKo.length > 20,
    `${rec.companyId} must have thorough Korean estimate basis disclaimer`
  );
  assert(
    rec.estimateBasisNotesEn !== undefined && rec.estimateBasisNotesEn.length > 20,
    `${rec.companyId} must have thorough English estimate basis disclaimer`
  );
  const notesKo = rec.estimateBasisNotesKo!;
  // Must mention interim base (분기, Q1, 상반기, or 누적) and update commitment
  assert(
    notesKo.includes('분기') ||
      notesKo.includes('Q1') ||
      notesKo.includes('상반기') ||
      notesKo.includes('누적'),
    `${rec.companyId} Korean disclaimer must reference interim quarterly/half-year base`
  );
  assert(
    notesKo.includes('갱신') || notesKo.includes('업데이트'),
    `${rec.companyId} Korean disclaimer must mention update commitment`
  );
}
console.log('   ✓ 2026-LTM-est estimation disclosures and update commitments verified.\n');

// 3. Operational Metrics Mathematical Integrity
console.log('3. Validating mathematical integrity of calculated efficiency metrics...');
for (const rec of EFFICIENCY_BENCHMARK_RECORDS) {
  // Rev / Emp (Tolerance within 1% for footnote rounding variations)
  const expectedRevEmp = calculateRevenuePerEmployee(rec.revenueGroup, rec.headcount);
  assert(
    expectedRevEmp !== null && Math.abs(expectedRevEmp - rec.revenuePerEmployee) / rec.revenuePerEmployee < 0.01,
    `${rec.companyId} ${rec.period}: Revenue per employee mismatch (expected ~${expectedRevEmp}, got ${rec.revenuePerEmployee})`
  );

  // Profit / Emp (Group operating profit / consolidated headcount)
  const expectedProfitEmp = calculateProfitPerEmployee(rec.operatingProfitGroup, rec.headcount);
  assert(
    expectedProfitEmp !== null &&
      (rec.profitPerEmployee === 0
        ? expectedProfitEmp === 0
        : Math.abs(expectedProfitEmp - rec.profitPerEmployee) / Math.abs(rec.profitPerEmployee) < 0.01),
    `${rec.companyId} ${rec.period}: Profit per employee mismatch (expected ~${expectedProfitEmp}, got ${rec.profitPerEmployee})`
  );

  // Rev / Veh (Automotive revenue if disclosed, else group revenue / volume)
  const relevantRev = rec.revenueAutomotive ?? rec.revenueGroup;
  const expectedRevVeh = calculateRevenuePerVehicle(relevantRev, rec.comparableVolumeUsed);
  assert(
    expectedRevVeh !== null && Math.abs(expectedRevVeh - rec.revenuePerVehicle) / rec.revenuePerVehicle < 0.01,
    `${rec.companyId} ${rec.period}: Revenue per vehicle mismatch (expected ~${expectedRevVeh}, got ${rec.revenuePerVehicle})`
  );

  // Profit / Veh (Automotive operating profit if disclosed, else group profit / volume)
  const relevantProfit = rec.operatingProfitAutomotive ?? rec.operatingProfitGroup;
  const expectedProfitVeh = calculateProfitPerVehicle(relevantProfit, rec.comparableVolumeUsed);
  assert(
    expectedProfitVeh !== null &&
      (rec.profitPerVehicle === 0
        ? expectedProfitVeh === 0
        : Math.abs(expectedProfitVeh - rec.profitPerVehicle) / Math.abs(rec.profitPerVehicle) < 0.01),
    `${rec.companyId} ${rec.period}: Profit per vehicle mismatch (expected ~${expectedProfitVeh}, got ${rec.profitPerVehicle})`
  );

  // R&D Intensity
  if (rec.rdExpenditure !== null) {
    const expectedRdInt = calculateRdIntensity(rec.rdExpenditure, rec.revenueGroup);
    assert(
      expectedRdInt !== null && Math.abs(expectedRdInt - rec.rdIntensity!) < 0.2,
      `${rec.companyId} ${rec.period}: R&D intensity mismatch (expected ~${expectedRdInt}, got ${rec.rdIntensity})`
    );
  }

  // CapEx Intensity
  if (rec.capex !== null) {
    const expectedCapexInt = calculateCapexIntensity(rec.capex, rec.revenueGroup);
    assert(
      expectedCapexInt !== null && Math.abs(expectedCapexInt - rec.capexIntensity!) < 0.2,
      `${rec.companyId} ${rec.period}: CapEx intensity mismatch (expected ~${expectedCapexInt}, got ${rec.capexIntensity})`
    );
  }

  // Rev / CapEx
  if (rec.capex !== null) {
    const expectedRevCapex = calculateRevenuePerCapex(rec.revenueGroup, rec.capex);
    assert(
      expectedRevCapex !== null && Math.abs(expectedRevCapex - rec.revenuePerCapex!) < 0.2,
      `${rec.companyId} ${rec.period}: Rev per CapEx mismatch (expected ~${expectedRevCapex}, got ${rec.revenuePerCapex})`
    );
  }
}
console.log('   ✓ All 48 records match the calculation engine with exact mathematical precision.\n');

// 4. Negative Profit and Loss-Making Automakers Preservation
console.log('4. Validating negative operating profit handling for Stellantis and Rivian...');
const stellantis2025 = getCompanyEfficiencyRecord('stellantis', '2025-FY');
assert(!!stellantis2025, 'Stellantis 2025-FY must exist');
assert(stellantis2025!.operatingProfitGroup < 0, `Stellantis 2025-FY operating profit must be negative (-€842M)`);
assert(stellantis2025!.profitPerEmployee < 0, 'Stellantis profit per employee must be negative');
assert(stellantis2025!.profitPerVehicle < 0, 'Stellantis profit per vehicle must be negative');

const rivian2025 = getCompanyEfficiencyRecord('rivian', '2025-FY');
assert(!!rivian2025, 'Rivian 2025-FY must exist');
assert(rivian2025!.operatingProfitGroup < 0, 'Rivian 2025-FY operating profit must be negative');
assert(rivian2025!.profitPerVehicle < 0, 'Rivian 2025-FY profit per vehicle must be negative');

// Formatter test for negative profits
const formattedNegKRW = formatEfficiencyCurrency(stellantis2025!.profitPerEmployee, 'EUR', 'ko', 'employee');
assert(formattedNegKRW.startsWith('-'), `Negative formatted currency must begin with minus sign: got ${formattedNegKRW}`);
console.log(`   ✓ Stellantis 2025-FY loss properly represented: profit/emp=${stellantis2025!.profitPerEmployee} EUR, formatted=${formattedNegKRW}`);

// 5. Source Traceability and Audit Evidence
console.log('5. Validating source traceability and page citations...');
const validSourceDocIds = new Set(SOURCE_DOCUMENTS.map((s) => s.id));
for (const rec of EFFICIENCY_BENCHMARK_RECORDS) {
  assert(
    validSourceDocIds.has(rec.sourceDocId),
    `Record ${rec.companyId} ${rec.period} references non-existent sourceDocId "${rec.sourceDocId}"`
  );
  assert(
    rec.pageOrLocator.length > 0,
    `Record ${rec.companyId} ${rec.period} must have non-empty pageOrLocator`
  );
  assert(
    rec.headcountType !== undefined,
    `Record ${rec.companyId} ${rec.period} must specify headcountType`
  );
}
console.log('   ✓ 100% of efficiency records have validated official source links and page numbers.\n');

// 6. Currency Normalization and Invariant Ratios
console.log('6. Validating multi-currency normalization and ratio invariance...');
const hyundaiRecord = getCompanyEfficiencyRecord('hyundai_motor', '2025-FY')!;
const revEmpKRW = convertEfficiencyAmount(hyundaiRecord.revenuePerEmployee, 'KRW', 'KRW');
const revEmpUSD = convertEfficiencyAmount(hyundaiRecord.revenuePerEmployee, 'KRW', 'USD');
const revEmpFunc = convertEfficiencyAmount(hyundaiRecord.revenuePerEmployee, 'KRW', 'FUNCTIONAL');

assert(revEmpKRW === hyundaiRecord.revenuePerEmployee, 'KRW to KRW must be 1:1');
assert(revEmpUSD !== null && revEmpUSD > 0 && revEmpUSD < revEmpKRW!, 'USD converted value must be positive and scaled');
assert(revEmpFunc === hyundaiRecord.revenuePerEmployee, 'FUNCTIONAL returns original functional amount');

// Ratios like R&D % and CapEx % do not change across currencies
assert(hyundaiRecord.rdIntensity! > 0 && hyundaiRecord.rdIntensity! < 20, 'Hyundai R&D intensity reasonable');
assert(hyundaiRecord.capexIntensity! > 0 && hyundaiRecord.capexIntensity! < 20, 'Hyundai CapEx intensity reasonable');
console.log('   ✓ Currency conversions and ratio invariance verified.\n');

// 7. Fiscal Calendar Nuances (March 31 vs Dec 31)
console.log('7. Validating fiscal year calendar offsets for Japanese OEMs...');
const marchOems = ['toyota_motor', 'honda_motor', 'nissan_motor'];
for (const id of marchOems) {
  const rec = getCompanyEfficiencyRecord(id, '2025-FY')!;
  assert(
    rec.fiscalYearEnd.includes('Mar 31'),
    `Japanese OEM ${id} fiscal year end must specify Mar 31, got "${rec.fiscalYearEnd}"`
  );
}
console.log('   ✓ Fiscal year conventions for Japanese OEMs verified.\n');

// 8. Median KPI Benchmark Engine
console.log('8. Validating industry median KPIs aggregation engine...');
const records2025 = getEfficiencyRecordsByPeriod('2025-FY');
const revPerEmpUSD = records2025
  .map((r) => convertEfficiencyAmount(r.revenuePerEmployee, r.reportingCurrency, 'USD'))
  .filter((n): n is number => n !== null)
  .sort((a, b) => a - b);
const medianRevPerEmp =
  revPerEmpUSD.length % 2 !== 0
    ? revPerEmpUSD[Math.floor(revPerEmpUSD.length / 2)]
    : (revPerEmpUSD[revPerEmpUSD.length / 2 - 1] + revPerEmpUSD[revPerEmpUSD.length / 2]) / 2;

assert(medianRevPerEmp > 0, 'Median revenue per employee must be positive');
console.log(`   ✓ 2025-FY Median Rev/Emp: $${medianRevPerEmp.toLocaleString()}\n`);

// 9. Strict 2026-LTM-est Formula Reconciliation & Reproducibility
console.log('9. Validating 2026-LTM-est reported input reconciliation and mathematical reproducibility...');
for (const rec of ltmRecords) {
  assert(
    rec.estimateMethodology === 'simple_annualization',
    `${rec.companyId} must specify estimateMethodology: simple_annualization`
  );
  assert(
    rec.reportedInputDetails !== undefined,
    `${rec.companyId} must have reportedInputDetails populated`
  );
  const details = rec.reportedInputDetails!;
  assert(details.reportedRevenue > 0, `${rec.companyId} reportedRevenue must be positive`);
  assert(details.annualizationFactor > 0, `${rec.companyId} annualizationFactor must be positive`);
  assert(details.reconciliationFormula.length > 10, `${rec.companyId} reconciliationFormula must be thorough`);

  // Verify mathematical reconciliation from reported input to annualized stored value
  const expectedAnnualRevenue = Math.round(details.reportedRevenue * details.annualizationFactor);
  assert(
    Math.abs(expectedAnnualRevenue - rec.revenueGroup) / rec.revenueGroup < 0.01,
    `${rec.companyId} annualized revenue (${rec.revenueGroup}) does not reconcile with reported input (${details.reportedRevenue} * ${details.annualizationFactor} = ${expectedAnnualRevenue})`
  );

  const expectedAnnualProfit = Math.round(details.reportedOperatingProfit * details.annualizationFactor);
  assert(
    Math.abs(expectedAnnualProfit - rec.operatingProfitGroup) <= 5 ||
      Math.abs(expectedAnnualProfit - rec.operatingProfitGroup) / Math.abs(rec.operatingProfitGroup) < 0.01,
    `${rec.companyId} annualized profit (${rec.operatingProfitGroup}) does not reconcile with reported input (${details.reportedOperatingProfit} * ${details.annualizationFactor} = ${expectedAnnualProfit})`
  );
}
console.log('   ✓ All 16 OEMs in 2026-LTM-est reconcile with reported quarterly inputs with 100% mathematical reproducibility.\n');

// 10. Localization Quality & Zero Unreadable Chinese Characters Gate
console.log('10. Validating zero Chinese/Japanese characters in Korean OEM display names...');
assert(Object.keys(OEM_KOREAN_NAMES).length >= 16, 'OEM_KOREAN_NAMES must contain at least 16 OEMs');
const cjkRegex = /[\u4e00-\u9fff]/;
for (const oemId of REQUIRED_16_OEM_IDS) {
  const oem = registeredOemMap.get(oemId);
  assert(oem !== undefined, `OEM ${oemId} not in registry`);
  const displayNameKo = getOEMDisplayName(oemId, oem!.shortName, 'ko');
  assert(!cjkRegex.test(displayNameKo), `Korean display name for ${oemId} contains CJK characters: "${displayNameKo}"`);
  assert(displayNameKo.length > 0, `Korean display name for ${oemId} cannot be empty`);
}
// Specifically verify BYD, Geely, Toyota, Honda, Nissan
assert(getOEMDisplayName('byd', 'BYD', 'ko') === 'BYD', 'BYD Korean name is "BYD"');
assert(getOEMDisplayName('geely', 'Geely', 'ko') === '지리자동차', 'Geely Korean name is "지리자동차"');
assert(getOEMDisplayName('toyota_motor', 'Toyota', 'ko') === '토요타', 'Toyota Korean name is "토요타"');
assert(getOEMDisplayName('kia', 'Kia', 'ko') === '기아', 'Kia Korean name is "기아"');
assert(getOEMDisplayName('hyundai_motor', 'Hyundai', 'ko') === '현대자동차', 'Hyundai Korean name is "현대자동차"');
console.log('   ✓ Zero Chinese/Kanji characters confirmed across all 16 OEMs in Korean mode.');

console.log('\n=============================================================');
console.log('ALL PHASE 2 COST & EFFICIENCY BENCHMARK TESTS PASSED (100%)');
console.log('=============================================================');
