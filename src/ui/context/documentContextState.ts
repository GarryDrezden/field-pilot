import { createContext } from 'react';
import type { ChatGptBridgeScope, ChatGptBridgeSessionState } from '../../bridge/chatgpt/types';
import type { ExtractionResult } from '../../extraction/types';
import type { DocumentMatchReviewState, MatchReviewDecision } from '../../matching/types';
import type { DocumentSessionFileMeta } from '../../session/types';

export type DocumentStatus = 'idle' | 'parsing' | 'ready' | 'error';

export interface DocumentContextValue {
  loading: boolean;
  sessionAvailable: boolean;
  fileMeta: DocumentSessionFileMeta | null;
  extraction: ExtractionResult | null;
  fullText: string | null;
  parseWarnings: string[];
  status: DocumentStatus;
  errorMessage: string | null;
  extractionError: string | null;
  restoredFromSession: boolean;
  sessionPersistError: boolean;
  matchReview: DocumentMatchReviewState | null;
  sessionCreatedAt: string | null;
  chatGptBridge: ChatGptBridgeSessionState;
  loadFile: (file: File) => Promise<void>;
  clearDocument: () => Promise<void>;
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
