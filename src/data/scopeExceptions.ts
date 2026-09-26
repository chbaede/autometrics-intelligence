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
  EvidenceSupportType,
  EvidenceClaimVerificationState,
  ClaimEvidenceLocator,
  ClaimEvidenceEntry,
  DocumentedReportedKpi,
  ProxyMetricMapping,
  ProxyMetricMappingQuery,
  PeriodType,
  MetricObservation,
  DocumentedScopeException,
  MarginValidationContext,
  MappingLookupResult,
  SourceRegistry,
  ProxySemanticContract,
  ContractLookupResult,
  ClaimVerificationResult,
  ClaimVerificationEngineMethod,
  ClaimVerificationEngine,
} from '../types/metrics';

export type {
  EvidencePurpose,
  EvidenceSupportType,
  EvidenceClaimVerificationState,
  ClaimEvidenceLocator,
  ClaimEvidenceEntry,
  ClaimVerificationResult,
  ClaimVerificationEngineMethod,
  ClaimVerificationEngine,
  DocumentedReportedKpi,
  ProxyMetricMapping,
  ProxyMetricMappingQuery,
  DocumentedScopeException,
  MarginValidationContext,
  MappingLookupResult,
  SourceRegistry,
  ProxySemanticContract,
  ContractLookupResult,
};


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
        supports: ['reported_kpi', 'accounting_basis'],
        supportEvidence: {
          reported_kpi: { locator: 'Key Performance Indicators — Automotive Segment / Automotive EBIT margin 7.8%', claimedValue: 'operating_margin' },
          accounting_basis: { locator: 'Key Performance Indicators — Automotive Segment', claimedValue: 'reported' },
        },
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
        supports: ['reported_kpi', 'accounting_basis'],
        supportEvidence: {
          reported_kpi: { locator: 'Key Performance Indicators — Automotive Segment / Automotive EBIT margin 7.2%', claimedValue: 'operating_margin' },
          accounting_basis: { locator: 'Key Performance Indicators — Automotive Segment', claimedValue: 'reported' },
        },
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
        supports: ['reported_kpi', 'accounting_basis'],
        supportEvidence: {
          reported_kpi: { locator: 'Automotive Segment Key Performance Indicators / Automotive EBIT margin 7.4%', claimedValue: 'operating_margin' },
          accounting_basis: { locator: 'Automotive Segment Key Performance Indicators', claimedValue: 'reported' },
        },
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
        supports: ['reported_kpi', 'accounting_basis'],
        supportEvidence: {
          reported_kpi: { locator: 'Automotive Segment Key Performance Indicators / Automotive EBIT margin 6.3%', claimedValue: 'operating_margin' },
          accounting_basis: { locator: 'Automotive Segment Key Performance Indicators', claimedValue: 'reported' },
        },
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
        supports: ['reported_kpi', 'accounting_basis'],
        supportEvidence: {
          reported_kpi: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 8.4%', claimedValue: 'operating_margin' },
          accounting_basis: { locator: 'Mercedes-Benz Cars Division KPIs', claimedValue: 'adjusted' },
        },
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
        supports: ['reported_kpi', 'accounting_basis'],
        supportEvidence: {
          reported_kpi: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 7.9%', claimedValue: 'operating_margin' },
          accounting_basis: { locator: 'Mercedes-Benz Cars Division KPIs', claimedValue: 'adjusted' },
        },
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
        supports: ['reported_kpi', 'accounting_basis'],
        supportEvidence: {
          reported_kpi: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 8.3%', claimedValue: 'operating_margin' },
          accounting_basis: { locator: 'Mercedes-Benz Cars Division KPIs', claimedValue: 'adjusted' },
        },
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
        supports: ['reported_kpi', 'accounting_basis'],
        supportEvidence: {
          reported_kpi: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 12.6%', claimedValue: 'operating_margin' },
          accounting_basis: { locator: 'Mercedes-Benz Cars Division KPIs', claimedValue: 'adjusted' },
        },
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
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Key Performance Indicators — Automotive Segment / Automotive EBIT margin 7.8%', claimedValue: 'automotive_segment_ebit' },
          scope: { locator: 'Automotive Segment', claimedValue: 'automotive_segment' },
        },
      },
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Revenues and Operating Result',
        evidenceReference: 'Revenues: 36,944 million EUR; Operating profit: 3,877 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenues: 36,944 million EUR' },
          proxy_numerator: { locator: 'Operating profit: 3,877 million EUR' },
          denominator: { locator: 'Revenues: 36,944 million EUR' },
          accounting_basis: { locator: 'Group Income Statement', claimedValue: 'reported' },
          period: { locator: 'Group Income Statement', claimedValue: '2026-Q2' },
          period_type: { locator: 'Group Income Statement', claimedValue: 'quarterly' },
        },
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
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Key Performance Indicators — Automotive Segment / Automotive EBIT margin 7.2%', claimedValue: 'automotive_segment_ebit' },
          scope: { locator: 'Automotive Segment', claimedValue: 'automotive_segment' },
        },
      },
      {
        sourceDocId: 'bmw_2026_q1_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Revenues and Operating Result',
        evidenceReference: 'Revenues: 36,614 million EUR; Operating profit: 4,054 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenues: 36,614 million EUR' },
          proxy_numerator: { locator: 'Operating profit: 4,054 million EUR' },
          denominator: { locator: 'Revenues: 36,614 million EUR' },
          accounting_basis: { locator: 'Group Income Statement', claimedValue: 'reported' },
          period: { locator: 'Group Income Statement', claimedValue: '2026-Q1' },
          period_type: { locator: 'Group Income Statement', claimedValue: 'quarterly' },
        },
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
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Automotive Segment Key Performance Indicators / Automotive EBIT margin 7.4%', claimedValue: 'automotive_segment_ebit' },
          scope: { locator: 'Automotive Segment', claimedValue: 'automotive_segment' },
        },
      },
      {
        sourceDocId: 'bmw_2025_fy_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Group Income Statement',
        evidenceReference: 'Revenues: 142,380 million EUR; Operating profit: 11,241 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenues: 142,380 million EUR' },
          proxy_numerator: { locator: 'Operating profit: 11,241 million EUR' },
          denominator: { locator: 'Revenues: 142,380 million EUR' },
          accounting_basis: { locator: 'Group Income Statement', claimedValue: 'reported' },
          period: { locator: 'Group Income Statement', claimedValue: '2025-FY' },
          period_type: { locator: 'Group Income Statement', claimedValue: 'annual' },
        },
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
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Automotive Segment Key Performance Indicators / Automotive EBIT margin 6.3%', claimedValue: 'automotive_segment_ebit' },
          scope: { locator: 'Automotive Segment', claimedValue: 'automotive_segment' },
        },
      },
      {
        sourceDocId: 'bmw_2024_fy_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Group Income Statement',
        evidenceReference: 'Revenues: 142,610 million EUR; Operating profit: 10,980 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenues: 142,610 million EUR' },
          proxy_numerator: { locator: 'Operating profit: 10,980 million EUR' },
          denominator: { locator: 'Revenues: 142,610 million EUR' },
          accounting_basis: { locator: 'Group Income Statement', claimedValue: 'reported' },
          period: { locator: 'Group Income Statement', claimedValue: '2024-FY' },
          period_type: { locator: 'Group Income Statement', claimedValue: 'annual' },
        },
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
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 8.4%', claimedValue: 'cars_adjusted_ebit' },
          scope: { locator: 'Mercedes-Benz Cars', claimedValue: 'cars_segment' },
        },
      },
      {
        sourceDocId: 'mbg_2026_q2_results',
        sectionReference: 'Group Financial Statements',
        tableReference: 'Consolidated Statement of Income',
        evidenceReference: 'Revenue: 36,743 million EUR; EBIT: 4,037 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenue: 36,743 million EUR' },
          proxy_numerator: { locator: 'EBIT: 4,037 million EUR' },
          denominator: { locator: 'Revenue: 36,743 million EUR' },
          accounting_basis: { locator: 'Consolidated Statement of Income', claimedValue: 'reported' },
          period: { locator: 'Consolidated Statement of Income', claimedValue: '2026-Q2' },
          period_type: { locator: 'Consolidated Statement of Income', claimedValue: 'quarterly' },
        },
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
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 7.9%', claimedValue: 'cars_adjusted_ebit' },
          scope: { locator: 'Mercedes-Benz Cars', claimedValue: 'cars_segment' },
        },
      },
      {
        sourceDocId: 'mbg_2026_q1_results',
        sectionReference: 'Group Financial Statements',
        tableReference: 'Consolidated Statement of Income',
        evidenceReference: 'Revenue: 35,873 million EUR; EBIT: 3,863 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenue: 35,873 million EUR' },
          proxy_numerator: { locator: 'EBIT: 3,863 million EUR' },
          denominator: { locator: 'Revenue: 35,873 million EUR' },
          accounting_basis: { locator: 'Consolidated Statement of Income', claimedValue: 'reported' },
          period: { locator: 'Consolidated Statement of Income', claimedValue: '2026-Q1' },
          period_type: { locator: 'Consolidated Statement of Income', claimedValue: 'quarterly' },
        },
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
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 8.3%', claimedValue: 'cars_adjusted_ebit' },
          scope: { locator: 'Mercedes-Benz Cars', claimedValue: 'cars_segment' },
        },
      },
      {
        sourceDocId: 'mbg_2025_fy_results',
        sectionReference: 'Group Financial Statements',
        tableReference: 'Consolidated Statement of Income',
        evidenceReference: 'Revenue: 145,594 million EUR; EBIT: 13,636 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenue: 145,594 million EUR' },
          proxy_numerator: { locator: 'EBIT: 13,636 million EUR' },
          denominator: { locator: 'Revenue: 145,594 million EUR' },
          accounting_basis: { locator: 'Consolidated Statement of Income', claimedValue: 'reported' },
          period: { locator: 'Consolidated Statement of Income', claimedValue: '2025-FY' },
          period_type: { locator: 'Consolidated Statement of Income', claimedValue: 'annual' },
        },
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
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 12.6%', claimedValue: 'cars_adjusted_ebit' },
          scope: { locator: 'Mercedes-Benz Cars', claimedValue: 'cars_segment' },
        },
      },
      {
        sourceDocId: 'mbg_2024_fy_results',
        sectionReference: 'Group Financial Statements',
        tableReference: 'Consolidated Statement of Income',
        evidenceReference: 'Revenue: 152,654 million EUR; EBIT: 19,660 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenue: 152,654 million EUR' },
          proxy_numerator: { locator: 'EBIT: 19,660 million EUR' },
          denominator: { locator: 'Revenue: 152,654 million EUR' },
          accounting_basis: { locator: 'Consolidated Statement of Income', claimedValue: 'reported' },
          period: { locator: 'Consolidated Statement of Income', claimedValue: '2024-FY' },
          period_type: { locator: 'Consolidated Statement of Income', claimedValue: 'annual' },
        },
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
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Key Performance Indicators — Automotive Segment / Automotive EBIT margin 7.8%', claimedValue: 'automotive_segment_ebit' },
          scope: { locator: 'Automotive Segment', claimedValue: 'automotive_segment' },
        },
      },
      {
        sourceDocId: 'bmw_2026_q2_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Revenues and Operating Result',
        evidenceReference: 'Revenues: 36,944 million EUR; Operating profit: 3,877 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenues: 36,944 million EUR' },
          proxy_numerator: { locator: 'Operating profit: 3,877 million EUR' },
          denominator: { locator: 'Revenues: 36,944 million EUR' },
          accounting_basis: { locator: 'Group Income Statement', claimedValue: 'reported' },
          period: { locator: 'Group Income Statement', claimedValue: '2026-Q2' },
          period_type: { locator: 'Group Income Statement', claimedValue: 'quarterly' },
        },
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
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Key Performance Indicators — Automotive Segment / Automotive EBIT margin 7.2%', claimedValue: 'automotive_segment_ebit' },
          scope: { locator: 'Automotive Segment', claimedValue: 'automotive_segment' },
        },
      },
      {
        sourceDocId: 'bmw_2026_q1_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Revenues and Operating Result',
        evidenceReference: 'Revenues: 36,614 million EUR; Operating profit: 4,054 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenues: 36,614 million EUR' },
          proxy_numerator: { locator: 'Operating profit: 4,054 million EUR' },
          denominator: { locator: 'Revenues: 36,614 million EUR' },
          accounting_basis: { locator: 'Group Income Statement', claimedValue: 'reported' },
          period: { locator: 'Group Income Statement', claimedValue: '2026-Q1' },
          period_type: { locator: 'Group Income Statement', claimedValue: 'quarterly' },
        },
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
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Automotive Segment Key Performance Indicators / Automotive EBIT margin 7.4%', claimedValue: 'automotive_segment_ebit' },
          scope: { locator: 'Automotive Segment', claimedValue: 'automotive_segment' },
        },
      },
      {
        sourceDocId: 'bmw_2025_fy_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Group Income Statement',
        evidenceReference: 'Revenues: 142,380 million EUR; Operating profit: 11,241 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenues: 142,380 million EUR' },
          proxy_numerator: { locator: 'Operating profit: 11,241 million EUR' },
          denominator: { locator: 'Revenues: 142,380 million EUR' },
          accounting_basis: { locator: 'Group Income Statement', claimedValue: 'reported' },
          period: { locator: 'Group Income Statement', claimedValue: '2025-FY' },
          period_type: { locator: 'Group Income Statement', claimedValue: 'annual' },
        },
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
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Automotive Segment Key Performance Indicators / Automotive EBIT margin 6.3%', claimedValue: 'automotive_segment_ebit' },
          scope: { locator: 'Automotive Segment', claimedValue: 'automotive_segment' },
        },
      },
      {
        sourceDocId: 'bmw_2024_fy_statement',
        sectionReference: 'Group Income Statement',
        tableReference: 'Group Income Statement',
        evidenceReference: 'Revenues: 142,610 million EUR; Operating profit: 10,980 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenues: 142,610 million EUR' },
          proxy_numerator: { locator: 'Operating profit: 10,980 million EUR' },
          denominator: { locator: 'Revenues: 142,610 million EUR' },
          accounting_basis: { locator: 'Group Income Statement', claimedValue: 'reported' },
          period: { locator: 'Group Income Statement', claimedValue: '2024-FY' },
          period_type: { locator: 'Group Income Statement', claimedValue: 'annual' },
        },
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
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 8.4%', claimedValue: 'cars_adjusted_ebit' },
          scope: { locator: 'Mercedes-Benz Cars', claimedValue: 'cars_segment' },
        },
      },
      {
        sourceDocId: 'mbg_2026_q2_results',
        sectionReference: 'Group Financial Statements',
        tableReference: 'Consolidated Statement of Income',
        evidenceReference: 'Revenue: 36,743 million EUR; EBIT: 4,037 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenue: 36,743 million EUR' },
          proxy_numerator: { locator: 'EBIT: 4,037 million EUR' },
          denominator: { locator: 'Revenue: 36,743 million EUR' },
          accounting_basis: { locator: 'Consolidated Statement of Income', claimedValue: 'reported' },
          period: { locator: 'Consolidated Statement of Income', claimedValue: '2026-Q2' },
          period_type: { locator: 'Consolidated Statement of Income', claimedValue: 'quarterly' },
        },
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
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 7.9%', claimedValue: 'cars_adjusted_ebit' },
          scope: { locator: 'Mercedes-Benz Cars', claimedValue: 'cars_segment' },
        },
      },
      {
        sourceDocId: 'mbg_2026_q1_results',
        sectionReference: 'Group Financial Statements',
        tableReference: 'Consolidated Statement of Income',
        evidenceReference: 'Revenue: 35,873 million EUR; EBIT: 3,863 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenue: 35,873 million EUR' },
          proxy_numerator: { locator: 'EBIT: 3,863 million EUR' },
          denominator: { locator: 'Revenue: 35,873 million EUR' },
          accounting_basis: { locator: 'Consolidated Statement of Income', claimedValue: 'reported' },
          period: { locator: 'Consolidated Statement of Income', claimedValue: '2026-Q1' },
          period_type: { locator: 'Consolidated Statement of Income', claimedValue: 'quarterly' },
        },
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
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 8.3%', claimedValue: 'cars_adjusted_ebit' },
          scope: { locator: 'Mercedes-Benz Cars', claimedValue: 'cars_segment' },
        },
      },
      {
        sourceDocId: 'mbg_2025_fy_results',
        sectionReference: 'Group Financial Statements',
        tableReference: 'Consolidated Statement of Income',
        evidenceReference: 'Revenue: 145,594 million EUR; EBIT: 13,636 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenue: 145,594 million EUR' },
          proxy_numerator: { locator: 'EBIT: 13,636 million EUR' },
          denominator: { locator: 'Revenue: 145,594 million EUR' },
          accounting_basis: { locator: 'Consolidated Statement of Income', claimedValue: 'reported' },
          period: { locator: 'Consolidated Statement of Income', claimedValue: '2025-FY' },
          period_type: { locator: 'Consolidated Statement of Income', claimedValue: 'annual' },
        },
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
        purpose: 'scope_definition',
        supports: ['target_semantic', 'scope'],
        supportEvidence: {
          target_semantic: { locator: 'Mercedes-Benz Cars Division KPIs / Adjusted Return on Sales (RoS) 12.6%', claimedValue: 'cars_adjusted_ebit' },
          scope: { locator: 'Mercedes-Benz Cars', claimedValue: 'cars_segment' },
        },
      },
      {
        sourceDocId: 'mbg_2024_fy_results',
        sectionReference: 'Group Financial Statements',
        tableReference: 'Consolidated Statement of Income',
        evidenceReference: 'Revenue: 152,654 million EUR; EBIT: 19,660 million EUR',
        purpose: 'numerator_definition',
        supports: ['revenue', 'proxy_numerator', 'denominator', 'accounting_basis', 'period', 'period_type'],
        supportEvidence: {
          revenue: { locator: 'Revenue: 152,654 million EUR' },
          proxy_numerator: { locator: 'EBIT: 19,660 million EUR' },
          denominator: { locator: 'Revenue: 152,654 million EUR' },
          accounting_basis: { locator: 'Consolidated Statement of Income', claimedValue: 'reported' },
          period: { locator: 'Consolidated Statement of Income', claimedValue: '2024-FY' },
          period_type: { locator: 'Consolidated Statement of Income', claimedValue: 'annual' },
        },
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
  claimVerificationState: EvidenceClaimVerificationState;
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
 * Options for shared evidence validation (STEP 4-13, Task 4; STEP 4-16, Task 3).
 */
interface EvidenceValidationOptions {
  /** All valid evidence support types. Used for unknown-type detection. */
  readonly knownSupportTypes: readonly EvidenceSupportType[];
  /** Source doc IDs the evidence items must belong to. */
  readonly parentSourceDocIds: readonly string[];
  /** Human-readable parent entity label for error messages. */
  readonly parentLabel: string;
  /** Source registry for existence checks. */
  readonly sourcesMap: SourceRegistry | null | undefined;
  /** Expected claim values from parent record for structured claim validation (STEP 4-16, Task 3; STEP 4-17, Tasks 2 & 3). */
  readonly expectedClaims?: {
    readonly period?: string;
    readonly periodType?: PeriodType;
    readonly accountingBasis?: AccountingBasis;
    readonly allowedBases?: readonly AccountingBasis[];
    readonly targetSemantic?: string;
    readonly scope?: ReportingScope;
    readonly allowedScopes?: readonly ReportingScope[];
    readonly metricId?: string;
    readonly companyId?: string;
  };
}

/** All known EvidenceSupportType values for unknown-type detection (STEP 4-13, Task 3 / Task 6). */
export const ALL_KNOWN_SUPPORT_TYPES: readonly EvidenceSupportType[] = [
  'revenue',
  'proxy_numerator',
  'target_semantic',
  'denominator',
  'scope',
  'accounting_basis',
  'period',
  'period_type',
  'reported_kpi',
];

/** All known AccountingBasis values for typed validation (STEP 4-17, Task 3). */
export const ALL_KNOWN_ACCOUNTING_BASES: readonly AccountingBasis[] = [
  'reported',
  'adjusted',
  'non_gaap',
  'management_defined',
  'unknown',
];

/** All known ReportingScope values for typed validation (STEP 4-17, Task 3). */
export const ALL_KNOWN_REPORTING_SCOPES: readonly ReportingScope[] = [
  'consolidated_group',
  'automotive_segment',
  'cars_segment',
  'commercial_vehicles_segment',
  'financial_services',
  'business_unit',
  'unknown',
];

/** Support types that strictly require structured claim entries (STEP 4-17, Task 2). */
export const SEMANTIC_CLAIM_SUPPORT_TYPES: readonly EvidenceSupportType[] = [
  'period',
  'period_type',
  'accounting_basis',
  'scope',
  'target_semantic',
  'reported_kpi',
];

/** All known EvidencePurpose values for runtime unknown-purpose detection (STEP 4-14, Task 2). */
export const ALL_KNOWN_EVIDENCE_PURPOSES: readonly EvidencePurpose[] = [
  'reported_kpi',
  'scope_definition',
  'numerator_definition',
  'proxy_justification',
];

/** All known PeriodType values for runtime validation (STEP 4-16, Task 5). */
export const ALL_KNOWN_PERIOD_TYPES: readonly PeriodType[] = [
  'quarterly',
  'annual',
  'semi_annual',
  'nine_months',
  'ytd',
  'ttm',
];

/** Allowed purpose(s) for each required evidence support type (STEP 4-14, Task 3). */
export const ALLOWED_PURPOSES_BY_SUPPORT: Record<EvidenceSupportType, readonly EvidencePurpose[]> = {
  proxy_numerator: ['numerator_definition', 'proxy_justification'],
  revenue: ['numerator_definition'],
  denominator: ['numerator_definition'],
  target_semantic: ['scope_definition', 'proxy_justification'],
  scope: ['scope_definition', 'proxy_justification'],
  reported_kpi: ['reported_kpi'],
  accounting_basis: ['numerator_definition', 'scope_definition', 'reported_kpi'],
  period: ['numerator_definition', 'scope_definition', 'reported_kpi'],
  period_type: ['numerator_definition', 'scope_definition', 'reported_kpi'],
};

/**
 * Period semantic validation result (STEP 4-15, Task 3; STEP 4-16, Task 5).
 */
export interface PeriodSemanticValidationResult {
  isValid: boolean;
  mismatches: string[];
  reasons: string[];
}

/** Supported period format patterns per periodType (STEP 4-15, Task 3; STEP 4-16, Task 5). */
export const PERIOD_FORMAT_PATTERNS: Record<PeriodType, RegExp> = {
  quarterly: /^\d{4}-Q[1-4]$/,
  annual: /^\d{4}-FY$/,
  semi_annual: /^\d{4}-H[1-2]$/,
  nine_months: /^\d{4}-9M$/,
  ytd: /^\d{4}-YTD$/,
  ttm: /^\d{4}-TTM$/,
};

const ALL_PERIOD_PATTERNS = Object.values(PERIOD_FORMAT_PATTERNS);

/**
 * Validates period and periodType semantics (STEP 4-15, Task 3; STEP 4-16, Task 5).
 * Validates:
 *  - missingPeriod: period is missing / empty
 *  - missingPeriodType: periodType is missing
 *  - invalidPeriodFormat: period does not match any recognized reporting period format
 *  - invalidPeriodType: periodType is not a recognized PeriodType value
 *  - invalidPeriodTypeCombination: period does not match the expected pattern for its periodType
 */
export function validatePeriodSemantics(
  period?: string,
  periodType?: PeriodType,
  label: string = 'Period'
): PeriodSemanticValidationResult {
  const mismatches: string[] = [];
  const reasons: string[] = [];

  function addMismatch(code: string): void {
    if (!mismatches.includes(code)) mismatches.push(code);
  }

  if (!period || typeof period !== 'string' || period.trim().length === 0) {
    addMismatch('missingPeriod');
    reasons.push(`${label} is missing.`);
  }

  if (!periodType) {
    addMismatch('missingPeriodType');
    reasons.push(`${label} periodType is missing.`);
  }

  if (periodType && !ALL_KNOWN_PERIOD_TYPES.includes(periodType)) {
    addMismatch('invalidPeriodType');
    addMismatch('invalidPeriodTypeCombination');
    reasons.push(`${label} periodType "${periodType}" is unsupported or invalid.`);
  }

  if (period && typeof period === 'string' && period.trim().length > 0) {
    const trimmed = period.trim();
    const matchesAny = ALL_PERIOD_PATTERNS.some((pattern) => pattern.test(trimmed));
    if (!matchesAny) {
      addMismatch('invalidPeriodFormat');
      reasons.push(`${label} "${period}" has an invalid period format.`);
    }

    if (periodType && ALL_KNOWN_PERIOD_TYPES.includes(periodType)) {
      const expectedPattern = PERIOD_FORMAT_PATTERNS[periodType];
      if (!expectedPattern) {
        addMismatch('invalidPeriodTypeCombination');
        reasons.push(`${label} periodType "${periodType}" is unsupported or invalid.`);
      } else if (!expectedPattern.test(trimmed)) {
        addMismatch('invalidPeriodFormat');
        addMismatch('invalidPeriodTypeCombination');
        reasons.push(
          `${label} "${period}" does not match the expected pattern for periodType "${periodType}".`
        );
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
 * Normalizes a ClaimEvidenceEntry (string or structured object) into a ClaimEvidenceLocator (STEP 4-16, Task 2).
 */
export function normalizeClaimEvidenceLocator(
  entry: ClaimEvidenceEntry | undefined | null
): ClaimEvidenceLocator | undefined {
  if (!entry) return undefined;
  if (typeof entry === 'string') {
    return {
      locator: entry,
      verificationState: 'locator_only',
    };
  }
  return {
    locator: entry.locator,
    claimedValue: entry.claimedValue,
    // Task 1: 'claim_verified' must not be manually trusted from arbitrary input without a verification engine
    verificationState:
      entry.verificationState === 'claim_verified'
        ? 'locator_only'
        : (entry.verificationState ?? 'locator_only'),
  };
}

/**
 * Resolves the evidence claim verification state with explicit verification semantics (STEP 4-16, Task 1; STEP 4-17, Task 4).
 * Semantics:
 *  - 'locator_only': locator exists, but document content is not verified.
 *  - 'source_verified': source document identity and metadata are verified.
 *  - 'claim_verified': the specific claim has been verified against source content by a dedicated verification engine.
 *
 * Invariants:
 *  1. 'claim_verified' must NOT be manually trusted from arbitrary input metadata.
 *  2. 'claim_verified' can ONLY be produced when an authentic ClaimVerificationResult is supplied.
 *  3. 'locator_only' evidence must not independently justify `disposition: 'documented'`.
 *  4. Preserves 'proxy_only' and mathematicallyVerified: false.
 */
export function resolveClaimVerificationState(
  evidence: ScopeExceptionEvidence[] | undefined | null,
  sourcesVerified: boolean = false,
  verificationResult?: ClaimVerificationResult | null
): EvidenceClaimVerificationState {
  if (!evidence || evidence.length === 0) {
    return 'locator_only';
  }
  // Dedicated verification engine result check: only an authentic engine result can yield claim_verified
  if (verificationResult?.state === 'claim_verified') {
    return 'claim_verified';
  }
  // Without an authentic verification engine result, manual claim_verified in metadata is strictly ignored/downgraded
  if (sourcesVerified) {
    return 'source_verified';
  }
  return 'locator_only';
}

/**
 * Checks whether an evidence claim verification state can justify a documented disposition (STEP 4-16, Task 1; STEP 4-17, Task 1).
 * Stricter policy:
 *  - 'locator_only': cannot justify documented
 *  - 'source_verified': cannot justify documented (source metadata verified, but claim content is unverified)
 *  - 'claim_verified': only state that can justify documented
 */
export function canClaimStateJustifyDocumented(
  state?: EvidenceClaimVerificationState
): boolean {
  return state === 'claim_verified';
}

/**
 * Validates whether an evidence claim verification state can justify a documented disposition (STEP 4-17, Task 1).
 * Returns specific mismatch codes:
 *  - 'insufficientClaimVerificationForDocumented' for 'locator_only' or undefined
 *  - 'unverifiedClaimForDocumented' for 'source_verified'
 */
export function validateClaimStateForDocumented(
  state?: EvidenceClaimVerificationState
): { isValid: boolean; mismatch?: string; reason?: string } {
  if (!state || state === 'locator_only') {
    return {
      isValid: false,
      mismatch: 'insufficientClaimVerificationForDocumented',
      reason: 'Locator-only evidence cannot justify a documented disposition.',
    };
  }
  if (state === 'source_verified') {
    return {
      isValid: false,
      mismatch: 'unverifiedClaimForDocumented',
      reason: 'Source-verified evidence verifies source document metadata but leaves claim content unverified; cannot justify a documented disposition.',
    };
  }
  if (state === 'claim_verified') {
    return {
      isValid: true,
    };
  }
  return {
    isValid: false,
    mismatch: 'insufficientClaimVerificationForDocumented',
    reason: `Invalid or unsupported claim verification state "${state}".`,
  };
}

/**
 * Result of evidence item validation (STEP 4-15, Task 1 & 2; STEP 4-16, Tasks 2, 3, 4; STEP 4-17, Tasks 2, 3, 5).
 */
export interface EvidenceValidationResult {
  mismatches: string[];
  reasons: string[];
  allSupports: Set<EvidenceSupportType>;
  supportedClaims: Set<EvidenceSupportType>;
}

/**
 * Validates a list of evidence items against membership, locator, purpose/support consistency,
 * empty-supports, unknown-support-type, duplicate-supports, unknown-purpose, claim-level locators,
 * bidirectional supports/supportEvidence completeness, and typed structured claim values against parent expected values
 * (STEP 4-13, Task 4; STEP 4-14, Tasks 2 & 4; STEP 4-15, Tasks 1 & 2; STEP 4-16, Tasks 2, 3, 4; STEP 4-17, Tasks 2, 3, 5).
 *
 * Returns an object with arrays of mismatch codes and reasons collected across all evidence items.
 * Each mismatch code is emitted at most once globally; per-item reasons are always appended.
 */
export function validateEvidenceItems(
  evidence: ScopeExceptionEvidence[] | undefined | null,
  options: EvidenceValidationOptions
): EvidenceValidationResult {
  const { knownSupportTypes, parentSourceDocIds, parentLabel, sourcesMap } = options;
  const mismatches: string[] = [];
  const reasons: string[] = [];
  const allSupports = new Set<EvidenceSupportType>();
  const supportedClaims = new Set<EvidenceSupportType>();

  function addMismatch(code: string): void {
    if (!mismatches.includes(code)) mismatches.push(code);
  }

  if (!evidence || evidence.length === 0) {
    addMismatch('missingEvidenceLocator');
    reasons.push(`${parentLabel} has no evidence items.`);
    return { mismatches, reasons, allSupports, supportedClaims };
  }

  for (const ev of evidence) {
    // Task 1: evidence source must be in parent sourceDocIds
    if (!parentSourceDocIds.includes(ev.sourceDocId)) {
      addMismatch('evidenceSourceNotInMapping');
      addMismatch('evidenceSourceDocMismatch'); // backward-compat alias
      reasons.push(`${parentLabel} evidence sourceDocId "${ev.sourceDocId}" is not included in sourceDocIds [${parentSourceDocIds.join(', ')}].`);
    }

    // evidence source must exist in registry
    if (sourcesMap) {
      const evDoc = lookupSourceDocInRegistry(sourcesMap, ev.sourceDocId);
      if (!evDoc) {
        addMismatch('evidenceSourceMissing');
        reasons.push(`${parentLabel} evidence sourceDocId "${ev.sourceDocId}" was not found in source registry.`);
      }
    }

    // meaningful locator
    if (!hasMeaningfulEvidenceLocator(ev)) {
      addMismatch('missingEvidenceLocator');
      reasons.push(`${parentLabel} evidence for source "${ev.sourceDocId}" lacks meaningful locators.`);
    }

    // Task 2 (STEP 4-14): Unknown evidence purpose detection
    let isPurposeKnown = true;
    if (ev.purpose) {
      if (!ALL_KNOWN_EVIDENCE_PURPOSES.includes(ev.purpose as EvidencePurpose)) {
        isPurposeKnown = false;
        addMismatch('unknownEvidencePurpose');
        reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" contains unknown purpose "${ev.purpose}".`);
      }
    }

    // Task 3: purpose set but supports empty / missing → missingEvidenceSupports
    if (ev.purpose && (!ev.supports || ev.supports.length === 0)) {
      addMismatch('missingEvidenceSupports');
      reasons.push(`${parentLabel} evidence for source "${ev.sourceDocId}" declares purpose "${ev.purpose}" but has no supports values.`);
    }

    // Task 6 (unknown support type) & per-support purpose compatibility (STEP 4-15, Task 2)
    const validSupportsOnThisItem = new Set<EvidenceSupportType>();
    if (ev.supports) {
      const seen = new Set<string>();
      for (const sup of ev.supports) {
        if (!(knownSupportTypes as readonly string[]).includes(sup)) {
          addMismatch('unknownEvidenceSupportType');
          reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" contains unknown support type "${sup}".`);
        }
        // Task 7 (duplicate supports)
        if (seen.has(sup)) {
          addMismatch('duplicateEvidenceSupports');
          reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" contains duplicate support value "${sup}".`);
        }
        seen.add(sup);

        // STEP 4-15 Task 2: Validate each declared support individually against ALLOWED_PURPOSES_BY_SUPPORT
        if (ev.purpose && isPurposeKnown) {
          const allowedPurposes = ALLOWED_PURPOSES_BY_SUPPORT[sup as EvidenceSupportType];
          if (allowedPurposes && !allowedPurposes.includes(ev.purpose)) {
            addMismatch('evidencePurposeSupportMismatch');
            addMismatch('incompatibleEvidenceSupportPurpose');
            reasons.push(
              `${parentLabel} evidence for "${ev.sourceDocId}" has purpose "${ev.purpose}" which is incompatible with declared support "${sup}". Allowed purposes for "${sup}": [${allowedPurposes.join(', ')}].`
            );
          } else {
            validSupportsOnThisItem.add(sup as EvidenceSupportType);
            allSupports.add(sup as EvidenceSupportType);
          }
        }
      }
    }

    // Task 5 (STEP 4-17): Bidirectional consistency between supports and supportEvidence
    if (ev.supports && ev.supports.length > 0) {
      if (!ev.supportEvidence) {
        addMismatch('missingClaimEvidence');
        addMismatch('missingClaimEvidenceLocator');
        reasons.push(
          `${parentLabel} evidence for "${ev.sourceDocId}" declares supports [${ev.supports.join(', ')}] but lacks supportEvidence.`
        );
      } else {
        for (const sup of ev.supports) {
          if (!(sup in ev.supportEvidence)) {
            addMismatch('missingClaimEvidence');
            addMismatch('missingClaimEvidenceLocator');
            reasons.push(
              `${parentLabel} evidence for "${ev.sourceDocId}" declares support "${sup}" but has no corresponding entry in supportEvidence.`
            );
          }
        }
      }
    }

    // Task 4 (STEP 4-14), Task 1 (STEP 4-15), Tasks 2 & 3 (STEP 4-16), Tasks 2, 3, 5 (STEP 4-17):
    // Claim-level evidence locator & structured claim value validation
    if (ev.supportEvidence) {
      for (const [claimKey, rawEntry] of Object.entries(ev.supportEvidence)) {
        const supportType = claimKey as EvidenceSupportType;
        if (!(knownSupportTypes as readonly string[]).includes(supportType)) {
          addMismatch('unknownClaimEvidenceType');
          reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" contains unknown claim evidence type "${claimKey}".`);
        } else if (!ev.supports?.includes(supportType)) {
          addMismatch('orphanClaimEvidence');
          reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" contains orphan claim locator "${claimKey}" not declared in supports.`);
        }

        const isSemanticClaim = (SEMANTIC_CLAIM_SUPPORT_TYPES as readonly string[]).includes(supportType);

        if (isSemanticClaim) {
          // Task 2 (STEP 4-17): Structured claim values are mandatory for semantic claims
          if (typeof rawEntry === 'string') {
            addMismatch('missingStructuredClaimValue');
            reasons.push(
              `${parentLabel} evidence for "${ev.sourceDocId}" has string-only entry for semantic support "${claimKey}"; structured ClaimEvidenceLocator with claimedValue is required.`
            );
            if (rawEntry.trim().length === 0) {
              addMismatch('missingClaimEvidenceLocator');
              reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" has empty locator for claim "${claimKey}".`);
            }
            // Backward-compatible string entries may remain accepted as locator-only, but must NOT count as complete claim binding!
          } else if (typeof rawEntry === 'object' && rawEntry !== null) {
            let hasValidLocator = true;
            let hasValidClaimedValue = true;

            const loc = rawEntry.locator;
            if (!loc || typeof loc !== 'string' || loc.trim().length === 0) {
              hasValidLocator = false;
              addMismatch('missingClaimEvidenceLocator');
              reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" has empty locator for claim "${claimKey}".`);
            }

            const rawVal = rawEntry.claimedValue;
            if (rawVal === undefined || rawVal === null || (typeof rawVal === 'string' && rawVal.trim().length === 0)) {
              hasValidClaimedValue = false;
              addMismatch('missingStructuredClaimValue');
              reasons.push(
                `${parentLabel} evidence for "${ev.sourceDocId}" is missing structured claimedValue for semantic claim "${claimKey}".`
              );
            } else {
              const val = String(rawVal).trim();

              // Task 3 (STEP 4-17): Typed validation for claim values
              // Task 3 (STEP 4-17; STEP 4-18): Typed validation for claim values
              if (supportType === 'period') {
                const matchesPattern = ALL_PERIOD_PATTERNS.some((p) => p.test(val));
                if (!matchesPattern) {
                  hasValidClaimedValue = false;
                  addMismatch('unsupportedClaimValue');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed period "${val}" is unsupported or has an invalid format.`
                  );
                }
                if (options.expectedClaims?.period && val !== options.expectedClaims.period) {
                  hasValidClaimedValue = false;
                  addMismatch('claimPeriodMismatch');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed period "${val}" does not match expected period "${options.expectedClaims.period}".`
                  );
                }
                // Task 2 (STEP 4-18): Check period/periodType combination
                const ptClaimEntry = ev.supportEvidence['period_type'];
                const ptClaimVal =
                  typeof ptClaimEntry === 'object' && ptClaimEntry !== null
                    ? ptClaimEntry.claimedValue
                    : typeof ptClaimEntry === 'string'
                      ? ptClaimEntry
                      : undefined;
                const effectivePeriodType = (ptClaimVal ? String(ptClaimVal).trim() : options.expectedClaims?.periodType) as PeriodType | undefined;
                if (effectivePeriodType && ALL_KNOWN_PERIOD_TYPES.includes(effectivePeriodType)) {
                  const comboCheck = validatePeriodSemantics(val, effectivePeriodType, `${parentLabel} evidence for "${ev.sourceDocId}" period/periodType combination`);
                  if (!comboCheck.isValid) {
                    hasValidClaimedValue = false;
                    addMismatch('claimPeriodTypeCombinationMismatch');
                    reasons.push(
                      `${parentLabel} evidence for "${ev.sourceDocId}" claimed period "${val}" is incompatible with periodType "${effectivePeriodType}".`
                    );
                  }
                }
              } else if (supportType === 'period_type') {
                if (!ALL_KNOWN_PERIOD_TYPES.includes(val as PeriodType)) {
                  hasValidClaimedValue = false;
                  addMismatch('unsupportedClaimValue');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed periodType "${val}" is unsupported or invalid.`
                  );
                }
                if (options.expectedClaims?.periodType && val !== options.expectedClaims.periodType) {
                  hasValidClaimedValue = false;
                  addMismatch('claimPeriodTypeMismatch');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed periodType "${val}" does not match expected periodType "${options.expectedClaims.periodType}".`
                  );
                }
                // Task 2 (STEP 4-18): Check period/periodType combination
                const pClaimEntry = ev.supportEvidence['period'];
                const pClaimVal =
                  typeof pClaimEntry === 'object' && pClaimEntry !== null
                    ? pClaimEntry.claimedValue
                    : typeof pClaimEntry === 'string'
                      ? pClaimEntry
                      : undefined;
                const effectivePeriod = pClaimVal ? String(pClaimVal).trim() : options.expectedClaims?.period;
                if (effectivePeriod && ALL_KNOWN_PERIOD_TYPES.includes(val as PeriodType)) {
                  const comboCheck = validatePeriodSemantics(effectivePeriod, val as PeriodType, `${parentLabel} evidence for "${ev.sourceDocId}" period/periodType combination`);
                  if (!comboCheck.isValid) {
                    hasValidClaimedValue = false;
                    addMismatch('claimPeriodTypeCombinationMismatch');
                    reasons.push(
                      `${parentLabel} evidence for "${ev.sourceDocId}" claimed periodType "${val}" is incompatible with period "${effectivePeriod}".`
                    );
                  }
                }
              } else if (supportType === 'accounting_basis') {
                if (!ALL_KNOWN_ACCOUNTING_BASES.includes(val as AccountingBasis)) {
                  hasValidClaimedValue = false;
                  addMismatch('unsupportedClaimValue');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed accounting basis "${val}" is unsupported or invalid.`
                  );
                }
                const allowedBases =
                  options.expectedClaims?.allowedBases ??
                  (options.expectedClaims?.accountingBasis ? [options.expectedClaims.accountingBasis] : undefined);
                if (allowedBases && !allowedBases.includes(val as AccountingBasis)) {
                  hasValidClaimedValue = false;
                  addMismatch('claimAccountingBasisMismatch');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed accounting basis "${val}" does not match expected basis [${allowedBases.join(', ')}].`
                  );
                }
              } else if (supportType === 'scope') {
                if (!ALL_KNOWN_REPORTING_SCOPES.includes(val as ReportingScope)) {
                  hasValidClaimedValue = false;
                  addMismatch('unsupportedClaimValue');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed scope "${val}" is unsupported or invalid.`
                  );
                }
                const allowed =
                  options.expectedClaims?.allowedScopes ??
                  (options.expectedClaims?.scope ? [options.expectedClaims.scope] : undefined);
                if (allowed && !allowed.includes(val as ReportingScope)) {
                  hasValidClaimedValue = false;
                  addMismatch('claimScopeMismatch');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed scope "${val}" does not match expected scope [${allowed.join(', ')}].`
                  );
                }
              } else if (supportType === 'target_semantic') {
                if (!options.expectedClaims?.companyId) {
                  hasValidClaimedValue = false;
                  addMismatch('missingClaimContext');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" lacks companyId context required for target_semantic validation.`
                  );
                } else {
                  const activeContracts = PROXY_SEMANTIC_CONTRACTS.filter(
                    (c) => c.status === 'active' && c.companyId === options.expectedClaims?.companyId
                  );
                  const allowedActiveSemantics = activeContracts.map((c) => c.targetSemantic);

                  if (!allowedActiveSemantics.includes(val)) {
                    hasValidClaimedValue = false;
                    addMismatch('unsupportedClaimValue');
                    reasons.push(
                      `${parentLabel} evidence for "${ev.sourceDocId}" claimed target semantic "${val}" is not an authorized active proxy semantic contract for company "${options.expectedClaims.companyId}".`
                    );
                  }
                  if (options.expectedClaims?.targetSemantic && val !== options.expectedClaims.targetSemantic) {
                    hasValidClaimedValue = false;
                    addMismatch('claimSemanticMismatch');
                    reasons.push(
                      `${parentLabel} evidence for "${ev.sourceDocId}" claimed target semantic "${val}" does not match expected target semantic "${options.expectedClaims.targetSemantic}".`
                    );
                  }
                }
              } else if (supportType === 'reported_kpi') {
                if (options.expectedClaims?.metricId && val !== options.expectedClaims.metricId) {
                  hasValidClaimedValue = false;
                  addMismatch('claimSemanticMismatch');
                  reasons.push(
                    `${parentLabel} evidence for "${ev.sourceDocId}" claimed reported KPI "${val}" does not match expected metric "${options.expectedClaims.metricId}".`
                  );
                }
              }
            }

            if (rawEntry.verificationState === 'claim_verified') {
              reasons.push(
                `${parentLabel} evidence for "${ev.sourceDocId}" claims "claim_verified" for "${claimKey}", but claim verification without an engine is not trusted; downgraded to "locator_only".`
              );
            }

            if (hasValidLocator && hasValidClaimedValue && validSupportsOnThisItem.has(supportType)) {
              supportedClaims.add(supportType);
            }
          } else {
            addMismatch('missingClaimEvidenceLocator');
            addMismatch('missingStructuredClaimValue');
            reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" has invalid entry for claim "${claimKey}".`);
          }
        } else {
          // Non-semantic claim (e.g. revenue, proxy_numerator, denominator)
          const normalized = normalizeClaimEvidenceLocator(rawEntry as ClaimEvidenceEntry);
          const locatorStr = normalized?.locator;

          if (!locatorStr || typeof locatorStr !== 'string' || locatorStr.trim().length === 0) {
            addMismatch('missingClaimEvidenceLocator');
            reasons.push(`${parentLabel} evidence for "${ev.sourceDocId}" has empty locator for claim "${claimKey}".`);
          } else {
            if (validSupportsOnThisItem.has(supportType)) {
              supportedClaims.add(supportType);
            }
          }

          if (typeof rawEntry === 'object' && rawEntry !== null && rawEntry.verificationState === 'claim_verified') {
            reasons.push(
              `${parentLabel} evidence for "${ev.sourceDocId}" claims "claim_verified" for "${claimKey}", but claim verification without an engine is not trusted; downgraded to "locator_only".`
            );
          }
        }
      }
    }
  }

  return { mismatches, reasons, allSupports, supportedClaims };
}


