import { describe, expect, it } from 'vitest';
import { extractFromTableRows } from './extractFromTables';

const HARSLE_TABLE = [
  ['No.', 'Item', 'Unit', 'PB-2000'],
  ['1', 'Max. Bending Length', 'mm', '2000'],
  ['16', 'Motor Power', 'kw', '61'],
  ['17', 'Average Working Power', 'kw', '3.1'],
  ['21', 'Weight', 'kg', '14000'],
];

describe('extractFromTables', () => {
  it('skips header rows', () => {
    const result = extractFromTableRows(HARSLE_TABLE, 0);
    expect(result.some((item) => item.sourceLabel === 'No.')).toBe(false);
  });

  it('extracts label unit value rows', () => {
    const result = extractFromTableRows(HARSLE_TABLE, 0);
    expect(result.find((item) => item.sourceLabel === 'Motor Power')?.rawValue).toBe('61');
    expect(result.find((item) => item.sourceLabel === 'Motor Power')?.rawUnit).toBe('kw');
  });

  it('extracts two-column text rows', () => {
    const result = extractFromTableRows(
      [
        ['Feeding Structure', 'Pressing Arm'],
        ['System Control Unit', 'HARSLE'],
      ],
      1,
    );
    expect(result[0]?.sourceLabel).toBe('Feeding Structure');
    expect(result[0]?.rawValue).toBe('Pressing Arm');
  });
});
