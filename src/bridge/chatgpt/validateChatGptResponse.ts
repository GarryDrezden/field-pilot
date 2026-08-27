import type { ProfileProperty } from '../../profile/profileTypes';
import type {
  BridgeValidateOutcome,
  ChatGptBridgeConfidence,
  ChatGptBridgeRequest,
  ChatGptBridgeSuggestion,
} from './types';
import { CHATGPT_BRIDGE_SCHEMA_VERSION } from './types';
import { parseChatGptResponseRaw } from './parseChatGptResponse';

const CONFIDENCE_VALUES = new Set<ChatGptBridgeConfidence>(['high', 'review', 'low']);

const FORBIDDEN_MATCH_KEYS = new Set(['value', 'normalizedValue', 'fillValue', 'rawValue', 'unit']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateChatGptResponse(
  raw: string,
  request: ChatGptBridgeRequest,
  properties: ProfileProperty[],
): BridgeValidateOutcome {
  const parsed = parseChatGptResponseRaw(raw);
  if (!parsed.ok) {
    return { ok: false, errors: [parsed.error] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const value = parsed.value;

  if (!isRecord(value)) {
    return { ok: false, errors: ['Корневой JSON должен быть объектом.'] };
  }

  if (value.schemaVersion !== CHATGPT_BRIDGE_SCHEMA_VERSION) {
    errors.push('Неподдерживаемая schemaVersion ответа.');
  }

  if (value.requestId !== request.requestId) {
    errors.push('requestId не совпадает с текущим запросом. Скопируйте новый prompt или вставьте актуальный JSON.');
  }

  if (!Array.isArray(value.matches)) {
    return { ok: false, errors: [...errors, 'Поле matches должно быть массивом.'] };
  }

  const propertyIds = new Set(properties.map((property) => property.id));
  const allowedCharacteristics = new Set(request.characteristicIds);
  const seenCharacteristics = new Set<string>();
  const suggestions: ChatGptBridgeSuggestion[] = [];

  value.matches.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`matches[${index}] должен быть объектом.`);
      return;
    }

    for (const key of Object.keys(item)) {
      if (FORBIDDEN_MATCH_KEYS.has(key)) {
        warnings.push(`matches[${index}] содержит запрещённое поле "${key}" — оно проигнорировано.`);
      }
    }

    const characteristicId = item.characteristicId;
    if (typeof characteristicId !== 'string' || !characteristicId.trim()) {
      errors.push(`matches[${index}] characteristicId обязателен.`);
      return;
    }

    if (!allowedCharacteristics.has(characteristicId)) {
      errors.push(`matches[${index}] characteristicId вне текущего scope запроса.`);
      return;
    }

    if (seenCharacteristics.has(characteristicId)) {
      errors.push(`matches[${index}] дублирует characteristicId ${characteristicId}.`);
      return;
    }
    seenCharacteristics.add(characteristicId);

    let propertyId: string | null = null;
    if (item.propertyId === null) {
      propertyId = null;
    } else if (typeof item.propertyId === 'string' && item.propertyId.trim()) {
      if (!propertyIds.has(item.propertyId)) {
        errors.push(`matches[${index}] propertyId "${item.propertyId}" не найден в профиле.`);
        return;
      }
      propertyId = item.propertyId;
    } else {
      errors.push(`matches[${index}] propertyId должен быть строкой или null.`);
      return;
    }

    const confidence = item.confidence;
    if (typeof confidence !== 'string' || !CONFIDENCE_VALUES.has(confidence as ChatGptBridgeConfidence)) {
      errors.push(`matches[${index}] confidence должен быть high, review или low.`);
      return;
    }

    const reason = item.reason;
    if (typeof reason !== 'string' || !reason.trim()) {
      errors.push(`matches[${index}] reason обязателен.`);
      return;
    }

    suggestions.push({
      characteristicId,
      propertyId,
      confidence: confidence as ChatGptBridgeConfidence,
      reason: reason.trim(),
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (suggestions.length === 0) {
    return { ok: false, errors: ['Ответ не содержит ни одного сопоставления.'] };
  }

  return { ok: true, suggestions, warnings };
}

export function validateChatGptResponseObject(
  value: unknown,
  request: ChatGptBridgeRequest,
  properties: ProfileProperty[],
): BridgeValidateOutcome {
  return validateChatGptResponse(JSON.stringify(value), request, properties);
}
