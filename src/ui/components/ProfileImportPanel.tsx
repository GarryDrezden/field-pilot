import { useRef, useState } from 'react';
import {
  inferColumnMapping,
  mapTableToDrafts,
  mergeImportedProperties,
  parseDelimitedText,
  parseImportFileContent,
  parseTxtImport,
} from '../../profile/profileImport';
import type { ColumnMapping } from '../../profile/profileImport';
import { useProfiles } from '../hooks/useProfiles';

interface ProfileImportPanelProps {
  onBack: () => void;
}

export function ProfileImportPanel({ onBack }: ProfileImportPanelProps) {
  const { activeProfile, importProperties, importProfileJson } = useProfiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [pendingTable, setPendingTable] = useState<ReturnType<typeof parseDelimitedText> | null>(null);

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

  const profileId = activeProfile.id;
  const profileProperties = activeProfile.properties;

  async function importDrafts(drafts: ReturnType<typeof parseTxtImport>, isFullProfileJson = false): Promise<void> {
    try {
      if (isFullProfileJson) {
        await importProfileJson(JSON.parse(pasteText) as unknown);
        setMessage('Профиль импортирован как новый.');
      } else {
        const result = await importProperties(profileId, drafts);
        setMessage(`Новых: ${result.added}. Дубликатов: ${result.duplicates}.`);
      }
      setError(null);
      setPasteText('');
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Ошибка импорта.');
    }
  }

  async function handleFile(file: File): Promise<void> {
    const content = await file.text();
    if (file.name.toLowerCase().endsWith('.json') && content.includes('"format":"fieldpilot-profile"')) {
      await importProfileJson(JSON.parse(content) as unknown);
      setMessage('Экспорт FieldPilot импортирован как новый профиль.');
      return;
    }

    if (file.name.toLowerCase().endsWith('.json')) {
      const drafts = parseImportFileContent(file.name, content);
      await importDrafts(drafts);
      return;
    }

    const table = parseDelimitedText(content);
    const mapping = inferColumnMapping(table.headers);
    if (!mapping && table.headers.length > 1) {
      setPendingTable(table);
      setColumnMapping({ name: 0, externalId: 1 });
      setMessage('Выберите соответствие колонок для импорта.');
      return;
    }

    const drafts =
      mapping && table.headers.length > 1
        ? mapTableToDrafts(table, mapping)
        : parseTxtImport(content);
    await importDrafts(drafts);
  }

  async function confirmColumnImport(): Promise<void> {
    if (!pendingTable || !columnMapping) {
      return;
    }
    const drafts = mapTableToDrafts(pendingTable, columnMapping);
    const preview = mergeImportedProperties(profileProperties, drafts);
    const result = await importProperties(profileId, preview.drafts);
    setMessage(`Новых: ${result.added}. Дубликатов: ${result.duplicates}.`);
    setPendingTable(null);
  }

  return (
    <section className="fp-section">
      <div className="fp-section-header">
        <h2>Импорт свойств</h2>
        <button type="button" className="fp-link-button" onClick={onBack}>
          ← Назад
        </button>
      </div>

      <p className="fp-empty">Поддерживаются JSON, CSV, TSV и простой список строк.</p>

      <button type="button" className="fp-button fp-button-secondary" onClick={() => fileInputRef.current?.click()}>
        Выбрать файл
      </button>
      <input
        ref={fileInputRef}
        className="fp-hidden-input"
        type="file"
        accept=".json,.csv,.tsv,.txt"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.target.value = '';
        }}
      />

      <label className="fp-label" htmlFor="fp-import-text">
        Вставить список
      </label>
      <textarea
        id="fp-import-text"
        className="fp-textarea"
        rows={8}
        value={pasteText}
        onChange={(event) => setPasteText(event.target.value)}
        placeholder={'Вес, кг\nДлина, мм\nМощность двигателя, кВт'}
      />
      <button
        type="button"
        className="fp-button"
        onClick={() => void importDrafts(parseTxtImport(pasteText))}
        disabled={!pasteText.trim()}
      >
        Импортировать список
      </button>

      {pendingTable && columnMapping && (
        <div className="fp-import-mapping">
          <p className="fp-status">Выберите колонки:</p>
          <label>
            Название
            <select
              className="fp-select"
              value={columnMapping.name}
              onChange={(event) =>
                setColumnMapping({ ...columnMapping, name: Number(event.target.value) })
              }
            >
              {pendingTable.headers.map((header, index) => (
                <option key={header} value={index}>
                  {header || `Колонка ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="fp-button" onClick={() => void confirmColumnImport()}>
            Импортировать таблицу
          </button>
        </div>
      )}

      {message && <p className="fp-status is-ready">{message}</p>}
      {error && <p className="fp-status is-error">{error}</p>}
    </section>
  );
}
