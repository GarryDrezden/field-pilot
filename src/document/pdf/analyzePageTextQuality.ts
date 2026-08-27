import type { PageTextQuality } from '../../shared/types/document';
import type { ReconstructedLine } from './reconstructPdfLines';

interface PdfTextItemLike {
  str?: string;
  transform?: number[];
}

const EMPTY_MAX_CHARS = 5;
const EMPTY_MAX_ITEMS = 1;
const WEAK_MAX_CHARS = 40;
const WEAK_FRAGMENTED_ITEMS = 25;
const WEAK_FRAGMENTED_MAX_LINES = 2;
const SUSPICIOUS_RATIO_THRESHOLD = 0.12;

export function analyzePageTextQuality(
  pageNumber: number,
  textItems: PdfTextItemLike[],
  lines: ReconstructedLine[],
): PageTextQuality {
  const itemsWithText = textItems.filter((item) => item.str?.trim());
  const textItemCount = itemsWithText.length;
  const nonWhitespaceCharacters = itemsWithText.reduce(
    (sum, item) => sum + (item.str?.replace(/\s/g, '').length ?? 0),
    0,
  );
  const reconstructedLineCount = lines.length;
  const lineText = lines.map((line) => line.text).join('');
  const suspiciousMatches = countSuspiciousCharacters(lineText);
  const suspiciousCharacterRatio =
    lineText.length > 0 ? suspiciousMatches / lineText.length : 0;

  const reasons: string[] = [];
  let level: PageTextQuality['level'] = 'good';

  if (textItemCount === 0 || nonWhitespaceCharacters === 0) {
    level = 'empty';
    reasons.push('PDF.js не нашёл текстовых элементов на странице');
  } else if (
    nonWhitespaceCharacters <= EMPTY_MAX_CHARS &&
    textItemCount <= EMPTY_MAX_ITEMS
  ) {
    level = 'empty';
    reasons.push('Текстовый слой почти пустой');
  } else if (
    nonWhitespaceCharacters < WEAK_MAX_CHARS ||
    (textItemCount >= WEAK_FRAGMENTED_ITEMS &&
      reconstructedLineCount <= WEAK_FRAGMENTED_MAX_LINES) ||
    (textItemCount > 0 && reconstructedLineCount === 0)
  ) {
    level = 'weak';
    if (nonWhitespaceCharacters < WEAK_MAX_CHARS) {
      reasons.push('Слишком мало символов для полноценной страницы');
    }
    if (
      textItemCount >= WEAK_FRAGMENTED_ITEMS &&
      reconstructedLineCount <= WEAK_FRAGMENTED_MAX_LINES
    ) {
      reasons.push('Много фрагментов текста, мало восстановленных строк');
    }
    if (textItemCount > 0 && reconstructedLineCount === 0) {
      reasons.push('Не удалось восстановить строки из текстового слоя');
    }
  }

  if (
    suspiciousCharacterRatio >= SUSPICIOUS_RATIO_THRESHOLD &&
    level === 'good'
  ) {
    level = 'weak';
    reasons.push('Подозрительные символы в текстовом слое');
  }

  return {
    pageNumber,
    textItemCount,
    nonWhitespaceCharacters,
    reconstructedLineCount,
    suspiciousCharacterRatio,
    level,
    reasons,
  };
}

function countSuspiciousCharacters(text: string): number {
  let count = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (char === '\uFFFD' || code <= 31) {
      count += 1;
    }
  }
  return count;
}

export function isOcrCandidate(quality: PageTextQuality): boolean {
  return quality.level === 'empty' || quality.level === 'weak';
}

export function buildPdfDiagnostics(
  pages: Array<{ pageNumber: number; textQuality?: PageTextQuality }>,
): import('../../shared/types/document').PdfParseDiagnostics {
  let goodTextPages = 0;
  let weakTextPages = 0;
  let emptyTextPages = 0;
  const ocrCandidatePageNumbers: number[] = [];

  for (const page of pages) {
    const level = page.textQuality?.level ?? 'good';
    if (level === 'good') {
      goodTextPages += 1;
    } else if (level === 'weak') {
      weakTextPages += 1;
      ocrCandidatePageNumbers.push(page.pageNumber);
    } else {
      emptyTextPages += 1;
      ocrCandidatePageNumbers.push(page.pageNumber);
    }
  }

  return {
    totalPages: pages.length,
    goodTextPages,
    weakTextPages,
    emptyTextPages,
    ocrCandidatePageNumbers,
  };
}
