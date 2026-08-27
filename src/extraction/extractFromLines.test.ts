import { describe, expect, it } from 'vitest';
import { extractFromLineBatch, extractFromStructuredLine } from './extractFromLines';

const HARSLE_LINES = [
  '1. Max. Bending Length mm 2000',
  '6. Bending Angle ° ± 180',
  '13. Max. Feeding Speed m/min 120',
  '16. Motor Power kw 61',
  '17. Average Working Power kw 3.1',
  '21. Weight kg 14000',
  '14. Feeding Structure / Pressing Arm',
];

describe('extractFromLines', () => {
  it('extracts structured pdf lines', () => {
    const result = extractFromLineBatch(HARSLE_LINES.map((text, index) => ({ text, lineNumber: index + 1 })));
    expect(result.find((item) => item.sourceLabel === 'Motor Power')?.rawValue).toBe('61');
    expect(result.find((item) => item.sourceLabel === 'Max. Feeding Speed')?.rawUnit).toBe('m/min');
  });

  it('extracts bending angle with unit symbol', () => {
    const result = extractFromStructuredLine('6. Bending Angle ° ± 180', 15, 11);
    expect(result.candidate?.rawValue).toBe('± 180');
    expect(result.candidate?.rawUnit).toBe('°');
  });

  it('extracts text values with slash delimiter', () => {
    const result = extractFromStructuredLine('14. Feeding Structure / Pressing Arm', 15, 19);
    expect(result.candidate?.sourceLabel).toBe('Feeding Structure');
    expect(result.candidate?.rawValue).toBe('Pressing Arm');
  });

  it('does not treat m/min as slash delimiter', () => {
    const result = extractFromStructuredLine('13. Max. Feeding Speed m/min 120', 15, 18);
    expect(result.candidate?.sourceLabel).toBe('Max. Feeding Speed');
    expect(result.candidate?.rawUnit).toBe('m/min');
  });

  it('rejects prose lines', () => {
    const result = extractFromStructuredLine(
      'HARSLE offers systems ranging from 15 to 64 axes, ensuring 0',
      8,
      2,
    );
    expect(result.candidate).toBeNull();
  });

  it('applies group prefix for short child labels', () => {
    const lines = [
      '7. SS mm 1',
      '8. Bending Thickness MS mm 1.5',
      '9. AL mm 2.5',
    ];
    const result = extractFromLineBatch(lines.map((text, index) => ({ text, lineNumber: index + 1 })));
    expect(result.find((item) => item.sourceLabel.includes('SS'))?.sourceLabel).toContain('Bending Thickness');
  });
});

describe('duplicate behavior', () => {
  it('keeps same label with different values', () => {
    const result = extractFromLineBatch([
      { text: '16. Motor Power kw 61', lineNumber: 1 },
      { text: '16. Motor Power kw 75', lineNumber: 2 },
    ]);
    expect(result).toHaveLength(2);
  });
});
