import { describe, expect, it } from 'vitest';
import type { ExtractedCharacteristic } from '../extraction/types';
import type { LearnedDocumentMapping, ProfileProperty } from '../profile/profileTypes';
import { matchDocumentToProfile } from '../matching/matchDocumentToProfile';
import { normalizeLearnedSourceLabel } from './learnedMappings';

function characteristic(
  id: string,
  sourceLabel: string,
  rawValue: string,
  unit?: string,
): ExtractedCharacteristic {
  return {
    id,
    sourceLabel,
    rawValue,
    normalizedValue: rawValue,
    rawUnit: unit,
    normalizedUnit: unit,
    valueKind: 'number',
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
  property('p10', 'Мощность двигателя, кВт', 'PARAM10', ['Motor Power'], 'kW'),
  property('p30', 'Потребляемая мощность, кВт', 'PARAM30', [], 'kW'),
];

function learnedRule(
  sourceLabel: string,
  propertyId: string,
  sourceUnit?: string,
): LearnedDocumentMapping {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: `learn-${sourceLabel}`,
    sourceLabel,
    normalizedSourceLabel: normalizeLearnedSourceLabel(sourceLabel),
    sourceUnit,
    propertyId,
    createdAt: now,
    updatedAt: now,
  };
}

describe('learned mapping matcher priority', () => {
  it('applies learned mapping over semantic candidate', () => {
    const learned = [learnedRule('Average Working Power', 'p30', 'kW')];
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Average Working Power', '75', 'kW')],
      harsleProfile,
      learned,
    );
    expect(result.matches[0]?.level).toBe('high');
    expect(result.matches[0]?.propertyId).toBe('p30');
    expect(result.matches[0]?.learnedMatch).toBe(true);
    expect(result.matches[0]?.reasons.some((reason) => reason.code === 'user-learned')).toBe(true);
  });

  it('learned mapping wins over alias match to different property', () => {
    const learned = [learnedRule('Motor Power', 'p30', 'kW')];
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Motor Power', '61', 'kW')],
      harsleProfile,
      learned,
    );
    expect(result.matches[0]?.propertyId).toBe('p30');
    expect(result.matches[0]?.learnedMatch).toBe(true);
  });

  it('blocks learned mapping on unit conflict', () => {
    const learned = [learnedRule('Motor Power', 'p10', 'kW')];
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Motor Power', '61', 'mm')],
      harsleProfile,
      learned,
    );
    expect(result.matches[0]?.level).toBe('review');
    expect(result.matches[0]?.reasons.some((reason) => reason.code === 'learned-unit-conflict')).toBe(true);
    expect(result.matches[0]?.conflict).toBeDefined();
  });

  it('ignores learned mapping when target property missing', () => {
    const learned = [learnedRule('Motor Power', 'missing-id', 'kW')];
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Motor Power', '61', 'kW')],
      harsleProfile,
      learned,
    );
    expect(result.matches[0]?.propertyId).toBe('p10');
    expect(result.matches[0]?.learnedMatch).toBeUndefined();
  });

  it('applies learned mapping without unit when source has no unit', () => {
    const learned = [learnedRule('Feeding Structure', 'p10')];
    const result = matchDocumentToProfile(
      [characteristic('c1', 'Feeding Structure', 'Hydraulic', undefined)],
      harsleProfile,
      learned,
    );
    expect(result.matches[0]?.propertyId).toBe('p10');
    expect(result.matches[0]?.learnedMatch).toBe(true);
  });
});

describe('no hidden learning', () => {
  it('automatic HIGH does not create persistent rule', () => {
    const before = matchDocumentToProfile(
      [characteristic('c1', 'Motor Power', '61', 'kW')],
      harsleProfile,
      [],
    );
    expect(before.matches[0]?.level).toBe('high');
    const after = matchDocumentToProfile(
      [characteristic('c2', 'Motor Power', '75', 'kW')],
      harsleProfile,
      [],
    );
    expect(after.matches[0]?.learnedMatch).toBeUndefined();
  });
});
