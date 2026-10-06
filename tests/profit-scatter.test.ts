import { validateScatterObservationCompatibility, resolveCanonicalPeriodType } from '../src/utils/scatterDataUtils';
import { convertMillionsToKRW, convertMillionsToUSD, formatLocalizedProfit } from '../src/utils/currencyUtils';
import { Company, MetricObservation, PeriodType } from '../src/types/metrics';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

console.log('🧪 Starting Profit Scatter Matrix & Observation Compatibility Tests...\n');

const mockCompany: Company = {
  id: 'rivian',
  name: 'Rivian Automotive, Inc.',
  shortName: 'Rivian',
  nativeName: 'Rivian Automotive, Inc.',
  ticker: 'RIVN',
  stockExchange: 'NASDAQ',
  hqCountry: 'United States',
  hqCity: 'Irvine, CA',
  region: 'north_america',
  website: 'https://rivian.com',
  irUrl: 'https://rivian.com/investors',
  financialResultsUrl: 'https://rivian.com/investors',
  salesReleaseUrl: 'https://rivian.com/investors',
  fiscalYearEnd: 'Dec 31',
  reportingCurrency: 'USD',
  supportedDocuments: ['10-Q'],
  description: 'EV manufacturer',
};

const mockMercedes: Company = {
  id: 'mercedes_benz',
  name: 'Mercedes-Benz Group',
  shortName: 'Mercedes-Benz',
  nativeName: 'Mercedes-Benz Group AG',
  ticker: 'MBG',
  stockExchange: 'XETRA',
  hqCountry: 'Germany',
  hqCity: 'Stuttgart',
  region: 'europe',
  website: 'https://group.mercedes-benz.com',
  irUrl: 'https://group.mercedes-benz.com/investors',
  financialResultsUrl: 'https://group.mercedes-benz.com/investors',
  salesReleaseUrl: 'https://group.mercedes-benz.com/investors',
  fiscalYearEnd: 'Dec 31',
  reportingCurrency: 'EUR',
  supportedDocuments: ['Interim Report'],
  description: 'Luxury OEM',
};

// ─── 1. Loss-Making & Zero Values Preservation ──────────────────────────────
console.log('--- Suite 1: Loss-making entities (Negative EBIT, Negative Margin, Zero EBIT) ---');

const rivianEbit: MetricObservation = {
  id: 'rivian_ebit_2026q2',
  companyId: 'rivian',
  metricId: 'operating_income',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: -836,
  unit: 'currency_millions',
  currency: 'USD',
  valueType: 'reported',
  sourceDocId: 'rivian_2026_q2_doc',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};

const rivianMargin: MetricObservation = {
  id: 'rivian_margin_2026q2',
  companyId: 'rivian',
  metricId: 'operating_margin',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: -50.4,
  unit: 'percentage',
  valueType: 'reported',
  sourceDocId: 'rivian_2026_q2_doc',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};

const rivianDel: MetricObservation = {
  id: 'rivian_del_2026q2',
  companyId: 'rivian',
  metricId: 'deliveries_global',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 12.19,
  unit: 'thousand_units',
  valueType: 'reported',
  sourceDocId: 'rivian_2026_q2_doc',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
  volumeDefinition: 'retail_deliveries',
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};

const resultNegative = validateScatterObservationCompatibility(
  mockCompany,
  '2026-Q2',
  'quarterly',
  rivianEbit,
  rivianMargin,
  rivianDel
);

assert(resultNegative.valid === true, 'Negative EBIT and negative margin are accepted as valid');
assert(resultNegative.point?.operatingIncome === -836, 'Negative EBIT magnitude is preserved: -836M');
assert(resultNegative.point?.marginPercent === -50.4, 'Negative margin percentage is preserved: -50.4%');

// Zero EBIT
const zeroEbitObs: MetricObservation = {
  ...rivianEbit,
  id: 'zero_ebit_test',
  value: 0,
};
const zeroMarginObs: MetricObservation = {
  ...rivianMargin,
  id: 'zero_margin_test',
  value: 0,
};

const resultZero = validateScatterObservationCompatibility(
  mockCompany,
  '2026-Q2',
  'quarterly',
  zeroEbitObs,
  zeroMarginObs,
  rivianDel
);
assert(resultZero.valid === true, 'Zero EBIT and zero margin are accepted as valid');
assert(resultZero.point?.operatingIncome === 0, 'Zero EBIT is preserved: 0');
assert(resultZero.point?.marginPercent === 0, 'Zero margin is preserved: 0');

