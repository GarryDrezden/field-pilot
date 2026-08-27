export interface DocumentLine {
  lineNumber: number;
  text: string;
}

export type DocumentPageSource = 'native' | 'ocr';

export interface PageTextQuality {
  pageNumber: number;
  textItemCount: number;
  nonWhitespaceCharacters: number;
  reconstructedLineCount: number;
  suspiciousCharacterRatio?: number;
  level: 'good' | 'weak' | 'empty';
  reasons: string[];
}

export interface DocumentPage {
  pageNumber: number;
  text: string;
  lines?: DocumentLine[];
  nativeText?: string;
  nativeLines?: DocumentLine[];
  ocrText?: string;
  ocrLines?: DocumentLine[];
  preferredTextSource?: DocumentPageSource;
  textQuality?: PageTextQuality;
}

export interface DocumentTable {
  index: number;
  rows: string[][];
}

export interface PdfParseDiagnostics {
  totalPages: number;
  goodTextPages: number;
  weakTextPages: number;
  emptyTextPages: number;
  ocrCandidatePageNumbers: number[];
}

export interface DocumentParseResult {
  type: 'pdf' | 'docx';
  fileName: string;
  fullText: string;
  pages?: DocumentPage[];
  tables?: DocumentTable[];
  warnings: string[];
  pdfDiagnostics?: PdfParseDiagnostics;
}

export type DocumentParseStatus = 'idle' | 'parsing' | 'ready' | 'error';

export interface LoadedDocument {
  fileName: string;
  format: 'pdf' | 'docx';
  sizeBytes: number;
  status: DocumentParseStatus;
  result?: DocumentParseResult;
  errorMessage?: string;
}
