/**
 * AutoMetrics Intelligence — Cost & Efficiency Calculations Unit Tests
 */

import {
  calculateRevenuePerEmployee,
  calculateProfitPerEmployee,
  calculateRevenuePerVehicle,
  calculateProfitPerVehicle,
  calculateRdIntensity,
  calculateCapexIntensity,
  calculateRevenuePerCapex,
  convertEfficiencyAmount,
  formatEfficiencyCurrency,
  formatEfficiencyRatio,
  formatEfficiencyPercentage,
} from '../src/utils/efficiencyCalculations';

console.log('🧪 Starting Cost & Efficiency Benchmark Calculations Test Suite...\n');

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

// 1. Revenue Per Employee
assert(calculateRevenuePerEmployee(100, 1000) === 100000, 'Rev/Emp: 100M / 1000 = 100,000');
assert(calculateRevenuePerEmployee(null, 1000) === null, 'Rev/Emp: null revenue returns null');
assert(calculateRevenuePerEmployee(100, 0) === null, 'Rev/Emp: zero headcount returns null');
assert(calculateRevenuePerEmployee(100, -10) === null, 'Rev/Emp: negative headcount returns null');
assert(calculateRevenuePerEmployee(NaN, 1000) === null, 'Rev/Emp: NaN revenue returns null');

// 2. Profit Per Employee (Handles negative profits/losses)
assert(calculateProfitPerEmployee(10, 1000) === 10000, 'Profit/Emp: 10M / 1000 = 10,000');
assert(calculateProfitPerEmployee(-5, 1000) === -5000, 'Profit/Emp: -5M / 1000 = -5,000');
assert(calculateProfitPerEmployee(0, 1000) === 0, 'Profit/Emp: 0M / 1000 = 0');
assert(calculateProfitPerEmployee(-5, 0) === null, 'Profit/Emp: zero headcount returns null');
assert(calculateProfitPerEmployee(null, 1000) === null, 'Profit/Emp: null profit returns null');

// 3. Revenue Per Vehicle
assert(calculateRevenuePerVehicle(10000, 250) === 40000, 'Rev/Veh: 10,000M / 250k = 40,000');
assert(calculateRevenuePerVehicle(null, 250) === null, 'Rev/Veh: null revenue returns null');
assert(calculateRevenuePerVehicle(10000, 0) === null, 'Rev/Veh: zero volume returns null');
assert(calculateRevenuePerVehicle(10000, -10) === null, 'Rev/Veh: negative volume returns null');

// 4. Profit Per Vehicle
assert(calculateProfitPerVehicle(1000, 250) === 4000, 'Profit/Veh: 1,000M / 250k = 4,000');
assert(calculateProfitPerVehicle(-500, 250) === -2000, 'Profit/Veh: -500M / 250k = -2,000');
assert(calculateProfitPerVehicle(null, 250) === null, 'Profit/Veh: null profit returns null');
assert(calculateProfitPerVehicle(1000, 0) === null, 'Profit/Veh: zero volume returns null');

// 5. R&D Intensity (%)
assert(calculateRdIntensity(500, 10000) === 5.0, 'R&D Intensity: 500 / 10,000 = 5.0%');
assert(calculateRdIntensity(null, 10000) === null, 'R&D Intensity: null R&D returns null');
assert(calculateRdIntensity(500, 0) === null, 'R&D Intensity: zero revenue returns null');
assert(calculateRdIntensity(500, -1000) === null, 'R&D Intensity: negative revenue returns null');

// 6. CapEx Intensity (%)
assert(calculateCapexIntensity(600, 10000) === 6.0, 'CapEx Intensity: 600 / 10,000 = 6.0%');
assert(calculateCapexIntensity(null, 10000) === null, 'CapEx Intensity: null CapEx returns null');
assert(calculateCapexIntensity(600, 0) === null, 'CapEx Intensity: zero revenue returns null');

// 7. Revenue Per CapEx (Ratio)
assert(calculateRevenuePerCapex(10000, 500) === 20.0, 'Rev/CapEx: 10,000 / 500 = 20.0x');
assert(calculateRevenuePerCapex(10000, null) === null, 'Rev/CapEx: null CapEx returns null');
assert(calculateRevenuePerCapex(10000, 0) === null, 'Rev/CapEx: zero CapEx returns null');

// 8. Currency Conversion
const usdFromEur = convertEfficiencyAmount(1000, 'EUR', 'USD');
assert(Boolean(usdFromEur && usdFromEur > 1000), `1000 EUR in USD is > 1000 (${usdFromEur})`);

const krwFromUsd = convertEfficiencyAmount(1000, 'USD', 'KRW');
assert(Boolean(krwFromUsd && krwFromUsd > 1000000), `1000 USD in KRW is > 1,000,000 (${krwFromUsd})`);

const sameCurrency = convertEfficiencyAmount(1000, 'USD', 'USD');
assert(sameCurrency === 1000, 'Same currency returns exact amount');

// 9. Formatting
const krwFormattedPos = formatEfficiencyCurrency(150000000, 'KRW', 'ko', 'employee');
assert(Boolean(krwFormattedPos.includes('1.5') && krwFormattedPos.includes('억')), `KRW pos formatting includes 1.5억 (${krwFormattedPos})`);

const krwFormattedNeg = formatEfficiencyCurrency(-50000000, 'KRW', 'ko', 'employee');
assert(Boolean(krwFormattedNeg.includes('-') && krwFormattedNeg.includes('만')), `KRW neg formatting includes - and 만 (${krwFormattedNeg})`);

const usdFormatted = formatEfficiencyCurrency(850000, 'USD', 'en', 'employee');
assert(Boolean(usdFormatted.includes('$850,000')), `USD formatting includes $850,000 (${usdFormatted})`);

const ratioFormatted = formatEfficiencyRatio(22.14);
assert(ratioFormatted === '22.1x', `Ratio formatted is 22.1x (${ratioFormatted})`);

const pctFormatted = formatEfficiencyPercentage(5.96);
assert(pctFormatted === '5.96%', `Percentage formatted is 5.96% (${pctFormatted})`);

console.log(`\n========================================================`);
console.log(`Calculations Test Results: ${passCount} passed, ${failCount} failed.`);
console.log(`========================================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 Cost & Efficiency calculations test passed cleanly!');
}
