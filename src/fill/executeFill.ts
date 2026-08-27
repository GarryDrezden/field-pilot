import type { FormField } from '../shared/types/form';
import { isFillSupportedField, isValueCompatibleWithField } from './validateFillOperation';
import { readLiveFieldValue, resolveLiveField } from './domFieldAccess';
import { setFieldValue } from './setFieldValue';
import type {
  FillExecutionItemResult,
  FillExecutionResult,
  FillOperation,
  FillUndoEntry,
} from './types';

export interface ExecuteFillInput {
  operations: FillOperation[];
  scannedFields: FormField[];
  root?: Document | ShadowRoot;
}

export function executeFill(input: ExecuteFillInput): FillExecutionResult {
  const selected = input.operations.filter((operation) => operation.selected);
  const results: FillExecutionItemResult[] = [];
  const undoEntries: FillUndoEntry[] = [];

  for (const operation of selected) {
    if (operation.status !== 'ready' && !(operation.status === 'existing-value' && operation.allowOverwrite)) {
      results.push({
        operationId: operation.id,
        status: 'skipped',
        message: 'Операция недоступна для заполнения',
      });
      continue;
    }

    const resolved = resolveLiveField(
      operation.pageFieldId,
      operation.fieldSignature,
      input.scannedFields,
      input.root ?? document,
    );

    if (resolved.status !== 'resolved' || !resolved.element || !resolved.field) {
      results.push({
        operationId: operation.id,
        status: 'failed',
        message:
          resolved.status === 'ambiguous'
            ? 'Неоднозначное поле на странице'
            : 'Поле страницы не найдено',
      });
      continue;
    }

    const field = resolved.field;
    const element = resolved.element;

    if (field.disabled || element.disabled) {
      results.push({ operationId: operation.id, status: 'failed', message: 'Поле отключено' });
      continue;
    }

    if (field.readonly || element.hasAttribute('readonly')) {
      results.push({ operationId: operation.id, status: 'failed', message: 'Поле только для чтения' });
      continue;
    }

    if (!isFillSupportedField(field)) {
      results.push({
        operationId: operation.id,
        status: 'failed',
        message: 'Тип поля не поддерживается',
      });
      continue;
    }

    if (!isValueCompatibleWithField(field, operation.value)) {
      results.push({
        operationId: operation.id,
        status: 'failed',
        message: 'Значение несовместимо с типом поля',
      });
      continue;
    }

    const previousValue = readLiveFieldValue(element);
    const writeResult = setFieldValue(element, operation.value);

    if (!writeResult.ok) {
      results.push({
        operationId: operation.id,
        status: 'failed',
        message: writeResult.error ?? 'Не удалось записать значение',
      });
      continue;
    }

    undoEntries.push({
      fieldRuntimeId: field.id,
      fieldSignature: operation.fieldSignature,
      previousValue,
      writtenValue: writeResult.expectedValue,
      writtenOptionValue: writeResult.optionValue,
      elementType: field.elementType,
    });

    results.push({ operationId: operation.id, status: 'filled' });
  }

  const filled = results.filter((item) => item.status === 'filled').length;
  const skipped = results.filter((item) => item.status === 'skipped').length;
  const failed = results.filter((item) => item.status === 'failed').length;

  return {
    filled,
    skipped,
    failed,
    results,
    undoBatch:
      undoEntries.length > 0
        ? {
            createdAt: new Date().toISOString(),
            entries: undoEntries,
          }
        : null,
  };
}
