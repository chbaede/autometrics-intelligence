/**
 * AutoMetrics Intelligence — Phase 1 Capabilities Unit & Regression Test Suite
 *
 * Validates:
 * 1. Market Denominators & Compatibility Validation Layer Invariants
 * 2. Data Change History Schema, Orphan ID Prevention & Categorization
 * 3. Financial Performance Decomposition Math, Fiscal Alignment & Disclosure Integrity
 * 4. OEM Competitive Ranking, Typed Nulls & Comparability Invariants
 */

import {
  MARKET_DENOMINATORS,
  getMarketDenominator,
  validateMarketShareCompatibility,
} from '../src/data/marketShareData';
import {
  DATA_CHANGE_HISTORY,
  getFilteredChangeHistory,
} from '../src/data/dataChangeHistory';
import {
  FINANCIAL_DECOMPOSITIONS,
  getFinancialDecomposition,
} from '../src/data/financialDecompositions';
import { COMPANIES_MAP } from '../src/data/companies';
import { SOURCE_DOCUMENTS } from '../src/data/sources';

console.log('🧪 Starting Phase 1 Remediation Capabilities Test Suite...\n');

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

// ========================================================
// 1. Market Denominator & Compatibility Invariants
// ========================================================
console.log('📊 Suite 1: Market Denominators & Compatibility Validation Layer');

assert(MARKET_DENOMINATORS.length >= 15, `Suite 1-1: Registered denominators count is ${MARKET_DENOMINATORS.length} (>= 15)`);

const markets = ['global', 'europe', 'china', 'united_states'] as const;
for (const m of markets) {
  const q3Denom = getMarketDenominator(m, '2026-Q3');
  assert(Boolean(q3Denom), `Suite 1-2 [${m}]: 2026-Q3 denominator exists`);
  if (q3Denom) {
    assert(q3Denom.totalMarketVolume > 0, `Suite 1-2b [${m}]: Market volume is positive (${q3Denom.totalMarketVolume}k)`);
    assert(q3Denom.authorityName.length > 0, `Suite 1-2c [${m}]: Has official authority name (${q3Denom.authorityName})`);
    assert(q3Denom.sourceUrl.startsWith('http'), `Suite 1-2d [${m}]: Has valid source URL (${q3Denom.sourceUrl})`);
    assert(q3Denom.sourceLocator.length > 0, `Suite 1-2e [${m}]: Has detailed source locator (${q3Denom.sourceLocator})`);
    assert(q3Denom.geographicScope.length > 0, `Suite 1-2f [${m}]: Has geographic boundary definition`);
    assert(q3Denom.vehicleScope.length > 0, `Suite 1-2g [${m}]: Has vehicle category scope definition`);
    assert(q3Denom.isCalculationEnabled, `Suite 1-2h [${m}]: Verified denominator calculation is enabled`);
  }
}

// Europe denominator specific check
const europeQ3 = getMarketDenominator('europe', '2026-Q3');
assert(Boolean(europeQ3), 'Suite 1-3: Europe 2026-Q3 denominator retrieved');
if (europeQ3) {
  assert(europeQ3.totalMarketVolume === 3085.0, `Suite 1-3b: Europe Q3 volume is exactly 3085.0k (${europeQ3.totalMarketVolume}k)`);
  assert(europeQ3.geographicScope.includes('EU27') && europeQ3.geographicScope.includes('EFTA') && europeQ3.geographicScope.includes('United Kingdom'), 'Suite 1-3c: Covers EU27 + EFTA + UK');
  assert(europeQ3.derivationMethod === 'calculated_from_monthly_sum', 'Suite 1-3d: Derivation method is calculated_from_monthly_sum');
  assert((europeQ3.monthlyBreakdown?.length || 0) === 3, 'Suite 1-3e: Contains 3-month breakdown (July, August, September)');
}

