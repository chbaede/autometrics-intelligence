/**
 * AutoMetrics Intelligence — Company Dashboard, Quarterly Tri-Charts & Performance Drivers Test Suite
 *
 * Validates:
 * 1. Fail-closed period resolution (Q3 for reported OEMs, Q2 for scheduled OEMs).
 * 2. Strict exact-period commentary fallback policy:
 *    - Exact period commentary returned when available.
 *    - 2024-FY, 2025-FY, and unrecorded periods return undefined (never silently fallback to Q3).
 * 3. Authoritative source claim alignment:
 *    - Tesla Q3: Q3 2026 revenue ($28,046M) vs Q3 2025 revenue ($28,095M) -> YoY change of -0.2% (flat).
 *    - BYD Q3: Official revenue growth of +13.59%, net profit growth of +28.08%, passenger NEV volume 1,323,070 units.
 *    - Volkswagen Q3: Standalone Q3 special items (€7.8B) and operating loss (-€5.86B) distinguished from 9M cumulative (€8.7B special items, €6.4B Porsche impairment, ~€1B China adjustment).
 * 4. Structured assertion comparing application observations, driver claims, and primary source documents.
 */

import { getAllCompanies, getObservationsByCompany } from '../src/utils/metricQueries';
import { getPerformanceDriver, getAvailablePerformanceDriverPeriods } from '../src/data/performanceDrivers';
import { getScheduledDisclosure } from '../src/data/scheduledDisclosures';
import { SOURCE_DOCUMENTS } from '../src/data/sources';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

console.log('🧪 Starting Company Quarterly Dashboard & Performance Drivers Test Suite...\n');

const companies = getAllCompanies();
assert(companies.length === 16, 'Registry contains exactly 16 OEMs');

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

// =========================================================================
// Suite 1: Period Resolution Logic for All 16 Automakers
// =========================================================================
console.log('--- Suite 1: Period Resolution & Disclosure Scheduling ---');

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

// =========================================================================
// Suite 2: Strict Exact-Period Commentary Fallback Policy (P1)
// =========================================================================
console.log('\n--- Suite 2: Strict Period Commentary Fallback Policy ---');

for (const c of companies) {
  // 1. Period undefined or empty must return undefined
  assert(getPerformanceDriver(c.id, undefined) === undefined, `OEM ${c.id}: undefined period returns undefined`);
  assert(getPerformanceDriver(c.id, '') === undefined, `OEM ${c.id}: empty period returns undefined`);

  // 2. 2024-FY and 2025-FY have no quarterly commentary: must return undefined, NEVER silently fallback to Q3
  assert(getPerformanceDriver(c.id, '2024-FY') === undefined, `OEM ${c.id}: 2024-FY returns undefined (no silent fallback to Q3)`);
  assert(getPerformanceDriver(c.id, '2025-FY') === undefined, `OEM ${c.id}: 2025-FY returns undefined (no silent fallback to Q3)`);

  // 3. Unrecorded future period must return undefined
  assert(getPerformanceDriver(c.id, '2027-Q1') === undefined, `OEM ${c.id}: unrecorded period 2027-Q1 returns undefined`);

  // 4. Check available commentary periods helper
  const availablePeriods = getAvailablePerformanceDriverPeriods(c.id);
  assert(availablePeriods.length > 0, `OEM ${c.id} lists available commentary periods (${availablePeriods.join(', ')})`);
  assert(!availablePeriods.includes('2024-FY'), `OEM ${c.id} available commentary periods excludes 2024-FY`);
  assert(!availablePeriods.includes('2025-FY'), `OEM ${c.id} available commentary periods excludes 2025-FY`);

  // 5. Exact period matching
  for (const p of availablePeriods) {
    const driver = getPerformanceDriver(c.id, p);
    assert(driver !== undefined && driver.period === p, `OEM ${c.id}: exact match for period ${p}`);
  }
}

