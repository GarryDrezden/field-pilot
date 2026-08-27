import type { EffectiveDocumentMatch } from '../../matching/types';
import type { DocumentMatchReviewState } from '../../matching/types';
import type { ChatGptBridgeScope } from './types';

function hasUserDecision(
  characteristicId: string,
  review: DocumentMatchReviewState | null | undefined,
  profileId: string,
): boolean {
  if (!review || review.profileId !== profileId) {
    return false;
  }
  const decision = review.decisions[characteristicId];
  return decision?.type === 'confirmed' || decision?.type === 'manual';
}

function isLearnedHigh(match: EffectiveDocumentMatch): boolean {
  return Boolean(match.learnedMatch) || match.reasons.some((reason) => reason.code === 'user-learned');
}

export function selectBridgeCharacteristicIds(
  scope: ChatGptBridgeScope,
  matches: EffectiveDocumentMatch[],
  profileId: string,
  review: DocumentMatchReviewState | null | undefined,
): string[] {
  if (scope === 'all') {
    return matches
      .filter((match) => match.effectiveLevel !== 'ignored' && !hasUserDecision(match.characteristicId, review, profileId))
      .map((match) => match.characteristicId);
  }

  return matches
    .filter((match) => {
      if (match.effectiveLevel === 'ignored') {
        return false;
      }
      if (hasUserDecision(match.characteristicId, review, profileId)) {
        return false;
      }
      if (isLearnedHigh(match) && match.effectiveLevel === 'high') {
        return false;
      }
      if (match.conflict || match.ambiguous) {
        return true;
      }
      return match.effectiveLevel === 'review' || match.effectiveLevel === 'reject';
    })
    .map((match) => match.characteristicId);
}
