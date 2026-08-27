import type { FormField, FormScanResult } from '../shared/types/form';
import { assignFieldId } from '../shared/utils';
import {
  getCurrentValue,
  isEditableFormControl,
  resolveFieldLabel,
} from './labelResolver';

export function scanPageFormFields(root: Document | ShadowRoot = document): FormScanResult {
  const elements = collectEditableElements(root);
  const fields = elements.map((element, index) => mapElementToField(element, index));

  return {
    scannedAt: new Date().toISOString(),
    fields,
    pageUrl: document.location.href,
    pageTitle: document.title,
  };
}

function collectEditableElements(root: Document | ShadowRoot): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  const nodeList = root.querySelectorAll('input, textarea, select');
  const result: Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = [];

  nodeList.forEach((node) => {
    if (!isEditableFormControl(node)) {
      return;
    }

    if (node instanceof HTMLElement && isInsideFieldPilotPanel(node)) {
      return;
    }

    result.push(node);
  });

  return result;
}

function isInsideFieldPilotPanel(element: HTMLElement): boolean {
  return Boolean(element.closest('#fieldpilot-root-host'));
}

function mapElementToField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  index: number,
): FormField {
  const id = assignFieldId(element);
  const elementType = getElementType(element);

  return {
    id: id || `fp-field-${index + 1}`,
    elementType,
    inputType: element instanceof HTMLInputElement ? element.type : undefined,
    label: resolveFieldLabel(element),
    name: element.getAttribute('name') ?? undefined,
    placeholder: element.getAttribute('placeholder') ?? undefined,
    currentValue: getCurrentValue(element),
    disabled: element.disabled,
    readonly: element.hasAttribute('readonly'),
  };
}

function getElementType(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): FormField['elementType'] {
  if (element instanceof HTMLTextAreaElement) {
    return 'textarea';
  }
  if (element instanceof HTMLSelectElement) {
    return 'select';
  }
  return 'input';
}
