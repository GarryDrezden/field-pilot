import { describe, expect, it } from 'vitest';
import { inferPropertyUnit } from './inferPropertyUnit';
import type { ProfileProperty } from '../profile/profileTypes';

function property(name: string, unit = ''): ProfileProperty {
  return { id: 'p1', name, externalId: 'PARAM1', aliases: [], unit };
}

describe('inferPropertyUnit', () => {
  it('uses explicit property.unit first', () => {
    expect(inferPropertyUnit(property('Скорость подачи', 'm/min'))).toBe('m/min');
  });

  it('infers unit from Mosklad-style comma suffix in name', () => {
    expect(inferPropertyUnit(property('Скорость подачи, м/мин'))).toBe('m/min');
    expect(inferPropertyUnit(property('Мощность двигателя, кВт'))).toBe('kW');
    expect(inferPropertyUnit(property('Вес, кг'))).toBe('kg');
  });
});
