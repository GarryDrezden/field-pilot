import { useDocument } from '../hooks/useDocument';
import { ExtractedTextPreview } from './ExtractedTextPreview';

export function DocumentDebugSection() {
  const { fileMeta, fullText, restoredFromSession } = useDocument();

  if (!fileMeta) {
    return null;
  }

  if (fullText) {
    return <ExtractedTextPreview text={fullText} />;
  }

  return (
    <details className="fp-preview fp-debug-section">
      <summary>Исходный текст документа</summary>
      <p className="fp-empty">
        {restoredFromSession
          ? 'Полный исходный текст доступен только до перезагрузки/перехода. Источники найденных характеристик сохранены.'
          : 'Исходный текст недоступен для этого документа.'}
      </p>
    </details>
  );
}
