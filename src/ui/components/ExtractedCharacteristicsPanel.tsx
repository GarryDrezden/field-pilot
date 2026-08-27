import { useMemo, useState } from 'react';
import type { ExtractedCharacteristic, ExtractionResult } from '../../extraction/types';

type CharacteristicFilter = 'all' | 'numeric' | 'text';

interface ExtractedCharacteristicsPanelProps {
  extraction: ExtractionResult;
}

export function ExtractedCharacteristicsPanel({ extraction }: ExtractedCharacteristicsPanelProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CharacteristicFilter>('all');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU');
    return extraction.characteristics.filter((item) => {
      if (filter === 'numeric' && item.valueKind === 'text') {
        return false;
      }
      if (filter === 'text' && item.valueKind !== 'text') {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${item.sourceLabel} ${item.rawValue} ${item.rawUnit ?? ''}`.toLocaleLowerCase('ru-RU');
      return haystack.includes(query);
    });
  }, [extraction.characteristics, search, filter]);

  return (
    <div className="fp-characteristics">
      <p className="fp-status is-ready">Найдено: {extraction.stats.total}</p>

      {extraction.warnings.length > 0 && (
        <ul className="fp-warning-list">
          {extraction.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

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
          onChange={(event) => setFilter(event.target.value as CharacteristicFilter)}
        >
          <option value="all">Все</option>
          <option value="numeric">Числовые</option>
          <option value="text">Текстовые</option>
        </select>
      </div>

      <ul className="fp-characteristic-list">
        {filtered.map((item) => (
          <li key={item.id} className="fp-characteristic-item">
            <CharacteristicRow
              item={item}
              expanded={expandedSourceId === item.id}
              onToggleSource={() =>
                setExpandedSourceId((current) => (current === item.id ? null : item.id))
              }
            />
          </li>
        ))}
      </ul>

      {filtered.length === 0 && <p className="fp-empty">Характеристики не найдены.</p>}
    </div>
  );
}

function CharacteristicRow({
  item,
  expanded,
  onToggleSource,
}: {
  item: ExtractedCharacteristic;
  expanded: boolean;
  onToggleSource: () => void;
}) {
  const unit = item.normalizedUnit ?? item.rawUnit;
  const location = formatSourceLocation(item);

  return (
    <div className="fp-characteristic-card">
      <div className="fp-characteristic-label">{item.sourceLabel}</div>
      <div className="fp-characteristic-value">
        {item.rawValue}
        {unit ? ` ${unit}` : ''}
      </div>
      {location && <div className="fp-characteristic-meta">{location}</div>}
      <button type="button" className="fp-link-button" onClick={onToggleSource}>
        {expanded ? 'Скрыть источник' : 'Источник'}
      </button>
      {expanded && (
        <pre className="fp-source-preview">{formatSourcePreview(item)}</pre>
      )}
    </div>
  );
}

function formatSourceLocation(item: ExtractedCharacteristic): string | null {
  if (item.source.pageNumber !== undefined) {
    return `стр. ${item.source.pageNumber}`;
  }
  if (item.source.tableIndex !== undefined && item.source.rowIndex !== undefined) {
    return `Таблица ${item.source.tableIndex + 1}, строка ${item.source.rowIndex + 1}`;
  }
  if (item.source.lineNumber !== undefined) {
    return `строка ${item.source.lineNumber}`;
  }
  return null;
}

function formatSourcePreview(item: ExtractedCharacteristic): string {
  const parts: string[] = [];
  if (item.source.pageNumber !== undefined) {
    parts.push(`Страница ${item.source.pageNumber}`);
  }
  if (item.source.tableIndex !== undefined && item.source.rowIndex !== undefined) {
    parts.push(`Таблица ${item.source.tableIndex + 1}, строка ${item.source.rowIndex + 1}`);
  }
  if (item.source.lineNumber !== undefined && item.source.pageNumber === undefined) {
    parts.push(`Строка ${item.source.lineNumber}`);
  }
  parts.push(`"${item.source.text}"`);
  return parts.join('\n');
}
