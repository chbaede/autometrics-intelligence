export type RegionId =
  | 'global'
  | 'north_america'
  | 'united_states'
  | 'europe'
  | 'germany'
  | 'china'
  | 'japan'
  | 'south_korea'
  | 'india'
  | 'south_america'
  | 'rest_of_world';

export type MetricCategory =
  | 'sales'
  | 'financial'
  | 'electrification'
  | 'operational'
  | 'guidance';

export type MetricUnit =
  | 'units'
  | 'thousand_units'
  | 'currency_millions'
  | 'currency_billions'
  | 'percentage'
  | 'ratio'
  | 'currency_per_unit';

export type MetricValueType = 'reported' | 'derived' | 'guidance' | 'estimated';

export type PeriodType =
  | 'quarterly'
  | 'annual'
  | 'semi_annual'
  | 'nine_months'
  | 'ytd'
  | 'ttm';

/**
 * Claim-level evidence verification state (STEP 4-15, Task 4).
 * Separates presence of locators from machine verification of source content.
 */
export type EvidenceClaimVerificationState =
  | 'locator_only'
  | 'source_verified'
  | 'claim_verified';

/**
 * Explicit reporting scope for financial and operational metrics.
 * Differentiates consolidated group metrics from segment-level disclosures.
 */
export type ReportingScope =
  | 'consolidated_group'
  | 'automotive_segment'
  | 'cars_segment'
  | 'commercial_vehicles_segment'
  | 'financial_services'
  | 'business_unit'
  | 'unknown';

/**
 * Accounting basis under applicable standards (IFRS, US GAAP, K-IFRS, J-GAAP, PRC GAAP).
 */
export type AccountingBasis =
  | 'reported'
  | 'adjusted'
  | 'non_gaap'
  | 'management_defined'
  | 'unknown';

/**
 * Volume delivery perimeter (Customer retail handovers vs Wholesale shipments vs Registrations).
 */
export type VolumeDefinition =
  | 'retail_deliveries'
  | 'wholesale_shipments'
  | 'production'
  | 'registrations'
  | 'unknown';

/**
 * Evidence-based verification status for audit compliance.
 */
export type VerificationStatus =
  | 'verified'
  | 'needs_review'
  | 'scope_warning'
  | 'unverified';

export type VerificationMethod =
  | 'official_pdf_filing'
  | 'official_earnings_call_presentation'
  | 'official_press_release'
  | 'regulatory_filing_sec_kessan'
  | 'derived_calculation'
  | 'unverified';

export type ComparabilityLevel = 'direct' | 'limited' | 'not_comparable';

export interface ComparabilityChecks {
  definitionMatched: boolean;
  scopeMatched: boolean;
  accountingBasisMatched: boolean;
  volumeDefinitionMatched: boolean;
  periodMatched: boolean;
  periodTypeMatched: boolean;
  fiscalCalendarMatched: boolean;
  currencyMatched: boolean;
  unitMatched: boolean;
}

export interface ComparabilityResult {
  directlyComparable: boolean;
  limitedComparisonAllowed: boolean;
  level: ComparabilityLevel;
  reasons: string[];
  checks: ComparabilityChecks;
}

export type CandidateSelectionStatus =
  | 'matched'
  | 'missing'
  | 'ambiguous'
  | 'incompatible';

export interface BevShareCandidateResult {
  status: CandidateSelectionStatus;
  totalDelivery?: MetricObservation;
  bevDelivery?: MetricObservation;
  reportedShare?: MetricObservation;
  candidatesChecked: number;
  reasons: string[];
}

export interface BevShareValidationResult {
  isValid: boolean;
  validationStatus: VerificationStatus;
  calculatedShare: number | null;
  reportedShare: number | null;
  difference: number | null;
  diagnostic: string;
  reasons: string[];
  matchedObservationIds: string[];
}

export interface DerivedMetricDefinition {
  metricId: string;
  numeratorMetricIds: string[];
  denominatorMetricIds: string[];
  allowedAccountingBases?: AccountingBasis[];
}

export type FindingDisposition = 'blocking' | 'review' | 'documented' | 'informational';

