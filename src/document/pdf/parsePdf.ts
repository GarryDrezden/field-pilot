import * as pdfjsLib from 'pdfjs-dist';
import type { DocumentParseResult } from '../../shared/types/document';
import { pageTextFromLines, reconstructPdfLines } from './reconstructPdfLines';
import { ensurePdfWorkerConfigured } from './setupPdfjs';

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
  const pages: NonNullable<DocumentParseResult['pages']> = [];
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.filter((item) => 'str' in item);
    const lines = reconstructPdfLines(textItems);
    const text = pageTextFromLines(lines);

    pages.push({ pageNumber, text, lines });
    pageTexts.push(text);
  }

  const fullText = pageTexts.join('\n\n').trim();

  if (!fullText) {
    warnings.push(
      'В документе не удалось извлечь текст. Поддержка сканов появится позже.',
    );
  }

  return {
    type: 'pdf',
    fileName: file.name,
    fullText,
    pages,
    warnings,
  };
}
