import { describe, expect, it } from 'vitest';
import {
  inferColumnMapping,
  mergeImportedProperties,
  parseDelimitedText,
  parseImportFileContent,
  parseJsonImport,
  parseTxtImport,
} from './profileImport';
import type { ProfileProperty } from './profileTypes';

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

  it('detects duplicates on import', () => {
    const existing: ProfileProperty[] = [
      { id: '1', name: 'Вес, кг', aliases: [] },
    ];
    const preview = mergeImportedProperties(existing, [
      { name: '  вес, кг ' },
      { name: 'Длина, мм' },
    ]);
    expect(preview.report.added).toBe(1);
    expect(preview.report.duplicates).toBe(1);
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
});
