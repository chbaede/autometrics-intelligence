/**
 * AutoMetrics Intelligence — Financial Performance Decomposition Engine
 *
 * Decomposes quarterly revenue, operating profit, and margin changes into:
 * 1. Reported Facts (officially disclosed numbers from primary IR filings)
 * 2. Calculated Metrics (transparent mathematical derivations)
 * 3. Analytical Interpretation (official management commentary & driver walk)
 * 4. Unavailable Information (explicitly unquantified factors withheld by management)
 */

export type FactorClassification =
  | 'officially_reported'
  | 'derived'
  | 'estimated'
  | 'proxy'
  | 'analyst_interpretation'
  | 'historical_reference'
  | 'unverified';

export interface ContributingFactor {
  category: 'volume' | 'mix_pricing' | 'costs_raw_materials' | 'fx_currency' | 'one_off_restructuring' | 'r_and_d_capex' | 'regulatory_credits';
  nameKo: string;
  nameEn: string;
  impactType: 'positive' | 'negative' | 'neutral';
  quantifiedAmount?: number; // in millions of original currency, if officially disclosed
  quantifiedUnit?: string;
  isDisclosedNumeric: boolean; // true if company officially published the numeric impact; false if directional commentary
  classification?: FactorClassification;
  reportingPeriod?: string;
  derivationFormula?: string;
  assumptionsKo?: string;
  assumptionsEn?: string;
  limitationsKo?: string;
  limitationsEn?: string;
  explanationKo: string;
  explanationEn: string;
  sourceDocId: string;
  pageOrLocator: string;
}

export interface DerivationCalculationInputs {
  currentH1CumulativeRevenue: number;
  currentH1CumulativeOperatingProfit: number;
  currentQ1Revenue: number;
  currentQ1OperatingProfit: number;
  previousH1CumulativeRevenue: number;
  previousH1CumulativeOperatingProfit: number;
  previousQ1Revenue: number;
  previousQ1OperatingProfit: number;
  derivationMethodDescriptionKo: string;
  derivationMethodDescriptionEn: string;
}

