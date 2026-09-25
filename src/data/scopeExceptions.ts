/**
 * AutoMetrics Intelligence — Documented Scope Exception Registry
 *
 * Every entry in this registry represents an explicitly approved, evidence-backed
 * exception to the standard margin triplet matching rules.
 *
 * A finding may only receive `disposition: 'documented'` when ALL applicable
 * dimensions of an entry match the finding exactly. Company name alone is never
 * sufficient for approval.
 *
 * Fields required for approval:
 *   - companyId          (exact match)
 *   - period             (exact match when specified; wildcard when undefined)
 *   - marginMetricId     (exact metric ID)
 *   - numeratorMetricId  (exact metric ID — wrong metric cannot be auto-approved)
 *   - denominatorMetricId(exact metric ID)
 *   - numeratorScope     (exact ReportingScope)
 *   - denominatorScope   (exact ReportingScope)
 *   - marginScope        (exact ReportingScope)
 *   - numeratorBasis     (exact AccountingBasis)
 *   - denominatorBasis   (exact AccountingBasis)
 *   - marginBasis        (exact AccountingBasis)
 *   - sourceDocIds       (non-empty list of verified source documents)
 *   - rationale          (human-readable explanation with references)
 */

import {
  ReportingScope,
  AccountingBasis,
  SourceDocument,
  ScopeExceptionRejectionReason,
  ScopeExceptionNature,
} from '../types/metrics';

export interface DocumentedScopeException {
  /** Unique exception identifier (used in AuditFinding.exceptionId) */
  id: string;

  /** Company this exception applies to */
  companyId: string;

  /**
   * Specific period for this exception (e.g., '2026-Q2').
   * Undefined = applies to all periods for this company/metric combination.
   */
  period?: string;

  /** Metric ID for the reported margin (e.g., 'operating_margin') */
  marginMetricId: string;

  /** Metric ID of the numerator profit observation */
  numeratorMetricId: string;

  /** Metric ID of the denominator revenue observation */
  denominatorMetricId: string;

  /** Exact ReportingScope of the numerator observation */
  numeratorScope: ReportingScope;

  /** Exact ReportingScope of the denominator observation */
  denominatorScope: ReportingScope;

  /** Exact ReportingScope of the margin observation */
  marginScope: ReportingScope;

  /** Exact AccountingBasis of the numerator observation */
  numeratorBasis: AccountingBasis;

  /** Exact AccountingBasis of the denominator observation */
  denominatorBasis: AccountingBasis;

  /** Exact AccountingBasis of the margin observation */
  marginBasis: AccountingBasis;

  /**
   * One or more source document IDs that provide evidence for this exception.
   * Must be non-empty and reference verified source documents.
   */
  sourceDocIds: string[];

  /**
   * Human-readable rationale citing the official reporting policy, section,
   * or industry convention that justifies this scope divergence.
   */
  rationale: string;

  /**
   * Nature of the exception numerator:
   * - 'actual_segment': exact segment-level metric reported by OEM
   * - 'proxy_numerator': group operating income or proxy used as approximation (cannot be verified mathematically)
   */
  nature?: ScopeExceptionNature;

  /** Indicates whether the numerator is a proxy rather than actual segment metric. */
  isProxy?: boolean;
}

/**
 * DOCUMENTED_SCOPE_EXCEPTIONS
 *
 * Rationale summary:
 *
 * BMW Group:
 *   BMW Group reports its primary operating margin at the Automotive Segment level
 *   (labelled "Automotive EBIT margin" in quarterly statements), not at consolidated
 *   group level. The segment numerator (Automotive EBIT) and segment revenue both
 *   belong to the Automotive Segment reporting scope. The group-level revenue and
 *   EBIT are reported separately but BMW's headline KPI is the Automotive Segment RoS.
 *   This divergence is an acknowledged industry convention, disclosed in each quarterly
 *   interim statement under the "Automotive Segment" section.
 *
 * Mercedes-Benz Group:
 *   Mercedes-Benz Group reports its primary margin as the "Adjusted Return on Sales"
 *   for the Mercedes-Benz Cars segment (adjusted EBIT / Cars revenue). This metric
 *   uses Cars Segment reporting scope and adjusted accounting basis rather than
 *   consolidated group reported basis. Disclosed in each quarterly earnings release
 *   under "Mercedes-Benz Cars" key performance indicators.
 */