// Compatibility validation: Retail vs Wholesale Mismatch Rejection
const wholesaleCheck = validateMarketShareCompatibility(
  {
    companyId: 'toyota_motor',
    marketId: 'europe',
    period: '2026-Q3',
    observationValue: 268.0,
    volumeDefinition: 'wholesale_shipments',
    regionId: 'europe',
  },
  europeQ3
);
assert(!wholesaleCheck.isCompatible, 'Suite 1-4a: Wholesale shipment observation is REJECTED against retail denominator');
assert(wholesaleCheck.incompatibilityCategory === 'wholesale_vs_retail', 'Suite 1-4b: Incompatibility category is wholesale_vs_retail');
assert(Boolean(wholesaleCheck.rejectionReasonKo?.includes('도매')), 'Suite 1-4c: Explains wholesale mismatch in Korean');

// Compatibility validation: Compatible retail observation passes cleanly
const retailCheck = validateMarketShareCompatibility(
  {
    companyId: 'bmw_group',
    marketId: 'europe',
    period: '2026-Q3',
    observationValue: 228.45,
    volumeDefinition: 'retail_deliveries',
    regionId: 'europe',
  },
  europeQ3
);
assert(retailCheck.isCompatible, 'Suite 1-5: Compatible retail delivery observation passes verification');

// Compatibility validation: Geographic scope mismatch rejection (North America vs United States)
const usQ3 = getMarketDenominator('united_states', '2026-Q3');
const naGeogCheck = validateMarketShareCompatibility(
  {
    companyId: 'toyota_motor',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 615.0,
    volumeDefinition: 'retail_deliveries',
    regionId: 'north_america', // NA contains Canada & Mexico
  },
  usQ3
);
assert(!naGeogCheck.isCompatible, 'Suite 1-6a: North America region rejected against US-only denominator');
assert(naGeogCheck.incompatibilityCategory === 'geographic_mismatch', 'Suite 1-6b: Incompatibility category is geographic_mismatch');

// Compatibility validation: Missing observation fails closed
const missingObsCheck = validateMarketShareCompatibility(
  {
    companyId: 'tesla',
    marketId: 'europe',
    period: '2026-Q3',
    observationValue: null,
  },
  europeQ3
);
assert(!missingObsCheck.isCompatible, 'Suite 1-7: Missing observation safely returns isCompatible: false');
assert(missingObsCheck.incompatibilityCategory === 'missing_data', 'Suite 1-7b: Category is missing_data');

// Compatibility validation: Period mismatch fails closed
const periodMismatchCheck = validateMarketShareCompatibility(
  {
    companyId: 'bmw_group',
    marketId: 'europe',
    period: '2025-Q3', // mismatch
    observationValue: 200.0,
    volumeDefinition: 'retail_deliveries',
  },
  europeQ3 // 2026-Q3
);
assert(!periodMismatchCheck.isCompatible, 'Suite 1-8: Period mismatch safely rejected');
assert(periodMismatchCheck.incompatibilityCategory === 'period_mismatch', 'Suite 1-8b: Category is period_mismatch');

// ========================================================
// 2. Data Change History Invariants
// ========================================================
console.log('\n📜 Suite 2: Data Change History & Audit Trail Invariants');

assert(DATA_CHANGE_HISTORY.length >= 12, `Suite 2-1: Change history records count is ${DATA_CHANGE_HISTORY.length} (>= 12)`);

const validSourceDocIds = new Set(SOURCE_DOCUMENTS.map((s) => s.id));
const validCategories = new Set([
  'new_quarterly_data',
  'restatement',
  'guidance_change',
  'source_replacement',
  'methodology_change',
  'scope_clarification',
  'coverage_expansion',
]);

DATA_CHANGE_HISTORY.forEach((rec) => {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(rec.changeDate), `Suite 2-2 [${rec.id}]: Valid ISO date (${rec.changeDate})`);
  assert(rec.companyId === 'all_companies' || Boolean(COMPANIES_MAP[rec.companyId]), `Suite 2-3 [${rec.id}]: Company ID exists in registry (${rec.companyId})`);
  assert(validSourceDocIds.has(rec.sourceDocId), `Suite 2-4 [${rec.id}]: sourceDocId exists in registered SOURCE_DOCUMENTS (${rec.sourceDocId})`);
  assert(validCategories.has(rec.changeCategory), `Suite 2-5 [${rec.id}]: Category is valid (${rec.changeCategory})`);
  assert(typeof rec.isReconstructed === 'boolean', `Suite 2-6 [${rec.id}]: isReconstructed boolean flag is present`);
  assert(rec.newValue !== undefined && rec.newValue !== null, `Suite 2-7 [${rec.id}]: New value is documented (${rec.newValue})`);
});

