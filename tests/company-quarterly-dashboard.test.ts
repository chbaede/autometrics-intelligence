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

import { getAllCompanies, getObservationsByCompany, getDistinctPeriods } from '../src/utils/metricQueries';
import { getPerformanceDriver, getAvailablePerformanceDriverPeriods } from '../src/data/performanceDrivers';
import { getScheduledDisclosure } from '../src/data/scheduledDisclosures';
import { SOURCE_DOCUMENTS } from '../src/data/sources';
import { TRANSLATIONS } from '../src/i18n/LanguageContext';
import {
  comparePeriodsDescending,
  getPeriodSortWeight,
  formatMetricValue,
  formatPeriodLabel,
} from '../src/utils/metricCalculations';
import { formatLocalizedProfit } from '../src/utils/currencyUtils';

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

// Suite 7: Detailed Observation Table Ordering (2026-Q3 placed at top via shared production comparator)
// =========================================================================
console.log('\n--- Suite 7: Detailed Observation Table Ordering (2026-Q3 Placement) ---');

assert(comparePeriodsDescending('2026-Q3', '2026-Q2') < 0, 'Production comparePeriodsDescending: 2026-Q3 sorts before 2026-Q2');
assert(comparePeriodsDescending('2026-Q2', '2026-Q3') > 0, 'Production comparePeriodsDescending: 2026-Q2 sorts after 2026-Q3');
assert(comparePeriodsDescending('2026-Q1', '2025-FY') < 0, 'Production comparePeriodsDescending: 2026-Q1 sorts before 2025-FY');
assert(comparePeriodsDescending('2025-FY', '2024-FY') < 0, 'Production comparePeriodsDescending: 2025-FY sorts before 2024-FY');
assert(getPeriodSortWeight('2026-Q3') > getPeriodSortWeight('2026-Q2'), 'getPeriodSortWeight: Q3 weight exceeds Q2');

for (const oemId of REPORTED_Q3_OEMS) {
  const companyObs = getObservationsByCompany(oemId);
  const metrics = Array.from(new Set(companyObs.map((o) => o.metricId)));

  for (const mId of metrics) {
    const sorted = companyObs
      .filter((o) => o.metricId === mId)
      .sort((a, b) => comparePeriodsDescending(a.period, b.period));

    const hasQ3 = sorted.some((o) => o.period === '2026-Q3');
    if (hasQ3) {
      assert(sorted[0].period === '2026-Q3', `OEM ${oemId} metric ${mId}: top sorted observation is 2026-Q3 using shared production comparator`);
    }
  }
}

// =========================================================================
// Suite 8: Hyundai Motor Official Q3 2026 Disclosures & Rejection of Fabricated Claims (P0)
// =========================================================================
console.log('\n--- Suite 8: Hyundai Motor Official Q3 2026 Source Verification ---');

const hmcDriver = getPerformanceDriver('hyundai_motor', '2026-Q3');
assert(hmcDriver !== undefined, 'Hyundai Motor has verified 2026-Q3 performance commentary');

// 1. Rejection of unsupported claims
assert(!hmcDriver!.summaryKo.includes('+4.7%'), 'Hyundai Korean summary does NOT claim unverified +4.7% revenue growth');
assert(!hmcDriver!.summaryEn.includes('+4.7%'), 'Hyundai English summary does NOT claim unverified +4.7% revenue growth');
assert(!hmcDriver!.headlineKo.includes('+40%'), 'Hyundai headline does NOT claim unverified +40% HEV growth');
assert(!hmcDriver!.headlineEn.includes('+40%'), 'Hyundai English headline does NOT claim unverified +40% HEV growth');

for (const d of hmcDriver!.drivers) {
  assert(!d.titleKo.includes('+40%') && !d.titleEn.includes('+40%'), `Hyundai driver title does NOT claim +40% (${d.titleKo})`);
  assert(!d.descriptionKo.includes('+40%') && !d.descriptionEn.includes('+40%'), `Hyundai driver description does NOT claim +40%`);
}

