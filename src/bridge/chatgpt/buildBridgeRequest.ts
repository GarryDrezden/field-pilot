import type { ChatGptBridgeRequest, ChatGptBridgeScope } from './types';
import { CHATGPT_BRIDGE_SCHEMA_VERSION } from './types';

export function createBridgeRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildBridgeRequest(input: {
  profileId: string;
  profileUpdatedAt?: string;
  documentSessionCreatedAt: string;
  scope: ChatGptBridgeScope;
  characteristicIds: string[];
  requestId?: string;
  createdAt?: string;
}): ChatGptBridgeRequest {
  return {
    schemaVersion: CHATGPT_BRIDGE_SCHEMA_VERSION,
    requestId: input.requestId ?? createBridgeRequestId(),
    profileId: input.profileId,
    profileUpdatedAt: input.profileUpdatedAt,
    documentSessionCreatedAt: input.documentSessionCreatedAt,
    scope: input.scope,
    characteristicIds: [...input.characteristicIds],
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
