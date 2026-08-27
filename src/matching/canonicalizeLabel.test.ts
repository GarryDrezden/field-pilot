import { describe, expect, it } from 'vitest';
import { canonicalizeLabel, getConceptList } from './canonicalizeLabel';

describe('canonicalizeLabel', () => {
  it('maps motor variants to MOTOR', () => {
    expect(getConceptList(canonicalizeLabel('motor'))).toContain('MOTOR');
    expect(getConceptList(canonicalizeLabel('двигатель'))).toContain('MOTOR');
    expect(getConceptList(canonicalizeLabel('двигателя'))).toContain('MOTOR');
  });

  it('maps power variants to POWER', () => {
    expect(getConceptList(canonicalizeLabel('power'))).toContain('POWER');
    expect(getConceptList(canonicalizeLabel('мощность'))).toContain('POWER');
  });

  it('maps max variants to MAX', () => {
    expect(getConceptList(canonicalizeLabel('maximum'))).toContain('MAX');
    expect(getConceptList(canonicalizeLabel('максимальная'))).toContain('MAX');
  });

  it('maps bending and feeding phrases', () => {
    expect(getConceptList(canonicalizeLabel('bending angle'))).toEqual(
      expect.arrayContaining(['BEND', 'ANGLE']),
    );
    expect(getConceptList(canonicalizeLabel('feeding speed'))).toEqual(
      expect.arrayContaining(['FEED', 'SPEED']),
    );
    expect(getConceptList(canonicalizeLabel('гибки'))).toContain('BEND');
    expect(getConceptList(canonicalizeLabel('подачи'))).toContain('FEED');
  });

  it('maps material phrases', () => {
    expect(getConceptList(canonicalizeLabel('stainless steel'))).toContain('STAINLESS');
    expect(getConceptList(canonicalizeLabel('нержавеющей стали'))).toContain('STAINLESS');
    expect(getConceptList(canonicalizeLabel('aluminium'))).toContain('ALUMINUM');
    expect(getConceptList(canonicalizeLabel('алюминия'))).toContain('ALUMINUM');
  });

  it('maps max feeding speed phrase', () => {
    expect(getConceptList(canonicalizeLabel('Max. Feeding Speed'))).toEqual(
      expect.arrayContaining(['MAX', 'FEED', 'SPEED']),
    );
  });

  it('does not treat min inside m/min unit suffix as MIN concept', () => {
    expect(getConceptList(canonicalizeLabel('Скорость подачи, м/мин'))).toEqual(
      expect.arrayContaining(['FEED', 'SPEED']),
    );
    expect(getConceptList(canonicalizeLabel('Скорость подачи, м/мин'))).not.toContain('MIN');
  });
});
