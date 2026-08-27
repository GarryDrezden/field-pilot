import { useMemo, useState } from 'react';
import type { ProfileProperty } from '../../profile/profileTypes';
import type { EffectiveDocumentMatch } from '../../matching/types';
import { formatConfidence, formatMatchReasons, isLearnedUserMatch, levelIcon } from '../../matching/formatMatchReasons';
import { resolveAlternativesForDisplay } from '../../matching/resolvePropertyDisplay';

interface PropertyPickerProps {
  properties: ProfileProperty[];
  onSelect: (propertyId: string) => void;
  onClose: () => void;
}

export function PropertyPicker({ properties, onSelect, onClose }: PropertyPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU');
    if (!query) {
      return properties.slice(0, 50);
    }
    return properties
      .filter((property) =>
        `${property.name} ${property.externalId ?? ''} ${property.aliases.join(' ')}`
          .toLocaleLowerCase('ru-RU')
          .includes(query),
      )
      .slice(0, 50);
  }, [properties, search]);

  return (
    <div className="fp-picker-overlay">
      <div className="fp-picker">
        <div className="fp-picker-header">
          <h3>Выбор свойства профиля</h3>
          <button type="button" className="fp-link-button" onClick={onClose}>
            Закрыть
          </button>
        </div>
        <input
          className="fp-input"
          placeholder="Поиск по названию, PARAM или alias..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ul className="fp-picker-list">
          {filtered.map((property) => (
            <li key={property.id}>
              <button type="button" className="fp-picker-item" onClick={() => onSelect(property.id)}>
                <span>{property.name}</span>
                {property.externalId && <span className="fp-property-code">{property.externalId}</span>}
              </button>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <p className="fp-empty">Ничего не найдено.</p>}
      </div>
    </div>
  );
}

interface DocumentMatchRowProps {
  match: EffectiveDocumentMatch;
  characteristicLabel: string;
  characteristicValue: string;
  characteristicLocation: string | null;
  property?: ProfileProperty;
  propertiesById: Map<string, ProfileProperty>;
  sourcePreview?: string;
  onConfirm: () => void;
  onManual: () => void;
  onIgnore: () => void;
  onRemember?: () => void;
  rememberDisabled?: boolean;
  rememberLabel?: string;
  onToggleSource: () => void;
  sourceExpanded: boolean;
}

export function DocumentMatchRow({
  match,
  characteristicLabel,
  characteristicValue,
  characteristicLocation,
  property,
  propertiesById,
  sourcePreview,
  onConfirm,
  onManual,
  onIgnore,
  onRemember,
  rememberDisabled,
  rememberLabel = 'Запомнить соответствие',
  onToggleSource,
  sourceExpanded,
}: DocumentMatchRowProps) {
  const reasons = formatMatchReasons(match.reasons).slice(0, 4);
  const learned = isLearnedUserMatch(match);
  const displayAlternatives = useMemo(
    () => resolveAlternativesForDisplay(match.alternatives, propertiesById),
    [match.alternatives, propertiesById],
  );

  return (
    <li className="fp-match-row">
      <div className="fp-match-row-head">
        <span className="fp-match-level">{levelIcon(match.effectiveLevel)}</span>
        {match.effectiveLevel !== 'ignored' && learned && match.effectiveLevel === 'high' && (
          <span className="fp-match-confidence fp-match-learned">Запомнено</span>
        )}
        {match.effectiveLevel !== 'ignored' && !learned && match.confidence > 0 && (
          <span className="fp-match-confidence">{formatConfidence(match.confidence)}</span>
        )}
        <span className="fp-match-doc-label">{characteristicLabel}</span>
      </div>

      {property ? (
        <>
          <div className="fp-match-property">{property.name}</div>
          {property.externalId && <div className="fp-property-code">{property.externalId}</div>}
        </>
      ) : (
        <div className="fp-match-property fp-empty">Соответствие в профиле не определено</div>
      )}

      <div className="fp-match-value">{characteristicValue}</div>
      <div className="fp-match-source-line">
        Из документа: {characteristicLabel} · {characteristicValue}
      </div>
      {characteristicLocation && <div className="fp-characteristic-meta">{characteristicLocation}</div>}

      {reasons.length > 0 && match.effectiveLevel !== 'ignored' && (
        <ul className="fp-match-reasons">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {match.conflict && <p className="fp-status is-error">{match.conflict.message}</p>}

      <div className="fp-match-actions">
        <button type="button" className="fp-link-button" onClick={onToggleSource}>
          {sourceExpanded ? 'Скрыть источник' : 'Источник'}
        </button>
        {match.effectiveLevel === 'review' && property && (
          <button type="button" className="fp-button fp-button-secondary" onClick={onConfirm}>
            Подтвердить
          </button>
        )}
        <button type="button" className="fp-button fp-button-secondary" onClick={onManual}>
          {property ? 'Изменить' : 'Выбрать свойство'}
        </button>
        {match.effectiveLevel !== 'ignored' && (
          <button type="button" className="fp-link-button" onClick={onIgnore}>
            Не использовать
          </button>
        )}
        {property && match.effectiveLevel !== 'ignored' && onRemember && (
          <button
            type="button"
            className="fp-button fp-button-secondary"
            onClick={onRemember}
            disabled={rememberDisabled}
          >
            {rememberLabel}
          </button>
        )}
      </div>

      {sourceExpanded && sourcePreview && <pre className="fp-source-preview">{sourcePreview}</pre>}

      {displayAlternatives.length > 0 && match.effectiveLevel !== 'high' && (
        <details className="fp-subsection">
          <summary>Возможные варианты ({displayAlternatives.length})</summary>
          <ul className="fp-match-alternatives">
            {displayAlternatives.map((candidate) => (
              <li key={candidate.propertyId} className="fp-match-alternative-row">
                <div className="fp-match-alternative-head">
                  <span className="fp-match-alt-score">{formatConfidence(candidate.score)}</span>
                  <span className="fp-match-alt-name">{candidate.name}</span>
                </div>
                {candidate.externalId && (
                  <div className="fp-property-code">{candidate.externalId}</div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
