import {
  MATCH_HIGH_MARGIN,
  MATCH_HIGH_THRESHOLD,
  MATCH_REVIEW_THRESHOLD,
  MAX_ALTERNATIVES,
} from './constants';
import { detectAutomaticTargetCollisions } from './detectTargetCollisions';
import { buildLearnedIndexFromProfile, tryLearnedDocumentMatch } from '../learning/applyLearnedMatch';
import { indexCharacteristic, indexProperty, scoreCandidatePair } from './scoreCandidate';
import type { ExtractedCharacteristic } from '../extraction/types';
import type { LearnedDocumentMapping, ProfileProperty } from '../profile/profileTypes';
import type {
  DocumentProfileMatchingResult,
  DocumentPropertyMatch,
  MatchLevel,
  MatchReason,
  PropertyMatchCandidate,
} from './types';

export function matchDocumentToProfile(
  characteristics: ExtractedCharacteristic[],
  properties: ProfileProperty[],
  learnedMappings: LearnedDocumentMapping[] = [],
): DocumentProfileMatchingResult {
  const indexedProperties = properties.map(indexProperty);
  const learnedIndex = buildLearnedIndexFromProfile(learnedMappings);
  const matches = characteristics.map((characteristic) =>
    matchSingleCharacteristic(
      indexCharacteristic(characteristic),
      indexedProperties,
      characteristic,
      learnedIndex,
    ),
  );

  detectAutomaticTargetCollisions(matches, characteristics);

  const stats = {
    total: matches.length,
    high: matches.filter((match) => match.level === 'high').length,
    review: matches.filter((match) => match.level === 'review').length,
    reject: matches.filter((match) => match.level === 'reject').length,
    ignored: 0,
    conflicts: matches.filter((match) => match.conflict).length,
  };

  return { matches, stats };
}

function matchSingleCharacteristic(
  source: ReturnType<typeof indexCharacteristic>,
  indexedProperties: ReturnType<typeof indexProperty>[],
  characteristic: ExtractedCharacteristic,
  learnedIndex: Map<string, LearnedDocumentMapping>,
): DocumentPropertyMatch {
  const learnedMatch = tryLearnedDocumentMatch(characteristic, indexedProperties.map((item) => item.property), learnedIndex);
  if (learnedMatch) {
    return learnedMatch;
  }

  const exactNameMatches = indexedProperties.filter(
    (property) => property.normalizedName === source.normalizedLabel,
  );
  if (exactNameMatches.length > 1) {
    return buildAmbiguousExactMatch(source, exactNameMatches, 'exact-name-ambiguous');
  }
  if (exactNameMatches.length === 1) {
    const candidate = scoreCandidatePair(source, exactNameMatches[0]!);
    return buildMatchFromCandidate(source.characteristic.id, candidate, [], 'exact-name');
  }

  const exactAliasMatches = indexedProperties.filter((property) =>
    property.normalizedAliases.includes(source.normalizedLabel),
  );
  if (exactAliasMatches.length > 1) {
    return buildAmbiguousExactMatch(source, exactAliasMatches, 'exact-name-ambiguous');
  }
  if (exactAliasMatches.length === 1) {
    const candidate = scoreCandidatePair(source, exactAliasMatches[0]!);
    return buildMatchFromCandidate(source.characteristic.id, candidate, [], 'exact-alias');
  }

  const scored = indexedProperties
    .map((property) => scoreCandidatePair(source, property))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) {
    return {
      characteristicId: source.characteristic.id,
      confidence: 0,
      level: 'reject',
      requiresReview: false,
      ambiguous: false,
      reasons: [{ code: 'no-candidate', message: 'Подходящее свойство профиля не найдено' }],
      alternatives: [],
    };
  }

  const best = scored[0]!;
  const second = scored[1];
  const alternatives = scored.slice(0, MAX_ALTERNATIVES);
  const margin = second ? best.score - second.score : best.score;
  const level = resolveAutomaticLevel(best.score, margin, Boolean(second && second.score >= MATCH_REVIEW_THRESHOLD));

  return buildMatchFromCandidate(source.characteristic.id, best, alternatives, undefined, level, margin, second);
}

function buildAmbiguousExactMatch(
  source: ReturnType<typeof indexCharacteristic>,
  properties: ReturnType<typeof indexProperty>[],
  reasonCode: MatchReason['code'],
): DocumentPropertyMatch {
  const alternatives: PropertyMatchCandidate[] = properties.map((property) => ({
    propertyId: property.property.id,
    score: 1,
    reasons: [{ code: reasonCode, message: 'Несколько свойств с одинаковым названием' }],
  }));

  return {
    characteristicId: source.characteristic.id,
    confidence: 1,
    level: 'review',
    requiresReview: true,
    ambiguous: true,
    reasons: [{ code: reasonCode, message: 'Найдено несколько свойств с одинаковым названием' }],
    alternatives,
    conflict: {
      type: 'ambiguous-property',
      message: 'Требуется ручной выбор свойства профиля',
    },
  };
}

function buildMatchFromCandidate(
  characteristicId: string,
  candidate: PropertyMatchCandidate,
  alternatives: PropertyMatchCandidate[],
  forcedReason?: MatchReason['code'],
  forcedLevel?: MatchLevel,
  margin?: number,
  second?: PropertyMatchCandidate,
): DocumentPropertyMatch {
  const reasons = [...candidate.reasons];
  if (forcedReason === 'exact-name') {
    reasons.unshift({ code: 'exact-name', message: 'Точное совпадение названия' });
  }
  if (forcedReason === 'exact-alias') {
    reasons.unshift({ code: 'exact-alias', message: 'Точное совпадение alias' });
  }

  let level = forcedLevel ?? resolveAutomaticLevel(candidate.score, margin ?? candidate.score, Boolean(second));
  let ambiguous = false;
  if (
    second &&
    candidate.score >= MATCH_HIGH_THRESHOLD &&
    second.score >= MATCH_REVIEW_THRESHOLD &&
    candidate.score - second.score < MATCH_HIGH_MARGIN
  ) {
    level = 'review';
    ambiguous = true;
    reasons.push({
      code: 'candidate-margin-low',
      message: 'Второй кандидат слишком близок по score',
    });
  }

  const propertyId = level === 'reject' ? undefined : candidate.propertyId;

  return {
    characteristicId,
    propertyId,
    suggestedPropertyId: propertyId,
    confidence: candidate.score,
    level,
    requiresReview: level !== 'high',
    ambiguous,
    reasons,
    alternatives: dedupeAlternatives(alternatives, candidate.propertyId),
    automaticPropertyId: candidate.propertyId,
    automaticLevel: level,
    automaticConfidence: candidate.score,
  };
}

function resolveAutomaticLevel(
  score: number,
  margin: number,
  hasCloseSecond: boolean,
): MatchLevel {
  if (score < MATCH_REVIEW_THRESHOLD) {
    return 'reject';
  }
  if (score >= MATCH_HIGH_THRESHOLD && margin >= MATCH_HIGH_MARGIN && !hasCloseSecond) {
    return 'high';
  }
  return 'review';
}

function dedupeAlternatives(
  alternatives: PropertyMatchCandidate[],
  selectedPropertyId: string,
): PropertyMatchCandidate[] {
  const merged = alternatives.filter((candidate) => candidate.propertyId !== selectedPropertyId);
  return merged.slice(0, MAX_ALTERNATIVES - 1);
}
