export type CharacteristicSourceOrigin =
  | 'pdf-text'
  | 'docx-table'
  | 'docx-text'
  | 'ocr';

export type CharacteristicValueKind = 'number' | 'range' | 'dimension' | 'text';

export type ExtractionMethod = 'table-row' | 'structured-line' | 'delimited-line';

export interface CharacteristicSource {
  text: string;
  pageNumber?: number;
  lineNumber?: number;
  tableIndex?: number;
  rowIndex?: number;
  origin?: CharacteristicSourceOrigin;
}

export interface ExtractedCharacteristic {
  id: string;
  sourceLabel: string;
  rawValue: string;
  normalizedValue: string;
  rawUnit?: string;
  normalizedUnit?: string;
  valueKind: CharacteristicValueKind;
  extractionMethod: ExtractionMethod;
  source: CharacteristicSource;
}

export interface ExtractionStats {
  total: number;
  numeric: number;
  text: number;
  table: number;
  lines: number;
}

export interface ExtractionResult {
  characteristics: ExtractedCharacteristic[];
  warnings: string[];
  stats: ExtractionStats;
}

export interface ExtractionCandidateDraft {
  sourceLabel: string;
  rawValue: string;
  rawUnit?: string;
  valueKind: CharacteristicValueKind;
  extractionMethod: ExtractionMethod;
  source: CharacteristicSource;
}

export interface LineExtractionInput {
  text: string;
  pageNumber?: number;
  lineNumber?: number;
  origin?: CharacteristicSourceOrigin;
}