/**
 * Finding Disposition Semantics
 * ─────────────────────────────
 * severity=ERROR  + disposition=blocking   → Hard structural error; fails audit in all modes.
 * severity=WARNING + disposition=blocking  → Validation failure requiring immediate action; fails audit in all modes.
 * severity=WARNING + disposition=review    → Unresolved ambiguity requiring human inspection; fails --strict mode.
 * severity=WARNING + disposition=documented → Approved exception with full evidence trail; never causes failure.
 * severity=INFO   + disposition=informational → Non-blocking corroboration or informational finding; never causes failure.
 *
 * Invariants:
 *  - A finding with disposition='documented' MUST include a non-empty exceptionId and sourceDocIds.
 *  - A finding with disposition='blocking' is always counted toward audit failure, regardless of severity.
 *  - A finding with disposition='review' fails --strict mode but not normal mode.
 *  - 'documented' findings are NOT counted as clean verified data.
 *  - 'informational' corroboration findings are tracked separately from documented scope exceptions.
 */
export interface AuditFinding {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  disposition: FindingDisposition;
  category:
    | 'FOREIGN_KEY'
    | 'DUPLICATE'
    | 'REQUIRED_METADATA'
    | 'MATH_MISMATCH'
    | 'SCOPE_MISMATCH'
    | 'SOURCE_METADATA'
    | 'AMBIGUOUS_SELECTION'
    | 'PROVENANCE_INFO'
    | 'UNCATEGORIZED';

  // ── Core identification (preferred for new findings) ──────────────────────
  companyId?: string;
  period?: string;
  periodType?: string;
  metricId?: string;
  message?: string;

  // ── Evidence fields — required when disposition='documented' ──────────────
  /** Rule ID when validated under a relationship rule */
  selectedRuleId?: string;
  /** Exception registry ID; required for documented findings. */
  exceptionId?: string;
  /** Proxy mapping ID (STEP 4-7/4-8) */
  proxyMappingId?: string;
  /** Documented reported KPI ID (STEP 4-7/4-8) */
  reportedKpiId?: string;
  /** Source document IDs providing evidence for the exception. */
  sourceDocIds?: string[];
  /** Observation IDs involved in the finding. */
  observationIds?: string[];
  /** Validation dimension names that failed (e.g. 'scope', 'accountingBasis'). */
  failedChecks?: string[];
  /** URL to official documentation or rationale file. */
  documentationUrl?: string;
  /** Indicates the finding pertains to a proxy relationship rather than verified actual segment metric. */
  isProxy?: boolean;
  /** Indicates whether the margin triplet was mathematically verified (recalculated value matches reported). */
  mathematicallyVerified?: boolean;
  /** Evidence claim verification state (STEP 4-15, Task 4). */
  claimVerificationState?: EvidenceClaimVerificationState;

  // ── Legacy fields (backward-compatible with existing audit-data.ts) ────────
  item?: string;
  detail?: string;
}

export interface ScopeRelationshipRule {
  relationshipType: 'same_scope' | 'segment_operating_margin' | 'custom_scope_mapping';
  numeratorScope?: ReportingScope;
  denominatorScope?: ReportingScope;
  marginScope?: ReportingScope;
}

export interface MarginRelationshipRule {
  id: string;
  name: string;
  marginMetricId: string;
  numeratorMetricId: string;
  denominatorMetricId: string;
  numeratorAccountingBases: AccountingBasis[];
  denominatorAccountingBases: AccountingBasis[];
  marginAccountingBases: AccountingBasis[];
  allowedScopeRelationships: ScopeRelationshipRule[];
}

export type MarginSelectionStatus = CandidateSelectionStatus;

export interface MarginTripletDiagnostic {
  revenue?: MetricObservation;
  profit?: MetricObservation;
  margin?: MetricObservation;
  ruleId?: string;
  failedChecks: string[];
  reasons: string[];
}

export interface MarginCandidateResult {
  status: MarginSelectionStatus;
  ruleId?: string;
  revenue?: MetricObservation;
  profit?: MetricObservation;
  margin?: MetricObservation;
  candidatesChecked: number;
  failedChecks?: string[];
  reasons: string[];
  diagnostics?: MarginTripletDiagnostic[];
}

export interface MarginValidationChecks {
  period: boolean;
  periodType: boolean;
  scope: boolean;
  accountingBasis: boolean;
  currency: boolean;
  unit: boolean;
  metricDefinition: boolean;
  relationshipRule: boolean;
  valueValidity: boolean;
  verificationStatus: boolean;
  provenance: boolean;
}