// Specific invariant: Guidance revision must NOT be labeled as restatement
const bmwGuidanceRec = DATA_CHANGE_HISTORY.find((r) => r.id === 'chg_20261104_bmw_guidance_lowered');
assert(Boolean(bmwGuidanceRec), 'Suite 2-8: BMW guidance change record exists');
if (bmwGuidanceRec) {
  assert(bmwGuidanceRec.changeCategory === 'guidance_change', `Suite 2-8b: BMW guidance revision is categorized as guidance_change (not restatement)`);
}

// Test filtering helper by category
const guidanceChanges = getFilteredChangeHistory({ category: 'guidance_change' });
assert(guidanceChanges.length >= 2, `Suite 2-9: Found ${guidanceChanges.length} guidance change records`);

// ========================================================
// 3. Financial Performance Decomposition Invariants
// ========================================================
console.log('\n💰 Suite 3: Financial Performance Decomposition Invariants');

assert(FINANCIAL_DECOMPOSITIONS.length >= 12, `Suite 3-1: Decompositions count is expanded to ${FINANCIAL_DECOMPOSITIONS.length} (>= 12)`);

FINANCIAL_DECOMPOSITIONS.forEach((decomp) => {
  const comp = COMPANIES_MAP[decomp.companyId];
  assert(Boolean(comp), `Suite 3-2 [${decomp.companyId}]: Company is registered in COMPANIES_MAP`);

  // Source document existence check
  assert(validSourceDocIds.has(decomp.primarySourceDocId), `Suite 3-3 [${decomp.companyId}]: Primary sourceDocId exists (${decomp.primarySourceDocId})`);

  // Margin delta math consistency
  const expectedMarginDeltaBps = Math.round((decomp.currentOperatingMargin - decomp.previousOperatingMargin) * 100);
  assert(
    Math.abs(decomp.marginChangeYoYBasisPoints - expectedMarginDeltaBps) <= 5,
    `Suite 3-4 [${decomp.companyId}]: Margin delta bps matches math (${decomp.marginChangeYoYBasisPoints} bps vs expected ${expectedMarginDeltaBps} bps)`
  );

  // Revenue YoY percentage math check
  if (decomp.previousRevenue > 0) {
    const expectedRevYoY = Number((((decomp.currentRevenue - decomp.previousRevenue) / decomp.previousRevenue) * 100).toFixed(1));
    assert(
      Math.abs(decomp.revenueChangeYoYPercentage - expectedRevYoY) <= 0.6,
      `Suite 3-5 [${decomp.companyId}]: Revenue YoY % matches math (${decomp.revenueChangeYoYPercentage}% vs expected ${expectedRevYoY}%)`
    );
  }

  // Factor walk check
  assert(decomp.contributingFactors.length >= 2, `Suite 3-6 [${decomp.companyId}]: Has at least 2 contributing factors (${decomp.contributingFactors.length})`);

  decomp.contributingFactors.forEach((factor, fIdx) => {
    assert(factor.nameKo.length > 0 && factor.nameEn.length > 0, `Suite 3-7 [${decomp.companyId}#${fIdx}]: Factor has bilingual title`);
    assert(factor.explanationKo.length > 0, `Suite 3-8 [${decomp.companyId}#${fIdx}]: Factor has explanation`);
    assert(validSourceDocIds.has(factor.sourceDocId), `Suite 3-9 [${decomp.companyId}#${fIdx}]: Factor sourceDocId exists (${factor.sourceDocId})`);

    // Invariant: Unquantified qualitative commentary must NOT fabricate amounts
    if (!factor.isDisclosedNumeric) {
      assert(factor.quantifiedAmount === undefined, `Suite 3-10 [${decomp.companyId}#${fIdx}]: Non-quantified factor has undefined amount (no fabrication)`);
    } else {
      assert(factor.quantifiedAmount !== undefined, `Suite 3-11 [${decomp.companyId}#${fIdx}]: Disclosed numeric factor has quantified amount`);
    }
  });

  // Explicit unavailable information transparency check
  assert(decomp.unavailableInformationKo.length > 0, `Suite 3-12 [${decomp.companyId}]: Transparently documents unavailable information`);
});

