import { useState } from 'react';
import { getFillReadyMatches } from '../../matching/applyReviewDecisions';
import { buildDiagnosticsReport } from '../../shared/diagnostics/buildDiagnosticsReport';
import { copyTextToClipboard } from '../../shared/utils/clipboard';
import { usePageContext } from '../context/pageContextState';
import { useDocument } from '../hooks/useDocument';
import { useDocumentMatching } from '../hooks/useDocumentMatching';
import { useProfiles } from '../hooks/useProfiles';

export function DiagnosticSection() {
  const {
    fileMeta,
    extraction,
    sessionAvailable,
    sessionCreatedAt,
    errorMessage,
    ocrJob,
    matchReview,
  } = useDocument();
  const { activeProfile } = useProfiles();
  const { fields, scanGeneration, pageStale } = usePageContext();
  const { stats, effectiveMatches } = useDocumentMatching(
    extraction?.characteristics,
    activeProfile,
    matchReview,
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const fillReady = getFillReadyMatches(effectiveMatches).length;

  const report = buildDiagnosticsReport({
    version: '0.9.2',
    documentStatus: fileMeta ? `${fileMeta.name} (${fileMeta.type})` : 'нет документа',
    profileName: activeProfile?.name ?? null,
    profilePropertiesCount: activeProfile?.properties.length ?? 0,
    characteristicsCount: extraction?.characteristics.length ?? 0,
    matchingHigh: stats.high,
    matchingReview: stats.review,
    matchingReject: stats.reject,
    pageFieldsCount: fields.length,
    pageScanGeneration: scanGeneration,
    pageStale,
    ocrActive: Boolean(ocrJob?.active),
    fillPlanReady: fillReady,
    sessionAvailable,
    errorMessage,
  });

  async function handleCopy(): Promise<void> {
    const copied = await copyTextToClipboard(report);
    setCopyStatus(copied ? 'Диагностика скопирована.' : 'Не удалось скопировать диагностику.');
  }

  return (
    <details className="fp-section fp-debug-details">
      <summary>Диагностика</summary>
      <pre className="fp-debug-pre">{report}</pre>
      <p className="fp-status">Session ID: {sessionCreatedAt ?? '—'}</p>
      <button type="button" className="fp-button fp-button-secondary" onClick={() => void handleCopy()}>
        Скопировать диагностику
      </button>
      {copyStatus && <p className="fp-status">{copyStatus}</p>}
    </details>
  );
}
