import type { FormField } from '../shared/types/form';

const FORBIDDEN_INPUT_TYPES = new Set([
  'password',
  'hidden',
  'file',
  'submit',
  'button',
  'image',
  'reset',
  'checkbox',
  'radio',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'color',
  'range',
]);

const SIMPLE_NUMBER_PATTERN = /^-?\d+(?:[.,]\d+)?$/;

export function isFillSupportedField(field: FormField): boolean {
  if (field.elementType === 'textarea' || field.elementType === 'select') {
    return true;
  }

  if (field.elementType !== 'input') {
    return false;
  }

  const inputType = (field.inputType ?? 'text').toLowerCase();
  return !FORBIDDEN_INPUT_TYPES.has(inputType);
}

export function isSimpleFiniteNumber(value: string): boolean {
  const normalized = value.trim().replace(',', '.');
  if (!SIMPLE_NUMBER_PATTERN.test(normalized)) {
    return false;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed);
}

export function isValueCompatibleWithField(field: FormField, value: string): boolean {
  if (field.elementType === 'textarea' || field.elementType === 'select') {
    return value.trim().length > 0;
  }

  if (field.elementType !== 'input') {
    return false;
  }

  const inputType = (field.inputType ?? 'text').toLowerCase();

  if (inputType === 'number') {
    return isSimpleFiniteNumber(value);
  }

  return true;
}
