import type { FormElementType } from '../shared/types/form';

export const STORAGE_SCHEMA_VERSION = 1;
export const PROFILE_EXPORT_FORMAT = 'fieldpilot-profile';
export const PROFILE_EXPORT_VERSION = 1;

export interface PageFieldSignature {
  elementType: FormElementType;
  inputType?: string;
  normalizedLabel?: string;
  name?: string;
  id?: string;
}

export interface ProfileProperty {
  id: string;
  externalId?: string;
  name: string;
  unit?: string;
  aliases: string[];
}

export interface PropertyPageMapping {
  propertyId: string;
  fieldSignature: PageFieldSignature;
  source: 'manual' | 'exact-label';
  createdAt: string;
}

export interface FieldProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  properties: ProfileProperty[];
  mappings: PropertyPageMapping[];
}

export interface ProfileStorageState {
  schemaVersion: number;
  activeProfileId: string | null;
  profiles: FieldProfile[];
}

export const EMPTY_STORAGE_STATE: ProfileStorageState = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  activeProfileId: null,
  profiles: [],
};

export interface ImportedPropertyDraft {
  name: string;
  externalId?: string;
  unit?: string;
  aliases?: string[];
}

export interface ImportDuplicateReport {
  added: number;
  duplicates: number;
  invalid: number;
  errors: string[];
}

export type MappingFilter = 'all' | 'linked' | 'unlinked';

export type PropertyMatchSource = 'saved' | 'exact-label' | 'exact-alias' | 'none';

export interface PropertyMappingRow {
  property: ProfileProperty;
  matchSource: PropertyMatchSource;
  fieldLabel: string | null;
  fieldRuntimeId: string | null;
  fieldSignature: PageFieldSignature | null;
  isAmbiguous: boolean;
  savedMappingExists: boolean;
}

export interface ProfileMatchSummary {
  pageFieldCount: number;
  profilePropertyCount: number;
  matchedOnPageCount: number;
  savedMappingCount: number;
  needsAssignmentCount: number;
  rows: PropertyMappingRow[];
}
