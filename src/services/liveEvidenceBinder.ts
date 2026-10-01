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
  ReportingScope,
  SourceDocument,
} from '../types/metrics';
import { numericValuesMatch } from '../utils/metricCalculations';

export type {
  LiveEvidenceCandidate,
  LiveEvidenceLocator,
  LiveEvidenceValidationResult,
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
 * Checks whether a raw textual or numeric value is present in a document block text (STEP 5 Remediation, P0-1).
 */
export function isValuePresentInBlock(
  blockText: string,
  rawValue: string,
  numericValue?: number
): boolean {
  if (!blockText || !rawValue) return false;
  const normBlock = blockText.replace(/\s+/g, ' ').trim();
  const normRaw = rawValue.replace(/\s+/g, ' ').trim();

  // 1. Direct substring match (case-insensitive)
  if (normBlock.toLowerCase().includes(normRaw.toLowerCase())) {
    return true;
  }

  // 2. Comma-stripped match (e.g. 1,200 vs 1200 or €36,743 million vs 36743)
  const stripCommas = (s: string) => s.replace(/,/g, '');
  if (stripCommas(normBlock).toLowerCase().includes(stripCommas(normRaw).toLowerCase())) {
    return true;
  }

  // 3. Numeric value match
  if (numericValue !== undefined && Number.isFinite(numericValue)) {
    const numStr = String(numericValue);
    if (stripCommas(normBlock).includes(numStr)) {
      return true;
    }
  }

  return false;
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

  // Validate value presence in matched block text
  if (expectedRawValue !== undefined && expectedRawValue.trim() !== '') {
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

  const structuredLocator = resolution.structuredLocator;

  if (resolution.status === 'resolved' && resolution.matchedBlock) {
    const matchedBlock = resolution.matchedBlock;
    return {
      sourceDocId,
      sourceContentHash,
      verificationOrigin: 'live_source',
      blockId: matchedBlock.id,
      blockResolutionStatus: 'resolved',
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
      evidenceText: matchedBlock.text, // Authoritative evidence text derived from matched block!
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
      if (!isValuePresentInBlock(matchedBlock.text, candidate.rawValue, candidate.numericValue)) {
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
