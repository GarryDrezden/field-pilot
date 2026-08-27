import { useEffect, useMemo, useState } from 'react';
import { findLearnedMappingByLabel, isSameLearnedRule } from '../../learning/learnedMappings';
import { useDocument } from '../hooks/useDocument';
import { useDocumentMatching } from '../hooks/useDocumentMatching';
import { useProfiles } from '../hooks/useProfiles';
import {
  DocumentMatchRow,
  PropertyPicker,
} from './DocumentMatchRow';
import { LearnedMappingConflictDialog } from './LearnedMappingConflictDialog';
import { ChatGptBridgeSection } from './ChatGptBridgeSection';
import { formatCharacteristicValue, formatSourcePreview } from './matchRowUtils';
import { sortMatchesForDisplay } from '../../matching/sortMatchesForDisplay';

type MatchFilter = 'all' | 'high' | 'review' | 'reject' | 'ignored' | 'learned';

export function ProfileMatchingSection() {
  const { extraction, matchReview, setReviewDecision, resetMatchReviewForProfile } = useDocument();
  const { activeProfile, saveLearnedMapping } = useProfiles();
  const { effectiveMatches, stats } = useDocumentMatching(
    extraction?.characteristics,
    activeProfile,
    matchReview,
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [pickerCharacteristicId, setPickerCharacteristicId] = useState<string | null>(null);
  const [learnFeedback, setLearnFeedback] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<{
    characteristicId: string;
    propertyId: string;
  } | null>(null);

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
      if (filter === 'learned' && !match.learnedMatch && !match.reasons.some((r) => r.code === 'user-learned')) {
        return false;
      }
      if (filter !== 'all' && filter !== 'learned' && match.effectiveLevel !== filter) {
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

  const displayedMatches = useMemo(
    () => sortMatchesForDisplay(filteredMatches),
    [filteredMatches],
  );

  async function handleRemember(characteristicId: string, propertyId: string): Promise<void> {
    const characteristic = characteristicById.get(characteristicId);
    if (!characteristic || !activeProfile) {
      return;
    }

    const result = await saveLearnedMapping(
      {
        sourceLabel: characteristic.sourceLabel,
        rawUnit: characteristic.rawUnit,
        normalizedUnit: characteristic.normalizedUnit,
      },
      propertyId,
    );

    if (result.status === 'conflict') {
      setConflictState({ characteristicId, propertyId });
      return;
    }

    const property = propertyById.get(propertyId);
    if (result.status === 'already-saved') {
      setLearnFeedback(`Уже сохранено: ${characteristic.sourceLabel} → ${property?.name ?? propertyId}`);
    } else {
      setLearnFeedback(`✓ Соответствие сохранено: ${characteristic.sourceLabel} → ${property?.name ?? propertyId}`);
    }
  }

  async function handleReplaceConflict(): Promise<void> {
    if (!conflictState) {
      return;
    }
    const characteristic = characteristicById.get(conflictState.characteristicId);
    if (!characteristic || !activeProfile) {
      return;
    }

    const result = await saveLearnedMapping(
      {
        sourceLabel: characteristic.sourceLabel,
        rawUnit: characteristic.rawUnit,
        normalizedUnit: characteristic.normalizedUnit,
      },
      conflictState.propertyId,
      { replace: true },
    );
    setConflictState(null);
    const property = propertyById.get(conflictState.propertyId);
    if (result.status === 'updated' || result.status === 'created') {
      setLearnFeedback(`✓ Соответствие сохранено: ${characteristic.sourceLabel} → ${property?.name ?? conflictState.propertyId}`);
    }
  }

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

      {learnFeedback && <p className="fp-status is-ready">{learnFeedback}</p>}

      <ChatGptBridgeSection />

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
          <option value="learned">🟢 Запомненные</option>
        </select>
      </div>

      <ul className="fp-match-list">
        {displayedMatches.map((match) => {
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
              onRemember={
                match.effectivePropertyId
                  ? () => void handleRemember(match.characteristicId, match.effectivePropertyId!)
                  : undefined
              }
              rememberDisabled={
                Boolean(
                  match.effectivePropertyId &&
                    isSameLearnedRule(
                      activeProfile.learnedMappings,
                      characteristic.sourceLabel,
                      match.effectivePropertyId,
                    ),
                )
              }
              rememberLabel={
                match.effectivePropertyId &&
                isSameLearnedRule(
                  activeProfile.learnedMappings,
                  characteristic.sourceLabel,
                  match.effectivePropertyId,
                )
                  ? 'Уже сохранено'
                  : 'Запомнить соответствие'
              }
            />
          );
        })}
      </ul>

      {displayedMatches.length === 0 && <p className="fp-empty">Ничего не найдено по фильтру.</p>}

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

      {conflictState && activeProfile && (() => {
        const characteristic = characteristicById.get(conflictState.characteristicId);
        if (!characteristic) {
          return null;
        }
        const existing = findLearnedMappingByLabel(activeProfile.learnedMappings, characteristic.sourceLabel);
        if (!existing) {
          return null;
        }
        return (
          <LearnedMappingConflictDialog
            sourceLabel={characteristic.sourceLabel}
            existing={existing}
            existingProperty={propertyById.get(existing.propertyId)}
            newProperty={propertyById.get(conflictState.propertyId)}
            onReplace={() => void handleReplaceConflict()}
            onCancel={() => setConflictState(null)}
          />
        );
      })()}
    </section>
  );
}
