import { useMemo, useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import { PropertyPicker } from './DocumentMatchRow';
import type { LearnedDocumentMapping } from '../../profile/profileTypes';

interface LearnedDictionaryPanelProps {
  onBack: () => void;
}

export function LearnedDictionaryPanel({ onBack }: LearnedDictionaryPanelProps) {
  const { activeProfile, removeLearnedMapping, changeLearnedMappingProperty } = useProfiles();
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [editMappingId, setEditMappingId] = useState<string | null>(null);

  const propertyById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof activeProfile>['properties'][number]>();
    for (const property of activeProfile?.properties ?? []) {
      map.set(property.id, property);
    }
    return map;
  }, [activeProfile]);

  const filtered = useMemo(() => {
    if (!activeProfile) {
      return [];
    }
    const query = search.trim().toLocaleLowerCase('ru-RU');
    return activeProfile.learnedMappings.filter((mapping) => {
      if (!query) {
        return true;
      }
      const property = propertyById.get(mapping.propertyId);
      const haystack = `${mapping.sourceLabel} ${property?.name ?? ''} ${property?.externalId ?? ''}`
        .toLocaleLowerCase('ru-RU');
      return haystack.includes(query);
    });
  }, [activeProfile, propertyById, search]);

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

  async function handleDelete(mapping: LearnedDocumentMapping): Promise<void> {
    await removeLearnedMapping(mapping.id);
    setMessage(`Правило «${mapping.sourceLabel}» удалено.`);
  }

  return (
    <section className="fp-section">
      <div className="fp-section-header">
        <h2>Словарь соответствий</h2>
        <button type="button" className="fp-link-button" onClick={onBack}>
          ← Назад
        </button>
      </div>

      <p className="fp-status">
        Сохранённых соответствий: {activeProfile.learnedMappings.length}
      </p>

      {message && <p className="fp-status is-ready">{message}</p>}

      <input
        className="fp-input"
        placeholder="Поиск по термину, свойству или PARAM..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <ul className="fp-learned-list">
        {filtered.map((mapping) => {
          const property = propertyById.get(mapping.propertyId);
          const invalid = !property;
          return (
            <li key={mapping.id} className="fp-learned-row">
              <div className="fp-learned-source">{mapping.sourceLabel}</div>
              <div className="fp-learned-arrow">→</div>
              {property ? (
                <>
                  <div className="fp-learned-target">{property.name}</div>
                  {property.externalId && (
                    <div className="fp-property-code">{property.externalId}</div>
                  )}
                </>
              ) : (
                <div className="fp-status is-error">Свойство больше не существует</div>
              )}
              {mapping.sourceUnit && (
                <div className="fp-learned-unit">{mapping.sourceUnit}</div>
              )}
              <div className="fp-learned-actions">
                {invalid ? (
                  <>
                    <button
                      type="button"
                      className="fp-button fp-button-secondary"
                      onClick={() => setEditMappingId(mapping.id)}
                    >
                      Выбрать новое
                    </button>
                    <button
                      type="button"
                      className="fp-link-button"
                      onClick={() => void handleDelete(mapping)}
                    >
                      Удалить
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="fp-button fp-button-secondary"
                      onClick={() => setEditMappingId(mapping.id)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="fp-link-button"
                      onClick={() => void handleDelete(mapping)}
                    >
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="fp-empty">
          {activeProfile.learnedMappings.length === 0
            ? 'Пока нет сохранённых соответствий. Используйте «Запомнить соответствие» в разделе сопоставления.'
            : 'Ничего не найдено по запросу.'}
        </p>
      )}

      {editMappingId && (
        <PropertyPicker
          properties={activeProfile.properties}
          onClose={() => setEditMappingId(null)}
          onSelect={(propertyId) => {
            void changeLearnedMappingProperty(editMappingId, propertyId).then(() => {
              setEditMappingId(null);
              setMessage('Соответствие обновлено.');
            });
          }}
        />
      )}
    </section>
  );
}
