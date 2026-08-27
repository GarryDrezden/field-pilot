import type { FormField } from '../shared/types/form';
import { readLiveFieldValue, resolveLiveField } from './domFieldAccess';
import { restoreFieldValue } from './setFieldValue';
import type { FillUndoBatch, UndoResult } from './types';

export function undoLastFill(
  batch: FillUndoBatch,
  scannedFields: FormField[],
  root: Document | ShadowRoot = document,
): UndoResult {
  let restored = 0;
  let skipped = 0;
  const messages: string[] = [];

  for (const entry of batch.entries) {
    const resolved = resolveLiveField(entry.fieldRuntimeId, entry.fieldSignature, scannedFields, root);
    if (resolved.status !== 'resolved' || !resolved.element) {
      skipped += 1;
      messages.push('Поле не найдено для отмены заполнения.');
      continue;
    }

    const currentValue = readLiveFieldValue(resolved.element);
    const expectedAfterFill = entry.writtenValue;

    if (currentValue.trim() !== expectedAfterFill.trim()) {
      skipped += 1;
      messages.push('Поле было изменено после заполнения — автоматическая отмена пропущена.');
      continue;
    }

    const restoreResult = restoreFieldValue(
      resolved.element,
      entry.previousValue,
      entry.writtenOptionValue,
    );

    if (!restoreResult.ok) {
      skipped += 1;
      messages.push('Не удалось восстановить предыдущее значение.');
      continue;
    }

    restored += 1;
  }

  return { restored, skipped, messages: [...new Set(messages)] };
}
