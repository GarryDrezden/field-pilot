import { normalizeUnit } from './normalizeUnit';
import { parseCharacteristicValue } from './parseValue';
import { isLikelyHeaderRow, isValidCharacteristicLabel } from './proseDetection';
import type { ExtractionCandidateDraft } from './types';

export function extractFromTableRows(
  rows: string[][],
  tableIndex: number,
): ExtractionCandidateDraft[] {
  const candidates: ExtractionCandidateDraft[] = [];

  rows.forEach((row, rowIndex) => {
    const cells = row.map((cell) => cell.trim()).filter((cell) => cell.length > 0);
    if (cells.length < 2 || isLikelyHeaderRow(cells)) {
      return;
    }

    const draft = rowToCandidate(cells, tableIndex, rowIndex);
    if (draft) {
      candidates.push(draft);
    }
  });

  return candidates;
}

function rowToCandidate(
  cells: string[],
  tableIndex: number,
  rowIndex: number,
): ExtractionCandidateDraft | null {
  const sourceText = cells.join(' | ');

  if (cells.length === 2) {
    const [label, value] = cells;
    if (!label || !value || !isValidCharacteristicLabel(label)) {
      return null;
    }
    return buildCandidate(label, value, undefined, 'table-row', {
      text: sourceText,
      tableIndex,
      rowIndex,
    });
  }

  if (cells.length === 3) {
    const [first, second, third] = cells;
    if (/^\d+[.)]?$/.test(first ?? '')) {
      if (!second || !third || !isValidCharacteristicLabel(second)) {
        return null;
      }
      const unitCandidate = normalizeUnit(third);
      if (unitCandidate && isNumericLike(third)) {
        return buildCandidate(second, third, undefined, 'table-row', {
          text: sourceText,
          tableIndex,
          rowIndex,
        });
      }
      return buildCandidate(second, third, undefined, 'table-row', {
        text: sourceText,
        tableIndex,
        rowIndex,
      });
    }

    if (!first || !second || !third || !isValidCharacteristicLabel(first)) {
      return null;
    }

    return buildCandidate(first, third, second, 'table-row', {
      text: sourceText,
      tableIndex,
      rowIndex,
    });
  }

  if (cells.length >= 4) {
    const [indexCell, label, unit, value, ...rest] = cells;
    const resolvedValue = rest.length > 0 ? rest.join(' ') : value;
    const resolvedLabel = /^\d+[.)]?$/.test(indexCell ?? '') ? label : indexCell;
    const resolvedRawValue = /^\d+[.)]?$/.test(indexCell ?? '') ? resolvedValue : unit;

    if (!resolvedLabel || !resolvedRawValue || !isValidCharacteristicLabel(resolvedLabel)) {
      return null;
    }

    const maybeUnit = /^\d+[.)]?$/.test(indexCell ?? '') ? unit : undefined;
    return buildCandidate(resolvedLabel, String(resolvedRawValue), maybeUnit, 'table-row', {
      text: sourceText,
      tableIndex,
      rowIndex,
    });
  }

  return null;
}

function buildCandidate(
  sourceLabel: string,
  rawValue: string,
  rawUnit: string | undefined,
  extractionMethod: ExtractionCandidateDraft['extractionMethod'],
  source: ExtractionCandidateDraft['source'],
): ExtractionCandidateDraft | null {
  const parsed = parseCharacteristicValue(rawValue);
  if (!parsed) {
    return null;
  }

  return {
    sourceLabel: sourceLabel.trim(),
    rawValue: parsed.rawValue,
    rawUnit,
    valueKind: parsed.valueKind,
    extractionMethod,
    source,
  };
}

function isNumericLike(value: string): boolean {
  return /^[+-]?±?\d+(?:[.,]\d+)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)*$/.test(value.trim());
}
