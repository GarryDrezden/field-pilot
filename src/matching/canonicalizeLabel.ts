import { findUnitInText } from '../extraction/normalizeUnit';
import { normalizePropertyLabel } from '../profile/normalizePropertyLabel';
import type { CanonicalLabel } from './types';
import { PHRASE_LEXICON, STOPWORDS, TOKEN_LEXICON } from './technicalLexicon';

const TOKEN_SPLIT = /[^a-z0-9а-яё°±]+/i;

function stripTrailingUnit(label: string): string {
  const fromText = findUnitInText(label);
  if (fromText?.beforeUnit) {
    return fromText.beforeUnit;
  }

  const commaUnit = label.match(/^(.*),\s*[^,]+$/);
  if (commaUnit?.[1]) {
    return commaUnit[1].trim();
  }

  return label;
}

export function canonicalizeLabel(label: string): CanonicalLabel {
  const normalized = normalizePropertyLabel(stripTrailingUnit(label));  let remaining = normalized;
  const concepts = new Set<string>();
  const unknownTokens = new Set<string>();

  for (const entry of PHRASE_LEXICON) {
    while (remaining.includes(entry.phrase)) {
      for (const concept of entry.concepts) {
        concepts.add(concept);
      }
      remaining = remaining.replace(entry.phrase, ' ');
    }
  }

  const tokens = remaining
    .split(TOKEN_SPLIT)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (STOPWORDS.has(token)) {
      continue;
    }

    const mapped = TOKEN_LEXICON[token];
    if (mapped) {
      concepts.add(mapped);
      continue;
    }

    if (token.length >= 2) {
      unknownTokens.add(token);
    }
  }

  return { concepts, unknownTokens };
}

export function getConceptList(canonical: CanonicalLabel): string[] {
  return [...canonical.concepts].sort();
}

export function getUnknownTokenList(canonical: CanonicalLabel): string[] {
  return [...canonical.unknownTokens].sort();
}
