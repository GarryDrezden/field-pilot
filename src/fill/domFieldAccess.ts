import type { FormField } from '../shared/types/form';
import type { PageFieldSignature } from '../profile/profileTypes';
import { resolveFieldFromSignature } from '../profile/fieldSignature';
import { getCurrentValue } from '../form/labelResolver';

export function findFieldElementByRuntimeId(
  runtimeId: string,
  root: Document | ShadowRoot = document,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const element = root.querySelector(`[data-fieldpilot-id="${cssEscape(runtimeId)}"]`);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element;
  }
  return null;
}

export function resolveLiveField(
  runtimeId: string | undefined,
  signature: PageFieldSignature | undefined,
  scannedFields: FormField[],
  root: Document | ShadowRoot = document,
): {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  field: FormField | null;
  status: 'resolved' | 'missing' | 'ambiguous';
} {
  if (runtimeId) {
    const element = findFieldElementByRuntimeId(runtimeId, root);
    const field = scannedFields.find((item) => item.id === runtimeId) ?? null;
    if (element && field) {
      return { element, field, status: 'resolved' };
    }
  }

  if (signature) {
    const resolved = resolveFieldFromSignature(scannedFields, signature);
    if (resolved.status === 'resolved' && resolved.field) {
      const element = findFieldElementByRuntimeId(resolved.field.id, root);
      if (element) {
        return { element, field: resolved.field, status: 'resolved' };
      }
      return { element: null, field: resolved.field, status: 'missing' };
    }
    if (resolved.status === 'ambiguous') {
      return { element: null, field: null, status: 'ambiguous' };
    }
  }

  return { element: null, field: null, status: 'missing' };
}

export function readLiveFieldValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): string {
  return getCurrentValue(element) ?? '';
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && 'escape' in CSS) {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}
