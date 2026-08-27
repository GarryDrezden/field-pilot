import type { FormField } from '../shared/types/form';
import type { FieldProfile, ProfileProperty } from '../profile/profileTypes';
import { resolvePropertyPageField } from '../profile/profileMatcher';
import { buildFillValue, buildFillDisplayValue } from './buildFillValue';
import { isEmptyFieldValue, valuesAreEqual } from './isEmptyFieldValue';
import { isFillSupportedField, isValueCompatibleWithField } from './validateFillOperation';
import type { EffectiveDocumentMatch } from '../matching/types';
import type { ExtractedCharacteristic } from '../extraction/types';
import type { FillOperation, FillOperationStatus, FillPlan, FillPlanStats } from './types';

export interface BuildFillPlanInput {
  fillReadyMatches: EffectiveDocumentMatch[];
  characteristics: ExtractedCharacteristic[];
  properties: ProfileProperty[];
  profile: FieldProfile;
  pageFields: FormField[];
}

export function buildFillPlan(input: BuildFillPlanInput): FillPlan {
  const characteristicById = new Map(input.characteristics.map((item) => [item.id, item]));
  const propertyById = new Map(input.properties.map((item) => [item.id, item]));
  const fieldById = new Map(input.pageFields.map((item) => [item.id, item]));

  const operations: FillOperation[] = input.fillReadyMatches
    .map((match) => {
      const characteristic = characteristicById.get(match.characteristicId);
      const propertyId = match.effectivePropertyId;
      if (!characteristic || !propertyId) {
        return null;
      }

      const property = propertyById.get(propertyId);
      if (!property) {
        return null;
      }

      const mapping = resolvePropertyPageField(input.profile, property, input.pageFields);
      const fillValue = buildFillValue(characteristic);
      const displayValue = buildFillDisplayValue(characteristic);
      const base: Omit<FillOperation, 'status' | 'selected' | 'allowOverwrite' | 'reason'> = {
        id: `${match.characteristicId}:${propertyId}`,
        characteristicId: match.characteristicId,
        propertyId,
        value: fillValue,
        displayValue,
        propertyName: property.name,
        propertyExternalId: property.externalId,
        sourceLabel: characteristic.sourceLabel,
        sourceValue: characteristic.rawValue,
        sourceUnit: characteristic.normalizedUnit ?? characteristic.rawUnit,
      };

      if (mapping.isAmbiguous) {
        return finalizeOperation(base, {
          status: 'ambiguous-page-field',
          selected: false,
          allowOverwrite: false,
          reason: 'На странице найдено несколько подходящих полей',
          fieldSignature: mapping.fieldSignature ?? undefined,
        });
      }

      if (!mapping.fieldRuntimeId) {
        return finalizeOperation(base, {
          status: 'no-page-field',
          selected: false,
          allowOverwrite: false,
          reason: 'Поле на странице не найдено',
        });
      }

      const field = fieldById.get(mapping.fieldRuntimeId);
      if (!field) {
        return finalizeOperation(base, {
          status: 'no-page-field',
          selected: false,
          allowOverwrite: false,
          reason: 'Поле страницы недоступно после сканирования',
        });
      }

      return finalizeOperation(
        {
          ...base,
          pageFieldId: field.id,
          fieldSignature: mapping.fieldSignature ?? undefined,
          fieldLabel: field.label,
          currentValue: field.currentValue,
        },
        resolveWritableStatus(field, fillValue),
      );
    })
    .filter((operation): operation is FillOperation => operation !== null);

  applyDestinationConflicts(operations);

  return {
    operations,
    stats: countFillPlanStats(operations, input.fillReadyMatches.length),
  };
}

function resolveWritableStatus(
  field: FormField,
  fillValue: string,
): Pick<FillOperation, 'status' | 'selected' | 'allowOverwrite' | 'reason'> {
  if (field.disabled) {
    return {
      status: 'disabled',
      selected: false,
      allowOverwrite: false,
      reason: 'Поле отключено',
    };
  }

  if (field.readonly) {
    return {
      status: 'readonly',
      selected: false,
      allowOverwrite: false,
      reason: 'Поле только для чтения',
    };
  }

  if (!isFillSupportedField(field)) {
    return {
      status: 'unsupported-field',
      selected: false,
      allowOverwrite: false,
      reason: 'Тип поля не поддерживается для заполнения',
    };
  }

  if (!isValueCompatibleWithField(field, fillValue)) {
    return {
      status: 'invalid-value',
      selected: false,
      allowOverwrite: false,
      reason: 'Значение несовместимо с типом поля',
    };
  }

  if (valuesAreEqual(field.currentValue, fillValue)) {
    return {
      status: 'already-equal',
      selected: false,
      allowOverwrite: false,
      reason: 'Значение уже совпадает',
    };
  }

  if (!isEmptyFieldValue(field.currentValue)) {
    return {
      status: 'existing-value',
      selected: false,
      allowOverwrite: false,
      reason: 'Поле уже содержит значение',
    };
  }

  return {
    status: 'ready',
    selected: true,
    allowOverwrite: false,
  };
}

