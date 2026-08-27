const PROSE_MARKERS = [
  /\bthat\b/i,
  /\bwhich\b/i,
  /\bcan be used\b/i,
  /\bto ensure\b/i,
  /\baccording to\b/i,
  /\bwe offer\b/i,
  /\branging from\b/i,
  /\bwarranty period\b/i,
  /\bwithout prior notice\b/i,
  /\bsubject to change\b/i,
  /\bhigh-precision\b/i,
  /\bfor example\b/i,
];

const HEADER_MARKERS = [
  /^no\.?$/i,
  /^item$/i,
  /^unit$/i,
  /^наименование$/i,
  /^единица/i,
  /^значение$/i,
  /^n\s*o\.?$/i,
];

export function isLikelyProseLine(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 140) {
    return true;
  }

  if (looksStructured(trimmed)) {
    return false;
  }

  if (PROSE_MARKERS.some((marker) => marker.test(trimmed))) {
    return true;
  }

  const sentenceLike =
    (trimmed.match(/[.!?]/g)?.length ?? 0) >= 2 || trimmed.split(/\s+/).length > 18;

  return sentenceLike;
}

export function isLikelyHeaderRow(cells: string[]): boolean {
  const normalized = cells.map((cell) => cell.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return false;
  }

  const joined = normalized.join(' ').toLocaleLowerCase('ru-RU');
  if (/^(no\.?|item|unit)\b/.test(joined) || joined.includes('item unit')) {
    return true;
  }

  const markerHits = normalized.filter((cell) =>
    HEADER_MARKERS.some((marker) => marker.test(cell.replace(/\s+/g, ' '))),
  ).length;

  return markerHits >= 2;
}

export function isLikelyHeaderLine(text: string): boolean {
  const normalized = text.trim().toLocaleLowerCase('ru-RU');
  return (
    normalized.includes('item unit') ||
    /^n\s*o\.?\s+item\s+unit/i.test(text) ||
    /^№\s*.+\s+единица/i.test(text)
  );
}

function looksStructured(text: string): boolean {
  return /^(?:№\s*)?\d+[.)]\s+.+\s+\S/.test(text);
}

export function isValidCharacteristicLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed || trimmed.length > 80) {
    return false;
  }

  if (isLikelyProseLine(trimmed)) {
    return false;
  }

  if (/^\d+[.)]?$/.test(trimmed)) {
    return false;
  }

  if (/^[A-Z] axis$/i.test(trimmed) || /^options$/i.test(trimmed)) {
    return false;
  }

  return /[\p{L}]/u.test(trimmed);
}

export function isShortChildLabel(label: string): boolean {
  const trimmed = label.trim();
  const words = trimmed.split(/\s+/);
  if (words.length > 3) {
    return false;
  }

  return words.every((word) => /^[A-ZА-Я0-9][A-Za-zА-Яа-я0-9.-]{0,15}$/.test(word));
}
