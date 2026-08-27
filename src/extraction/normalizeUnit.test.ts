import { describe, expect, it } from 'vitest';
import { findUnitInText, normalizeUnit } from './normalizeUnit';

describe('normalizeUnit', () => {
  it('normalizes ru/en units', () => {
    expect(normalizeUnit('kw')).toBe('kW');
    expect(normalizeUnit('кВт')).toBe('kW');
    expect(normalizeUnit('mm')).toBe('mm');
    expect(normalizeUnit('kg')).toBe('kg');
    expect(normalizeUnit('°')).toBe('°');
  });

  it('matches longest unit first', () => {
    expect(findUnitInText('Max. Feeding Speed m/min 120')?.normalizedUnit).toBe('m/min');
    expect(findUnitInText('Length m 5150')?.normalizedUnit).toBe('m');
  });

  it('finds m/min before numeric value', () => {
    const match = findUnitInText('Max. Feeding Speed m/min 120');
    expect(match?.normalizedUnit).toBe('m/min');
    expect(match?.afterUnit).toBe('120');
  });
});
