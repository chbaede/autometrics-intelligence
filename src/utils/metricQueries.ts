import { COMPANIES_REGISTRY, COMPANIES_MAP } from '../data/companies';
import { METRIC_DEFINITIONS, METRICS_MAP } from '../data/metricDefinitions';
import { METRIC_OBSERVATIONS } from '../data/observations';
import { GUIDANCE_OBSERVATIONS } from '../data/guidance';
import { REGIONAL_OBSERVATIONS } from '../data/regionalObservations';
import { SOURCE_DOCUMENTS, SOURCES_MAP } from '../data/sources';
import {
  Company,
  MetricDefinition,
  MetricObservation,
  GuidanceObservation,
  RegionalObservation,
  SourceDocument,
  RegionId,
  DataQualityReport,
} from '../types/metrics';

export function getAllCompanies(): Company[] {
  return COMPANIES_REGISTRY;
}

export function getCompanyById(companyId: string): Company | undefined {
  return COMPANIES_MAP[companyId];
}

export function getAllMetrics(): MetricDefinition[] {
  return METRIC_DEFINITIONS;
}

export function getMetricById(metricId: string): MetricDefinition | undefined {
  return METRICS_MAP[metricId];
}

export function getSourceDocById(sourceDocId: string): SourceDocument | undefined {
  return SOURCES_MAP[sourceDocId];
}

export function getObservationsByCompany(companyId: string): MetricObservation[] {
  return METRIC_OBSERVATIONS.filter((obs) => obs.companyId === companyId);
}

export function getObservationsByMetric(metricId: string): MetricObservation[] {
  return METRIC_OBSERVATIONS.filter((obs) => obs.metricId === metricId);
}

export function getObservations(
  companyIds?: string[],
  metricIds?: string[],
  period?: string
): MetricObservation[] {
  return METRIC_OBSERVATIONS.filter((obs) => {
    if (companyIds && companyIds.length > 0 && !companyIds.includes(obs.companyId)) return false;
    if (metricIds && metricIds.length > 0 && !metricIds.includes(obs.metricId)) return false;
    if (period && obs.period !== period) return false;
    return true;
  });
}

export function getGuidanceByCompany(companyId: string): GuidanceObservation[] {
  return GUIDANCE_OBSERVATIONS.filter((g) => g.companyId === companyId);
}

export function getAllGuidance(): GuidanceObservation[] {
  return GUIDANCE_OBSERVATIONS;
}

export function getRegionalObservations(regionId?: RegionId, companyId?: string): RegionalObservation[] {
  return REGIONAL_OBSERVATIONS.filter((reg) => {
    if (regionId && reg.regionId !== regionId) return false;
    if (companyId && reg.companyId !== companyId) return false;
    return true;
  });
}

export function getDistinctPeriods(): string[] {
  const periods = new Set<string>();
  METRIC_OBSERVATIONS.forEach((obs) => periods.add(obs.period));
  return Array.from(periods).sort().reverse();
}

export function getDataQualityReport(): DataQualityReport {
  const periods = getDistinctPeriods();
  const verifiedCount = SOURCE_DOCUMENTS.filter((s) => s.isVerified).length;
  const nonComparable = METRIC_OBSERVATIONS.filter((obs) => !obs.isComparable).length;
  const missingSources = METRIC_OBSERVATIONS.filter((obs) => !obs.sourceDocId || !SOURCES_MAP[obs.sourceDocId]).length;

  return {
    totalObservations: METRIC_OBSERVATIONS.length,
    totalGuidanceObservations: GUIDANCE_OBSERVATIONS.length,
    totalSources: SOURCE_DOCUMENTS.length,
    verifiedSourcesRatio: Math.round((verifiedCount / (SOURCE_DOCUMENTS.length || 1)) * 100),
    missingSourcesCount: missingSources,
    nonComparableCount: nonComparable,
    lastUpdated: '2026-09-24',
    companiesCovered: COMPANIES_REGISTRY.length,
    periodsCovered: periods,
  };
}

export function getCoverageMatrix(): {
  companies: { id: string; name: string }[];
  periods: string[];
  matrix: Record<string, Record<string, 'available' | 'non_comparable' | 'missing'>>;
} {
  const companies = COMPANIES_REGISTRY.slice(0, 10).map((c) => ({ id: c.id, name: c.shortName }));
  const periods = getDistinctPeriods();
  const matrix: Record<string, Record<string, 'available' | 'non_comparable' | 'missing'>> = {};

  companies.forEach((comp) => {
    matrix[comp.id] = {};
    periods.forEach((p) => {
      const obsList = METRIC_OBSERVATIONS.filter((o) => o.companyId === comp.id && o.period === p);
      if (obsList.length === 0) {
        matrix[comp.id][p] = 'missing';
      } else {
        const hasNonComparable = obsList.some((o) => !o.isComparable);
        matrix[comp.id][p] = hasNonComparable ? 'non_comparable' : 'available';
      }
    });
  });

  return { companies, periods, matrix };
}

