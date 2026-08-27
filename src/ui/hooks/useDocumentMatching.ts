import { useMemo } from 'react';
import { applyReviewDecisions, countEffectiveStats } from '../../matching/applyReviewDecisions';
import { matchDocumentToProfile } from '../../matching/matchDocumentToProfile';
import type { DocumentMatchReviewState, EffectiveDocumentMatch } from '../../matching/types';
import type { ExtractedCharacteristic } from '../../extraction/types';
import type { FieldProfile } from '../../profile/profileTypes';

export function useDocumentMatching(
  characteristics: ExtractedCharacteristic[] | null | undefined,
  activeProfile: FieldProfile | null | undefined,
  matchReview: DocumentMatchReviewState | null | undefined,
) {
  const automaticMatching = useMemo(() => {
    if (!characteristics?.length || !activeProfile?.properties.length) {
      return null;
    }
    return matchDocumentToProfile(characteristics, activeProfile.properties);
  }, [characteristics, activeProfile]);

  const effectiveMatches = useMemo<EffectiveDocumentMatch[]>(() => {
    if (!automaticMatching || !activeProfile) {
      return [];
    }
    return applyReviewDecisions(
      automaticMatching,
      matchReview,
      activeProfile.id,
      activeProfile.properties,
      characteristics ?? [],
    );
  }, [automaticMatching, matchReview, activeProfile, characteristics]);

  const stats = useMemo(
    () => countEffectiveStats(effectiveMatches),
    [effectiveMatches],
  );

  return {
    automaticMatching,
    effectiveMatches,
    stats,
  };
}