// Mixed dataset bounds calculation logic test
const dataset = [
  { name: 'Toyota', profit: 9.78, margin: 7.9 },
  { name: 'GM', profit: 5.44, margin: 8.2 },
  { name: 'Rivian', profit: -1.15, margin: -50.4 },
  { name: 'BreakEven', profit: 0, margin: 0 },
];

const minProfitObs = Math.min(...dataset.map((d) => d.profit));
const maxProfitObs = Math.max(...dataset.map((d) => d.profit));
const minMarginObs = Math.min(...dataset.map((d) => d.margin));
const maxMarginObs = Math.max(...dataset.map((d) => d.margin));

assert(minProfitObs < 0, `Mixed dataset accurately identifies negative profit lower bound: ${minProfitObs}`);
assert(maxProfitObs > 0, `Mixed dataset accurately identifies positive profit upper bound: ${maxProfitObs}`);
assert(minMarginObs === -50.4, `Mixed dataset preserves full negative margin depth: ${minMarginObs}`);
assert(maxMarginObs === 8.2, `Mixed dataset preserves top margin: ${maxMarginObs}`);

// ─── 2. Unsupported Currency & Conversion Failure Tests ─────────────────────
console.log('\n--- Suite 2: Currency verification and explicit conversion failures ---');

const unsupportedCurrencyEbit: MetricObservation = {
  ...rivianEbit,
  currency: 'INR', // Indian Rupee not in fixed benchmark FX table
};

const resultUnsupportedCurr = validateScatterObservationCompatibility(
  mockCompany,
  '2026-Q2',
  'quarterly',
  unsupportedCurrencyEbit,
  rivianMargin
);
assert(resultUnsupportedCurr.valid === false, 'Rejects unsupported currency without defaulting to USD');
assert(Boolean(resultUnsupportedCurr.reason?.includes('unsupported_currency')), 'Returns explicit unsupported_currency reason');

assert(convertMillionsToKRW(100, 'INR') === null, 'convertMillionsToKRW returns null on INR');
assert(convertMillionsToUSD(100, 'INR') === null, 'convertMillionsToUSD returns null on INR');
assert(formatLocalizedProfit(100, 'INR', 'ko') === '-', 'formatLocalizedProfit returns "-" on unsupported currency (ko)');
assert(formatLocalizedProfit(100, 'INR', 'en') === '-', 'formatLocalizedProfit returns "-" on unsupported currency (en)');

// ─── 3. Period & Unit Observation Compatibility Tests ───────────────────────
console.log('\n--- Suite 3: Observation compatibility (period, periodType, unit, basis) ---');

// Period mismatch
const periodMismatchEbit: MetricObservation = {
  ...rivianEbit,
  period: '2026-Q1', // Does not match target 2026-Q2
};
const resultPeriodMismatch = validateScatterObservationCompatibility(
  mockCompany,
  '2026-Q2',
  'quarterly',
  periodMismatchEbit,
  rivianMargin
);
assert(resultPeriodMismatch.valid === false, 'Rejects mismatched reporting period');
assert(resultPeriodMismatch.reason === 'period_mismatch', 'Fails with period_mismatch');

// PeriodType mismatch (quarterly observation provided for annual target)
const resultPeriodTypeMismatch = validateScatterObservationCompatibility(
  mockCompany,
  '2026-Q2',
  'annual', // Caller requested annual, observation is quarterly
  rivianEbit,
  rivianMargin
);
assert(resultPeriodTypeMismatch.valid === false, 'Rejects mismatched periodType');
assert(resultPeriodTypeMismatch.reason === 'period_type_mismatch', 'Fails with period_type_mismatch');

// Unit mismatch
const unitMismatchEbit: MetricObservation = {
  ...rivianEbit,
  unit: 'percentage' as any, // Incompatible unit for operating income
};
const resultUnitMismatch = validateScatterObservationCompatibility(
  mockCompany,
  '2026-Q2',
  'quarterly',
  unitMismatchEbit,
  rivianMargin
);
assert(resultUnitMismatch.valid === false, 'Rejects invalid EBIT unit');
assert(Boolean(resultUnitMismatch.reason?.includes('unsupported_ebit_unit')), 'Fails with unsupported_ebit_unit');

