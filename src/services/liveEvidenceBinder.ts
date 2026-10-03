import {
  AccountingBasis,
  ClaimEvidenceLocator,
  ClaimVerificationEngineMethod,
  ClaimVerifiedResult,
  DocumentContentBlock,
  EvidenceSupportType,
  ExtractedLiveDocument,
  LiveEvidenceCandidate,
  LiveEvidenceLocator,
  LiveEvidenceValidationResult,
  LiveSourceDocument,
  MetricUnit,
  PeriodType,
  ProvenanceClaimDimensions,
  ReportingScope,
  SourceDocument,
} from '../types/metrics';
import { numericValuesMatch } from '../utils/metricCalculations';
import { evaluateMetricSemantic } from './metricSemanticContract';

export type {
  LiveEvidenceCandidate,
  LiveEvidenceLocator,
  LiveEvidenceValidationResult,
  ProvenanceClaimDimensions,
} from '../types/metrics';

/**
 * Parameters for binding live evidence to a target metric and claim dimensions (STEP 5-3).
 */
export interface LiveEvidenceBindingParams {
  /** Target source document identifier */
  sourceDocId?: string;
  /** Explicit evidence location (structured locator or string representation) */
  locator: LiveEvidenceLocator | string;
  /** Verbatim raw value text as stated in document content */
  rawValue: string;
  /** Explicit metric identifier (must not be inferred solely from raw number) */
  metricId?: string;
  /** Reporting scope */
  scope?: ReportingScope;
  /** Accounting basis */
  accountingBasis?: AccountingBasis;
  /** Reporting period (e.g. '2026-Q2', '2025-FY') */
  period?: string;
  /** Reporting period type */
  periodType?: PeriodType;
  /** Support type from standard EvidenceSupportType taxonomy */
  supportType: EvidenceSupportType;
  /** Metric unit */
  unit?: MetricUnit;
  /** Optional verbatim evidence text snippet (defaults to matched block text) */
  evidenceText?: string;
  /** Optional explicit column index in table row */
  columnIndex?: number;
}

/**
 * Parsed value and unit information (STEP 5-3, Section 3).
 */
export interface ParsedValueResult {
  rawValue: string;
  numericValue?: number;
  normalizedValue?: string;
  detectedUnit?: MetricUnit;
  unit?: MetricUnit;
}

/**
 * Parses raw text values and normalizes numeric values without altering meaning (STEP 5-3, Section 3).
 *
 * Explicitly handles:
 *  - Percentages: "12.4%", "-3.5%", "+2.3%"
 *  - Currency Billions: "€1.2 billion", "1.2bn", "$1.2B" (normalizes to millions if targetUnit is currency_millions)
 *  - Currency Millions: "1,200 million", "€629m", "28,240M"
 *  - Thousand units / Units: "480.13 thousand units", "480.13k", "412,300 units"
 *  - Pure numbers: "2.3", "1,200", "-10.5"
 */
export function parseValueAndUnit(rawValue: string, targetUnit?: MetricUnit): ParsedValueResult {
  const trimmed = (rawValue ?? '').trim();
  if (!trimmed) {
    return { rawValue: '', normalizedValue: '', unit: targetUnit };
  }

  // 1. Percentages: e.g. 12.4%, -3.5%, +2.3%
  const pctMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*%$/);
  if (pctMatch) {
    const val = parseFloat(pctMatch[1]);
    return {
      rawValue: trimmed,
      numericValue: val,
      normalizedValue: String(val),
      detectedUnit: 'percentage',
      unit: targetUnit ?? 'percentage',
    };
  }

  // 2. Billions: €1.2 billion, 1.2bn, $1.2B, 1.2B
  const bnMatch = trimmed.match(/^[^\d+-]*([+-]?\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:billion|bn|b)\b/i);
  if (bnMatch) {
    const num = parseFloat(bnMatch[1].replace(/,/g, ''));
    if (targetUnit === 'currency_millions') {
      const inMillions = num * 1000;
      return {
        rawValue: trimmed,
        numericValue: inMillions,
        normalizedValue: String(inMillions),
        detectedUnit: 'currency_billions',
        unit: 'currency_millions',
      };
    }
    return {
      rawValue: trimmed,
      numericValue: num,
      normalizedValue: String(num),
      detectedUnit: 'currency_billions',
      unit: targetUnit ?? 'currency_billions',
    };
  }

  // 3. Millions: €1,200 million, 1200m, 1,200 million, 629 million
  const mMatch = trimmed.match(/^[^\d+-]*([+-]?\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m)\b/i);
  if (mMatch) {
    const num = parseFloat(mMatch[1].replace(/,/g, ''));
    if (targetUnit === 'currency_billions') {
      const inBillions = num / 1000;
      return {
        rawValue: trimmed,
        numericValue: inBillions,
        normalizedValue: String(inBillions),
        detectedUnit: 'currency_millions',
        unit: 'currency_billions',
      };
    }
    return {
      rawValue: trimmed,
      numericValue: num,
      normalizedValue: String(num),
      detectedUnit: 'currency_millions',
      unit: targetUnit ?? 'currency_millions',
    };
  }

  // 4. Thousand units / k: 480.13 thousand units, 480.13k
  const kMatch = trimmed.match(/^[^\d+-]*([+-]?\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:thousand\s+units|k\s+units|k\b)/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(/,/g, ''));
    return {
      rawValue: trimmed,
      numericValue: num,
      normalizedValue: String(num),
      detectedUnit: 'thousand_units',
      unit: targetUnit ?? 'thousand_units',
    };
  }

  // 5. Units (pure integer/count with "units" suffix): 412,300 units
  const unitsMatch = trimmed.match(/^[^\d+-]*([+-]?\d+(?:,\d{3})*(?:\.\d+)?)\s*units\b/i);
  if (unitsMatch) {
    const num = parseFloat(unitsMatch[1].replace(/,/g, ''));
    return {
      rawValue: trimmed,
      numericValue: num,
      normalizedValue: String(num),
      detectedUnit: 'units',
      unit: targetUnit ?? 'units',
    };
  }

  // 6. Pure numbers: e.g. 2.3, -10, 1,200
  const pureNumMatch = trimmed.match(/^[^\d+-]*([+-]?\d+(?:,\d{3})*(?:\.\d+)?)[^\d]*$/);
  if (pureNumMatch) {
    const num = parseFloat(pureNumMatch[1].replace(/,/g, ''));
    return {
      rawValue: trimmed,
      numericValue: num,
      normalizedValue: String(num),
      unit: targetUnit,
    };
  }

  // 7. Non-numeric or raw text
  return {
    rawValue: trimmed,
    normalizedValue: trimmed,
    unit: targetUnit,
  };
}

/**
 * Checks whether a raw textual or numeric value is present in a document block text (STEP 5 Remediation Round 2, P0-2).
 *
 * Rules:
 *  1. Enforces explicit token boundaries: (?<![\d.]) and (?![\d.])
 *  2. Preserves signs, decimal precision, separators, percentage markers (%), and unit semantics.
 *  3. Rejects prefix/suffix numbers (e.g. 4.0 vs 14.0, 4.0 vs 4.01).
 *  4. Distinguishes percentage from pure numbers (e.g. 4.0% vs 4.0).
 *  5. Rejects sign mismatch (e.g. -4.0 vs 4.0).
 *  6. Normalizes valid thousands separators (e.g. 1,200 matches 1200).
 *  7. Enforces unit scale semantics (e.g. €1.2 billion does not match 1.2 million).
 *  8. Ambiguity gate: returns true ONLY if exactly one token in the block matches; multiple ambiguous matching values return false.
 */
