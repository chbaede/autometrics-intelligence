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
  DocumentedReportedKpi,
  ProxyMetricMapping,
  ProxyMetricMappingQuery,
  PeriodType,
  MetricObservation,
  DocumentedScopeException,
  MarginValidationContext,
  MappingLookupResult,
} from '../types/metrics';

export type { EvidencePurpose, DocumentedReportedKpi, ProxyMetricMapping, ProxyMetricMappingQuery, DocumentedScopeException, MarginValidationContext, MappingLookupResult };


/**
 * DOCUMENTED_REPORTED_KPIS (STEP 4-6, P0-1)
 * Official segment-level KPIs reported directly by OEMs in their primary filings.
 * These records prove the KPI is officially reported by the OEM, but do NOT prove proxy mathematical equivalence.
 */
export const DOCUMENTED_REPORTED_KPIS: DocumentedReportedKpi[] = [
  // ── BMW Group: Automotive EBIT margin ──────────────────────────────────────
  {
    id: 'bmw_automotive_segment_ros_2026q2_kpi',
    companyId: 'bmw_group',
    period: '2026-Q2',
    periodType: 'quarterly',
    metricId: 'operating_margin',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
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
  },
  {
    id: 'bmw_automotive_segment_ros_2026q1_kpi',
    companyId: 'bmw_group',
    period: '2026-Q1',
    periodType: 'quarterly',
    metricId: 'operating_margin',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
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
  },
  {
    id: 'bmw_automotive_segment_ros_2025fy_kpi',
    companyId: 'bmw_group',
    period: '2025-FY',
    periodType: 'annual',
    metricId: 'operating_margin',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
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
  },
  {
    id: 'bmw_automotive_segment_ros_2024fy_kpi',
    companyId: 'bmw_group',
    period: '2024-FY',
    periodType: 'annual',
    metricId: 'operating_margin',
    reportingScope: 'automotive_segment',
    accountingBasis: 'reported',
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
  },

  // ── Mercedes-Benz Group: Cars Adjusted Return on Sales ──────────────────────
  {
    id: 'mbg_cars_adjusted_ros_2026q2_kpi',
    companyId: 'mercedes_benz',
    period: '2026-Q2',
    periodType: 'quarterly',
    metricId: 'operating_margin',
    reportingScope: 'cars_segment',
    accountingBasis: 'adjusted',
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
  },
  {
    id: 'mbg_cars_adjusted_ros_2026q1_kpi',
    companyId: 'mercedes_benz',
    period: '2026-Q1',
    periodType: 'quarterly',
    metricId: 'operating_margin',
    reportingScope: 'cars_segment',
    accountingBasis: 'adjusted',
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
  },
  {
    id: 'mbg_cars_adjusted_ros_2025fy_kpi',
    companyId: 'mercedes_benz',
    period: '2025-FY',
    periodType: 'annual',
    metricId: 'operating_margin',
    reportingScope: 'cars_segment',
    accountingBasis: 'adjusted',
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
  },
  {
    id: 'mbg_cars_adjusted_ros_2024fy_kpi',
    companyId: 'mercedes_benz',
    period: '2024-FY',
    periodType: 'annual',
    metricId: 'operating_margin',
    reportingScope: 'cars_segment',
    accountingBasis: 'adjusted',
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
  },
];

/**
 * PROXY_METRIC_MAPPINGS (STEP 4-6, P0-1; STEP 4-7, P1-1 & P1-3)
 * Explicit mappings defining when an observable proxy metric is substituted for an unobserved segment metric.
 * These mappings always yield status 'proxy_only' and require human review.
 */
