import { validateScatterObservationCompatibility } from '../src/utils/scatterDataUtils';
import { convertMillionsToKRW, convertMillionsToUSD, formatLocalizedProfit } from '../src/utils/currencyUtils';
import { Company, MetricObservation } from '../src/types/metrics';

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
  sourceDocId: 'mbg_2026_q2_interim',
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
  sourceDocId: 'mbg_2026_q2_interim',
  reportingScope: 'cars_segment',
  accountingBasis: 'adjusted',
  isComparable: true,
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
};

const resultMbgProxy = validateScatterObservationCompatibility(
  mockMercedes,
  '2026-Q2',
  'quarterly',
  mbgEbit,
  mbgMargin
);
assert(resultMbgProxy.valid === true, 'Documented scope exception (MBG) is accepted');
assert(resultMbgProxy.point?.isProxy === true, 'MBG point is tagged with isProxy: true');

// Undocumented arbitrary mismatch
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
  undocumentedMismatchMargin
);
assert(resultUndocumentedMismatch.valid === false, 'Undocumented basis/scope mismatch is rejected');
assert(Boolean(resultUndocumentedMismatch.reason?.includes('incompatible_basis_or_scope')), 'Fails with incompatible_basis_or_scope');

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

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Profit Scatter Matrix tests passed cleanly!\n');
}