export function isValuePresentInBlock(
  blockText: string,
  rawValue: string,
  numericValue?: number,
  targetUnit?: MetricUnit
): boolean {
  if (!blockText || !rawValue) return false;

  const claimParsed = parseValueAndUnit(rawValue, targetUnit);
  const targetNum = numericValue !== undefined && Number.isFinite(numericValue) ? numericValue : claimParsed.numericValue;

  // Non-numeric text presence check
  if (targetNum === undefined || !Number.isFinite(targetNum)) {
    const normBlock = blockText.replace(/\s+/g, ' ').trim().toLowerCase();
    const normRaw = rawValue.replace(/\s+/g, ' ').trim().toLowerCase();
    return normBlock.includes(normRaw);
  }

  const claimHasPercent = rawValue.includes('%') || targetUnit === 'percentage' || claimParsed.detectedUnit === 'percentage';
  const targetSign = Math.sign(targetNum);

  // Extract candidate tokens using strict boundary regex (?<![\d.]) and (?![\d.])
  // Replace sentence-ending periods with space so (?![\d.]) does not conflict with sentence full stops
  const sanitized = blockText.replace(/\.(?=\s|$)/g, ' ');
  const TOKEN_REGEX = /(?<![\d.])(?:[€$£¥]\s*)?[+-]?\d+(?:,\d{3})*(?:\.\d+)?\s*(?:%|billion|bn|b\b|million|m\b|thousand\s+units|k\s+units|k\b|units\b)?(?![\d.])/gi;
  const rawTokens = sanitized.match(TOKEN_REGEX) || [];

  const matchingTokens: string[] = [];

  for (const rawToken of rawTokens) {
    const tokenParsed = parseValueAndUnit(rawToken, targetUnit);
    if (tokenParsed.numericValue === undefined || !Number.isFinite(tokenParsed.numericValue)) {
      continue;
    }

    // 1. Sign match (+ vs -)
    if (Math.sign(tokenParsed.numericValue) !== targetSign) {
      continue;
    }

    // 2. Percentage marker match: both must have % or neither
    const tokenHasPercent = rawToken.includes('%') || tokenParsed.detectedUnit === 'percentage';
    if (claimHasPercent !== tokenHasPercent) {
      continue;
    }

    // 3. Unit semantics if both declare detected unit
    if (claimParsed.detectedUnit && tokenParsed.detectedUnit && claimParsed.detectedUnit !== tokenParsed.detectedUnit) {
      continue;
    }

    // 4. Exact decimal precision and value match (within 1e-4)
    if (Math.abs(tokenParsed.numericValue - targetNum) > 1e-4) {
      continue;
    }

    matchingTokens.push(rawToken);
  }

  // Exact single match required: 0 matches = false; multiple ambiguous matches = false
  return matchingTokens.length === 1;
}

/**
 * Result of authoritative document-derived dimension verification (STEP 5 Remediation Round 3, P0).
 */
export interface DocumentDimensionVerificationResult {
  valid: boolean;
  failureReason?: string;
  failureDiagnostic?: string;
  provenDimensions: ProvenanceClaimDimensions;
}

export interface ExtractedPeriod {
  raw: string;
  normalized: string;
  periodType?: PeriodType;
}

/**
 * Extracts and normalizes fiscal periods from text (e.g. 'Q2 2026', '2026-Q2', 'Second Quarter 2026', 'Six Months Ended...').
 */
export function extractPeriodsFromText(text: string): ExtractedPeriod[] {
  if (!text) return [];
  const results: ExtractedPeriod[] = [];
  const re = /\b(?:(Q[1-4])\s*(20\d\d)|(20\d\d)\s*[-/]\s*(Q[1-4])|(FY)\s*(20\d\d)|(20\d\d)\s*[-/]\s*(FY)|(Three\s+Months\s+Ended\s+[A-Za-z]+\s+\d{1,2},\s*(20\d\d))|(Six\s+Months\s+Ended\s+[A-Za-z]+\s+\d{1,2},\s*(20\d\d))|(Nine\s+Months\s+Ended\s+[A-Za-z]+\s+\d{1,2},\s*(20\d\d))|(Twelve\s+Months\s+Ended\s+[A-Za-z]+\s+\d{1,2},\s*(20\d\d))|(Second\s+Quarter|First\s+Quarter|Third\s+Quarter|Fourth\s+Quarter)\s*(20\d\d)|to\s+\d{1,2}\s+[A-Za-z]+\s+(20\d\d)\s*\((Q[1-4])\)|(H[12]|First\s+Half)\s*(20\d\d)|(9M|Nine\s+Months)\s*(20\d\d))\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    let normalized = '';
    let periodType: PeriodType | undefined;

    if (m[1] && m[2]) {
      normalized = `${m[2]}-${m[1].toUpperCase()}`;
      periodType = 'quarterly';
    } else if (m[3] && m[4]) {
      normalized = `${m[3]}-${m[4].toUpperCase()}`;
      periodType = 'quarterly';
    } else if (m[5] && m[6]) {
      normalized = `${m[6]}-FY`;
      periodType = 'annual';
    } else if (m[7] && m[8]) {
      normalized = `${m[7]}-FY`;
      periodType = 'annual';
    } else if (m[9] && m[10]) {
      const year = m[10];
      const lower = m[9].toLowerCase();
      const q = lower.includes('march') ? 'Q1' : lower.includes('june') ? 'Q2' : lower.includes('september') ? 'Q3' : lower.includes('december') ? 'Q4' : '';
      if (q) normalized = `${year}-${q}`;
      periodType = 'quarterly';
    } else if (m[11] && m[12]) {
      const year = m[12];
      normalized = `${year}-H1`;
      periodType = 'semi_annual';
    } else if (m[13] && m[14]) {
      const year = m[14];
      normalized = `${year}-9M`;
      periodType = 'nine_months';
    } else if (m[15] && m[16]) {
      const year = m[16];
      normalized = `${year}-FY`;
      periodType = 'annual';
    } else if (m[17] && m[18]) {
      const year = m[18];
      const lower = m[17].toLowerCase();
      const q = lower.includes('first') ? 'Q1' : lower.includes('second') ? 'Q2' : lower.includes('third') ? 'Q3' : 'Q4';
      normalized = `${year}-${q}`;
      periodType = 'quarterly';
    } else if (m[19] && m[20]) {
      normalized = `${m[19]}-${m[20].toUpperCase()}`;
      periodType = 'quarterly';
    } else if (m[21] && m[22]) {
      const year = m[22];
      normalized = `${year}-H1`;
      periodType = 'semi_annual';
    } else if (m[23] && m[24]) {
      const year = m[24];
      normalized = `${year}-9M`;
      periodType = 'nine_months';
    }

    if (normalized && !results.some((r) => r.normalized === normalized)) {
      results.push({ raw, normalized, periodType });
    }
  }
  return results;
}

/**
 * Authoritatively verifies that the extracted document block and its table structure
 * directly prove every claimed dimension (metric, accounting basis, reporting scope, period, unit)
 * rather than trusting unverified caller assertions (STEP 5 Remediation Round 3 & 4).
 */
