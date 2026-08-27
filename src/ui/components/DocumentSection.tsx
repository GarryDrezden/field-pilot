import { useRef, useState } from 'react';
import { formatFileSize } from '../../shared/utils';
import { useDocument } from '../hooks/useDocument';

export function DocumentSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const {
    loading,
    sessionAvailable,
    fileMeta,
    extraction,
    status,
    errorMessage,
    extractionError,
    parseWarnings,
    loadFile,
    clearDocument,
  } = useDocument();

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) {
      void loadFile(file);
    }
    event.target.value = '';
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void loadFile(file);
    }
  }

  if (loading) {
    return (
      <section className="fp-section">
        <h2>Документ</h2>
        <p className="fp-empty">Загрузка сессии…</p>
      </section>
    );
  }

  const showDropzone = status === 'idle' || status === 'error';

  return (
    <section className="fp-section">
      <h2>Документ</h2>

      {!sessionAvailable && (
        <p className="fp-status fp-session-hint">
          Сессия документа недоступна — после перехода на другую страницу потребуется повторная загрузка.
        </p>
      )}

      {showDropzone ? (
        <>
          <div
            className={`fp-dropzone${isDragOver ? ' is-dragover' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
          >
            <p>Перетащите PDF или DOCX сюда</p>
            <button
              type="button"
              className="fp-button fp-button-secondary"
              onClick={() => inputRef.current?.click()}
            >
              Выбрать файл
            </button>
          </div>
          <p className="fp-status">Поддерживаемые форматы: PDF, DOCX</p>
        </>
      ) : (
        fileMeta && (
          <div className="fp-document-card">
            <div className="fp-document-name">{fileMeta.name}</div>
            <div className="fp-document-meta">
              {fileMeta.type.toUpperCase()}
              {fileMeta.size !== undefined ? ` · ${formatFileSize(fileMeta.size)}` : ''}
            </div>
            <ul className="fp-document-checks">
              <li className={status === 'parsing' ? '' : 'is-done'}>
                {status === 'parsing' ? 'Разбор документа…' : '✓ Текст извлечён'}
              </li>
              {extraction && (
                <li className="is-done">
                  ✓ Найдено характеристик: {extraction.stats.total}
                </li>
              )}
            </ul>
            <div className="fp-document-actions">
              <button
                type="button"
                className="fp-button fp-button-secondary"
                onClick={() => replaceInputRef.current?.click()}
                disabled={status === 'parsing'}
              >
                Заменить документ
              </button>
              <button
                type="button"
                className="fp-button fp-button-secondary"
                onClick={() => void clearDocument()}
                disabled={status === 'parsing'}
              >
                Очистить документ
              </button>
            </div>
          </div>
        )
      )}

      <input
        ref={inputRef}
        className="fp-hidden-input"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onInputChange}
      />
      <input
        ref={replaceInputRef}
        className="fp-hidden-input"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onInputChange}
      />

      {errorMessage && <p className="fp-status is-error">{errorMessage}</p>}
      {extractionError && <p className="fp-status is-error">{extractionError}</p>}

      {parseWarnings.length > 0 && (
        <ul className="fp-warning-list">
          {parseWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
