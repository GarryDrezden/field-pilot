import mammoth from 'mammoth';
import type { DocumentParseResult, DocumentTable } from '../../shared/types/document';
import { normalizeWhitespace } from '../../shared/utils';

export async function parseDocxFile(file: File): Promise<DocumentParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const warnings: string[] = [];

  const [rawTextResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer }),
  ]);

  rawTextResult.messages.forEach((message) => {
    warnings.push(message.message);
  });
  htmlResult.messages.forEach((message) => {
    warnings.push(message.message);
  });

  const fullText = normalizeWhitespace(rawTextResult.value);
  const tables = extractTablesFromHtml(htmlResult.value);

  if (!fullText) {
    warnings.push('В документе не удалось извлечь текст.');
  }

  return {
    type: 'docx',
    fileName: file.name,
    fullText,
    tables,
    warnings,
  };
}

function extractTablesFromHtml(html: string): DocumentTable[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tableElements = Array.from(doc.querySelectorAll('table'));

  return tableElements.map((table, index) => {
    const rows = Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('th, td')).map((cell) =>
        normalizeWhitespace(cell.textContent ?? ''),
      ),
    );

    return {
      index,
      rows,
    };
  });
}
