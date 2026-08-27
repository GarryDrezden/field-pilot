import type { CanonicalLabel, MatchReason } from './types';

const EXCLUSIVE_GROUPS: string[][] = [
  ['MAX', 'MIN'],
  ['LENGTH', 'WIDTH', 'HEIGHT'],
  ['STAINLESS', 'ALUMINUM', 'MILD_STEEL'],
  ['FEED', 'BEND'],
  ['MOTOR', 'CONSUMPTION'],
];

export interface ConceptConflictResult {
  hard: boolean;
  reasons: MatchReason[];
}

export function detectConceptConflicts(
  source: CanonicalLabel,
  target: CanonicalLabel,
): ConceptConflictResult {
  const reasons: MatchReason[] = [];

  for (const group of EXCLUSIVE_GROUPS) {
    const sourceMatches = group.filter((concept) => source.concepts.has(concept));
    const targetMatches = group.filter((concept) => target.concepts.has(concept));

    if (sourceMatches.length === 0 || targetMatches.length === 0) {
      continue;
    }

    const targetSet = new Set(targetMatches);
    const overlap = sourceMatches.filter((concept) => targetSet.has(concept));

    if (overlap.length > 0) {
      continue;
    }

    reasons.push({
      code: 'concept-conflict',
      message: `Конфликт понятий: ${sourceMatches.join(', ')} ↔ ${targetMatches.join(', ')}`,
    });
  }

  return {
    hard: reasons.length > 0,
    reasons,
  };
}

export function hasAverageWorkingPowerSubtype(source: CanonicalLabel): boolean {
  return source.concepts.has('AVERAGE') && source.concepts.has('WORKING') && source.concepts.has('POWER');
}

export function hasConsumptionPowerSubtype(target: CanonicalLabel): boolean {
  return target.concepts.has('CONSUMPTION') && target.concepts.has('POWER');
}

export function hasMotorPowerSubtype(source: CanonicalLabel): boolean {
  return source.concepts.has('MOTOR') && source.concepts.has('POWER');
}
