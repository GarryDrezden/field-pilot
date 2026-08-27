import type { FillPlan } from './types';

export interface FillPlanIdentity {
  documentSessionCreatedAt: string | null;
  profileId: string;
  scanGeneration: number;
  pageUrl: string;
}

export interface FillPlanWithIdentity extends FillPlan {
  identity: FillPlanIdentity;
}

export function buildFillPlanIdentity(input: {
  documentSessionCreatedAt: string | null;
  profileId: string;
  scanGeneration: number;
  pageUrl?: string;
}): FillPlanIdentity {
  return {
    documentSessionCreatedAt: input.documentSessionCreatedAt,
    profileId: input.profileId,
    scanGeneration: input.scanGeneration,
    pageUrl: input.pageUrl ?? window.location.href,
  };
}

export function isFillPlanStale(
  identity: FillPlanIdentity,
  current: FillPlanIdentity,
): string | null {
  if (identity.documentSessionCreatedAt !== current.documentSessionCreatedAt) {
    return 'Документ изменился. Обновите предпросмотр заполнения.';
  }
  if (identity.profileId !== current.profileId) {
    return 'Профиль изменился. Обновите предпросмотр заполнения.';
  }
  if (identity.scanGeneration !== current.scanGeneration) {
    return 'Страница была пересканирована. Обновите предпросмотр заполнения.';
  }
  if (identity.pageUrl !== current.pageUrl) {
    return 'URL страницы изменился. Рекомендуется повторное сканирование.';
  }
  return null;
}
