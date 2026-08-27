import { describe, expect, it } from 'vitest';
import { MATCH_DISPLAY_ORDER, sortMatchesForDisplay } from './sortMatchesForDisplay';
import type { EffectiveDocumentMatch, MatchLevel } from './types';

function makeMatch(
  characteristicId: string,
  effectiveLevel: MatchLevel,
  overrides: Partial<EffectiveDocumentMatch> = {},
): EffectiveDocumentMatch {
  return {
    characteristicId,
    confidence: 0.5,
    level: effectiveLevel,
    effectiveLevel,
    requiresReview: effectiveLevel === 'review',
    ambiguous: false,
    reasons: [],
    alternatives: [],
    fillReady: effectiveLevel === 'high',
    ...overrides,
  };
}

describe('sortMatchesForDisplay', () => {
  it('sorts mixed statuses: high → review → reject', () => {
    const input = [
      makeMatch('c1', 'review'),
      makeMatch('c2', 'high'),
      makeMatch('c3', 'reject'),
      makeMatch('c4', 'high'),
      makeMatch('c5', 'review'),
    ];

    const sorted = sortMatchesForDisplay(input);

    expect(sorted.map((item) => item.characteristicId)).toEqual(['c2', 'c4', 'c1', 'c5', 'c3']);
  });

  it('preserves document order within HIGH group', () => {
    const input = [
      makeMatch('weight', 'high'),
      makeMatch('motor', 'high'),
      makeMatch('angle', 'high'),
    ];

    const sorted = sortMatchesForDisplay(input);

    expect(sorted.map((item) => item.characteristicId)).toEqual(['weight', 'motor', 'angle']);
  });

  it('preserves document order within REVIEW group', () => {
    const input = [
      makeMatch('max-len', 'review'),
      makeMatch('avg-power', 'review'),
    ];

    const sorted = sortMatchesForDisplay(input);

    expect(sorted.map((item) => item.characteristicId)).toEqual(['max-len', 'avg-power']);
  });

  it('places IGNORED after REJECT', () => {
    const input = [
      makeMatch('ignored', 'ignored'),
      makeMatch('reject', 'reject'),
      makeMatch('high', 'high'),
    ];

    const sorted = sortMatchesForDisplay(input);

    expect(sorted.map((item) => item.characteristicId)).toEqual(['high', 'reject', 'ignored']);
  });

  it('treats confirmed/manual effective high as green group', () => {
    const input = [
      makeMatch('auto-review', 'review'),
      makeMatch('confirmed', 'high', {
        level: 'review',
        reasons: [{ code: 'confirmed-by-user', message: 'confirmed' }],
      }),
      makeMatch('manual', 'high', {
        level: 'reject',
        reasons: [{ code: 'manual-override', message: 'manual' }],
      }),
    ];

    const sorted = sortMatchesForDisplay(input);

    expect(sorted.map((item) => item.characteristicId)).toEqual([
      'confirmed',
      'manual',
      'auto-review',
    ]);
  });

  it('does not mutate the source array', () => {
    const input = [
      makeMatch('c1', 'review'),
      makeMatch('c2', 'high'),
    ];
    const snapshot = input.map((item) => item.characteristicId);

    sortMatchesForDisplay(input);

    expect(input.map((item) => item.characteristicId)).toEqual(snapshot);
  });

  it('applies status sort after filter/search subset (stable within groups)', () => {
    const all = [
      makeMatch('motor-power', 'high'),
      makeMatch('avg-power', 'review'),
      makeMatch('some-power', 'reject'),
    ];

    const searched = all.filter((item) => item.characteristicId.includes('power'));
    const sorted = sortMatchesForDisplay(searched);

    expect(sorted.map((item) => item.characteristicId)).toEqual([
      'motor-power',
      'avg-power',
      'some-power',
    ]);
  });

  it('exports display order constants for all levels', () => {
    expect(MATCH_DISPLAY_ORDER.high).toBeLessThan(MATCH_DISPLAY_ORDER.review);
    expect(MATCH_DISPLAY_ORDER.review).toBeLessThan(MATCH_DISPLAY_ORDER.reject);
    expect(MATCH_DISPLAY_ORDER.reject).toBeLessThan(MATCH_DISPLAY_ORDER.ignored);
  });
});
