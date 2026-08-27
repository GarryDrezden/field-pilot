import { useMemo, useState } from 'react';
import { buildChatGptPrompt, isPromptLarge } from '../../bridge/chatgpt/buildChatGptPrompt';
import { buildBridgeSuggestionPreview, removeAppliedSuggestion } from '../../bridge/chatgpt/buildBridgePreview';
import { isBridgeRequestStale } from '../../bridge/chatgpt/bridgeSession';
import { selectBridgeCharacteristicIds } from '../../bridge/chatgpt/selectBridgeScope';
import type { ChatGptBridgeScope } from '../../bridge/chatgpt/types';
import { validateChatGptResponse } from '../../bridge/chatgpt/validateChatGptResponse';
import { useDocument } from '../hooks/useDocument';
import { useDocumentMatching } from '../hooks/useDocumentMatching';
import { useProfiles } from '../hooks/useProfiles';
import { formatCharacteristicValue } from './matchRowUtils';

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Высокая',
  review: 'Проверить',
  low: 'Низкая',
};

export function ChatGptBridgeSection() {
  const {
    extraction,
    matchReview,
    sessionCreatedAt,
    chatGptBridge,
    setBridgeResponseDraft,
    prepareBridgeRequest,
    saveBridgeValidation,
    clearBridgePending,
    setReviewDecision,
  } = useDocument();
  const { activeProfile } = useProfiles();
  const { effectiveMatches } = useDocumentMatching(extraction?.characteristics, activeProfile, matchReview);

  const [scope, setScope] = useState<ChatGptBridgeScope>('review-only');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [validateErrors, setValidateErrors] = useState<string[]>([]);
  const [validateWarnings, setValidateWarnings] = useState<string[]>([]);
  const [promptStats, setPromptStats] = useState<{
    characteristicCount: number;
    propertyCount: number;
    sizeLabel: string;
    sizeBytes: number;
  } | null>(null);

  const scopeCharacteristicIds = useMemo(() => {
    if (!activeProfile) {
      return [];
    }
    return selectBridgeCharacteristicIds(scope, effectiveMatches, activeProfile.id, matchReview);
  }, [activeProfile, effectiveMatches, matchReview, scope]);

  const requestStale = isBridgeRequestStale(
    chatGptBridge.activeRequest,
    activeProfile?.id ?? null,
    sessionCreatedAt,
  );

  const previewRows = useMemo(() => {
    if (!chatGptBridge.pendingSuggestions || !extraction || !activeProfile) {
      return [];
    }
    return buildBridgeSuggestionPreview(
      chatGptBridge.pendingSuggestions,
      extraction.characteristics,
      activeProfile.properties,
      effectiveMatches,
    );
  }, [activeProfile, chatGptBridge.pendingSuggestions, effectiveMatches, extraction]);

  if (!extraction || !activeProfile) {
    return null;
  }

  async function handleCopyRequest(): Promise<void> {
    setCopyMessage(null);
    setValidateErrors([]);
    setValidateWarnings([]);

    if (scopeCharacteristicIds.length === 0) {
      setCopyMessage('Нет характеристик для выбранного scope.');
      return;
    }

    const request = await prepareBridgeRequest(
      scope,
      scopeCharacteristicIds,
      activeProfile!.id,
      activeProfile!.updatedAt,
    );
    if (!request) {
      setCopyMessage('Не удалось подготовить запрос.');
      return;
    }

    const { prompt, stats } = buildChatGptPrompt(
      request,
      extraction!.characteristics,
      activeProfile!.properties,
    );
    setPromptStats(stats);

    try {
      await navigator.clipboard.writeText(prompt);
      setCopyMessage('Запрос скопирован. Вставьте его в ChatGPT вручную.');
    } catch {
      setCopyMessage('Не удалось скопировать в буфер обмена.');
    }
  }

  async function handleValidateResponse(): Promise<void> {
    setValidateErrors([]);
    setValidateWarnings([]);
    setCopyMessage(null);

    const request = chatGptBridge.activeRequest;
    if (!request || requestStale) {
      setValidateErrors(['Активный запрос устарел. Сначала скопируйте новый запрос.']);
      return;
    }

    const result = validateChatGptResponse(
      chatGptBridge.responseDraft,
      request,
      activeProfile!.properties,
    );

    if (!result.ok) {
      setValidateErrors(result.errors);
      return;
    }

    setValidateWarnings(result.warnings);
    await saveBridgeValidation(result.suggestions, chatGptBridge.responseDraft);
  }

  async function handleApplySuggestion(characteristicId: string, propertyId: string): Promise<void> {
    await setReviewDecision(activeProfile!.id, characteristicId, {
      type: 'manual',
      propertyId,
    });

    if (chatGptBridge.pendingSuggestions) {
      const nextSuggestions = removeAppliedSuggestion(chatGptBridge.pendingSuggestions, characteristicId);
      await saveBridgeValidation(nextSuggestions, chatGptBridge.responseDraft);
    }
  }

  return (
    <details className="fp-subsection fp-bridge-section">
      <summary>ChatGPT Bridge</summary>

      <p className="fp-bridge-intro">
        Для сложных сопоставлений можно попросить ChatGPT проверить характеристики.
        Ничего не отправляется автоматически.
      </p>

      <div className="fp-inline-form">
        <label className="fp-meta-label" htmlFor="fp-bridge-scope">
          Обработать
        </label>
        <select
          id="fp-bridge-scope"
          className="fp-select"
          value={scope}
          onChange={(event) => setScope(event.target.value as ChatGptBridgeScope)}
        >
          <option value="review-only">Требующие проверки</option>
          <option value="all">Все характеристики</option>
        </select>
      </div>

      <div className="fp-bridge-stats">
        <span>Характеристик: {scopeCharacteristicIds.length}</span>
        <span>Свойств профиля: {activeProfile.properties.length}</span>
        {promptStats && <span>Размер запроса: {promptStats.sizeLabel}</span>}
      </div>

      {promptStats && isPromptLarge(promptStats) && (
        <p className="fp-status is-warning">
          Запрос большой ({promptStats.sizeLabel}). ChatGPT может потребовать больше времени на ответ.
        </p>
      )}

      {requestStale && chatGptBridge.activeRequest && (
        <p className="fp-status is-warning">Активный запрос устарел — скопируйте новый prompt.</p>
      )}

      <button
        type="button"
        className="fp-button fp-button-secondary"
        onClick={() => void handleCopyRequest()}
        disabled={scopeCharacteristicIds.length === 0}
      >
        Скопировать запрос
      </button>

      {copyMessage && <p className="fp-status is-ready">{copyMessage}</p>}

      <ol className="fp-bridge-steps">
        <li>Вставьте запрос в ChatGPT.</li>
        <li>Скопируйте JSON-ответ.</li>
        <li>Вставьте его ниже.</li>
      </ol>

      <textarea
        className="fp-textarea fp-bridge-response"
        placeholder='{"schemaVersion":1,"requestId":"...","matches":[...]}'
        value={chatGptBridge.responseDraft}
        onChange={(event) => void setBridgeResponseDraft(event.target.value)}
        rows={6}
      />

      <div className="fp-inline-form">
        <button type="button" className="fp-button" onClick={() => void handleValidateResponse()}>
          Проверить ответ
        </button>
        {chatGptBridge.pendingSuggestions && (
          <button type="button" className="fp-link-button" onClick={() => void clearBridgePending()}>
            Очистить preview
          </button>
        )}
      </div>

      {validateErrors.length > 0 && (
        <ul className="fp-status is-error">
          {validateErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {validateWarnings.length > 0 && (
        <ul className="fp-status is-warning">
          {validateWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      {previewRows.length > 0 && (
        <ul className="fp-bridge-preview-list">
          {previewRows.map((row) => {
            const characteristic = extraction.characteristics.find((item) => item.id === row.characteristicId);
            return (
              <li key={row.characteristicId} className="fp-bridge-preview-row">
                <div className="fp-bridge-preview-title">{row.sourceLabel}</div>
                <div className="fp-bridge-preview-value">
                  {characteristic ? formatCharacteristicValue(characteristic) : '—'}
                </div>
                <div className="fp-bridge-preview-local">
                  Локально: {row.localPropertyName ?? '—'} ({row.localLevel})
                </div>
                <div className="fp-bridge-preview-ai">
                  ChatGPT:{' '}
                  {row.suggestedPropertyName
                    ? `${row.suggestedPropertyName}${row.suggestedExternalId ? ` · ${row.suggestedExternalId}` : ''}`
                    : 'нет соответствия'}
                  {' · '}
                  {CONFIDENCE_LABELS[row.confidence] ?? row.confidence}
                </div>
                <div className="fp-bridge-preview-reason">{row.reason}</div>
                {row.isHighOverride && (
                  <p className="fp-status is-warning">
                    Локально уже 🟢. AI-предложение не применяется автоматически.
                  </p>
                )}
                {row.canApply && row.suggestedPropertyId && (
                  <button
                    type="button"
                    className="fp-button fp-button-secondary"
                    onClick={() => void handleApplySuggestion(row.characteristicId, row.suggestedPropertyId!)}
                  >
                    Применить предложение
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
