import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import {
  DocumentContentBlock,
  ExtractedLiveDocument,
  LiveDocumentExtractionOptions,
  LiveDocumentExtractionResult,
  LiveSourceDocument,
} from '../types/metrics';
import { parseContentType } from './liveSourceFetcher';

export type {
  DocumentContentBlock,
  ExtractedLiveDocument,
  LiveDocumentExtractionError,
  LiveDocumentExtractionErrorCode,
  LiveDocumentExtractionOptions,
  LiveDocumentExtractionResult,
} from '../types/metrics';

/**
 * Extraction Engine Metadata
 */
export const PDF_EXTRACTION_METHOD = 'deterministic_pdf_extractor';
export const PDF_EXTRACTION_VERSION = '1.0.0';

export const HTML_EXTRACTION_METHOD = 'structured_html_extractor';
export const HTML_EXTRACTION_VERSION = '1.0.0';

/**
 * Computes a derived SHA-256 digest of extracted text (STEP 5-2, Section 5).
 *
 * PROVENANCE NOTICE:
 * This digest represents extracted text only. It is strictly distinguished from
 * and MUST NEVER replace the authoritative raw-byte `sourceDocument.contentHash`.
 */
export function computeDerivedTextHash(extractedText: string): string {
  return createHash('sha256').update(Buffer.from(extractedText, 'utf-8')).digest('hex');
}

/**
 * Decodes standard HTML entities to plain Unicode characters (STEP 5-2, Section 3).
 */
export function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&euro;/gi, '€')
    .replace(/&pound;/gi, '£')
    .replace(/&yen;/gi, '¥')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    .replace(/&#(\d+);/g, (_, dec) => {
      const num = parseInt(dec, 10);
      return !isNaN(num) ? String.fromCharCode(num) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const num = parseInt(hex, 16);
      return !isNaN(num) ? String.fromCharCode(num) : '';
    });
}

/**
 * Decodes PDF string escapes according to PDF specification (ISO 32000-1).
 */
export function decodePdfLiteralString(raw: string): string {
  let result = '';
  let i = 0;
  while (i < raw.length) {
    const char = raw[i];
    if (char === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 'n') {
        result += '\n';
        i += 2;
      } else if (next === 'r') {
        result += '\r';
        i += 2;
      } else if (next === 't') {
        result += '\t';
        i += 2;
      } else if (next === 'b') {
        result += '\b';
        i += 2;
      } else if (next === 'f') {
        result += '\f';
        i += 2;
      } else if (next === '(') {
        result += '(';
        i += 2;
      } else if (next === ')') {
        result += ')';
        i += 2;
      } else if (next === '\\') {
        result += '\\';
        i += 2;
      } else if (/[0-7]/.test(next)) {
        const octMatch = raw.slice(i + 1, i + 4).match(/^[0-7]{1,3}/);
        if (octMatch) {
          result += String.fromCharCode(parseInt(octMatch[0], 8));
          i += 1 + octMatch[0].length;
        } else {
          result += next;
          i += 2;
        }
      } else {
        result += next;
        i += 2;
      }
    } else {
      result += char;
      i++;
    }
  }
  return result;
}

/**
 * Decodes PDF hexadecimal string `<48656c6c6f>` to text.
 */
export function decodePdfHexString(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  let result = '';
  for (let i = 0; i < clean.length; i += 2) {
    const byteHex = clean.slice(i, i + 2);
    if (byteHex.length === 1) {
      result += String.fromCharCode(parseInt(byteHex + '0', 16));
    } else {
      result += String.fromCharCode(parseInt(byteHex, 16));
    }
  }
  return result;
}

/**
 * Parses raw PDF content streams and extracts text operators (BT ... ET, Tj, TJ, ').
 */
