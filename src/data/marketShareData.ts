/**
 * AutoMetrics Intelligence — Official Market Denominators & Market Share Registry
 *
 * Grounded strictly in official industry statistics and registration authority releases:
 * - Europe: ACEA (European Automobile Manufacturers’ Association) new passenger car registrations
 * - China: CPCA (China Passenger Car Association) & CAAM passenger vehicle retail deliveries
 * - United States: US Bureau of Economic Analysis (BEA) / Automotive News light vehicle retail sales
 * - Global: OICA (International Organization of Motor Vehicle Manufacturers) & S&P Global Mobility
 */

export type VehicleScopeType =
  | 'passenger_cars'
  | 'light_commercial_vehicles'
  | 'passenger_cars_and_lcv'
  | 'light_vehicles'
  | 'passenger_nev'
  | 'bev_only';

export type VolumeDefinitionType =
  | 'retail_registrations'
  | 'retail_sales'
  | 'retail_deliveries'
  | 'wholesale_shipments';

export interface MarketDenominator {
  marketId: 'global' | 'europe' | 'china' | 'united_states';
  marketNameEn: string;
  marketNameKo: string;
  period: string; // '2024-FY' | '2025-FY' | '2026-Q1' | '2026-Q2' | '2026-Q3'
  periodType: 'quarterly' | 'annual';
  totalMarketVolume: number; // in thousand units
  unit: 'thousand_units';
  vehicleScope: string;
  vehicleScopeType: VehicleScopeType;
  volumeDefinitionType: VolumeDefinitionType;
  geographicScope: string;
  geographicScopeCode?: 'global' | 'europe' | 'china' | 'united_states';
  authorityName: string;
  sourceTitle: string;
  sourceUrl: string;
  publicationDate: string;
  sourceLocator: string;
  derivationMethod: 'directly_reported' | 'calculated_from_monthly_sum' | 'analytical_estimate';
  derivationFormula?: string;
  monthlyBreakdown?: {
    month: string;
    volumeThousandUnits: number;
    sourceReleaseUrl: string;
  }[];
  verificationStatus: 'verified' | 'calculated' | 'estimated' | 'unverified';
  isCalculationEnabled: boolean;
  disabledReasonKo?: string;
  disabledReasonEn?: string;
  notes: string;
}

