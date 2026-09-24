/**
 * Metric Calculation Utilities for AutoMetrics Intelligence
 *
 * All functions strictly follow data integrity rules:
 * - Return null for invalid, non-finite, missing, or zero-denominator inputs.
 * - Never silently coerce missing values to zero.
 * - Handle negative numbers properly.
 */

export function calculateYoYGrowth(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current === null || current === undefined || !Number.isFinite(current)) return null;
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;

  const growth = ((current - previous) / Math.abs(previous)) * 100;
  return Number.isFinite(growth) ? Math.round(growth * 100) / 100 : null;
}

export function calculateQoQGrowth(
  current: number | null | undefined,
  previousQuarter: number | null | undefined
): number | null {
  return calculateYoYGrowth(current, previousQuarter);
}

export function calculateMargin(
  operatingIncome: number | null | undefined,
  revenue: number | null | undefined
): number | null {
  if (operatingIncome === null || operatingIncome === undefined || !Number.isFinite(operatingIncome)) return null;
  if (revenue === null || revenue === undefined || !Number.isFinite(revenue)) return null;
  if (revenue <= 0) return null;

  const margin = (operatingIncome / revenue) * 100;
  return Number.isFinite(margin) ? Math.round(margin * 100) / 100 : null;
}

export function calculateBEVShare(
  bevDeliveries: number | null | undefined,
  totalDeliveries: number | null | undefined
): number | null {
  if (bevDeliveries === null || bevDeliveries === undefined || !Number.isFinite(bevDeliveries)) return null;
  if (totalDeliveries === null || totalDeliveries === undefined || !Number.isFinite(totalDeliveries)) return null;
  if (totalDeliveries <= 0) return null;
  if (bevDeliveries < 0) return null;

  const share = (bevDeliveries / totalDeliveries) * 100;
  return Number.isFinite(share) ? Math.min(100, Math.round(share * 100) / 100) : null;
}

export function calculateGuidanceMidpoint(
  min: number | null | undefined,
  max: number | null | undefined,
  target?: number | null | undefined
): number | null {
  if (target !== undefined && target !== null && Number.isFinite(target)) {
    return target;
  }
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return Math.round(((min + max) / 2) * 100) / 100;
    }
  }
  if (min !== null && min !== undefined && Number.isFinite(min)) return min;
  if (max !== null && max !== undefined && Number.isFinite(max)) return max;
  return null;
}

export function calculateGuidanceRangeSpread(
  min: number | null | undefined,
  max: number | null | undefined
): number | null {
  if (min === null || min === undefined || max === null || max === undefined) return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return Math.abs(max - min);
}

export function calculateCAGR(
  startValue: number | null | undefined,
  endValue: number | null | undefined,
  years: number
): number | null {
  if (startValue === null || startValue === undefined || endValue === null || endValue === undefined) return null;
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || years <= 0) return null;
  if (startValue <= 0 || endValue <= 0) return null;

  const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  return Number.isFinite(cagr) ? Math.round(cagr * 100) / 100 : null;
}

export function calculateRegionalShare(
  regionalValue: number | null | undefined,
  totalValue: number | null | undefined
): number | null {
  if (regionalValue === null || regionalValue === undefined || !Number.isFinite(regionalValue)) return null;
  if (totalValue === null || totalValue === undefined || !Number.isFinite(totalValue)) return null;
  if (totalValue <= 0) return null;
  if (regionalValue < 0) return null;

  const share = (regionalValue / totalValue) * 100;
  return Number.isFinite(share) ? Math.round(share * 100) / 100 : null;
}

export function formatMetricValue(
  value: number | null | undefined,
  unit: string,
  currency?: string
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Not reported';
  }

  const currSymbol = currency ? getCurrencySymbol(currency) : '';

  switch (unit) {
    case 'percentage':
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    case 'units':
      return `${value.toLocaleString()} units`;
    case 'thousand_units':
      return `${value.toLocaleString()}k units`;
    case 'currency_millions':
      return `${currSymbol}${value.toLocaleString()}M`;
    case 'currency_billions':
      return `${currSymbol}${value.toFixed(2)}B`;
    case 'ratio':
      return `${value.toFixed(2)}x`;
    default:
      return `${currSymbol}${value.toLocaleString()}`;
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  switch (currencyCode.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'CNY':
    case 'RMB':
      return '¥';
    case 'JPY':
      return '¥';
    case 'KRW':
      return '₩';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    default:
      return `${currencyCode} `;
  }
}

