import { describe, expect, it } from 'vitest';
import { buildFillPlanIdentity, isFillPlanStale } from './fillPlanIdentity';

describe('fillPlanIdentity', () => {
  it('detects document session change', () => {
    const preview = buildFillPlanIdentity({
      documentSessionCreatedAt: 'session-a',
      profileId: 'profile-1',
      scanGeneration: 1,
      pageUrl: 'https://example.com/a',
    });
    const current = buildFillPlanIdentity({
      documentSessionCreatedAt: 'session-b',
      profileId: 'profile-1',
      scanGeneration: 1,
      pageUrl: 'https://example.com/a',
    });

    expect(isFillPlanStale(preview, current)).toMatch(/Документ изменился/);
  });

  it('detects profile change', () => {
    const preview = buildFillPlanIdentity({
      documentSessionCreatedAt: 'session-a',
      profileId: 'profile-1',
      scanGeneration: 1,
    });
    const current = buildFillPlanIdentity({
      documentSessionCreatedAt: 'session-a',
      profileId: 'profile-2',
      scanGeneration: 1,
    });

    expect(isFillPlanStale(preview, current)).toMatch(/Профиль изменился/);
  });

  it('detects scan generation change', () => {
    const preview = buildFillPlanIdentity({
      documentSessionCreatedAt: 'session-a',
      profileId: 'profile-1',
      scanGeneration: 1,
    });
    const current = buildFillPlanIdentity({
      documentSessionCreatedAt: 'session-a',
      profileId: 'profile-1',
      scanGeneration: 2,
    });

    expect(isFillPlanStale(preview, current)).toMatch(/пересканирована/);
  });

  it('returns null when identity matches', () => {
    const identity = buildFillPlanIdentity({
      documentSessionCreatedAt: 'session-a',
      profileId: 'profile-1',
      scanGeneration: 3,
      pageUrl: 'https://example.com/form',
    });

    expect(isFillPlanStale(identity, { ...identity })).toBeNull();
  });
});
