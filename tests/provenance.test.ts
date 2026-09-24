/**
 * AutoMetrics Intelligence — Source Provenance Cross-Validation Regression Test Suite
 *
 * Covers all STEP 3-3 requirements:
 * 1. Valid source relationship (valid = true, severity = 'INFO')
 * 2. Missing sourceDocId on reported observation (valid = false, severity = 'ERROR')
 * 3. Unknown sourceDocId not in registry (valid = false, severity = 'ERROR')
 * 4. Source company mismatch (valid = false, severity = 'ERROR')
 * 5. Source period mismatch (severity = 'WARNING')
 * 6. Missing / non-HTTPS official URL (valid = false, severity = 'ERROR')
 * 7. Missing verification method on reported observation (valid = false, severity = 'ERROR')
 * 8. Missing evidence reference / original label (severity = 'WARNING')
 * 9. Derived metric without valid verificationStatus (valid = false, severity = 'ERROR')
 * 10. Valid derived metric with input references / verification (valid = true, severity = 'INFO')
 */

import { validateObservationProvenance } from '../src/utils/metricCalculations';
import { MetricObservation, SourceDocument, Company } from '../src/types/metrics';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

console.log('🧪 Starting Source Provenance Cross-Validation Test Suite...\n');

// Mock Company
const mockCompany: Company = {
  id: 'tesla',
  name: 'Tesla, Inc.',
  shortName: 'Tesla',
  hqCountry: 'United States',
  hqCity: 'Austin',
  region: 'north_america',
  website: 'https://www.tesla.com',
  irUrl: 'https://ir.tesla.com',
  fiscalYearEnd: 'Dec 31',
  reportingCurrency: 'USD',
  supportedDocuments: ['10-K', '10-Q', 'Shareholder Deck'],
  description: 'Electric vehicles and clean energy systems.',
};

// Mock Source Document
const mockValidSource: SourceDocument = {
  id: 'tsla_2026_q2_deck',
  companyId: 'tesla',
  title: 'Q2 2026 Update',
  docType: 'shareholder_letter',
  period: '2026-Q2',
  publicationDate: '2026-07-22',
  officialUrl: 'https://ir.tesla.com/_flysystem/s3/sec/tsla-20260722-gen.pdf',
  isVerified: true,
  verificationStatus: 'verified',
  lastChecked: '2026-09-24',
};

// Mock Valid Reported Observation
const mockValidObs: MetricObservation = {
  id: 'tsla_2026_q2_rev',
  companyId: 'tesla',
  metricId: 'revenue',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 26850,
  unit: 'currency_millions',
  currency: 'USD',
  valueType: 'reported',
  sourceDocId: 'tsla_2026_q2_deck',
  originalLabel: 'Total revenues',
  pageNumber: 4,
  evidenceReference: 'Statement of Operations, Page 4',
  reportingScope: 'consolidated_group',
  accountingBasis: 'reported',
  verificationStatus: 'verified',
  verificationMethod: 'official_pdf_filing',
  isComparable: true,
};

// 1. Valid Source Relationship
const res1 = validateObservationProvenance(mockValidObs, mockValidSource, mockCompany);
assert(res1.valid === true, 'Test 1: Valid source relationship is valid: true');
assert(res1.severity === 'INFO', 'Test 1: Valid source relationship severity is INFO');

// 2. Missing sourceDocId on Reported Observation
const obsMissingSourceDocId: MetricObservation = {
  ...mockValidObs,
  id: 'obs_missing_source_id',
  sourceDocId: undefined,
};
const res2 = validateObservationProvenance(obsMissingSourceDocId, null, mockCompany);
assert(res2.valid === false, 'Test 2: Missing sourceDocId on reported obs is valid: false');
assert(res2.severity === 'ERROR', 'Test 2: Missing sourceDocId severity is ERROR');
assert(res2.reasons.some((r) => r.includes('missing required sourceDocId')), 'Test 2: Reason cites missing sourceDocId');

// 3. Unknown sourceDocId (Source Document Not Found in Registry)
const obsUnknownSource: MetricObservation = {
  ...mockValidObs,
  id: 'obs_unknown_source',
  sourceDocId: 'non_existent_doc_id',
};
const res3 = validateObservationProvenance(obsUnknownSource, null, mockCompany);
assert(res3.valid === false, 'Test 3: Unknown sourceDocId is valid: false');
assert(res3.severity === 'ERROR', 'Test 3: Unknown sourceDocId severity is ERROR');
assert(res3.reasons.some((r) => r.includes('does not exist in registry')), 'Test 3: Reason cites doc not in registry');

