import { findUnitInText, normalizeUnit } from './normalizeUnit';
import { parseCharacteristicValue } from './parseValue';
import {
  isLikelyHeaderLine,
  isLikelyProseLine,
  isValidCharacteristicLabel,
} from './proseDetection';
import type { CharacteristicSourceOrigin, ExtractionCandidateDraft, LineExtractionInput } from './types';

const ROW_PREFIX = /^(?:№\s*)?\d+[.)]\s+/;

interface LineExtractionContext {
  groupLabel?: string;
}

export function extractFromStructuredLine(
  line: string,
  pageNumber: number | undefined,
  lineNumber: number | undefined,
  context: LineExtractionContext = {},
  origin?: CharacteristicSourceOrigin,
): { candidate: ExtractionCandidateDraft | null; nextContext: LineExtractionContext } {
  const trimmed = line.trim();
  if (!trimmed || isLikelyProseLine(trimmed) || isLikelyHeaderLine(trimmed)) {
    return { candidate: null, nextContext: context };
  }

  const withoutPrefix = trimmed.replace(ROW_PREFIX, '').trim();
  const delimited = extractDelimitedCandidate(withoutPrefix, trimmed, pageNumber, lineNumber, origin);
  if (delimited) {
    return {
      candidate: delimited.candidate,
      nextContext: updateContextFromLabel(delimited.candidate.sourceLabel, context),
    };
  }

  const unitMatch = findUnitInText(withoutPrefix);
  if (unitMatch && unitMatch.afterUnit) {
    const parsed = parseCharacteristicValue(unitMatch.afterUnit);
    if (parsed && parsed.valueKind !== 'text' && isValidCharacteristicLabel(unitMatch.beforeUnit)) {
      const sourceLabel = applyGroupPrefix(unitMatch.beforeUnit, context);
      const candidate: ExtractionCandidateDraft = {
        sourceLabel,
        rawValue: parsed.rawValue,
        rawUnit: unitMatch.rawUnit,
        valueKind: parsed.valueKind,
        extractionMethod: 'structured-line',
        source: { text: trimmed, pageNumber, lineNumber, origin },
      };
      return {
        candidate,
        nextContext: updateContextFromLabel(sourceLabel, context, unitMatch.beforeUnit),
      };
    }
  }

  return { candidate: null, nextContext: context };
}

export function extractFromLineBatch(lines: LineExtractionInput[]): ExtractionCandidateDraft[] {
  const candidates: ExtractionCandidateDraft[] = [];
  let context: LineExtractionContext = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const inferredGroup = inferGroupLabel(lines, index);
    const effectiveContext = inferredGroup ? { groupLabel: inferredGroup } : context;
    const result = extractFromStructuredLine(
      line.text,
      line.pageNumber,
      line.lineNumber,
      effectiveContext,
      line.origin,
    );
    context = result.nextContext;
    if (result.candidate) {
      candidates.push(result.candidate);
    }
  }

  return candidates;
}

function inferGroupLabel(
  lines: Array<{ text: string }>,
  index: number,
): string | undefined {
  const current = lines[index]?.text.replace(ROW_PREFIX, '').trim() ?? '';
  const firstToken = current.split(/\s+/)[0] ?? '';

  const isThicknessChild = /^(SS|MS|AL)$/i.test(firstToken);
  const isDimensionChild = /^(Length|Width|Height)$/i.test(firstToken);
  if (!isThicknessChild && !isDimensionChild) {
    return undefined;
  }

  for (let offset = 0; offset <= 3; offset += 1) {
    const neighbor = lines[index + offset]?.text.replace(ROW_PREFIX, '').trim();
    if (!neighbor) {
      continue;
    }

    if (isThicknessChild && /\bThickness\b/i.test(neighbor)) {
      return 'Bending Thickness';
    }

    if (isDimensionChild && /\bDimension\b/i.test(neighbor)) {
      return 'Dimension';
    }
  }

  return undefined;
}

function extractDelimitedCandidate(
  withoutPrefix: string,
  sourceText: string,
  pageNumber?: number,
  lineNumber?: number,
  origin?: CharacteristicSourceOrigin,
): { candidate: ExtractionCandidateDraft } | null {
  const delimiters = [' ● ', ' / ', ': ', ' = '] as const;

  for (const delimiter of delimiters) {
    if (delimiter === ' / ' && isUnitSlash(withoutPrefix)) {
      continue;
    }

    const index = withoutPrefix.indexOf(delimiter);
    if (index <= 0) {
      continue;
    }

    const label = withoutPrefix.slice(0, index).trim();
    const value = withoutPrefix.slice(index + delimiter.length).trim();
    if (!isValidCharacteristicLabel(label) || !value) {
      continue;
    }

    const parsed = parseCharacteristicValue(value);
    if (!parsed) {
      continue;
    }

    return {
      candidate: {
        sourceLabel: label,
        rawValue: parsed.rawValue,
        valueKind: parsed.valueKind,
        extractionMethod: 'delimited-line',
        source: { text: sourceText, pageNumber, lineNumber, origin },
      },
    };
  }

  return null;
}

function isUnitSlash(text: string): boolean {
  return /\b(?:m\/min|mm\/min|mm\/s|m\/s|s\/bending|r\/min)\b/i.test(text);
}

function applyGroupPrefix(label: string, context: LineExtractionContext): string {
  if (!context.groupLabel) {
    return label;
  }

  const normalizedLabel = label.toLocaleLowerCase('ru-RU');
  const normalizedGroup = context.groupLabel.toLocaleLowerCase('ru-RU');
  if (normalizedLabel.startsWith(normalizedGroup)) {
    return label;
  }

  if (/^(SS|MS|AL|Length|Width|Height)$/i.test(label.trim())) {
    return `${context.groupLabel} ${label}`;
  }

  return label;
}

function updateContextFromLabel(
  sourceLabel: string,
  context: LineExtractionContext,
  rawLabel?: string,
): LineExtractionContext {
  const label = rawLabel ?? sourceLabel;

  if (/\bBending Thickness\b/i.test(label)) {
    return { groupLabel: 'Bending Thickness' };
  }

  if (/\bDimension\b/i.test(label)) {
    return { groupLabel: 'Dimension' };
  }

  return context;
}

export function finalizeCandidateDraft(
  draft: ExtractionCandidateDraft,
): ExtractionCandidateDraft | null {
  const parsed = parseCharacteristicValue(draft.rawValue);
  if (!parsed) {
    return null;
  }

  return {
    ...draft,
    rawValue: parsed.rawValue,
    valueKind: parsed.valueKind,
    rawUnit: draft.rawUnit,
  };
}

export function attachNormalizedUnits(draft: ExtractionCandidateDraft): ExtractionCandidateDraft {
  return {
    ...draft,
    rawUnit: draft.rawUnit,
  };
}

export { normalizeUnit };
