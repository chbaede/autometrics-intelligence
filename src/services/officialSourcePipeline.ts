/**
 * AutoMetrics Intelligence — Official OEM Investor Relations Source Integration Pipeline (STEP 5-5)
 *
 * Implements the end-to-end verification pipeline:
 *
 *   Registered Official OEM IR Source
 *   → Official Domain Authorization Gate
 *   → Secure HTTPS Retrieval (STEP 5-1)
 *   → Cryptographic Raw Wire Bytes & SHA-256 Digest
 *   → Redirect Domain Security Check (no third-party drift)
 *   → Deterministic Document Extraction (STEP 5-2)
 *   → Structured Evidence Candidate Binding (STEP 5-3)
 *   → Existing Claim Verification Engine (STEP 5-4)
 *   → Strict Anti-Forgery Validation & State Resolution
 *   → claim_verified with verificationOrigin: 'live_source'
 *
 * PROVENANCE & ARCHITECTURAL INVARIANTS:
 * 1. Zero Crawling: Accesses ONLY explicitly registered official OEM IR sources.
 * 2. Strict Officiality: Enforces OEM domain perimeter on both initial URL and any redirect destinations.
 * 3. End-to-End Cryptographic Binding: Exact wire-byte contentHash flows through to ClaimVerifiedResult.
 * 4. Byte Mutability Awareness: Any alteration of live response bytes produces a distinct contentHash.
 * 5. Single Verification Engine: Live sources pass through the exact same verification gates as repository fixtures.
 */

import {
  ClaimEvidenceLocator,
  ClaimVerificationResult,
  EvidenceClaimVerificationState,
  EvidenceSupportType,
  OfficialIrSource,
  OfficialSourcePipelineOptions,
  OfficialSourcePipelineResult,
  ScopeExceptionEvidence,
  SourceClaim,
  SourceDocument,
} from '../types/metrics';
import {
  getOfficialIrSource,
  isUrlInOfficialDomain,
  validateOfficialSource,
} from '../data/officialSources';
import { SOURCES_MAP } from '../data/sources';
import { fetchOfficialIrSource } from './liveSourceFetcher';
import { extractLiveDocument } from './liveDocumentExtractor';
import { bindLiveEvidence, validateLiveEvidenceCandidate } from './liveEvidenceBinder';
import {
  verifyClaimEvidence,
  validateClaimVerificationResult,
  resolveClaimVerificationState,
} from '../data/scopeExceptions';

export interface ExecuteOfficialPipelineArgs {
  /** Target official IR source definition or registered ID from OFFICIAL_IR_SOURCES */
  source: OfficialIrSource | string;
  /** Explicit numeric/semantic claim to verify against the document */
  claim: SourceClaim;
  /** Parameters to locate and bind the evidence from the extracted document */
  bindingParams: {
    rawValue: string;
    locator: {
      page?: number;
      section?: string;
      paragraphIndex?: number;
      tableIndex?: number;
      rowIndex?: number;
      rawLocator?: string;
    };
    evidenceText: string;
    supportType?: EvidenceSupportType;
    scope?: import('../types/metrics').ReportingScope;
    accountingBasis?: import('../types/metrics').AccountingBasis;
    metricId?: string;
    period?: string;
    unit?: import('../types/metrics').MetricUnit;
  };
  /** Pipeline configuration and execution options */
  options?: OfficialSourcePipelineOptions;
}

/**
 * Executes the complete end-to-end official source verification pipeline.
 */
