import { buildFieldSignature } from './fieldSignature';
import type {
  CatalogMergeReport,
  FieldProfile,
  ImportedPropertyDraft,
  ProfileProperty,
  PropertyPageMapping,
} from './profileTypes';
import { EMPTY_STORAGE_STATE, STORAGE_SCHEMA_VERSION } from './profileTypes';
import { buildProfileFromImport, parseProfileExport, serializeProfileExport } from './profileExport';
import { mergeCatalogIntoProfile, mergeImportedProperties } from './profileImport';

const STORAGE_KEY = 'fieldpilot_profiles';

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readState(): Promise<import('./profileTypes').ProfileStorageState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as import('./profileTypes').ProfileStorageState | undefined;
  if (!raw) {
    return { ...EMPTY_STORAGE_STATE };
  }

  if (raw.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      activeProfileId: raw.activeProfileId ?? null,
      profiles: raw.profiles ?? [],
    };
  }

  return raw;
}

async function writeState(state: import('./profileTypes').ProfileStorageState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function touchProfile(profile: FieldProfile): FieldProfile {
  return {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
}

export async function getProfiles(): Promise<FieldProfile[]> {
  const state = await readState();
  return state.profiles;
}

export async function getProfile(id: string): Promise<FieldProfile | null> {
  const state = await readState();
  return state.profiles.find((profile) => profile.id === id) ?? null;
}

export async function getActiveProfile(): Promise<FieldProfile | null> {
  const state = await readState();
  if (!state.activeProfileId) {
    return null;
  }
  return state.profiles.find((profile) => profile.id === state.activeProfileId) ?? null;
}

export async function setActiveProfile(id: string | null): Promise<void> {
  const state = await readState();
  if (id && !state.profiles.some((profile) => profile.id === id)) {
    throw new Error('Профиль не найден.');
  }
  await writeState({ ...state, activeProfileId: id });
}

export async function createProfile(name: string): Promise<FieldProfile> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Укажите название профиля.');
  }

  const now = new Date().toISOString();
  const profile: FieldProfile = {
    id: createId(),
    name: trimmed,
    createdAt: now,
    updatedAt: now,
    properties: [],
    mappings: [],
  };

  const state = await readState();
  const nextState = {
    ...state,
    profiles: [...state.profiles, profile],
    activeProfileId: state.activeProfileId ?? profile.id,
  };
  await writeState(nextState);
  return profile;
}

export async function renameProfile(id: string, name: string): Promise<FieldProfile> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Укажите название профиля.');
  }

  const state = await readState();
  const profiles = state.profiles.map((profile) =>
    profile.id === id ? touchProfile({ ...profile, name: trimmed }) : profile,
  );
  const updated = profiles.find((profile) => profile.id === id);
  if (!updated) {
    throw new Error('Профиль не найден.');
  }
  await writeState({ ...state, profiles });
  return updated;
}

export async function deleteProfile(id: string): Promise<void> {
  const state = await readState();
  const profiles = state.profiles.filter((profile) => profile.id !== id);
  const activeProfileId =
    state.activeProfileId === id ? profiles[0]?.id ?? null : state.activeProfileId;
  await writeState({ ...state, profiles, activeProfileId });
}

export async function updateProfile(profile: FieldProfile): Promise<FieldProfile> {
  const state = await readState();
  const profiles = state.profiles.map((item) =>
    item.id === profile.id ? touchProfile(profile) : item,
  );
  if (!profiles.some((item) => item.id === profile.id)) {
    throw new Error('Профиль не найден.');
  }
  await writeState({ ...state, profiles });
  return touchProfile(profile);
}

