/**
 * AutoMetrics Intelligence — Data Freshness & Provenance Metadata Service
 *
 * Enforces explicit temporal tracking across all registered automakers:
 *  1. reportingPeriod: 실적 대상 기간 (e.g. '2026-Q3')
 *  2. sourcePublishedAt: 공식 문서 발표일 (e.g. '2026-10-30' — when OEM officially disclosed)
 *  3. sourceLastCheckedAt: 공식 원문 마지막 확인일 (e.g. '2026-11-01' — when source filing was re-audited)
 *  4. dataUpdatedAt: DB의 실제 데이터 변경일 (when observation record was created/updated)
 *  5. calculatedAt: 파생 지표를 마지막으로 계산한 날짜 (when derived KPIs were recalculated)
 *
 * Provides granular fail-closed status classification:
 *  - 'verified_official': Official results confirmed + required metrics ingested + source verified + calculations verified
 *  - 'partial': Official results confirmed, but only partial required metrics ingested
 *  - 'published_pending_data': Official disclosure published, but observation data ingestion pending
 *  - 'pending_verification': Data observations ingested, but official primary source audit pending
 *  - 'scheduled': Official results not yet released by OEM, official disclosure date confirmed
 *  - 'not_yet_published': Official results not yet released, no fixed date scheduled
 *  - 'not_applicable': Specific metric or reporting period not applicable to automaker's business model
 *  - 'source_conflict': Conflicting figures or definitions detected across official disclosures
 *  - 'unconfirmed': Publication status not yet verified
 */

import { SOURCE_DOCUMENTS, SOURCES_MAP } from '../data/sources';
import { METRIC_OBSERVATIONS } from '../data/observations';
import { getScheduledDisclosure } from '../data/scheduledDisclosures';
import { COMPANIES_REGISTRY } from '../data/companies';
import { MetricObservation, SourceDocument, FinancialDisclosureStatus } from '../types/metrics';
import {
  getDimensionalObservationKey,
  validateBevShareInputs,
} from './metricCalculations';

export type DataFreshnessStatus =
  | 'verified_official'
  | 'partial'
  | 'published_pending_data'
  | 'pending_verification'
  | 'scheduled'
  | 'not_yet_published'
  | 'not_applicable'
  | 'source_conflict'
  | 'unconfirmed';

export interface RequiredMetricsCoverage {
  requiredCount: number;
  presentCount: number;
  verifiedCount: number;
  ratio: string; // e.g. "5/5"
  percentage: number;
  missingMetrics: string[];
  requiredMetricIds: string[];
}

export interface CompanyPeriodFreshness {
  companyId: string;
  reportingPeriod: string;
  latestReportedPeriod: string;
  hasObservationsForPeriod: boolean;
  sourcePublishedAt?: string;
  sourceLastCheckedAt?: string;
  dataUpdatedAt?: string;
  calculatedAt?: string;
  status: DataFreshnessStatus;
  statusLabelKo: string;
  statusLabelEn: string;
  statusBadgeColor: 'emerald' | 'amber' | 'sky' | 'slate' | 'rose' | 'indigo';
  sourceTitle?: string;
  sourceUrl?: string;
  financialDisclosureStatus?: FinancialDisclosureStatus;
  scheduledDate?: string;
  requiredMetricsCoverage?: RequiredMetricsCoverage;
  notesKo?: string;
  notesEn?: string;
}

/**
 * Returns automaker-specific required metrics based on corporate business model and disclosure standards.
 * Standardizes accountability while respecting legitimate structural variations (e.g. pure EV vs legacy, CASBE vs IFRS).
 */
