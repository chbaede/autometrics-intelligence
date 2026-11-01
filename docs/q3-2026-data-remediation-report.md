# AutoMetrics Intelligence — 2026 Q3 실적 데이터 정확성 및 UI 개선 최종 검증 보고서

**보고서 작성일:** 2026-11-01  
**대상 저장소:** `chbaede/autometrics-intelligence`  
**기준 브랜치:** `main` (HEAD: `9a9280b`)  
**검증 판정:** **PASS** (12개 공시 완료 OEM 공식 원문 검증 완료 / 4개 미공시 OEM 공식 발표 예정 스케줄 엄격 분리)

---

## 1. 변경된 파일 목록

| 파일 경로 | 구분 | 주요 변경 내역 |
|---|---|---|
| `src/data/observations.ts` | Data | Kia 2026-Q3 도매/소매 판매량 구분, BEV 비중(14.8%) 소매 기준 정정, 순이익 라벨 비지배지분(NCI) 명시, 2025-Q3 비교 순이익 NCI 반영, 혼합 비중(8.9%) 제거 |
| `src/data/sources.ts` | Data | Kia 2026-Q3 공식 출처 클레임 14.8% 반영, Kia 2025-Q3 혼합 비중 8.9% 클레임 제거 (총 클레임 182건 일치) |
| `src/utils/metricCalculations.ts` | Core Engine | BEV 비중 triplet 매칭 시 도매/소매 기준 분리 및 단일 기준 결측 처리 강화 |
| `src/utils/dataFreshness.ts` | Core Engine | 5개 독립 일자 분리 (`reportingPeriod`, `sourcePublishedAt`, `sourceLastCheckedAt`, `dataUpdatedAt`, `calculatedAt`), OEM별 필수 지표 커버리지 계산 엔진, 3단계 관측값 검증 함수 추가 |
| `src/pages/CompanyDashboardPage.tsx` | UI / Page | 상단 Provenance Bar 전면 개편 (5개 독립 일자 표기, 필수 지표 충족률 배지, 공식 IR 출처 다이렉트 링크) |
| `src/pages/GlobalOverviewPage.tsx` | UI / Page | 2026 Q3 공시 현황 센터 신설 (7대 핵심 지표 카드 및 16개 OEM 상태 대시보드 테이블) |
| `src/pages/DataCoveragePage.tsx` | UI / Page | 5대 커버리지 지표(출처/관측값/공식검증/필수지표/계산검증) 카드 및 16개 OEM 전수 Q3 감사 매트릭스 표 추가 |
| `src/components/metrics/ProvenanceModal.tsx` | UI / Modal | 15개 감사 필드 표준 모달 구현 (원문 라벨, 원문 인용문, DB 저장값, 단위, 통화, 기간, 회계기준, 판매기준, 출처 문서, 출처 위치, 발표일, 감사일, 갱신일, 검증방식, 계산 공식) |
| `tests/company-quarterly-dashboard.test.ts` | Test | Suite 13 Kia 정정값 검증(14.8%, NCI 라벨), Suite 17 전 OEM Q3 신선도 및 필수 지표 100% 충족 회귀 테스트 추가 |
| `tests/scope-exceptions.test.ts` | Test | Test 237i 클레임 수 182개 정합성 및 동적 감사 리포트 블로킹 0건 회귀 테스트 갱신 |
| `docs/data-audit-report.md` | Doc | 최신 감사 리포트 자동 생성 |
| `docs/data-integrity-report.md` | Doc | 데이터 무결성 검증 리포트 자동 생성 |
| `docs/audit-report.json` | Doc | 기계 판독용 감사 결과 JSON 갱신 |

---

## 2. 수정한 Kia 데이터 상세

