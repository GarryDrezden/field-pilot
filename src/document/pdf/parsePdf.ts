import * as pdfjsLib from 'pdfjs-dist';
import type { DocumentLine, DocumentPage, DocumentParseResult } from '../../shared/types/document';
import { analyzePageTextQuality, buildPdfDiagnostics } from './analyzePageTextQuality';
import { pageTextFromLines, reconstructPdfLines } from './reconstructPdfLines';
import { ensurePdfWorkerConfigured } from './setupPdfjs';

function toDocumentLines(lines: ReturnType<typeof reconstructPdfLines>): DocumentLine[] {
  return lines.map((line) => ({ lineNumber: line.lineNumber, text: line.text }));
}

function buildPageFromNative(
  pageNumber: number,
  textItems: Array<{ str?: string; transform?: number[]; width?: number; height?: number }>,
  pageWidth: number,
): DocumentPage {
  const lines = reconstructPdfLines(textItems, { pageWidth });
  const nativeText = pageTextFromLines(lines);
  const nativeLines = toDocumentLines(lines);
  const textQuality = analyzePageTextQuality(pageNumber, textItems, lines);

  return {
    pageNumber,
    text: nativeText,
    lines: nativeLines,
    nativeText,
    nativeLines,
    preferredTextSource: 'native',
    textQuality,
  };
}

export async function parsePdfFile(file: File): Promise<DocumentParseResult> {
  ensurePdfWorkerConfigured();

  const arrayBuffer = await file.arrayBuffer();
  const warnings: string[] = [];

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pages: DocumentPage[] = [];
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const textItems = textContent.items.filter((item) => 'str' in item);
    const documentPage = buildPageFromNative(pageNumber, textItems, viewport.width);
    pages.push(documentPage);
    pageTexts.push(documentPage.text);
  }

  const fullText = pageTexts.join('\n\n').trim();
  const pdfDiagnostics = buildPdfDiagnostics(pages);

  if (!fullText) {
    warnings.push(
      'В PDF не найден текстовый слой. Документ, вероятно, является сканом — используйте локальное OCR.',
    );
  } else if (pdfDiagnostics.ocrCandidatePageNumbers.length > 0) {
    warnings.push(
      `На ${pdfDiagnostics.ocrCandidatePageNumbers.length} стр. текстовый слой слабый или отсутствует — при необходимости запустите OCR.`,
    );
  }

  return {
    type: 'pdf',
    fileName: file.name,
    fullText,
    pages,
    warnings,
    pdfDiagnostics,
  };
}

export async function parsePdfFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<DocumentParseResult> {
  const file = new File([arrayBuffer], fileName, { type: 'application/pdf' });
  return parsePdfFile(file);
}
