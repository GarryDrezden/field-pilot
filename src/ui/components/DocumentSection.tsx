import { useRef, useState } from 'react';
import { parseDocumentFile } from '../../document/parseDocument';
import { extractCharacteristics } from '../../extraction/extractCharacteristics';
import type { ExtractionResult } from '../../extraction/types';
import type { LoadedDocument } from '../../shared/types/document';
import { detectDocumentFormat, formatFileSize } from '../../shared/utils';
import { ExtractedCharacteristicsPanel } from './ExtractedCharacteristicsPanel';
import { ExtractedTextPreview } from './ExtractedTextPreview';

const initialDocumentState: LoadedDocument = {
  fileName: '',
  format: 'pdf',
  sizeBytes: 0,
  status: 'idle',
};

export function DocumentSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [documentState, setDocumentState] = useState<LoadedDocument>(initialDocumentState);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  async function handleFile(file: File): Promise<void> {
    const format = detectDocumentFormat(file);
    if (!format) {
      setDocumentState({
        fileName: file.name,
        format: 'pdf',
        sizeBytes: file.size,
        status: 'error',
        errorMessage: 'Поддерживаются только PDF и DOCX.',
      });
      setExtraction(null);
      setExtractionError(null);
      return;
    }

    setDocumentState({
      fileName: file.name,
      format,
      sizeBytes: file.size,
      status: 'parsing',
    });
    setExtraction(null);
    setExtractionError(null);

    try {
      const result = await parseDocumentFile(file);
      setDocumentState({
        fileName: file.name,
        format,
        sizeBytes: file.size,
        status: 'ready',
        result,
      });

      try {
        setExtraction(extractCharacteristics(result));
      } catch (error) {
        setExtractionError(
          error instanceof Error ? error.message : 'Не удалось извлечь характеристики.',
        );
      }
    } catch (error) {
      setDocumentState({
        fileName: file.name,
        format,
        sizeBytes: file.size,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Не удалось разобрать документ.',
      });
      setExtraction(null);
    }
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    event.target.value = '';
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void handleFile(file);
    }
  }

  return (
    <section className="fp-section">
      <h2>Документ</h2>

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
        <input
          ref={inputRef}
          className="fp-hidden-input"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={onInputChange}
        />
      </div>

      <p className="fp-status">Поддерживаемые форматы: PDF, DOCX</p>

      {documentState.status !== 'idle' && (
        <div className="fp-meta">
          <div className="fp-meta-row">
            <span className="fp-meta-label">Имя</span>
            <span>{documentState.fileName}</span>
          </div>
          <div className="fp-meta-row">
            <span className="fp-meta-label">Формат</span>
            <span>{documentState.format.toUpperCase()}</span>
          </div>
          <div className="fp-meta-row">
            <span className="fp-meta-label">Размер</span>
            <span>{formatFileSize(documentState.sizeBytes)}</span>
          </div>
          <div className="fp-meta-row">
            <span className="fp-meta-label">Статус</span>
            <span
              className={`fp-status${
                documentState.status === 'error'
                  ? ' is-error'
                  : documentState.status === 'ready'
                    ? ' is-ready'
                    : ''
              }`}
            >
              {getStatusLabel(documentState, extraction)}
            </span>
          </div>
        </div>
      )}

      {documentState.status === 'error' && documentState.errorMessage && (
        <p className="fp-status is-error">{documentState.errorMessage}</p>
      )}

      {documentState.result?.warnings.length ? (
        <ul className="fp-warning-list">
          {documentState.result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {extractionError && <p className="fp-status is-error">{extractionError}</p>}

      {documentState.result?.fullText && (
        <ExtractedTextPreview text={documentState.result.fullText} />
      )}

      {extraction && <ExtractedCharacteristicsPanel extraction={extraction} />}
    </section>
  );
}

function getStatusLabel(documentState: LoadedDocument, extraction: ExtractionResult | null): string {
  switch (documentState.status) {
    case 'parsing':
      return 'Разбор документа…';
    case 'ready':
      if (!documentState.result?.fullText) {
        return 'Текст не найден';
      }
      if (extraction) {
        return 'Характеристики извлечены';
      }
      return 'Текст извлечён';
    case 'error':
      return 'Ошибка';
    default:
      return 'Ожидает файл';
  }
}
