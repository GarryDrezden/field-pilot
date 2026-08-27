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
          ? 'Полный текст не сохраняется между переходами. Используйте «Источник» у каждой характеристики.'
          : 'Исходный текст недоступен для этого документа.'}
      </p>
    </details>
  );
}