export const PROXY_METRIC_MAPPINGS: ProxyMetricMapping[] = [
  // ── BMW Group: Group Operating Income -> Automotive EBIT proxy ──────────────
  {
    id: 'bmw_group_operating_income_proxy_2026q2',
    companyId: 'bmw_group',
    period: '2026-Q2',
    periodType: 'quarterly',
    targetMetricId: 'automotive_segment_ebit',
    targetNumeratorSemantic: 'automotive_segment_ebit',
    targetScope: 'automotive_segment',
    targetBasis: 'reported',
    proxyMetricId: 'operating_income',
    proxyScope: 'consolidated_group',
    proxyBasis: 'reported',
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['bmw_2026_q2_statement'],
    evidence: [
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'Key Performance Indicators — Automotive Segment',
        evidenceReference: 'Automotive EBIT margin 7.8%',
        purpose: 'scope_definition',
      },
    ],
    status: 'proxy_only',
    reason: 'BMW Group reports Automotive EBIT margin at segment level. In dataset, group operating income is an available observable proxy numerator. Group operating income is not mathematically equivalent to segment EBIT.',
  },
  {
    id: 'bmw_group_operating_income_proxy_2026q1',
    companyId: 'bmw_group',
    period: '2026-Q1',
    periodType: 'quarterly',
    targetMetricId: 'automotive_segment_ebit',
    targetNumeratorSemantic: 'automotive_segment_ebit',
    targetScope: 'automotive_segment',
    targetBasis: 'reported',
    proxyMetricId: 'operating_income',
    proxyScope: 'consolidated_group',
    proxyBasis: 'reported',
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['bmw_2026_q1_statement'],
    evidence: [
      {
        sourceDocId: 'bmw_2026_q1_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'Key Performance Indicators — Automotive Segment',
        evidenceReference: 'Automotive EBIT margin 7.2%',
        purpose: 'scope_definition',
      },
    ],
    status: 'proxy_only',
    reason: 'BMW Group Q1 2026: Proxy numerator relationship — group operating income is not mathematically equivalent to segment EBIT.',
  },
  {
    id: 'bmw_group_operating_income_proxy_2025fy',
    companyId: 'bmw_group',
    period: '2025-FY',
    periodType: 'annual',
    targetMetricId: 'automotive_segment_ebit',
    targetNumeratorSemantic: 'automotive_segment_ebit',
    targetScope: 'automotive_segment',
    targetBasis: 'reported',
    proxyMetricId: 'operating_income',
    proxyScope: 'consolidated_group',
    proxyBasis: 'reported',
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['bmw_2025_fy_statement'],
    evidence: [
      {
        sourceDocId: 'bmw_2025_fy_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'Automotive Segment Key Performance Indicators',
        evidenceReference: 'Automotive EBIT margin 7.4%',
        purpose: 'scope_definition',
      },
    ],
    status: 'proxy_only',
    reason: 'BMW Group FY2025: Proxy numerator relationship — group operating income is not mathematically equivalent to segment EBIT.',
  },
  {
    id: 'bmw_group_operating_income_proxy_2024fy',
    companyId: 'bmw_group',
    period: '2024-FY',
    periodType: 'annual',
    targetMetricId: 'automotive_segment_ebit',
    targetNumeratorSemantic: 'automotive_segment_ebit',
    targetScope: 'automotive_segment',
    targetBasis: 'reported',
    proxyMetricId: 'operating_income',
    proxyScope: 'consolidated_group',
    proxyBasis: 'reported',
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['bmw_2024_fy_statement'],
    evidence: [
      {
        sourceDocId: 'bmw_2024_fy_statement',
        sectionReference: 'Automotive Segment',
        tableReference: 'Automotive Segment Key Performance Indicators',
        evidenceReference: 'Automotive EBIT margin 6.3%',
        purpose: 'scope_definition',
      },
    ],
    status: 'proxy_only',
    reason: 'BMW Group FY2024: Proxy numerator relationship — group operating income is not mathematically equivalent to segment EBIT.',
  },

  // ── Mercedes-Benz Group: Group Operating Income -> Cars Adjusted EBIT proxy ─
  {
    id: 'mbg_group_operating_income_proxy_2026q2',
    companyId: 'mercedes_benz',
    period: '2026-Q2',
    periodType: 'quarterly',
    targetMetricId: 'cars_adjusted_ebit',
    targetNumeratorSemantic: 'cars_adjusted_ebit',
    targetScope: 'cars_segment',
    targetBasis: 'adjusted',
    proxyMetricId: 'operating_income',
    proxyScope: 'consolidated_group',
    proxyBasis: 'reported',
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['mbg_2026_q2_results'],
    evidence: [
      {
        sourceDocId: 'mbg_2026_q2_results',
        sectionReference: 'Mercedes-Benz Cars',
        tableReference: 'Mercedes-Benz Cars Division KPIs',
        evidenceReference: 'Adjusted Return on Sales (RoS) 8.4%',
        purpose: 'scope_definition',
      },
    ],
    status: 'proxy_only',
    reason: 'Mercedes-Benz Group Q2 2026: Proxy numerator relationship — reported group operating income is not mathematically equivalent to Cars adjusted EBIT.',
  },
  {
    id: 'mbg_group_operating_income_proxy_2026q1',
    companyId: 'mercedes_benz',
    period: '2026-Q1',
    periodType: 'quarterly',
    targetMetricId: 'cars_adjusted_ebit',
    targetNumeratorSemantic: 'cars_adjusted_ebit',
    targetScope: 'cars_segment',
    targetBasis: 'adjusted',
    proxyMetricId: 'operating_income',
    proxyScope: 'consolidated_group',
    proxyBasis: 'reported',
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['mbg_2026_q1_results'],
    evidence: [
      {
        sourceDocId: 'mbg_2026_q1_results',
        sectionReference: 'Mercedes-Benz Cars',
        tableReference: 'Mercedes-Benz Cars Division KPIs',
        evidenceReference: 'Adjusted Return on Sales (RoS) 7.9%',
        purpose: 'scope_definition',
      },
    ],
    status: 'proxy_only',
    reason: 'Mercedes-Benz Group Q1 2026: Proxy numerator relationship — reported group operating income is not mathematically equivalent to Cars adjusted EBIT.',
  },
  {
    id: 'mbg_group_operating_income_proxy_2025fy',
    companyId: 'mercedes_benz',
    period: '2025-FY',
    periodType: 'annual',
    targetMetricId: 'cars_adjusted_ebit',
    targetNumeratorSemantic: 'cars_adjusted_ebit',
    targetScope: 'cars_segment',
    targetBasis: 'adjusted',
    proxyMetricId: 'operating_income',
    proxyScope: 'consolidated_group',
    proxyBasis: 'reported',
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['mbg_2025_fy_results'],
    evidence: [
      {
        sourceDocId: 'mbg_2025_fy_results',
        sectionReference: 'Mercedes-Benz Cars',
        tableReference: 'Mercedes-Benz Cars Division KPIs',
        evidenceReference: 'Adjusted Return on Sales (RoS) 8.3%',
        purpose: 'scope_definition',
      },
    ],
    status: 'proxy_only',
    reason: 'Mercedes-Benz Group FY2025: Proxy numerator relationship — reported group operating income is not mathematically equivalent to Cars adjusted EBIT.',
  },
  {
    id: 'mbg_group_operating_income_proxy_2024fy',
    companyId: 'mercedes_benz',
    period: '2024-FY',
    periodType: 'annual',
    targetMetricId: 'cars_adjusted_ebit',
    targetNumeratorSemantic: 'cars_adjusted_ebit',
    targetScope: 'cars_segment',
    targetBasis: 'adjusted',
    proxyMetricId: 'operating_income',
    proxyScope: 'consolidated_group',
    proxyBasis: 'reported',
    denominatorMetricId: 'revenue',
    denominatorScope: 'consolidated_group',
    denominatorBasis: 'reported',
    sourceDocIds: ['mbg_2024_fy_results'],
    evidence: [
      {
        sourceDocId: 'mbg_2024_fy_results',
        sectionReference: 'Mercedes-Benz Cars',
        tableReference: 'Mercedes-Benz Cars Division KPIs',
        evidenceReference: 'Adjusted Return on Sales (RoS) 12.6%',
        purpose: 'scope_definition',
      },
    ],
    status: 'proxy_only',
    reason: 'Mercedes-Benz Group FY2024: Proxy numerator relationship — reported group operating income is not mathematically equivalent to Cars adjusted EBIT.',
  },
];

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
    periodType: 'quarterly',
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
    reportedKpiId: 'bmw_automotive_segment_ros_2026q2_kpi',
    proxyMappingId: 'bmw_group_operating_income_proxy_2026q2',
    rationale:
      'BMW Group Q2 2026 Interim Statement: Automotive EBIT margin reported at Automotive Segment level ' +
      '(label: "Automotive EBIT margin"). Consolidated group operating income is an observable proxy numerator, ' +
      'not verified segment EBIT. Mathematical reproduction is not verified. Review required.',
  },
  {
    id: 'bmw_automotive_segment_ros_2026q1',
    companyId: 'bmw_group',
    period: '2026-Q1',
    periodType: 'quarterly',
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
    reportedKpiId: 'bmw_automotive_segment_ros_2026q1_kpi',
    proxyMappingId: 'bmw_group_operating_income_proxy_2026q1',
    rationale:
      'BMW Group Q1 2026 Interim Statement: Automotive EBIT margin — reported KPI documented, proxy numerator not mathematically verified. Review required.',
  },
  {
    id: 'bmw_automotive_segment_ros_2025fy',
    companyId: 'bmw_group',
    period: '2025-FY',
    periodType: 'annual',
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
    reportedKpiId: 'bmw_automotive_segment_ros_2025fy_kpi',
    proxyMappingId: 'bmw_group_operating_income_proxy_2025fy',
    rationale:
      'BMW Group FY2025 Annual Report: Automotive EBIT margin — reported KPI documented, proxy numerator not mathematically verified. Review required.',
  },
  {
    id: 'bmw_automotive_segment_ros_2024fy',
    companyId: 'bmw_group',
    period: '2024-FY',
    periodType: 'annual',
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
    reportedKpiId: 'bmw_automotive_segment_ros_2024fy_kpi',
    proxyMappingId: 'bmw_group_operating_income_proxy_2024fy',
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
    periodType: 'quarterly',
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
    reportedKpiId: 'mbg_cars_adjusted_ros_2026q2_kpi',
    proxyMappingId: 'mbg_group_operating_income_proxy_2026q2',
    rationale:
      'Mercedes-Benz Group Q2 2026 Quarterly Statement: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars. ' +
      'The margin (cars_segment, adjusted) represents the Cars Division KPI. Consolidated group operating income ' +
      'is an observable proxy numerator, not verified segment EBIT. Mathematical reproduction is not verified. Review required.',
  },
  {
    id: 'mbg_cars_adjusted_ros_2026q1',
    companyId: 'mercedes_benz',
    period: '2026-Q1',
    periodType: 'quarterly',
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
    reportedKpiId: 'mbg_cars_adjusted_ros_2026q1_kpi',
    proxyMappingId: 'mbg_group_operating_income_proxy_2026q1',
    rationale:
      'Mercedes-Benz Group Q1 2026: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — reported KPI documented, proxy numerator not mathematically verified. Review required.',
  },
  {
    id: 'mbg_cars_adjusted_ros_2025fy',
    companyId: 'mercedes_benz',
    period: '2025-FY',
    periodType: 'annual',
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
    reportedKpiId: 'mbg_cars_adjusted_ros_2025fy_kpi',
    proxyMappingId: 'mbg_group_operating_income_proxy_2025fy',
    rationale:
      'Mercedes-Benz Group FY2025 Annual Report: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — reported KPI documented, proxy numerator not mathematically verified. Review required.',
  },
  {
    id: 'mbg_cars_adjusted_ros_2024fy',
    companyId: 'mercedes_benz',
    period: '2024-FY',
    periodType: 'annual',
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
    reportedKpiId: 'mbg_cars_adjusted_ros_2024fy_kpi',
    proxyMappingId: 'mbg_group_operating_income_proxy_2024fy',
    rationale:
      'Mercedes-Benz Group FY2024 Annual Report: "Adjusted Return on Sales (RoS)" for Mercedes-Benz Cars — reported KPI documented, proxy numerator not mathematically verified. Review required.',
  },
];

