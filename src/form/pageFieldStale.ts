import type { FormField } from '../shared/types/form';
import { resolveLiveField } from '../fill/domFieldAccess';

export interface PageScanSnapshot {
  pageUrl: string;
  pageTitle: string;
  scanGeneration: number;
  fieldIds: string[];
}

export function buildPageScanSnapshot(
  fields: FormField[],
  pageUrl: string,
  pageTitle: string,
  scanGeneration: number,
): PageScanSnapshot {
  return {
    pageUrl,
    pageTitle,
    scanGeneration,
    fieldIds: fields.map((field) => field.id),
  };
}

export function detectStalePageFields(
  fields: FormField[],
  snapshot: PageScanSnapshot | null,
  root: Document | ShadowRoot = document,
): { stale: boolean; resolvedCount: number; total: number } {
  if (!snapshot || fields.length === 0) {
    return { stale: false, resolvedCount: 0, total: fields.length };
  }

  if (snapshot.pageUrl !== window.location.href) {
    return { stale: true, resolvedCount: 0, total: fields.length };
  }

  let resolvedCount = 0;
  for (const field of fields) {
    const resolved = resolveLiveField(field.id, undefined, fields, root);
    if (resolved.status === 'resolved') {
      resolvedCount += 1;
    }
  }

  const ratio = resolvedCount / fields.length;
  return {
    stale: ratio < 0.5,
    resolvedCount,
    total: fields.length,
  };
}
