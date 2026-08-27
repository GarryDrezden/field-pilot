import { describe, expect, it } from 'vitest';
import { isEmptyFieldValue, valuesAreEqual } from './isEmptyFieldValue';

describe('isEmptyFieldValue', () => {
  it('treats empty and whitespace as empty', () => {
    expect(isEmptyFieldValue('')).toBe(true);
    expect(isEmptyFieldValue('   ')).toBe(true);
    expect(isEmptyFieldValue(undefined)).toBe(true);
  });

  it('does not treat zero as empty', () => {
    expect(isEmptyFieldValue('0')).toBe(false);
    expect(isEmptyFieldValue('0.0')).toBe(false);
  });

  it('detects equal trimmed values', () => {
    expect(valuesAreEqual('61', '61')).toBe(true);
    expect(valuesAreEqual(' 61 ', '61')).toBe(true);
    expect(valuesAreEqual('61', '62')).toBe(false);
  });
});
