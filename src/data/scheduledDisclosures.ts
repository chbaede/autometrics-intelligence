/**
 * AutoMetrics Intelligence — Scheduled OEM Earnings & Financial Disclosures Registry
 *
 * Tracks officially announced reporting schedules for automakers that have not yet
 * released financial statements for ongoing quarterly reporting cycles.
 * Enforces strict fail-closed integrity: unreleased periods must never contain
 * fabricated numbers or unverified estimates; instead, they are transparently
 * surfaced as "Scheduled" with official release dates.
 */

export interface ScheduledDisclosure {
  companyId: string;
  period: string;
  scheduledDate: string;
  scheduledDateKo: string;
  scheduledDateEn: string;
  notesKo: string;
  notesEn: string;
}

export const SCHEDULED_DISCLOSURES: ScheduledDisclosure[] = [
  {
    companyId: 'kia',
    period: '2026-Q3',
    scheduledDate: '2026-10-30',
    scheduledDateKo: '2026년 10월 30일 (공시 예정)',
    scheduledDateEn: 'Oct 30, 2026 (Scheduled)',
    notesKo: '3분기 잠정 판매량(846,764대) 발표 완료, 공식 경영실적 발표 예정',
    notesEn: 'Q3 preliminary global sales (846,764 units) released, official financial results scheduled for Oct 30, 2026',
  },
  {
    companyId: 'bmw_group',
    period: '2026-Q3',
    scheduledDate: '2026-11-04',
    scheduledDateKo: '2026년 11월 4일 (공시 예정)',
    scheduledDateEn: 'Nov 4, 2026 (Scheduled)',
    notesKo: 'BMW 그룹 3분기 분기보고서(Quarterly Statement) 발표 예정',
    notesEn: 'BMW Group Q3 2026 Quarterly Statement scheduled for Nov 4, 2026',
  },
  {
    companyId: 'toyota_motor',
    period: '2026-Q3',
    scheduledDate: '2026-11-05',
    scheduledDateKo: '2026년 11월 5일 (공시 예정)',
    scheduledDateEn: 'Nov 5, 2026 (Scheduled)',
    notesKo: '토요타 자동차 FY2027 2분기(CY2026 3분기) 결산 단신 발표 예정',
    notesEn: 'Toyota Motor FY2027 Q2 (CY2026 Q3) Financial Results scheduled for Nov 5, 2026',
  },
  {
    companyId: 'rivian',
    period: '2026-Q3',
    scheduledDate: '2026-11-05',
    scheduledDateKo: '2026년 11월 5일 (공시 예정)',
    scheduledDateEn: 'Nov 5, 2026 (Scheduled)',
    notesKo: '리비안 2026년 3분기 주주 서한(Shareholder Letter) 발표 예정',
    notesEn: 'Rivian Q3 2026 Shareholder Letter scheduled for Nov 5, 2026',
  },
  {
    companyId: 'nissan_motor',
    period: '2026-Q3',
    scheduledDate: '2026-11-07',
    scheduledDateKo: '2026년 11월 7일 (공시 예정)',
    scheduledDateEn: 'Nov 7, 2026 (Scheduled)',
    notesKo: '닛산 자동차 FY2027 2분기(CY2026 3분기) 결산 발표 예정',
    notesEn: 'Nissan Motor FY2027 Q2 (CY2026 Q3) Financial Results scheduled for Nov 7, 2026',
  },
  {
    companyId: 'honda_motor',
    period: '2026-Q3',
    scheduledDate: '2026-11-08',
    scheduledDateKo: '2026년 11월 8일 (공시 예정)',
    scheduledDateEn: 'Nov 8, 2026 (Scheduled)',
    notesKo: '혼다 기연공업 FY2027 2분기(CY2026 3분기) 결산 발표 예정',
    notesEn: 'Honda Motor FY2027 Q2 (CY2026 Q3) Financial Results scheduled for Nov 8, 2026',
  },
  {
    companyId: 'geely',
    period: '2026-Q3',
    scheduledDate: '2026-11-15',
    scheduledDateKo: '2026년 11월 중순 (공시 예정)',
    scheduledDateEn: 'Mid-Nov 2026 (Scheduled)',
    notesKo: '지리자동차 2026년 3분기 공식 실적 공시 예정',
    notesEn: 'Geely Automobile Q3 2026 Results scheduled for Mid-Nov 2026',
  },
];

export function getScheduledDisclosure(companyId: string, period: string): ScheduledDisclosure | undefined {
  return SCHEDULED_DISCLOSURES.find((s) => s.companyId === companyId && s.period === period);
}

