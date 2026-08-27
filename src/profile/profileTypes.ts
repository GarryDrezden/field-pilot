import type { FormElementType } from '../shared/types/form';

export const STORAGE_SCHEMA_VERSION = 2;
export const PROFILE_EXPORT_FORMAT = 'fieldpilot-profile';
export const PROFILE_EXPORT_VERSION = 2;

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
  sourceOrder?: number;
  sourceIndex?: number;
}

export interface PropertyPageMapping {
  propertyId: string;
  fieldSignature: PageFieldSignature;
  source: 'manual' | 'exact-label' | 'exact-alias';
  createdAt: string;
  updatedAt?: string;
}

export interface LearnedDocumentMapping {
  id: string;
  sourceLabel: string;
  normalizedSourceLabel: string;
  sourceUnit?: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  properties: ProfileProperty[];
  mappings: PropertyPageMapping[];
  learnedMappings: LearnedDocumentMapping[];
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
  sourceOrder?: number;
  sourceIndex?: number;
}

export interface ImportValidationReport {
  totalRows: number;
  valid: number;
  missingName: number;
  missingExternalId: number;
  duplicateExternalIds: number;
  duplicateNames: number;
  duplicateExternalIdList: string[];
}

export interface CatalogMergeReport {
  added: number;
  updated: number;
  unchanged: number;
  conflicts: number;
  missingFromImport: number;
  invalid: number;
}

export interface CatalogMergeResult {
  properties: ProfileProperty[];
  report: CatalogMergeReport;
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
  linkedCount: number;
  exactLabelCount: number;
  exactAliasCount: number;
  manualCount: number;
  ambiguousCount: number;
  notOnPageCount: number;
  rows: PropertyMappingRow[];
}
