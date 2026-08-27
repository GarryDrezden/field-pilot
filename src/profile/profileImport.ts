import { isNormalizedDuplicate, normalizePropertyLabel } from './normalizePropertyLabel';
import type { ImportedPropertyDraft, ImportDuplicateReport, ProfileProperty } from './profileTypes';

const NAME_HEADERS = new Set([
  'name',
  'property',
  'title',
  'label',
  'название',
  'наименование',
  'свойство',
  'характеристика',
]);

const EXTERNAL_ID_HEADERS = new Set(['id', 'externalid', 'external_id', 'code', 'код']);
const UNIT_HEADERS = new Set(['unit', 'units', 'единица', 'едизм', 'ед_изм', 'ед.изм.']);
const ALIAS_HEADERS = new Set(['alias', 'aliases', 'синоним', 'алиас']);

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  delimiter: ',' | ';' | '\t';
}

export interface ColumnMapping {
  name: number;
  externalId?: number;
  unit?: number;
  aliases?: number;
}

export interface ImportPreview {
  drafts: ImportedPropertyDraft[];
  report: ImportDuplicateReport;
}

export function parseTxtImport(text: string): ImportedPropertyDraft[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ name: line, aliases: [] }));
}

export function detectDelimiter(sample: string): ',' | ';' | '\t' {
  const firstLine = sample.split(/\r?\n/)[0] ?? '';
  const counts = {
    ',': (firstLine.match(/,/g) ?? []).length,
    ';': (firstLine.match(/;/g) ?? []).length,
    '\t': (firstLine.match(/\t/g) ?? []).length,
  };

  if (counts['\t'] >= counts[';'] && counts['\t'] >= counts[',']) {
    return '\t';
  }
  if (counts[';'] >= counts[',']) {
    return ';';
  }
  return ',';
}

export function parseDelimitedText(text: string, delimiter?: ',' | ';' | '\t'): ParsedTable {
  const resolvedDelimiter = delimiter ?? detectDelimiter(text);
  const rows = parseCsvRows(text, resolvedDelimiter);
  if (rows.length === 0) {
    return { headers: [], rows: [], delimiter: resolvedDelimiter };
  }

  const [headerRow, ...bodyRows] = rows;
  return {
    headers: headerRow ?? [],
    rows: bodyRows.filter((row) => row.some((cell) => cell.trim().length > 0)),
    delimiter: resolvedDelimiter,
  };
}

export function parseCsvRows(text: string, delimiter: ',' | ';' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.map((parsedRow) => parsedRow.map((value) => value.trim()));
}

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('ru-RU')
    .replace(/\s+/g, '')
    .replace(/\./g, '');
}

export function inferColumnMapping(headers: string[]): ColumnMapping | null {
  if (headers.length === 0) {
    return null;
  }

  if (headers.length === 1) {
    return { name: 0 };
  }

  const normalized = headers.map(normalizeHeader);
  const nameIndex = normalized.findIndex((header) => NAME_HEADERS.has(header));
  if (nameIndex < 0) {
    return null;
  }

  const mapping: ColumnMapping = { name: nameIndex };
  const externalIdIndex = normalized.findIndex((header) => EXTERNAL_ID_HEADERS.has(header));
  const unitIndex = normalized.findIndex((header) => UNIT_HEADERS.has(header));
  const aliasIndex = normalized.findIndex((header) => ALIAS_HEADERS.has(header));

  if (externalIdIndex >= 0) {
    mapping.externalId = externalIdIndex;
  }
  if (unitIndex >= 0) {
    mapping.unit = unitIndex;
  }
  if (aliasIndex >= 0) {
    mapping.aliases = aliasIndex;
  }

  return mapping;
}

export function mapTableToDrafts(table: ParsedTable, mapping: ColumnMapping): ImportedPropertyDraft[] {
  return table.rows
    .map((row) => rowToDraft(row, mapping))
    .filter((draft): draft is ImportedPropertyDraft => draft !== null);
}

