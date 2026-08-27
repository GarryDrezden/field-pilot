import { describe, expect, it } from 'vitest';
import { mergeCatalogIntoProfile } from '../profile/profileImport';
import type { FieldProfile, LearnedDocumentMapping } from '../profile/profileTypes';
import { normalizeLearnedSourceLabel } from './learnedMappings';

const createId = (() => {
  let counter = 0;
  return () => `id-${++counter}`;
})();

describe('XLSX reimport preserves learned mappings', () => {
  it('does not remove learned mappings when catalog is merged', () => {
    const learned: LearnedDocumentMapping[] = [
      {
        id: 'learn-1',
        sourceLabel: 'Motor Power',
        normalizedSourceLabel: normalizeLearnedSourceLabel('Motor Power'),
        sourceUnit: 'kW',
        propertyId: 'prop-10',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const profile: FieldProfile = {
      id: 'profile-1',
      name: 'Mosklad',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      properties: [
        {
          id: 'prop-10',
          name: 'Мощность двигателя, кВт',
          externalId: 'PARAM10',
          aliases: ['Motor Power'],
          unit: 'kW',
        },
      ],
      mappings: [],
      learnedMappings: learned,
    };

    const mergeResult = mergeCatalogIntoProfile(profile.properties, [
      {
        name: 'Мощность двигателя, кВт',
        externalId: 'PARAM10',
        unit: 'kW',
        aliases: ['Motor Power'],
      },
    ], createId);

    const nextProfile: FieldProfile = {
      ...profile,
      properties: mergeResult.properties,
    };

    expect(nextProfile.learnedMappings).toEqual(learned);
    expect(nextProfile.learnedMappings[0]?.propertyId).toBe('prop-10');
  });
});
