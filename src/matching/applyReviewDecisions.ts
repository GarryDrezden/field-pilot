import type { ProfileProperty } from '../profile/profileTypes';
import type { ExtractedCharacteristic } from '../extraction/types';
import { detectEffectiveTargetCollisions } from './detectTargetCollisions';
import type {
  DocumentMatchReviewState,
  DocumentProfileMatchingResult,
  DocumentPropertyMatch,
  EffectiveDocumentMatch,
  MatchLevel,
  MatchReviewDecision,
} from './types';

export function applyReviewDecisions(
  matching: DocumentProfileMatchingResult,
  reviewState: DocumentMatchReviewState | null | undefined,
  activeProfileId: string | null,
  properties: ProfileProperty[],
  characteristics: ExtractedCharacteristic[] = [],
): EffectiveDocumentMatch[] {
  const propertyIds = new Set(properties.map((property) => property.id));
  const decisions =
    reviewState && reviewState.profileId === activeProfileId ? reviewState.decisions : {};

  const withDecisions = matching.matches.map((match) =>
    applyDecisionToMatch(match, decisions[match.characteristicId], propertyIds),
  );

  if (characteristics.length === 0) {
    return withDecisions;
  }

  return detectEffectiveTargetCollisions(withDecisions, characteristics);
}

function applyDecisionToMatch(
  match: DocumentPropertyMatch,
  decision: MatchReviewDecision | undefined,
  propertyIds: Set<string>,
): EffectiveDocumentMatch {
  if (!decision) {
    return {
      ...match,
      effectivePropertyId: match.propertyId,
      effectiveLevel: match.level,
      fillReady: match.level === 'high' && !match.conflict,
      ambiguous: match.ambiguous,
    };
  }

  if (decision.type === 'ignored') {
    return {
      ...match,
      propertyId: undefined,
      suggestedPropertyId: undefined,
      effectivePropertyId: undefined,
      effectiveLevel: 'ignored',
      level: 'ignored',
      requiresReview: false,
      fillReady: false,
      ambiguous: false,
      reasons: [...match.reasons, { code: 'ignored-by-user', message: 'Пропущено пользователем' }],
    };
  }

  if (!propertyIds.has(decision.propertyId)) {
    return {
      ...match,
      effectivePropertyId: match.propertyId,
      effectiveLevel: match.level,
      fillReady: false,
      ambiguous: match.ambiguous,
      reasons: [...match.reasons, { code: 'no-candidate', message: 'Ручное решение ссылается на удалённое свойство' }],
    };
  }

  const effectiveLevel: MatchLevel =
    decision.type === 'confirmed' && match.level === 'review' ? 'high' : 'high';

  return {
    ...match,
    propertyId: decision.propertyId,
    suggestedPropertyId: decision.propertyId,
    effectivePropertyId: decision.propertyId,
    effectiveLevel,
    level: effectiveLevel,
    requiresReview: false,
    fillReady: true,
    ambiguous: false,
    reasons: [
      ...match.reasons,
      {
        code: decision.type === 'manual' ? 'manual-override' : 'confirmed-by-user',
        message:
          decision.type === 'manual'
            ? 'Сопоставление выбрано пользователем вручную'
            : 'Сопоставление подтверждено пользователем',
      },
    ],
  };
}

export function getFillReadyMatches(matches: EffectiveDocumentMatch[]): EffectiveDocumentMatch[] {
  return matches.filter((match) => match.fillReady && match.effectivePropertyId);
}

export function countEffectiveStats(matches: EffectiveDocumentMatch[]): {
  total: number;
  high: number;
  review: number;
  reject: number;
  ignored: number;
  conflicts: number;
} {
  return {
    total: matches.length,
    high: matches.filter((match) => match.effectiveLevel === 'high').length,
    review: matches.filter((match) => match.effectiveLevel === 'review').length,
    reject: matches.filter((match) => match.effectiveLevel === 'reject').length,
    ignored: matches.filter((match) => match.effectiveLevel === 'ignored').length,
    conflicts: matches.filter((match) => match.conflict).length,
  };
}

export function createEmptyReviewState(profileId: string): DocumentMatchReviewState {
  return { profileId, decisions: {} };
}

export function upsertReviewDecision(
  state: DocumentMatchReviewState,
  characteristicId: string,
  decision: MatchReviewDecision,
): DocumentMatchReviewState {
  return {
    ...state,
    decisions: {
      ...state.decisions,
      [characteristicId]: decision,
    },
  };
}

export function removeReviewDecision(
  state: DocumentMatchReviewState,
  characteristicId: string,
): DocumentMatchReviewState {
  const nextDecisions = { ...state.decisions };
  delete nextDecisions[characteristicId];
  return { ...state, decisions: nextDecisions };
}
