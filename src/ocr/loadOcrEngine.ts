import type { OcrEngine } from './types';

let cachedEngineFactory: ((baseUrl: string) => Promise<OcrEngine>) | null = null;

export async function loadOcrEngineFactory(): Promise<(baseUrl: string) => Promise<OcrEngine>> {
  if (cachedEngineFactory) {
    return cachedEngineFactory;
  }

  const moduleUrl = chrome.runtime.getURL('ocr/ocrEngine.js');
  const module = (await import(/* @vite-ignore */ moduleUrl)) as {
    createTesseractOcrEngine: (baseUrl: string) => Promise<OcrEngine>;
  };

  cachedEngineFactory = module.createTesseractOcrEngine;
  return cachedEngineFactory;
}

export async function createLazyOcrEngine(): Promise<OcrEngine> {
  const baseUrl = chrome.runtime.getURL('ocr/');
  const factory = await loadOcrEngineFactory();
  return factory(baseUrl);
}

export function resetOcrEngineCacheForTests(): void {
  cachedEngineFactory = null;
}
