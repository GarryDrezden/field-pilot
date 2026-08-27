import { describe, expect, it } from 'vitest';
import { buildBridgeRequest } from './buildBridgeRequest';
import { buildChatGptPrompt, isPromptLarge } from './buildChatGptPrompt';
import { stripMarkdownJsonFence, parseChatGptResponseRaw } from './parseChatGptResponse';
import { validateChatGptResponse } from './validateChatGptResponse';
import { selectBridgeCharacteristicIds } from './selectBridgeScope';
import { buildBridgeSuggestionPreview } from './buildBridgePreview';
import type { EffectiveDocumentMatch } from '../../matching/types';
import type { ExtractedCharacteristic } from '../../extraction/types';
import type { ProfileProperty } from '../../profile/profileTypes';

const request = buildBridgeRequest({
  profileId: 'profile-1',
  documentSessionCreatedAt: '2026-01-01T00:00:00.000Z',
  scope: 'review-only',
  characteristicIds: ['c-review'],
  requestId: 'req-1',
});

const characteristics: ExtractedCharacteristic[] = [
  {
    id: 'c-review',
    sourceLabel: 'Average Working Power',
    rawValue: '3.1',
    normalizedValue: '3.1',
    rawUnit: 'kW',
    normalizedUnit: 'kW',
    valueKind: 'number',
    extractionMethod: 'structured-line',
    source: { text: 'Average Working Power kw 3.1' },
  },
  {
    id: 'c-high',
    sourceLabel: 'Motor Power',
    rawValue: '61',
    normalizedValue: '61',
    rawUnit: 'kW',
    normalizedUnit: 'kW',
    valueKind: 'number',
    extractionMethod: 'structured-line',
    source: { text: 'Motor Power kw 61' },
  },
];

const properties: ProfileProperty[] = [
  { id: 'p10', name: 'Мощность двигателя, кВт', externalId: 'PARAM10', aliases: ['Motor Power'], unit: 'kW' },
  { id: 'p30', name: 'Потребляемая мощность, кВт', externalId: 'PARAM30', aliases: [], unit: 'kW' },
];

function effectiveMatch(
  characteristicId: string,
  level: EffectiveDocumentMatch['effectiveLevel'],
  propertyId?: string,
  learned = false,
): EffectiveDocumentMatch {
  return {
    characteristicId,
    propertyId,
    effectivePropertyId: propertyId,
    effectiveLevel: level,
    level,
    fillReady: level === 'high',
    confidence: level === 'high' ? 0.9 : 0.5,
    requiresReview: level !== 'high',
    ambiguous: false,
    reasons: learned ? [{ code: 'user-learned', message: 'learned' }] : [],
    alternatives: [],
    learnedMatch: learned,
  };
}

describe('buildChatGptPrompt', () => {
  it('includes full profile catalog and selected characteristics', () => {
    const { prompt, stats } = buildChatGptPrompt(request, characteristics, properties);
    expect(prompt).toContain('PROFILE_PROPERTIES');
    expect(prompt).toContain('PARAM10');
    expect(prompt).toContain('Average Working Power');
    expect(prompt).not.toContain('PageField');
    expect(prompt).not.toContain('chatgpt.com');
    expect(stats.characteristicCount).toBe(1);
    expect(stats.propertyCount).toBe(2);
    expect(stats.sizeBytes).toBeGreaterThan(100);
  });
});

describe('parseChatGptResponse', () => {
  it('tolerates markdown json fences', () => {
    const fenced = '```json\n{"schemaVersion":1,"requestId":"req-1","matches":[]}\n```';
    expect(stripMarkdownJsonFence(fenced)).toContain('"schemaVersion":1');
    const parsed = parseChatGptResponseRaw(fenced);
    expect(parsed.ok).toBe(true);
  });
});

describe('validateChatGptResponse', () => {
  it('rejects stale requestId and unknown propertyId', () => {
    const stale = validateChatGptResponse(
      JSON.stringify({
        schemaVersion: 1,
        requestId: 'other',
        matches: [{ characteristicId: 'c-review', propertyId: 'p30', confidence: 'review', reason: 'ok' }],
      }),
      request,
      properties,
    );
    expect(stale.ok).toBe(false);

    const unknown = validateChatGptResponse(
      JSON.stringify({
        schemaVersion: 1,
        requestId: 'req-1',
        matches: [{ characteristicId: 'c-review', propertyId: 'missing', confidence: 'review', reason: 'ok' }],
      }),
      request,
      properties,
    );
    expect(unknown.ok).toBe(false);
  });

  it('accepts valid response without value fields', () => {
    const result = validateChatGptResponse(
      JSON.stringify({
        schemaVersion: 1,
        requestId: 'req-1',
        matches: [
          {
            characteristicId: 'c-review',
            propertyId: 'p30',
            confidence: 'review',
            reason: 'Average working power maps to consumption',
            value: 'should be ignored by preview layer',
          },
        ],
      }),
      request,
      properties,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.suggestions[0]?.propertyId).toBe('p30');
    }
  });
});

describe('selectBridgeScope', () => {
  it('includes review/reject and excludes learned high and confirmed', () => {
    const matches = [
      effectiveMatch('c-review', 'review', 'p30'),
      effectiveMatch('c-high', 'high', 'p10'),
      effectiveMatch('c-learned', 'high', 'p10', true),
      effectiveMatch('c-reject', 'reject'),
    ];
    const ids = selectBridgeCharacteristicIds('review-only', matches, 'profile-1', {
      profileId: 'profile-1',
      decisions: { 'c-high': { type: 'confirmed', propertyId: 'p10' } },
    });
    expect(ids).toContain('c-review');
    expect(ids).toContain('c-reject');
    expect(ids).not.toContain('c-high');
    expect(ids).not.toContain('c-learned');
  });
});

describe('buildBridgeSuggestionPreview', () => {
  it('blocks auto apply for local HIGH override', () => {
    const rows = buildBridgeSuggestionPreview(
      [{ characteristicId: 'c-high', propertyId: 'p30', confidence: 'high', reason: 'AI guess' }],
      characteristics,
      properties,
      [effectiveMatch('c-high', 'high', 'p10')],
    );
    expect(rows[0]?.isHighOverride).toBe(true);
    expect(rows[0]?.canApply).toBe(false);
  });
});

describe('isPromptLarge', () => {
  it('flags large prompts', () => {
    expect(isPromptLarge({ characteristicCount: 1, propertyCount: 1, sizeBytes: 600_000, sizeLabel: '600 KB' })).toBe(true);
  });
});
