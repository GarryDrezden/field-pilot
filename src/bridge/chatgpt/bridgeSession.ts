import type { ChatGptBridgeRequest, ChatGptBridgeSessionState, ChatGptBridgeSuggestion } from './types';
import { EMPTY_BRIDGE_SESSION } from './types';
import { buildBridgeRequest } from './buildBridgeRequest';

export function parseBridgeSessionState(raw: unknown): ChatGptBridgeSessionState {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_BRIDGE_SESSION };
  }

  const value = raw as Partial<ChatGptBridgeSessionState> & {
    activeRequest?: Partial<ChatGptBridgeRequest>;
    pendingSuggestions?: unknown;
    responseDraft?: unknown;
  };

  const activeRequest = parseBridgeRequest(value.activeRequest);
  const pendingSuggestions = parseBridgeSuggestions(value.pendingSuggestions);
  const responseDraft = typeof value.responseDraft === 'string' ? value.responseDraft : '';

  return {
    activeRequest,
    pendingSuggestions,
    responseDraft,
  };
}

function parseBridgeRequest(raw: unknown): ChatGptBridgeRequest | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const value = raw as Partial<ChatGptBridgeRequest>;
  if (
    value.schemaVersion !== 1 ||
    typeof value.requestId !== 'string' ||
    typeof value.profileId !== 'string' ||
    typeof value.documentSessionCreatedAt !== 'string' ||
    (value.scope !== 'review-only' && value.scope !== 'all') ||
    !Array.isArray(value.characteristicIds) ||
    typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    requestId: value.requestId,
    profileId: value.profileId,
    profileUpdatedAt: typeof value.profileUpdatedAt === 'string' ? value.profileUpdatedAt : undefined,
    documentSessionCreatedAt: value.documentSessionCreatedAt,
    scope: value.scope,
    characteristicIds: value.characteristicIds.filter((item): item is string => typeof item === 'string'),
    createdAt: value.createdAt,
  };
}

function parseBridgeSuggestions(raw: unknown): ChatGptBridgeSuggestion[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const output: ChatGptBridgeSuggestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Partial<ChatGptBridgeSuggestion>;
    if (
      typeof record.characteristicId !== 'string' ||
      (record.propertyId !== null && typeof record.propertyId !== 'string') ||
      (record.confidence !== 'high' && record.confidence !== 'review' && record.confidence !== 'low') ||
      typeof record.reason !== 'string'
    ) {
      continue;
    }
    output.push({
      characteristicId: record.characteristicId,
      propertyId: record.propertyId,
      confidence: record.confidence,
      reason: record.reason,
    });
  }

  return output.length > 0 ? output : null;
}

export function startBridgeRequest(input: {
  profileId: string;
  profileUpdatedAt?: string;
  documentSessionCreatedAt: string;
  scope: ChatGptBridgeRequest['scope'];
  characteristicIds: string[];
}): ChatGptBridgeSessionState {
  return {
    activeRequest: buildBridgeRequest(input),
    pendingSuggestions: null,
    responseDraft: '',
  };
}

export function attachBridgeValidationResult(
  state: ChatGptBridgeSessionState,
  suggestions: ChatGptBridgeSuggestion[],
  responseDraft: string,
): ChatGptBridgeSessionState {
  return {
    ...state,
    pendingSuggestions: suggestions,
    responseDraft,
  };
}

export function isBridgeRequestStale(
  request: ChatGptBridgeRequest | null,
  profileId: string | null,
  documentSessionCreatedAt: string | null,
): boolean {
  if (!request || !profileId || !documentSessionCreatedAt) {
    return true;
  }
  return (
    request.profileId !== profileId ||
    request.documentSessionCreatedAt !== documentSessionCreatedAt
  );
}
