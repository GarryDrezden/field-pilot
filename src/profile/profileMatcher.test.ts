import { describe, expect, it } from 'vitest';
import { buildFieldSignature, resolveFieldFromSignature } from './fieldSignature';
import { matchProfileToFields } from './profileMatcher';
import type { FieldProfile } from './profileTypes';
import type { FormField } from '../shared/types/form';

const sampleFields: FormField[] = [
  {
    id: 'fp-1',
    elementType: 'input',
    inputType: 'text',
    label: 'Мощность двигателя, кВт',
    name: 'PROP_POWER',
    htmlId: 'power',
    disabled: false,
    readonly: false,
  },
  {
    id: 'fp-2',
    elementType: 'input',
    inputType: 'text',
    label: 'Вес, кг',
    name: 'PROP_WEIGHT',
    htmlId: 'weight',
    disabled: false,
    readonly: false,
  },
];

const sampleProfile: FieldProfile = {
  id: 'profile-1',
  name: 'Test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  properties: [
    { id: 'p1', name: 'Мощность двигателя, кВт', aliases: [] },
    { id: 'p2', name: 'Длина, мм', aliases: ['Length'] },
    { id: 'p3', name: 'Отсутствует на странице', aliases: [] },
  ],
  mappings: [],
};

describe('fieldSignature', () => {
  it('resolves field by stable html name', () => {
    const signature = buildFieldSignature(sampleFields[0]!);
    const resolved = resolveFieldFromSignature(sampleFields, signature);
    expect(resolved.status).toBe('resolved');
    expect(resolved.field?.name).toBe('PROP_POWER');
  });
});

describe('profileMatcher', () => {
  it('matches exact labels and leaves missing properties unlinked', () => {
    const summary = matchProfileToFields(sampleProfile, sampleFields);
    expect(summary.linkedCount).toBe(1);
    expect(summary.rows.find((row) => row.property.id === 'p1')?.matchSource).toBe('exact-label');
    expect(summary.rows.find((row) => row.property.id === 'p3')?.fieldRuntimeId).toBeNull();
  });

  it('matches exact alias labels', () => {
    const profile: FieldProfile = {
      ...sampleProfile,
      properties: [{ id: 'p2', name: 'Длина, мм', aliases: ['Вес, кг'] }],
    };
    const summary = matchProfileToFields(profile, sampleFields);
    expect(summary.rows.find((row) => row.property.id === 'p2')?.matchSource).toBe('exact-alias');
  });

  it('restores saved mapping on a new scan', () => {
    const profile: FieldProfile = {
      ...sampleProfile,
      mappings: [
        {
          propertyId: 'p2',
          fieldSignature: buildFieldSignature(sampleFields[1]!),
          source: 'manual',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const summary = matchProfileToFields(profile, sampleFields);
    expect(summary.rows.find((row) => row.property.id === 'p2')?.matchSource).toBe('saved');
    expect(summary.rows.find((row) => row.property.id === 'p2')?.fieldLabel).toBe('Вес, кг');
  });
});
