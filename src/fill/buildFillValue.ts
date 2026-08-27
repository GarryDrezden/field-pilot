import type { ExtractedCharacteristic } from '../extraction/types';

export function buildFillValue(characteristic: ExtractedCharacteristic): string {
  if (characteristic.valueKind === 'text') {
    return characteristic.rawValue.trim();
  }

  return characteristic.normalizedValue.trim();
}

export function buildFillDisplayValue(characteristic: ExtractedCharacteristic): string {
  const value = buildFillValue(characteristic);
  const unit = characteristic.normalizedUnit ?? characteristic.rawUnit;
  if (unit && characteristic.valueKind !== 'text') {
    return `${value} ${unit}`;
  }
  return value;
}
