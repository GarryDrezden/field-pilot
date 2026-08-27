import { readSelectOptions, resolveSelectOption } from './selectOptionResolver';

export interface SetFieldValueResult {
  ok: boolean;
  expectedValue: string;
  actualValue: string;
  optionValue?: string;
  error?: string;
}

export function setFieldValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  fillValue: string,
): SetFieldValueResult {
  if (element instanceof HTMLSelectElement) {
    return setSelectValue(element, fillValue);
  }

  if (element instanceof HTMLTextAreaElement) {
    return setNativeValue(element, fillValue, HTMLTextAreaElement.prototype, 'value');
  }

  return setNativeValue(element, fillValue, HTMLInputElement.prototype, 'value');
}

function setSelectValue(element: HTMLSelectElement, fillValue: string): SetFieldValueResult {
  const resolution = resolveSelectOption(readSelectOptions(element), fillValue);
  if (resolution.status !== 'found') {
    return {
      ok: false,
      expectedValue: fillValue,
      actualValue: element.value,
      error:
        resolution.status === 'ambiguous'
          ? 'Неоднозначный вариант списка'
          : 'Вариант списка не найден',
    };
  }

  const result = setNativeValue(element, resolution.optionValue, HTMLSelectElement.prototype, 'value');
  return {
    ...result,
    optionValue: resolution.optionValue,
    expectedValue: resolution.optionText,
  };
}

function setNativeValue<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  element: T,
  value: string,
  prototype: { value?: string },
  property: 'value',
): SetFieldValueResult {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
  const setter = descriptor?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }

  dispatchFieldEvents(element);

  const actualValue =
    element instanceof HTMLSelectElement
      ? element.options[element.selectedIndex]?.text ?? element.value
      : element.value;

  const expectedDisplay =
    element instanceof HTMLSelectElement
      ? readSelectOptions(element).find((option) => option.value === value)?.text ?? value
      : value;

  const ok = element instanceof HTMLSelectElement ? element.value === value : actualValue === value;

  return {
    ok,
    expectedValue: expectedDisplay,
    actualValue,
    optionValue: element instanceof HTMLSelectElement ? value : undefined,
    error: ok ? undefined : 'Значение не сохранилось в поле',
  };
}

function dispatchFieldEvents(element: HTMLElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

export function restoreFieldValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  previousValue: string,
  previousOptionValue?: string,
): SetFieldValueResult {
  if (element instanceof HTMLSelectElement && previousOptionValue !== undefined) {
    return setNativeValue(element, previousOptionValue, HTMLSelectElement.prototype, 'value');
  }

  return setFieldValue(element, previousValue);
}