export async function addProperty(profileId: string, draft: ImportedPropertyDraft): Promise<FieldProfile> {
  const profile = await getProfile(profileId);
  if (!profile) {
    throw new Error('Профиль не найден.');
  }

  if (draft.externalId) {
    const duplicate = profile.properties.find((property) => property.externalId === draft.externalId);
    if (duplicate) {
      throw new Error('Свойство с таким externalId уже есть в профиле.');
    }
  }

  const mergeResult = mergeImportedProperties(profile.properties, [draft], createId);
  if (mergeResult.report.added === 0) {
    throw new Error('Такое свойство уже есть в профиле.');
  }

  return updateProfile({
    ...profile,
    properties: mergeResult.properties,
  });
}

export async function updateProperty(
  profileId: string,
  propertyId: string,
  patch: Partial<Omit<ProfileProperty, 'id'>>,
): Promise<FieldProfile> {
  const profile = await getProfile(profileId);
  if (!profile) {
    throw new Error('Профиль не найден.');
  }

  const properties = profile.properties.map((property) =>
    property.id === propertyId ? { ...property, ...patch, id: property.id } : property,
  );

  return updateProfile({ ...profile, properties });
}

export async function deleteProperty(profileId: string, propertyId: string): Promise<FieldProfile> {
  const profile = await getProfile(profileId);
  if (!profile) {
    throw new Error('Профиль не найден.');
  }

  return updateProfile({
    ...profile,
    properties: profile.properties.filter((property) => property.id !== propertyId),
    mappings: profile.mappings.filter((mapping) => mapping.propertyId !== propertyId),
  });
}

export async function importPropertiesIntoProfile(
  profileId: string,
  drafts: ImportedPropertyDraft[],
): Promise<{ profile: FieldProfile; report: CatalogMergeReport }> {
  const profile = await getProfile(profileId);
  if (!profile) {
    throw new Error('Профиль не найден.');
  }

  const mergeResult = mergeCatalogIntoProfile(profile.properties, drafts, createId);
  const updated = await updateProfile({
    ...profile,
    properties: mergeResult.properties,
  });

  return { profile: updated, report: mergeResult.report };
}

export async function savePropertyMapping(
  profileId: string,
  propertyId: string,
  field: Parameters<typeof buildFieldSignature>[0],
  source: PropertyPageMapping['source'] = 'manual',
): Promise<FieldProfile> {
  const profile = await getProfile(profileId);
  if (!profile) {
    throw new Error('Профиль не найден.');
  }

  const now = new Date().toISOString();
  const existing = profile.mappings.find((item) => item.propertyId === propertyId);
  const mapping: PropertyPageMapping = {
    propertyId,
    fieldSignature: buildFieldSignature(field),
    source,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const mappings = [
    ...profile.mappings.filter((item) => item.propertyId !== propertyId),
    mapping,
  ];

  return updateProfile({ ...profile, mappings });
}

export async function removePropertyMapping(profileId: string, propertyId: string): Promise<FieldProfile> {
  const profile = await getProfile(profileId);
  if (!profile) {
    throw new Error('Профиль не найден.');
  }

  return updateProfile({
    ...profile,
    mappings: profile.mappings.filter((mapping) => mapping.propertyId !== propertyId),
  });
}

export async function importProfileFromJson(raw: unknown): Promise<FieldProfile> {
  const bundle = parseProfileExport(raw);
  const profile = buildProfileFromImport(bundle, createId);
  const state = await readState();
  const existingIds = new Set(state.profiles.map((item) => item.id));
  const safeProfile = existingIds.has(profile.id) ? { ...profile, id: createId() } : profile;

  await writeState({
    ...state,
    profiles: [...state.profiles, safeProfile],
    activeProfileId: state.activeProfileId ?? safeProfile.id,
  });

  return safeProfile;
}

export async function exportProfileById(profileId: string): Promise<string> {
  const profile = await getProfile(profileId);
  if (!profile) {
    throw new Error('Профиль не найден.');
  }
  return serializeProfileExport(profile);
}

export async function createProfileFromCatalog(
  name: string,
  drafts: ImportedPropertyDraft[],
): Promise<{ profile: FieldProfile; report: CatalogMergeReport }> {
  const profile = await createProfile(name);
  return importPropertiesIntoProfile(profile.id, drafts);
}
