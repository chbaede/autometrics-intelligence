/**
 * Currency Conversion and Formatting Utilities for AutoMetrics Intelligence
 *
 * Provides real-time benchmark exchange rates to KRW (Korean Won)
 * and localized currency formatting for global financial metrics.
 */

export const FX_RATES_TO_KRW: Record<string, number> = {
  KRW: 1.0,
  USD: 1380.0,
  EUR: 1500.0,
  JPY: 9.2, // 1 JPY = 9.2 KRW (100 JPY = 920 KRW)
  CNY: 192.0,
  RMB: 192.0,
  GBP: 1750.0,
};

/**
 * Converts an amount in millions from the source currency to Korean Won (KRW).
 * @param amountInMillions Value in currency_millions (e.g. 2950 for €2,950M)
 * @param sourceCurrency ISO currency code (USD, EUR, JPY, CNY, KRW, etc.)
 * @returns Total amount in KRW (won)
 */
export function convertMillionsToKRW(
  amountInMillions: number | null | undefined,
  sourceCurrency = 'USD'
): number | null {
  if (amountInMillions === null || amountInMillions === undefined || !Number.isFinite(amountInMillions)) {
    return null;
  }
  const curr = sourceCurrency.toUpperCase();
  const rate = FX_RATES_TO_KRW[curr] ?? 1380.0;
  return amountInMillions * rate * 1_000_000;
}

/**
 * Formats profit / operating income localized into Korean Won (KRW) or original currency.
 * When language is 'ko', converts foreign amounts to KRW (조/억원) with optional original currency note.
 *
 * Examples:
 * - formatLocalizedProfit(2950, 'EUR', 'ko') => "₩4.43조"
 * - formatLocalizedProfit(1280000, 'JPY', 'ko') => "₩11.78조"
 * - formatLocalizedProfit(2150, 'USD', 'ko') => "₩2.97조"
 * - formatLocalizedProfit(3920000, 'KRW', 'ko') => "₩3.92조"
 */
export function formatLocalizedProfit(
  amountInMillions: number | null | undefined,
  sourceCurrency = 'USD',
  language = 'ko',
  options?: {
    showOriginal?: boolean;
  }
): string {
  if (amountInMillions === null || amountInMillions === undefined || !Number.isFinite(amountInMillions)) {
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

  // English formatting (original reported currency)
  return formatOriginalCurrencyCompact(amountInMillions, curr);
}

/**
 * Compact original currency formatter (e.g. $2.15B, €2.95B, ¥1.28T)
 */
export function formatOriginalCurrencyCompact(
  amountInMillions: number | null | undefined,
  currency = 'USD'
): string {
  if (amountInMillions === null || amountInMillions === undefined || !Number.isFinite(amountInMillions)) {
    return '-';
  }

  const curr = currency.toUpperCase();

  if (curr === 'KRW') {
    if (amountInMillions >= 1_000_000) {
      return `₩${(amountInMillions / 1_000_000).toFixed(2)}T`;
    }
    return `₩${Math.round(amountInMillions / 100).toLocaleString()}B`;
  }

  if (curr === 'JPY') {
    if (amountInMillions >= 1_000_000) {
      return `¥${(amountInMillions / 1_000_000).toFixed(2)}T`;
    }
    return `¥${(amountInMillions / 1000).toFixed(1)}B`;
  }

  if (curr === 'CNY' || curr === 'RMB') {
    if (amountInMillions >= 1000) {
      return `¥${(amountInMillions / 1000).toFixed(2)}B`;
    }
    return `¥${amountInMillions}M`;
  }

  if (curr === 'EUR') {
    if (amountInMillions >= 1000) {
      return `€${(amountInMillions / 1000).toFixed(2)}B`;
    }
    return `€${amountInMillions}M`;
  }

  // Default USD
  if (amountInMillions >= 1000) {
    return `$${(amountInMillions / 1000).toFixed(2)}B`;
  }
  return `$${amountInMillions}M`;
}
