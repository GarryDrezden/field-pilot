import { useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';

export type PanelScreen = 'main' | 'profile-manage' | 'profile-properties' | 'profile-import';

interface ProfileBarProps {
  onOpenScreen: (screen: PanelScreen) => void;
}

export function ProfileBar({ onOpenScreen }: ProfileBarProps) {
  const { activeProfile, profiles, loading, error, createProfile, selectProfile } = useProfiles();
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  async function handleCreate(): Promise<void> {
    if (!newProfileName.trim()) {
      return;
    }
    await createProfile(newProfileName.trim());
    setNewProfileName('');
    setIsCreating(false);
  }

  return (
    <section className="fp-profile-bar">
      <div className="fp-profile-bar-row">
        <span className="fp-meta-label">Профиль</span>
        <div className="fp-profile-controls">
          {profiles.length > 0 ? (
            <select
              className="fp-select"
              value={activeProfile?.id ?? ''}
              onChange={(event) => {
                void selectProfile(event.target.value || null);
              }}
              disabled={loading}
            >
              {!activeProfile && <option value="">Не выбран</option>}
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="fp-empty">Профиль не выбран</span>
          )}
          <button
            type="button"
            className="fp-button fp-button-secondary fp-icon-button"
            aria-label="Настройки профиля"
            onClick={() => onOpenScreen('profile-manage')}
          >
            ⚙
          </button>
        </div>
      </div>

      {error && <p className="fp-status is-error">{error}</p>}

      {!profiles.length && !isCreating && (
        <div className="fp-inline-form">
          <button type="button" className="fp-button fp-button-secondary" onClick={() => setIsCreating(true)}>
            Создать профиль
          </button>
          <button type="button" className="fp-button fp-button-secondary" onClick={() => onOpenScreen('profile-import')}>
            Импортировать каталог
          </button>
        </div>
      )}

      {isCreating && (
        <div className="fp-inline-form">
          <input
            className="fp-input"
            placeholder="Название профиля"
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
          />
          <button type="button" className="fp-button" onClick={() => void handleCreate()}>
            Создать
          </button>
          <button
            type="button"
            className="fp-button fp-button-secondary"
            onClick={() => {
              setIsCreating(false);
              setNewProfileName('');
            }}
          >
            Отмена
          </button>
        </div>
      )}

      {activeProfile && (
        <div className="fp-profile-links">
          <button type="button" className="fp-link-button" onClick={() => onOpenScreen('profile-properties')}>
            Свойства профиля ({activeProfile.properties.length})
          </button>
          <button type="button" className="fp-link-button" onClick={() => onOpenScreen('profile-import')}>
            Импорт
          </button>
        </div>
      )}
    </section>
  );
}
