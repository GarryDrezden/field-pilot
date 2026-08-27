import { findUnitInText, normalizeUnit } from '../extraction/normalizeUnit';
import type { ProfileProperty } from '../profile/profileTypes';

export function inferPropertyUnit(property: ProfileProperty): string | undefined {
  if (property.unit?.trim()) {
    return normalizeUnit(property.unit) ?? property.unit.trim();
  }

  const fromName = findUnitInText(property.name);
  return fromName?.normalizedUnit;
}

export function getCharacteristicUnit(
  rawUnit?: string,
  normalizedUnit?: string,
): string | undefined {
  if (normalizedUnit?.trim()) {
    return normalizedUnit.trim();
  }
  if (!rawUnit?.trim()) {
    return undefined;
  }
  return normalizeUnit(rawUnit) ?? rawUnit.trim();
}

export function unitsCompatible(
  left?: string,
  right?: string,
): 'match' | 'missing' | 'mismatch' {
  if (!left || !right) {
    return 'missing';
  }
  return left.toLocaleLowerCase('en-US') === right.toLocaleLowerCase('en-US') ? 'match' : 'mismatch';
}

export function areUnitsHardIncompatible(left?: string, right?: string): boolean {
  return unitsCompatible(left, right) === 'mismatch';
}
