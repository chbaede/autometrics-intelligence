/**
 * AutoMetrics Intelligence — Metric Semantic Contract (STEP 5 Remediation Round 4, P1)
 *
 * Provides a formal semantic registry and evaluation engine to guarantee that
 * numeric values are proven to belong to the claimed metric, rather than
 * relying on loose keyword regexes or caller-supplied claims.
 */

import { ReportingScope, AccountingBasis, MetricUnit } from '../types/metrics';

export type MetricId = string;

export interface ConditionallyEquivalentRule {
  alias: string;
  requiredScope?: ReportingScope;
  requiredBasis?: AccountingBasis;
}

export interface MetricSemanticRule {
  metricId: MetricId;
  exactLabels: string[];
  approvedAliases: string[];
  conditionallyEquivalent?: ConditionallyEquivalentRule[];
  incompatibleLabels: string[];
  expectedUnits: MetricUnit[];
}

export interface SemanticContext {
  cellText?: string;
  columnHeader?: string;
  rowHeader?: string;
  sectionHeading?: string;
  tableCaption?: string;
  claimedScope?: ReportingScope;
  claimedAccountingBasis?: AccountingBasis;
  unitContext?: MetricUnit | string;
  provenUnit?: MetricUnit;
  isTableRow?: boolean;
}

export interface SemanticEvaluationResult {
  valid: boolean;
  matchedLabel?: string;
  matchedRuleType?: 'exact' | 'alias' | 'conditional';
  failureReason?: 'incompatibleMetricSemantic' | 'unprovenMetricSemantic' | 'unknownMetricId' | 'conditionalRequirementNotMet' | 'unitMismatch';
  failureDiagnostic?: string;
}

