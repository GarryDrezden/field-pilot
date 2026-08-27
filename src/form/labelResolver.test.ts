import { describe, expect, it } from 'vitest';
import { collectLabelCandidates, resolveFieldLabel } from './labelResolver';

describe('labelResolver', () => {
  it('prefers label[for] over placeholder', () => {
    document.body.innerHTML = `
      <label for="weight">Вес, кг</label>
      <input id="weight" placeholder="Введите вес" />
    `;

    const input = document.getElementById('weight') as HTMLInputElement;
    expect(resolveFieldLabel(input)).toBe('Вес, кг');

    const candidates = collectLabelCandidates(input);
    expect(candidates.some((candidate) => candidate.source === 'label-for')).toBe(true);
  });

  it('uses adjacent table cell for admin-style forms', () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td>Мощность двигателя, кВт:</td>
          <td><input name="POWER" /></td>
        </tr>
      </table>
    `;

    const input = document.querySelector('input') as HTMLInputElement;
    expect(resolveFieldLabel(input)).toBe('Мощность двигателя, кВт');
  });

  it('falls back to aria-label', () => {
    document.body.innerHTML = `<input aria-label="Serial number" />`;
    const input = document.querySelector('input') as HTMLInputElement;
    expect(resolveFieldLabel(input)).toBe('Serial number');
  });
});
