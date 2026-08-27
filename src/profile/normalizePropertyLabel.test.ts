import { describe, expect, it } from 'vitest';
import { normalizePropertyLabel, isNormalizedDuplicate } from './normalizePropertyLabel';

describe('normalizePropertyLabel', () => {
  it('normalizes whitespace, case and trailing colon', () => {
    expect(normalizePropertyLabel('Вес, кг:')).toBe(normalizePropertyLabel('  вес,   кг '));
    expect(normalizePropertyLabel('ВЕС, КГ')).toBe(normalizePropertyLabel('вес, кг'));
  });

  it('does not collapse different meanings', () => {
    expect(isNormalizedDuplicate('Мощность двигателя', 'Потребляемая мощность')).toBe(false);
  });
});
