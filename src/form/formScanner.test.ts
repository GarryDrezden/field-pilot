import { describe, expect, it } from 'vitest';
import { scanPageFormFields } from './formScanner';

describe('formScanner', () => {
  it('finds editable inputs and excludes hidden fields', () => {
    document.body.innerHTML = `
      <form>
        <label for="title">Название</label>
        <input id="title" name="title" value="Насос" />
        <input type="hidden" name="id" value="42" />
        <input type="password" name="secret" />
        <textarea name="description"></textarea>
        <select name="status"><option>Active</option></select>
      </form>
    `;

    const result = scanPageFormFields(document);
    expect(result.fields).toHaveLength(3);
    expect(result.fields.map((field) => field.label)).toContain('Название');
    expect(result.fields.some((field) => field.name === 'id')).toBe(false);
    expect(result.fields.some((field) => field.name === 'secret')).toBe(false);
  });

  it('skips fields inside FieldPilot panel host', () => {
    document.body.innerHTML = `
      <input name="page-field" />
      <div id="fieldpilot-root-host">
        <input name="panel-field" />
      </div>
    `;

    const result = scanPageFormFields(document);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]?.name).toBe('page-field');
  });
});
