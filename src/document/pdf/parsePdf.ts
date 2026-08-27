import * as pdfjsLib from 'pdfjs-dist';
import type { DocumentParseResult } from '../../shared/types/document';

export async function parsePdfFile(file: File): Promise<DocumentParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const warnings: string[] = [];

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pages: DocumentParseResult['pages'] = [];
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({ pageNumber, text });
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
