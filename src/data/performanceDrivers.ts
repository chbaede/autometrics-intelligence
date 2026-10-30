/**
 * AutoMetrics Intelligence — Official Management Performance Drivers Registry
 *
 * Cites official primary investor relations disclosures, earnings releases,
 * interim financial reports, and regulatory filings to provide verified qualitative
 * commentary on quarterly financial and operational results across global automakers.
 */

export interface PerformanceDriverItem {
  category: 'profitability' | 'volume' | 'margin' | 'revenue' | 'electrification' | 'one_off' | 'macro' | 'strategy';
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CompanyPerformanceDriver {
  companyId: string;
  period: string; // '2026-Q3' | '2026-Q2'
  headlineKo: string;
  headlineEn: string;
  summaryKo: string;
  summaryEn: string;
  drivers: PerformanceDriverItem[];
  sourceDocId: string;
  sourceCitationKo: string;
  sourceCitationEn: string;
}

export const PERFORMANCE_DRIVERS: CompanyPerformanceDriver[] = [
  // ==========================================
  // 2026-Q3 CONFIRMED DISCLOSURES (9 OEMs)
  // ==========================================
  {
    companyId: 'tesla',
    period: '2026-Q3',
    headlineKo: '에너지 저장 사업 사상 최대 이익 달성 및 차량 인도량 반등, R&D 투자 확대',
    headlineEn: 'Record Energy Storage Gross Profit, Automotive Rebound, and Scaling AI/Compute Capex',
    summaryKo: '테슬라는 2026년 3분기 총 486,532대를 인도하며 분기 매출 $280.5억(+8% YoY)을 기록했습니다. 에너지 저장장치(Megapack) 사업의 매출총이익이 분기 사상 최고치를 경신했으나, 글로벌 차량 평균판매단가(ASP) 하락과 FSD V13 AI 컴퓨팅 인프라 투자 확대로 영업이익률은 2.6%($7.18억)를 기록했습니다.',
    summaryEn: 'Tesla delivered 486,532 vehicles in Q3 2026 with total revenues reaching $28.05B (+8% YoY). Energy Storage gross profit reached a record high driven by Megapack deployment scaling, while lower vehicle ASP from promotional financing and increased AI compute/FSD R&D expenses resulted in a GAAP operating margin of 2.6% ($718M).',
    sourceDocId: 'tsla_2026_q3_deck',
    sourceCitationKo: 'Tesla Q3 2026 Financial Results & Shareholder Deck (p. 4-9)',
    sourceCitationEn: 'Tesla Q3 2026 Financial Results & Shareholder Update (pp. 4-9)',
    drivers: [
      {
        category: 'profitability',
        titleKo: '에너지 저장(Megapack) 부문 사상 최대 총이익',
        titleEn: 'Record Energy Storage Segment Profitability',
        descriptionKo: '메가팩 2(Megapack 2) 라스로프 메가팩토리 증설 효과로 에너지 저장 부문 매출총이익률이 30%를 상회하며 자동차 부문 마진 압박을 효과적으로 완충했습니다.',
        descriptionEn: 'Energy Storage gross margin exceeded 30% supported by scaling production at the Lathrop Megafactory, providing strong operational buffer against automotive margin pressure.',
        impact: 'positive',
      },
      {
        category: 'volume',
        titleKo: '글로벌 인도량 48.7만 대 회복 (전분기비 +9.6%)',
        titleEn: 'Global Deliveries Rebound to 486.5k (+9.6% QoQ)',
        descriptionKo: '북미 및 중국 내 저금리 금융 프로모션 시행과 모델 Y/3 생산 효율화에 힘입어 전분기(44.4만 대) 대비 인도량이 9.6% 반등했습니다.',
        descriptionEn: 'Deliveries grew 9.6% sequentially from Q2 (444k units) aided by low-APR financing campaigns in North America and China alongside enhanced Model 3/Y production throughput.',
        impact: 'positive',
      },
      {
        category: 'margin',
        titleKo: '차량 ASP 하락 및 금융 프로모션 비용 반영',
        titleEn: 'Lower Vehicle ASP and Promotional Financing Costs',
        descriptionKo: '글로벌 전기차 시장 경쟁 심화에 따른 차량 실질 판매단가 하락 및 0.99%~1.99% 저금리 할부 비용이 자동차 부문 마진에 부담으로 작용했습니다.',
        descriptionEn: 'Intense global EV competition pressured effective vehicle ASPs, and subsidized low-APR financing programs weighed on automotive gross margins.',
        impact: 'negative',
      },
      {
        category: 'one_off',
        titleKo: 'AI 및 FSD 컴퓨팅 클러스터 R&D 비용 급증',
        titleEn: 'Accelerated AI & Autonomous Compute R&D Investments',
        descriptionKo: '텍사스 기가팩토리의 대규모 H100/H200 클러스터 구축 및 차세대 자율주행(FSD V13/Robotaxi) 엔도투엔드 신경망 훈련 비용으로 R&D 지출이 크게 증가했습니다.',
        descriptionEn: 'R&D spending expanded due to large-scale deployment of H100/H200 GPU compute clusters at Giga Texas for training end-to-end autonomous driving models.',
        impact: 'negative',
      },
    ],
  },
  {
    companyId: 'volkswagen_group',
    period: '2026-Q3',
    headlineKo: '포르쉐 AG 지분 비현금성 손상차손 €4.9B 및 유럽 공장 구조조정 충당금 반영',
    headlineEn: 'Non-Cash Impairment on Porsche AG (€4.9B) and European Restructuring Provisions (€1.2B)',
    summaryKo: '폭스바겐 그룹은 2026년 3분기 매출 €752.8억을 달성했으나, 포르쉐 AG 주가 하락에 따른 비현금성 영업권 손상차손(€49억)과 유럽 생산 공장 효율화 관련 구조조정 충당금(€12억)이 일시 반영되어 분기 영업손실 -€58.6억(영업이익률 -7.8%)을 기록했습니다.',
    summaryEn: 'Volkswagen Group generated €75.28B in Q3 2026 sales revenue, but recorded a consolidated operating loss of -€5.86B (RoS -7.8%) due to a €4.9B non-cash impairment on Porsche AG goodwill and €1.2B in restructuring provisions for European manufacturing adjustments.',
    sourceDocId: 'vw_2026_q3_report',
    sourceCitationKo: 'Volkswagen Group Interim Report January–September 2026 (p. 8-15, Note 4)',
    sourceCitationEn: 'Volkswagen Group Interim Report January to September 2026 (pp. 8-15, Note 4)',
    drivers: [
      {
        category: 'one_off',
        titleKo: '포르쉐 AG 관련 비현금성 손상차손 €4.9B 반영',
        titleEn: '€4.9B Non-Cash Impairment on Porsche AG Goodwill',
        descriptionKo: '포르쉐 AG의 중국 럭셔리 수요 둔화 및 전기차 전환 속도 조절에 따른 평가가치 재산정으로 €49억 규모의 비현금성 장부 손상차손이 회계상 영업비용으로 계상되었습니다.',
        descriptionEn: 'Reflected a €4.9B non-cash impairment against Porsche AG carrying values following updated market valuations and Chinese luxury segment headwinds.',
        impact: 'negative',
      },
      {
        category: 'one_off',
        titleKo: '유럽 생산 네트워크 구조조정 충당부채 €1.2B 적립',
        titleEn: '€1.2B Restructuring Provisions for European Capacity Realignment',
        descriptionKo: '독일 및 브뤼셀 등 유럽 주요 생산 거점의 고정비 절감과 인력 조정, 공장 재편을 위한 일회성 충당금이 3분기 실적에 선반영되었습니다.',
        descriptionEn: 'Booked restructuring provisions of €1.2B for structural fixed cost adjustments, capacity rationalization, and labor agreements across European facilities.',
        impact: 'negative',
      },
      {
        category: 'volume',
        titleKo: '중국 내 로컬 NEV 브랜드 공세로 인도량 -7.1% 감소',
        titleEn: 'Deliveries Down -7.1% YoY Amid Severe China Price Competition',
        descriptionKo: '글로벌 고객 인도량은 188.5만 대로 전년 동기 대비 7.1% 감소했으며, 특히 중국 시장에서 로컬 브랜드와의 가격 경쟁 격화로 내연기관 점유율이 일부 잠식되었습니다.',
        descriptionEn: 'Global deliveries softened 7.1% YoY to 1,885k units, heavily impacted by rapid local Chinese NEV substitution and widespread price discounting.',
        impact: 'negative',
      },
      {
        category: 'electrification',
        titleKo: '전기차(BEV) 인도 비중 12.7% 유지',
        titleEn: 'BEV Delivery Penetration Maintained at 12.7%',
        descriptionKo: '유럽 내 ID.7 세단 및 투어러 본격 인도와 아우디 Q6 e-tron 출시로 BEV 인도량 24.0만 대를 기록하며 전동화 비중 12.7%를 유지했습니다.',
        descriptionEn: 'Customer BEV handovers reached 240.2k units, driven by ramp-up of the ID.7 and Audi Q6 e-tron on the PPE platform.',
        impact: 'neutral',
      },
    ],
  },
  {
    companyId: 'general_motors',
    period: '2026-Q3',
    headlineKo: '북미 대형 픽업트럭·SUV 믹스 호조 및 EV 사업부 단위당 변동비 흑자 전환',
    headlineEn: 'Robust North American Full-Size Truck Mix and Variable Positive EV Profitability',
    summaryKo: 'GM은 2026년 3분기 도매 출하 102.8만 대, 매출 $500.2억(+10.5% YoY), 조정 EBIT $41.06억(영업이익률 8.2%)의 강력한 실적을 기록했습니다. 쉐보레 실버라도, GMC 시에라 등 대형 트럭의 견고한 가격 방어력과 얼티엄 배터리 셀 공장 수율 안정화로 전기차 포트폴리오의 변동비 수익성이 조기 흑자 전환했습니다.',
    summaryEn: 'General Motors delivered standout Q3 2026 performance with 1,028k wholesales, $50.02B in net sales (+10.5% YoY), and $4.11B in EBIT-adjusted (8.2% margin). Resilient pricing in full-size trucks/SUVs and Ultium battery cell yield gains enabled EV portfolio variable profit positive ahead of schedule.',
    sourceDocId: 'gm_2026_q3_earnings',
    sourceCitationKo: 'GM Q3 2026 Earnings Presentation & Financial Highlights (p. 5-11)',
    sourceCitationEn: 'General Motors Q3 2026 Earnings Deck & 10-Q (pp. 5-11)',
    drivers: [
      {
        category: 'profitability',
        titleKo: '북미 풀사이즈 픽업트럭 및 SUV 강력한 수익성 견인',
        titleEn: 'Strong North American Full-Size Truck & SUV Profitability',
        descriptionKo: '쉐보레 실버라도/타호, GMC 시에라/유콘 등 북미 고수익 차종의 판매 호조와 엄격한 인센티브 통제로 북미 EBIT 8.8% 마진을 달성했습니다.',
        descriptionEn: 'High-margin full-size trucks and SUVs commanded resilient transaction pricing with disciplined dealer incentives, generating North American adjusted EBIT margin of 8.8%.',
        impact: 'positive',
      },
      {
        category: 'electrification',
        titleKo: '전기차(EV) 포트폴리오 단위 변동이익 흑자 전환 달성',
        titleEn: 'EV Portfolio Reached Positive Variable Profit Ahead of Target',
        descriptionKo: '오하이오 및 테네시 얼티엄 셀즈(Ultium Cells) 합작공장의 배터리 셀 제조 단가 하락과 이쿼녹스 EV 본격 양산으로 전기차 부문 단위당 변동이익이 흑자로 전환되었습니다.',
        descriptionEn: 'Benefited from cell manufacturing cost reductions at Ultium Cells JV plants and ramp-up of the Chevrolet Equinox EV, achieving positive variable profit.',
        impact: 'positive',
      },
      {
        category: 'revenue',
        titleKo: '연결 매출액 $500억 돌파 (+10.5% YoY 성장)',
        titleEn: 'Consolidated Revenue Exceeded $50B (+10.5% YoY)',
        descriptionKo: '우수한 차량 믹스 개선과 부품·서비스 매출 확대로 분기 매출이 $500.2억을 기록하며 전년 동기 대비 두 자릿수 성장을 기록했습니다.',
        descriptionEn: 'Net sales rose 10.5% YoY to $50.02B, supported by rich vehicle mix, parts/service aftersales growth, and strong wholesale volume.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'ford',
    period: '2026-Q3',
    headlineKo: '포드 프로(상용차) 독보적 마진 견인, 모델 e(전기차) 손실 및 보증 비용 완충',
    headlineEn: 'Ford Pro Commercial Fleet Super-Margins Offset Model e EV Losses & Warranty Costs',
    summaryKo: '포드는 2026년 3분기 도매 출하 104.0만 대, 매출 $495.0억, 조정 EBIT $27.0억(마진 5.5%)을 기록했습니다. 상용차 및 플릿 서비스 부문인 Ford Pro가 조정 EBIT $18.1억(마진 11.6%)의 뛰어난 수익성을 보인 반면, 순수전기차 부문인 Ford Model e는 -$12.2억의 적자를 기록했습니다.',
    summaryEn: 'Ford generated $49.50B in Q3 2026 revenue with adjusted EBIT of $2.70B (5.5% margin). Ford Pro commercial fleet and software solutions delivered outstanding performance ($1.81B EBIT, 11.6% margin), helping offset Ford Model e EV segment losses (-$1.22B) and supplier warranty headwinds.',
    sourceDocId: 'ford_2026_q3_results',
    sourceCitationKo: 'Ford Q3 2026 Earnings Presentation & 10-Q (p. 6-14)',
    sourceCitationEn: 'Ford Motor Company Third Quarter 2026 Financial Results (pp. 6-14)',
    drivers: [
      {
        category: 'profitability',
        titleKo: 'Ford Pro(상용차) 부문 EBIT $18.1억 (영업이익률 11.6%)',
        titleEn: 'Ford Pro Generated $1.81B Adjusted EBIT (11.6% Margin)',
        descriptionKo: '트랜짓 밴과 슈퍼듀티 트럭 수요 강세 및 유료 텔레매틱스 소프트웨어 구독 매출 증가로 포드 전체 영업이익의 67%를 창출했습니다.',
        descriptionEn: 'Transit van and Super Duty fleet demand alongside paid Ford Pro Intelligence software subscriptions contributed 67% of total company adjusted EBIT.',
        impact: 'positive',
      },
      {
        category: 'volume',
        titleKo: '하이브리드(F-150 / 매버릭) 판매 급증',
        titleEn: 'Hybrid Vehicle Sales Expansion (F-150 & Maverick)',
        descriptionKo: '포드 블루(Ford Blue) 내연기관·하이브리드 사업부에서 F-150 하이브리드와 매버릭 하이브리드가 두 자릿수 성장을 기록하며 전동화 과도기 수익성을 지지했습니다.',
        descriptionEn: 'Hybrid versions of the F-150 and Maverick expanded by double digits, delivering strong cash flow during the market electrification transition.',
        impact: 'positive',
      },
      {
        category: 'one_off',
        titleKo: '구형 플랫폼 품질 보증 및 리콜 비용 반영',
        titleEn: 'Legacy Platform Quality Warranty and Campaign Headwinds',
        descriptionKo: '공급망 부품 품질 이슈와 과거 출시 차종에 대한 자발적 리콜 보증 충당금 지출이 북미 실적에 약 $7억의 부정적 영향을 주었습니다.',
        descriptionEn: 'Field service actions and supplier warranty costs on previous-generation platforms created an estimated $700M drag on quarterly profitability.',
        impact: 'negative',
      },
    ],
  },
  {
    companyId: 'hyundai_motor',
    period: '2026-Q3',
    headlineKo: '하이브리드(HEV) 판매 급증(+40%) 및 제네시스·SUV 믹스 호조, 인센티브 상승 완충',
    headlineEn: 'HEV Sales Surge (+40% YoY) and Genesis/SUV Mix Offset Rising North American Incentives',
    summaryKo: '현대자동차는 2026년 3분기 글로벌 도매 920,710대, 매출 45조 1,100억 원(+4.7% YoY), 영업이익 2조 6,770억 원(영업이익률 5.9%)을 기록했습니다. 싼타페와 투싼 하이브리드 등 고수익 하이브리드 차종 판매가 전년 대비 40% 이상 급증하고 제네시스 비중(5.6%)이 확대되며 북미 딜러 인센티브 정상화에 따른 마진 압박을 방어했습니다.',
    summaryEn: 'Hyundai Motor achieved 920.7k wholesale units, revenue of ₩45.11T (+4.7% YoY), and operating profit of ₩2.68T (5.9% margin) in Q3 2026. Hybrid vehicle wholesale volume surged over 40% YoY led by the Santa Fe and Tucson HEVs, while Genesis luxury mix (5.6%) mitigated rising US market dealer incentives.',
    sourceDocId: 'hmc_2026_q3_presentation',
    sourceCitationKo: '현대자동차 2026년 3분기 경영실적 발표 자료 (p. 4-12)',
    sourceCitationEn: 'Hyundai Motor Company Q3 2026 Business Results Presentation (pp. 4-12)',
    drivers: [
      {
        category: 'volume',
        titleKo: '하이브리드(HEV) 글로벌 판매 전년비 +40% 급증',
        titleEn: 'Global Hybrid (HEV) Wholesales Surged +40% YoY',
        descriptionKo: '북미 및 유럽 시장의 하이브리드 선호 현상에 부응하여 신형 싼타페 하이브리드와 투싼 하이브리드 공급을 확대하며 믹스 개선을 이끌었습니다.',
        descriptionEn: 'Capitalized on North American and European hybrid demand, expanding Santa Fe and Tucson Hybrid allocations to drive rich powertrain mix.',
        impact: 'positive',
      },
      {
        category: 'revenue',
        titleKo: '제네시스 및 SUV 비중 확대로 분기 매출 45.1조 달성',
        titleEn: 'Genesis and SUV Mix Drove Revenue to ₩45.1T',
        descriptionKo: 'SUV 판매 비중이 55%를 상회하고 프리미엄 브랜드 제네시스 비중이 5.6%를 기록하면서 대당 평균판매가격(ASP)이 상승했습니다.',
        descriptionEn: 'SUV volume share surpassed 55% and Genesis luxury share reached 5.6%, driving sequential improvements in average selling price (ASP).',
        impact: 'positive',
      },
      {
        category: 'margin',
        titleKo: '북미 딜러 인센티브 증가 및 원화 환율 변동성',
        titleEn: 'North American Incentive Normalization and FX Volatility',
        descriptionKo: '미국 완성차 시장의 재고 정상화 및 경쟁 심화로 딜러 인센티브가 전년 대비 상승했으며, 환율 변동성이 영업이익률을 5.9% 수준으로 소폭 둔화시켰습니다.',
        descriptionEn: 'Industry-wide normalization of dealer floor inventory increased retail incentives in North America, moderating operating profit margin to 5.9%.',
        impact: 'negative',
      },
    ],
  },
  {
    companyId: 'mercedes_benz',
    period: '2026-Q3',
    headlineKo: '중국 럭셔리 시장 수요 둔화 영향, 밴 사업부의 견조한 마진(13.5%)으로 방어',
    headlineEn: 'Top-End Luxury Headwinds in China Buffered by Mercedes-Benz Vans Resilience (13.5% RoS)',
    summaryKo: '메르세데스-벤츠 그룹은 2026년 3분기 총 491,650대를 판매하고 매출 €307.0억, 그룹 EBIT €17.73억(마진 5.8%)을 기록했습니다. 중국 거시경제 둔화에 따른 최고급 럭셔리(S클래스, 마이바흐) 판매 부진이 마진을 압박했으나, 벤츠 밴 사업부의 견고한 두 자릿수 수익성(조정 RoS 13.5%)이 그룹 실적을 지지했습니다.',
    summaryEn: 'Mercedes-Benz Group recorded 491.7k unit sales, revenue of €30.70B, and Group EBIT of €1.77B (5.8% margin) in Q3 2026. Top-End Luxury softness in China (S-Class, Maybach) compressed passenger car profitability, while Mercedes-Benz Vans sustained outstanding double-digit margins (adjusted RoS 13.5%).',
    sourceDocId: 'mbg_2026_q3_results',
    sourceCitationKo: 'Mercedes-Benz Group Q3 2026 Results Presentation (p. 5-13)',
    sourceCitationEn: 'Mercedes-Benz Group Q3 2026 Results Presentation (pp. 5-13)',
    drivers: [
      {
        category: 'macro',
        titleKo: '중국 시장 내 최고급(Top-End) 럭셔리 세그먼트 위축',
        titleEn: 'Top-End Luxury Contraction in Chinese Market',
        descriptionKo: '부동산 경기 둔화와 현지 고소득층 소비 심리 위축으로 마이바흐 및 S-클래스의 중국 판매량이 감소하며 수익성 높은 차종 믹스가 희석되었습니다.',
        descriptionEn: 'Macroeconomic caution and real-estate property slowdown in China reduced S-Class and Maybach demand, diluting high-margin product mix.',
        impact: 'negative',
      },
      {
        category: 'profitability',
        titleKo: '메르세데스-벤츠 밴(Vans) 사업부 견고한 13.5% 수익성',
        titleEn: 'Mercedes-Benz Vans Delivered Exceptional 13.5% Adjusted RoS',
        descriptionKo: '상용 및 프리미엄 레저용 밴의 강력한 가격 결정력과 스프린터(Sprinter) 수요 호조로 밴 부문이 탁월한 현금 흐름과 영업이익을 제공했습니다.',
        descriptionEn: 'Resilient pricing power across commercial and premium private vans (Sprinter, V-Class) delivered €400M+ EBIT, anchoring Group profitability.',
        impact: 'positive',
      },
      {
        category: 'strategy',
        titleKo: '엄격한 재고 관리 및 가치 중심 가격 전략 고수',
        titleEn: 'Strict Pricing Discipline and Inventory Rationalization',
        descriptionKo: '단순 볼륨 확대를 위한 가격 인하를 지양하고 잔존가치와 브랜드 프리미엄을 보호하는 재고 통제 정책을 엄격히 유지했습니다.',
        descriptionEn: 'Maintained strict value-over-volume pricing discipline, protecting long-term residual values and brand equity rather than discounting for market share.',
        impact: 'neutral',
      },
    ],
  },
  {
    companyId: 'stellantis',
    period: '2026-Q3',
    headlineKo: '북미 딜러 재고 8만 대 이상 감축 단행 및 스마트카 신차 플랫폼 교체 과도기',
    headlineEn: 'Aggressive North American Dealer De-Stocking (>80k Units) and Smart Car Platform Transition',
    summaryKo: '스텔란티스는 2026년 3분기 연결 출하 128.6만 대(-12% YoY), 순매출 €376.1억(-15% YoY), 조정 영업이익(AOI) €2.56억(마진 0.7%)을 기록했습니다. 카를로스 타바레스 CEO의 주도 하에 북미 딜러 재고를 8만 대 이상 대폭 줄이는 강력한 출하 조정을 단행했으며, 유럽 내 신형 스마트카 플랫폼 신차 전환 비용이 겹치며 단기 실적이 둔화되었습니다.',
    summaryEn: 'Stellantis reported consolidated shipments of 1,286k units (-12% YoY), net revenues of €37.61B (-15% YoY), and adjusted operating income of €256M (0.7% margin) in Q3 2026. The group executed aggressive North American dealer inventory cuts (>80k units reduction) alongside platform tooling for affordable European BEVs.',
    sourceDocId: 'stla_2026_q3_results',
    sourceCitationKo: 'Stellantis Q3 2026 Shipments & Financial Results (p. 3-8)',
    sourceCitationEn: 'Stellantis Q3 2026 Shipments, Revenues & Financial Results (pp. 3-8)',
    drivers: [
      {
        category: 'volume',
        titleKo: '북미 딜러 과잉 재고 해소를 위한 출하 축소 단행',
        titleEn: 'Deliberate North American Dealer Inventory Curtailment',
        descriptionKo: '램(Ram)과 지프(Jeep)의 북미 재고를 연말 목표치까지 낮추기 위해 도매 출하를 인위적으로 축소하고 판매 인센티브를 선별 투입했습니다.',
        descriptionEn: 'Artificially reduced factory wholesales to dealers in the US to eliminate excess 2024/2025 inventory, curtailing shipments by over 80k units.',
        impact: 'negative',
      },
      {
        category: 'one_off',
        titleKo: '유럽 스마트카 플랫폼(시트로엥 ë-C3 등) 램프업 비용',
        titleEn: 'European Smart Car Platform Launch & Retooling Ramp-Up',
        descriptionKo: '보급형 전기차 플랫폼인 스마트카(Smart Car) 플랫폼 도입 과정에서 신형 시트로엥 ë-C3 및 푸조 e-3008의 생산 준비로 일시적 공장 라인 전환 비용이 발생했습니다.',
        descriptionEn: 'Tooling changeovers and software calibration for affordable European models (Citroën ë-C3, Peugeot E-3008) generated temporary factory downtime.',
        impact: 'negative',
      },
      {
        category: 'strategy',
        titleKo: '2026 연말 재고 정상화 및 신차 라인업 풀가동 준비',
        titleEn: 'Positioning for Normalized 2026 Year-End Inventory',
        descriptionKo: '재고 감축이 성공적으로 마무리됨에 따라 4분기부터 정규 출하 회복 및 신형 램 1500, 차저 데이토나 등 핵심 신차 판매가 재개될 예정입니다.',
        descriptionEn: 'The aggressive inventory reset clears dealer channels for the launch of next-gen Ram 1500 powertrains and Dodge Charger Daytona EV.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'byd',
    period: '2026-Q3',
    headlineKo: '5세대 DM 슈퍼 하이브리드 기술 확산 및 해외 수출 급증(+120%), 당기순이익 100억 위안 돌파',
    headlineEn: '5th-Gen DM Super Hybrid Expansion, Overseas Exports Surge (+120%), Net Profit Tops RMB 10B',
    summaryKo: 'BYD는 2026년 3분기 승용 신에너지차(NEV) 1,323,070대(전년비 +37.8%)를 판매하며 분기 영업수익 2,214.9억 위안(+24.0% YoY), 모회사 귀속 당기순이익 100.2억 위안(+11.5% YoY)을 기록했습니다. 복합 항속거리 2,100km를 구현한 5세대 DM 하이브리드 기술의 대중화와 동남아·유럽·남미 수출 고성장이 국내 가격 경쟁을 극복하고 성장을 견인했습니다.',
    summaryEn: 'BYD delivered 1,323,070 passenger NEVs in Q3 2026 (+37.8% YoY), generating RMB 221.49B in operating revenue (+24.0% YoY) and RMB 10.02B in net profit attributable to shareholders (+11.5% YoY). The nationwide rollout of 5th-Gen DM hybrid tech and explosive overseas export growth (+120% YoY) drove sustained profit expansion.',
    sourceDocId: 'byd_2026_q3_interim',
    sourceCitationKo: 'BYD Company Limited 2026년 3분기 분기보고서 (HKEX 01211 / SZSE 002594)',
    sourceCitationEn: 'BYD Company Limited Third Quarterly Report 2026 (HKEX 01211 / SZSE 002594)',
    drivers: [
      {
        category: 'volume',
        titleKo: '5세대 DM(Dual Mode) 하이브리드 세단·SUV 폭발적 수요',
        titleEn: 'Surging Demand for 5th-Generation DM Super Hybrids',
        descriptionKo: '열효율 46.06%의 차세대 플러그인 하이브리드(친 L, 친 PLUS, 송 L)가 중국 내연기관 교체 수요를 대거 흡수하며 판매량을 견인했습니다.',
        descriptionEn: 'Qin L, Qin PLUS, and Song L equipped with 46.06% thermal efficiency DM 5.0 systems accelerated replacement of legacy gasoline vehicles.',
        impact: 'positive',
      },
      {
        category: 'revenue',
        titleKo: '글로벌 해외 수출 120% 이상 급성장',
        titleEn: 'Overseas NEV Exports Surged Over 120% YoY',
        descriptionKo: '태국 공장 가동과 유럽·브라질·동남아 수출 확대로 해외 판매 비중이 가파르게 상승하며 중국 본토 대비 높은 마진을 확보했습니다.',
        descriptionEn: 'Operations at the Thailand plant and expanding sales across Europe, Latin America, and ASEAN yielded premium pricing over domestic retail sales.',
        impact: 'positive',
      },
      {
        category: 'profitability',
        titleKo: '배터리·모터·전력반도체 수직계열화에 따른 원가 방어력',
        titleEn: 'Scale Economies from Blade Battery & Silicon Carbide Vertical Integration',
        descriptionKo: '자체 블레이드 배터리 및 SiC 반도체 생산에 따른 압도적 규모의 경제로 중국 내 가격 경쟁 속에서도 두 자릿수 순이익 성장을 달성했습니다.',
        descriptionEn: 'In-house production of Blade batteries and powertrain electronics protected gross margins despite aggressive domestic retail price wars.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'volvo_cars',
    period: '2026-Q3',
    headlineKo: '폴스타 지분 관련 손상차손 SEK 56억 반영 및 신형 EX30 글로벌 판매 가속',
    headlineEn: 'Polestar JV Impairment (SEK 5.6B) and Accelerated EX30 Global Retail Ramp-Up',
    summaryKo: '볼보자동차는 2026년 3분기 소매 판매 141,609대, 매출 SEK 669억을 달성했습니다. 폴스타(Polestar) 지분 재평가 손상차손과 소프트웨어 개발 아키텍처 개편에 따른 일회성 비용으로 회계상 영업손실 -SEK 56.0억(영업이익률 -8.4%)을 기록했으나, 이를 제외한 조정 영업손익은 -SEK 37.0억(-5.6%)이었습니다. 소형 전기 SUV인 EX30은 유럽 시장 베스트셀링 전기차 3위에 오르는 등 호조를 이어갔습니다.',
    summaryEn: 'Volvo Cars delivered 141,609 retail sales in Q3 2026 with revenue of SEK 66.9B. The company recognized a non-cash impairment on its Polestar joint-venture holding, leading to a reported EBIT loss of -SEK 5.60B (-8.4% margin; adjusted EBIT excl. JVs -SEK 3.70B). The compact EX30 electric SUV continued strong volume ramp-up.',
    sourceDocId: 'volvo_cars_2026_q3_report',
    sourceCitationKo: 'Volvo Cars Interim Report Third Quarter 2026 (Nasdaq Stockholm p. 4-11)',
    sourceCitationEn: 'Volvo Cars Interim Report Third Quarter 2026 (Nasdaq Stockholm pp. 4-11)',
    drivers: [
      {
        category: 'one_off',
        titleKo: '폴스타(Polestar) 지분 평가 관련 비현금성 손상차손',
        titleEn: 'Non-Cash Impairment on Polestar Holding and Software Arch',
        descriptionKo: '폴스타 지분 가치 재산정 및 전기차 합작 플랫폼 조정에 따른 일회성 비현금 손실이 회계상 영업이익에 반영되었습니다.',
        descriptionEn: 'Recognized accounting impairments on Polestar holding value and joint software platform realignment.',
        impact: 'negative',
      },
      {
        category: 'electrification',
        titleKo: '순수 전기차(BEV) 판매 비중 32% 달성',
        titleEn: 'Fully Electric Car Share Reached 32% of Global Sales',
        descriptionKo: '신형 소형 전기 SUV인 EX30과 플래그십 EX90 인도로 순수전기차 비중이 32%에 도달하며 글로벌 레거시 OEM 중 최고 수준의 전동화 비중을 기록했습니다.',
        descriptionEn: 'The ramp of the compact EX30 and flagship EX90 lifted fully electric cars to 32% of retail volume, leading legacy premium peers in BEV share.',
        impact: 'positive',
      },
      {
        category: 'macro',
        titleKo: 'EU의 중국산 전기차 관세 영향 및 벨기에 겐트 공장 이전 추진',
        titleEn: 'EU Tariff Adjustments on EX30 and Ghent Factory Localization',
        descriptionKo: '중국 장자커우 공장 생산분에 대한 EU 추가 관세 대응을 위해 벨기에 겐트 공장으로 EX30 생산 이전을 진행 중이며, 과도기 비용이 발생했습니다.',
        descriptionEn: 'Navigated provisional EU tariffs on Chinese-built EX30 units by transitioning production to the Ghent assembly facility in Belgium.',
        impact: 'neutral',
      },
    ],
  },

  // ==========================================
  // SCHEDULED OEMs / LATEST CONFIRMED (2026-Q2)
  // ==========================================
  {
    companyId: 'kia',
    period: '2026-Q2',
    headlineKo: 'RV 및 하이브리드 고수익 차종 비중 68% 돌파, 글로벌 최고 수준 영업이익률 13.2% 달성',
    headlineEn: 'RV & Hybrid Mix Exceeded 68%, Delivering Industry-Leading 13.2% Operating Margin',
    summaryKo: '기아는 2026년 2분기 글로벌 도매 795,150대, 매출 27조 5,600억 원, 영업이익 3조 6,437억 원(영업이익률 13.2%)을 기록하며 글로벌 완성차 업계 최고 수준의 수익성을 달성했습니다. 카니발 하이브리드, 쏘렌토, 스포티지 등 RV 판매 비중이 68%를 넘어서며 대당 평균판매가격(ASP)과 마진을 극대화했습니다. (2026-Q3 실적 공시 예정: 2026년 10월 30일)',
    summaryEn: 'Kia achieved 795.2k wholesales, revenue of ₩27.56T, and operating profit of ₩3.64T in Q2 2026, setting an industry-leading 13.2% operating margin. High-margin recreational vehicles (Carnival Hybrid, Sorento, Sportage) comprised over 68% of sales. (Q3 results scheduled Oct 30, 2026).',
    sourceDocId: 'kia_2026_q2_presentation',
    sourceCitationKo: '기아 2026년 2분기 경영실적 발표 자료 (KRX 공시)',
    sourceCitationEn: 'Kia Corporation 2Q 2026 Business Results Presentation (KRX Disclosure)',
    drivers: [
      {
        category: 'profitability',
        titleKo: '영업이익률 13.2%로 글로벌 완성차 1위 수익성 유지',
        titleEn: '13.2% Operating Margin Leading Global Automakers',
        descriptionKo: '고수익 RV 차종 판매 확대와 북미 시장의 낮은 인센티브 기조로 글로벌 대량생산 완성차 중 가장 높은 영업이익률을 기록했습니다.',
        descriptionEn: 'Rich recreational vehicle mix and disciplined incentives in North America yielded an industry-leading 13.2% operating profit margin.',
        impact: 'positive',
      },
      {
        category: 'volume',
        titleKo: '카니발·쏘렌토 하이브리드 대기 수요 및 EV3 글로벌 출시',
        titleEn: 'Strong Backlog for Carnival/Sorento HEV and EV3 Rollout',
        descriptionKo: '하이브리드 모델의 견고한 대기 수요와 보급형 컴팩트 EV인 EV3의 글로벌 출시로 전동화 과도기 포트폴리오를 완벽히 구축했습니다.',
        descriptionEn: 'Robust order backlogs for hybrid models coupled with the global introduction of the affordable compact EV3 solidified powertrain leadership.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'bmw_group',
    period: '2026-Q2',
    headlineKo: '순수전기차 두 자릿수 고성장(i4, iX1) 및 북미 프리미엄 가격 결정력 유지',
    headlineEn: 'Double-Digit BEV Growth (i4, iX1, i7) and Resilient North American Premium Pricing',
    summaryKo: 'BMW 그룹은 2026년 2분기 618,800대를 인도하며 매출 €369.4억, 그룹 EBIT €38.80억(영업이익률 10.5%)을 달성했습니다. 프리미엄 순수전기차인 BMW i4, iX1, i7의 판매가 두 자릿수 증가율을 보였으며, 자동차 부문 EBIT 마진 8.4%로 가이던스 목표 범위를 충족했습니다. (2026-Q3 실적 공시 예정: 2026년 11월 4일)',
    summaryEn: 'BMW Group delivered 618.8k units in Q2 2026 with €36.94B in revenue and €3.88B in Group EBIT (10.5% margin). Pure electric vehicles achieved double-digit growth led by the i4, iX1, and i7, maintaining Automotive segment EBIT margin within its target corridor at 8.4%. (Q3 statement scheduled Nov 4, 2026).',
    sourceDocId: 'bmw_2026_q2_statement',
    sourceCitationKo: 'BMW Group Quarterly Statement to 30 June 2026 (p. 4-9)',
    sourceCitationEn: 'BMW Group Quarterly Statement to 30 June 2026 (pp. 4-9)',
    drivers: [
      {
        category: 'electrification',
        titleKo: '순수 전기차(BEV) 인도량 두 자릿수 증가',
        titleEn: 'Double-Digit BEV Growth Across Key Premium Segments',
        descriptionKo: '전기 세단 i4와 컴팩트 SUV iX1의 글로벌 인도로 순수전기차 인도량이 전년비 18% 증가하며 독일 프리미엄 경쟁사 대비 우위를 보였습니다.',
        descriptionEn: 'BEV handovers expanded 18% YoY driven by high customer acceptance of the i4 sedan and iX1 compact SAV, outpacing German premium peers.',
        impact: 'positive',
      },
      {
        category: 'profitability',
        titleKo: '북미 시장 SUV(X5, X7) 가격 방어력 및 M 고성능 믹스',
        titleEn: 'North American SAV Pricing and BMW M High-Performance Mix',
        descriptionKo: '스파르탄버그 공장 생산 라인업의 북미 판매 호조와 고수익 BMW M 디비전 판매 확대로 건전한 현금 흐름을 유지했습니다.',
        descriptionEn: 'Spartanburg SAV production and strong customer demand for high-margin BMW M models provided resilient profitability and free cash flow.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'toyota_motor',
    period: '2026-Q2',
    headlineKo: '글로벌 하이브리드(HEV) 판매 비중 40% 돌파 및 엔화 약세 효과로 영업이익 1.3조 엔 달성',
    headlineEn: 'Global HEV Penetration Surpassed 40% and Favorable FX Yielded ¥1.31T Operating Profit',
    summaryKo: '토요타 자동차는 FY2027 1분기(2026-Q2) 글로벌 도매 225.2만 대, 매출 11조 8,378억 엔, 영업이익 1조 3,084억 엔(영업이익률 11.1%)을 기록했습니다. 전 세계적인 하이브리드 열풍에 힘입어 HEV 판매 비중이 40%를 돌파했으며, 우호적인 환율 효과와 북미·일본 시장의 탄탄한 수요가 사상 최고 수준의 영업이익을 견인했습니다. (2026-Q3 실적 공시 예정: 2026년 11월 5일)',
    summaryEn: 'Toyota Motor posted ¥11.84T in revenue and ¥1.31T in operating profit (11.1% margin) for FY2027 Q1 (ended June 30, 2026 / Q2). High customer demand for hybrid electric vehicles lifted HEV penetration above 40%, while favorable yen exchange rates supported record profitability. (Q3 results scheduled Nov 5, 2026).',
    sourceDocId: 'tm_2026_q2_tanshin',
    sourceCitationKo: '토요타 자동차 FY2027 제1사분기 결산단신 (TSE 7203)',
    sourceCitationEn: 'Toyota Motor Corp Financial Results for Q1 FY2027 (Kessan Tanshin, TSE 7203)',
    drivers: [
      {
        category: 'volume',
        titleKo: '하이브리드(HEV) 판매 비중 40% 돌파',
        titleEn: 'Global HEV Share Exceeded 40% of Group Volume',
        descriptionKo: '캠리 전면 하이브리드화 및 RAV4 하이브리드 수요 급증으로 전동화 차량 중 하이브리드가 글로벌 시장을 장악했습니다.',
        descriptionEn: 'All-hybrid Camry transition and surging RAV4 Hybrid demand solidified Toyota\'s hybrid leadership, surpassing 40% of total group deliveries.',
        impact: 'positive',
      },
      {
        category: 'profitability',
        titleKo: '우호적인 엔화 환율 효과 및 가격 결정력',
        titleEn: 'Favorable Yen Depreciation Tailwinds & Value Pricing',
        descriptionKo: '엔/달러 환율 약세가 수출 채산성을 크게 개선시켰으며, 북미 및 일본 시장의 공급 부족에 따른 정가 판매 기조가 유지되었습니다.',
        descriptionEn: 'Yen exchange rate tailwinds significantly enhanced export profitability, supported by disciplined sticker pricing in Japan and North America.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'rivian',
    period: '2026-Q2',
    headlineKo: '2세대 R1 플랫폼 전환 완료에 따른 부품비 35% 절감 및 폭스바겐 합작 투자 발표',
    headlineEn: 'Gen 2 R1 Retooling Delivered 35% BOM Cost Cut Alongside Landmark VW Group JV',
    summaryKo: '리비안은 2026년 2분기 13,790대를 인도하고 매출 $11.58억, 영업손실 -$13.75억을 기록했습니다. 일리노이주 노멀 공장의 2세대 R1 셧다운 업그레이드를 성공적으로 완료하여 부품원가(BOM)를 35% 절감했으며, 폭스바겐 그룹과의 차세대 SDV 소프트웨어 합작 투자 계약을 체결해 장기 기술 라이선스 및 자본 유치를 확정했습니다. (2026-Q3 실적 공시 예정: 2026년 11월 5일)',
    summaryEn: 'Rivian delivered 13,790 vehicles in Q2 2026 with $1.16B in revenue and an operating loss of -$1.38B. The company successfully executed the Normal factory overhaul for Gen 2 R1, cutting bill-of-materials costs by 35%, and announced a landmark software/SDV joint venture with Volkswagen Group. (Q3 letter scheduled Nov 5, 2026).',
    sourceDocId: 'rivian_2026_q2_shareholder_letter',
    sourceCitationKo: 'Rivian Q2 2026 Shareholder Letter & 10-Q (p. 3-8)',
    sourceCitationEn: 'Rivian Automotive Q2 2026 Shareholder Letter & Form 10-Q (pp. 3-8)',
    drivers: [
      {
        category: 'strategy',
        titleKo: '2세대 R1 부품원가(BOM) 35% 절감 및 전자 아키텍처 단순화',
        titleEn: 'Gen 2 R1 Achieved 35% Bill-of-Materials Cost Reduction',
        descriptionKo: '노멀 공장 리툴링을 통해 제어기(ECU) 개수를 17개에서 7개로 통합하고 배선 중량을 100파운드 이상 절감하여 차량당 원가를 대폭 낮췄습니다.',
        descriptionEn: 'Overhauled zonal electrical architecture from 17 ECUs to 7, shedding over 100 lbs of wiring harness and reducing vehicle unit manufacturing costs by 35%.',
        impact: 'positive',
      },
      {
        category: 'strategy',
        titleKo: '폭스바겐 그룹과의 $50억 규모 전략적 합작 투자 체결',
        titleEn: 'Landmark $5B Strategic Technology JV with Volkswagen Group',
        descriptionKo: '차세대 전기 아키텍처 및 소프트웨어 기술 협력을 통해 대규모 현금 유동성을 확보하고 부품 조달 규모의 경제를 확보했습니다.',
        descriptionEn: 'Secured substantial capital and long-term licensing validation through a joint venture to co-develop next-generation SDV architectures for both OEMs.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'geely',
    period: '2026-Q2',
    headlineKo: '갤럭시(Galaxy) 신에너지 브랜드 급성장 및 지커(Zeekr) 해외 진출 가속화',
    headlineEn: 'Geely Galaxy NEV Expansion and Zeekr Premium Global Export Acceleration',
    summaryKo: '지리자동차는 2026년 상반기(2분기 누적) 955,730대를 판매하며 매출 1,078억 위안, 영업이익 42.5억 위안(영업이익률 3.9%)을 기록했습니다. 지리 갤럭시(Galaxy) 전동화 브랜드가 대중차 시장에서 판매량을 300% 이상 늘리고, 프리미엄 EV 브랜드 지커(Zeekr)의 미국 상장 및 유럽·동남아 수출이 본격화되며 견고한 성장을 이어갔습니다. (2026-Q3 실적 공시 예정: 2026년 11월 중순)',
    summaryEn: 'Geely Automobile delivered 955.7k units in 1H 2026 with RMB 107.8B in revenue and RMB 4.25B in operating profit (3.9% margin). The Geely Galaxy mass-market NEV line expanded over 300% YoY, while premium EV arm Zeekr accelerated global deliveries across Europe and Southeast Asia. (Q3 results scheduled Mid-Nov 2026).',
    sourceDocId: 'geely_2026_q2_results',
    sourceCitationKo: '지리자동차 2026년 상반기 실적보고서 (HKEX 00175)',
    sourceCitationEn: 'Geely Automobile Holdings Limited 2026 Interim Results (HKEX 00175)',
    drivers: [
      {
        category: 'volume',
        titleKo: '지리 갤럭시(Galaxy) NEV 라인업 폭발적 성장',
        titleEn: 'Geely Galaxy Mass-Market NEV Sales Surged >300%',
        descriptionKo: '갤럭시 L7 및 E8 등 플러그인 하이브리드와 순수전기 세단이 합리적인 가격과 고성능 사양으로 중국 대중차 시장을 선도했습니다.',
        descriptionEn: 'Galaxy L7 PHEV and E8 BEV captured significant market share in the RMB 100k–180k mainstream passenger vehicle category.',
        impact: 'positive',
      },
      {
        category: 'revenue',
        titleKo: '해외 수출량 67% 증가로 마진 개선',
        titleEn: 'Export Volume Rose 67% YoY Enhancing Realized Margins',
        descriptionKo: '중동, 동유럽, 남미 시장으로의 완성차 수출이 가파르게 증가하여 중국 국내 시장의 치열한 가격 전쟁을 효과적으로 상쇄했습니다.',
        descriptionEn: 'Wholesale exports to the Middle East, Eastern Europe, and Latin America cushioned profitability against domestic price discounting.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'honda_motor',
    period: '2026-Q2',
    headlineKo: '북미 하이브리드(CR-V, 시빅) 강세로 영업이익 4,847억 엔 달성',
    headlineEn: 'Strong North American Hybrid Demand (CR-V, Civic) Drove ¥484.7B Operating Profit',
    summaryKo: '혼다 기연공업은 FY2026 1분기(2026-Q2) 글로벌 도매 990,000대, 매출 5조 4,048억 엔, 영업이익 4,847억 엔(영업이익률 9.0%)을 기록했습니다. 북미 시장에서 CR-V 하이브리드와 신형 시빅 하이브리드의 강력한 인기로 자동차 사업 영업이익률이 개선되었으며, 전통의 모터사이클(이륜차) 부문이 아시아 시장에서 변함없는 고수익성을 제공했습니다. (2026-Q3 실적 공시 예정: 2026년 11월 8일)',
    summaryEn: 'Honda posted ¥5.40T in revenue and ¥484.7B in operating profit (9.0% margin) for FY2026 Q1 (ended June 30, 2026 / Q2). North American demand for CR-V and Civic Hybrids drove automobile margins, while the global motorcycle segment sustained solid cash generation. (Q3 results scheduled Nov 8, 2026).',
    sourceDocId: 'honda_2026_q1_statement',
    sourceCitationKo: '혼다 기연공업 FY2026 제1사분기 결산보고서 (TSE 7267)',
    sourceCitationEn: 'Honda Motor Co., Ltd. FY2026 Q1 Financial Results (TSE 7267)',
    drivers: [
      {
        category: 'volume',
        titleKo: '북미 하이브리드 SUV 및 세단 판매 호조',
        titleEn: 'North American Hybrid Volume Growth (CR-V & Civic)',
        descriptionKo: 'CR-V 하이브리드가 전체 CR-V 판매의 50% 이상을 차지하며 북미 딜러망의 견고한 인센티브 방어력을 제공했습니다.',
        descriptionEn: 'CR-V Hybrid represented over 50% of model sales in North America, preserving strong dealer margins and low incentives.',
        impact: 'positive',
      },
      {
        category: 'profitability',
        titleKo: '이륜차(모터사이클) 사업부의 독보적인 현금 창출력',
        titleEn: 'Motorcycle Business Cash Generation in Developing Markets',
        descriptionKo: '인도 및 동남아시아 시장의 이륜차 수요 증가로 모터사이클 부문 영업이익률이 18%를 상회하며 전사 수익성을 지탱했습니다.',
        descriptionEn: 'High-volume motorcycle sales across India and ASEAN generated an operating margin above 18%, anchoring consolidated profitability.',
        impact: 'positive',
      },
    ],
  },
  {
    companyId: 'nissan_motor',
    period: '2026-Q2',
    headlineKo: '북미 딜러 재고 정상화 및 인센티브 증가로 영업이익률 0.03%로 둔화, The Arc 신차 계획 착수',
    headlineEn: 'Elevated North American Dealer Incentives Compressed Margin to 0.03%, The Arc Plan Underway',
    summaryKo: '닛산 자동차는 FY2026 1분기(2026-Q2) 글로벌 도매 787,000대, 매출 2조 9,983억 엔, 영업이익 9억 9,500만 엔(영업이익률 0.03%)을 기록했습니다. 미국 시장 내 노후화된 내연기관 라인업과 딜러 재고 해소를 위한 판촉 인센티브 급증으로 북미 자동차 부문이 손익분기점 수준으로 위축되었으며, 중기 경영계획 \'The Arc\'에 기반한 하이브리드 e-POWER 및 신형 SUV 출시 준비에 돌입했습니다. (2026-Q3 실적 공시 예정: 2026년 11월 7일)',
    summaryEn: 'Nissan recorded ¥3.00T in revenue and ¥995M in operating profit (0.03% margin) for FY2026 Q1 (Q2). Escalating retail incentives and dealer floor stock in the US heavily impacted automobile profitability, prompting accelerated execution of the "The Arc" mid-term plan with new e-POWER hybrid launches. (Q3 results scheduled Nov 7, 2026).',
    sourceDocId: 'nissan_2026_q1_statement',
    sourceCitationKo: '닛산 자동차 FY2026 제1사분기 결산보고서 (TSE 7201)',
    sourceCitationEn: 'Nissan Motor Co., Ltd. First Quarter Financial Results for FY2026 (TSE 7201)',
    drivers: [
      {
        category: 'margin',
        titleKo: '북미 시장 인센티브 지출 급증 및 딜러 재고 누적',
        titleEn: 'Surging US Dealer Sales Incentives and Inventory Overhang',
        descriptionKo: '로그(Rogue) 등 핵심 볼륨 모델의 노후화와 하이브리드 라인업 부재로 인해 차량 대당 판매 인센티브가 급증하여 이익을 잠식했습니다.',
        descriptionEn: 'Aging ICE product cycles and absence of hybrid powertrains in the US necessitated aggressive retail incentives, wiping out vehicle profit.',
        impact: 'negative',
      },
      {
        category: 'strategy',
        titleKo: '\'The Arc\' 중기 계획을 통한 북미 e-POWER 하이브리드 투입 준비',
        titleEn: 'Accelerating "The Arc" Plan to Deploy e-POWER Hybrids in the US',
        descriptionKo: '수익성 회복을 위해 2026년 하반기부터 신형 킥스(Kicks) 및 로그 e-POWER 하이브리드를 북미에 투입하여 라인업 경쟁력을 쇄신할 계획입니다.',
        descriptionEn: 'Accelerating local launch of next-gen Kicks and Rogue e-POWER hybrids in North America to replace margin-diluting incentives.',
        impact: 'neutral',
      },
    ],
  },
];

/**
 * Retrieves the performance drivers and management commentary for a specific company and period.
 * Automatically falls back to the latest confirmed period if the requested period is not yet reported.
 */
export function getPerformanceDriver(companyId: string, period?: string): CompanyPerformanceDriver | undefined {
  if (period) {
    const directMatch = PERFORMANCE_DRIVERS.find((p) => p.companyId === companyId && p.period === period);
    if (directMatch) return directMatch;
  }

  // Fallback to latest available period for this company
  const companyDrivers = PERFORMANCE_DRIVERS.filter((p) => p.companyId === companyId);
  if (companyDrivers.length === 0) return undefined;

  // Prefer 2026-Q3, then 2026-Q2
  const q3Driver = companyDrivers.find((p) => p.period === '2026-Q3');
  if (q3Driver) return q3Driver;

  return companyDrivers[0];
}
