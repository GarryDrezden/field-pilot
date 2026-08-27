import { createContext } from 'react';
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
  loadFile: (file: File) => Promise<void>;
  clearDocument: () => Promise<void>;
  setReviewDecision: (
    profileId: string,
    characteristicId: string,
    decision: MatchReviewDecision,
  ) => Promise<void>;
  resetMatchReviewForProfile: (profileId: string) => Promise<void>;
}

export const DocumentContext = createContext<DocumentContextValue | null>(null);
