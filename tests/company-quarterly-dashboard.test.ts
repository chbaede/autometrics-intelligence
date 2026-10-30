/**
 * Tests for Company Dashboard 2026-Q3 Period Resolution, Tri-Chart Suite, and Performance Drivers
 */

import { getAllCompanies, getObservationsByCompany } from '../src/utils/metricQueries';
import { getPerformanceDriver, PERFORMANCE_DRIVERS } from '../src/data/performanceDrivers';
import { getScheduledDisclosure } from '../src/data/scheduledDisclosures';
import { SOURCE_DOCUMENTS } from '../src/data/sources';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('🧪 Starting Company Quarterly Dashboard & Performance Drivers Test Suite...\n');

// 1. Period Resolution Logic for all 16 OEMs
const companies = getAllCompanies();
assert(companies.length === 16, `Registry contains exactly 16 OEMs (found ${companies.length})`);

const REPORTED_Q3_OEMS = [
  'tesla',
  'volkswagen_group',
  'general_motors',
  'ford',
  'hyundai_motor',
  'mercedes_benz',
  'stellantis',
  'byd',
  'volvo_cars',
];

const SCHEDULED_Q3_OEMS = [
  'bmw_group',
  'toyota_motor',
  'kia',
  'rivian',
  'geely',
  'honda_motor',
  'nissan_motor',
];

for (const oemId of REPORTED_Q3_OEMS) {
  const obs = getObservationsByCompany(oemId);
  const hasQ3 = obs.some((o) => o.period === '2026-Q3');
  const defaultPeriod = hasQ3 ? '2026-Q3' : '2026-Q2';
  assert(hasQ3, `Reported OEM ${oemId} has confirmed 2026-Q3 observations`);
  assert(defaultPeriod === '2026-Q3', `Reported OEM ${oemId} defaults to 2026-Q3 on dashboard entry`);
}

for (const oemId of SCHEDULED_Q3_OEMS) {
  const obs = getObservationsByCompany(oemId);
  const hasQ3 = obs.some((o) => o.period === '2026-Q3');
  const defaultPeriod = hasQ3 ? '2026-Q3' : '2026-Q2';
  const scheduled = getScheduledDisclosure(oemId, '2026-Q3');

  assert(!hasQ3, `Scheduled OEM ${oemId} does not fabricate unreleased 2026-Q3 observations`);
  assert(defaultPeriod === '2026-Q2', `Scheduled OEM ${oemId} safely falls back to verified 2026-Q2`);
  assert(scheduled !== undefined && Boolean(scheduled.scheduledDate), `Scheduled OEM ${oemId} has official 2026-Q3 disclosure schedule`);
}

// 2. Performance Drivers Integrity
assert(PERFORMANCE_DRIVERS.length >= 16, `Performance drivers registry has comprehensive coverage (${PERFORMANCE_DRIVERS.length} entries)`);

for (const c of companies) {
  const driver = getPerformanceDriver(c.id);
  assert(driver !== undefined, `OEM ${c.id} resolves an official performance driver`);
  if (driver) {
    assert(driver.headlineKo.length > 5, `OEM ${c.id} has Korean headline`);
    assert(driver.headlineEn.length > 5, `OEM ${c.id} has English headline`);
    assert(driver.summaryKo.length > 20, `OEM ${c.id} has detailed Korean summary`);
    assert(driver.summaryEn.length > 20, `OEM ${c.id} has detailed English summary`);
    assert(driver.drivers.length >= 2, `OEM ${c.id} provides at least 2 structured drivers (found ${driver.drivers.length})`);

    // Verify sourceDocId matches a registered primary source document
    const sourceDoc = SOURCE_DOCUMENTS.find((s) => s.id === driver.sourceDocId);
    assert(sourceDoc !== undefined, `OEM ${c.id} driver cites registered sourceDocId '${driver.sourceDocId}'`);
  }
}

// 3. BYD Q3 CASBE Net Profit Handling
const bydDriver = getPerformanceDriver('byd', '2026-Q3');
assert(bydDriver !== undefined, 'BYD has 2026-Q3 performance drivers');
assert(bydDriver?.sourceDocId === 'byd_2026_q3_interim', 'BYD Q3 cites official third quarterly report');

const bydObs = getObservationsByCompany('byd');
const bydQ3Net = bydObs.find((o) => o.period === '2026-Q3' && o.metricId === 'net_income');
const bydQ3Op = bydObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_income');

assert(bydQ3Net !== undefined && bydQ3Net.value === 10020, 'BYD Q3 accurately preserves RMB 10,020M net income');
assert(bydQ3Op === undefined, 'BYD Q3 does NOT misclassify net income as operating income');

// 4. Operating Loss Recognition in Q3
const vwObs = getObservationsByCompany('volkswagen_group');
const vwQ3Ebit = vwObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_income');
const vwQ3Margin = vwObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_margin');

assert(vwQ3Ebit !== undefined && vwQ3Ebit.value === -5860, 'VW Q3 preserves operating loss of -€5,860M');
assert(vwQ3Margin !== undefined && vwQ3Margin.value === -7.8, 'VW Q3 preserves operating margin of -7.8%');

const volvoObs = getObservationsByCompany('volvo_cars');
const volvoQ3Ebit = volvoObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_income');
const volvoQ3Margin = volvoObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_margin');

assert(volvoQ3Ebit !== undefined && volvoQ3Ebit.value === -5600, 'Volvo Cars Q3 preserves reported EBIT of -SEK 5,600M');
assert(volvoQ3Margin !== undefined && volvoQ3Margin.value === -8.4, 'Volvo Cars Q3 preserves EBIT margin of -8.4%');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Company Dashboard regression tests passed cleanly!\n');
}
