import type { CharacteristicValueKind } from './types';

export interface ParsedCharacteristicValue {
  rawValue: string;
  normalizedValue: string;
  valueKind: CharacteristicValueKind;
}

const RANGE_SEPARATORS = /(?:\s*(?:–|—|-)\s*|\s+to\s+|\s+до\s+)/i;
const DIMENSION_SEPARATORS = /\s*[x×*]\s*/i;

export function parseCharacteristicValue(raw: string): ParsedCharacteristicValue | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (DIMENSION_SEPARATORS.test(trimmed)) {
    const parts = trimmed.split(DIMENSION_SEPARATORS).map(normalizeNumberToken);
    if (parts.length >= 2 && parts.every(isNumericToken)) {
      return {
        rawValue: trimmed,
        normalizedValue: parts.join('×'),
        valueKind: 'dimension',
      };
    }
  }

  if (RANGE_SEPARATORS.test(trimmed)) {
    const parts = trimmed.split(RANGE_SEPARATORS).map(normalizeNumberToken);
    if (parts.length === 2 && parts.every(isNumericToken)) {
      return {
        rawValue: trimmed,
        normalizedValue: `${parts[0]}–${parts[1]}`,
        valueKind: 'range',
      };
    }
  }

  const normalized = normalizeNumberToken(trimmed);
  if (isNumericToken(normalized)) {
    return {
      rawValue: trimmed,
      normalizedValue: normalized,
      valueKind: 'number',
    };
  }

  if (trimmed.length > 0) {
    return {
      rawValue: trimmed,
      normalizedValue: trimmed.replace(/\s+/g, ' ').trim(),
      valueKind: 'text',
    };
  }

  return null;
}

function normalizeNumberToken(value: string): string {
  let normalized = value.trim();
  normalized = normalized.replace(/\s+/g, '');
  normalized = normalized.replace(/^([+-])/, '$1');
  normalized = normalized.replace(/(\d),(\d)/g, '$1.$2');
  return normalized;
}

function isNumericToken(value: string): boolean {
  return /^[+-±]?\d+(?:\.\d+)?$/.test(value);
}

export function normalizeLabelKey(label: string): string {
  return label.trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ');
}

export function buildDedupKey(
  sourceLabel: string,
  normalizedValue: string,
  normalizedUnit?: string,
): string {
  return `${normalizeLabelKey(sourceLabel)}|${normalizedValue}|${normalizedUnit ?? ''}`;
}