/**
 * Finds all matching documented reported KPIs (STEP 4-8, Task 3 & Task 6).
 */
export function findDocumentedReportedKpis(
  companyId: string,
  period?: string,
  metricId?: string,
  reportingScope?: ReportingScope,
  periodType?: PeriodType,
  accountingBasis?: AccountingBasis,
  kpisList: DocumentedReportedKpi[] = DOCUMENTED_REPORTED_KPIS
): DocumentedReportedKpi[] {
  return kpisList.filter(
    (k) =>
      k.companyId === companyId &&
      (period === undefined || k.period === undefined || k.period === period) &&
      (metricId === undefined || k.metricId === metricId) &&
      (reportingScope === undefined || k.reportingScope === reportingScope) &&
      (periodType === undefined || k.periodType === undefined || k.periodType === periodType) &&
      (accountingBasis === undefined || k.accountingBasis === undefined || k.accountingBasis === accountingBasis)
  );
}

/**
 * Finds a unique documented reported KPI (STEP 4-6, P0-1; STEP 4-8, Task 3).
 * Returns undefined if no match OR if multiple ambiguous matches occur.
 */
export function findDocumentedReportedKpi(
  companyId: string,
  period?: string,
  metricId?: string,
  reportingScope?: ReportingScope,
  periodType?: PeriodType,
  accountingBasis?: AccountingBasis,
  kpisList: DocumentedReportedKpi[] = DOCUMENTED_REPORTED_KPIS
): DocumentedReportedKpi | undefined {
  const matches = findDocumentedReportedKpis(
    companyId,
    period,
    metricId,
    reportingScope,
    periodType,
    accountingBasis,
    kpisList
  );
  if (matches.length === 1) {
    return matches[0];
  }
  // Ambiguous if multiple matches: do not use arbitrary .find()
  return undefined;
}

/**
 * Compatibility validation result for DocumentedReportedKpi (STEP 4-8, Task 6).
 */
export interface DocumentedKpiValidationResult {
  isValid: boolean;
  mismatches: string[];
  reasons: string[];
}

/**
 * Helper to retrieve a source document from Map, ReadonlyMap, or Record.
 */
function lookupSourceDocInRegistry(
  sourcesMap: ReadonlyMap<string, SourceDocument> | Map<string, SourceDocument> | Record<string, SourceDocument>,
  docId: string
): SourceDocument | undefined {
  if (sourcesMap instanceof Map || typeof (sourcesMap as ReadonlyMap<string, SourceDocument>).get === 'function') {
    return (sourcesMap as ReadonlyMap<string, SourceDocument>).get(docId);
  }
  return (sourcesMap as Record<string, SourceDocument>)[docId];
}

/**
 * Validates actual observation compatibility with a DocumentedReportedKpi (STEP 4-8, Task 6; STEP 4-9, Task 2).
 */
