import { useMemo, useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';

interface ProfilePropertiesPanelProps {
  onBack: () => void;
}

export function ProfilePropertiesPanel({ onBack }: ProfilePropertiesPanelProps) {
  const { activeProfile, addProperty, updateProperty, deleteProperty } = useProfiles();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const mappedPropertyIds = useMemo(() => {
    if (!activeProfile) {
      return new Set<string>();
    }
    return new Set(activeProfile.mappings.map((mapping) => mapping.propertyId));
  }, [activeProfile]);

  const filtered = useMemo(() => {
    if (!activeProfile) {
      return [];
    }
    const query = search.trim().toLocaleLowerCase('ru-RU');
    return activeProfile.properties.filter((property) => {
      if (filter === 'linked' && !mappedPropertyIds.has(property.id)) {
        return false;
      }
      if (filter === 'unlinked' && mappedPropertyIds.has(property.id)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return `${property.name} ${property.externalId ?? ''} ${property.aliases.join(' ')}`
        .toLocaleLowerCase('ru-RU')
        .includes(query);
    });
  }, [activeProfile, search, filter, mappedPropertyIds]);

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

      <p className="fp-status">Свойств: {activeProfile.properties.length}</p>
      <input
        className="fp-input"
        placeholder="Поиск по названию или externalId..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        className="fp-select"
        value={filter}
        onChange={(event) => setFilter(event.target.value as 'all' | 'linked' | 'unlinked')}
      >
        <option value="all">Все</option>
        <option value="linked">Связанные</option>
        <option value="unlinked">Несвязанные</option>
      </select>

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

      <ul className="fp-property-list fp-property-list-compact">
        {filtered.map((property) => (
          <li key={property.id} className="fp-property-item-compact">
            {editingId === property.id ? (
              <div className="fp-property-edit">
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
                <button type="button" className="fp-link-button" onClick={() => setEditingId(null)}>
                  Готово
                </button>
              </div>
            ) : (
              <>
                <button type="button" className="fp-property-summary" onClick={() => setEditingId(property.id)}>
                  <span className="fp-property-name">{property.name}</span>
                  {property.externalId && <span className="fp-property-code">{property.externalId}</span>}
                  {property.sourceOrder !== undefined && (
                    <span className="fp-property-meta">sort {property.sourceOrder}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="fp-button fp-button-secondary"
                  onClick={() => void deleteProperty(property.id)}
                >
                  ×
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {filtered.length === 0 && <p className="fp-empty">Свойства не найдены.</p>}
    </section>
  );
}
