import { useRef, useState } from 'react';
import {
  inferColumnMapping,
  mapTableToDrafts,
  previewCatalogMerge,
  parseDelimitedText,
  parseImportFileContent,
  parseTxtImport,
  validateImportDrafts,
  type ColumnMapping,
  type ParsedTable,
} from '../../profile/profileImport';
import { parseXlsxFile, rebuildXlsxPreview } from '../../profile/profileXlsxImport';
import type { CatalogMergeReport, ImportValidationReport } from '../../profile/profileTypes';
import { useProfiles } from '../hooks/useProfiles';

interface ProfileImportPanelProps {
  onBack: () => void;
}

interface ImportPreviewState {
  fileName: string;
  sheetName?: string;
  sheetNames?: string[];
  tableHeaders: string[];
  drafts: ReturnType<typeof parseTxtImport>;
  mapping: ColumnMapping;
  validation: ImportValidationReport;
  mergePreview: CatalogMergeReport | null;
  xlsxBuffer?: ArrayBuffer;
}

const COLUMN_LABELS: Array<{ key: keyof ColumnMapping; label: string; required?: boolean }> = [
  { key: 'name', label: 'Название свойства', required: true },
  { key: 'externalId', label: 'External ID' },
  { key: 'sourceOrder', label: 'Порядок' },
  { key: 'sourceIndex', label: '№' },
  { key: 'unit', label: 'Единица' },
  { key: 'aliases', label: 'Алиасы' },
];

function headerLabel(headers: string[], index: number | undefined): string {
  if (index === undefined || index < 0) {
    return '—';
  }
  return headers[index] || `Колонка ${index + 1}`;
}

