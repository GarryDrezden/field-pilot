export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export interface DocumentTable {
  index: number;
  rows: string[][];
}

export interface DocumentParseResult {
  type: 'pdf' | 'docx';
  fileName: string;
  fullText: string;
  pages?: DocumentPage[];
  tables?: DocumentTable[];
  warnings: string[];
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
