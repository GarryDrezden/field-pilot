import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as profileStorage from '../../profile/profileStorage';
import { ProfileContext, type ProfileContextValue } from './profileContextState';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<ProfileContextValue['profiles']>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProfiles, activeProfile] = await Promise.all([
        profileStorage.getProfiles(),
        profileStorage.getActiveProfile(),
      ]);
      setProfiles(nextProfiles);
      setActiveProfileId(activeProfile?.id ?? null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Ошибка storage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const replaceProfile = (profile: ProfileContextValue['profiles'][number]) => {
    setProfiles((current) => current.map((item) => (item.id === profile.id ? profile : item)));
  };

  const value: ProfileContextValue = {
    profiles,
    activeProfile,
    loading,
    error,
    refreshProfiles,
    selectProfile: async (profileId) => {
      await profileStorage.setActiveProfile(profileId);
      setActiveProfileId(profileId);
      await refreshProfiles();
    },
    createProfile: async (name) => {
      const profile = await profileStorage.createProfile(name);
      await refreshProfiles();
      return profile;
    },
    renameProfile: async (profileId, name) => {
      const profile = await profileStorage.renameProfile(profileId, name);
      replaceProfile(profile);
    },
    deleteProfile: async (profileId) => {
      await profileStorage.deleteProfile(profileId);
      await refreshProfiles();
    },
    importProperties: async (profileId, drafts) => {
      const result = await profileStorage.importPropertiesIntoProfile(profileId, drafts);
      replaceProfile(result.profile);
      return result.report;
    },
    importProfileJson: async (raw) => {
      const profile = await profileStorage.importProfileFromJson(raw);
      await refreshProfiles();
      return profile;
    },
    exportActiveProfile: async () => {
      if (!activeProfileId) {
        throw new Error('Профиль не выбран.');
      }
      return profileStorage.exportProfileById(activeProfileId);
    },
    saveMapping: async (propertyId, field) => {
      if (!activeProfileId) {
        throw new Error('Профиль не выбран.');
      }
      const profile = await profileStorage.savePropertyMapping(activeProfileId, propertyId, field);
      replaceProfile(profile);
    },
    removeMapping: async (propertyId) => {
      if (!activeProfileId) {
        throw new Error('Профиль не выбран.');
      }
      const profile = await profileStorage.removePropertyMapping(activeProfileId, propertyId);
      replaceProfile(profile);
    },
    addProperty: async (draft) => {
      if (!activeProfileId) {
        throw new Error('Профиль не выбран.');
      }
      const profile = await profileStorage.addProperty(activeProfileId, draft);
      replaceProfile(profile);
    },
    updateProperty: async (propertyId, patch) => {
      if (!activeProfileId) {
        throw new Error('Профиль не выбран.');
      }
      const profile = await profileStorage.updateProperty(activeProfileId, propertyId, patch);
      replaceProfile(profile);
    },
    deleteProperty: async (propertyId) => {
      if (!activeProfileId) {
        throw new Error('Профиль не выбран.');
      }
      const profile = await profileStorage.deleteProperty(activeProfileId, propertyId);
      replaceProfile(profile);
    },
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