// 4. Source Company Mismatch (Observation for Tesla, Source belongs to VW)
const vwSource: SourceDocument = {
  ...mockValidSource,
  id: 'vw_source_id',
  companyId: 'volkswagen_group',
};
const res4 = validateObservationProvenance(mockValidObs, vwSource, mockCompany);
assert(res4.valid === false, 'Test 4: Source company mismatch is valid: false');
assert(res4.severity === 'ERROR', 'Test 4: Source company mismatch severity is ERROR');
assert(res4.reasons.some((r) => r.includes('Source company mismatch')), 'Test 4: Reason cites company mismatch');

// 5. Source Period Mismatch (Observation 2026-Q2 vs Source 2025-Q1)
const q1Source: SourceDocument = {
  ...mockValidSource,
  id: 'tsla_2025_q1_deck',
  period: '2025-Q1',
};
const res5 = validateObservationProvenance(mockValidObs, q1Source, mockCompany);
assert(res5.severity === 'WARNING', 'Test 5: Source period mismatch returns WARNING');
assert(res5.reasons.some((r) => r.includes('Source period mismatch')), 'Test 5: Reason cites period mismatch');

// 6. Missing / Insecure (non-HTTPS) Official URL
const insecureSource: SourceDocument = {
  ...mockValidSource,
  officialUrl: 'http://insecure-domain.com/filing.pdf',
};
const res6 = validateObservationProvenance(mockValidObs, insecureSource, mockCompany);
assert(res6.valid === false, 'Test 6: Insecure source URL is valid: false');
assert(res6.severity === 'ERROR', 'Test 6: Insecure source URL severity is ERROR');

// 7. Missing Verification Method on Reported Observation
const obsMissingVerifMethod: MetricObservation = {
  ...mockValidObs,
  id: 'obs_no_verif_method',
  verificationMethod: undefined,
};
const res7 = validateObservationProvenance(obsMissingVerifMethod, mockValidSource, mockCompany);
assert(res7.valid === false, 'Test 7: Missing verificationMethod is valid: false');
assert(res7.severity === 'ERROR', 'Test 7: Missing verificationMethod severity is ERROR');

// 8. Missing Evidence Reference and Original Label
const obsNoEvidence: MetricObservation = {
  ...mockValidObs,
  id: 'obs_no_evidence',
  originalLabel: undefined,
  pageNumber: undefined,
  evidenceReference: undefined,
  tableReference: undefined,
};
const res8 = validateObservationProvenance(obsNoEvidence, mockValidSource, mockCompany);
assert(res8.severity === 'WARNING', 'Test 8: Missing evidence note returns WARNING');
assert(res8.reasons.some((r) => r.includes('no original label or evidence')), 'Test 8: Reason notes missing label/evidence');

// 9. Derived Metric Without Verification Status
const invalidDerivedObs: MetricObservation = {
  id: 'obs_derived_invalid',
  companyId: 'tesla',
  metricId: 'operating_margin',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 8.0,
  unit: 'percentage',
  valueType: 'derived',
  verificationStatus: undefined,
  reportingScope: 'consolidated_group',
  isComparable: true,
};
const res9 = validateObservationProvenance(invalidDerivedObs, null, mockCompany);
assert(res9.valid === false, 'Test 9: Derived obs without verification status is valid: false');
assert(res9.severity === 'ERROR', 'Test 9: Derived obs without verification status severity is ERROR');

// 10. Valid Derived Metric with Input References and Scope
const validDerivedObs: MetricObservation = {
  id: 'obs_derived_valid',
  companyId: 'tesla',
  metricId: 'operating_margin',
  period: '2026-Q2',
  periodType: 'quarterly',
  calendarYear: 2026,
  value: 8.0,
  unit: 'percentage',
  valueType: 'derived',
  verificationStatus: 'verified',
  reportingScope: 'consolidated_group',
  inputObservationIds: ['tsla_2026_q2_rev', 'tsla_2026_q2_ebit'],
  derivationFormula: '(operating_income / revenue) * 100',
  isComparable: true,
};
const res10 = validateObservationProvenance(validDerivedObs, null, mockCompany);
assert(res10.valid === true, 'Test 10: Valid derived obs is valid: true');
assert(res10.severity === 'INFO', 'Test 10: Valid derived obs severity is INFO');

console.log(`\nSource Provenance Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All source provenance cross-validation regression tests passed!\n');
}
