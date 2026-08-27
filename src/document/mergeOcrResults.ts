import type { DocumentLine, DocumentPage, DocumentPageSource, DocumentParseResult } from '../shared/types/document';
import type { OcrLine, OcrPageResult } from '../ocr/types';

export function applyOcrResultToPage(page: DocumentPage, ocrResult: OcrPageResult): DocumentPage {
  const ocrLines: DocumentLine[] = ocrResult.lines.map((line) => ({
    lineNumber: line.lineNumber,
    text: line.text,
  }));
  const ocrText = ocrResult.text || ocrLines.map((line) => line.text).join('\n');

  return {
    ...page,
    ocrText,
    ocrLines,
    preferredTextSource: 'ocr',
    text: ocrText,
    lines: ocrLines,
  };
}

export function setPagePreferredSource(page: DocumentPage, source: DocumentPageSource): DocumentPage {
  if (source === 'ocr' && page.ocrText) {
    return {
      ...page,
      preferredTextSource: 'ocr',
      text: page.ocrText,
      lines: page.ocrLines,
    };
  }

  return {
    ...page,
    preferredTextSource: 'native',
    text: page.nativeText ?? page.text,
    lines: page.nativeLines ?? page.lines,
  };
}

export function mergeOcrResultsIntoDocument(
  document: DocumentParseResult,
  ocrResults: OcrPageResult[],
): DocumentParseResult {
  if (!document.pages?.length || ocrResults.length === 0) {
    return document;
  }

  const ocrByPage = new Map(ocrResults.map((result) => [result.pageNumber, result]));
  const pages = document.pages.map((page) => {
    const ocrResult = ocrByPage.get(page.pageNumber);
    if (!ocrResult) {
      return setPagePreferredSource(page, page.preferredTextSource ?? 'native');
    }
    return applyOcrResultToPage(page, ocrResult);
  });

  return rebuildDocumentParseResult(document, pages);
}

export function rebuildDocumentParseResult(
  document: DocumentParseResult,
  pages: DocumentPage[],
): DocumentParseResult {
  const fullText = pages.map((page) => page.text).join('\n\n').trim();
  const warnings = [...document.warnings];
  const pdfDiagnostics = document.pdfDiagnostics
    ? {
        ...document.pdfDiagnostics,
        ocrCandidatePageNumbers: pages
          .filter((page) => page.textQuality && page.preferredTextSource !== 'ocr' &&
            (page.textQuality.level === 'empty' || page.textQuality.level === 'weak'))
          .map((page) => page.pageNumber),
      }
    : undefined;

  return {
    ...document,
    pages,
    fullText,
    warnings,
    pdfDiagnostics,
  };
}

export function ocrLinesToDocumentLines(lines: OcrLine[]): DocumentLine[] {
  return lines.map((line) => ({ lineNumber: line.lineNumber, text: line.text }));
}
