import type { EffectiveDocumentMatch, MatchLevel } from './types';

/** Display sort priority: HIGH → REVIEW → REJECT → IGNORED */
export const MATCH_DISPLAY_ORDER: Record<MatchLevel, number> = {
  high: 0,
  review: 1,
  reject: 2,
  ignored: 3,
};

export function sortMatchesForDisplay<T extends Pick<EffectiveDocumentMatch, 'effectiveLevel'>>(
  matches: T[],
): T[] {
  return matches
    .map((match, index) => ({ match, index }))
    .sort((left, right) => {
      const byStatus =
        MATCH_DISPLAY_ORDER[left.match.effectiveLevel] -
        MATCH_DISPLAY_ORDER[right.match.effectiveLevel];
      if (byStatus !== 0) {
        return byStatus;
      }
      return left.index - right.index;
    })
    .map(({ match }) => match);
}