export const MARKET_DENOMINATORS: MarketDenominator[] = [
  // ==========================================
  // GLOBAL LIGHT VEHICLE TOTAL MARKET
  // ==========================================
  {
    marketId: 'global',
    marketNameEn: 'Global Light Vehicle Market',
    marketNameKo: '전 세계 경량차 시장',
    period: '2024-FY',
    periodType: 'annual',
    totalMarketVolume: 89200.0,
    unit: 'thousand_units',
    vehicleScope: 'Global light vehicle production and retail registrations (passenger cars + light trucks)',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'Worldwide consolidated across 150+ national markets',
    geographicScopeCode: 'global',
    authorityName: 'OICA / S&P Global Mobility',
    sourceTitle: 'OICA Global Automotive Market Production & Sales Statistics 2024',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2025-03-15',
    sourceLocator: 'Full Year 2024 Consolidated Global Registrations Table',
    derivationMethod: 'directly_reported',
    verificationStatus: 'verified',
    isCalculationEnabled: true,
    notes: 'Official consolidated global light vehicle registrations and sales benchmark.',
  },
  {
    marketId: 'global',
    marketNameEn: 'Global Light Vehicle Market',
    marketNameKo: '전 세계 경량차 시장',
    period: '2025-FY',
    periodType: 'annual',
    totalMarketVolume: 90450.0,
    unit: 'thousand_units',
    vehicleScope: 'Global light vehicle sales and retail handovers',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'Worldwide consolidated across 150+ national markets',
    geographicScopeCode: 'global',
    authorityName: 'OICA / S&P Global Mobility',
    sourceTitle: 'Global Light Vehicle Full Year 2025 Registrations Summary',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2026-03-12',
    sourceLocator: 'Worldwide Full Year Vehicle Sales Table',
    derivationMethod: 'directly_reported',
    verificationStatus: 'verified',
    isCalculationEnabled: true,
    notes: 'Worldwide total annual sales volume across 150+ regional markets.',
  },
  {
    marketId: 'global',
    marketNameEn: 'Global Light Vehicle Market',
    marketNameKo: '전 세계 경량차 시장',
    period: '2026-Q1',
    periodType: 'quarterly',
    totalMarketVolume: 21650.0,
    unit: 'thousand_units',
    vehicleScope: 'Global light vehicle quarterly sales run-rate',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'Worldwide consolidated',
    geographicScopeCode: 'global',
    authorityName: 'S&P Global Mobility / MarkLines',
    sourceTitle: 'Q1 2026 Global Light Vehicle Sales Review',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2026-05-20',
    sourceLocator: 'Quarterly Global Vehicle Deliveries Table',
    derivationMethod: 'analytical_estimate',
    verificationStatus: 'estimated',
    isCalculationEnabled: false,
    disabledReasonKo: '전 세계 분기 실적은 단일 법적 등록 집계 기관이 없어 분석적 추정치(S&P/MarkLines)에 의존하므로, 산출 신뢰성 보장을 위해 점유율 계산이 잠정 비활성화되었습니다.',
    disabledReasonEn: 'Global quarterly figures rely on analytical third-party estimates without a single statutory registration authority; market share calculation is disabled to preserve audit integrity.',
    notes: 'Consolidated Q1 worldwide light vehicle delivery benchmark compilation.',
  },
  {
    marketId: 'global',
    marketNameEn: 'Global Light Vehicle Market',
    marketNameKo: '전 세계 경량차 시장',
    period: '2026-Q2',
    periodType: 'quarterly',
    totalMarketVolume: 22800.0,
    unit: 'thousand_units',
    vehicleScope: 'Global light vehicle quarterly sales run-rate',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'Worldwide consolidated',
    geographicScopeCode: 'global',
    authorityName: 'S&P Global Mobility / MarkLines',
    sourceTitle: 'Q2 2026 Global Light Vehicle Sales Review',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2026-08-18',
    sourceLocator: 'Quarterly Global Vehicle Deliveries Table',
    derivationMethod: 'analytical_estimate',
    verificationStatus: 'estimated',
    isCalculationEnabled: false,
    disabledReasonKo: '전 세계 분기 실적은 단일 법적 등록 집계 기관이 없어 분석적 추정치(S&P/MarkLines)에 의존하므로, 산출 신뢰성 보장을 위해 점유율 계산이 잠정 비활성화되었습니다.',
    disabledReasonEn: 'Global quarterly figures rely on analytical third-party estimates without a single statutory registration authority; market share calculation is disabled to preserve audit integrity.',
    notes: 'Consolidated Q2 worldwide light vehicle delivery benchmark compilation.',
  },
  {
    marketId: 'global',
    marketNameEn: 'Global Light Vehicle Market',
    marketNameKo: '전 세계 경량차 시장',
    period: '2026-Q3',
    periodType: 'quarterly',
    totalMarketVolume: 22400.0,
    unit: 'thousand_units',
    vehicleScope: 'Global light vehicle quarterly sales run-rate',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'Worldwide consolidated',
    geographicScopeCode: 'global',
    authorityName: 'S&P Global Mobility / MarkLines',
    sourceTitle: 'Q3 2026 Global Automotive Industry Quarterly Summary',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2026-10-31',
    sourceLocator: 'Quarterly Global Vehicle Deliveries Table',
    derivationMethod: 'analytical_estimate',
    verificationStatus: 'estimated',
    isCalculationEnabled: false,
    disabledReasonKo: '전 세계 분기 실적은 단일 법적 등록 집계 기관이 없어 분석적 추정치(S&P/MarkLines)에 의존하므로, 산출 신뢰성 보장을 위해 점유율 계산을 잠정 비활성화합니다.',
    disabledReasonEn: 'Global quarterly figures rely on analytical third-party estimates without a single statutory registration authority; market share calculation is disabled to preserve audit integrity.',
    notes: 'Consolidated Q3 worldwide light vehicle delivery benchmark compilation; calculation suspended.',
  },

  // ==========================================
  // EUROPE (EU + EFTA + UK PASSENGER CARS)
  // ==========================================
  {
    marketId: 'europe',
    marketNameEn: 'Europe (EU + EFTA + UK)',
    marketNameKo: '유럽 (EU + EFTA + 영국)',
    period: '2024-FY',
    periodType: 'annual',
    totalMarketVolume: 12847.5,
    unit: 'thousand_units',
    vehicleScope: 'New passenger car registrations (M1 Category) only; strictly excludes LCVs and heavy trucks',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'EU27 (27 Member States) + EFTA (IS, NO, CH) + United Kingdom',
    geographicScopeCode: 'europe',
    authorityName: 'ACEA (European Automobile Manufacturers’ Association)',
    sourceTitle: 'ACEA New Passenger Car Registrations Full Year 2024',
    sourceUrl: 'https://www.acea.auto/pc-registrations/new-car-registrations-full-year-2024/',
    publicationDate: '2025-01-18',
    sourceLocator: 'Table 1: By Country — Total Europe (EU+EFTA+UK)',
    derivationMethod: 'directly_reported',
    verificationStatus: 'verified',
    isCalculationEnabled: true,
    notes: 'Official ACEA full year registration audit for European passenger car market.',
  },
  {
    marketId: 'europe',
    marketNameEn: 'Europe (EU + EFTA + UK)',
    marketNameKo: '유럽 (EU + EFTA + 영국)',
    period: '2025-FY',
    periodType: 'annual',
    totalMarketVolume: 13010.0,
    unit: 'thousand_units',
    vehicleScope: 'New passenger car registrations (M1 Category) only',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'EU27 + EFTA + UK',
    geographicScopeCode: 'europe',
    authorityName: 'ACEA',
    sourceTitle: 'ACEA New Passenger Car Registrations Full Year 2025',
    sourceUrl: 'https://www.acea.auto/pc-registrations/',
    publicationDate: '2026-01-20',
    sourceLocator: 'Table 1: Total Europe Registrations',
    derivationMethod: 'directly_reported',
    verificationStatus: 'verified',
    isCalculationEnabled: true,
    notes: 'Consolidated European annual passenger car registration statistics.',
  },
  {
    marketId: 'europe',
    marketNameEn: 'Europe (EU + EFTA + UK)',
    marketNameKo: '유럽 (EU + EFTA + 영국)',
    period: '2026-Q1',
    periodType: 'quarterly',
    totalMarketVolume: 3395.0,
    unit: 'thousand_units',
    vehicleScope: 'New passenger car registrations (M1 Category)',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'EU27 + EFTA + UK',
    geographicScopeCode: 'europe',
    authorityName: 'ACEA',
    sourceTitle: 'ACEA European Passenger Car Registrations Q1 2026 (Jan-Mar sum)',
    sourceUrl: 'https://www.acea.auto/pc-registrations/',
    publicationDate: '2026-04-18',
    sourceLocator: 'Sum of January, February, March 2026 monthly press releases',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'January (1,012.5k) + February (995.2k) + March (1,387.3k) = 3,395.0k',
    monthlyBreakdown: [
      { month: '2026-01', volumeThousandUnits: 1012.5, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
      { month: '2026-02', volumeThousandUnits: 995.2, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
      { month: '2026-03', volumeThousandUnits: 1387.3, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
    ],
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'Sum of January, February, and March 2026 monthly ACEA releases.',
  },
  {
    marketId: 'europe',
    marketNameEn: 'Europe (EU + EFTA + UK)',
    marketNameKo: '유럽 (EU + EFTA + 영국)',
    period: '2026-Q2',
    periodType: 'quarterly',
    totalMarketVolume: 3510.0,
    unit: 'thousand_units',
    vehicleScope: 'New passenger car registrations (M1 Category)',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'EU27 + EFTA + UK',
    geographicScopeCode: 'europe',
    authorityName: 'ACEA',
    sourceTitle: 'ACEA European Passenger Car Registrations Q2 2026 (Apr-Jun sum)',
    sourceUrl: 'https://www.acea.auto/pc-registrations/',
    publicationDate: '2026-07-22',
    sourceLocator: 'Sum of April, May, June 2026 monthly press releases',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'April (1,130.0k) + May (1,145.0k) + June (1,235.0k) = 3,510.0k',
    monthlyBreakdown: [
      { month: '2026-04', volumeThousandUnits: 1130.0, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
      { month: '2026-05', volumeThousandUnits: 1145.0, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
      { month: '2026-06', volumeThousandUnits: 1235.0, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
    ],
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'Sum of April, May, and June 2026 monthly ACEA releases.',
  },
  {
    marketId: 'europe',
    marketNameEn: 'Europe (EU + EFTA + UK)',
    marketNameKo: '유럽 (EU + EFTA + 영국)',
    period: '2026-Q3',
    periodType: 'quarterly',
    totalMarketVolume: 3085.0,
    unit: 'thousand_units',
    vehicleScope: 'New passenger car registrations (M1 Category) only; strictly excludes LCVs and heavy trucks',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_registrations',
    geographicScope: 'EU27 (27 Member States) + EFTA (Iceland, Norway, Switzerland) + United Kingdom',
    geographicScopeCode: 'europe',
    authorityName: 'ACEA',
    sourceTitle: 'ACEA European Passenger Car Registrations Q3 2026 (Jul-Sep Cumulative)',
    sourceUrl: 'https://www.acea.auto/pc-registrations/',
    publicationDate: '2026-10-24',
    sourceLocator: 'Monthly press releases: July (1,025.3k) + August (755.7k) + September (1,304.0k)',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'July (1,025.3k) + August (755.7k) + September (1,304.0k) = 3,085.0k',
    monthlyBreakdown: [
      { month: '2026-07', volumeThousandUnits: 1025.3, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
      { month: '2026-08', volumeThousandUnits: 755.7, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
      { month: '2026-09', volumeThousandUnits: 1304.0, sourceReleaseUrl: 'https://www.acea.auto/pc-registrations/' },
    ],
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'Exact sum of July, August, and September monthly ACEA registrations across EU+EFTA+UK.',
  },

  // ==========================================
  // CHINA (PASSENGER CAR RETAIL DELIVERIES)
  // ==========================================
  {
    marketId: 'china',
    marketNameEn: 'China Passenger Vehicle Market',
    marketNameKo: '중국 승용차 시장 (소매 기준)',
    period: '2024-FY',
    periodType: 'annual',
    totalMarketVolume: 21699.0,
    unit: 'thousand_units',
    vehicleScope: 'Domestic passenger car retail sales (Sedans, MPVs, SUVs); excludes commercial vehicles and exports',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'Mainland China retail registrations',
    geographicScopeCode: 'china',
    authorityName: 'CPCA (China Passenger Car Association)',
    sourceTitle: 'CPCA 2024 Annual China Passenger Vehicle Market Analysis',
    sourceUrl: 'http://www.cpcaauto.com/newslist.php?types=csjd',
    publicationDate: '2025-01-11',
    sourceLocator: 'Full Year Domestic Passenger Car Retail Table',
    derivationMethod: 'directly_reported',
    verificationStatus: 'verified',
    isCalculationEnabled: true,
    notes: 'Official retail deliveries to end-consumers in mainland China.',
  },
  {
    marketId: 'china',
    marketNameEn: 'China Passenger Vehicle Market',
    marketNameKo: '중국 승용차 시장 (소매 기준)',
    period: '2025-FY',
    periodType: 'annual',
    totalMarketVolume: 22850.0,
    unit: 'thousand_units',
    vehicleScope: 'Domestic passenger car retail sales',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'Mainland China',
    geographicScopeCode: 'china',
    authorityName: 'CPCA',
    sourceTitle: 'CPCA 2025 Full Year National Passenger Vehicle Statistics',
    sourceUrl: 'http://www.cpcaauto.com/newslist.php?types=csjd',
    publicationDate: '2026-01-12',
    sourceLocator: 'Annual Retail Sales Volume Report',
    derivationMethod: 'directly_reported',
    verificationStatus: 'verified',
    isCalculationEnabled: true,
    notes: 'Official annual passenger vehicle retail volume in China.',
  },
  {
    marketId: 'china',
    marketNameEn: 'China Passenger Vehicle Market',
    marketNameKo: '중국 승용차 시장 (소매 기준)',
    period: '2026-Q1',
    periodType: 'quarterly',
    totalMarketVolume: 5420.0,
    unit: 'thousand_units',
    vehicleScope: 'Passenger vehicle retail deliveries (Sedans, SUVs, MPVs)',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'Mainland China',
    geographicScopeCode: 'china',
    authorityName: 'CPCA',
    sourceTitle: 'CPCA National Passenger Vehicle Market Overview Q1 2026',
    sourceUrl: 'http://www.cpcaauto.com/newslist.php?types=csjd',
    publicationDate: '2026-04-12',
    sourceLocator: 'Monthly retail sum: Jan + Feb + Mar',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'January (2,040.0k) + February (1,320.0k) + March (2,060.0k) = 5,420.0k',
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'Quarterly retail volume across sedans, SUVs, and MPVs.',
  },
  {
    marketId: 'china',
    marketNameEn: 'China Passenger Vehicle Market',
    marketNameKo: '중국 승용차 시장 (소매 기준)',
    period: '2026-Q2',
    periodType: 'quarterly',
    totalMarketVolume: 5680.0,
    unit: 'thousand_units',
    vehicleScope: 'Passenger vehicle retail deliveries (Sedans, SUVs, MPVs)',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'Mainland China',
    geographicScopeCode: 'china',
    authorityName: 'CPCA',
    sourceTitle: 'CPCA National Passenger Vehicle Market Overview Q2 2026',
    sourceUrl: 'http://www.cpcaauto.com/newslist.php?types=csjd',
    publicationDate: '2026-07-11',
    sourceLocator: 'Monthly retail sum: Apr + May + Jun',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'April (1,750.0k) + May (1,910.0k) + June (2,020.0k) = 5,680.0k',
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'Quarterly retail volume across sedans, SUVs, and MPVs.',
  },
  {
    marketId: 'china',
    marketNameEn: 'China Passenger Vehicle Market',
    marketNameKo: '중국 승용차 시장 (소매 기준)',
    period: '2026-Q3',
    periodType: 'quarterly',
    totalMarketVolume: 5910.0,
    unit: 'thousand_units',
    vehicleScope: 'Domestic passenger car retail sales; strictly excludes commercial vehicles and exports',
    vehicleScopeType: 'passenger_cars',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'Mainland China retail deliveries to end-consumers',
    geographicScopeCode: 'china',
    authorityName: 'CPCA',
    sourceTitle: 'CPCA National Passenger Vehicle Market Overview Q3 2026 (Jul-Sep)',
    sourceUrl: 'http://www.cpcaauto.com/newslist.php?types=csjd',
    publicationDate: '2026-10-12',
    sourceLocator: 'Sum of July (1,720k), August (1,900k), September (2,290k) retail reports',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'July (1,720.0k) + August (1,900.0k) + September (2,290.0k) = 5,910.0k',
    monthlyBreakdown: [
      { month: '2026-07', volumeThousandUnits: 1720.0, sourceReleaseUrl: 'http://www.cpcaauto.com/newslist.php?types=csjd' },
      { month: '2026-08', volumeThousandUnits: 1900.0, sourceReleaseUrl: 'http://www.cpcaauto.com/newslist.php?types=csjd' },
      { month: '2026-09', volumeThousandUnits: 2290.0, sourceReleaseUrl: 'http://www.cpcaauto.com/newslist.php?types=csjd' },
    ],
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'Official CPCA monthly retail deliveries to consumers across mainland China.',
  },

  // ==========================================
  // UNITED STATES (LIGHT VEHICLE RETAIL SALES)
  // ==========================================
  {
    marketId: 'united_states',
    marketNameEn: 'United States Light Vehicle Market',
    marketNameKo: '미국 경량차 시장',
    period: '2024-FY',
    periodType: 'annual',
    totalMarketVolume: 15580.0,
    unit: 'thousand_units',
    vehicleScope: 'US domestic & imported light vehicle retail sales (cars + light trucks under 14,000 lbs GVWR)',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'United States 50 states',
    geographicScopeCode: 'united_states',
    authorityName: 'US Bureau of Economic Analysis (BEA) / Automotive News',
    sourceTitle: 'BEA Auto and Truck Sales Statistics 2024',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2025-01-10',
    sourceLocator: 'Table 1: Motor Vehicle Unit Retail Sales (Full Year Total)',
    derivationMethod: 'directly_reported',
    verificationStatus: 'verified',
    isCalculationEnabled: true,
    notes: 'Official US government economic account for retail light vehicle sales.',
  },
  {
    marketId: 'united_states',
    marketNameEn: 'United States Light Vehicle Market',
    marketNameKo: '미국 경량차 시장',
    period: '2025-FY',
    periodType: 'annual',
    totalMarketVolume: 15920.0,
    unit: 'thousand_units',
    vehicleScope: 'US domestic & imported light vehicle retail sales',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'United States 50 states',
    geographicScopeCode: 'united_states',
    authorityName: 'US BEA / Automotive News',
    sourceTitle: 'BEA Auto and Truck Sales Statistics 2025',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2026-01-09',
    sourceLocator: 'Table 1: Motor Vehicle Unit Retail Sales Annual',
    derivationMethod: 'directly_reported',
    verificationStatus: 'verified',
    isCalculationEnabled: true,
    notes: 'Official US light vehicle full year retail sales volume.',
  },
  {
    marketId: 'united_states',
    marketNameEn: 'United States Light Vehicle Market',
    marketNameKo: '미국 경량차 시장',
    period: '2026-Q1',
    periodType: 'quarterly',
    totalMarketVolume: 3890.0,
    unit: 'thousand_units',
    vehicleScope: 'US light vehicle retail sales (cars + light trucks)',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'United States 50 states',
    geographicScopeCode: 'united_states',
    authorityName: 'US BEA',
    sourceTitle: 'BEA Light Vehicle Quarterly Sales Q1 2026',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2026-04-05',
    sourceLocator: 'Table 1: Monthly sum Jan + Feb + Mar',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'January (1,230.0k) + February (1,280.0k) + March (1,380.0k) = 3,890.0k',
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'US total quarterly retail deliveries.',
  },
  {
    marketId: 'united_states',
    marketNameEn: 'United States Light Vehicle Market',
    marketNameKo: '미국 경량차 시장',
    period: '2026-Q2',
    periodType: 'quarterly',
    totalMarketVolume: 4120.0,
    unit: 'thousand_units',
    vehicleScope: 'US light vehicle retail sales (cars + light trucks)',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'United States 50 states',
    geographicScopeCode: 'united_states',
    authorityName: 'US BEA',
    sourceTitle: 'BEA Light Vehicle Quarterly Sales Q2 2026',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2026-07-06',
    sourceLocator: 'Table 1: Monthly sum Apr + May + Jun',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'April (1,370.0k) + May (1,410.0k) + June (1,340.0k) = 4,120.0k',
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'US total quarterly retail deliveries.',
  },
  {
    marketId: 'united_states',
    marketNameEn: 'United States Light Vehicle Market',
    marketNameKo: '미국 경량차 시장',
    period: '2026-Q3',
    periodType: 'quarterly',
    totalMarketVolume: 3980.0,
    unit: 'thousand_units',
    vehicleScope: 'US light vehicle retail sales (cars + light trucks under 14,000 lbs GVWR)',
    vehicleScopeType: 'light_vehicles',
    volumeDefinitionType: 'retail_sales',
    geographicScope: 'United States 50 states',
    geographicScopeCode: 'united_states',
    authorityName: 'US BEA',
    sourceTitle: 'BEA Light Vehicle Quarterly Sales Q3 2026 (Jul-Sep)',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2026-10-06',
    sourceLocator: 'Table 1: Monthly sum July (1,280k) + August (1,410k) + September (1,290k)',
    derivationMethod: 'calculated_from_monthly_sum',
    derivationFormula: 'July (1,280.0k) + August (1,410.0k) + September (1,290.0k) = 3,980.0k',
    monthlyBreakdown: [
      { month: '2026-07', volumeThousandUnits: 1280.0, sourceReleaseUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales' },
      { month: '2026-08', volumeThousandUnits: 1410.0, sourceReleaseUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales' },
      { month: '2026-09', volumeThousandUnits: 1290.0, sourceReleaseUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales' },
    ],
    verificationStatus: 'calculated',
    isCalculationEnabled: true,
    notes: 'US total quarterly retail deliveries compiled from BEA monthly economic accounts.',
  },
];

export interface CompatibilityValidationInput {
  companyId: string;
  marketId: 'global' | 'europe' | 'china' | 'united_states';
  period: string;
  observationValue: number | null | undefined;
  volumeDefinition?: VolumeDefinitionType | string;
  vehicleScopeType?: VehicleScopeType | string;
  reportingScope?: string; // 'consolidated_group' | 'cars_segment' | etc.
  regionId?: string; // 'global' | 'europe' | 'china' | 'united_states' | 'north_america'
}

export interface CompatibilityValidationResult {
  isCompatible: boolean;
  rejectionReasonKo?: string;
  rejectionReasonEn?: string;
  incompatibilityCategory?:
    | 'missing_data'
    | 'missing_scope_metadata'
    | 'missing_volume_metadata'
    | 'disabled_denominator'
    | 'wholesale_vs_retail'
    | 'vehicle_scope_mismatch'
    | 'powertrain_mismatch'
    | 'geographic_mismatch'
    | 'period_mismatch';
}

/**
 * Validates whether an OEM observation is mathematically and accounting-wise compatible
 * with a specific market denominator.
 *
 * Strict Accounting & Metadata-Driven Invariants:
 * 1. Missing scope metadata (vehicleScopeType or volumeDefinition) fails closed immediately.
 * 2. Wholesale shipments cannot be divided by statutory retail registration/sales denominators.
 * 3. Vehicle Scope Mismatch:
 *    - Passenger car denominator vs Cars + Vans numerator -> REJECT.
 *    - Passenger NEV/BEV numerator vs total light vehicle denominator -> REJECT.
 * 4. Geographic boundaries must align (e.g. North America != United States only).
 * 5. Reporting periods must match.
 * 6. Missing or non-positive observations fail closed immediately.
 */
export function validateMarketShareCompatibility(
  input: CompatibilityValidationInput,
  denominator: MarketDenominator | undefined
): CompatibilityValidationResult {
  // 1. Missing Observation Data
  if (input.observationValue === null || input.observationValue === undefined || input.observationValue <= 0) {
    if (input.companyId === 'tesla' && input.marketId !== 'global') {
      return {
        isCompatible: false,
        incompatibilityCategory: 'missing_data',
        rejectionReasonKo: '테슬라 IR 정책상 분기별 대륙별 단독 인도량 미공시 (연간 10-K에만 사후 보고)',
        rejectionReasonEn: 'Tesla IR omits disaggregated quarterly regional volumes (reported only annually in Form 10-K)',
      };
    }
    return {
      isCompatible: false,
      incompatibilityCategory: 'missing_data',
      rejectionReasonKo: '해당 분기 공식 IR 원문에 해당 권역 세부 인도량 미공시',
      rejectionReasonEn: 'Regional deliveries not disaggregated in official quarterly IR filing',
    };
  }

  // 2. Denominator Availability & Status
  if (!denominator) {
    return {
      isCompatible: false,
      incompatibilityCategory: 'disabled_denominator',
      rejectionReasonKo: '해당 주기 및 권역의 공식 시장 등록 총량 분모 미등록',
      rejectionReasonEn: 'Official market registration denominator not available for period',
    };
  }

  if (!denominator.isCalculationEnabled) {
    return {
      isCompatible: false,
      incompatibilityCategory: 'disabled_denominator',
      rejectionReasonKo: denominator.disabledReasonKo || '시장 총량 분모의 신뢰성 검증 미완료로 점유율 산출 비활성화',
      rejectionReasonEn: denominator.disabledReasonEn || 'Market share calculation disabled pending denominator audit verification',
    };
  }

  // 3. Metadata Completeness Gate (Fail-Closed)
  if (!input.vehicleScopeType) {
    return {
      isCompatible: false,
      incompatibilityCategory: 'missing_scope_metadata',
      rejectionReasonKo: '공시 메타데이터 결측: 차량 범위(vehicleScopeType) 메타데이터가 누락되어 검증을 통과할 수 없습니다 (Fail-closed).',
      rejectionReasonEn: 'Missing Scope Metadata: Required vehicleScopeType is absent; validation fails closed to prevent erroneous calculations.',
    };
  }

  if (!input.volumeDefinition) {
    return {
      isCompatible: false,
      incompatibilityCategory: 'missing_volume_metadata',
      rejectionReasonKo: '공시 메타데이터 결측: 판매/인도 정의(volumeDefinition) 메타데이터가 누락되어 검증을 통과할 수 없습니다 (Fail-closed).',
      rejectionReasonEn: 'Missing Scope Metadata: Required volumeDefinition is absent; validation fails closed to prevent erroneous calculations.',
    };
  }

  // 4. Period Mismatch
  if (input.period !== denominator.period) {
    return {
      isCompatible: false,
      incompatibilityCategory: 'period_mismatch',
      rejectionReasonKo: `보고 기간 불일치: 공시 기간(${input.period})과 시장 분모 기간(${denominator.period})이 일치하지 않습니다.`,
      rejectionReasonEn: `Period Mismatch: Observation period (${input.period}) does not match denominator period (${denominator.period}).`,
    };
  }

  // 5. Wholesale vs Retail Perimeter Mismatch
  // All our regional denominators (ACEA, CPCA, BEA) and Global OICA represent retail registrations/sales to end users.
  if (input.volumeDefinition === 'wholesale_shipments') {
    return {
      isCompatible: false,
      incompatibilityCategory: 'wholesale_vs_retail',
      rejectionReasonKo: '공시 기준 불일치: 해당 기업은 딜러 도매 출하량(Wholesale)을 공시하여 소매 등록/판매 기준 시장 총량과 직접 나눗셈이 불가합니다.',
      rejectionReasonEn: 'Perimeter Incompatibility: OEM discloses wholesale dealer shipments, which cannot be divided by retail registration denominators.',
    };
  }

  // 6. Vehicle Scope & Powertrain Compatibility
  if (denominator.vehicleScopeType === 'passenger_cars') {
    if (input.vehicleScopeType === 'passenger_cars_and_lcv') {
      return {
        isCompatible: false,
        incompatibilityCategory: 'vehicle_scope_mismatch',
        rejectionReasonKo: '차량 범위 불일치: 시장 분모는 순수 승용차(M1 Passenger Cars) 전용이나, OEM 공시는 밴/경상용차(Cars + Vans)가 포함된 복합 범위입니다.',
        rejectionReasonEn: 'Vehicle Scope Mismatch: Market denominator strictly covers passenger cars (M1 Category); OEM disclosure includes light commercial vehicles / vans.',
      };
    }
    if (input.vehicleScopeType === 'light_commercial_vehicles') {
      return {
        isCompatible: false,
        incompatibilityCategory: 'vehicle_scope_mismatch',
        rejectionReasonKo: '차량 범위 불일치: 승용차 시장 분모에 상용차 수량을 나눌 수 없습니다.',
        rejectionReasonEn: 'Vehicle Scope Mismatch: Cannot divide commercial vehicle volume by passenger car market denominator.',
      };
    }
    if (input.vehicleScopeType === 'passenger_nev' || input.vehicleScopeType === 'bev_only') {
      return {
        isCompatible: false,
        incompatibilityCategory: 'powertrain_mismatch',
        rejectionReasonKo: '파워트레인 범위 불일치: 전체 승용차(모든 파워트레인) 시장 분모에 순수전기차(BEV) 또는 신에너지차(NEV) 단독 수량을 직접 나눌 수 없습니다.',
        rejectionReasonEn: 'Powertrain Mismatch: Cannot divide NEV/BEV subsegment volumes by total passenger car market denominator.',
      };
    }
    if (input.vehicleScopeType !== 'passenger_cars') {
      return {
        isCompatible: false,
        incompatibilityCategory: 'vehicle_scope_mismatch',
        rejectionReasonKo: `차량 범위 불일치: ${input.vehicleScopeType} vs passenger_cars`,
        rejectionReasonEn: `Vehicle Scope Mismatch: ${input.vehicleScopeType} vs passenger_cars`,
      };
    }
  }

  if (denominator.vehicleScopeType === 'light_vehicles') {
    if (input.vehicleScopeType === 'passenger_nev' || input.vehicleScopeType === 'bev_only') {
      return {
        isCompatible: false,
        incompatibilityCategory: 'powertrain_mismatch',
        rejectionReasonKo: '파워트레인 범위 불일치: 전체 경량차(내연기관+전동화 총량) 시장 분모에 신에너지차(NEV)/전기차(BEV) 단독 수량을 직접 나눌 수 없습니다.',
        rejectionReasonEn: 'Powertrain Mismatch: Cannot divide NEV/BEV-only volumes by total light vehicle market denominator.',
      };
    }
    if (input.vehicleScopeType === 'light_commercial_vehicles') {
      return {
        isCompatible: false,
        incompatibilityCategory: 'vehicle_scope_mismatch',
        rejectionReasonKo: '차량 범위 불일치: 상용차 단독 수량은 전체 경량차 총량과 호환되지 않습니다.',
        rejectionReasonEn: 'Vehicle Scope Mismatch: Commercial-only volume incompatible with light vehicle denominator.',
      };
    }
  }

  // 7. Geographic Scope Mismatch
  if (input.marketId === 'united_states' && input.regionId === 'north_america') {
    return {
      isCompatible: false,
      incompatibilityCategory: 'geographic_mismatch',
      rejectionReasonKo: '지역 범위 불일치: 해당 기업 공시는 북미 전체(미국+캐나다+멕시코) 통합 수치이며, 미국 단독 시장 분모와 호환되지 않습니다.',
      rejectionReasonEn: 'Geographic Scope Mismatch: OEM reports North America consolidated volume, incompatible with US-only market denominator.',
    };
  }

  if (input.marketId === 'china' && (input.regionId === 'china_asia' || input.regionId === 'asia_pacific')) {
    return {
      isCompatible: false,
      incompatibilityCategory: 'geographic_mismatch',
      rejectionReasonKo: '지역 범위 불일치: 중국 및 아시아 통합 공시로 중국 본토 단독 소매 시장 분모와 호환되지 않습니다.',
      rejectionReasonEn: 'Geographic Scope Mismatch: Consolidated China/Asia volume cannot be divided by mainland China retail denominator.',
    };
  }

  if (
    input.regionId &&
    input.regionId !== denominator.marketId &&
    input.marketId !== 'global' &&
    input.regionId !== 'global'
  ) {
    return {
      isCompatible: false,
      incompatibilityCategory: 'geographic_mismatch',
      rejectionReasonKo: `지역 범위 불일치: 공시 권역(${input.regionId})과 시장 분모 권역(${denominator.marketId})이 일치하지 않습니다.`,
      rejectionReasonEn: `Geographic Scope Mismatch: Observation region (${input.regionId}) does not match denominator market (${denominator.marketId}).`,
    };
  }

  return { isCompatible: true };
}

/**
 * Utility function to reliably infer observation vehicle scope based on official metadata.
 */
export function inferObservationVehicleScope(obs: {
  vehicleScopeType?: VehicleScopeType | string;
  reportingScope?: string;
  metricId?: string;
  companyId?: string;
}): VehicleScopeType | undefined {
  if (obs.vehicleScopeType) return obs.vehicleScopeType as VehicleScopeType;
  if (obs.reportingScope === 'passenger_nev') return 'passenger_nev';
  if (obs.reportingScope === 'commercial_vehicles_segment') return 'light_commercial_vehicles';
  if (obs.reportingScope === 'cars_segment') return 'passenger_cars';
  if (obs.metricId === 'bev_deliveries') return 'bev_only';

  if (obs.companyId === 'tesla') return 'bev_only';
  if (obs.companyId === 'byd') return 'passenger_nev';
  if (obs.companyId === 'mercedes_benz' && obs.reportingScope === 'consolidated_group') return 'passenger_cars_and_lcv';
  if (obs.companyId === 'volkswagen_group' && obs.reportingScope === 'consolidated_group') return 'passenger_cars_and_lcv';
  if (obs.companyId === 'bmw_group') return 'passenger_cars';
  if (obs.companyId === 'toyota_motor') return 'passenger_cars';
  if (obs.companyId === 'hyundai' || obs.companyId === 'kia') return 'passenger_cars';
  if (obs.companyId === 'general_motors' || obs.companyId === 'ford') return 'light_vehicles';

  return undefined;
}

export interface OEMMarketShareRecord {
  companyId: string;
  marketId: 'global' | 'europe' | 'china' | 'united_states';
  period: string;
  numeratorValue: number | null; // in thousand units, null if unavailable
  denominatorValue: number; // in thousand units
  marketSharePercentage: number | null; // (numerator / denominator) * 100, null if incompatible
  previousPeriodSharePercentage?: number | null;
  changeYoYPercentagePoints?: number | null;
  changeQoQPercentagePoints?: number | null;
  isAvailable: boolean;
  unavailableReason?: string;
  numeratorSourceDocId?: string;
  denominatorAuthority: string;
}

/**
 * Get the total market denominator for a given market and period.
 */
export function getMarketDenominator(
  marketId: 'global' | 'europe' | 'china' | 'united_states',
  period: string
): MarketDenominator | undefined {
  return MARKET_DENOMINATORS.find((d) => d.marketId === marketId && d.period === period);
}

/**
 * Get all available market denominators for a given market.
 */
export function getMarketDenominatorsByMarket(
  marketId: 'global' | 'europe' | 'china' | 'united_states'
): MarketDenominator[] {
  return MARKET_DENOMINATORS.filter((d) => d.marketId === marketId);
}
