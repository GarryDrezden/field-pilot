import { describe, expect, it } from 'vitest';
import { executeDocumentOcr } from './executeDocumentOcr';
import type { DocumentParseResult } from '../shared/types/document';
import { createFakeOcrEngineWithPages } from '../ocr/fakeOcrEngine';

const parseResult: DocumentParseResult = {
  type: 'pdf',
  fileName: 'scan.pdf',
  fullText: '',
  pages: [
    {
      pageNumber: 1,
      text: '',
      lines: [],
      nativeText: '',
      nativeLines: [],
      preferredTextSource: 'native',
      textQuality: {
        pageNumber: 1,
        textItemCount: 0,
        nonWhitespaceCharacters: 0,
        reconstructedLineCount: 0,
        level: 'empty',
        reasons: [],
      },
    },
  ],
  warnings: [],
  pdfDiagnostics: {
    totalPages: 1,
    goodTextPages: 0,
    weakTextPages: 0,
    emptyTextPages: 1,
    ocrCandidatePageNumbers: [1],
  },
};

describe('executeDocumentOcr stale guard', () => {
  it('discards result when document identity changed', async () => {
    let currentIdentity = 'doc-a';
    await expect(
      executeDocumentOcr({
        parseResult,
        pdfArrayBuffer: new ArrayBuffer(8),
        pageNumbers: [1],
        language: 'eng',
        documentIdentity: 'doc-a',
        currentDocumentIdentity: () => currentIdentity,
        createEngine: async () => {
          const engine = createFakeOcrEngineWithPages({
            1: 'Motor Power kW 61',
          });
          const recognizePage = engine.recognizePage.bind(engine);
          engine.recognizePage = async (image, options) => {
            currentIdentity = 'doc-b';
            return recognizePage(image, options);
          };
          return engine;
        },
        renderPage: async () => document.createElement('canvas'),
      }),
    ).rejects.toThrow('STALE_OCR_DOCUMENT');
  });
});
