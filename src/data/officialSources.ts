/**
 * AutoMetrics Intelligence — Official OEM Investor Relations Source Registry (STEP 5-5)
 *
 * Explicit registry of authorized primary Investor Relations source documents.
 * Ensures:
 * 1. Explicit officiality gate (HTTPS alone is not sufficient; must match registered OEM domain policy).
 * 2. Complete absence of generic web crawler behavior.
 * 3. Exact correspondence with registered SourceDocument IDs where applicable.
 * 4. Preservation of target claims for end-to-end verification.
 */

import { OfficialIrSource } from '../types/metrics';

/**
 * Explicit registry of authorized official OEM Investor Relations sources.
 */
export const OFFICIAL_IR_SOURCES: OfficialIrSource[] = [
  // =========================================================================
  // 1. MERCEDES-BENZ GROUP AG
  // =========================================================================
  {
    id: 'mbg_2026_q2_results',
    companyId: 'mercedes_benz',
    title: 'Mercedes-Benz Group Q2 2026 Financial Results Presentation',
    url: 'https://group.mercedes-benz.com/investors/reports-news/financial-results/q2-2026.html',
    documentType: 'earnings_presentation',
    reportingPeriod: '2026-Q2',
    periodType: 'quarterly',
    expectedContentType: 'text/html',
    officialDomain: ['group.mercedes-benz.com', 'mercedes-benz.com'],
    notes: 'Official Mercedes-Benz Group earnings presentation for Q2 2026 covering Group revenue, Group EBIT, and Cars segment adjusted RoS.',
    targetClaims: [
      { metricId: 'revenue', period: '2026-Q2', value: 32060, unit: 'currency_millions', scope: 'consolidated_group', accountingBasis: 'reported' },
      { metricId: 'operating_income', period: '2026-Q2', value: 1550, unit: 'currency_millions', scope: 'consolidated_group', accountingBasis: 'reported' },
      { metricId: 'operating_margin', period: '2026-Q2', value: 4.0, unit: 'percentage', scope: 'cars_segment', accountingBasis: 'adjusted' },
    ],
  },

  // =========================================================================
  // 2. BMW GROUP
  // =========================================================================
  {
    id: 'bmw_2026_q2_statement',
    companyId: 'bmw_group',
    title: 'BMW Group Quarterly Statement to 30 June 2026 (Q2)',
    url: 'https://www.bmwgroup.com/en/investor-relations/financial-reports.html',
    documentType: 'quarterly_report',
    reportingPeriod: '2026-Q2',
    periodType: 'quarterly',
    expectedContentType: 'text/html',
    officialDomain: ['www.bmwgroup.com', 'bmwgroup.com'],
    notes: 'Official BMW Group quarterly statement covering Q2 2026 deliveries, Group EBIT, and Automotive segment EBIT margin.',
    targetClaims: [
      { metricId: 'revenue', period: '2026-Q2', value: 31300, unit: 'currency_millions', scope: 'consolidated_group', accountingBasis: 'reported' },
      { metricId: 'operating_income', period: '2026-Q2', value: 1705, unit: 'currency_millions', scope: 'consolidated_group', accountingBasis: 'reported' },
      { metricId: 'operating_margin', period: '2026-Q2', value: 2.3, unit: 'percentage', scope: 'automotive_segment', accountingBasis: 'reported' },
    ],
  },

  // =========================================================================
  // 3. TESLA, INC.
  // =========================================================================
  {
    id: 'tsla_2026_q2_deck',
    companyId: 'tesla',
    title: 'Tesla Q2 2026 Financial Results & Shareholder Update',
    url: 'https://digitalassets.tesla.com/tesla-contents/image/upload/IR/TSLA-Q2-2026-Update.pdf',
    documentType: 'shareholder_letter',
    reportingPeriod: '2026-Q2',
    periodType: 'quarterly',
    expectedContentType: 'application/pdf',
    officialDomain: ['digitalassets.tesla.com', 'ir.tesla.com', 'tesla.com'],
    notes: 'Official Tesla IR shareholder letter reporting Q2 2026 deliveries, GAAP revenues, and operating profit.',
    targetClaims: [
      { metricId: 'deliveries_global', period: '2026-Q2', value: 480.13, unit: 'thousand_units', scope: 'consolidated_group' },
      { metricId: 'revenue', period: '2026-Q2', value: 28240, unit: 'currency_millions', scope: 'consolidated_group', accountingBasis: 'reported' },
      { metricId: 'operating_income', period: '2026-Q2', value: 398, unit: 'currency_millions', scope: 'consolidated_group', accountingBasis: 'reported' },
      { metricId: 'operating_margin', period: '2026-Q2', value: 1.4, unit: 'percentage', scope: 'consolidated_group', accountingBasis: 'reported' },
    ],
  },
];

/**
 * Map of official IR sources keyed by ID.
 */
export const OFFICIAL_IR_SOURCES_MAP = new Map<string, OfficialIrSource>(
  OFFICIAL_IR_SOURCES.map((source) => [source.id, source])
);

/**
 * Retrieve an official IR source definition by ID.
 */
export function getOfficialIrSource(id: string): OfficialIrSource | undefined {
  return OFFICIAL_IR_SOURCES_MAP.get(id);
}

/**
 * Retrieve all registered official IR sources.
 */
export function getAllOfficialIrSources(): OfficialIrSource[] {
  return [...OFFICIAL_IR_SOURCES];
}

/**
 * Evaluates whether a URL resides within the approved official domain perimeter (STEP 5-5, Section 2).
 *
 * Enforces:
 * - Exact hostname match or valid subdomain match (e.g. `sub.mercedes-benz.com` matches `mercedes-benz.com`).
 * - Rejects prefix/suffix spoofing (e.g. `evil-mercedes-benz.com` does NOT match `mercedes-benz.com`).
 */
export function isUrlInOfficialDomain(url: string, officialDomain: string | string[]): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();
    const domains = (Array.isArray(officialDomain) ? officialDomain : [officialDomain]).map((d) =>
      d.toLowerCase().trim()
    );

    return domains.some((domain) => {
      if (hostname === domain) return true;
      if (hostname.endsWith('.' + domain)) return true;
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Validates an official IR source definition for structural integrity.
 */
export function validateOfficialSource(source: OfficialIrSource): { valid: boolean; reason?: string } {
  if (!source.id || source.id.trim() === '') {
    return { valid: false, reason: 'OfficialIrSource id must be non-empty.' };
  }
  if (!source.companyId || source.companyId.trim() === '') {
    return { valid: false, reason: 'OfficialIrSource companyId must be non-empty.' };
  }
  if (!source.url || source.url.trim() === '') {
    return { valid: false, reason: 'OfficialIrSource url must be non-empty.' };
  }
  if (!source.officialDomain || (Array.isArray(source.officialDomain) && source.officialDomain.length === 0)) {
    return { valid: false, reason: 'OfficialIrSource must declare at least one officialDomain.' };
  }
  if (!isUrlInOfficialDomain(source.url, source.officialDomain)) {
    return {
      valid: false,
      reason: `OfficialIrSource URL "${source.url}" does not match its declared officialDomain policy: ${Array.isArray(source.officialDomain) ? source.officialDomain.join(', ') : source.officialDomain}.`,
    };
  }
  return { valid: true };
}

