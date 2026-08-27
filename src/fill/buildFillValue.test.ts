import { describe, expect, it } from 'vitest';
import type { ExtractedCharacteristic } from '../extraction/types';
import { buildFillDisplayValue, buildFillValue } from './buildFillValue';

function characteristic(
  partial: Partial<ExtractedCharacteristic> & Pick<ExtractedCharacteristic, 'valueKind' | 'rawValue'>,
): ExtractedCharacteristic {
  return {
    id: 'c1',
    sourceLabel: 'Test',
    normalizedValue: partial.rawValue,
    extractionMethod: 'structured-line',
    source: { text: 'Test' },
    ...partial,
  };
}

describe('buildFillValue', () => {
  it('uses normalized numeric values without unit suffix', () => {
    expect(
      buildFillValue(
        characteristic({
          valueKind: 'number',
          rawValue: '61',
          normalizedValue: '61',
          normalizedUnit: 'kW',
        }),
      ),
    ).toBe('61');
  });

  it('keeps text brand values from rawValue', () => {
    expect(
      buildFillValue(
        characteristic({
          valueKind: 'text',
          rawValue: 'HARSLE',
          normalizedValue: 'HARSLE',
        }),
      ),
    ).toBe('HARSLE');
  });

  it('keeps plus/minus and dimension values', () => {
    expect(
      buildFillValue(
        characteristic({
          valueKind: 'number',
          rawValue: '± 180',
          normalizedValue: '±180',
        }),
      ),
    ).toBe('±180');

    expect(
      buildFillValue(
        characteristic({
          valueKind: 'dimension',
          rawValue: '140×260',
          normalizedValue: '140×260',
        }),
      ),
    ).toBe('140×260');
  });

  it('builds display value with unit for preview only', () => {
    expect(
      buildFillDisplayValue(
        characteristic({
          valueKind: 'number',
          rawValue: '61',
          normalizedValue: '61',
          normalizedUnit: 'kW',
        }),
      ),
    ).toBe('61 kW');
  });
});
