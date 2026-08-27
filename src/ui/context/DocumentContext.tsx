import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { startBridgeRequest } from '../../bridge/chatgpt/bridgeSession';
import type { ChatGptBridgeScope } from '../../bridge/chatgpt/types';
import { EMPTY_BRIDGE_SESSION } from '../../bridge/chatgpt/types';
import { executeDocumentOcr, toSessionPdfDiagnostics } from '../../document/executeDocumentOcr';
import { parseDocumentFile } from '../../document/parseDocument';
import { extractCharacteristics } from '../../extraction/extractCharacteristics';
import type { ExtractionResult } from '../../extraction/types';
import { createLazyOcrEngine } from '../../ocr/loadOcrEngine';
import type { OcrLanguagePreset } from '../../ocr/types';
import { pruneReviewDecisionsForCharacteristics } from '../../matching/pruneReviewDecisions';
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
import type { DocumentSessionFileMeta, DocumentSessionPdfDiagnostics } from '../../session/types';
import type { DocumentParseResult } from '../../shared/types/document';
import { detectDocumentFormat } from '../../shared/utils';
import { DocumentContext, type DocumentContextValue, type OcrJobUiState } from './documentContextState';

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
  const [parseResult, setParseResult] = useState<DocumentParseResult | null>(null);
  const [pdfDiagnostics, setPdfDiagnostics] = useState<DocumentSessionPdfDiagnostics | null>(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [ocrJob, setOcrJob] = useState<OcrJobUiState | null>(null);
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguagePreset>('rus+eng');
  const documentIdentityRef = useRef('');
  const ocrAbortRef = useRef<AbortController | null>(null);

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
          pdfDiagnostics: options?.pdfDiagnostics ?? pdfDiagnostics ?? undefined,
        }),
      );
      setSessionPersistError(!saved);
      return saved;
    },
    [chatGptBridge, matchReview, pdfDiagnostics, sessionCreatedAt],
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
      setPdfDiagnostics(session.pdfDiagnostics ?? null);
      setParseResult(null);
      setPdfArrayBuffer(null);
      setOcrJob(null);
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
      setParseResult(null);
      setPdfDiagnostics(null);
      setPdfArrayBuffer(null);
      setOcrJob(null);
      documentIdentityRef.current = '';

      try {
        const nextDocumentIdentity = crypto.randomUUID();
        documentIdentityRef.current = nextDocumentIdentity;

        let nextPdfBuffer: ArrayBuffer | null = null;
        if (format === 'pdf') {
          nextPdfBuffer = await file.arrayBuffer();
        }

        const result =
          format === 'pdf' && nextPdfBuffer
            ? await parseDocumentFile(new File([nextPdfBuffer], file.name, { type: file.type }))
            : await parseDocumentFile(file);
        const nextFileMeta: DocumentSessionFileMeta = {
          name: file.name,
          type: format,
          size: file.size,
        };
        const nextTextExtracted = Boolean(result.fullText.trim());
        setFileMeta(nextFileMeta);
        setParseResult(result);
        setPdfArrayBuffer(nextPdfBuffer);
        setPdfDiagnostics(toSessionPdfDiagnostics(result.pdfDiagnostics) ?? null);
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
            pdfDiagnostics: toSessionPdfDiagnostics(result.pdfDiagnostics) ?? undefined,
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
        setParseResult(null);
        setPdfDiagnostics(null);
        setPdfArrayBuffer(null);
        setOcrJob(null);
        documentIdentityRef.current = '';
        await clearDocumentSession();
      }
    },
    [persistCurrentSession],
  );

  const clearDocument = useCallback(async () => {
    ocrAbortRef.current?.abort();
    ocrAbortRef.current = null;
    setFileMeta(null);
    setExtraction(null);
    setFullText(null);
    setParseResult(null);
    setPdfDiagnostics(null);
    setPdfArrayBuffer(null);
    setOcrJob(null);
    documentIdentityRef.current = '';
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

  const cancelOcr = useCallback(() => {
    ocrAbortRef.current?.abort();
    ocrAbortRef.current = null;
    setOcrJob(null);
  }, []);

  const runOcrForPages = useCallback(
    async (pageNumbers: number[]) => {
      if (
        !parseResult ||
        !pdfArrayBuffer ||
        fileMeta?.type !== 'pdf' ||
        pageNumbers.length === 0 ||
        ocrJob?.active
      ) {
        return;
      }

      const jobDocumentIdentity = documentIdentityRef.current;
      const controller = new AbortController();
      ocrAbortRef.current = controller;

      setOcrJob({
        active: true,
        pageIndex: 0,
        totalPages: pageNumbers.length,
        pageNumber: pageNumbers[0] ?? 0,
        progress: 0,
        status: 'Подготовка OCR…',
        errorMessage: null,
      });

      try {
        const ocrResult = await executeDocumentOcr({
          parseResult,
          pdfArrayBuffer,
          pageNumbers,
          language: ocrLanguage,
          documentIdentity: jobDocumentIdentity,
          currentDocumentIdentity: () => documentIdentityRef.current,
          createEngine: createLazyOcrEngine,
          signal: controller.signal,
          onProgress: (progress) => {
            setOcrJob({
              active: true,
              pageIndex: progress.pageIndex,
              totalPages: progress.totalPages,
              pageNumber: progress.pageNumber,
              progress: progress.progress,
              status: progress.status,
              errorMessage: null,
            });
          },
        });

        if (documentIdentityRef.current !== jobDocumentIdentity) {
          return;
        }

        const nextExtraction = extractCharacteristics(ocrResult.parseResult);
        const nextTextExtracted = Boolean(ocrResult.parseResult.fullText.trim());
        const nextReview = pruneReviewDecisionsForCharacteristics(matchReview, nextExtraction.characteristics);

        setParseResult(ocrResult.parseResult);
        setPdfDiagnostics(ocrResult.pdfDiagnostics ?? null);
        setExtraction(nextExtraction);
        setFullText(nextTextExtracted ? ocrResult.parseResult.fullText : null);
        setParseWarnings(ocrResult.parseResult.warnings);
        setTextExtracted(nextTextExtracted);
        setMatchReview(nextReview);

        if (fileMeta) {
          await persistCurrentSession(fileMeta, nextExtraction, nextTextExtracted, {
            matchReview: nextReview ?? undefined,
            pdfDiagnostics: ocrResult.pdfDiagnostics ?? undefined,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        if (error instanceof Error && error.message === 'STALE_OCR_DOCUMENT') {
          return;
        }
        setOcrJob({
          active: false,
          pageIndex: 0,
          totalPages: pageNumbers.length,
          pageNumber: pageNumbers[0] ?? 0,
          progress: 0,
          status: '',
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Не удалось запустить локальное OCR.',
        });
        return;
      } finally {
        if (ocrAbortRef.current === controller) {
          ocrAbortRef.current = null;
        }
        if (documentIdentityRef.current === jobDocumentIdentity) {
          setOcrJob(null);
        }
      }
    },
    [fileMeta, matchReview, ocrJob?.active, ocrLanguage, parseResult, pdfArrayBuffer, persistCurrentSession],
  );

  const runOcrForProblemPages = useCallback(async () => {
    const candidates =
      pdfDiagnostics?.ocrCandidatePageNumbers ??
      parseResult?.pdfDiagnostics?.ocrCandidatePageNumbers ??
      [];
    if (candidates.length === 0) {
      return;
    }
    await runOcrForPages(candidates);
  }, [parseResult?.pdfDiagnostics?.ocrCandidatePageNumbers, pdfDiagnostics?.ocrCandidatePageNumbers, runOcrForPages]);

  const canRunOcr = Boolean(
    fileMeta?.type === 'pdf' &&
      pdfArrayBuffer &&
      parseResult &&
      !ocrJob?.active,
  );

  const value: DocumentContextValue = {
    loading,
    sessionAvailable,
    fileMeta,
    extraction,
    fullText,
    parseResult,
    pdfDiagnostics,
    parseWarnings,
    status,
    errorMessage,
    extractionError,
    restoredFromSession,
    sessionPersistError,
    matchReview,
    sessionCreatedAt,
    chatGptBridge,
    ocrJob,
    ocrLanguage,
    canRunOcr,
    loadFile,
    clearDocument,
    runOcrForPages,
    runOcrForProblemPages,
    cancelOcr,
    setOcrLanguage,
    setReviewDecision,
    resetMatchReviewForProfile,
    setBridgeResponseDraft,
    prepareBridgeRequest,
    saveBridgeValidation,
    clearBridgePending,
  };

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}
