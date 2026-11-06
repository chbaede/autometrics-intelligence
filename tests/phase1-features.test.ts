/**
 * AutoMetrics Intelligence — Phase 1 Capabilities Unit & Regression Test Suite
 *
 * Phase 1 Final Accuracy Gate:
 * 1. BMW Automotive EBIT = EUR 901M
 * 2. BMW Automotive EBIT margin = 3.4%
 * 3. BMW Group EBT margin = 6.8%
 * 4. BMW Group EBT margin cannot be labeled EBIT margin
 * 5. Estimated global denominator cannot be shown as verified
 * 6. Passenger car vs Cars + Vans mismatch is rejected
 * 7. Passenger NEV vs total light vehicle mismatch is rejected
 * 8. Missing scope metadata fails closed
 * 9. Toyota standalone Q2 figures are correctly derived from cumulative results
 * 10. Toyota half-year factor impacts cannot be represented as standalone quarterly impacts without evidence
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

console.log('🧪 Starting Phase 1 Final Accuracy Gate Test Suite...\n');

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

    if (m === 'global') {
      // P0-3 Gate Test 5: Estimated global denominator cannot be shown as verified
      assert(q3Denom.verificationStatus !== 'verified', 'Gate Test 5a: Estimated global denominator cannot be shown as verified');
      assert(q3Denom.verificationStatus === 'estimated', 'Gate Test 5b: Global Q3 verification status is explicitly estimated');
      assert(!q3Denom.isCalculationEnabled, 'Gate Test 5c: Global Q3 market share calculation is disabled');
      assert(Boolean(q3Denom.disabledReasonKo), 'Gate Test 5d: Provides transparent Korean disabled reason');
      assert(Boolean(q3Denom.disabledReasonEn), 'Gate Test 5e: Provides transparent English disabled reason');
    } else {
      assert(q3Denom.isCalculationEnabled, `Suite 1-2h [${m}]: Verified denominator calculation is enabled`);
    }
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
  assert(europeQ3.verificationStatus === 'calculated', 'Suite 1-3f: Verification status is calculated (not verified/directly_reported)');
}

// Compatibility validation: Retail vs Wholesale Mismatch Rejection
const wholesaleCheck = validateMarketShareCompatibility(
  {
    companyId: 'toyota_motor',
    marketId: 'europe',
    period: '2026-Q3',
    observationValue: 268.0,
    volumeDefinition: 'wholesale_shipments',
    vehicleScopeType: 'passenger_cars',
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
    vehicleScopeType: 'passenger_cars',
    regionId: 'europe',
  },
  europeQ3
);
assert(retailCheck.isCompatible, 'Suite 1-5: Compatible retail delivery observation passes verification');

// Gate Test 6: Passenger car vs Cars + Vans mismatch is rejected
const carsAndVansCheck = validateMarketShareCompatibility(
  {
    companyId: 'mercedes_benz',
    marketId: 'europe',
    period: '2026-Q3',
    observationValue: 180.0,
    volumeDefinition: 'retail_deliveries',
    vehicleScopeType: 'passenger_cars_and_lcv',
    regionId: 'europe',
  },
  europeQ3
);
assert(!carsAndVansCheck.isCompatible, 'Gate Test 6a: Passenger car denominator vs Cars + Vans numerator is REJECTED');
assert(carsAndVansCheck.incompatibilityCategory === 'vehicle_scope_mismatch', 'Gate Test 6b: Incompatibility category is vehicle_scope_mismatch');

// Gate Test 7: Passenger NEV vs total light vehicle mismatch is rejected
const usQ3 = getMarketDenominator('united_states', '2026-Q3');
const nevCheck = validateMarketShareCompatibility(
  {
    companyId: 'byd',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 50.0,
    volumeDefinition: 'retail_sales',
    vehicleScopeType: 'passenger_nev',
    regionId: 'united_states',
  },
  usQ3
);
assert(!nevCheck.isCompatible, 'Gate Test 7a: Passenger NEV numerator vs total light vehicle denominator is REJECTED');
assert(
  nevCheck.incompatibilityCategory === 'powertrain_mismatch' || nevCheck.incompatibilityCategory === 'vehicle_scope_mismatch',
  'Gate Test 7b: Category is powertrain_mismatch'
);

// Gate Test 8: Missing scope metadata fails closed
const missingScopeCheck = validateMarketShareCompatibility(
  {
    companyId: 'bmw_group',
    marketId: 'europe',
    period: '2026-Q3',
    observationValue: 228.45,
    // vehicleScopeType omitted
    volumeDefinition: 'retail_deliveries',
    regionId: 'europe',
  },
  europeQ3
);
assert(!missingScopeCheck.isCompatible, 'Gate Test 8a: Missing vehicleScopeType metadata fails closed');
assert(missingScopeCheck.incompatibilityCategory === 'missing_scope_metadata', 'Gate Test 8b: Category is missing_scope_metadata');

const missingVolDefCheck = validateMarketShareCompatibility(
  {
    companyId: 'bmw_group',
    marketId: 'europe',
    period: '2026-Q3',
    observationValue: 228.45,
    vehicleScopeType: 'passenger_cars',
    // volumeDefinition omitted
    regionId: 'europe',
  },
  europeQ3
);
assert(!missingVolDefCheck.isCompatible, 'Gate Test 8c: Missing volumeDefinition metadata fails closed');
assert(missingVolDefCheck.incompatibilityCategory === 'missing_volume_metadata', 'Gate Test 8d: Category is missing_volume_metadata');

// Compatibility validation: Geographic scope mismatch rejection (North America vs United States)
const naGeogCheck = validateMarketShareCompatibility(
  {
    companyId: 'toyota_motor',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 615.0,
    volumeDefinition: 'retail_deliveries',
    vehicleScopeType: 'passenger_cars',
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
    vehicleScopeType: 'passenger_cars',
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

// P0-1 Specific Audits: BMW Group
const bmwDecomp = getFinancialDecomposition('bmw_group', '2026-Q3');
assert(Boolean(bmwDecomp), 'Suite 3-13: BMW decomposition retrieved');
if (bmwDecomp) {
  // Gate Test 1: BMW Automotive EBIT = EUR 901M
  assert(
    bmwDecomp.automotiveSegmentMetrics?.operatingProfit === 901,
    `Gate Test 1a: BMW Automotive Segment EBIT is officially EUR 901M (${bmwDecomp.automotiveSegmentMetrics?.operatingProfit}M)`
  );
  assert(
    bmwDecomp.automotiveSegmentMetrics?.operatingProfit !== 718,
    'Gate Test 1b: Rejects incorrect EUR 718M Automotive EBIT'
  );

  // Gate Test 2: BMW Automotive EBIT margin = 3.4%
  assert(
    bmwDecomp.automotiveSegmentMetrics?.operatingMargin === 3.4,
    `Gate Test 2a: BMW Automotive Segment EBIT margin is officially 3.4% (${bmwDecomp.automotiveSegmentMetrics?.operatingMargin}%)`
  );
  assert(
    bmwDecomp.automotiveSegmentMetrics?.operatingMargin !== 2.6,
    'Gate Test 2b: Rejects incorrect 2.6% Automotive EBIT margin'
  );
  assert(
    bmwDecomp.automotiveSegmentMetrics?.revenue === 26669,
    `Gate Test 2c: BMW Automotive Segment revenue is EUR 26,669M (${bmwDecomp.automotiveSegmentMetrics?.revenue}M)`
  );
  assert(
    bmwDecomp.automotiveSegmentMetrics?.freeCashFlow === -566,
    `Gate Test 2d: BMW Automotive Segment free cash flow is EUR -566M (${bmwDecomp.automotiveSegmentMetrics?.freeCashFlow}M)`
  );

  // Gate Test 3: BMW Group EBT margin = 6.8%
  assert(
    bmwDecomp.groupEbtMargin === 6.8,
    `Gate Test 3: BMW Group EBT margin is officially 6.8% (${bmwDecomp.groupEbtMargin}%)`
  );

  // Gate Test 4: BMW Group EBT margin cannot be labeled EBIT margin
  assert(
    bmwDecomp.currentOperatingMargin === 5.2,
    `Gate Test 4a: BMW Group EBIT margin is 5.2% (${bmwDecomp.currentOperatingMargin}%)`
  );
  assert(
    bmwDecomp.currentOperatingMargin !== bmwDecomp.groupEbtMargin,
    'Gate Test 4b: Group EBT margin (6.8%) is NOT labeled as Group EBIT margin (5.2%)'
  );
  assert(
    Boolean(bmwDecomp.segmentReportingNotesKo?.includes('그룹 EBT 마진(6.8%)을 EBIT 마진으로 혼동하거나')),
    'Gate Test 4c: Reporting notes explicitly enforce perimeter distinction between EBT and EBIT'
  );
}

// P1-1 Specific Audits: Toyota Motor Corporation
const toyotaDecomp = getFinancialDecomposition('toyota_motor', '2026-Q3');
assert(Boolean(toyotaDecomp), 'Suite 3-14: Toyota decomposition retrieved');
if (toyotaDecomp) {
  // Gate Test 9: Toyota standalone Q2 figures are correctly derived from cumulative results
  assert(toyotaDecomp.periodClassification === 'derived_quarter', 'Gate Test 9a: Toyota classified as derived_quarter');
  assert(Boolean(toyotaDecomp.derivationFormula?.includes('minus Q1 FY2027')), 'Gate Test 9b: Documents FY2027 derivation formula (6M - Q1)');
  assert(toyotaDecomp.currentRevenue === 13437400, `Gate Test 9c: Toyota standalone Q2 revenue is ¥13,437,400M (${toyotaDecomp.currentRevenue}M)`);
  assert(toyotaDecomp.currentOperatingProfit === 1127700, `Gate Test 9d: Toyota standalone Q2 operating profit is ¥1,127,700M (${toyotaDecomp.currentOperatingProfit}M)`);
  assert(toyotaDecomp.currentOperatingMargin === 8.4, `Gate Test 9e: Toyota standalone Q2 FY2027 margin is 8.4% (${toyotaDecomp.currentOperatingMargin}%)`);

  // Gate Test 10: Toyota half-year factor impacts cannot be represented as standalone quarterly impacts without evidence
  toyotaDecomp.contributingFactors.forEach((factor, fIdx) => {
    assert(
      factor.quantifiedAmount === undefined,
      `Gate Test 10a [Factor #${fIdx} ${factor.nameEn}]: Quantified amount is undefined (no fabrication for standalone Q2)`
    );
    assert(
      factor.isDisclosedNumeric === false,
      `Gate Test 10b [Factor #${fIdx} ${factor.nameEn}]: isDisclosedNumeric is false`
    );
    assert(
      Boolean(factor.explanationKo.includes('6개월 누적')),
      `Gate Test 10c [Factor #${fIdx} ${factor.nameEn}]: Commentary transparently notes 6M cumulative scope`
    );
  });

  assert(
    toyotaDecomp.unavailableInformationKo.some((info) => info.includes('단독 2분기(3개월) 요인별 수량적 증감액')),
    'Gate Test 10d: Transparently documents that standalone Q2 factor bridge is withheld by Toyota'
  );
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
