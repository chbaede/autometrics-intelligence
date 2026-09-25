import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'ko';

export interface Translations {
  nav: {
    overview: string;
    comparison: string;
    regional: string;
    guidance: string;
    sources: string;
    coverage: string;
    glossary: string;
    activeOems: string;
    verifiedIr: string;
    mainHub: string;
    mainHubDesc: string;
  };
  global: {
    badge: string;
    title: string;
    subtitle: string;
    coveredOems: string;
    reportingPeriod: string;
    bevLeader: string;
    marginLeader: string;
    periodFilter: string;
    oemFilter: string;
    whyThisNumber: string;
    closeModal: string;
    originalLabel: string;
    reportedValue: string;
    sourceCitation: string;
    accountingBasis: string;
    openOfficialDoc: string;
    quickDirectory: string;
    viewDashboard: string;
  };
  charts: {
    salesVolume: string;
    salesSubtitle: string;
    operatingMargin: string;
    marginSubtitle: string;
    bevShare: string;
    bevSubtitle: string;
    guidanceCorridor: string;
    guidanceSubtitle: string;
    historicalTrend: string;
    historicalSubtitle: string;
    revenueVsMargin: string;
    revenueVsMarginSubtitle: string;
    powertrainMix: string;
    powertrainMixSubtitle: string;
    sourceFooter: string;
  };
  terms: {
    acronymExplainer: string;
    glossaryTitle: string;
    searchGlossary: string;
    category: string;
    automotive: string;
    financial: string;
    accounting: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    nav: {
      overview: 'Overview',
      comparison: 'OEM Comparison',
      regional: 'Regional Analysis',
      guidance: 'Guidance & Outlook',
      sources: 'Source Explorer',
      coverage: 'Coverage Matrix',
      glossary: 'Glossary & Acronyms',
      activeOems: '14 Global OEMs Active',
      verifiedIr: 'Verified IR Data (Q2 2026)',
      mainHub: 'Main Hub',
      mainHubDesc: 'Back to Yocto Main Hub',
    },
    global: {
      badge: 'Official IR Disclosures • Audit-Backed (Latest: 2026-Q2)',
      title: 'Global OEM Performance Intelligence',
      subtitle: 'Consolidated vehicle volume, electrification adoption, operating profit margins, and forward-looking guidance synthesized strictly from official quarterly filings and investor presentations.',
      coveredOems: 'OEMs Covered',
      reportingPeriod: 'Reporting Period',
      bevLeader: 'BEV Share Leader',
      marginLeader: 'Top Operating Margin',
      periodFilter: 'Period:',
      oemFilter: 'OEMs:',
      whyThisNumber: 'Why this number?',
      closeModal: 'Close Audit Inspector',
      originalLabel: 'Original Label',
      reportedValue: 'Reported Value',
      sourceCitation: 'Source Citation',
      accountingBasis: 'Accounting Basis',
      openOfficialDoc: 'Open Official Document',
      quickDirectory: 'Global OEM Intelligence Dossiers',
      viewDashboard: 'View Dashboard',
    },
    charts: {
      salesVolume: 'Global Vehicle Deliveries',
      salesSubtitle: 'Customer deliveries and wholesale shipments (thousand units)',
      operatingMargin: 'Operating Profit / EBIT Margin',
      marginSubtitle: 'Core operating profitability as percentage of sales revenue (%)',
      bevShare: 'Battery Electric Vehicle (BEV) Delivery Share',
      bevSubtitle: 'Pure all-electric deliveries as % of total vehicle sales volume',
      guidanceCorridor: '2026 Annual Operating / EBIT Margin Target Guidance Corridors',
      guidanceSubtitle: 'Official management target ranges (%) with midpoint indicators',
      historicalTrend: 'Multi-Period Performance Trend',
      historicalSubtitle: 'Tracking historical quarterly and annual trajectory (2024 - 2026)',
      revenueVsMargin: 'Volume vs. Operating Profitability Matrix',
      revenueVsMarginSubtitle: 'Delivery volume (x-axis) vs operating margin % (y-axis)',
      powertrainMix: 'Electrification Powertrain Mix',
      powertrainMixSubtitle: 'Pure BEV, Plug-in Hybrid (PHEV), and ICE volume distribution',
      sourceFooter: 'Source: Official OEM IR Filings & Regulatory Announcements',
    },
    terms: {
      acronymExplainer: 'Glossary & Acronym Definitions',
      glossaryTitle: 'Automotive & Financial Terminology Dictionary',
      searchGlossary: 'Search abbreviations or terms (e.g. BEV, EBIT, OEM)...',
      category: 'Category',
      automotive: 'Automotive & SDV',
      financial: 'Financial Metrics',
      accounting: 'Accounting Standards',
    },
  },
  ko: {
    nav: {
      overview: '글로벌 오버뷰',
      comparison: 'OEM 실적 비교',
      regional: '지역별 시장 분석',
      guidance: '경영진 가이던스',
      sources: '공식 IR 출처 라이브러리',
      coverage: '데이터 수집 매트릭스',
      glossary: '용어 및 약자 사전',
      activeOems: '글로벌 14대 OEM 검증 완료',
      verifiedIr: '공식 IR 데이터 검증 (2026.Q2 최신)',
      mainHub: '메인 허브',
      mainHubDesc: 'Yocto 메인 허브로 이동',
    },
    global: {
      badge: '공식 IR 공시 기반 • 100% 원문 인용 검증 (2026.Q2 최신)',
      title: '글로벌 완성차 OEM 실적 및 투자 인텔리전스',
      subtitle: '공식 분기 재무제표, 연간 사업보고서, 실적 발표회(Earnings Call) 자료를 엄격하게 수집하여 분석한 완성차 판매량, 전동화 점유율, 영업이익률 및 연간 가이던스 대시보드.',
      coveredOems: '분석 대상 OEM',
      reportingPeriod: '기준 공시 기간',
      bevLeader: '전기차(BEV) 비중 1위',
      marginLeader: '최고 영업이익률',
      periodFilter: '공시 주기:',
      oemFilter: '완성차 제조사:',
      whyThisNumber: '산식 및 출처 확인 (Why?)',
      closeModal: '감사 검증 팝업 닫기',
      originalLabel: 'IR 원문 표기명',
      reportedValue: '공시 실적 수치',
      sourceCitation: '출처 인용 문서',
      accountingBasis: '회계 기준 및 통화',
      openOfficialDoc: '공식 IR 원문 보기',
      quickDirectory: '글로벌 OEM 기업별 심층 분석 대시보드',
      viewDashboard: '대시보드 바로가기',
    },
    charts: {
      salesVolume: '글로벌 완성차 판매량 및 인도 실적',
      salesSubtitle: '고객 인도량 및 도매 출하량 기준 (천 대 단위)',
      operatingMargin: '영업이익률 (EBIT Margin / Return on Sales)',
      marginSubtitle: '총 매출액 대비 본업 영업이익 비율 (%)',
      bevShare: '순수 배터리 전기차(BEV) 인도 비중',
      bevSubtitle: '전체 차량 인도량 중 100% 순수 배터리 전기차 점유율 (%)',
      guidanceCorridor: '2026년 연간 영업이익률 목표 가이던스 밴드',
      guidanceSubtitle: '경영진 공식 가이던스 목표 범위 (%) 및 중앙값 지표',
      historicalTrend: '분기 및 연간 다변수 실적 추이',
      historicalSubtitle: '분기별 매출액 및 수익성 궤적 시각화 (2024 - 2026)',
      revenueVsMargin: '판매 규모 vs. 수익성 4분면 매트릭스',
      revenueVsMarginSubtitle: '판매량(X축) 대비 영업이익률(Y축) 상관관계',
      powertrainMix: '파워트레인 전동화 구성비 (BEV vs PHEV vs 내연기관)',
      powertrainMixSubtitle: '순수전기차, 플러그인 하이브리드, 일반 내연기관 볼륨 구성',
      sourceFooter: '출처: 각 완성차 제조사 공식 IR 및 규제기관 공시 자료',
    },
    terms: {
      acronymExplainer: '약어 및 전문 용어 풀이',
      glossaryTitle: '오토모티브 & 재무 핵심 용어 사전',
      searchGlossary: '약어 또는 용어 검색 (예: BEV, EBIT, OEM, FCF)...',
      category: '분류',
      automotive: '자동차 및 전장(SDV)',
      financial: '재무 및 수익성 지표',
      accounting: '회계 기준 및 공시',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('autometrics_language') as Language | null;
    if (saved === 'en' || saved === 'ko') return saved;
    return 'ko'; // Default to Korean for localized experience
  });

  useEffect(() => {
    localStorage.setItem('autometrics_language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'ko' : 'en'));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = TRANSLATIONS[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
