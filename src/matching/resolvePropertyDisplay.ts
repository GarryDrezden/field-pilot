import type { ProfileProperty } from '../profile/profileTypes';
import type { PropertyMatchCandidate } from './types';
import { formatConfidence } from './formatMatchReasons';

export interface PropertyDisplayLabel {
  propertyId: string;
  name: string;
  externalId?: string;
}

export interface AlternativeDisplayRow extends PropertyDisplayLabel {
  score: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isInternalPropertyId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function buildPropertiesById(properties: ProfileProperty[]): Map<string, ProfileProperty> {
  return new Map(properties.map((property) => [property.id, property]));
}

export function resolvePropertyDisplayLabel(
  propertyId: string,
  propertiesById: Map<string, ProfileProperty>,
): PropertyDisplayLabel | null {
  const property = propertiesById.get(propertyId);
  if (!property) {
    return null;
  }

  return {
    propertyId: property.id,
    name: property.name,
    externalId: property.externalId,
  };
}

export function resolveAlternativesForDisplay(
  alternatives: PropertyMatchCandidate[],
  propertiesById: Map<string, ProfileProperty>,
): AlternativeDisplayRow[] {
  const rows: AlternativeDisplayRow[] = [];

  for (const candidate of alternatives) {
    const label = resolvePropertyDisplayLabel(candidate.propertyId, propertiesById);
    if (!label) {
      continue;
    }

    rows.push({
      ...label,
      score: candidate.score,
    });
  }

  return rows;
}

export function formatPropertyReference(
  propertyId: string,
  propertiesById: Map<string, ProfileProperty>,
): string {
  const label = resolvePropertyDisplayLabel(propertyId, propertiesById);
  if (!label) {
    return 'удалённое свойство';
  }

  if (label.externalId) {
    return `${label.name} (${label.externalId})`;
  }

  return label.name;
}

export function formatAlternativeDisplayText(row: AlternativeDisplayRow): string {
  const parts = [formatConfidence(row.score), row.name];
  if (row.externalId) {
    parts.push(row.externalId);
  }
  return parts.join(' ');
}

export function alternativeDisplayContainsInternalId(text: string): boolean {
  return text.split(/\s+/).some((token) => isInternalPropertyId(token.replace(/[·,]/g, '')));
}
