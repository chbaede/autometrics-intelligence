/**
 * AutoMetrics Intelligence — Financial Performance Decomposition Engine
 *
 * Decomposes quarterly revenue, operating profit, and margin changes into:
 * 1. Reported Facts (officially disclosed numbers from primary IR filings)
 * 2. Calculated Metrics (transparent mathematical derivations)
 * 3. Analytical Interpretation (official management commentary & driver walk)
 * 4. Unavailable Information (explicitly unquantified factors withheld by management)
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
  reportingScope: 'consolidated_group' | 'cars_segment' | 'automotive_segment';
  periodClassification: 'standalone_quarter' | 'derived_quarter' | 'cumulative_half_year';
  derivationFormula?: string;
  segmentReportingNotesKo?: string;
  segmentReportingNotesEn?: string;
  automotiveSegmentMetrics?: {
    revenue: number;
    operatingProfit: number;
    operatingMargin: number;
    freeCashFlow?: number;
    previousRevenue?: number;
    previousOperatingProfit?: number;
    previousOperatingMargin?: number;
    revenueChangeYoYPercentage?: number;
    profitChangeYoYPercentage?: number;
    marginChangeYoYBasisPoints?: number;
  };
  groupEbt?: number;
  groupEbtMargin?: number;

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
  // ==========================================
  // 1. TOYOTA MOTOR CORPORATION (2026-Q3 / Q2 FY2027)
  // ==========================================
  {
    companyId: 'toyota_motor',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'JPY',
    reportingScope: 'consolidated_group',
    periodClassification: 'derived_quarter',
    derivationFormula:
      'Standalone Q2 FY2027 (Jul 1 - Sep 30, 2026) = H1 FY2027 cumulative (Apr-Sep 2026: Rev ¥26,962,406M, EBIT ¥2,191,099M) minus Q1 FY2027 (Apr-Jun 2026: Rev ¥13,525,344M, EBIT ¥1,063,448M) = Rev ¥13,437,062M, EBIT ¥1,127,651M. Standalone Q2 FY2026 (Jul 1 - Sep 30, 2025) = H1 FY2026 cumulative (Rev ¥24,286,851M, EBIT ¥2,464,228M) minus Q1 FY2026 (Rev ¥11,909,424M, EBIT ¥1,624,677M) = Rev ¥12,377,427M, EBIT ¥839,551M.',
    segmentReportingNotesKo:
      '도요타자동차는 3월 결산 법인으로 2026년 7~9월은 FY2027 회계연도 2분기(Q2 FY2027)에 해당합니다. 일본 결산단신(Kessan Tanshin) 상 6개월 누적 실적에서 1분기 실적을 차감하여 당기 및 전기 단독 3개월 실적(Q2 FY2027: 매출 13.44조 엔, EBIT 1.13조 엔, 마진 8.39% vs Q2 FY2026: 매출 12.38조 엔, EBIT 8,396억 엔, 마진 6.78%)을 정확히 도출했습니다. (기존 오기재되었던 12.6% 마진 및 마진 압축은 잘못된 누적 수치 대조에 기인한 오류로 완전 정정되었습니다.)',
    segmentReportingNotesEn:
      'Toyota Motor Corp follows an April-March fiscal calendar; July-September 2026 corresponds to Q2 FY2027. Under Japanese Tanshin reporting, standalone 3-month performance for both current and prior periods is derived by deducting Q1 from 6-month cumulative totals (Q2 FY2027: Rev ¥13,437.1B, EBIT ¥1,127.7B, margin 8.39% vs Q2 FY2026: Rev ¥12,377.4B, EBIT ¥839.6B, margin 6.78%).',
    currentRevenue: 13437062,
    previousRevenue: 12377427,
    currentOperatingProfit: 1127651,
    previousOperatingProfit: 839551,
    currentOperatingMargin: 8.39,
    previousOperatingMargin: 6.78,
    revenueChangeYoYPercentage: 8.6,
    profitChangeYoYPercentage: 34.3,
    marginChangeYoYBasisPoints: 161,
    contributingFactors: [
      {
        category: 'fx_currency',
        nameKo: '[파생 산출] 외환 환율 변동 효과 (FX Effect - Derived)',
        nameEn: '[Derived] Foreign Exchange Rate Tailwinds',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '엔화 약세(USD/JPY 153엔, EUR/JPY 167엔) 수혜가 발생함. (도요타 공식 IR 요인 분해표는 6개월 누적 기준만 공개되며, 단독 2분기 수치는 누적 차감 파생치로 관리)',
        explanationEn: 'Favorable foreign exchange movements supported profitability. (Toyota discloses factor walks on a cumulative basis; quarterly amounts are derived by period subtraction).',
        sourceDocId: 'tm_2026_q3_tanshin',
        pageOrLocator: 'p. 6 (Operating Income Analysis - Derived from H1 minus Q1)',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '[파생 산출] 공급업체 인건비·원가 보전 지원 및 자재비 상승 (Derived)',
        nameEn: '[Derived] Supplier Support & Cost Inflation',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '공급망 파트너사 가격 보전 지원 및 자재비 상승으로 수익성 일부 차감 요인 발생 (단독 분기 브릿지는 파생 산출치).',
        explanationEn: 'Supplier support initiatives and cost inflation exerted downward pressure (derived standalone bridge).',
        sourceDocId: 'tm_2026_q3_tanshin',
        pageOrLocator: 'p. 6 (Derived from H1 minus Q1)',
      },
      {
        category: 'volume',
        nameKo: '[파생 산출] 국내외 출하 및 생산량 변동 (Derived)',
        nameEn: '[Derived] Volume & Operational Recovery',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '일본 인증 관련 생산 재개 및 글로벌 출하 회복으로 단독 분기 영업이익 전년 동기 대비 +34.3% 성장 견인.',
        explanationEn: 'Resumed production in Japan and resilient global deliveries drove a 34.3% YoY expansion in standalone operating profit.',
        sourceDocId: 'tm_2026_q3_tanshin',
        pageOrLocator: 'p. 6 (Derived from H1 minus Q1)',
      },
      {
        category: 'mix_pricing',
        nameKo: '[파생 산출] 글로벌 하이브리드(HEV) 고수익 믹스 개선 (Derived)',
        nameEn: '[Derived] Global Hybrid (HEV) Product Mix Expansion',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '북미 및 유럽 시장 하이브리드 판매 비중 급증에 따른 고수익 믹스 및 가격 개선 효과 지속.',
        explanationEn: 'Strong global hybrid demand across North America and Europe lifted product mix and pricing realization.',
        sourceDocId: 'tm_2026_q3_tanshin',
        pageOrLocator: 'p. 6 (Derived from H1 minus Q1)',
      },
    ],
    officialManagementSummaryKo:
      '도요타의 단독 2분기(2026년 7~9월) 연결 매출은 전년 동기(12.38조 엔) 대비 8.6% 증가한 13.44조 엔, 단독 영업이익은 전년 동기(8,396억 엔) 대비 34.3% 증가한 1조 1,277억 엔을 기록하였으며, 영업이익률은 6.78%에서 8.39%로 161bps 개선되었습니다. (기존 오기재되었던 12.6% 마진 및 마진 압축은 전년 동기 단독 실적이 아닌 잘못된 누적 수치 대조에 기인한 오류로 확인되어 공식 단독 분기 기준으로 전면 정정되었습니다.)',
    officialManagementSummaryEn:
      'Toyota standalone Q2 (July-September 2026) consolidated revenue rose 8.6% YoY to JPY 13,437.1B (vs JPY 12,377.4B in Q2 FY2026), and standalone operating income expanded 34.3% YoY to JPY 1,127.7B (vs JPY 839.6B), with operating margin improving by 161 bps from 6.78% to 8.39%. (Prior figures citing 12.6% previous margin and margin compression were erroneous comparisons against unadjusted cumulative data, now fully corrected to standalone quarters).',
    unavailableInformationKo: [
      '토요타 IR 공식 요인 분해표(슬라이드 6)는 상반기 6개월 누적 기준만 제공되며, 단독 2분기(3개월) 요인별 독립 수량적 증감액은 공식 미공개 (파생치로 관리)',
      '차종별(RAV4, 캠리, 프리우스 등) 개별 차량당 순마진 기여도 비공개',
      '지역별 배터리 및 원자재 구매 단가 차이 비공시',
    ],
    unavailableInformationEn: [
      'Toyota IR factor walk (Slide 6) is disclosed strictly for the 6-month cumulative first half; standalone Q2 (3-month) independent factor bridge is withheld (maintained as derived)',
      'Model-by-model net profit margin contribution not disclosed',
      'Exact raw material procurement price variance by region omitted',
    ],
    primarySourceDocId: 'tm_2026_q3_tanshin',
    sourceCitation: 'Toyota Motor Corporation Financial Results for Q2 FY2027 (ended September 30, 2026), pp. 1-6',
  },

  // ==========================================
  // 2. BMW GROUP (2026-Q3)
  // ==========================================
  {
    companyId: 'bmw_group',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'EUR',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    groupEbt: 2083,
    groupEbtMargin: 6.8,
    segmentReportingNotesKo:
      'BMW 그룹 보고 단위는 그룹 연결(Group Consolidated)과 자동차 부문(Automotive Segment)으로 엄격히 분리됩니다. 그룹 3분기 실적은 매출 €30,452M(전년동기 €32,314M 대비 -5.8%), EBIT €1,589M(전년동기 €2,261M 대비 -29.7%), EBIT 마진 5.2%(전년동기 7.0% 대비 -180bps), 그룹 세전이익(EBT) €2,083M(EBT 마진 6.8%)입니다. 콘티넨탈 IBS 제동장치 리콜 관련 충당금과 중국 수요 부진(-24.8%)의 직접 영향을 받은 자동차 부문(Automotive Segment) 단독 실적은 매출 €26,669M(전년동기 €28,510M 대비 -6.5%), EBIT €901M(전년동기 €1,494M 대비 -39.7%), EBIT 마진 3.4%(전년동기 5.2% 대비 -180bps), 잉여현금흐름(FCF) €-566M입니다. 그룹 EBT 마진(6.8%)을 EBIT 마진(5.2%)으로 혼동하거나, 자동차 부문 EBIT 마진(3.4%)과 혼재해서는 안 됩니다.',
    segmentReportingNotesEn:
      'BMW Group maintains strict scope separation between Group Consolidated and Automotive Segment accounting perimeters. Group consolidated Q3 results: Revenue €30,452M (-5.8% YoY vs €32,314M), Group EBIT €1,589M (-29.7% YoY vs €2,261M), Group EBIT margin 5.2% (-180 bps vs 7.0%), Group EBT €2,083M, and Group EBT margin 6.8%. The Automotive Segment recorded Revenue €26,669M (-6.5% YoY vs €28,510M), EBIT €901M (-39.7% YoY vs €1,494M), Automotive EBIT margin 3.4% (-180 bps vs 5.2%), and Free Cash Flow of €-566M, affected by China delivery contractions (-24.8%) and IBS campaign provisions. Group EBT margin (6.8%) must not be labeled EBIT margin (5.2%).',
    automotiveSegmentMetrics: {
      revenue: 26669,
      operatingProfit: 901,
      operatingMargin: 3.4,
      freeCashFlow: -566,
      previousRevenue: 28510,
      previousOperatingProfit: 1494,
      previousOperatingMargin: 5.2,
      revenueChangeYoYPercentage: -6.5,
      profitChangeYoYPercentage: -39.7,
      marginChangeYoYBasisPoints: -180,
    },
    currentRevenue: 30452,
    previousRevenue: 32314,
    currentOperatingProfit: 1589,
    previousOperatingProfit: 2261,
    currentOperatingMargin: 5.2,
    previousOperatingMargin: 7.0,
    revenueChangeYoYPercentage: -5.8,
    profitChangeYoYPercentage: -29.7,
    marginChangeYoYBasisPoints: -180,
    contributingFactors: [
      {
        category: 'one_off_restructuring',
        nameKo: '통합 제동 시스템(IBS) 기술 캠페인 및 보증 충당금',
        nameEn: 'Integrated Braking System (IBS) Technical Campaign & Provision',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '콘티넨탈 공급 통합 제동장치(IBS) 결함 및 인도 중단과 관련하여, 과거 공시된 높은 3자리 수 백만 유로(-9.8억 유로 등)의 보증 충당부채 영향이 논의되었으나, 3분기 CFO 실적 설명회에서는 공급업체 정산 등을 포함한 기타 비용 변동(약 +4억 유로)으로 상쇄되었음을 언급하였으며 단독 3분기 순 수량적 영향은 별도 분해 공시되지 않았습니다.',
        explanationEn: 'Regarding the Continental IBS braking system delivery halt, while an earlier ad-hoc provision of high three-digit millions was cited, Q3 CFO commentary noted approximately +€400M in other cost changes partly from supplier settlements; an isolated standalone Q3 net quantified IBS impact was not separately disaggregated in the quarterly bridge.',
        sourceDocId: 'bmw_2026_q3_statement',
        pageOrLocator: 'p. 5 (Automotive Segment Review)',
      },
      {
        category: 'volume',
        nameKo: '중국 시장 수요 위축 및 가격 경쟁 격화 (-24.8%)',
        nameEn: 'China Demand Softness & Price Competition (-24.8%)',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '중국 프리미엄 시장 내 치열한 가격 경쟁 및 수요 위축으로 3분기 중국 인도량이 전년 동기 대비 -24.8% 감소함.',
        explanationEn: 'Intense domestic price competition and soft consumer demand in China led to a 24.8% YoY decline in quarterly regional deliveries.',
        sourceDocId: 'bmw_2026_q3_statement',
        pageOrLocator: 'p. 7',
      },
      {
        category: 'mix_pricing',
        nameKo: '순수전기차(BEV) 믹스 확대(20.0%)에 따른 마진 희석',
        nameEn: 'Electrification Expansion (BEV Mix 20.0%) Margin Dilution',
        impactType: 'neutral',
        isDisclosedNumeric: false,
        explanationKo: 'BMW i4, iX1 등 BEV 판매는 성장(BEV 점유율 20.0%)했으나 내연기관 고성능 M 모델 대비 마진율이 낮아 믹스 희석 효과 발생.',
        explanationEn: 'Higher BEV share (20.0%) expanded electric footprint but exerted mathematical dilution on automotive margin.',
        sourceDocId: 'bmw_2026_q3_statement',
        pageOrLocator: 'p. 8',
      },
    ],
    officialManagementSummaryKo:
      'BMW 그룹의 3분기 연결 실적은 그룹 매출이 전년 동기(€32,314M) 대비 -5.8% 감소한 €30,452M, 그룹 EBIT은 전년 동기(€2,261M) 대비 -29.7% 감소한 €1,589M(EBIT 마진 5.2%, EBT €2,083M, EBT 마진 6.8%)를 기록했습니다. 자동차 부문(Automotive Segment)은 중국 인도량 감소(-24.8%) 및 IBS 리콜 영향으로 매출이 -6.5% 감소한 €26,669M, EBIT은 -39.7% 감소한 €901M(EBIT 마진 3.4%, FCF €-566M)을 기록했습니다.',
    officialManagementSummaryEn:
      'BMW Group consolidated Q3 results recorded revenues down 5.8% YoY to €30,452M (vs €32,314M in Q3 2025) and Group EBIT down 29.7% YoY to €1,589M (Group EBIT margin 5.2%, Group EBT €2,083M, EBT margin 6.8%). The Automotive Segment posted revenue down 6.5% YoY to €26,669M (vs €28,510M) and EBIT down 39.7% YoY to €901M (Automotive EBIT margin 3.4% vs 5.2%, FCF €-566M), affected by China delivery contractions (-24.8%) and IBS campaign adjustments.',
    unavailableInformationKo: [
      'IBS 리콜 관련 부품 공급업체(콘티넨탈) 구상권 청구 회수 예상액 미공시',
      '중국 합작법인(BBA)의 개별 모델별 인센티브 지출 상세액 비공개',
    ],
    unavailableInformationEn: [
      'Expected supplier reimbursement recoveries under warranty claims not finalized',
      'Vehicle-level dealer incentive allowances in mainland China omitted',
    ],
    primarySourceDocId: 'bmw_2026_q3_statement',
    sourceCitation: 'BMW Group Quarterly Statement to 30 September 2026, pp. 2, 5-11',
  },

  // ==========================================
  // 3. VOLKSWAGEN GROUP (2026-Q3)
  // ==========================================
  {
    companyId: 'volkswagen_group',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'EUR',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 75277,
    previousRevenue: 78845,
    currentOperatingProfit: -5860,
    previousOperatingProfit: 4890,
    currentOperatingMargin: -7.8,
    previousOperatingMargin: 6.2,
    revenueChangeYoYPercentage: -4.5,
    profitChangeYoYPercentage: -219.8,
    marginChangeYoYBasisPoints: -1400,
    contributingFactors: [
      {
        category: 'one_off_restructuring',
        nameKo: '아우디 브뤼셀 공장 폐쇄 및 소프트웨어 손상차손',
        nameEn: 'Audi Brussels Restructuring & Software Impairments',
        impactType: 'negative',
        quantifiedAmount: -4900,
        quantifiedUnit: 'EUR millions',
        isDisclosedNumeric: true,
        explanationKo: '아우디 Q8 e-tron 생산 거점인 브뤼셀 공장 구조조정 충당금 및 CARIAD 소프트웨어 플랫폼 감액 등 일회성 손실 약 49억 유로 반영.',
        explanationEn: 'Provisions for closure of the Audi Brussels plant and non-cash software impairments totaled EUR 4.9B.',
        sourceDocId: 'vw_2026_q3_report',
        pageOrLocator: 'p. 6 (Special Items)',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '유럽 내 고정비 부담 및 독일 공장 인건비 상승',
        nameEn: 'Fixed Cost Overhead & German Labor Inflation',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '유럽 생산 거점 가동률 저하로 인한 고정비 흡수율 하락과 단체협약 임금 인상 부담 가중.',
        explanationEn: 'Underutilization of European manufacturing facilities clipped fixed cost absorption.',
        sourceDocId: 'vw_2026_q3_report',
        pageOrLocator: 'p. 7',
      },
      {
        category: 'volume',
        nameKo: '중국 시장 판매량 둔화 및 가격 할인 경쟁',
        nameEn: 'China Volume Contraction & Price Competition',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '중국 현지 합작법인 인도량 감소와 신흥 전기차 브랜드와의 출혈 가격 경쟁 지속.',
        explanationEn: 'Delivery volumes in mainland China declined amid persistent price discounts.',
        sourceDocId: 'vw_2026_q3_report',
        pageOrLocator: 'p. 8',
      },
    ],
    officialManagementSummaryKo:
      '폭스바겐 그룹은 아우디 브뤼셀 공장 폐쇄 관련 구조조정 충당금과 소프트웨어 손상차손(약 49억 유로) 등 비경상 일회성 손실로 인해 3분기 영업손실 -58.6억 유로(영업이익률 -7.8%)를 기록했습니다.',
    officialManagementSummaryEn:
      'Volkswagen Group recorded an operating loss of EUR -5.86B (-7.8% margin) driven by EUR 4.9B in special items related to the planned closure of the Audi Brussels facility and software impairments.',
    unavailableInformationKo: [
      '브랜드별(폭스바겐, 아우디, 포르쉐) 개별 구조조정 세부 분담액 비공개',
      '독일 본사 공장 폐쇄 검토에 따른 잠재 퇴직 위로금 총액 미공시',
    ],
    unavailableInformationEn: [
      'Detailed severance provisions split between CARIAD, Audi, and VW brand omitted',
      'Potential redundancy settlement liabilities for German plant reorganizations not finalized',
    ],
    primarySourceDocId: 'vw_2026_q3_report',
    sourceCitation: 'Volkswagen Group Interim Report January - September 2026, pp. 3, 6-9',
  },

  // ==========================================
  // 4. MERCEDES-BENZ GROUP (2026-Q3)
  // ==========================================
  {
    companyId: 'mercedes_benz',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'EUR',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    segmentReportingNotesKo:
      '메르세데스-벤츠 그룹 연결 영업이익률은 5.8%(매출 €30,698M, EBIT €1,773M)이며, 핵심 사업인 승용차 부문(Mercedes-Benz Cars) 조정 영업이익률(Adjusted RoS)은 4.7%(전년 동기 12.4%)로 하락했습니다.',
    segmentReportingNotesEn:
      'Mercedes-Benz Group consolidated margin is 5.8% (Revenue €30,698M, EBIT €1,773M), while Mercedes-Benz Cars adjusted RoS compressed to 4.7% (vs 12.4% prior year) due to China Top-End contraction.',
    automotiveSegmentMetrics: {
      revenue: 23500,
      operatingProfit: 1105,
      operatingMargin: 4.7,
    },
    currentRevenue: 30698,
    previousRevenue: 37200,
    currentOperatingProfit: 1773,
    previousOperatingProfit: 4840,
    currentOperatingMargin: 5.8,
    previousOperatingMargin: 13.0,
    revenueChangeYoYPercentage: -17.5,
    profitChangeYoYPercentage: -63.4,
    marginChangeYoYBasisPoints: -720,
    contributingFactors: [
      {
        category: 'mix_pricing',
        nameKo: '중국 시장 최고급(Top-End) 럭셔리 판매 급감 및 가격 압박',
        nameEn: 'China Top-End Luxury Volume Slump & Pricing Pressure',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '중국 부동산 및 거시경제 위축으로 마이바흐(Maybach) 및 S-클래스 고수익 모델 인도량이 급감하여 믹스 악화.',
        explanationEn: 'Macroeconomic headwinds in China led to sharp delivery contractions in high-margin Maybach and S-Class models.',
        sourceDocId: 'mbg_2026_q3_results',
        pageOrLocator: 'p. 4 (Cars Segment Results)',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '신차(E-클래스, CLE) 램프업 비용 및 인플레이션',
        nameEn: 'Model Ramp-Up Production Costs & Inflation',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '주요 신규 라인업 램프업에 따른 공장 전환 비용 및 부품 조달 비용 부담.',
        explanationEn: 'Factory transition costs and supply chain inflation for new architecture rollouts.',
        sourceDocId: 'mbg_2026_q3_results',
        pageOrLocator: 'p. 8',
      },
    ],
    officialManagementSummaryKo:
      '메르세데스-벤츠는 중국 럭셔리 시장 위축에 따른 최상위 차종(Top-End) 판매 부진으로 승용차 부문 조정 마진이 4.7%로 급락하며 그룹 영업이익률 5.8%를 기록했습니다.',
    officialManagementSummaryEn:
      'Mercedes-Benz saw its Cars division adjusted RoS fall to 4.7% (Group margin 5.8%) due to lower Top-End luxury demand in China and heightened price competition.',
    unavailableInformationKo: [
      '마이바흐 및 AMG 차종별 순수 공헌이익률 비공시',
      '중국 딜러 네트워크 지원 보조금 지출 총액 비공개',
    ],
    unavailableInformationEn: [
      'Unit contribution margins for Maybach and AMG lines omitted',
      'Total dealer subsidy payments across China retail network not disaggregated',
    ],
    primarySourceDocId: 'mbg_2026_q3_results',
    sourceCitation: 'Mercedes-Benz Group Q3 2026 Results Presentation, pp. 4, 8-12',
  },

  // ==========================================
  // 5. HYUNDAI MOTOR COMPANY (2026-Q3)
  // ==========================================
  {
    companyId: 'hyundai_motor',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'KRW',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 45110000,
    previousRevenue: 41002600,
    currentOperatingProfit: 2677000,
    previousOperatingProfit: 3821800,
    currentOperatingMargin: 5.9,
    previousOperatingMargin: 9.3,
    revenueChangeYoYPercentage: 10.0,
    profitChangeYoYPercentage: -29.9,
    marginChangeYoYBasisPoints: -340,
    contributingFactors: [
      {
        category: 'one_off_restructuring',
        nameKo: '북미 보증기간 연장 관련 선제적 충당부채 전입',
        nameEn: 'North America Warranty Extension Preemptive Provision',
        impactType: 'negative',
        quantifiedAmount: -1200000,
        quantifiedUnit: 'KRW millions',
        isDisclosedNumeric: true,
        explanationKo: '미국 시장 고객 신뢰 제고를 위한 그랜드 싼타페 등 보증 연장 조치로 약 1.2조 원의 선제적 보증수리 충당부채 일시 전입.',
        explanationEn: 'Preemptive recognition of warranty provisions of approx. KRW 1.2T in North America constrained operating profit.',
        sourceDocId: 'hmc_2026_q3_presentation',
        pageOrLocator: 'p. 6 (Operating Income Variance)',
      },
      {
        category: 'mix_pricing',
        nameKo: '하이브리드(HEV) 및 제네시스·SUV 고수익 믹스 개선',
        nameEn: 'Hybrid (HEV) & Genesis/SUV Product Mix Expansion',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '싼타페, 투싼 하이브리드 판매 비중 급증과 SUV 믹스 60% 상회로 평균판매단가(ASP) 상승 견인.',
        explanationEn: 'Surging hybrid deliveries and high-margin SUV/Genesis volume supported top-line revenue growth.',
        sourceDocId: 'hmc_2026_q3_presentation',
        pageOrLocator: 'p. 5',
      },
      {
        category: 'fx_currency',
        nameKo: '원·달러 고환율 수혜',
        nameEn: 'Favorable KRW/USD Exchange Rate',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '원/달러 평균 환율 상승에 따른 북미 수출 대금 원화 환산액 증가.',
        explanationEn: 'Depreciated Korean Won against US Dollar bolstered North American export revenue.',
        sourceDocId: 'hmc_2026_q3_presentation',
        pageOrLocator: 'p. 4',
      },
    ],
    officialManagementSummaryKo:
      '현대차는 하이브리드 차량 수요 강세로 분기 매출 45.1조 원을 달성했으나, 북미 선제적 보증수리 충당금(1.2조 원) 일시 반영으로 영업이익률이 5.9%를 기록했습니다.',
    officialManagementSummaryEn:
      'Hyundai Motor generated revenue of KRW 45.1T backed by hybrid demand, while operating margin consolidated at 5.9% due to preemptive warranty provisions of approx. KRW 1.2T in North America.',
    unavailableInformationKo: [
      '조지아 신공장(HMGMA) 초기 램프업 가동손실 구체적 수치 미공시',
      '차종별(내연기관 vs HEV vs EV) 공헌이익률 격차 비공개',
    ],
    unavailableInformationEn: [
      'Exact initial ramp-up start costs for Metaplant America (HMGMA) omitted',
      'Unit contribution margin divergence between ICE, HEV, and BEV not broken down',
    ],
    primarySourceDocId: 'hmc_2026_q3_presentation',
    sourceCitation: 'Hyundai Motor Company Q3 2026 Business Results Press Release, pp. 3-6',
  },

  // ==========================================
  // 6. KIA CORPORATION (2026-Q3)
  // ==========================================
  {
    companyId: 'kia',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'KRW',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 31597400,
    previousRevenue: 28686000,
    currentOperatingProfit: 1818300,
    previousOperatingProfit: 1462300,
    currentOperatingMargin: 5.8,
    previousOperatingMargin: 5.1,
    revenueChangeYoYPercentage: 10.1,
    profitChangeYoYPercentage: 24.3,
    marginChangeYoYBasisPoints: 70,
    contributingFactors: [
      {
        category: 'mix_pricing',
        nameKo: 'RV 및 하이브리드 중심의 고부가가치 믹스 유지',
        nameEn: 'Sustained RV & Hybrid High-Value Mix',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '쏘렌토, 카니발, 스포티지 등 RV 판매 비중이 70%에 육박하며 고수익성 유지.',
        explanationEn: 'RV mix approaching 70% sustained strong profitability across North America and Europe.',
        sourceDocId: 'kia_2026_q3_ir',
        pageOrLocator: 'p. 4 (Sales & Profitability)',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '글로벌 인플레이션 및 EV3 신차 런칭 마케팅비 집행',
        nameEn: 'Global Inflation & Brand Marketing for EV3',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '신차 EV3 유럽 및 글로벌 출시에 따른 초기 판촉 비용 집행과 물류비 상승.',
        explanationEn: 'Global launch marketing expenses for EV3 and shipping cost headwinds.',
        sourceDocId: 'kia_2026_q3_ir',
        pageOrLocator: 'p. 5',
      },
    ],
    officialManagementSummaryKo:
      '기아는 RV 중심의 고수익 판매 구조와 친환경차 비중 확대에 힘입어 분기 매출 31.6조 원, 영업이익 1.82조 원(영업이익률 5.8%)을 달성했습니다.',
    officialManagementSummaryEn:
      'Kia achieved quarterly revenue of KRW 31.6T and operating profit of KRW 1.82T (5.8% margin) driven by an RV mix near 70% and disciplined pricing.',
    unavailableInformationKo: [
      'EV3 소형 전기차 플랫폼 단독 마진율 비공개',
      '국내 공장 임금협상 소급분 반영 내역 분리 미공시',
    ],
    unavailableInformationEn: [
      'Standalone margin profile for EV3 dedicated compact BEV not disclosed',
      'Detailed wage settlement retrospective accrual breakdown omitted',
    ],
    primarySourceDocId: 'kia_2026_q3_ir',
    sourceCitation: 'Kia Corporation Q3 2026 Business Results & Financial Performance, pp. 3-6',
  },

  // ==========================================
  // 7. TESLA, INC. (2026-Q3)
  // ==========================================
  {
    companyId: 'tesla',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'USD',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 28046,
    previousRevenue: 25182,
    currentOperatingProfit: 718,
    previousOperatingProfit: 1764,
    currentOperatingMargin: 2.6,
    previousOperatingMargin: 7.0,
    revenueChangeYoYPercentage: 11.4,
    profitChangeYoYPercentage: -59.3,
    marginChangeYoYBasisPoints: -440,
    contributingFactors: [
      {
        category: 'r_and_d_capex',
        nameKo: 'AI 컴퓨팅 인프라(FSD, 코어 클러스터) Capex 급증',
        nameEn: 'Surging AI Compute & R&D Capital Expenditures',
        impactType: 'negative',
        quantifiedAmount: 3500,
        quantifiedUnit: 'USD millions (Capex)',
        isDisclosedNumeric: true,
        explanationKo: 'FSD 완전자율주행 학습 인프라 구축 및 AI 클러스터 투자로 자본적 지출 $35억 기록.',
        explanationEn: 'Heavy capital investments in AI compute clusters and autonomous training accelerated operating expense growth.',
        sourceDocId: 'tsla_2026_q3_deck',
        pageOrLocator: 'p. 11',
      },
      {
        category: 'mix_pricing',
        nameKo: '차량 평균판매단가(ASP) 하락 및 저금리 프로모션',
        nameEn: 'Lower Automotive ASP & Promotional Financing Subsidies',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '글로벌 수요 진작을 위한 저금리 할부 프로모션과 가격 인하 효과로 차량 ASP 하락 압력.',
        explanationEn: 'Reduced average selling price per vehicle and promotional financing incentives reduced automotive margins.',
        sourceDocId: 'tsla_2026_q3_deck',
        pageOrLocator: 'p. 4 (Vehicle Gross Margin)',
      },
      {
        category: 'volume',
        nameKo: '에너지 저장 사업(Megapack) 사상 최대 총이익 기여',
        nameEn: 'Record Energy Storage Gross Profit Contribution',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '메가팩(Megapack) 인도량 급증으로 에너지 부문 수익성이 사상 최고치를 경신하며 차량 부문 부진 일부 상쇄.',
        explanationEn: 'Record Megapack utility storage deployments generated historic energy gross profit, partially buffering auto headwinds.',
        sourceDocId: 'tsla_2026_q3_deck',
        pageOrLocator: 'p. 14 (Energy Business)',
      },
    ],
    officialManagementSummaryKo:
      '테슬라는 차량 인도량 반등과 에너지 저장장치 사업의 호조에도 불구하고, 차량 평균단가 하락과 AI 컴퓨팅 인프라 Capex($35억) 증가로 영업이익률이 2.6%로 하락했습니다.',
    officialManagementSummaryEn:
      'Tesla saw automotive gross margin headwinds and surging AI compute capex ($3.5B) pull operating margin down to 2.6%, despite record gross profits from its Energy division.',
    unavailableInformationKo: [
      '사이버트럭(Cybertruck) 단독 차량당 적자/흑자 규모 비공개',
      'FSD 패키지 소프트웨어 인식 매출의 정확한 분기 기여액 비공시',
    ],
    unavailableInformationEn: [
      'Unit economics and breakeven milestone for Cybertruck omitted',
      'Exact deferred software revenue recognized from FSD features not disaggregated',
    ],
    primarySourceDocId: 'tsla_2026_q3_deck',
    sourceCitation: 'Tesla, Inc. Q3 2026 Financial Results & Shareholder Update, pp. 3-15',
  },

  // ==========================================
  // 8. GENERAL MOTORS (2026-Q3)
  // ==========================================
  {
    companyId: 'general_motors',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'USD',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 50015,
    previousRevenue: 44131,
    currentOperatingProfit: 4106,
    previousOperatingProfit: 3564,
    currentOperatingMargin: 8.2,
    previousOperatingMargin: 8.1,
    revenueChangeYoYPercentage: 13.3,
    profitChangeYoYPercentage: 15.2,
    marginChangeYoYBasisPoints: 10,
    contributingFactors: [
      {
        category: 'mix_pricing',
        nameKo: '북미 풀사이즈 픽업트럭 및 대형 SUV 가격 방어력',
        nameEn: 'North America Full-Size Truck & SUV Pricing Resilience',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '쉐보레 실버라도, GMC 시에라 등 고수익 대형 트럭의 견조한 수요와 강력한 가격 결정력 유지.',
        explanationEn: 'Strong customer demand and disciplined incentives on full-size pickups supported EBIT margins in North America.',
        sourceDocId: 'gm_2026_q3_earnings',
        pageOrLocator: 'p. 5 (GMNA Performance)',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '얼티엄(Ultium) 배터리 셀 단가 하락 및 제조 원가 절감',
        nameEn: 'Ultium EV Battery Cell Cost Deflation',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '배터리 원자재(리튬 등) 가격 안정화와 북미 합작공장 양산 수율 개선에 따른 EV 원가 절감.',
        explanationEn: 'Lower raw material prices and improved production efficiencies trimmed EV variable manufacturing losses.',
        sourceDocId: 'gm_2026_q3_earnings',
        pageOrLocator: 'p. 6',
      },
    ],
    officialManagementSummaryKo:
      'GM은 북미 시장에서의 풀사이즈 픽업트럭 가격 방어력과 얼티엄 배터리 제조원가 절감에 힘입어 분기 EBIT-adjusted $41.06억(영업이익률 8.2%)을 달성하고 연간 가이던스를 상향했습니다.',
    officialManagementSummaryEn:
      'General Motors delivered EBIT-adjusted of $4,106M (8.2% margin) backed by North American pickup strength and battery cost reductions, lifting its full-year guidance.',
    unavailableInformationKo: [
      '크루즈(Cruise) 자율주행 부문 단독 분기 잔여 현금 소진율 비공개',
      '얼티엄 EV 모델별 단위당 총마진(Gross Margin) 흑자전환 시점 미공시',
    ],
    unavailableInformationEn: [
      'Cruise autonomous segment net cash burn rate not disaggregated',
      'Vehicle-level unit gross profit breakeven milestones for Ultium EVs omitted',
    ],
    primarySourceDocId: 'gm_2026_q3_earnings',
    sourceCitation: 'General Motors Q3 2026 Earnings Deck & Financial Highlights, pp. 3-8',
  },

  // ==========================================
  // 9. FORD MOTOR COMPANY (2026-Q3)
  // ==========================================
  {
    companyId: 'ford',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'USD',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 49500,
    previousRevenue: 46200,
    currentOperatingProfit: 2700,
    previousOperatingProfit: 2900,
    currentOperatingMargin: 5.5,
    previousOperatingMargin: 6.3,
    revenueChangeYoYPercentage: 7.1,
    profitChangeYoYPercentage: -6.9,
    marginChangeYoYBasisPoints: -80,
    contributingFactors: [
      {
        category: 'mix_pricing',
        nameKo: '포드 프로(Ford Pro) 상용차 부문의 높은 마진 기여',
        nameEn: 'Ford Pro Commercial Fleet High-Margin Contribution',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '트랜짓 밴 및 슈퍼 듀티 트럭 기반 상용 플릿(Fleet) 소프트웨어 서비스 고마진 지속.',
        explanationEn: 'Ford Pro commercial fleet sales and software attach rates sustained double-digit segment profitability.',
        sourceDocId: 'ford_2026_q3_results',
        pageOrLocator: 'p. 6 (Ford Pro Review)',
      },
      {
        category: 'r_and_d_capex',
        nameKo: '포드 모델 e(Ford Model e) 순수전기차 부문 적자 부담',
        nameEn: 'Ford Model e EV Division Operating Losses',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '전기차 가격 인하 경쟁과 2세대 EV 플랫폼 개발 Capex로 인한 모델 e 부문 EBIT 적자 지속.',
        explanationEn: 'Persistent pricing pressure and next-generation architecture development costs kept Model e EBIT in negative territory.',
        sourceDocId: 'ford_2026_q3_results',
        pageOrLocator: 'p. 7 (Ford Model e)',
      },
    ],
    officialManagementSummaryKo:
      '포드는 상용차 부문(Ford Pro)의 견조한 수익성에도 불구하고, 전기차 부문(Model e)의 적자와 품질 보증 비용 부담으로 분기 조정 EBIT 마진이 5.5%를 기록했습니다.',
    officialManagementSummaryEn:
      'Ford generated adjusted EBIT of $2.7B (5.5% margin), where strong profits in Ford Pro commercial business were tempered by Model e electric vehicle losses and warranty expenses.',
    unavailableInformationKo: [
      '모델 e 차종별(머스탱 마하-E, F-150 라이트닝) 대당 적자액 비공시',
      '신규 LFP 배터리 합작공장 구체적 가동 개시 일정 비공개',
    ],
    unavailableInformationEn: [
      'Per-unit loss breakdown between Mustang Mach-E and F-150 Lightning omitted',
      'Exact production commencement timeline for domestic LFP facility not confirmed',
    ],
    primarySourceDocId: 'ford_2026_q3_results',
    sourceCitation: 'Ford Motor Company Third Quarter 2026 Financial Results, pp. 3-8',
  },

  // ==========================================
  // 10. STELLANTIS N.V. (2026-Q3)
  // ==========================================
  {
    companyId: 'stellantis',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'EUR',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 37611,
    previousRevenue: 45100,
    currentOperatingProfit: 256,
    previousOperatingProfit: 4200,
    currentOperatingMargin: 0.7,
    previousOperatingMargin: 9.3,
    revenueChangeYoYPercentage: -16.6,
    profitChangeYoYPercentage: -93.9,
    marginChangeYoYBasisPoints: -860,
    contributingFactors: [
      {
        category: 'volume',
        nameKo: '북미 딜러 재고 감축(Destocking)에 따른 출하량 급감',
        nameEn: 'North America Dealer Inventory Destocking Shock',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '북미 지역 과다 재고 소진을 위해 출하량을 -36% 대폭 감산하여 고정비 회수율 급락.',
        explanationEn: 'Aggressive actions to reduce US dealer inventory via vehicle shipment cuts severely curtailed factory fixed cost absorption.',
        sourceDocId: 'stla_2026_q3_results',
        pageOrLocator: 'p. 2 (Regional Shipments)',
      },
      {
        category: 'mix_pricing',
        nameKo: '재고 정리를 위한 딜러 인센티브 할인 확대',
        nameEn: 'Heightened Dealer Incentive Allowances for Inventory Clearance',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '구형 연식(2024년형) 재고 처분을 위한 파격적인 인센티브 지출로 차량 대당 순마진 급감.',
        explanationEn: 'Discount promotions and dealer support on aging model year stock compressed net vehicle profitability.',
        sourceDocId: 'stla_2026_q3_results',
        pageOrLocator: 'p. 4',
      },
    ],
    officialManagementSummaryKo:
      '스텔란티스는 북미 딜러망 과잉 재고 감축을 위한 출하량 대폭 삭감과 인센티브 할인 지출로 인해 분기 영업이익률이 0.7%로 급락하며 실적 쇼크를 기록했습니다.',
    officialManagementSummaryEn:
      'Stellantis experienced an earnings compression with operating margin falling to 0.7% as management took decisive volume shipment cuts to clear dealer inventory backlogs in North America.',
    unavailableInformationKo: [
      '북미 딜러망 차량별 잔여 재고 일수(Days of Inventory) 비공개',
      '브랜드별(지프, 램, 푸조, 피아트) 개별 감익 기여도 분리 미공시',
    ],
    unavailableInformationEn: [
      'Specific days-of-supply inventory duration across US dealer network omitted',
      'Detailed segment operating income walk across Jeep, Ram, Peugeot, and Fiat not disclosed',
    ],
    primarySourceDocId: 'stla_2026_q3_results',
    sourceCitation: 'Stellantis Q3 2026 Shipments, Revenues & Financial Results, pp. 2-5',
  },

  // ==========================================
  // 11. GEELY AUTOMOBILE (2026-Q3)
  // ==========================================
  {
    companyId: 'geely',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'CNY',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 98960,
    previousRevenue: 74800,
    currentOperatingProfit: 5520,
    previousOperatingProfit: 3820,
    currentOperatingMargin: 5.6,
    previousOperatingMargin: 5.1,
    revenueChangeYoYPercentage: 32.3,
    profitChangeYoYPercentage: 44.5,
    marginChangeYoYBasisPoints: 50,
    contributingFactors: [
      {
        category: 'volume',
        nameKo: '지커(Zeekr) 및 갤럭시(Galaxy) 친환경차 판매량 급증',
        nameEn: 'Zeekr & Galaxy NEV Delivery Scale Surge',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '프리미엄 전기차 지커 및 대중 친환경차 갤럭시 브랜드 인도량 폭증으로 매출 +32.3% 고성장.',
        explanationEn: 'Rapid delivery expansion in premium Zeekr EVs and Galaxy NEVs lifted top-line revenue by 32.3%.',
        sourceDocId: 'geely_2026_q3_report',
        pageOrLocator: 'p. 4 (Operational Highlights)',
      },
      {
        category: 'mix_pricing',
        nameKo: '해외 수출 물량 확대에 따른 고수익 믹스',
        nameEn: 'Expanding Export Deliveries Margin Accretion',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '중동, 동유럽, 중남미 수출 판매 증가로 국내 출혈 가격 경쟁 영향 완화.',
        explanationEn: 'Higher overseas vehicle exports buffered domestic price war margin erosion.',
        sourceDocId: 'geely_2026_q3_report',
        pageOrLocator: 'p. 5',
      },
    ],
    officialManagementSummaryKo:
      '지리자동차는 지커 및 갤럭시 등 친환경차(NEV) 판매 비중이 30%를 돌파하고 글로벌 수출이 호조를 보이며 분기 매출 989.6억 위안, 영업이익률 5.6%를 달성했습니다.',
    officialManagementSummaryEn:
      'Geely Automobile achieved revenue of CNY 98.96B and an operating margin of 5.6% propelled by surging Zeekr and Galaxy NEV deliveries and growing export markets.',
    unavailableInformationKo: [
      '지커(Zeekr) 브랜드 단독 독립 분기 순이익 내역 비공개',
      '국내 배터리 협력사별 팩 공급 단가 세부 내역 비공시',
    ],
    unavailableInformationEn: [
      'Standalone quarterly net profit for Zeekr intelligent technology not broken down',
      'Battery pack unit procurement costs across supplier joint ventures omitted',
    ],
    primarySourceDocId: 'geely_2026_q3_report',
    sourceCitation: 'Geely Automobile Holdings Limited Q3 2026 Operational & Financial Update, pp. 2-6',
  },

  // ==========================================
  // 12. VOLVO CARS (2026-Q3)
  // ==========================================
  {
    companyId: 'volvo_cars',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'SEK',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 66900,
    previousRevenue: 75200,
    currentOperatingProfit: -5600,
    previousOperatingProfit: 4500,
    currentOperatingMargin: -8.4,
    previousOperatingMargin: 6.0,
    revenueChangeYoYPercentage: -11.0,
    profitChangeYoYPercentage: -224.4,
    marginChangeYoYBasisPoints: -1440,
    contributingFactors: [
      {
        category: 'one_off_restructuring',
        nameKo: 'EX90 소프트웨어 램프업 지연 관련 특별 비용',
        nameEn: 'EX90 Software Platform Ramp-Up Charges',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '플래그십 전기차 EX90 소프트웨어 안정화 지연에 따른 개발비 상각 및 공급망 보상 충당금 반영.',
        explanationEn: 'Charges related to technical ramp-up challenges for core computing software on EX90.',
        sourceDocId: 'volvo_cars_2026_q3_report',
        pageOrLocator: 'p. 5 (Operating Review)',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '글로벌 관세 리스크 및 공급망 원가 인플레이션',
        nameEn: 'Tariff Headwinds & Supply Chain Cost Inflation',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '중국산 전기차에 대한 유럽 및 미국 관세 인상에 따른 물류망 재조정 및 생산 거점 재배치 비용.',
        explanationEn: 'Logistics realignment expenses and tariff liabilities for cross-border vehicle shipments.',
        sourceDocId: 'volvo_cars_2026_q3_report',
        pageOrLocator: 'p. 6',
      },
    ],
    officialManagementSummaryKo:
      '볼보자동차는 플래그십 EX90 소프트웨어 램프업 관련 특별 비용과 글로벌 관세 리스크 대응 비용으로 인해 3분기 영업손실 -56.0억 크로나(영업이익률 -8.4%)를 기록했습니다.',
    officialManagementSummaryEn:
      'Volvo Cars posted an operating loss of SEK -5.60B (-8.4% margin) burdened by software integration expenses for the EX90 and supply chain adjustments to new global tariff regimes.',
    unavailableInformationKo: [
      'EX30 소형 전기차의 유럽 외 지역별 단위당 마진 기여도 비공시',
      '폴스타(Polestar) 지분 관련 회계상 평가손익 세부 내역 비공개',
    ],
    unavailableInformationEn: [
      'Unit contribution margins for EX30 outside Europe not disaggregated',
      'Detailed balance sheet carrying valuation of remaining Polestar securities omitted',
    ],
    primarySourceDocId: 'volvo_cars_2026_q3_report',
    sourceCitation: 'Volvo Cars Interim Report Third Quarter 2026, pp. 2-8',
  },

  // ==========================================
  // 13. RIVIAN AUTOMOTIVE (2026-Q3)
  // ==========================================
  {
    companyId: 'rivian',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'USD',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    currentRevenue: 2155,
    previousRevenue: 1331,
    currentOperatingProfit: -881,
    previousOperatingProfit: -1438,
    currentOperatingMargin: -40.9,
    previousOperatingMargin: -108.0,
    revenueChangeYoYPercentage: 61.9,
    profitChangeYoYPercentage: 38.7,
    marginChangeYoYBasisPoints: 6710,
    contributingFactors: [
      {
        category: 'costs_raw_materials',
        nameKo: '2세대(Gen 2) R1 아키텍처 재설계에 따른 부품 원가 절감',
        nameEn: 'Gen 2 R1 Architecture Retooling & Bill-of-Materials Savings',
        impactType: 'positive',
        isDisclosedNumeric: false,
        explanationKo: '전장 배선 하네스 통합 및 부품 단수 50% 감축으로 차량 대당 변동비 절감, 총마진 개선.',
        explanationEn: 'Significant removal of ECUs and wiring harness complexity reduced unit manufacturing costs on refreshed R1 vehicles.',
        sourceDocId: 'rivian_2026_q3_letter',
        pageOrLocator: 'p. 3 (Gross Profit Trajectory)',
      },
      {
        category: 'r_and_d_capex',
        nameKo: 'R2 중형 플랫폼 개발 엔지니어링 비용 집행',
        nameEn: 'R2 Mid-Size Architecture Engineering R&D',
        impactType: 'negative',
        isDisclosedNumeric: false,
        explanationKo: '2026년 양산 예정인 R2 SUV 플랫폼 개발 및 일리노이 노멀 공장 증설에 따른 지속적 R&D 지출.',
        explanationEn: 'Capital allocation toward tooling and software validation for upcoming R2 vehicle production.',
        sourceDocId: 'rivian_2026_q3_letter',
        pageOrLocator: 'p. 5',
      },
    ],
    officialManagementSummaryKo:
      '리비안은 2세대 R1 플랫폼의 원가 절감과 상용 밴(EDV) 인도 증가로 매출 $21.55억을 기록하고 영업손실을 -$8.81억(영업이익률 -40.9%)으로 전년 동기 대비 대폭 축소했습니다.',
    officialManagementSummaryEn:
      'Rivian narrowed its operating loss to -$881M (-40.9% margin) with revenue surging 61.9% to $2.15B, propelled by Gen 2 R1 manufacturing cost efficiencies and EDV fleet volume.',
    unavailableInformationKo: [
      '폭스바겐 그룹과의 소프트웨어 합작법인(JV) 선급 수령금 분기 귀속액 비공시',
      '아마존(Amazon) 외 서드파티 상용 밴 수주 고객사별 인도량 비공개',
    ],
    unavailableInformationEn: [
      'Exact quarterly recognized revenue from Volkswagen Group software joint venture omitted',
      'Non-Amazon commercial delivery van shipments by specific corporate customer not disclosed',
    ],
    primarySourceDocId: 'rivian_2026_q3_letter',
    sourceCitation: 'Rivian Automotive, Inc. Q3 2026 Shareholder Letter & Financial Results, pp. 2-8',
  },
];

/**
 * Get financial decomposition for an OEM and period.
 */
export function getFinancialDecomposition(companyId: string, period = '2026-Q3'): FinancialDecomposition | undefined {
  return FINANCIAL_DECOMPOSITIONS.find((d) => d.companyId === companyId && d.period === period);
}
