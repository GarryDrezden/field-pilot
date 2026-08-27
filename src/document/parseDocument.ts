import type { DocumentParseResult } from '../shared/types/document';
import { detectDocumentFormat } from '../shared/utils';
import { parseDocxFile } from './docx/parseDocx';
import { parsePdfFile } from './pdf/parsePdf';

export async function parseDocumentFile(file: File): Promise<DocumentParseResult> {
  const format = detectDocumentFormat(file);
  if (!format) {
    throw new Error('Поддерживаются только PDF и DOCX.');
  }

  if (format === 'pdf') {
    return parsePdfFile(file);
  }

  return parseDocxFile(file);
}

export { parsePdfFile } from './pdf/parsePdf';
export { parseDocxFile } from './docx/parseDocx';
