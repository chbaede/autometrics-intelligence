/**
 * AutoMetrics Intelligence — OEM Cost & Efficiency Benchmark Data Integrity Test
 */

import {
  EFFICIENCY_BENCHMARK_RECORDS,
  getEfficiencyRecordsByPeriod,
  getCompanyEfficiencyRecord,
  getAvailableEfficiencyPeriods,
} from '../src/data/efficiencyBenchmarkData';
import { COMPANIES_REGISTRY } from '../src/data/companies';
import { SOURCE_DOCUMENTS } from '../src/data/sources';

console.log('🧪 Starting Cost & Efficiency Benchmark Data Integrity Test Suite...\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failCount++;
  }
}

// 1. Periods & Registry Presence
const periods = getAvailableEfficiencyPeriods();
assert(periods.includes('2025-FY'), 'Periods includes 2025-FY (official full-year default)');
assert(periods.includes('2024-FY'), 'Periods includes 2024-FY (historical comparison)');
assert(periods.includes('2026-LTM-est'), 'Periods includes 2026-LTM-est (interim estimate)');

const registeredOemIds = COMPANIES_REGISTRY.map((c) => c.id);
assert(registeredOemIds.length === 16, `Registered automakers count is 16 (${registeredOemIds.length})`);

// 2. Full Coverage Check for 2025-FY (Core Baseline)
const records2025 = getEfficiencyRecordsByPeriod('2025-FY');
assert(records2025.length === 16, `2025-FY has all 16 OEMs (${records2025.length})`);

// 3. Full Coverage Check for 2024-FY & 2026-LTM-est
const records2024 = getEfficiencyRecordsByPeriod('2024-FY');
assert(records2024.length === 16, `2024-FY has all 16 OEMs (${records2024.length})`);

const records2026Est = getEfficiencyRecordsByPeriod('2026-LTM-est');
assert(records2026Est.length === 16, `2026-LTM-est has all 16 OEMs (${records2026Est.length})`);

// 4. Source Document Traceability Check
const validSourceDocIds = new Set(SOURCE_DOCUMENTS.map((s) => s.id));
EFFICIENCY_BENCHMARK_RECORDS.forEach((rec) => {
  assert(
    validSourceDocIds.has(rec.sourceDocId),
    `[${rec.companyId} ${rec.period}] Source doc ${rec.sourceDocId} is registered in SOURCE_DOCUMENTS`
  );
  assert(rec.headcount > 0, `[${rec.companyId} ${rec.period}] Headcount is positive (${rec.headcount})`);
  assert(rec.revenueGroup > 0, `[${rec.companyId} ${rec.period}] Group revenue is positive (${rec.revenueGroup})`);
  assert(typeof rec.operatingProfitGroup === 'number', `[${rec.companyId} ${rec.period}] Operating profit is a number (${rec.operatingProfitGroup})`);
  assert(rec.comparableVolumeUsed > 0, `[${rec.companyId} ${rec.period}] Volume is positive (${rec.comparableVolumeUsed}k)`);

  // Verify metric classifications are present
  assert(Boolean(rec.metricClassifications.revenuePerEmployee), `[${rec.companyId} ${rec.period}] has rev/emp classification`);
  assert(Boolean(rec.metricClassifications.profitPerEmployee), `[${rec.companyId} ${rec.period}] has profit/emp classification`);
  assert(Boolean(rec.metricClassifications.revenuePerVehicle), `[${rec.companyId} ${rec.period}] has rev/veh classification`);
  assert(Boolean(rec.metricClassifications.profitPerVehicle), `[${rec.companyId} ${rec.period}] has profit/veh classification`);

  // Verify estimates disclosure
  if (rec.isEstimate) {
    assert(
      Boolean(rec.estimateBasisNotesKo && rec.estimateBasisNotesKo.length > 10),
      `[${rec.companyId} ${rec.period}] Estimate record carries Korean methodology disclosure`
    );
    assert(
      Boolean(rec.estimateBasisNotesEn && rec.estimateBasisNotesEn.length > 10),
      `[${rec.companyId} ${rec.period}] Estimate record carries English methodology disclosure`
    );
  }
});

// 5. Negative Profit Verification (Stellantis 2025, Rivian)
const stla2025 = getCompanyEfficiencyRecord('stellantis', '2025-FY');
assert(Boolean(stla2025 && stla2025.operatingProfitGroup < 0), 'Stellantis 2025-FY correctly records operating loss');
if (stla2025) {
  assert(stla2025.profitPerEmployee < 0, `Stellantis profit per employee is negative (${stla2025.profitPerEmployee})`);
  assert(stla2025.profitPerVehicle < 0, `Stellantis profit per vehicle is negative (${stla2025.profitPerVehicle})`);
}

const rivian2025 = getCompanyEfficiencyRecord('rivian', '2025-FY');
assert(Boolean(rivian2025 && rivian2025.operatingProfitGroup < 0), 'Rivian 2025-FY correctly records operating loss');
if (rivian2025) {
  assert(rivian2025.profitPerEmployee < 0, `Rivian profit per employee is negative (${rivian2025.profitPerEmployee})`);
}

// 6. Non-calendar Fiscal Year Disclosure (Toyota, Honda, Nissan)
['toyota_motor', 'honda_motor', 'nissan_motor'].forEach((id) => {
  const rec = getCompanyEfficiencyRecord(id, '2025-FY');
  assert(Boolean(rec && rec.fiscalYearEnd.includes('Mar 31')), `[${id}] documents March 31 fiscal year end`);
});

console.log(`\n========================================================`);
console.log(`Data Integrity Test Results: ${passCount} passed, ${failCount} failed.`);
console.log(`========================================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 Cost & Efficiency Data Registry integrity test passed cleanly!');
}
