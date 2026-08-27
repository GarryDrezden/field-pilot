import { describe, expect, it } from 'vitest';
import {
  inferColumnMapping,
  mergeCatalogIntoProfile,
  mergeImportedProperties,
  parseDelimitedText,
  parseImportFileContent,
  parseJsonImport,
  parseTxtImport,
  validateImportDrafts,
} from './profileImport';
import { createXlsxFixtureBuffer, parseXlsxArrayBuffer } from './profileXlsxImport';
import type { ProfileProperty } from './profileTypes';

const createId = (() => {
  let counter = 0;
  return () => `id-${++counter}`;
})();

describe('profileImport', () => {
  it('parses txt lines into properties', () => {
    const drafts = parseTxtImport('Вес, кг\n\nДлина, мм\n');
    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.name).toBe('Вес, кг');
  });

  it('parses csv with quoted values', () => {
    const table = parseDelimitedText('name,externalId\n"Вес, кг",123\n', ',');
    const mapping = inferColumnMapping(table.headers);
    expect(mapping?.name).toBe(0);
    expect(mapping?.externalId).toBe(1);
  });

  it('detects duplicate names without externalId as unchanged for txt lists', () => {
    const existing: ProfileProperty[] = [{ id: '1', name: 'Вес, кг', aliases: [] }];
    const result = mergeImportedProperties(existing, [{ name: '  вес, кг ' }, { name: 'Длина, мм' }], createId);
    expect(result.report.added).toBe(1);
    expect(result.report.unchanged).toBe(1);
  });

  it('validates json import items individually', () => {
    const drafts = parseJsonImport([
      { name: 'Вес, кг', externalId: '1' },
      { aliases: ['x'] },
      { name: 'Длина, мм' },
    ]);
    expect(drafts).toHaveLength(2);
  });

  it('imports russian csv headers', () => {
    const content = 'Название;Код;Ед. изм.\nМощность двигателя, кВт;456;kW';
    const drafts = parseImportFileContent('props.csv', content);
    expect(drafts[0]?.name).toBe('Мощность двигателя, кВт');
    expect(drafts[0]?.externalId).toBe('456');
  });

  it('keeps duplicate names when externalId differs', () => {
    const drafts = [
      { name: 'Резка квадратного профиля под 30°, мм', externalId: 'PARAM2226' },
      { name: 'Резка квадратного профиля под 30°, мм', externalId: 'PARAM2248' },
    ];
    const result = mergeCatalogIntoProfile([], drafts, createId);
    expect(result.properties).toHaveLength(2);
    expect(result.report.added).toBe(2);
  });

  it('reimports by externalId and preserves internal id', () => {
    const existing: ProfileProperty[] = [
      { id: 'keep-me', name: 'Old name', externalId: 'PARAM10', aliases: ['alias'], sourceOrder: 100 },
    ];
    const drafts = [{ name: 'Мощность двигателя, кВт', externalId: 'PARAM10', sourceOrder: 4780 }];
    const result = mergeCatalogIntoProfile(existing, drafts, createId);
    expect(result.properties).toHaveLength(1);
    expect(result.properties[0]?.id).toBe('keep-me');
    expect(result.properties[0]?.name).toBe('Мощность двигателя, кВт');
    expect(result.properties[0]?.aliases).toEqual(['alias']);
    expect(result.report.updated).toBe(1);
  });

  it('flags duplicate externalId as conflict', () => {
    const drafts = [
      { name: 'A', externalId: 'PARAM1' },
      { name: 'B', externalId: 'PARAM1' },
    ];
    const validation = validateImportDrafts(drafts);
    expect(validation.duplicateExternalIdList).toEqual(['PARAM1']);
    const result = mergeCatalogIntoProfile([], drafts, createId);
    expect(result.report.conflicts).toBe(2);
    expect(result.properties).toHaveLength(0);
  });

  it('reports properties missing from new export', () => {
    const existing: ProfileProperty[] = [
      { id: '1', name: 'A', externalId: 'PARAM1', aliases: [] },
      { id: '2', name: 'B', externalId: 'PARAM2', aliases: [] },
    ];
    const drafts = [{ name: 'A', externalId: 'PARAM1' }];
    const result = mergeCatalogIntoProfile(existing, drafts, createId);
    expect(result.report.missingFromImport).toBe(1);
  });
});

describe('profileXlsxImport', () => {
  it('detects russian xlsx columns and reads properties', () => {
    const parsed = parseXlsxArrayBuffer(createXlsxFixtureBuffer());
    expect(parsed.mapping?.name).toBe(1);
    expect(parsed.mapping?.externalId).toBe(2);
    expect(parsed.mapping?.sourceOrder).toBe(3);
    expect(parsed.mapping?.sourceIndex).toBe(0);
    expect(parsed.drafts).toHaveLength(5);
    expect(parsed.drafts.find((item) => item.externalId === 'PARAM10')?.name).toBe('Мощность двигателя, кВт');
  });

  it('keeps duplicate names from xlsx fixture', () => {
    const parsed = parseXlsxArrayBuffer(createXlsxFixtureBuffer());
    const dupes = parsed.drafts.filter((item) => item.name === 'Резка квадратного профиля под 30°, мм');
    expect(dupes).toHaveLength(2);
    expect(new Set(dupes.map((item) => item.externalId)).size).toBe(2);
  });
});
