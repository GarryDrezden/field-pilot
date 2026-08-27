import type { LearnedDocumentMapping } from '../../profile/profileTypes';
import type { ProfileProperty } from '../../profile/profileTypes';

interface LearnedMappingConflictDialogProps {
  sourceLabel: string;
  existing: LearnedDocumentMapping;
  existingProperty: ProfileProperty | undefined;
  newProperty: ProfileProperty | undefined;
  onReplace: () => void;
  onCancel: () => void;
}

export function LearnedMappingConflictDialog({
  sourceLabel,
  existing,
  existingProperty,
  newProperty,
  onReplace,
  onCancel,
}: LearnedMappingConflictDialogProps) {
  return (
    <div className="fp-picker-overlay">
      <div className="fp-picker">
        <div className="fp-picker-header">
          <h3>Конфликт правила</h3>
        </div>
        <p>
          Для «{sourceLabel}» уже сохранено другое соответствие.
        </p>
        <div className="fp-learned-conflict-block">
          <div className="fp-meta-label">Текущее</div>
          <div>
            {existingProperty?.name ?? existing.propertyId}
            {existingProperty?.externalId && (
              <span className="fp-property-code"> · {existingProperty.externalId}</span>
            )}
          </div>
        </div>
        <div className="fp-learned-conflict-block">
          <div className="fp-meta-label">Новое</div>
          <div>
            {newProperty?.name ?? '—'}
            {newProperty?.externalId && (
              <span className="fp-property-code"> · {newProperty.externalId}</span>
            )}
          </div>
        </div>
        <div className="fp-inline-form">
          <button type="button" className="fp-button" onClick={onReplace}>
            Заменить правило
          </button>
          <button type="button" className="fp-button fp-button-secondary" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
