import { existsSync, readFileSync } from 'node:fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { reconstructPdfLines } from '../document/pdf/reconstructPdfLines';
import { extractCharacteristics, resetCharacteristicIdCounter } from './extractCharacteristics';
import type { DocumentParseResult } from '../shared/types/document';

const HARSLE_PDF_PATH =
  'C:/Users/Вячеслав/Desktop/Новая папка/HARSLE PB-2000 Panel Bender.pdf';

interface PdfTextItemLike {
  str?: string;
  transform?: number[];
  width?: number;
}

function reconstructPdfLinesLegacy(items: PdfTextItemLike[]): ReturnType<typeof reconstructPdfLines> {
  const spans = items
    .filter((item) => item.str?.trim() && Array.isArray(item.transform))
    .map((item) => ({
      text: item.str!.trim(),
      x: item.transform![4] ?? 0,
      y: item.transform![5] ?? 0,
    }));

  const lineGroups: Array<{ y: number; spans: typeof spans }> = [];
  for (const span of spans) {
    const existing = lineGroups.find((group) => Math.abs(group.y - span.y) <= 3);
    if (existing) {
      existing.spans.push(span);
    } else {
      lineGroups.push({ y: span.y, spans: [span] });
    }
  }

  lineGroups.sort((left, right) => right.y - left.y);
  return lineGroups
    .map((group, index) => ({
      lineNumber: index + 1,
      text: group.spans
        .sort((left, right) => left.x - right.x)
        .map((span) => span.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((line) => line.text.length > 0);
}

async function parseHarsleWith(
  reconstructFn: (items: PdfTextItemLike[], pageWidth?: number) => ReturnType<typeof reconstructPdfLines>,
): Promise<DocumentParseResult> {
  const data = new Uint8Array(readFileSync(HARSLE_PDF_PATH));
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
  } as Parameters<typeof pdfjsLib.getDocument>[0]).promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const items = textContent.items.filter((item) => 'str' in item) as PdfTextItemLike[];
    const lines = reconstructFn(items, viewport.width);
    pages.push({
      pageNumber,
      text: lines.map((line) => line.text).join('\n'),
      lines,
    });
  }

  return {
    type: 'pdf',
    fileName: 'HARSLE PB-2000 Panel Bender.pdf',
    fullText: pages.map((page) => page.text).join('\n\n'),
    pages,
    warnings: [],
  };
}

describe.skipIf(!existsSync(HARSLE_PDF_PATH))('HARSLE v0.8 regression', () => {
  it('restores configuration rows after multi-column split hardening', async () => {
    resetCharacteristicIdCounter();
    const legacyDoc = await parseHarsleWith((items) => reconstructPdfLinesLegacy(items));
    const legacy = extractCharacteristics(legacyDoc);

    resetCharacteristicIdCounter();
    const currentDoc = await parseHarsleWith((items, pageWidth) =>
      reconstructPdfLines(items, { pageWidth }),
    );
    const current = extractCharacteristics(currentDoc);

    expect(legacy.stats.total).toBe(29);
    expect(current.stats.total).toBe(29);

    for (const label of ['Linear Guide', 'Ball Screw', 'Reducer', 'Bending Tooling']) {
      expect(current.characteristics.some((item) => item.sourceLabel === label)).toBe(true);
    }

    expect(current.characteristics.some((item) => item.sourceLabel === '● HIWIN')).toBe(false);
    expect(current.characteristics.some((item) => item.sourceLabel === 'Bending T ooling')).toBe(false);
    expect(current.characteristics.some((item) => item.sourceLabel === 'Bending Tooling')).toBe(true);
  });
});
