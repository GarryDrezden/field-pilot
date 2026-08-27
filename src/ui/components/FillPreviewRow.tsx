import { useState } from 'react';
import type { FillOperation } from '../../fill/types';
import { fillStatusLabel } from '../../fill/buildFillPlan';
import { copyTextToClipboard } from '../../shared/utils/clipboard';

interface FillPreviewRowProps {
  operation: FillOperation;
  onToggleSelected: (selected: boolean) => void;
  onToggleOverwrite: (allowOverwrite: boolean) => void;
  onToggleSource: () => void;
  sourceExpanded: boolean;
  sourcePreview?: string;
  onConfigureField?: () => void;
}

export function FillPreviewRow({
  operation,
  onToggleSelected,
  onToggleOverwrite,
  onToggleSource,
  sourceExpanded,
  sourcePreview,
  onConfigureField,
}: FillPreviewRowProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const selectable =
    operation.status === 'ready' ||
    (operation.status === 'existing-value' && operation.allowOverwrite);
  const showOverwriteToggle = operation.status === 'existing-value';

  const showCopyValue =
    operation.status === 'no-page-field' ||
    operation.status === 'unsupported-field' ||
    operation.status === 'ambiguous-page-field';

  async function handleCopyValue(): Promise<void> {
    const copied = await copyTextToClipboard(operation.displayValue || operation.value);
    setCopyStatus(copied ? 'Значение скопировано.' : 'Не удалось скопировать значение.');
  }

  return (
    <li className={`fp-fill-row is-${operation.status}`}>
      <label className="fp-fill-row-head">
        <input
          type="checkbox"
          checked={operation.selected}
          disabled={!selectable}
          onChange={(event) => onToggleSelected(event.target.checked)}
        />
        <span className="fp-fill-status">{fillStatusLabel(operation.status)}</span>
      </label>

      <div className="fp-fill-row-title">{operation.propertyName}</div>
      {operation.propertyExternalId && (
        <div className="fp-property-code">{operation.propertyExternalId}</div>
      )}

      {operation.fieldLabel && (
        <div className="fp-fill-meta">
          Поле страницы: {operation.fieldLabel}
        </div>
      )}

      <div className="fp-fill-values">
        <div>
          Сейчас: {operation.currentValue?.trim() ? operation.currentValue : '—'}
        </div>
        <div>Будет: {operation.value}</div>
      </div>

      {operation.sourceLabel && (
        <div className="fp-fill-source">
          Из документа: {operation.sourceLabel}
          {operation.sourceUnit ? ` · ${operation.displayValue}` : ` · ${operation.sourceValue}`}
        </div>
      )}

      {operation.reason && operation.status !== 'ready' && (
        <p className="fp-fill-reason">{operation.reason}</p>
      )}

      {showOverwriteToggle && (
        <label className="fp-fill-overwrite">
          <input
            type="checkbox"
            checked={operation.allowOverwrite}
            onChange={(event) => onToggleOverwrite(event.target.checked)}
          />
          Заменить существующее значение
        </label>
      )}

      <div className="fp-fill-row-actions">
        {sourcePreview && (
          <button type="button" className="fp-link-button" onClick={onToggleSource}>
            {sourceExpanded ? 'Скрыть источник' : 'Источник'}
          </button>
        )}
        {operation.status === 'no-page-field' && onConfigureField && (
          <button type="button" className="fp-link-button" onClick={onConfigureField}>
            Настроить поле
          </button>
        )}
        {showCopyValue && (
          <button type="button" className="fp-link-button" onClick={() => void handleCopyValue()}>
            Скопировать значение
          </button>
        )}
      </div>

      {copyStatus && <p className="fp-fill-reason">{copyStatus}</p>}

      {sourceExpanded && sourcePreview && (
        <pre className="fp-source-preview">{sourcePreview}</pre>
      )}
    </li>
  );
}