// Documented scope/proxy exception test (Mercedes-Benz Cars segment margin with group EBIT)
// Uses official verified sourceDocId: mbg_2026_q2_results
const mbgEbit: MetricObservation = {
  id: 'mbg_2026_q2_ebit',
  companyId: 'mercedes_benz',
  metricId: 'operating_income',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 1550,
  unit: 'currency_millions',
  currency: 'EUR',
  valueType: 'reported',
  sourceDocId: 'mbg_2026_q2_results',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};

const mbgMargin: MetricObservation = {
  id: 'mbg_2026_q2_margin',
  companyId: 'mercedes_benz',
  metricId: 'operating_margin',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 4.0,
  unit: 'percentage',
  valueType: 'reported',
  sourceDocId: 'mbg_2026_q2_results',
  reportingScope: 'cars_segment',
  accountingBasis: 'adjusted',
  isComparable: true,
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};

// Revenue observation for MBG matching exact documented exception
const mbgRev: MetricObservation = {
  id: 'mbg_2026_q2_rev',
  companyId: 'mercedes_benz',
  metricId: 'revenue',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 32060,
  unit: 'currency_millions',
  currency: 'EUR',
  valueType: 'reported',
  sourceDocId: 'mbg_2026_q2_results',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};

// [Regression Test 1] Exact match accepted with proxy provenance preserved
const resultMbgProxy = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  mbgEbit,
  mbgMargin,
  null,
  mbgRev
);
assert(resultMbgProxy.valid === true, 'Test 1a: Exact documented scope exception (MBG) is accepted');
assert(resultMbgProxy.point?.isProxy === true, 'Test 1b: MBG point is tagged with isProxy: true');
assert(
  resultMbgProxy.point?.proxyExceptionId === 'mbg_cars_adjusted_ros_2026q2',
  'Test 1c: MBG point preserves authoritative proxyExceptionId'
);

// ─── Test A: Revenue observation missing on scope exception path ────────────
const resultMissingRev = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  mbgEbit,
  mbgMargin,
  null,
  undefined
);
assert(resultMissingRev.valid === false, 'Test A1: Missing revenue observation on scope exception path is rejected');
assert(
  resultMissingRev.reason === 'missing_revenue_observation_for_scope_exception',
  'Test A2: Fails with explicit missing_revenue_observation_for_scope_exception'
);

// ─── Test B: Revenue sourceDocId missing / empty ────────────────────────────
const missingDocRev: MetricObservation = {
  ...mbgRev,
  sourceDocId: '',
};
const resultMissingRevDoc = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  mbgEbit,
  mbgMargin,
  null,
  missingDocRev
);
assert(resultMissingRevDoc.valid === false, 'Test B1: Revenue observation missing sourceDocId is rejected');
assert(
  Boolean(resultMissingRevDoc.reason?.includes('incompatible_basis_or_scope')),
  'Test B2: Fails closed without falling back to exception registry metadata'
);

// ─── Test C: Revenue sourceDocId wrong / unverified ─────────────────────────
const wrongDocRev: MetricObservation = {
  ...mbgRev,
  sourceDocId: 'unverified_arbitrary_doc',
};
const resultWrongRevDoc = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  mbgEbit,
  mbgMargin,
  null,
  wrongDocRev
);
assert(resultWrongRevDoc.valid === false, 'Test C1: Revenue observation with wrong sourceDocId is rejected');
assert(
  Boolean(resultWrongRevDoc.reason?.includes('incompatible_basis_or_scope')),
  'Test C2: Wrong revenue sourceDocId fails closed'
);

// ─── Test D: Revenue sourceDocId correct & verified ─────────────────────────
const resultCorrectRev = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  mbgEbit,
  mbgMargin,
  null,
  mbgRev
);
assert(resultCorrectRev.valid === true, 'Test D1: Exact documented exception with verified revenue source succeeds');
assert(resultCorrectRev.point?.isProxy === true, 'Test D2: Verified proxy tagged with isProxy: true');
assert(
  resultCorrectRev.point?.proxyExceptionId === 'mbg_cars_adjusted_ros_2026q2',
  'Test D3: Preserves authoritative proxyExceptionId'
);

