import { describe, expect, it } from 'vitest';
import { analyzePageTextQuality, buildPdfDiagnostics, isOcrCandidate } from './analyzePageTextQuality';
import { reconstructPdfLines } from './reconstructPdfLines';

function technicalPageItems(): Array<{ str: string; transform: number[]; width: number }> {
  return Array.from({ length: 20 }, (_, index) => ({
    str: `Parameter ${index + 1} mm ${(index + 1) * 10}`,
    transform: [1, 0, 0, 1, 80, 500 - index * 20],
    width: 120,
  }));
}

describe('analyzePageTextQuality', () => {
  it('marks empty text page as empty', () => {
    const quality = analyzePageTextQuality(1, [], []);
    expect(quality.level).toBe('empty');
    expect(isOcrCandidate(quality)).toBe(true);
  });

  it('marks normal technical page as good', () => {
    const items = technicalPageItems();
    const lines = reconstructPdfLines(items, { pageWidth: 600 });
    const quality = analyzePageTextQuality(2, items, lines);
    expect(quality.level).toBe('good');
    expect(isOcrCandidate(quality)).toBe(false);
  });

  it('marks tiny text layer as weak', () => {
    const items = [
      { str: 'abc', transform: [1, 0, 0, 1, 80, 100] },
      { str: 'de', transform: [1, 0, 0, 1, 120, 100] },
    ];
    const lines = reconstructPdfLines(items);
    const quality = analyzePageTextQuality(3, items, lines);
    expect(quality.level).toBe('weak');
    expect(isOcrCandidate(quality)).toBe(true);
  });
});

describe('buildPdfDiagnostics hybrid document', () => {
  it('flags only weak/empty pages as OCR candidates', () => {
    const goodItems = technicalPageItems();
    const goodLines = reconstructPdfLines(goodItems, { pageWidth: 600 });
    const goodQuality = analyzePageTextQuality(1, goodItems, goodLines);
    const emptyQuality = analyzePageTextQuality(2, [], []);
    const goodItemsPage3 = technicalPageItems();
    const goodLinesPage3 = reconstructPdfLines(goodItemsPage3, { pageWidth: 600 });
    const goodQualityPage3 = analyzePageTextQuality(3, goodItemsPage3, goodLinesPage3);

    const diagnostics = buildPdfDiagnostics([
      { pageNumber: 1, textQuality: goodQuality },
      { pageNumber: 2, textQuality: emptyQuality },
      { pageNumber: 3, textQuality: goodQualityPage3 },
    ]);

    expect(diagnostics.goodTextPages).toBe(2);
    expect(diagnostics.ocrCandidatePageNumbers).toEqual([2]);
  });
});