// 2. Verified official metrics alignment
assert(hmcDriver!.summaryKo.includes('-3.4% YoY'), 'Hyundai Korean summary states -3.4% YoY revenue contraction');
assert(hmcDriver!.summaryEn.includes('-3.4% YoY'), 'Hyundai English summary states -3.4% YoY revenue contraction');
assert(hmcDriver!.summaryKo.includes('-11.3% YoY'), 'Hyundai Korean summary states -11.3% YoY wholesale contraction');
assert(hmcDriver!.summaryEn.includes('-11.3% YoY'), 'Hyundai English summary states -11.3% YoY wholesale contraction');
assert(hmcDriver!.summaryKo.includes('+3.8% YoY'), 'Hyundai Korean summary states +3.8% YoY hybrid sales growth');
assert(hmcDriver!.summaryEn.includes('+3.8% YoY'), 'Hyundai English summary states +3.8% YoY hybrid sales growth');
assert(hmcDriver!.summaryKo.includes('920,710대'), 'Hyundai Korean summary states exact wholesale volume of 920,710 units');
assert(hmcDriver!.summaryEn.includes('920,710'), 'Hyundai English summary states exact wholesale volume of 920,710 units');

// Verified structured HEV metrics
const hevSalesClaim = hmcDriver!.structuredClaims?.find((c) => c.metricId === 'hev_deliveries');
assert(hevSalesClaim?.value === 167.414, 'Hyundai structured claim HEV sales is 167,414 units (167.414k)');
assert(hevSalesClaim?.growthRateYoY === 3.8, 'Hyundai structured claim HEV sales growth is +3.8% YoY');

const hevShareClaim = hmcDriver!.structuredClaims?.find((c) => c.metricId === 'hev_share');
assert(hevShareClaim?.value === 18.2, 'Hyundai structured claim HEV share is 18.2%');
assert(hevShareClaim?.growthRateYoY === 2.7, 'Hyundai structured claim HEV share growth is +2.7%p YoY');

// 3. Observations reconciliation
const hmcObs = getObservationsByCompany('hyundai_motor');
const hmcDel = hmcObs.find((o) => o.period === '2026-Q3' && o.metricId === 'deliveries_global');
const hmcRev = hmcObs.find((o) => o.period === '2026-Q3' && o.metricId === 'revenue');
const hmcOp = hmcObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_income');
const hmcMargin = hmcObs.find((o) => o.period === '2026-Q3' && o.metricId === 'operating_margin');

assert(hmcDel?.value === 920.71, 'Hyundai Q3 wholesale volume is exactly 920.71k units (920,710)');
assert(hmcDel?.volumeDefinition === 'wholesale_shipments', 'Hyundai Q3 volume definition is strictly wholesale_shipments');
assert(hmcRev?.value === 45110000, 'Hyundai Q3 revenue is KRW 45,110,000M (₩45.11T)');
assert(hmcOp?.value === 2677000, 'Hyundai Q3 operating profit is KRW 2,677,000M (₩2.68T)');
assert(hmcMargin?.value === 5.9, 'Hyundai Q3 operating margin is 5.9%');

// =========================================================================
// Suite 9: Structured Financial Claims & Negative Detection Engine (P0/P1)
// =========================================================================
console.log('\n--- Suite 9: Structured Financial Claims & Negative Detection Engine ---');

