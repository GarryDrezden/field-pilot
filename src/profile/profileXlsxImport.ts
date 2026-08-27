import * as XLSX from 'xlsx';
import { inferColumnMapping, mapTableToDrafts, type ColumnMapping, type ParsedTable } from './profileImport';
import type { ImportedPropertyDraft } from './profileTypes';

export interface XlsxSheetPreview {
  sheetNames: string[];
  selectedSheet: string;
  autoSelectedSheet: boolean;
  table: ParsedTable;
  mapping: ColumnMapping | null;
  drafts: ImportedPropertyDraft[];
}

function matrixToTable(matrix: unknown[][]): ParsedTable {
  if (matrix.length === 0) {
    return { headers: [], rows: [], delimiter: 'xlsx' };
  }

  const [headerRow, ...bodyRows] = matrix;
  const headers = (headerRow ?? []).map((cell) => String(cell ?? '').trim());
  const rows = bodyRows
    .map((row) => headers.map((_, index) => String(row[index] ?? '').trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  return { headers, rows, delimiter: 'xlsx' };
}

export function parseXlsxArrayBuffer(buffer: ArrayBuffer, preferredSheet?: string): XlsxSheetPreview {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('Файл Excel не содержит листов.');
  }

  const autoSelectedSheet = sheetNames.length === 1;
  const selectedSheet =
    preferredSheet && sheetNames.includes(preferredSheet) ? preferredSheet : sheetNames[0]!;

  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) {
    throw new Error(`Лист «${selectedSheet}» не найден.`);
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
  const table = matrixToTable(matrix);

  if (table.headers.length === 0 && table.rows.length === 0) {
    throw new Error('Выбранный лист пуст.');
  }

  const mapping = inferColumnMapping(table.headers);
  const drafts = mapping ? mapTableToDrafts(table, mapping) : [];

  return {
    sheetNames,
    selectedSheet,
    autoSelectedSheet,
    table,
    mapping,
    drafts,
  };
}

export async function parseXlsxFile(file: File, preferredSheet?: string): Promise<XlsxSheetPreview> {
  const buffer = await file.arrayBuffer();
  return parseXlsxArrayBuffer(buffer, preferredSheet);
}

export function rebuildXlsxPreview(
  buffer: ArrayBuffer,
  sheetName: string,
  mapping: ColumnMapping,
): XlsxSheetPreview {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Лист «${sheetName}» не найден.`);
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
  const table = matrixToTable(matrix);
  const drafts = mapTableToDrafts(table, mapping);

  return {
    sheetNames,
    selectedSheet: sheetName,
    autoSelectedSheet: sheetNames.length === 1,
    table,
    mapping,
    drafts,
  };
}

export function createXlsxFixtureBuffer(): ArrayBuffer {
  const rows = [
    ['#', 'Название', 'Симв. код', 'Сортировка'],
    [1, 'Страна-производитель', 'PARAM1', 2010],
    [2, 'Вес, кг', 'PARAM14', 2140],
    [3, 'Мощность двигателя, кВт', 'PARAM10', 4780],
    [4, 'Резка квадратного профиля под 30°, мм', 'PARAM2226', 24260],
    [5, 'Резка квадратного профиля под 30°, мм', 'PARAM2248', 24480],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Лист1');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
