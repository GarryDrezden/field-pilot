import type { ExtractedCharacteristic } from '../../extraction/types';
import type { ProfileProperty } from '../../profile/profileTypes';
import type { EffectiveDocumentMatch } from '../../matching/types';
import type { BridgeSuggestionPreviewRow, ChatGptBridgeSuggestion } from './types';

export function buildBridgeSuggestionPreview(
  suggestions: ChatGptBridgeSuggestion[],
  characteristics: ExtractedCharacteristic[],
  properties: ProfileProperty[],
  effectiveMatches: EffectiveDocumentMatch[],
): BridgeSuggestionPreviewRow[] {
  const characteristicById = new Map(characteristics.map((item) => [item.id, item]));
  const propertyById = new Map(properties.map((item) => [item.id, item]));
  const matchById = new Map(effectiveMatches.map((item) => [item.characteristicId, item]));

  return suggestions.map((suggestion) => {
    const characteristic = characteristicById.get(suggestion.characteristicId);
    const localMatch = matchById.get(suggestion.characteristicId);
    const localProperty = localMatch?.effectivePropertyId
      ? propertyById.get(localMatch.effectivePropertyId)
      : undefined;
    const suggestedProperty = suggestion.propertyId
      ? propertyById.get(suggestion.propertyId)
      : undefined;

    const isHighOverride = Boolean(
      localMatch?.effectiveLevel === 'high' &&
        localMatch.effectivePropertyId &&
        suggestion.propertyId &&
        suggestion.propertyId !== localMatch.effectivePropertyId,
    );

    const appliesNoMatch = suggestion.propertyId === null;
    const canApply = Boolean(
      suggestion.propertyId &&
        !isHighOverride &&
        suggestion.confidence !== 'low',
    );

    return {
      characteristicId: suggestion.characteristicId,
      sourceLabel: characteristic?.sourceLabel ?? suggestion.characteristicId,
      localPropertyId: localMatch?.effectivePropertyId,
      localPropertyName: localProperty?.name,
      localLevel: localMatch?.effectiveLevel ?? 'unknown',
      suggestedPropertyId: suggestion.propertyId,
      suggestedPropertyName: suggestedProperty?.name,
      suggestedExternalId: suggestedProperty?.externalId,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
      canApply,
      isHighOverride,
      appliesNoMatch,
    };
  });
}

export function removeAppliedSuggestion(
  suggestions: ChatGptBridgeSuggestion[],
  characteristicId: string,
): ChatGptBridgeSuggestion[] {
  return suggestions.filter((item) => item.characteristicId !== characteristicId);
}