export type MarginValidationStatus =
  | 'verified'
  | 'needs_review'
  | 'ambiguous'
  | 'invalid'
  | 'proxy_only';

export interface MarginValidationResult {
  status: MarginValidationStatus;
  calculatedMargin: number | null;
  reportedMargin: number | null;
  difference: number | null;
  mathematicallyVerified?: boolean;
  proxyCompatibility?: boolean;
  mathematicalEquivalence?: boolean;
  limitations?: string[];
  proxyLimitation?: boolean;
  proxyScopeCompatibility?: boolean;
  directMathematicalVerification?: boolean;
  /** Evidence claim verification state (STEP 4-15, Task 4). */
  claimVerificationState?: EvidenceClaimVerificationState;
  selectedObservationIds: {
    revenue?: string;
    profit?: string;
    margin?: string;
  };
  selectedRuleId?: string;
  exceptionId?: string;
  proxyMappingId?: string;
  reportedKpiId?: string;
  failedChecks: (keyof MarginValidationChecks | string)[];
  checks: MarginValidationChecks;
  diagnostic: string;
  reasons: string[];
}

export type ScopeExceptionRejectionReason =
  | 'source_not_found'
  | 'source_not_verified'
  | 'source_company_mismatch'
  | 'source_period_mismatch'
  | 'missing_official_url'
  | 'missing_evidence_reference'
  | 'metric_mismatch'
  | 'scope_mismatch'
  | 'accounting_basis_mismatch';

export type ScopeExceptionNature = 'actual_segment' | 'proxy_numerator';

export type EvidencePurpose =
  | 'reported_kpi'
  | 'scope_definition'
  | 'numerator_definition'
  | 'proxy_justification';

export type EvidenceSupportType =
  | 'revenue'
  | 'proxy_numerator'
  | 'target_semantic'
  | 'denominator'
  | 'scope'
  | 'accounting_basis'
  | 'period'
  | 'period_type'
  | 'reported_kpi';

/**
 * Structured claim-level evidence locator representation (STEP 4-16, Task 2).
 * Allows binding specific claim locators and claimed values to evidence.
 */
export interface ClaimEvidenceLocator {
  locator: string;
  claimedValue?: string;
  verificationState?: EvidenceClaimVerificationState;
}

/**
 * Dedicated verification method for real claim content verification (STEP 4-18, Task 4).
 */
export type ClaimVerificationEngineMethod =
  | 'manual'
  | 'parser'
  | 'rule_engine'
  | 'llm';

/**
 * Base verification result properties shared by all verification states (STEP 4-19, Task 1).
 */
export interface BaseClaimVerificationResult {
  verificationMethod: ClaimVerificationEngineMethod;
  engineId: string;
  engineVersion: string;
  sourceDocId: string;
  claimSupportType: EvidenceSupportType;
  expectedValue?: string;
  verifiedAt: string;
  sourceContentHash?: string;
  diagnostics?: string[];
}

/**
 * Result indicating that a specific claim has been verified against source content (STEP 4-19, Task 1).
 * verifiedValue is strictly required.
 */
export interface ClaimVerifiedResult extends BaseClaimVerificationResult {
  state: 'claim_verified';
  verifiedValue: string;
}

/**
 * Result indicating that source identity and metadata are verified, but claim content is unverified (STEP 4-19, Task 1).
 */
export interface SourceVerifiedResult extends BaseClaimVerificationResult {
  state: 'source_verified';
  verifiedValue?: string;
}

/**
 * Dedicated verification result produced by an authentic claim verification engine (STEP 4-18, Task 4; STEP 4-19, Task 1).
 * Claim verification cannot be claimed through declarative metadata alone; only a real verification engine
 * producing this result can yield state: 'claim_verified'.
 */
export type ClaimVerificationResult = ClaimVerifiedResult | SourceVerifiedResult;

/**
 * Validation result for checking a ClaimVerificationResult against its target claim and source (STEP 4-19, Task 3).
 */
export interface ClaimVerificationValidationResult {
  valid: boolean;
  mismatches: string[];
}

/**
 * Contract specification for a claim verification engine (STEP 4-18, Task 4; STEP 4-19, Task 1).
 */
export interface ClaimVerificationEngine {
  readonly engineId: string;
  readonly version?: string;
  readonly method: ClaimVerificationEngineMethod;
  verifyClaim(
    claim: ClaimEvidenceLocator,
    sourceDoc: SourceDocument,
    expectedValue?: string,
    supportType?: EvidenceSupportType
  ): Promise<ClaimVerificationResult> | ClaimVerificationResult;
}