export function extractTextFromContentStream(streamBytes: Buffer): string[] {
  let streamText = '';
  try {
    streamText = streamBytes.toString('latin1');
  } catch {
    return [];
  }

  const lines: string[] = [];

  // Match all BT ... ET text blocks
  const btRegex = /BT[\s\S]*?ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btRegex.exec(streamText)) !== null) {
    const blockContent = btMatch[0];
    const pieces: string[] = [];

    // 1. Tj operators: (text) Tj
    const tjRegex = /\(([\s\S]*?)(?<!\\)\)\s*(?:Tj|')/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(blockContent)) !== null) {
      const decoded = decodePdfLiteralString(tjMatch[1]).trim();
      if (decoded) pieces.push(decoded);
    }

    // 2. TJ array operators: [(text) -100 (more)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrayMatch: RegExpExecArray | null;
    while ((arrayMatch = tjArrayRegex.exec(blockContent)) !== null) {
      const inner = arrayMatch[1];
      const elemRegex = /\(([\s\S]*?)(?<!\\)\)|<([0-9a-fA-F]+)>|(-?\d+(?:\.\d+)?)/g;
      let elem: RegExpExecArray | null;
      let textBuffer = '';

      while ((elem = elemRegex.exec(inner)) !== null) {
        if (elem[1] !== undefined) {
          textBuffer += decodePdfLiteralString(elem[1]);
        } else if (elem[2] !== undefined) {
          textBuffer += decodePdfHexString(elem[2]);
        } else if (elem[3] !== undefined) {
          const spacing = parseFloat(elem[3]);
          if (spacing <= -100 && textBuffer.length > 0 && !textBuffer.endsWith(' ')) {
            textBuffer += ' ';
          }
        }
      }
      const trimmed = textBuffer.trim();
      if (trimmed) pieces.push(trimmed);
    }

    // 3. Hex string with Tj: <48656c6c6f> Tj
    const hexTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexTjRegex.exec(blockContent)) !== null) {
      const decoded = decodePdfHexString(hexMatch[1]).trim();
      if (decoded) pieces.push(decoded);
    }

    if (pieces.length > 0) {
      lines.push(pieces.join(' '));
    }
  }

  // Fallback: If no BT...ET blocks found, check for raw Tj/TJ
  if (lines.length === 0) {
    const tjFallback = /\(([\s\S]*?)(?<!\\)\)\s*(?:Tj|')/g;
    let fbMatch: RegExpExecArray | null;
    while ((fbMatch = tjFallback.exec(streamText)) !== null) {
      const decoded = decodePdfLiteralString(fbMatch[1]).trim();
      if (decoded) lines.push(decoded);
    }
  }

  return lines;
}

/**
 * Extracts structured text and metadata from an official IR PDF document (STEP 5-2, Section 2).
 */
