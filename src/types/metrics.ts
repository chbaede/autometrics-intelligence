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
  docType: DocumentType;
  period: string; // e.g., '2024-Q3', '2024-Q4', '2024-FY', '2025-Q1', '2025-Q2'
  publicationDate: string; // YYYY-MM-DD
  officialUrl: string;
  isVerified: boolean;
  notes?: string;
  lastChecked: string;
}

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
  sourceDocId?: string;
  pageNumber?: number | string;
  originalLabel?: string;
  isComparable: boolean;
  nonComparableReason?: string;
  notes?: string;
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
  status: GuidanceStatus;
  publicationDate: string;
  sourceDocId: string;
  pageNumber?: number | string;
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

