import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { parseDocumentFile } from '../../document/parseDocument';
import { extractCharacteristics } from '../../extraction/extractCharacteristics';
import type { ExtractionResult } from '../../extraction/types';
import {
  buildDocumentSession,
  clearDocumentSession,
  extractionFromSession,
  getDocumentSession,
  isSessionStorageAvailable,
  saveDocumentSession,
} from '../../session/documentSessionStorage';
import type { DocumentSessionFileMeta } from '../../session/types';
import { detectDocumentFormat } from '../../shared/utils';
import { DocumentContext, type DocumentContextValue } from './documentContextState';

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sessionAvailable, setSessionAvailable] = useState(false);
  const [fileMeta, setFileMeta] = useState<DocumentSessionFileMeta | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [fullText, setFullText] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState<DocumentContextValue['status']>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [restoredFromSession, setRestoredFromSession] = useState(false);
  const [sessionPersistError, setSessionPersistError] = useState(false);

  const restoreSession = useCallback(async () => {
    const available = isSessionStorageAvailable();
    setSessionAvailable(available);
    if (!available) {
      return;
    }

    try {
      const session = await getDocumentSession();
      if (!session) {
        return;
      }

      setFileMeta(session.fileMeta);
      setExtraction(extractionFromSession(session));
      setParseWarnings(session.extractionWarnings);
      setFullText(null);
      setStatus('ready');
      setRestoredFromSession(true);
      setErrorMessage(null);
      setExtractionError(null);
      setSessionPersistError(false);
    } catch {
      setSessionPersistError(true);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await restoreSession();
      setLoading(false);
    })();
  }, [restoreSession]);

  const persistSession = useCallback(
    async (
      nextFileMeta: DocumentSessionFileMeta,
      nextExtraction: ExtractionResult,
      textExtracted: boolean,
    ) => {
      if (!isSessionStorageAvailable()) {
        return false;
      }

      const saved = await saveDocumentSession(
        buildDocumentSession(nextFileMeta, nextExtraction, textExtracted),
      );
      setSessionPersistError(!saved);
      return saved;
    },
    [],
  );

  const loadFile = useCallback(
    async (file: File) => {
      const format = detectDocumentFormat(file);
      if (!format) {
        setStatus('error');
        setErrorMessage('Поддерживаются только PDF и DOCX.');
        setExtraction(null);
        setFullText(null);
        setFileMeta({ name: file.name, type: 'pdf', size: file.size });
        return;
      }

      setStatus('parsing');
      setErrorMessage(null);
      setExtractionError(null);
      setRestoredFromSession(false);
      setSessionPersistError(false);

      try {
        const result = await parseDocumentFile(file);
        const nextFileMeta: DocumentSessionFileMeta = {
          name: file.name,
          type: format,
          size: file.size,
        };
        const textExtracted = Boolean(result.fullText.trim());
        setFileMeta(nextFileMeta);
        setFullText(textExtracted ? result.fullText : null);
        setParseWarnings(result.warnings);

        try {
          const nextExtraction = extractCharacteristics(result);
          setExtraction(nextExtraction);
          await persistSession(nextFileMeta, nextExtraction, textExtracted);
        } catch (error) {
          setExtraction(null);
          setExtractionError(
            error instanceof Error ? error.message : 'Не удалось извлечь характеристики.',
          );
          await clearDocumentSession();
        }

        setStatus('ready');
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Не удалось разобрать документ.');
        setExtraction(null);
        setFullText(null);
        await clearDocumentSession();
      }
    },
    [persistSession],
  );

  const clearDocument = useCallback(async () => {
    setFileMeta(null);
    setExtraction(null);
    setFullText(null);
    setParseWarnings([]);
    setStatus('idle');
    setErrorMessage(null);
    setExtractionError(null);
    setRestoredFromSession(false);
    setSessionPersistError(false);
    await clearDocumentSession();
  }, []);

  const value: DocumentContextValue = {
    loading,
    sessionAvailable,
    fileMeta,
    extraction,
    fullText,
    parseWarnings,
    status,
    errorMessage,
    extractionError,
    restoredFromSession,
    sessionPersistError,
    loadFile,
    clearDocument,
  };

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}
