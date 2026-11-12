/**
 * AutoMetrics Intelligence — OEM Cost & Efficiency Calculations Engine
 *
 * Core productivity calculation, currency conversion, and localized formatting utilities.
 */

import { FX_RATES_TO_KRW } from './currencyUtils';

/**
 * Calculates Revenue per Employee in functional currency.
 * Formula: (Revenue in Millions * 1,000,000) / Headcount
 */
export function calculateRevenuePerEmployee(
  revenueInMillions: number | null | undefined,
  headcount: number | null | undefined
): number | null {
  if (
    revenueInMillions === null ||
    revenueInMillions === undefined ||
    !Number.isFinite(revenueInMillions) ||
    headcount === null ||
    headcount === undefined ||
    !Number.isFinite(headcount) ||
    headcount <= 0
  ) {
    return null;
  }
  return Math.round((revenueInMillions * 1_000_000) / headcount);
}

/**
 * Calculates Operating Profit / Loss per Employee in functional currency.
 * Formula: (Operating Profit in Millions * 1,000,000) / Headcount
 */
export function calculateProfitPerEmployee(
  operatingProfitInMillions: number | null | undefined,
  headcount: number | null | undefined
): number | null {
  if (
    operatingProfitInMillions === null ||
    operatingProfitInMillions === undefined ||
    !Number.isFinite(operatingProfitInMillions) ||
    headcount === null ||
    headcount === undefined ||
    !Number.isFinite(headcount) ||
    headcount <= 0
  ) {
    return null;
  }
  return Math.round((operatingProfitInMillions * 1_000_000) / headcount);
}

/**
 * Calculates Revenue per Vehicle in functional currency.
 * Formula: (Automotive / Group Revenue in Millions * 1,000,000) / (Volume in Thousand Units * 1,000)
 */
export function calculateRevenuePerVehicle(
  revenueInMillions: number | null | undefined,
  volumeInThousandUnits: number | null | undefined
): number | null {
  if (
    revenueInMillions === null ||
    revenueInMillions === undefined ||
    !Number.isFinite(revenueInMillions) ||
    volumeInThousandUnits === null ||
    volumeInThousandUnits === undefined ||
    !Number.isFinite(volumeInThousandUnits) ||
    volumeInThousandUnits <= 0
  ) {
    return null;
  }
  return Math.round((revenueInMillions * 1_000_000) / (volumeInThousandUnits * 1_000));
}

/**
 * Calculates Operating Profit / Loss per Vehicle in functional currency.
 * Formula: (Operating Profit in Millions * 1,000,000) / (Volume in Thousand Units * 1,000)
 */
export function calculateProfitPerVehicle(
  operatingProfitInMillions: number | null | undefined,
  volumeInThousandUnits: number | null | undefined
): number | null {
  if (
    operatingProfitInMillions === null ||
    operatingProfitInMillions === undefined ||
    !Number.isFinite(operatingProfitInMillions) ||
    volumeInThousandUnits === null ||
    volumeInThousandUnits === undefined ||
    !Number.isFinite(volumeInThousandUnits) ||
    volumeInThousandUnits <= 0
  ) {
    return null;
  }
  return Math.round((operatingProfitInMillions * 1_000_000) / (volumeInThousandUnits * 1_000));
}

/**
 * Calculates R&D Intensity as percentage of revenue.
 * Formula: (R&D Expenditure / Revenue) * 100
 */
export function calculateRdIntensity(
  rdInMillions: number | null | undefined,
  revenueInMillions: number | null | undefined
): number | null {
  if (
    rdInMillions === null ||
    rdInMillions === undefined ||
    !Number.isFinite(rdInMillions) ||
    revenueInMillions === null ||
    revenueInMillions === undefined ||
    !Number.isFinite(revenueInMillions) ||
    revenueInMillions <= 0
  ) {
    return null;
  }
  return Number(((rdInMillions / revenueInMillions) * 100).toFixed(2));
}

/**
 * Calculates CapEx Intensity as percentage of revenue.
 * Formula: (CapEx / Revenue) * 100
 */
export function calculateCapexIntensity(
  capexInMillions: number | null | undefined,
  revenueInMillions: number | null | undefined
): number | null {
  if (
    capexInMillions === null ||
    capexInMillions === undefined ||
    !Number.isFinite(capexInMillions) ||
    revenueInMillions === null ||
    revenueInMillions === undefined ||
    !Number.isFinite(revenueInMillions) ||
    revenueInMillions <= 0
  ) {
    return null;
  }
  return Number(((capexInMillions / revenueInMillions) * 100).toFixed(2));
}

/**
 * Calculates Revenue per Unit of CapEx as a descriptive ratio.
 * Formula: Revenue / CapEx
 */
