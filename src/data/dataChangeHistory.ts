/**
 * AutoMetrics Intelligence — Data Change History & Audit Trail Registry
 *
 * Provides a prospective and reconstructed audit trail of all substantive data updates,
 * newly disclosed quarterly figures, official OEM restatements, and methodology refinements.
 */

export type ChangeCategory =
  | 'new_quarterly_data'
  | 'official_restatement'
  | 'source_document_update'
  | 'calculation_refinement'
  | 'scope_clarification'
  | 'historical_coverage_expansion';

export interface DataChangeRecord {
  id: string;
  changeDate: string; // ISO format 'YYYY-MM-DD'
  companyId: string;
  metricId: string;
  period: string; // e.g. '2026-Q3', '2026-Q2', '2025-FY'
  changeCategory: ChangeCategory;
  previousValue: string | number | null;
  newValue: string | number;
  unit: string;
  reasonKo: string;
  reasonEn: string;
  sourceDocId: string;
  pageOrLocator: string;
  affectsHistoricalComparability: boolean;
  comparabilityNotesKo?: string;
  comparabilityNotesEn?: string;
}

export const DATA_CHANGE_HISTORY: DataChangeRecord[] = [
  {
    id: 'chg_20261105_toyota_q3_ebit',
    changeDate: '2026-11-05',
    companyId: 'toyota_motor',
    metricId: 'operating_income',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 1155800,
    unit: 'currency_millions (JPY)',
    reasonKo: '도요타자동차 FY2025 2분기(2026년 7~9월, 2026-Q3) 공식 결산 발표: 연결 영업이익 1조 1,558억 엔 반영',
    reasonEn: 'Toyota Motor Corp official Q2 FY2025 (July-Sept 2026, calendar 2026-Q3) results disclosed: JPY 1,155.8B operating income.',
    sourceDocId: 'tm_2026_q2fy_deck',
    pageOrLocator: 'p. 4 (Financial Results)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20261105_toyota_q3_guidance',
    changeDate: '2026-11-05',
    companyId: 'toyota_motor',
    metricId: 'guidance_operating_income',
    period: '2025-FY (Fiscal Year ending March 2026)',
    changeCategory: 'new_quarterly_data',
    previousValue: 4300000,
    newValue: 4300000,
    unit: 'currency_millions (JPY)',
    reasonKo: '도요타 연간 영업이익 가이던스 4조 3,000억 엔 재확인(Reaffirmed): 환율 변동 및 인증 관련 생산 차질에도 불구하고 기존 목표치 유지 공시',
    reasonEn: 'Toyota reaffirmed full-year operating income guidance of JPY 4,300 billion during Q2 earnings conference.',
    sourceDocId: 'tm_2026_q2fy_deck',
    pageOrLocator: 'p. 18 (FY2025 Forecast)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20261104_bmw_q3_ros',
    changeDate: '2026-11-04',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 2.6,
    unit: 'percentage',
    reasonKo: 'BMW 그룹 2026년 3분기 분기보고서 공시: 통합 제동 시스템(IBS) 리콜 및 중국 시장 수요 둔화로 자동차 부문 EBIT 마진 2.6% 기록',
    reasonEn: 'BMW Group Q3 2026 quarterly statement: Automotive EBIT margin fell to 2.6% due to IBS braking system delivery stops and China headwinds.',
    sourceDocId: 'bmw_2026_q3_statement',
    pageOrLocator: 'p. 7 (Key Performance Indicators)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20261104_bmw_guidance_lowered',
    changeDate: '2026-11-04',
    companyId: 'bmw_group',
    metricId: 'guidance_operating_margin',
    period: '2026-FY',
    changeCategory: 'official_restatement',
    previousValue: '8.0% ~ 10.0%',
    newValue: '6.0% ~ 7.0%',
    unit: 'percentage',
    reasonKo: 'BMW 그룹 공식 연간 가이던스 하향 조정: IBS 리콜 관련 충당부채 및 물량 감소로 자동차 부문 연간 EBIT 마진 목표치를 기존 8~10%에서 6~7%로 수정',
    reasonEn: 'BMW Group lowered full-year 2026 Automotive EBIT corridor from 8.0-10.0% to 6.0-7.0% following Continental IBS recall charges.',
    sourceDocId: 'bmw_2026_q3_statement',
    pageOrLocator: 'p. 15 (Outlook Report)',
    affectsHistoricalComparability: true,
    comparabilityNotesKo: '연초 및 상반기 예측치 대비 연간 목표치 200bps 하향됨.',
    comparabilityNotesEn: 'Target margin corridor lowered by 200 bps from start-of-year outlook.',
  },
  {
    id: 'chg_20261101_kia_q3_results',
    changeDate: '2026-11-01',
    companyId: 'kia',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 10.9,
    unit: 'percentage',
    reasonKo: '기아 2026년 3분기 공식 실적 발표: 매출 26조 5,199억 원, 영업이익 2조 8,813억 원으로 분기 영업이익률 10.9% 달성',
    reasonEn: 'Kia Corp official Q3 2026 earnings release: Revenue KRW 26,519.9B, Operating profit KRW 2,881.3B, Operating margin 10.9%.',
    sourceDocId: 'kia_2026_q3_earnings',
    pageOrLocator: 'p. 3 (Financial Summary)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20261030_hyundai_q3_results',
    changeDate: '2026-10-30',
    companyId: 'hyundai_motor',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 8.3,
    unit: 'percentage',
    reasonKo: '현대자동차 2026년 3분기 실적 공시: 북미 하이브리드(HEV) 판매 호조 및 고수익 SUV 믹스 개선으로 분기 영업이익률 8.3% 달성',
    reasonEn: 'Hyundai Motor official Q3 2026 earnings: Consolidated revenue KRW 42,928.4B, EBIT KRW 3,580.9B (8.3% margin).',
    sourceDocId: 'hmc_2026_q3_earnings',
    pageOrLocator: 'p. 4 (Consolidated Performance)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20261029_geely_q3_bev',
    changeDate: '2026-10-29',
    companyId: 'geely',
    metricId: 'bev_share',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 31.8,
    unit: 'percentage',
    reasonKo: '지리자동차 2026년 3분기 실적 발표: 프리미엄 전기차 지커(ZEEKR) 및 갤럭시 브랜드 판매 호조로 순수전기차 비중 31.8% 기록',
    reasonEn: 'Geely Automobile Holdings Q3 2026 update: BEV share reached 31.8% driven by Zeekr and Galaxy NEV deliveries.',
    sourceDocId: 'geely_2026_q3_earnings',
    pageOrLocator: 'p. 8 (Electrification Progress)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20261025_mbg_q3_margin',
    changeDate: '2026-10-25',
    companyId: 'mercedes_benz',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'scope_clarification',
    previousValue: '5.8% (Group proxy)',
    newValue: '4.7% (Mercedes-Benz Cars RoS adjusted)',
    unit: 'percentage',
    reasonKo: '메르세데스-벤츠 그룹 3분기 분기보고서 공시: 자동차 부문(Mercedes-Benz Cars) 조정 영업이익률(RoS) 4.7%를 정규 KPI로 확정 반영',
    reasonEn: 'Mercedes-Benz Group Q3 interim statement: Documented Cars segment adjusted RoS at 4.7% while preserving group EBIT of EUR 1,773M.',
    sourceDocId: 'mbg_2026_q3_statement',
    pageOrLocator: 'p. 4 (Divisional Performance)',
    affectsHistoricalComparability: true,
    comparabilityNotesKo: '그룹 통합 EBIT 대비 승용차(Cars) 부문 단독 마진을 분리하여 비교 왜곡 방지.',
    comparabilityNotesEn: 'Segregated Cars segment RoS from group proxy to prevent automotive distortion.',
  },
  {
    id: 'chg_20261024_gm_q3_earnings',
    changeDate: '2026-10-24',
    companyId: 'general_motors',
    metricId: 'operating_income',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 4115.0,
    unit: 'currency_millions (USD)',
    reasonKo: '제너럴모터스 2026년 3분기 10-Q 공시: EBIT-adjusted $41.15억 달러 달성 및 연간 가이던스 상향 반영',
    reasonEn: 'General Motors Q3 2026 10-Q: EBIT-adjusted reached $4,115M with full-year guidance raised to $14.0B-$15.0B.',
    sourceDocId: 'gm_2026_q3_earnings',
    pageOrLocator: 'p. 5 (EBIT-adjusted Walk)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20261023_tesla_q3_earnings',
    changeDate: '2026-10-23',
    companyId: 'tesla',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 2.6,
    unit: 'percentage',
    reasonKo: '테슬라 2026년 3분기 주주서한 발표: 매출 $280.46억, 영업이익 $7.18억(영업이익률 2.6%) 공시 반영',
    reasonEn: 'Tesla, Inc. Q3 2026 Shareholder Update: Revenue $28.05B, Operating income $718M (2.6% operating margin).',
    sourceDocId: 'tsla_2026_q3_deck',
    pageOrLocator: 'p. 4 (Financial Summary)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20261018_vw_q3_results',
    changeDate: '2026-10-18',
    companyId: 'volkswagen_group',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 3.6,
    unit: 'percentage',
    reasonKo: '폭스바겐 그룹 2026년 3분기 분기보고서 공시: 아우디 브뤼셀 공장 구조조정 충당금 및 고정비 부담으로 분기 영업이익률 3.6% 기록',
    reasonEn: 'Volkswagen Group Q3 2026 interim report: Operating margin dropped to 3.6% reflecting Audi Brussels closure provisions.',
    sourceDocId: 'vw_2026_q3_report',
    pageOrLocator: 'p. 6 (Group Results of Operations)',
    affectsHistoricalComparability: false,
  },
  {
    id: 'chg_20260925_volume_perimeter_tagging',
    changeDate: '2026-09-25',
    companyId: 'all_companies',
    metricId: 'deliveries_global',
    period: 'all_periods',
    changeCategory: 'scope_clarification',
    previousValue: 'Mixed deliveries without strict perimeter flag',
    newValue: 'Explicit retail_deliveries vs wholesale_shipments classification',
    unit: 'metadata_tag',
    reasonKo: '완성차 판매량 공시 기준 엄격 분류: 딜러 출하(도매) 공시 기업과 고객 인도(소매) 공시 기업의 직접 비교 왜곡을 막기 위한 메타데이터 정밀 태깅',
    reasonEn: 'Strict volume perimeter classification implemented: Segregated wholesale shipments (GM, Hyundai, Kia, Stellantis) from retail customer deliveries (Tesla, VW, BMW, Mercedes, Volvo).',
    sourceDocId: 'various_oem_filings',
    pageOrLocator: 'All observation records',
    affectsHistoricalComparability: true,
    comparabilityNotesKo: '동일 기준(Same-perimeter) 필터 기능을 통해 단일 공시 기준별 순위 비교 가능.',
    comparabilityNotesEn: 'Enables same-perimeter peer ranking across the intelligence platform.',
  },
];

/**
 * Filter change records by company, category, or period.
 */
export function getFilteredChangeHistory(options?: {
  companyId?: string;
  category?: ChangeCategory;
  period?: string;
}): DataChangeRecord[] {
  return DATA_CHANGE_HISTORY.filter((rec) => {
    if (options?.companyId && options.companyId !== 'all' && rec.companyId !== options.companyId && rec.companyId !== 'all_companies') {
      return false;
    }
    if (options?.category && options.category !== ('all' as any) && rec.changeCategory !== options.category) {
      return false;
    }
    if (options?.period && options.period !== 'all' && rec.period !== options.period && rec.period !== 'all_periods') {
      return false;
    }
    return true;
  });
}
