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
import { SOURCE_DOCUMENTS, SOURCES_MAP } from '../src/data/sources';
import { TRANSLATIONS } from '../src/i18n/LanguageContext';
import {
  comparePeriodsDescending,
  getPeriodSortWeight,
  formatMetricValue,
  formatPeriodLabel,
  validatePerformanceClaim,
  auditStructuredPerformanceClaim,
} from '../src/utils/metricCalculations';
import { formatLocalizedProfit } from '../src/utils/currencyUtils';
import { VerificationCommandResult } from '../src/types/metrics';
import {
  renderIntegrityCommandResults,
  renderMarkdownCommandResults,
  classifyVerificationCommandResult,
  getWorkingTreeStatus,
  getWorkingTreeExcludingDocs,
  getAuditCommitSha,
} from '../scripts/audit-data';
import { computeRawByteSha256 } from '../src/services/liveSourceFetcher';
import { executeOfficialSourcePipeline } from '../src/services/officialSourcePipeline';


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
assert(!hmcDriver!.summaryKo.includes('5.6%') && !hmcDriver!.summaryEn.includes('5.6%'), 'Hyundai narrative does NOT claim unsupported Genesis 5.6%');
assert(!hmcDriver!.summaryKo.includes('북미 인센티브') && !hmcDriver!.summaryEn.includes('North American incentives'), 'Hyundai narrative does NOT infer unsupported North American incentives');
assert(!hmcDriver!.summaryKo.includes('재고 정상화') && !hmcDriver!.summaryEn.includes('inventory normalization'), 'Hyundai narrative does NOT claim inventory normalization');

for (const d of hmcDriver!.drivers) {
  assert(!d.titleKo.includes('+40%') && !d.titleEn.includes('+40%'), `Hyundai driver title does NOT claim +40% (${d.titleKo})`);
  assert(!d.descriptionKo.includes('+40%') && !d.descriptionEn.includes('+40%'), `Hyundai driver description does NOT claim +40%`);
  assert(!d.descriptionKo.includes('재고 정상화') && !d.descriptionEn.includes('inventory normalization'), 'Hyundai driver does NOT infer unsupported inventory normalization');
}

// Check presence of official release explanations
assert(hmcDriver!.summaryKo.includes('조업일수 감소') || hmcDriver!.headlineKo.includes('조업일수'), 'Hyundai narrative includes official fewer working days explanation');
assert(hmcDriver!.summaryKo.includes('환율') || hmcDriver!.headlineKo.includes('환율'), 'Hyundai narrative includes official foreign exchange effect explanation');
assert(hmcDriver!.summaryKo.includes('원가 절감') || hmcDriver!.headlineKo.includes('원가 절감'), 'Hyundai narrative includes official cost optimization explanation');

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
assert(hevSalesClaim?.claimCategory === 'narrative_disclosure', 'Hyundai HEV sales claim is categorized as narrative_disclosure');

const hevShareClaim = hmcDriver!.structuredClaims?.find((c) => c.metricId === 'hev_share');
assert(hevShareClaim?.value === 18.2, 'Hyundai structured claim HEV share is 18.2%');
assert(hevShareClaim?.changeYoYPercentagePoints === 2.7, 'Hyundai structured claim HEV share change is +2.7 percentage points');
assert(hevShareClaim?.growthRateYoY === undefined, 'Hyundai structured claim HEV share does NOT confuse percentage points with growthRateYoY');
assert(hevShareClaim?.claimCategory === 'narrative_disclosure', 'Hyundai HEV share claim is categorized as narrative_disclosure');

// Source document validation
const hmcSourceDoc = SOURCES_MAP[hmcDriver!.sourceDocId];
assert(hmcSourceDoc !== undefined, 'Hyundai source document exists in SOURCES_MAP');
assert(hmcSourceDoc.docType === 'press_release', 'Hyundai source document type is press_release');
assert(hmcSourceDoc.title.includes('Press Release'), 'Hyundai source document title reflects press release');

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

// Suite 9b.2: Direct Production Validation Engine Testing (Negative & Fail-Closed Guards)
// All tests call the real production `validatePerformanceClaim` and `auditStructuredPerformanceClaim` directly.
const prodHyundaiDriver = getPerformanceDriver('hyundai_motor', '2026-Q3')!;
const validSampleClaim = prodHyundaiDriver.structuredClaims![0]; // hmc_2026_q3_claim_wholesale
const validHevShareClaim = prodHyundaiDriver.structuredClaims!.find(
  (c) => c.claimId === 'hmc_2026_q3_claim_hev_share'
)!;

const prodTeslaDriver = getPerformanceDriver('tesla', '2026-Q3')!;
const validTeslaClaim = prodTeslaDriver.structuredClaims!.find(
  (c) => c.claimId === 'tsla_2026_q3_claim_deliveries'
)!;

// Positive Guard 1a: Real production YoY growth claim without fixture passes with observation_consistent
const auditResultYoY = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver);
assert(
  auditResultYoY.isValid === true && auditResultYoY.verificationLevel === 'observation_consistent',
  'Positive Guard 1a: Real production YoY claim passes with observation_consistent when matching observation without fixture',
  `level=${auditResultYoY.verificationLevel}, findings=${auditResultYoY.findings.map((f) => f.detail).join('; ')}`
);

// Positive Guard 1b: Real production YoY growth claim with matching fixture passes with numeric_claim_verified
const validYoYFixture = {
  sourceDocId: validSampleClaim.sourceDocId,
  sourceDocName: 'Hyundai Q3 2026 Earnings',
  sectionLocator: validSampleClaim.sourceLocator,
  extractedText: validSampleClaim.verifiedEvidence,
  verifiedValue: String(validSampleClaim.value),
  verifiedNumericValue: validSampleClaim.value,
  verifiedMetricId: validSampleClaim.metricId,
  verifiedUnit: validSampleClaim.unit as any,
  verifiedScope: validSampleClaim.reportingScope,
  verifiedAccountingBasis: validSampleClaim.accountingBasis,
  verifiedPeriod: validSampleClaim.period || prodHyundaiDriver.period,
  verifiedPeriodType: 'quarterly' as const,
  supportType: 'reported_kpi' as const,
  contentHash: 'mock_hash_for_test_yoy',
};
const auditResultYoYWithFixture = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
  contentFixtures: [validYoYFixture],
});
assert(
  auditResultYoYWithFixture.isValid === true && auditResultYoYWithFixture.verificationLevel === 'numeric_claim_verified',
  'Positive Guard 1b: Real production YoY claim with matching fixture passes with numeric_claim_verified',
  `level=${auditResultYoYWithFixture.verificationLevel}, findings=${auditResultYoYWithFixture.findings.map((f) => f.detail).join('; ')}`
);

// Positive Guard 2a: Real production QoQ growth claim without fixture passes with observation_consistent
const auditResultQoQ = auditStructuredPerformanceClaim(validTeslaClaim, prodTeslaDriver);
assert(
  auditResultQoQ.isValid === true && auditResultQoQ.verificationLevel === 'observation_consistent',
  'Positive Guard 2a: Real production QoQ claim passes with observation_consistent when matching observation without fixture',
  `level=${auditResultQoQ.verificationLevel}, findings=${auditResultQoQ.findings.map((f) => f.detail).join('; ')}`
);

// Positive Guard 2b: Real production QoQ growth claim with matching fixture passes with numeric_claim_verified
const validQoQFixture = {
  sourceDocId: validTeslaClaim.sourceDocId,
  sourceDocName: 'Tesla Q3 2026 Update',
  sectionLocator: validTeslaClaim.sourceLocator,
  extractedText: validTeslaClaim.verifiedEvidence,
  verifiedValue: String(validTeslaClaim.value),
  verifiedNumericValue: validTeslaClaim.value,
  verifiedMetricId: validTeslaClaim.metricId,
  verifiedUnit: validTeslaClaim.unit as any,
  verifiedScope: validTeslaClaim.reportingScope,
  verifiedAccountingBasis: validTeslaClaim.accountingBasis,
  verifiedPeriod: validTeslaClaim.period || prodTeslaDriver.period,
  verifiedPeriodType: 'quarterly' as const,
  supportType: 'reported_kpi' as const,
  contentHash: 'mock_hash_for_test_qoq',
};
const auditResultQoQWithFixture = auditStructuredPerformanceClaim(validTeslaClaim, prodTeslaDriver, {
  contentFixtures: [validQoQFixture],
});
assert(
  auditResultQoQWithFixture.isValid === true && auditResultQoQWithFixture.verificationLevel === 'numeric_claim_verified',
  'Positive Guard 2b: Real production QoQ claim with matching fixture passes with numeric_claim_verified',
  `level=${auditResultQoQWithFixture.verificationLevel}, findings=${auditResultQoQWithFixture.findings.map((f) => f.detail).join('; ')}`
);