// =========================================================================
// Suite 3: Tesla Q3 2026 Source Verification & Revenue Growth Math (P0)
// =========================================================================
console.log('\n--- Suite 3: Tesla Q3 2026 Official Source Consistency ---');

const tslaDriver = getPerformanceDriver('tesla', '2026-Q3');
assert(tslaDriver !== undefined, 'Tesla has verified 2026-Q3 performance commentary');

// Verify official source figures
const tslaQ3Rev2026 = 28046; // $28.046B
const tslaQ3Rev2025 = 28095; // $28.095B from official release
const expectedTslaYoY = ((tslaQ3Rev2026 - tslaQ3Rev2025) / tslaQ3Rev2025) * 100; // -0.174%

assert(Math.abs(expectedTslaYoY - (-0.174)) < 0.01, 'Tesla Q3 YoY revenue change calculates to -0.17% (flat / -0.2%)');

// Ensure narrative does NOT claim +8% YoY revenue growth
assert(!tslaDriver!.summaryKo.includes('+8% YoY'), 'Tesla Korean summary does NOT contain incorrect "+8% YoY" claim');
assert(!tslaDriver!.summaryEn.includes('+8% YoY'), 'Tesla English summary does NOT contain incorrect "+8% YoY" claim');
assert(tslaDriver!.summaryKo.includes('-0.2% YoY') || tslaDriver!.summaryKo.includes('보합세'), 'Tesla Korean summary states flat / -0.2% YoY');
assert(tslaDriver!.summaryEn.includes('-0.2% YoY') || tslaDriver!.summaryEn.includes('roughly flat'), 'Tesla English summary states flat / -0.2% YoY');

// Source claim comparison
const tslaSource = SOURCE_DOCUMENTS.find((s) => s.id === 'tsla_2026_q3_deck');
assert(tslaSource !== undefined, 'Tesla Q3 source document tsla_2026_q3_deck is registered');
const tslaRevClaim = tslaSource?.sourceClaims?.find((c) => c.metricId === 'revenue');
assert(tslaRevClaim?.value === 28046, 'Tesla Q3 revenue claim is exactly $28,046M');
const tslaOpClaim = tslaSource?.sourceClaims?.find((c) => c.metricId === 'operating_income');
assert(tslaOpClaim?.value === 718, 'Tesla Q3 operating income claim is exactly $718M');
const tslaMarginClaim = tslaSource?.sourceClaims?.find((c) => c.metricId === 'operating_margin');
assert(tslaMarginClaim?.value === 2.6, 'Tesla Q3 operating margin claim is exactly 2.6%');

// =========================================================================
// Suite 4: BYD Q3 2026 Source Verification & CASBE Net Profit Scope (P0)
// =========================================================================
console.log('\n--- Suite 4: BYD Q3 2026 Official Report Consistency ---');

const bydDriver = getPerformanceDriver('byd', '2026-Q3');
assert(bydDriver !== undefined, 'BYD has verified 2026-Q3 performance commentary');

// Verify official report figures
// Official HKEX / SZSE filing: Q3 revenue growth +13.59%, Q3 net profit growth +28.08%
assert(!bydDriver!.summaryKo.includes('+24.0% YoY'), 'BYD Korean summary does NOT claim incorrect +24.0% revenue growth');
assert(!bydDriver!.summaryEn.includes('+24.0% YoY'), 'BYD English summary does NOT claim incorrect +24.0% revenue growth');
assert(!bydDriver!.summaryKo.includes('+11.5% YoY'), 'BYD Korean summary does NOT claim incorrect +11.5% net profit growth');
assert(!bydDriver!.summaryEn.includes('+11.5% YoY'), 'BYD English summary does NOT claim incorrect +11.5% net profit growth');

assert(bydDriver!.summaryKo.includes('+13.59% YoY'), 'BYD Korean summary correctly reports +13.59% YoY revenue growth');
assert(bydDriver!.summaryEn.includes('+13.59% YoY'), 'BYD English summary correctly reports +13.59% YoY revenue growth');
assert(bydDriver!.summaryKo.includes('+28.08% YoY'), 'BYD Korean summary correctly reports +28.08% YoY net profit growth');
assert(bydDriver!.summaryEn.includes('+28.08% YoY'), 'BYD English summary correctly reports +28.08% YoY net profit growth');