export function verifyDocumentClaimDimensions(
  matchedBlock: DocumentContentBlock,
  claim: ClaimEvidenceLocator | undefined,
  rawValue: string,
  numericValue?: number,
  targetUnit?: MetricUnit,
  extDoc?: ExtractedLiveDocument,
  locatorColIdx?: number
): DocumentDimensionVerificationResult {
  const blockText = matchedBlock.text ?? '';
  let cellText = blockText;
  let columnHeader: string | undefined;
  let rowHeader: string | undefined;
  let tableCoordinates: {
    tableIndex?: number;
    rowIndex?: number;
    columnIndex?: number;
    columnHeader?: string;
    rowHeader?: string;
    cellText?: string;
    unitContext?: string;
  } | undefined;

  // 1. Table cell resolution (fail closed)
  if (matchedBlock.blockType === 'table_row') {
    if (matchedBlock.isMalformed) {
      return {
        valid: false,
        failureReason: 'unresolvedTableCell',
        failureDiagnostic: 'Table structure is malformed and cannot reliably support claim verification.',
        provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unresolvedTableCell'] },
      };
    }

    if (!matchedBlock.cells || matchedBlock.cells.length === 0) {
      return {
        valid: false,
        failureReason: 'unresolvedTableCell',
        failureDiagnostic: 'Table row lacks structured cell metadata. Whole-row text fallback is forbidden.',
        provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unresolvedTableCell'] },
      };
    }

    const matchingCellIndices: number[] = [];
    matchedBlock.cells.forEach((c, idx) => {
      if (isValuePresentInBlock(c, rawValue, numericValue, targetUnit ?? claim?.claimedUnit)) {
        matchingCellIndices.push(idx);
      }
    });

    if (matchingCellIndices.length === 0) {
      return {
        valid: false,
        failureReason: 'unresolvedTableCell',
        failureDiagnostic: `Claimed value "${rawValue}" does not match any cell in table row. Whole-row text fallback is forbidden.`,
        provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unresolvedTableCell'] },
      };
    }

    let resolvedColIdx: number | undefined;
    const targetCol = locatorColIdx;

    if (targetCol !== undefined) {
      if (!matchingCellIndices.includes(targetCol)) {
        return {
          valid: false,
          failureReason: 'cellIndexMismatch',
          failureDiagnostic: `Target column index ${targetCol} does not contain claimed value "${rawValue}". Value exists elsewhere in the row or is absent from target cell.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['cellIndexMismatch'] },
        };
      }
      resolvedColIdx = targetCol;
    } else {
      if (matchingCellIndices.length === 1) {
        resolvedColIdx = matchingCellIndices[0];
      } else {
        // Repeated values in two or more columns: disambiguate using column headers
        const targetPeriod = claim?.claimedPeriod;
        const targetBasis = claim?.claimedAccountingBasis;
        const targetMetric = claim?.claimedMetricId;

        const filtered = matchingCellIndices.filter((idx) => {
          const colH = (matchedBlock.columnHeaders?.[idx] ?? '').toLowerCase();
          if (targetPeriod) {
            const periods = extractPeriodsFromText(colH);
            if (periods.length > 0 && !periods.some((p) => p.normalized === targetPeriod)) return false;
          }
          if (targetBasis === 'adjusted') {
            if (/\b(unadjusted|reported|statutory)\b/i.test(colH)) return false;
          } else if (targetBasis === 'reported') {
            if (/\b(adjusted|adj\.?|bereinigt)\b/i.test(colH)) return false;
          }
          if (targetMetric) {
            const sem = evaluateMetricSemantic(targetMetric, { columnHeader: colH });
            if (/\b(revenue|ebit|deliveries|margin|profit|sales)\b/i.test(colH) && !sem.valid) return false;
          }
          return true;
        });

        if (filtered.length === 1) {
          resolvedColIdx = filtered[0];
        } else {
          return {
            valid: false,
            failureReason: 'ambiguousDimensionEvidence',
            failureDiagnostic: `Repeated value "${rawValue}" matched multiple table columns (${matchingCellIndices.join(', ')}) without unambiguous header resolution.`,
            provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['ambiguousDimensionEvidence'] },
          };
        }
      }
    }

    if (resolvedColIdx === undefined) {
      return {
        valid: false,
        failureReason: 'unresolvedTableCell',
        failureDiagnostic: `Could not resolve a unique table cell for value "${rawValue}".`,
        provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unresolvedTableCell'] },
      };
    }

    cellText = matchedBlock.cells[resolvedColIdx];
    columnHeader = matchedBlock.columnHeaders?.[resolvedColIdx];
    rowHeader = matchedBlock.rowHeader ?? (matchedBlock.cells.length > 1 ? matchedBlock.cells[0] : undefined);
    tableCoordinates = {
      tableIndex: matchedBlock.tableIndex,
      rowIndex: matchedBlock.rowIndex,
      columnIndex: resolvedColIdx,
      columnHeader,
      rowHeader,
      cellText,
      unitContext: matchedBlock.unitContext,
    };
  }

  // 2. Unstructured block multi-metric ambiguity check
  if (matchedBlock.blockType !== 'table_row' || !tableCoordinates) {
    const numberMatches = blockText.match(/(?<![\d.])[+-]?\d+(?:,\d{3})*(?:\.\d+)?%?(?![\d.])/g) || [];
    if (numberMatches.length > 1) {
      const metricMatchesCount =
        (/\b(revenue|revenues)\b/i.test(blockText) ? 1 : 0) +
        (/\b(ebit|operating\s+(?:profit|income|result))\b/i.test(blockText) ? 1 : 0) +
        (/\b(return\s+on\s+sales|ros|operating\s+margin)\b/i.test(blockText) ? 1 : 0) +
        (/\b(deliveries|sales\s+volume)\b/i.test(blockText) ? 1 : 0);

      if (metricMatchesCount > 1) {
        const targetValEsc = rawValue.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        let isPaired = false;
        if (claim?.claimedMetricId === 'operating_margin') {
          const pairRegex = new RegExp(`(?:return\\s+on\\s+sales|ros|operating\\s+margin)[^,.;|]{0,35}${targetValEsc}|${targetValEsc}[^,.;|]{0,35}(?:return\\s+on\\s+sales|ros|operating\\s+margin)`, 'i');
          isPaired = pairRegex.test(blockText);
        } else if (claim?.claimedMetricId === 'operating_income') {
          const pairRegex = new RegExp(`(?:operating\\s+(?:income|profit|result)|ebit)[^,.;|]{0,35}${targetValEsc}|${targetValEsc}[^,.;|]{0,35}(?:operating\\s+(?:income|profit|result)|ebit)`, 'i');
          isPaired = pairRegex.test(blockText);
        } else if (claim?.claimedMetricId === 'revenue') {
          const pairRegex = new RegExp(`(?:revenue|revenues)[^,.;|]{0,35}${targetValEsc}|${targetValEsc}[^,.;|]{0,35}(?:revenue|revenues)`, 'i');
          isPaired = pairRegex.test(blockText);
        } else if (claim?.claimedMetricId === 'deliveries_global') {
          const pairRegex = new RegExp(`(?:deliveries|delivered)[^,.;|]{0,35}${targetValEsc}|${targetValEsc}[^,.;|]{0,35}(?:deliveries|delivered)`, 'i');
          isPaired = pairRegex.test(blockText);
        }

        if (!isPaired) {
          return {
            valid: false,
            failureReason: 'ambiguousDimensionEvidence',
            failureDiagnostic: `Block contains multiple metrics and numbers without structured association to value "${rawValue}". Numeric presence alone cannot match ambiguous block.`,
            provenDimensions: {
              bindingStatus: 'unproven',
              unprovenReasons: ['ambiguousDimensionEvidence'],
              tableCoordinates,
            },
          };
        }
      }
    }
  }

  // 3. Metric Semantic Verification (P1 Centralized Metric Semantic Contract)
  let matchedMetricLabel: string | undefined;
  if (claim?.claimedMetricId) {
    const semEval = evaluateMetricSemantic(claim.claimedMetricId, {
      cellText,
      columnHeader,
      rowHeader,
      sectionHeading: matchedBlock.sectionHeading,
      tableCaption: matchedBlock.tableCaption,
      claimedScope: claim.claimedScope,
      claimedAccountingBasis: claim.claimedAccountingBasis,
    });

    if (!semEval.valid) {
      return {
        valid: false,
        failureReason: semEval.failureReason,
        failureDiagnostic: semEval.failureDiagnostic,
        provenDimensions: {
          bindingStatus: 'unproven',
          unprovenReasons: [semEval.failureReason ?? 'unprovenMetricSemantic'],
          tableCoordinates,
        },
      };
    }
    matchedMetricLabel = semEval.matchedLabel;
  }

  // 4. Accounting Basis Verification (P0 Positive Proof)
  let matchedBasisLabel: string | undefined;
  if (claim?.claimedAccountingBasis) {
    const basisContext = [columnHeader, rowHeader, cellText, matchedBlock.tableCaption, matchedBlock.sectionHeading, matchedBlock.text].filter(Boolean).join(' | ');

    if (claim.claimedAccountingBasis === 'adjusted') {
      const match = basisContext.match(/\b(adjusted|adj\.?|bereinigt|before\s+special\s+items|vor\s+sondereinflüssen)\b/i);
      if (match) {
        matchedBasisLabel = match[0];
      } else {
        return {
          valid: false,
          failureReason: 'unprovenAccountingBasis',
          failureDiagnostic: `Accounting basis "adjusted" is not proven by authoritative text ("${basisContext}"). Source text/table lacks explicit "adjusted" indicator.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenAccountingBasis'], tableCoordinates },
        };
      }
    } else if (claim.claimedAccountingBasis === 'non_gaap') {
      const match = basisContext.match(/\b(non-gaap|non\s+gaap|apm|alternative\s+performance\s+measures?)\b/i);
      if (match) {
        matchedBasisLabel = match[0];
      } else {
        return {
          valid: false,
          failureReason: 'unprovenAccountingBasis',
          failureDiagnostic: `Accounting basis "non_gaap" is not proven by authoritative text ("${basisContext}").`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenAccountingBasis'], tableCoordinates },
        };
      }
    } else if (claim.claimedAccountingBasis === 'management_defined') {
      const match = basisContext.match(/\b(management-defined|management\s+definition|internal\s+management\s+view)\b/i);
      if (match) {
        matchedBasisLabel = match[0];
      } else {
        return {
          valid: false,
          failureReason: 'unprovenAccountingBasis',
          failureDiagnostic: `Accounting basis "management_defined" is not proven by authoritative text ("${basisContext}").`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenAccountingBasis'], tableCoordinates },
        };
      }
    } else if (claim.claimedAccountingBasis === 'reported') {
      // Contradiction check: explicit adjusted/non-gaap contradicts reported
      if (/\b(adjusted|adj\.?|bereinigt)\b/i.test(basisContext)) {
        return {
          valid: false,
          failureReason: 'accountingBasisMismatch',
          failureDiagnostic: `Document text explicitly specifies "adjusted" accounting basis, which contradicts claimed "reported" basis.`,
          provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['accountingBasisMismatch'], tableCoordinates },
        };
      }
      // Positive proof required (no silent inference from absence of "adjusted")
      const reportedMatch =
        basisContext.match(/\b(as\s+reported|reported|ifrs|us\s+gaap|gaap|statutory|unadjusted|gemäß\s+ifrs)\b/i) ||
        (matchedBlock.tableCaption && matchedBlock.tableCaption.match(/\b(ifrs|gaap|reported)\b/i)) ||
        (extDoc?.documentTitle && extDoc.documentTitle.match(/\b(ifrs|gaap)\b/i));

      if (reportedMatch) {
        matchedBasisLabel = reportedMatch[0];
      } else {
        return {
          valid: false,
          failureReason: 'unprovenAccountingBasis',
          failureDiagnostic: 'Accounting basis "reported" requires explicit basis indicator (IFRS/GAAP/reported) or documented source convention; absence of "adjusted" alone is insufficient.',
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenAccountingBasis'], tableCoordinates },
        };
      }
    } else {
      return {
        valid: false,
        failureReason: 'unprovenAccountingBasis',
        failureDiagnostic: `Accounting basis "${claim.claimedAccountingBasis}" is unknown or unproven.`,
        provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenAccountingBasis'], tableCoordinates },
      };
    }
  }

  // 5. Reporting Scope Verification (P0 Positive Proof)
  let matchedScopeLabel: string | undefined;
  if (claim?.claimedScope) {
    const scopeContext = [rowHeader, columnHeader, cellText, matchedBlock.tableCaption, matchedBlock.sectionHeading, matchedBlock.text].filter(Boolean).join(' | ');

    if (claim.claimedScope === 'cars_segment') {
      const match = scopeContext.match(/\b(mercedes-benz\s+cars|cars\s+division|cars\s+segment|cars|passenger\s+cars|pkw)\b/i);
      if (match) {
        matchedScopeLabel = match[0];
      } else {
        return {
          valid: false,
          failureReason: 'unprovenReportingScope',
          failureDiagnostic: `Reporting scope "cars_segment" is not proven by authoritative document text. Source lacks explicit cars segment indicator.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenReportingScope'], tableCoordinates },
        };
      }
    } else if (claim.claimedScope === 'automotive_segment') {
      const match = scopeContext.match(/\b(automotive\s+segment|automotive\s+division|automotive|automobile|auto\s+segment)\b/i);
      if (match) {
        matchedScopeLabel = match[0];
      } else {
        return {
          valid: false,
          failureReason: 'unprovenReportingScope',
          failureDiagnostic: `Reporting scope "automotive_segment" is not proven by authoritative document text.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenReportingScope'], tableCoordinates },
        };
      }
    } else if (claim.claimedScope === 'consolidated_group') {
      // Contradiction check: must not belong to isolated segment
      const lineOrCol = [rowHeader, cellText].filter(Boolean).join(' | ');
      if (/\b(vans\s+division|trucks\s+segment|financial\s+services)\b/i.test(lineOrCol)) {
        return {
          valid: false,
          failureReason: 'scopeMismatch',
          failureDiagnostic: `Document text explicitly specifies segment "${lineOrCol}", which contradicts consolidated_group scope.`,
          provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['scopeMismatch'], tableCoordinates },
        };
      }
      // Positive proof required: absence of contradiction is insufficient
      const groupMatch = scopeContext.match(/\b(consolidated\s+group|group|consolidated|total\s+group|total|gesamt|konzern)\b/i);
      if (groupMatch) {
        matchedScopeLabel = groupMatch[0];
      } else {
        return {
          valid: false,
          failureReason: 'unprovenReportingScope',
          failureDiagnostic: 'Reporting scope "consolidated_group" requires authoritative group/consolidated context linked to the selected value; absence of segment contradiction alone is insufficient.',
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenReportingScope'], tableCoordinates },
        };
      }
    } else {
      return {
        valid: false,
        failureReason: 'unprovenReportingScope',
        failureDiagnostic: `Reporting scope "${claim.claimedScope}" is unknown or unproven.`,
        provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenReportingScope'], tableCoordinates },
      };
    }
  }

  // 6. Reporting Period Verification (P0: bound to value, not merely present in document)
  let matchedPeriodLabel: string | undefined;
  if (claim?.claimedPeriod) {
    const targetPeriod = claim.claimedPeriod;

    if (matchedBlock.blockType === 'table_row') {
      let boundPeriodFound = false;

      // a. Check column header (prefer explicit column header and hierarchical header associations)
      if (columnHeader) {
        const colPeriods = extractPeriodsFromText(columnHeader);
        if (colPeriods.length > 0) {
          const hasQuarterly = colPeriods.some((p) => p.periodType === 'quarterly');
          const hasNonQuarterly = colPeriods.some((p) => p.periodType && p.periodType !== 'quarterly');
          if (claim.claimedPeriodType === 'quarterly' && !hasQuarterly && hasNonQuarterly) {
            return {
              valid: false,
              failureReason: 'periodTypeMismatch',
              failureDiagnostic: `Table column specifies non-quarterly period ("${colPeriods[0].raw}"), which contradicts claimed quarterly period "${targetPeriod}".`,
              provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['periodTypeMismatch'], tableCoordinates },
            };
          }

          const matchesCol = colPeriods.find((p) => p.normalized === targetPeriod);
          if (!matchesCol) {
            return {
              valid: false,
              failureReason: 'unprovenReportingPeriod',
              failureDiagnostic: `Authoritative table column specifies period "${colPeriods[0].raw}", which contradicts claimed period "${targetPeriod}".`,
              provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['unprovenReportingPeriod'], tableCoordinates },
            };
          }

          if (claim.claimedPeriodType === 'quarterly' && matchesCol.periodType && matchesCol.periodType !== 'quarterly') {
            return {
              valid: false,
              failureReason: 'periodTypeMismatch',
              failureDiagnostic: `Table column specifies ${matchesCol.periodType} period ("${matchesCol.raw}"), which contradicts claimed quarterly period "${targetPeriod}".`,
              provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['periodTypeMismatch'], tableCoordinates },
            };
          }

          // Check if row header or cell explicitly specifies a conflicting period
          const rowOrCellContext = [rowHeader, cellText].filter(Boolean).join(' | ');
          const rowPeriods = extractPeriodsFromText(rowOrCellContext);
          if (rowPeriods.length > 0 && !rowPeriods.some((p) => p.normalized === targetPeriod)) {
            return {
              valid: false,
              failureReason: 'contradictedReportingPeriod',
              failureDiagnostic: `Conflicting period in row/cell ("${rowPeriods[0].raw}") contradicts column period "${targetPeriod}".`,
              provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['contradictedReportingPeriod'], tableCoordinates },
            };
          }

          matchedPeriodLabel = matchesCol.raw;
          boundPeriodFound = true;
        }
      }

      // b. Check hierarchical context headers / table caption / rowHeader if not in columnHeader
      if (!boundPeriodFound) {
        const tableContext = [
          ...(matchedBlock.contextHeaders ?? []),
          matchedBlock.tableCaption,
          rowHeader,
          cellText,
        ].filter(Boolean).join(' | ');

        const tablePeriods = extractPeriodsFromText(tableContext);
        if (tablePeriods.length > 0) {
          const match = tablePeriods.find((p) => p.normalized === targetPeriod);
          if (match) {
            if (claim.claimedPeriodType === 'quarterly' && match.periodType && match.periodType !== 'quarterly') {
              return {
                valid: false,
                failureReason: 'periodTypeMismatch',
                failureDiagnostic: `Table context specifies ${match.periodType} period ("${match.raw}"), which contradicts claimed quarterly period "${targetPeriod}".`,
                provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['periodTypeMismatch'], tableCoordinates },
              };
            }
            matchedPeriodLabel = match.raw;
            boundPeriodFound = true;
          } else {
            return {
              valid: false,
              failureReason: 'unprovenReportingPeriod',
              failureDiagnostic: `Table structure specifies period "${tablePeriods[0].raw}", which contradicts claimed period "${targetPeriod}".`,
              provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['unprovenReportingPeriod'], tableCoordinates },
            };
          }
        }
      }

      // c. Fail closed: do NOT fall back to global documentTitle or global heading
      if (!boundPeriodFound) {
        return {
          valid: false,
          failureReason: 'unprovenReportingPeriod',
          failureDiagnostic: `Period "${targetPeriod}" cannot be bound to the selected table cell or table structure. Document title or global heading alone is insufficient proof.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenReportingPeriod'], tableCoordinates },
        };
      }
    } else {
      // Paragraph or text block: check block text itself
      const blockPeriods = extractPeriodsFromText(blockText);
      if (blockPeriods.length > 0) {
        const hasTarget = blockPeriods.find((p) => p.normalized === targetPeriod);
        if (!hasTarget) {
          return {
            valid: false,
            failureReason: 'unprovenReportingPeriod',
            failureDiagnostic: `Block text specifies period "${blockPeriods[0].raw}", which contradicts claimed period "${targetPeriod}".`,
            provenDimensions: { bindingStatus: 'contradicted', unprovenReasons: ['unprovenReportingPeriod'], tableCoordinates },
          };
        }
        matchedPeriodLabel = hasTarget.raw;
      } else {
        return {
          valid: false,
          failureReason: 'unprovenReportingPeriod',
          failureDiagnostic: `Period "${targetPeriod}" is not present in block text. Global document title alone is insufficient.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenReportingPeriod'], tableCoordinates },
        };
      }
    }
  }

  // 7. Unit Provenance Verification (P1 Positive Proof)
  let unitProvenance: 'cell' | 'column_header' | 'table_caption' | 'row_header' | 'section_heading' | 'document_definition' | undefined;
  if (claim?.claimedUnit) {
    const targetU = claim.claimedUnit;
    if (targetU === 'percentage') {
      if (/%/.test(cellText)) {
        unitProvenance = 'cell';
      } else if (columnHeader && /%|percent|percentage/i.test(columnHeader)) {
        unitProvenance = 'column_header';
      } else if (matchedBlock.tableCaption && /%|percent|percentage/i.test(matchedBlock.tableCaption)) {
        unitProvenance = 'table_caption';
      } else if (rowHeader && /%|percent|percentage|ros|margin/i.test(rowHeader)) {
        unitProvenance = 'row_header';
      } else if (matchedBlock.unitContext === 'percentage') {
        unitProvenance = 'table_caption';
      } else {
        return {
          valid: false,
          failureReason: 'unprovenUnit',
          failureDiagnostic: `Unit "percentage" is not proven by cell, column header, caption, or row header ("${blockText}"). Numeric value alone cannot prove unit.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenUnit'], tableCoordinates },
        };
      }
    } else if (targetU === 'currency_millions') {
      if (/(?:€|\$|EUR|USD)?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(?:m|million|M)\b/i.test(cellText) || /(?:€|\$|EUR|USD)/i.test(cellText)) {
        unitProvenance = 'cell';
      } else if (columnHeader && /(?:in\s+millions|in\s+€\s*millions?|in\s+eur\s*millions?|in\s+usd\s*millions?|in\s+million\s*euros?|€m|\$m|million)/i.test(columnHeader)) {
        unitProvenance = 'column_header';
      } else if (matchedBlock.tableCaption && /(?:in\s+millions|in\s+€\s*millions?|in\s+eur\s*millions?|in\s+usd\s*millions?|in\s+million\s*euros?|€m|\$m|million)/i.test(matchedBlock.tableCaption)) {
        unitProvenance = 'table_caption';
      } else if (rowHeader && /(?:in\s+millions|in\s+€\s*millions?|in\s+eur\s*millions?|in\s+usd\s*millions?|in\s+million\s*euros?|€m|\$m|million)/i.test(rowHeader)) {
        unitProvenance = 'row_header';
      } else if (matchedBlock.unitContext === 'currency_millions') {
        unitProvenance = 'table_caption';
      } else {
        return {
          valid: false,
          failureReason: 'unprovenUnit',
          failureDiagnostic: `Unit "currency_millions" is not proven by cell, column header, caption, or row header. Numeric value alone cannot prove unit.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenUnit'], tableCoordinates },
        };
      }
    } else if (targetU === 'currency_billions') {
      if (/(?:billion|bn|b\b)/i.test(cellText)) {
        unitProvenance = 'cell';
      } else if (columnHeader && /(?:billion|bn)/i.test(columnHeader)) {
        unitProvenance = 'column_header';
      } else if (matchedBlock.tableCaption && /(?:billion|bn)/i.test(matchedBlock.tableCaption)) {
        unitProvenance = 'table_caption';
      } else if (matchedBlock.unitContext === 'currency_billions') {
        unitProvenance = 'table_caption';
      } else {
        return {
          valid: false,
          failureReason: 'unprovenUnit',
          failureDiagnostic: `Unit "currency_billions" is not proven by authoritative document text.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenUnit'], tableCoordinates },
        };
      }
    } else if (targetU === 'thousand_units') {
      if (/(?:thousand\s+units|k\s+units|k\b)/i.test(cellText)) {
        unitProvenance = 'cell';
      } else if (columnHeader && /(?:in\s+thousands|thousand\s+units|k\s+units)/i.test(columnHeader)) {
        unitProvenance = 'column_header';
      } else if (matchedBlock.tableCaption && /(?:in\s+thousands|thousand\s+units)/i.test(matchedBlock.tableCaption)) {
        unitProvenance = 'table_caption';
      } else if (rowHeader && /(?:thousand|in\s+thousands)/i.test(rowHeader)) {
        unitProvenance = 'row_header';
      } else if (matchedBlock.unitContext === 'thousand_units') {
        unitProvenance = 'table_caption';
      } else {
        return {
          valid: false,
          failureReason: 'unprovenUnit',
          failureDiagnostic: `Unit "thousand_units" is not proven by authoritative document text.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenUnit'], tableCoordinates },
        };
      }
    } else if (targetU === 'units') {
      if (/units\b/i.test(cellText)) {
        unitProvenance = 'cell';
      } else if (columnHeader && /(?:units|vehicles|pieces)/i.test(columnHeader)) {
        unitProvenance = 'column_header';
      } else if (matchedBlock.tableCaption && /(?:units|vehicles)/i.test(matchedBlock.tableCaption)) {
        unitProvenance = 'table_caption';
      } else if (rowHeader && /(?:units|vehicles)/i.test(rowHeader)) {
        unitProvenance = 'row_header';
      } else if (matchedBlock.unitContext === 'units') {
        unitProvenance = 'table_caption';
      } else {
        return {
          valid: false,
          failureReason: 'unprovenUnit',
          failureDiagnostic: `Unit "units" is not proven by authoritative document text.`,
          provenDimensions: { bindingStatus: 'unproven', unprovenReasons: ['unprovenUnit'], tableCoordinates },
        };
      }
    }
  }

  return {
    valid: true,
    provenDimensions: {
      provenMetricId: claim?.claimedMetricId,
      matchedMetricLabel,
      provenScope: claim?.claimedScope,
      matchedScopeLabel,
      provenAccountingBasis: claim?.claimedAccountingBasis,
      matchedBasisLabel,
      provenPeriod: claim?.claimedPeriod,
      provenPeriodType: claim?.claimedPeriodType,
      matchedPeriodLabel,
      provenUnit: claim?.claimedUnit ?? targetUnit,
      unitProvenance,
      tableCoordinates,
      bindingStatus: 'proven',
    },
  };
}

