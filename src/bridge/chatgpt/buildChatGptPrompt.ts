import type { ExtractedCharacteristic } from '../../extraction/types';
import type { ProfileProperty } from '../../profile/profileTypes';
import type { ChatGptBridgeRequest, ChatGptPromptStats } from './types';

function serializeProperty(property: ProfileProperty): Record<string, string | string[]> {
  const item: Record<string, string | string[]> = {
    id: property.id,
    name: property.name,
  };
  if (property.externalId) {
    item.externalId = property.externalId;
  }
  if (property.unit?.trim()) {
    item.unit = property.unit.trim();
  }
  if (property.aliases.length > 0) {
    item.aliases = property.aliases;
  }
  return item;
}

function serializeCharacteristic(characteristic: ExtractedCharacteristic): Record<string, string> {
  const item: Record<string, string> = {
    characteristicId: characteristic.id,
    sourceLabel: characteristic.sourceLabel,
    valueKind: characteristic.valueKind,
    sourceText: characteristic.source.text,
  };
  if (characteristic.rawUnit?.trim()) {
    item.rawUnit = characteristic.rawUnit.trim();
  }
  if (characteristic.normalizedUnit?.trim()) {
    item.normalizedUnit = characteristic.normalizedUnit.trim();
  }
  return item;
}

function formatSizeLabel(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    return `~${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `~${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

const PROMPT_INSTRUCTIONS = `You match technical document characteristics to catalog properties for FieldPilot.

Rules:
1. Choose propertyId ONLY from PROFILE_PROPERTIES.
2. Never invent a new property.
3. Return propertyId exactly as provided, or null if no reliable match exists.
4. Do NOT modify, normalize, convert, or return document values.
5. Do NOT perform unit conversion.
6. If ambiguous, use confidence "review".
7. If no reliable property exists, use propertyId null and confidence "low".
8. Do NOT confuse MAX/MIN, LENGTH/WIDTH/HEIGHT, materials, Motor Power vs Power Consumption, Feeding vs Bending.
9. Prefer null over a wrong match.
10. Return ONLY JSON matching RESPONSE_SCHEMA.
11. No markdown fences.
12. No text before or after JSON.

RESPONSE_SCHEMA:
{
  "schemaVersion": 1,
  "requestId": "<copy REQUEST.requestId exactly>",
  "matches": [
    {
      "characteristicId": "...",
      "propertyId": "... or null",
      "confidence": "high" | "review" | "low",
      "reason": "short explanation"
    }
  ]
}`;

export function buildChatGptPrompt(
  request: ChatGptBridgeRequest,
  characteristics: ExtractedCharacteristic[],
  properties: ProfileProperty[],
): { prompt: string; stats: ChatGptPromptStats } {
  const selected = characteristics.filter((item) => request.characteristicIds.includes(item.id));
  const payload = {
    REQUEST: {
      schemaVersion: request.schemaVersion,
      requestId: request.requestId,
      profileId: request.profileId,
      documentSessionCreatedAt: request.documentSessionCreatedAt,
      scope: request.scope,
    },
    DOCUMENT_CHARACTERISTICS: selected.map(serializeCharacteristic),
    PROFILE_PROPERTIES: properties.map(serializeProperty),
  };

  const prompt = `${PROMPT_INSTRUCTIONS}

REQUEST_AND_DATA_JSON:
${JSON.stringify(payload)}`;

  const sizeBytes = new TextEncoder().encode(prompt).length;
  return {
    prompt,
    stats: {
      characteristicCount: selected.length,
      propertyCount: properties.length,
      sizeBytes,
      sizeLabel: formatSizeLabel(sizeBytes),
    },
  };
}

export function isPromptLarge(stats: ChatGptPromptStats): boolean {
  return stats.sizeBytes > 512 * 1024;
}
