import type { ExtractedCharacteristic } from '../../extraction/types';

export function formatSourceLocation(item: ExtractedCharacteristic): string | null {
  if (item.source.pageNumber !== undefined) {
    return `стр. ${item.source.pageNumber}`;
  }
  if (item.source.tableIndex !== undefined && item.source.rowIndex !== undefined) {
    return `Таблица ${item.source.tableIndex + 1}, строка ${item.source.rowIndex + 1}`;
  }
  if (item.source.lineNumber !== undefined) {
    return `строка ${item.source.lineNumber}`;
  }
  return null;
}

export function formatCharacteristicValue(matchCharacteristic: {
  rawValue: string;
  rawUnit?: string;
  normalizedUnit?: string;
}): string {
  const unit = matchCharacteristic.normalizedUnit ?? matchCharacteristic.rawUnit;
  return unit ? `${matchCharacteristic.rawValue} ${unit}` : matchCharacteristic.rawValue;
}

export function formatSourcePreview(item: ExtractedCharacteristic): string {
  const parts: string[] = [];
  if (item.source.pageNumber !== undefined) {
    parts.push(`Страница ${item.source.pageNumber}`);
  }
  if (item.source.tableIndex !== undefined && item.source.rowIndex !== undefined) {
    parts.push(`Таблица ${item.source.tableIndex + 1}, строка ${item.source.rowIndex + 1}`);
  }
  if (item.source.lineNumber !== undefined && item.source.pageNumber === undefined) {
    parts.push(`Строка ${item.source.lineNumber}`);
  }
  parts.push(`"${item.source.text}"`);
  return parts.join('\n');
}
