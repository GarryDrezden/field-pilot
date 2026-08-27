import { useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';

interface ProfileManagePanelProps {
  onBack: () => void;
}

export function ProfileManagePanel({ onBack }: ProfileManagePanelProps) {
  const { profiles, activeProfile, createProfile, renameProfile, deleteProfile, exportActiveProfile } =
    useProfiles();
  const [renameValue, setRenameValue] = useState(activeProfile?.name ?? '');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRename(): Promise<void> {
    if (!activeProfile || !renameValue.trim()) {
      return;
    }
    await renameProfile(activeProfile.id, renameValue.trim());
    setMessage('Профиль переименован.');
  }

  async function handleDelete(profileId: string): Promise<void> {
    await deleteProfile(profileId);
    setPendingDeleteId(null);
    setMessage('Профиль удалён.');
  }

  async function handleExport(): Promise<void> {
    try {
      const json = await exportActiveProfile();
      await navigator.clipboard.writeText(json);
      setMessage('JSON профиля скопирован в буфер обмена.');
      setError(null);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Не удалось экспортировать профиль.');
    }
  }

  return (
    <section className="fp-section">
      <div className="fp-section-header">
        <h2>Управление профилями</h2>
        <button type="button" className="fp-link-button" onClick={onBack}>
          ← Назад
        </button>
      </div>

      {message && <p className="fp-status is-ready">{message}</p>}
      {error && <p className="fp-status is-error">{error}</p>}

      <ul className="fp-simple-list">
        {profiles.map((profile) => (
          <li key={profile.id}>
            {profile.name} · {profile.properties.length} свойств
          </li>
        ))}
      </ul>

      {activeProfile && (
        <>
          <div className="fp-inline-form">
            <input
              className="fp-input"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
            <button type="button" className="fp-button fp-button-secondary" onClick={() => void handleRename()}>
              Переименовать
            </button>
          </div>

          <button type="button" className="fp-button fp-button-secondary" onClick={() => void handleExport()}>
            Экспорт JSON
          </button>

          {pendingDeleteId === activeProfile.id ? (
            <div className="fp-inline-form">
              <span>Удалить «{activeProfile.name}»?</span>
              <button
                type="button"
                className="fp-button"
                onClick={() => void handleDelete(activeProfile.id)}
              >
                Да, удалить
              </button>
              <button
                type="button"
                className="fp-button fp-button-secondary"
                onClick={() => setPendingDeleteId(null)}
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="fp-button fp-button-secondary"
              onClick={() => setPendingDeleteId(activeProfile.id)}
            >
              Удалить профиль
            </button>
          )}
        </>
      )}

      {!profiles.length && (
        <button
          type="button"
          className="fp-button"
          onClick={() => void createProfile('Новый профиль')}
        >
          Создать первый профиль
        </button>
      )}
    </section>
  );
}
