/**
 * Currency Conversion and Formatting Utilities for AutoMetrics Intelligence
 *
 * Provides fixed analytical comparison exchange rates (Fixed Comparison Baseline: 2024–2026 Reference)
 * and localized currency formatting for global financial metrics.
 *
 * NOTE: These rates are static analytical assumptions for cross-OEM comparability,
 * NOT live or real-time market feeds.
 */

export const FX_RATES_TO_KRW: Record<string, number> = {
  KRW: 1.0,
  USD: 1380.0,
  EUR: 1500.0,
  JPY: 9.2, // 1 JPY = 9.2 KRW (100 JPY = 920 KRW)
  CNY: 192.0,
  RMB: 192.0,
  GBP: 1750.0,
  SEK: 130.0,
};

export const FX_BENCHMARK_METADATA = {
  type: 'fixed_analytical_comparison',
  referencePeriod: '2024-2026 Baseline Reference',
  descriptionEn: 'Fixed Comparison FX Rates (USD 1,380 · EUR 1,500 · JPY 9.2 · CNY 192 KRW / Analytical Baseline)',
  descriptionKo: '고정 분석 기준환율 (USD 1,380 · EUR 1,500 · JPY 9.2 · CNY 192 / 분석용 가산환율)',
};

/**
 * Converts an amount in millions from the source currency to Korean Won (KRW).
 * @param amountInMillions Value in currency_millions (e.g. 2950 for €2,950M)
 * @param sourceCurrency ISO currency code (USD, EUR, JPY, CNY, KRW, SEK, GBP, etc.)
 * @returns Total amount in KRW (won), or null if invalid or currency is unsupported.
 */
export function convertMillionsToKRW(
  amountInMillions: number | null | undefined,
  sourceCurrency?: string
): number | null {
  if (amountInMillions === null || amountInMillions === undefined || !Number.isFinite(amountInMillions)) {
    return null;
  }
  if (!sourceCurrency) {
    return null;
  }
  const curr = sourceCurrency.toUpperCase();
  const rate = FX_RATES_TO_KRW[curr];
  if (rate === undefined) {
    // Explicit failure for unsupported/unknown currencies — never silently default to USD
    return null;
  }
  return amountInMillions * rate * 1_000_000;
}

/**
 * Converts an amount in millions from the source currency to US Dollars (USD).
 * Uses the same fixed comparison conversion basis.
 * @param amountInMillions Value in currency_millions
 * @param sourceCurrency ISO currency code
 * @returns Total amount in USD (dollars), or null if invalid or currency is unsupported.
 */
export function convertMillionsToUSD(
  amountInMillions: number | null | undefined,
  sourceCurrency?: string
): number | null {
  if (amountInMillions === null || amountInMillions === undefined || !Number.isFinite(amountInMillions)) {
    return null;
  }
  if (!sourceCurrency) {
    return null;
  }
  const curr = sourceCurrency.toUpperCase();
  if (curr === 'USD') {
    return amountInMillions * 1_000_000;
  }
  const krw = convertMillionsToKRW(amountInMillions, curr);
  if (krw === null) return null;
  return krw / 1380.0;
}

/**
 * Formats profit / operating income localized into Korean Won (KRW) or US Dollars (USD).
 * Both Korean and English share a consistent normalized comparison conversion basis.
 *
 * Handles negative operating losses, zero, and positive profits explicitly.
 * Returns '-' on conversion failure or unsupported currency.
 */
