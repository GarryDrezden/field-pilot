import { describe, expect, it } from 'vitest';
import { isLikelyProseLine } from './proseDetection';

describe('proseDetection', () => {
  it('rejects marketing prose', () => {
    expect(
      isLikelyProseLine('HARSLE offers systems ranging from 15 to 64 axes, ensuring 0'),
    ).toBe(true);
  });

  it('allows structured parameter lines with abbreviations', () => {
    expect(isLikelyProseLine('13. Max. Feeding Speed m/min 120')).toBe(false);
  });
});
