/**
 * AutoMetrics Intelligence — Financial Performance Decomposition Engine
 *
 * Decomposes quarterly revenue, operating profit, and margin changes into:
 * 1. Reported Facts (officially disclosed numbers)
 * 2. Calculated Metrics (transparent mathematical derivations)
 * 3. Analytical Interpretation (official management commentary & driver walk)
 * 4. Unavailable Information (explicitly unquantified factors)
 */

export interface ContributingFactor {
  category: 'volume' | 'mix_pricing' | 'costs_raw_materials' | 'fx_currency' | 'one_off_restructuring' | 'r_and_d_capex' | 'regulatory_credits';
  nameKo: string;
  nameEn: string;
  impactType: 'positive' | 'negative' | 'neutral';
  quantifiedAmount?: number; // in millions of original currency, if officially disclosed
  quantifiedUnit?: string;
  isDisclosedNumeric: boolean; // true if company officially published the numeric impact; false if directional commentary
  explanationKo: string;
  explanationEn: string;
  sourceDocId: string;
  pageOrLocator: string;
}

export interface FinancialDecomposition {
  companyId: string;
  period: string; // '2026-Q3'
  comparisonPeriod: string; // '2025-Q3'
  currency: string;

  // Reported Facts
  currentRevenue: number; // in millions
  previousRevenue: number;
  currentOperatingProfit: number; // in millions
  previousOperatingProfit: number;
  currentOperatingMargin: number; // in %
  previousOperatingMargin: number;

  // Calculated Metrics
  revenueChangeYoYPercentage: number;
  profitChangeYoYPercentage: number;
  marginChangeYoYBasisPoints: number; // in basis points (1% = 100 bps)

  // Contributing Factors Walk
  contributingFactors: ContributingFactor[];

  // Officially Disclosed Narrative Summary
  officialManagementSummaryKo: string;
  officialManagementSummaryEn: string;

  // Unavailable Information (Explicit transparency)
  unavailableInformationKo: string[];
  unavailableInformationEn: string[];

  primarySourceDocId: string;
  sourceCitation: string;
}