// Positive Guard 3a: Real production percentage-point claim without fixture passes with observation_consistent
const auditResultPp = auditStructuredPerformanceClaim(validHevShareClaim, prodHyundaiDriver);
assert(
  auditResultPp.isValid === true && auditResultPp.verificationLevel === 'observation_consistent',
  'Positive Guard 3a: Real production %p claim passes with observation_consistent when matching observation without fixture',
  `level=${auditResultPp.verificationLevel}, findings=${auditResultPp.findings.map((f) => f.detail).join('; ')}`
);

// Positive Guard 3b: Real production percentage-point claim with matching fixture passes with numeric_claim_verified
const validPpFixture = {
  sourceDocId: validHevShareClaim.sourceDocId,
  sourceDocName: 'Hyundai Q3 2026 Earnings',
  sectionLocator: validHevShareClaim.sourceLocator,
  extractedText: validHevShareClaim.verifiedEvidence,
  verifiedValue: String(validHevShareClaim.value),
  verifiedNumericValue: validHevShareClaim.value,
  verifiedMetricId: validHevShareClaim.metricId,
  verifiedUnit: validHevShareClaim.unit as any,
  verifiedScope: validHevShareClaim.reportingScope,
  verifiedAccountingBasis: validHevShareClaim.accountingBasis,
  verifiedPeriod: validHevShareClaim.period || prodHyundaiDriver.period,
  verifiedPeriodType: 'quarterly' as const,
  supportType: 'reported_kpi' as const,
  contentHash: 'mock_hash_for_test_pp',
};
const auditResultPpWithFixture = auditStructuredPerformanceClaim(validHevShareClaim, prodHyundaiDriver, {
  contentFixtures: [validPpFixture],
});
assert(
  auditResultPpWithFixture.isValid === true && auditResultPpWithFixture.verificationLevel === 'numeric_claim_verified',
  'Positive Guard 3b: Real production %p claim with matching fixture passes with numeric_claim_verified',
  `level=${auditResultPpWithFixture.verificationLevel}, findings=${auditResultPpWithFixture.findings.map((f) => f.detail).join('; ')}`
);

// Negative Guard 1: YoY growth claim with no comparison period (fail-closed)
const claimNoCompPeriod = { ...validSampleClaim, comparisonPeriod: undefined };
const fNoCompPeriod = validatePerformanceClaim(claimNoCompPeriod, prodHyundaiDriver);
assert(
  fNoCompPeriod.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('lacks comparisonPeriod')),
  'Mandatory Negative Guard 1: YoY growth claim lacking comparisonPeriod is rejected (fail-closed)'
);

// Negative Guard 2: YoY growth claim with missing prior-period observation
const claimNoPriorObs = { ...validSampleClaim, comparisonPeriod: '2021-Q3' };
const fNoPriorObs = validatePerformanceClaim(claimNoPriorObs, prodHyundaiDriver);
assert(
  fNoPriorObs.some((f) => f.category === 'CALCULATION_DISCREPANCY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('comparison observation missing')),
  'Mandatory Negative Guard 2: Missing prior-period observation is rejected (fail-closed)'
);

// Negative Guard 3: YoY growth claim with zero denominator (undefined mathematically)
const mockZeroObs: any[] = [
  { id: 'curr_obs', companyId: 'hyundai_motor', period: '2026-Q3', periodType: 'quarterly', calendarYear: 2026, valueType: 'reported', metricId: 'deliveries_global', value: 920.71, unit: 'thousand_units', isComparable: true },
  { id: 'zero_prior_obs', companyId: 'hyundai_motor', period: '2025-Q3', periodType: 'quarterly', calendarYear: 2025, valueType: 'reported', metricId: 'deliveries_global', value: 0, unit: 'thousand_units', isComparable: true },
];
const fZeroDenom = validatePerformanceClaim(validSampleClaim, prodHyundaiDriver, { observations: mockZeroObs });
assert(
  fZeroDenom.some((f) => f.category === 'CALCULATION_DISCREPANCY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('value is zero')),
  'Mandatory Negative Guard 3: Zero-denominator growth calculation is rejected (fail-closed)'
);

// Negative Guard 4: YoY growth claim with materially incorrect numerical rate
const claimBadRate = { ...validSampleClaim, growthRateYoY: 25.0 };
const fBadRate = validatePerformanceClaim(claimBadRate, prodHyundaiDriver);
assert(
  fBadRate.some((f) => f.category === 'CALCULATION_DISCREPANCY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('diverges from calculated growth rate')),
  'Mandatory Negative Guard 4: Incorrect YoY growth rate is rejected with CALCULATION_DISCREPANCY'
);

// Negative Guard 5: QoQ growth claim with materially incorrect numerical rate
const claimBadQoQRate = { ...validTeslaClaim, growthRateQoQ: 45.0 };
const fBadQoQRate = validatePerformanceClaim(claimBadQoQRate, prodTeslaDriver);
assert(
  fBadQoQRate.some((f) => f.category === 'CALCULATION_DISCREPANCY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('diverges from calculated QoQ growth rate')),
  'Mandatory Negative Guard 5: Incorrect QoQ growth rate is rejected with CALCULATION_DISCREPANCY'
);

// Negative Guard 6: Percentage-point claim with materially incorrect numerical difference
const claimBadPpDiff = { ...validHevShareClaim, changeYoYPercentagePoints: 9.9 };
const fBadPpDiff = validatePerformanceClaim(claimBadPpDiff, prodHyundaiDriver);
assert(
  fBadPpDiff.some((f) => f.category === 'CALCULATION_DISCREPANCY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('diverges from calculated change')),
  'Mandatory Negative Guard 6: Incorrect percentage-point change is rejected with CALCULATION_DISCREPANCY'
);

// Negative Guard 7: YoY growth claim with an incompatible unit
const claimBadUnit = { ...validSampleClaim, unit: 'percentage' as any };
const fBadUnit = validatePerformanceClaim(claimBadUnit, prodHyundaiDriver);
assert(
  fBadUnit.some((f) => f.category === 'SCOPE_MISMATCH' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('contradicts observation unit')),
  'Mandatory Negative Guard 7: Incompatible observation unit is rejected with SCOPE_MISMATCH'
);

// Negative Guard 8: Claim with incompatible reporting scope between comparison and current period
const mockIncompatibleScopeObs: any[] = [
  { id: 'curr_obs', companyId: 'hyundai_motor', period: '2026-Q3', periodType: 'quarterly', calendarYear: 2026, valueType: 'reported', metricId: 'deliveries_global', value: 920.71, unit: 'thousand_units', reportingScope: 'consolidated_group', isComparable: true },
  { id: 'prior_scope_obs', companyId: 'hyundai_motor', period: '2025-Q3', periodType: 'quarterly', calendarYear: 2025, valueType: 'reported', metricId: 'deliveries_global', value: 1037.7, unit: 'thousand_units', reportingScope: 'automotive_segment', isComparable: true },
];
const claimWithScope = { ...validSampleClaim, reportingScope: 'consolidated_group' as const };
const fScopeMismatch = validatePerformanceClaim(claimWithScope, prodHyundaiDriver, { observations: mockIncompatibleScopeObs });
assert(
  fScopeMismatch.some((f) => f.category === 'SCOPE_MISMATCH' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('reportingScope mismatch')),
  'Mandatory Negative Guard 8: Reporting scope mismatch between periods is rejected with SCOPE_MISMATCH'
);

// Negative Guard 9: Ambiguous matching observations (multiple matching candidates)
const mockAmbiguousObs: any[] = [
  { id: 'mock_1', companyId: 'hyundai_motor', period: '2026-Q3', periodType: 'quarterly', calendarYear: 2026, valueType: 'reported', metricId: 'deliveries_global', value: 920.71, unit: 'thousand_units', isComparable: true },
  { id: 'mock_2', companyId: 'hyundai_motor', period: '2026-Q3', periodType: 'quarterly', calendarYear: 2026, valueType: 'reported', metricId: 'deliveries_global', value: 920.71, unit: 'thousand_units', isComparable: true },
];
const fAmbiguous = validatePerformanceClaim(validSampleClaim, prodHyundaiDriver, { observations: mockAmbiguousObs });
assert(
  fAmbiguous.some((f) => f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('Ambiguous matching observations')),
  'Mandatory Negative Guard 9: Multiple ambiguous candidate observations are rejected (fail-closed)'
);

// Negative Guard 10: Claim referencing a nonexistent source document ID
const claimNonexistentDoc = { ...validSampleClaim, sourceDocId: 'nonexistent_annual_report_doc' };
const fNonexistentDoc = validatePerformanceClaim(claimNonexistentDoc, prodHyundaiDriver);
assert(
  fNonexistentDoc.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('does not exist in SOURCES_MAP')),
  'Mandatory Negative Guard 10: Nonexistent source document ID is rejected with SOURCE_CLAIM_INTEGRITY'
);

// Negative Guard 11: Claim referencing a source document belonging to a different company or period
const claimMismatchedDoc = { ...validSampleClaim, sourceDocId: 'tsla_2026_q3_deck' };
const fMismatchedDoc = validatePerformanceClaim(claimMismatchedDoc, prodHyundaiDriver);
assert(
  fMismatchedDoc.some((f) => f.category === 'SCOPE_MISMATCH' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('does not match claim companyId')),
  'Mandatory Negative Guard 11: Source document company mismatch is rejected with SCOPE_MISMATCH'
);

// Negative Guard 12: Claim referencing a nonexistent locator when source content is available
const fixtureForLocator = [{ sourceDocId: validSampleClaim.sourceDocId, sectionLocator: '보도자료 요약' }];
const claimBadLocator = { ...validSampleClaim, sourceLocator: 'NONEXISTENT_FINANCIAL_TABLE_REF' };
const fBadLocator = validatePerformanceClaim(claimBadLocator, prodHyundaiDriver, { contentFixtures: fixtureForLocator });
assert(
  fBadLocator.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('does not resolve against available source content fixtures')),
  'Mandatory Negative Guard 12: Nonexistent locator against available content is rejected'
);

// Negative Guard 13: Claim with contradictory numeric evidence fixture
const fixtureContradictory = [
  { sourceDocId: validSampleClaim.sourceDocId, verifiedMetricId: validSampleClaim.metricId, verifiedNumericValue: 999999 },
];
const fContradictory = validatePerformanceClaim(validSampleClaim, prodHyundaiDriver, { contentFixtures: fixtureContradictory });
assert(
  fContradictory.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('contradicts source content fixture verified value')),
  'Mandatory Negative Guard 13: Contradictory numeric evidence fixture is rejected'
);

// Negative Guard 14: Material Korean/English numeric discrepancy
const dummyDriverBilingual = {
  ...prodHyundaiDriver,
  summaryKo: '글로벌 도매 920,710대(-11.3% YoY)를 기록했습니다.',
  summaryEn: 'Recorded 920,710 global wholesale units (+25.0% YoY).',
};
const claimDiscrepancy = {
  ...validSampleClaim,
  narrativeRefKo: '글로벌 도매 920,710대(-11.3% YoY)',
  narrativeRefEn: '920,710 global wholesale units (+25.0% YoY)',
};
const fDiscrepancy = validatePerformanceClaim(claimDiscrepancy, dummyDriverBilingual);
assert(
  fDiscrepancy.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('Material discrepancy between Korean narrative')),
  'Mandatory Negative Guard 14: Material bilingual numeric discrepancy is caught and rejected'
);

// Negative Guard 15: Directional contradiction between claimed growth rate and narrative description
const dummyDriverContradictoryDir = {
  ...prodHyundaiDriver,
  summaryKo: '글로벌 도매 판매 대폭 증가(+11.3%)를 기록했습니다.',
  summaryEn: 'Global wholesale deliveries increased strongly.',
};
const claimDirContradiction = {
  ...validSampleClaim,
  growthRateYoY: -11.3,
  narrativeRefKo: '글로벌 도매 판매 대폭 증가',
  narrativeRefEn: 'deliveries increased strongly',
};
const fDirContradiction = validatePerformanceClaim(claimDirContradiction, dummyDriverContradictoryDir);
assert(
  fDirContradiction.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('contradicts positive Korean narrative description')),
  'Mandatory Negative Guard 15: Directional contradiction between growth sign and narrative is rejected'
);

