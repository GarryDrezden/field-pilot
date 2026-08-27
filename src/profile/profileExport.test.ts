import { describe, expect, it } from 'vitest';
import { buildProfileFromImport, exportProfile, parseProfileExport, serializeProfileExport } from './profileExport';
import { resolveFieldFromSignature } from './fieldSignature';
import type { FieldProfile } from './profileTypes';

const createId = (() => {
  let counter = 0;
  return () => `new-${++counter}`;
})();

const sampleProfile: FieldProfile = {
  id: 'profile-1',
  name: 'Test profile',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  properties: [
    {
      id: 'prop-1',
      name: 'Вес, кг',
      externalId: 'PARAM14',
      aliases: ['Weight'],
      sourceOrder: 2140,
      sourceIndex: 14,
    },
  ],
  mappings: [
    {
      propertyId: 'prop-1',
      fieldSignature: {
        elementType: 'input',
        inputType: 'text',
        normalizedLabel: 'вес, кг',
        name: 'WEIGHT',
      },
      source: 'manual',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('profileExport', () => {
  it('roundtrips profile json with properties and mappings', () => {
    const json = serializeProfileExport(sampleProfile);
    const bundle = parseProfileExport(JSON.parse(json) as unknown);
    const imported = buildProfileFromImport(bundle, createId);

    expect(imported.name).toBe('Test profile');
    expect(imported.properties).toHaveLength(1);
    expect(imported.properties[0]?.externalId).toBe('PARAM14');
    expect(imported.properties[0]?.sourceOrder).toBe(2140);
    expect(imported.mappings).toHaveLength(1);
    expect(imported.mappings[0]?.propertyId).toBe(imported.properties[0]?.id);
  });

  it('exports fieldpilot format identifier', () => {
    const payload = exportProfile(sampleProfile);
    expect(payload.format).toBe('fieldpilot-profile');
    expect(payload.version).toBe(1);
  });
});

describe('fieldSignature ambiguous', () => {
  it('marks ambiguous when multiple fields share normalized label', () => {
    const fields = [
      {
        id: 'f1',
        elementType: 'input' as const,
        inputType: 'text',
        label: 'Вес, кг',
        name: 'A',
        htmlId: 'a',
        disabled: false,
        readonly: false,
      },
      {
        id: 'f2',
        elementType: 'input' as const,
        inputType: 'text',
        label: 'Вес, кг',
        name: 'B',
        htmlId: 'b',
        disabled: false,
        readonly: false,
      },
    ];

    const resolved = resolveFieldFromSignature(fields, {
      elementType: 'input',
      normalizedLabel: 'вес, кг',
    });
    expect(resolved.status).toBe('ambiguous');
  });
});
