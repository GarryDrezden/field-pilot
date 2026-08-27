import { createContext } from 'react';
import type { ChatGptBridgeScope, ChatGptBridgeSessionState } from '../../bridge/chatgpt/types';
import type { ExtractionResult } from '../../extraction/types';
import type { DocumentMatchReviewState, MatchReviewDecision } from '../../matching/types';
import type { DocumentSessionFileMeta } from '../../session/types';

import type { DocumentParseResult } from '../../shared/types/document';
import type { OcrLanguagePreset } from '../../ocr/types';
import type { DocumentSessionPdfDiagnostics } from '../../session/types';

export type DocumentStatus = 'idle' | 'parsing' | 'ready' | 'error';

export interface OcrJobUiState {
  active: boolean;
  pageIndex: number;
  totalPages: number;
  pageNumber: number;
  progress: number;
  status: string;
  errorMessage: string | null;
}

export interface DocumentContextValue {
  loading: boolean;
  sessionAvailable: boolean;
  fileMeta: DocumentSessionFileMeta | null;
  extraction: ExtractionResult | null;
  fullText: string | null;
  parseResult: DocumentParseResult | null;
  pdfDiagnostics: DocumentSessionPdfDiagnostics | null;
  parseWarnings: string[];
  status: DocumentStatus;
  errorMessage: string | null;
  extractionError: string | null;
  restoredFromSession: boolean;
  sessionPersistError: boolean;
  matchReview: DocumentMatchReviewState | null;
  sessionCreatedAt: string | null;
  chatGptBridge: ChatGptBridgeSessionState;
  ocrJob: OcrJobUiState | null;
  ocrLanguage: OcrLanguagePreset;
  canRunOcr: boolean;
  loadFile: (file: File) => Promise<void>;
  clearDocument: () => Promise<void>;
  runOcrForPages: (pageNumbers: number[]) => Promise<void>;
  runOcrForProblemPages: () => Promise<void>;
  cancelOcr: () => void;
  setOcrLanguage: (language: OcrLanguagePreset) => void;
  setReviewDecision: (
    profileId: string,
    characteristicId: string,
    decision: MatchReviewDecision,
  ) => Promise<void>;
  resetMatchReviewForProfile: (profileId: string) => Promise<void>;
  setBridgeResponseDraft: (draft: string) => Promise<void>;
  prepareBridgeRequest: (
    scope: ChatGptBridgeScope,
    characteristicIds: string[],
    profileId: string,
    profileUpdatedAt?: string,
  ) => Promise<import('../../bridge/chatgpt/types').ChatGptBridgeRequest | null>;
  saveBridgeValidation: (
    suggestions: import('../../bridge/chatgpt/types').ChatGptBridgeSuggestion[],
    responseDraft: string,
  ) => Promise<void>;
  clearBridgePending: () => Promise<void>;
}

export const DocumentContext = createContext<DocumentContextValue | null>(null);
