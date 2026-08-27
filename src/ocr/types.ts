export type OcrLanguagePreset = 'rus+eng' | 'eng' | 'rus';

export interface OcrLine {
  lineNumber: number;
  text: string;
  confidence?: number;
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  lines: OcrLine[];
  language: string;
  durationMs?: number;
  warnings: string[];
}

export interface OcrOptions {
  language: OcrLanguagePreset;
  signal?: AbortSignal;
  onProgress?: (progress: OcrProgress) => void;
}

export interface OcrProgress {
  pageNumber: number;
  pageIndex: number;
  totalPages: number;
  status: string;
  progress: number;
}

export interface OcrEngine {
  recognizePage(image: ImageLike, options: OcrOptions): Promise<OcrPageResult>;
  dispose(): Promise<void>;
}

export type ImageLike = ImageData | HTMLCanvasElement | OffscreenCanvas;

export interface OcrJobMetrics {
  pagesProcessed: number;
  totalDurationMs: number;
  averagePageDurationMs: number;
  warnings: string[];
}

export interface OcrJobResult {
  results: OcrPageResult[];
  metrics: OcrJobMetrics;
}

export function ocrLanguagePresetToCodes(preset: OcrLanguagePreset): string {
  switch (preset) {
    case 'eng':
      return 'eng';
    case 'rus':
      return 'rus';
    default:
      return 'rus+eng';
  }
}

export function ocrPageResultToLines(text: string): OcrLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => ({
      lineNumber: index + 1,
      text: line,
    }));
}
