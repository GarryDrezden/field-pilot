import { describe, expect, it } from 'vitest';
import { assignFieldId } from '../shared/utils';
import { setFieldValue } from './setFieldValue';

describe('setFieldValue', () => {
  it('sets input value and dispatches events', () => {
    const input = document.createElement('input');
    input.type = 'text';
    assignFieldId(input);
    document.body.appendChild(input);

    const events: string[] = [];
    input.addEventListener('input', () => events.push('input'));
    input.addEventListener('change', () => events.push('change'));

    const result = setFieldValue(input, '61');
    expect(result.ok).toBe(true);
    expect(input.value).toBe('61');
    expect(events).toEqual(['input', 'change']);

    input.remove();
  });

  it('sets select by visible text to option value', () => {
    const select = document.createElement('select');
    assignFieldId(select);
    select.innerHTML = '<option value="142">HARSLE</option><option value="200">INVT</option>';
    document.body.appendChild(select);

    const result = setFieldValue(select, 'HARSLE');
    expect(result.ok).toBe(true);
    expect(select.value).toBe('142');

    select.remove();
  });
});
