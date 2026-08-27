import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDocumentSession,
  clearDocumentSession,
  deserializeDocumentSession,
  extractionFromSession,
  getDocumentSession,
  isSessionStorageAvailable,
  parseDocumentSession,
  saveDocumentSession,
  serializeDocumentSession,
} from './documentSessionStorage';
import type { DocumentSession } from './types';
import { DOCUMENT_SESSION_SCHEMA_VERSION } from './types';

const sampleSession: DocumentSession = {
  schemaVersion: DOCUMENT_SESSION_SCHEMA_VERSION,
  fileMeta: { name: 'test.pdf', type: 'pdf', size: 6400000 },
  characteristics: [
    {
      id: 'c1',
      sourceLabel: 'Motor Power',
      rawValue: '61',
      normalizedValue: '61',
      rawUnit: 'kw',
      normalizedUnit: 'kW',
      valueKind: 'number',
      extractionMethod: 'structured-line',
      source: { text: '16. Motor Power kw 61', pageNumber: 15, lineNumber: 21 },
    },
  ],
  extractionWarnings: [],
  extractionStats: { total: 1, numeric: 1, text: 0, table: 0, lines: 1 },
  textExtracted: true,
  createdAt: '2026-08-27T12:00:00.000Z',
};

describe('documentSessionStorage', () => {
  it('serializes and restores document characteristics', () => {
    const json = serializeDocumentSession(sampleSession);
    const restored = deserializeDocumentSession(json);
    expect(restored?.characteristics).toHaveLength(1);
    expect(restored?.characteristics[0]?.sourceLabel).toBe('Motor Power');
  });

  it('rejects invalid session schema', () => {
    expect(parseDocumentSession({ schemaVersion: 99 })).toBeNull();
    expect(parseDocumentSession(null)).toBeNull();
  });

  it('builds session without full text', () => {
    const session = buildDocumentSession(
      { name: 'harsle.pdf', type: 'pdf' },
      extractionFromSession(sampleSession),
      true,
    );
    expect(session.fileMeta.name).toBe('harsle.pdf');
    expect('fullText' in session).toBe(false);
  });

  it('new document session replaces previous snapshot shape', () => {
    const first = buildDocumentSession(
      { name: 'a.pdf', type: 'pdf' },
      { characteristics: [], warnings: [], stats: { total: 0, numeric: 0, text: 0, table: 0, lines: 0 } },
      true,
    );
    const second = buildDocumentSession(
      { name: 'b.pdf', type: 'docx' },
      extractionFromSession(sampleSession),
      true,
    );
    expect(first.fileMeta.name).toBe('a.pdf');
    expect(second.fileMeta.name).toBe('b.pdf');
    expect(second.characteristics).toHaveLength(1);
  });

  it('does not include page fields or profile data in session', () => {
    const json = serializeDocumentSession(sampleSession);
    expect(json.includes('PageField')).toBe(false);
    expect(json.includes('properties')).toBe(false);
    expect(json.includes('mappings')).toBe(false);
  });

  it('restores file metadata on roundtrip', () => {
    const json = serializeDocumentSession(sampleSession);
    const restored = deserializeDocumentSession(json);
    expect(restored?.fileMeta).toEqual({
      name: 'test.pdf',
      type: 'pdf',
      size: 6400000,
    });
  });

  it('preserves source metadata and value kinds on roundtrip', () => {
    const mixedSession: DocumentSession = {
      ...sampleSession,
      characteristics: [
        sampleSession.characteristics[0]!,
        {
          id: 'c2',
          sourceLabel: 'Feeding Structure',
          rawValue: 'Pressing Arm',
          normalizedValue: 'Pressing Arm',
          valueKind: 'text',
          extractionMethod: 'delimited-line',
          source: { text: '14. Feeding Structure / Pressing Arm', pageNumber: 15, lineNumber: 30 },
        },
      ],
      extractionStats: { total: 2, numeric: 1, text: 1, table: 0, lines: 2 },
    };
    const restored = deserializeDocumentSession(serializeDocumentSession(mixedSession));
    expect(restored?.characteristics[0]?.valueKind).toBe('number');
    expect(restored?.characteristics[0]?.source.pageNumber).toBe(15);
    expect(restored?.characteristics[1]?.valueKind).toBe('text');
    expect(restored?.characteristics[1]?.source.text).toContain('Pressing Arm');
  });

  it('accepts legacy file alias in stored session', () => {
    const legacy = {
      schemaVersion: DOCUMENT_SESSION_SCHEMA_VERSION,
      file: { name: 'legacy.pdf', type: 'pdf' },
      characteristics: sampleSession.characteristics,
      createdAt: sampleSession.createdAt,
    };
    expect(parseDocumentSession(legacy)?.fileMeta.name).toBe('legacy.pdf');
  });

  it('rejects corrupted session payloads', () => {
    expect(deserializeDocumentSession('{not json')).toBeNull();
    expect(parseDocumentSession({ schemaVersion: 1, fileMeta: { name: 'x.pdf', type: 'txt' } })).toBeNull();
  });

  it('restores matchReview decisions for schema v2', () => {
    const withReview: DocumentSession = {
      ...sampleSession,
      schemaVersion: 2,
      matchReview: {
        profileId: 'profile-mosklad',
        decisions: {
          c1: { type: 'confirmed', propertyId: 'PARAM10' },
          c2: { type: 'ignored' },
        },
      },
    };
    const restored = deserializeDocumentSession(serializeDocumentSession(withReview));
    expect(restored?.matchReview?.profileId).toBe('profile-mosklad');
    expect(restored?.matchReview?.decisions.c1).toEqual({ type: 'confirmed', propertyId: 'PARAM10' });
    expect(restored?.matchReview?.decisions.c2).toEqual({ type: 'ignored' });
  });

  it('accepts legacy schema v1 without matchReview', () => {
    const legacy = {
      schemaVersion: 1,
      fileMeta: { name: 'legacy.pdf', type: 'pdf' },
      characteristics: sampleSession.characteristics,
      createdAt: sampleSession.createdAt,
    };
    const restored = parseDocumentSession(legacy);
    expect(restored?.matchReview).toBeUndefined();
  });

  it('drops invalid matchReview decisions safely', () => {
    const corrupt = {
      schemaVersion: 2,
      fileMeta: { name: 'x.pdf', type: 'pdf' },
      characteristics: sampleSession.characteristics,
      createdAt: sampleSession.createdAt,
      matchReview: {
        profileId: 'p1',
        decisions: {
          c1: { type: 'manual' },
          c2: { type: 'confirmed', propertyId: 'ok' },
        },
      },
    };
    const restored = parseDocumentSession(corrupt);
    expect(restored?.matchReview?.decisions.c1).toBeUndefined();
    expect(restored?.matchReview?.decisions.c2).toEqual({ type: 'confirmed', propertyId: 'ok' });
  });
});