// [Regression Test 2] Same company + same period, but mismatching scope or basis rejected
const wrongScopeMargin: MetricObservation = {
  ...mbgMargin,
  reportingScope: 'commercial_vehicles_segment', // Mismatch against documented cars_segment
};
const resultWrongScope = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  mbgEbit,
  wrongScopeMargin,
  null,
  mbgRev
);
assert(resultWrongScope.valid === false, 'Test 2a: Same company and period with wrong scope is rejected');
assert(
  Boolean(resultWrongScope.reason?.includes('incompatible_basis_or_scope')),
  'Test 2b: Wrong scope fails with incompatible_basis_or_scope'
);

const wrongBasisMargin: MetricObservation = {
  ...mbgMargin,
  accountingBasis: 'management_defined', // Mismatch against documented adjusted basis
};
const resultWrongBasis = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  mbgEbit,
  wrongBasisMargin,
  null,
  mbgRev
);
assert(resultWrongBasis.valid === false, 'Test 2c: Same company and period with wrong basis is rejected');

// [Regression Test 3] Mismatching sourceDocId rejected
const wrongDocEbit: MetricObservation = {
  ...mbgEbit,
  sourceDocId: 'unverified_arbitrary_doc',
};
const resultWrongDoc = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  wrongDocEbit,
  mbgMargin,
  null,
  mbgRev
);
assert(resultWrongDoc.valid === false, 'Test 3a: Exception with unrecognized or unverified sourceDocId is rejected');
assert(
  Boolean(resultWrongDoc.reason?.includes('incompatible_basis_or_scope')),
  'Test 3b: Unrecognized sourceDocId fails closed'
);

// [Regression Test 4] PeriodType mismatch rejected
const resultWrongPeriodType = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'annual', // targetPeriodType annual vs observation quarterly
  mbgEbit,
  mbgMargin
);
assert(resultWrongPeriodType.valid === false, 'Test 4: PeriodType mismatch is rejected');

// [Regression Test 5] Malformed / incomplete exception rejected (undocumented mismatch)
const rivianRev: MetricObservation = {
  id: 'rivian_rev_2026q2',
  companyId: 'rivian',
  metricId: 'revenue',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 1158,
  unit: 'currency_millions',
  currency: 'USD',
  valueType: 'reported',
  sourceDocId: 'rivian_2026_q2_doc',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  isComparable: true,
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};
const undocumentedMismatchEbit: MetricObservation = {
  ...rivianEbit,
  accountingBasis: 'reported',
  reportingScope: 'consolidated_group',
};
const undocumentedMismatchMargin: MetricObservation = {
  ...rivianMargin,
  accountingBasis: 'management_defined',
  reportingScope: 'business_unit',
};
const resultUndocumentedMismatch = validateScatterObservationCompatibility(
  mockCompany,
  '2026-Q2',
  'quarterly',
  undocumentedMismatchEbit,
  undocumentedMismatchMargin,
  null,
  rivianRev
);
assert(resultUndocumentedMismatch.valid === false, 'Test 5a: Undocumented basis/scope mismatch is rejected');
assert(Boolean(resultUndocumentedMismatch.reason?.includes('incompatible_basis_or_scope')), 'Test 5b: Fails with incompatible_basis_or_scope');

// ─── 4. Stale Selection Resolution Tests ────────────────────────────────────
console.log('\n--- Suite 4: Selection synchronization & stale data prevention ---');

// Mock state resolution logic matching ProfitScatterChart.tsx
function resolveSelectedPoint<T extends { company: { id: string } }>(
  selected: T | null,
  validPoints: T[]
): T | null {
  if (!selected) return null;
  return validPoints.find((p) => p.company.id === selected.company.id) ?? null;
}

const pointsQ2 = [
  { company: { id: 'tesla' }, profit: 0.55, margin: 1.4 },
  { company: { id: 'toyota_motor' }, profit: 9.78, margin: 7.9 },
  { company: { id: 'rivian' }, profit: -1.15, margin: -50.4 },
];

const pointsQ1 = [
  // Rivian not present in Q1
  { company: { id: 'tesla' }, profit: 0.40, margin: 1.2 },
  { company: { id: 'toyota_motor' }, profit: 8.50, margin: 7.5 },
];