export function formatLocalizedProfit(
  amountInMillions: number | null | undefined,
  sourceCurrency?: string,
  language = 'ko',
  options?: {
    showOriginal?: boolean;
  }
): string {
  if (amountInMillions === null || amountInMillions === undefined || !Number.isFinite(amountInMillions)) {
    return '-';
  }
  if (!sourceCurrency) {
    return '-';
  }

  const curr = sourceCurrency.toUpperCase();

  if (language === 'ko') {
    const krwWon = convertMillionsToKRW(amountInMillions, curr);
    if (krwWon === null) return '-';

    let krwFormatted = '';
    const absWon = Math.abs(krwWon);
    const sign = krwWon < 0 ? '-' : '';

    if (absWon >= 1_000_000_000_000) {
      // 조 단위 (1조원 이상)
      krwFormatted = `${sign}₩${(absWon / 1_000_000_000_000).toFixed(2)}조`;
    } else if (absWon >= 100_000_000) {
      // 억 단위 (1억원 이상)
      krwFormatted = `${sign}₩${Math.round(absWon / 100_000_000).toLocaleString()}억`;
    } else {
      krwFormatted = `${sign}₩${Math.round(absWon).toLocaleString()}`;
    }

    if (options?.showOriginal && curr !== 'KRW') {
      const origFormatted = formatOriginalCurrencyCompact(amountInMillions, curr);
      return `${krwFormatted} (${origFormatted})`;
    }

    return krwFormatted;
  }

  // English formatting: Normalized USD comparison basis
  const usdAmount = convertMillionsToUSD(amountInMillions, curr);
  if (usdAmount === null) return '-';

  const absUsd = Math.abs(usdAmount);
  const sign = usdAmount < 0 ? '-' : '';
  let usdFormatted = '';

  if (absUsd >= 1_000_000_000) {
    usdFormatted = `${sign}$${(absUsd / 1_000_000_000).toFixed(2)}B`;
  } else if (absUsd >= 1_000_000) {
    usdFormatted = `${sign}$${Math.round(absUsd / 1_000_000)}M`;
  } else {
    usdFormatted = `${sign}$${Math.round(absUsd).toLocaleString()}`;
  }

  if (options?.showOriginal && curr !== 'USD') {
    const origFormatted = formatOriginalCurrencyCompact(amountInMillions, curr);
    return `${usdFormatted} (${origFormatted})`;
  }

  return usdFormatted;
}

/**
 * Compact original currency formatter (e.g. $2.15B, €2.95B, ¥1.28T, -$836M)
 * Preserves negative sign on operating losses.
 */
export function formatOriginalCurrencyCompact(
  amountInMillions: number | null | undefined,
  currency = 'USD'
): string {
  if (amountInMillions === null || amountInMillions === undefined || !Number.isFinite(amountInMillions)) {
    return '-';
  }

  const curr = currency.toUpperCase();
  const sign = amountInMillions < 0 ? '-' : '';
  const abs = Math.abs(amountInMillions);

  if (curr === 'KRW') {
    if (abs >= 1_000_000) {
      return `${sign}₩${(abs / 1_000_000).toFixed(2)}T`;
    }
    return `${sign}₩${Math.round(abs / 100).toLocaleString()}B`;
  }

  if (curr === 'JPY') {
    if (abs >= 1_000_000) {
      return `${sign}¥${(abs / 1_000_000).toFixed(2)}T`;
    }
    return `${sign}¥${(abs / 1000).toFixed(1)}B`;
  }

  if (curr === 'CNY' || curr === 'RMB') {
    if (abs >= 1000) {
      return `${sign}¥${(abs / 1000).toFixed(2)}B`;
    }
    return `${sign}¥${abs}M`;
  }

  if (curr === 'EUR') {
    if (abs >= 1000) {
      return `${sign}€${(abs / 1000).toFixed(2)}B`;
    }
    return `${sign}€${abs}M`;
  }

  if (curr === 'SEK') {
    if (abs >= 1000) {
      return `${sign}SEK ${(abs / 1000).toFixed(1)}B`;
    }
    return `${sign}SEK ${abs}M`;
  }

  if (curr === 'GBP') {
    if (abs >= 1000) {
      return `${sign}£${(abs / 1000).toFixed(2)}B`;
    }
    return `${sign}£${abs}M`;
  }

  // Default USD
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(2)}B`;
  }
  return `${sign}$${abs}M`;
}
