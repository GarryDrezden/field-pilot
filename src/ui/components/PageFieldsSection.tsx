import { useState } from 'react';
import { scanPageFormFields } from '../../form/formScanner';
import type { FormField } from '../../shared/types/form';
import { MappingsSection } from './MappingsSection';

export function PageFieldsSection() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showFieldList, setShowFieldList] = useState(false);

  function handleScan(): void {
    setIsScanning(true);
    setScanError(null);

    try {
      const result = scanPageFormFields(document);
      setFields(result.fields);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Не удалось просканировать страницу.');
      setFields([]);
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <>
      <section className="fp-section">
        <h2>Поля страницы</h2>
        <button type="button" className="fp-button" onClick={handleScan} disabled={isScanning}>
          {isScanning ? 'Сканирование…' : 'Сканировать страницу'}
        </button>

        {scanError && <p className="fp-status is-error">{scanError}</p>}

        {fields.length > 0 && (
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
          </>
        )}

        {!fields.length && !scanError && !isScanning && (
          <p className="fp-empty">Нажмите «Сканировать страницу», чтобы найти поля формы.</p>
        )}
      </section>

      {fields.length > 0 && (
        <section className="fp-section">
          <h2>Сопоставления</h2>
          <MappingsSection fields={fields} />
        </section>
      )}
    </>
  );
}