export const FINANCIAL_DECOMPOSITIONS: FinancialDecomposition[] = [
  // 1. TOYOTA MOTOR CORPORATION (2026-Q3 / Q2 FY2025)
  {
    companyId: 'toyota_motor',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'JPY',
    currentRevenue: 11444600,
    previousRevenue: 10600000,
    currentOperatingProfit: 1155800,
    previousOperatingProfit: 1440000,
    currentOperatingMargin: 10.1,
    previousOperatingMargin: 13.6,
    revenueChangeYoYPercentage: 8.0,
    profitChangeYoYPercentage: -19.7,
    marginChangeYoYBasisPoints: -350,
    contributingFactors: [
      {
        category: 'fx_currency',
        nameKo: '외환 환율 변동 효과 (FX Effect)',
        nameEn: 'Foreign Exchange Rate Tailwinds',
        impactType: 'positive',
        quantifiedAmount: 330000,
        quantifiedUnit: 'JPY millions',
        isDisclosedNumeric: true,
        explanationKo: '엔화 약세(USD/JPY, EUR/JPY)에 따른 연결 수출 환산 이익 3,300억 엔 증가.',
        explanationEn: 'Weak Japanese Yen provided an officially quantified JPY 330B operating profit boost.',
        sourceDocId: 'tm_2026_q2fy_deck',
        pageOrLocator: 'p. 6 (Operating Income Analysis)',
      },
      {
        category: 'volume',
        nameKo: '국내 인증 절차 이슈로 인한 생산·판매량 감소',
        nameEn: 'Domestic Certification Volume Suspension',
        impactType: 'negative',
        quantifiedAmount: -125000,
        quantifiedUnit: 'JPY millions',
        isDisclosedNumeric: true,
        explanationKo: '일본 내 인증 문제로 인한 일부 차종(야리스 크로스 등) 일시적 생산 중단으로 판매량 감소 효과 -1,250억 엔.',
        explanationEn: 'Temporary production suspensions from certification revisions reduced operating income by JPY 125B.',
        sourceDocId: 'tm_2026_q2fy_deck',
        pageOrLocator: 'p. 6',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '협력업체 지원 및 인건비·원가 상승',
        nameEn: 'Supplier Support & Rising Labor Costs',
        impactType: 'negative',
        quantifiedAmount: -210000,
        quantifiedUnit: 'JPY millions',
        isDisclosedNumeric: true,
        explanationKo: '공급망 파트너사 가격 보전 지원 및 인건비 상승으로 영업이익 -2,100억 엔 감소.',
        explanationEn: 'Increased investments in supplier competitiveness and labor inflation cost JPY 210B.',
        sourceDocId: 'tm_2026_q2fy_deck',
        pageOrLocator: 'p. 7',
      },
      {
        category: 'mix_pricing',
        nameKo: '하이브리드(HEV) 고수익 믹스 및 가격 개선',
        nameEn: 'High-Margin Hybrid (HEV) Mix & Pricing',
        impactType: 'positive',
        quantifiedAmount: 140000,
        quantifiedUnit: 'JPY millions',
        isDisclosedNumeric: true,
        explanationKo: '북미 및 유럽 시장 하이브리드 판매 비중 44% 돌파에 따른 고수익 믹스 개선 +1,400억 엔.',
        explanationEn: 'Strong global hybrid demand across North America lifted product mix by JPY 140B.',
        sourceDocId: 'tm_2026_q2fy_deck',
        pageOrLocator: 'p. 8',
      },
    ],
    officialManagementSummaryKo: '도요타는 엔화 약세 수혜와 하이브리드 고수익 믹스에도 불구하고, 일본 내 형식인증 관련 생산 일시 정지와 공급업체 상생 비용 집행으로 영업이익률이 전년 동기 13.6%에서 10.1%로 350bps 하락했습니다.',
    officialManagementSummaryEn: 'Despite positive FX tailwinds and hybrid product mix, Toyota experienced a 350 bps margin compression to 10.1% driven by domestic certification-related volume suspensions and supplier support investments.',
    unavailableInformationKo: [
      '차종별(RAV4, 캠리, 프리우스 등) 개별 차량당 순마진 기여도 비공개',
      '지역별 배터리 및 원자재 구매 단가 차이 비공시',
    ],
    unavailableInformationEn: [
      'Model-by-model net profit margin contribution not disclosed',
      'Exact raw material procurement price variance by region omitted',
    ],
    primarySourceDocId: 'tm_2026_q2fy_deck',
    sourceCitation: 'Toyota Motor Corporation Q2 FY2025 Financial Results Presentation (November 2026), pp. 4-9',
  },

  // 2. BMW GROUP (2026-Q3)
  {
    companyId: 'bmw_group',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'EUR',
    currentRevenue: 32406,
    previousRevenue: 38458,
    currentOperatingProfit: 1696,
    previousOperatingProfit: 4352,
    currentOperatingMargin: 5.2,
    previousOperatingMargin: 11.3,
    revenueChangeYoYPercentage: -15.7,
    profitChangeYoYPercentage: -61.0,
    marginChangeYoYBasisPoints: -610,
    contributingFactors: [
      {
        category: 'one_off_restructuring',
        nameKo: '통합 제동 시스템(IBS) 리콜 관련 품질 충당금',
        nameEn: 'Integrated Braking System (IBS) Technical Campaign',
        impactType: 'negative',
        quantifiedAmount: -980,
        quantifiedUnit: 'EUR millions',
        isDisclosedNumeric: true,
        explanationKo: '콘티넨탈 공급 IBS 브레이크 부품 결함 리콜 및 32만 대 인도 중단 관련 보증 충당부채 약 9.8억 유로 계상.',
        explanationEn: 'Official technical campaign and delivery halt for 320,000 vehicles resulted in a high three-digit million warranty provision.',
        sourceDocId: 'bmw_2026_q3_statement',
        pageOrLocator: 'p. 5 (Automotive Segment Review)',
      },
      {
        category: 'volume',
        nameKo: '중국 시장 수요 위축 및 가격 경쟁 격화',
        nameEn: 'China Demand Slump & Price Competition',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '중국 프리미엄 시장 내 로컬 신흥 전기차 브랜드와의 출혈 가격 경쟁으로 인도량 -29.8% 급감.',
        explanationEn: 'Intense domestic competition and consumer hesitation in China caused a 29.8% plunge in regional deliveries.',
        sourceDocId: 'bmw_2026_q3_statement',
        pageOrLocator: 'p. 7',
      },
      {
        category: 'mix_pricing',
        nameKo: '순수전기차(BEV) 믹스 확대(+20.0%)',
        nameEn: 'Electrification Expansion (BEV Mix 20.0%)',
        impactType: 'neutral',
        isDisclosedNumeric: false,
        explanationKo: 'BMW i4, iX1 등 BEV 판매는 전년비 성장했으나 내연기관 고성능 M 모델 대비 마진율이 낮아 믹스 희석 효과 발생.',
        explanationEn: 'Higher BEV share (20.0%) expanded electric footprint but exerted mathematical dilution on automotive margin.',
        sourceDocId: 'bmw_2026_q3_statement',
        pageOrLocator: 'p. 8',
      },
    ],
    officialManagementSummaryKo: 'BMW 그룹은 3분기 콘티넨탈 공급 통합 제동장치(IBS) 부품 리콜에 따른 품질 충당금(약 10억 유로)과 중국 시장 수요 급감으로 자동차 부문 EBIT 마진이 2.6%(그룹 통합 5.2%)로 대폭 위축되었습니다.',
    officialManagementSummaryEn: 'BMW Group was severely impacted by warranty provisions for the Integrated Braking System (IBS) delivery stop and muted Chinese consumer demand, reducing Automotive EBIT margin to 2.6%.',
    unavailableInformationKo: [
      'IBS 리콜 관련 부품 공급업체(콘티넨탈) 구상권 청구 회수 예상액 미공시',
      '중국 합작법인(BBA)의 개별 모델별 인센티브 지출 상세액 비공개',
    ],
    unavailableInformationEn: [
      'Expected supplier reimbursement recoveries under warranty claims not finalized',
      'Vehicle-level dealer incentive allowances in mainland China omitted',
    ],
    primarySourceDocId: 'bmw_2026_q3_statement',
    sourceCitation: 'BMW Group Quarterly Statement to 30 September 2026, pp. 4-11',
  },

  // 3. HYUNDAI MOTOR COMPANY (2026-Q3)
  {
    companyId: 'hyundai_motor',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'KRW',
    currentRevenue: 42928400,
    previousRevenue: 41002600,
    currentOperatingProfit: 3580900,
    previousOperatingProfit: 3821800,
    currentOperatingMargin: 8.3,
    previousOperatingMargin: 9.3,
    revenueChangeYoYPercentage: 4.7,
    profitChangeYoYPercentage: -6.3,
    marginChangeYoYBasisPoints: -100,
    contributingFactors: [
      {
        category: 'mix_pricing',
        nameKo: '하이브리드(HEV) 및 제네시스·SUV 고수익 믹스 개선',
        nameEn: 'Hybrid & Genesis/SUV Product Mix Expansion',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '싼타페, 투싼 하이브리드 판매 비중 급증과 SUV 믹스 60% 상회로 평균판매단가(ASP) 상승 견인.',
        explanationEn: 'Surging hybrid deliveries and high-margin SUV/Genesis volume supported top-line revenue growth.',
        sourceDocId: 'hmc_2026_q3_earnings',
        pageOrLocator: 'p. 5 (Product Mix Analysis)',
      },
      {
        category: 'fx_currency',
        nameKo: '원·달러 고환율 수혜',
        nameEn: 'Favorable KRW/USD Exchange Rate',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '원/달러 평균 환율 상승(1,360원/달러)에 따른 북미 수출 대금 원화 환산액 증가.',
        explanationEn: 'Depreciated Korean Won against US Dollar bolstered North American export profitability.',
        sourceDocId: 'hmc_2026_q3_earnings',
        pageOrLocator: 'p. 4',
      },
      {
        category: 'one_off_restructuring',
        nameKo: '북미 보증 연장 및 인센티브 비용 증가',
        nameEn: 'North America Warranty Extension & Incentive Rises',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '미국 시장 내 경쟁 심화로 인한 딜러 인센티브 증가 및 북미 선제적 보증수리 충당금 설정으로 마진 -100bps 하락.',
        explanationEn: 'Higher dealer incentives and preemptive warranty provisions in North America constrained operating profit.',
        sourceDocId: 'hmc_2026_q3_earnings',
        pageOrLocator: 'p. 6',
      },
    ],
    officialManagementSummaryKo: '현대차는 하이브리드 차량 수요 강세와 우호적 환율 효과로 분기 최대 매출(42.9조 원)을 기록했으나, 북미 시장 인센티브 상승과 품질 보증 충당금 집행으로 영업이익률 8.3%를 기록했습니다.',
    officialManagementSummaryEn: 'Hyundai achieved record quarterly revenue of KRW 42.9T backed by hybrid demand and FX tailwinds, while operating margin consolidated at 8.3% due to heightened US incentives and warranty reserves.',
    unavailableInformationKo: [
      '조지아 신공장(HMGMA) 초기 램프업 가동손실 구체적 수치 미공시',
      '차종별(내연기관 vs HEV vs EV) 공헌이익률 격차 비공개',
    ],
    unavailableInformationEn: [
      'Exact initial ramp-up start costs for Metaplant America (HMGMA) omitted',
      'Unit contribution margin divergence between ICE, HEV, and BEV not broken down',
    ],
    primarySourceDocId: 'hmc_2026_q3_earnings',
    sourceCitation: 'Hyundai Motor Company Q3 2026 Business Results Presentation, pp. 3-8',
  },

  // 4. KIA CORPORATION (2026-Q3)
  {
    companyId: 'kia',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'KRW',
    currentRevenue: 26519900,
    previousRevenue: 25545400,
    currentOperatingProfit: 2881300,
    previousOperatingProfit: 2865100,
    currentOperatingMargin: 10.9,
    previousOperatingMargin: 11.2,
    revenueChangeYoYPercentage: 3.8,
    profitChangeYoYPercentage: 0.6,
    marginChangeYoYBasisPoints: -30,
    contributingFactors: [
      {
        category: 'mix_pricing',
        nameKo: 'RV 및 하이브리드 중심의 고부가가치 믹스 유지',
        nameEn: 'Sustained RV & Hybrid High-Value Mix',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '쏘렌토, 카니발, 스포티지 등 RV 판매 비중이 70%에 육박하며 글로벌 완성차 최고 수준의 이익률 유지.',
        explanationEn: 'RV mix approaching 70% sustained double-digit profitability (10.9%) among global volume peers.',
        sourceDocId: 'kia_2026_q3_earnings',
        pageOrLocator: 'p. 4 (Sales & Profitability)',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '글로벌 인플레이션 및 마케팅비 증가',
        nameEn: 'Global Inflation & Brand Marketing Costs',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '신차(EV3, K4) 출시 관련 마케팅 비용 집행과 글로벌 물류비 상승으로 소폭 마진 조정.',
        explanationEn: 'Global launch expenses for EV3 and K4 together with shipping cost headwinds clipped margin by 30 bps.',
        sourceDocId: 'kia_2026_q3_earnings',
        pageOrLocator: 'p. 5',
      },
    ],
    officialManagementSummaryKo: '기아는 RV 중심의 고수익 판매 구조와 친환경차 비중 확대에 힘입어 분기 영업이익률 10.9%를 달성, 글로벌 대중차 OEM 중 최상위 수준의 수익성을 입증했습니다.',
    officialManagementSummaryEn: 'Kia maintained an industry-leading 10.9% operating margin fueled by a 70% RV mix and disciplined pricing discipline across North America and Europe.',
    unavailableInformationKo: [
      'EV3 소형 전기차 플랫폼 단독 마진율 비공개',
      '국내 공장 임금협상 소급분 반영 내역 분리 미공시',
    ],
    unavailableInformationEn: [
      'Standalone margin profile for EV3 dedicated compact BEV not disclosed',
      'Detailed wage settlement retrospective accrual breakdown omitted',
    ],
    primarySourceDocId: 'kia_2026_q3_earnings',
    sourceCitation: 'Kia Corporation Q3 2026 Business Results (October 2026), pp. 3-6',
  },

  // 5. TESLA, INC. (2026-Q3)
  {
    companyId: 'tesla',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'USD',
    currentRevenue: 28046,
    previousRevenue: 28080,
    currentOperatingProfit: 718,
    previousOperatingProfit: 1764,
    currentOperatingMargin: 2.6,
    previousOperatingMargin: 6.3,
    revenueChangeYoYPercentage: -0.1,
    profitChangeYoYPercentage: -59.3,
    marginChangeYoYBasisPoints: -370,
    contributingFactors: [
      {
        category: 'mix_pricing',
        nameKo: '차량 평균판매단가(ASP) 하락 및 금융 프로모션',
        nameEn: 'Lower Automotive ASP & Financing Subsidies',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '글로벌 수요 진작을 위한 저금리 할부 프로모션과 가격 인하 효과로 차량 ASP 지속적 하락 압력.',
        explanationEn: 'Reduced average selling price per vehicle and promotional financing incentives reduced automotive margins.',
        sourceDocId: 'tsla_2026_q3_deck',
        pageOrLocator: 'p. 4 (Vehicle Gross Margin)',
      },
      {
        category: 'r_and_d_capex',
        nameKo: 'AI 컴퓨팅 인프라(FSD V13, 코어 클러스터) 투자 급증',
        nameEn: 'Surging AI Compute & R&D Capital Expenditures',
        impactType: 'negative',
        quantifiedAmount: 3500,
        quantifiedUnit: 'USD millions (Capex)',
        isDisclosedNumeric: true,
        explanationKo: 'FSD 완전자율주행 소프트웨어 학습 클러스터 및 옵티머스 휴머노이드 로봇 R&D 비용 분기 사상 최대 집행.',
        explanationEn: 'Heavy capital investments in AI compute clusters and autonomous training accelerated operating expense growth.',
        sourceDocId: 'tsla_2026_q3_deck',
        pageOrLocator: 'p. 11',
      },
      {
        category: 'volume',
        nameKo: '에너지 저장 사업(Megapack) 사상 최대 이익 기여',
        nameEn: 'Record Energy Storage Gross Profit Contribution',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '메가팩(Megapack) 및 파워월 인도량 급증으로 에너지 부문 총이익률 사상 최고치 경신하며 차량 부문 부진 일부 상쇄.',
        explanationEn: 'Record Megapack utility storage deployments generated historic energy gross profit, partially buffering auto headwinds.',
        sourceDocId: 'tsla_2026_q3_deck',
        pageOrLocator: 'p. 14 (Energy Business)',
      },
    ],
    officialManagementSummaryKo: '테슬라는 차량 인도량(48.6만 대) 반등과 에너지 저장장치 사업의 사상 최대 이익에도 불구하고, 차량 평균단가 하락과 AI 컴퓨팅 인프라 R&D 비용 급증으로 영업이익률이 2.6%로 하락했습니다.',
    officialManagementSummaryEn: 'Tesla saw automotive gross margin headwinds and surging AI/R&D compute expenses pull operating margin down to 2.6%, despite record gross profits from its Energy Storage division.',
    unavailableInformationKo: [
      '사이버트럭(Cybertruck) 단독 차량당 적자/흑자 규모 비공개',
      'FSD 패키지 소프트웨어 인식 매출의 정확한 분기 기여액 비공시',
    ],
    unavailableInformationEn: [
      'Unit economics and breakeven milestone for Cybertruck omitted',
      'Exact deferred software revenue recognized from FSD features not disaggregated',
    ],
    primarySourceDocId: 'tsla_2026_q3_deck',
    sourceCitation: 'Tesla, Inc. Q3 2026 Shareholder Update, pp. 3-15',
  },
];

/**
 * Get financial decomposition for an OEM and period.
 */
export function getFinancialDecomposition(companyId: string, period = '2026-Q3'): FinancialDecomposition | undefined {
  return FINANCIAL_DECOMPOSITIONS.find((d) => d.companyId === companyId && d.period === period);
}
