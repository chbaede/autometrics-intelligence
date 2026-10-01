import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { isUrlInOfficialDomain } from '../data/officialSources';
export type {
  LiveSourceDocument,
  LiveSourceFetchError,
  LiveSourceFetchErrorCode,
  LiveSourceFetchOptions,
  LiveSourceFetchResult,
} from '../types/metrics';
import {
  LiveSourceDocument,
  LiveSourceFetchErrorCode,
  LiveSourceFetchOptions,
  LiveSourceFetchResult,
  SourceDocument,
} from '../types/metrics';
import { SOURCE_DOCUMENTS } from '../data/sources';

/**
 * Computes the canonical SHA-256 hexadecimal digest from exact raw HTTP response bytes (STEP 5-1, Section 1 & 7).
 *
 * CRITICAL INVARIANT:
 * This function operates directly on raw bytes BEFORE any decoding, normalization,
 * whitespace trimming, HTML parsing, or PDF text extraction.
 *
 * Guaranteed to return a 64-character lowercase hexadecimal string.
 */
export function computeRawByteSha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Parsed Content-Type header details (STEP 5-1, Section 3).
 */
export interface ParsedContentType {
  /** Canonical lowercase media type without parameters, e.g. "application/pdf", "text/html" */
  mediaType: string;
  /** Key-value parameter map, e.g. { charset: "utf-8" } */
  parameters: Record<string, string>;
  /** Original unparsed header string */
  raw: string;
}

/**
 * Parses and sanitizes a Content-Type header value (STEP 5-1, Section 3).
 *
 * Recognizes and strips parameters (e.g. `application/pdf; charset=binary` -> `application/pdf`).
 * Returns null if the header is missing, undefined, or empty.
 */
export function parseContentType(headerValue: string | null | undefined): ParsedContentType | null {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(';');
  const mediaType = parts[0].trim().toLowerCase();
  if (!mediaType) return null;

  const parameters: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const key = part.slice(0, eqIdx).trim().toLowerCase();
      let val = part.slice(eqIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
        val = val.slice(1, -1);
      }
      parameters[key] = val;
    }
  }

  return { mediaType, parameters, raw: trimmed };
}

/**
 * Checks if a hostname resolves to a private, loopback, link-local, carrier-grade, or reserved IP address (STEP 5-1; STEP 5 Remediation, P1-2).
 *
 * Comprehensive SSRF mitigation covering:
 * - Localhost / loopback: localhost, 127.0.0.0/8, ::1, [::1], ::
 * - RFC 1918 Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 * - Link-local / APIPA: 169.254.0.0/16, fe80::/10
 * - Shared address space / CGNAT: 100.64.0.0/10 (100.64 - 100.127)
 * - IETF Protocol / Test-nets: 192.0.0.0/24, 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
 * - Benchmarking: 198.18.0.0/15 (198.18 - 198.19)
 * - Multicast & Reserved: 224.0.0.0/4, 240.0.0.0/4, 255.255.255.255, 0.0.0.0/8
 * - IPv6 Unique Local: fc00::/7
 * - IPv4-mapped IPv6: ::ffff:x.x.x.x
 * - Integer, octal, hex IP notations (e.g. 2130706433, 0x7f000001)
 * - Internal mDNS / local domain suffixes: .local, .localhost, .internal, .lan, .home, .arpa
 */
export function isPrivateOrLoopbackHost(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  let host = hostname.toLowerCase().trim();

  // Strip brackets if IPv6
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }

  // Exact names
  if (host === 'localhost' || host === '0.0.0.0') {
    return true;
  }

  // Domain suffixes
  if (
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.home') ||
    host.endsWith('.arpa')
  ) {
    return true;
  }

  // Single integer or hex or octal IP notation (e.g. 2130706433 or 0x7f000001)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) {
    return true;
  }

  // Check IPv4
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [b0, b1, b2, b3] = ipv4Match.slice(1).map((s) => parseInt(s, 10));
    if (b0 > 255 || b1 > 255 || b2 > 255 || b3 > 255) return true;

    // 0.0.0.0/8
    if (b0 === 0) return true;
    // 10.0.0.0/8 (RFC 1918)
    if (b0 === 10) return true;
    // 100.64.0.0/10 (Shared Address Space / CGNAT: 100.64 - 100.127)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (Link Local)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12 (RFC 1918: 172.16 - 172.31)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (b0 === 192 && b1 === 0 && b2 === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (b0 === 192 && b1 === 0 && b2 === 2) return true;
    // 192.168.0.0/16 (RFC 1918)
    if (b0 === 192 && b1 === 168) return true;
    // 198.18.0.0/15 (Network benchmark: 198.18 - 198.19)
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (b0 === 198 && b1 === 51 && b2 === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (b0 === 203 && b1 === 0 && b2 === 113) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
    if (b0 >= 224) return true;

    return false;
  }

  // Check IPv6
  const ipVer = isIP(host);
  if (ipVer === 6 || host.includes(':')) {
    // ::1 loopback
    if (host === '::1' || host === '0:0:0:0:0:0:0:1' || host === '::') return true;
    // fe80::/10 link-local
    if (/^fe[89ab]/i.test(host)) return true;
    // fc00::/7 unique local
    if (/^f[cd]/i.test(host)) return true;
    // IPv4-mapped IPv6 ::ffff:x.x.x.x
    const ipv4Mapped = host.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
    if (ipv4Mapped) {
      return isPrivateOrLoopbackHost(ipv4Mapped[1]);
    }
    return true; // Any explicit IPv6 address literal should be treated as private/restricted for official IR web URLs
  }

  return false;
}