export function ProfileImportPanel({ onBack }: ProfileImportPanelProps) {
  const { activeProfile, importProperties, importProfileJson, createProfile, refreshProfiles } = useProfiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMapping, setManualMapping] = useState<ColumnMapping | null>(null);
  const [manualTable, setManualTable] = useState<ParsedTable | null>(null);
  const [manualMeta, setManualMeta] = useState<{ fileName: string; sheetName?: string; sheetNames?: string[]; xlsxBuffer?: ArrayBuffer } | null>(null);
  const [preview, setPreview] = useState<ImportPreviewState | null>(null);
  const [newProfileName, setNewProfileName] = useState('');

  function filterValidDrafts(
    drafts: ReturnType<typeof parseTxtImport>,
    validation: ImportValidationReport,
  ): ReturnType<typeof parseTxtImport> {
    return drafts.filter(
      (draft) =>
        draft.name.trim().length > 0 &&
        (!draft.externalId || !validation.duplicateExternalIdList.includes(draft.externalId)),
    );
  }

  async function buildPreview(
    fileName: string,
    tableHeaders: string[],
    drafts: ReturnType<typeof parseTxtImport>,
    mapping: ColumnMapping,
    extra?: Partial<ImportPreviewState>,
  ): Promise<void> {
    const validation = validateImportDrafts(drafts);
    const validDrafts = filterValidDrafts(drafts, validation);
    const mergePreview = activeProfile
      ? previewCatalogMerge(activeProfile.properties, validDrafts, () => 'preview-id').report
      : null;

    setPreview({
      fileName,
      tableHeaders,
      drafts: validDrafts,
      mapping,
      validation,
      mergePreview,
      ...extra,
    });
    setManualMapping(null);
    setManualTable(null);
    setManualMeta(null);
    setError(null);
  }

  async function handleFile(file: File): Promise<void> {
    setMessage(null);
    setError(null);
    setPreview(null);
    setManualMapping(null);
    setManualTable(null);
    setManualMeta(null);

    try {
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.json')) {
        const content = await file.text();
        if (content.includes('"format":"fieldpilot-profile"') || content.includes('"format": "fieldpilot-profile"')) {
          await importProfileJson(JSON.parse(content) as unknown);
          setMessage('Экспорт FieldPilot импортирован как новый профиль.');
          return;
        }

        const drafts = parseImportFileContent(file.name, content);
        const mapping = inferColumnMapping(['name', 'externalId']) ?? { name: 0 };
        await buildPreview(file.name, ['name'], drafts, mapping);
        return;
      }

      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const xlsx = await parseXlsxFile(file);

        if (!xlsx.mapping) {
          setManualTable(xlsx.table);
          setManualMapping({ name: 0, externalId: xlsx.table.headers.length > 1 ? 1 : undefined });
          setManualMeta({ fileName: file.name, sheetName: xlsx.selectedSheet, sheetNames: xlsx.sheetNames, xlsxBuffer: buffer });
          setMessage('Выберите соответствие колонок для импорта.');
          return;
        }

        await buildPreview(file.name, xlsx.table.headers, xlsx.drafts, xlsx.mapping, {
          sheetName: xlsx.selectedSheet,
          sheetNames: xlsx.sheetNames,
          xlsxBuffer: buffer,
        });
        return;
      }

      const content = await file.text();
      const table = parseDelimitedText(content);
      const mapping = inferColumnMapping(table.headers);
      if (!mapping && table.headers.length > 1) {
        setManualTable(table);
        setManualMapping({ name: 0, externalId: 1 });
        setManualMeta({ fileName: file.name });
        setMessage('Выберите соответствие колонок для импорта.');
        return;
      }

      const drafts =
        mapping && table.headers.length > 1
          ? mapTableToDrafts(table, mapping)
          : parseTxtImport(content);
      await buildPreview(file.name, table.headers.length ? table.headers : ['name'], drafts, mapping ?? { name: 0 });
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Ошибка чтения файла.');
    }
  }

  async function confirmManualMapping(): Promise<void> {
    if (!manualMapping || manualMapping.name === undefined) {
      setError('Укажите колонку названия свойства.');
      return;
    }

    try {
      if (manualMeta?.xlsxBuffer && manualMeta.sheetName) {
        const rebuilt = rebuildXlsxPreview(manualMeta.xlsxBuffer, manualMeta.sheetName, manualMapping);
        await buildPreview(manualMeta.fileName, rebuilt.table.headers, rebuilt.drafts, manualMapping, {
          sheetName: manualMeta.sheetName,
          sheetNames: manualMeta.sheetNames,
          xlsxBuffer: manualMeta.xlsxBuffer,
        });
        return;
      }

      if (manualTable) {
        const drafts = mapTableToDrafts(manualTable, manualMapping);
        await buildPreview(manualMeta?.fileName ?? 'table.csv', manualTable.headers, drafts, manualMapping);
      }
    } catch (mappingError) {
      setError(mappingError instanceof Error ? mappingError.message : 'Ошибка разбора таблицы.');
    }
  }

  async function changeXlsxSheet(sheetName: string): Promise<void> {
    if (!preview?.xlsxBuffer) {
      return;
    }
    const rebuilt = rebuildXlsxPreview(preview.xlsxBuffer, sheetName, preview.mapping);
    await buildPreview(preview.fileName, rebuilt.table.headers, rebuilt.drafts, preview.mapping, {
      sheetName,
      sheetNames: preview.sheetNames,
      xlsxBuffer: preview.xlsxBuffer,
    });
  }

  async function confirmImport(): Promise<void> {
    if (!preview || preview.drafts.length === 0) {
      setError('Нет данных для импорта.');
      return;
    }

    try {
      let profileId = activeProfile?.id;
      if (!profileId) {
        if (!newProfileName.trim()) {
          setError('Укажите название нового профиля.');
          return;
        }
        const created = await createProfile(newProfileName.trim());
        profileId = created.id;
      }

      const result = await importProperties(profileId, preview.drafts);
      setMessage(
        `Добавлено: ${result.added}. Обновлено: ${result.updated}. Без изменений: ${result.unchanged}. Конфликтов: ${result.conflicts}. Нет в новой выгрузке: ${result.missingFromImport}.`,
      );
      setPreview(null);
      setPasteText('');
      await refreshProfiles();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Ошибка импорта.');
    }
  }

  async function importPasteList(): Promise<void> {
    const drafts = parseTxtImport(pasteText);
    await buildPreview('paste.txt', ['name'], drafts, { name: 0 });
  }

  const mappingHeaders = manualTable?.headers ?? preview?.tableHeaders ?? [];

  return (
    <section className="fp-section">
      <div className="fp-section-header">
        <h2>Импорт каталога</h2>
        <button type="button" className="fp-link-button" onClick={onBack}>
          ← Назад
        </button>
      </div>

      <p className="fp-empty">Поддерживаются XLSX, JSON, CSV, TSV и простой список строк.</p>

      {!activeProfile && (
        <div className="fp-inline-form">
          <input
            className="fp-input"
            placeholder="Название нового профиля"
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
          />
        </div>
      )}

      <button type="button" className="fp-button fp-button-secondary" onClick={() => fileInputRef.current?.click()}>
        Выбрать файл
      </button>
      <input
        ref={fileInputRef}
        className="fp-hidden-input"
        type="file"
        accept=".xlsx,.xls,.json,.csv,.tsv,.txt"
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
        rows={6}
        value={pasteText}
        onChange={(event) => setPasteText(event.target.value)}
        placeholder={'Вес, кг\nДлина, мм\nМощность двигателя, кВт'}
      />
      <button
        type="button"
        className="fp-button fp-button-secondary"
        onClick={() => void importPasteList()}
        disabled={!pasteText.trim()}
      >
        Предпросмотр списка
      </button>

      {manualMapping && mappingHeaders.length > 0 && (
        <div className="fp-import-mapping">
          <p className="fp-status">Выберите колонки:</p>
          {COLUMN_LABELS.map(({ key, label, required }) => (
            <label key={key}>
              {label}
              <select
                className="fp-select"
                value={manualMapping[key] ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setManualMapping({
                    ...manualMapping,
                    [key]: value === '' ? undefined : Number(value),
                  });
                }}
              >
                {!required && <option value="">—</option>}
                {mappingHeaders.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>
                    {header || `Колонка ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button type="button" className="fp-button" onClick={() => void confirmManualMapping()}>
            Продолжить
          </button>
        </div>
      )}

      {preview && (
        <div className="fp-import-preview">
          <p className="fp-status">Файл: {preview.fileName}</p>
          {preview.sheetName && <p className="fp-status">Лист: {preview.sheetName}</p>}
          {preview.sheetNames && preview.sheetNames.length > 1 && (
            <label>
              Лист
              <select
                className="fp-select"
                value={preview.sheetName}
                onChange={(event) => void changeXlsxSheet(event.target.value)}
              >
                {preview.sheetNames.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="fp-status">Строк данных: {preview.validation.totalRows}</p>
          <p className="fp-status">Название: {headerLabel(preview.tableHeaders, preview.mapping.name)}</p>
          <p className="fp-status">External ID: {headerLabel(preview.tableHeaders, preview.mapping.externalId)}</p>
          <p className="fp-status">Порядок: {headerLabel(preview.tableHeaders, preview.mapping.sourceOrder)}</p>
          <div className="fp-import-stats">
            <div>Валидных: {preview.validation.valid}</div>
            <div>Без названия: {preview.validation.missingName}</div>
            <div>Без externalId: {preview.validation.missingExternalId}</div>
            <div>Повторяющихся externalId: {preview.validation.duplicateExternalIds}</div>
            <div>Одинаковых названий: {preview.validation.duplicateNames}</div>
          </div>
          {preview.mergePreview && (
            <div className="fp-import-stats">
              <div>Добавится: {preview.mergePreview.added}</div>
              <div>Обновится: {preview.mergePreview.updated}</div>
              <div>Без изменений: {preview.mergePreview.unchanged}</div>
              <div>Конфликтов: {preview.mergePreview.conflicts}</div>
              <div>Нет в новой выгрузке: {preview.mergePreview.missingFromImport}</div>
            </div>
          )}
          <button type="button" className="fp-button" onClick={() => void confirmImport()} disabled={preview.drafts.length === 0}>
            Импортировать ({preview.drafts.length})
          </button>
        </div>
      )}

      {message && <p className="fp-status is-ready">{message}</p>}
      {error && <p className="fp-status is-error">{error}</p>}
    </section>
  );
}