export interface FinancialDecomposition {
  companyId: string;
  period: string; // '2026-Q3'
  comparisonPeriod: string; // '2025-Q3'
  currency: string;
  reportingScope: 'consolidated_group' | 'cars_segment' | 'automotive_segment';
  periodClassification: 'standalone_quarter' | 'derived_quarter' | 'cumulative_half_year';
  accountingStandard?: 'IFRS' | 'US_GAAP' | 'J_GAAP' | 'K_IFRS' | 'CAS';
  operatingProfitMetricName?: string;
  profitMetricClassification?: 'statutory_operating_income' | 'adjusted_ebit' | 'derived_operating_income';
  derivationFormula?: string;
  derivationInputs?: DerivationCalculationInputs;
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
    accountingStandard: 'J_GAAP',
    operatingProfitMetricName: 'Operating Income (営業利益, J-GAAP)',
    profitMetricClassification: 'derived_operating_income',
    derivationFormula:
      'Standalone Q2 FY2027 (Jul 1 - Sep 30, 2026) = H1 FY2027 cumulative (Apr-Sep 2026: Rev ¥26,962,462M, EBIT ¥2,191,124M) minus Q1 FY2027 (Apr-Jun 2026: Rev ¥13,525,400M, EBIT ¥1,063,473M) = Rev ¥13,437,062M, EBIT ¥1,127,651M. Standalone Q2 FY2026 (Jul 1 - Sep 30, 2025) = H1 FY2026 cumulative (Rev ¥24,630,753M, EBIT ¥2,005,692M) minus Q1 FY2026 (Rev ¥12,253,326M, EBIT ¥1,166,141M) = Rev ¥12,377,427M, EBIT ¥839,551M.',
    derivationInputs: {
      currentH1CumulativeRevenue: 26962462,
      currentH1CumulativeOperatingProfit: 2191124,
      currentQ1Revenue: 13525400,
      currentQ1OperatingProfit: 1063473,
      previousH1CumulativeRevenue: 24630753,
      previousH1CumulativeOperatingProfit: 2005692,
      previousQ1Revenue: 12253326,
      previousQ1OperatingProfit: 1166141,
      derivationMethodDescriptionKo: '도요타 공식 결산단신(Tanshin) 상반기 6개월 누적치에서 1분기 3개월치를 차감하여 단독 2분기(7~9월) 실적을 정확히 도출 (Q2 = H1 cumulative - Q1 cumulative)',
      derivationMethodDescriptionEn: 'Standalone Q2 results derived by subtracting Q1 results from 6-month cumulative H1 totals per official Toyota Japanese Tanshin filings (Q2 = H1 cumulative - Q1 cumulative)',
    },
    segmentReportingNotesKo:
      '도요타자동차는 3월 결산 법인으로 2026년 7~9월은 FY2027 회계연도 2분기(Q2 FY2027)에 해당합니다. 일본 결산단신(Kessan Tanshin) 상 6개월 누적 실적(H1 FY2027: 매출 26조 9,624.62억 엔, 영업이익 2조 1,911.24억 엔)에서 1분기 실적(Q1 FY2027: 매출 13조 5,254.00억 엔, 영업이익 1조 634.73억 엔)을 차감하여 당기 단독 3개월 실적(매출 13조 4,370.62억 엔, 영업이익 1조 1,276.51억 엔, 마진 8.39%)을 도출했습니다. 전년 동기 역시 H1 누적(매출 24조 6,307.53억 엔, 영업이익 2조 56.92억 엔)에서 Q1(매출 12조 2,533.26억 엔, 영업이익 1조 1,661.41억 엔)을 차감하여 전년 동기 단독 실적(매출 12조 3,774.27억 엔, 영업이익 8,395.51억 엔, 마진 6.78%)을 산출했습니다.',
    segmentReportingNotesEn:
      'Toyota Motor Corp follows an April-March fiscal calendar; July-September 2026 corresponds to Q2 FY2027. Under Japanese Tanshin reporting, standalone 3-month performance for both current and prior periods is derived by deducting Q1 from 6-month cumulative totals: Q2 FY2027: Rev ¥13,437,062M (H1 ¥26,962,462M - Q1 ¥13,525,400M), EBIT ¥1,127,651M (H1 ¥2,191,124M - Q1 ¥1,063,473M), margin 8.39%; Q2 FY2026: Rev ¥12,377,427M (H1 ¥24,630,753M - Q1 ¥12,253,326M), EBIT ¥839,551M (H1 ¥2,005,692M - Q1 ¥1,166,141M), margin 6.78%.',
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
        nameKo: '[파생 해석] 외환 환율 변동 효과 (FX Effect - Derived / Interpretation)',
        nameEn: '[Derived] Foreign Exchange Rate Tailwinds',
        impactType: 'positive',
        isDisclosedNumeric: false,
        classification: 'analyst_interpretation',
        reportingPeriod: 'FY2027 H1 cumulative (disclosed) / Q2 standalone (qualitative interpretation)',
        assumptionsKo: '도요타 공식 IR 요인 분해표(슬라이드 6)는 상반기 누적 기준(+6,100억 엔)만 공개되며 단독 2분기 수치는 질적 파생 해석으로 관리함',
        assumptionsEn: 'Toyota officially discloses factor walks on a 6-month cumulative basis (+¥610B in H1); standalone Q2 is maintained as qualitative analytical interpretation.',
        limitationsKo: 'Q1과 Q2 간 정밀 통화별 환율 차이 분해 수치는 회사 공식 미공시',
        limitationsEn: 'Precise currency-by-currency quarterly rate variance not officially disaggregated by management.',
        explanationKo: '엔화 약세(USD/JPY 153엔, EUR/JPY 167엔) 수혜가 발생함. (도요타 공식 IR 요인 분해표는 6개월 누적 기준만 공개되며, 단독 2분기 수치는 파생 해석으로 관리)',
        explanationEn: 'Favorable foreign exchange movements supported profitability. (Toyota discloses factor walks on a cumulative basis; quarterly amounts are derived by qualitative interpretation).',
        sourceDocId: 'tm_2026_q3_tanshin',
        pageOrLocator: 'p. 6 (Operating Income Analysis)',
      },
      {
        category: 'costs_raw_materials',
        nameKo: '[파생 해석] 공급업체 인건비·원가 보전 지원 및 자재비 상승 (Derived)',
        nameEn: '[Derived] Supplier Support & Cost Inflation',
        impactType: 'negative',
        isDisclosedNumeric: false,
        classification: 'analyst_interpretation',
        reportingPeriod: 'FY2027 H1 cumulative (disclosed) / Q2 standalone (qualitative interpretation)',
        assumptionsKo: '상반기 공급망 파트너사 가격 보전 지원 및 에너지/물류비 상승 압력이 2분기에도 지속 작용',
        assumptionsEn: 'Supplier support initiatives and cost inflation exerted persistent headwind throughout H1.',
        explanationKo: '공급망 파트너사 가격 보전 지원 및 자재비 상승으로 수익성 일부 차감 요인 발생 (단독 분기 브릿지는 파생 해석치).',
        explanationEn: 'Supplier support initiatives and cost inflation exerted downward pressure (derived standalone interpretation).',
        sourceDocId: 'tm_2026_q3_tanshin',
        pageOrLocator: 'p. 6',
      },
      {
        category: 'volume',
        nameKo: '[파생 해석] 국내외 출하 및 생산량 변동 (Derived)',
        nameEn: '[Derived] Volume & Operational Recovery',
        impactType: 'positive',
        isDisclosedNumeric: false,
        classification: 'analyst_interpretation',
        reportingPeriod: 'FY2027 H1 cumulative (disclosed) / Q2 standalone (qualitative interpretation)',
        explanationKo: '일본 인증 관련 생산 재개 및 글로벌 출하 회복으로 단독 분기 영업이익 전년 동기 대비 +34.3% 성장 견인.',
        explanationEn: 'Resumed production in Japan and resilient global deliveries drove a 34.3% YoY expansion in standalone operating profit.',
        sourceDocId: 'tm_2026_q3_tanshin',
        pageOrLocator: 'p. 6',
      },
      {
        category: 'mix_pricing',
        nameKo: '[파생 해석] 글로벌 하이브리드(HEV) 고수익 믹스 개선 (Derived)',
        nameEn: '[Derived] Global Hybrid (HEV) Product Mix Expansion',
        impactType: 'positive',
        isDisclosedNumeric: false,
        classification: 'analyst_interpretation',
        reportingPeriod: 'FY2027 H1 cumulative (disclosed) / Q2 standalone (qualitative interpretation)',
        explanationKo: '북미 및 유럽 시장 하이브리드 판매 비중 급증에 따른 고수익 믹스 및 가격 개선 효과 지속.',
        explanationEn: 'Strong global hybrid demand across North America and Europe lifted product mix and pricing realization.',
        sourceDocId: 'tm_2026_q3_tanshin',
        pageOrLocator: 'p. 6',
      },
    ],
    officialManagementSummaryKo:
      '도요타의 단독 2분기(2026년 7~9월) 연결 매출은 전년 동기(12.38조 엔) 대비 8.6% 증가한 13.44조 엔(13,437,062백만 엔), 단독 영업이익은 전년 동기(8,396억 엔) 대비 34.3% 증가한 1조 1,277억 엔(1,127,651백만 엔)을 기록하였으며, 영업이익률은 6.78%에서 8.39%로 161bps 개선되었습니다. (H1 누적 매출 26,962,462백만 엔 - Q1 13,525,400백만 엔 = Q2 13,437,062백만 엔; H1 누적 영업이익 2,191,124백만 엔 - Q1 1,063,473백만 엔 = Q2 1,127,651백만 엔으로 완벽히 수학적으로 검증되었습니다.)',
    officialManagementSummaryEn:
      'Toyota standalone Q2 (July-September 2026) consolidated revenue rose 8.6% YoY to JPY 13,437,062M (vs JPY 12,377,427M in Q2 FY2026), and standalone operating income expanded 34.3% YoY to JPY 1,127,651M (vs JPY 839,551M), with operating margin improving by 161 bps from 6.78% to 8.39%. Formally derived: H1 ¥26,962,462M - Q1 ¥13,525,400M = Q2 ¥13,437,062M; H1 EBIT ¥2,191,124M - Q1 EBIT ¥1,063,473M = Q2 EBIT ¥1,127,651M.',
    unavailableInformationKo: [
      '토요타 IR 공식 요인 분해표(슬라이드 6)는 상반기 6개월 누적 기준만 제공되며, 단독 2분기(3개월) 요인별 독립 수량적 증감액은 공식 미공개 (파생 해석치로 관리)',
      '차종별(RAV4, 캠리, 프리우스 등) 개별 차량당 순마진 기여도 비공개',
      '지역별 배터리 및 원자재 구매 단가 차이 비공시',
    ],
    unavailableInformationEn: [
      'Toyota IR factor walk (Slide 6) is disclosed strictly for the 6-month cumulative first half; standalone Q2 (3-month) independent factor bridge is withheld (maintained as derived interpretation)',
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
    accountingStandard: 'IFRS',
    operatingProfitMetricName: 'Group EBIT (IFRS)',
    profitMetricClassification: 'statutory_operating_income',
    groupEbt: 2083,
    groupEbtMargin: 6.8,
    segmentReportingNotesKo:
      'BMW 그룹 보고 단위는 그룹 연결(Group Consolidated)과 자동차 부문(Automotive Segment)으로 엄격히 분리됩니다. 그룹 3분기 실적은 매출 €30,452M(전년동기 €32,314M 대비 -5.8%), EBIT €1,589M(전년동기 €2,261M 대비 -29.7%), EBIT 마진 5.2%(전년동기 7.0% 대비 -180bps), 그룹 세전이익(EBT) €2,083M(EBT 마진 6.8%)입니다. 콘티넨탈 IBS 제동장치 관련 법적 절차 합의 및 중국 수요 위축(-24.8%)의 영향을 받은 자동차 부문(Automotive Segment) 단독 실적은 매출 €26,669M(전년동기 €28,510M 대비 -6.5%), EBIT €901M(전년동기 €1,494M 대비 -39.7%), EBIT 마진 3.4%(전년동기 5.2% 대비 -180bps), 잉여현금흐름(FCF) €-566M입니다. 그룹 EBT 마진(6.8%)을 EBIT 마진(5.2%)으로 혼동하거나, 자동차 부문 EBIT 마진(3.4%)과 혼재해서는 안 됩니다.',
    segmentReportingNotesEn:
      'BMW Group maintains strict scope separation between Group Consolidated and Automotive Segment accounting perimeters. Group consolidated Q3 results: Revenue €30,452M (-5.8% YoY vs €32,314M), Group EBIT €1,589M (-29.7% YoY vs €2,261M), Group EBIT margin 5.2% (-180 bps vs 7.0%), Group EBT €2,083M, and Group EBT margin 6.8%. The Automotive Segment recorded Revenue €26,669M (-6.5% YoY vs €28,510M), EBIT €901M (-39.7% YoY vs €1,494M), Automotive EBIT margin 3.4% (-180 bps vs 5.2%), and Free Cash Flow of €-566M. Group EBT margin (6.8%) must not be labeled EBIT margin (5.2%).',
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
        nameKo: 'IBS 법적 절차 합의 긍정 효과 및 기타 비용 변동',
        nameEn: 'IBS Legal Proceedings Settlement & Other Cost Changes',
        impactType: 'positive',
        isDisclosedNumeric: false,
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
        assumptionsKo: '과거 보증 충당부채(-9.8억 유로 등)는 이전 분기/사전 공시 사안이며 당해 3분기에는 법적 절차 합의에 따른 긍정적 영향이 발생함',
        assumptionsEn: 'Prior warranty provisions are historical reference context; standalone Q3 benefited positively from legal proceedings settlements.',
        limitationsKo: 'Q3 단독 순 IBS 재무 영향은 기타 비용 변동(~+€400M) 내에 합산되어 단독 수치로 별도 분해 공시되지 않음',
        limitationsEn: 'Standalone Q3 net quantified IBS financial effect is aggregated within other cost changes (~+€400M) and not separately disaggregated in the bridge.',
        explanationKo: 'BMW Q3 공식 실적 설명에서 통합제동시스템(IBS) 관련 법적 절차 합의에 따른 긍정적 효과가 언급되었으며, 이는 기타 비용 변동(약 +4억 유로)에 포함되어 수익성에 기여했습니다. 과거 공시된 높은 3자리 수 백만 유로(약 -9.8억 유로)의 보증 충당부채는 과거 발생 사안(historical reference)으로, 단독 Q3 브릿지 감익 요인으로 차감하거나 전체 +€400M을 IBS 단독으로 귀속시켜서는 안 됩니다.',
        explanationEn: 'Official Q3 commentary highlights a positive financial effect associated with the settlement of legal proceedings concerning the Integrated Braking System (IBS), reflected within other cost changes (~+€400M). Historical IBS warranty provisions (~€980M) occurred in prior periods/ad-hoc notices and must not be misattributed as a standalone Q3 negative bridge decrement, nor should the entire €400M movement be equated solely to IBS.',
        sourceDocId: 'bmw_2026_q3_statement',
        pageOrLocator: 'p. 5 (Automotive Segment Review)',
      },
      {
        category: 'volume',
        nameKo: '중국 시장 수요 위축 및 가격 경쟁 격화 (-24.8%)',
        nameEn: 'China Demand Softness & Price Competition (-24.8%)',
        impactType: 'negative',
        isDisclosedNumeric: false,
        classification: 'officially_reported',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'IFRS',
    operatingProfitMetricName: 'Operating Result (EBIT, IFRS)',
    profitMetricClassification: 'statutory_operating_income',
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
        classification: 'officially_reported',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'IFRS',
    operatingProfitMetricName: 'Group EBIT (IFRS)',
    profitMetricClassification: 'statutory_operating_income',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'K_IFRS',
    operatingProfitMetricName: 'Operating Profit (K-IFRS)',
    profitMetricClassification: 'statutory_operating_income',
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
        classification: 'officially_reported',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'K_IFRS',
    operatingProfitMetricName: 'Operating Profit (K-IFRS)',
    profitMetricClassification: 'statutory_operating_income',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'US_GAAP',
    operatingProfitMetricName: 'Income from Operations (US GAAP)',
    profitMetricClassification: 'statutory_operating_income',
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
        classification: 'officially_reported',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'US_GAAP',
    operatingProfitMetricName: 'EBIT-Adjusted (Non-GAAP)',
    profitMetricClassification: 'adjusted_ebit',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'US_GAAP',
    operatingProfitMetricName: 'Company Adjusted EBIT (Non-GAAP)',
    profitMetricClassification: 'adjusted_ebit',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'IFRS',
    operatingProfitMetricName: 'Adjusted Operating Income (AOI, IFRS Non-GAAP)',
    profitMetricClassification: 'adjusted_ebit',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'CAS',
    operatingProfitMetricName: 'Operating Profit (CAS / HKFRS)',
    profitMetricClassification: 'statutory_operating_income',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'IFRS',
    operatingProfitMetricName: 'Operating Income (EBIT, IFRS)',
    profitMetricClassification: 'statutory_operating_income',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
    accountingStandard: 'US_GAAP',
    operatingProfitMetricName: 'Loss from Operations (US GAAP)',
    profitMetricClassification: 'statutory_operating_income',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
        classification: 'analyst_interpretation',
        reportingPeriod: '2026-Q3 standalone',
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
  // ==========================================
  // 14. HONDA MOTOR CO., LTD. (2026-Q3 / Q2 FY2027)
  // ==========================================
  {
    companyId: 'honda_motor',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'JPY',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    accountingStandard: 'IFRS',
    operatingProfitMetricName: 'Operating Profit (IFRS)',
    profitMetricClassification: 'statutory_operating_income',
    currentRevenue: 5976144,
    previousRevenue: 5292400,
    currentOperatingProfit: 117970,
    previousOperatingProfit: 193900,
    currentOperatingMargin: 2.0,
    previousOperatingMargin: 3.7,
    revenueChangeYoYPercentage: 12.9,
    profitChangeYoYPercentage: -39.2,
    marginChangeYoYBasisPoints: -169,
    contributingFactors: [
      {
        category: 'one_off_restructuring',
        nameKo: 'EV 전략 재편에 따른 일회성 구조조정 및 손실 충당 (4,848억 엔)',
        nameEn: 'EV Strategy Pivot & Restructuring Charges (¥484.8B)',
        quantifiedAmount: -484800,
        quantifiedUnit: 'JPY millions',
        impactType: 'negative',
        isDisclosedNumeric: true,
        classification: 'officially_reported',
        reportingPeriod: 'FY2027 Q2 (2026-Q3 standalone)',
        explanationKo: '2분기 중 북미 Prologue 단종 및 EV 사업 재편 관련 일회성 손실 4,848억 엔(매출원가 4,792억 엔, R&D 56억 엔)을 반영하며 자동차 부문 영업손실(-1,979억 엔) 기록. 제외 시 자동차 조정 영업이익은 +2,869억 엔(이익률 7.5%).',
        explanationEn: 'Absorbed ¥484.8B in EV-related losses/restructuring charges in Q2 (¥479.2B in CoS, ¥5.6B in R&D), pushing Automobile EBIT to -¥197.9B (-¥197,900M); adjusted Automobile EBIT was +¥286.9B (7.5% margin).',
        sourceDocId: 'honda_2026_q3_statement',
        pageOrLocator: 'Consolidated Financial Results FY2027 Q2',
      },
      {
        category: 'volume',
        nameKo: '모터사이클 사상 최대 판매(상반기 1,190만 대) 및 북미 하이브리드 강세',
        nameEn: 'Record Motorcycle Sales & North America Hybrid Growth',
        impactType: 'positive',
        isDisclosedNumeric: false,
        classification: 'analyst_interpretation',
        reportingPeriod: 'FY2027 H1 (6M ended Sept 30, 2026)',
        explanationKo: '인도·브라질 중심 이륜차 호실적 및 북미 하이브리드(HEV) 수요 강세에 힘입어 EV 일회성 비용에도 불구하고 연간 영업이익 전망을 7,800억 엔(+1,300억 엔)으로 상향.',
        explanationEn: 'Record 11.9M H1 motorcycle deliveries (+10.6% YoY) and booming US hybrid sales drove a +¥130B upward revision to FY2027 operating profit guidance (¥780.0B).',
        sourceDocId: 'honda_2026_q3_statement',
        pageOrLocator: 'Segment & Guidance Summary',
      },
    ],
    officialManagementSummaryKo:
      '혼다는 CY 2026년 3분기(FY2027 2분기) 매출 5조 9,761억 엔(+12.9% YoY), 영업이익 1,180억 엔(영업이익률 2.0%)을 기록했습니다. 4,848억 엔 규모의 EV 구조조정 비용 반영으로 단기 이익은 감소했으나, 제외 시 상반기 조정 영업이익은 1조 1,336억 엔(+71.3% YoY)에 달해 연간 영업이익 가이던스를 7,800억 엔으로 상향했습니다.',
    officialManagementSummaryEn:
      'Honda posted ¥5,976.1B in Q2 FY2027 (CY 2026-Q3) revenue (+12.9% YoY) and ¥118.0B operating profit (2.0% margin). Excluding ¥484.8B in one-off EV restructuring charges, underlying H1 adjusted operating profit surged 71.3% to ¥1,133.6B, supporting an upgraded ¥780.0B full-year EBIT forecast.',
    unavailableInformationKo: [
      '전 세계 분기별 BEV 전용 인도 대수 상세 수치(자동차 그룹 합계 783천 대만 공시)',
      '일회성 EV 손실의 세부 모델별(Prologue 등) 손상차손 분해 내역',
    ],
    unavailableInformationEn: [
      'Exact standalone quarterly global BEV-only unit deliveries omitted in summary release',
      'Model-by-model impairment breakdown of ¥484.8B EV restructuring charges',
    ],
    primarySourceDocId: 'honda_2026_q3_statement',
    sourceCitation: 'Honda Motor Co., Ltd. FY2027 Q2 / H1 Financial Results (Nov 10, 2026)',
  },
  // ==========================================
  // 15. NISSAN MOTOR CO., LTD. (2026-Q3 / Q2 FY2026)
  // ==========================================
  {
    companyId: 'nissan_motor',
    period: '2026-Q3',
    comparisonPeriod: '2025-Q3',
    currency: 'JPY',
    reportingScope: 'consolidated_group',
    periodClassification: 'standalone_quarter',
    accountingStandard: 'J_GAAP',
    operatingProfitMetricName: 'Operating Profit (J-GAAP)',
    profitMetricClassification: 'statutory_operating_income',
    currentRevenue: 3107772,
    previousRevenue: 2872200,
    currentOperatingProfit: 2109,
    previousOperatingProfit: 51500,
    currentOperatingMargin: 0.1,
    previousOperatingMargin: 1.8,
    revenueChangeYoYPercentage: 8.2,
    profitChangeYoYPercentage: -95.9,
    marginChangeYoYBasisPoints: -172,
    contributingFactors: [
      {
        category: 'costs_raw_materials',
        nameKo: 'Re:Nissan 구조개혁 고정비 절감 효과 (상반기 누적 +1,100억 엔)',
        nameEn: 'Re:Nissan Structural Cost Reduction (+¥110B in H1)',
        quantifiedAmount: 110000,
        quantifiedUnit: 'JPY millions',
        impactType: 'positive',
        isDisclosedNumeric: true,
        classification: 'officially_reported',
        reportingPeriod: 'FY2026 H1 (6M ended Sept 30, 2026)',
        explanationKo: '제조·구매·R&D 전반의 구조조정을 통해 상반기 누적 1,100억 엔의 비용을 절감하며, 상반기 누적 영업이익 +800억 엔(전년 동기 -277억 엔 적자) 흑자 전환을 견인.',
        explanationEn: 'Re:Nissan turnaround program realized ¥110B in cumulative H1 cost savings, returning H1 operating profit to +¥80.0B (vs -¥27.7B loss prior year).',
        sourceDocId: 'nissan_2026_q3_statement',
        pageOrLocator: 'H1 FY2026 Operating Profit Bridge',
      },
      {
        category: 'one_off_restructuring',
        nameKo: '전년 동기 미국 배출권 일회성 이익 소멸 및 구마모토 지진 등 일회성 비용(~300억 엔)',
        nameEn: 'Prior-Year US Emissions Credit Absence & Q2 One-Off Pressures (~¥30B)',
        quantifiedAmount: -30000,
        quantifiedUnit: 'JPY millions',
        impactType: 'negative',
        isDisclosedNumeric: true,
        classification: 'officially_reported',
        reportingPeriod: 'FY2026 Q2 (2026-Q3 standalone)',
        explanationKo: '전년 동기 515억 엔 대비 2분기 단독 영업이익이 21억 엔으로 급감한 것은 전년 미국 배출가스 규제 관련 일회성 이익 기저효과 및 구마모토 지진·비용 시기 차이(약 300억 엔)에 기인.',
        explanationEn: 'Q2 standalone EBIT fell to ¥2.1B from ¥51.5B due to non-recurrence of prior-year US emissions expense benefits and ~¥30B in one-off impacts including the Kumamoto earthquake.',
        sourceDocId: 'nissan_2026_q3_statement',
        pageOrLocator: 'Q2 Standalone Financial Commentary',
      },
      {
        category: 'volume',
        nameKo: '중국 NEV 전환 가속화 타격 vs 북미·일본 소매 판매 성장',
        nameEn: 'Steep China Volume Decline vs Resilient North America & Japan Retail Sales',
        impactType: 'negative',
        isDisclosedNumeric: false,
        classification: 'analyst_interpretation',
        reportingPeriod: 'FY2026 H1 (6M ended Sept 30, 2026)',
        explanationKo: '북미(+2.1% YoY, 상반기 64.8만 대)와 일본(+6.3%, 19.7만 대)의 견조한 성장에도 중국 시장 급락(>45% 감소)으로 연간 글로벌 판매 전망을 297만~300만 대로 하향.',
        explanationEn: 'China volume slumped steeply amid local NEV price competition, prompting a full-year global retail cut to 2.97M-3.00M units despite US and Japan growth.',
        sourceDocId: 'nissan_2026_q3_statement',
        pageOrLocator: 'Regional Retail Sales & Outlook',
      },
    ],
    officialManagementSummaryKo:
      '닛산은 CY 2026년 3분기(FY2026 2분기) 매출 3조 1,078억 엔(+8.2% YoY), 영업이익 21억 엔(이익률 0.1%), 순손실 -435억 엔을 기록했습니다. 일회성 요인으로 2분기 영업이익은 둔화되었으나, Re:Nissan 비용 절감(상반기 1,100억 엔)으로 상반기 누적 영업이익 800억 엔 흑자를 달성해 연간 영업이익 목표 2,000억 엔을 유지했습니다.',
    officialManagementSummaryEn:
      'Nissan reported Q2 FY2026 (CY 2026-Q3) revenue of ¥3,107.8B (+8.2% YoY), operating profit of ¥2.1B (0.1% margin), and net loss of -¥43.5B. Backed by ¥110B in H1 Re:Nissan cost savings restoring H1 EBIT to +¥80.0B, Nissan maintained its ¥200B full-year EBIT forecast while trimming global retail volume guidance to 2.97M-3.00M units.',
    unavailableInformationKo: [
      '2분기 단독 BEV 전용 판매 대수 및 지역별 상세 수익성(영업이익) 분해 내역',
      '자동차 부문 2분기 단독 잉여현금흐름(FCF) 세부 항목 (상반기 누적 -4,930억 엔)',
    ],
    unavailableInformationEn: [
      'Standalone Q2 BEV-only unit deliveries and regional operating profit split',
      'Quarterly standalone Automotive FCF bridge (H1 cumulative reported at -¥493B)',
    ],
    primarySourceDocId: 'nissan_2026_q3_statement',
    sourceCitation: 'Nissan Motor Co., Ltd. FY2026 Q2 / H1 Financial Results (Nov 11, 2026)',
  },
];

/**
 * Get financial decomposition for an OEM and period.
 */
export function getFinancialDecomposition(companyId: string, period = '2026-Q3'): FinancialDecomposition | undefined {
  return FINANCIAL_DECOMPOSITIONS.find((d) => d.companyId === companyId && d.period === period);
}