export const METRIC_SEMANTIC_REGISTRY: Record<string, MetricSemanticRule> = {
  operating_margin: {
    metricId: 'operating_margin',
    exactLabels: ['operating margin', 'return on sales', 'ros'],
    approvedAliases: [
      'operating ros',
      'adjusted ros',
      'adjusted return on sales',
      'operating return on sales',
      'ebit margin',
      'adjusted ebit margin',
      'automotive ebit margin',
      'cars adjusted ros',
    ],
    incompatibleLabels: [
      'gross margin',
      'net margin',
      'operating profit',
      'operating income',
      'group revenue',
      'revenues',
      'revenue',
      'wholesale shipments',
      'retail sales',
    ],
    expectedUnits: ['percentage'],
  },
  operating_income: {
    metricId: 'operating_income',
    exactLabels: ['operating income', 'operating profit', 'operating result'],
    approvedAliases: [
      'ebit',
      'adjusted ebit',
      'adjusted operating profit',
      'group ebit',
      'group operating profit',
      'operating earnings',
    ],
    incompatibleLabels: [
      'operating margin',
      'return on sales',
      'ros',
      'revenue',
      'revenues',
      'net income',
      'net profit',
      'wholesale shipments',
      'retail sales',
    ],
    expectedUnits: ['currency_millions', 'currency_billions'],
  },
  revenue: {
    metricId: 'revenue',
    exactLabels: ['revenue', 'revenues'],
    approvedAliases: [
      'group revenue',
      'sales revenue',
      'total revenue',
      'turnover',
      'umsatz',
      'umsätze',
    ],
    incompatibleLabels: [
      'operating profit',
      'net profit',
      'operating margin',
      'return on sales',
      'ebit',
      'operating income',
      'wholesale shipments',
      'retail sales',
    ],
    expectedUnits: ['currency_millions', 'currency_billions'],
  },
  deliveries_global: {
    metricId: 'deliveries_global',
    exactLabels: ['deliveries', 'delivered', 'vehicle deliveries'],
    approvedAliases: [
      'global deliveries',
      'group deliveries',
      'total deliveries',
      'worldwide deliveries',
      'deliveries global',
      'vehicle deliveries worldwide',
    ],
    incompatibleLabels: [
      'production',
      'order intake',
      'retail deliveries',
      'wholesale shipments',
      'wholesale sales',
      'bev deliveries',
      'all-electric deliveries',
      'operating profit',
      'revenue',
    ],
    expectedUnits: ['units', 'thousand_units'],
  },
  retail_deliveries: {
    metricId: 'retail_deliveries',
    exactLabels: ['retail deliveries', 'retail sales'],
    approvedAliases: [
      'deliveries to customers',
      'customer deliveries',
      'retail volume',
    ],
    incompatibleLabels: [
      'wholesale shipments',
      'wholesale deliveries',
      'factory sales',
      'production',
      'revenue',
      'operating margin',
    ],
    expectedUnits: ['units', 'thousand_units'],
  },
  wholesale_shipments: {
    metricId: 'wholesale_shipments',
    exactLabels: ['wholesale shipments', 'wholesale deliveries', 'shipments'],
    approvedAliases: [
      'consolidated shipments',
      'factory sales',
      'wholesale volume',
    ],
    incompatibleLabels: [
      'retail deliveries',
      'retail sales',
      'deliveries to customers',
      'customer deliveries',
      'production',
      'revenue',
    ],
    expectedUnits: ['units', 'thousand_units'],
  },
  bev_deliveries: {
    metricId: 'bev_deliveries',
    exactLabels: ['bev deliveries', 'all-electric deliveries'],
    approvedAliases: [
      'battery electric vehicle deliveries',
      'fully electric deliveries',
      'bev sales',
      'all-electric sales',
      'bev volume',
    ],
    incompatibleLabels: [
      'phev deliveries',
      'hybrid deliveries',
      'combustion deliveries',
      'ice deliveries',
      'total deliveries',
      'global deliveries',
    ],
    expectedUnits: ['units', 'thousand_units'],
  },
  cars_adjusted_ebit: {
    metricId: 'cars_adjusted_ebit',
    exactLabels: ['cars adjusted ebit', 'adjusted ebit cars'],
    approvedAliases: [
      'adjusted ebit mercedes-benz cars',
      'mercedes-benz cars adjusted ebit',
    ],
    conditionallyEquivalent: [
      { alias: 'adjusted ebit', requiredScope: 'cars_segment', requiredBasis: 'adjusted' },
    ],
    incompatibleLabels: [
      'cars adjusted ebit margin',
      'return on sales',
      'ros',
      'vans adjusted ebit',
      'vans ebit',
      'revenue',
    ],
    expectedUnits: ['currency_millions', 'currency_billions'],
  },
  cars_adjusted_ebit_margin: {
    metricId: 'cars_adjusted_ebit_margin',
    exactLabels: ['cars adjusted ebit margin', 'adjusted ros cars'],
    approvedAliases: [
      'adjusted return on sales mercedes-benz cars',
      'ros cars',
      'cars ros',
      'mercedes-benz cars adjusted return on sales',
      'cars adjusted return on sales',
    ],
    conditionallyEquivalent: [
      { alias: 'adjusted return on sales', requiredScope: 'cars_segment', requiredBasis: 'adjusted' },
      { alias: 'return on sales', requiredScope: 'cars_segment' },
      { alias: 'ros', requiredScope: 'cars_segment' },
      { alias: 'adjusted ros', requiredScope: 'cars_segment', requiredBasis: 'adjusted' },
    ],
    incompatibleLabels: [
      'vans adjusted ebit margin',
      'vans ros',
      'cars adjusted ebit',
      'revenue',
      'wholesale shipments',
    ],
    expectedUnits: ['percentage'],
  },
  automotive_segment_ebit: {
    metricId: 'automotive_segment_ebit',
    exactLabels: ['automotive segment ebit', 'automotive ebit'],
    approvedAliases: [
      'ebit automotive',
      'ebit automotive segment',
    ],
    conditionallyEquivalent: [
      { alias: 'ebit', requiredScope: 'automotive_segment' },
    ],
    incompatibleLabels: [
      'motorcycles ebit',
      'financial services ebit',
      'automotive ebit margin',
      'revenue',
    ],
    expectedUnits: ['currency_millions', 'currency_billions'],
  },
};

/**
 * Normalizes a text string for fuzzy/token matching.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()[\]{}:;,.\\/|_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether an alias appears in target text as a distinct word boundary match.
 */
function containsAlias(textNorm: string, alias: string): boolean {
  const aliasNorm = normalizeText(alias);
  if (!aliasNorm) return false;
  const regex = new RegExp(`(^|\\s)${aliasNorm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(\\s|$)`, 'i');
  return regex.test(textNorm);
}

/**
 * Evaluates authoritative document text against the metric semantic contract (Round 4 P1, Round 5 P0).
 *
 * Rules:
 *  1. Unknown metric IDs fail closed with unknownMetricId.
 *  2. Enforce MetricSemanticRule.expectedUnits against proven unit.
 *  3. Incompatible labels are checked FIRST -> fails immediately.
 *  4. For table cells/rows, metric identity MUST be proven by local row/cell/column context.
 *     Section heading and table caption alone CANNOT establish metric identity.
 *  5. Exact labels, approved aliases, and qualified conditional aliases must match local context.
 */
