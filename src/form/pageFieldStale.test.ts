import { describe, expect, it } from 'vitest';
import { assignFieldId } from '../shared/utils';
import { buildPageScanSnapshot, detectStalePageFields } from './pageFieldStale';
import type { FormField } from '../shared/types/form';

function makeField(id: string, name: string): FormField {
  return {
    id,
    elementType: 'input',
    label: name,
    labelSource: 'name',
    name,
    visible: true,
    disabled: false,
    readonly: false,
    isCustomControl: false,
  };
}

describe('pageFieldStale', () => {
  it('marks page stale when URL changed', () => {
    const fields = [makeField('fp-field-1', 'title')];
    document.body.innerHTML = `<input name="title" />`;

    const snapshot = buildPageScanSnapshot(fields, 'https://example.com/old', 'Old', 1);
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/new' },
      configurable: true,
    });

    const result = detectStalePageFields(fields, snapshot, document);
    expect(result.stale).toBe(true);
  });

  it('marks page stale when most fields no longer resolve', () => {
    document.body.innerHTML = `<input name="title" />`;
    const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
    const titleId = assignFieldId(titleInput);

    const fields = [
      makeField(titleId, 'title'),
      makeField('fp-field-missing-a', 'weight'),
      makeField('fp-field-missing-b', 'height'),
    ];
    const snapshot = buildPageScanSnapshot(fields, window.location.href, 'Form', 1);
    const result = detectStalePageFields(fields, snapshot, document);

    expect(result.stale).toBe(true);
    expect(result.resolvedCount).toBe(1);
    expect(result.total).toBe(3);
  });
});
