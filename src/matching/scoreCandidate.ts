import {
  CONCEPT_WEIGHTS,
  DEFAULT_CONCEPT_WEIGHT,
  EXACT_ALIAS_SCORE,
  EXACT_NAME_SCORE,
  POWER_SUBTYPE_REJECT_CAP,
  POWER_SUBTYPE_REVIEW_CAP,
  UNKNOWN_TOKEN_BONUS,
  UNIT_MATCH_BONUS,
} from './constants';
import { canonicalizeLabel } from './canonicalizeLabel';
import {
  detectConceptConflicts,
  hasAverageWorkingPowerSubtype,
  hasConsumptionPowerSubtype,
  hasMotorPowerSubtype,
} from './detectConceptConflicts';
import {
  areUnitsHardIncompatible,
  getCharacteristicUnit,
  inferPropertyUnit,
  unitsCompatible,
} from './inferPropertyUnit';
import { normalizePropertyLabel } from '../profile/normalizePropertyLabel';
import type { ExtractedCharacteristic } from '../extraction/types';
import type { ProfileProperty } from '../profile/profileTypes';
import type {
  IndexedCharacteristic,
  IndexedProperty,
  MatchReason,
  PropertyMatchCandidate,
} from './types';

export function indexCharacteristic(characteristic: ExtractedCharacteristic): IndexedCharacteristic {
  return {
    characteristic,
    normalizedLabel: normalizePropertyLabel(characteristic.sourceLabel),
    canonical: canonicalizeLabel(characteristic.sourceLabel),
    unit: getCharacteristicUnit(characteristic.rawUnit, characteristic.normalizedUnit),
  };
}

export function indexProperty(property: ProfileProperty): IndexedProperty {
  return {
    property,
    normalizedName: normalizePropertyLabel(property.name),
    normalizedAliases: property.aliases.map((alias) => normalizePropertyLabel(alias)),
    canonical: canonicalizeLabel(property.name),
    unit: inferPropertyUnit(property),
  };
}

export function scoreCandidatePair(
  source: IndexedCharacteristic,
  target: IndexedProperty,
): PropertyMatchCandidate {
  const reasons: MatchReason[] = [];

  if (areUnitsHardIncompatible(source.unit, target.unit)) {
    return {
      propertyId: target.property.id,
      score: 0,
      reasons: [{ code: 'unit-mismatch', message: `Несовместимые единицы: ${source.unit} ↔ ${target.unit}` }],
    };
  }

  const conflict = detectConceptConflicts(source.canonical, target.canonical);
  if (conflict.hard) {
    return {
      propertyId: target.property.id,
      score: 0,
      reasons: conflict.reasons,
    };
  }

  if (source.normalizedLabel === target.normalizedName) {
    reasons.push({ code: 'exact-name', message: 'Точное совпадение названия' });
    return finalizeExactCandidate(source, target, EXACT_NAME_SCORE, reasons);
  }

  const aliasIndex = target.normalizedAliases.indexOf(source.normalizedLabel);
  if (aliasIndex >= 0) {
    reasons.push({ code: 'exact-alias', message: 'Точное совпадение alias' });
    return finalizeExactCandidate(source, target, EXACT_ALIAS_SCORE, reasons);
  }

  let score = computeConceptOverlapScore(source.canonical, target.canonical, reasons);
  score += computeUnknownTokenBonus(source.canonical, target.canonical, reasons);

  const unitState = unitsCompatible(source.unit, target.unit);
  if (unitState === 'match') {
    score += UNIT_MATCH_BONUS;
    reasons.push({ code: 'unit-match', message: `Совпадает единица: ${source.unit}` });
  } else if (unitState === 'missing') {
    reasons.push({ code: 'unit-missing', message: 'Единица указана не у обеих сторон' });
  }

  score = applyPowerSubtypeCaps(source, target, score, reasons);
  score = clamp(score, 0, 1);

  if (score > 0) {
    reasons.push({ code: 'concept-overlap', message: 'Совпадение технических понятий' });
  }

  return {
    propertyId: target.property.id,
    score,
    reasons,
  };
}

