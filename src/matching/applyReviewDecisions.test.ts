import { describe, expect, it } from 'vitest';
import {
  applyReviewDecisions,
  createEmptyReviewState,
  getFillReadyMatches,
  upsertReviewDecision,
} from './applyReviewDecisions';
import { matchDocumentToProfile } from './matchDocumentToProfile';
import type { ExtractedCharacteristic } from '../extraction/types';
import type { ProfileProperty } from '../profile/profileTypes';

const properties: ProfileProperty[] = [
  {
    id: 'p10',
    name: 'Мощность двигателя, kW',
    externalId: 'PARAM10',
    aliases: ['Motor Power'],
    unit: 'kW',
  },
  {
    id: 'p30',
    name: 'Потребляемая мощность, kW',
    externalId: 'PARAM30',
    aliases: [],
    unit: 'kW',
  },
];

const characteristics: ExtractedCharacteristic[] = [
  {
    id: 'c1',
    sourceLabel: 'Motor Power',
    rawValue: '61',
    normalizedValue: '61',
    normalizedUnit: 'kW',
    valueKind: 'number',
    extractionMethod: 'structured-line',
    source: { text: 'Motor Power 61 kW' },
  },
  {
    id: 'c2',
    sourceLabel: 'Average Working Power',
    rawValue: '3.1',
    normalizedValue: '3.1',
    normalizedUnit: 'kW',
    valueKind: 'number',
    extractionMethod: 'structured-line',
    source: { text: 'Average Working Power 3.1 kW' },
  },
];

describe('applyReviewDecisions', () => {
  it('applies confirmed and manual overrides', () => {
    const automatic = matchDocumentToProfile(characteristics, properties);
    const review = createEmptyReviewState('profile-1');
    const withConfirm = upsertReviewDecision(review, 'c2', {
      type: 'confirmed',
      propertyId: 'p30',
    });
    const withManual = upsertReviewDecision(withConfirm, 'c1', {
      type: 'manual',
      propertyId: 'p10',
    });

    const effective = applyReviewDecisions(automatic, withManual, 'profile-1', properties, characteristics);
    expect(effective.find((item) => item.characteristicId === 'c1')?.effectivePropertyId).toBe('p10');
    expect(effective.find((item) => item.characteristicId === 'c2')?.effectivePropertyId).toBe('p30');
    expect(getFillReadyMatches(effective)).toHaveLength(2);
  });

  it('detects collision after manual assignment to same property', () => {
    const automatic = matchDocumentToProfile(characteristics, properties);
    let review = createEmptyReviewState('profile-1');
    review = upsertReviewDecision(review, 'c1', { type: 'manual', propertyId: 'p30' });
    review = upsertReviewDecision(review, 'c2', { type: 'confirmed', propertyId: 'p30' });

    const effective = applyReviewDecisions(automatic, review, 'profile-1', properties, characteristics);
    expect(effective.every((item) => item.effectivePropertyId === 'p30')).toBe(true);
    expect(effective.every((item) => item.conflict?.type === 'target-collision')).toBe(true);
    expect(getFillReadyMatches(effective)).toHaveLength(0);
  });

  it('ignores decisions from another profile', () => {
    const automatic = matchDocumentToProfile(characteristics, properties);
    const review = upsertReviewDecision(createEmptyReviewState('profile-a'), 'c1', {
      type: 'manual',
      propertyId: 'p30',
    });
    const effective = applyReviewDecisions(automatic, review, 'profile-b', properties, characteristics);
    expect(effective.find((item) => item.characteristicId === 'c1')?.effectivePropertyId).not.toBe('p30');
  });

  it('marks ignored characteristics separately', () => {
    const automatic = matchDocumentToProfile(characteristics, properties);
    const review = upsertReviewDecision(createEmptyReviewState('profile-1'), 'c2', {
      type: 'ignored',
    });
    const effective = applyReviewDecisions(automatic, review, 'profile-1', properties, characteristics);
    expect(effective.find((item) => item.characteristicId === 'c2')?.effectiveLevel).toBe('ignored');
  });
});