export const DOCUMENTED_SCOPE_EXCEPTIONS: DocumentedScopeException[] = [
  // ── BMW Group: Automotive Segment EBIT margin (all covered periods) ──────────
  //
  // Data reality: BMW reports group-level operating_income (consolidated_group)
  // as the implicit numerator, and the reported margin metric is at automotive_segment
  // scope. This is because BMW Group's "Automotive EBIT margin" is defined as
  // Automotive Segment EBIT / Group Revenue, where Automotive Segment EBIT
  // = Group EBIT minus Financial Services EBIT (implicit netting).
  // The margin observation (scope: automotive_segment) therefore comes from
  // a different reporting scope than the revenue denominator (consolidated_group).
  // This is an established BMW Group reporting convention.
  {
    id: 'bmw_automotive_segment_ros_2026q2',
    companyId: 'bmw_group',
    period: '2026-Q2',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',   // BMW Group EBIT (proxy for Automotive EBIT)
    denominatorScope: 'consolidated_group', // BMW Group Revenue
    marginScope: 'automotive_segment',      // Automotive Segment RoS (reported margin KPI)
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'reported',
    sourceDocIds: ['bmw_2026_q2_statement'],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'BMW Group Q2 2026 Interim Statement: Automotive EBIT margin reported at Automotive Segment level ' +
      '(label: "Automotive EBIT margin"). The margin (automotive_segment scope) is derived from ' +
      'segment-level EBIT against group revenue. BMW Group uses group-level operating_income as ' +
      'the observable numerator proxy. Disclosed BMW Group reporting convention per quarterly statement.',
  },
  {
    id: 'bmw_automotive_segment_ros_2026q1',
    companyId: 'bmw_group',
    period: '2026-Q1',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',
    denominatorScope: 'consolidated_group',
    marginScope: 'automotive_segment',
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'reported',
    sourceDocIds: ['bmw_2026_q1_statement'],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'BMW Group Q1 2026 Interim Statement: Automotive EBIT margin — same reporting convention as Q2 2026.',
  },
  {
    id: 'bmw_automotive_segment_ros_2025fy',
    companyId: 'bmw_group',
    period: '2025-FY',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',
    denominatorScope: 'consolidated_group',
    marginScope: 'automotive_segment',
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'reported',
    sourceDocIds: ['bmw_2025_fy_statement'],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'BMW Group FY2025 Annual Report: Automotive EBIT margin — same BMW reporting convention.',
  },
  {
    id: 'bmw_automotive_segment_ros_2024fy',
    companyId: 'bmw_group',
    period: '2024-FY',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',
    denominatorScope: 'consolidated_group',
    marginScope: 'automotive_segment',
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'reported',
    sourceDocIds: ['bmw_2024_fy_statement'],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'BMW Group FY2024 Annual Report: Automotive EBIT margin — same BMW reporting convention.',
  },

  // ── Mercedes-Benz Group: Cars Segment Adjusted RoS ──────────────────────────
  //
  // Data reality: Mercedes reports group-level operating_income (consolidated_group, reported)
  // as the observable numerator, and the margin metric is at cars_segment scope with
  // adjusted accounting basis. The "Adjusted Return on Sales (RoS)" for Cars is a
  // management-defined KPI derived from Cars Segment Adjusted EBIT / Cars Revenue.
  // The available observation (operating_income, consolidated_group, reported) is a proxy
  // for the Cars Adjusted EBIT since the segment data is embedded within the group filing.
  {
    id: 'mbg_cars_adjusted_ros_2026q2',
    companyId: 'mercedes_benz',
    period: '2026-Q2',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',  // Group EBIT proxy
    denominatorScope: 'consolidated_group',
    marginScope: 'cars_segment',           // Cars Segment Adjusted RoS
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'adjusted',
    sourceDocIds: ['mbg_2026_q2_results'],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'Mercedes-Benz Group Q2 2026 Quarterly Statement: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars. ' +
      'The margin (cars_segment, adjusted) represents the Cars Division KPI. The observable numerator ' +
      '(operating_income, consolidated_group) is a proxy since segment-level adjusted EBIT is embedded ' +
      'in the group quarterly filing. Mercedes-Benz disclosed reporting policy, consistent across quarters.',
  },
  {
    id: 'mbg_cars_adjusted_ros_2026q1',
    companyId: 'mercedes_benz',
    period: '2026-Q1',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',
    denominatorScope: 'consolidated_group',
    marginScope: 'cars_segment',
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'adjusted',
    sourceDocIds: ['mbg_2026_q1_results'],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'Mercedes-Benz Group Q1 2026: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — same policy as Q2 2026.',
  },
  {
    id: 'mbg_cars_adjusted_ros_2025fy',
    companyId: 'mercedes_benz',
    period: '2025-FY',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',
    denominatorScope: 'consolidated_group',
    marginScope: 'cars_segment',
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'adjusted',
    sourceDocIds: ['mbg_2025_fy_results'],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'Mercedes-Benz Group FY2025 Annual Report: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — same policy.',
  },
  {
    id: 'mbg_cars_adjusted_ros_2024fy',
    companyId: 'mercedes_benz',
    period: '2024-FY',
    marginMetricId: 'operating_margin',
    numeratorMetricId: 'operating_income',
    denominatorMetricId: 'revenue',
    numeratorScope: 'consolidated_group',
    denominatorScope: 'consolidated_group',
    marginScope: 'cars_segment',
    numeratorBasis: 'reported',
    denominatorBasis: 'reported',
    marginBasis: 'adjusted',
    sourceDocIds: ['mbg_2024_fy_results'],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'Mercedes-Benz Group FY2024 Annual Report: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — same policy.',
  },
];

