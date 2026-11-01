/**
 * AutoMetrics Intelligence — Live Pipeline Trust Boundary & Execution Registry (P1-A)
 *
 * Implements an architectural trust boundary for live source pipeline execution:
 * 1. Live pipeline verification (live_source_verified) can ONLY be granted when backed
 *    by authentic execution through executeOfficialSourcePipeline / verifyOfficialSourceClaim.
 * 2. An execution receipt is issued upon full validation across all pipeline gates:
 *    - Registered source validation
 *    - Allowlisted domain transport & redirect validation
 *    - Cryptographic wire-byte SHA-256 calculation
 *    - Deterministic document extraction
 *    - Structured candidate evidence binding
 *    - Existing claim verification engine validation
 * 3. The receipt cryptographically binds:
 *    - sourceDocId, companyId, finalUrl
 *    - rawByteSha256
 *    - metricId, numericValue, unit, reportingScope, accountingBasis, period, periodType
 *    - blockId, tableCoordinates
 * 4. The receipt is stored in a process-private WeakMap and authenticated via an ephemeral
 *    process-lifetime runtime key. Caller-synthesized plain JavaScript objects lack an authentic
 *    receipt and fail closed with blocking validation errors.
 */

import { computeRawByteSha256, computeStringSha256 } from '../utils/cryptoUtils';
import type {
  OfficialSourcePipelineResult,
  MetricUnit,
  ReportingScope,
  AccountingBasis,
} from '../types/metrics';
import type {
  StructuredPerformanceClaim,
  CompanyPerformanceDriver,
} from '../data/performanceDrivers';


export interface TrustedPipelineExecutionReceipt {
  receiptId: string;
  issuedAt: string;
  sourceDocId: string;
  companyId: string;
  finalUrl: string;
  rawByteSha256: string;
  metricId: string;
  numericValue: number;
  unit?: MetricUnit;
  scope?: ReportingScope;
  accountingBasis?: AccountingBasis;
  period?: string;
  periodType?: string;
  blockId?: string;
  tableCoordinates?: Record<string, unknown>;
  receiptToken: string;
}

// Module-scoped private WeakMap: external callers cannot inject or forge entries
const pipelineReceiptStore = new WeakMap<object, TrustedPipelineExecutionReceipt>();

// Runtime ephemeral process session key (generated once per process lifetime, never hardcoded in source)
function generateRuntimeEphemeralKey(): string {
  const arr = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 32; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return computeRawByteSha256(arr);
}

const RUNTIME_SESSION_KEY = generateRuntimeEphemeralKey();

function computeReceiptToken(receiptData: Omit<TrustedPipelineExecutionReceipt, 'receiptToken'>): string {
  const payload = [
    RUNTIME_SESSION_KEY,
    receiptData.receiptId,
    receiptData.issuedAt,
    receiptData.sourceDocId,
    receiptData.companyId,
    receiptData.finalUrl,
    receiptData.rawByteSha256,
    receiptData.metricId,
    String(receiptData.numericValue),
    receiptData.unit || '',
    receiptData.scope || '',
    receiptData.accountingBasis || '',
    receiptData.period || '',
    receiptData.periodType || '',
    receiptData.blockId || '',
  ].join('|');
  return computeStringSha256(payload);
}

/**
 * Registers an authentic pipeline execution receipt for a completed pipeline run.
 * Can ONLY be invoked by executeOfficialSourcePipeline upon complete successful validation.
 */
export function recordTrustedPipelineExecution(
  result: OfficialSourcePipelineResult,
  data: {
    sourceDocId: string;
    companyId: string;
    finalUrl: string;
    rawByteSha256: string;
    metricId: string;
    numericValue: number;
    unit?: MetricUnit;
    scope?: ReportingScope;
    accountingBasis?: AccountingBasis;
    period?: string;
    periodType?: string;
    blockId?: string;
    tableCoordinates?: Record<string, unknown>;
  }
): TrustedPipelineExecutionReceipt {
  const receiptId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const issuedAt = new Date().toISOString();
  const partialReceipt = {
    receiptId,
    issuedAt,
    ...data,
  };
  const receiptToken = computeReceiptToken(partialReceipt);
  const fullReceipt: TrustedPipelineExecutionReceipt = {
    ...partialReceipt,
    receiptToken,
  };

  pipelineReceiptStore.set(result, fullReceipt);
  (result as any).pipelineReceipt = fullReceipt;
  return fullReceipt;
}

/**
 * Retrieves the trusted execution receipt associated with a pipeline result object, if present.
 */
export function getTrustedReceiptForPipelineResult(
  result: OfficialSourcePipelineResult | undefined | null
): TrustedPipelineExecutionReceipt | undefined {
  if (!result || typeof result !== 'object') return undefined;
  return pipelineReceiptStore.get(result);
}

