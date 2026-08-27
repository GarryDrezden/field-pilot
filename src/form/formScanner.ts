import type { FormField, FormScanResult } from '../shared/types/form';
import { assignFieldId } from '../shared/utils';
import { isCustomSelectLike, isVisibleFormField } from './fieldVisibility';
import {
  getCurrentValue,
  isEditableFormControl,
  resolveFieldLabelDetails,
} from './labelResolver';
import { isLikelyServiceField } from './serviceFieldFilter';
import { normalizePropertyLabel } from '../profile/normalizePropertyLabel';

let scanGenerationCounter = 0;

export function resetScanGenerationCounterForTests(): void {
  scanGenerationCounter = 0;
}

export function scanPageFormFields(root: Document | ShadowRoot = document): FormScanResult {
  scanGenerationCounter += 1;
  const elements = collectEditableElements(root);
  const mapped = elements
    .map((element, index) => mapElementToField(element, index))
    .filter((field): field is FormField => field !== null);

  const fields = markDuplicateLabels(mapped);

  return {
    scannedAt: new Date().toISOString(),
    fields,
    pageUrl: document.location.href,
    pageTitle: document.title,
    scanGeneration: scanGenerationCounter,
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

    if (node instanceof HTMLElement && !isVisibleFormField(node)) {
      return;
    }

    if (node instanceof HTMLElement && isCustomSelectLike(node)) {
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
): FormField | null {
  const labelDetails = resolveFieldLabelDetails(element);
  if (isLikelyServiceField(element, labelDetails.label)) {
    return null;
  }

  const id = assignFieldId(element);
  const elementType = getElementType(element);

  return {
    id: id || `fp-field-${index + 1}`,
    elementType,
    inputType: element instanceof HTMLInputElement ? element.type : undefined,
    label: labelDetails.label,
    labelSource: labelDetails.source,
    name: element.getAttribute('name') ?? undefined,
    htmlId: element.getAttribute('id') ?? undefined,
    placeholder: element.getAttribute('placeholder') ?? undefined,
    currentValue: getCurrentValue(element),
    disabled: element.disabled,
    readonly: element.hasAttribute('readonly'),
    visible: true,
    isCustomControl: isCustomSelectLike(element),
  };
}

function markDuplicateLabels(fields: FormField[]): FormField[] {
  const counts = new Map<string, number>();
  for (const field of fields) {
    const key = normalizePropertyLabel(field.label);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return fields.map((field) => ({
    ...field,
    ambiguousLabel: (counts.get(normalizePropertyLabel(field.label)) ?? 0) > 1,
  }));
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
