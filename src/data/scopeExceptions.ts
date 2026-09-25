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
  ScopeExceptionEvidence,
  EvidencePurpose,
} from '../types/metrics';

export type { EvidencePurpose };

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
   * Explicit evidence references per referenced source document (P1-2).
   * Every sourceDocId must have at least one corresponding evidence record.
   */
  evidence: ScopeExceptionEvidence[];

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
  // Data reality: BMW reports its primary operating margin at automotive_segment scope
  // ("Automotive EBIT margin"). In the dataset, group operating_income (consolidated_group)
  // is available as an observable proxy numerator. Group operating income is not mathematically
  // equivalent to segment EBIT by default. The reported margin KPI is documented officially,
  // but mathematical reproduction using group operating income is not verified.
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
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'Key Performance Indicators — Automotive Segment',
        evidenceReference: 'Automotive EBIT margin 7.8%',
        purpose: 'reported_kpi',
      },
    ],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'BMW Group Q2 2026 Interim Statement: Automotive EBIT margin reported at Automotive Segment level ' +
      '(label: "Automotive EBIT margin"). Consolidated group operating income is an observable proxy numerator, ' +
      'not verified segment EBIT. Mathematical reproduction is not verified. Review required.',
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
    evidence: [
      {
        sourceDocId: 'bmw_2026_q1_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'Key Performance Indicators — Automotive Segment',
        evidenceReference: 'Automotive EBIT margin 7.2%',
        purpose: 'reported_kpi',
      },
    ],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'BMW Group Q1 2026 Interim Statement: Automotive EBIT margin — reported KPI documented, proxy numerator not mathematically verified. Review required.',
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
    evidence: [
      {
        sourceDocId: 'bmw_2025_fy_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'Automotive Segment Key Performance Indicators',
        evidenceReference: 'Automotive EBIT margin 7.4%',
        purpose: 'reported_kpi',
      },
    ],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'BMW Group FY2025 Annual Report: Automotive EBIT margin — reported KPI documented, proxy numerator not mathematically verified. Review required.',
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
    evidence: [
      {
        sourceDocId: 'bmw_2024_fy_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'Automotive Segment Key Performance Indicators',
        evidenceReference: 'Automotive EBIT margin 6.3%',
        purpose: 'reported_kpi',
      },
    ],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'BMW Group FY2024 Annual Report: Automotive EBIT margin — reported KPI documented, proxy numerator not mathematically verified. Review required.',
  },

  // ── Mercedes-Benz Group: Cars Segment Adjusted RoS ──────────────────────────
  //
  // Data reality: Mercedes-Benz reports its primary margin as "Adjusted Return on Sales (RoS)"
  // for the Mercedes-Benz Cars segment (cars_segment, adjusted). The available observation
  // in the dataset is consolidated group operating income (consolidated_group, reported),
  // which acts as a proxy numerator. Group operating income is not equivalent to Cars Adjusted EBIT,
  // and mathematical reproduction is not verified. Review required.
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
    evidence: [
      {
        sourceDocId: 'mbg_2026_q2_results',
        sectionReference: 'Mercedes-Benz Cars',
        tableReference: 'Mercedes-Benz Cars Division KPIs',
        evidenceReference: 'Adjusted Return on Sales (RoS) 8.4%',
        purpose: 'reported_kpi',
      },
    ],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'Mercedes-Benz Group Q2 2026 Quarterly Statement: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars. ' +
      'The margin (cars_segment, adjusted) represents the Cars Division KPI. Consolidated group operating income ' +
      'is an observable proxy numerator, not verified segment EBIT. Mathematical reproduction is not verified. Review required.',
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
    evidence: [
      {
        sourceDocId: 'mbg_2026_q1_results',
        sectionReference: 'Mercedes-Benz Cars',
        tableReference: 'Mercedes-Benz Cars Division KPIs',
        evidenceReference: 'Adjusted Return on Sales (RoS) 7.9%',
        purpose: 'reported_kpi',
      },
    ],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'Mercedes-Benz Group Q1 2026: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — reported KPI documented, proxy numerator not mathematically verified. Review required.',
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
    evidence: [
      {
        sourceDocId: 'mbg_2025_fy_results',
        sectionReference: 'Mercedes-Benz Cars',
        tableReference: 'Mercedes-Benz Cars Division KPIs',
        evidenceReference: 'Adjusted Return on Sales (RoS) 8.3%',
        purpose: 'reported_kpi',
      },
    ],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'Mercedes-Benz Group FY2025 Annual Report: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — reported KPI documented, proxy numerator not mathematically verified. Review required.',
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
    evidence: [
      {
        sourceDocId: 'mbg_2024_fy_results',
        sectionReference: 'Mercedes-Benz Cars',
        tableReference: 'Mercedes-Benz Cars Division KPIs',
        evidenceReference: 'Adjusted Return on Sales (RoS) 12.6%',
        purpose: 'reported_kpi',
      },
    ],
    nature: 'proxy_numerator',
    isProxy: true,
    rationale:
      'Mercedes-Benz Group FY2024 Annual Report: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — reported KPI documented, proxy numerator not mathematically verified. Review required.',
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
 * Provenance context from actual candidate observations to bind to the exception source registry (STEP 4-5, P1).
 */
