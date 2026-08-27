import { existsSync, readFileSync } from 'node:fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { pageTextFromLines, reconstructPdfLines } from '../document/pdf/reconstructPdfLines';
import { extractCharacteristics, resetCharacteristicIdCounter } from '../extraction/extractCharacteristics';
import { matchDocumentToProfile } from '../matching/matchDocumentToProfile';
import type { DocumentParseResult } from '../shared/types/document';
import type { ProfileProperty } from '../profile/profileTypes';

const HARSLE_PDF_PATH =
  'C:/Users/Вячеслав/Desktop/Новая папка/HARSLE PB-2000 Panel Bender.pdf';

const moskladSubset: ProfileProperty[] = [
  { id: 'p10', name: 'Мощность двигателя, кВт', externalId: 'PARAM10', aliases: ['Motor Power'], unit: 'kW' },
  { id: 'p14', name: 'Вес, кг', externalId: 'PARAM14', aliases: ['Weight'], unit: 'kg' },
  { id: 'p20', name: 'Угол гибки, °', externalId: 'PARAM20', aliases: [], unit: '°' },
  { id: 'p21', name: 'Скорость подачи, м/мин', externalId: 'PARAM21', aliases: [], unit: 'm/min' },
  { id: 'p22', name: 'Толщина нержавеющей стали, мм', externalId: 'PARAM22', aliases: [], unit: 'mm' },
  { id: 'p23', name: 'Толщина металла (алюминий), мм', externalId: 'PARAM23', aliases: [], unit: 'mm' },
  { id: 'p30', name: 'Потребляемая мощность, кВт', externalId: 'PARAM30', aliases: [], unit: 'kW' },
  { id: 'p31', name: 'Длина, мм', externalId: 'PARAM31', aliases: [], unit: 'mm' },
  { id: 'p32', name: 'Ширина, мм', externalId: 'PARAM32', aliases: [], unit: 'mm' },
  { id: 'p33', name: 'Высота, мм', externalId: 'PARAM33', aliases: [], unit: 'mm' },
  { id: 'p40', name: 'Максимальная длина, мм', externalId: 'PARAM40', aliases: [], unit: 'mm' },
  { id: 'p41', name: 'Минимальная длина, мм', externalId: 'PARAM41', aliases: [], unit: 'mm' },
  { id: 'p50', name: 'Максимальная скорость гибки, s/bending', externalId: 'PARAM50', aliases: [], unit: 's/bending' },
];

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


describe.skipIf(!existsSync(HARSLE_PDF_PATH))('HARSLE matching acceptance', () => {
  it('matches key HARSLE characteristics against Mosklad-like profile subset', async () => {
    resetCharacteristicIdCounter();
    const document = await parseHarslePdf(HARSLE_PDF_PATH);
    const extraction = extractCharacteristics(document);
    const matching = matchDocumentToProfile(extraction.characteristics, moskladSubset);

    expect(extraction.stats.total).toBeGreaterThan(15);
    expect(matching.stats.total).toBe(extraction.characteristics.length);

    const byLabel = (label: string) => {
      const characteristic = extraction.characteristics.find((item) => item.sourceLabel.includes(label));
      return matching.matches.find((match) => match.characteristicId === characteristic?.id);
    };

    expect(byLabel('Motor Power')?.level).toBe('high');
    expect(byLabel('Motor Power')?.propertyId).toBe('p10');

    expect(byLabel('Weight')?.level).toBe('high');
    expect(byLabel('Weight')?.propertyId).toBe('p14');

    expect(byLabel('Bending Angle')?.level).toBe('high');
    expect(byLabel('Bending Angle')?.propertyId).toBe('p20');

    expect(byLabel('Average Working Power')?.level).not.toBe('high');
    expect(byLabel('Average Working Power')?.propertyId).toBe('p30');

    const feedingSpeed = byLabel('Max. Feeding Speed');
    expect(feedingSpeed?.level === 'high' || feedingSpeed?.level === 'review').toBe(true);
    expect(feedingSpeed?.propertyId).toBe('p21');

    if (process.env.FP_HARSLE_MATCH_REPORT === '1') {
      console.log(
        JSON.stringify(
          {
            stats: matching.stats,
            matches: extraction.characteristics.map((item) => {
              const match = matching.matches.find((entry) => entry.characteristicId === item.id);
              const property = moskladSubset.find((entry) => entry.id === match?.propertyId);
              return {
                label: item.sourceLabel,
                value: item.rawValue,
                unit: item.normalizedUnit ?? item.rawUnit,
                level: match?.level,
                confidence: match?.confidence,
                property: property?.name,
                externalId: property?.externalId,
              };
            }),
          },
          null,
          2,
        ),
      );
    }
  });
});
