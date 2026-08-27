import { isNormalizedDuplicate, normalizePropertyLabel } from './normalizePropertyLabel';
import type {
  CatalogMergeReport,
  CatalogMergeResult,
  ImportedPropertyDraft,
  ImportValidationReport,
  ProfileProperty,
} from './profileTypes';

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

const EXTERNAL_ID_HEADERS = new Set([
  'id',
  'externalid',
  'external_id',
  'code',
  'код',
  'симвкод',
  'символьныйкод',
]);

const UNIT_HEADERS = new Set(['unit', 'units', 'единица', 'едизм', 'ед_изм', 'ед.изм.', 'единицаизмерения']);
const ALIAS_HEADERS = new Set(['alias', 'aliases', 'синоним', 'синонимы', 'алиас', 'алиасы']);
const ORDER_HEADERS = new Set(['sort', 'order', 'сортировка', 'порядок']);
const INDEX_HEADERS = new Set(['#', '№', 'no', 'num', 'index', 'номер']);

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  delimiter: ',' | ';' | '\t' | 'xlsx';
}

export interface ColumnMapping {
  name: number;
  externalId?: number;
  unit?: number;
  aliases?: number;
  sourceOrder?: number;
  sourceIndex?: number;
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
  const orderIndex = normalized.findIndex((header) => ORDER_HEADERS.has(header));
  const indexIndex = normalized.findIndex(
    (header, idx) => INDEX_HEADERS.has(header) || headers[idx]?.trim() === '#',
  );

  if (externalIdIndex >= 0) {
    mapping.externalId = externalIdIndex;
  }
  if (unitIndex >= 0) {
    mapping.unit = unitIndex;
  }
  if (aliasIndex >= 0) {
    mapping.aliases = aliasIndex;
  }
  if (orderIndex >= 0) {
    mapping.sourceOrder = orderIndex;
  }
  if (indexIndex >= 0) {
    mapping.sourceIndex = indexIndex;
  }

  return mapping;
}