export function validateDocumentedReportedKpiCompatibility(
  kpi: DocumentedReportedKpi,
  marginObs: MetricObservation,
  sourcesMap?: ReadonlyMap<string, SourceDocument> | Map<string, SourceDocument> | Record<string, SourceDocument>
): DocumentedKpiValidationResult {
  const mismatches: string[] = [];
  const reasons: string[] = [];

  if (kpi.companyId !== marginObs.companyId) {
    mismatches.push('companyId');
    reasons.push(
      `Reported KPI companyId "${kpi.companyId}" does not match margin observation "${marginObs.companyId}".`
    );
  }

  if (kpi.period && kpi.period !== marginObs.period) {
    mismatches.push('period');
    reasons.push(
      `Reported KPI period "${kpi.period}" does not match margin observation "${marginObs.period}".`
    );
  }

  if (kpi.periodType && kpi.periodType !== marginObs.periodType) {
    mismatches.push('periodType');
    reasons.push(
      `Reported KPI periodType "${kpi.periodType}" does not match margin observation "${marginObs.periodType}".`
    );
  }

  if (kpi.metricId !== marginObs.metricId) {
    mismatches.push('metricId');
    reasons.push(
      `Reported KPI metricId "${kpi.metricId}" does not match margin observation "${marginObs.metricId}".`
    );
  }

  if (kpi.reportingScope && kpi.reportingScope !== marginObs.reportingScope) {
    mismatches.push('reportingScope');
    reasons.push(
      `Reported KPI scope "${kpi.reportingScope}" does not match margin observation "${marginObs.reportingScope}".`
    );
  }

  if (kpi.accountingBasis && kpi.accountingBasis !== marginObs.accountingBasis) {
    mismatches.push('accountingBasis');
    reasons.push(
      `Reported KPI accountingBasis "${kpi.accountingBasis}" does not match margin observation "${marginObs.accountingBasis}".`
    );
  }

  if (!marginObs.sourceDocId || !kpi.sourceDocIds.includes(marginObs.sourceDocId)) {
    mismatches.push('sourceDocId');
    reasons.push(
      `Margin observation sourceDocId "${marginObs.sourceDocId}" is not present in KPI sourceDocIds [${kpi.sourceDocIds.join(', ')}].`
    );
  }

  if (marginObs.verificationStatus !== 'verified') {
    mismatches.push('verificationStatus');
    reasons.push(
      `Margin observation verification status is "${marginObs.verificationStatus}", expected "verified".`
    );
  }

  // Deep source registry validation (STEP 4-9, Task 2)
  if (sourcesMap) {
    for (const docId of kpi.sourceDocIds) {
      const doc = lookupSourceDocInRegistry(sourcesMap, docId);
      if (!doc) {
        if (!mismatches.includes('sourceMissing')) mismatches.push('sourceMissing');
        reasons.push(`Source document "${docId}" referenced by KPI was not found in registry.`);
      } else {
        if (doc.isVerified !== true) {
          if (!mismatches.includes('sourceUnverified')) mismatches.push('sourceUnverified');
          reasons.push(`Source document "${docId}" referenced by KPI is not verified (isVerified !== true).`);
        }
        if (doc.verificationStatus !== 'verified') {
          if (!mismatches.includes('sourceVerificationStatus')) mismatches.push('sourceVerificationStatus');
          reasons.push(`Source document "${docId}" verificationStatus is "${doc.verificationStatus}", expected "verified".`);
        }
        if (doc.companyId !== kpi.companyId) {
          if (!mismatches.includes('sourceCompanyMismatch')) mismatches.push('sourceCompanyMismatch');
          reasons.push(`Source document "${docId}" companyId "${doc.companyId}" does not match KPI companyId "${kpi.companyId}".`);
        }
        if (doc.period && kpi.period && doc.period !== kpi.period) {
          if (!mismatches.includes('sourcePeriodMismatch')) mismatches.push('sourcePeriodMismatch');
          reasons.push(`Source document "${docId}" period "${doc.period}" does not match KPI period "${kpi.period}".`);
        }
        if (!doc.officialUrl || !doc.officialUrl.startsWith('https://')) {
          if (!mismatches.includes('sourceOfficialUrl')) mismatches.push('sourceOfficialUrl');
          reasons.push(`Source document "${docId}" officialUrl must be a valid HTTPS URL.`);
        }
        if (!doc.publicationDate || !/^\d{4}-\d{2}-\d{2}$/.test(doc.publicationDate)) {
          if (!mismatches.includes('sourcePublicationDate')) mismatches.push('sourcePublicationDate');
          reasons.push(`Source document "${docId}" publicationDate "${doc.publicationDate}" is not a valid ISO date.`);
        }
      }
    }
  }

  // Evidence source reference and locator validation (STEP 4-9 & STEP 4-10, Task 2)
  if (!kpi.evidence || kpi.evidence.length === 0) {
    if (!mismatches.includes('missingEvidenceLocator')) mismatches.push('missingEvidenceLocator');
    reasons.push(`Reported KPI [${kpi.id}] has no evidence items.`);
  } else {
    for (const ev of kpi.evidence) {
      if (!kpi.sourceDocIds.includes(ev.sourceDocId)) {
        if (!mismatches.includes('evidenceSourceDocMismatch')) mismatches.push('evidenceSourceDocMismatch');
        reasons.push(`Reported KPI [${kpi.id}] evidence sourceDocId "${ev.sourceDocId}" is not included in sourceDocIds [${kpi.sourceDocIds.join(', ')}].`);
      }
      if (sourcesMap) {
        const evDoc = lookupSourceDocInRegistry(sourcesMap, ev.sourceDocId);
        if (!evDoc) {
          if (!mismatches.includes('evidenceSourceMissing')) mismatches.push('evidenceSourceMissing');
          reasons.push(`Reported KPI [${kpi.id}] evidence sourceDocId "${ev.sourceDocId}" was not found in source registry.`);
        }
      }
      if (!hasMeaningfulEvidenceLocator(ev)) {
        if (!mismatches.includes('missingEvidenceLocator')) mismatches.push('missingEvidenceLocator');
        reasons.push(`Reported KPI [${kpi.id}] evidence for source "${ev.sourceDocId}" lacks meaningful locators.`);
      }
    }
  }

  const hasReportedKpiEvidence = kpi.evidence && kpi.evidence.some((ev) => ev.purpose === 'reported_kpi');
  if (!hasReportedKpiEvidence) {
    mismatches.push('evidencePurpose');
    reasons.push(`Reported KPI [${kpi.id}] does not contain evidence with purpose "reported_kpi".`);
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    reasons,
  };
}

/**
 * Canonical helper to detect whether an exception represents a proxy relationship (STEP 4-7, P1-2).
 * Centralizes proxy detection across isProxy, nature, and proxyMappingId.
 */