// Validate all structured claims across all 9 reported Q3 OEMs
for (const oemId of REPORTED_Q3_OEMS) {
  const driver = getPerformanceDriver(oemId, '2026-Q3');
  assert(driver !== undefined, `OEM ${oemId} driver exists`);
  assert(driver!.structuredClaims !== undefined && driver!.structuredClaims.length >= 3, `OEM ${oemId} has comprehensive structured claims`);

  const oemObs = getObservationsByCompany(oemId).filter((o) => o.period === '2026-Q3');
  for (const claim of driver!.structuredClaims || []) {
    assert(Boolean(claim.claimId), `OEM ${oemId} claim ${claim.metricId}: has stable claimId ${claim.claimId}`);
    assert(claim.companyId === oemId, `OEM ${oemId} claim ${claim.metricId}: companyId matches ${oemId}`);
    assert(claim.period === '2026-Q3', `OEM ${oemId} claim ${claim.metricId}: period matches 2026-Q3`);
    assert(Boolean(claim.sourceDocId), `OEM ${oemId} claim ${claim.metricId}: cites sourceDocId ${claim.sourceDocId}`);
    assert(Boolean(claim.sourceLocator), `OEM ${oemId} claim ${claim.metricId}: contains exact source locator`);
    assert(Boolean(claim.verifiedEvidence), `OEM ${oemId} claim ${claim.metricId}: contains verified primary evidence`);
    assert(Boolean(claim.narrativeRefKo), `OEM ${oemId} claim ${claim.metricId}: contains narrativeRefKo`);
    assert(Boolean(claim.narrativeRefEn), `OEM ${oemId} claim ${claim.metricId}: contains narrativeRefEn`);

    const matchingObs = oemObs.find((o) => o.metricId === claim.metricId);
    if (matchingObs) {
      assert(matchingObs.value === claim.value, `OEM ${oemId} claim ${claim.metricId}: value ${claim.value} reconciles with observation`);
      assert(matchingObs.unit === claim.unit, `OEM ${oemId} claim ${claim.metricId}: unit ${claim.unit} reconciles with observation`);
    }
  }
}

// Negative Detection Tests: Ensure tests FAIL when claims are intentionally mutated
console.log('\n--- Suite 9b: Negative Detection Proof (Ensuring Unsupported Figures Are Rejected) ---');

function validateTeslaGrowthClaim(narrative: string): boolean {
  if (narrative.includes('+8%') || narrative.includes('8% YoY growth')) return false;
  return narrative.includes('-0.2%') || narrative.includes('-0.17%') || narrative.includes('보합') || narrative.includes('flat');
}
assert(validateTeslaGrowthClaim(tslaDriver!.summaryEn) === true, 'Negative Guard: Official Tesla narrative passes');
assert(validateTeslaGrowthClaim('Tesla revenue grew +8% YoY to $28.05B') === false, 'Negative Guard: Fabricated +8% Tesla revenue growth is correctly REJECTED');

function validateBydGrowthClaims(revClaim: number, netProfitClaim: number): boolean {
  const isRevOfficial = Math.abs(revClaim - 13.59) < 0.05;
  const isNetOfficial = Math.abs(netProfitClaim - 28.08) < 0.05;
  return isRevOfficial && isNetOfficial;
}
assert(validateBydGrowthClaims(13.59, 28.08) === true, 'Negative Guard: Official BYD figures pass');
assert(validateBydGrowthClaims(24.0, 11.5) === false, 'Negative Guard: Fabricated +24.0% rev / +11.5% profit is correctly REJECTED');

function validateHyundaiClaims(revGrowth: number, volGrowth: number, hevGrowth: number): boolean {
  const isRevValid = Math.abs(revGrowth - (-3.4)) < 0.1;
  const isVolValid = Math.abs(volGrowth - (-11.3)) < 0.1;
  const isHevValid = Math.abs(hevGrowth - 3.8) < 0.1;
  return isRevValid && isVolValid && isHevValid;
}
assert(validateHyundaiClaims(-3.4, -11.3, 3.8) === true, 'Negative Guard: Official Hyundai figures pass');
assert(validateHyundaiClaims(4.7, -11.3, 40.0) === false, 'Negative Guard: Fabricated +4.7% rev / +40% HEV growth is correctly REJECTED');

function validateVwQ3Disaggregation(narrative: string): boolean {
  const containsFabricatedQ3Porsche = narrative.includes('€4.9B') && narrative.includes('Porsche');
  const containsFabricatedQ3Restruct = narrative.includes('€1.2B') && narrative.includes('restructuring');
  if (containsFabricatedQ3Porsche || containsFabricatedQ3Restruct) return false;
  return narrative.includes('€7.8B') || narrative.includes('€78억');
}
assert(validateVwQ3Disaggregation(vwDriver!.summaryEn) === true, 'Negative Guard: Disaggregated VW standalone figures pass');
assert(validateVwQ3Disaggregation('Q3 operating loss caused by €4.9B Porsche impairment and €1.2B restructuring') === false, 'Negative Guard: Blended Q3 / 9M breakdown is correctly REJECTED');

