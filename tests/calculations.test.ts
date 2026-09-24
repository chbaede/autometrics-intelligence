import {
  calculateYoYGrowth,
  calculateQoQGrowth,
  calculateMargin,
  calculateBEVShare,
  calculateGuidanceMidpoint,
  calculateGuidanceRangeSpread,
  calculateCAGR,
  calculateRegionalShare,
  formatMetricValue,
} from '../src/utils/metricCalculations';

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

console.log('🧪 Starting Metric Calculation Unit Tests...\n');

// 1. YoY / QoQ Growth Tests
assert(calculateYoYGrowth(110, 100) === 10, 'YoY: Positive growth from 100 to 110 should be 10%');
assert(calculateYoYGrowth(90, 100) === -10, 'YoY: Negative growth from 100 to 90 should be -10%');
assert(calculateYoYGrowth(50, -50) === 200, 'YoY: Recovery from -50 to 50 should be 200%');
assert(calculateYoYGrowth(null, 100) === null, 'YoY: Missing current value returns null');
assert(calculateYoYGrowth(100, null) === null, 'YoY: Missing previous value returns null');
assert(calculateYoYGrowth(100, 0) === null, 'YoY: Division by zero returns null');
assert(calculateYoYGrowth(NaN, 100) === null, 'YoY: NaN input returns null');
assert(calculateQoQGrowth(120, 100) === 20, 'QoQ: Growth from 100 to 120 should be 20%');

// 2. Margin Tests
assert(calculateMargin(10, 100) === 10, 'Margin: 10 operating income / 100 revenue = 10%');
assert(calculateMargin(-5, 100) === -5, 'Margin: -5 operating loss / 100 revenue = -5%');
assert(calculateMargin(10, 0) === null, 'Margin: 0 revenue returns null (division by zero)');
assert(calculateMargin(10, -50) === null, 'Margin: Negative revenue returns null');
assert(calculateMargin(null, 100) === null, 'Margin: Null operating income returns null');

// 3. BEV Share Tests
assert(calculateBEVShare(20, 100) === 20, 'BEV Share: 20 BEVs / 100 total deliveries = 20%');
assert(calculateBEVShare(0, 100) === 0, 'BEV Share: 0 BEVs = 0%');
assert(calculateBEVShare(100, 100) === 100, 'BEV Share: 100% BEV');
assert(calculateBEVShare(120, 100) === null, 'BEV Share: BEV deliveries > total deliveries returns null');
assert(calculateBEVShare(-5, 100) === null, 'BEV Share: Negative BEV deliveries returns null');
assert(calculateBEVShare(10, 0) === null, 'BEV Share: Zero total deliveries returns null');
assert(calculateBEVShare(null, 100) === null, 'BEV Share: Null BEV value returns null');

// 4. Guidance Midpoint & Spread Tests
assert(calculateGuidanceMidpoint(7.5, 8.5) === 8.0, 'Guidance Midpoint: 7.5% - 8.5% midpoint is 8.0%');
assert(calculateGuidanceMidpoint(7.5, 8.5, 8.2) === 8.2, 'Guidance Midpoint: Explicit target takes precedence');
assert(calculateGuidanceMidpoint(7.0, null) === 7.0, 'Guidance Midpoint: Single min bound fallback');
assert(calculateGuidanceMidpoint(null, 9.0) === 9.0, 'Guidance Midpoint: Single max bound fallback');
assert(calculateGuidanceMidpoint(null, null) === null, 'Guidance Midpoint: Null bounds return null');
assert(calculateGuidanceRangeSpread(6.0, 8.0) === 2.0, 'Guidance Spread: 8.0 - 6.0 = 2.0');

// 5. CAGR & Regional Share Tests
assert(calculateCAGR(100, 121, 2) === 10, 'CAGR: 100 to 121 in 2 years is 10%');
assert(calculateCAGR(100, 100, 3) === 0, 'CAGR: Flat growth is 0%');
assert(calculateCAGR(-10, 100, 2) === null, 'CAGR: Negative base returns null');
assert(calculateRegionalShare(30, 100) === 30, 'Regional Share: 30 / 100 = 30%');

// 6. Formatting Tests
assert(formatMetricValue(8.5, 'percentage') === '+8.5%', 'Format: percentage');
assert(formatMetricValue(-3.2, 'percentage') === '-3.2%', 'Format: negative percentage');
assert(formatMetricValue(123456, 'units') === '123,456 units', 'Format: units');
assert(formatMetricValue(null, 'percentage') === 'Not reported', 'Format: null value returns Not reported');
assert(formatMetricValue(50000, 'currency_millions', 'EUR') === '€50,000M', 'Format: currency millions EUR');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All calculation tests passed cleanly!\n');
}

