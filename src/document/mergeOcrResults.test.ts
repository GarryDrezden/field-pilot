import { describe, expect, it } from 'vitest';
import type { DocumentParseResult } from '../shared/types/document';
import { extractCharacteristics, resetCharacteristicIdCounter } from '../extraction/extractCharacteristics';
import { mergeOcrResultsIntoDocument } from './mergeOcrResults';

const baseDocument: DocumentParseResult = {
  type: 'pdf',
  fileName: 'hybrid.pdf',
  fullText: 'native page\n\n',
  pages: [
    {
      pageNumber: 1,
      text: 'native page',
      lines: [{ lineNumber: 1, text: 'native page' }],
      nativeText: 'native page',
      nativeLines: [{ lineNumber: 1, text: 'native page' }],
      preferredTextSource: 'native',
      textQuality: {
        pageNumber: 1,
        textItemCount: 3,
        nonWhitespaceCharacters: 20,
        reconstructedLineCount: 1,
        level: 'good',
        reasons: [],
      },
    },
    {
      pageNumber: 2,
      text: '',
      lines: [],
      nativeText: '',
      nativeLines: [],
      preferredTextSource: 'native',
      textQuality: {
        pageNumber: 2,
        textItemCount: 0,
        nonWhitespaceCharacters: 0,
        reconstructedLineCount: 0,
        level: 'empty',
        reasons: ['empty'],
      },
    },
  ],
  warnings: [],
  pdfDiagnostics: {
    totalPages: 2,
    goodTextPages: 1,
    weakTextPages: 0,
    emptyTextPages: 1,
    ocrCandidatePageNumbers: [2],
  },
};

describe('mergeOcrResultsIntoDocument', () => {
  it('prefers native on good pages and OCR on OCR pages', () => {
    resetCharacteristicIdCounter();
    const merged = mergeOcrResultsIntoDocument(baseDocument, [
      {
        pageNumber: 2,
        text: 'Motor Power kW 61',
        lines: [{ lineNumber: 1, text: 'Motor Power kW 61' }],
        language: 'rus+eng',
        warnings: [],
      },
    ]);

    expect(merged.pages?.[0]?.preferredTextSource).toBe('native');
    expect(merged.pages?.[1]?.preferredTextSource).toBe('ocr');
    expect(merged.pages?.[1]?.text).toContain('Motor Power');

    const extraction = extractCharacteristics(merged);
    const ocrCharacteristic = extraction.characteristics.find((item) => item.sourceLabel.includes('Motor Power'));
    expect(ocrCharacteristic?.source.origin).toBe('ocr');
    expect(ocrCharacteristic?.source.pageNumber).toBe(2);
  });
});
