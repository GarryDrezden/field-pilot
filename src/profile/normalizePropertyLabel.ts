const NBSP = /\u00a0/g;
const MULTIPLE_SPACES = /\s+/g;
const TRAILING_COLON = /[:：]\s*$/;

const TYPOGRAPHIC_MAP: Record<string, string> = {
  '\u2013': '-',
  '\u2014': '-',
  '\u2212': '-',
  '\u00b0': '°',
  '\u02da': '°',
  '\u2019': "'",
  '\u2018': "'",
  '\u201c': '"',
  '\u201d': '"',
};

export function normalizePropertyLabel(value: string): string {
  let normalized = value.replace(NBSP, ' ').trim();

  for (const [from, to] of Object.entries(TYPOGRAPHIC_MAP)) {
    normalized = normalized.replaceAll(from, to);
  }

  normalized = normalized.replace(TRAILING_COLON, '');
  normalized = normalized.replace(MULTIPLE_SPACES, ' ');
  normalized = normalized.replace(/\s*([,;/])\s*/g, '$1 ');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized.toLocaleLowerCase('ru-RU');
}

export function isNormalizedDuplicate(left: string, right: string): boolean {
  return normalizePropertyLabel(left) === normalizePropertyLabel(right);
}
