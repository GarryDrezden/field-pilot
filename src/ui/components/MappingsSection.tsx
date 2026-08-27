import { useMemo, useState } from 'react';
import type { FormField } from '../../shared/types/form';
import type { MappingFilter, ProfileMatchSummary } from '../../profile/profileTypes';
import { matchProfileToFields } from '../../profile/profileMatcher';
import { useProfiles } from '../hooks/useProfiles';

interface MappingsSectionProps {
  fields: FormField[];
  compact?: boolean;
  highlightPropertyId?: string | null;
}

function matchSourceLabel(source: ProfileMatchSummary['rows'][number]['matchSource']): string {
  switch (source) {
    case 'exact-label':
      return 'Exact';
    case 'exact-alias':
      return 'Alias';
    case 'saved':
      return 'Manual';
    default:
      return '—';
  }
}

export function MappingsSection({ fields, compact = false, highlightPropertyId = null }: MappingsSectionProps) {
  const { activeProfile, saveMapping } = useProfiles();
  const [filter, setFilter] = useState<MappingFilter>('all');
  const [search, setSearch] = useState('');
  const [pendingFieldByProperty, setPendingFieldByProperty] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo<ProfileMatchSummary | null>(() => {
    if (!activeProfile || fields.length === 0) {
      return null;
    }
    return matchProfileToFields(activeProfile, fields);
  }, [activeProfile, fields]);

  const filteredRows = useMemo(() => {
    if (!summary) {
      return [];
    }

    return summary.rows.filter((row) => {
      const haystack = `${row.property.name} ${row.property.externalId ?? ''} ${row.fieldLabel ?? ''}`.toLocaleLowerCase('ru-RU');
      if (search && !haystack.includes(search.toLocaleLowerCase('ru-RU'))) {
        return false;
      }
      if (filter === 'linked') {
        return row.fieldRuntimeId !== null;
      }
      if (filter === 'unlinked') {
        return row.fieldRuntimeId === null;
      }
      return true;
    });
  }, [summary, search, filter]);

  if (!activeProfile) {
    return <p className="fp-empty">Выберите профиль, чтобы сопоставлять свойства с полями страницы.</p>;
  }

  if (activeProfile.properties.length === 0) {
    return <p className="fp-empty">Профиль пуст. Добавьте или импортируйте свойства.</p>;
  }

  if (!summary) {
    return <p className="fp-empty">Сначала просканируйте страницу.</p>;
  }

  async function rememberMapping(propertyId: string): Promise<void> {
    const runtimeId = pendingFieldByProperty[propertyId];
    const field = fields.find((item) => item.id === runtimeId);
    if (!field) {
      setMessage('Выберите поле страницы.');
      return;
    }
    await saveMapping(propertyId, field);
    setMessage('Соответствие сохранено.');
  }

  return (
    <div className="fp-mappings">
      <div className="fp-mapping-stats">
        {compact ? (
          <>
            <div>Связано на этой странице: {summary.linkedCount}</div>
            <div>Полей страницы: {summary.pageFieldCount}</div>
          </>
        ) : (
          <>
            <div>Свойств профиля: {summary.profilePropertyCount}</div>
            <div>Полей страницы: {summary.pageFieldCount}</div>
            <div>Связано: {summary.linkedCount}</div>
            <div>Exact match: {summary.exactLabelCount + summary.exactAliasCount}</div>
            <div>Manual: {summary.manualCount}</div>
            <div>Неоднозначно: {summary.ambiguousCount}</div>
          </>
        )}
      </div>

      <div className="fp-toolbar">
        <input
          className="fp-input"
          placeholder="Поиск..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="fp-select"
          value={filter}
          onChange={(event) => setFilter(event.target.value as MappingFilter)}
        >
          <option value="all">Все</option>
          <option value="linked">Связанные</option>
          <option value="unlinked">Не связанные</option>
        </select>
      </div>

      {message && <p className="fp-status is-ready">{message}</p>}

      <ul className="fp-mapping-list">
        {filteredRows.map((row) => (
          <li
            key={row.property.id}
            className={`fp-mapping-item${highlightPropertyId === row.property.id ? ' is-highlighted' : ''}`}
          >
            <div className="fp-mapping-property">
              <div>{row.property.name}</div>
              {row.property.externalId && <div className="fp-property-code">{row.property.externalId}</div>}
            </div>
            <div className="fp-mapping-arrow">→</div>
            <div className="fp-mapping-target">
              {row.fieldRuntimeId ? (
                <span>{row.fieldLabel}</span>
              ) : row.isAmbiguous ? (
                <span className="fp-status is-error">Неоднозначное сохранённое соответствие</span>
              ) : (
                <select
                  className="fp-select"
                  value={pendingFieldByProperty[row.property.id] ?? ''}
                  onChange={(event) =>
                    setPendingFieldByProperty((current) => ({
                      ...current,
                      [row.property.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Выбрать поле страницы</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                      {field.name ? ` · ${field.name}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="fp-mapping-meta">
              {row.fieldRuntimeId ? matchSourceLabel(row.matchSource) : row.isAmbiguous ? 'Ambiguous' : '—'}
            </div>
            {!row.fieldRuntimeId && !row.isAmbiguous && (
              <button
                type="button"
                className="fp-button fp-button-secondary"
                onClick={() => void rememberMapping(row.property.id)}
              >
                Запомнить
              </button>
            )}
          </li>
        ))}
      </ul>

      {filteredRows.length === 0 && <p className="fp-empty">Ничего не найдено по фильтру.</p>}
    </div>
  );
}
