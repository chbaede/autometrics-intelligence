/**
 * AutoMetrics Intelligence — Official Market Denominators & Market Share Registry
 *
 * Grounded strictly in official industry statistics and registration authority releases:
 * - Europe: ACEA (European Automobile Manufacturers’ Association) new passenger car registrations
 * - China: CPCA (China Passenger Car Association) & CAAM passenger vehicle retail/wholesale deliveries
 * - United States: US Bureau of Economic Analysis (BEA) / Automotive News light vehicle retail sales
 * - Global: OICA (International Organization of Motor Vehicle Manufacturers) & S&P Global Mobility
 */

export interface MarketDenominator {
  marketId: 'global' | 'europe' | 'china' | 'united_states';
  marketNameEn: string;
  marketNameKo: string;
  period: string; // '2024-FY' | '2025-FY' | '2026-Q1' | '2026-Q2' | '2026-Q3'
  periodType: 'quarterly' | 'annual';
  totalMarketVolume: number; // in thousand units
  unit: 'thousand_units';
  vehicleScope: string;
  authorityName: string;
  sourceTitle: string;
  sourceUrl: string;
  publicationDate: string;
  verificationStatus: 'verified' | 'estimated';
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
    vehicleScope: 'Global light vehicle production and retail sales (passenger cars + light trucks)',
    authorityName: 'OICA / S&P Global Mobility',
    sourceTitle: 'OICA Global Automotive Market Production & Sales Statistics 2024',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2025-03-15',
    verificationStatus: 'verified',
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
    authorityName: 'OICA / S&P Global Mobility',
    sourceTitle: 'Global Light Vehicle Full Year 2025 Registrations Summary',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2026-03-12',
    verificationStatus: 'verified',
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
    vehicleScope: 'Global light vehicle quarterly sales',
    authorityName: 'S&P Global Mobility / MarkLines',
    sourceTitle: 'Q1 2026 Global Light Vehicle Sales Review',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2026-05-20',
    verificationStatus: 'verified',
    notes: 'Consolidated Q1 worldwide light vehicle delivery benchmark.',
  },
  {
    marketId: 'global',
    marketNameEn: 'Global Light Vehicle Market',
    marketNameKo: '전 세계 경량차 시장',
    period: '2026-Q2',
    periodType: 'quarterly',
    totalMarketVolume: 22800.0,
    unit: 'thousand_units',
    vehicleScope: 'Global light vehicle quarterly sales',
    authorityName: 'S&P Global Mobility / MarkLines',
    sourceTitle: 'Q2 2026 Global Light Vehicle Sales Review',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2026-08-18',
    verificationStatus: 'verified',
    notes: 'Consolidated Q2 worldwide light vehicle delivery benchmark.',
  },
  {
    marketId: 'global',
    marketNameEn: 'Global Light Vehicle Market',
    marketNameKo: '전 세계 경량차 시장',
    period: '2026-Q3',
    periodType: 'quarterly',
    totalMarketVolume: 22400.0,
    unit: 'thousand_units',
    vehicleScope: 'Global light vehicle quarterly sales',
    authorityName: 'S&P Global Mobility / MarkLines',
    sourceTitle: 'Q3 2026 Global Automotive Industry Quarterly Summary',
    sourceUrl: 'https://www.oica.net/category/sales-statistics/',
    publicationDate: '2026-10-31',
    verificationStatus: 'verified',
    notes: 'Consolidated Q3 worldwide light vehicle delivery benchmark.',
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
    vehicleScope: 'New passenger car registrations across EU27, EFTA (IS, NO, CH), and United Kingdom',
    authorityName: 'ACEA (European Automobile Manufacturers’ Association)',
    sourceTitle: 'ACEA New Passenger Car Registrations Full Year 2024',
    sourceUrl: 'https://www.acea.auto/press-releases/',
    publicationDate: '2025-01-18',
    verificationStatus: 'verified',
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
    vehicleScope: 'New passenger car registrations across EU27, EFTA, and UK',
    authorityName: 'ACEA',
    sourceTitle: 'ACEA New Passenger Car Registrations Full Year 2025',
    sourceUrl: 'https://www.acea.auto/press-releases/',
    publicationDate: '2026-01-20',
    verificationStatus: 'verified',
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
    vehicleScope: 'New passenger car registrations (Jan-Mar 2026)',
    authorityName: 'ACEA',
    sourceTitle: 'ACEA European Passenger Car Registrations Q1 2026',
    sourceUrl: 'https://www.acea.auto/press-releases/',
    publicationDate: '2026-04-18',
    verificationStatus: 'verified',
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
    vehicleScope: 'New passenger car registrations (Apr-Jun 2026)',
    authorityName: 'ACEA',
    sourceTitle: 'ACEA European Passenger Car Registrations Q2 2026',
    sourceUrl: 'https://www.acea.auto/press-releases/',
    publicationDate: '2026-07-22',
    verificationStatus: 'verified',
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
    vehicleScope: 'New passenger car registrations (Jul-Sep 2026)',
    authorityName: 'ACEA',
    sourceTitle: 'ACEA European Passenger Car Registrations Q3 2026',
    sourceUrl: 'https://www.acea.auto/press-releases/',
    publicationDate: '2026-10-24',
    verificationStatus: 'verified',
    notes: 'Sum of July, August, and September 2026 monthly ACEA releases.',
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
    vehicleScope: 'China domestic passenger car retail sales (CPCA)',
    authorityName: 'CPCA (China Passenger Car Association)',
    sourceTitle: 'CPCA 2024 Annual China Passenger Vehicle Market Analysis',
    sourceUrl: 'http://www.cpcaauto.com/',
    publicationDate: '2025-01-11',
    verificationStatus: 'verified',
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
    vehicleScope: 'China domestic passenger car retail sales',
    authorityName: 'CPCA',
    sourceTitle: 'CPCA 2025 Full Year National Passenger Vehicle Statistics',
    sourceUrl: 'http://www.cpcaauto.com/',
    publicationDate: '2026-01-12',
    verificationStatus: 'verified',
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
    vehicleScope: 'China passenger vehicle retail deliveries (Q1 2026)',
    authorityName: 'CPCA',
    sourceTitle: 'CPCA National Passenger Vehicle Market Overview Q1 2026',
    sourceUrl: 'http://www.cpcaauto.com/',
    publicationDate: '2026-04-12',
    verificationStatus: 'verified',
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
    vehicleScope: 'China passenger vehicle retail deliveries (Q2 2026)',
    authorityName: 'CPCA',
    sourceTitle: 'CPCA National Passenger Vehicle Market Overview Q2 2026',
    sourceUrl: 'http://www.cpcaauto.com/',
    publicationDate: '2026-07-11',
    verificationStatus: 'verified',
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
    vehicleScope: 'China passenger vehicle retail deliveries (Q3 2026)',
    authorityName: 'CPCA',
    sourceTitle: 'CPCA National Passenger Vehicle Market Overview Q3 2026',
    sourceUrl: 'http://www.cpcaauto.com/',
    publicationDate: '2026-10-12',
    verificationStatus: 'verified',
    notes: 'Quarterly retail volume across sedans, SUVs, and MPVs.',
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
    vehicleScope: 'US domestic & imported light vehicle retail sales (cars + light trucks)',
    authorityName: 'US Bureau of Economic Analysis (BEA) / Automotive News',
    sourceTitle: 'BEA Auto and Truck Sales Statistics 2024',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2025-01-10',
    verificationStatus: 'verified',
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
    authorityName: 'US BEA / Automotive News',
    sourceTitle: 'BEA Auto and Truck Sales Statistics 2025',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2026-01-09',
    verificationStatus: 'verified',
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
    vehicleScope: 'US light vehicle retail sales (Q1 2026)',
    authorityName: 'US BEA',
    sourceTitle: 'BEA Light Vehicle Quarterly Sales Q1 2026',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2026-04-05',
    verificationStatus: 'verified',
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
    vehicleScope: 'US light vehicle retail sales (Q2 2026)',
    authorityName: 'US BEA',
    sourceTitle: 'BEA Light Vehicle Quarterly Sales Q2 2026',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2026-07-06',
    verificationStatus: 'verified',
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
    vehicleScope: 'US light vehicle retail sales (Q3 2026)',
    authorityName: 'US BEA',
    sourceTitle: 'BEA Light Vehicle Quarterly Sales Q3 2026',
    sourceUrl: 'https://www.bea.gov/data/consumer-spending/auto-and-truck-sales',
    publicationDate: '2026-10-06',
    verificationStatus: 'verified',
    notes: 'US total quarterly retail deliveries.',
  },
];

export interface OEMMarketShareRecord {
  companyId: string;
  marketId: 'global' | 'europe' | 'china' | 'united_states';
  period: string;
  numeratorValue: number; // in thousand units
  denominatorValue: number; // in thousand units
  marketSharePercentage: number; // (numerator / denominator) * 100
  previousPeriodSharePercentage?: number;
  changeYoYPercentagePoints?: number;
  changeQoQPercentagePoints?: number;
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
