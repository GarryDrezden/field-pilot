import { useMemo, useState } from 'react';
import { truncateText } from '../../shared/utils';

const PREVIEW_LIMIT = 3000;

interface ExtractedTextPreviewProps {
  text: string;
}

export function ExtractedTextPreview({ text }: ExtractedTextPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = useMemo(
    () => (expanded ? text : truncateText(text, PREVIEW_LIMIT)),
    [expanded, text],
  );

  return (
    <details className="fp-preview" open>
      <summary>Извлечённый текст</summary>
      <pre>{preview}</pre>
      {text.length > PREVIEW_LIMIT && (
        <button
          type="button"
          className="fp-button fp-button-secondary"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Свернуть' : 'Показать больше'}
        </button>
      )}
    </details>
  );
}