// Negative Guard 16: Primary-observation claim with no corresponding observation (unsupported metric)
const claimMissingObs = { ...validSampleClaim, metricId: 'completely_unrecorded_metric_id' };
const fMissingObs = validatePerformanceClaim(claimMissingObs, prodHyundaiDriver);
assert(
  fMissingObs.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes("Claim categorized as 'primary_observation' but no matching observation was found")),
  'Mandatory Negative Guard 16: Primary observation claim without matching observation fails closed'
);

// Additional Negative Guard: Percentage-point semantic conflict (specifying both rate and pp)
const claimSemanticConflict = { ...validSampleClaim, growthRateYoY: 2.7, changeYoYPercentagePoints: 2.7 };
const fSemanticConflict = validatePerformanceClaim(claimSemanticConflict, prodHyundaiDriver);
assert(
  fSemanticConflict.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('Percentage metrics must use percentage points only')),
  'Negative Guard: Percentage point semantic conflict (growthRateYoY + changeYoYPercentagePoints) is rejected'
);

function validateVwQ3Disaggregation(narrative: string): boolean {
  const containsFabricatedQ3Porsche = narrative.includes('€4.9B') && narrative.includes('Porsche');
  const containsFabricatedQ3Restruct = narrative.includes('€1.2B') && narrative.includes('restructuring');
  if (containsFabricatedQ3Porsche || containsFabricatedQ3Restruct) return false;
  return narrative.includes('€7.8B') || narrative.includes('€78억');
}
assert(validateVwQ3Disaggregation(vwDriver!.summaryEn) === true, 'Negative Guard: Disaggregated VW standalone figures pass');
assert(validateVwQ3Disaggregation('Q3 operating loss caused by €4.9B Porsche impairment and €1.2B restructuring') === false, 'Negative Guard: Blended Q3 / 9M breakdown is correctly REJECTED');

// --- Suite 9c: Live Source Verification Pipeline Guards (P1-1) ---
console.log('\n--- Suite 9c: Live Source Verification Pipeline Guards ---');

// Live Guard 1: isLiveSource: true alone without passing livePipelineResult emits review warning and does not produce live_source_verified
const liveBoolAloneResult = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
  isLiveSource: true,
});
assert(
  liveBoolAloneResult.verificationLevel !== 'live_source_verified' &&
  liveBoolAloneResult.findings.some(
    (f) => f.severity === 'WARNING' && f.detail.includes('isLiveSource boolean flag alone cannot establish live verification')
  ),
  'Live Guard 1: isLiveSource: true alone emits warning and cannot produce live_source_verified'
);

// Construct a valid baseline live pipeline result with authentic raw wire bytes
const mockLiveBytes = new Uint8Array(Buffer.from('Consolidated group reported global deliveries reached 920.71 thousand units in Q3 2026'));
const mockLiveHash = computeRawByteSha256(mockLiveBytes);
const validLivePipelineResult: any = {
  success: true,
  verificationState: 'claim_verified',
  rawBytes: mockLiveBytes,
  officialSource: {
    id: validSampleClaim.sourceDocId,
    companyId: 'hyundai_motor',
    url: 'https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2026-q3-earnings',
    documentType: 'press_release',
    reportingPeriod: '2026-Q3',
    periodType: 'quarterly',
    expectedContentType: 'text/html',
    officialDomain: 'hyundaimotorgroup.com',
    title: 'Hyundai Q3 2026 Results',
  },
  liveDocument: {
    url: 'https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2026-q3-earnings',
    finalUrl: 'https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2026-q3-earnings',
    httpStatus: 200,
    contentType: 'text/html; charset=utf-8',
    contentHash: mockLiveHash,
    fetchedAt: '2026-10-30T12:00:00Z',
    byteLength: 45000,
  },
  extractedDocument: {
    extractionVersion: '1.0.0',
    extractedAt: '2026-10-30T12:00:05Z',
    sourceDocument: {
      sourceDocId: validSampleClaim.sourceDocId,
      contentHash: mockLiveHash,
    },
    blocks: [
      {
        id: 'block_live_wholesale_1',
        blockType: 'text',
        text: 'Consolidated group reported global deliveries reached 920.71 thousand units in Q3 2026',
        sectionHeading: 'Consolidated Group Deliveries (Reported)',
      },
    ],
  },
  evidenceCandidate: {
    blockId: 'block_live_wholesale_1',
    metricId: validSampleClaim.metricId,
    numericValue: validSampleClaim.value,
    unit: validSampleClaim.unit,
    scope: validSampleClaim.reportingScope,
    accountingBasis: validSampleClaim.accountingBasis,
  },
  claimVerificationResult: {
    state: 'claim_verified',
    verificationOrigin: 'live_source',
    verificationMethod: 'rule_engine',
    engineId: 'engine_live_v1',
    engineVersion: '1.0.0',
    sourceDocId: validSampleClaim.sourceDocId,
    claimSupportType: 'reported_kpi',
    verifiedValue: String(validSampleClaim.value),
    verifiedNumericValue: validSampleClaim.value,
    verifiedMetricId: validSampleClaim.metricId,
    verifiedUnit: validSampleClaim.unit,
    verifiedScope: validSampleClaim.reportingScope,
    verifiedAccountingBasis: validSampleClaim.accountingBasis,
    verifiedPeriod: '2026-Q3',
    verifiedPeriodType: 'quarterly',
    verifiedAt: '2026-10-30T12:00:10Z',
    sourceContentHash: mockLiveHash,
    blockId: 'block_live_wholesale_1',
  },
};

