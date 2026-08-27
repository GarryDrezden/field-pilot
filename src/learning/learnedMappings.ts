import { areUnitsHardIncompatible, getCharacteristicUnit } from '../matching/inferPropertyUnit';
import { normalizePropertyLabel } from '../profile/normalizePropertyLabel';
import type { LearnedDocumentMapping, ProfileProperty } from '../profile/profileTypes';
import type { ExtractedCharacteristic } from '../extraction/types';

export type LearnedMappingSaveResult =
  | { status: 'created'; mapping: LearnedDocumentMapping }
  | { status: 'updated'; mapping: LearnedDocumentMapping }
  | { status: 'already-saved'; mapping: LearnedDocumentMapping }
  | {
      status: 'conflict';
      existing: LearnedDocumentMapping;
      requestedPropertyId: string;
    };

export function buildLearnedMappingIndex(
  mappings: LearnedDocumentMapping[],
): Map<string, LearnedDocumentMapping> {
  const index = new Map<string, LearnedDocumentMapping>();
  for (const mapping of mappings) {
    index.set(mapping.normalizedSourceLabel, mapping);
  }
  return index;
}

export function normalizeLearnedSourceLabel(sourceLabel: string): string {
  return normalizePropertyLabel(sourceLabel);
}

export function createLearnedMappingDraft(
  characteristic: Pick<ExtractedCharacteristic, 'sourceLabel' | 'rawUnit' | 'normalizedUnit'>,
  propertyId: string,
  createId: () => string,
): LearnedDocumentMapping {
  const now = new Date().toISOString();
  const sourceUnit = getCharacteristicUnit(characteristic.rawUnit, characteristic.normalizedUnit);
  return {
    id: createId(),
    sourceLabel: characteristic.sourceLabel.trim(),
    normalizedSourceLabel: normalizeLearnedSourceLabel(characteristic.sourceLabel),
    sourceUnit,
    propertyId,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateLearnedMapping(
  mapping: LearnedDocumentMapping,
  properties: ProfileProperty[],
): { valid: boolean; property?: ProfileProperty } {
  const property = properties.find((item) => item.id === mapping.propertyId);
  if (!property) {
    return { valid: false };
  }
  return { valid: true, property };
}

export function isLearnedUnitConflict(
  mapping: LearnedDocumentMapping,
  characteristic: Pick<ExtractedCharacteristic, 'rawUnit' | 'normalizedUnit'>,
): boolean {
  if (!mapping.sourceUnit) {
    return false;
  }
  const incomingUnit = getCharacteristicUnit(characteristic.rawUnit, characteristic.normalizedUnit);
  if (!incomingUnit) {
    return false;
  }
  return areUnitsHardIncompatible(mapping.sourceUnit, incomingUnit);
}

export function upsertLearnedMapping(
  mappings: LearnedDocumentMapping[],
  draft: LearnedDocumentMapping,
  replaceExisting: boolean,
): { mappings: LearnedDocumentMapping[]; result: LearnedMappingSaveResult } {
  const existing = mappings.find(
    (item) => item.normalizedSourceLabel === draft.normalizedSourceLabel,
  );

  if (!existing) {
    return {
      mappings: [...mappings, draft],
      result: { status: 'created', mapping: draft },
    };
  }

  if (existing.propertyId === draft.propertyId) {
    const updated: LearnedDocumentMapping = {
      ...existing,
      sourceLabel: draft.sourceLabel,
      sourceUnit: draft.sourceUnit,
      updatedAt: draft.updatedAt,
    };
    return {
      mappings: mappings.map((item) => (item.id === existing.id ? updated : item)),
      result: { status: 'already-saved', mapping: updated },
    };
  }

  if (!replaceExisting) {
    return {
      mappings,
      result: {
        status: 'conflict',
        existing,
        requestedPropertyId: draft.propertyId,
      },
    };
  }

  const replaced: LearnedDocumentMapping = {
    ...draft,
    id: existing.id,
    createdAt: existing.createdAt,
  };
  return {
    mappings: mappings.map((item) => (item.id === existing.id ? replaced : item)),
    result: { status: 'updated', mapping: replaced },
  };
}

export function deleteLearnedMappingById(
  mappings: LearnedDocumentMapping[],
  mappingId: string,
): LearnedDocumentMapping[] {
  return mappings.filter((item) => item.id !== mappingId);
}

export function updateLearnedMappingProperty(
  mappings: LearnedDocumentMapping[],
  mappingId: string,
  propertyId: string,
  properties: ProfileProperty[],
): { mappings: LearnedDocumentMapping[]; updated?: LearnedDocumentMapping; error?: string } {
  if (!properties.some((property) => property.id === propertyId)) {
    return { mappings, error: 'Свойство не найдено.' };
  }

  const target = mappings.find((item) => item.id === mappingId);
  if (!target) {
    return { mappings, error: 'Правило не найдено.' };
  }

  const duplicate = mappings.find(
    (item) =>
      item.id !== mappingId &&
      item.normalizedSourceLabel === target.normalizedSourceLabel &&
      item.propertyId !== propertyId,
  );
  if (duplicate) {
    return { mappings, error: 'Конфликт с другим правилом для того же термина.' };
  }

  const now = new Date().toISOString();
  const updated: LearnedDocumentMapping = {
    ...target,
    propertyId,
    updatedAt: now,
  };

  return {
    mappings: mappings.map((item) => (item.id === mappingId ? updated : item)),
    updated,
  };
}

export function sanitizeImportedLearnedMappings(
  raw: unknown,
  properties: ProfileProperty[],
): LearnedDocumentMapping[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const propertyIds = new Set(properties.map((property) => property.id));
  const output: LearnedDocumentMapping[] = [];
  const seenLabels = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Partial<LearnedDocumentMapping>;
    if (
      typeof record.id !== 'string' ||
      typeof record.sourceLabel !== 'string' ||
      typeof record.propertyId !== 'string' ||
      typeof record.createdAt !== 'string'
    ) {
      continue;
    }
    if (!propertyIds.has(record.propertyId)) {
      continue;
    }

    const normalizedSourceLabel =
      typeof record.normalizedSourceLabel === 'string' && record.normalizedSourceLabel.trim()
        ? record.normalizedSourceLabel
        : normalizeLearnedSourceLabel(record.sourceLabel);

    if (seenLabels.has(normalizedSourceLabel)) {
      continue;
    }
    seenLabels.add(normalizedSourceLabel);

    output.push({
      id: record.id,
      sourceLabel: record.sourceLabel.trim(),
      normalizedSourceLabel,
      sourceUnit: typeof record.sourceUnit === 'string' ? record.sourceUnit : undefined,
      propertyId: record.propertyId,
      createdAt: record.createdAt,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : record.createdAt,
    });
  }

  return output;
}

export function findLearnedMappingByLabel(
  mappings: LearnedDocumentMapping[],
  sourceLabel: string,
): LearnedDocumentMapping | undefined {
  const normalized = normalizeLearnedSourceLabel(sourceLabel);
  return mappings.find((item) => item.normalizedSourceLabel === normalized);
}

export function isSameLearnedRule(
  mappings: LearnedDocumentMapping[],
  sourceLabel: string,
  propertyId: string,
): boolean {
  const existing = findLearnedMappingByLabel(mappings, sourceLabel);
  return Boolean(existing && existing.propertyId === propertyId);
}
