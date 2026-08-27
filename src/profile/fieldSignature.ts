import type { FormField } from '../shared/types/form';
import { normalizePropertyLabel } from './normalizePropertyLabel';
import type { PageFieldSignature } from './profileTypes';

export function buildFieldSignature(field: FormField): PageFieldSignature {
  return {
    elementType: field.elementType,
    inputType: field.inputType,
    normalizedLabel: normalizePropertyLabel(field.label),
    name: field.name,
    id: field.htmlId,
  };
}

export type FieldResolveStatus = 'resolved' | 'ambiguous' | 'not-found';

export interface FieldResolveResult {
  status: FieldResolveStatus;
  field?: FormField;
}

export function resolveFieldFromSignature(
  fields: FormField[],
  signature: PageFieldSignature,
): FieldResolveResult {
  const sameType = fields.filter((field) => field.elementType === signature.elementType);

  if (signature.name) {
    const byName = sameType.filter((field) => field.name === signature.name);
    const resolved = pickUnique(byName);
    if (resolved) {
      return resolved;
    }
  }

  if (signature.id && !isLikelyDynamicHtmlId(signature.id)) {
    const byHtmlId = sameType.filter((field) => field.htmlId === signature.id);
    const resolved = pickUnique(byHtmlId);
    if (resolved) {
      return resolved;
    }
  }

  if (signature.normalizedLabel) {
    const byLabel = sameType.filter(
      (field) => normalizePropertyLabel(field.label) === signature.normalizedLabel,
    );
    const resolved = pickUnique(byLabel);
    if (resolved) {
      return resolved;
    }
  }

  const compositeMatches = sameType.filter((field) => countSignatureMatches(field, signature) >= 2);
  const resolved = pickUnique(compositeMatches);
  if (resolved) {
    return resolved;
  }

  return { status: 'not-found' };
}

function pickUnique(matches: FormField[]): FieldResolveResult | null {
  if (matches.length === 1) {
    return { status: 'resolved', field: matches[0] };
  }
  if (matches.length > 1) {
    return { status: 'ambiguous' };
  }
  return null;
}

function countSignatureMatches(field: FormField, signature: PageFieldSignature): number {
  let score = 0;

  if (signature.name && field.name === signature.name) {
    score += 1;
  }

  if (signature.id && field.htmlId === signature.id) {
    score += 1;
  }

  if (signature.normalizedLabel && normalizePropertyLabel(field.label) === signature.normalizedLabel) {
    score += 1;
  }

  if (signature.inputType && field.inputType === signature.inputType) {
    score += 1;
  }

  return score;
}

export function isLikelyDynamicHtmlId(id: string): boolean {
  if (/^[a-f0-9-]{16,}$/i.test(id)) {
    return true;
  }

  if (/^js-[a-z0-9]{4,}$/i.test(id)) {
    return true;
  }

  if (/^\d{6,}$/.test(id)) {
    return true;
  }

  return false;
}

export function signaturesEqual(left: PageFieldSignature, right: PageFieldSignature): boolean {
  return (
    left.elementType === right.elementType &&
    (left.inputType ?? '') === (right.inputType ?? '') &&
    (left.normalizedLabel ?? '') === (right.normalizedLabel ?? '') &&
    (left.name ?? '') === (right.name ?? '') &&
    (left.id ?? '') === (right.id ?? '')
  );
}
