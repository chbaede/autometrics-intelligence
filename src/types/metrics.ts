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

export type PeriodType = 'quarterly' | 'annual' | 'semi_annual';

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

export interface MarginRelationshipRule {
  id: string;
  name: string;
  marginMetricId: string;
  numeratorMetricId: string;
  denominatorMetricId: string;
  numeratorAccountingBases: AccountingBasis[];
  denominatorAccountingBases: AccountingBasis[];
  marginAccountingBases: AccountingBasis[];
  allowedScopeRelationships: ('same_scope' | 'segment_over_group')[];
}

export type MarginSelectionStatus = CandidateSelectionStatus;

export interface MarginCandidateResult {
  status: MarginSelectionStatus;
  ruleId?: string;
  revenue?: MetricObservation;
  profit?: MetricObservation;
  margin?: MetricObservation;
  candidatesChecked: number;
  failedChecks?: string[];
  reasons: string[];
}

export interface MarginValidationChecks {
  period: boolean;
  periodType: boolean;
  scope: boolean;
  accountingBasis: boolean;
  currency: boolean;
  unit: boolean;
  metricDefinition: boolean;
}

export interface MarginValidationResult {
  status: 'verified' | 'needs_review' | 'ambiguous' | 'invalid';
  calculatedMargin: number | null;
  reportedMargin: number | null;
  difference: number | null;
  selectedObservationIds: {
    revenue?: string;
    profit?: string;
    margin?: string;
  };
  checks: MarginValidationChecks;
  diagnostic: string;
  reasons: string[];
}

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
 * Full observation union for strict category typing.
 */
export type TypedMetricObservation =
  | ReportedFinancialObservation
  | ReportedVolumeObservation
  | DerivedObservation
  | MetricObservation;

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
