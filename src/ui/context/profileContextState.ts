import { createContext } from 'react';
import type { CatalogMergeReport, ImportedPropertyDraft } from '../../profile/profileTypes';
import type { FieldProfile } from '../../profile/profileTypes';
import * as profileStorage from '../../profile/profileStorage';

export interface ProfileContextValue {
  profiles: FieldProfile[];
  activeProfile: FieldProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfiles: () => Promise<void>;
  selectProfile: (profileId: string | null) => Promise<void>;
  createProfile: (name: string) => Promise<FieldProfile>;
  renameProfile: (profileId: string, name: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  importProperties: (profileId: string, drafts: ImportedPropertyDraft[]) => Promise<CatalogMergeReport>;
  importProfileJson: (raw: unknown) => Promise<FieldProfile>;
  exportActiveProfile: () => Promise<string>;
  saveMapping: (
    propertyId: string,
    field: Parameters<typeof profileStorage.savePropertyMapping>[2],
  ) => Promise<void>;
  removeMapping: (propertyId: string) => Promise<void>;
  saveLearnedMapping: (
    characteristic: Parameters<typeof profileStorage.saveLearnedDocumentMapping>[1],
    propertyId: string,
    options?: { replace?: boolean },
  ) => Promise<import('../../learning/learnedMappings').LearnedMappingSaveResult>;
  removeLearnedMapping: (mappingId: string) => Promise<void>;
  changeLearnedMappingProperty: (mappingId: string, propertyId: string) => Promise<void>;
  addProperty: (draft: ImportedPropertyDraft) => Promise<void>;
  updateProperty: (
    propertyId: string,
    patch: Partial<{ name: string; externalId: string; unit: string; aliases: string[]; sourceOrder: number; sourceIndex: number }>,
  ) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);
