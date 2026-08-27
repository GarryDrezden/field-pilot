import type { DocumentSessionPdfDiagnostics } from '../../session/types';
import type { OcrLanguagePreset } from '../../ocr/types';
import type { OcrJobUiState } from '../context/documentContextState';

interface DocumentOcrSectionProps {
  fileType: 'pdf' | 'docx' | null;
  pdfDiagnostics: DocumentSessionPdfDiagnostics | null;
  ocrJob: OcrJobUiState | null;
  ocrLanguage: OcrLanguagePreset;
  canRunOcr: boolean;
  restoredFromSession: boolean;
  onRunProblemPages: () => void;
  onCancel: () => void;
  onLanguageChange: (language: OcrLanguagePreset) => void;
}

export function DocumentOcrSection({
  fileType,
  pdfDiagnostics,
  ocrJob,
  ocrLanguage,
  canRunOcr,
  restoredFromSession,
  onRunProblemPages,
  onCancel,
  onLanguageChange,
}: DocumentOcrSectionProps) {
  if (fileType !== 'pdf' || !pdfDiagnostics) {
    return null;
  }

  const candidates = pdfDiagnostics.ocrCandidatePageNumbers.length;
  const showPrimary = candidates > 0 || pdfDiagnostics.emptyTextPages === pdfDiagnostics.totalPages;

  if (!showPrimary && !ocrJob) {
    return (
      <details className="fp-ocr-debug">
        <summary>OCR: не требуется</summary>
        <p className="fp-status">
          Текстовых страниц: {pdfDiagnostics.goodTextPages} из {pdfDiagnostics.totalPages}
        </p>
      </details>
    );
  }

  return (
    <div className="fp-ocr-section">
      <h3>OCR</h3>
      <ul className="fp-document-checks">
        <li className="is-done">Страниц: {pdfDiagnostics.totalPages}</li>
        <li className="is-done">Текстовых: {pdfDiagnostics.goodTextPages}</li>
        {candidates > 0 && <li>Требует OCR: {candidates}</li>}
        {pdfDiagnostics.ocrAppliedPageNumbers && pdfDiagnostics.ocrAppliedPageNumbers.length > 0 && (
          <li className="is-done">
            OCR выполнен для: {pdfDiagnostics.ocrAppliedPageNumbers.join(', ')}
          </li>
        )}
      </ul>

      {pdfDiagnostics.emptyTextPages === pdfDiagnostics.totalPages && (
        <p className="fp-status">
          В PDF не найден текстовый слой. Документ, вероятно, является сканом.
        </p>
      )}

      {restoredFromSession && !canRunOcr && candidates > 0 && (
        <p className="fp-status fp-session-hint">
          Для повторного OCR загрузите PDF заново — файл не хранится между переходами.
        </p>
      )}

      {!ocrJob?.active && canRunOcr && candidates > 0 && (
        <>
          <label className="fp-ocr-language">
            Язык OCR
            <select
              value={ocrLanguage}
              onChange={(event) => onLanguageChange(event.target.value as OcrLanguagePreset)}
            >
              <option value="rus+eng">Русский + English</option>
              <option value="eng">English</option>
              <option value="rus">Русский</option>
            </select>
          </label>
          <button type="button" className="fp-button" onClick={() => onRunProblemPages()}>
            {candidates === pdfDiagnostics.totalPages
              ? 'Распознать через OCR'
              : 'Распознать проблемные страницы'}
          </button>
        </>
      )}

      {ocrJob?.active && (
        <div className="fp-ocr-progress">
          <p className="fp-status">
            Страница {ocrJob.pageIndex} из {ocrJob.totalPages} · {Math.round(ocrJob.progress * 100)}%
          </p>
          <p className="fp-status">{ocrJob.status}</p>
          <button type="button" className="fp-button fp-button-secondary" onClick={onCancel}>
            Отменить
          </button>
        </div>
      )}

      {ocrJob?.errorMessage && (
        <p className="fp-status is-error">{ocrJob.errorMessage}</p>
      )}
    </div>
  );
}