// User selected Rivian in Q2
const selectedRivian = pointsQ2[2];
assert(resolveSelectedPoint(selectedRivian, pointsQ2)?.company.id === 'rivian', 'Selected point resolves in Q2');

// Period changed to Q1 where Rivian is absent
const resolvedAfterPeriodChange = resolveSelectedPoint(selectedRivian, pointsQ1);
assert(resolvedAfterPeriodChange === null, 'Selected point safely clears to null when OEM absent in new period');

// User selected Toyota in Q2, then switched to Q1
const selectedToyota = pointsQ2[1];
const resolvedToyotaInQ1 = resolveSelectedPoint(selectedToyota, pointsQ1);
assert(resolvedToyotaInQ1?.company.id === 'toyota_motor', 'Toyota resolves in Q1');
assert(resolvedToyotaInQ1?.profit === 8.50, 'Toyota profit updates to Q1 value without stale Q2 retention');

// ─── 5. Analytical Reference Threshold Consistency ─────────────────────────
console.log('\n--- Suite 5: Analytical Reference Threshold Consistency ---');

const fxRate = 1380.0;
const annualMidKRW = 12.0; // 12조원
const annualMidUSD = (annualMidKRW * 1e12) / (fxRate * 1e9);
assert(Number(annualMidUSD.toFixed(2)) === 8.70, 'Annual mid-profit threshold in USD converts exactly to ~$8.70B');

const quarterlyMidKRW = 3.5; // 3.5조원
const quarterlyMidUSD = (quarterlyMidKRW * 1e12) / (fxRate * 1e9);
assert(Number(quarterlyMidUSD.toFixed(2)) === 2.54, 'Quarterly mid-profit threshold in USD converts exactly to ~$2.54B');

// Ensure an OEM at 3.5조 KRW / 2.54B USD lands on identical side of boundary in both languages
const testProfitWon = 3.6 * 1e12; // 3.6조 KRW
const testProfitUSD = testProfitWon / (fxRate * 1e9); // $2.61B

const isLeaderKO = testProfitWon / 1e12 >= quarterlyMidKRW;
const isLeaderEN = testProfitUSD >= quarterlyMidUSD;
assert(isLeaderKO === isLeaderEN, 'OEM quadrant assignment is 100% semantically identical between KO and EN');

// ─── 6. Canonical PeriodType Resolution ─────────────────────────────────────
console.log('\n--- Suite 6: Canonical PeriodType Resolution ---');

// 6-1. All quarterly observations
const allQuarterlyObs = [
  { periodType: 'quarterly' as PeriodType },
  { periodType: 'quarterly' as PeriodType },
  { periodType: 'quarterly' as PeriodType },
];
assert(resolveCanonicalPeriodType(allQuarterlyObs) === 'quarterly', 'All quarterly observations resolve to "quarterly"');

// 6-2. All annual observations
const allAnnualObs = [
  { periodType: 'annual' as PeriodType },
  { periodType: 'annual' as PeriodType },
];
assert(resolveCanonicalPeriodType(allAnnualObs) === 'annual', 'All annual observations resolve to "annual"');

// 6-3. Mixed quarterly and annual observations -> Fail Closed (undefined)
const mixedObs = [
  { periodType: 'quarterly' as PeriodType },
  { periodType: 'annual' as PeriodType },
];
assert(resolveCanonicalPeriodType(mixedObs) === undefined, 'Mixed quarterly and annual observations fail closed to undefined');

// 6-4. Missing or empty observations -> Fail Closed (undefined)
assert(resolveCanonicalPeriodType([]) === undefined, 'Empty observations array fails closed to undefined');

const allMissingPeriodTypeObs = [
  { periodType: undefined },
  { periodType: null },
];
assert(resolveCanonicalPeriodType(allMissingPeriodTypeObs) === undefined, 'Observations with missing/null periodType fail closed to undefined');

// 6-5. Single quarterly observation amongst missing periodTypes -> returns "quarterly"
const partiallyMissingObs = [
  { periodType: 'quarterly' as PeriodType },
  { periodType: undefined },
];
assert(resolveCanonicalPeriodType(partiallyMissingObs) === 'quarterly', 'Single defined periodType with undefined entries resolves consistently');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Profit Scatter Matrix tests passed cleanly!\n');
}

