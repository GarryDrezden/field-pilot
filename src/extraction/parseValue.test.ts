import { describe, expect, it } from 'vitest';
import { parseCharacteristicValue } from './parseValue';

describe('parseCharacteristicValue', () => {
  it('parses integer values', () => {
    expect(parseCharacteristicValue('14000')?.normalizedValue).toBe('14000');
  });

  it('parses decimal dot', () => {
    expect(parseCharacteristicValue('3.1')?.normalizedValue).toBe('3.1');
  });

  it('parses decimal comma', () => {
    expect(parseCharacteristicValue('3,1')?.normalizedValue).toBe('3.1');
  });

  it('parses signed values', () => {
    expect(parseCharacteristicValue('-10')?.normalizedValue).toBe('-10');
    expect(parseCharacteristicValue('+10')?.normalizedValue).toBe('+10');
  });

  it('parses plus-minus values', () => {
    expect(parseCharacteristicValue('± 180')?.normalizedValue).toBe('±180');
  });

  it('parses ranges', () => {
    expect(parseCharacteristicValue('4 – 170')?.valueKind).toBe('range');
    expect(parseCharacteristicValue('4 to 170')?.normalizedValue).toBe('4–170');
  });

  it('parses dimensions', () => {
    expect(parseCharacteristicValue('140*260')?.valueKind).toBe('dimension');
    expect(parseCharacteristicValue('140 x 260')?.normalizedValue).toBe('140×260');
  });
});
