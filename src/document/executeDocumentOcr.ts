import { mergeOcrResultsIntoDocument } from './mergeOcrResults';
import { renderPdfPageForOcr } from '../ocr/renderPdfPageForOcr';
import { runOcrJob } from '../ocr/runOcrJob';
import type { OcrEngine, OcrLanguagePreset } from '../ocr/types';
import type { DocumentParseResult } from '../shared/types/document';
import type { DocumentSessionPdfDiagnostics } from '../session/types';

export function toSessionPdfDiagnostics(
  diagnostics: DocumentParseResult['pdfDiagnostics'],
  ocrAppliedPageNumbers: number[] = [],
): DocumentSessionPdfDiagnostics | undefined {
  if (!diagnostics) {
    return undefined;
  }

  const applied = new Set(ocrAppliedPageNumbers);
  return {
    totalPages: diagnostics.totalPages,
    goodTextPages: diagnostics.goodTextPages,
    weakTextPages: diagnostics.weakTextPages,
    emptyTextPages: diagnostics.emptyTextPages,
    ocrCandidatePageNumbers: diagnostics.ocrCandidatePageNumbers.filter(
      (pageNumber) => !applied.has(pageNumber),
    ),
    ocrAppliedPageNumbers: ocrAppliedPageNumbers.length > 0 ? ocrAppliedPageNumbers : undefined,
  };
}

export interface ExecuteDocumentOcrOptions {
  parseResult: DocumentParseResult;
  pdfArrayBuffer: ArrayBuffer;
  pageNumbers: number[];
  language: OcrLanguagePreset;
  documentIdentity: string;
  currentDocumentIdentity: () => string;
  createEngine: () => Promise<OcrEngine>;
  renderPage?: (pageNumber: number) => Promise<HTMLCanvasElement>;
  signal?: AbortSignal;
  onProgress?: (progress: {
    pageNumber: number;
    pageIndex: number;
    totalPages: number;
    status: string;
    progress: number;
  }) => void;
}

export interface ExecuteDocumentOcrResult {
  parseResult: DocumentParseResult;
  pdfDiagnostics?: DocumentSessionPdfDiagnostics;
  ocrAppliedPageNumbers: number[];
}

export async function executeDocumentOcr(
  options: ExecuteDocumentOcrOptions,
): Promise<ExecuteDocumentOcrResult> {
  const engine = await options.createEngine();
  const job = await runOcrJob({
    pageNumbers: options.pageNumbers,
    language: options.language,
    engine,
    signal: options.signal,
    onProgress: options.onProgress,
    renderPage:
      options.renderPage ??
      (async (pageNumber) => {
        const rendered = await renderPdfPageForOcr(options.pdfArrayBuffer, pageNumber);
        return rendered.canvas;
      }),
  });

  if (options.currentDocumentIdentity() !== options.documentIdentity) {
    throw new Error('STALE_OCR_DOCUMENT');
  }

  const merged = mergeOcrResultsIntoDocument(options.parseResult, job.results);
  const previousApplied =
    options.parseResult.pages
      ?.filter((page) => page.preferredTextSource === 'ocr')
      .map((page) => page.pageNumber) ?? [];
  const ocrAppliedPageNumbers = Array.from(
    new Set([...previousApplied, ...options.pageNumbers]),
  ).sort((left, right) => left - right);

  return {
    parseResult: merged,
    pdfDiagnostics: toSessionPdfDiagnostics(merged.pdfDiagnostics, ocrAppliedPageNumbers),
    ocrAppliedPageNumbers,
  };
}