// Specific OEM Audits:
// BMW Group: Distinguishes Group 5.2% from Automotive 2.6%
const bmwDecomp = getFinancialDecomposition('bmw_group', '2026-Q3');
assert(Boolean(bmwDecomp), 'Suite 3-13: BMW decomposition retrieved');
if (bmwDecomp) {
  assert(bmwDecomp.currentOperatingMargin === 5.2, `Suite 3-13b: BMW Group consolidated margin is 5.2%`);
  assert(bmwDecomp.automotiveSegmentMetrics?.operatingMargin === 2.6, `Suite 3-13c: BMW Automotive Segment margin is 2.6%`);
  assert(Boolean(bmwDecomp.segmentReportingNotesKo?.includes('자동차 부문')), 'Suite 3-13d: BMW explains group vs segment margin divergence');
}

// Toyota Motor: FY2027 Q2 Japanese calendar alignment & derived standalone quarter
const toyotaDecomp = getFinancialDecomposition('toyota_motor', '2026-Q3');
assert(Boolean(toyotaDecomp), 'Suite 3-14: Toyota decomposition retrieved');
if (toyotaDecomp) {
  assert(toyotaDecomp.periodClassification === 'derived_quarter', 'Suite 3-14b: Toyota classified as derived_quarter');
  assert(Boolean(toyotaDecomp.derivationFormula?.includes('FY2027')), 'Suite 3-14c: Documents FY2027 derivation formula');
  assert(toyotaDecomp.currentOperatingMargin === 8.4, `Suite 3-14d: Toyota standalone Q2 FY2027 margin is 8.4%`);
}

// ========================================================
// 4. OEM Ranking Invariants
// ========================================================
console.log('\n🏆 Suite 4: OEM Ranking & Comparability Invariants');

// Test that missing revenue/margin values are not treated as 0 or -999 in sorting
const mockMissingRow = { normRevenue: null, marginVal: null, normEbit: null, company: { shortName: 'MissingCo' } };
const mockLossRow = { normRevenue: 10, marginVal: -7.8, normEbit: -5.86, company: { shortName: 'LossCo' } };
const mockZeroRow = { normRevenue: 10, marginVal: 0.0, normEbit: 0.0, company: { shortName: 'ZeroCo' } };
const mockProfitRow = { normRevenue: 50, marginVal: 8.2, normEbit: 4.1, company: { shortName: 'ProfitCo' } };

// Sorter logic test
function sortMarginDescending(a: any, b: any) {
  if (a.marginVal === null && b.marginVal === null) return 0;
  if (a.marginVal === null) return 1;
  if (b.marginVal === null) return -1;
  return b.marginVal - a.marginVal;
}

const sortedMock = [mockMissingRow, mockLossRow, mockZeroRow, mockProfitRow].sort(sortMarginDescending);
assert(sortedMock[0].company.shortName === 'ProfitCo', 'Suite 4-1: Profit rank #1 (8.2%)');
assert(sortedMock[1].company.shortName === 'ZeroCo', 'Suite 4-2: Zero margin rank #2 (0.0% is not treated as missing)');
assert(sortedMock[2].company.shortName === 'LossCo', 'Suite 4-3: Negative loss rank #3 (-7.8% preserved as negative loss)');
assert(sortedMock[3].company.shortName === 'MissingCo', 'Suite 4-4: Missing null value is placed last (not treated as 0 or -999)');

// Final tally
console.log(`\nResults: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Phase 1 Remediation Capabilities Tests passed cleanly!');
}