/**
 * Result of resolving a locator against extracted document blocks (STEP 5 Remediation, P0-1).
 */
export interface BlockResolutionResult {
  status: 'resolved' | 'failed';
  matchedBlock?: DocumentContentBlock;
  error?: string;
  structuredLocator: LiveEvidenceLocator;
}

/**
 * Resolves a locator parameter against extracted document blocks with strict single-block semantics (STEP 5 Remediation, P0-1).
 */
export function resolveDocumentBlock(
  blocks: DocumentContentBlock[] | undefined,
  locatorParam: LiveEvidenceLocator | string,
  expectedRawValue?: string,
  expectedNumericValue?: number
): BlockResolutionResult {
  const { structuredLocator } = resolveLocator(locatorParam, blocks);

  if (!blocks || blocks.length === 0) {
    return {
      status: 'failed',
      error: 'Extracted document contains no blocks for evidence resolution.',
      structuredLocator,
    };
  }

  let candidates: DocumentContentBlock[] = [];

  if (typeof locatorParam === 'string') {
    const raw = locatorParam.trim();
    // 1. Direct match by id
    const byId = blocks.filter((b) => b.id === raw);
    if (byId.length === 1) {
      candidates = byId;
    } else {
      // 2. Direct match by locator string
      const byLoc = blocks.filter((b) => b.locator === raw);
      if (byLoc.length === 1) {
        candidates = byLoc;
      }
    }
  } else if (locatorParam.blockId) {
    candidates = blocks.filter((b) => b.id === locatorParam.blockId);
  } else if (locatorParam.rawLocator) {
    const raw = locatorParam.rawLocator.trim();
    const byId = blocks.filter((b) => b.id === raw);
    if (byId.length === 1) {
      candidates = byId;
    } else {
      const byLoc = blocks.filter((b) => b.locator === raw);
      if (byLoc.length === 1) {
        candidates = byLoc;
      }
    }
  }

  // If no direct single match yet, resolve by structured coordinates
  if (candidates.length === 0) {
    const hasCoords =
      structuredLocator.page !== undefined ||
      structuredLocator.section !== undefined ||
      structuredLocator.paragraphIndex !== undefined ||
      structuredLocator.tableIndex !== undefined ||
      structuredLocator.rowIndex !== undefined ||
      structuredLocator.blockId !== undefined;

    if (hasCoords) {
      candidates = blocks.filter((b) => {
        if (structuredLocator.blockId && b.id !== structuredLocator.blockId) return false;
        if (structuredLocator.page !== undefined && b.pageNumber !== structuredLocator.page) return false;
        if (structuredLocator.tableIndex !== undefined && b.tableIndex !== structuredLocator.tableIndex) return false;
        if (structuredLocator.rowIndex !== undefined && b.rowIndex !== structuredLocator.rowIndex) return false;
        if (structuredLocator.paragraphIndex !== undefined && b.paragraphIndex !== structuredLocator.paragraphIndex) return false;
        if (structuredLocator.section !== undefined) {
          const sec = structuredLocator.section.toLowerCase();
          if (!b.sectionHeading || !b.sectionHeading.toLowerCase().includes(sec)) return false;
        }
        return true;
      });
    }
  }

  if (candidates.length === 0) {
    return {
      status: 'failed',
      error: 'Zero blocks matched the specified locator.',
      structuredLocator,
    };
  }

  if (candidates.length > 1) {
    return {
      status: 'failed',
      error: `Ambiguous locator: matched ${candidates.length} blocks. Exact single block match required.`,
      structuredLocator,
    };
  }

  const matched = candidates[0];

  // Validate value presence in matched block text or cells
  if (expectedRawValue !== undefined && expectedRawValue.trim() !== '') {
    if (matched.blockType === 'table_row' && matched.cells && matched.cells.length > 0) {
      const hasInAnyCell = matched.cells.some((c) => isValuePresentInBlock(c, expectedRawValue, expectedNumericValue));
      if (!hasInAnyCell) {
        return {
          status: 'failed',
          matchedBlock: matched,
          error: `Raw value "${expectedRawValue}" is not present in any cell of table row.`,
          structuredLocator: {
            ...structuredLocator,
            blockId: matched.id,
            rawLocator: matched.locator ?? structuredLocator.rawLocator,
          },
        };
      }
    } else {
      const present = isValuePresentInBlock(matched.text, expectedRawValue, expectedNumericValue);
      if (!present) {
        return {
          status: 'failed',
          matchedBlock: matched,
          error: `Raw value "${expectedRawValue}" is not present in resolved block text "${matched.text}".`,
          structuredLocator: {
            ...structuredLocator,
            blockId: matched.id,
            rawLocator: matched.locator ?? structuredLocator.rawLocator,
          },
        };
      }
    }
  }

  return {
    status: 'resolved',
    matchedBlock: matched,
    structuredLocator: {
      ...structuredLocator,
      blockId: matched.id,
      rawLocator: matched.locator ?? structuredLocator.rawLocator,
      page: matched.pageNumber ?? structuredLocator.page,
      section: matched.sectionHeading ?? structuredLocator.section,
      paragraphIndex: matched.paragraphIndex ?? structuredLocator.paragraphIndex,
      tableIndex: matched.tableIndex ?? structuredLocator.tableIndex,
      rowIndex: matched.rowIndex ?? structuredLocator.rowIndex,
    },
  };
}

