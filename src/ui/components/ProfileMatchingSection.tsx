import { useEffect, useMemo, useState } from 'react';
import { useDocument } from '../hooks/useDocument';
import { useDocumentMatching } from '../hooks/useDocumentMatching';
import { useProfiles } from '../hooks/useProfiles';
import {
  DocumentMatchRow,
  PropertyPicker,
} from './DocumentMatchRow';
import { formatCharacteristicValue, formatSourcePreview } from './matchRowUtils';

type MatchFilter = 'all' | 'high' | 'review' | 'reject' | 'ignored';

export function ProfileMatchingSection() {
  const { extraction, matchReview, setReviewDecision, resetMatchReviewForProfile } = useDocument();
  const { activeProfile } = useProfiles();
  const { effectiveMatches, stats } = useDocumentMatching(
    extraction?.characteristics,
    activeProfile,
    matchReview,
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [pickerCharacteristicId, setPickerCharacteristicId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile?.id) {
      void resetMatchReviewForProfile(activeProfile.id);
    }
  }, [activeProfile?.id, resetMatchReviewForProfile]);

  const characteristicById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof extraction>['characteristics'][number]>();
    for (const item of extraction?.characteristics ?? []) {
      map.set(item.id, item);
    }
    return map;
  }, [extraction]);

  const propertyById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof activeProfile>['properties'][number]>();
    for (const item of activeProfile?.properties ?? []) {
      map.set(item.id, item);
    }
    return map;
  }, [activeProfile]);

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU');
    return effectiveMatches.filter((match) => {
      if (filter !== 'all' && match.effectiveLevel !== filter) {
        return false;
      }
      const characteristic = characteristicById.get(match.characteristicId);
      const property = match.effectivePropertyId
        ? propertyById.get(match.effectivePropertyId)
        : undefined;
      if (!query) {
        return true;
      }
      const haystack = `${characteristic?.sourceLabel ?? ''} ${property?.name ?? ''} ${property?.externalId ?? ''}`
        .toLocaleLowerCase('ru-RU');
      return haystack.includes(query);
    });
  }, [characteristicById, effectiveMatches, filter, propertyById, search]);

  if (!extraction) {
    return activeProfile ? (
      <section className="fp-section">
        <h2>Сопоставление с профилем</h2>
        <p className="fp-empty">Загрузите документ для сопоставления.</p>
      </section>
    ) : null;
  }

  if (!activeProfile) {
    return (
      <section className="fp-section">
        <h2>Сопоставление с профилем</h2>
        <p className="fp-empty">
          Выберите профиль, чтобы сопоставить {extraction.stats.total} характеристик с каталогом
          свойств.
        </p>
      </section>
    );
  }

  return (
    <section className="fp-section">
      <h2>Сопоставление с профилем</h2>

      <div className="fp-meta">
        <div className="fp-meta-row">
          <span className="fp-meta-label">Профиль</span>
          <span>{activeProfile.name}</span>
        </div>
        <div className="fp-meta-row">
          <span className="fp-meta-label">Характеристик</span>
          <span>{stats.total}</span>
        </div>
      </div>

      <div className="fp-match-stats">
        <span>🟢 Уверенно: {stats.high}</span>
        <span>🟡 Проверить: {stats.review}</span>
        <span>🔴 Не найдено: {stats.reject}</span>
        {stats.ignored > 0 && <span>⚪ Пропущено: {stats.ignored}</span>}
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
          onChange={(event) => setFilter(event.target.value as MatchFilter)}
        >
          <option value="all">Все</option>
          <option value="high">🟢 Уверенно</option>
          <option value="review">🟡 Проверить</option>
          <option value="reject">🔴 Не найдено</option>
          <option value="ignored">⚪ Пропущено</option>
        </select>
      </div>

      <ul className="fp-match-list">
        {filteredMatches.map((match) => {
          const characteristic = characteristicById.get(match.characteristicId);
          if (!characteristic) {
            return null;
          }
          const property = match.effectivePropertyId
            ? propertyById.get(match.effectivePropertyId)
            : undefined;
          return (
            <DocumentMatchRow
              key={match.characteristicId}
              match={match}
              characteristicLabel={characteristic.sourceLabel}
              characteristicValue={formatCharacteristicValue(characteristic)}
              characteristicLocation={
                characteristic.source.pageNumber !== undefined
                  ? `стр. ${characteristic.source.pageNumber}`
                  : null
              }
              property={property}
              sourcePreview={formatSourcePreview(characteristic)}
              sourceExpanded={expandedSourceId === match.characteristicId}
              onToggleSource={() =>
                setExpandedSourceId((current) =>
                  current === match.characteristicId ? null : match.characteristicId,
                )
              }
              onConfirm={() => {
                if (match.propertyId) {
                  void setReviewDecision(activeProfile.id, match.characteristicId, {
                    type: 'confirmed',
                    propertyId: match.propertyId,
                  });
                }
              }}
              onManual={() => setPickerCharacteristicId(match.characteristicId)}
              onIgnore={() =>
                void setReviewDecision(activeProfile.id, match.characteristicId, { type: 'ignored' })
              }
            />
          );
        })}
      </ul>

      {filteredMatches.length === 0 && <p className="fp-empty">Ничего не найдено по фильтру.</p>}

      {pickerCharacteristicId && (
        <PropertyPicker
          properties={activeProfile.properties}
          onClose={() => setPickerCharacteristicId(null)}
          onSelect={(propertyId) => {
            void setReviewDecision(activeProfile.id, pickerCharacteristicId, {
              type: 'manual',
              propertyId,
            });
            setPickerCharacteristicId(null);
          }}
        />
      )}
    </section>
  );
}
