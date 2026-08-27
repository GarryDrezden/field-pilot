import type { ExtractionResult } from '../extraction/types';
import {
  DOCUMENT_SESSION_SCHEMA_VERSION,
  DOCUMENT_SESSION_STORAGE_KEY,
  type DocumentSession,
  type DocumentSessionFileMeta,
} from './types';

export function isSessionStorageAvailable(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.session);
}

export function buildDocumentSession(
  fileMeta: DocumentSessionFileMeta,
  extraction: ExtractionResult,
  textExtracted: boolean,
): DocumentSession {
  return {
    schemaVersion: DOCUMENT_SESSION_SCHEMA_VERSION,
    fileMeta,
    characteristics: extraction.characteristics,
    extractionWarnings: extraction.warnings,
    extractionStats: extraction.stats,
    textExtracted,
    createdAt: new Date().toISOString(),
  };
}

export function parseDocumentSession(raw: unknown): DocumentSession | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const session = raw as Partial<DocumentSession>;
  if (session.schemaVersion !== DOCUMENT_SESSION_SCHEMA_VERSION) {
    return null;
  }

  if (!session.fileMeta?.name || !session.fileMeta.type) {
    return null;
  }

  if (!Array.isArray(session.characteristics)) {
    return null;
  }

  return {
    schemaVersion: DOCUMENT_SESSION_SCHEMA_VERSION,
    fileMeta: {
      name: session.fileMeta.name,
      type: session.fileMeta.type,
      size: session.fileMeta.size,
    },
    characteristics: session.characteristics,
    extractionWarnings: Array.isArray(session.extractionWarnings) ? session.extractionWarnings : [],
    extractionStats: session.extractionStats ?? {
      total: session.characteristics.length,
      numeric: 0,
      text: 0,
      table: 0,
      lines: 0,
    },
    textExtracted: Boolean(session.textExtracted),
    createdAt: typeof session.createdAt === 'string' ? session.createdAt : new Date().toISOString(),
  };
}

export function extractionFromSession(session: DocumentSession): ExtractionResult {
  return {
    characteristics: session.characteristics,
    warnings: session.extractionWarnings,
    stats: session.extractionStats,
  };
}

export async function getDocumentSession(): Promise<DocumentSession | null> {
  if (!isSessionStorageAvailable()) {
    return null;
  }

  const result = await chrome.storage.session.get(DOCUMENT_SESSION_STORAGE_KEY);
  return parseDocumentSession(result[DOCUMENT_SESSION_STORAGE_KEY]);
}

export async function saveDocumentSession(session: DocumentSession): Promise<boolean> {
  if (!isSessionStorageAvailable()) {
    return false;
  }

  await chrome.storage.session.set({ [DOCUMENT_SESSION_STORAGE_KEY]: session });
  return true;
}

export async function clearDocumentSession(): Promise<void> {
  if (!isSessionStorageAvailable()) {
    return;
  }

  await chrome.storage.session.remove(DOCUMENT_SESSION_STORAGE_KEY);
}

export function serializeDocumentSession(session: DocumentSession): string {
  return JSON.stringify(session);
}

export function deserializeDocumentSession(raw: string): DocumentSession | null {
  try {
    return parseDocumentSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
