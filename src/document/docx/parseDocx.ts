import mammoth from 'mammoth';
import type { DocumentParseResult, DocumentTable } from '../../shared/types/document';
import { normalizeWhitespace } from '../../shared/utils';

export async function parseDocxFile(file: File): Promise<DocumentParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const warnings: string[] = [];

  const [rawTextResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer }),
  ]);

  rawTextResult.messages.forEach((message) => {
    warnings.push(message.message);
  });
  htmlResult.messages.forEach((message) => {
    warnings.push(message.message);
  });

  const fullText = normalizeWhitespace(rawTextResult.value);
  const tables = extractTablesFromHtml(htmlResult.value);

  if (!fullText) {
    warnings.push('В документе не удалось извлечь текст.');
  }

  return {
    type: 'docx',
    fileName: file.name,
    fullText,
    tables,
    warnings,
  };
}

function extractTablesFromHtml(html: string): DocumentTable[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tableElements = Array.from(doc.querySelectorAll('table'));

  return tableElements.map((table, index) => {
    const rows = Array.from(table.querySelectorAll('tr')).map((row) => expandRowCells(row));
    return {
      index,
      rows: normalizeTableRows(rows),
    };
  });
}

function expandRowCells(row: Element): string[] {
  const cells: string[] = [];

  for (const cell of Array.from(row.querySelectorAll('th, td'))) {
    const text = normalizeWhitespace(cell.textContent ?? '');
    const colspan = Number.parseInt(cell.getAttribute('colspan') ?? '1', 10);
    const safeColspan = Number.isFinite(colspan) && colspan > 0 ? colspan : 1;
    for (let index = 0; index < safeColspan; index += 1) {
      cells.push(index === 0 ? text : text ? `${text} (${index + 1})` : '');
    }
  }

  return cells;
}

function normalizeTableRows(rows: string[][]): string[][] {
  if (rows.length === 0) {
    return rows;
  }

  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const normalized = rows.map((row) => {
    const next = [...row];
    while (next.length < maxColumns) {
      next.push('');
    }
    return next.map((cell) => cell.trim());
  });

  const withoutRepeatedHeaders = normalized.filter((row, index) => {
    if (index === 0 || !isLikelyHeaderRow(row)) {
      return true;
    }
    const previous = normalized[index - 1];
    return !previous || !rowsEqual(previous, row);
  });

  return withoutRepeatedHeaders.filter((row) => row.some((cell) => cell.length > 0));
}

function isLikelyHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.filter((cell) => cell.length > 0);
  if (nonEmpty.length === 0) {
    return false;
  }
  return nonEmpty.every((cell) => /^[A-Za-zА-Яа-я#№\s./-]+$/.test(cell) && !/\d/.test(cell));
}

function rowsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((cell, index) => cell === right[index]);
}