function applyDestinationConflicts(operations: FillOperation[]): void {
  const byPageField = groupBy(operations, (operation) => operation.pageFieldId ?? '');
  for (const group of byPageField.values()) {
    if (group.length < 2 || !group[0]?.pageFieldId) {
      continue;
    }
    for (const operation of group) {
      markConflict(operation, 'Несколько значений документа указывают на одно поле страницы');
    }
  }

  const byProperty = groupBy(operations, (operation) => operation.propertyId);
  for (const group of byProperty.values()) {
    if (group.length < 2) {
      continue;
    }
    for (const operation of group) {
      markConflict(operation, 'Конфликт назначения для одного свойства профиля');
    }
  }
}

function markConflict(operation: FillOperation, reason: string): void {
  operation.status = 'conflict';
  operation.selected = false;
  operation.allowOverwrite = false;
  operation.reason = reason;
}

function finalizeOperation(
  base: Omit<FillOperation, 'status' | 'selected' | 'allowOverwrite' | 'reason'>,
  status: Pick<FillOperation, 'status' | 'selected' | 'allowOverwrite' | 'reason'> & {
    fieldSignature?: FillOperation['fieldSignature'];
    pageFieldId?: string;
    fieldLabel?: string;
    currentValue?: string;
  },
): FillOperation {
  return {
    ...base,
    pageFieldId: status.pageFieldId ?? base.pageFieldId,
    fieldSignature: status.fieldSignature ?? base.fieldSignature,
    fieldLabel: status.fieldLabel ?? base.fieldLabel,
    currentValue: status.currentValue ?? base.currentValue,
    status: status.status,
    selected: status.selected,
    allowOverwrite: status.allowOverwrite,
    reason: status.reason,
  };
}

function countFillPlanStats(operations: FillOperation[], totalMatches: number): FillPlanStats {
  return {
    totalMatches,
    ready: operations.filter((operation) => operation.status === 'ready').length,
    existingValue: operations.filter((operation) => operation.status === 'existing-value').length,
    alreadyEqual: operations.filter((operation) => operation.status === 'already-equal').length,
    noField: operations.filter((operation) => operation.status === 'no-page-field').length,
    ambiguous: operations.filter((operation) => operation.status === 'ambiguous-page-field').length,
    unsupported: operations.filter((operation) => operation.status === 'unsupported-field').length,
    conflicts: operations.filter((operation) => operation.status === 'conflict').length,
    disabled: operations.filter((operation) => operation.status === 'disabled').length,
    readonly: operations.filter((operation) => operation.status === 'readonly').length,
    invalidValue: operations.filter((operation) => operation.status === 'invalid-value').length,
    selectNotFound: operations.filter((operation) => operation.status === 'select-option-not-found').length,
  };
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) {
      continue;
    }
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  return map;
}

export function applyOperationSelectionRules(
  operations: FillOperation[],
  overrides: Record<string, { selected?: boolean; allowOverwrite?: boolean }>,
): FillOperation[] {
  return operations.map((operation) => {
    const override = overrides[operation.id];
    const allowOverwrite = override?.allowOverwrite ?? operation.allowOverwrite;
    const canSelect =
      operation.status === 'ready' ||
      (operation.status === 'existing-value' && allowOverwrite);

    const selected = canSelect ? (override?.selected ?? operation.selected) : false;

    return {
      ...operation,
      allowOverwrite,
      selected,
    };
  });
}

export function selectAllSafeOperations(operations: FillOperation[]): FillOperation[] {
  return operations.map((operation) => ({
    ...operation,
    selected: operation.status === 'ready',
    allowOverwrite: operation.status === 'existing-value' ? operation.allowOverwrite : false,
  }));
}

export function fillStatusLabel(status: FillOperationStatus): string {
  switch (status) {
    case 'ready':
      return 'Готово';
    case 'existing-value':
      return 'Уже заполнено';
    case 'already-equal':
      return 'Уже совпадает';
    case 'no-page-field':
      return 'Поле не найдено';
    case 'ambiguous-page-field':
      return 'Неоднозначное поле';
    case 'unsupported-field':
      return 'Тип поля не поддерживается';
    case 'invalid-value':
      return 'Значение несовместимо с типом поля';
    case 'disabled':
      return 'Отключено';
    case 'readonly':
      return 'Только чтение';
    case 'select-option-not-found':
      return 'Вариант списка не найден';
    case 'conflict':
      return 'Конфликт';
    default:
      return status;
  }
}
