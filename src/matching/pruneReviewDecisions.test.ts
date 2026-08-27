import { describe, expect, it } from 'vitest';
import { pruneReviewDecisionsForCharacteristics } from './pruneReviewDecisions';

describe('pruneReviewDecisionsForCharacteristics', () => {
  it('removes decisions for vanished characteristic ids', () => {
    const next = pruneReviewDecisionsForCharacteristics(
      {
        profileId: 'profile-1',
        decisions: {
          'char-a': { type: 'confirmed', propertyId: 'prop-1' },
          'char-b': { type: 'ignored' },
        },
      },
      [
        {
          id: 'char-a',
          sourceLabel: 'Motor Power',
          rawValue: '61',
          normalizedValue: '61',
          valueKind: 'number',
          extractionMethod: 'structured-line',
          source: { text: 'Motor Power 61 kW', origin: 'ocr' },
        },
      ],
    );

    expect(next?.decisions['char-a']).toBeDefined();
    expect(next?.decisions['char-b']).toBeUndefined();
  });
});
