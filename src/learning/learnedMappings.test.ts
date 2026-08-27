import { describe, expect, it } from 'vitest';
import type { ExtractedCharacteristic } from '../extraction/types';
import type { LearnedDocumentMapping, ProfileProperty } from '../profile/profileTypes';
import {
  createLearnedMappingDraft,
  deleteLearnedMappingById,
  findLearnedMappingByLabel,
  isSameLearnedRule,
  normalizeLearnedSourceLabel,
  upsertLearnedMapping,
  updateLearnedMappingProperty,
} from './learnedMappings';

const createId = (() => {
  let counter = 0;
  return () => `learn-${++counter}`;
})();

function property(id: string, name: string, externalId?: string): ProfileProperty {
  return { id, name, externalId, aliases: [], unit: '' };
}

function characteristic(
  label: string,
  unit?: string,
): Pick<ExtractedCharacteristic, 'sourceLabel' | 'rawUnit' | 'normalizedUnit'> {
  return {
    sourceLabel: label,
    rawUnit: unit,
    normalizedUnit: unit,
  };
}

describe('learnedMappings storage domain', () => {
  it('normalizes source labels consistently', () => {
    expect(normalizeLearnedSourceLabel('Motor Power')).toBe(normalizeLearnedSourceLabel(' motor   power '));
    expect(normalizeLearnedSourceLabel('Motor Power')).not.toBe(normalizeLearnedSourceLabel('Average Working Power'));
  });

  it('creates and upserts learned mapping', () => {
    const draft = createLearnedMappingDraft(characteristic('Motor Power', 'kW'), 'p10', createId);
    const first = upsertLearnedMapping([], draft, false);
    expect(first.result.status).toBe('created');
    expect(first.mappings).toHaveLength(1);
  });

  it('does not duplicate same rule', () => {
    const draft = createLearnedMappingDraft(characteristic('Motor Power', 'kW'), 'p10', createId);
    const first = upsertLearnedMapping([], draft, false);
    const second = upsertLearnedMapping(
      first.mappings,
      createLearnedMappingDraft(characteristic('Motor Power', 'kW'), 'p10', createId),
      false,
    );
    expect(second.result.status).toBe('already-saved');
    expect(second.mappings).toHaveLength(1);
  });

  it('requires explicit replace on conflicting rule', () => {
    const first = upsertLearnedMapping(
      [],
      createLearnedMappingDraft(characteristic('Motor Power', 'kW'), 'p10', createId),
      false,
    );
    const conflict = upsertLearnedMapping(
      first.mappings,
      createLearnedMappingDraft(characteristic('Motor Power', 'kW'), 'p30', createId),
      false,
    );
    expect(conflict.result.status).toBe('conflict');
    if (conflict.result.status === 'conflict') {
      expect(conflict.result.existing.propertyId).toBe('p10');
    }
  });

  it('replaces conflicting rule when requested', () => {
    const first = upsertLearnedMapping(
      [],
      createLearnedMappingDraft(characteristic('Motor Power', 'kW'), 'p10', createId),
      false,
    );
    const replaced = upsertLearnedMapping(
      first.mappings,
      createLearnedMappingDraft(characteristic('Motor Power', 'kW'), 'p30', createId),
      true,
    );
    expect(replaced.result.status).toBe('updated');
    expect(replaced.mappings[0]?.propertyId).toBe('p30');
  });

  it('deletes learned mapping by id', () => {
    const draft = createLearnedMappingDraft(characteristic('Weight', 'kg'), 'p14', createId);
    const saved = upsertLearnedMapping([], draft, false);
    const next = deleteLearnedMappingById(saved.mappings, saved.mappings[0]!.id);
    expect(next).toHaveLength(0);
  });

  it('updates target property', () => {
    const draft = createLearnedMappingDraft(characteristic('Motor Power', 'kW'), 'p10', createId);
    const saved = upsertLearnedMapping([], draft, false);
    const properties = [property('p10', 'A'), property('p30', 'B', 'PARAM30')];
    const updated = updateLearnedMappingProperty(saved.mappings, saved.mappings[0]!.id, 'p30', properties);
    expect(updated.updated?.propertyId).toBe('p30');
  });

  it('detects same learned rule', () => {
    const mappings: LearnedDocumentMapping[] = [
      {
        id: '1',
        sourceLabel: 'Motor Power',
        normalizedSourceLabel: normalizeLearnedSourceLabel('Motor Power'),
        sourceUnit: 'kW',
        propertyId: 'p10',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(isSameLearnedRule(mappings, 'Motor Power', 'p10')).toBe(true);
    expect(isSameLearnedRule(mappings, 'Motor Power', 'p30')).toBe(false);
    expect(findLearnedMappingByLabel(mappings, 'motor power')).toBeDefined();
  });
});

describe('learnedMappings page independence', () => {
  it('does not accept page or url parameters in domain API', () => {
    const draft = createLearnedMappingDraft(characteristic('Feeding Structure'), 'p1', createId);
    expect(draft).not.toHaveProperty('pageFieldId');
    expect(draft).not.toHaveProperty('url');
    expect(draft).not.toHaveProperty('tabId');
  });
});
