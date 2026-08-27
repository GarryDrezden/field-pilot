import { describe, expect, it } from 'vitest';
import type { FillUndoBatch } from './types';
import { undoLastFill } from './restoreFill';

describe('undoLastFill', () => {
  it('restores previous value when field unchanged after fill', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('data-fieldpilot-id', 'fp-field-1');
    input.value = '61';
    document.body.appendChild(input);

    const batch: FillUndoBatch = {
      createdAt: new Date().toISOString(),
      entries: [
        {
          fieldRuntimeId: 'fp-field-1',
          previousValue: '',
          writtenValue: '61',
          elementType: 'input',
        },
      ],
    };

    const result = undoLastFill(batch, [
      {
        id: 'fp-field-1',
        elementType: 'input',
        inputType: 'text',
        label: 'Motor Power',
        currentValue: '61',
        disabled: false,
        readonly: false,
      },
    ]);

    expect(result.restored).toBe(1);
    expect(input.value).toBe('');

    input.remove();
  });

  it('skips undo when user changed field after fill', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('data-fieldpilot-id', 'fp-field-2');
    input.value = '70';
    document.body.appendChild(input);

    const batch: FillUndoBatch = {
      createdAt: new Date().toISOString(),
      entries: [
        {
          fieldRuntimeId: 'fp-field-2',
          previousValue: '50',
          writtenValue: '61',
          elementType: 'input',
        },
      ],
    };

    const result = undoLastFill(batch, [
      {
        id: 'fp-field-2',
        elementType: 'input',
        inputType: 'text',
        label: 'Power',
        currentValue: '70',
        disabled: false,
        readonly: false,
      },
    ]);

    expect(result.restored).toBe(0);
    expect(result.skipped).toBe(1);
    expect(input.value).toBe('70');

    input.remove();
  });
});