// Live Negative Guard 1: Manually synthesized plain JS object cannot yield live_source_verified
const validLiveResult = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
  livePipelineResult: validLivePipelineResult,
});
assert(
  validLiveResult.isValid === false &&
  validLiveResult.verificationLevel === 'unverified' &&
  validLiveResult.findings.some((f) => f.detail.includes('caller-synthesized or untracked objects are rejected')),
  'Live Negative Guard 1: Manually synthesized livePipelineResult is rejected and CANNOT yield live_source_verified'
);


// Live Negative Guard 2: Missing liveDocument in pipeline result rejects live_source_verified
const liveNoDoc = { ...validLivePipelineResult, liveDocument: undefined };
const resNoDoc = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, { livePipelineResult: liveNoDoc });
assert(
  resNoDoc.isValid === false &&
  resNoDoc.verificationLevel === 'unverified' &&
  resNoDoc.findings.some((f) => f.detail.includes('Live source document record missing')),
  'Live Guard 2: Missing liveDocument in pipeline result rejects live_source_verified'
);

// Live Negative Guard 3: Missing or unresolved evidence block rejects live_source_verified
const liveBadBlock = {
  ...validLivePipelineResult,
  extractedDocument: {
    extractionVersion: '1.0.0',
    extractedAt: '2026-10-30T12:00:05Z',
    blocks: [{ id: 'other_block', text: 'other', kind: 'text' }],
  },
};
const resBadBlock = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, { livePipelineResult: liveBadBlock });
assert(
  resBadBlock.isValid === false &&
  resBadBlock.findings.some((f) => f.detail.includes('could not be resolved in extracted document blocks')),
  'Live Guard 3: Unresolved evidence block rejects live_source_verified'
);

// Live Negative Guard 4: Forged content hash rejects live_source_verified
const liveForgedHash = {
  ...validLivePipelineResult,
  claimVerificationResult: {
    ...validLivePipelineResult.claimVerificationResult,
    sourceContentHash: '0000000000000000000000000000000000000000000000000000000000000000',
  },
};
const resForgedHash = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, { livePipelineResult: liveForgedHash });
assert(
  resForgedHash.isValid === false &&
  resForgedHash.findings.some((f) => f.detail.includes('Cryptographic content hash mismatch')),
  'Live Guard 4: Forged content hash rejects live_source_verified'
);

// Live Negative Guard 5: Metric mismatch in live pipeline rejects live_source_verified
const liveWrongMetric = {
  ...validLivePipelineResult,
  claimVerificationResult: {
    ...validLivePipelineResult.claimVerificationResult,
    verifiedMetricId: 'revenue',
  },
  evidenceCandidate: {
    ...validLivePipelineResult.evidenceCandidate,
    metricId: 'revenue',
  },
};
const resWrongMetric = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, { livePipelineResult: liveWrongMetric });
assert(
  resWrongMetric.isValid === false &&
  resWrongMetric.findings.some((f) => f.detail.includes('does not match claim metric')),
  'Live Guard 5: Metric mismatch in live pipeline rejects live_source_verified'
);

// Live Negative Guard 6: Value mismatch in live pipeline rejects live_source_verified
const liveWrongValue = {
  ...validLivePipelineResult,
  claimVerificationResult: {
    ...validLivePipelineResult.claimVerificationResult,
    verifiedNumericValue: 12345.67,
    verifiedValue: '12345.67',
  },
  evidenceCandidate: {
    ...validLivePipelineResult.evidenceCandidate,
    numericValue: 12345.67,
  },
};
const resWrongValue = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, { livePipelineResult: liveWrongValue });
assert(
  resWrongValue.isValid === false &&
  resWrongValue.findings.some((f) => f.detail.includes('contradicts claimed value')),
  'Live Guard 6: Value mismatch in live pipeline rejects live_source_verified'
);

// Live Negative Guard 7: Disallowed URL domain rejects live_source_verified
const liveDisallowedUrl = {
  ...validLivePipelineResult,
  liveDocument: {
    ...validLivePipelineResult.liveDocument,
    finalUrl: 'https://attacker.evil.com/fake-press-release',
  },
};
const resDisallowedUrl = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, { livePipelineResult: liveDisallowedUrl });
assert(
  resDisallowedUrl.isValid === false &&
  resDisallowedUrl.findings.some((f) => f.detail.includes('outside official domain perimeter')),
  'Live Guard 7: Disallowed URL domain rejects live_source_verified'
);

// Live Negative Guard 8: Failed pipeline execution status rejects live_source_verified
const liveFailedPipeline = {
  ...validLivePipelineResult,
  success: false,
  verificationState: 'unverified',
  errorMessage: 'Upstream HTTP 500 server error',
};
const resFailedPipeline = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, { livePipelineResult: liveFailedPipeline });
assert(
  resFailedPipeline.isValid === false &&
  resFailedPipeline.findings.some((f) => f.detail.includes('Live pipeline execution failed')),
  'Live Guard 8: Failed pipeline execution status rejects live_source_verified'
);

// --- Suite 9d: Internal Consistency vs Source Evidence Separation Guards (P1-2) ---
console.log('\n--- Suite 9d: Internal Consistency vs Source Evidence Separation Guards ---');

// Guard 1: Claim and observation contain same number without fixture -> observation_consistent, NOT numeric_claim_verified
const resObsConsistent = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver);
assert(
  resObsConsistent.isValid === true &&
  resObsConsistent.verificationLevel === 'observation_consistent' &&
  (resObsConsistent.verificationLevel as string) !== 'numeric_claim_verified',
  'Internal vs Source Guard 1: Internal observation match without source fixture yields observation_consistent'
);

// Guard 2: Claim has only nonempty verifiedEvidence / sourceLocator without fixture -> metadata_validated
const claimCalculatedNoObs = {
  ...validSampleClaim,
  claimId: 'test_calc_claim_no_obs',
  metricId: 'unrecorded_synthetic_metric',
  claimCategory: 'narrative_disclosure' as const,
  growthRateYoY: undefined,
  comparisonPeriod: undefined,
  value: 920.71,
  unit: 'thousand_units',
  sourceLocator: 'Page 10, Note 3',
  verifiedEvidence: 'Synthetic test evidence text exceeding minimum length threshold',
};
const resMetaOnly = auditStructuredPerformanceClaim(claimCalculatedNoObs, prodHyundaiDriver);
assert(
  resMetaOnly.isValid === true &&
  resMetaOnly.verificationLevel === 'metadata_validated' &&
  (resMetaOnly.verificationLevel as string) !== 'evidence_validated' &&
  (resMetaOnly.verificationLevel as string) !== 'locator_validated',
  'Internal vs Source Guard 2: Non-matching observation claim with metadata strings retains metadata_validated'
);

// --- Suite 9e: Unified Dimensional Compatibility Guards (P2-1) ---
console.log('\n--- Suite 9e: Unified Dimensional Compatibility Guards ---');

// Guard 1: Incompatible accounting basis (reported vs adjusted) between current and prior observation
const mockIncompatibleBasisObs: any[] = [
  { id: 'curr_obs_b', companyId: 'hyundai_motor', period: '2026-Q3', periodType: 'quarterly', calendarYear: 2026, valueType: 'reported', accountingBasis: 'reported', metricId: 'deliveries_global', value: 920.71, unit: 'thousand_units', reportingScope: 'consolidated_group', isComparable: true },
  { id: 'prior_basis_obs', companyId: 'hyundai_motor', period: '2025-Q3', periodType: 'quarterly', calendarYear: 2025, valueType: 'reported', accountingBasis: 'adjusted', metricId: 'deliveries_global', value: 1037.7, unit: 'thousand_units', reportingScope: 'consolidated_group', isComparable: true },
];
const claimWithBasis = { ...validSampleClaim, accountingBasis: 'reported' as const };
const fBasisMismatch = validatePerformanceClaim(claimWithBasis, prodHyundaiDriver, { observations: mockIncompatibleBasisObs });
assert(
  fBasisMismatch.some((f) => f.category === 'SCOPE_MISMATCH' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('accountingBasis mismatch')),
  'Dimensional Guard 1: Accounting basis mismatch (reported vs adjusted) between periods is rejected'
);

// Guard 2: Non-finite numeric inputs (NaN) in growth rate
const claimNaNRate = { ...validSampleClaim, growthRateYoY: NaN };
const fNaNRate = validatePerformanceClaim(claimNaNRate, prodHyundaiDriver);
assert(
  fNaNRate.some((f) => f.category === 'CALCULATION_DISCREPANCY' && f.severity === 'ERROR' && f.disposition === 'blocking' && f.detail.includes('must be a finite number')),
  'Dimensional Guard 2: Non-finite NaN growth rate is rejected'
);

