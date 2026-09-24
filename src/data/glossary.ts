export interface GlossaryTerm {
  term: string;
  fullName: string;
  fullNameKo: string;
  category: 'automotive' | 'financial' | 'accounting';
  definitionEn: string;
  definitionKo: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'OEM',
    fullName: 'Original Equipment Manufacturer',
    fullNameKo: '완성차 제조사',
    category: 'automotive',
    definitionEn: 'A company that manufactures and markets motor vehicles under its own brand names (e.g. Volkswagen, Toyota, Tesla, Hyundai).',
    definitionKo: '자사 브랜드를 통해 완성차를 설계, 생산 및 판매하는 완성차 제조 기업 (예: 폭스바겐, 토요타, 테슬라, 현대차 등).',
  },
  {
    term: 'BEV',
    fullName: 'Battery Electric Vehicle',
    fullNameKo: '순수 배터리 전기차',
    category: 'automotive',
    definitionEn: 'An all-electric vehicle powered solely by an onboard rechargeable chemical battery pack with zero tailpipe emissions.',
    definitionKo: '내연기관 없이 배터리의 전기에너지만으로 모터를 구동하여 주행하는 100% 순수 전기차.',
  },
  {
    term: 'PHEV',
    fullName: 'Plug-in Hybrid Electric Vehicle',
    fullNameKo: '플러그인 하이브리드 자동차',
    category: 'automotive',
    definitionEn: 'A hybrid vehicle combining an internal combustion engine with an electric motor and battery that can be recharged from an external power grid.',
    definitionKo: '외부 전원으로 배터리를 충전하여 일정 거리를 순수 전기로 주행하고, 배터리 소진 시 내연기관 엔진으로 주행하는 복합 차량.',
  },
  {
    term: 'HEV',
    fullName: 'Hybrid Electric Vehicle',
    fullNameKo: '하이브리드 자동차',
    category: 'automotive',
    definitionEn: 'A vehicle that pairs an ICE with an electric powertrain charged internally via regenerative braking and engine power without external plug-in charging.',
    definitionKo: '엔진 구동 및 회생 제동으로 배터리를 자체 충전하며 모터와 엔진을 함께 사용하는 하이브리드 차량 (외부 플러그 충전 불가).',
  },
  {
    term: 'NEV',
    fullName: 'New Energy Vehicle',
    fullNameKo: '신에너지차 (중국 규정)',
    category: 'automotive',
    definitionEn: 'China regulatory classification comprising pure electric (BEV), plug-in hybrid (PHEV), and fuel cell (FCEV) passenger and commercial vehicles.',
    definitionKo: '중국 공업정보화부(MIIT) 기준 친환경차 분류로, 순수전기차(BEV), 플러그인 하이브리드(PHEV), 수소연료전지차(FCEV)를 통합한 개념.',
  },
  {
    term: 'EBIT',
    fullName: 'Earnings Before Interest and Taxes',
    fullNameKo: '이자 및 세전 영업이익',
    category: 'financial',
    definitionEn: 'An indicator of operational profitability calculated as total revenue minus operating expenses, excluding interest and income taxes.',
    definitionKo: '이자 비용과 법인세를 공제하기 전 기업의 본업(영업) 활동에서 발생한 순수 영업이익 지표.',
  },
  {
    term: 'RoS',
    fullName: 'Return on Sales (Operating Margin)',
    fullNameKo: '매출액 영업이익률',
    category: 'financial',
    definitionEn: 'Ratio measuring operational efficiency by expressing operating profit (EBIT) as a percentage of total net revenue.',
    definitionKo: '총 매출액 중 순수 영업이익이 차지하는 비율 (%)로, 완성차 기업의 제조 효율성과 가격 결정력을 나타내는 핵심 지표.',
  },
  {
    term: 'AOI',
    fullName: 'Adjusted Operating Income',
    fullNameKo: '조정 영업이익',
    category: 'accounting',
    definitionEn: 'Operating profit metric utilized by automakers like Stellantis that excludes one-off restructuring charges, litigation, and non-recurring items.',
    definitionKo: '스텔란티스 등이 주로 사용하는 지표로, 구조조정 비용이나 일회성 손익을 제외하고 지속적인 사업 본질의 영업성과를 측정한 지표.',
  },
  {
    term: 'FCF',
    fullName: 'Free Cash Flow (Automotive)',
    fullNameKo: '자동차 부문 잉여현금흐름',
    category: 'financial',
    definitionEn: 'Net operating cash flow generated specifically by car manufacturing operations minus capital expenditure (Capex) and capitalized R&D.',
    definitionKo: '금융 자회사를 제외한 자동차 제조 본업에서 창출된 영업현금흐름에서 설비투자(Capex) 및 자본화 개발비를 차감한 순수 가용 현금.',
  },
  {
    term: 'YoY',
    fullName: 'Year-over-Year',
    fullNameKo: '전년 동기 대비 증감률',
    category: 'financial',
    definitionEn: 'Mathematical comparison of a financial or volume metric for one period against the identical calendar period in the previous year.',
    definitionKo: '당해 분기 또는 연간 실적을 전년도 동일 기간과 비교하여 산출한 성장률 (계절적 왜곡 제거).',
  },
  {
    term: 'QoQ',
    fullName: 'Quarter-over-Quarter',
    fullNameKo: '직전 분기 대비 증감률',
    category: 'financial',
    definitionEn: 'Comparison of financial or operational metrics between the current quarter and the immediately preceding consecutive quarter.',
    definitionKo: '당해 분기 실적을 바로 직전 분기와 비교한 증감률.',
  },
  {
    term: 'Capex',
    fullName: 'Capital Expenditure',
    fullNameKo: '자본적 지출 (설비투자)',
    category: 'accounting',
    definitionEn: 'Funds utilized by an OEM to acquire, upgrade, and maintain physical assets such as gigafactories, stamping lines, and tooling.',
    definitionKo: '공장 신설, 배터리 기가팩토리, 프레스/도장 라인 등 생산 설비의 취득 및 개보수에 투입된 현금 지출액.',
  },
  {
    term: 'R&D',
    fullName: 'Research and Development',
    fullNameKo: '연구개발비',
    category: 'accounting',
    definitionEn: 'Corporate investments directed toward vehicle software architectures, battery chemistry, autonomy, and platform engineering.',
    definitionKo: '차량용 소프트웨어(SDV), 배터리 플랫폼, 자율주행 알고리즘 및 신차 개발에 투입된 순수 연구개발 비용.',
  },
  {
    term: 'IFRS',
    fullName: 'International Financial Reporting Standards',
    fullNameKo: '국제회계기준',
    category: 'accounting',
    definitionEn: 'Global accounting framework adopted by European, Korean, and international automakers allowing selective R&D capitalization.',
    definitionKo: '유럽, 한국, 일본 등 주요 글로벌 기업이 채택한 회계기준으로, 요건 충족 시 개발비의 자산화가 허용됨.',
  },
  {
    term: 'US GAAP',
    fullName: 'US Generally Accepted Accounting Principles',
    fullNameKo: '미국 일반회계기준',
    category: 'accounting',
    definitionEn: 'United States accounting standards followed by Tesla, GM, and Ford requiring immediate expensing of almost all R&D investments.',
    definitionKo: '미국 SEC 관할 기업(테슬라, GM, 포드 등)이 따르는 회계기준으로, 거의 모든 R&D 비용을 발생 즉시 당기 비용으로 처리함.',
  },
  {
    term: 'SDV',
    fullName: 'Software Defined Vehicle',
    fullNameKo: '소프트웨어 중심 자동차',
    category: 'automotive',
    definitionEn: 'A modern vehicle whose features, functionality, and performance can be continuously upgraded over-the-air (OTA) via centralized software.',
    definitionKo: '중앙 집중형 전장 아키텍처와 무선 소프트웨어 업데이트(OTA)를 기반으로 기능과 성능이 지속적으로 진화하는 차세대 자동차.',
  },
];

export const GLOSSARY_MAP: Record<string, GlossaryTerm> = GLOSSARY_TERMS.reduce(
  (acc, term) => {
    acc[term.term] = term;
    return acc;
  },
  {} as Record<string, GlossaryTerm>
);
