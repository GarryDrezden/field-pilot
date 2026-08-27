import { useMemo, useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';

interface ProfilePropertiesPanelProps {
  onBack: () => void;
}

export function ProfilePropertiesPanel({ onBack }: ProfilePropertiesPanelProps) {
  const { activeProfile, addProperty, updateProperty, deleteProperty } = useProfiles();
  const [search, setSearch] = useState('');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeProfile) {
      return [];
    }
    const query = search.trim().toLocaleLowerCase('ru-RU');
    if (!query) {
      return activeProfile.properties;
    }
    return activeProfile.properties.filter((property) =>
      `${property.name} ${property.externalId ?? ''} ${property.aliases.join(' ')}`
        .toLocaleLowerCase('ru-RU')
        .includes(query),
    );
  }, [activeProfile, search]);

  if (!activeProfile) {
    return (
      <section className="fp-section">
        <p className="fp-empty">Профиль не выбран.</p>
        <button type="button" className="fp-link-button" onClick={onBack}>
          ← Назад
        </button>
      </section>
    );
  }

  async function handleAddProperty(): Promise<void> {
    if (!newPropertyName.trim()) {
      return;
    }
    await addProperty({ name: newPropertyName.trim(), aliases: [] });
    setNewPropertyName('');
    setMessage('Свойство добавлено.');
  }

  return (
    <section className="fp-section">
      <div className="fp-section-header">
        <h2>Свойства профиля</h2>
        <button type="button" className="fp-link-button" onClick={onBack}>
          ← Назад
        </button>
      </div>

      <p className="fp-status">Всего свойств: {activeProfile.properties.length}</p>
      <input
        className="fp-input"
        placeholder="Поиск..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="fp-inline-form">
        <input
          className="fp-input"
          placeholder="Новое свойство"
          value={newPropertyName}
          onChange={(event) => setNewPropertyName(event.target.value)}
        />
        <button type="button" className="fp-button" onClick={() => void handleAddProperty()}>
          Добавить
        </button>
      </div>

      {message && <p className="fp-status is-ready">{message}</p>}

      <ul className="fp-property-list">
        {filtered.map((property) => (
          <li key={property.id} className="fp-property-item">
            <input
              className="fp-input"
              defaultValue={property.name}
              onBlur={(event) => {
                const next = event.target.value.trim();
                if (next && next !== property.name) {
                  void updateProperty(property.id, { name: next });
                }
              }}
            />
            <input
              className="fp-input"
              placeholder="externalId"
              defaultValue={property.externalId ?? ''}
              onBlur={(event) => {
                void updateProperty(property.id, { externalId: event.target.value.trim() || undefined });
              }}
            />
            <input
              className="fp-input"
              placeholder="unit"
              defaultValue={property.unit ?? ''}
              onBlur={(event) => {
                void updateProperty(property.id, { unit: event.target.value.trim() || undefined });
              }}
            />
            <input
              className="fp-input"
              placeholder="aliases через ;"
              defaultValue={property.aliases.join('; ')}
              onBlur={(event) => {
                void updateProperty(property.id, {
                  aliases: event.target.value
                    .split(';')
                    .map((item) => item.trim())
                    .filter(Boolean),
                });
              }}
            />
            <button
              type="button"
              className="fp-button fp-button-secondary"
              onClick={() => void deleteProperty(property.id)}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && <p className="fp-empty">Свойства не найдены.</p>}
    </section>
  );
}
