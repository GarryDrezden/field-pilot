import { describe, expect, it } from 'vitest';
import type { FormField } from '../shared/types/form';
import { isFillSupportedField, isSimpleFiniteNumber, isValueCompatibleWithField } from './validateFillOperation';

function field(partial: Partial<FormField> & Pick<FormField, 'elementType'>): FormField {
  return {
    id: 'f1',
    label: 'Test',
    disabled: false,
    readonly: false,
    ...partial,
  };
}

describe('validateFillOperation', () => {
  it('rejects forbidden input types', () => {
    expect(isFillSupportedField(field({ elementType: 'input', inputType: 'password' }))).toBe(false);
    expect(isFillSupportedField(field({ elementType: 'input', inputType: 'text' }))).toBe(true);
  });

  it('accepts simple numbers only for number inputs', () => {
    const numberField = field({ elementType: 'input', inputType: 'number' });
    expect(isValueCompatibleWithField(numberField, '61')).toBe(true);
    expect(isValueCompatibleWithField(numberField, '3.1')).toBe(true);
    expect(isValueCompatibleWithField(numberField, '-5')).toBe(true);
    expect(isValueCompatibleWithField(numberField, '±180')).toBe(false);
    expect(isValueCompatibleWithField(numberField, '4–170')).toBe(false);
    expect(isValueCompatibleWithField(numberField, 'HARSLE')).toBe(false);
  });

  it('accepts text-like values in textarea', () => {
    expect(isValueCompatibleWithField(field({ elementType: 'textarea' }), 'HARSLE')).toBe(true);
  });

  it('validates simple finite numbers', () => {
    expect(isSimpleFiniteNumber('61')).toBe(true);
    expect(isSimpleFiniteNumber('3,1')).toBe(true);
    expect(isSimpleFiniteNumber('±180')).toBe(false);
  });
});
