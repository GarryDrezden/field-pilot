import type { ExtractionResult } from '../../extraction/types';
import { ExtractedCharacteristicsPanel } from './ExtractedCharacteristicsPanel';

interface DocumentCharacteristicsSectionProps {
  extraction: ExtractionResult;
}

export function DocumentCharacteristicsSection({ extraction }: DocumentCharacteristicsSectionProps) {
  return (
    <section className="fp-section">
      <h2>Характеристики документа</h2>
      <ExtractedCharacteristicsPanel extraction={extraction} />
    </section>
  );
}
