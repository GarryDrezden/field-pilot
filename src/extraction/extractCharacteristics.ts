import type { DocumentParseResult } from '../shared/types/document';
import { deduplicateCharacteristics } from './deduplicateCharacteristics';
import { extractFromLineBatch } from './extractFromLines';
import { extractFromTableRows } from './extractFromTables';
import { normalizeUnit } from './normalizeUnit';
import { parseCharacteristicValue } from './parseValue';
import type {
  ExtractedCharacteristic,
  ExtractionCandidateDraft,
  ExtractionResult,
  ExtractionStats,
} from './types';

let idCounter = 0;

export function createCharacteristicId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `fp-char-${Date.now()}-${idCounter}`;
}

export function resetCharacteristicIdCounter(): void {
  idCounter = 0;
}

export function extractCharacteristics(document: DocumentParseResult): ExtractionResult {
  const warnings: string[] = [];
  const drafts: ExtractionCandidateDraft[] = [];

  if (document.tables?.length) {
    for (const table of document.tables) {
      drafts.push(...extractFromTableRows(table.rows, table.index));
    }
  }

  const lineInputs: Array<{ text: string; pageNumber?: number; lineNumber?: number }> = [];

  if (document.pages?.length) {
    for (const page of document.pages) {
      if (page.lines?.length) {
        for (const line of page.lines) {
          lineInputs.push({
            text: line.text,
            pageNumber: page.pageNumber,
            lineNumber: line.lineNumber,
          });
        }
      } else if (page.text) {
        page.text.split(/\r?\n/).forEach((text, index) => {
          if (text.trim()) {
            lineInputs.push({
              text: text.trim(),
              pageNumber: page.pageNumber,
              lineNumber: index + 1,
            });
          }
        });
      }
    }
  } else if (document.fullText) {
    document.fullText.split(/\r?\n/).forEach((text, index) => {
      if (text.trim()) {
        lineInputs.push({ text: text.trim(), lineNumber: index + 1 });
      }
    });
  }

  drafts.push(...extractFromLineBatch(lineInputs));

  const characteristics = deduplicateCharacteristics(drafts, finalizeDraft);
  const stats = buildStats(characteristics);

  if (characteristics.length === 0 && document.fullText.trim()) {
    warnings.push('Структурированные характеристики не найдены.');
  }

  return { characteristics, warnings, stats };
}

function finalizeDraft(draft: ExtractionCandidateDraft): ExtractedCharacteristic | null {
  const parsed = parseCharacteristicValue(draft.rawValue);
  if (!parsed) {
    return null;
  }

  const normalizedUnit = draft.rawUnit ? normalizeUnit(draft.rawUnit) : undefined;

  return {
    id: createCharacteristicId(),
    sourceLabel: draft.sourceLabel.trim(),
    rawValue: parsed.rawValue,
    normalizedValue: parsed.normalizedValue,
    rawUnit: draft.rawUnit,
    normalizedUnit,
    valueKind: parsed.valueKind,
    extractionMethod: draft.extractionMethod,
    source: draft.source,
  };
}

function buildStats(characteristics: ExtractedCharacteristic[]): ExtractionStats {
  return {
    total: characteristics.length,
    numeric: characteristics.filter((item) => item.valueKind === 'number' || item.valueKind === 'range' || item.valueKind === 'dimension').length,
    text: characteristics.filter((item) => item.valueKind === 'text').length,
    table: characteristics.filter((item) => item.extractionMethod === 'table-row').length,
    lines: characteristics.filter((item) => item.extractionMethod !== 'table-row').length,
  };
}
