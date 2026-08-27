import { describe, expect, it } from 'vitest';
import { reconstructPdfLines } from './reconstructPdfLines';

describe('reconstructPdfLines', () => {
  it('groups items by y coordinate and sorts by x', () => {
    const lines = reconstructPdfLines([
      { str: '2000', transform: [1, 0, 0, 1, 300, 100] },
      { str: 'mm', transform: [1, 0, 0, 1, 260, 100] },
      { str: 'Max. Bending Length', transform: [1, 0, 0, 1, 80, 100] },
      { str: '1.', transform: [1, 0, 0, 1, 40, 100] },
    ]);

    expect(lines[0]?.text).toBe('1. Max. Bending Length mm 2000');
  });
});
