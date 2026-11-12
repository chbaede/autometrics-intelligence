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

export const SCHEDULED_DISCLOSURES: ScheduledDisclosure[] = [];

export function getScheduledDisclosure(companyId: string, period: string): ScheduledDisclosure | undefined {
  return SCHEDULED_DISCLOSURES.find((s) => s.companyId === companyId && s.period === period);
}