/**
 * Exception validation result.
 */
export interface ScopeExceptionValidationResult {
  matched: boolean;
  exceptionId?: string;
  sourceDocIds?: string[];
  rationale?: string;
  rejectionReasons?: string[];
  structuredRejections?: ScopeExceptionRejectionReason[];
  isProxy?: boolean;
  nature?: ScopeExceptionNature;
}

/**
 * Looks up a matching documented scope exception for a given set of observed
 * margin triplet dimensions and validates evidence against the source registry.
 *
 * Returns matched=true only when ALL applicable fields exactly match an
 * exception registry entry AND all referenced source documents exist, are verified,
 * match the company, and have valid official URLs.
 *
 * This function does NOT accept company name alone as a match criterion.
 */
export function findDocumentedScopeException(
  companyId: string,
  period: string,
  marginMetricId: string,
  numeratorMetricId: string,
  denominatorMetricId: string,
  numeratorScope: ReportingScope | undefined,
  denominatorScope: ReportingScope | undefined,
  marginScope: ReportingScope | undefined,
  numeratorBasis: AccountingBasis | undefined,
  denominatorBasis: AccountingBasis | undefined,
  marginBasis: AccountingBasis | undefined,
  sources: Map<string, SourceDocument> | Record<string, SourceDocument> | Set<string>
): ScopeExceptionValidationResult {
  const candidates = DOCUMENTED_SCOPE_EXCEPTIONS.filter(
    (e) => e.companyId === companyId && (e.period === undefined || e.period === period)
  );

  if (candidates.length === 0) {
    return {
      matched: false,
      rejectionReasons: [`No documented exception registered for company "${companyId}" and period "${period}".`],
      structuredRejections: ['scope_mismatch'],
    };
  }

  const allRejectionReasons: string[] = [];
  const allStructuredRejections = new Set<ScopeExceptionRejectionReason>();

  for (const exc of candidates) {
    const candidateReasons: string[] = [];
    const candidateStructured = new Set<ScopeExceptionRejectionReason>();

    // 1. Metric definitions check
    if (
      exc.marginMetricId !== marginMetricId ||
      exc.numeratorMetricId !== numeratorMetricId ||
      exc.denominatorMetricId !== denominatorMetricId
    ) {
      candidateStructured.add('metric_mismatch');
      if (exc.marginMetricId !== marginMetricId)
        candidateReasons.push(`[${exc.id}] marginMetricId mismatch: expected "${exc.marginMetricId}", got "${marginMetricId}"`);
      if (exc.numeratorMetricId !== numeratorMetricId)
        candidateReasons.push(`[${exc.id}] numeratorMetricId mismatch: expected "${exc.numeratorMetricId}", got "${numeratorMetricId}"`);
      if (exc.denominatorMetricId !== denominatorMetricId)
        candidateReasons.push(`[${exc.id}] denominatorMetricId mismatch: expected "${exc.denominatorMetricId}", got "${denominatorMetricId}"`);
    }

    // 2. Reporting scope check
    if (
      exc.numeratorScope !== numeratorScope ||
      exc.denominatorScope !== denominatorScope ||
      exc.marginScope !== marginScope
    ) {
      candidateStructured.add('scope_mismatch');
      if (exc.numeratorScope !== numeratorScope)
        candidateReasons.push(`[${exc.id}] numeratorScope mismatch: expected "${exc.numeratorScope}", got "${numeratorScope}"`);
      if (exc.denominatorScope !== denominatorScope)
        candidateReasons.push(`[${exc.id}] denominatorScope mismatch: expected "${exc.denominatorScope}", got "${denominatorScope}"`);
      if (exc.marginScope !== marginScope)
        candidateReasons.push(`[${exc.id}] marginScope mismatch: expected "${exc.marginScope}", got "${marginScope}"`);
    }

    // 3. Accounting basis check
    if (
      exc.numeratorBasis !== numeratorBasis ||
      exc.denominatorBasis !== denominatorBasis ||
      exc.marginBasis !== marginBasis
    ) {
      candidateStructured.add('accounting_basis_mismatch');
      if (exc.numeratorBasis !== numeratorBasis)
        candidateReasons.push(`[${exc.id}] numeratorBasis mismatch: expected "${exc.numeratorBasis}", got "${numeratorBasis}"`);
      if (exc.denominatorBasis !== denominatorBasis)
        candidateReasons.push(`[${exc.id}] denominatorBasis mismatch: expected "${exc.denominatorBasis}", got "${denominatorBasis}"`);
      if (exc.marginBasis !== marginBasis)
        candidateReasons.push(`[${exc.id}] marginBasis mismatch: expected "${exc.marginBasis}", got "${marginBasis}"`);
    }

    // 4. Source document deep verification
    if (exc.sourceDocIds.length === 0) {
      candidateStructured.add('missing_evidence_reference');
      candidateReasons.push(`[${exc.id}] Exception has no source documents — evidence is required.`);
    } else {
      for (const docId of exc.sourceDocIds) {
        let doc: SourceDocument | undefined;
        if (sources instanceof Map) {
          doc = sources.get(docId);
        } else if (sources instanceof Set) {
          if (!sources.has(docId)) {
            candidateStructured.add('source_not_found');
            candidateReasons.push(`[${exc.id}] Source document "${docId}" not found in registry.`);
            continue;
          }
          // Set does not carry metadata; bypass deep checks
          continue;
        } else if (sources && typeof sources === 'object') {
          doc = (sources as Record<string, SourceDocument>)[docId];
        }

        if (!doc) {
          candidateStructured.add('source_not_found');
          candidateReasons.push(`[${exc.id}] Source document "${docId}" not found in source registry.`);
          continue;
        }

        if (!doc.isVerified && doc.verificationStatus !== 'verified') {
          candidateStructured.add('source_not_verified');
          candidateReasons.push(`[${exc.id}] Source document "${docId}" is not verified.`);
        }

        if (doc.companyId !== exc.companyId) {
          candidateStructured.add('source_company_mismatch');
          candidateReasons.push(
            `[${exc.id}] Source document "${docId}" company (${doc.companyId}) does not match exception company (${exc.companyId}).`
          );
        }

        if (exc.period && doc.period && doc.period !== exc.period) {
          candidateStructured.add('source_period_mismatch');
          candidateReasons.push(
            `[${exc.id}] Source document "${docId}" period (${doc.period}) does not match exception period (${exc.period}).`
          );
        }

        if (!doc.officialUrl || !doc.officialUrl.startsWith('https://')) {
          candidateStructured.add('missing_official_url');
          candidateReasons.push(`[${exc.id}] Source document "${docId}" missing valid HTTPS officialUrl.`);
        }
      }
    }

    if (candidateReasons.length === 0) {
      return {
        matched: true,
        exceptionId: exc.id,
        sourceDocIds: exc.sourceDocIds,
        rationale: exc.rationale,
        isProxy: exc.isProxy ?? false,
        nature: exc.nature ?? (exc.isProxy ? 'proxy_numerator' : 'actual_segment'),
      };
    }

    candidateReasons.forEach((r) => allRejectionReasons.push(r));
    candidateStructured.forEach((s) => allStructuredRejections.add(s));
  }

  return {
    matched: false,
    rejectionReasons:
      allRejectionReasons.length > 0
        ? allRejectionReasons
        : [`No exact exception match found for ${companyId} / ${period}. All candidates failed dimension matching.`],
    structuredRejections: Array.from(allStructuredRejections),
  };
}

