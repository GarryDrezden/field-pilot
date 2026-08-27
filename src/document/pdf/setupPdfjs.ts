import * as pdfjsLib from 'pdfjs-dist';

let isConfigured = false;

export function ensurePdfWorkerConfigured(): void {
  if (isConfigured) {
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');
  isConfigured = true;
}