function finalizeExactCandidate(
  source: IndexedCharacteristic,
  target: IndexedProperty,
  score: number,
  reasons: MatchReason[],
): PropertyMatchCandidate {
  const unitState = unitsCompatible(source.unit, target.unit);
  if (unitState === 'mismatch') {
    return {
      propertyId: target.property.id,
      score: 0,
      reasons: [{ code: 'unit-mismatch', message: `Несовместимые единицы: ${source.unit} ↔ ${target.unit}` }],
    };
  }
  if (unitState === 'match') {
    reasons.push({ code: 'unit-match', message: `Совпадает единица: ${source.unit}` });
  }
  return {
    propertyId: target.property.id,
    score,
    reasons,
  };
}

function computeConceptOverlapScore(
  source: ReturnType<typeof canonicalizeLabel>,
  target: ReturnType<typeof canonicalizeLabel>,
  reasons: MatchReason[],
): number {
  const sourceConcepts = [...source.concepts];
  const targetConcepts = [...target.concepts];
  if (sourceConcepts.length === 0 || targetConcepts.length === 0) {
    return 0;
  }

  const intersection = sourceConcepts.filter((concept) => target.concepts.has(concept));
  if (intersection.length === 0) {
    return 0;
  }

  const matchedWeight = sumConceptWeights(intersection);
  const sourceWeight = sumConceptWeights(sourceConcepts);
  const targetWeight = sumConceptWeights(targetConcepts);
  const coverage = matchedWeight / Math.max(sourceWeight, targetWeight, 0.001);

  reasons.push({
    code: 'concept-overlap',
    message: `Совпали понятия: ${intersection.join(', ')}`,
  });

  return coverage * 0.88;
}

function computeUnknownTokenBonus(
  source: ReturnType<typeof canonicalizeLabel>,
  target: ReturnType<typeof canonicalizeLabel>,
  reasons: MatchReason[],
): number {
  const shared = [...source.unknownTokens].filter((token) => target.unknownTokens.has(token));
  if (shared.length === 0) {
    return 0;
  }
  reasons.push({
    code: 'unknown-token-overlap',
    message: `Совпали термины: ${shared.join(', ')}`,
  });
  return Math.min(UNKNOWN_TOKEN_BONUS * shared.length, 0.16);
}

function applyPowerSubtypeCaps(
  source: IndexedCharacteristic,
  target: IndexedProperty,
  score: number,
  reasons: MatchReason[],
): number {
  if (hasMotorPowerSubtype(source.canonical) && hasConsumptionPowerSubtype(target.canonical)) {
    reasons.push({
      code: 'power-subtype-ambiguous',
      message: 'Мощность двигателя не должна автоматически сопоставляться с потребляемой мощностью',
    });
    return Math.min(score, POWER_SUBTYPE_REJECT_CAP);
  }

  if (hasAverageWorkingPowerSubtype(source.canonical) && hasConsumptionPowerSubtype(target.canonical)) {
    reasons.push({
      code: 'power-subtype-ambiguous',
      message: 'Average Working Power и потребляемая мощность требуют ручной проверки',
    });
    score = Math.max(score, 0.72);
    return Math.min(score, POWER_SUBTYPE_REVIEW_CAP);
  }

  if (hasAverageWorkingPowerSubtype(source.canonical) && hasMotorPowerSubtype(target.canonical)) {
    reasons.push({
      code: 'power-subtype-ambiguous',
      message: 'Средняя рабочая мощность не совпадает с мощностью двигателя',
    });
    return Math.min(score, POWER_SUBTYPE_REJECT_CAP);
  }

  return score;
}

function sumConceptWeights(concepts: string[]): number {
  return concepts.reduce((sum, concept) => sum + (CONCEPT_WEIGHTS[concept] ?? DEFAULT_CONCEPT_WEIGHT), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
