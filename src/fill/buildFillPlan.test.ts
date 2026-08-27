import { describe, expect, it } from 'vitest';
import type { ExtractedCharacteristic } from '../extraction/types';
import type { FormField } from '../shared/types/form';
import type { EffectiveDocumentMatch } from '../matching/types';
import type { FieldProfile, ProfileProperty } from '../profile/profileTypes';
import { buildFillPlan } from './buildFillPlan';

function property(id: string, name: string, externalId?: string, aliases: string[] = []): ProfileProperty {
  return { id, name, externalId, aliases, unit: '' };
}

function characteristic(id: string, label: string, value: string, kind: ExtractedCharacteristic['valueKind'] = 'number'): ExtractedCharacteristic {
  return {
    id,
    sourceLabel: label,
    rawValue: value,
    normalizedValue: value,
    valueKind: kind,
    extractionMethod: 'structured-line',
    source: { text: `${label} ${value}` },
  };
}

function fillReadyMatch(characteristicId: string, propertyId: string): EffectiveDocumentMatch {
  return {
    characteristicId,
    propertyId,
    effectivePropertyId: propertyId,
    effectiveLevel: 'high',
    fillReady: true,
    confidence: 0.98,
    level: 'high',
    requiresReview: false,
    ambiguous: false,
    reasons: [],
    alternatives: [],
  };
}

describe('buildFillPlan', () => {
  const profile: FieldProfile = {
    id: 'profile-1',
    name: 'Test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    properties: [
      property('p10', 'Мощность двигателя, kW', 'PARAM10', ['Motor Power']),
      property('p14', 'Вес, kg', 'PARAM14', ['Weight']),
    ],
    mappings: [],
    learnedMappings: [],
  };

  const pageFields: FormField[] = [
    {
      id: 'fp-field-1',
      elementType: 'input',
      inputType: 'text',
      label: 'Motor Power',
      currentValue: undefined,
      disabled: false,
      readonly: false,
    },
    {
      id: 'fp-field-2',
      elementType: 'input',
      inputType: 'text',
      label: 'Weight',
      currentValue: '999',
      disabled: false,
      readonly: false,
    },
  ];

  it('marks empty mapped fields as ready', () => {
    const plan = buildFillPlan({
      fillReadyMatches: [fillReadyMatch('c1', 'p10')],
      characteristics: [characteristic('c1', 'Motor Power', '61')],
      properties: profile.properties,
      profile,
      pageFields,
    });

    expect(plan.operations[0]?.status).toBe('ready');
    expect(plan.operations[0]?.selected).toBe(true);
    expect(plan.operations[0]?.value).toBe('61');
  });

  it('marks non-empty fields as existing-value and unchecked', () => {
    const plan = buildFillPlan({
      fillReadyMatches: [fillReadyMatch('c2', 'p14')],
      characteristics: [characteristic('c2', 'Weight', '14000')],
      properties: profile.properties,
      profile,
      pageFields,
    });

    expect(plan.operations[0]?.status).toBe('existing-value');
    expect(plan.operations[0]?.selected).toBe(false);
  });

  it('marks equal values as already-equal', () => {
    const fields: FormField[] = [
      {
        id: 'fp-field-3',
        elementType: 'input',
        inputType: 'text',
        label: 'Motor Power',
        currentValue: '61',
        disabled: false,
        readonly: false,
      },
    ];

    const plan = buildFillPlan({
      fillReadyMatches: [fillReadyMatch('c1', 'p10')],
      characteristics: [characteristic('c1', 'Motor Power', '61')],
      properties: profile.properties,
      profile,
      pageFields: fields,
    });

    expect(plan.operations[0]?.status).toBe('already-equal');
    expect(plan.operations[0]?.selected).toBe(false);
  });

  it('detects duplicate page field conflicts', () => {
    const signature = {
      elementType: 'input' as const,
      inputType: 'text',
      normalizedLabel: 'motor power',
      name: 'POWER',
    };

    const dualProfile: FieldProfile = {
      ...profile,
      properties: [
        property('p10', 'Motor Power, kW', 'PARAM10'),
        property('p14', 'Motor Power duplicate, kW', 'PARAM14'),
      ],
      mappings: [
        {
          propertyId: 'p10',
          fieldSignature: signature,
          source: 'manual',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          propertyId: 'p14',
          fieldSignature: signature,
          source: 'manual',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const plan = buildFillPlan({
      fillReadyMatches: [fillReadyMatch('c1', 'p10'), fillReadyMatch('c2', 'p14')],
      characteristics: [
        characteristic('c1', 'Motor Power', '61'),
        characteristic('c2', 'Motor Power Backup', '75'),
      ],
      properties: dualProfile.properties,
      profile: dualProfile,
      pageFields: [
        {
          id: 'fp-field-1',
          elementType: 'input',
          inputType: 'text',
          label: 'Motor Power',
          name: 'POWER',
          disabled: false,
          readonly: false,
        },
      ],
    });

    expect(plan.stats.conflicts).toBe(2);
    expect(plan.operations.every((operation) => operation.status === 'conflict')).toBe(true);
  });
});
