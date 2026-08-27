interface UnitDefinition {
  patterns: string[];
  normalized: string;
}

const UNIT_DEFINITIONS: UnitDefinition[] = [
  { patterns: ['mm/s', 'мм/с'], normalized: 'mm/s' },
  { patterns: ['mm/min', 'мм/мин'], normalized: 'mm/min' },
  { patterns: ['m/min', 'м/мин'], normalized: 'm/min' },
  { patterns: ['m/s', 'м/с'], normalized: 'm/s' },
  { patterns: ['s/bending', 'sec/bending', 'сек/изгиб'], normalized: 's/bending' },
  { patterns: ['r/min', 'rpm', 'об/мин'], normalized: 'rpm' },
  { patterns: ['khz', 'кгц'], normalized: 'kHz' },
  { patterns: ['kpa', 'кпа'], normalized: 'kPa' },
  { patterns: ['mpa', 'мпа'], normalized: 'MPa' },
  { patterns: ['kwh', 'квт·ч'], normalized: 'kWh' },
  { patterns: ['kw', 'квт'], normalized: 'kW' },
  { patterns: ['kn', 'кн'], normalized: 'kN' },
  { patterns: ['mm', 'мм'], normalized: 'mm' },
  { patterns: ['cm', 'см'], normalized: 'cm' },
  { patterns: ['hz', 'гц'], normalized: 'Hz' },
  { patterns: ['kg', 'кг'], normalized: 'kg' },
  { patterns: ['pa', 'па'], normalized: 'Pa' },
  { patterns: ['sec', 'сек'], normalized: 's' },
  { patterns: ['bar', 'бар'], normalized: 'bar' },
  { patterns: ['град'], normalized: '°' },
  { patterns: ['°'], normalized: '°' },
  { patterns: ['%'], normalized: '%' },
  { patterns: ['m', 'м'], normalized: 'm' },
  { patterns: ['g', 'г'], normalized: 'g' },
  { patterns: ['t', 'т'], normalized: 't' },
  { patterns: ['w', 'вт'], normalized: 'W' },
  { patterns: ['v', 'в'], normalized: 'V' },
  { patterns: ['a', 'а'], normalized: 'A' },
  { patterns: ['n', 'н'], normalized: 'N' },
  { patterns: ['s'], normalized: 's' },
];

const SORTED_UNIT_PATTERNS = UNIT_DEFINITIONS.flatMap((definition) =>
  definition.patterns.map((pattern) => ({
    pattern,
    normalized: definition.normalized,
    regex: new RegExp(`^${escapeRegex(pattern)}$`, 'i'),
  })),
).sort((left, right) => right.pattern.length - left.pattern.length);

export function normalizeUnit(rawUnit: string | undefined): string | undefined {
  if (!rawUnit?.trim()) {
    return undefined;
  }

  const trimmed = rawUnit.trim();
  for (const entry of SORTED_UNIT_PATTERNS) {
    if (entry.regex.test(trimmed)) {
      return entry.normalized;
    }
  }

  return undefined;
}

export function findUnitInText(text: string): { rawUnit: string; normalizedUnit?: string; beforeUnit: string; afterUnit: string } | null {
  const trimmed = text.trim();
  for (const entry of SORTED_UNIT_PATTERNS) {
    const regex = new RegExp(`\\s(${escapeRegex(entry.pattern)})\\s+(.+)$`, 'i');
    const match = trimmed.match(regex);
    if (match?.index !== undefined && match[1] && match[2]) {
      return {
        rawUnit: match[1],
        normalizedUnit: entry.normalized,
        beforeUnit: trimmed.slice(0, match.index).trim(),
        afterUnit: match[2].trim(),
      };
    }

    const suffixRegex = new RegExp(`\\s(${escapeRegex(entry.pattern)})$`, 'i');
    const suffixMatch = trimmed.match(suffixRegex);
    if (suffixMatch?.index !== undefined && suffixMatch[1]) {
      return {
        rawUnit: suffixMatch[1],
        normalizedUnit: entry.normalized,
        beforeUnit: trimmed.slice(0, suffixMatch.index).trim(),
        afterUnit: '',
      };
    }
  }

  return null;
}

export function getUnitPatternList(): string[] {
  return SORTED_UNIT_PATTERNS.map((entry) => entry.pattern);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