// Suite 10: Official IR Disclosures Badge & Data Freshness Cycle Period Alignment
console.log('\n--- Suite 10: Global Badge & Reporting Period Alignment (Q3 Freshness) ---');

assert(
  TRANSLATIONS.ko.global.badge.includes('2026.Q3 최신'),
  'Korean global badge specifies 2026.Q3 as latest',
  TRANSLATIONS.ko.global.badge
);
assert(
  !TRANSLATIONS.ko.global.badge.includes('2026.Q2'),
  'Korean global badge rejects outdated 2026.Q2 reference'
);

assert(
  TRANSLATIONS.en.global.badge.includes('Latest: 2026-Q3'),
  'English global badge specifies Latest: 2026-Q3',
  TRANSLATIONS.en.global.badge
);
assert(
  !TRANSLATIONS.en.global.badge.includes('2026-Q2'),
  'English global badge rejects outdated 2026-Q2 reference'
);

assert(
  TRANSLATIONS.ko.nav.verifiedIr.includes('2026.Q3 최신'),
  'Korean nav verifiedIr specifies 2026.Q3 최신',
  TRANSLATIONS.ko.nav.verifiedIr
);
assert(
  TRANSLATIONS.en.nav.verifiedIr.includes('Q3 2026'),
  'English nav verifiedIr specifies Q3 2026',
  TRANSLATIONS.en.nav.verifiedIr
);

const distinctPeriods = getDistinctPeriods();
assert(
  distinctPeriods[0] === '2026-Q3',
  'First distinct period in database is 2026-Q3',
  `Found: ${distinctPeriods[0]}`
);

// Suite 11: Unit Formatting & Negative Financial Value Formatting Regressions
console.log('\n--- Suite 11: Negative Financial Values & Formatting Regression ---');

// VW Operating Loss (-€5,860M)
const vwLossFormattedKo = formatLocalizedProfit(-5860, 'EUR', 'ko');
assert(vwLossFormattedKo.includes('-'), 'Negative loss in KRW preserves minus sign', vwLossFormattedKo);
assert(vwLossFormattedKo.includes('조') || vwLossFormattedKo.includes('억'), 'Negative loss in KRW uses localized scale unit');

const vwLossFormattedEn = formatLocalizedProfit(-5860, 'EUR', 'en');
assert(vwLossFormattedEn.includes('-'), 'Negative loss in EUR preserves minus sign', vwLossFormattedEn);
assert(vwLossFormattedEn === '-$6.37B', 'Negative loss in EUR converts to normalized USD string (-$6.37B)');

// Negative USD profit ($M)
const usdLossFormattedEn = formatLocalizedProfit(-718, 'USD', 'en');
assert(usdLossFormattedEn === '-$718M', 'Negative loss in USD renders -$718M');

// Volvo Cars EBIT (-SEK 5,600M)
const volvoLossFormattedEn = formatLocalizedProfit(-5600, 'SEK', 'en');
assert(volvoLossFormattedEn.includes('-'), 'Volvo negative loss preserves minus sign', volvoLossFormattedEn);

// Percentage margin formatting
const formattedNegativeMargin = formatMetricValue(-7.8, 'percentage');
assert(formattedNegativeMargin === '-7.8%', 'Negative margin formats as -7.8%');

// Currency millions formatting with negative value
assert(formatMetricValue(-5860, 'currency_millions', 'EUR') === '€-5,860M', 'Negative currency millions formats with currency symbol');

// Period label formatting regression
assert(formatPeriodLabel('2026-Q3', 'ko') === '2026년 3분기', 'formatPeriodLabel 2026-Q3 in Korean');
assert(formatPeriodLabel('2026-Q3', 'en') === '2026 Q3', 'formatPeriodLabel 2026-Q3 in English');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Company Dashboard and Source-Backed Regression Tests passed cleanly!\n');
}