describe('documentSessionStorage adapter', () => {
  const store: Record<string, unknown> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: vi.fn(async (key: string) => ({ [key]: store[key] })),
          set: vi.fn(async (value: Record<string, unknown>) => {
            Object.assign(store, value);
          }),
          remove: vi.fn(async (key: string) => {
            delete store[key];
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves and restores document session', async () => {
    await saveDocumentSession(sampleSession);
    const restored = await getDocumentSession();
    expect(restored?.characteristics).toHaveLength(1);
    expect(restored?.fileMeta.name).toBe('test.pdf');
  });

  it('clears session', async () => {
    await saveDocumentSession(sampleSession);
    await clearDocumentSession();
    expect(await getDocumentSession()).toBeNull();
  });

  it('replaces session when a new document is saved', async () => {
    const first = buildDocumentSession(
      { name: 'first.pdf', type: 'pdf' },
      { characteristics: [], warnings: [], stats: { total: 0, numeric: 0, text: 0, table: 0, lines: 0 } },
      true,
    );
    const second = buildDocumentSession(
      { name: 'second.docx', type: 'docx' },
      extractionFromSession(sampleSession),
      true,
    );
    await saveDocumentSession(first);
    await saveDocumentSession(second);
    const restored = await getDocumentSession();
    expect(restored?.fileMeta.name).toBe('second.docx');
    expect(restored?.characteristics).toHaveLength(1);
  });

  it('reports unavailable session storage when chrome.session is missing', () => {
    vi.stubGlobal('chrome', { storage: {} });
    expect(isSessionStorageAvailable()).toBe(false);
  });

  it('clears corrupted session on read', async () => {
    store.fieldpilot_document_session = { schemaVersion: 99, fileMeta: { name: 'bad.pdf', type: 'pdf' } };
    expect(await getDocumentSession()).toBeNull();
    expect(store.fieldpilot_document_session).toBeUndefined();
  });

  it('returns false when session save fails', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => {
            throw new Error('quota');
          }),
          remove: vi.fn(async () => undefined),
        },
      },
    });
    expect(await saveDocumentSession(sampleSession)).toBe(false);
  });
});
