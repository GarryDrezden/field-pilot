import { useEffect, useMemo, useState } from 'react';
import { getFillReadyMatches } from '../../matching/applyReviewDecisions';
import {
  applyOperationSelectionRules,
  buildFillPlan,
  selectAllSafeOperations,
} from '../../fill/buildFillPlan';
import { executeFill } from '../../fill/executeFill';
import { undoLastFill } from '../../fill/restoreFill';
import type { ExtractedCharacteristic } from '../../extraction/types';
import type { FillExecutionResult, FillOperation, FillUndoBatch } from '../../fill/types';
import { useDocument } from '../hooks/useDocument';
import { useDocumentMatching } from '../hooks/useDocumentMatching';
import { useProfiles } from '../hooks/useProfiles';
import { usePageContext } from '../context/pageContextState';
import { FillPreviewRow } from './FillPreviewRow';

type FillView = 'idle' | 'preview' | 'result';

export function FillSection() {
  const { extraction, matchReview } = useDocument();
  const { activeProfile } = useProfiles();
  const { fields, isScanning, scanError, hasScanned, scanPage, rescanPage, requestMappingFocus } =
    usePageContext();
  const { effectiveMatches, stats: matchStats } = useDocumentMatching(
    extraction?.characteristics,
    activeProfile,
    matchReview,
  );

  const [view, setView] = useState<FillView>('idle');
  const [operations, setOperations] = useState<FillOperation[]>([]);
  const [expandedSourceIds, setExpandedSourceIds] = useState<Record<string, boolean>>({});
  const [executionResult, setExecutionResult] = useState<FillExecutionResult | null>(null);
  const [undoBatch, setUndoBatch] = useState<FillUndoBatch | null>(null);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);

  const fillReadyMatches = useMemo(
    () => getFillReadyMatches(effectiveMatches),
    [effectiveMatches],
  );

  const characteristicById = useMemo(() => {
    const map = new Map<string, ExtractedCharacteristic>();
    for (const item of extraction?.characteristics ?? []) {
      map.set(item.id, item);
    }
    return map;
  }, [extraction?.characteristics]);

  const basePlan = useMemo(() => {
    if (!activeProfile || !extraction || fields.length === 0 || fillReadyMatches.length === 0) {
      return null;
    }

    return buildFillPlan({
      fillReadyMatches,
      characteristics: extraction.characteristics,
      properties: activeProfile.properties,
      profile: activeProfile,
      pageFields: fields,
    });
  }, [activeProfile, extraction, fields, fillReadyMatches]);

  useEffect(() => {
    if (view === 'preview' && basePlan) {
      setOperations(basePlan.operations);
    }
  }, [basePlan, view]);

  const pendingReviewCount = matchStats.review;

  function openPreview(): void {
    if (!basePlan) {
      return;
    }
    setOperations(basePlan.operations);
    setView('preview');
    setExecutionResult(null);
    setUndoMessage(null);
  }

  function updateOperation(id: string, patch: Partial<FillOperation>): void {
    setOperations((current) =>
      current.map((operation) => (operation.id === id ? { ...operation, ...patch } : operation)),
    );
  }

  function handleToggleSelected(id: string, selected: boolean): void {
    updateOperation(id, { selected });
  }

  function handleToggleOverwrite(id: string, allowOverwrite: boolean): void {
    setOperations((current) =>
      applyOperationSelectionRules(
        current,
        {
          [id]: { allowOverwrite, selected: allowOverwrite ? true : false },
        },
      ),
    );
  }

  function handleExecuteFill(): void {
    const result = executeFill({ operations, scannedFields: fields });
    setExecutionResult(result);
    setUndoBatch(result.undoBatch);
    setView('result');
    rescanPage();
  }

  function handleUndo(): void {
    if (!undoBatch) {
      return;
    }
    const undoResult = undoLastFill(undoBatch, fields);
    setUndoMessage(
      undoResult.messages.length > 0
        ? undoResult.messages.join(' ')
        : `Отменено заполнение: ${undoResult.restored} полей.`,
    );
    setUndoBatch(null);
    rescanPage();
    if (basePlan) {
      setOperations(basePlan.operations);
    }
    setView('preview');
  }

  if (!extraction) {
    return (
      <section className="fp-section">
        <h2>Заполнение формы</h2>
        <p className="fp-empty">Загрузите документ, чтобы подготовить заполнение.</p>
      </section>
    );
  }

  if (!activeProfile) {
    return (
      <section className="fp-section">
        <h2>Заполнение формы</h2>
        <p className="fp-empty">Выберите профиль для сопоставления и заполнения.</p>
      </section>
    );
  }

  return (
    <section className="fp-section">
      <h2>Заполнение формы</h2>

      {!hasScanned && (
        <>
          <p className="fp-empty">Чтобы заполнить форму, просканируйте текущую страницу.</p>
          <button type="button" className="fp-button" onClick={scanPage} disabled={isScanning}>
            {isScanning ? 'Сканирование…' : 'Сканировать страницу'}
          </button>
        </>
      )}

      {scanError && <p className="fp-status is-error">{scanError}</p>}

      {hasScanned && fields.length === 0 && !scanError && (
        <p className="fp-empty">На странице не найдено поддерживаемых полей.</p>
      )}

      {hasScanned && fields.length > 0 && view === 'idle' && (
        <>
          <p className="fp-status">
            Данных документа готовы: {fillReadyMatches.length}
            {basePlan ? ` · Поля назначения найдены: ${basePlan.stats.ready + basePlan.stats.alreadyEqual}` : ''}
            {basePlan ? ` · Без поля: ${basePlan.stats.noField}` : ''}
          </p>

          {pendingReviewCount > 0 && (
            <p className="fp-fill-hint">
              {pendingReviewCount} характеристик требуют проверки перед заполнением.
            </p>
          )}

          {fillReadyMatches.length === 0 ? (
            <p className="fp-empty">Нет fill-ready сопоставлений для заполнения.</p>
          ) : (
            <button type="button" className="fp-button" onClick={openPreview}>
              Проверить заполнение
            </button>
          )}
        </>
      )}

      {view === 'preview' && (
        <>
          <div className="fp-fill-toolbar">
            <p className="fp-status">
              {operations.filter((item) => item.status === 'ready').length} готовы ·{' '}
              {operations.filter((item) => item.status === 'existing-value').length} уже заполнены ·{' '}
              {operations.filter((item) => item.status === 'no-page-field').length} без поля
            </p>
            <div className="fp-fill-toolbar-actions">
              <button
                type="button"
                className="fp-link-button"
                onClick={() => setOperations((current) => selectAllSafeOperations(current))}
              >
                Выбрать все безопасные
              </button>
              <button
                type="button"
                className="fp-link-button"
                onClick={() =>
                  setOperations((current) => current.map((item) => ({ ...item, selected: false })))
                }
              >
                Снять выбор
              </button>
            </div>
          </div>

          <ul className="fp-fill-list">
            {operations.map((operation) => {
              const characteristic = characteristicById.get(operation.characteristicId);
              return (
                <FillPreviewRow
                  key={operation.id}
                  operation={operation}
                  sourcePreview={characteristic?.source.text}
                  sourceExpanded={Boolean(expandedSourceIds[operation.id])}
                  onToggleSource={() =>
                    setExpandedSourceIds((current) => ({
                      ...current,
                      [operation.id]: !current[operation.id],
                    }))
                  }
                  onToggleSelected={(selected) => handleToggleSelected(operation.id, selected)}
                  onToggleOverwrite={(allowOverwrite) =>
                    handleToggleOverwrite(operation.id, allowOverwrite)
                  }
                  onConfigureField={() => requestMappingFocus(operation.propertyId)}
                />
              );
            })}
          </ul>

          <div className="fp-fill-actions">
            <button
              type="button"
              className="fp-button"
              onClick={handleExecuteFill}
              disabled={!operations.some((item) => item.selected)}
            >
              Заполнить выбранные
            </button>
            <button type="button" className="fp-link-button" onClick={() => setView('idle')}>
              Назад
            </button>
          </div>
        </>
      )}

      {view === 'result' && executionResult && (
        <>
          <p className="fp-status is-ready">
            Заполнено: {executionResult.filled} · Пропущено: {executionResult.skipped} · Ошибка:{' '}
            {executionResult.failed}
          </p>
          <p className="fp-fill-hint">
            Проверьте значения на странице и сохраните форму вручную.
          </p>
          {undoMessage && <p className="fp-status">{undoMessage}</p>}
          <div className="fp-fill-actions">
            {undoBatch && (
              <button type="button" className="fp-button" onClick={handleUndo}>
                Отменить заполнение
              </button>
            )}
            <button
              type="button"
              className="fp-link-button"
              onClick={() => {
                openPreview();
              }}
            >
              Вернуться к preview
            </button>
          </div>
        </>
      )}
    </section>
  );
}
