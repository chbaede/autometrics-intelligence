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
    | 'SOURCE_CLAIM_INTEGRITY'
    | 'FIXTURE_INTEGRITY'
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
  | 'reported_kpi'
  | 'numeric_margin_value';

/**
 * Structured claim-level evidence locator representation (STEP 4-16, Task 2; STEP 4-21, P0-6).
 * Allows binding specific claim locators and claimed values to evidence.
 */
export interface ClaimEvidenceLocator {
  locator?: string;
  pageNumber?: number | string;
  tableReference?: string;
  sectionReference?: string;
  originalLabel?: string;
  claimedValue?: string;
  claimedMetricId?: string;
  claimedNumericValue?: number;
  claimedUnit?: MetricUnit;
  claimedScope?: ReportingScope;
  claimedAccountingBasis?: AccountingBasis;
  claimedPeriod?: string;
  claimedPeriodType?: PeriodType;
  sourceDocId?: string;
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
 * Structured diagnostics for claim verification inspections (STEP 4-21, P2).
 */
export interface ClaimVerificationDiagnosticDetails {
  inspectedLocation?: string;
  expectedMetric?: string;
  expectedValue?: string;
  verifiedMetric?: string;
  verifiedValue?: string;
  numericComparisonResult?: 'match' | 'mismatch' | 'unapplicable';
  sourceDocId?: string;
  period?: string;
  scope?: string;
  accountingBasis?: string;
  failureReason?: string;
  details?: string;
  [key: string]: any;
}

/**
 * Base verification result properties shared by all verification states (STEP 4-19, Task 1; STEP 4-23, P1).
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
  verificationOrigin?: 'repository_fixture' | 'live_source';
  diagnostics?: ClaimVerificationDiagnosticDetails;
}

/**
 * Result indicating that a specific claim has been verified against source content (STEP 4-19, Task 1).
 * verifiedValue is strictly required.
 */
export interface ClaimVerifiedResult extends BaseClaimVerificationResult {
  state: 'claim_verified';
  verificationOrigin: 'repository_fixture' | 'live_source';
  verifiedValue: string;
  verifiedMetricId?: string;
  verifiedNumericValue?: number;
  verifiedUnit?: MetricUnit;
  verifiedScope?: ReportingScope;
  verifiedAccountingBasis?: AccountingBasis;
  verifiedPeriod?: string;
  verifiedPeriodType?: PeriodType;
  /** Exact identifier of the resolved ExtractedLiveDocument block (STEP 5 Remediation, P0-1) */
  blockId?: string;
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
 * Successfully retrieved official IR live source document with cryptographic raw-byte provenance (STEP 5-1, Section 1).
 *
 * PROVENANCE & VERIFICATION BOUNDARY:
 * Live source retrieval guarantees transport provenance and exact raw-byte integrity,
 * but DOES NOT verify or prove any claim or metric (source_retrieved ≠ source_verified ≠ claim_verified).
 */
export interface LiveSourceDocument {
  id: string;
  url: string;
  finalUrl: string;
  retrievedAt: string;
  httpStatus: number;
  contentType: string;
  contentLength: number;
  contentHash: string;
  hashAlgorithm: 'sha256';
  sourceKind: 'official_ir';
  /** Optional matching registered SourceDocument ID if authorized against registry */
  sourceDocId?: string;
  /** Optional automaker company ID if authorized against registry */
  companyId?: string;
}

/**
 * Structured error codes for live source fetching (STEP 5-1, Section 4).
 */
export type LiveSourceFetchErrorCode =
  | 'invalidUrl'
  | 'unsupportedProtocol'
  | 'redirectLimitExceeded'
  | 'redirectProtocolRejected'
  | 'requestTimeout'
  | 'httpError'
  | 'responseTooLarge'
  | 'missingContentType'
  | 'unsupportedContentType'
  | 'networkError'
  | 'unauthorizedSource'
  | 'unauthorizedDomainRedirect';

/**
 * Structured error details for live source fetching failures (STEP 5-1, Section 4).
 */
export interface LiveSourceFetchError {
  code: LiveSourceFetchErrorCode;
  message: string;
  url: string;
  finalUrl?: string;
  httpStatus?: number;
  contentType?: string;
  details?: string;
}

/**
 * Discriminated union result for official IR live source retrieval (STEP 5-1, Section 2 & 4).
 */
export type LiveSourceFetchResult =
  | {
      success: true;
      document: LiveSourceDocument;
      rawBytes: Uint8Array;
    }
  | {
      success: false;
      error: LiveSourceFetchError;
    };

/**
 * Options for configuring live source fetching (STEP 5-1, Section 2).
 */
export interface LiveSourceFetchOptions {
  /** Maximum execution time in milliseconds before aborting (default: 15,000 ms) */
  timeoutMs?: number;
  /** Maximum allowed response size in bytes (default: 20 * 1024 * 1024 = 20 MB) */
  maxResponseBytes?: number;
  /** Maximum number of redirects allowed (default: 5) */
  maxRedirects?: number;
  /** Supported Content-Type media types (default: ['application/pdf', 'text/html']) */
  allowedContentTypes?: string[];
  /** Optional custom fetch implementation for dependency injection / offline testing */
  fetchFn?: typeof fetch;
  /** Optional custom identifier for the created LiveSourceDocument */
  id?: string;
  /** Require URL to be authorized against registered SourceDocuments */
  requireSourceAuthorization?: boolean;
  /** List of authorized SourceDocuments (defaults to registered SOURCE_DOCUMENTS) */
  authorizedSources?: SourceDocument[];
  /** Allow loopback/private network addresses (default: false, set true in unit tests) */
  allowLocalhost?: boolean;
  /** Approved official domain(s); every redirect destination must stay within this perimeter (STEP 5 Remediation, P1-1) */
  officialDomain?: string | string[];
}

/**
 * Structured content block within an extracted document preserving deterministic location (STEP 5-2, Section 6).
 */
export interface DocumentContentBlock {
  id: string;
  blockType: 'title' | 'heading' | 'paragraph' | 'table_row' | 'list_item' | 'text';
  text: string;
  locator: string;
  pageNumber?: number;
  sectionHeading?: string;
  headingLevel?: number;
  tableIndex?: number;
  rowIndex?: number;
  paragraphIndex?: number;
}

/**
 * Deterministically extracted representation of an official IR live source document (STEP 5-2, Section 1).
 *
 * CRITICAL PROVENANCE INVARIANT:
 * - Retains the full authentic LiveSourceDocument with its original URL, final URL, raw-byte contentHash,
 *   hashAlgorithm, and sourceKind.
 * - Extraction never mutates or replaces the raw-byte cryptographic provenance.
 * - Extraction alone DOES NOT verify or prove any claim (source_retrieved ≠ source_verified ≠ claim_verified).
 */
export interface ExtractedLiveDocument {
  /** The authentic LiveSourceDocument containing original cryptographic raw-byte provenance */
  sourceDocument: LiveSourceDocument;
  /** Explicit extraction engine / method identifier */
  extractionMethod: string;
  /** Semantic version of the extraction engine */
  extractionVersion: string;
  /** Full extracted textual representation preserving document order */
  extractedText: string;
  /** ISO-8601 UTC timestamp when extraction was executed */
  extractedAt: string;
  /** Extracted document title where available */
  documentTitle?: string;
  /** Total page count for paginated documents (e.g. PDF) */
  pageCount?: number;
  /** Structured content blocks with deterministic locators for STEP 5-3 */
  blocks: DocumentContentBlock[];
  /** Optional derived SHA-256 digest of the extracted text (strictly distinguished from raw byte contentHash) */
  derivedTextHash?: string;
  /** Optional extraction diagnostics and parser telemetry (STEP 5 Remediation, P1-4) */
  diagnostics?: {
    totalObjectsParsed?: number;
    pageObjectsFound?: number;
    contentStreamsParsed?: number;
    unsupportedFeatures?: string[];
  };
}

/**
 * Structured error codes for document extraction failures (STEP 5-2, Section 1 & 7).
 */
export type LiveDocumentExtractionErrorCode =
  | 'unsupportedContentType'
  | 'invalidDocument'
  | 'extractionUnavailable'
  | 'emptyDocument'
  | 'unsupportedPdfStructure';

/**
 * Structured error details for document extraction failures (STEP 5-2, Section 1 & 7).
 */
export interface LiveDocumentExtractionError {
  code: LiveDocumentExtractionErrorCode;
  message: string;
  contentType: string;
  sourceDocId?: string;
  details?: string;
}

/**
 * Discriminated union result for official IR document extraction (STEP 5-2, Section 1).
 */
export type LiveDocumentExtractionResult =
  | {
      success: true;
      document: ExtractedLiveDocument;
    }
  | {
      success: false;
      error: LiveDocumentExtractionError;
      sourceDocument: LiveSourceDocument;
    };

/**
 * Options for configuring document extraction (STEP 5-2).
 */
export interface LiveDocumentExtractionOptions {
  /** Custom extraction method identifier override */
  extractionMethod?: string;
  /** Custom extraction engine version override */
  extractionVersion?: string;
  /** Compute derived SHA-256 hash over extracted text (default: true) */
  computeDerivedTextHash?: boolean;
}

/**
 * Deterministic locator within an extracted live document (STEP 5-3, Section 1 & 9).
 */
export interface LiveEvidenceLocator {
  page?: number;
  section?: string;
  paragraphIndex?: number;
  tableIndex?: number;
  rowIndex?: number;
  rawLocator?: string;
  /** Exact identifier of the resolved content block (STEP 5 Remediation, P0-1) */
  blockId?: string;
}

/**
 * Structured evidence candidate bound to an official IR live source (STEP 5-3, Section 1).
 *
 * PROVENANCE & ARCHITECTURAL INVARIANT:
 * - Cryptographically bound to sourceDocId and sourceContentHash.
 * - verificationOrigin is strictly 'live_source'.
 * - Preserves raw value text and normalized numeric value.
 * - Explicitly binds metric, scope, accounting basis, period, period type, and support type.
 * - DOES NOT claim verification of any claim (source_retrieved ≠ source_verified ≠ claim_verified).
 */
export interface LiveEvidenceCandidate {
  /** Primary source document identifier */
  sourceDocId: string;
  /** Cryptographic SHA-256 hash of the exact raw HTTP response bytes */
  sourceContentHash: string;
  /** Evidence origin identifier */
  verificationOrigin: 'live_source';
  /** Exact identifier of the resolved ExtractedLiveDocument block (STEP 5 Remediation, P0-1) */
  blockId?: string;