export function isProxyException(
  exception?: DocumentedScopeException | null
): boolean {
  if (!exception) return false;

  return (
    exception.isProxy === true ||
    exception.nature === 'proxy_numerator' ||
    !!exception.proxyMappingId
  );
}

/**
 * Normalizes proxy exception metadata and detects inconsistent registry states (STEP 4-7, P1-2).
 * Detects states such as nature='proxy_numerator' with isProxy=false.
 */
export function normalizeProxyException(exception: DocumentedScopeException): {
  isProxy: boolean;
  isInconsistent: boolean;
  error?: string;
} {
  if (exception.nature === 'proxy_numerator' && exception.isProxy === false) {
    return {
      isProxy: true,
      isInconsistent: true,
      error: `Inconsistent registry state: exception [${exception.id}] has nature='proxy_numerator' but isProxy=false.`,
    };
  }

  if (exception.nature === 'actual_segment' && exception.isProxy === true) {
    return {
      isProxy: false,
      isInconsistent: true,
      error: `Inconsistent registry state: exception [${exception.id}] has nature='actual_segment' but isProxy=true.`,
    };
  }

  if (exception.proxyMappingId && exception.isProxy === false) {
    return {
      isProxy: true,
      isInconsistent: true,
      error: `Inconsistent registry state: exception [${exception.id}] has proxyMappingId="${exception.proxyMappingId}" but isProxy=false.`,
    };
  }

  const isProxy = isProxyException(exception);
  return {
    isProxy,
    isInconsistent: false,
  };
}

/**
 * Compatibility validation result for ProxyMetricMapping (STEP 4-7, P1-4; STEP 4-8, Task 2; STEP 4-9, Task 1).
 */
export interface ProxyMappingValidationResult {
  isValid: boolean;
  mismatches: string[];
  reasons: string[];
}

/**
 * Validates actual observation compatibility with a ProxyMetricMapping (STEP 4-7, P1-4; STEP 4-8, Task 2; STEP 4-9, Task 1 & 3).
 * Verifies:
 *  - Mapping invariants (status='proxy_only', non-empty id, reason, sourceDocIds, evidence, targetNumeratorSemantic)
/**
 * Allowlist of authorized target numerator semantics per company (STEP 4-10, Task 4).
 * Rejects unsupported proxy companies and ensures explicit target semantics.
 */
export const TARGET_SEMANTICS_BY_COMPANY: Record<string, readonly string[]> = {
  bmw_group: ['automotive_segment_ebit'],
  mercedes_benz: ['cars_adjusted_ebit'],
};

/**
 * Validates actual observation compatibility with a ProxyMetricMapping (STEP 4-7, P1-4; STEP 4-8, Task 2; STEP 4-9, Task 1 & 3; STEP 4-10, Tasks 1-5).
 * Verifies:
 *  - Mapping invariants (status='proxy_only', non-empty id, reason, sourceDocIds, evidence, targetNumeratorSemantic)
 *  - Evidence locators have at least one meaningful locator and match mapping sourceDocIds (Task 2)
 *  - revObs matches denominator contract (denominatorMetricId, denominatorScope, denominatorBasis) (Task 3)
 *  - Candidate revenue observation follows Policy A (revObs.sourceDocId in mapping.sourceDocIds) (Task 5)
 *  - profitObs matches proxyMetricId, proxyScope, proxyBasis, and sourceDocIds
 *  - marginObs matches targetScope, targetBasis, and sourceDocIds
 *  - period and periodType match
 *  - Company allowlist and targetNumeratorSemantic match OEM requirements (Task 4)
 *  - Mandatory deep source registry verification against sourcesMap (Task 1)
 */
