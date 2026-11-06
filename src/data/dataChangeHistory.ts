/**
 * AutoMetrics Intelligence — Data Change History & Audit Trail Registry
 *
 * Provides a prospective and reconstructed audit trail of all substantive data updates,
 * newly disclosed quarterly figures, official OEM guidance adjustments, and methodology refinements.
 *
 * Note on Nature of Ledger:
 * This registry is a curated, verified audit record maintained by automotive analysts to ensure
 * zero data fabrication, clear provenance, and transparent tracking of historical corrections.
 */

export type ChangeCategory =
  | 'new_quarterly_data'
  | 'restatement'
  | 'guidance_change'
  | 'source_replacement'
  | 'methodology_change'
  | 'scope_clarification'
  | 'coverage_expansion';

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
  isReconstructed: boolean; // true for git-reconstructed historical milestones, false for prospective entries
  comparabilityNotesKo?: string;
  comparabilityNotesEn?: string;
}

export const DATA_CHANGE_HISTORY: DataChangeRecord[] = [
  // 1. Toyota Q3 2026 (Q2 FY2027) Operating Income
  {
    id: 'chg_20261105_toyota_q3_ebit',
    changeDate: '2026-11-05',
    companyId: 'toyota_motor',
    metricId: 'operating_income',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 1127700,
    unit: 'currency_millions (JPY)',
    reasonKo: '도요타자동차 FY2027 2분기(2026년 7~9월, 2026-Q3) 공식 결산 발표: 연결 영업이익 1조 1,277억 엔 반영 (누적 차감 단독 3개월)',
    reasonEn: 'Toyota Motor Corp official Q2 FY2027 (July-Sept 2026, calendar 2026-Q3) results disclosed: JPY 1,127.7B standalone operating income.',
    sourceDocId: 'tm_2026_q3_tanshin',
    pageOrLocator: 'p. 1 (Financial Results Summary)',
    affectsHistoricalComparability: false,
    isReconstructed: false,
  },

  // 2. Toyota FY2027 Full-Year Guidance Reaffirmation
  {
    id: 'chg_20261105_toyota_q3_guidance',
    changeDate: '2026-11-05',
    companyId: 'toyota_motor',
    metricId: 'guidance_operating_income',
    period: '2025-FY',
    changeCategory: 'guidance_change',
    previousValue: 4300000,
    newValue: 4300000,
    unit: 'currency_millions (JPY)',
    reasonKo: '도요타 연간 영업이익 가이던스 4조 3,000억 엔 재확인(Reaffirmed): 환율 변동 및 인증 관련 생산 차질에도 불구하고 기존 목표치 유지 공시',
    reasonEn: 'Toyota reaffirmed full-year operating income guidance of JPY 4,300 billion during Q2 earnings conference.',
    sourceDocId: 'tm_2026_q3_tanshin',
    pageOrLocator: 'p. 18 (FY2027 Forecast)',
    affectsHistoricalComparability: false,
    isReconstructed: false,
  },

  // 3. BMW Group Q3 2026 Automotive Segment Margin
  {
    id: 'chg_20261104_bmw_q3_ros',
    changeDate: '2026-11-04',
    companyId: 'bmw_group',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 5.2,
    unit: 'percentage',
    reasonKo: 'BMW 그룹 2026년 3분기 분기보고서 공시: 그룹 영업이익률 5.2%(EBIT €1,589M), 자동차 부문 EBIT 마진 2.6% 기록',
    reasonEn: 'BMW Group Q3 2026 quarterly statement: Group operating margin 5.2% (EBIT €1,589M) and Automotive EBIT margin 2.6%.',
    sourceDocId: 'bmw_2026_q3_statement',
    pageOrLocator: 'p. 2, 7 (Key Performance Indicators)',
    affectsHistoricalComparability: false,
    isReconstructed: false,
  },

  // 4. BMW Group Guidance Revision (NOT a restatement)
  {
    id: 'chg_20261104_bmw_guidance_lowered',
    changeDate: '2026-11-04',
    companyId: 'bmw_group',
    metricId: 'guidance_operating_margin',
    period: '2026-FY',
    changeCategory: 'guidance_change',
    previousValue: '8.0% ~ 10.0%',
    newValue: '6.0% ~ 7.0%',
    unit: 'percentage',
    reasonKo: 'BMW 그룹 공식 연간 가이던스 하향 조정: IBS 리콜 관련 충당부채 및 물량 감소로 자동차 부문 연간 EBIT 마진 목표치를 기존 8~10%에서 6~7%로 수정 공시',
    reasonEn: 'BMW Group lowered full-year 2026 Automotive EBIT corridor from 8.0-10.0% to 6.0-7.0% following Continental IBS recall charges.',
    sourceDocId: 'bmw_2026_q3_statement',
    pageOrLocator: 'p. 15 (Outlook Report)',
    affectsHistoricalComparability: true,
    isReconstructed: false,
    comparabilityNotesKo: '연초 및 상반기 예측치 대비 연간 목표치 200bps 하향됨.',
    comparabilityNotesEn: 'Target margin corridor lowered by 200 bps from start-of-year outlook.',
  },

  // 5. Kia Q3 2026 Earnings
  {
    id: 'chg_20261101_kia_q3_results',
    changeDate: '2026-11-01',
    companyId: 'kia',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 5.8,
    unit: 'percentage',
    reasonKo: '기아 2026년 3분기 공식 실적 발표: 매출 31조 5,974억 원, 영업이익 1조 8,183억 원으로 분기 영업이익률 5.8% 달성',
    reasonEn: 'Kia Corp official Q3 2026 earnings release: Revenue KRW 31,597.4B, Operating profit KRW 1,818.3B (5.8% margin).',
    sourceDocId: 'kia_2026_q3_ir',
    pageOrLocator: 'p. 3 (Financial Summary)',
    affectsHistoricalComparability: false,
    isReconstructed: false,
  },

  // 6. Hyundai Motor Q3 2026 Earnings
  {
    id: 'chg_20261030_hyundai_q3_results',
    changeDate: '2026-10-30',
    companyId: 'hyundai_motor',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 5.9,
    unit: 'percentage',
    reasonKo: '현대자동차 2026년 3분기 실적 공시: 북미 하이브리드 판매 호조에도 북미 보증 충당금(1.2조) 반영으로 영업이익률 5.9% 기록',
    reasonEn: 'Hyundai Motor official Q3 2026 earnings: Consolidated revenue KRW 45,110.0B, EBIT KRW 2,677.0B (5.9% margin).',
    sourceDocId: 'hmc_2026_q3_presentation',
    pageOrLocator: 'p. 4 (Consolidated Performance)',
    affectsHistoricalComparability: false,
    isReconstructed: false,
  },

  // 7. Geely Q3 2026 Update
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
    sourceDocId: 'geely_2026_q3_report',
    pageOrLocator: 'p. 4 (Electrification Progress)',
    affectsHistoricalComparability: false,
    isReconstructed: false,
  },

  // 8. Mercedes-Benz Cars Scope Clarification
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
    reasonKo: '메르세데스-벤츠 그룹 3분기 분기보고서 공시: 자동차 부문(Mercedes-Benz Cars) 조정 영업이익률(RoS) 4.7%를 정규 승용 KPI로 확정 반영',
    reasonEn: 'Mercedes-Benz Group Q3 interim statement: Documented Cars segment adjusted RoS at 4.7% while preserving group EBIT of EUR 1,773M.',
    sourceDocId: 'mbg_2026_q3_results',
    pageOrLocator: 'p. 4 (Divisional Performance)',
    affectsHistoricalComparability: true,
    isReconstructed: false,
    comparabilityNotesKo: '그룹 통합 EBIT 대비 승용차(Cars) 부문 단독 마진을 분리하여 비교 왜곡 방지.',
    comparabilityNotesEn: 'Segregated Cars segment RoS from group proxy to prevent automotive distortion.',
  },

  // 9. GM Q3 2026 Earnings
  {
    id: 'chg_20261024_gm_q3_earnings',
    changeDate: '2026-10-24',
    companyId: 'general_motors',
    metricId: 'operating_income',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: 4106.0,
    unit: 'currency_millions (USD)',
    reasonKo: '제너럴모터스 2026년 3분기 10-Q 공시: EBIT-adjusted $41.06억 달러 달성 및 연간 가이던스 상향 반영',
    reasonEn: 'General Motors Q3 2026 10-Q: EBIT-adjusted reached $4,106M with full-year guidance raised to $14.0B-$15.0B.',
    sourceDocId: 'gm_2026_q3_earnings',
    pageOrLocator: 'p. 3 (EBIT-adjusted Walk)',
    affectsHistoricalComparability: false,
    isReconstructed: false,
  },

  // 10. Tesla Q3 2026 Update
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
    isReconstructed: false,
  },

  // 11. Volkswagen Group Q3 2026 Special Items
  {
    id: 'chg_20261018_vw_q3_results',
    changeDate: '2026-10-18',
    companyId: 'volkswagen_group',
    metricId: 'operating_margin',
    period: '2026-Q3',
    changeCategory: 'new_quarterly_data',
    previousValue: null,
    newValue: -7.8,
    unit: 'percentage',
    reasonKo: '폭스바겐 그룹 2026년 3분기 분기보고서 공시: 아우디 브뤼셀 공장 구조조정 및 소프트웨어 감액으로 분기 영업손실 -58.6억 유로(-7.8%) 기록',
    reasonEn: 'Volkswagen Group Q3 2026 interim report: Operating margin dropped to -7.8% reflecting Audi Brussels closure provisions.',
    sourceDocId: 'vw_2026_q3_report',
    pageOrLocator: 'p. 3, 6 (Group Results of Operations)',
    affectsHistoricalComparability: false,
    isReconstructed: false,
  },

  // 12. Volume Perimeter Metadata Governance Tagging (Historical Reconstructed)
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
    sourceDocId: 'platform_governance_v1',
    pageOrLocator: 'All observation records',
    affectsHistoricalComparability: true,
    isReconstructed: true,
    comparabilityNotesKo: '동일 기준(Same-perimeter) 필터 기능을 통해 단일 공시 기준별 순위 비교 가능.',
    comparabilityNotesEn: 'Enables same-perimeter peer ranking across the intelligence platform.',
  },
];

/**
 * Filter change records by company, category, period, or reconstruction status.
 */
export function getFilteredChangeHistory(options?: {
  companyId?: string;
  category?: ChangeCategory;
  period?: string;
  isReconstructed?: boolean;
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
    if (options?.isReconstructed !== undefined && rec.isReconstructed !== options.isReconstructed) {
      return false;
    }
    return true;
  });
}
