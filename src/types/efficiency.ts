/**
 * AutoMetrics Intelligence — OEM Cost & Efficiency Benchmark Type Definitions
 *
 * Operational and financial productivity metrics comparing 16 global automakers.
 */

export type HeadcountType = 'average' | 'year_end' | 'full_time_equivalent';
export type HeadcountScope = 'consolidated_group' | 'automotive_segment';
export type EfficiencyMetricClassification = 'reported' | 'calculated' | 'estimated' | 'proxy';
export type EfficiencyPeriod = '2025-FY' | '2024-FY' | '2026-LTM-est';
export type EstimateMethodology = 'simple_annualization' | 'trailing_twelve_months' | 'guidance_based';

export interface ReportedInputDetails {
  reportedPeriod: string; // e.g. '9M 2026' or 'FY2026 H1'
  reportedRevenue: number;
  reportedOperatingProfit: number;
  reportedVolume: number;
  annualizationFactor: number; // e.g. 1.3333 or 2.0
  reconciliationFormula: string;
}

export interface OEMEfficiencyRecord {
  companyId: string;
  companyName: string;
  period: EfficiencyPeriod | string;
  periodType: 'annual' | 'ltm_estimate';
  reportingCurrency: string;
  fiscalYearEnd: string; // e.g., 'Dec 31', 'Mar 31' (Toyota, Honda, Nissan)

  // Workforce
  headcount: number;
  headcountType: HeadcountType;
  headcountScope: HeadcountScope;
  headcountNotesKo: string;
  headcountNotesEn: string;

  // Financials (in millions of reportingCurrency)
  revenueGroup: number;
  revenueAutomotive: number | null;
  operatingProfitGroup: number;
  operatingProfitAutomotive: number | null;
  operatingMarginGroup: number; // percentage
  operatingMarginAutomotive: number | null; // percentage
  rdExpenditure: number | null;
  rdAccountingType: 'expensed' | 'total_capitalized_and_expensed' | 'not_disclosed';
  capex: number | null;
  capexScope: 'consolidated_group' | 'automotive';

  // Volumes (in thousand units)
  vehicleDeliveriesRetail: number | null;
  vehicleShipmentsWholesale: number | null;
  comparableVolumeUsed: number; // in thousand units
  volumeTypeUsed: 'retail_deliveries' | 'wholesale_shipments';

  // Calculated Core Efficiency Metrics (in reportingCurrency or percentages)
  revenuePerEmployee: number; // revenue / headcount (in functional currency units)
  profitPerEmployee: number; // operatingProfit / headcount (in functional currency units)
  revenuePerVehicle: number; // revenue / (volume * 1000) (in functional currency units)
  profitPerVehicle: number; // operatingProfit / (volume * 1000) (in functional currency units)
  rdIntensity: number | null; // (rdExpenditure / revenue) * 100 (%)
  capexIntensity: number | null; // (capex / revenue) * 100 (%)
  revenuePerCapex: number | null; // revenue / capex (ratio)

  // Status & Provenance
  isEstimate: boolean;
  estimateMethodology?: EstimateMethodology;
  reportedInputDetails?: ReportedInputDetails;
  estimateBasisNotesKo?: string;
  estimateBasisNotesEn?: string;
  metricClassifications: {
    revenuePerEmployee: EfficiencyMetricClassification;
    profitPerEmployee: EfficiencyMetricClassification;
    revenuePerVehicle: EfficiencyMetricClassification;
    profitPerVehicle: EfficiencyMetricClassification;
    rdIntensity: EfficiencyMetricClassification;
    capexIntensity: EfficiencyMetricClassification;
    revenuePerCapex: EfficiencyMetricClassification;
  };
  sourceDocId: string;
  sourceCitation: string;
  sourceUrl: string;
  pageOrLocator: string;
}
