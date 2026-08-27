import type { DocumentMatchReviewState } from '../matching/types';
import type { ExtractedCharacteristic } from '../extraction/types';

export function pruneReviewDecisionsForCharacteristics(
  reviewState: DocumentMatchReviewState | null | undefined,
  characteristics: ExtractedCharacteristic[],
): DocumentMatchReviewState | null {
  if (!reviewState) {
    return null;
  }

  const validIds = new Set(characteristics.map((item) => item.id));
  const nextDecisions = Object.fromEntries(
    Object.entries(reviewState.decisions).filter(([characteristicId]) =>
      validIds.has(characteristicId),
    ),
  );

  if (Object.keys(nextDecisions).length === Object.keys(reviewState.decisions).length) {
    return reviewState;
  }

  return {
    ...reviewState,
    decisions: nextDecisions,
  };
}
