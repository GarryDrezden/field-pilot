import { describe, expect, it } from 'vitest';
import { reconstructPdfLines } from './reconstructPdfLines';

describe('reconstructPdfLines', () => {
  it('groups items by y coordinate and sorts by x', () => {
    const lines = reconstructPdfLines([
      { str: '2000', transform: [1, 0, 0, 1, 300, 100], width: 20 },
      { str: 'mm', transform: [1, 0, 0, 1, 260, 100], width: 15 },
      { str: 'Max. Bending Length', transform: [1, 0, 0, 1, 80, 100], width: 120 },
      { str: '1.', transform: [1, 0, 0, 1, 40, 100], width: 10 },
    ]);

    expect(lines[0]?.text).toBe('1. Max. Bending Length mm 2000');
  });

  it('does not merge independent columns on the same baseline', () => {
    const lines = reconstructPdfLines(
      [
        { str: 'Motor Power', transform: [1, 0, 0, 1, 40, 200], width: 70 },
        { str: '61', transform: [1, 0, 0, 1, 120, 200], width: 15 },
        { str: 'kW', transform: [1, 0, 0, 1, 140, 200], width: 15 },
        { str: 'Weight', transform: [1, 0, 0, 1, 340, 200], width: 45 },
        { str: '14000', transform: [1, 0, 0, 1, 390, 200], width: 35 },
        { str: 'kg', transform: [1, 0, 0, 1, 430, 200], width: 15 },
      ],
      { pageWidth: 500 },
    );

    expect(lines).toHaveLength(2);
    expect(lines[0]?.text).toContain('Motor Power');
    expect(lines[0]?.text).not.toContain('Weight');
    expect(lines[1]?.text).toContain('Weight');
  });

  it('joins fragmented word spans without extra spaces', () => {
    const lines = reconstructPdfLines([
      { str: 'T', transform: [1, 0, 0, 1, 40, 100], width: 6 },
      { str: 'ooling', transform: [1, 0, 0, 1, 46, 100], width: 30 },
      { str: 'Motor', transform: [1, 0, 0, 1, 120, 100], width: 30 },
      { str: 'Power', transform: [1, 0, 0, 1, 160, 100], width: 35 },
    ]);

    expect(lines[0]?.text).toContain('Tooling');
    expect(lines[0]?.text).toContain('Motor Power');
  });
});