export function validateProxyMappingCompatibility(
  mapping: ProxyMetricMapping,
  revObs: MetricObservation,
  profitObs: MetricObservation,
  marginObs: MetricObservation,
  sourcesMap: ReadonlyMap<string, SourceDocument> | Map<string, SourceDocument> | Record<string, SourceDocument>
): ProxyMappingValidationResult {
  const reasons: string[] = [];
  const mismatches: string[] = [];

  // Mapping invariants (STEP 4-9, Task 5)
  if (mapping.status !== 'proxy_only') {
    mismatches.push('invalidMappingStatus');
    reasons.push(`ProxyMapping status must be "proxy_only", got "${mapping.status}".`);
  }
  if (!mapping.id || mapping.id.trim().length === 0) {
    mismatches.push('emptyMappingId');
    reasons.push('ProxyMapping id must not be empty.');
  }
  if (!mapping.reason || mapping.reason.trim().length === 0) {
    mismatches.push('emptyMappingReason');
    reasons.push('ProxyMapping reason must not be empty.');
  }
  if (!mapping.sourceDocIds || mapping.sourceDocIds.length === 0) {
    mismatches.push('emptySourceDocIds');
    reasons.push('ProxyMapping sourceDocIds must not be empty.');
  }
  if (!mapping.evidence || mapping.evidence.length === 0) {
    mismatches.push('emptyEvidence');
    reasons.push('ProxyMapping evidence must not be empty.');
  }
  const targetSemantic = mapping.targetNumeratorSemantic || mapping.targetMetricId;
  if (!targetSemantic || targetSemantic.trim().length === 0) {
    mismatches.push('emptyTargetNumeratorSemantic');
    reasons.push('ProxyMapping targetNumeratorSemantic must not be empty.');
  }

  // Evidence validation (STEP 4-9, Task 1 & STEP 4-10, Task 2)
  if (mapping.evidence && mapping.evidence.length > 0) {
    for (const ev of mapping.evidence) {
      if (!mapping.sourceDocIds || !mapping.sourceDocIds.includes(ev.sourceDocId)) {
        if (!mismatches.includes('evidenceSourceDocMismatch')) mismatches.push('evidenceSourceDocMismatch');
        reasons.push(`ProxyMapping [${mapping.id}] evidence sourceDocId "${ev.sourceDocId}" is not included in sourceDocIds [${(mapping.sourceDocIds || []).join(', ')}].`);
      }
      if (sourcesMap) {
        const evDoc = lookupSourceDocInRegistry(sourcesMap, ev.sourceDocId);
        if (!evDoc) {
          if (!mismatches.includes('evidenceSourceMissing')) mismatches.push('evidenceSourceMissing');
          reasons.push(`ProxyMapping [${mapping.id}] evidence source "${ev.sourceDocId}" was not found in source registry.`);
        }
      }
      if (!hasMeaningfulEvidenceLocator(ev)) {
        if (!mismatches.includes('missingEvidenceLocator')) mismatches.push('missingEvidenceLocator');
        reasons.push(`ProxyMapping [${mapping.id}] evidence for source "${ev.sourceDocId}" lacks meaningful locator.`);
      }
    }
  }

  // 1. Company ID
  if (
    mapping.companyId !== revObs.companyId ||
    mapping.companyId !== profitObs.companyId ||
    mapping.companyId !== marginObs.companyId
  ) {
    mismatches.push('companyId');
    reasons.push(
      `ProxyMapping companyId "${mapping.companyId}" does not match triplet observations: rev (${revObs.companyId}), profit (${profitObs.companyId}), margin (${marginObs.companyId}).`
    );
  }

  // 2. Period (STEP 4-8, Task 2)
  if (
    mapping.period &&
    (mapping.period !== revObs.period ||
      mapping.period !== profitObs.period ||
      mapping.period !== marginObs.period)
  ) {
    mismatches.push('period');
    reasons.push(
      `ProxyMapping period "${mapping.period}" does not match triplet observations: rev (${revObs.period}), profit (${profitObs.period}), margin (${marginObs.period}).`
    );
  }

  // 3. PeriodType (STEP 4-8, Task 2)
  if (
    mapping.periodType &&
    (mapping.periodType !== revObs.periodType ||
      mapping.periodType !== profitObs.periodType ||
      mapping.periodType !== marginObs.periodType)
  ) {
    mismatches.push('periodType');
    reasons.push(
      `ProxyMapping periodType "${mapping.periodType}" does not match triplet observations: rev (${revObs.periodType}), profit (${profitObs.periodType}), margin (${marginObs.periodType}).`
    );
  }

  // 4. Candidate profit observation against proxy definition (STEP 4-8, Task 2)
  if (profitObs.metricId !== mapping.proxyMetricId) {
    mismatches.push('proxyMetricId');
    reasons.push(
      `Candidate profit metric "${profitObs.metricId}" does not match mapping proxyMetricId "${mapping.proxyMetricId}".`
    );
  }
  if (profitObs.reportingScope !== mapping.proxyScope) {
    mismatches.push('proxyScope');
    reasons.push(
      `Candidate profit scope "${profitObs.reportingScope}" does not match mapping proxyScope "${mapping.proxyScope}".`
    );
  }
  if (profitObs.accountingBasis !== mapping.proxyBasis) {
    mismatches.push('proxyBasis');
    reasons.push(
      `Candidate profit basis "${profitObs.accountingBasis}" does not match mapping proxyBasis "${mapping.proxyBasis}".`
    );
  }
  if (!profitObs.sourceDocId || !mapping.sourceDocIds.includes(profitObs.sourceDocId)) {
    mismatches.push('profitSourceDoc');
    reasons.push(
      `Candidate profit sourceDocId "${profitObs.sourceDocId}" is not present in mapping sourceDocIds [${mapping.sourceDocIds.join(', ')}].`
    );
  }

  // 5. Candidate margin observation against target definition (STEP 4-8, Task 2)
  if (marginObs.reportingScope !== mapping.targetScope) {
    mismatches.push('targetScope');
    reasons.push(
      `Candidate margin scope "${marginObs.reportingScope}" does not match mapping targetScope "${mapping.targetScope}".`
    );
  }
  if (marginObs.accountingBasis !== mapping.targetBasis) {
    mismatches.push('targetBasis');
    reasons.push(
      `Candidate margin basis "${marginObs.accountingBasis}" does not match mapping targetBasis "${mapping.targetBasis}".`
    );
  }
  if (!marginObs.sourceDocId || !mapping.sourceDocIds.includes(marginObs.sourceDocId)) {
    mismatches.push('marginSourceDoc');
    reasons.push(
      `Candidate margin sourceDocId "${marginObs.sourceDocId}" is not present in mapping sourceDocIds [${mapping.sourceDocIds.join(', ')}].`
    );
  }

  // 6. Mandatory denominator contract validation against revObs (STEP 4-9 & STEP 4-10, Task 3)
  if (!mapping.denominatorMetricId) {
    mismatches.push('missingDenominatorMetricId');
    mismatches.push('denominatorMetricId');
    reasons.push(`ProxyMapping [${mapping.id}] is missing required denominatorMetricId contract.`);
  } else if (revObs.metricId !== mapping.denominatorMetricId) {
    mismatches.push('denominatorMetricId');
    reasons.push(
      `Candidate revenue metricId "${revObs.metricId}" does not match mapping denominatorMetricId "${mapping.denominatorMetricId}".`
    );
  }

  if (!mapping.denominatorScope) {
    mismatches.push('missingDenominatorScope');
    mismatches.push('denominatorScope');
    reasons.push(`ProxyMapping [${mapping.id}] is missing required denominatorScope contract.`);
  } else if (revObs.reportingScope !== mapping.denominatorScope) {
    mismatches.push('denominatorScope');
    reasons.push(
      `Candidate revenue scope "${revObs.reportingScope}" does not match mapping denominatorScope "${mapping.denominatorScope}".`
    );
  }

  if (!mapping.denominatorBasis) {
    mismatches.push('missingDenominatorBasis');
    mismatches.push('denominatorBasis');
    reasons.push(`ProxyMapping [${mapping.id}] is missing required denominatorBasis contract.`);
  } else if (revObs.accountingBasis !== mapping.denominatorBasis) {
    mismatches.push('denominatorBasis');
    reasons.push(
      `Candidate revenue basis "${revObs.accountingBasis}" does not match mapping denominatorBasis "${mapping.denominatorBasis}".`
    );
  }

  // Revenue source provenance policy (Policy A - STEP 4-10, Task 5)
  if (!revObs.sourceDocId || !mapping.sourceDocIds.includes(revObs.sourceDocId)) {
    mismatches.push('revenueSourceDoc');
    reasons.push(
      `Candidate revenue sourceDocId "${revObs.sourceDocId}" is not present in mapping sourceDocIds [${mapping.sourceDocIds.join(', ')}].`
    );
  }

  // 7. Company allowlist and target numerator semantic validation (STEP 4-8, Task 2; STEP 4-10, Task 4)
  const allowedSemantics = TARGET_SEMANTICS_BY_COMPANY[mapping.companyId];
  if (!allowedSemantics) {
    mismatches.push('unsupportedProxyCompany');
    reasons.push(
      `Unsupported proxy company "${mapping.companyId}". Proxy mappings are only permitted for authorized OEM semantics.`
    );
  } else {
    if (!targetSemantic || !allowedSemantics.includes(targetSemantic)) {
      mismatches.push('targetNumeratorSemantic');
      reasons.push(
        `Invalid or missing targetNumeratorSemantic "${targetSemantic}" for company "${mapping.companyId}". Expected one of: [${allowedSemantics.join(', ')}].`
      );
    }
  }

  // 8. Mandatory deep source document verification with sourcesMap (STEP 4-9 & STEP 4-10, Task 1)
  if (!sourcesMap) {
    if (!mismatches.includes('sourceMissing')) mismatches.push('sourceMissing');
    reasons.push('Source registry is required for proxy mapping validation.');
  } else if (mapping.sourceDocIds) {
    for (const docId of mapping.sourceDocIds) {
      const doc = lookupSourceDocInRegistry(sourcesMap, docId);
      if (!doc) {
        if (!mismatches.includes('sourceMissing')) mismatches.push('sourceMissing');
        reasons.push(`Source document "${docId}" referenced by mapping was not found in registry.`);
      } else {
        if (doc.isVerified !== true) {
          if (!mismatches.includes('sourceUnverified')) mismatches.push('sourceUnverified');
          reasons.push(`Source document "${docId}" referenced by mapping is not verified (isVerified !== true).`);
        }
        if (doc.verificationStatus !== 'verified') {
          if (!mismatches.includes('sourceVerificationStatus')) mismatches.push('sourceVerificationStatus');
          reasons.push(`Source document "${docId}" verificationStatus is "${doc.verificationStatus}", expected "verified".`);
        }
        if (doc.companyId !== mapping.companyId) {
          if (!mismatches.includes('sourceCompanyMismatch')) mismatches.push('sourceCompanyMismatch');
          reasons.push(`Source document "${docId}" companyId "${doc.companyId}" does not match mapping companyId "${mapping.companyId}".`);
        }
        if (doc.period && mapping.period && doc.period !== mapping.period) {
          if (!mismatches.includes('sourcePeriodMismatch')) mismatches.push('sourcePeriodMismatch');
          reasons.push(`Source document "${docId}" period "${doc.period}" does not match mapping period "${mapping.period}".`);
        }
        if (!doc.officialUrl || !doc.officialUrl.startsWith('https://')) {
          if (!mismatches.includes('sourceOfficialUrl')) mismatches.push('sourceOfficialUrl');
          reasons.push(`Source document "${docId}" officialUrl must be a valid HTTPS URL.`);
        }
        if (!doc.publicationDate || !/^\d{4}-\d{2}-\d{2}$/.test(doc.publicationDate)) {
          if (!mismatches.includes('sourcePublicationDate')) mismatches.push('sourcePublicationDate');
          reasons.push(`Source document "${docId}" publicationDate "${doc.publicationDate}" is not a valid ISO date.`);
        }
      }
    }
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    reasons,
  };
}