/**
 * Validates the syntactic and transport security constraints of a target URL (STEP 5-1, Section 2 & 9).
 *
 * Rules:
 *  - Must be a non-empty string
 *  - Must parse as a standard URL
 *  - Must use the HTTPS protocol (rejects http, file, data, javascript, etc.)
 *  - Must contain a valid hostname
 *  - Rejects loopback / private IP targets unless allowLocalhost is explicitly enabled (SSRF guard)
 *  - Checks official domain policy if officialDomain option is supplied (STEP 5 Remediation, P1-1)
 */
export function validateTransportUrl(
  url: string,
  options?: { allowLocalhost?: boolean; officialDomain?: string | string[] }
): { valid: boolean; errorCode?: LiveSourceFetchErrorCode; message?: string; urlObj?: URL } {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return {
      valid: false,
      errorCode: 'invalidUrl',
      message: 'Target URL must be a non-empty string.',
    };
  }

  const trimmed = url.trim();
  let urlObj: URL;
  try {
    urlObj = new URL(trimmed);
  } catch (err: any) {
    return {
      valid: false,
      errorCode: 'invalidUrl',
      message: `Malformed URL: "${trimmed}". ${err?.message || ''}`.trim(),
    };
  }

  if (urlObj.protocol !== 'https:') {
    return {
      valid: false,
      errorCode: 'unsupportedProtocol',
      message: `Protocol "${urlObj.protocol}" is not supported. Only secure HTTPS is permitted for official IR ingestion.`,
    };
  }

  if (!urlObj.hostname) {
    return {
      valid: false,
      errorCode: 'invalidUrl',
      message: `URL missing hostname: "${trimmed}".`,
    };
  }

  if (!options?.allowLocalhost && isPrivateOrLoopbackHost(urlObj.hostname)) {
    return {
      valid: false,
      errorCode: 'invalidUrl',
      message: `Access to private or loopback address "${urlObj.hostname}" is restricted by default SSRF policy.`,
    };
  }

  if (options?.officialDomain && !isUrlInOfficialDomain(urlObj.href, options.officialDomain)) {
    return {
      valid: false,
      errorCode: 'unauthorizedSource',
      message: `URL "${urlObj.href}" does not match approved official domain policy: ${Array.isArray(options.officialDomain) ? options.officialDomain.join(', ') : options.officialDomain}.`,
    };
  }

  return { valid: true, urlObj };
}

/**
 * Matches a URL against the repository's registered primary source documents (STEP 5-1, Section 5).
 */
export function matchRegisteredSourceDocument(
  url: string,
  registeredSources: SourceDocument[] = SOURCE_DOCUMENTS
): SourceDocument | undefined {
  try {
    const targetUrl = new URL(url.trim());
    return registeredSources.find((doc) => {
      try {
        const docUrl = new URL(doc.officialUrl.trim());
        return docUrl.href === targetUrl.href || (docUrl.origin === targetUrl.origin && docUrl.pathname === targetUrl.pathname);
      } catch {
        return doc.officialUrl.trim() === url.trim();
      }
    });
  } catch {
    return undefined;
  }
}

/**
 * Evaluates whether a URL is an authorized official IR source (STEP 5-1, Section 5).
 *
 * SEPARATION OF CONCERNS:
 * Transport security (HTTPS) is necessary but NOT sufficient to designate a URL as an
 * authorized primary IR source. This function checks against registered SourceDocuments.
 */