/**
 * Claim-level evidence entry: supports both backward-compatible string locators
 * and structured ClaimEvidenceLocator objects (STEP 4-16, Task 2).
 */
export type ClaimEvidenceEntry = string | ClaimEvidenceLocator;

export interface ScopeExceptionEvidence {
  sourceDocId: string;
  pageNumber?: number | string;
  sectionReference?: string;
  tableReference?: string;
  evidenceReference?: string;
  purpose?: EvidencePurpose;
  supports?: EvidenceSupportType[];
  /**
   * Optional claim-level locators or citations binding specific support types to evidence strings
   * or structured ClaimEvidenceLocator entries (STEP 4-14, Task 4; STEP 4-16, Task 2).
   */
  supportEvidence?: Partial<Record<EvidenceSupportType, ClaimEvidenceEntry>>;
}

export interface DocumentedReportedKpi {
  id: string;
  companyId: string;
  period?: string;
  periodType?: PeriodType;
  metricId: string;
  reportingScope?: ReportingScope;
  accountingBasis?: AccountingBasis;
  sourceDocIds: string[];
  evidence: ScopeExceptionEvidence[];
}

export interface ProxyMetricMappingQuery {
  companyId: string;
  period?: string;
  periodType?: PeriodType;
  targetMetricId?: string;
  targetNumeratorSemantic?: string;
  proxyMetricId?: string;
  targetScope?: ReportingScope;
  targetBasis?: AccountingBasis;
  proxyScope?: ReportingScope;
  proxyBasis?: AccountingBasis;
}

export interface ProxyMetricMapping {
  id: string;
  companyId: string;
  period?: string;
  periodType?: PeriodType;

  targetMetricId: string;
  targetNumeratorSemantic?: 'automotive_segment_ebit' | 'cars_adjusted_ebit' | string;
  targetScope: ReportingScope;
  targetBasis: AccountingBasis;

  proxyMetricId: string;
  proxyScope: ReportingScope;
  proxyBasis: AccountingBasis;

  denominatorMetricId: string;
  denominatorScope: ReportingScope;
  denominatorBasis: AccountingBasis;

  sourceDocIds: string[];
  evidence: ScopeExceptionEvidence[];

  status: 'proxy_only' | 'needs_review';
  reason: string;
}

export type MappingLookupResult =
  | { status: 'none' }
  | { status: 'unique'; mapping: ProxyMetricMapping }
  | { status: 'ambiguous'; mappings: ProxyMetricMapping[] };

export type SourceRegistry =
  | ReadonlyMap<string, SourceDocument>
  | Map<string, SourceDocument>
  | Record<string, SourceDocument>;

export interface ProxySemanticContract {
  companyId: string;
  targetSemantic: string;
  targetScope: ReportingScope;
  targetAccountingBasis: AccountingBasis;
  allowedProxyMetrics: string[];
  requiredEvidencePurposes: EvidencePurpose[];
  requiredEvidenceSupports?: EvidenceSupportType[];
  status: 'active' | 'deprecated';
}

export type ContractLookupResult =
  | { status: 'none'; reason: string }
  | { status: 'unique'; contract: ProxySemanticContract }
  | { status: 'ambiguous'; contracts: ProxySemanticContract[]; reason: string };

export interface DocumentedScopeException {
  id: string;
  companyId: string;
  period?: string;
  periodType?: PeriodType;

  marginMetricId: string;
  numeratorMetricId: string;
  denominatorMetricId: string;

  numeratorScope: ReportingScope;
  denominatorScope: ReportingScope;
  marginScope: ReportingScope;

  numeratorBasis: AccountingBasis;
  denominatorBasis: AccountingBasis;
  marginBasis: AccountingBasis;

  sourceDocIds: string[];
  evidence: ScopeExceptionEvidence[];
  rationale: string;

  nature?: ScopeExceptionNature;
  isProxy?: boolean;
  reportedKpiId?: string;
  proxyMappingId?: string;
}

/**
 * Unified Validation Context (STEP 4-7/4-8, STEP 2)
 * Discriminated union explicitly distinguishing standard, actual segment, proxy numerator, and invalid states.
 */