/**
 * Finds all proxy metric mappings matching criteria (STEP 4-8, Task 3; STEP 4-9, Task 4).
 * Overloaded to support both query object and positional parameters.
 * Ambiguous wildcard matching (targetMetricId === 'operating_income') has been removed.
 */
export function findProxyMetricMappings(
  query: ProxyMetricMappingQuery,
  mappingsList?: ProxyMetricMapping[]
): ProxyMetricMapping[];
export function findProxyMetricMappings(
  companyId: string,
  period?: string,
  targetMetricId?: string,
  proxyMetricId?: string,
  periodType?: PeriodType,
  targetScope?: ReportingScope,
  targetBasis?: AccountingBasis,
  proxyScope?: ReportingScope,
  proxyBasis?: AccountingBasis,
  mappingsList?: ProxyMetricMapping[]
): ProxyMetricMapping[];
export function findProxyMetricMappings(
  queryOrCompanyId: ProxyMetricMappingQuery | string,
  periodOrList?: string | ProxyMetricMapping[],
  targetMetricId?: string,
  proxyMetricId?: string,
  periodType?: PeriodType,
  targetScope?: ReportingScope,
  targetBasis?: AccountingBasis,
  proxyScope?: ReportingScope,
  proxyBasis?: AccountingBasis,
  mappingsList: ProxyMetricMapping[] = PROXY_METRIC_MAPPINGS
): ProxyMetricMapping[] {
  let query: ProxyMetricMappingQuery;
  let list = mappingsList;

  if (typeof queryOrCompanyId === 'object' && queryOrCompanyId !== null) {
    query = queryOrCompanyId;
    if (Array.isArray(periodOrList)) {
      list = periodOrList;
    }
  } else {
    query = {
      companyId: queryOrCompanyId,
      period: typeof periodOrList === 'string' ? periodOrList : undefined,
      targetMetricId,
      proxyMetricId,
      periodType,
      targetScope,
      targetBasis,
      proxyScope,
      proxyBasis,
    };
  }

  return list.filter((m) => {
    if (m.companyId !== query.companyId) return false;
    if (query.period !== undefined && m.period !== undefined && m.period !== query.period) return false;
    if (query.periodType !== undefined && m.periodType !== undefined && m.periodType !== query.periodType) return false;
    if (query.targetMetricId !== undefined && m.targetMetricId !== query.targetMetricId) return false;
    if (query.targetNumeratorSemantic !== undefined && m.targetNumeratorSemantic !== query.targetNumeratorSemantic) return false;
    if (query.proxyMetricId !== undefined && m.proxyMetricId !== query.proxyMetricId) return false;
    if (query.targetScope !== undefined && m.targetScope !== query.targetScope) return false;
    if (query.targetBasis !== undefined && m.targetBasis !== query.targetBasis) return false;
    if (query.proxyScope !== undefined && m.proxyScope !== query.proxyScope) return false;
    if (query.proxyBasis !== undefined && m.proxyBasis !== query.proxyBasis) return false;
    return true;
  });
}

/**
 * Detailed lookup for a proxy metric mapping (STEP 4-10, Task 6).
 * Distinguishes:
 *  - status: 'none' (zero matches)
 *  - status: 'unique' (exactly one match)
 *  - status: 'ambiguous' (multiple ambiguous matches)
 * Never chooses an arbitrary mapping.
 */
