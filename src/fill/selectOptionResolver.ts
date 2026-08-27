import { normalizePropertyLabel } from '../profile/normalizePropertyLabel';

export type SelectOptionResolution =
  | { status: 'found'; optionValue: string; optionText: string }
  | { status: 'not-found' }
  | { status: 'ambiguous' };

export interface SelectOptionLike {
  value: string;
  text: string;
}

export function resolveSelectOption(
  options: SelectOptionLike[],
  fillValue: string,
): SelectOptionResolution {
  const normalizedFill = normalizePropertyLabel(fillValue);

  const byValue = options.filter((option) => option.value === fillValue);
  if (byValue.length === 1) {
    const option = byValue[0]!;
    return { status: 'found', optionValue: option.value, optionText: option.text };
  }
  if (byValue.length > 1) {
    return { status: 'ambiguous' };
  }

  const byText = options.filter((option) => normalizePropertyLabel(option.text) === normalizedFill);
  if (byText.length === 1) {
    const option = byText[0]!;
    return { status: 'found', optionValue: option.value, optionText: option.text };
  }
  if (byText.length > 1) {
    return { status: 'ambiguous' };
  }

  const byNormalizedValue = options.filter(
    (option) => normalizePropertyLabel(option.value) === normalizedFill,
  );
  if (byNormalizedValue.length === 1) {
    const option = byNormalizedValue[0]!;
    return { status: 'found', optionValue: option.value, optionText: option.text };
  }
  if (byNormalizedValue.length > 1) {
    return { status: 'ambiguous' };
  }

  return { status: 'not-found' };
}

export function readSelectOptions(select: HTMLSelectElement): SelectOptionLike[] {
  return Array.from(select.options).map((option) => ({
    value: option.value,
    text: option.text,
  }));
}