export function getCompanyRequiredMetrics(companyId: string): string[] {
  switch (companyId) {
    case 'tesla':
    case 'rivian':
      // Pure EV players: volume, BEV volume, revenue, EBIT, operating margin
      return ['deliveries_global', 'bev_deliveries', 'revenue', 'operating_income', 'operating_margin'];
    case 'byd':
      // Under CASBE, BYD reports revenue, net income attributable to shareholders, and deliveries for Q3
      return ['deliveries_global', 'bev_deliveries', 'revenue', 'net_income'];
    case 'kia':
      // Kia discloses wholesale volume, revenue, operating profit, margin, and net profit
      return ['deliveries_global', 'revenue', 'operating_income', 'operating_margin', 'net_income'];
    case 'hyundai_motor':
    case 'geely':
    case 'general_motors':
    case 'ford':
    case 'volkswagen_group':
    case 'mercedes_benz':
    case 'stellantis':
    case 'volvo_cars':
      // Major global OEM standard core: global volume, revenue, operating income/EBIT, operating margin
      return ['deliveries_global', 'revenue', 'operating_income', 'operating_margin'];
    default:
      return ['deliveries_global', 'revenue'];
  }
}

/**
 * Detects real source or data conflict for a company in a given target period.
 * Connects to real conflict detection logic across observations and source claims.
 */
export function detectCompanySourceConflict(
  companyId: string,
  targetPeriod: string
): { hasConflict: boolean; detail?: string } {
  const companyObs = METRIC_OBSERVATIONS.filter(
    (o) => o.companyId === companyId && o.period === targetPeriod
  );

  // 1. Check pairwise observation conflict on identical dimensional key
  for (let i = 0; i < companyObs.length; i++) {
    for (let j = i + 1; j < companyObs.length; j++) {
      const o1 = companyObs[i];
      const o2 = companyObs[j];
      const key1 = getDimensionalObservationKey(o1);
      const key2 = getDimensionalObservationKey(o2);

      if (key1 === key2) {
        if (
          o1.value !== null &&
          o2.value !== null &&
          Math.abs(o1.value - o2.value) > 1e-4
        ) {
          return {
            hasConflict: true,
            detail: `Conflicting observation values for identical key ${key1}: ${o1.value} vs ${o2.value}`,
          };
        }
      }
    }
  }

  // 2. Check observation vs claimed source value mismatch
  for (const obs of companyObs) {
    if (obs.sourceDocId && obs.value !== null) {
      const doc = SOURCES_MAP[obs.sourceDocId];
      if (doc && doc.sourceClaims) {
        const claim = doc.sourceClaims.find(
          (c) =>
            c.metricId === obs.metricId &&
            c.period === obs.period &&
            (!c.scope || !obs.reportingScope || c.scope === obs.reportingScope) &&
            (!c.volumeDefinition || !obs.volumeDefinition || c.volumeDefinition === obs.volumeDefinition)
        );
        if (claim && Math.abs(claim.value - obs.value) > 1e-3) {
          return {
            hasConflict: true,
            detail: `Observation value ${obs.value} conflicts with source claim ${claim.value} for metric ${obs.metricId}`,
          };
        }
      }
    }
  }

  // 3. Check conflicting source claims across documents for the same period
  const companyDocs = SOURCE_DOCUMENTS.filter(
    (d) => d.companyId === companyId && d.period === targetPeriod && d.sourceClaims
  );
  const allClaims = companyDocs.flatMap((d) => d.sourceClaims || []);
  for (let i = 0; i < allClaims.length; i++) {
    for (let j = i + 1; j < allClaims.length; j++) {
      const c1 = allClaims[i];
      const c2 = allClaims[j];
      if (
        c1.metricId === c2.metricId &&
        c1.period === c2.period &&
        c1.scope === c2.scope &&
        c1.volumeDefinition === c2.volumeDefinition &&
        c1.accountingBasis === c2.accountingBasis
      ) {
        if (Math.abs(c1.value - c2.value) > 1e-4) {
          return {
            hasConflict: true,
            detail: `Conflicting source claims in official documents for ${c1.metricId}: ${c1.value} vs ${c2.value}`,
          };
        }
      }
    }
  }

  return { hasConflict: false };
}