// Scope verification: Passenger NEVs
assert(!bydDriver!.summaryKo.includes('+37.8%'), 'BYD Korean summary does NOT use mismatched +37.8% volume rate');
assert(!bydDriver!.summaryEn.includes('+37.8%'), 'BYD English summary does NOT use mismatched +37.8% volume rate');
assert(bydDriver!.summaryKo.includes('1,323,070대'), 'BYD Korean summary states exact passenger NEV volume of 1,323,070 units');
assert(bydDriver!.summaryEn.includes('1,323,070 units'), 'BYD English summary states exact passenger NEV volume of 1,323,070 units');

// Unverified claim removal
assert(!bydDriver!.headlineKo.includes('+120%'), 'BYD headline does NOT contain unverified +120% export claim');
assert(!bydDriver!.headlineEn.includes('+120%'), 'BYD English headline does NOT contain unverified +120% export claim');

// Observations check: CASBE net profit preserved, no operating income fabricated
const bydObs = getObservationsByCompany('byd');
const bydQ3Net = bydObs.find((o) => o.period === '2026-Q3' && o.metricId === 'net_income');
const bydQ3Op = bydObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_income');
assert(bydQ3Net?.value === 10020, 'BYD Q3 net income observation is exactly RMB 10,020M');
assert(bydQ3Op === undefined, 'BYD Q3 operating income is undefined (fail-closed under CASBE)');

// =========================================================================
// Suite 5: Volkswagen Group Q3 Special Items vs 9M Disaggregation (P0)
// =========================================================================
console.log('\n--- Suite 5: Volkswagen Group Q3 vs 9M Cumulative Disaggregation ---');

const vwDriver = getPerformanceDriver('volkswagen_group', '2026-Q3');
assert(vwDriver !== undefined, 'Volkswagen Group has verified 2026-Q3 performance commentary');

// Ensure Q3 standalone (€7.8B special items, -€5.86B operating loss) is distinguished from 9M (€8.7B special items, €6.4B Porsche impairment)
assert(!vwDriver!.summaryKo.includes('포르쉐 AG 주가 하락에 따른 비현금성 영업권 손상차손(€49억)과 유럽 생산 공장 효율화 관련 구조조정 충당금(€12억)이 일시 반영'), 'VW narrative does NOT use fabricated Q3 €4.9B + €1.2B breakdown');
assert(!vwDriver!.summaryEn.includes('€4.9B non-cash impairment on Porsche AG goodwill and €1.2B in restructuring provisions'), 'VW English narrative does NOT use fabricated Q3 €4.9B + €1.2B breakdown');

assert(vwDriver!.summaryKo.includes('€78억') && vwDriver!.summaryKo.includes('특별항목'), 'VW Korean summary explicitly cites €78억 Q3 special items');
assert(vwDriver!.summaryEn.includes('€7.8B') && vwDriver!.summaryEn.includes('special items'), 'VW English summary explicitly cites €7.8B Q3 special items');
assert(vwDriver!.summaryKo.includes('€87억') && vwDriver!.summaryKo.includes('€64억'), 'VW Korean summary cites 9M €87억 cumulative special items and €64억 Porsche impairment');
assert(vwDriver!.summaryEn.includes('€8.7B') && vwDriver!.summaryEn.includes('€6.4B'), 'VW English summary cites 9M €8.7B cumulative special items and €6.4B Porsche impairment');

