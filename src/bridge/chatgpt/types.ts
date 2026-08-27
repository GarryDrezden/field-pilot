export const CHATGPT_BRIDGE_SCHEMA_VERSION = 1 as const;

export type ChatGptBridgeScope = 'review-only' | 'all';

export type ChatGptBridgeConfidence = 'high' | 'review' | 'low';

export interface ChatGptBridgeRequest {
  schemaVersion: typeof CHATGPT_BRIDGE_SCHEMA_VERSION;
  requestId: string;
  profileId: string;
  profileUpdatedAt?: string;
  documentSessionCreatedAt: string;
  scope: ChatGptBridgeScope;
  characteristicIds: string[];
  createdAt: string;
}

export interface ChatGptBridgeResponseMatch {
  characteristicId: string;
  propertyId: string | null;
  confidence: ChatGptBridgeConfidence;
  reason: string;
}

export interface ChatGptBridgeResponse {
  schemaVersion: typeof CHATGPT_BRIDGE_SCHEMA_VERSION;
  requestId: string;
  matches: ChatGptBridgeResponseMatch[];
}

export interface ChatGptBridgeSuggestion {
  characteristicId: string;
  propertyId: string | null;
  confidence: ChatGptBridgeConfidence;
  reason: string;
}

export interface ChatGptBridgeSessionState {
  activeRequest: ChatGptBridgeRequest | null;
  pendingSuggestions: ChatGptBridgeSuggestion[] | null;
  responseDraft: string;
}

export const EMPTY_BRIDGE_SESSION: ChatGptBridgeSessionState = {
  activeRequest: null,
  pendingSuggestions: null,
  responseDraft: '',
};

export interface ChatGptPromptStats {
  characteristicCount: number;
  propertyCount: number;
  sizeBytes: number;
  sizeLabel: string;
}

export interface BridgeSuggestionPreviewRow {
  characteristicId: string;
  sourceLabel: string;
  localPropertyId?: string;
  localPropertyName?: string;
  localLevel: string;
  suggestedPropertyId: string | null;
  suggestedPropertyName?: string;
  suggestedExternalId?: string;
  confidence: ChatGptBridgeConfidence;
  reason: string;
  validationError?: string;
  canApply: boolean;
  isHighOverride: boolean;
  appliesNoMatch: boolean;
}

export interface BridgeValidationResult {
  ok: true;
  suggestions: ChatGptBridgeSuggestion[];
  warnings: string[];
}

export interface BridgeValidationError {
  ok: false;
  errors: string[];
}

export type BridgeValidateOutcome = BridgeValidationResult | BridgeValidationError;