export interface ExceptionObservationContext {
  revenueSourceDocId?: string;
  numeratorSourceDocId?: string;
  marginSourceDocId?: string;
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
/**
 * Checks whether an evidence record contains at least one meaningful locator (P1).
 */
export function hasMeaningfulEvidenceLocator(ev: ScopeExceptionEvidence): boolean {
  const hasPage = ev.pageNumber !== undefined && ev.pageNumber !== null && String(ev.pageNumber).trim().length > 0;
  const hasSection = ev.sectionReference !== undefined && ev.sectionReference.trim().length > 0;
  const hasTable = ev.tableReference !== undefined && ev.tableReference.trim().length > 0;
  const hasEvidenceRef = ev.evidenceReference !== undefined && ev.evidenceReference.trim().length > 0;
  return hasPage || hasSection || hasTable || hasEvidenceRef;
}

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
  sources: ReadonlyMap<string, SourceDocument> | Record<string, SourceDocument>,
  exceptions: DocumentedScopeException[] = DOCUMENTED_SCOPE_EXCEPTIONS,
  observationContext?: ExceptionObservationContext
): ScopeExceptionValidationResult {
  const candidates = exceptions.filter(
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

    // 4. Source document deep verification & evidence checks (P1-1 & P1-2)
    if (exc.sourceDocIds.length === 0) {
      candidateStructured.add('missing_evidence_reference');
      candidateReasons.push(`[${exc.id}] Exception has no source documents — evidence is required.`);
    } else {
      // 4a. Validate evidence references do not cite unknown source documents
      if (exc.evidence) {
        for (const ev of exc.evidence) {
          if (!exc.sourceDocIds.includes(ev.sourceDocId)) {
            candidateStructured.add('missing_evidence_reference');
            candidateReasons.push(
              `[${exc.id}] Evidence references unknown sourceDocId "${ev.sourceDocId}" not present in exception sourceDocIds.`
            );
          }
        }
      }

      // 4b. Require every sourceDocId to have at least one explicit evidence record with a meaningful locator
      for (const docId of exc.sourceDocIds) {
        const matchingEv = exc.evidence?.filter((ev) => ev.sourceDocId === docId) ?? [];
        if (matchingEv.length === 0) {
          candidateStructured.add('missing_evidence_reference');
          candidateReasons.push(`[${exc.id}] Source document "${docId}" missing explicit evidence reference.`);
        } else {
          const hasMeaningful = matchingEv.some((ev) => hasMeaningfulEvidenceLocator(ev));
          if (!hasMeaningful) {
            candidateStructured.add('missing_evidence_reference');
            candidateReasons.push(
              `[${exc.id}] Evidence for source document "${docId}" lacks meaningful locators (requires at least one of pageNumber, sectionReference, tableReference, evidenceReference).`
            );
          }
        }
      }

      for (const docId of exc.sourceDocIds) {
        let doc: SourceDocument | undefined;
        if (sources instanceof Map || (sources && typeof (sources as ReadonlyMap<string, SourceDocument>).get === 'function')) {
          doc = (sources as ReadonlyMap<string, SourceDocument>).get(docId);
        } else if (sources && typeof sources === 'object') {
          doc = (sources as Record<string, SourceDocument>)[docId];
        }

        if (!doc) {
          candidateStructured.add('source_not_found');
          candidateReasons.push(`[${exc.id}] Source document "${docId}" not found in source registry.`);
          continue;
        }

        // Must satisfy BOTH isVerified === true and verificationStatus === 'verified' (P1)
        if (doc.isVerified !== true || doc.verificationStatus !== 'verified') {
          candidateStructured.add('source_not_verified');
          candidateReasons.push(
            `[${exc.id}] Source document "${docId}" is not verified (requires both isVerified=true and verificationStatus='verified', got isVerified=${doc.isVerified}, verificationStatus='${doc.verificationStatus}').`
          );
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

    // 5. Candidate observation source binding (STEP 4-5, P1)
    if (observationContext) {
      const obsDocChecks = [
        { role: 'revenue', docId: observationContext.revenueSourceDocId },
        { role: 'numerator', docId: observationContext.numeratorSourceDocId },
        { role: 'margin', docId: observationContext.marginSourceDocId },
      ];

      for (const obsCheck of obsDocChecks) {
        if (!obsCheck.docId || obsCheck.docId.trim() === '') {
          candidateStructured.add('missing_evidence_reference');
          candidateReasons.push(
            `[${exc.id}] Candidate ${obsCheck.role} observation is missing sourceDocId.`
          );
        } else if (!exc.sourceDocIds.includes(obsCheck.docId)) {
          candidateStructured.add('source_not_found');
          candidateReasons.push(
            `[${exc.id}] Candidate ${obsCheck.role} observation sourceDocId "${obsCheck.docId}" is not present in exception sourceDocIds [${exc.sourceDocIds.join(', ')}].`
          );
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