export async function executeOfficialSourcePipeline(
  args: ExecuteOfficialPipelineArgs
): Promise<OfficialSourcePipelineResult> {
  const { source, claim, bindingParams, options = {} } = args;

  // 1. Resolve and validate the Official IR Source
  let officialSource: OfficialIrSource;
  if (typeof source === 'string') {
    const resolved = getOfficialIrSource(source);
    if (!resolved) {
      return {
        success: false,
        officialSource: {
          id: source,
          companyId: 'unknown',
          url: '',
          documentType: 'quarterly_report',
          reportingPeriod: claim.period,
          periodType: 'quarterly',
          expectedContentType: 'text/html',
          officialDomain: '',
          title: `Unregistered Source (${source})`,
        },
        errorCode: 'unauthorizedSource',
        errorMessage: `Source ID "${source}" is not registered in the Official IR Sources registry.`,
      };
    }
    officialSource = resolved;
  } else {
    officialSource = source;
  }

  const sourceValidation = validateOfficialSource(officialSource);
  if (!sourceValidation.valid) {
    return {
      success: false,
      officialSource,
      errorCode: 'unauthorizedSource',
      errorMessage: sourceValidation.reason || 'Invalid official source definition.',
    };
  }

  // 1b. Production safety: forbid allowLocalhost without customFetch (STEP 5 Remediation, P1-2)
  if (options.allowLocalhost && !options.customFetch) {
    return {
      success: false,
      officialSource,
      errorCode: 'unauthorizedSource',
      errorMessage: 'allowLocalhost is forbidden in production pipeline without an explicit mock customFetch.',
    };
  }

  // 2. Secure HTTPS Fetch with cryptographic raw-byte hashing (STEP 5-1, P1-1)
  const fetchResult = await fetchOfficialIrSource(officialSource.url, {
    ...options.fetchOptions,
    fetchFn: options.customFetch,
    allowLocalhost: options.allowLocalhost,
    officialDomain: officialSource.officialDomain,
    id: officialSource.id,
  });

  if (!fetchResult.success) {
    return {
      success: false,
      officialSource,
      errorCode: fetchResult.error.code === 'unauthorizedDomainRedirect' ? 'unauthorizedDomainRedirect' : 'fetchFailed',
      errorMessage: `Fetch failed [${fetchResult.error.code}]: ${fetchResult.error.message}`,
      details: { fetchError: fetchResult.error },
    };
  }

  const liveDoc = fetchResult.document;

  // 3. Official Domain Security Enforcement on Final URL (STEP 5-5, Section 2)
  // If redirects occurred, verify that the final destination remains within the approved official domain perimeter
  if (!isUrlInOfficialDomain(liveDoc.finalUrl, officialSource.officialDomain)) {
    return {
      success: false,
      officialSource,
      liveDocument: liveDoc,
      errorCode: 'unauthorizedDomainRedirect',
      errorMessage: `Insecure redirect rejected: Final URL "${liveDoc.finalUrl}" is outside approved official domain policy: ${
        Array.isArray(officialSource.officialDomain)
          ? officialSource.officialDomain.join(', ')
          : officialSource.officialDomain
      }.`,
      details: {
        originalUrl: liveDoc.url,
        finalUrl: liveDoc.finalUrl,
        officialDomain: officialSource.officialDomain,
      },
    };
  }

  // 4. Deterministic Document Extraction (STEP 5-2)
  const extractResult = await extractLiveDocument(
    liveDoc,
    fetchResult.rawBytes,
    options.extractionOptions
  );

  if (!extractResult.success) {
    return {
      success: false,
      officialSource,
      liveDocument: liveDoc,
      errorCode: 'extractionFailed',
      errorMessage: `Extraction failed [${extractResult.error.code}]: ${extractResult.error.message}`,
      details: { extractionError: extractResult.error },
    };
  }

  const extractedDoc = extractResult.document;

  // 5. Structured Evidence Candidate Binding (STEP 5-3)
  const targetSupportType: EvidenceSupportType = bindingParams.supportType || 'reported_kpi';
  const candidateScope = bindingParams.scope ?? claim.scope;
  const candidateBasis = bindingParams.accountingBasis ?? claim.accountingBasis;
  const candidateMetric = bindingParams.metricId ?? claim.metricId;
  const candidatePeriod = bindingParams.period ?? claim.period;
  const candidateUnit = bindingParams.unit ?? claim.unit;

  const candidate = bindLiveEvidence(extractedDoc, {
    sourceDocId: officialSource.id,
    rawValue: bindingParams.rawValue,
    locator: bindingParams.locator,
    evidenceText: bindingParams.evidenceText,
    supportType: targetSupportType,
    metricId: candidateMetric,
    unit: candidateUnit,
    scope: candidateScope,
    accountingBasis: candidateBasis,
    period: candidatePeriod,
    periodType: officialSource.periodType,
  });

  // Fallback synthesized SourceDocument must NOT be marked isVerified: true (STEP 5 Remediation, P1-3)
  const registeredSourceDoc: SourceDocument = SOURCES_MAP[officialSource.id] || {
    id: officialSource.id,
    companyId: officialSource.companyId,
    title: officialSource.title,
    docType: officialSource.documentType,
    period: officialSource.reportingPeriod,
    periodType: officialSource.periodType,
    publicationDate: new Date(liveDoc.retrievedAt).toISOString().split('T')[0],
    officialUrl: officialSource.url,
    isVerified: false,
    verificationStatus: 'unverified',
    lastChecked: new Date(liveDoc.retrievedAt).toISOString().split('T')[0],
  };

  const rawLocatorStr =
    bindingParams.locator.rawLocator ||
    (bindingParams.locator.page !== undefined ? `page:${bindingParams.locator.page}` : 'loc:unknown');

  const claimLocator: ClaimEvidenceLocator = {
    sourceDocId: officialSource.id,
    claimedValue: bindingParams.rawValue,
    claimedMetricId: claim.metricId,
    claimedNumericValue: claim.value,
    claimedUnit: claim.unit,
    claimedScope: claim.scope,
    claimedAccountingBasis: claim.accountingBasis,
    claimedPeriod: claim.period,
    claimedPeriodType: officialSource.periodType,
    locator: rawLocatorStr,
    pageNumber: bindingParams.locator.page,
    sectionReference: bindingParams.locator.section,
  };

  // Pre-validate candidate against claim
  const candValidation = validateLiveEvidenceCandidate(
    candidate,
    claimLocator,
    registeredSourceDoc,
    { sourceDocument: extractedDoc, expectedNumericValue: claim.value, supportType: targetSupportType }
  );

  if (!candValidation.valid) {
    return {
      success: false,
      officialSource,
      liveDocument: liveDoc,
      extractedDocument: extractedDoc,
      evidenceCandidate: candidate,
      errorCode: 'bindingFailed',
      errorMessage: `Evidence binding validation failed: ${candValidation.mismatches.join('; ')}`,
      details: { mismatches: candValidation.mismatches },
    };
  }

  // 6. Claim Verification Engine Execution (STEP 5-4, STEP 5 Remediation P0-2)
  const verificationResult: ClaimVerificationResult = verifyClaimEvidence(
    claimLocator,
    registeredSourceDoc,
    bindingParams.rawValue,
    targetSupportType,
    {
      liveCandidate: candidate,
      liveSourceDocument: liveDoc,
      expectedOrigin: 'live_source',
      expectedNumericValue: claim.value,
      extractedLiveDocument: extractedDoc,
    }
  );

  // 7. Verification Result Validation & Anti-Forgery Gate
  const evidencePurpose: 'reported_kpi' | 'scope_definition' | 'numerator_definition' | 'proxy_justification' =
    targetSupportType === 'reported_kpi'
      ? 'reported_kpi'
      : targetSupportType === 'proxy_numerator'
      ? 'numerator_definition'
      : 'reported_kpi';

  const evidenceList: ScopeExceptionEvidence[] = [
    {
      sourceDocId: officialSource.id,
      sectionReference: bindingParams.locator.section || officialSource.title,
      tableReference: rawLocatorStr,
      evidenceReference: bindingParams.evidenceText,
      purpose: evidencePurpose,
      supports: [targetSupportType],
      supportEvidence: {
        [targetSupportType]: claimLocator,
      },
    },
  ];

  const validation = validateClaimVerificationResult(
    claimLocator,
    registeredSourceDoc,
    bindingParams.rawValue,
    verificationResult,
    targetSupportType,
    {
      expectedOrigin: 'live_source',
      expectedContentHash: liveDoc.contentHash,
      expectedNumericValue: claim.value,
      extractedLiveDocument: extractedDoc,
      requireBlockBinding: true,
    }
  );

  const resolvedState: EvidenceClaimVerificationState = resolveClaimVerificationState(
    evidenceList,
    true,
    verificationResult
  );

  if (!validation.valid || resolvedState !== 'claim_verified') {
    return {
      success: false,
      officialSource,
      liveDocument: liveDoc,
      extractedDocument: extractedDoc,
      evidenceCandidate: candidate,
      claimVerificationResult: verificationResult,
      verificationState: resolvedState,
      errorCode: 'verificationFailed',
      errorMessage: `Claim verification failed validation: ${validation.mismatches.join('; ')}`,
      details: {
        mismatches: validation.mismatches,
        resolvedState,
      },
    };
  }

  return {
    success: true,
    officialSource,
    liveDocument: liveDoc,
    extractedDocument: extractedDoc,
    evidenceCandidate: candidate,
    claimVerificationResult: verificationResult,
    verificationState: resolvedState,
  };
}

/**
 * Pipeline entry point alias (STEP 5 Remediation)
 */
export const verifyOfficialSourceClaim = executeOfficialSourcePipeline;

