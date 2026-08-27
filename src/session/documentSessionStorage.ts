import type { ExtractionResult } from '../extraction/types';
import type { MatchReviewDecision, DocumentMatchReviewState } from '../matching/types';
import {
  DOCUMENT_SESSION_SCHEMA_VERSION,
  DOCUMENT_SESSION_SCHEMA_VERSION_V1,
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
  matchReview?: DocumentMatchReviewState,
): DocumentSession {
  return {
    schemaVersion: DOCUMENT_SESSION_SCHEMA_VERSION,
    fileMeta,
    characteristics: extraction.characteristics,
    extractionWarnings: extraction.warnings,
    extractionStats: extraction.stats,
    textExtracted,
    createdAt: new Date().toISOString(),
    matchReview,
  };
}

export function parseDocumentSession(raw: unknown): DocumentSession | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const session = raw as Partial<DocumentSession> & {
    file?: DocumentSessionFileMeta;
  };
  if (
    session.schemaVersion !== DOCUMENT_SESSION_SCHEMA_VERSION &&
    session.schemaVersion !== DOCUMENT_SESSION_SCHEMA_VERSION_V1
  ) {
    return null;
  }

  const fileMeta = session.fileMeta ?? session.file;
  if (!fileMeta?.name || !fileMeta.type) {
    return null;
  }

  if (fileMeta.type !== 'pdf' && fileMeta.type !== 'docx') {
    return null;
  }

  if (!Array.isArray(session.characteristics)) {
    return null;
  }

  const matchReview = parseMatchReview(session.matchReview);

  return {
    schemaVersion: DOCUMENT_SESSION_SCHEMA_VERSION,
    fileMeta: {
      name: fileMeta.name,
      type: fileMeta.type,
      size: fileMeta.size,
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
    matchReview,
  };
}

function parseMatchReview(raw: unknown): DocumentSession['matchReview'] {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const value = raw as { profileId?: string; decisions?: Record<string, unknown> };
  if (!value.profileId || typeof value.profileId !== 'string') {
    return undefined;
  }
  const decisions: NonNullable<DocumentSession['matchReview']>['decisions'] = {};
  if (value.decisions && typeof value.decisions === 'object') {
    for (const [characteristicId, decisionRaw] of Object.entries(value.decisions)) {
      const parsed = parseReviewDecision(decisionRaw);
      if (parsed) {
        decisions[characteristicId] = parsed;
      }
    }
  }
  return { profileId: value.profileId, decisions };
}

function parseReviewDecision(raw: unknown): MatchReviewDecision | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const decision = raw as { type?: string; propertyId?: string };
  if (decision.type === 'ignored') {
    return { type: 'ignored' };
  }
  if (
    (decision.type === 'confirmed' || decision.type === 'manual') &&
    typeof decision.propertyId === 'string'
  ) {
    return { type: decision.type, propertyId: decision.propertyId };
  }
  return undefined;
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

  try {
    const result = await chrome.storage.session.get(DOCUMENT_SESSION_STORAGE_KEY);
    const raw = result[DOCUMENT_SESSION_STORAGE_KEY];
    if (raw === undefined) {
      return null;
    }

    const session = parseDocumentSession(raw);
    if (!session) {
      await clearDocumentSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function saveDocumentSession(session: DocumentSession): Promise<boolean> {
  if (!isSessionStorageAvailable()) {
    return false;
  }

  try {
    await chrome.storage.session.set({ [DOCUMENT_SESSION_STORAGE_KEY]: session });
    return true;
  } catch {
    return false;
  }
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