/**
 * Resolves a locator parameter into a structured LiveEvidenceLocator (STEP 5-3, Section 9).
 */
export function resolveLocator(
  locatorParam: LiveEvidenceLocator | string,
  blocks?: DocumentContentBlock[]
): { structuredLocator: LiveEvidenceLocator; matchedBlock?: DocumentContentBlock } {
  if (typeof locatorParam !== 'string') {
    return { structuredLocator: locatorParam };
  }

  const raw = locatorParam.trim();
  let matchedBlock: DocumentContentBlock | undefined;

  if (blocks && blocks.length > 0) {
    matchedBlock = blocks.find((b) => b.locator === raw || b.id === raw);
  }

  if (matchedBlock) {
    return {
      structuredLocator: {
        page: matchedBlock.pageNumber,
        section: matchedBlock.sectionHeading,
        paragraphIndex: matchedBlock.paragraphIndex,
        tableIndex: matchedBlock.tableIndex,
        rowIndex: matchedBlock.rowIndex,
        rawLocator: matchedBlock.locator,
        blockId: matchedBlock.id,
      },
      matchedBlock,
    };
  }

  // Parse pattern-based string locators: e.g. "page:2:block:1", "html:table:0:row:1", "html:p:3"
  const result: LiveEvidenceLocator = { rawLocator: raw };

  const pageMatch = raw.match(/\bpage:(\d+)/i);
  if (pageMatch) result.page = parseInt(pageMatch[1], 10);

  const sectionMatch = raw.match(/\bsection:([^:]+)/i);
  if (sectionMatch) result.section = sectionMatch[1].trim();

  const pMatch = raw.match(/\b(?:p|paragraph):(\d+)/i);
  if (pMatch) result.paragraphIndex = parseInt(pMatch[1], 10);

  const tableMatch = raw.match(/\btable:(\d+)/i);
  if (tableMatch) result.tableIndex = parseInt(tableMatch[1], 10);

  const rowMatch = raw.match(/\brow:(\d+)/i);
  if (rowMatch) result.rowIndex = parseInt(rowMatch[1], 10);

  return { structuredLocator: result };
}

