import { describe, expect, it } from 'vitest';
import type { ExtractedCharacteristic } from '../extraction/types';
import type { ProfileProperty } from '../profile/profileTypes';
import { matchDocumentToProfile } from './matchDocumentToProfile';

function characteristic(
  id: string,
  sourceLabel: string,
  rawValue: string,
  unit?: string,
  valueKind: ExtractedCharacteristic['valueKind'] = 'number',
): ExtractedCharacteristic {
  return {
    id,
    sourceLabel,
    rawValue,
    normalizedValue: rawValue,
    rawUnit: unit,
    normalizedUnit: unit,
    valueKind,
    extractionMethod: 'structured-line',
    source: { text: `${sourceLabel} ${rawValue}${unit ? ` ${unit}` : ''}` },
  };
}

function property(
  id: string,
  name: string,
  externalId?: string,
  aliases: string[] = [],
  unit?: string,
): ProfileProperty {
  return { id, name, externalId, aliases, unit: unit ?? '' };
}

const harsleProfile: ProfileProperty[] = [
  property('p10', 'Мощность двигателя, кВт', 'PARAM10', ['Motor Power']),
  property('p14', 'Вес, кг', 'PARAM14', ['Weight']),
  property('p20', 'Угол гибки, °', 'PARAM20'),
  property('p21', 'Скорость подачи, м/мин', 'PARAM21'),
  property('p22', 'Толщина нержавеющей стали, мм', 'PARAM22'),
  property('p23', 'Толщина металла (алюминий), мм', 'PARAM23'),
  property('p30', 'Потребляемая мощность, кВт', 'PARAM30'),
  property('p31', 'Длина, мм', 'PARAM31'),
  property('p32', 'Ширина, мм', 'PARAM32'),
  property('p33', 'Высота, мм', 'PARAM33'),
  property('p40', 'Максимальная длина, мм', 'PARAM40'),
  property('p41', 'Минимальная длина, мм', 'PARAM41'),
  property('p50', 'Максимальная скорость гибки, s/bending', 'PARAM50'),
];

describe('matchDocumentToProfile', () => {
  it('matches Motor Power to engine power as HIGH', () => {
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Motor Power', '61', 'kW')],
      harsleProfile,
    );
    expect(result.matches[0]?.level).toBe('high');
    expect(result.matches[0]?.propertyId).toBe('p10');
  });

  it('matches Weight to mass property as HIGH', () => {
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Weight', '14000', 'kg')],
      harsleProfile,
    );
    expect(result.matches[0]?.level).toBe('high');
    expect(result.matches[0]?.propertyId).toBe('p14');
  });

  it('matches Bending Angle as HIGH', () => {
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Bending Angle', '± 180', '°')],
      harsleProfile,
    );
    expect(result.matches[0]?.level).toBe('high');
    expect(result.matches[0]?.propertyId).toBe('p20');
  });

  it('does not auto-match Average Working Power as HIGH to consumption power', () => {
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Average Working Power', '3.1', 'kW')],
      harsleProfile,
    );
    expect(result.matches[0]?.level).toBe('review');
    expect(result.matches[0]?.propertyId).toBe('p30');
  });

  it('rejects max length vs min length', () => {
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Max. Bending Length', '2000', 'mm')],
      harsleProfile,
    );
    expect(result.matches[0]?.propertyId).not.toBe('p41');
  });

  it('rejects width vs height confusion', () => {
    const width = matchDocumentToProfile(
      [characteristic('c1', 'Dimension Width', '3200', 'mm')],
      harsleProfile,
    );
    const height = matchDocumentToProfile(
      [characteristic('c2', 'Dimension Height', '2300', 'mm')],
      harsleProfile,
    );
    expect(width.matches[0]?.propertyId).toBe('p32');
    expect(height.matches[0]?.propertyId).toBe('p33');
    expect(width.matches[0]?.propertyId).not.toBe('p33');
  });

  it('handles duplicate property names as ambiguous review', () => {
    const duplicates = [
      property('a', 'Резка квадратного профиля под 30°, мм', 'PARAM2226'),
      property('b', 'Резка квадратного профиля под 30°, мм', 'PARAM2248'),
    ];
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Резка квадратного профиля под 30°, мм', '10', 'mm')],
      duplicates,
    );
    expect(result.matches[0]?.level).toBe('review');
    expect(result.matches[0]?.alternatives).toHaveLength(2);
  });

  it('demotes close second candidate to review', () => {
    const profile = [
      property('a', 'Motor Power Custom A, kW', 'A'),
      property('b', 'Motor Power Custom B, kW', 'B'),
    ];
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Motor Power Custom A', '10', 'kW')],
      profile,
    );
    expect(result.matches[0]?.level).toBe('review');
  });

  it('rejects mm property for kg characteristic', () => {
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Motor Power', '61', 'kW')],
      [property('p1', 'Длина, мм', 'LEN')],
    );
    expect(result.matches[0]?.level).toBe('reject');
  });

  it('matches Max Feeding Speed to feed speed property', () => {
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Max. Feeding Speed', '120', 'm/min')],
      harsleProfile,
    );
    expect(result.matches[0]?.propertyId).toBe('p21');
    expect(['high', 'review']).toContain(result.matches[0]?.level);
  });
});
