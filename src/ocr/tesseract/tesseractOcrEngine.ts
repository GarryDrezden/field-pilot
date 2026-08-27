import { createWorker } from 'tesseract.js';
import type { OcrEngine, OcrOptions, OcrPageResult } from '../types';
import { normalizeOcrPageResult } from '../runOcrJob';
import { ocrLanguagePresetToCodes } from '../types';

export interface TesseractAssetPaths {
  workerPath: string;
  corePath: string;
  langPath: string;
}

export function resolveTesseractAssetPaths(baseUrl: string): TesseractAssetPaths {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return {
    workerPath: `${normalizedBase}worker.min.js`,
    corePath: `${normalizedBase}core/`,
    langPath: `${normalizedBase}lang/`,
  };
}

export async function createTesseractOcrEngine(baseUrl: string): Promise<OcrEngine> {
  const paths = resolveTesseractAssetPaths(baseUrl);
  const worker = await createWorker([], 1, {
    workerPath: paths.workerPath,
    corePath: paths.corePath,
    langPath: paths.langPath,
    workerBlobURL: false,
    cacheMethod: 'none',
    gzip: true,
  });

  let loadedLanguage: string | null = null;
  let disposed = false;

  async function ensureLanguage(language: OcrOptions['language']): Promise<void> {
    const langCode = ocrLanguagePresetToCodes(language);
    if (loadedLanguage === langCode) {
      return;
    }
    await worker.reinitialize(langCode);
    loadedLanguage = langCode;
  }

  return {
    async recognizePage(image, options: OcrOptions): Promise<OcrPageResult> {
      if (disposed) {
        throw new Error('OCR engine disposed');
      }
      if (options.signal?.aborted) {
        throw new DOMException('OCR cancelled', 'AbortError');
      }

      await ensureLanguage(options.language);

      const startedAt = Date.now();
      const result = await worker.recognize(image as unknown as HTMLCanvasElement, {}, { text: true });

      if (options.signal?.aborted) {
        throw new DOMException('OCR cancelled', 'AbortError');
      }

      const text = result.data.text ?? '';
      const confidence = result.data.confidence;
      return {
        ...normalizeOcrPageResult(
          0,
          text,
          ocrLanguagePresetToCodes(options.language),
          [],
          confidence,
        ),
        durationMs: Date.now() - startedAt,
      };
    },
    async dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      await worker.terminate();
    },
  };
}