  /** Explicit target metric identifier */
  metricId?: string;
  /** Raw textual value as stated in document content */
  rawValue: string;
  /** Normalized representation of the value */
  normalizedValue?: string;
  /** Parsed numeric value if applicable */
  numericValue?: number;

  /** Metric unit */
  unit?: MetricUnit;
  /** Reporting scope (e.g. consolidated_group, automotive_segment, cars_segment) */
  scope?: ReportingScope;
  /** Accounting basis (e.g. reported, adjusted, non_gaap) */
  accountingBasis?: AccountingBasis;

  /** Reporting period (e.g. '2026-Q2', '2025-FY') */
  period?: string;
  /** Period classification (quarterly, annual) */
  periodType?: PeriodType;

  /** Evidence support type from standard taxonomy */
  supportType: EvidenceSupportType;

  /** Deterministic document location */
  locator: LiveEvidenceLocator;

  /** Verbatim evidence text snippet from extracted document */
  evidenceText: string;

  /** Status of resolving the candidate against the extracted document blocks (STEP 5 Remediation, P0-1) */
  blockResolutionStatus?: 'resolved' | 'failed';
  /** Detailed error reason if block resolution failed */
  blockResolutionError?: string;
}

/**
 * Result of validating a LiveEvidenceCandidate against claims and sources (STEP 5-3, Section 10).
 */
export interface LiveEvidenceValidationResult {
  valid: boolean;
  mismatches: string[];
}

/**
 * Official Investor Relations source registry record (STEP 5-5, Section 1).
 *
 * Explicitly identifies an official OEM IR source endpoint, permitted domain perimeter,
 * reporting period, document type, and target claims for cryptographic end-to-end verification.
 */
export interface OfficialIrSource {
  /** Unique primary identifier for this official source (aligned with SourceDocument.id where applicable) */
  id: string;
  /** Primary OEM corporate identifier (e.g. 'mercedes_benz', 'bmw_group', 'tesla') */
  companyId: string;
  /** Primary official canonical URL for the IR disclosure */
  url: string;
  /** Formal document classification */
  documentType: DocumentType;
  /** Standard reporting period (e.g. '2026-Q2', '2025-FY') */
  reportingPeriod: string;
  /** Period classification (quarterly or annual) */
  periodType: PeriodType;
  /** Expected wire Content-Type */
  expectedContentType: 'application/pdf' | 'text/html';
  /** Approved official domain(s) for the automaker; any redirect outside this perimeter is rejected */
  officialDomain: string | string[];
  /** Formal document title */
  title: string;
  /** Optional operational notes / guidance */
  notes?: string;
  /** Registered source claims eligible for live verification against this source */
  targetClaims?: SourceClaim[];
}

/**
 * Structured error codes for official source pipeline execution (STEP 5-5, Section 10).
 */
export type OfficialSourcePipelineErrorCode =
  | 'unauthorizedSource'
  | 'unauthorizedDomainRedirect'
  | 'fetchFailed'
  | 'extractionFailed'
  | 'bindingFailed'
  | 'verificationFailed';

/**
 * Options for configuring end-to-end official source pipeline execution (STEP 5-5, Section 5).
 */
export interface OfficialSourcePipelineOptions {
  fetchOptions?: LiveSourceFetchOptions;
  extractionOptions?: LiveDocumentExtractionOptions;
  customFetch?: typeof fetch;
  allowLocalhost?: boolean;
}

/**
 * Complete structured outcome of end-to-end official source verification pipeline (STEP 5-5, Section 5 & 7).
 *
 * Preserves complete end-to-end provenance:
 * official source -> wire bytes -> SHA-256 -> extracted document -> evidence candidate -> verification result.
 */
export interface OfficialSourcePipelineResult {
  success: boolean;
  officialSource: OfficialIrSource;
  liveDocument?: LiveSourceDocument;
  extractedDocument?: ExtractedLiveDocument;
  evidenceCandidate?: LiveEvidenceCandidate;
  claimVerificationResult?: ClaimVerificationResult;
  verificationState?: EvidenceClaimVerificationState;
  errorCode?: OfficialSourcePipelineErrorCode;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

/**
 * Single structured result object for entire audit suite (STEP 4-22, P1; STEP 4-23, P1).
 * Distinguishes the audited source commit tree (sourceCommitSha) from the commit containing the report.
 */
export interface AuditReportData {
  generatedAt: string;
  /** The repository source commit that was audited when this report was generated (STEP 4-24, P1) */
  sourceCommitSha: string;
  counts: {
    companies: number;
    observations: number;
    regionalObservations: number;
    guidance: number;
    sourceDocuments: number;
    documentsWithSourceClaims: number;
    sourceClaims: number;
  };
  sourceClaimValidation: {
    checked: number;
    mismatches: number;
  };
  fixtureValidation?: {
    totalFixtures: number;
    valid: boolean;
    errors: number;
  };
  findings: {
    blocking: number;
    review: number;
    documented: number;
    informational: number;
  };
}

/**
 * Validation error for deterministic source content fixtures (STEP 4-22, P1).
 */
export interface SourceContentFixtureValidationError {
  code: string;
  sourceDocId: string;
  fixtureIndex: number;
  detail: string;
}

/**
 * Validation result for deterministic source content fixtures (STEP 4-22, P1).
 */
export interface SourceContentFixtureValidationResult {
  valid: boolean;
  errors: SourceContentFixtureValidationError[];
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

/**
 * Structured source claim representation (STEP 4-20, Task 5).
 * Replaces unverified numeric claims embedded in free-form notes.
 */
export interface SourceClaim {
  metricId: string;
  period: string;
  value: number;
  unit: MetricUnit;
  scope?: ReportingScope;
  accountingBasis?: AccountingBasis;
}

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
  /** Structured claims verified against the source document (STEP 4-20, Task 5). */
  sourceClaims?: SourceClaim[];
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
  /** Explicitly marks legitimate historical duplication (STEP 4-21, Test H). */
  allowHistoricalDuplicate?: boolean;
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

/**
 * Audit finding for historical value reuse across periods (STEP 4-20, Task 7).
 */
export interface HistoricalValueReuseFinding {
  companyId: string;
  metricId: string;
  value: number;
  period1: string;
  period2: string;
  observationId1: string;
  observationId2: string;
  sourceDocId1?: string;
  sourceDocId2?: string;
  code: 'historicalValueReuse';
  detail: string;
}

/**
 * Options for unit-aware numeric comparison and tolerance (STEP 4-21, P0-4).
 */
export interface NumericMatchOptions {
  unit?: MetricUnit;
  tolerance?: number;
}

/**
 * Strict error codes emitted by SourceClaim validator (STEP 4-21, P0-1 & P1).
 */
export type SourceClaimValidationErrorCode =
  | 'sourceClaimCompanyMismatch'
  | 'sourceClaimPeriodMismatch'
  | 'sourceClaimPeriodTypeMismatch'
  | 'sourceClaimMetricMismatch'
  | 'sourceClaimValueMismatch'
  | 'sourceClaimUnitMismatch'
  | 'sourceClaimScopeMismatch'
  | 'sourceClaimAccountingBasisMismatch'
  | 'sourceClaimWithoutObservation'
  | 'ambiguousSourceClaimObservation';

export interface SourceClaimValidationError {
  code: SourceClaimValidationErrorCode;
  sourceDocId: string;
  companyId?: string;
  period?: string;
  metricId?: string;
  claim?: SourceClaim;
  observationId?: string;
  expected?: any;
  actual?: any;
  detail: string;
}

export interface SourceClaimValidationResult {
  valid: boolean;
  errors: SourceClaimValidationError[];
  checkedCount: number;
  mismatchCount: number;
}