/**
 * Binds extracted live document content to a structured LiveEvidenceCandidate (STEP 5-3, STEP 5 Remediation P0-1).
 *
 * CRITICAL INVARIANTS:
 *  1. Cryptographically bound to sourceDocument.contentHash and sourceDocId.
 *  2. verificationOrigin is strictly 'live_source'.
 *  3. Preserves raw textual value and normalized numeric value.
 *  4. Binds explicit metric, scope, accounting basis, period, period type, and support type.
 *  5. Resolves strictly against an authoritative document block; derives evidenceText from block.
 *  6. DOES NOT create state: 'claim_verified' (claim verification deferred to STEP 5-4).
 */
export function bindLiveEvidence(
  extractedDoc: ExtractedLiveDocument,
  params: LiveEvidenceBindingParams
): LiveEvidenceCandidate {
  const sourceDoc = extractedDoc.sourceDocument;
  const sourceDocId = params.sourceDocId ?? sourceDoc.sourceDocId ?? sourceDoc.id;
  const sourceContentHash = sourceDoc.contentHash;

  // 1. Parse value and unit
  const parsedValue = parseValueAndUnit(params.rawValue, params.unit);

  // 2. Resolve document block and validate value presence (STEP 5 Remediation, P0-1)
  const resolution = resolveDocumentBlock(
    extractedDoc.blocks,
    params.locator,
    params.rawValue,
    parsedValue.numericValue
  );

  const structuredLocator: LiveEvidenceLocator = {
    ...resolution.structuredLocator,
    columnIndex: params.columnIndex ?? resolution.structuredLocator.columnIndex,
  };

  if (resolution.status === 'resolved' && resolution.matchedBlock) {
    const matchedBlock = resolution.matchedBlock;

    const claimToVerify: ClaimEvidenceLocator = {
      sourceDocId,
      claimedMetricId: params.metricId,
      claimedValue: params.rawValue,
      claimedNumericValue: parsedValue.numericValue,
      claimedUnit: params.unit ?? parsedValue.unit,
      claimedScope: params.scope,
      claimedAccountingBasis: params.accountingBasis,
      claimedPeriod: params.period,
      claimedPeriodType: params.periodType,
    };

    const dimResult = verifyDocumentClaimDimensions(
      matchedBlock,
      claimToVerify,
      params.rawValue,
      parsedValue.numericValue,
      params.unit ?? parsedValue.unit,
      extractedDoc,
      structuredLocator.columnIndex
    );

    const finalLocator: LiveEvidenceLocator = {
      ...structuredLocator,
      columnIndex: dimResult.provenDimensions.tableCoordinates?.columnIndex ?? structuredLocator.columnIndex,
    };

    return {
      sourceDocId,
      sourceContentHash,
      verificationOrigin: 'live_source',
      blockId: matchedBlock.id,
      blockResolutionStatus: resolution.status,
      blockResolutionError: resolution.error,
      metricId: params.metricId,
      rawValue: params.rawValue,
      normalizedValue: parsedValue.normalizedValue,
      numericValue: parsedValue.numericValue,
      unit: params.unit ?? parsedValue.unit,
      scope: params.scope,
      accountingBasis: params.accountingBasis,
      period: params.period,
      periodType: params.periodType,
      supportType: params.supportType,
      locator: finalLocator,
      evidenceText: matchedBlock.text, // Authoritative evidence text derived from matched block!
      provenDimensions: dimResult.provenDimensions,
      tableCoordinates: dimResult.provenDimensions.tableCoordinates,
    };
  }

  // Failed resolution
  return {
    sourceDocId,
    sourceContentHash,
    verificationOrigin: 'live_source',
    blockResolutionStatus: 'failed',
    blockResolutionError: resolution.error,
    blockId: resolution.matchedBlock?.id,
    metricId: params.metricId,
    rawValue: params.rawValue,
    normalizedValue: parsedValue.normalizedValue,
    numericValue: parsedValue.numericValue,
    unit: params.unit ?? parsedValue.unit,
    scope: params.scope,
    accountingBasis: params.accountingBasis,
    period: params.period,
    periodType: params.periodType,
    supportType: params.supportType,
    locator: structuredLocator,
    evidenceText: resolution.matchedBlock?.text ?? params.evidenceText ?? params.rawValue ?? '',
  };
}

