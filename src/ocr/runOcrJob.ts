import type { OcrEngine, OcrJobResult, OcrLanguagePreset, OcrOptions, OcrPageResult } from './types';
import { ocrLanguagePresetToCodes, ocrPageResultToLines } from './types';

export interface RunOcrJobOptions {
  pageNumbers: number[];
  language: OcrLanguagePreset;
  renderPage: (pageNumber: number) => Promise<HTMLCanvasElement>;
  engine: OcrEngine;
  signal?: AbortSignal;
  onProgress?: OcrOptions['onProgress'];
}

export async function runOcrJob(options: RunOcrJobOptions): Promise<OcrJobResult> {
  const { pageNumbers, language, renderPage, engine, signal, onProgress } = options;
  const results: OcrPageResult[] = [];
  const warnings: string[] = [];
  const startedAt = Date.now();

  try {
    for (let index = 0; index < pageNumbers.length; index += 1) {
      if (signal?.aborted) {
        throw new DOMException('OCR cancelled', 'AbortError');
      }

      const pageNumber = pageNumbers[index]!;
      onProgress?.({
        pageNumber,
        pageIndex: index + 1,
        totalPages: pageNumbers.length,
        status: `Распознаём страницу ${pageNumber}…`,
        progress: index / pageNumbers.length,
      });

      const canvas = await renderPage(pageNumber);
      const pageStartedAt = Date.now();
      try {
        const pageResult = await engine.recognizePage(canvas, {
          language,
          signal,
          onProgress: (progress) => {
            onProgress?.({
              pageNumber,
              pageIndex: index + 1,
              totalPages: pageNumbers.length,
              status: progress.status,
              progress: (index + progress.progress) / pageNumbers.length,
            });
          },
        });
        results.push({
          ...pageResult,
          pageNumber,
          language: ocrLanguagePresetToCodes(language),
          durationMs: Date.now() - pageStartedAt,
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } finally {
    await engine.dispose();
  }

  onProgress?.({
    pageNumber: pageNumbers[pageNumbers.length - 1] ?? 0,
    pageIndex: pageNumbers.length,
    totalPages: pageNumbers.length,
    status: 'Готово',
    progress: 1,
  });

  const totalDurationMs = Date.now() - startedAt;
  return {
    results,
    metrics: {
      pagesProcessed: results.length,
      totalDurationMs,
      averagePageDurationMs:
        results.length > 0 ? totalDurationMs / results.length : 0,
      warnings,
    },
  };
}

export function normalizeOcrPageResult(
  pageNumber: number,
  text: string,
  language: string,
  warnings: string[] = [],
  confidence?: number,
): OcrPageResult {
  const lines = ocrPageResultToLines(text).map((line) => ({
    ...line,
    confidence,
  }));
  return {
    pageNumber,
    text: lines.map((line) => line.text).join('\n'),
    lines,
    language,
    warnings,
  };
}
