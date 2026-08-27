import type { ExtractedCharacteristic, ExtractionStats } from '../extraction/types';

export const DOCUMENT_SESSION_SCHEMA_VERSION = 1;
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
}

export interface DocumentSessionSnapshot {
  session: DocumentSession;
  restoredFromSession: boolean;
}