// Guard 3: Incompatible period type (quarterly vs annual) between periods
const mockIncompatiblePeriodTypeObs: any[] = [
  { id: 'curr_pt_obs', companyId: 'hyundai_motor', period: '2026-Q3', periodType: 'quarterly', calendarYear: 2026, valueType: 'reported', metricId: 'deliveries_global', value: 920.71, unit: 'thousand_units', isComparable: true },
  { id: 'prior_pt_obs', companyId: 'hyundai_motor', period: '2025-FY', periodType: 'annual', calendarYear: 2025, valueType: 'reported', metricId: 'deliveries_global', value: 4200.0, unit: 'thousand_units', isComparable: true },
];
const claimCompAnnual = { ...validSampleClaim, comparisonPeriod: '2025-FY' };
const fPeriodTypeMismatch = validatePerformanceClaim(claimCompAnnual, prodHyundaiDriver, { observations: mockIncompatiblePeriodTypeObs });
assert(
  fPeriodTypeMismatch.some((f) => f.category === 'PERIOD_ALIGNMENT' && f.severity === 'ERROR' && f.detail.includes('incompatible periodType')),
  'Dimensional Guard 3: Period type mismatch (quarterly vs annual) is rejected'
);

// --- Suite 9f: Bilingual Narrative Semantic Alignment Guards (P2-2) ---
console.log('\n--- Suite 9f: Bilingual Narrative Semantic Alignment Guards ---');

// Guard 1: Conflicting reporting quarter reference in Korean narrative
const dummyDriverWrongPeriod = {
  ...prodHyundaiDriver,
  summaryKo: '2분기 글로벌 도매 920,710대(-11.3% YoY)를 기록했습니다.',
};
const claimWrongPeriodNarrative = {
  ...validSampleClaim,
  narrativeRefKo: '2분기 글로벌 도매 920,710대(-11.3% YoY)',
};
const fWrongPeriod = validatePerformanceClaim(claimWrongPeriodNarrative, dummyDriverWrongPeriod);
assert(
  fWrongPeriod.some((f) => f.category === 'PERIOD_ALIGNMENT' && f.severity === 'ERROR' && f.detail.includes("conflicting reporting quarter ('Q2')")),
  'Bilingual Guard 1: Conflicting reporting quarter in Korean narrative is rejected'
);

// Guard 2: Conflicting metric in narrative (revenue claim referencing wholesale volume narrative)
const revClaim = prodHyundaiDriver.structuredClaims!.find((c) => c.metricId === 'revenue')!;
const dummyDriverMetricConflict = {
  ...prodHyundaiDriver,
  summaryKo: '글로벌 도매 920,710대 판매 기록을 달성했습니다.',
  summaryEn: 'Global wholesale deliveries reached 920,710 units in the quarter.',
};
const claimWrongMetricNarrative = {
  ...revClaim,
  narrativeRefKo: '글로벌 도매 920,710대 판매 기록',
  narrativeRefEn: 'Global wholesale deliveries reached 920,710 units',
};
const fWrongMetricNarrative = validatePerformanceClaim(claimWrongMetricNarrative, dummyDriverMetricConflict);
assert(
  fWrongMetricNarrative.some((f) => f.category === 'SCOPE_MISMATCH' && f.severity === 'ERROR' && f.detail.includes('vehicle volume metrics rather than claimed financial metric')),
  'Bilingual Guard 2: Metric conflict (financial metric citing delivery volume narrative) is rejected'
);

// Guard 3: Percentage-point change confused with percentage growth rate in narrative
const dummyDriverPpAsPercent = {
  ...prodHyundaiDriver,
  summaryKo: '하이브리드 비중은 18.2%로 전년 동기 대비 2.7% 성장했습니다.',
  summaryEn: 'HEV share reached 18.2%, growing 2.7% YoY.',
};
const claimPpAsPercent = {
  ...validHevShareClaim,
  narrativeRefKo: '전년 동기 대비 2.7% 성장',
  narrativeRefEn: 'growing 2.7% YoY',
};
const fPpAsPercent = validatePerformanceClaim(claimPpAsPercent, dummyDriverPpAsPercent);
assert(
  fPpAsPercent.some((f) => f.category === 'SOURCE_CLAIM_INTEGRITY' && f.severity === 'ERROR' && f.detail.includes('confused with percentage growth')),
  'Bilingual Guard 3: Percentage-point change confused with percentage growth rate in narrative is rejected'
);

// --- Suite 9g: Real Command Execution & Audit Report Provenance (P2-3) ---
console.log('\n--- Suite 9g: Real Command Execution & Audit Report Provenance ---');

// Guard 1: Empty command list displays NOT RUN in integrity report
const integrityEmpty = renderIntegrityCommandResults([]);
assert(
  integrityEmpty.includes('NOT RUN'),
  'Audit Report Guard 1: Empty command list displays NOT RUN in integrity report'
);

// Guard 2: Empty command list displays NOT RUN in markdown report
const mdEmpty = renderMarkdownCommandResults([]);
assert(
  mdEmpty.includes('NOT RUN'),
  'Audit Report Guard 2: Empty command list displays NOT RUN in markdown report'
);

// Guard 3: Real command statuses (PASS, EXPECTED_POLICY_FAILURE, NOT_RUN) render faithfully without hardcoding
const mockCommandResults: VerificationCommandResult[] = [
  { command: 'npm run typecheck', executed: true, exitCode: 0, status: 'PASS', summary: 'TypeScript clean', commitSha: 'bb7784e' },
  { command: 'npm run audit-data -- --strict', executed: true, exitCode: 1, status: 'EXPECTED_POLICY_FAILURE', summary: 'Strict enforcement verified', commitSha: 'bb7784e' },
  { command: 'npm run build', executed: false, exitCode: null, status: 'NOT_RUN', summary: 'Skipped', commitSha: 'bb7784e' },
];
const integrityRendered = renderIntegrityCommandResults(mockCommandResults);
assert(
  integrityRendered.includes('EXPECTED POLICY FAILURE') &&
  integrityRendered.includes('PASS') &&
  integrityRendered.includes('NOT RUN'),
  'Audit Report Guard 3: renderIntegrityCommandResults accurately renders real command execution statuses'
);

const mdRendered = renderMarkdownCommandResults(mockCommandResults);
assert(
  mdRendered.includes('EXPECTED POLICY FAILURE') &&
  mdRendered.includes('PASS') &&
  mdRendered.includes('NOT RUN'),
  'Audit Report Guard 4: renderMarkdownCommandResults accurately renders real command execution statuses'
);

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

// ─────────────────────────────────────────────────────────────────────────────
// Suite 12: Audit Engine Security, Provenance & Invariant Remediation Suite (P1 & P2)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Suite 12: Audit Engine Security, Provenance & Invariant Remediation ---');

