import { describe, expect, it } from 'vitest';
import { scanPageFormFields, resetScanGenerationCounterForTests } from './formScanner';

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
    expect(result.fields.find((field) => field.name === 'title')?.labelSource).toBe('label-for');
  });

  it('excludes search and CSRF-like service fields', () => {
    document.body.innerHTML = `
      <form>
        <input type="search" name="q" placeholder="Поиск" />
        <input type="hidden" name="sessid" value="abc" />
        <input name="POWER" aria-label="Мощность" />
      </form>
    `;

    const result = scanPageFormFields(document);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]?.name).toBe('POWER');
  });

  it('marks duplicate normalized labels as ambiguous', () => {
    document.body.innerHTML = `
      <form>
        <label for="title-a">Название</label>
        <input id="title-a" name="title_a" />
        <label for="title-b">Название</label>
        <input id="title-b" name="title_b" />
      </form>
    `;

    const result = scanPageFormFields(document);
    expect(result.fields).toHaveLength(2);
    expect(result.fields.every((field) => field.ambiguousLabel)).toBe(true);
  });

  it('increments scan generation on each scan', () => {
    resetScanGenerationCounterForTests();
    document.body.innerHTML = `<input name="a" aria-label="A" />`;

    const first = scanPageFormFields(document);
    const second = scanPageFormFields(document);

    expect(second.scanGeneration).toBe(first.scanGeneration + 1);
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
