import { GuidanceObservation } from '../types/metrics';

export const GUIDANCE_OBSERVATIONS: GuidanceObservation[] = [
  // --- VOLKSWAGEN GROUP ---
  {
    id: 'vw_2025_margin_guidance',
    companyId: 'volkswagen_group',
    metricId: 'guidance_operating_margin',
    reportingYear: 2025,
    originalText: 'Volkswagen Group expects an operating return on sales in the range of 5.5% to 6.5% for fiscal year 2025.',
    min: 5.5,
    max: 6.5,
    midpoint: 6.0,
    unit: 'percentage',
    status: 'initial',
    publicationDate: '2025-03-11',
    sourceDocId: 'vw_2024_fy_statement',
    pageNumber: 5,
    assumptions: [
      'Moderate global economic growth with continuing competitive pressure in China.',
      'Ramp-up of new modular electric MEB+ and PPE platform vehicles.',
      'Execution of performance programs and overhead cost reduction in European plants.',
    ],
    riskNotes: 'Supply chain headwinds, EU CO2 emissions penalties, geopolitical trade tariffs.',
  },
  {
    id: 'vw_2025_sales_guidance',
    companyId: 'volkswagen_group',
    metricId: 'guidance_deliveries',
    reportingYear: 2025,
    originalText: 'Deliveries to customers are expected to be slightly above the prior-year level (around 9.0 to 9.3 million vehicles).',
    min: 9000,
    max: 9300,
    midpoint: 9150,
    unit: 'thousand_units',
    status: 'initial',
    publicationDate: '2025-03-11',
    sourceDocId: 'vw_2024_fy_statement',
    pageNumber: 5,
  },

  // --- BMW GROUP ---
  {
    id: 'bmw_2025_margin_guidance',
    companyId: 'bmw_group',
    metricId: 'guidance_operating_margin',
    reportingYear: 2025,
    originalText: 'EBIT margin in the Automotive Segment is forecast to be within the target corridor of 6.0% to 8.0%.',
    min: 6.0,
    max: 8.0,
    midpoint: 7.0,
    unit: 'percentage',
    status: 'initial',
    publicationDate: '2025-03-14',
    sourceDocId: 'bmw_2024_fy_statement',
    assumptions: [
      'Normalizing supply conditions following the integrated braking system (IBS) component campaign in 2024.',
      'Preparation for Neue Klasse global launch in Debrecen and Munich.',
    ],
    riskNotes: 'Demand softening in key Asian luxury markets; raw material and battery mineral volatility.',
  },

  // --- MERCEDES-BENZ GROUP ---
  {
    id: 'mbg_2025_margin_guidance',
    companyId: 'mercedes_benz',
    metricId: 'guidance_operating_margin',
    reportingYear: 2025,
    originalText: 'Mercedes-Benz Cars expects an adjusted Return on Sales (RoS) between 7.0% and 9.0% for the full year 2025.',
    min: 7.0,
    max: 9.0,
    midpoint: 8.0,
    unit: 'percentage',
    status: 'initial',
    publicationDate: '2025-02-20',
    sourceDocId: 'mbg_2024_fy_results',
    assumptions: [
      'Strong product offensive including the all-new CLA on MMA architecture.',
      'Defending pricing power in Top-End Luxury (Maybach, AMG, G-Class).',
    ],
    riskNotes: 'Price competition in the premium BEV segment in China; EU regulatory compliance costs.',
  },

  // --- STELLANTIS ---
  {
    id: 'stla_2025_margin_guidance',
    companyId: 'stellantis',
    metricId: 'guidance_operating_margin',
    reportingYear: 2025,
    originalText: 'Stellantis targets an Adjusted Operating Income (AOI) margin of 6.0% to 8.0% and positive industrial free cash flow in 2025.',
    min: 6.0,
    max: 8.0,
    midpoint: 7.0,
    unit: 'percentage',
    status: 'initial',
    publicationDate: '2025-02-27',
    sourceDocId: 'stla_2024_fy_results',
    assumptions: [
      'Successful dealer inventory reduction in North America.',
      'Launch of multi-energy STLA Medium and STLA Large platforms.',
    ],
    riskNotes: 'US dealer inventory rebalancing; labor negotiations and plant capacity adjustments.',
  },

  // --- GENERAL MOTORS ---
  {
    id: 'gm_2025_ebit_guidance',
    companyId: 'general_motors',
    metricId: 'guidance_operating_margin',
    reportingYear: 2025,
    originalText: 'GM expects 2025 Adjusted EBIT of $13.5B to $15.5B, implying a steady operating margin around 7.2% to 8.0%.',
    min: 7.2,
    max: 8.0,
    midpoint: 7.6,
    unit: 'percentage',
    status: 'initial',
    publicationDate: '2025-01-28',
    sourceDocId: 'gm_2024_fy_earnings',
    assumptions: [
      'Resilient demand for full-size ICE pickups and SUVs.',
      'Positive variable profit on Ultium EV portfolio in 2025.',
    ],
    riskNotes: 'Macro interest rates, EV adoption pacing, Cruise robotaxi regulatory approvals.',
  },

  // --- HYUNDAI MOTOR ---
  {
    id: 'hmc_2025_margin_guidance',
    companyId: 'hyundai_motor',
    metricId: 'guidance_operating_margin',
    reportingYear: 2025,
    originalText: 'Hyundai Motor targets consolidated operating profit margin of 7.0% to 8.0% and wholesale volume target of 4.2 million units in 2025.',
    min: 7.0,
    max: 8.0,
    midpoint: 7.5,
    unit: 'percentage',
    status: 'initial',
    publicationDate: '2025-01-23',
    sourceDocId: 'hmc_2024_fy_presentation',
    pageNumber: 21,
    assumptions: [
      'Expansion of hybrid (HEV) powertrain lineups in response to consumer demand.',
      'Commercial operation of Hyundai Motor Group Metaplant America (HMGMA) in Georgia.',
    ],
    riskNotes: 'US IRA subsidy eligibility shifts and global currency exchange rate fluctuations.',
  },
];