export type MarginValidationContext =
  | {
      kind: 'standard';
    }
  | {
      kind: 'documented_actual_segment';
      exception: DocumentedScopeException;
      reportedKpi?: DocumentedReportedKpi | null;
    }
  | {
      kind: 'proxy_numerator';
      mapping: ProxyMetricMapping;
      reportedKpi?: DocumentedReportedKpi | null;
      exception?: DocumentedScopeException | null;
    }
  | {
      kind: 'inconsistent_or_invalid';
      reason: string;
      mapping?: ProxyMetricMapping | null;
      exception?: DocumentedScopeException | null;
      reportedKpi?: DocumentedReportedKpi | null;
    };

export interface Company {
  id: string;
  name: string;
  shortName: string;
  nativeName?: string;
  ticker?: string;
  stockExchange?: string;
  hqCountry: string;
  hqCity: string;
  region: RegionId;
  logoUrl?: string;
  website: string;
  irUrl: string;
  financialResultsUrl?: string;
  salesReleaseUrl?: string;
  annualReportsUrl?: string;
  fiscalYearEnd: string; // e.g. "Dec 31" or "Mar 31"
  reportingCurrency: string; // e.g. "EUR", "USD", "CNY", "JPY", "KRW"
  supportedDocuments: string[];
  description: string;
  notes?: string;
}

export interface MetricDefinition {
  id: string;
  name: string;
  shortName: string;
  category: MetricCategory;
  unit: MetricUnit;
  dataType: 'number' | 'percentage' | 'currency';
  description: string;
  calculationFormula?: string;
  comparabilityNotes: string;
  applicableCompanies: string[]; // '*' for all or list of company IDs
  originalLabelsMap?: Record<string, string>; // companyId -> typical reported label
  isCumulativeDefault?: boolean;
  defaultScope?: ReportingScope;
  defaultBasis?: AccountingBasis;
  defaultVolumeDefinition?: VolumeDefinition;
}

export type DocumentType =
  | 'quarterly_report'
  | 'earnings_presentation'
  | 'annual_report'
  | 'sales_release'
  | 'guidance_update'
  | 'regulatory_filing'
  | 'shareholder_letter';

export interface SourceDocument {
  id: string;
  companyId: string;
  title: string;
  issuer?: string;
  docType: DocumentType;
  period: string; // e.g., '2024-Q3', '2024-Q4', '2024-FY', '2025-Q1', '2025-Q2'
  /** Optional period type for source-level period type validation (STEP 4-13, Task 2). */
  periodType?: PeriodType;
  publicationDate: string; // YYYY-MM-DD
  officialUrl: string;
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  notes?: string;
  lastChecked: string;
}

/**
 * Base observation interface with core identification, temporal, value, and governance fields.
 */
export interface BaseObservation {
  id: string;
  companyId: string;
  metricId: string;
  period: string; // e.g., '2024-Q1', '2024-Q2', '2024-FY', '2025-Q1', '2025-Q2'
  periodType: PeriodType;
  calendarYear: number;
  calendarQuarter?: number; // 1, 2, 3, 4
  value: number | null; // null if not reported or not applicable
  unit: MetricUnit;
  valueType: MetricValueType;
  reportingScope?: ReportingScope;
  verificationStatus?: VerificationStatus;
  verificationMethod?: VerificationMethod;
  /**
   * Intrinsic peer-comparability eligibility of the individual observation.
   * - true: Follows standard external reporting definitions (e.g., standard IFRS revenue, retail deliveries)
   *         and is eligible for cross-company peer benchmarking.
   * - false: Represents a bespoke, non-standard management KPI with unique internal allocation rules.
   *
   * Note: Pairwise cross-OEM comparability is computed dynamically via checkObservationComparability().
   */
  isComparable: boolean;
  nonComparableReason?: string;
  notes?: string;
}

/**
 * Reported financial observation with required currency, accounting basis, and source link.
 */
export interface ReportedFinancialObservation extends BaseObservation {
  valueType: 'reported';
  unit: 'currency_millions' | 'currency_billions' | 'currency_per_unit';
  currency: string;
  reportingScope: ReportingScope;
  accountingBasis: AccountingBasis;
  sourceDocId: string;
  verificationStatus: VerificationStatus;
  verificationMethod: VerificationMethod;
  originalLabel?: string;
  evidenceReference?: string;
  tableReference?: string;
  sectionReference?: string;
  pageNumber?: number | string;
}

