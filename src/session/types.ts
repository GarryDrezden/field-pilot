import type { ExtractedCharacteristic, ExtractionStats } from '../extraction/types';
import type { DocumentMatchReviewState } from '../matching/types';
import type { ChatGptBridgeSessionState } from '../bridge/chatgpt/types';

export const DOCUMENT_SESSION_SCHEMA_VERSION = 3;
export const DOCUMENT_SESSION_SCHEMA_VERSION_V2 = 2;
export const DOCUMENT_SESSION_SCHEMA_VERSION_V1 = 1;
export const DOCUMENT_SESSION_STORAGE_KEY = 'fieldpilot_document_session';

export interface DocumentSessionFileMeta {
  name: string;
  type: 'pdf' | 'docx';
  size?: number;
}

export interface DocumentSession {
  schemaVersion: number;
  fileMeta: DocumentSessionFileMeta;
  characteristics: ExtractedCharacteristic[];
  extractionWarnings: string[];
  extractionStats: ExtractionStats;
  textExtracted: boolean;
  createdAt: string;
  matchReview?: DocumentMatchReviewState;
  chatGptBridge?: ChatGptBridgeSessionState;
}

export interface DocumentSessionSnapshot {
  session: DocumentSession;
  restoredFromSession: boolean;
}