### 2.1 공식 원문 대조 및 정정 결과 (2026-Q3)
- **공식 출처:** [Kia Global Newsroom View 161963](https://worldwide.kia.com/en/newsroom/view/?id=161963) 및 [Kia IR](https://worldwide.kia.com/ko/company/investor-relations)
- **공식 발표일:** 2026-10-30

| 지표명 | 기존 저장값 | 수정 후 공식값 | 판매/회계 기준 | 비고 및 검증 근거 |
|---|---|---|---|---|
| **매출액 (Revenue)** | 31,597,400M KRW | **31,597,400M KRW** | Consolidated / Reported | ₩31.5974조 (공식 보도자료 일치) |
| **영업이익 (Operating Profit)** | 1,818,300M KRW | **1,818,300M KRW** | Consolidated / Reported | ₩1.8183조 (공식 보도자료 일치) |
| **영업이익률 (Operating Margin)** | 5.8% | **5.8%** | Consolidated / Reported | 1,818,300 / 31,597,400 = 5.75% → 5.8% 반올림 |
| **당기순이익 (Net Income)** | 1,285,500M KRW | **1,285,500M KRW** | Consolidated / Reported | **라벨 명시 정정:** `Consolidated net profit (including non-controlling interests) / 당기순이익(비지배지분 포함)`. 보도자료 표기 기준 명확화 |
| **글로벌 도매 판매량 (Wholesale Deliveries)** | 847.36k | **847.36k (847,355대)** | wholesale_shipments | 공식 글로벌 도매 판매량 수치 |
| **순수 전기차 판매량 (BEV Deliveries)** | 123.0k | **123.0k (123,000대)** | **retail_deliveries** | **정의 정정:** 공식 보도자료 "EV retail sales reached 123,000 units (+75.4% YoY)"에 부합하도록 소매 판매로 명시 |
| **글로벌 소매 판매량 (Retail Deliveries)** | 미등록 | **약 829,000대** | retail_deliveries | 공식 보도자료 "Retail sales stood at approximately 829,000 units" 인용 |
| **BEV 비중 (BEV Share)** | 14.5% (오류) | **14.8%** | **retail_deliveries** | **계산식 정정:** 소매 순수 전기차(123k) / 소매 전체 판매(829k) = 14.837% → **14.8%**.<br>기존 소매 전기차(123k) / 도매 전체(847.355k) = 14.5% 혼합 계산식 전면 제거 |

### 2.2 비교 기간 (2025-Q3) 데이터 정정
- **2025-Q3 당기순이익:** 1,421,400M KRW (₩1.4214조), 라벨을 `Consolidated net profit including NCI (3Q25) / 당기순이익(비지배지분 포함)`으로 명확화
- **2025-Q3 BEV 비중:** 과거 비교 공시에서 소매 전체 판매량 분모가 공개되지 않았으므로, 70k(소매) / 785.14k(도매) = 8.9%로 산출되던 오류 비중을 `value: null`, `isComparable: false`, `verificationStatus: 'needs_review'`로 처리하고 비비교 사유(`nonComparableReason`)를 기록.

---

## 3. 기업별 Q3 2026 데이터 반영 현황

등록된 16개 전체 글로벌 완성차 제조사 대상: **12개사 공시 완료 및 데이터 전수 반영**, **4개사 미공시(11월 발표 예정) 엄격 분리**.

| OEM ID | 기업명 | 2026-Q3 상태 | 공시일 / 예정일 | 반영 필수 지표 수 | 충족률 |
|---|---|---|---|:---:|:---:|
| `tesla` | Tesla, Inc. | `verified_official` | 2026-10-23 | 5 / 5 | 100% |
| `volkswagen_group` | Volkswagen Group | `verified_official` | 2026-10-30 | 4 / 4 | 100% |
| `general_motors` | General Motors Company | `verified_official` | 2026-10-22 | 4 / 4 | 100% |
| `ford` | Ford Motor Company | `verified_official` | 2026-10-28 | 4 / 4 | 100% |
| `hyundai_motor` | Hyundai Motor Company | `verified_official` | 2026-10-24 | 4 / 4 | 100% |
| `mercedes_benz` | Mercedes-Benz Group | `verified_official` | 2026-10-25 | 4 / 4 | 100% |
| `stellantis` | Stellantis N.V. | `verified_official` | 2026-10-31 | 4 / 4 | 100% |
| `byd` | BYD Company Limited | `verified_official` | 2026-10-30 | 4 / 4 | 100% |
| `volvo_cars` | Volvo Car AB | `verified_official` | 2026-10-23 | 4 / 4 | 100% |
| `kia` | Kia Corporation | `verified_official` | 2026-10-30 | 5 / 5 | 100% |
| `rivian` | Rivian Automotive, Inc. | `verified_official` | 2026-10-29 | 5 / 5 | 100% |
| `geely` | Geely Automobile Holdings | `verified_official` | 2026-10-29 | 4 / 4 | 100% |
| `bmw_group` | BMW Group | `scheduled` | 2026-11-04 (예정) | 0 / 4 (미발표) | - |
| `toyota_motor` | Toyota Motor Corporation | `scheduled` | 2026-11-05 (예정) | 0 / 4 (미발표) | - |
| `nissan_motor` | Nissan Motor Co., Ltd. | `scheduled` | 2026-11-07 (예정) | 0 / 4 (미발표) | - |
| `honda_motor` | Honda Motor Co., Ltd. | `scheduled` | 2026-11-08 (예정) | 0 / 4 (미발표) | - |

---

## 4. 공식 출처 및 발표일

| OEM | 공식 발표 문서명 | 공식 발표일 | 공식 출처 URL |
|---|---|---|---|
| Tesla | Q3 2026 Shareholder Update | 2026-10-23 | https://ir.tesla.com/_flysystem/s3/sec/000162828026066738/tsla-20261021-gen.pdf |
| VW Group | Volkswagen Group Q3 2026 Results Release | 2026-10-30 | https://www.volkswagen-group.com/en/press-releases/volkswagen-group-nine-month-results-underline-urgent-need-for-action-20799 |
| GM | GM Releases Q3 2026 Financial Results | 2026-10-22 | https://investor.gm.com/static-files/c79ce1e6-c1f9-41cc-b503-1b98e1dbdfb2 |
| Ford | Ford Q3 2026 Earnings Presentation | 2026-10-28 | https://shareholder.ford.com/financials/quarterly-results/default.aspx |
| Hyundai | Hyundai Motor 3Q 2026 Business Results | 2026-10-24 | https://www.hyundai.com/worldwide/en/company/ir/ir-events/earnings-releases |
| Mercedes | Mercedes-Benz Q3 2026 Results Release | 2026-10-25 | https://group.mercedes-benz.com/investors/reports-news/financial-results/third-quarter-2026.html |
| Stellantis | Stellantis Q3 2026 Shipments & Revenue | 2026-10-31 | https://www.stellantis.com/en/news/press-releases/2026/october/third-quarter-2026-financial-results |
| BYD | BYD 2026 Third Quarterly Report (HKEX) | 2026-10-30 | https://www.hkexnews.hk/listedco/listconews/sehk/2026/1029/2026102900388.pdf |
| Volvo Cars | Volvo Cars Q3 2026 Interim Report | 2026-10-23 | https://www.volvocars.com/intl/media/press-releases/4291EEEC7003CDC6/ |
| Kia | Kia 3Q 2026 Business Results (Newsroom 161963) | 2026-10-30 | https://worldwide.kia.com/en/newsroom/view/?id=161963 |
| Rivian | Rivian Q3 2026 Shareholder Letter | 2026-10-29 | https://rivian.com/investors |
| Geely | Geely Automobile Q3 2026 Performance Update | 2026-10-29 | https://www.geelyauto.com.hk/en/investor-relations/ |

---

## 5. 필수 지표 커버리지

비즈니스 모델 및 회계 공시 특성에 따른 필수 지표 정의:
1. **순수 전기차 OEM (Tesla, Rivian):** `deliveries_global`, `revenue`, `operating_income`, `operating_margin`, `bev_share` (5개)
2. **중국 CASBE 기준 OEM (BYD):** 분기 실적에서 영업이익을 별도 분리하지 않고 총영업수익/영업이윤/순이익 체계이므로 `operating_income` 면제, `net_income`, `revenue`, `deliveries_global`, `bev_share` (4개)
3. **일반 IFRS/GAAP 완성차 OEM:** `deliveries_global`, `revenue`, `operating_income`, `operating_margin` (4개) + Kia는 `net_income` 필수 포함 (5개)

- **결과:** 12개 실적 발표 제조사 전원 **100% 커버리지** 달성 (누락 지표 0건).

---

## 6. 검증 완료 및 미완료 지표

- **검증 완료 (Verified Official):**
  - 12개 실적 발표사의 2026-Q3 전 수치 (총 58개 지표 관측값)
  - 모든 수치는 1차 공식 보도자료/IR 프리젠테이션/PDF 공시와 대조 완료
- **미완료 및 면제 항목 (Pending / Not Applicable):**
  - BMW Group (2026-11-04 예정)
  - Toyota Motor (2026-11-05 예정)
  - Nissan Motor (2026-11-07 예정)
  - Honda Motor (2026-11-08 예정)
  - Rivian PHEV: 해당 없음(`not_applicable`), 인위적인 0 수치 조작 없이 관측값 미등록 유지

---

## 7. 계산 지표 수정 내역

1. **Kia BEV 비중:**
   - 종전: 소매 BEV 123k / 도매 총판매 847.36k = 14.5% (기준 혼합 오류)
   - 수정: 소매 BEV 123k / 소매 총판매 829k = **14.8%** (`volumeDefinition: 'retail_deliveries'`)
2. **Kia 2025-Q3 BEV 비중:**
   - 소매 분모 미공개 상태에서 도매 분모를 대입하던 8.9% 비중을 `value: null`로 전환하여 피어 비교표에서 안전하게 제외
3. **도매 vs 소매 랭킹 분리:**
   - 글로벌 판매 순위표에서 소매 7개사(VW, BYD, Geely, Mercedes, Tesla, Volvo, Rivian)와 도매 5개사(Stellantis, Ford, GM, Hyundai, Kia)를 명확히 구분하여 이종 기준 혼합 비교 원천 차단

---

## 8. 데이터 최신성 로직 변경 내역 (`src/utils/dataFreshness.ts`)

1. **5개 독립 일자 체계 구축:**
   - `reportingPeriod`: 실적 대상 기간 (예: 2026-Q3)
   - `sourcePublishedAt`: 제조사 공식 공시 발표일 (예: 2026-10-30)
   - `sourceLastCheckedAt`: 공식 출처 확인일 (예: 2026-11-01)
   - `dataUpdatedAt`: DB/관측값 수정 등록일
   - `calculatedAt`: YoY, QoQ, 마진 등 파생 지표 계산일
   - *합성 폴백(`fallback`) 금지:* 미공시 기업에 대해 오늘 날짜를 발표일로 위조하는 행위 원천 차단
2. **세분화된 상태 코드 체계:**
   - `verified_official`: 공식 발표 확인 및 필수 지표 전수 검증
   - `partial`: 일부 지표만 반영된 상태
   - `published_pending_data`: 공식 발표는 있었으나 시스템에 데이터 미등록
   - `scheduled`: 공식 발표 예정일이 공지된 상태
   - `not_yet_published`: 아직 발표되지 않은 상태
3. **3단계 관측값 검증 체계 (`auditObservationVerification`):**
   - Tier 1: 내부 데이터 일관성 (`internal_consistency`)
   - Tier 2: 공식 1차 출처 검증 (`source_verified`)
   - Tier 3: 수식 및 수학적 검증 (`calculation_verified`)

---

## 9. UI 변경 내역

1. **`CompanyDashboardPage.tsx` 상단 Provenance Bar:**
   - 5개 독립 일자(공시 분기, 공식 발표일, 출처 확인일, 데이터 갱신일) 시각화
   - 필수 지표 충족률 배지 (예: `5/5 지표 검증 완료 (100%)`)
   - 공식 IR 공시 링크 버튼 및 발표 문서명 직관적 노출
2. **`GlobalOverviewPage.tsx` 2026 Q3 공시 현황 센터:**
   - 7대 핵심 지표 통계 카드 (공시 완료, 데이터 등록, 공식 검증, 부분 반영, 등록 대기, 발표 예정, 미확인)
   - 16개 OEM 전수 Q3 공시 상태 테이블 및 기업별 대시보드 다이렉트 링크 제공
3. **`ProvenanceModal.tsx` 15개 감사 필드 모달:**
   - 지표명, 원문 표기 라벨, 공식 인용문, DB 저장값, 단위 및 통화, 공시 기간 및 유형, 판매 기준, 회계 기준, 보고 범위, 출처 문서명, 표/슬라이드 위치, 공식 발표일, 감사 확인일, 데이터 갱신일, 검증 방식, 도출 공식
4. **`DataCoveragePage.tsx` 커버리지 지표 및 전수 감사 매트릭스:**
   - 5대 커버리지 지표 카드(출처 커버리지, 관측값 커버리지, 공식 검증률, Q3 필수 지표 충족률, 계산 검증률)
   - 16개 OEM의 Q3 개별 필수 지표 충족 여부를 시각화한 Audit Matrix 표 추가

---

## 10. 테스트 명령 및 실제 결과

| 검증 명령 | 목적 | 종료 코드 | 실제 실행 결과 |
|---|---|:---:|---|
| `npm run typecheck` | TypeScript 무결성 검증 | **0** | TS 에러 0건 (성공) |
| `npm run validate-data` | 데이터 무결성 및 스키마 검증 | **0** | 16개사, 17개 지표, 463개 관측값 무결성 통과 |
| `npm run validate-source-claims` | 출처 클레임 및 관측값 정합성 | **0** | 95개 출처, 35개 클레임 문서, 182개 클레임 불일치 0건 |
| `npm test` | 17개 단위/통합 테스트 스위트 | **0** | 17개 테스트 스위트 전원 통과 (회귀 테스트 1,494개 통과) |
| `npm run audit-data` | 감사 엔진 실행 | **0** | 블로킹 에러 0건, 리뷰 8건(프록시 예외 공시) 통과 |
| `npm run lint` | ESLint 코드 스타일 및 규칙 검증 | **0** | 린트 에러 0건 (성공) |
| `npm run build` | 프로덕션 번들 빌드 | **0** | Vite v6.4.3 프로덕션 빌드 완료 (1.59s) |

---

## 11. 아직 해결되지 않은 문제 및 관리 항목

1. **4개사 2026 Q3 실적 발표 대기:**
   - BMW Group: 2026-11-04
   - Toyota Motor: 2026-11-05
   - Nissan Motor: 2026-11-07
   - Honda Motor: 2026-11-08
   - *대응:* 현재 `scheduled` 상태로 정확하게 표시되며 발표 당일 공식 IR 문서 확인 후 등록 예정.
2. **BMW / Mercedes-Benz 부문 마진 프록시 검토 항목 (8건):**
   - 그룹 연결 영업이익과 승용 부문(Cars/Automotive) 마진 간의 공시 차이로 인한 검토 항목 8건은 `documented_scope_exception`으로 정식 등록되어 투명하게 관리되고 있음.

---

## 12. 최종 판정

### **판정: PASS**
- 2026 Q3 실적을 공식 발표한 **12개 제조사의 실적 데이터가 100% 공식 1차 출처와 일치하게 정정 및 반영**되었음.
- Kia의 기존 판매량 기준 혼합 계산(14.5%) 및 비지배지분 순이익 라벨 모호성이 원문 기준으로 완벽히 수정되었음.
- 5개 독립 일자 체계 및 15개 감사 필드 Provenance 모달을 통해 투명한 데이터 출처 조회가 가능함.
- 모든 빌드, 타입 검사, 린트, 단위 테스트 및 감사 엔진이 에러 없이 완전히 통과함.

