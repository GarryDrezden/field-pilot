import { describe, expect, it } from 'vitest';
import type { ProfileProperty } from '../profile/profileTypes';
import type { PropertyMatchCandidate } from './types';
import {
  alternativeDisplayContainsInternalId,
  buildPropertiesById,
  formatAlternativeDisplayText,
  formatPropertyReference,
  isInternalPropertyId,
  resolveAlternativesForDisplay,
  resolvePropertyDisplayLabel,
} from './resolvePropertyDisplay';

function makeProperty(overrides: Partial<ProfileProperty> & Pick<ProfileProperty, 'id' | 'name'>): ProfileProperty {
  return {
    aliases: [],
    sourceOrder: 0,
    ...overrides,
  };
}

describe('resolvePropertyDisplay', () => {
  const properties = [
    makeProperty({
      id: 'e28bad4-f805-4e02-8431-29c61db90149',
      name: 'Диаметр/шаг ШВП по всем осям, мм',
      externalId: 'PARAM1898',
    }),
    makeProperty({
      id: '0ede1066-d473-438f-aa0d-1db85e37dadc',
      name: 'Максимальный диаметр ШВП, мм',
    }),
  ];
  const propertiesById = buildPropertiesById(properties);

  it('resolves alternative propertyId to property.name', () => {
    const label = resolvePropertyDisplayLabel(
      'e28bad4-f805-4e02-8431-29c61db90149',
      propertiesById,
    );

    expect(label?.name).toBe('Диаметр/шаг ШВП по всем осям, мм');
  });

  it('includes externalId in display text when present', () => {
    const rows = resolveAlternativesForDisplay(
      [{ propertyId: 'e28bad4-f805-4e02-8431-29c61db90149', score: 0.88, reasons: [] }],
      propertiesById,
    );

    expect(formatAlternativeDisplayText(rows[0]!)).toBe(
      '88% Диаметр/шаг ШВП по всем осям, мм PARAM1898',
    );
  });

  it('shows only name when externalId is absent', () => {
    const rows = resolveAlternativesForDisplay(
      [{ propertyId: '0ede1066-d473-438f-aa0d-1db85e37dadc', score: 0.88, reasons: [] }],
      propertiesById,
    );

    expect(formatAlternativeDisplayText(rows[0]!)).toBe('88% Максимальный диаметр ШВП, мм');
  });

  it('does not expose internal UUID in normal rendered text', () => {
    const alternatives: PropertyMatchCandidate[] = [
      { propertyId: 'e28bad4-f805-4e02-8431-29c61db90149', score: 0.88, reasons: [] },
      { propertyId: '0ede1066-d473-438f-aa0d-1db85e37dadc', score: 0.75, reasons: [] },
    ];

    const rows = resolveAlternativesForDisplay(alternatives, propertiesById);
    const rendered = rows.map((row) => formatAlternativeDisplayText(row)).join('\n');

    expect(alternativeDisplayContainsInternalId(rendered)).toBe(false);
    expect(isInternalPropertyId('PARAM1898')).toBe(false);
  });

  it('filters missing properties instead of showing raw UUID', () => {
    const rows = resolveAlternativesForDisplay(
      [
        { propertyId: 'e28bad4-f805-4e02-8431-29c61db90149', score: 0.88, reasons: [] },
        { propertyId: 'missing-id-00000000-0000-4000-8000-000000000001', score: 0.5, reasons: [] },
      ],
      propertiesById,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.propertyId).toBe('e28bad4-f805-4e02-8431-29c61db90149');
  });

  it('keeps propertyId identity for selection while UI uses names', () => {
    const rows = resolveAlternativesForDisplay(
      [{ propertyId: 'e28bad4-f805-4e02-8431-29c61db90149', score: 0.88, reasons: [] }],
      propertiesById,
    );

    expect(rows[0]?.propertyId).toBe('e28bad4-f805-4e02-8431-29c61db90149');
    expect(formatPropertyReference(rows[0]!.propertyId, propertiesById)).toBe(
      'Диаметр/шаг ШВП по всем осям, мм (PARAM1898)',
    );
  });

  it('uses safe fallback for missing property reference text', () => {
    expect(formatPropertyReference('missing-id-00000000-0000-4000-8000-000000000001', propertiesById)).toBe(
      'удалённое свойство',
    );
  });
});