export function calculateRevenuePerCapex(
  revenueInMillions: number | null | undefined,
  capexInMillions: number | null | undefined
): number | null {
  if (
    revenueInMillions === null ||
    revenueInMillions === undefined ||
    !Number.isFinite(revenueInMillions) ||
    capexInMillions === null ||
    capexInMillions === undefined ||
    !Number.isFinite(capexInMillions) ||
    capexInMillions <= 0
  ) {
    return null;
  }
  return Number((revenueInMillions / capexInMillions).toFixed(2));
}

/**
 * Converts a functional currency efficiency amount (e.g. per-employee or per-vehicle)
 * into target comparison currency (KRW or USD) using analytical fixed baseline rates.
 */
export function convertEfficiencyAmount(
  amount: number | null | undefined,
  sourceCurrency: string,
  targetCurrency: 'KRW' | 'USD' | 'FUNCTIONAL'
): number | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return null;
  }
  const from = sourceCurrency.toUpperCase();
  if (targetCurrency === 'FUNCTIONAL' || from === targetCurrency) {
    return amount;
  }

  const rateToKrw = FX_RATES_TO_KRW[from];
  if (rateToKrw === undefined) {
    return null;
  }

  const krwAmount = amount * rateToKrw;
  if (targetCurrency === 'KRW') {
    return Math.round(krwAmount);
  }

  // targetCurrency is 'USD'
  const usdRate = FX_RATES_TO_KRW['USD'] || 1380.0;
  return Math.round(krwAmount / usdRate);
}

/**
 * Localized formatting helper for currency efficiency metrics (Rev/Emp, Profit/Emp, Rev/Veh, Profit/Veh).
 */
export function formatEfficiencyCurrency(
  amount: number | null | undefined,
  currency: 'KRW' | 'USD' | string,
  language = 'ko',
  unitType: 'employee' | 'vehicle' = 'employee'
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return '-';
  }

  const unitLabel =
    unitType === 'employee'
      ? language === 'ko'
        ? '/ 인'
        : '/ emp'
      : language === 'ko'
      ? '/ 대'
      : '/ veh';

  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const sign = isNeg ? '-' : '';

  if (currency === 'KRW') {
    if (language === 'ko') {
      if (abs >= 100_000_000) {
        const eok = (abs / 100_000_000).toFixed(1);
        return `${sign}₩${eok}억 ${unitLabel}`;
      }
      const man = Math.round(abs / 10_000).toLocaleString();
      return `${sign}₩${man}만 ${unitLabel}`;
    }
    if (abs >= 1_000_000_000) {
      return `${sign}₩${(abs / 1_000_000_000).toFixed(2)}B ${unitLabel}`;
    }
    if (abs >= 1_000_000) {
      return `${sign}₩${(abs / 1_000_000).toFixed(1)}M ${unitLabel}`;
    }
    return `${sign}₩${Math.round(abs / 1_000).toLocaleString()}k ${unitLabel}`;
  }

  if (currency === 'USD') {
    return `${sign}$${Math.round(abs).toLocaleString()} ${unitLabel}`;
  }

  // Functional currency symbol resolution
  const symbol =
    currency === 'EUR' ? '€' : currency === 'JPY' ? '¥' : currency === 'CNY' ? '¥' : currency === 'SEK' ? 'SEK ' : `${currency} `;

  return `${sign}${symbol}${Math.round(abs).toLocaleString()} ${unitLabel}`;
}

/**
 * Localized formatting helper for efficiency ratios (e.g. 22.1x).
 */
export function formatEfficiencyRatio(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return '-';
  }
  return `${ratio.toFixed(digits)}x`;
}

/**
 * Localized formatting helper for efficiency percentages (e.g. 5.96%).
 */
export function formatEfficiencyPercentage(pct: number | null | undefined, digits = 2): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return '-';
  }
  return `${pct.toFixed(digits)}%`;
}

/**
 * Standard Korean display names for 16 global automakers.
 * Guarantees zero unreadable Chinese/Japanese characters in Korean mode.
 */
export const OEM_KOREAN_NAMES: Record<string, string> = {
  mercedes_benz: '메르세데스-벤츠',
  bmw_group: 'BMW',
  volkswagen_group: '폭스바겐',
  stellantis: '스텔란티스',
  toyota_motor: '토요타',
  hyundai_motor: '현대자동차',
  kia: '기아',
  tesla: '테슬라',
  general_motors: 'GM',
  ford: '포드',
  byd: 'BYD',
  geely: '지리자동차',
  volvo_cars: '볼보',
  rivian: '리비안',
  honda_motor: '혼다',
  nissan_motor: '닛산',
};

/**
 * Resolves a friendly, localized automaker display name.
 */
export function getOEMDisplayName(
  companyId: string,
  fallbackName: string,
  language = 'ko'
): string {
  if (language === 'ko') {
    return OEM_KOREAN_NAMES[companyId] || fallbackName;
  }
  return fallbackName;
}
