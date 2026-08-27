import { describe, expect, it } from 'vitest';
import { extractCharacteristics, resetCharacteristicIdCounter } from './extractCharacteristics';
import type { DocumentParseResult } from '../shared/types/document';

const HARSLE_PAGE_LINES = [
  'TECHNICAL PARAMETERS',
  'N o. Item Unit PB-2000',
  '1. Max. Bending Length mm 2000',
  '2. Max. Bending Width mm 1250',
  '6. Bending Angle ° ± 180',
  '7. SS mm 1',
  '8. Bending Thickness MS mm 1.5',
  '13. Max. Feeding Speed m/min 120',
  '14. Feeding Structure / Pressing Arm',
  '16. Motor Power kw 61',
  '21. Weight kg 14000',
  '1. System Control Unit ● HARSLE',
];

describe('extractCharacteristics', () => {
  it('extracts from pdf lines and tables', () => {
    resetCharacteristicIdCounter();
    const document: DocumentParseResult = {
      type: 'pdf',
      fileName: 'harsle.pdf',
      fullText: HARSLE_PAGE_LINES.join('\n'),
      pages: [
        {
          pageNumber: 15,
          text: HARSLE_PAGE_LINES.join('\n'),
          lines: HARSLE_PAGE_LINES.map((text, index) => ({ lineNumber: index + 1, text })),
        },
      ],
      tables: [
        {
          index: 0,
          rows: [
            ['No.', 'Item', 'Unit', 'PB-2000'],
            ['16', 'Motor Power', 'kw', '61'],
          ],
        },
      ],
      warnings: [],
    };

    const result = extractCharacteristics(document);
    expect(result.characteristics.some((item) => item.sourceLabel.includes('Motor Power'))).toBe(true);
    expect(result.characteristics.some((item) => item.sourceLabel === 'Feeding Structure')).toBe(true);
    expect(result.stats.total).toBeGreaterThan(5);
  });

  it('deduplicates exact structural repeats', () => {
    resetCharacteristicIdCounter();
    const document: DocumentParseResult = {
      type: 'pdf',
      fileName: 'dup.pdf',
      fullText: '16. Motor Power kw 61\n16. Motor Power kw 61',
      pages: [
        {
          pageNumber: 1,
          text: '16. Motor Power kw 61\n16. Motor Power kw 61',
          lines: [
            { lineNumber: 1, text: '16. Motor Power kw 61' },
            { lineNumber: 2, text: '16. Motor Power kw 61' },
          ],
        },
      ],
      warnings: [],
    };

    const result = extractCharacteristics(document);
    expect(result.characteristics.filter((item) => item.sourceLabel === 'Motor Power')).toHaveLength(1);
  });

  it('stores source metadata', () => {
    resetCharacteristicIdCounter();
    const result = extractCharacteristics({
      type: 'pdf',
      fileName: 'meta.pdf',
      fullText: '16. Motor Power kw 61',
      pages: [
        {
          pageNumber: 15,
          text: '16. Motor Power kw 61',
          lines: [{ lineNumber: 16, text: '16. Motor Power kw 61' }],
        },
      ],
      warnings: [],
    });

    expect(result.characteristics[0]?.source.pageNumber).toBe(15);
    expect(result.characteristics[0]?.source.text).toContain('Motor Power');
  });
});