export interface ObservationVerificationAudit {
  internal_consistency: boolean;
  source_verified: boolean;
  calculation_verified: boolean;
  fully_verified: boolean;
  isVerified: boolean;
  issues: string[];
  failureReason?: string;
  sourceDoc?: SourceDocument;
  financialDisclosureStatus?: FinancialDisclosureStatus;
}

/**
 * Three-tier fail-closed verification audit for observations:
 *  1. internal_consistency: valid core dimensions, bounded finite numbers
 *  2. source_verified: verified official HTTPS source doc matching company and period + source claim matching
 *  3. calculation_verified: mathematical reconciliation for derived metrics (e.g. BEV share inputs)
 */
export function auditObservationVerification(
  obs: MetricObservation,
  allObs: MetricObservation[] = METRIC_OBSERVATIONS,
  sourcesMap: Record<string, SourceDocument> = SOURCES_MAP
): ObservationVerificationAudit {
  const issues: string[] = [];
  let internal_consistency = true;
  let source_verified = true;
  let calculation_verified = true;

  // 1. Internal consistency
  if (!obs.companyId || !obs.metricId || !obs.period || !obs.periodType || !obs.unit) {
    internal_consistency = false;
    issues.push(`Missing core dimension in observation ${obs.id}`);
  }

  if (obs.value === null || obs.value === undefined) {
    internal_consistency = false;
    issues.push(`Observation value is null or undefined for ${obs.id}`);
  } else {
    if (!Number.isFinite(obs.value)) {
      internal_consistency = false;
      issues.push(`Non-finite numeric value in observation ${obs.id}: ${obs.value}`);
    }
    // Percentage bounds check
    if (obs.unit === 'percentage' && (obs.value < -100 || obs.value > 100)) {
      if (obs.metricId === 'bev_share' && (obs.value < 0 || obs.value > 100)) {
        internal_consistency = false;
        issues.push(`BEV share out of 0-100% range: ${obs.value}%`);
      }
    }
  }

  // 2. Source verification
  let sourceDoc: SourceDocument | undefined;
  if (!obs.sourceDocId) {
    if (obs.valueType !== 'derived') {
      source_verified = false;
      issues.push(`No sourceDocId bound to observation ${obs.id}`);
    }
  } else {
    sourceDoc = sourcesMap[obs.sourceDocId] || SOURCE_DOCUMENTS.find((d) => d.id === obs.sourceDocId);
    if (!sourceDoc) {
      source_verified = false;
      issues.push(`Referenced sourceDocId '${obs.sourceDocId}' not found in registry`);
    } else {
      // Source ownership: must match observation companyId
      if (sourceDoc.companyId !== obs.companyId) {
        source_verified = false;
        issues.push(
          `Source document company mismatch: doc is for ${sourceDoc.companyId}, observation is for ${obs.companyId}`
        );
      }
      // Source period: must match observation period
      if (sourceDoc.period !== obs.period) {
        source_verified = false;
        issues.push(
          `Source document period mismatch: doc is for ${sourceDoc.period}, observation is for ${obs.period}`
        );
      }
      // Official HTTPS URL check
      if (typeof sourceDoc.officialUrl !== 'string' || !sourceDoc.officialUrl.startsWith('https://')) {
        source_verified = false;
        issues.push(`Source document ${sourceDoc.id} lacks valid official HTTPS URL`);
      }
      // Verification status of document
      if (!sourceDoc.isVerified || sourceDoc.verificationStatus !== 'verified') {
        source_verified = false;
        issues.push(`Source document ${sourceDoc.id} is not verified`);
      }
      // Source claim verification:
      // If source document has claims, enforce strict claim matching
      if (sourceDoc.sourceClaims && sourceDoc.sourceClaims.length > 0) {
        if (obs.valueType !== 'derived') {
          const metricClaims = sourceDoc.sourceClaims.filter(
            (c) => c.metricId === obs.metricId && c.period === obs.period
          );
          if (metricClaims.length === 0) {
            source_verified = false;
            issues.push(
              `Source document ${sourceDoc.id} has claims, but none for metric "${obs.metricId}" and period "${obs.period}"`
            );
          } else {
            const matchingClaim = metricClaims.find((claim) => {
              if (obs.value === null || obs.value === undefined) return false;
              if (Math.abs(claim.value - obs.value) > 1e-3) return false;
              if (claim.unit !== obs.unit) return false;
              if (claim.scope !== undefined) {
                if (obs.reportingScope === undefined || obs.reportingScope !== claim.scope) return false;
              }
              if (claim.accountingBasis !== undefined) {
                if (obs.accountingBasis === undefined || obs.accountingBasis !== claim.accountingBasis) return false;
              }
              if (claim.volumeDefinition !== undefined) {
                if (obs.volumeDefinition === undefined || obs.volumeDefinition !== claim.volumeDefinition) return false;
              }
              return true;
            });
            if (!matchingClaim) {
              source_verified = false;
              issues.push(
                `Observation value ${obs.value} (${obs.unit}) for metric ${obs.metricId} does not match official source claim in document ${sourceDoc.id}`
              );
            }
          }
        } else {
          // For derived metrics, if a direct claim exists in source document, verify it matches
          const metricClaims = sourceDoc.sourceClaims.filter(
            (c) => c.metricId === obs.metricId && c.period === obs.period
          );
          if (metricClaims.length > 0) {
            const matchingClaim = metricClaims.find((claim) => {
              if (obs.value === null || obs.value === undefined) return false;
              if (Math.abs(claim.value - obs.value) > 1e-3) return false;
              if (claim.unit !== obs.unit) return false;
              if (claim.scope !== undefined && (obs.reportingScope === undefined || obs.reportingScope !== claim.scope)) return false;
              if (claim.accountingBasis !== undefined && (obs.accountingBasis === undefined || obs.accountingBasis !== claim.accountingBasis)) return false;
              if (claim.volumeDefinition !== undefined && (obs.volumeDefinition === undefined || obs.volumeDefinition !== claim.volumeDefinition)) return false;
              return true;
            });
            if (!matchingClaim) {
              source_verified = false;
              issues.push(
                `Derived observation value ${obs.value} (${obs.unit}) for metric ${obs.metricId} conflicts with official source claim in document ${sourceDoc.id}`
              );
            }
          }
        }
      }
    }
  }

  if (obs.verificationStatus !== 'verified') {
    source_verified = false;
    issues.push(`Observation ${obs.id} verificationStatus is '${obs.verificationStatus}' (not 'verified')`);
  }

  // 3. Calculation verification
  if (obs.valueType === 'derived') {
    if (obs.metricId === 'bev_share') {
      const bevVal = validateBevShareInputs(obs, allObs, sourcesMap);
      if (!bevVal.isValid) {
        calculation_verified = false;
        issues.push(bevVal.failureReason || 'BEV share calculation invalid');
      }
    } else if (obs.inputObservationIds && obs.inputObservationIds.length > 0) {
      const inputs = obs.inputObservationIds.map((id) => allObs.find((o) => o.id === id));
      if (inputs.some((inp) => !inp)) {
        calculation_verified = false;
        issues.push(`Derived observation ${obs.id} references missing input observation`);
      } else {
        for (const inp of inputs) {
          if (inp!.companyId !== obs.companyId) {
            calculation_verified = false;
            issues.push(`Derived input observation ${inp!.id} company mismatch`);
          }
          if (inp!.period !== obs.period) {
            calculation_verified = false;
            issues.push(`Derived input observation ${inp!.id} period mismatch`);
          }
          const inpAudit = auditObservationVerification(inp!, allObs, sourcesMap);
          if (!inpAudit.fully_verified) {
            calculation_verified = false;
            issues.push(
              `Derived input observation ${inp!.id} verification failed: ${inpAudit.issues.join('; ')}`
            );
          }
        }
      }
    } else if (!obs.sourceDocId) {
      calculation_verified = false;
      issues.push(`Derived observation ${obs.id} lacks both sourceDocId and inputObservationIds`);
    }
  }

  const fully_verified = internal_consistency && source_verified && calculation_verified;

  return {
    internal_consistency,
    source_verified,
    calculation_verified,
    fully_verified,
    isVerified: fully_verified,
    issues,
    failureReason: issues[0],
    sourceDoc,
    financialDisclosureStatus: sourceDoc?.financialDisclosureStatus || obs.financialDisclosureStatus,
  };
}