/**
 * Options for validating a LiveEvidenceCandidate against claims and sources (STEP 5-3, Section 10).
 */
export interface LiveEvidenceCandidateValidationOptions {
  expectedNumericValue?: number;
  expectedValue?: string;
  supportType?: EvidenceSupportType;
  /** When supplied, strictly binds the candidate to this source document */
  sourceDocument?: LiveSourceDocument | ExtractedLiveDocument;
}

/**
 * Validates a LiveEvidenceCandidate against target claims, sources, and cryptographic invariants (STEP 5-3, Section 10; STEP 5 Remediation P0-1 & P0-2).
 *
 * Anti-Forgery Gates Enforced:
 *  - verificationOrigin must exist and be 'live_source'
 *  - sourceContentHash must exist and be 64-character lowercase hex
 *  - sourceContentHash must match sourceDocument if supplied
 *  - sourceDocId must match target sourceDoc.id
 *  - metricId must match claim.claimedMetricId
 *  - numericValue must match claim.claimedNumericValue within unit tolerance
 *  - unit must match claim.claimedUnit
 *  - scope must match claim.claimedScope
 *  - accountingBasis must match claim.claimedAccountingBasis
 *  - period must match claim.claimedPeriod
 *  - periodType must match claim.claimedPeriodType
 *  - supportType must match claim.supportType (with reported_kpi <-> numeric_margin_value tolerance)
 *  - evidenceText must be non-empty
 *  - locator must be non-empty
 *  - blockResolutionStatus must be 'resolved' and blockId must be present
 *  - blockId must exist in extracted document and block text/value must match candidate
 */
