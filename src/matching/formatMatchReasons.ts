import type { MatchReason } from './types';

const REASON_LABELS: Partial<Record<MatchReason['code'], string>> = {
  'exact-name': 'Точное совпадение названия',
  'exact-alias': 'Точное совпадение alias',
  'exact-name-ambiguous': 'Несколько свойств с одинаковым названием',
  'concept-overlap': 'Совпадение технических понятий',
  'unknown-token-overlap': 'Совпадение специфичных терминов',
  'unit-match': 'Совпадает единица измерения',
  'unit-mismatch': 'Единицы измерения несовместимы',
  'unit-missing': 'Единица указана не у обеих сторон',
  'concept-conflict': 'Обнаружен конфликт понятий',
  'power-subtype-ambiguous': 'Подтип мощности неоднозначен',
  'candidate-margin-low': 'Есть близкий альтернативный кандидат',
  'duplicate-target': 'Несколько характеристик указывают на одно свойство',
  'manual-override': 'Выбрано пользователем вручную',
  'confirmed-by-user': 'Подтверждено пользователем',
  'ignored-by-user': 'Пропущено пользователем',
  'no-candidate': 'Подходящее свойство не найдено',
};

export function formatMatchReason(reason: MatchReason): string {
  return REASON_LABELS[reason.code] ?? reason.message;
}

export function formatMatchReasons(reasons: MatchReason[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const reason of reasons) {
    const label = formatMatchReason(reason);
    if (seen.has(label)) {
      continue;
    }
    seen.add(label);
    output.push(label);
  }
  return output;
}

export function levelIcon(level: string): string {
  switch (level) {
    case 'high':
      return '🟢';
    case 'review':
      return '🟡';
    case 'ignored':
      return '⚪';
    default:
      return '🔴';
  }
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
