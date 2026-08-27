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
  createEmptyReviewState,
  upsertReviewDecision,
} from '../../matching/applyReviewDecisions';
import type { DocumentMatchReviewState, MatchReviewDecision } from '../../matching/types';
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
  const [textExtracted, setTextExtracted] = useState(false);
  const [status, setStatus] = useState<DocumentContextValue['status']>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [restoredFromSession, setRestoredFromSession] = useState(false);
  const [sessionPersistError, setSessionPersistError] = useState(false);
  const [matchReview, setMatchReview] = useState<DocumentMatchReviewState | null>(null);

  const persistCurrentSession = useCallback(
    async (
      nextFileMeta: DocumentSessionFileMeta,
      nextExtraction: ExtractionResult,
      nextTextExtracted: boolean,
      nextMatchReview?: DocumentMatchReviewState | null,
    ) => {
      if (!isSessionStorageAvailable()) {
        return false;
      }

      const saved = await saveDocumentSession(
        buildDocumentSession(
          nextFileMeta,
          nextExtraction,
          nextTextExtracted,
          nextMatchReview ?? undefined,
        ),
      );
      setSessionPersistError(!saved);
      return saved;
    },
    [],
  );

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
      setTextExtracted(session.textExtracted);
      setMatchReview(session.matchReview ?? null);
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

  const loadFile = useCallback(
    async (file: File) => {
      const format = detectDocumentFormat(file);
      if (!format) {
        setStatus('error');
        setErrorMessage('Поддерживаются только PDF и DOCX.');
        setExtraction(null);
        setFullText(null);
        setMatchReview(null);
        setFileMeta({ name: file.name, type: 'pdf', size: file.size });
        return;
      }

      setStatus('parsing');
      setErrorMessage(null);
      setExtractionError(null);
      setRestoredFromSession(false);
      setSessionPersistError(false);
      setMatchReview(null);

      try {
        const result = await parseDocumentFile(file);
        const nextFileMeta: DocumentSessionFileMeta = {
          name: file.name,
          type: format,
          size: file.size,
        };
        const nextTextExtracted = Boolean(result.fullText.trim());
        setFileMeta(nextFileMeta);
        setFullText(nextTextExtracted ? result.fullText : null);
        setParseWarnings(result.warnings);
        setTextExtracted(nextTextExtracted);

        try {
          const nextExtraction = extractCharacteristics(result);
          setExtraction(nextExtraction);
          await persistCurrentSession(nextFileMeta, nextExtraction, nextTextExtracted, null);
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
        setMatchReview(null);
        await clearDocumentSession();
      }
    },
    [persistCurrentSession],
  );

  const clearDocument = useCallback(async () => {
    setFileMeta(null);
    setExtraction(null);
    setFullText(null);
    setParseWarnings([]);
    setTextExtracted(false);
    setMatchReview(null);
    setStatus('idle');
    setErrorMessage(null);
    setExtractionError(null);
    setRestoredFromSession(false);
    setSessionPersistError(false);
    await clearDocumentSession();
  }, []);

  const setReviewDecision = useCallback(
    async (profileId: string, characteristicId: string, decision: MatchReviewDecision) => {
      if (!fileMeta || !extraction) {
        return;
      }

      const baseState =
        matchReview?.profileId === profileId
          ? matchReview
          : createEmptyReviewState(profileId);
      const nextReview = upsertReviewDecision(baseState, characteristicId, decision);
      setMatchReview(nextReview);
      await persistCurrentSession(fileMeta, extraction, textExtracted, nextReview);
    },
    [extraction, fileMeta, matchReview, persistCurrentSession, textExtracted],
  );

  const resetMatchReviewForProfile = useCallback(
    async (profileId: string) => {
      if (!fileMeta || !extraction) {
        setMatchReview(null);
        return;
      }

      if (matchReview?.profileId === profileId) {
        return;
      }

      const nextReview = createEmptyReviewState(profileId);
      setMatchReview(nextReview);
      await persistCurrentSession(fileMeta, extraction, textExtracted, nextReview);
    },
    [extraction, fileMeta, matchReview, persistCurrentSession, textExtracted],
  );

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
    matchReview,
    loadFile,
    clearDocument,
    setReviewDecision,
    resetMatchReviewForProfile,
  };

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}
