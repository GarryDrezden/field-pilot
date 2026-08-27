import type { ExtractedCharacteristic } from '../extraction/types';
import type { DocumentPropertyMatch, EffectiveDocumentMatch } from './types';

export function detectAutomaticTargetCollisions(
  matches: DocumentPropertyMatch[],
  characteristics: ExtractedCharacteristic[],
): void {
  applyCollisions(matches, characteristics, (match) => match.propertyId);
}

export function detectEffectiveTargetCollisions(
  matches: EffectiveDocumentMatch[],
  characteristics: ExtractedCharacteristic[],
): EffectiveDocumentMatch[] {
  const working = matches.map((match) => ({ ...match }));
  applyCollisions(working, characteristics, (match) => match.effectivePropertyId);

  return working.map((match) => {
    if (!match.conflict || match.conflict.type !== 'target-collision') {
      return match;
    }

    const group = working.filter((item) => item.effectivePropertyId === match.effectivePropertyId);
    const values = new Set(group.map((item) => getCharacteristicValue(item.characteristicId, characteristics)));
    const hasDistinctValues = values.size > 1;

    return {
      ...match,
      effectiveLevel: match.effectiveLevel === 'ignored' ? 'ignored' : hasDistinctValues ? 'review' : match.effectiveLevel,
      fillReady: false,
      requiresReview: hasDistinctValues || match.requiresReview,
      ambiguous: hasDistinctValues ? true : match.ambiguous,
    };
  });
}

function applyCollisions<T extends DocumentPropertyMatch>(
  matches: T[],
  characteristics: ExtractedCharacteristic[],
  getPropertyId: (match: T) => string | undefined,
): void {
  const byProperty = new Map<string, T[]>();

  for (const match of matches) {
    const propertyId = getPropertyId(match);
    if (!propertyId || match.level === 'reject' || match.level === 'ignored') {
      continue;
    }
    const bucket = byProperty.get(propertyId) ?? [];
    bucket.push(match);
    byProperty.set(propertyId, bucket);
  }

  for (const group of byProperty.values()) {
    if (group.length < 2) {
      continue;
    }

    const values = new Set(group.map((match) => getCharacteristicValue(match.characteristicId, characteristics)));

    for (const match of group) {
      match.conflict = {
        type: 'target-collision',
        message:
          values.size > 1
            ? 'Несколько характеристик документа сопоставлены с одним свойством профиля'
            : 'Несколько характеристик документа указывают на одно свойство профиля',
        relatedCharacteristicIds: group.map((item) => item.characteristicId),
      };
      if (values.size > 1 && match.level !== 'ignored') {
        match.level = 'review';
        match.requiresReview = true;
        match.ambiguous = true;
      }
    }
  }
}

function getCharacteristicValue(
  characteristicId: string,
  characteristics: ExtractedCharacteristic[],
): string {
  const characteristic = characteristics.find((item) => item.id === characteristicId);
  return characteristic?.normalizedValue ?? characteristic?.rawValue ?? '';
}