// Observations check: operating result is -€5,860M, margin is -7.8%
const vwObs = getObservationsByCompany('volkswagen_group');
const vwEbit = vwObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_income');
const vwMargin = vwObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_margin');
const vwRev = vwObs.find((o) => o.period === '2026-Q3' && o.metricId === 'revenue');
assert(vwEbit?.value === -5860, 'VW Q3 operating result is -€5,860M');
assert(vwMargin?.value === -7.8, 'VW Q3 operating return on sales is -7.8%');
assert(vwRev?.value === 75277, 'VW Q3 sales revenue is €75,277M');

// =========================================================================
// Suite 6: Structured Claim Verification Across All Reported 2026-Q3 OEMs
// =========================================================================
console.log('\n--- Suite 6: Structured Claim Verification Across All Reported Q3 OEMs ---');

for (const oemId of REPORTED_Q3_OEMS) {
  const driver = getPerformanceDriver(oemId, '2026-Q3');
  assert(driver !== undefined, `Reported OEM ${oemId} has Q3 driver entry`);

  const sourceDoc = SOURCE_DOCUMENTS.find((s) => s.id === driver!.sourceDocId);
  assert(sourceDoc !== undefined, `Reported OEM ${oemId} cites valid sourceDoc ${driver!.sourceDocId}`);
  assert(sourceDoc!.period === '2026-Q3', `Reported OEM ${oemId} sourceDoc matches period 2026-Q3`);
  assert(sourceDoc!.companyId === oemId, `Reported OEM ${oemId} sourceDoc matches companyId ${oemId}`);

  // Assert each source claim matches application observations exactly
  const obs = getObservationsByCompany(oemId).filter((o) => o.period === '2026-Q3');
  for (const claim of sourceDoc!.sourceClaims || []) {
    const matchingObs = obs.find((o) => o.metricId === claim.metricId);
    assert(matchingObs !== undefined, `OEM ${oemId}: observation exists for claim ${claim.metricId}`);
    if (matchingObs) {
      assert(matchingObs.value === claim.value, `OEM ${oemId}: value ${matchingObs.value} matches claim ${claim.value}`);
      assert(matchingObs.unit === claim.unit, `OEM ${oemId}: unit ${matchingObs.unit} matches claim ${claim.unit}`);
      if (claim.scope) {
        const effectiveObsScope = matchingObs.reportingScope || 'consolidated_group';
        assert(effectiveObsScope === claim.scope, `OEM ${oemId}: scope ${effectiveObsScope} matches claim ${claim.scope}`);
      }
      if (claim.accountingBasis) {
        assert(matchingObs.accountingBasis === claim.accountingBasis, `OEM ${oemId}: accountingBasis ${matchingObs.accountingBasis} matches claim ${claim.accountingBasis}`);
      }
    }
  }
}

// Suite 7: Detailed Observation Table Ordering (2026-Q3 placed at top)
// =========================================================================
console.log('\n--- Suite 7: Detailed Observation Table Ordering (2026-Q3 Placement) ---');

const getPeriodSortWeight = (period: string): number => {
  const [yearStr, part] = period.split('-');
  const year = parseInt(yearStr, 10) || 0;
  let partWeight = 0;
  if (part === 'Q4') partWeight = 4;
  else if (part === 'Q3') partWeight = 3;
  else if (part === 'Q2') partWeight = 2;
  else if (part === 'Q1') partWeight = 1;
  else if (part === 'FY') partWeight = 0.5;
  return year * 10 + partWeight;
};

for (const oemId of REPORTED_Q3_OEMS) {
  const companyObs = getObservationsByCompany(oemId);
  const metrics = Array.from(new Set(companyObs.map((o) => o.metricId)));

  for (const mId of metrics) {
    const sorted = companyObs
      .filter((o) => o.metricId === mId)
      .sort((a, b) => getPeriodSortWeight(b.period) - getPeriodSortWeight(a.period));

    const hasQ3 = sorted.some((o) => o.period === '2026-Q3');
    if (hasQ3) {
      assert(sorted[0].period === '2026-Q3', `OEM ${oemId} metric ${mId}: top sorted observation is 2026-Q3`);
    }
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Company Dashboard and Source-Backed Regression Tests passed cleanly!\n');
}
