import { createContext } from 'react';
import type { ImportedPropertyDraft } from '../../profile/profileTypes';
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
  importProperties: (
    profileId: string,
    drafts: ImportedPropertyDraft[],
  ) => Promise<{ added: number; duplicates: number; invalid: number }>;
  importProfileJson: (raw: unknown) => Promise<FieldProfile>;
  exportActiveProfile: () => Promise<string>;
  saveMapping: (
    propertyId: string,
    field: Parameters<typeof profileStorage.savePropertyMapping>[2],
  ) => Promise<void>;
  removeMapping: (propertyId: string) => Promise<void>;
  addProperty: (draft: ImportedPropertyDraft) => Promise<void>;
  updateProperty: (
    propertyId: string,
    patch: Partial<{ name: string; externalId: string; unit: string; aliases: string[] }>,
  ) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);
