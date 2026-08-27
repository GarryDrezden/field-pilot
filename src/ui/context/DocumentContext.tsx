import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { startBridgeRequest } from '../../bridge/chatgpt/bridgeSession';
import type { ChatGptBridgeScope } from '../../bridge/chatgpt/types';
import { EMPTY_BRIDGE_SESSION } from '../../bridge/chatgpt/types';
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
  type BuildDocumentSessionOptions,
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
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [chatGptBridge, setChatGptBridge] = useState(EMPTY_BRIDGE_SESSION);

  const persistCurrentSession = useCallback(
    async (
      nextFileMeta: DocumentSessionFileMeta,
      nextExtraction: ExtractionResult,
      nextTextExtracted: boolean,
      options?: BuildDocumentSessionOptions,
    ) => {
      if (!isSessionStorageAvailable()) {
        return false;
      }

      const saved = await saveDocumentSession(
        buildDocumentSession(nextFileMeta, nextExtraction, nextTextExtracted, {
          matchReview: options?.matchReview ?? matchReview ?? undefined,
          chatGptBridge: options?.chatGptBridge ?? chatGptBridge,
          createdAt: options?.createdAt ?? sessionCreatedAt ?? undefined,
        }),
      );
      setSessionPersistError(!saved);
      return saved;
    },
    [chatGptBridge, matchReview, sessionCreatedAt],
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
      setSessionCreatedAt(session.createdAt);
      setChatGptBridge(session.chatGptBridge ?? { ...EMPTY_BRIDGE_SESSION });
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
        setChatGptBridge({ ...EMPTY_BRIDGE_SESSION });
        setSessionCreatedAt(null);
        setFileMeta({ name: file.name, type: 'pdf', size: file.size });
        return;
      }

      setStatus('parsing');
      setErrorMessage(null);
      setExtractionError(null);
      setRestoredFromSession(false);
      setSessionPersistError(false);
      setMatchReview(null);
      setChatGptBridge({ ...EMPTY_BRIDGE_SESSION });

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
          const createdAt = new Date().toISOString();
          setSessionCreatedAt(createdAt);
          await persistCurrentSession(nextFileMeta, nextExtraction, nextTextExtracted, {
            matchReview: undefined,
            chatGptBridge: { ...EMPTY_BRIDGE_SESSION },
            createdAt,
          });
        } catch (error) {
          setExtraction(null);
          setSessionCreatedAt(null);
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
        setChatGptBridge({ ...EMPTY_BRIDGE_SESSION });
        setSessionCreatedAt(null);
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
    setChatGptBridge({ ...EMPTY_BRIDGE_SESSION });
    setSessionCreatedAt(null);
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
      await persistCurrentSession(fileMeta, extraction, textExtracted, { matchReview: nextReview });
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
      await persistCurrentSession(fileMeta, extraction, textExtracted, { matchReview: nextReview });
    },
    [extraction, fileMeta, matchReview, persistCurrentSession, textExtracted],
  );

  const setBridgeResponseDraft = useCallback(
    async (draft: string) => {
      if (!fileMeta || !extraction) {
        return;
      }
      const nextBridge = { ...chatGptBridge, responseDraft: draft };
      setChatGptBridge(nextBridge);
      await persistCurrentSession(fileMeta, extraction, textExtracted, { chatGptBridge: nextBridge });
    },
    [chatGptBridge, extraction, fileMeta, persistCurrentSession, textExtracted],
  );

  const prepareBridgeRequest = useCallback(
    async (
      scope: ChatGptBridgeScope,
      characteristicIds: string[],
      profileId: string,
      profileUpdatedAt?: string,
    ) => {
      if (!extraction || !sessionCreatedAt || characteristicIds.length === 0) {
        return null;
      }

      const nextBridge = startBridgeRequest({
        profileId,
        profileUpdatedAt,
        documentSessionCreatedAt: sessionCreatedAt,
        scope,
        characteristicIds,
      });

      if (fileMeta) {
        setChatGptBridge(nextBridge);
        await persistCurrentSession(fileMeta, extraction, textExtracted, { chatGptBridge: nextBridge });
      } else {
        setChatGptBridge(nextBridge);
      }

      return nextBridge.activeRequest;
    },
    [extraction, fileMeta, persistCurrentSession, sessionCreatedAt, textExtracted],
  );

  const saveBridgeValidation = useCallback(
    async (
      suggestions: import('../../bridge/chatgpt/types').ChatGptBridgeSuggestion[],
      responseDraft: string,
    ) => {
      if (!fileMeta || !extraction) {
        return;
      }
      const nextBridge = {
        ...chatGptBridge,
        pendingSuggestions: suggestions.length > 0 ? suggestions : null,
        responseDraft,
      };
      setChatGptBridge(nextBridge);
      await persistCurrentSession(fileMeta, extraction, textExtracted, { chatGptBridge: nextBridge });
    },
    [chatGptBridge, extraction, fileMeta, persistCurrentSession, textExtracted],
  );

  const clearBridgePending = useCallback(async () => {
    if (!fileMeta || !extraction) {
      setChatGptBridge((current) => ({ ...current, pendingSuggestions: null }));
      return;
    }
    const nextBridge = { ...chatGptBridge, pendingSuggestions: null };
    setChatGptBridge(nextBridge);
    await persistCurrentSession(fileMeta, extraction, textExtracted, { chatGptBridge: nextBridge });
  }, [chatGptBridge, extraction, fileMeta, persistCurrentSession, textExtracted]);

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
    sessionCreatedAt,
    chatGptBridge,
    loadFile,
    clearDocument,
    setReviewDecision,
    resetMatchReviewForProfile,
    setBridgeResponseDraft,
    prepareBridgeRequest,
    saveBridgeValidation,
    clearBridgePending,
  };

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}
