import { existsSync, readFileSync } from 'node:fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { pageTextFromLines, reconstructPdfLines } from '../document/pdf/reconstructPdfLines';
import { extractCharacteristics, resetCharacteristicIdCounter } from './extractCharacteristics';
import type { DocumentParseResult } from '../shared/types/document';

const HARSLE_PDF_PATH =
  'C:/Users/Вячеслав/Desktop/Новая папка/HARSLE PB-2000 Panel Bender.pdf';

async function parseHarslePdf(path: string): Promise<DocumentParseResult> {
  const data = new Uint8Array(readFileSync(path));
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
  } as Parameters<typeof pdfjsLib.getDocument>[0]).promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = reconstructPdfLines(textContent.items.filter((item) => 'str' in item));
    const text = pageTextFromLines(lines);
    pages.push({ pageNumber, text, lines });
  }

  return {
    type: 'pdf',
    fileName: 'HARSLE PB-2000 Panel Bender.pdf',
    fullText: pages.map((page) => page.text).join('\n\n'),
    pages,
    warnings: [],
  };
}

describe.skipIf(!existsSync(HARSLE_PDF_PATH))('HARSLE acceptance', () => {
  it('extracts key technical parameters from real PDF', async () => {
    resetCharacteristicIdCounter();
    const document = await parseHarslePdf(HARSLE_PDF_PATH);
    const result = extractCharacteristics(document);

    expect(result.stats.total).toBe(29);

    const has = (label: string) =>
      result.characteristics.some((item) => item.sourceLabel.includes(label));

    expect(has('Motor Power')).toBe(true);
    expect(has('Max. Feeding Speed')).toBe(true);
    expect(has('Weight')).toBe(true);
    expect(has('Feeding Structure')).toBe(true);
    expect(has('Max. Bending Length')).toBe(true);
    expect(has('Linear Guide')).toBe(true);
    expect(has('Ball Screw')).toBe(true);
    expect(has('Reducer')).toBe(true);
    expect(has('Bending Tooling')).toBe(true);

    const motorPower = result.characteristics.find((item) => item.sourceLabel.includes('Motor Power'));
    expect(motorPower?.rawValue).toBe('61');
    expect(motorPower?.normalizedUnit ?? motorPower?.rawUnit).toBe('kW');

    const feedingSpeed = result.characteristics.find((item) =>
      item.sourceLabel.includes('Max. Feeding Speed'),
    );
    expect(feedingSpeed?.rawValue).toBe('120');
    expect(feedingSpeed?.normalizedUnit ?? feedingSpeed?.rawUnit).toBe('m/min');

    if (process.env.FP_HARSLE_REPORT === '1') {
      console.log(
        JSON.stringify(
          {
            stats: result.stats,
            characteristics: result.characteristics.map((item) => ({
              label: item.sourceLabel,
              value: item.rawValue,
              unit: item.normalizedUnit ?? item.rawUnit,
              kind: item.valueKind,
              page: item.source.pageNumber,
              method: item.extractionMethod,
              source: item.source.text,
            })),
          },
          null,
          2,
        ),
      );
    }
  }, 30000);
});