/**
 * Validates actual observation compatibility with a DocumentedReportedKpi (STEP 4-8, Task 6; STEP 4-9, Task 2; STEP 4-11, Task 3).
 * Source registry validation is strictly mandatory.
 */
export function validateDocumentedReportedKpiCompatibility(
  kpi: DocumentedReportedKpi,
  marginObs: MetricObservation,
  sourcesMap: SourceRegistry
): DocumentedKpiValidationResult {
  const mismatches: string[] = [];
  const reasons: string[] = [];

  function addMismatch(code: string): void {
    if (!mismatches.includes(code)) mismatches.push(code);
  }

  if (!sourcesMap) {
    addMismatch('sourceMissing');
    reasons.push('Source registry is mandatory for documented reported KPI validation.');
  }

  if (kpi.companyId !== marginObs.companyId) {
    addMismatch('companyId');
    reasons.push(
      `Reported KPI companyId "${kpi.companyId}" does not match margin observation "${marginObs.companyId}".`
    );
  }

  if (kpi.period && kpi.period !== marginObs.period) {
    addMismatch('period');
    reasons.push(
      `Reported KPI period "${kpi.period}" does not match margin observation "${marginObs.period}".`
    );
  }

  if (kpi.periodType && kpi.periodType !== marginObs.periodType) {
    addMismatch('periodType');
    reasons.push(
      `Reported KPI periodType "${kpi.periodType}" does not match margin observation "${marginObs.periodType}".`
    );
  }

  if (kpi.metricId !== marginObs.metricId) {
    addMismatch('metricId');
    reasons.push(
      `Reported KPI metricId "${kpi.metricId}" does not match margin observation "${marginObs.metricId}".`
    );
  }

  if (kpi.reportingScope && kpi.reportingScope !== marginObs.reportingScope) {
    addMismatch('reportingScope');
    reasons.push(
      `Reported KPI scope "${kpi.reportingScope}" does not match margin observation "${marginObs.reportingScope}".`
    );
  }

  if (kpi.accountingBasis && kpi.accountingBasis !== marginObs.accountingBasis) {
    addMismatch('accountingBasis');
    reasons.push(
      `Reported KPI accountingBasis "${kpi.accountingBasis}" does not match margin observation "${marginObs.accountingBasis}".`
    );
  }

  if (!marginObs.sourceDocId || !kpi.sourceDocIds.includes(marginObs.sourceDocId)) {
    addMismatch('sourceDocId');
    reasons.push(
      `Margin observation sourceDocId "${marginObs.sourceDocId}" is not present in KPI sourceDocIds [${kpi.sourceDocIds.join(', ')}].`
    );
  }

  if (marginObs.verificationStatus !== 'verified') {
    addMismatch('verificationStatus');
    reasons.push(
      `Margin observation verification status is "${marginObs.verificationStatus}", expected "verified".`
    );
  }

  // Deep source registry validation — including Task 2 periodType checks (STEP 4-13) and period semantics (STEP 4-15, Task 3)
  const expectedPeriod = kpi.period ?? marginObs.period;
  const expectedPeriodType = kpi.periodType ?? marginObs.periodType;

  // Period semantics validation on expected period/periodType
  const periodSemantics = validatePeriodSemantics(expectedPeriod, expectedPeriodType, `Reported KPI [${kpi.id}]`);
  for (const m of periodSemantics.mismatches) {
    addMismatch(m);
  }
  reasons.push(...periodSemantics.reasons);

  if (sourcesMap) {
    const docPeriods = new Set<string>();
    const docPeriodTypes = new Set<string>();
    for (const docId of kpi.sourceDocIds) {
      const doc = lookupSourceDocInRegistry(sourcesMap, docId);
      if (!doc) {
        addMismatch('sourceMissing');
        reasons.push(`Source document "${docId}" referenced by KPI was not found in registry.`);
      } else {
        if (doc.isVerified !== true) {
          addMismatch('sourceUnverified');
          reasons.push(`Source document "${docId}" referenced by KPI is not verified (isVerified !== true).`);
        }
        if (doc.verificationStatus !== 'verified') {
          addMismatch('sourceVerificationStatus');
          reasons.push(`Source document "${docId}" verificationStatus is "${doc.verificationStatus}", expected "verified".`);
        }
        if (doc.companyId !== kpi.companyId) {
          addMismatch('sourceCompanyMismatch');
          reasons.push(`Source document "${docId}" companyId "${doc.companyId}" does not match KPI companyId "${kpi.companyId}".`);
        }
        if (!doc.period) {
          addMismatch('missingSourcePeriod');
          reasons.push(`Source document "${docId}" referenced by KPI is missing required period.`);
        } else {
          docPeriods.add(doc.period);
          if (expectedPeriod && doc.period !== expectedPeriod) {
            addMismatch('sourcePeriodMismatch');
            reasons.push(`Source document "${docId}" period "${doc.period}" does not match expected period "${expectedPeriod}".`);
          }
        }
        // Task 1 (STEP 4-14): periodType completeness check
        if (!doc.periodType) {
          addMismatch('missingSourcePeriodType');
          reasons.push(`Source document "${docId}" referenced by KPI is missing required periodType.`);
        } else {
          docPeriodTypes.add(doc.periodType);
          if (expectedPeriodType && doc.periodType !== expectedPeriodType) {
            addMismatch('sourcePeriodTypeMismatch');
            reasons.push(`Source document "${docId}" periodType "${doc.periodType}" does not match expected periodType "${expectedPeriodType}".`);
          }
        }

        // Source document period semantics validation (STEP 4-15, Task 3)
        if (doc.period && doc.periodType) {
          const docSem = validatePeriodSemantics(doc.period, doc.periodType, `Source document "${docId}"`);
          for (const m of docSem.mismatches) {
            if (m === 'invalidPeriodFormat') addMismatch('invalidPeriodFormat');
            if (m === 'invalidPeriodTypeCombination') addMismatch('invalidPeriodTypeCombination');
          }
          reasons.push(...docSem.reasons.filter((r) => !r.includes('missing')));
        }

        if (!doc.officialUrl || !doc.officialUrl.startsWith('https://')) {
          addMismatch('sourceOfficialUrl');
          reasons.push(`Source document "${docId}" officialUrl must be a valid HTTPS URL.`);
        }
        if (!doc.publicationDate || !/^\d{4}-\d{2}-\d{2}$/.test(doc.publicationDate)) {
          addMismatch('sourcePublicationDate');
          reasons.push(`Source document "${docId}" publicationDate "${doc.publicationDate}" is not a valid ISO date.`);
        }
      }
    }
    if (docPeriods.size > 1) {
      addMismatch('inconsistentSourcePeriods');
      addMismatch('sourcePeriodMismatch');
      reasons.push(`Multiple source documents referenced by KPI [${kpi.id}] have inconsistent periods: [${Array.from(docPeriods).join(', ')}].`);
    }
    // Task 2: inconsistent periodTypes across multiple source docs
    if (docPeriodTypes.size > 1) {
      addMismatch('inconsistentSourcePeriodTypes');
      addMismatch('sourcePeriodTypeMismatch');
      reasons.push(`Multiple source documents referenced by KPI [${kpi.id}] have inconsistent periodTypes: [${Array.from(docPeriodTypes).join(', ')}].`);
    }
  }

  // Evidence validation via shared helper (Task 4 — STEP 4-13; STEP 4-15; STEP 4-16)
  const evResult = validateEvidenceItems(kpi.evidence, {
    knownSupportTypes: ALL_KNOWN_SUPPORT_TYPES,
    parentSourceDocIds: kpi.sourceDocIds,
    parentLabel: `Reported KPI [${kpi.id}]`,
    sourcesMap,
    expectedClaims: {
      period: expectedPeriod,
      periodType: expectedPeriodType,
      accountingBasis: kpi.accountingBasis,
      scope: kpi.reportingScope,
      metricId: kpi.metricId,
      companyId: kpi.companyId,
    },
  });
  for (const m of evResult.mismatches) {
    addMismatch(m);
  }
  reasons.push(...evResult.reasons);

  const hasReportedKpiEvidence =
    kpi.evidence && kpi.evidence.some((ev) => ev.purpose === 'reported_kpi' || ev.supports?.includes('reported_kpi'));
  if (!hasReportedKpiEvidence) {
    addMismatch('evidencePurpose');
    reasons.push(`Reported KPI [${kpi.id}] does not contain evidence with purpose or support for "reported_kpi".`);
  }

  // Claim-level evidence locator binding for reported_kpi (STEP 4-15, Task 1 & 4)
  if (!evResult.supportedClaims.has('reported_kpi')) {
    addMismatch('missingClaimEvidence');
    reasons.push(`Reported KPI [${kpi.id}] lacks claim-level evidence locator in supportEvidence for "reported_kpi".`);
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    reasons,
    claimVerificationState: 'locator_only',
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
  claimVerificationState: EvidenceClaimVerificationState;
}

/**
 * Explicit authorized Proxy Semantic Contracts (STEP 4-11, Task 4).
 * Enforces company-level target semantic, scope, accounting basis, and evidence requirements.
 */
export const PROXY_SEMANTIC_CONTRACTS: readonly ProxySemanticContract[] = [
  {
    companyId: 'bmw_group',
    targetSemantic: 'automotive_segment_ebit',
    targetScope: 'automotive_segment',
    targetAccountingBasis: 'reported',
    allowedProxyMetrics: ['operating_income', 'ebit'],
    requiredEvidencePurposes: ['scope_definition'],
    requiredEvidenceSupports: ['revenue', 'proxy_numerator', 'target_semantic', 'scope', 'denominator'],
    status: 'active',
  },
  {
    companyId: 'mercedes_benz',
    targetSemantic: 'cars_adjusted_ebit',
    targetScope: 'cars_segment',
    targetAccountingBasis: 'adjusted',
    allowedProxyMetrics: ['operating_income', 'ebit'],
    requiredEvidencePurposes: ['scope_definition'],
    requiredEvidenceSupports: ['revenue', 'proxy_numerator', 'target_semantic', 'scope', 'denominator'],
    status: 'active',
  },
];

/**
 * Standard default required evidence supports for proxy mappings.
 */
export const DEFAULT_REQUIRED_EVIDENCE_SUPPORTS: readonly EvidenceSupportType[] = [
  'revenue',
  'proxy_numerator',
  'target_semantic',
  'scope',
  'denominator',
];

/**
 * Looks up an active proxy semantic contract for a company and target semantic (STEP 4-12, Task 2).
 * Strictly guards against ambiguous multiple matching contracts and unknown companies/semantics.
 */
export function lookupProxySemanticContract(
  companyId: string,
  targetSemantic?: string,
  contracts: readonly ProxySemanticContract[] = PROXY_SEMANTIC_CONTRACTS
): ContractLookupResult {
  const matches = contracts.filter(
    (c) => c.status === 'active' && c.companyId === companyId && (!targetSemantic || c.targetSemantic === targetSemantic)
  );

  if (matches.length === 0) {
    const hasCompany = contracts.some((c) => c.status === 'active' && c.companyId === companyId);
    if (!hasCompany) {
      return {
        status: 'none',
        reason: `Unsupported proxy company "${companyId}". Proxy mappings are only permitted for authorized OEM semantics with an explicit contract.`,
      };
    }
    return {
      status: 'none',
      reason: `No active proxy semantic contract found for company "${companyId}" with target semantic "${targetSemantic}".`,
    };
  }

  if (matches.length > 1) {
    return {
      status: 'ambiguous',
      contracts: matches,
      reason: `Multiple active proxy semantic contracts match company "${companyId}" and target semantic "${targetSemantic ?? 'any'}". Ambiguous contract selection is rejected.`,
    };
  }

  return {
    status: 'unique',
    contract: matches[0],
  };
}

/**
 * Resolves an active proxy semantic contract for a company and target semantic (STEP 4-11, Task 4; STEP 4-12, Task 2).
 * Returns undefined if no unique active contract exists.
 */
export function findProxySemanticContract(
  companyId: string,
  targetSemantic?: string,
  contracts: readonly ProxySemanticContract[] = PROXY_SEMANTIC_CONTRACTS
): ProxySemanticContract | undefined {
  const res = lookupProxySemanticContract(companyId, targetSemantic, contracts);
  return res.status === 'unique' ? res.contract : undefined;
}

/**
 * Allowlist of authorized target numerator semantics per company (STEP 4-10, Task 4; STEP 4-11, Task 4).
 * Maintained for backward compatibility alongside PROXY_SEMANTIC_CONTRACTS.
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
  sourcesMap: SourceRegistry
): ProxyMappingValidationResult {
  const reasons: string[] = [];
  const mismatches: string[] = [];

  const expectedPeriod = mapping.period ?? revObs.period;
  const expectedPeriodType = mapping.periodType ?? revObs.periodType;

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

  // 7. Resolve contract using companyId and targetSemantic (STEP 4-8, Task 2; STEP 4-10, Task 4; STEP 4-11, Task 4; STEP 4-12, Tasks 1 & 2)
  const allowedSemantics = TARGET_SEMANTICS_BY_COMPANY[mapping.companyId];
  if (!allowedSemantics) {
    if (!mismatches.includes('unsupportedProxyCompany')) mismatches.push('unsupportedProxyCompany');
    reasons.push(
      `Unsupported proxy company "${mapping.companyId}". Proxy mappings are only permitted for authorized OEM semantics with an explicit contract.`
    );
  } else if (!targetSemantic || !allowedSemantics.includes(targetSemantic)) {
    if (!mismatches.includes('targetNumeratorSemantic')) mismatches.push('targetNumeratorSemantic');
    reasons.push(
      `Invalid or missing targetNumeratorSemantic "${targetSemantic}" for company "${mapping.companyId}". Expected one of: [${allowedSemantics.join(', ')}].`
    );
  }

  const contractLookup = lookupProxySemanticContract(mapping.companyId, targetSemantic);
  let activeContract: ProxySemanticContract | undefined;

  if (contractLookup.status === 'ambiguous') {
    if (!mismatches.includes('ambiguousProxyContract')) mismatches.push('ambiguousProxyContract');
    reasons.push(contractLookup.reason);
  } else if (contractLookup.status === 'none') {
    if (!allowedSemantics && !mismatches.includes('unsupportedProxyCompany')) {
      mismatches.push('unsupportedProxyCompany');
    } else if (allowedSemantics && !mismatches.includes('targetNumeratorSemantic')) {
      mismatches.push('targetNumeratorSemantic');
    }
    reasons.push(contractLookup.reason);
  } else {
    // Task 5 (STEP 4-13): lookupProxySemanticContract only returns 'unique' for active contracts;
    // an inactive-contract branch here is unreachable and has been removed.
    activeContract = contractLookup.contract;
    if (!targetSemantic || !allowedSemantics || !allowedSemantics.includes(targetSemantic) || activeContract.targetSemantic !== targetSemantic) {
      if (!mismatches.includes('targetNumeratorSemantic')) mismatches.push('targetNumeratorSemantic');
      reasons.push(
        `Invalid or missing targetNumeratorSemantic "${targetSemantic}" for company "${mapping.companyId}". Expected contract target semantic "${activeContract.targetSemantic}".`
      );
    }
    if (activeContract.requiredEvidencePurposes) {
      for (const reqPurpose of activeContract.requiredEvidencePurposes) {
        const hasPurpose =
          mapping.evidence &&
          mapping.evidence.some(
            (ev) =>
              (ev.purpose && ALL_KNOWN_EVIDENCE_PURPOSES.includes(ev.purpose) && ev.purpose === reqPurpose) ||
              (reqPurpose === 'scope_definition' &&
                ev.purpose &&
                ALL_KNOWN_EVIDENCE_PURPOSES.includes(ev.purpose) &&
                (ev.purpose === 'reported_kpi' || ev.supports?.includes('scope')))
          );
        if (!hasPurpose) {
          if (!mismatches.includes('evidencePurpose')) mismatches.push('evidencePurpose');
          reasons.push(`ProxyMapping [${mapping.id}] lacks required evidence purpose "${reqPurpose}".`);
        }
      }
    }
  }

  // Evidence validation via shared helper (Task 4 — STEP 4-13; STEP 4-16)
  const evResult = validateEvidenceItems(mapping.evidence, {
    knownSupportTypes: ALL_KNOWN_SUPPORT_TYPES,
    parentSourceDocIds: mapping.sourceDocIds ?? [],
    parentLabel: `ProxyMapping [${mapping.id}]`,
    sourcesMap,
    expectedClaims: {
      period: expectedPeriod,
      periodType: expectedPeriodType,
      accountingBasis: mapping.targetBasis,
      allowedBases: Array.from(
        new Set([
          mapping.targetBasis,
          mapping.proxyBasis,
          mapping.denominatorBasis,
        ].filter(Boolean))
      ) as AccountingBasis[],
      targetSemantic: mapping.targetNumeratorSemantic,
      scope: mapping.targetScope,
      allowedScopes: Array.from(
        new Set([
          mapping.targetScope,
          mapping.proxyScope,
          mapping.denominatorScope,
        ].filter(Boolean))
      ) as ReportingScope[],
      companyId: mapping.companyId,
    },
  });
  for (const m of evResult.mismatches) {
    if (!mismatches.includes(m)) mismatches.push(m);
  }
  reasons.push(...evResult.reasons);

  // Contract-driven requiredEvidenceSupports validation with purpose binding (STEP 4-11; STEP 4-12; STEP 4-14, Task 3)
  const requiredSupports = activeContract?.requiredEvidenceSupports ?? DEFAULT_REQUIRED_EVIDENCE_SUPPORTS;
  for (const reqSupport of requiredSupports) {
    const allowedPurposes = ALLOWED_PURPOSES_BY_SUPPORT[reqSupport];
    const hasValidSupport =
      mapping.evidence &&
      mapping.evidence.some((ev) => {
        if (!ev.purpose || !ALL_KNOWN_EVIDENCE_PURPOSES.includes(ev.purpose)) return false;
        if (allowedPurposes && !allowedPurposes.includes(ev.purpose)) return false;
        return ev.supports?.includes(reqSupport);
      });

    if (!hasValidSupport) {
      const declaredUnderIncompatible =
        mapping.evidence &&
        mapping.evidence.some(
          (ev) =>
            ev.purpose &&
            ALL_KNOWN_EVIDENCE_PURPOSES.includes(ev.purpose) &&
            allowedPurposes &&
            !allowedPurposes.includes(ev.purpose) &&
            ev.supports?.includes(reqSupport)
        );

      if (declaredUnderIncompatible) {
        if (!mismatches.includes('incompatibleEvidenceSupportPurpose')) {
          mismatches.push('incompatibleEvidenceSupportPurpose');
        }
      }

      const specificMismatch = `missingEvidenceSupport:${reqSupport}`;
      if (!mismatches.includes(specificMismatch)) mismatches.push(specificMismatch);

      // Preserve backward-compatible mismatch tokens for existing tests
      if (reqSupport === 'revenue' && !mismatches.includes('missingRevenueEvidence')) {
        mismatches.push('missingRevenueEvidence');
      } else if (reqSupport === 'proxy_numerator' && !mismatches.includes('missingProxyNumeratorEvidence')) {
        mismatches.push('missingProxyNumeratorEvidence');
      } else if (reqSupport === 'target_semantic' && !mismatches.includes('missingTargetSemanticEvidence')) {
        mismatches.push('missingTargetSemanticEvidence');
      } else if (reqSupport === 'scope' && !mismatches.includes('missingScopeEvidence')) {
        mismatches.push('missingScopeEvidence');
      } else if (reqSupport === 'denominator' && !mismatches.includes('missingDenominatorEvidence')) {
        mismatches.push('missingDenominatorEvidence');
      }

      reasons.push(
        `ProxyMapping [${mapping.id}] lacks required evidence support "${reqSupport}" with an allowed purpose [${allowedPurposes?.join(', ')}].`
      );
    }

    // Claim-level evidence locator binding for required support (STEP 4-15, Task 1 & 4)
    if (!evResult.supportedClaims.has(reqSupport)) {
      if (!mismatches.includes('missingClaimEvidence')) {
        mismatches.push('missingClaimEvidence');
      }
      const specificClaimMismatch = `missingClaimEvidence:${reqSupport}`;
      if (!mismatches.includes(specificClaimMismatch)) {
        mismatches.push(specificClaimMismatch);
      }
      reasons.push(
        `ProxyMapping [${mapping.id}] lacks valid claim-level evidence locator in supportEvidence for "${reqSupport}".`
      );
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

  // 8. Mandatory deep source document verification — including Task 1 & 2 period/periodType checks (STEP 4-13 & STEP 4-14)
  // Period semantics validation on expected period/periodType (STEP 4-15, Task 3)
  const periodSemantics = validatePeriodSemantics(expectedPeriod, expectedPeriodType, `ProxyMapping [${mapping.id}]`);
  for (const m of periodSemantics.mismatches) {
    if (!mismatches.includes(m)) mismatches.push(m);
  }
  reasons.push(...periodSemantics.reasons);

  if (!sourcesMap) {
    if (!mismatches.includes('sourceMissing')) mismatches.push('sourceMissing');
    reasons.push('Source registry is required for proxy mapping validation.');
  } else if (mapping.sourceDocIds) {
    const docPeriods = new Set<string>();
    const docPeriodTypes = new Set<string>();
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
        // Task 1 (STEP 4-14): Source document period completeness
        if (!doc.period) {
          if (!mismatches.includes('missingSourcePeriod')) mismatches.push('missingSourcePeriod');
          reasons.push(`Source document "${docId}" referenced by mapping is missing required period.`);
        } else {
          docPeriods.add(doc.period);
          if (expectedPeriod && doc.period !== expectedPeriod) {
            if (!mismatches.includes('sourcePeriodMismatch')) mismatches.push('sourcePeriodMismatch');
            reasons.push(`Source document "${docId}" period "${doc.period}" does not match expected period "${expectedPeriod}".`);
          }
        }
        // Task 1 (STEP 4-14): Source document periodType completeness
        if (!doc.periodType) {
          if (!mismatches.includes('missingSourcePeriodType')) mismatches.push('missingSourcePeriodType');
          reasons.push(`Source document "${docId}" referenced by mapping is missing required periodType.`);
        } else {
          docPeriodTypes.add(doc.periodType);
          if (expectedPeriodType && doc.periodType !== expectedPeriodType) {
            if (!mismatches.includes('sourcePeriodTypeMismatch')) mismatches.push('sourcePeriodTypeMismatch');
            reasons.push(`Source document "${docId}" periodType "${doc.periodType}" does not match expected periodType "${expectedPeriodType}".`);
          }
        }

        // Source document period semantics validation (STEP 4-15, Task 3)
        if (doc.period && doc.periodType) {
          const docSem = validatePeriodSemantics(doc.period, doc.periodType, `Source document "${docId}"`);
          for (const m of docSem.mismatches) {
            if (m === 'invalidPeriodFormat' && !mismatches.includes('invalidPeriodFormat')) mismatches.push('invalidPeriodFormat');
            if (m === 'invalidPeriodTypeCombination' && !mismatches.includes('invalidPeriodTypeCombination')) mismatches.push('invalidPeriodTypeCombination');
          }
          reasons.push(...docSem.reasons.filter((r) => !r.includes('missing')));
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
    if (docPeriods.size > 1) {
      if (!mismatches.includes('inconsistentSourcePeriods')) mismatches.push('inconsistentSourcePeriods');
      if (!mismatches.includes('sourcePeriodMismatch')) mismatches.push('sourcePeriodMismatch');
      reasons.push(
        `Multiple source documents referenced by mapping [${mapping.id}] have inconsistent periods: [${Array.from(docPeriods).join(', ')}].`
      );
    }
    // Task 2: inconsistent periodTypes across multiple source docs (STEP 4-13)
    if (docPeriodTypes.size > 1) {
      if (!mismatches.includes('inconsistentSourcePeriodTypes')) mismatches.push('inconsistentSourcePeriodTypes');
      if (!mismatches.includes('sourcePeriodTypeMismatch')) mismatches.push('sourcePeriodTypeMismatch');
      reasons.push(
        `Multiple source documents referenced by mapping [${mapping.id}] have inconsistent periodTypes: [${Array.from(docPeriodTypes).join(', ')}].`
      );
    }
  }

  return {
    isValid: mismatches.length === 0,
    mismatches,
    reasons,
    claimVerificationState: 'locator_only',
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