export function validateLiveEvidenceCandidate(
  candidate: LiveEvidenceCandidate | null | undefined,
  claim?: ClaimEvidenceLocator | null,
  sourceDoc?: SourceDocument | { id: string; [key: string]: any } | null,
  options?: LiveEvidenceCandidateValidationOptions
): LiveEvidenceValidationResult {
  const mismatches: string[] = [];

  if (!candidate) {
    return { valid: false, mismatches: ['verificationCandidateMissing'] };
  }

  // 1. verificationOrigin check (P0-1)
  if (!candidate.verificationOrigin || typeof candidate.verificationOrigin !== 'string' || candidate.verificationOrigin.trim() === '') {
    mismatches.push('verificationOriginMissing');
  } else if (candidate.verificationOrigin !== 'live_source') {
    mismatches.push('verificationOriginInvalid');
  }

  // 2. Cryptographic sourceContentHash check (P0-2)
  if (!candidate.sourceContentHash || typeof candidate.sourceContentHash !== 'string' || candidate.sourceContentHash.trim() === '') {
    mismatches.push('verificationContentHashMissing');
  } else if (!/^[0-9a-f]{64}$/.test(candidate.sourceContentHash.trim())) {
    mismatches.push('verificationContentHashInvalid');
  }

  // 3. Source Document hash binding check (Section 2)
  let expectedDocId: string | undefined = sourceDoc?.id;
  if (options?.sourceDocument) {
    const rawDoc: LiveSourceDocument =
      'sourceDocument' in options.sourceDocument
        ? options.sourceDocument.sourceDocument
        : options.sourceDocument;
    if (candidate.sourceContentHash !== rawDoc.contentHash) {
      mismatches.push('verificationContentHashMismatch');
    }
    const docIdFromDoc = rawDoc.sourceDocId ?? rawDoc.id;
    if (!expectedDocId) {
      expectedDocId = docIdFromDoc;
    } else if (docIdFromDoc && docIdFromDoc !== expectedDocId) {
      mismatches.push('verificationSourceDocMismatch');
    }
  }

  // 4. sourceDocId check
  const targetDocId = expectedDocId ?? claim?.sourceDocId;
  if (targetDocId !== undefined) {
    if (candidate.sourceDocId !== targetDocId) {
      if (!mismatches.includes('verificationSourceDocMismatch')) {
        mismatches.push('verificationSourceDocMismatch');
      }
    }
  } else if (sourceDoc !== undefined && sourceDoc !== null && (!sourceDoc.id || candidate.sourceDocId !== sourceDoc.id)) {
    if (!mismatches.includes('verificationSourceDocMismatch')) {
      mismatches.push('verificationSourceDocMismatch');
    }
  }

  // 5. Support type check (with reported_kpi <-> numeric_margin_value compatibility)
  const expectedSupportType = options?.supportType;
  if (expectedSupportType && candidate.supportType !== expectedSupportType) {
    const compatible =
      (expectedSupportType === 'numeric_margin_value' && candidate.supportType === 'reported_kpi') ||
      (expectedSupportType === 'reported_kpi' && candidate.supportType === 'numeric_margin_value');
    if (!compatible) {
      mismatches.push('verificationSupportTypeMismatch');
    }
  }

  // 6. Raw value check
  if (!candidate.rawValue || typeof candidate.rawValue !== 'string' || candidate.rawValue.trim() === '') {
    mismatches.push('verificationValueMissing');
  }

  // 7. Expected value match
  const expVal = options?.expectedValue ?? claim?.claimedValue;
  if (expVal !== undefined && expVal !== null && candidate.rawValue !== expVal && candidate.normalizedValue !== expVal) {
    mismatches.push('verificationValueMismatch');
  }

  // 8. Numeric value validation
  const expNum = options?.expectedNumericValue ?? claim?.claimedNumericValue;
  if (expNum !== undefined && expNum !== null) {
    if (
      candidate.numericValue === undefined ||
      candidate.numericValue === null ||
      typeof candidate.numericValue !== 'number' ||
      !Number.isFinite(candidate.numericValue)
    ) {
      mismatches.push('verificationNumericValueMissing');
    } else if (!numericValuesMatch(expNum, candidate.numericValue, { unit: claim?.claimedUnit ?? candidate.unit })) {
      mismatches.push('verificationNumericValueMismatch');
    }
  }

  // 9. Metric semantic check
  if (claim?.claimedMetricId !== undefined && claim?.claimedMetricId !== null && claim.claimedMetricId.trim() !== '') {
    if (!candidate.metricId || typeof candidate.metricId !== 'string' || candidate.metricId.trim() === '') {
      mismatches.push('verificationMetricMissing');
    } else if (candidate.metricId !== claim.claimedMetricId) {
      mismatches.push('verificationMetricMismatch');
    }
  }

  // 10. Scope check
  if (claim?.claimedScope !== undefined && claim?.claimedScope !== null && (claim.claimedScope as string).trim() !== '') {
    if (!candidate.scope || typeof candidate.scope !== 'string' || candidate.scope.trim() === '') {
      mismatches.push('verificationScopeMissing');
    } else if (candidate.scope !== claim.claimedScope) {
      mismatches.push('verificationScopeMismatch');
    }
  }

  // 11. Unit check
  if (claim?.claimedUnit !== undefined && claim?.claimedUnit !== null && (claim.claimedUnit as string).trim() !== '') {
    if (!candidate.unit || typeof candidate.unit !== 'string' || candidate.unit.trim() === '') {
      mismatches.push('verificationUnitMissing');
    } else if (candidate.unit !== claim.claimedUnit) {
      mismatches.push('verificationUnitMismatch');
    }
  }

  // 12. Accounting basis check
  if (claim?.claimedAccountingBasis !== undefined && claim?.claimedAccountingBasis !== null && (claim.claimedAccountingBasis as string).trim() !== '') {
    if (!candidate.accountingBasis || typeof candidate.accountingBasis !== 'string' || candidate.accountingBasis.trim() === '') {
      mismatches.push('verificationAccountingBasisMissing');
    } else if (candidate.accountingBasis !== claim.claimedAccountingBasis) {
      mismatches.push('verificationAccountingBasisMismatch');
    }
  }

  // 13. Period check
  if (claim?.claimedPeriod !== undefined && claim?.claimedPeriod !== null && claim.claimedPeriod.trim() !== '') {
    if (!candidate.period || typeof candidate.period !== 'string' || candidate.period.trim() === '') {
      mismatches.push('verificationPeriodMissing');
    } else if (candidate.period !== claim.claimedPeriod) {
      mismatches.push('verificationPeriodMismatch');
    }
  }

  // 14. Period type check
  if (claim?.claimedPeriodType !== undefined && claim?.claimedPeriodType !== null && (claim.claimedPeriodType as string).trim() !== '') {
    if (!candidate.periodType || typeof candidate.periodType !== 'string' || candidate.periodType.trim() === '') {
      mismatches.push('verificationPeriodTypeMissing');
    } else if (candidate.periodType !== claim.claimedPeriodType) {
      mismatches.push('verificationPeriodTypeMismatch');
    }
  }

  // 15. Evidence text check
  if (!candidate.evidenceText || typeof candidate.evidenceText !== 'string' || candidate.evidenceText.trim() === '') {
    mismatches.push('verificationEvidenceTextMissing');
  }

  // 16. Locator check
  const loc = candidate.locator;
  const hasLocator =
    loc &&
    (loc.page !== undefined ||
      loc.section !== undefined ||
      loc.paragraphIndex !== undefined ||
      loc.tableIndex !== undefined ||
      loc.rowIndex !== undefined ||
      Boolean(loc.rawLocator && loc.rawLocator.trim() !== ''));

  if (!hasLocator) {
    mismatches.push('verificationLocatorMissing');
  }

  // 17. Block resolution status check (STEP 5 Remediation, P0-1)
  if (candidate.blockResolutionStatus === 'failed') {
    mismatches.push('verificationBlockResolutionFailed');
  } else if (!candidate.blockId || candidate.blockResolutionStatus !== 'resolved') {
    mismatches.push('verificationBlockResolutionMissing');
  }

  // 18. ExtractedLiveDocument block consistency check (if ExtractedLiveDocument provided)
  if (options?.sourceDocument && 'blocks' in options.sourceDocument) {
    const extDoc = options.sourceDocument as ExtractedLiveDocument;
    const matchedBlock = extDoc.blocks?.find((b) => b.id === candidate.blockId);
    if (!matchedBlock) {
      mismatches.push('verificationBlockNotFoundInDocument');
    } else {
      if (candidate.evidenceText !== matchedBlock.text) {
        mismatches.push('verificationBlockTextMismatch');
      }
      if (!isValuePresentInBlock(matchedBlock.text, candidate.rawValue, candidate.numericValue, candidate.unit)) {
        mismatches.push('verificationBlockValueMismatch');
      }
    }
  }

  return {
    valid: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Bridges a LiveEvidenceCandidate into a ClaimVerifiedResult for evaluation by the existing claim verification engine (STEP 5-3, Section 10; STEP 5 Remediation P0-2).
 */
export function candidateToVerificationResult(
  candidate: LiveEvidenceCandidate,
  options?: {
    verifiedValue?: string;
    verificationMethod?: ClaimVerificationEngineMethod;
    engineId?: string;
    engineVersion?: string;
    verifiedAt?: string;
  }
): ClaimVerifiedResult {
  const verifiedVal = options?.verifiedValue ?? candidate.rawValue ?? candidate.normalizedValue ?? '';
  return {
    state: 'claim_verified',
    verificationOrigin: 'live_source',
    verificationMethod: options?.verificationMethod ?? 'parser',
    engineId: options?.engineId ?? 'live_evidence_binder',
    engineVersion: options?.engineVersion ?? '1.0.0',
    sourceDocId: candidate.sourceDocId,
    sourceContentHash: candidate.sourceContentHash,
    blockId: candidate.blockId,
    claimSupportType: candidate.supportType,
    verifiedValue: verifiedVal,
    verifiedMetricId: candidate.metricId,
    verifiedNumericValue: candidate.numericValue,
    verifiedUnit: candidate.unit,
    verifiedScope: candidate.scope,
    verifiedAccountingBasis: candidate.accountingBasis,
    verifiedPeriod: candidate.period,
    verifiedPeriodType: candidate.periodType,
    provenDimensions: candidate.provenDimensions,
    tableCoordinates: candidate.provenDimensions?.tableCoordinates,
    verifiedAt: options?.verifiedAt ?? new Date().toISOString(),
    diagnostics: {
      inspectedLocation: candidate.locator.rawLocator ?? (candidate.locator.page ? `page:${candidate.locator.page}` : candidate.locator.section),
      expectedMetric: candidate.metricId,
      verifiedMetric: candidate.metricId,
      verifiedValue: verifiedVal,
      numericComparisonResult: 'match',
      details: candidate.evidenceText,
    },
  };
}
