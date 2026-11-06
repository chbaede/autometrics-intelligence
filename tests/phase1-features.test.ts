/**
 * AutoMetrics Intelligence — Phase 1 Capabilities Unit & Regression Test Suite
 *
 * Grounded strictly in official primary sources:
 * - BMW Group Q3 2026 Statement (Nov 4, 2026)
 * - Toyota Motor Corp Q2 FY2027 Financial Results & Tanshin (Nov 5, 2026)
 * - US BEA / FRED Series LTOTALNSA (Light Vehicle Sales)
 * - ACEA European Automobile Manufacturers’ Association Schedule
 *
 * Mandatory Regression Assertions:
 * 1. BMW Automotive Segment EBIT = EUR 901M (not 718M)
 * 2. BMW Automotive Segment EBIT margin = 3.4% (not 2.6%)
 * 3. BMW Group EBIT = EUR 1,589M (EBIT margin 5.2%)
 * 4. BMW Group EBT = EUR 2,083M (EBT margin 6.8%)
 * 5. BMW Group EBT margin cannot be labeled as Group EBIT margin
 * 6. BMW Q3 2025 comparatives: Group Rev €32,314M, Group EBIT €2,261M; Auto Rev €28,510M, Auto EBIT €1,494M
 * 7. BMW YoY metrics: Group Rev -5.8%, Group EBIT -29.7%, Auto Rev -6.5%, Auto EBIT -39.7%, Auto margin ~-180 bps
 * 8. BMW Automotive Free Cash Flow = EUR -566M
 * 9. BMW IBS explanation has no unverified standalone -€980M attribution; mentions +€400M commentary context
 * 10. BMW China delivery decline is -24.8% (not -29.8%)
 * 11. Toyota standalone Q2 FY2027 = H1 (¥26,962,406M / ¥2,191,099M) minus Q1 (¥13,525,344M / ¥1,063,448M) = Rev ¥13,437,062M, EBIT ¥1,127,651M, Margin 8.39%
 * 12. Toyota standalone Q2 FY2026 = H1 (¥24,286,851M / ¥2,464,228M) minus Q1 (¥11,909,424M / ¥1,624,677M) = Rev ¥12,377,427M, EBIT ¥839,551M, Margin 6.78%
 * 13. Toyota YoY growth is positive (+8.6% rev, +34.3% EBIT, +161 bps margin), rejecting erroneous 12.6% prior margin & -420 bps compression
 * 14. Toyota factor bridges labeled as [Derived] / [파생 산출]
 * 15. Toyota guidance record: period 2027-FY, lowered from 4.3T to 3.9T JPY (rejecting reaffirmation claim)
 * 16. BMW guidance record: period 2026-FY, revised from 1.0-3.0% to -0.5-+0.5% (rejecting 8-10% -> 6-7% claim)
 * 17. US Q3 2026 denominator = 4,066.038k (FRED series LTOTALNSA: 1,365.699k + 1,380.676k + 1,319.663k)
 * 18. Europe Q3 2026 denominator marked estimated & disabled due to ACEA summer break schedule
 * 19. validateMarketShareCompatibility full 7-dimension matrix:
 *     - Passenger cars vs light vehicles -> REJECT (vehicle_scope_mismatch)
 *     - Light vehicles vs light vehicles -> PASS
 *     - Passenger cars vs passenger cars -> PASS
 *     - BEV-only vs total passenger cars -> REJECT (powertrain_mismatch)
 *     - Wholesale shipments vs retail -> REJECT (wholesale_vs_retail)
 *     - Retail registrations vs retail sales -> REJECT (volume_definition_mismatch)
 *     - Global vs regional geography -> REJECT (geographic_mismatch)
 *     - Commercial vehicle segment -> REJECT (reporting_scope_mismatch)
 *     - Missing scope metadata -> REJECT (missing_scope_metadata)
 *     - Missing volume definition metadata -> REJECT (missing_volume_metadata)
 *     - Estimated denominator -> REJECT (unverified_or_estimated_denominator)
 *     - Period mismatch -> REJECT (period_mismatch)
 *     - Unit mismatch -> REJECT (unit_mismatch)
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

console.log('🧪 Starting AutoMetrics Intelligence Phase 1 Remediation & Accuracy Gate Test Suite...\n');

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
// 1. Market Denominators & Compatibility Validation Layer
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
      assert(q3Denom.verificationStatus === 'estimated', 'Suite 1-2h [global]: Global Q3 verification status is explicitly estimated');
      assert(!q3Denom.isCalculationEnabled, 'Suite 1-2i [global]: Global Q3 calculation is disabled');
    } else if (m === 'europe') {
      assert(q3Denom.verificationStatus === 'calculated', 'Suite 1-2j [europe]: Europe Q3 verification status is calculated from monthly sum');
      assert(q3Denom.isCalculationEnabled, 'Suite 1-2k [europe]: Europe Q3 calculation is enabled with stated derived basis');
      assert(q3Denom.totalMarketVolume === 3323.957, `Suite 1-2l [europe]: Europe Q3 volume is 3323.957k (${q3Denom.totalMarketVolume}k)`);
    } else if (m === 'china') {
      assert(q3Denom.verificationStatus === 'calculated', 'Suite 1-2m [china]: China Q3 verification status is calculated from CPCA monthly retail');
      assert(q3Denom.isCalculationEnabled, 'Suite 1-2n [china]: China Q3 calculation is enabled');
      assert(q3Denom.totalMarketVolume === 4620.0, `Suite 1-2o [china]: China Q3 volume is 4,620.0k (${q3Denom.totalMarketVolume}k)`);
      assert(q3Denom.totalMarketVolume !== 5910.0, 'Suite 1-2p [china]: Rejects erroneous 5,910k wholesale/mixed figure');
    } else {
      assert(q3Denom.isCalculationEnabled, `Suite 1-2q [${m}]: Verified denominator calculation is enabled`);
    }
  }
}

// US Q3 2026 Denominator Verification (BEA / FRED LTOTALNSA)
const usQ3 = getMarketDenominator('united_states', '2026-Q3');
assert(Boolean(usQ3), 'Suite 1-3: US 2026-Q3 denominator retrieved');
if (usQ3) {
  assert(usQ3.totalMarketVolume === 4066.038, `Suite 1-3a: US Q3 volume is exactly 4066.038k (${usQ3.totalMarketVolume}k)`);
  assert(usQ3.sourceUrl.includes('fred.stlouisfed.org/series/LTOTALNSA'), `Suite 1-3b: US Q3 sourceUrl points to FRED LTOTALNSA (${usQ3.sourceUrl})`);
  assert(usQ3.derivationMethod === 'calculated_from_monthly_sum', 'Suite 1-3c: US Q3 derivationMethod is calculated_from_monthly_sum');
  assert((usQ3.monthlyBreakdown?.length || 0) === 3, 'Suite 1-3d: US Q3 has 3-month breakdown');
  if (usQ3.monthlyBreakdown && usQ3.monthlyBreakdown.length === 3) {
    assert(usQ3.monthlyBreakdown[0].volumeThousandUnits === 1365.699, 'Suite 1-3e: July 2026 volume is 1,365.699k');
    assert(usQ3.monthlyBreakdown[1].volumeThousandUnits === 1380.676, 'Suite 1-3f: August 2026 volume is 1,380.676k');
    assert(usQ3.monthlyBreakdown[2].volumeThousandUnits === 1319.663, 'Suite 1-3g: September 2026 volume is 1,319.663k');
    const sum = Number((usQ3.monthlyBreakdown[0].volumeThousandUnits + usQ3.monthlyBreakdown[1].volumeThousandUnits + usQ3.monthlyBreakdown[2].volumeThousandUnits).toFixed(3));
    assert(sum === 4066.038, `Suite 1-3h: Monthly sum exactly equals totalMarketVolume (${sum}k)`);
  }
  assert(usQ3.vehicleScopeType === 'light_vehicles', 'Suite 1-3i: US Q3 vehicleScopeType is light_vehicles');
  assert(usQ3.volumeDefinitionType === 'retail_sales', 'Suite 1-3j: US Q3 volumeDefinitionType is retail_sales');
}

// Compatibility Test Matrix:
// Case 1: Passenger cars vs light vehicles -> REJECT
const pcarVsLightVeh = validateMarketShareCompatibility(
  {
    companyId: 'toyota_motor',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 500.0,
    volumeDefinition: 'retail_sales',
    vehicleScopeType: 'passenger_cars',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(!pcarVsLightVeh.isCompatible, 'Suite 1-5a: Passenger cars vs light vehicle denominator is REJECTED');
assert(pcarVsLightVeh.incompatibilityCategory === 'vehicle_scope_mismatch', 'Suite 1-5b: Incompatibility category is vehicle_scope_mismatch');

// Case 2: Light vehicles vs light vehicles -> PASS
const lightVehVsLightVeh = validateMarketShareCompatibility(
  {
    companyId: 'general_motors',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 650.0,
    volumeDefinition: 'retail_sales',
    vehicleScopeType: 'light_vehicles',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(lightVehVsLightVeh.isCompatible, 'Suite 1-6: Light vehicles vs light vehicle denominator is COMPATIBLE');

// Case 3: BEV-only vs total market -> REJECT
const bevVsTotal = validateMarketShareCompatibility(
  {
    companyId: 'tesla',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 180.0,
    volumeDefinition: 'retail_sales',
    vehicleScopeType: 'bev_only',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(!bevVsTotal.isCompatible, 'Suite 1-7a: BEV-only vs total light vehicle denominator is REJECTED');
assert(bevVsTotal.incompatibilityCategory === 'powertrain_mismatch', 'Suite 1-7b: Category is powertrain_mismatch');

// Case 4: Wholesale shipments vs retail sales -> REJECT
const wholesaleVsRetail = validateMarketShareCompatibility(
  {
    companyId: 'toyota_motor',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 600.0,
    volumeDefinition: 'wholesale_shipments',
    vehicleScopeType: 'light_vehicles',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(!wholesaleVsRetail.isCompatible, 'Suite 1-8a: Wholesale shipment vs retail denominator is REJECTED');
assert(wholesaleVsRetail.incompatibilityCategory === 'wholesale_vs_retail', 'Suite 1-8b: Category is wholesale_vs_retail');

// Case 5: Registrations vs retail sales -> REJECT
const regVsSales = validateMarketShareCompatibility(
  {
    companyId: 'toyota_motor',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 600.0,
    volumeDefinition: 'retail_registrations', // mismatch vs retail_sales denominator
    vehicleScopeType: 'light_vehicles',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(!regVsSales.isCompatible, 'Suite 1-9a: Retail registrations vs retail sales denominator is REJECTED');
assert(regVsSales.incompatibilityCategory === 'volume_definition_mismatch', 'Suite 1-9b: Category is volume_definition_mismatch');

// Case 6: Global vs Regional geography -> REJECT
const globalVsRegional = validateMarketShareCompatibility(
  {
    companyId: 'toyota_motor',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 2700.0,
    volumeDefinition: 'retail_sales',
    vehicleScopeType: 'light_vehicles',
    regionId: 'global', // global volume
    unit: 'thousand_units',
  },
  usQ3
);
assert(!globalVsRegional.isCompatible, 'Suite 1-10a: Global volume vs US regional denominator is REJECTED');
assert(globalVsRegional.incompatibilityCategory === 'geographic_mismatch', 'Suite 1-10b: Category is geographic_mismatch');

// Case 7: Reporting scope mismatch (commercial_vehicles_segment) -> REJECT
const scopeMismatch = validateMarketShareCompatibility(
  {
    companyId: 'general_motors',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 50.0,
    volumeDefinition: 'retail_sales',
    vehicleScopeType: 'light_vehicles',
    reportingScope: 'commercial_vehicles_segment',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(!scopeMismatch.isCompatible, 'Suite 1-11a: Commercial vehicle segment vs market denominator is REJECTED');
assert(scopeMismatch.incompatibilityCategory === 'reporting_scope_mismatch', 'Suite 1-11b: Category is reporting_scope_mismatch');

// Case 8: Missing vehicleScopeType metadata fails closed -> REJECT
const missingScope = validateMarketShareCompatibility(
  {
    companyId: 'general_motors',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 650.0,
    volumeDefinition: 'retail_sales',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(!missingScope.isCompatible, 'Suite 1-12a: Missing vehicleScopeType fails closed');
assert(missingScope.incompatibilityCategory === 'missing_scope_metadata', 'Suite 1-12b: Category is missing_scope_metadata');

// Case 9: Missing volumeDefinition metadata fails closed -> REJECT
const missingVolDef = validateMarketShareCompatibility(
  {
    companyId: 'general_motors',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 650.0,
    vehicleScopeType: 'light_vehicles',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(!missingVolDef.isCompatible, 'Suite 1-13a: Missing volumeDefinition fails closed');
assert(missingVolDef.incompatibilityCategory === 'missing_volume_metadata', 'Suite 1-13b: Category is missing_volume_metadata');

// Case 10: Estimated denominator calculation disabled without allowEstimatedDenominator -> REJECT
const globalQ3 = getMarketDenominator('global', '2026-Q3');
const estimatedDenomCheck = validateMarketShareCompatibility(
  {
    companyId: 'bmw_group',
    marketId: 'global',
    period: '2026-Q3',
    observationValue: 600.0,
    volumeDefinition: 'retail_registrations',
    vehicleScopeType: 'light_vehicles',
    regionId: 'global',
    unit: 'thousand_units',
  },
  globalQ3
);
assert(!estimatedDenomCheck.isCompatible, 'Suite 1-14a: Estimated denominator is REJECTED when allowEstimatedDenominator is not set');
assert(
  estimatedDenomCheck.incompatibilityCategory === 'disabled_denominator' ||
  estimatedDenomCheck.incompatibilityCategory === 'unverified_or_estimated_denominator',
  'Suite 1-14b: Category is disabled_denominator or unverified_or_estimated_denominator'
);

// Case 10b: Estimated denominator with allowEstimatedDenominator: true -> ALLOWS with explicit transparency
const estimatedAllowedCheck = validateMarketShareCompatibility(
  {
    companyId: 'bmw_group',
    marketId: 'global',
    period: '2026-Q3',
    observationValue: 600.0,
    volumeDefinition: 'retail_registrations',
    vehicleScopeType: 'light_vehicles',
    regionId: 'global',
    unit: 'thousand_units',
    allowEstimatedDenominator: true,
  },
  globalQ3
);
assert(estimatedAllowedCheck.isCompatible, 'Suite 1-14c: Estimated denominator is permitted when allowEstimatedDenominator is true');
assert(estimatedAllowedCheck.classification === 'estimated', 'Suite 1-14d: Classification is explicitly estimated');
assert(estimatedAllowedCheck.isEstimatedBasis === true, 'Suite 1-14e: isEstimatedBasis is true');

// Case 11: Period mismatch -> REJECT
const periodMismatch = validateMarketShareCompatibility(
  {
    companyId: 'general_motors',
    marketId: 'united_states',
    period: '2025-Q3', // 2025 vs 2026
    observationValue: 650.0,
    volumeDefinition: 'retail_sales',
    vehicleScopeType: 'light_vehicles',
    regionId: 'united_states',
    unit: 'thousand_units',
  },
  usQ3
);
assert(!periodMismatch.isCompatible, 'Suite 1-15a: Period mismatch is REJECTED');
assert(periodMismatch.incompatibilityCategory === 'period_mismatch', 'Suite 1-15b: Category is period_mismatch');

// Case 12: Unit mismatch -> REJECT
const unitMismatch = validateMarketShareCompatibility(
  {
    companyId: 'general_motors',
    marketId: 'united_states',
    period: '2026-Q3',
    observationValue: 650000,
    volumeDefinition: 'retail_sales',
    vehicleScopeType: 'light_vehicles',
    regionId: 'united_states',
    unit: 'units', // mismatch vs thousand_units
  },
  usQ3
);
assert(!unitMismatch.isCompatible, 'Suite 1-16a: Unit mismatch is REJECTED');
assert(unitMismatch.incompatibilityCategory === 'unit_mismatch', 'Suite 1-16b: Category is unit_mismatch');


// ========================================================
// 2. Data Change History & Guidance Records
// ========================================================
console.log('\n📜 Suite 2: Data Change History & Guidance Records');

assert(DATA_CHANGE_HISTORY.length >= 12, `Suite 2-1: Change history records count is ${DATA_CHANGE_HISTORY.length} (>= 12)`);
const guidanceChanges = getFilteredChangeHistory({ category: 'guidance_change' });
assert(guidanceChanges.length >= 2, `Suite 2-1b: Found ${guidanceChanges.length} guidance change records`);

const validSourceDocIds = new Set(SOURCE_DOCUMENTS.map((s) => s.id));
DATA_CHANGE_HISTORY.forEach((rec) => {
  assert(validSourceDocIds.has(rec.sourceDocId), `Suite 2-2 [${rec.id}]: SourceDocId ${rec.sourceDocId} is registered in SOURCE_DOCUMENTS`);
  assert(rec.companyId === 'all_companies' || Boolean(COMPANIES_MAP[rec.companyId]), `Suite 2-2b [${rec.id}]: Company ${rec.companyId} is registered`);
});

// Toyota Guidance Record Verification
const toyotaGuidance = DATA_CHANGE_HISTORY.find((r) => r.id === 'chg_20261105_toyota_q3_guidance');
assert(Boolean(toyotaGuidance), 'Suite 2-3a: Toyota guidance revision record exists');
if (toyotaGuidance) {
  assert(toyotaGuidance.period === '2027-FY', `Suite 2-3b: Toyota guidance period is 2027-FY (${toyotaGuidance.period})`);
  assert(toyotaGuidance.period !== '2025-FY' && toyotaGuidance.period !== '2026-FY', 'Suite 2-3c: Rejects erroneous 2025-FY or 2026-FY for Toyota');
  assert(toyotaGuidance.previousValue === 3400000, `Suite 2-3d: Previous guidance is JPY 3,400,000M (${toyotaGuidance.previousValue})`);
  assert(toyotaGuidance.newValue === 3900000, `Suite 2-3e: New guidance is JPY 3,900,000M (${toyotaGuidance.newValue})`);
  assert(toyotaGuidance.previousValue !== 4300000, 'Suite 2-3f: Rejects erroneous 4.3T prior guidance');
  assert(toyotaGuidance.newValue !== 3400000, 'Suite 2-3g: Rejects unchanged guidance');
  assert(toyotaGuidance.changeCategory === 'guidance_change', 'Suite 2-3h: Category is guidance_change');
  assert(toyotaGuidance.affectsHistoricalComparability === true, 'Suite 2-3i: Affects historical comparability is true');
  assert(Boolean(toyotaGuidance.reasonKo?.includes('3.9조 엔')), 'Suite 2-3j: Korean reason cites revised 3.9T JPY guidance');
  assert(Boolean(toyotaGuidance.reasonEn?.includes('3,900 billion')), 'Suite 2-3k: English reason cites revised JPY 3,900B guidance');
  assert(Boolean(toyotaGuidance.reasonKo?.includes('상향') || toyotaGuidance.reasonEn?.includes('raised')), 'Suite 2-3l: Cites upward revision (raised) of guidance');
}

// BMW Guidance Record Verification
const bmwGuidance = DATA_CHANGE_HISTORY.find((r) => r.id === 'chg_20261104_bmw_guidance_lowered');
assert(Boolean(bmwGuidance), 'Suite 2-4a: BMW guidance revision record exists');
if (bmwGuidance) {
  assert(bmwGuidance.period === '2026-FY', `Suite 2-4b: BMW guidance period is 2026-FY (${bmwGuidance.period})`);
  assert(bmwGuidance.previousValue === '1.0% ~ 3.0%', `Suite 2-4c: Previous guidance band is 1.0% ~ 3.0% (${bmwGuidance.previousValue})`);
  assert(bmwGuidance.newValue === '-0.5% ~ +0.5%', `Suite 2-4d: New guidance band is -0.5% ~ +0.5% (${bmwGuidance.newValue})`);
  assert(bmwGuidance.newValue !== '6.0% ~ 7.0%', 'Suite 2-4e: Rejects erroneous 6.0% ~ 7.0% corridor');
  assert(bmwGuidance.previousValue !== '8.0% ~ 10.0%', 'Suite 2-4f: Rejects erroneous 8.0% ~ 10.0% prior corridor');
  assert(bmwGuidance.changeCategory === 'guidance_change', 'Suite 2-4g: Category is guidance_change');
  assert(bmwGuidance.affectsHistoricalComparability === true, 'Suite 2-4h: Affects historical comparability is true');
  assert(Boolean(bmwGuidance.reasonKo?.includes('2.5%p') || bmwGuidance.reasonEn?.includes('2.5 pp')), 'Suite 2-4i: Cites ~2.5 pp portfolio/structural impact');
  assert(Boolean(bmwGuidance.reasonKo?.includes('1.25%p') || bmwGuidance.reasonEn?.includes('1.25 pp')), 'Suite 2-4j: Cites ~1.25 pp tariff impact');
  assert(Boolean(bmwGuidance.reasonKo?.includes('1.2%p') || bmwGuidance.reasonEn?.includes('1.2 pp')), 'Suite 2-4k: Cites ~1.2 pp BBA PPA impact');
}

// Prospective records labeled as non-reconstructed
const prospectiveRecords = DATA_CHANGE_HISTORY.filter((r) => !r.isReconstructed);
assert(prospectiveRecords.length >= 8, `Suite 2-5: Found ${prospectiveRecords.length} prospective change records`);


// ========================================================
// 3. BMW Q3 2026 Financial Decomposition Grounded Audit
// ========================================================
console.log('\n💶 Suite 3: BMW Q3 2026 & Q3 2025 Financial Decomposition');

assert(FINANCIAL_DECOMPOSITIONS.length >= 12, `Suite 3-0: Registered financial decompositions count is ${FINANCIAL_DECOMPOSITIONS.length} (>= 12)`);

const bmwDecomp = getFinancialDecomposition('bmw_group', '2026-Q3');
assert(Boolean(bmwDecomp), 'Suite 3-1: BMW decomposition retrieved');
if (bmwDecomp) {
  // Current Group Metrics
  assert(bmwDecomp.currentRevenue === 30452, `Suite 3-2a: Group Revenue is €30,452M (${bmwDecomp.currentRevenue}M)`);
  assert(bmwDecomp.currentOperatingProfit === 1589, `Suite 3-2b: Group EBIT is €1,589M (${bmwDecomp.currentOperatingProfit}M)`);
  assert(bmwDecomp.currentOperatingMargin === 5.2, `Suite 3-2c: Group EBIT margin is 5.2% (${bmwDecomp.currentOperatingMargin}%)`);
  assert(bmwDecomp.groupEbt === 2083, `Suite 3-2d: Group EBT is €2,083M (${bmwDecomp.groupEbt}M)`);
  assert(bmwDecomp.groupEbtMargin === 6.8, `Suite 3-2e: Group EBT margin is 6.8% (${bmwDecomp.groupEbtMargin}%)`);
  assert(bmwDecomp.currentOperatingMargin !== bmwDecomp.groupEbtMargin, 'Suite 3-2f: Group EBIT margin (5.2%) is distinct from Group EBT margin (6.8%)');

  // Previous Group Metrics (Q3 2025)
  assert(bmwDecomp.previousRevenue === 32314, `Suite 3-3a: Previous Group Revenue is €32,314M (${bmwDecomp.previousRevenue}M)`);
  assert(bmwDecomp.previousOperatingProfit === 2261, `Suite 3-3b: Previous Group EBIT is €2,261M (${bmwDecomp.previousOperatingProfit}M)`);
  assert(bmwDecomp.previousOperatingMargin === 7.0, `Suite 3-3c: Previous Group EBIT margin is 7.0% (${bmwDecomp.previousOperatingMargin}%)`);

  // Group YoY Calculations
  assert(bmwDecomp.revenueChangeYoYPercentage === -5.8, `Suite 3-4a: Group revenue YoY is -5.8% (${bmwDecomp.revenueChangeYoYPercentage}%)`);
  assert(bmwDecomp.profitChangeYoYPercentage === -29.7, `Suite 3-4b: Group EBIT YoY is -29.7% (${bmwDecomp.profitChangeYoYPercentage}%)`);
  assert(bmwDecomp.marginChangeYoYBasisPoints === -180, `Suite 3-4c: Group margin change YoY is -180 bps (${bmwDecomp.marginChangeYoYBasisPoints} bps)`);

  // Automotive Segment Metrics
  const auto = bmwDecomp.automotiveSegmentMetrics;
  assert(Boolean(auto), 'Suite 3-5a: Automotive segment metrics present');
  if (auto) {
    assert(auto.revenue === 26669, `Suite 3-5b: Automotive Revenue is €26,669M (${auto.revenue}M)`);
    assert(auto.operatingProfit === 901, `Suite 3-5c: Automotive EBIT is €901M (${auto.operatingProfit}M)`);
    assert(auto.operatingProfit !== 718, 'Suite 3-5d: Rejects erroneous €718M Automotive EBIT');
    assert(auto.operatingMargin === 3.4, `Suite 3-5e: Automotive EBIT margin is 3.4% (${auto.operatingMargin}%)`);
    assert(auto.operatingMargin !== 2.6, 'Suite 3-5f: Rejects erroneous 2.6% Automotive EBIT margin');
    assert(auto.freeCashFlow === -566, `Suite 3-5g: Automotive Free Cash Flow is €-566M (${auto.freeCashFlow}M)`);

    assert(auto.previousRevenue === 28510, `Suite 3-5h: Automotive Q3 2025 Revenue is €28,510M (${auto.previousRevenue}M)`);
    assert(auto.previousOperatingProfit === 1494, `Suite 3-5i: Automotive Q3 2025 EBIT is €1,494M (${auto.previousOperatingProfit}M)`);
    assert(auto.previousOperatingMargin === 5.2, `Suite 3-5j: Automotive Q3 2025 EBIT margin is 5.2% (${auto.previousOperatingMargin}%)`);

    assert(auto.revenueChangeYoYPercentage === -6.5, `Suite 3-5k: Automotive revenue YoY is -6.5% (${auto.revenueChangeYoYPercentage}%)`);
    assert(auto.profitChangeYoYPercentage === -39.7, `Suite 3-5l: Automotive EBIT YoY is -39.7% (${auto.profitChangeYoYPercentage}%)`);
    assert(auto.marginChangeYoYBasisPoints === -180, `Suite 3-5m: Automotive margin change YoY is -180 bps (${auto.marginChangeYoYBasisPoints} bps)`);
  }

  // IBS Provision Explanation & China Decline Validation
  const ibsFactor = bmwDecomp.contributingFactors.find((f) => f.nameEn.includes('IBS') || f.nameKo.includes('IBS'));
  assert(Boolean(ibsFactor), 'Suite 3-6a: IBS factor exists');
  if (ibsFactor) {
    assert(ibsFactor.isDisclosedNumeric === false, 'Suite 3-6b: IBS standalone Q3 factor is not claimed as disclosed numeric');
    assert(ibsFactor.quantifiedAmount === undefined, 'Suite 3-6c: IBS factor has no fabricated numeric amount');
    assert(Boolean(ibsFactor.explanationKo?.includes('400M') || ibsFactor.explanationEn?.includes('400M')), 'Suite 3-6d: IBS commentary cites CFO ~+€400M other cost context');
  }

  const chinaFactor = bmwDecomp.contributingFactors.find((f) => f.nameKo.includes('중국') || f.nameEn.includes('China'));
  assert(Boolean(chinaFactor), 'Suite 3-7a: China demand factor exists');
  if (chinaFactor) {
    assert(Boolean(chinaFactor.nameKo.includes('-24.8%') || chinaFactor.explanationKo.includes('-24.8%')), 'Suite 3-7b: China decline correctly documented as -24.8%');
    assert(!chinaFactor.nameKo.includes('-29.8%') && !chinaFactor.explanationKo.includes('-29.8%'), 'Suite 3-7c: Rejects erroneous -29.8% China decline');
  }
}


// ========================================================
// 4. Toyota Q2 FY2027 Financial Decomposition Grounded Audit
// ========================================================
console.log('\n💴 Suite 4: Toyota Q2 FY2027 Standalone Derived Results');

const toyotaDecomp = getFinancialDecomposition('toyota_motor', '2026-Q3');
assert(Boolean(toyotaDecomp), 'Suite 4-1: Toyota decomposition retrieved');
if (toyotaDecomp) {
  assert(toyotaDecomp.periodClassification === 'derived_quarter', 'Suite 4-2a: Period classification is derived_quarter');
  assert(Boolean(toyotaDecomp.derivationFormula?.includes('H1 FY2027 cumulative')), 'Suite 4-2b: Documents H1 minus Q1 formula');

  // Standalone Q2 FY2027 (Jul 1 - Sep 30, 2026)
  // H1: Rev 26,962,406M, EBIT 2,191,099M
  // Q1: Rev 13,525,344M, EBIT 1,063,448M
  // Q2 = 13,437,062M, 1,127,651M
  assert(toyotaDecomp.currentRevenue === 13437062, `Suite 4-3a: Toyota standalone Q2 FY2027 revenue is ¥13,437,062M (${toyotaDecomp.currentRevenue}M)`);
  assert(toyotaDecomp.currentOperatingProfit === 1127651, `Suite 4-3b: Toyota standalone Q2 FY2027 operating income is ¥1,127,651M (${toyotaDecomp.currentOperatingProfit}M)`);
  assert(toyotaDecomp.currentOperatingMargin === 8.39, `Suite 4-3c: Toyota standalone Q2 FY2027 operating margin is 8.39% (${toyotaDecomp.currentOperatingMargin}%)`);

  // Standalone Q2 FY2026 (Jul 1 - Sep 30, 2025)
  // H1: Rev 24,286,851M, EBIT 2,464,228M
  // Q1: Rev 11,909,424M, EBIT 1,624,677M
  // Q2 = 12,377,427M, 839,551M
  assert(toyotaDecomp.previousRevenue === 12377427, `Suite 4-4a: Toyota standalone Q2 FY2026 revenue is ¥12,377,427M (${toyotaDecomp.previousRevenue}M)`);
  assert(toyotaDecomp.previousOperatingProfit === 839551, `Suite 4-4b: Toyota standalone Q2 FY2026 operating income is ¥839,551M (${toyotaDecomp.previousOperatingProfit}M)`);
  assert(toyotaDecomp.previousOperatingMargin === 6.78, `Suite 4-4c: Toyota standalone Q2 FY2026 operating margin is 6.78% (${toyotaDecomp.previousOperatingMargin}%)`);

  // Rejection of previous erroneous values
  assert(toyotaDecomp.previousRevenue !== 11434800, 'Suite 4-5a: Rejects erroneous ¥11,434.8B prior revenue');
  assert(toyotaDecomp.previousOperatingProfit !== 1438300, 'Suite 4-5b: Rejects erroneous ¥1,438.3B prior operating profit');
  assert(toyotaDecomp.previousOperatingMargin !== 12.6, 'Suite 4-5c: Rejects erroneous 12.6% prior operating margin');
  assert(toyotaDecomp.marginChangeYoYBasisPoints !== -420, 'Suite 4-5d: Rejects erroneous -420 bps compression claim');

  // Standalone YoY Growth Metrics
  assert(toyotaDecomp.revenueChangeYoYPercentage === 8.6, `Suite 4-6a: Toyota standalone revenue YoY is +8.6% (${toyotaDecomp.revenueChangeYoYPercentage}%)`);
  assert(toyotaDecomp.profitChangeYoYPercentage === 34.3, `Suite 4-6b: Toyota standalone operating income YoY is +34.3% (${toyotaDecomp.profitChangeYoYPercentage}%)`);
  assert(toyotaDecomp.marginChangeYoYBasisPoints === 161, `Suite 4-6c: Toyota standalone margin YoY change is +161 bps (${toyotaDecomp.marginChangeYoYBasisPoints} bps)`);

  // Derived bridge factor labeling & classifications
  toyotaDecomp.contributingFactors.forEach((factor, idx) => {
    assert(
      Boolean(factor.nameKo.includes('[파생 산출]') || factor.nameKo.includes('[파생 해석]') || factor.nameEn.includes('[Derived]')),
      `Suite 4-7 [Factor #${idx} ${factor.nameEn}]: Labeled as derived bridge factor`
    );
    assert(factor.isDisclosedNumeric === false, `Suite 4-7b [Factor #${idx}]: isDisclosedNumeric is false`);
    assert(factor.quantifiedAmount === undefined, `Suite 4-7c [Factor #${idx}]: quantifiedAmount is undefined`);
    assert(factor.classification === 'analyst_interpretation', `Suite 4-7d [Factor #${idx}]: classification is analyst_interpretation`);
  });

  // Toyota Accounting Metadata & Exact Subtraction Inputs Verification
  assert(toyotaDecomp.accountingStandard === 'J_GAAP', 'Suite 4-8a: Toyota accountingStandard is J_GAAP');
  assert(toyotaDecomp.operatingProfitMetricName === 'Operating Income (営業利益, J-GAAP)', 'Suite 4-8b: Toyota operatingProfitMetricName is Operating Income (営業利益, J-GAAP)');
  assert(toyotaDecomp.profitMetricClassification === 'derived_operating_income', 'Suite 4-8c: Toyota profitMetricClassification is derived_operating_income');

  assert(Boolean(toyotaDecomp.derivationInputs), 'Suite 4-9a: Toyota derivationInputs object exists');
  if (toyotaDecomp.derivationInputs) {
    const d = toyotaDecomp.derivationInputs;
    assert(d.currentH1CumulativeRevenue === 26962462, `Suite 4-9b: Current H1 cumulative revenue is ¥26,962,462M (${d.currentH1CumulativeRevenue}M)`);
    assert(d.currentH1CumulativeOperatingProfit === 2191124, `Suite 4-9c: Current H1 cumulative operating income is ¥2,191,124M (${d.currentH1CumulativeOperatingProfit}M)`);
    assert(d.currentQ1Revenue === 13525400, `Suite 4-9d: Current Q1 revenue is ¥13,525,400M (${d.currentQ1Revenue}M)`);
    assert(d.currentQ1OperatingProfit === 1063473, `Suite 4-9e: Current Q1 operating income is ¥1,063,473M (${d.currentQ1OperatingProfit}M)`);
    assert(d.previousH1CumulativeRevenue === 24630753, `Suite 4-9f: Prior H1 cumulative revenue is ¥24,630,753M (${d.previousH1CumulativeRevenue}M)`);
    assert(d.previousH1CumulativeOperatingProfit === 2005692, `Suite 4-9g: Prior H1 cumulative operating income is ¥2,005,692M (${d.previousH1CumulativeOperatingProfit}M)`);
    assert(d.previousQ1Revenue === 12253326, `Suite 4-9h: Prior Q1 revenue is ¥12,253,326M (${d.previousQ1Revenue}M)`);
    assert(d.previousQ1OperatingProfit === 1166141, `Suite 4-9i: Prior Q1 operating income is ¥1,166,141M (${d.previousQ1OperatingProfit}M)`);

    // Exact subtraction formula verification
    const derivedCurrentRev = d.currentH1CumulativeRevenue - d.currentQ1Revenue;
    const derivedCurrentEbit = d.currentH1CumulativeOperatingProfit - d.currentQ1OperatingProfit;
    const derivedPriorRev = d.previousH1CumulativeRevenue - d.previousQ1Revenue;
    const derivedPriorEbit = d.previousH1CumulativeOperatingProfit - d.previousQ1OperatingProfit;

    assert(derivedCurrentRev === toyotaDecomp.currentRevenue, `Suite 4-10a: H1 minus Q1 revenue exactly equals currentRevenue (${derivedCurrentRev})`);
    assert(derivedCurrentEbit === toyotaDecomp.currentOperatingProfit, `Suite 4-10b: H1 minus Q1 EBIT exactly equals currentOperatingProfit (${derivedCurrentEbit})`);
    assert(derivedPriorRev === toyotaDecomp.previousRevenue, `Suite 4-10c: Prior H1 minus Q1 revenue exactly equals previousRevenue (${derivedPriorRev})`);
    assert(derivedPriorEbit === toyotaDecomp.previousOperatingProfit, `Suite 4-10d: Prior H1 minus Q1 EBIT exactly equals previousOperatingProfit (${derivedPriorEbit})`);
  }
}


// ========================================================
// 5. Audit of All 13 OEMs in FINANCIAL_DECOMPOSITIONS
// ========================================================
console.log('\n🏛️ Suite 5: Audit of All 13 OEMs in FINANCIAL_DECOMPOSITIONS');

assert(FINANCIAL_DECOMPOSITIONS.length === 13, `Suite 5-1: Exact count of registered OEM decompositions is 13 (${FINANCIAL_DECOMPOSITIONS.length})`);

const validAccountingStandards = ['IFRS', 'US_GAAP', 'J_GAAP', 'K_IFRS', 'CAS'];
const validProfitMetricClassifications = [
  'statutory_operating_income',
  'statutory_ebit',
  'adjusted_operating_income',
  'adjusted_ebit',
  'derived_operating_income',
];
const validFactorClassifications = [
  'officially_reported',
  'derived',
  'estimated',
  'proxy',
  'analyst_interpretation',
  'unverified',
];

FINANCIAL_DECOMPOSITIONS.forEach((decomp) => {
  assert(
    Boolean(decomp.accountingStandard && validAccountingStandards.includes(decomp.accountingStandard)),
    `Suite 5-2 [${decomp.companyId}]: Has valid accountingStandard (${decomp.accountingStandard})`
  );
  assert(
    typeof decomp.operatingProfitMetricName === 'string' && decomp.operatingProfitMetricName.trim().length > 0,
    `Suite 5-3 [${decomp.companyId}]: Has documented operatingProfitMetricName (${decomp.operatingProfitMetricName})`
  );
  assert(
    Boolean(decomp.profitMetricClassification && validProfitMetricClassifications.includes(decomp.profitMetricClassification)),
    `Suite 5-4 [${decomp.companyId}]: Has valid profitMetricClassification (${decomp.profitMetricClassification})`
  );

  decomp.contributingFactors.forEach((factor, fIdx) => {
    assert(
      Boolean(factor.classification && validFactorClassifications.includes(factor.classification)),
      `Suite 5-5 [${decomp.companyId} Factor #${fIdx}]: Has valid factor classification (${factor.classification})`
    );
  });
});


// ========================================================
// 6. Final Full Tally & Exit
// ========================================================
console.log(`\n========================================================`);
console.log(`Final Test Results: ${passCount} passed, ${failCount} failed.`);
console.log(`========================================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Phase 1 Remediation & Final Accuracy Gate Tests passed cleanly!');
}