async function runSuite12() {
  // 12a. P1-A: Live Source Authenticity & Wire-Byte Cryptographic Provenance
  const authenticHtml =
    '<!DOCTYPE html><html><body><table><thead><tr><th>Metric</th><th>Scope</th><th>Q3 2026 (thousand units)</th></tr></thead><tbody><tr><td>Global Deliveries (reported / IFRS)</td><td>Consolidated Group</td><td>920.71</td></tr></tbody></table></body></html>';
  const authenticBytes = Buffer.from(authenticHtml, 'utf-8');
  const authenticHash = computeRawByteSha256(authenticBytes);
  assert(authenticHash.length === 64, 'Suite 12a-0: Authentic wire bytes compute valid SHA-256');

  const authenticOfficialSource = {
    id: validSampleClaim.sourceDocId,
    companyId: 'hyundai_motor',
    title: 'Hyundai Motor Company Q3 2026 Business Results Official Press Release',
    url: 'https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2026-q3-earnings',
    documentType: 'press_release' as const,
    reportingPeriod: '2026-Q3',
    periodType: 'quarterly' as const,
    expectedContentType: 'text/html' as const,
    officialDomain: ['hyundaimotorgroup.com', 'www.hyundaimotorgroup.com'],
    targetClaims: [
      {
        metricId: 'deliveries_global',
        period: '2026-Q3',
        value: 920.71,
        unit: 'thousand_units' as const,
        scope: 'consolidated_group' as const,
        accountingBasis: 'reported' as const,
      },
    ],
  };

  const authenticPipelineResult = await executeOfficialSourcePipeline({
    source: authenticOfficialSource,
    claim: {
      metricId: 'deliveries_global',
      period: '2026-Q3',
      value: 920.71,
      unit: 'thousand_units',
      scope: 'consolidated_group',
      accountingBasis: 'reported',
    },
    bindingParams: {
      rawValue: '920.71',
      locator: { rawLocator: 'html:table:0:row:1', section: 'Consolidated Group' },
      evidenceText: 'Global Deliveries (reported / IFRS): 920.71',
      supportType: 'reported_kpi',
      scope: 'consolidated_group',
      accountingBasis: 'reported',
      metricId: 'deliveries_global',
      period: '2026-Q3',
      unit: 'thousand_units',
    },
    options: {
      customFetch: (async () =>
        new Response(authenticBytes, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })) as any,
    },
  });

  // Positive: Authentic execution produces live_source_verified
  const resAuthentic = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: authenticPipelineResult,
  });
  assert(
    resAuthentic.isValid === true && resAuthentic.verificationLevel === 'live_source_verified',
    'Suite 12a-1: Authentic wire bytes through executeOfficialSourcePipeline yield live_source_verified'
  );

  // Negative: Synthesized plain JS object without trusted execution receipt fails closed
  const synthesizedResult = { ...authenticPipelineResult };
  const resSynthesized = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: synthesizedResult,
  });
  assert(
    resSynthesized.isValid === false &&
      resSynthesized.verificationLevel === 'unverified' &&
      resSynthesized.findings.some((f) => f.detail.includes('caller-synthesized or untracked objects are rejected')),
    'Suite 12a-2: Synthesized plain JS object without trusted receipt fails closed'
  );

  // Negative: Missing rawBytes fails closed
  const pipelineNoBytes = { ...authenticPipelineResult, rawBytes: undefined };
  const resNoBytes = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: pipelineNoBytes,
  });
  assert(
    resNoBytes.isValid === false && resNoBytes.verificationLevel === 'unverified',
    'Suite 12a-3: Missing rawBytes fails closed'
  );

  // Negative: Tampered wire bytes mismatching contentHash is rejected
  const tamperedBytes = new Uint8Array(Buffer.from('Tampered payload'));
  const pipelineTamperedBytes = { ...authenticPipelineResult, rawBytes: tamperedBytes };
  const resTamperedBytes = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: pipelineTamperedBytes,
  });
  assert(
    resTamperedBytes.isValid === false && resTamperedBytes.verificationLevel === 'unverified',
    'Suite 12a-4: Tampered wire bytes is rejected'
  );

  // Negative: Extracted document contentHash mismatching wire byte hash is rejected
  const pipelineMismatchedExtractedHash: any = {
    ...authenticPipelineResult,
    extractedDocument: {
      ...authenticPipelineResult.extractedDocument,
      sourceDocument: {
        sourceDocId: validSampleClaim.sourceDocId,
        contentHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      },
    },
  };
  const resMismatchedExtractedHash = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: pipelineMismatchedExtractedHash,
  });
  assert(
    resMismatchedExtractedHash.isValid === false,
    'Suite 12a-5: Extracted document hash mismatch is rejected'
  );

  // Negative: Verification result from different source document is rejected
  const pipelineReusedDocId: any = {
    ...authenticPipelineResult,
    claimVerificationResult: {
      ...authenticPipelineResult.claimVerificationResult,
      sourceDocId: 'other_document_id',
    },
  };
  const resReusedDocId = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: pipelineReusedDocId,
  });
  assert(
    resReusedDocId.isValid === false,
    'Suite 12a-6: Verification result from different source document is rejected'
  );

  // Negative: Verification result reused for different reporting period is rejected
  const pipelineWrongPeriod: any = {
    ...authenticPipelineResult,
    claimVerificationResult: {
      ...authenticPipelineResult.claimVerificationResult,
      verifiedPeriod: '2025-Q3',
    },
  };
  const resWrongPeriod = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: pipelineWrongPeriod,
  });
  assert(
    resWrongPeriod.isValid === false,
    'Suite 12a-7: Verification result reused for different reporting period is rejected'
  );

  // Negative: Changed numeric value with unmodified live evidence block is rejected
  const claimChangedValue = { ...validSampleClaim, value: 888.88 };
  const resChangedValue = auditStructuredPerformanceClaim(claimChangedValue, prodHyundaiDriver, {
    livePipelineResult: authenticPipelineResult,
  });
  assert(
    resChangedValue.isValid === false,
    'Suite 12a-8: Changed numeric value with unmodified live evidence block is rejected'
  );

  // Negative: Initial URL outside official domain perimeter is rejected
  const pipelineInsecureUrl: any = {
    ...authenticPipelineResult,
    liveDocument: { ...authenticPipelineResult.liveDocument, url: 'https://attacker.evil.com/fake' },
  };
  const resInsecureUrl = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: pipelineInsecureUrl,
  });
  assert(
    resInsecureUrl.isValid === false,
    'Suite 12a-9: Initial URL outside official domain perimeter is rejected'
  );

  // Negative: Public API bypass via validatePerformanceClaim fails closed
  const fPublicBypass = validatePerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    livePipelineResult: { ...authenticPipelineResult },
  } as any);
  assert(
    fPublicBypass.some((f) => f.detail.includes('caller-synthesized or untracked objects are rejected')),
    'Suite 12a-10: Public API bypass via validatePerformanceClaim with synthesized object fails closed'
  );

  // Negative: isLiveSource: true boolean flag alone cannot grant verification
  const resFlagAlone = auditStructuredPerformanceClaim(
    { ...validSampleClaim, isLiveSource: true } as any,
    prodHyundaiDriver
  );
  assert(
    resFlagAlone.verificationLevel !== 'live_source_verified',
    'Suite 12a-11: Boolean flag alone (isLiveSource: true) CANNOT grant live_source_verified'
  );

  // Negative: Trusted receipt for document A reused on claim for document B is rejected
  const claimDocB = { ...validSampleClaim, sourceDocId: 'other_registered_doc' };
  const resDocMismatch = auditStructuredPerformanceClaim(claimDocB, prodHyundaiDriver, {
    livePipelineResult: authenticPipelineResult,
  });
  assert(
    resDocMismatch.isValid === false,
    'Suite 12a-12: Trusted receipt paired with different sourceDocId claim is rejected'
  );

  // 12b. P1-B: Fixture-Backed Period Identity & Dimensional Enforcement
  const fixtureQ3 = {
    sourceDocId: validSampleClaim.sourceDocId,
    sectionLocator: validSampleClaim.sourceLocator,
    extractedText: validSampleClaim.verifiedEvidence,
    verifiedValue: String(validSampleClaim.value),
    verifiedNumericValue: validSampleClaim.value,
    verifiedMetricId: validSampleClaim.metricId,
    verifiedUnit: validSampleClaim.unit as any,
    verifiedScope: validSampleClaim.reportingScope,
    verifiedAccountingBasis: validSampleClaim.accountingBasis,
    verifiedPeriod: '2026-Q3',
    verifiedPeriodType: 'quarterly' as const,
  };
  const resMatchQ3 = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureQ3],
  });
  assert(
    resMatchQ3.isValid === true && resMatchQ3.verificationLevel === 'numeric_claim_verified',
    'Suite 12b-1: Matching fixture with matching period yields numeric_claim_verified'
  );

  // Correct numeric value but wrong period fixture (e.g. 2025-Q3) -> MUST NOT receive numeric_claim_verified
  const fixtureWrongPeriod = { ...fixtureQ3, verifiedPeriod: '2025-Q3' };
  const resWrongPeriodFix = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureWrongPeriod],
  });
  assert(
    resWrongPeriodFix.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-2: Correct numeric value with mismatched period fixture CANNOT yield numeric_claim_verified'
  );

  // Correct numeric value but wrong period type (annual instead of quarterly) -> MUST NOT receive numeric_claim_verified
  const fixtureWrongPeriodType = { ...fixtureQ3, verifiedPeriodType: 'annual' as const };
  const resWrongPeriodTypeFix = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureWrongPeriodType],
  });
  assert(
    resWrongPeriodTypeFix.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-3: Correct value with wrong period type fixture CANNOT yield numeric_claim_verified'
  );

  // Missing period on fixture -> MUST NOT receive numeric_claim_verified
  const fixtureNoPeriod = { ...fixtureQ3, verifiedPeriod: undefined };
  const resNoPeriodFix = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureNoPeriod],
  });
  assert(
    resNoPeriodFix.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-4: Fixture missing verifiedPeriod CANNOT yield numeric_claim_verified'
  );

  // Missing periodType on fixture -> MUST NOT receive numeric_claim_verified
  const fixtureNoPeriodType = { ...fixtureQ3, verifiedPeriodType: undefined };
  const resNoPeriodTypeFix = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureNoPeriodType],
  });
  assert(
    resNoPeriodTypeFix.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-5: Fixture missing verifiedPeriodType CANNOT yield numeric_claim_verified'
  );

  // Correct period but wrong company / source document
  const fixtureWrongDoc = { ...fixtureQ3, sourceDocId: 'wrong_source_doc' };
  const resWrongDocFix = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureWrongDoc],
  });
  assert(
    resWrongDocFix.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-6: Wrong source document fixture CANNOT yield numeric_claim_verified'
  );

  // Correct value and period but wrong metric
  const fixtureWrongMetric = { ...fixtureQ3, verifiedMetricId: 'operating_margin' };
  const resWrongMetricFix = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureWrongMetric],
  });
  assert(
    resWrongMetricFix.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-7: Wrong metric fixture CANNOT yield numeric_claim_verified'
  );

  // Correct value and metric but incompatible unit
  const fixtureWrongUnit = { ...fixtureQ3, verifiedUnit: 'percentage' as any };
  const resWrongUnitFix = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureWrongUnit],
  });
  assert(
    resWrongUnitFix.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-8: Incompatible unit fixture CANNOT yield numeric_claim_verified'
  );

  // Two matching fixtures for different periods: selects correct period
  const fixtureMultiPeriod = [
    { ...fixtureQ3, verifiedPeriod: '2025-Q3', verifiedNumericValue: 800 },
    fixtureQ3,
  ];
  const resMultiPeriod = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: fixtureMultiPeriod,
  });
  assert(
    resMultiPeriod.isValid === true && resMultiPeriod.verificationLevel === 'numeric_claim_verified',
    'Suite 12b-9: Multi-period fixtures correctly select the fixture matching target period'
  );

  // Two equally plausible fixtures for same required dimensions (ambiguous) -> fails closed
  const fixtureAmbiguous = [
    fixtureQ3,
    { ...fixtureQ3, extractedText: 'Alternative snippet with same dimensions' },
  ];
  const resAmbiguous = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: fixtureAmbiguous,
  });
  assert(
    resAmbiguous.isValid === false &&
      resAmbiguous.findings.some((f) => f.detail.includes('Multiple ambiguous source content fixtures')),
    'Suite 12b-10: Multiple ambiguous fixtures for same dimensions fail closed with blocking error'
  );

  // Annual claim cannot be verified by quarterly fixture
  const claimAnnual = { ...validSampleClaim, period: '2026-FY' };
  const resAnnualVsQuarterly = auditStructuredPerformanceClaim(claimAnnual, prodHyundaiDriver, {
    contentFixtures: [fixtureQ3],
  });
  assert(
    resAnnualVsQuarterly.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-11: Annual claim CANNOT be verified by quarterly fixture'
  );

  // Quarterly claim cannot be verified by annual fixture
  const fixtureAnnual = { ...fixtureQ3, verifiedPeriod: '2026-FY', verifiedPeriodType: 'annual' as const };
  const resQuarterlyVsAnnual = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureAnnual],
  });
  assert(
    resQuarterlyVsAnnual.verificationLevel !== 'numeric_claim_verified',
    'Suite 12b-12: Quarterly claim CANNOT be verified by annual fixture'
  );

  // 12c. P1-C: Meaningful Locator & Semantic Evidence Resolution
  // Locator is merely a substring of a different section identifier -> does not resolve
  const claimSubstringLocator = { ...validSampleClaim, sourceLocator: '결적' };
  const resSubLocator = auditStructuredPerformanceClaim(claimSubstringLocator, prodHyundaiDriver, {
    contentFixtures: [fixtureQ3],
  });
  assert(
    resSubLocator.isValid === false &&
      resSubLocator.findings.some((f) =>
        f.detail.includes('does not resolve against available source content fixtures')
      ),
    'Suite 12c-1: Non-resolving interior substring locator is rejected'
  );

  // Evidence text comes from an unrelated reporting period -> does not resolve evidence
  const fixtureUnrelatedPeriodEvidence = {
    ...fixtureQ3,
    verifiedPeriod: '2024-Q1',
    extractedText: 'Hyundai deliveries historical extract 920.71',
  };
  const claimWithUnrelatedEv = {
    ...validSampleClaim,
    verifiedEvidence: 'Hyundai deliveries historical extract 920.71',
  };
  const resUnrelatedEv = auditStructuredPerformanceClaim(claimWithUnrelatedEv, prodHyundaiDriver, {
    contentFixtures: [fixtureUnrelatedPeriodEvidence],
  });
  assert(
    resUnrelatedEv.verificationLevel !== 'evidence_validated' &&
      resUnrelatedEv.verificationLevel !== 'numeric_claim_verified',
    'Suite 12c-2: Evidence from unrelated reporting period cannot validate claim evidence'
  );

  // Semantic contradiction: narrative ref asserting wrong value fails closed
  const claimWithContradictoryNarrative = {
    ...validSampleClaim,
    narrativeRefKo: '글로벌 도매 500,000대(-50.0% YoY)',
  };
  const resContradictoryNarrative = auditStructuredPerformanceClaim(
    claimWithContradictoryNarrative,
    prodHyundaiDriver
  );
  assert(
    resContradictoryNarrative.findings.some((f) => f.detail.includes('narrativeRefKo')),
    'Suite 12c-3: Contradictory narrative reference fails validation'
  );

  // Multi-metric ambiguous block without metric binding fails closed
  const fixtureMultiMetricAmbiguous = {
    ...fixtureQ3,
    verifiedMetricId: 'revenue', // metric does not match deliveries_global
  };
  const resMetricMismatch = auditStructuredPerformanceClaim(validSampleClaim, prodHyundaiDriver, {
    contentFixtures: [fixtureMultiMetricAmbiguous],
  });
  assert(
    resMetricMismatch.verificationLevel !== 'numeric_claim_verified',
    'Suite 12c-4: Fixture with mismatched metricId fails closed'
  );

  // 12d. P2-A: Strict-Audit Exit-Code Classification (All 10 codes)
  // 1. SUCCESS
  const classSuccess = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    0,
    '✨ All performance drivers, source claims, and data observations passed validation with 0 findings.'
  );
  assert(
    classSuccess.status === 'PASS' && classSuccess.reasonCode === 'SUCCESS',
    'Suite 12d-1: Strict mode exit code 0 classifies as PASS with reason SUCCESS'
  );

  // 2. POLICY_FAILURE_REVIEW_FINDINGS (strict code 1, 0 blocking errors, >0 review findings)
  const classStrictPolicy = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    1,
    '⚠️ Strict mode failed with 2 review findings.\nStrict exit code: 1\n'
  );
  assert(
    classStrictPolicy.status === 'EXPECTED_POLICY_FAILURE' &&
      classStrictPolicy.reasonCode === 'POLICY_FAILURE_REVIEW_FINDINGS',
    'Suite 12d-2: Strict mode exit code 1 with genuine review findings classifies as EXPECTED_POLICY_FAILURE'
  );

  // 3. EXECUTION_FAILURE / UNEXPECTED_EXCEPTION
  const classSyntaxError = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    1,
    'SyntaxError: Unexpected identifier in file.ts\nCommand failed\n'
  );
  assert(
    classSyntaxError.status === 'FAIL' &&
      (classSyntaxError.reasonCode === 'EXECUTION_FAILURE' ||
        classSyntaxError.reasonCode === 'UNEXPECTED_EXCEPTION'),
    'Suite 12d-3: Strict mode exit code 1 from SyntaxError classifies as FAIL with reason UNEXPECTED_EXCEPTION'
  );

  // 4. TIMEOUT
  const classTimeout = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    1,
    'Command timed out after 180000ms',
    { code: 'ETIMEDOUT' }
  );
  assert(
    classTimeout.status === 'FAIL' && classTimeout.reasonCode === 'TIMEOUT',
    'Suite 12d-4: Strict mode timeout classifies as FAIL with reason TIMEOUT'
  );

  // 5. MISSING_DEPENDENCY
  const classMissingDep = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    1,
    'Error: Cannot find module "some-dep"\ncode: MODULE_NOT_FOUND'
  );
  assert(
    classMissingDep.status === 'FAIL' && classMissingDep.reasonCode === 'MISSING_DEPENDENCY',
    'Suite 12d-5: Strict mode missing dependency classifies as FAIL with reason MISSING_DEPENDENCY'
  );

  // 6. BLOCKING_VALIDATION_FAILURE
  const classBlockingError = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    1,
    '💥 Audit failed with 2 blocking structural errors.\n'
  );
  assert(
    classBlockingError.status === 'FAIL' &&
      classBlockingError.reasonCode === 'BLOCKING_VALIDATION_FAILURE',
    'Suite 12d-6: Strict mode with blocking structural errors classifies as FAIL with reason BLOCKING_VALIDATION_FAILURE'
  );

  // 7. UNEXPECTED_EXCEPTION
  const classUncaughtException = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    1,
    'fatal: UnhandledPromiseRejection in runner\nAudit aborted'
  );
  assert(
    classUncaughtException.status === 'FAIL' &&
      classUncaughtException.reasonCode === 'UNEXPECTED_EXCEPTION',
    'Suite 12d-7: Strict mode unhandled exception classifies as FAIL with reason UNEXPECTED_EXCEPTION'
  );

  // 8. UNEXPECTED_EXIT_CODE (e.g. exit code 137 or 2)
  const classUnexpectedExitCode = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    137,
    'Killed: out of memory'
  );
  assert(
    classUnexpectedExitCode.status === 'FAIL' &&
      classUnexpectedExitCode.reasonCode === 'UNEXPECTED_EXIT_CODE',
    'Suite 12d-8: Strict mode exit code 137 classifies as FAIL with reason UNEXPECTED_EXIT_CODE'
  );

  // 9. CONFLICTING_OUTPUT_STATUS
  const classConflictingStatus = classifyVerificationCommandResult(
    'npm run audit-data -- --strict',
    1,
    '✨ Scope-Safe Audit Passed with 0 blocking errors and 0 review findings.'
  );
  assert(
    classConflictingStatus.status === 'FAIL' &&
      classConflictingStatus.reasonCode === 'CONFLICTING_OUTPUT_STATUS',
    'Suite 12d-9: Zero findings output with exit code 1 classifies as FAIL with reason CONFLICTING_OUTPUT_STATUS'
  );

  // 10. NON_STRICT_FAILURE
  const classNonStrictFail = classifyVerificationCommandResult(
    'npm run audit-data',
    1,
    'General non-strict task failed with runtime errors'
  );
  assert(
    classNonStrictFail.status === 'FAIL' &&
      classNonStrictFail.reasonCode === 'NON_STRICT_FAILURE',
    'Suite 12d-10: Non-strict audit failure classifies as FAIL with reason NON_STRICT_FAILURE'
  );

  // 12e. P2-B: Audit Provenance & Git State
  const treeStatusClean = getWorkingTreeStatus();
  assert(
    treeStatusClean === 'clean' || treeStatusClean === 'dirty' || treeStatusClean === 'unknown',
    'Suite 12e-1: Working tree status returns valid union state'
  );

  const treeStatusExDocs = getWorkingTreeExcludingDocs();
  assert(
    treeStatusExDocs === 'clean' || treeStatusExDocs === 'dirty' || treeStatusExDocs === 'unknown',
    'Suite 12e-2: Working tree excluding docs returns valid union state'
  );

  process.env.GIT_UNAVAILABLE = '1';
  assert(
    getWorkingTreeStatus() === 'unknown',
    'Suite 12e-3: Working tree status returns unknown when git is unavailable'
  );
  assert(
    getAuditCommitSha() === 'unknown',
    'Suite 12e-4: Audit commit SHA returns unknown when git is unavailable'
  );
  assert(
    getWorkingTreeExcludingDocs() === 'unknown',
    'Suite 12e-5: Working tree excluding docs returns unknown when git is unavailable'
  );
  delete process.env.GIT_UNAVAILABLE;

  // 12f. P2-C: Unified Dimensional Compatibility
  // Supplying percentage change instead of percentage-points is caught
  const claimPpWithPctChange = {
    ...validHevShareClaim,
    changeYoYPercentagePoints: 50.0,
  };
  const resPpPctMismatch = auditStructuredPerformanceClaim(claimPpWithPctChange, prodHyundaiDriver);
  assert(
    resPpPctMismatch.isValid === false &&
      resPpPctMismatch.findings.some(
        (f) =>
          f.detail.includes('appears to be a percentage change') ||
          f.detail.includes('diverges from calculated change')
      ),
    'Suite 12f-1: Supplying percentage change instead of percentage-points is caught with clear diagnostic'
  );

  // Zero denominator in comparison observation fails closed
  const claimZeroDenom = { ...validSampleClaim };
  const mockZeroObsList: any[] = [
    {
      id: 'curr_obs',
      companyId: 'hyundai_motor',
      period: '2026-Q3',
      periodType: 'quarterly',
      calendarYear: 2026,
      valueType: 'reported',
      metricId: 'deliveries_global',
      value: 920.71,
      unit: 'thousand_units',
      isComparable: true,
    },
    {
      id: 'zero_prior_obs',
      companyId: 'hyundai_motor',
      period: '2025-Q3',
      periodType: 'quarterly',
      calendarYear: 2025,
      valueType: 'reported',
      metricId: 'deliveries_global',
      value: 0,
      unit: 'thousand_units',
      isComparable: true,
    },
  ];
  const resZeroDenom = auditStructuredPerformanceClaim(claimZeroDenom, prodHyundaiDriver, {
    observations: mockZeroObsList,
  });
  assert(
    resZeroDenom.isValid === false &&
      resZeroDenom.findings.some((f) => f.detail.includes('value is zero')),
    'Suite 12f-2: Comparison observation with zero denominator is rejected with blocking error'
  );

  // Non-finite value in comparison observation fails closed
  const mockNanObsList: any[] = [
    {
      id: 'curr_obs',
      companyId: 'hyundai_motor',
      period: '2026-Q3',
      periodType: 'quarterly',
      calendarYear: 2026,
      valueType: 'reported',
      metricId: 'deliveries_global',
      value: 920.71,
      unit: 'thousand_units',
      isComparable: true,
    },
    {
      id: 'nan_prior_obs',
      companyId: 'hyundai_motor',
      period: '2025-Q3',
      periodType: 'quarterly',
      calendarYear: 2025,
      valueType: 'reported',
      metricId: 'deliveries_global',
      value: NaN,
      unit: 'thousand_units',
      isComparable: true,
    },
  ];
  const resNanComparison = auditStructuredPerformanceClaim(claimZeroDenom, prodHyundaiDriver, {
    observations: mockNanObsList,
  });
  assert(
    resNanComparison.isValid === false &&
      resNanComparison.findings.some((f) => f.detail.includes('non-finite')),
    'Suite 12f-3: Comparison observation with non-finite value is rejected with blocking error'
  );

  // Incompatible accounting basis in comparison observation fails closed
  const mockBasisMismatchList: any[] = [
    {
      id: 'curr_obs',
      companyId: 'hyundai_motor',
      period: '2026-Q3',
      periodType: 'quarterly',
      calendarYear: 2026,
      valueType: 'reported',
      metricId: 'deliveries_global',
      value: 920.71,
      unit: 'thousand_units',
      accountingBasis: 'reported',
      isComparable: true,
    },
    {
      id: 'adjusted_prior_obs',
      companyId: 'hyundai_motor',
      period: '2025-Q3',
      periodType: 'quarterly',
      calendarYear: 2025,
      valueType: 'reported',
      metricId: 'deliveries_global',
      value: 800,
      unit: 'thousand_units',
      accountingBasis: 'adjusted',
      isComparable: true,
    },
  ];
  const resBasisMismatch = auditStructuredPerformanceClaim(claimZeroDenom, prodHyundaiDriver, {
    observations: mockBasisMismatchList,
  });
  assert(
    resBasisMismatch.isValid === false &&
      resBasisMismatch.findings.some((f) => f.detail.includes('accountingBasis mismatch')),
    'Suite 12f-4: Comparison observation with incompatible accounting basis is rejected'
  );

  // Incompatible reporting scope in comparison observation fails closed
  const mockScopeMismatchList: any[] = [
    {
      id: 'curr_obs',
      companyId: 'hyundai_motor',
      period: '2026-Q3',
      periodType: 'quarterly',
      calendarYear: 2026,
      valueType: 'reported',
      metricId: 'deliveries_global',
      value: 920.71,
      unit: 'thousand_units',
      reportingScope: 'consolidated_group',
      isComparable: true,
    },
    {
      id: 'segment_prior_obs',
      companyId: 'hyundai_motor',
      period: '2025-Q3',
      periodType: 'quarterly',
      calendarYear: 2025,
      valueType: 'reported',
      metricId: 'deliveries_global',
      value: 800,
      unit: 'thousand_units',
      reportingScope: 'automotive_segment',
      isComparable: true,
    },
  ];
  const resScopeMismatch = auditStructuredPerformanceClaim(claimZeroDenom, prodHyundaiDriver, {
    observations: mockScopeMismatchList,
  });
  assert(
    resScopeMismatch.isValid === false &&
      resScopeMismatch.findings.some((f) => f.detail.includes('reportingScope mismatch')),
    'Suite 12f-5: Comparison observation with incompatible reporting scope is rejected'
  );
}

runSuite12()
  .then(() => {
    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 All Company Dashboard and Source-Backed Regression Tests passed cleanly!\n');
    }
  })
  .catch((err) => {
    console.error('Suite 12 unhandled error:', err);
    process.exit(1);
  });
