import { useContext } from 'react';
import { ProfileContext, type ProfileContextValue } from '../context/profileContextState';

export function useProfiles(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfiles must be used inside ProfileProvider');
  }
  return context;
}