export function isAuthorizedOfficialSource(
  url: string,
  registeredSources: SourceDocument[] = SOURCE_DOCUMENTS
): {
  authorized: boolean;
  sourceDoc?: SourceDocument;
  companyId?: string;
  reason?: string;
} {
  const matched = matchRegisteredSourceDocument(url, registeredSources);
  if (matched) {
    return {
      authorized: true,
      sourceDoc: matched,
      companyId: matched.companyId,
    };
  }

  return {
    authorized: false,
    reason: `URL "${url}" does not match any registered official SourceDocument in the repository.`,
  };
}

/**
 * Concatenates multiple Uint8Array chunks into a single Uint8Array without string re-encoding (STEP 5-1, Section 7).
 */
function concatUint8Arrays(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/**
 * Retrieves an official IR source document from a live HTTPS endpoint with strict cryptographic provenance (STEP 5-1).
 *
 * Security & Architectural Controls:
 *  1. Accepts HTTPS URLs only; rejects http, file, data, javascript, and malformed URLs.
 *  2. Follows redirects strictly under manual control (max 5 hops; rejects HTTPS -> HTTP downgrade; detects loops).
 *  3. Bounded execution with explicit AbortController timeout.
 *  4. Bounded response download with maxResponseBytes enforcement (on Content-Length and streaming chunks).
 *  5. Strict Content-Type policy (application/pdf, text/html with parameter tolerance).
 *  6. Cryptographic raw-byte hashing: SHA-256 computed on exact response bytes before any decoding/parsing.
 *  7. Preserves metadata: originalUrl, finalUrl, httpStatus, contentType, byteLength, retrievedAt, hashAlgorithm.
 *  8. SOURCE RETRIEVED ≠ CLAIM VERIFIED: Returns LiveSourceDocument, never claims verification of financial metrics.
 */
export async function fetchOfficialIrSource(
  url: string,
  options: LiveSourceFetchOptions = {}
): Promise<LiveSourceFetchResult> {
  const originalUrl = (url ?? '').trim();

  // 1. Validate initial URL transport security
  const urlValidation = validateTransportUrl(originalUrl, {
    allowLocalhost: options.allowLocalhost,
    officialDomain: options.officialDomain,
  });
  if (!urlValidation.valid) {
    return {
      success: false,
      error: {
        code: urlValidation.errorCode ?? 'invalidUrl',
        message: urlValidation.message ?? 'Invalid URL provided.',
        url: originalUrl,
      },
    };
  }

  // 2. Official-source authorization check (if required by options)
  const registeredSources = options.authorizedSources ?? SOURCE_DOCUMENTS;
  if (options.requireSourceAuthorization) {
    const authResult = isAuthorizedOfficialSource(originalUrl, registeredSources);
    if (!authResult.authorized) {
      return {
        success: false,
        error: {
          code: 'unauthorizedSource',
          message: authResult.reason ?? `URL "${originalUrl}" is not an authorized official IR source document.`,
          url: originalUrl,
        },
      };
    }
  }

  // 3. Operational defaults
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxResponseBytes = options.maxResponseBytes ?? 20 * 1024 * 1024; // 20 MB
  const maxRedirects = options.maxRedirects ?? 5;
  const allowedContentTypes = (options.allowedContentTypes ?? ['application/pdf', 'text/html']).map((ct) => ct.toLowerCase());
  const fetchImpl = options.fetchFn ?? globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    return {
      success: false,
      error: {
        code: 'networkError',
        message: 'No fetch implementation available in current runtime environment.',
        url: originalUrl,
      },
    };
  }

  // 4. Setup AbortController for deterministic timeout & cancellation
  const controller = new AbortController();
  let timedOut = false;
  let sizeAborted = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort('timeout');
  }, timeoutMs);

  let currentUrl = originalUrl;
  let redirectCount = 0;
  const visitedUrls = new Set<string>([currentUrl]);
  let res: Response;

  try {
    // 5. Follow redirects under strict manual control
    while (true) {
      try {
        res = await fetchImpl(currentUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/pdf, text/html;q=0.9, */*;q=0.1',
            'User-Agent': 'AutoMetrics-Intelligence/1.0 (Official IR Ingestion; +https://github.com/chbaede/autometrics-intelligence)',
          },
          redirect: 'manual',
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (timedOut || controller.signal.aborted) {
          if (sizeAborted) {
            return {
              success: false,
              error: {
                code: 'responseTooLarge',
                message: `Response size exceeded maximum allowed limit (${maxResponseBytes} bytes).`,
                url: originalUrl,
                finalUrl: currentUrl,
              },
            };
          }
          return {
            success: false,
            error: {
              code: 'requestTimeout',
              message: `Request timed out after ${timeoutMs}ms.`,
              url: originalUrl,
              finalUrl: currentUrl,
            },
          };
        }
        return {
          success: false,
          error: {
            code: 'networkError',
            message: fetchErr?.message || 'Network request failed.',
            url: originalUrl,
            finalUrl: currentUrl,
            details: String(fetchErr),
          },
        };
      }

      // Check for redirect responses (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        redirectCount++;
        if (redirectCount > maxRedirects) {
          return {
            success: false,
            error: {
              code: 'redirectLimitExceeded',
              message: `Redirect limit exceeded: followed ${redirectCount - 1} redirects (max allowed is ${maxRedirects}).`,
              url: originalUrl,
              finalUrl: currentUrl,
              httpStatus: res.status,
            },
          };
        }

        const locationHeader = res.headers.get('location');
        if (!locationHeader) {
          return {
            success: false,
            error: {
              code: 'invalidUrl',
              message: `Server returned redirect status ${res.status} without a Location header.`,
              url: originalUrl,
              finalUrl: currentUrl,
              httpStatus: res.status,
            },
          };
        }

        let nextUrlObj: URL;
        try {
          nextUrlObj = new URL(locationHeader, currentUrl);
        } catch {
          return {
            success: false,
            error: {
              code: 'invalidUrl',
              message: `Malformed redirect location: "${locationHeader}".`,
              url: originalUrl,
              finalUrl: currentUrl,
              httpStatus: res.status,
            },
          };
        }

        // Enforce HTTPS -> HTTPS redirect security (STEP 5-1, Section 2, item 10)
        if (nextUrlObj.protocol !== 'https:') {
          return {
            success: false,
            error: {
              code: 'redirectProtocolRejected',
              message: `Insecure redirect rejected: target protocol is "${nextUrlObj.protocol}". Only HTTPS -> HTTPS redirects are permitted.`,
              url: originalUrl,
              finalUrl: nextUrlObj.href,
              httpStatus: res.status,
            },
          };
        }

        // Loopback / private address check on redirect target
        if (!options.allowLocalhost && isPrivateOrLoopbackHost(nextUrlObj.hostname)) {
          return {
            success: false,
            error: {
              code: 'invalidUrl',
              message: `Redirect to private or loopback address "${nextUrlObj.hostname}" is restricted by SSRF policy.`,
              url: originalUrl,
              finalUrl: nextUrlObj.href,
              httpStatus: res.status,
            },
          };
        }

        // Enforce official domain policy BEFORE making next request (STEP 5 Remediation, P1-1)
        if (options.officialDomain && !isUrlInOfficialDomain(nextUrlObj.href, options.officialDomain)) {
          return {
            success: false,
            error: {
              code: 'unauthorizedDomainRedirect',
              message: `Insecure redirect rejected before request: Target URL "${nextUrlObj.href}" does not match approved official domain policy (${Array.isArray(options.officialDomain) ? options.officialDomain.join(', ') : options.officialDomain}).`,
              url: originalUrl,
              finalUrl: nextUrlObj.href,
              httpStatus: res.status,
            },
          };
        }

        // Redirect loop detection
        if (visitedUrls.has(nextUrlObj.href)) {
          return {
            success: false,
            error: {
              code: 'redirectLimitExceeded',
              message: `Redirect loop detected at "${nextUrlObj.href}".`,
              url: originalUrl,
              finalUrl: nextUrlObj.href,
              httpStatus: res.status,
            },
          };
        }

        visitedUrls.add(nextUrlObj.href);
        currentUrl = nextUrlObj.href;
        continue;
      }

      // Reached non-redirect status; proceed to validation
      break;
    }

    // 6. HTTP Status validation (200 - 299)
    if (res.status < 200 || res.status >= 300) {
      return {
        success: false,
        error: {
          code: 'httpError',
          message: `HTTP request failed with status ${res.status} (${res.statusText || 'Error'}).`,
          url: originalUrl,
          finalUrl: currentUrl,
          httpStatus: res.status,
        },
      };
    }

    // 7. Content-Type Header policy
    const rawContentType = res.headers.get('content-type');
    const parsedCt = parseContentType(rawContentType);
    if (!parsedCt) {
      return {
        success: false,
        error: {
          code: 'missingContentType',
          message: 'Response is missing or has an empty Content-Type header.',
          url: originalUrl,
          finalUrl: currentUrl,
          httpStatus: res.status,
        },
      };
    }

    if (!allowedContentTypes.includes(parsedCt.mediaType)) {
      return {
        success: false,
        error: {
          code: 'unsupportedContentType',
          message: `Unsupported Content-Type "${parsedCt.mediaType}". Supported types: ${allowedContentTypes.join(', ')}.`,
          url: originalUrl,
          finalUrl: currentUrl,
          httpStatus: res.status,
          contentType: rawContentType ?? undefined,
        },
      };
    }

    // 8. Stated Content-Length limit check
    const statedContentLength = res.headers.get('content-length');
    if (statedContentLength) {
      const parsedLen = parseInt(statedContentLength, 10);
      if (!isNaN(parsedLen) && parsedLen > maxResponseBytes) {
        sizeAborted = true;
        controller.abort();
        return {
          success: false,
          error: {
            code: 'responseTooLarge',
            message: `Stated Content-Length (${parsedLen} bytes) exceeds maximum allowed response size (${maxResponseBytes} bytes).`,
            url: originalUrl,
            finalUrl: currentUrl,
            httpStatus: res.status,
            contentType: rawContentType ?? undefined,
          },
        };
      }
    }

    // 9. Read exact raw bytes with chunk-level size enforcement and stream error normalization (STEP 5 Remediation, P1-5)
    let rawBytes: Uint8Array;
    try {
      if (res.body && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalReceived = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalReceived += value.byteLength;
            if (totalReceived > maxResponseBytes) {
              sizeAborted = true;
              await reader.cancel();
              controller.abort();
              return {
                success: false,
                error: {
                  code: 'responseTooLarge',
                  message: `Streamed response exceeded maximum allowed size limit (${maxResponseBytes} bytes).`,
                  url: originalUrl,
                  finalUrl: currentUrl,
                  httpStatus: res.status,
                  contentType: rawContentType ?? undefined,
                },
              };
            }
            chunks.push(value);
          }
        }
        rawBytes = concatUint8Arrays(chunks, totalReceived);
      } else {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength > maxResponseBytes) {
          return {
            success: false,
            error: {
              code: 'responseTooLarge',
              message: `Response size (${arrayBuffer.byteLength} bytes) exceeded maximum allowed limit (${maxResponseBytes} bytes).`,
              url: originalUrl,
              finalUrl: currentUrl,
              httpStatus: res.status,
              contentType: rawContentType ?? undefined,
            },
          };
        }
        rawBytes = new Uint8Array(arrayBuffer);
      }
    } catch (streamErr: any) {
      if (timedOut || controller.signal.aborted) {
        if (sizeAborted) {
          return {
            success: false,
            error: {
              code: 'responseTooLarge',
              message: `Response size exceeded maximum allowed limit (${maxResponseBytes} bytes).`,
              url: originalUrl,
              finalUrl: currentUrl,
              httpStatus: res.status,
              contentType: rawContentType ?? undefined,
            },
          };
        }
        return {
          success: false,
          error: {
            code: 'requestTimeout',
            message: `Response body read timed out after ${timeoutMs}ms.`,
            url: originalUrl,
            finalUrl: currentUrl,
            httpStatus: res.status,
            contentType: rawContentType ?? undefined,
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'networkError',
          message: `Response body stream read failed: ${streamErr?.message || String(streamErr)}`,
          url: originalUrl,
          finalUrl: currentUrl,
          httpStatus: res.status,
          contentType: rawContentType ?? undefined,
          details: String(streamErr),
        },
      };
    }

    // 10. Compute exact cryptographic SHA-256 on raw response bytes
    const contentHash = computeRawByteSha256(rawBytes);

    // 11. Match against registered official source documents
    const matchedDoc = matchRegisteredSourceDocument(currentUrl, registeredSources);
    const documentId = options.id ?? (matchedDoc ? `live_${matchedDoc.id}` : `live_${contentHash.slice(0, 16)}`);

    const liveDocument: LiveSourceDocument = {
      id: documentId,
      url: originalUrl,
      finalUrl: currentUrl,
      retrievedAt: new Date().toISOString(),
      httpStatus: res.status,
      contentType: rawContentType!,
      contentLength: rawBytes.byteLength,
      contentHash,
      hashAlgorithm: 'sha256',
      sourceKind: 'official_ir',
      ...(matchedDoc ? { sourceDocId: matchedDoc.id, companyId: matchedDoc.companyId } : {}),
    };

    return {
      success: true,
      document: liveDocument,
      rawBytes,
    };
  } finally {
    clearTimeout(timer);
  }
}