/**
 * Evaluates comprehensive freshness, status, dates, and metric coverage for a company in a given period.
 */
export function getCompanyDataFreshness(
  companyId: string,
  targetPeriod: string = '2026-Q3'
): CompanyPeriodFreshness {
  const companyObs = METRIC_OBSERVATIONS.filter((o) => o.companyId === companyId);
  const periods = Array.from(new Set(companyObs.map((o) => o.period)))
    .filter((p) => p.includes('-Q'))
    .sort();
  const latestReportedPeriod = periods[periods.length - 1] || '2026-Q2';

  // Observations for the requested target period with valid values
  const periodObs = companyObs.filter((o) => o.period === targetPeriod && o.value !== null && o.value !== undefined);
  const hasObservations = periodObs.length > 0;

  // Find corresponding official primary source document for targetPeriod
  const sourceDoc = SOURCE_DOCUMENTS.find(
    (s) => s.companyId === companyId && s.period === targetPeriod
  );

  const scheduled = getScheduledDisclosure(companyId, targetPeriod);

  // Evaluate company required metrics coverage with unified verification predicate
  const requiredMetricIds = getCompanyRequiredMetrics(companyId);
  const presentMetrics = requiredMetricIds.filter((mid) => periodObs.some((o) => o.metricId === mid));
  
  const isMetricVerified = (mid: string): boolean => {
    const metricObsList = periodObs.filter((o) => o.metricId === mid);
    if (metricObsList.length === 0) return false;
    return metricObsList.some((o) => auditObservationVerification(o, companyObs).isVerified);
  };

  const verifiedMetrics = requiredMetricIds.filter(isMetricVerified);
  const missingMetrics = requiredMetricIds.filter((mid) => !isMetricVerified(mid));

  const requiredCount = requiredMetricIds.length;
  const presentCount = presentMetrics.length;
  const verifiedCount = verifiedMetrics.length;
  const coverageRatio = `${verifiedCount}/${requiredCount}`;
  const coveragePercentage = requiredCount > 0 ? Math.round((verifiedCount / requiredCount) * 100) : 0;

  const coverage: RequiredMetricsCoverage = {
    requiredCount,
    presentCount,
    verifiedCount,
    ratio: coverageRatio,
    percentage: coveragePercentage,
    missingMetrics,
    requiredMetricIds,
  };

  // Derive dates strictly without fabricating current time or fallback
  const publishedAt = sourceDoc?.publicationDate;
  const lastChecked = sourceDoc?.lastChecked;

  // Extract explicit dataUpdatedAt from period observations (no fallback, undefined if unknown)
  const obsUpdatedDates = periodObs
    .map((o) => o.dataUpdatedAt)
    .filter((d): d is string => typeof d === 'string' && d.length > 0);
  const dataUpdatedAt = obsUpdatedDates.length > 0
    ? obsUpdatedDates.reduce((max, d) => (d > max ? d : max), obsUpdatedDates[0])
    : undefined;

  // Extract explicit calculatedAt from derived observations (no fallback, undefined if unrecorded)
  const obsCalcDates = periodObs
    .filter((o) => o.valueType === 'derived')
    .map((o) => o.calculatedAt)
    .filter((d): d is string => typeof d === 'string' && d.length > 0);
  const calculatedAt = obsCalcDates.length > 0
    ? obsCalcDates.reduce((max, d) => (d > max ? d : max), obsCalcDates[0])
    : undefined;

  // 0. Check real source/data conflict first
  const conflictCheck = detectCompanySourceConflict(companyId, targetPeriod);
  if (conflictCheck.hasConflict) {
    return {
      companyId,
      reportingPeriod: targetPeriod,
      latestReportedPeriod,
      hasObservationsForPeriod: hasObservations,
      sourcePublishedAt: publishedAt,
      sourceLastCheckedAt: lastChecked,
      dataUpdatedAt,
      calculatedAt,
      status: 'source_conflict',
      statusLabelKo: '공시 출처 충돌 감지',
      statusLabelEn: 'Source Conflict Detected',
      statusBadgeColor: 'rose',
      sourceTitle: sourceDoc?.title,
      sourceUrl: sourceDoc?.officialUrl,
      financialDisclosureStatus: sourceDoc?.financialDisclosureStatus,
      requiredMetricsCoverage: coverage,
      notesKo: `공식 출처 간 수치 또는 정의 불일치가 감지되었습니다: ${conflictCheck.detail}`,
      notesEn: `Conflicting figures or definitions detected across official disclosures: ${conflictCheck.detail}`,
    };
  }

  // Case 1: Observations exist for targetPeriod
  if (hasObservations) {
    // Fail-closed sourceDoc verification check
    const hasValidVerifiedSourceDoc =
      !!sourceDoc &&
      sourceDoc.period === targetPeriod &&
      typeof sourceDoc.officialUrl === 'string' &&
      sourceDoc.officialUrl.startsWith('https://') &&
      sourceDoc.isVerified === true &&
      sourceDoc.verificationStatus === 'verified';

    if (!hasValidVerifiedSourceDoc) {
      return {
        companyId,
        reportingPeriod: targetPeriod,
        latestReportedPeriod,
        hasObservationsForPeriod: true,
        sourcePublishedAt: publishedAt,
        sourceLastCheckedAt: lastChecked,
        dataUpdatedAt,
        calculatedAt,
        status: 'pending_verification',
        statusLabelKo: '공식 원문 감사 대기',
        statusLabelEn: 'Pending Primary Source Audit',
        statusBadgeColor: 'slate',
        sourceTitle: sourceDoc?.title,
        sourceUrl: sourceDoc?.officialUrl,
        financialDisclosureStatus: sourceDoc?.financialDisclosureStatus,
        requiredMetricsCoverage: coverage,
        notesKo: '관측 데이터가 등록되었으나 유효한 공식 1차 출처 문서와의 대조 감사가 완료되지 않았습니다.',
        notesEn: 'Observations are ingested, but official primary source document verification is pending or missing.',
      };
    }

    // Required metrics collection check
    if (presentCount < requiredCount) {
      return {
        companyId,
        reportingPeriod: targetPeriod,
        latestReportedPeriod,
        hasObservationsForPeriod: true,
        sourcePublishedAt: publishedAt,
        sourceLastCheckedAt: lastChecked,
        dataUpdatedAt,
        calculatedAt,
        status: 'partial',
        statusLabelKo: '일부 지표 반영 (부분 확인)',
        statusLabelEn: 'Partial Disclosures Ingested',
        statusBadgeColor: 'amber',
        sourceTitle: sourceDoc?.title,
        sourceUrl: sourceDoc?.officialUrl,
        financialDisclosureStatus: sourceDoc?.financialDisclosureStatus,
        requiredMetricsCoverage: coverage,
        notesKo: `핵심 지표 중 일부 세부 내역(${missingMetrics.join(', ')})이 공시 대기 중입니다.`,
        notesEn: `Some required metrics (${missingMetrics.join(', ')}) are pending verification or disclosure.`,
      };
    }

    // Required metrics verification check
    if (verifiedCount < requiredCount) {
      return {
        companyId,
        reportingPeriod: targetPeriod,
        latestReportedPeriod,
        hasObservationsForPeriod: true,
        sourcePublishedAt: publishedAt,
        sourceLastCheckedAt: lastChecked,
        dataUpdatedAt,
        calculatedAt,
        status: 'pending_verification',
        statusLabelKo: '일부 지표 원문 검증 대기',
        statusLabelEn: 'Pending Metric Verification',
        statusBadgeColor: 'slate',
        sourceTitle: sourceDoc?.title,
        sourceUrl: sourceDoc?.officialUrl,
        financialDisclosureStatus: sourceDoc?.financialDisclosureStatus,
        requiredMetricsCoverage: coverage,
        notesKo: `필수 지표 중 일부(${missingMetrics.join(', ')})의 원문 대조가 완료되지 않았습니다.`,
        notesEn: `Some required metrics (${missingMetrics.join(', ')}) are pending verification against official sources.`,
      };
    }

    // Derived metric validation check
    const derivedObs = periodObs.filter((o) => o.valueType === 'derived');
    let derivedValid = true;
    let derivedFailureReason = '';

    for (const d of derivedObs) {
      const dAudit = auditObservationVerification(d, companyObs);
      if (!dAudit.isVerified) {
        derivedValid = false;
        derivedFailureReason = dAudit.failureReason || `Derived metric ${d.metricId} is not verified.`;
        break;
      }
    }

    if (!derivedValid) {
      return {
        companyId,
        reportingPeriod: targetPeriod,
        latestReportedPeriod,
        hasObservationsForPeriod: true,
        sourcePublishedAt: publishedAt,
        sourceLastCheckedAt: lastChecked,
        dataUpdatedAt,
        calculatedAt,
        status: 'pending_verification',
        statusLabelKo: '파생 지표 계산 검증 대기',
        statusLabelEn: 'Pending Derived KPI Verification',
        statusBadgeColor: 'slate',
        sourceTitle: sourceDoc?.title,
        sourceUrl: sourceDoc?.officialUrl,
        financialDisclosureStatus: sourceDoc?.financialDisclosureStatus,
        requiredMetricsCoverage: coverage,
        notesKo: `파생 지표 검증 실패: ${derivedFailureReason}`,
        notesEn: `Derived metric verification failed: ${derivedFailureReason}`,
      };
    }

    // All conditions verified
    return {
      companyId,
      reportingPeriod: targetPeriod,
      latestReportedPeriod,
      hasObservationsForPeriod: true,
      sourcePublishedAt: publishedAt,
      sourceLastCheckedAt: lastChecked,
      dataUpdatedAt,
      calculatedAt,
      status: 'verified_official',
      statusLabelKo: '공식 실적 검증 완료',
      statusLabelEn: 'Verified Official Results',
      statusBadgeColor: 'emerald',
      sourceTitle: sourceDoc?.title,
      sourceUrl: sourceDoc?.officialUrl,
      financialDisclosureStatus: sourceDoc?.financialDisclosureStatus,
      requiredMetricsCoverage: coverage,
      notesKo: '공식 IR 및 공시 자료와 100% 대조 검증 완료되었습니다.',
      notesEn: 'Fully cross-audited against official primary IR filings.',
    };
  }

  // Case 2: No observations in DB for targetPeriod
  // If an official source document has been published by the OEM, but observations have not yet been ingested
  if (sourceDoc && sourceDoc.publicationDate) {
    return {
      companyId,
      reportingPeriod: targetPeriod,
      latestReportedPeriod,
      hasObservationsForPeriod: false,
      sourcePublishedAt: sourceDoc.publicationDate,
      sourceLastCheckedAt: sourceDoc.lastChecked,
      dataUpdatedAt: undefined,
      calculatedAt: undefined,
      status: 'published_pending_data',
      statusLabelKo: '공식 공시 발표 완료 (데이터 반영 대기)',
      statusLabelEn: 'Published (Pending Ingestion)',
      statusBadgeColor: 'indigo',
      sourceTitle: sourceDoc.title,
      sourceUrl: sourceDoc.officialUrl,
      requiredMetricsCoverage: coverage,
      notesKo: '기업의 공식 실적 자료는 발표되었으나 세부 관측값 반영 작업이 진행 중입니다.',
      notesEn: 'Official results have been disclosed by the OEM; database observation ingestion is pending.',
    };
  }

  // Case 3: Disclosure is scheduled for a known future date
  if (scheduled) {
    return {
      companyId,
      reportingPeriod: targetPeriod,
      latestReportedPeriod,
      hasObservationsForPeriod: false,
      scheduledDate: scheduled.scheduledDate,
      sourcePublishedAt: undefined,
      sourceLastCheckedAt: undefined,
      dataUpdatedAt: undefined,
      calculatedAt: undefined,
      status: 'scheduled',
      statusLabelKo: `공시 예정 (${scheduled.scheduledDate})`,
      statusLabelEn: `Scheduled (${scheduled.scheduledDate})`,
      statusBadgeColor: 'sky',
      requiredMetricsCoverage: coverage,
      notesKo: scheduled.notesKo,
      notesEn: scheduled.notesEn,
    };
  }

  // Case 4: Disclosure status unconfirmed
  return {
    companyId,
    reportingPeriod: targetPeriod,
    latestReportedPeriod,
    hasObservationsForPeriod: false,
    sourcePublishedAt: undefined,
    sourceLastCheckedAt: undefined,
    dataUpdatedAt: undefined,
    calculatedAt: undefined,
    status: 'unconfirmed',
    statusLabelKo: '공시 여부 미확인',
    statusLabelEn: 'Disclosure Unconfirmed',
    statusBadgeColor: 'slate',
    requiredMetricsCoverage: coverage,
    notesKo: '해당 분기의 공식 실적 공시가 아직 확인되지 않았습니다.',
    notesEn: 'Official disclosure has not yet been confirmed.',
  };
}

