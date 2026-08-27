import { normalizeWhitespace } from '../shared/utils';
import type { LabelSource } from '../shared/types/form';

const EXCLUDED_INPUT_TYPES = new Set([
  'hidden',
  'password',
  'submit',
  'button',
  'image',
  'reset',
  'file',
]);

export interface LabelCandidate {
  text: string;
  source: LabelSource;
  priority: number;
}

const SOURCE_PRIORITY: Record<LabelSource, number> = {
  'label-for': 1,
  'label-wrap': 2,
  'aria-labelledby': 3,
  'aria-label': 4,
  container: 5,
  'table-cell': 6,
  placeholder: 7,
  name: 8,
  id: 9,
};

export function resolveFieldLabel(element: HTMLElement): string {
  return resolveFieldLabelDetails(element).label;
}

export function resolveFieldLabelDetails(element: HTMLElement): {
  label: string;
  source: LabelSource;
} {
  const candidates = collectLabelCandidates(element);
  if (candidates.length === 0) {
    return { label: 'Без названия', source: 'name' };
  }

  candidates.sort((left, right) => left.priority - right.priority);
  const best = candidates[0]!;
  return { label: best.text, source: best.source };
}

export function collectLabelCandidates(element: HTMLElement): LabelCandidate[] {
  const candidates: LabelCandidate[] = [];

  addLabelForCandidate(element, candidates);
  addWrappedLabelCandidate(element, candidates);
  addAriaLabelCandidate(element, candidates);
  addAriaLabelledByCandidate(element, candidates);
  addContainerCandidate(element, candidates);
  addTableCellCandidate(element, candidates);
  addAttributeCandidate(element, 'placeholder', 'placeholder', candidates);
  addAttributeCandidate(element, 'name', 'name', candidates);
  addAttributeCandidate(element, 'id', 'id', candidates);

  return candidates.filter((candidate) => candidate.text.length > 0);
}

function addCandidate(
  candidates: LabelCandidate[],
  text: string | null | undefined,
  source: LabelCandidate['source'],
): void {
  if (!text) {
    return;
  }

  const normalized = normalizeWhitespace(text.replace(/[:：]\s*$/, ''));
  if (!normalized) {
    return;
  }

  candidates.push({
    text: normalized,
    source,
    priority: SOURCE_PRIORITY[source],
  });
}

function addLabelForCandidate(element: HTMLElement, candidates: LabelCandidate[]): void {
  const id = element.getAttribute('id');
  if (!id || !element.ownerDocument) {
    return;
  }

  const label = element.ownerDocument.querySelector(`label[for="${cssEscape(id)}"]`);
  addCandidate(candidates, label?.textContent, 'label-for');
}

function addWrappedLabelCandidate(element: HTMLElement, candidates: LabelCandidate[]): void {
  const label = element.closest('label');
  if (!label) {
    return;
  }

  const clone = label.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('input, textarea, select, button').forEach((node) => node.remove());
  addCandidate(candidates, clone.textContent, 'label-wrap');
}

function addAriaLabelCandidate(element: HTMLElement, candidates: LabelCandidate[]): void {
  addCandidate(candidates, element.getAttribute('aria-label'), 'aria-label');
}

function addAriaLabelledByCandidate(element: HTMLElement, candidates: LabelCandidate[]): void {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (!labelledBy || !element.ownerDocument) {
    return;
  }

  const text = labelledBy
    .split(/\s+/)
    .map((id) => element.ownerDocument?.getElementById(id)?.textContent ?? '')
    .join(' ');

  addCandidate(candidates, text, 'aria-labelledby');
}

function addContainerCandidate(element: HTMLElement, candidates: LabelCandidate[]): void {
  const container = findMeaningfulContainer(element);
  if (!container) {
    return;
  }

  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('input, textarea, select, button, script, style').forEach((node) => {
    node.remove();
  });

  const text = normalizeWhitespace(clone.textContent ?? '');
  if (!text || text.length > 120) {
    return;
  }

  addCandidate(candidates, text, 'container');
}

function addTableCellCandidate(element: HTMLElement, candidates: LabelCandidate[]): void {
  const cell = element.closest('td, th');
  if (!cell) {
    return;
  }

  const row = cell.closest('tr');
  if (!row) {
    return;
  }

  const cells = Array.from(row.children).filter(
    (child): child is HTMLTableCellElement =>
      child instanceof HTMLTableCellElement,
  );

  const cellIndex = cells.indexOf(cell as HTMLTableCellElement);
  if (cellIndex <= 0) {
    return;
  }

  const labelCell = cells[cellIndex - 1];
  if (!labelCell || labelCell.querySelector('input, textarea, select')) {
    return;
  }

  addCandidate(candidates, labelCell.textContent, 'table-cell');
}

function addAttributeCandidate(
  element: HTMLElement,
  attributeName: string,
  source: LabelCandidate['source'],
  candidates: LabelCandidate[],
): void {
  addCandidate(candidates, element.getAttribute(attributeName), source);
}

function findMeaningfulContainer(element: HTMLElement): HTMLElement | null {
  const selectors = ['.form-group', '.field', '.form-row', 'fieldset', 'li', 'div', 'p'];
  let current: HTMLElement | null = element.parentElement;

  while (current && current !== current.ownerDocument?.body) {
    if (selectors.includes(current.tagName.toLowerCase()) || current.classList.length > 0) {
      const textLength = normalizeWhitespace(current.textContent ?? '').length;
      if (textLength > 0 && textLength <= 120) {
        return current;
      }
    }
    current = current.parentElement;
  }

  return element.parentElement;
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && 'escape' in CSS) {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}

export function isEditableFormControl(element: Element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return true;
  }

  if (!(element instanceof HTMLInputElement)) {
    return false;
  }

  if (EXCLUDED_INPUT_TYPES.has(element.type)) {
    return false;
  }

  if (element.type === 'checkbox' || element.type === 'radio') {
    return false;
  }

  return true;
}

export function getCurrentValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): string | undefined {
  if (element instanceof HTMLSelectElement) {
    const selected = element.options[element.selectedIndex];
    return selected?.text ?? element.value;
  }

  return element.value || undefined;
}
