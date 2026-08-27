import { useEffect, useRef, useState } from 'react';
import { MappingsSection } from './MappingsSection';
import { usePageContext } from '../context/pageContextState';

export function PageFieldsSection() {
  const {
    fields,
    isScanning,
    scanError,
    hasScanned,
    scanPage,
    focusMappingPropertyId,
    clearMappingFocus,
  } = usePageContext();
  const [showFieldList, setShowFieldList] = useState(false);
  const [mappingsOpen, setMappingsOpen] = useState(false);
  const mappingsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!focusMappingPropertyId) {
      return;
    }
    setMappingsOpen(true);
    mappingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusMappingPropertyId]);

  return (
    <section className="fp-section">
      <h2>Текущая страница</h2>
      <button type="button" className="fp-button" onClick={scanPage} disabled={isScanning}>
        {isScanning ? 'Сканирование…' : 'Сканировать страницу'}
      </button>

      {scanError && <p className="fp-status is-error">{scanError}</p>}

      {fields.length > 0 ? (
        <>
          <p className="fp-status is-ready">Найдено полей: {fields.length}</p>
          <button
            type="button"
            className="fp-link-button"
            onClick={() => setShowFieldList((value) => !value)}
          >
            {showFieldList ? 'Скрыть список полей' : 'Показать список полей'}
          </button>
          {showFieldList && (
            <ul className="fp-field-list">
              {fields.map((field) => (
                <li key={field.id} className="fp-field-item">
                  <div className="fp-field-label">{field.label}</div>
                  <div className="fp-field-meta">
                    {field.elementType}
                    {field.inputType ? ` · ${field.inputType}` : ''}
                    {field.name ? ` · name="${field.name}"` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <details
            ref={mappingsRef}
            className="fp-subsection"
            open={mappingsOpen}
            onToggle={(event) => {
              setMappingsOpen(event.currentTarget.open);
              if (!event.currentTarget.open) {
                clearMappingFocus();
              }
            }}
          >
            <summary>Связи профиля с этой страницей</summary>
            <MappingsSection
              fields={fields}
              compact
              highlightPropertyId={focusMappingPropertyId}
            />
          </details>
        </>
      ) : (
        hasScanned &&
        !scanError && <p className="fp-empty">Поля не найдены.</p>
      )}

      {!hasScanned && !scanError && !isScanning && (
        <p className="fp-empty">Поля не сканировались.</p>
      )}
    </section>
  );
}
