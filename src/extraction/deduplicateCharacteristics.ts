import type { ExtractionMethod, ExtractedCharacteristic, ExtractionCandidateDraft } from './types';
import { buildDedupKey } from './parseValue';

const METHOD_PRIORITY: Record<ExtractionMethod, number> = {
  'table-row': 3,
  'structured-line': 2,
  'delimited-line': 1,
};

export function deduplicateCharacteristics(
  drafts: ExtractionCandidateDraft[],
  finalize: (draft: ExtractionCandidateDraft) => ExtractedCharacteristic | null,
): ExtractedCharacteristic[] {
  const bestByKey = new Map<string, ExtractedCharacteristic>();

  for (const draft of drafts) {
    const characteristic = finalize(draft);
    if (!characteristic) {
      continue;
    }

    const key = buildDedupKey(
      characteristic.sourceLabel,
      characteristic.normalizedValue,
      characteristic.normalizedUnit,
    );
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, characteristic);
      continue;
    }

    const existingPriority = METHOD_PRIORITY[existing.extractionMethod];
    const nextPriority = METHOD_PRIORITY[characteristic.extractionMethod];
    if (nextPriority > existingPriority) {
      bestByKey.set(key, characteristic);
    }
  }

  return [...bestByKey.values()];
}