export function evaluateMetricSemantic(
  metricId: string,
  context: SemanticContext
): SemanticEvaluationResult {
  const rule = METRIC_SEMANTIC_REGISTRY[metricId];

  // 1. Unknown metric IDs fail closed
  if (!rule) {
    return {
      valid: false,
      failureReason: 'unknownMetricId',
      failureDiagnostic: `Metric ID "${metricId}" is not registered in the authoritative METRIC_SEMANTIC_REGISTRY. Unknown metrics fail closed.`,
    };
  }

  // 1b. Enforce MetricSemanticRule.expectedUnits against proven unit (Round 5 P0-6)
  const unitToCheck = context.provenUnit ?? (context.unitContext as MetricUnit | undefined);
  if (unitToCheck && rule.expectedUnits && rule.expectedUnits.length > 0) {
    if (!rule.expectedUnits.includes(unitToCheck as MetricUnit)) {
      return {
        valid: false,
        failureReason: 'unitMismatch',
        failureDiagnostic: `Proven unit "${unitToCheck}" is not compatible with expected units [${rule.expectedUnits.join(', ')}] for metric "${metricId}".`,
      };
    }
  }

  // Authoritative contexts separated into local vs broad (Round 5 P0)
  const localRowLabelContext = [context.rowHeader, context.cellText].filter(Boolean).join(' | ');
  const localColumnContext = context.columnHeader ?? '';
  const localContext = [localRowLabelContext, localColumnContext].filter(Boolean).join(' | ');
  const broadContext = [context.sectionHeading, context.tableCaption].filter(Boolean).join(' | ');
  const combinedContext = [localContext, broadContext].filter(Boolean).join(' | ');

  const normLocal = normalizeText(localContext);
  const normCombined = normalizeText(combinedContext);

  if (!normCombined) {
    return {
      valid: false,
      failureReason: 'unprovenMetricSemantic',
      failureDiagnostic: `No authoritative text available in row header, column header, cell, or caption to verify metric "${metricId}".`,
    };
  }

  // 2. Incompatible Labels check FIRST -> fails immediately
  // Check local context first
  for (const incomp of rule.incompatibleLabels) {
    if (containsAlias(normLocal, incomp)) {
      // Special allowance: if text contains both ros and ebit margin where ros is approved
      if (
        metricId === 'operating_margin' &&
        (containsAlias(normLocal, 'ros') || containsAlias(normLocal, 'return on sales')) &&
        (incomp === 'operating profit' || incomp === 'ebit') &&
        (containsAlias(normLocal, 'ebit margin') || containsAlias(normLocal, 'adjusted ros') || containsAlias(normLocal, 'ros'))
      ) {
        continue;
      }

      return {
        valid: false,
        failureReason: 'incompatibleMetricSemantic',
        failureDiagnostic: `Authoritative local context contains incompatible label "${incomp}" which contradicts claimed metric "${metricId}".`,
      };
    }
  }

  // Check if broad section heading or caption contradicts local row/cell (e.g. section heading is Revenue, but row is operating income)
  if (context.sectionHeading && normLocal) {
    for (const incomp of rule.incompatibleLabels) {
      if (containsAlias(normalizeText(context.sectionHeading), incomp) && containsAlias(normLocal, incomp)) {
        return {
          valid: false,
          failureReason: 'incompatibleMetricSemantic',
          failureDiagnostic: `Context contains incompatible label "${incomp}" which contradicts claimed metric "${metricId}".`,
        };
      }
    }
  }

  // 3. Section heading or table caption ALONE cannot establish metric identity (Round 5 P0-1/2)
  const isTable = context.isTableRow !== false && (
    context.rowHeader !== undefined ||
    context.columnHeader !== undefined ||
    context.cellText !== undefined ||
    context.isTableRow === true
  );

  if (isTable) {
    if (!normLocal || normLocal.trim() === '') {
      return {
        valid: false,
        failureReason: 'unprovenMetricSemantic',
        failureDiagnostic: `Selected cell or row has no metric label. Section heading or caption alone cannot establish metric identity.`,
      };
    }

    // Must find metric match in localContext
    let localMatchedLabel: string | undefined;
    let localMatchedRuleType: 'exact' | 'alias' | 'conditional' | undefined;

    for (const exact of rule.exactLabels) {
      if (containsAlias(normLocal, exact)) {
        localMatchedLabel = exact;
        localMatchedRuleType = 'exact';
        break;
      }
    }

    if (!localMatchedLabel) {
      for (const alias of rule.approvedAliases) {
        if (containsAlias(normLocal, alias)) {
          localMatchedLabel = alias;
          localMatchedRuleType = 'alias';
          break;
        }
      }
    }

    if (!localMatchedLabel && rule.conditionallyEquivalent && rule.conditionallyEquivalent.length > 0) {
      for (const cond of rule.conditionallyEquivalent) {
        if (containsAlias(normLocal, cond.alias)) {
          let conditionMet = true;
          let failureDetails = '';

          if (cond.requiredScope && context.claimedScope !== cond.requiredScope) {
            conditionMet = false;
            failureDetails += `Requires scope "${cond.requiredScope}" but claimed scope is "${context.claimedScope ?? 'none'}". `;
          }

          if (cond.requiredBasis && context.claimedAccountingBasis !== cond.requiredBasis) {
            conditionMet = false;
            failureDetails += `Requires accounting basis "${cond.requiredBasis}" but claimed basis is "${context.claimedAccountingBasis ?? 'none'}". `;
          }

          if (conditionMet) {
            localMatchedLabel = cond.alias;
            localMatchedRuleType = 'conditional';
            break;
          } else {
            return {
              valid: false,
              failureReason: 'conditionalRequirementNotMet',
              failureDiagnostic: `Alias "${cond.alias}" found for "${metricId}", but conditional requirements failed: ${failureDetails.trim()}`,
            };
          }
        }
      }
    }

    if (!localMatchedLabel) {
      return {
        valid: false,
        failureReason: 'unprovenMetricSemantic',
        failureDiagnostic: `Selected row/cell lacks a metric label matching "${metricId}". Section heading or caption alone cannot establish metric identity for a table cell.`,
      };
    }

    return {
      valid: true,
      matchedLabel: localMatchedLabel,
      matchedRuleType: localMatchedRuleType,
    };
  }

  // Non-table paragraph or text block fallback
  for (const incomp of rule.incompatibleLabels) {
    if (containsAlias(normCombined, incomp)) {
      return {
        valid: false,
        failureReason: 'incompatibleMetricSemantic',
        failureDiagnostic: `Authoritative context contains incompatible label "${incomp}" which contradicts claimed metric "${metricId}".`,
      };
    }
  }

  for (const exact of rule.exactLabels) {
    if (containsAlias(normCombined, exact)) {
      return {
        valid: true,
        matchedLabel: exact,
        matchedRuleType: 'exact',
      };
    }
  }

  for (const alias of rule.approvedAliases) {
    if (containsAlias(normCombined, alias)) {
      return {
        valid: true,
        matchedLabel: alias,
        matchedRuleType: 'alias',
      };
    }
  }

  if (rule.conditionallyEquivalent && rule.conditionallyEquivalent.length > 0) {
    for (const cond of rule.conditionallyEquivalent) {
      if (containsAlias(normCombined, cond.alias)) {
        let conditionMet = true;
        let failureDetails = '';

        if (cond.requiredScope && context.claimedScope !== cond.requiredScope) {
          conditionMet = false;
          failureDetails += `Requires scope "${cond.requiredScope}" but claimed scope is "${context.claimedScope ?? 'none'}". `;
        }

        if (cond.requiredBasis && context.claimedAccountingBasis !== cond.requiredBasis) {
          conditionMet = false;
          failureDetails += `Requires accounting basis "${cond.requiredBasis}" but claimed basis is "${context.claimedAccountingBasis ?? 'none'}". `;
        }

        if (conditionMet) {
          return {
            valid: true,
            matchedLabel: cond.alias,
            matchedRuleType: 'conditional',
          };
        } else {
          return {
            valid: false,
            failureReason: 'conditionalRequirementNotMet',
            failureDiagnostic: `Alias "${cond.alias}" found for "${metricId}", but conditional requirements failed: ${failureDetails.trim()}`,
          };
        }
      }
    }
  }

  return {
    valid: false,
    failureReason: 'unprovenMetricSemantic',
    failureDiagnostic: `No matching exact label, approved alias, or qualified conditional alias found in authoritative text ("${combinedContext}") for metric "${metricId}".`,
  };
}