export function mapTableToDrafts(table: ParsedTable, mapping: ColumnMapping): ImportedPropertyDraft[] {
  return table.rows
    .map((row) => rowToDraft(row, mapping))
    .filter((draft): draft is ImportedPropertyDraft => draft !== null);
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  if (mapping.sourceOrder !== undefined) {
    draft.sourceOrder = parseOptionalNumber(row[mapping.sourceOrder]);
  }
  if (mapping.sourceIndex !== undefined) {
    draft.sourceIndex = parseOptionalNumber(row[mapping.sourceIndex]);
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
  if (typeof record.sourceOrder === 'number' && Number.isFinite(record.sourceOrder)) {
    draft.sourceOrder = record.sourceOrder;
  }
  if (typeof record.sourceIndex === 'number' && Number.isFinite(record.sourceIndex)) {
    draft.sourceIndex = record.sourceIndex;
  }
  if (Array.isArray(record.aliases)) {
    draft.aliases = record.aliases.filter((alias): alias is string => typeof alias === 'string' && alias.trim().length > 0);
  }

  return draft;
}

export function validateImportDrafts(drafts: ImportedPropertyDraft[]): ImportValidationReport {
  const externalIdCounts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  let missingName = 0;
  let missingExternalId = 0;

  for (const draft of drafts) {
    if (!draft.name.trim()) {
      missingName += 1;
      continue;
    }
    if (!draft.externalId?.trim()) {
      missingExternalId += 1;
    } else {
      externalIdCounts.set(draft.externalId, (externalIdCounts.get(draft.externalId) ?? 0) + 1);
    }
    nameCounts.set(draft.name.trim(), (nameCounts.get(draft.name.trim()) ?? 0) + 1);
  }

  const duplicateExternalIdList = [...externalIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([externalId]) => externalId);

  const duplicateNames = [...nameCounts.values()].filter((count) => count > 1).length;

  const conflictRows = duplicateExternalIdList.reduce(
    (sum, externalId) => sum + (externalIdCounts.get(externalId) ?? 0),
    0,
  );

  const valid = drafts.filter(
    (draft) =>
      draft.name.trim().length > 0 &&
      (!draft.externalId || !duplicateExternalIdList.includes(draft.externalId)),
  ).length;

  return {
    totalRows: drafts.length,
    valid,
    missingName,
    missingExternalId,
    duplicateExternalIds: conflictRows,
    duplicateNames,
    duplicateExternalIdList,
  };
}

function draftToProperty(draft: ImportedPropertyDraft, createId: () => string): ProfileProperty {
  return {
    id: createId(),
    name: draft.name.trim(),
    externalId: draft.externalId?.trim() || undefined,
    unit: draft.unit,
    aliases: draft.aliases ?? [],
    sourceOrder: draft.sourceOrder,
    sourceIndex: draft.sourceIndex,
  };
}

function propertyNeedsUpdate(existing: ProfileProperty, draft: ImportedPropertyDraft): boolean {
  return (
    existing.name !== draft.name.trim() ||
    existing.unit !== draft.unit ||
    (draft.sourceOrder !== undefined && existing.sourceOrder !== draft.sourceOrder) ||
    (draft.sourceIndex !== undefined && existing.sourceIndex !== draft.sourceIndex)
  );
}

function applyDraftToExisting(existing: ProfileProperty, draft: ImportedPropertyDraft): ProfileProperty {
  return {
    ...existing,
    name: draft.name.trim(),
    unit: draft.unit ?? existing.unit,
    sourceOrder: draft.sourceOrder ?? existing.sourceOrder,
    sourceIndex: draft.sourceIndex ?? existing.sourceIndex,
  };
}

export function mergeCatalogIntoProfile(
  existing: ProfileProperty[],
  drafts: ImportedPropertyDraft[],
  createId: () => string,
): CatalogMergeResult {
  const validation = validateImportDrafts(drafts);
  const conflictIds = new Set(validation.duplicateExternalIdList);

  const existingByExternalId = new Map<string, ProfileProperty>();
  for (const property of existing) {
    if (property.externalId) {
      existingByExternalId.set(property.externalId, property);
    }
  }

  const result = [...existing];
  const resultById = new Map(result.map((property) => [property.id, property]));
  const seenExternalIds = new Set<string>();

  const report: CatalogMergeReport = {
    added: 0,
    updated: 0,
    unchanged: 0,
    conflicts: 0,
    missingFromImport: 0,
    invalid: validation.missingName,
  };

  for (const draft of drafts) {
    if (!draft.name.trim()) {
      continue;
    }

    if (draft.externalId && conflictIds.has(draft.externalId)) {
      report.conflicts += 1;
      continue;
    }

    if (draft.externalId) {
      seenExternalIds.add(draft.externalId);
      const matched = existingByExternalId.get(draft.externalId);
      if (matched) {
        if (propertyNeedsUpdate(matched, draft)) {
          const updated = applyDraftToExisting(matched, draft);
          resultById.set(updated.id, updated);
          const index = result.findIndex((item) => item.id === updated.id);
          if (index >= 0) {
            result[index] = updated;
          }
          report.updated += 1;
        } else {
          report.unchanged += 1;
        }
        continue;
      }
    }

    const created = draftToProperty(draft, createId);
    result.push(created);
    resultById.set(created.id, created);
    if (created.externalId) {
      existingByExternalId.set(created.externalId, created);
      seenExternalIds.add(created.externalId);
    }
    report.added += 1;
  }

  report.missingFromImport = existing.filter(
    (property) => property.externalId && !seenExternalIds.has(property.externalId),
  ).length;

  return { properties: result, report };
}

/** @deprecated Use mergeCatalogIntoProfile for catalog imports. Kept for TXT-only simple lists. */
export function mergeImportedProperties(
  existing: ProfileProperty[],
  drafts: ImportedPropertyDraft[],
  createId: () => string,
): CatalogMergeResult {
  const hasExternalIds = drafts.some((draft) => Boolean(draft.externalId?.trim()));
  if (hasExternalIds || existing.some((property) => property.externalId)) {
    return mergeCatalogIntoProfile(existing, drafts, createId);
  }

  const report: CatalogMergeReport = {
    added: 0,
    updated: 0,
    unchanged: 0,
    conflicts: 0,
    missingFromImport: 0,
    invalid: 0,
  };

  const normalizedExisting = new Set(existing.map((property) => normalizePropertyLabel(property.name)));
  const result = [...existing];

  for (const draft of drafts) {
    if (!draft.name.trim()) {
      report.invalid += 1;
      continue;
    }

    const normalized = normalizePropertyLabel(draft.name);
    if (
      normalizedExisting.has(normalized) ||
      result.some((item) => isNormalizedDuplicate(item.name, draft.name))
    ) {
      report.unchanged += 1;
      continue;
    }

    normalizedExisting.add(normalized);
    result.push(draftToProperty(draft, createId));
    report.added += 1;
  }

  return { properties: result, report };
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

export function previewCatalogMerge(
  existing: ProfileProperty[],
  drafts: ImportedPropertyDraft[],
  createId: () => string,
): CatalogMergeResult {
  return mergeCatalogIntoProfile(existing, drafts, createId);
}