export function extractPdfDocument(
  sourceDocument: LiveSourceDocument,
  rawBytes: Uint8Array,
  options?: LiveDocumentExtractionOptions
): LiveDocumentExtractionResult {
  const buffer = Buffer.from(rawBytes);

  // 1. Magic byte / header check
  const headerCheck = buffer.slice(0, 1024).toString('latin1');
  const magicIndex = headerCheck.indexOf('%PDF-');
  if (magicIndex === -1) {
    return {
      success: false,
      error: {
        code: 'invalidDocument',
        message: 'Invalid PDF format: file does not contain a %PDF magic header.',
        contentType: sourceDocument.contentType,
        sourceDocId: sourceDocument.sourceDocId,
      },
      sourceDocument,
    };
  }

  const rawString = buffer.toString('latin1');

  // 1b. Encryption / password protection check (STEP 5 Remediation, P1-4)
  if (/\/Encrypt\b/.test(rawString)) {
    return {
      success: false,
      error: {
        code: 'unsupportedPdfStructure',
        message: 'PDF document is encrypted or password-protected; decryption is not supported in this extraction engine.',
        contentType: sourceDocument.contentType,
        sourceDocId: sourceDocument.sourceDocId,
        details: 'Found /Encrypt dictionary in PDF structure.',
      },
      sourceDocument,
    };
  }

  // 2. Parse PDF indirect objects: N M obj ... endobj
  const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
  const objects = new Map<string, { body: string; offset: number }>();
  let objMatch: RegExpExecArray | null;

  while ((objMatch = objRegex.exec(rawString)) !== null) {
    const objId = `${objMatch[1]} ${objMatch[2]} R`;
    objects.set(objId, { body: objMatch[3], offset: objMatch.index });
  }

  // 3. Identify page objects: /Type /Page (excluding /Type /Pages)
  const pageEntries: { objId: string; body: string }[] = [];
  const typePageRegex = /\/Type\s*\/Page(?![a-zA-Z])/;

  for (const [objId, { body }] of objects.entries()) {
    if (typePageRegex.test(body)) {
      pageEntries.push({ objId, body });
    }
  }

  // 4. Identify image objects (for scanned/image-only PDF detection)
  let hasImageXObject = false;
  for (const [, { body }] of objects.entries()) {
    if (/\/Subtype\s*\/Image\b/.test(body) || /\/XObject\b[\s\S]*?\/Image\b/.test(body)) {
      hasImageXObject = true;
      break;
    }
  }

  // Track stream metrics and unsupported filters (STEP 5 Remediation, P1-4)
  const unsupportedFilters = new Set<string>();
  let contentStreamsParsed = 0;
  let decompressionFailures = 0;

  // Helper to extract decompress streams from an object body
  function getDecompressedStream(objBody: string): Buffer | null {
    const streamStartIdx = objBody.indexOf('stream');
    if (streamStartIdx === -1) return null;

    let dataStart = streamStartIdx + 6;
    if (objBody[dataStart] === '\r' && objBody[dataStart + 1] === '\n') {
      dataStart += 2;
    } else if (objBody[dataStart] === '\n' || objBody[dataStart] === '\r') {
      dataStart += 1;
    }

    const streamEndIdx = objBody.lastIndexOf('endstream');
    if (streamEndIdx === -1 || streamEndIdx <= dataStart) return null;

    const streamRaw = Buffer.from(objBody.slice(dataStart, streamEndIdx), 'latin1');
    contentStreamsParsed++;

    // Check filters
    const filterMatch = objBody.match(/\/Filter\s*(\[[^\]]+\]|\/[a-zA-Z0-9]+)/);
    if (filterMatch) {
      const filterStr = filterMatch[1];
      const filters = filterStr.match(/\/[a-zA-Z0-9]+/g) || [];
      for (const f of filters) {
        if (f !== '/FlateDecode') {
          unsupportedFilters.add(f);
        }
      }
    }

    const isFlate = /\/Filter\s*(?:\[\s*)?\/FlateDecode/.test(objBody);

    if (isFlate) {
      try {
        return inflateSync(streamRaw);
      } catch {
        decompressionFailures++;
        return streamRaw;
      }
    }
    return streamRaw;
  }

  const blocks: DocumentContentBlock[] = [];
  let blockIndexCounter = 0;
  const pageCount = pageEntries.length > 0 ? pageEntries.length : 1;

  if (pageEntries.length > 0) {
    for (let pIdx = 0; pIdx < pageEntries.length; pIdx++) {
      const pageNum = pIdx + 1;
      const pageBody = pageEntries[pIdx].body;

      // Find contents reference: /Contents 4 0 R or /Contents [4 0 R 5 0 R]
      const contentsMatch = pageBody.match(/\/Contents\s*(?:(\d+\s+\d+\s+R)|\[([\s\S]*?)\])/);
      const streamObjIds: string[] = [];

      if (contentsMatch) {
        if (contentsMatch[1]) {
          streamObjIds.push(contentsMatch[1]);
        } else if (contentsMatch[2]) {
          const refs = contentsMatch[2].match(/\d+\s+\d+\s+R/g) || [];
          streamObjIds.push(...refs);
        }
      }

      for (const sId of streamObjIds) {
        const streamObj = objects.get(sId);
        if (streamObj) {
          const decompressed = getDecompressedStream(streamObj.body);
          if (decompressed) {
            const lines = extractTextFromContentStream(decompressed);
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                const isTable = trimmed.includes(' | ');
                const cells = isTable ? trimmed.split(' | ').map((s) => s.trim()) : undefined;
                blocks.push({
                  id: `pdf_p${pageNum}_b${blockIndexCounter}`,
                  blockType: isTable ? 'table_row' : 'paragraph',
                  text: trimmed,
                  pageNumber: pageNum,
                  locator: `page:${pageNum}:block:${blockIndexCounter}`,
                  cells: isTable ? cells : undefined,
                  rowHeader: isTable && cells && cells.length > 1 ? cells[0] : undefined,
                });
                blockIndexCounter++;
              }
            }
          }
        }
      }
    }
  } else {
    // If no /Type /Page objects found, search all stream objects directly
    for (const [, { body }] of objects.entries()) {
      const decompressed = getDecompressedStream(body);
      if (decompressed) {
        const lines = extractTextFromContentStream(decompressed);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            const isTable = trimmed.includes(' | ');
            const cells = isTable ? trimmed.split(' | ').map((s) => s.trim()) : undefined;
            blocks.push({
              id: `pdf_b${blockIndexCounter}`,
              blockType: isTable ? 'table_row' : 'paragraph',
              text: trimmed,
              pageNumber: 1,
              locator: `page:1:block:${blockIndexCounter}`,
              cells: isTable ? cells : undefined,
              rowHeader: isTable && cells && cells.length > 1 ? cells[0] : undefined,
            });
            blockIndexCounter++;
          }
        }
      }
    }
  }

  // 5. Check if document is image-only / scanned without OCR
  if (blocks.length === 0 && hasImageXObject) {
    return {
      success: false,
      error: {
        code: 'extractionUnavailable',
        message: 'Document appears to be a scanned or image-only PDF without embedded text; OCR is not supported in this engine.',
        contentType: sourceDocument.contentType,
        sourceDocId: sourceDocument.sourceDocId,
      },
      sourceDocument,
    };
  }

  // 5b. Check if extraction failed due to unsupported filters or decompression failures
  if (blocks.length === 0 && unsupportedFilters.size > 0) {
    return {
      success: false,
      error: {
        code: 'unsupportedPdfStructure',
        message: `PDF uses unsupported stream filter(s): ${Array.from(unsupportedFilters).join(', ')}.`,
        contentType: sourceDocument.contentType,
        sourceDocId: sourceDocument.sourceDocId,
        details: `Encountered unsupported filter(s): ${Array.from(unsupportedFilters).join(', ')}`,
      },
      sourceDocument,
    };
  }

  if (blocks.length === 0 && decompressionFailures > 0) {
    return {
      success: false,
      error: {
        code: 'unsupportedPdfStructure',
        message: 'Failed to decompress PDF content stream(s).',
        contentType: sourceDocument.contentType,
        sourceDocId: sourceDocument.sourceDocId,
        details: `Encountered ${decompressionFailures} decompression failures.`,
      },
      sourceDocument,
    };
  }

  const extractedText = blocks.map((b) => b.text).join('\n\n');
  const derivedTextHash =
    options?.computeDerivedTextHash !== false ? computeDerivedTextHash(extractedText) : undefined;

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument,
    extractionMethod: options?.extractionMethod ?? PDF_EXTRACTION_METHOD,
    extractionVersion: options?.extractionVersion ?? PDF_EXTRACTION_VERSION,
    extractedText,
    extractedAt: new Date().toISOString(),
    pageCount,
    blocks,
    derivedTextHash,
    diagnostics: {
      totalObjectsParsed: objects.size,
      pageObjectsFound: pageEntries.length,
      contentStreamsParsed,
      unsupportedFeatures: unsupportedFilters.size > 0 ? Array.from(unsupportedFilters) : undefined,
    },
  };

  return {
    success: true,
    document: extractedDoc,
  };
}

