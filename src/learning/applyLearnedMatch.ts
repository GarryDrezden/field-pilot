import { indexCharacteristic } from '../matching/scoreCandidate';
import type { DocumentPropertyMatch } from '../matching/types';
import type { LearnedDocumentMapping, ProfileProperty } from '../profile/profileTypes';
import type { ExtractedCharacteristic } from '../extraction/types';
import {
  buildLearnedMappingIndex,
  isLearnedUnitConflict,
  validateLearnedMapping,
} from './learnedMappings';

export function tryLearnedDocumentMatch(
  characteristic: ExtractedCharacteristic,
  properties: ProfileProperty[],
  learnedIndex: Map<string, LearnedDocumentMapping>,
): DocumentPropertyMatch | null {
  const source = indexCharacteristic(characteristic);
  const mapping = learnedIndex.get(source.normalizedLabel);
  if (!mapping) {
    return null;
  }

  const validation = validateLearnedMapping(mapping, properties);
  if (!validation.valid) {
    return null;
  }

  if (isLearnedUnitConflict(mapping, characteristic)) {
    return {
      characteristicId: characteristic.id,
      propertyId: mapping.propertyId,
      suggestedPropertyId: mapping.propertyId,
      confidence: 1,
      level: 'review',
      requiresReview: true,
      ambiguous: false,
      reasons: [
        { code: 'user-learned', message: 'Соответствие ранее сохранено пользователем' },
        {
          code: 'learned-unit-conflict',
          message: 'Сохранённое правило найдено, но единицы измерения конфликтуют',
        },
      ],
      alternatives: [],
      automaticPropertyId: mapping.propertyId,
      automaticLevel: 'review',
      automaticConfidence: 1,
      learnedMatch: true,
      conflict: {
        type: 'concept-conflict',
        message: 'Сохранённое правило найдено, но единицы измерения конфликтуют',
      },
    };
  }

  return {
    characteristicId: characteristic.id,
    propertyId: mapping.propertyId,
    suggestedPropertyId: mapping.propertyId,
    confidence: 1,
    level: 'high',
    requiresReview: false,
    ambiguous: false,
    reasons: [{ code: 'user-learned', message: 'Соответствие ранее сохранено пользователем' }],
    alternatives: [],
    automaticPropertyId: mapping.propertyId,
    automaticLevel: 'high',
    automaticConfidence: 1,
    learnedMatch: true,
  };
}

export function buildLearnedIndexFromProfile(
  learnedMappings: LearnedDocumentMapping[] | undefined,
): Map<string, LearnedDocumentMapping> {
  return buildLearnedMappingIndex(learnedMappings ?? []);
}
