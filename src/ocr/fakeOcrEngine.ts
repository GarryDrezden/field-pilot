import type { OcrEngine, OcrOptions, OcrPageResult } from './types';
import { normalizeOcrPageResult } from './runOcrJob';
import { ocrLanguagePresetToCodes } from './types';

export interface FakeOcrEngineOptions {
  pageTexts?: Record<number, string>;
  delayMs?: number;
}

export function createFakeOcrEngine(options: FakeOcrEngineOptions = {}): OcrEngine {
  let disposed = false;

  return {
    async recognizePage(_image, ocrOptions: OcrOptions): Promise<OcrPageResult> {
      if (disposed) {
        throw new Error('Fake OCR engine disposed');
      }
      if (ocrOptions.signal?.aborted) {
        throw new DOMException('OCR cancelled', 'AbortError');
      }

      const progress = ocrOptions.onProgress;
      progress?.({
        pageNumber: 0,
        pageIndex: 0,
        totalPages: 0,
        status: 'recognizing text',
        progress: 0.5,
      });

      if (options.delayMs) {
        await sleep(options.delayMs, ocrOptions.signal);
      }

      const language = ocrLanguagePresetToCodes(ocrOptions.language);
      const text =
        Object.values(options.pageTexts ?? {})[0] ??
        'Motor Power kW 61';

      return normalizeOcrPageResult(0, text, language);
    },
    async dispose() {
      disposed = true;
    },
  };
}

export function createFakeOcrEngineWithPages(pageTexts: Record<number, string>): OcrEngine {
  let disposed = false;
  let callIndex = 0;
  const pageNumbers = Object.keys(pageTexts)
    .map((value) => Number.parseInt(value, 10))
    .sort((left, right) => left - right);

  return {
    async recognizePage(_image, ocrOptions: OcrOptions): Promise<OcrPageResult> {
      if (disposed) {
        throw new Error('Fake OCR engine disposed');
      }
      if (ocrOptions.signal?.aborted) {
        throw new DOMException('OCR cancelled', 'AbortError');
      }

      const pageNumber = pageNumbers[callIndex] ?? pageNumbers[0] ?? 1;
      callIndex += 1;
      const text = pageTexts[pageNumber] ?? '';
      const language = ocrLanguagePresetToCodes(ocrOptions.language);
      return normalizeOcrPageResult(pageNumber, text, language);
    },
    async dispose() {
      disposed = true;
    },
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('OCR cancelled', 'AbortError'));
      return;
    }

    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('OCR cancelled', 'AbortError'));
      },
      { once: true },
    );
  });
}
