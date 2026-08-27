import * as pdfjsLib from 'pdfjs-dist';
import { ensurePdfWorkerConfigured } from '../document/pdf/setupPdfjs';

export const OCR_RENDER_SCALE = 2.5;

export interface RenderedPdfPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export async function renderPdfPageForOcr(
  pdfData: ArrayBuffer,
  pageNumber: number,
  scale = OCR_RENDER_SCALE,
): Promise<RenderedPdfPage> {
  ensurePdfWorkerConfigured();

  const loadingTask = pdfjsLib.getDocument({
    data: pdfData.slice(0),
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation: page.rotate });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context недоступен для OCR.');
  }

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return {
    pageNumber,
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}

export function releaseRenderedPage(page: RenderedPdfPage): void {
  page.canvas.width = 0;
  page.canvas.height = 0;
}