/**
 * Extracts structured text and metadata from an official IR HTML document (STEP 5-2, Section 3).
 */
export function extractHtmlDocument(
  sourceDocument: LiveSourceDocument,
  rawBytes: Uint8Array,
  options?: LiveDocumentExtractionOptions
): LiveDocumentExtractionResult {
  // 1. Decode raw bytes with charset from Content-Type if available
  const parsedCt = parseContentType(sourceDocument.contentType);
  const charset = parsedCt?.parameters?.charset?.toLowerCase() || 'utf-8';
  let html = '';

  try {
    const decoder = new TextDecoder(charset, { fatal: false });
    html = decoder.decode(rawBytes);
  } catch {
    html = Buffer.from(rawBytes).toString('utf-8');
  }

  // 2. Strip scripts, styles, noscript, svg, comments (STEP 5-2, Section 8 Security)
  let cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');

  // 2b. Auto-close unclosed headings/paragraphs in malformed HTML
  cleanHtml = cleanHtml.replace(
    /<(h[1-6]|p)([^>]*)>([\s\S]*?)(?=(?:<(?:h[1-6]|p|table|ul|ol|div|body|\/body)[^>]*>|$))/gi,
    (fullMatch, tag, attrs, content) => {
      if (content.toLowerCase().includes(`</${tag.toLowerCase()}>`)) {
        return fullMatch;
      }
      return `<${tag}${attrs}>${content}</${tag}>`;
    }
  );

  const blocks: DocumentContentBlock[] = [];
  let blockCounter = 0;

  // 3. Extract <title> if present
  let documentTitle: string | undefined;
  const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const rawTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    if (rawTitle) {
      documentTitle = decodeHtmlEntities(rawTitle);
      blocks.push({
        id: `html_title_${blockCounter}`,
        blockType: 'title',
        text: documentTitle,
        locator: 'html:title',
      });
      blockCounter++;
    }
  }

  // 4. Extract structural elements in document order (h1-h6, p, table, li)
  const elementRegex = /<(h[1-6]|p|table|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let currentSectionHeading: string | undefined;
  let pIdx = 0;
  let hIdx = 0;
  let tIdx = 0;
  let liIdx = 0;

  while ((match = elementRegex.exec(cleanHtml)) !== null) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[2];

    if (tag.startsWith('h')) {
      const headingLevel = parseInt(tag[1], 10);
      const rawText = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const text = decodeHtmlEntities(rawText);
      if (text) {
        currentSectionHeading = text;
        blocks.push({
          id: `html_${tag}_${hIdx}`,
          blockType: 'heading',
          text,
          headingLevel,
          sectionHeading: currentSectionHeading,
          locator: `html:${tag}:${hIdx}`,
        });
        hIdx++;
        blockCounter++;
      }
    } else if (tag === 'p') {
      const rawText = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const text = decodeHtmlEntities(rawText);
      if (text) {
        blocks.push({
          id: `html_p_${pIdx}`,
          blockType: 'paragraph',
          text,
          sectionHeading: currentSectionHeading,
          paragraphIndex: pIdx,
          locator: `html:p:${pIdx}`,
        });
        pIdx++;
        blockCounter++;
      }
    } else if (tag === 'table') {
      const currentTableIdx = tIdx;
      tIdx++;
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;
      let rowIdx = 0;

      interface ParsedHtmlRow {
        rowIdx: number;
        cells: string[];
        isHeader: boolean;
      }
      const rawRows: ParsedHtmlRow[] = [];

      const pendingRowspans: Array<{ remainingRows: number; text: string; isTh: boolean }> = [];

      while ((rowMatch = rowRegex.exec(innerHtml)) !== null) {
        const rowContent = rowMatch[1];
        const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
        let cellMatch: RegExpExecArray | null;
        const cells: string[] = [];
        let thCount = 0;
        let totalCells = 0;
        let colIdx = 0;

        cellMatch = cellRegex.exec(rowContent);
        while (cellMatch !== null || (colIdx < pendingRowspans.length && pendingRowspans[colIdx]?.remainingRows > 0)) {
          if (colIdx < pendingRowspans.length && pendingRowspans[colIdx] && pendingRowspans[colIdx].remainingRows > 0) {
            cells.push(pendingRowspans[colIdx].text);
            totalCells++;
            if (pendingRowspans[colIdx].isTh) thCount++;
            pendingRowspans[colIdx].remainingRows--;
            colIdx++;
            continue;
          }

          if (!cellMatch) break;

          const cellTag = cellMatch[1].toLowerCase();
          const openTag = cellMatch[0];
          const colspanMatch = openTag.match(/colspan=["']?(\d+)["']?/i);
          const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;
          const rowspanMatch = openTag.match(/rowspan=["']?(\d+)["']?/i);
          const rowspan = rowspanMatch ? parseInt(rowspanMatch[1], 10) : 1;
          const rawCell = cellMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const cleanCell = decodeHtmlEntities(rawCell);
          const spanCount = Math.max(1, colspan);

          for (let s = 0; s < spanCount; s++) {
            cells.push(cleanCell);
            totalCells++;
            if (cellTag === 'th') thCount++;
            if (rowspan > 1) {
              pendingRowspans[colIdx + s] = {
                remainingRows: rowspan - 1,
                text: cleanCell,
                isTh: cellTag === 'th',
              };
            }
          }
          colIdx += spanCount;
          cellMatch = cellRegex.exec(rowContent);
        }

        if (cells.length > 0) {
          const isHeader = (thCount > 0 && thCount === totalCells) || (rawRows.length === 0 && thCount > 0);
          rawRows.push({ rowIdx, cells, isHeader });
          rowIdx++;
        }
      }

      // Collect leading header rows to support multi-level headers
      const headerRows: ParsedHtmlRow[] = [];
      let dataRowStart = 0;
      for (let i = 0; i < rawRows.length; i++) {
        if (rawRows[i].isHeader || (i === 0 && rawRows.length > 1 && rawRows[i].cells.every((c) => isNaN(Number(c.replace(/[%€$]/g, '').trim()))))) {
          headerRows.push(rawRows[i]);
          dataRowStart = i + 1;
        } else {
          break;
        }
      }

      // Combine multi-level column headers
      let columnHeaders: string[] = [];
      if (headerRows.length > 0) {
        const maxCols = Math.max(...rawRows.map((r) => r.cells.length));
        columnHeaders = new Array(maxCols).fill('');
        for (let col = 0; col < maxCols; col++) {
          const colParts: string[] = [];
          for (const hRow of headerRows) {
            if (col < hRow.cells.length && hRow.cells[col]) {
              colParts.push(hRow.cells[col]);
            }
          }
          columnHeaders[col] = colParts.join(' | ');
        }
      }

      // Generate content blocks preserving row/cell association
      for (const r of rawRows) {
        const isData = r.rowIdx >= dataRowStart;
        const rowText = r.cells.join(' | ');
        const rowHeader = isData && r.cells.length > 1 ? r.cells[0] : undefined;

        blocks.push({
          id: `html_t${currentTableIdx}_r${r.rowIdx}`,
          blockType: 'table_row',
          text: rowText,
          tableIndex: currentTableIdx,
          rowIndex: r.rowIdx,
          sectionHeading: currentSectionHeading,
          locator: `html:table:${currentTableIdx}:row:${r.rowIdx}`,
          cells: r.cells,
          columnHeaders: isData && columnHeaders.length > 0 ? columnHeaders : undefined,
          rowHeader,
          contextHeaders: headerRows.map((h) => h.cells.join(' | ')),
        });
        blockCounter++;
      }
    } else if (tag === 'li') {
      const rawText = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const text = decodeHtmlEntities(rawText);
      if (text) {
        blocks.push({
          id: `html_li_${liIdx}`,
          blockType: 'list_item',
          text,
          sectionHeading: currentSectionHeading,
          locator: `html:li:${liIdx}`,
        });
        liIdx++;
        blockCounter++;
      }
    }
  }

  // 5. Format extracted text representation
  const extractedText = blocks.map((b) => b.text).join('\n\n');
  const derivedTextHash =
    options?.computeDerivedTextHash !== false ? computeDerivedTextHash(extractedText) : undefined;

  const extractedDoc: ExtractedLiveDocument = {
    sourceDocument,
    extractionMethod: options?.extractionMethod ?? HTML_EXTRACTION_METHOD,
    extractionVersion: options?.extractionVersion ?? HTML_EXTRACTION_VERSION,
    extractedText,
    extractedAt: new Date().toISOString(),
    documentTitle,
    blocks,
    derivedTextHash,
  };

  return {
    success: true,
    document: extractedDoc,
  };
}

/**
 * Universal live document extractor dispatching by Content-Type (STEP 5-2).
 *
 * Supported Media Types:
 *  - application/pdf -> extractPdfDocument
 *  - text/html       -> extractHtmlDocument
 *
 * PROVENANCE PRESERVATION:
 * Retains the complete authentic LiveSourceDocument with its original URL, final URL,
 * raw-byte contentHash, and retrieval metadata.
 */
export async function extractLiveDocument(
  sourceDocument: LiveSourceDocument,
  rawBytes: Uint8Array,
  options?: LiveDocumentExtractionOptions
): Promise<LiveDocumentExtractionResult> {
  // 1. Guard against empty byte buffers
  if (!rawBytes || rawBytes.byteLength === 0) {
    return {
      success: false,
      error: {
        code: 'emptyDocument',
        message: 'Document raw byte buffer is empty (0 bytes).',
        contentType: sourceDocument.contentType,
        sourceDocId: sourceDocument.sourceDocId,
      },
      sourceDocument,
    };
  }

  // 2. Parse Content-Type
  const parsedCt = parseContentType(sourceDocument.contentType);
  const mediaType = parsedCt?.mediaType || '';

  if (mediaType === 'application/pdf') {
    return extractPdfDocument(sourceDocument, rawBytes, options);
  }

  if (mediaType === 'text/html') {
    return extractHtmlDocument(sourceDocument, rawBytes, options);
  }

  return {
    success: false,
    error: {
      code: 'unsupportedContentType',
      message: `Content-Type "${sourceDocument.contentType}" is not supported for text extraction. Supported media types: application/pdf, text/html.`,
      contentType: sourceDocument.contentType,
      sourceDocId: sourceDocument.sourceDocId,
    },
    sourceDocument,
  };
}