export function lookupProxyMetricMapping(
  query: ProxyMetricMappingQuery,
  mappingsList?: ProxyMetricMapping[]
): MappingLookupResult;
export function lookupProxyMetricMapping(
  companyId: string,
  period?: string,
  targetMetricId?: string,
  proxyMetricId?: string,
  periodType?: PeriodType,
  targetScope?: ReportingScope,
  targetBasis?: AccountingBasis,
  proxyScope?: ReportingScope,
  proxyBasis?: AccountingBasis,
  mappingsList?: ProxyMetricMapping[]
): MappingLookupResult;
export function lookupProxyMetricMapping(
  queryOrCompanyId: ProxyMetricMappingQuery | string,
  periodOrList?: string | ProxyMetricMapping[],
  targetMetricId?: string,
  proxyMetricId?: string,
  periodType?: PeriodType,
  targetScope?: ReportingScope,
  targetBasis?: AccountingBasis,
  proxyScope?: ReportingScope,
  proxyBasis?: AccountingBasis,
  mappingsList: ProxyMetricMapping[] = PROXY_METRIC_MAPPINGS
): MappingLookupResult {
  const matches =
    typeof queryOrCompanyId === 'object' && queryOrCompanyId !== null
      ? findProxyMetricMappings(queryOrCompanyId, Array.isArray(periodOrList) ? periodOrList : mappingsList)
      : findProxyMetricMappings(
          queryOrCompanyId,
          typeof periodOrList === 'string' ? periodOrList : undefined,
          targetMetricId,
          proxyMetricId,
          periodType,
          targetScope,
          targetBasis,
          proxyScope,
          proxyBasis,
          mappingsList
        );
  if (matches.length === 0) {
    return { status: 'none' };
  }
  if (matches.length === 1) {
    return { status: 'unique', mapping: matches[0] };
  }
  return { status: 'ambiguous', mappings: matches };
}

/**
 * Finds a unique proxy metric mapping (STEP 4-6, P0-1; STEP 4-7, P1-3; STEP 4-8, Task 3; STEP 4-9, Task 4; STEP 4-10, Task 6).
 * Returns undefined if no match OR if multiple ambiguous matches occur.
 */
export function findProxyMetricMapping(
  query: ProxyMetricMappingQuery,
  mappingsList?: ProxyMetricMapping[]
): ProxyMetricMapping | undefined;
export function findProxyMetricMapping(
  companyId: string,
  period?: string,
  targetMetricId?: string,
  proxyMetricId?: string,
  periodType?: PeriodType,
  targetScope?: ReportingScope,
  targetBasis?: AccountingBasis,
  proxyScope?: ReportingScope,
  proxyBasis?: AccountingBasis,
  mappingsList?: ProxyMetricMapping[]
): ProxyMetricMapping | undefined;
export function findProxyMetricMapping(
  queryOrCompanyId: ProxyMetricMappingQuery | string,
  periodOrList?: string | ProxyMetricMapping[],
  targetMetricId?: string,
  proxyMetricId?: string,
  periodType?: PeriodType,
  targetScope?: ReportingScope,
  targetBasis?: AccountingBasis,
  proxyScope?: ReportingScope,
  proxyBasis?: AccountingBasis,
  mappingsList: ProxyMetricMapping[] = PROXY_METRIC_MAPPINGS
): ProxyMetricMapping | undefined {
  const result =
    typeof queryOrCompanyId === 'object' && queryOrCompanyId !== null
      ? lookupProxyMetricMapping(queryOrCompanyId, Array.isArray(periodOrList) ? periodOrList : mappingsList)
      : lookupProxyMetricMapping(
          queryOrCompanyId,
          typeof periodOrList === 'string' ? periodOrList : undefined,
          targetMetricId,
          proxyMetricId,
          periodType,
          targetScope,
          targetBasis,
          proxyScope,
          proxyBasis,
          mappingsList
        );
  return result.status === 'unique' ? result.mapping : undefined;
}

/**
 * Checks whether the evidence includes explicit proxy justification (P1-3).
 * A 'reported_kpi' evidence record proves the OEM reports the headline KPI,
 * but does NOT justify treating group operating profit as segment EBIT.
 */
export function hasProxyJustificationEvidence(evidence: ScopeExceptionEvidence[]): boolean {
  return evidence.some((ev) => ev.purpose === 'proxy_justification');
}

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
 * Provenance context from actual candidate observations to bind to the exception source registry (STEP 4-5, P1; STEP 4-7, P2-1).
 */
export interface ExceptionObservationContext {
  revenueSourceDocId?: string;
  numeratorSourceDocId?: string;
  marginSourceDocId?: string;
  periodType?: PeriodType;
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

    // 0. PeriodType check (P2-1)
    if (observationContext?.periodType && exc.periodType) {
      if (exc.periodType !== observationContext.periodType) {
        candidateStructured.add('scope_mismatch');
        candidateReasons.push(
          `[${exc.id}] periodType mismatch: expected "${exc.periodType}", got "${observationContext.periodType}"`
        );
      }
    }

    // Check registry consistency (P1-2)
    const norm = normalizeProxyException(exc);
    if (norm.isInconsistent && norm.error) {
      candidateReasons.push(`[${exc.id}] ${norm.error}`);
    }

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

        if (exc.period && (!doc.period || doc.period !== exc.period)) {
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

    // 5. Candidate observation source binding (STEP 4-5, P1; STEP 4-6, P1-2)
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
        } else {
          let obsDoc: SourceDocument | undefined;
          if (sources instanceof Map || (sources && typeof (sources as ReadonlyMap<string, SourceDocument>).get === 'function')) {
            obsDoc = (sources as ReadonlyMap<string, SourceDocument>).get(obsCheck.docId);
          } else if (sources && typeof sources === 'object') {
            obsDoc = (sources as Record<string, SourceDocument>)[obsCheck.docId];
          }
          if (!obsDoc) {
            candidateStructured.add('source_not_found');
            candidateReasons.push(`[${exc.id}] Candidate ${obsCheck.role} sourceDocId "${obsCheck.docId}" not found in source registry.`);
          } else if (obsDoc.isVerified !== true || obsDoc.verificationStatus !== 'verified') {
            candidateStructured.add('source_not_verified');
            candidateReasons.push(`[${exc.id}] Candidate ${obsCheck.role} sourceDocId "${obsCheck.docId}" is not verified.`);
          }
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

