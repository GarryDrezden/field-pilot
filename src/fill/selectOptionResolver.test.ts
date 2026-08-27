import { describe, expect, it } from 'vitest';
import { resolveSelectOption } from './selectOptionResolver';

describe('resolveSelectOption', () => {
  const options = [
    { value: '142', text: 'HARSLE' },
    { value: '200', text: 'INVT' },
    { value: '201', text: 'INVT' },
  ];

  it('matches exact option value', () => {
    expect(resolveSelectOption(options, '142')).toEqual({
      status: 'found',
      optionValue: '142',
      optionText: 'HARSLE',
    });
  });

  it('matches exact option text uniquely', () => {
    expect(resolveSelectOption(options, 'HARSLE')).toEqual({
      status: 'found',
      optionValue: '142',
      optionText: 'HARSLE',
    });
  });

  it('returns not-found when option missing', () => {
    expect(resolveSelectOption(options, 'NSK')).toEqual({ status: 'not-found' });
  });

  it('returns ambiguous for duplicate normalized texts', () => {
    expect(resolveSelectOption(options, 'INVT')).toEqual({ status: 'ambiguous' });
  });
});
