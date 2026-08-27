import { sanitizeImportedLearnedMappings } from '../learning/learnedMappings';
import type {
  FieldProfile,
  ImportedPropertyDraft,
  LearnedDocumentMapping,
  ProfileProperty,
  PropertyPageMapping,
} from './profileTypes';
import {
  PROFILE_EXPORT_FORMAT,
  PROFILE_EXPORT_VERSION,
  STORAGE_SCHEMA_VERSION,
} from './profileTypes';

export interface ProfileExportPayload {
  format: typeof PROFILE_EXPORT_FORMAT;
  version: typeof PROFILE_EXPORT_VERSION;
  exportedAt: string;
  profile: {
    name: string;
    properties: Array<{
      id: string;
      name: string;
      externalId?: string;
      unit?: string;
      aliases: string[];
      sourceOrder?: number;
      sourceIndex?: number;
    }>;
    mappings: PropertyPageMapping[];
    learnedMappings?: LearnedDocumentMapping[];
  };
}

export function exportProfile(profile: FieldProfile): ProfileExportPayload {
  return {
    format: PROFILE_EXPORT_FORMAT,
    version: PROFILE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: {
      name: profile.name,
      properties: profile.properties.map((property) => ({
        id: property.id,
        name: property.name,
        externalId: property.externalId,
        unit: property.unit,
        aliases: property.aliases,
        sourceOrder: property.sourceOrder,
        sourceIndex: property.sourceIndex,
      })),
      mappings: profile.mappings,
      learnedMappings: profile.learnedMappings,
    },
  };
}

export function serializeProfileExport(profile: FieldProfile): string {
  return JSON.stringify(exportProfile(profile), null, 2);
}

export interface ImportedProfileBundle {
  name: string;
  properties: Array<ImportedPropertyDraft & { id?: string }>;
  mappings: PropertyPageMapping[];
  learnedMappings: LearnedDocumentMapping[];
}

export function parseProfileExport(raw: unknown): ImportedProfileBundle {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Некорректный JSON профиля.');
  }

  const payload = raw as Partial<ProfileExportPayload> & {
    name?: string;
    properties?: unknown;
    mappings?: unknown;
  };

  if (payload.format === PROFILE_EXPORT_FORMAT && payload.profile) {
    return {
      name: payload.profile.name,
      properties: payload.profile.properties.map((property) => ({
        id: property.id,
        name: property.name,
        externalId: property.externalId,
        unit: property.unit,
        aliases: property.aliases ?? [],
        sourceOrder: property.sourceOrder,
        sourceIndex: property.sourceIndex,
      })),
      mappings: payload.profile.mappings ?? [],
      learnedMappings: payload.profile.learnedMappings ?? [],
    };
  }

  if (typeof payload.name === 'string' && Array.isArray(payload.properties)) {
    return {
      name: payload.name,
      properties: (payload.properties as Array<ImportedPropertyDraft & { id?: string }>).map((property) => ({
        ...property,
        aliases: property.aliases ?? [],
      })),
      mappings: Array.isArray(payload.mappings) ? (payload.mappings as PropertyPageMapping[]) : [],
      learnedMappings: Array.isArray((payload as { learnedMappings?: unknown }).learnedMappings)
        ? ((payload as { learnedMappings: LearnedDocumentMapping[] }).learnedMappings ?? [])
        : [],
    };
  }

  throw new Error('Файл не похож на экспорт FieldPilot.');
}

export function buildProfileFromImport(
  bundle: ImportedProfileBundle,
  createId: () => string,
): FieldProfile {
  const now = new Date().toISOString();
  const propertyIdMap = new Map<string, string>();

  const properties: ProfileProperty[] = bundle.properties.map((draft) => {
    const id = createId();
    if (draft.id) {
      propertyIdMap.set(draft.id, id);
    }
    propertyIdMap.set(draft.name, id);
    return {
      id,
      name: draft.name,
      externalId: draft.externalId,
      unit: draft.unit,
      aliases: draft.aliases ?? [],
      sourceOrder: draft.sourceOrder,
      sourceIndex: draft.sourceIndex,
    };
  });

  const mappings = bundle.mappings
    .map((mapping) => {
      const nextPropertyId = propertyIdMap.get(mapping.propertyId);
      if (!nextPropertyId) {
        return null;
      }
      return {
        ...mapping,
        propertyId: nextPropertyId,
      };
    })
    .filter((mapping): mapping is PropertyPageMapping => mapping !== null);

  const learnedMappings = sanitizeImportedLearnedMappings(
    bundle.learnedMappings.map((mapping) => ({
      ...mapping,
      propertyId: propertyIdMap.get(mapping.propertyId) ?? mapping.propertyId,
    })),
    properties,
  );

  return {
    id: createId(),
    name: bundle.name,
    createdAt: now,
    updatedAt: now,
    properties,
    mappings,
    learnedMappings,
  };
}

export const CURRENT_STORAGE_SCHEMA = STORAGE_SCHEMA_VERSION;
