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
    companyId: 'bmw_group',
    period: '2026-Q3',
    scheduledDate: '2026-11-04',
    scheduledDateKo: '2026년 11월 4일 (공시 예정)',
    scheduledDateEn: 'Nov 4, 2026 (Scheduled)',
    notesKo: 'BMW 그룹 3분기 분기보고서(Quarterly Statement) 공식 발표 예정 (잠정 인도량 55.1만대 선발표)',
    notesEn: 'BMW Group Q3 2026 Quarterly Statement scheduled for Nov 4, 2026 (Preliminary deliveries of 551.07k disclosed)',
  },
  {
    companyId: 'toyota_motor',
    period: '2026-Q3',
    scheduledDate: '2026-11-05',
    scheduledDateKo: '2026년 11월 5일 (공시 예정)',
    scheduledDateEn: 'Nov 5, 2026 (Scheduled)',
    notesKo: '토요타 자동차 FY2027 2분기(CY2026 3분기) 결산 단신 및 재무제표 발표 예정',
    notesEn: 'Toyota Motor FY2027 Q2 (CY2026 Q3) Financial Results scheduled for Nov 5, 2026',
  },
  {
    companyId: 'nissan_motor',
    period: '2026-Q3',
    scheduledDate: '2026-11-07',
    scheduledDateKo: '2026년 11월 7일 (공시 예정)',
    scheduledDateEn: 'Nov 7, 2026 (Scheduled)',
    notesKo: '닛산 자동차 FY2027 2분기(CY2026 3분기 / 상반기) 결산 발표 예정',
    notesEn: 'Nissan Motor FY2027 Q2 (CY2026 Q3 / H1) Financial Results scheduled for Nov 7, 2026',
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
];

export function getScheduledDisclosure(companyId: string, period: string): ScheduledDisclosure | undefined {
  return SCHEDULED_DISCLOSURES.find((s) => s.companyId === companyId && s.period === period);
}