/**
 * Reported volume / delivery observation with required perimeter definition and source link.
 */
export interface ReportedVolumeObservation extends BaseObservation {
  valueType: 'reported';
  unit: 'units' | 'thousand_units';
  volumeDefinition: VolumeDefinition;
  reportingScope: ReportingScope;
  sourceDocId: string;
  verificationStatus: VerificationStatus;
  verificationMethod: VerificationMethod;
  originalLabel?: string;
  evidenceReference?: string;
  tableReference?: string;
  sectionReference?: string;
  pageNumber?: number | string;
}

/**
 * Derived observation with calculation metadata and input observation references.
 */
export interface DerivedObservation extends BaseObservation {
  valueType: 'derived';
  reportingScope: ReportingScope;
  verificationStatus: VerificationStatus;
  inputObservationIds?: string[];
  derivationFormula?: string;
}

/**
 * Strict validated observation union requiring category-appropriate metadata.
 */
export type ValidatedMetricObservation =
  | ReportedFinancialObservation
  | ReportedVolumeObservation
  | DerivedObservation;

export type RawMetricObservation = MetricObservation;

/**
 * Validated observation union for strict typing.
 */
export type TypedMetricObservation = ValidatedMetricObservation;

export interface MetricObservation {
  id: string;
  companyId: string;
  metricId: string;
  period: string; // e.g., '2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2024-FY', '2025-Q1', '2025-Q2'
  periodType: PeriodType;
  calendarYear: number;
  calendarQuarter?: number; // 1, 2, 3, 4
  value: number | null; // null if not reported or not applicable
  unit: MetricUnit;
  currency?: string; // original reported currency
  valueType: MetricValueType;
  reportingScope?: ReportingScope;
  accountingBasis?: AccountingBasis;
  volumeDefinition?: VolumeDefinition;
  verificationStatus?: VerificationStatus;
  verificationMethod?: VerificationMethod;
  evidenceReference?: string;
  tableReference?: string;
  sectionReference?: string;
  sourceDocId?: string;
  pageNumber?: number | string;
  originalLabel?: string;
  /**
   * Intrinsic peer-comparability eligibility of the individual observation.
   * Evaluated alongside pairwise dimensional alignment in checkObservationComparability().
   */
  isComparable: boolean;
  nonComparableReason?: string;
  inputObservationIds?: string[];
  derivationFormula?: string;
  notes?: string;
}

export interface ProvenanceValidationResult {
  valid: boolean;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  reasons: string[];
}

export type GuidanceStatus =
  | 'initial'
  | 'reaffirmed'
  | 'raised'
  | 'lowered'
  | 'withdrawn'
  | 'suspended'
  | 'not_provided';

export interface GuidanceRevision {
  date: string;
  status: GuidanceStatus;
  min?: number;
  max?: number;
  target?: number;
  text: string;
  sourceDocId: string;
}

export interface GuidanceObservation {
  id: string;
  companyId: string;
  metricId: string;
  reportingYear: number;
  originalText: string;
  min?: number;
  max?: number;
  target?: number;
  midpoint?: number;
  unit: MetricUnit;
  currency?: string;
  reportingScope?: ReportingScope;
  accountingBasis?: AccountingBasis;
  verificationStatus?: VerificationStatus;
  status: GuidanceStatus;
  publicationDate: string;
  sourceDocId: string;
  pageNumber?: number | string;
  tableReference?: string;
  revisionHistory?: GuidanceRevision[];
  assumptions?: string[];
  riskNotes?: string;
}

export interface RegionalObservation {
  id: string;
  companyId: string;
  regionId: RegionId;
  metricId: string;
  period: string;
  value: number;
  unit: MetricUnit;
  currency?: string;
  reportingScope?: ReportingScope;
  volumeDefinition?: VolumeDefinition;
  verificationStatus?: VerificationStatus;
  sourceDocId: string;
  pageNumber?: number | string;
  originalRegionLabel: string;
  regionalDefinitionNotes?: string;
}

export interface DataQualityReport {
  totalObservations: number;
  totalGuidanceObservations: number;
  totalSources: number;
  verifiedSourcesRatio: number;
  missingSourcesCount: number;
  nonComparableCount: number;
  lastUpdated: string;
  companiesCovered: number;
  periodsCovered: string[];
}