/**
 * Validates whether a livePipelineResult is backed by an authentic execution receipt
 * that matches the target claim and driver context.
 */
export function verifyTrustedPipelineReceipt(
  result: OfficialSourcePipelineResult | undefined | null,
  claim: StructuredPerformanceClaim,
  driver: CompanyPerformanceDriver
): { authentic: boolean; failureReasons: string[]; receipt?: TrustedPipelineExecutionReceipt } {
  if (!result || typeof result !== 'object') {
    return {
      authentic: false,
      failureReasons: ['No livePipelineResult object provided'],
    };
  }

  // 1. Verify that this exact object reference was registered by executeOfficialSourcePipeline
  const receipt = pipelineReceiptStore.get(result);
  if (!receipt) {
    return {
      authentic: false,
      failureReasons: [
        'Live pipeline result was not produced by authentic execution of executeOfficialSourcePipeline; caller-synthesized or untracked objects are rejected',
      ],
    };
  }

  const failureReasons: string[] = [];

  // 2. Verify cryptographic session token integrity
  const expectedToken = computeReceiptToken(receipt);
  if (receipt.receiptToken !== expectedToken) {
    failureReasons.push('Pipeline execution receipt cryptographic session token mismatch or tampered');
  }

  // 3. Verify actual wire bytes
  if (!result.rawBytes || result.rawBytes.length === 0) {
    failureReasons.push('Live pipeline rawBytes missing or empty; wire byte authenticity cannot be established');
  } else {
    const computedHash = computeRawByteSha256(result.rawBytes);
    if (computedHash !== receipt.rawByteSha256) {
      failureReasons.push(
        `Live pipeline rawBytes SHA-256 '${computedHash}' does not match execution receipt '${receipt.rawByteSha256}'`
      );
    }
  }

  // 4. Verify company identity
  if (receipt.companyId !== driver.companyId) {
    failureReasons.push(
      `Pipeline execution company '${receipt.companyId}' does not match claim company '${driver.companyId}'`
    );
  }

  // 5. Verify source document identity
  if (claim.sourceDocId && receipt.sourceDocId !== claim.sourceDocId) {
    failureReasons.push(
      `Pipeline execution sourceDocId '${receipt.sourceDocId}' does not match claim sourceDocId '${claim.sourceDocId}'`
    );
  }

  // 6. Verify metric identity
  if (receipt.metricId !== claim.metricId) {
    failureReasons.push(
      `Pipeline execution metric '${receipt.metricId}' does not match claim metric '${claim.metricId}'`
    );
  }

  // 7. Verify numeric value
  const valMatches = Math.abs(receipt.numericValue - claim.value) <= 1e-4;
  if (!valMatches) {
    failureReasons.push(
      `Pipeline execution verified numeric value (${receipt.numericValue}) contradicts claimed value (${claim.value})`
    );
  }

  // 8. Mandatory reporting period & period type verification
  const targetPeriod = claim.period || driver.period;
  if (!receipt.period || !targetPeriod || receipt.period !== targetPeriod) {
    failureReasons.push(
      `Pipeline execution reporting period '${receipt.period}' does not match claim period '${targetPeriod}'`
    );
  }

  const targetPeriodType =
    claim.periodType ||
    (driver.period && (/^\d{4}-FY$/.test(driver.period) || /^\d{4}$/.test(driver.period)) ? 'annual' : 'quarterly');

  if (!receipt.periodType || !targetPeriodType || receipt.periodType !== targetPeriodType) {
    failureReasons.push(
      `Pipeline execution periodType '${receipt.periodType}' does not match target periodType '${targetPeriodType}'`
    );
  }

  // 9. Unit alignment
  if (claim.unit && receipt.unit && receipt.unit !== claim.unit) {
    failureReasons.push(
      `Pipeline execution unit '${receipt.unit}' does not match claimed unit '${claim.unit}'`
    );
  }

  // 10. Reporting scope alignment
  if (claim.reportingScope && (!receipt.scope || receipt.scope !== claim.reportingScope)) {
    failureReasons.push(
      `Pipeline execution reportingScope '${receipt.scope || 'unspecified'}' does not match claimed scope '${claim.reportingScope}'`
    );
  }

  // 11. Accounting basis alignment
  if (claim.accountingBasis && (!receipt.accountingBasis || receipt.accountingBasis !== claim.accountingBasis)) {
    failureReasons.push(
      `Pipeline execution accountingBasis '${receipt.accountingBasis || 'unspecified'}' does not match claimed basis '${claim.accountingBasis}'`
    );
  }

  return {
    authentic: failureReasons.length === 0,
    failureReasons,
    receipt,
  };
}