export interface SeasonFreshnessSummary {
  period: string;
  totalCompanies: number;
  reportedCount: number; // verified_official
  partialCount: number;
  publishedPendingDataCount: number;
  pendingVerificationCount: number;
  scheduledCount: number;
  unconfirmedCount: number;
  sourceConflictCount: number;
  reportedCompanies: string[]; // verified_official + partial
  scheduledCompanies: { companyId: string; date: string }[];
}

export function getReportingSeasonSummary(period: string = '2026-Q3'): SeasonFreshnessSummary {
  const allCompanies = COMPANIES_REGISTRY;
  let reportedCount = 0;
  let partialCount = 0;
  let publishedPendingDataCount = 0;
  let pendingVerificationCount = 0;
  let scheduledCount = 0;
  let unconfirmedCount = 0;
  let sourceConflictCount = 0;
  const reportedCompanies: string[] = [];
  const scheduledCompanies: { companyId: string; date: string }[] = [];

  for (const c of allCompanies) {
    const f = getCompanyDataFreshness(c.id, period);
    if (f.status === 'verified_official') {
      reportedCount++;
      reportedCompanies.push(c.id);
    } else if (f.status === 'partial') {
      partialCount++;
      reportedCompanies.push(c.id);
    } else if (f.status === 'published_pending_data') {
      publishedPendingDataCount++;
    } else if (f.status === 'pending_verification') {
      pendingVerificationCount++;
    } else if (f.status === 'scheduled') {
      scheduledCount++;
      scheduledCompanies.push({ companyId: c.id, date: f.scheduledDate || '' });
    } else if (f.status === 'source_conflict') {
      sourceConflictCount++;
    } else {
      unconfirmedCount++;
    }
  }

  return {
    period,
    totalCompanies: allCompanies.length,
    reportedCount,
    partialCount,
    publishedPendingDataCount,
    pendingVerificationCount,
    scheduledCount,
    unconfirmedCount,
    sourceConflictCount,
    reportedCompanies,
    scheduledCompanies,
  };
}