function rowToDraft(row: string[], mapping: ColumnMapping): ImportedPropertyDraft | null {
  const name = row[mapping.name]?.trim();
  if (!name) {
    return null;
  }

  const draft: ImportedPropertyDraft = { name, aliases: [] };
  if (mapping.externalId !== undefined) {
    const externalId = row[mapping.externalId]?.trim();
    if (externalId) {
      draft.externalId = externalId;
    }
  }
  if (mapping.unit !== undefined) {
    const unit = row[mapping.unit]?.trim();
    if (unit) {
      draft.unit = unit;
    }
  }
  if (mapping.aliases !== undefined) {
    const aliasesRaw = row[mapping.aliases]?.trim();
    if (aliasesRaw) {
      draft.aliases = aliasesRaw.split(/[|;]/).map((item) => item.trim()).filter(Boolean);
    }
  }

  return draft;
}

export function parseJsonImport(raw: unknown): ImportedPropertyDraft[] {
  if (!Array.isArray(raw)) {
    throw new Error('JSON должен содержать массив свойств.');
  }

  const drafts: ImportedPropertyDraft[] = [];
  const errors: string[] = [];

  raw.forEach((item, index) => {
    try {
      drafts.push(parseJsonItem(item));
    } catch (error) {
      errors.push(`Строка ${index + 1}: ${error instanceof Error ? error.message : 'ошибка'}`);
    }
  });

  if (drafts.length === 0 && errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return drafts;
}

function parseJsonItem(item: unknown): ImportedPropertyDraft {
  if (!item || typeof item !== 'object') {
    throw new Error('ожидается объект');
  }

  const record = item as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) {
    throw new Error('отсутствует name');
  }

  const draft: ImportedPropertyDraft = { name, aliases: [] };
  if (typeof record.externalId === 'string' && record.externalId.trim()) {
    draft.externalId = record.externalId.trim();
  }
  if (typeof record.unit === 'string' && record.unit.trim()) {
    draft.unit = record.unit.trim();
  }
  if (Array.isArray(record.aliases)) {
    draft.aliases = record.aliases.filter((alias): alias is string => typeof alias === 'string' && alias.trim().length > 0);
  }

  return draft;
}

export function mergeImportedProperties(
  existing: ProfileProperty[],
  drafts: ImportedPropertyDraft[],
): ImportPreview {
  const report: ImportDuplicateReport = {
    added: 0,
    duplicates: 0,
    invalid: 0,
    errors: [],
  };

  const normalizedExisting = new Set(existing.map((property) => normalizePropertyLabel(property.name)));
  const resultDrafts: ImportedPropertyDraft[] = [];

  for (const draft of drafts) {
    if (!draft.name.trim()) {
      report.invalid += 1;
      continue;
    }

    const normalized = normalizePropertyLabel(draft.name);
    if (normalizedExisting.has(normalized) || resultDrafts.some((item) => isNormalizedDuplicate(item.name, draft.name))) {
      report.duplicates += 1;
      continue;
    }

    normalizedExisting.add(normalized);
    resultDrafts.push(draft);
    report.added += 1;
  }

  return { drafts: resultDrafts, report };
}

export function parseImportFileContent(fileName: string, content: string): ImportedPropertyDraft[] {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.json')) {
    return parseJsonImport(JSON.parse(content) as unknown);
  }

  if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerName.endsWith('.txt')) {
    const delimiter = lowerName.endsWith('.tsv') ? '\t' : detectDelimiter(content);
    const table = parseDelimitedText(content, delimiter);
    const mapping = inferColumnMapping(table.headers);
    if (!mapping && table.headers.length > 1) {
      throw new Error('Не удалось определить колонку названия свойства.');
    }
    if (table.headers.length <= 1 && table.rows.length > 0 && table.rows.every((row) => row.length === 1)) {
      return parseTxtImport(content);
    }
    if (!mapping) {
      throw new Error('Таблица не содержит понятных заголовков.');
    }
    return mapTableToDrafts(table, mapping);
  }

  return parseTxtImport(content);
}
