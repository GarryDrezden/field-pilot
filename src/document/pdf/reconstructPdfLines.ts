export interface PdfTextSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

export interface ReconstructedLine {
  lineNumber: number;
  text: string;
}

interface PdfTextItemLike {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

const DEFAULT_Y_TOLERANCE = 3;
const INTRA_WORD_GAP_FACTOR = 0.2;
const WORD_GAP_FACTOR = 0.45;
const COLUMN_GAP_PAGE_RATIO = 0.14;
const COLUMN_GAP_FONT_FACTOR = 10;
const MIN_COLUMN_SIDE_CHARS = 8;
const MIN_COLUMN_SIDE_SPANS = 2;

export function spansFromPdfTextItems(items: PdfTextItemLike[]): PdfTextSpan[] {
  return items
    .filter((item): item is PdfTextItemLike & { str: string; transform: number[] } => {
      return Boolean(item.str?.trim()) && Array.isArray(item.transform) && item.transform.length >= 6;
    })
    .map((item) => {
      const fontSize = Math.max(Math.abs(item.transform[0] ?? 0), Math.abs(item.transform[3] ?? 0), 1);
      const width =
        typeof item.width === 'number' && item.width > 0
          ? item.width
          : estimateSpanWidth(item.str.trim(), fontSize);
      return {
        text: item.str.trim(),
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width,
        fontSize,
      };
    });
}

function estimateSpanWidth(text: string, fontSize: number): number {
  return Math.max(text.length * fontSize * 0.45, fontSize * 0.5);
}

function joinSpans(spans: PdfTextSpan[]): string {
  if (spans.length === 0) {
    return '';
  }

  let result = spans[0]!.text;
  for (let index = 1; index < spans.length; index += 1) {
    const previous = spans[index - 1]!;
    const current = spans[index]!;
    const previousEnd = previous.x + previous.width;
    const gap = current.x - previousEnd;
    const fontSize = Math.max(previous.fontSize, current.fontSize, 1);
    const intraWordGap = fontSize * INTRA_WORD_GAP_FACTOR;
    const wordGap = fontSize * WORD_GAP_FACTOR;

    if (gap <= intraWordGap) {
      result += current.text;
    } else if (gap <= wordGap * 2.5) {
      result += ` ${current.text}`;
    } else {
      result += `  ${current.text}`;
    }
  }

  return result.replace(/\s{3,}/g, '  ').replace(/\s+/g, ' ').trim();
}

function splitLineByColumnGap(
  spans: PdfTextSpan[],
  pageWidth?: number,
): PdfTextSpan[][] {
  if (spans.length < MIN_COLUMN_SIDE_SPANS * 2) {
    return [spans];
  }

  const sorted = [...spans].sort((left, right) => left.x - right.x);
  let maxGap = 0;
  let splitIndex = -1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    const gap = current.x - (previous.x + previous.width);
    if (gap > maxGap) {
      maxGap = gap;
      splitIndex = index;
    }
  }

  if (splitIndex <= 0) {
    return [sorted];
  }

  const averageFont =
    sorted.reduce((sum, span) => sum + span.fontSize, 0) / Math.max(sorted.length, 1);
  const minColumnGap = Math.max(
    pageWidth ? pageWidth * COLUMN_GAP_PAGE_RATIO : 0,
    averageFont * COLUMN_GAP_FONT_FACTOR,
  );

  if (maxGap < minColumnGap) {
    return [sorted];
  }

  const left = sorted.slice(0, splitIndex);
  const right = sorted.slice(splitIndex);
  const leftChars = left.reduce((sum, span) => sum + span.text.length, 0);
  const rightChars = right.reduce((sum, span) => sum + span.text.length, 0);

  if (
    left.length < MIN_COLUMN_SIDE_SPANS ||
    right.length < MIN_COLUMN_SIDE_SPANS ||
    leftChars < MIN_COLUMN_SIDE_CHARS ||
    rightChars < MIN_COLUMN_SIDE_CHARS
  ) {
    return [sorted];
  }

  return [left, right];
}

export function reconstructPdfLines(
  items: PdfTextItemLike[],
  options: { yTolerance?: number; pageWidth?: number } = {},
): ReconstructedLine[] {
  const yTolerance = options.yTolerance ?? DEFAULT_Y_TOLERANCE;
  const spans = spansFromPdfTextItems(items);
  if (spans.length === 0) {
    return [];
  }

  const lineGroups: Array<{ y: number; spans: PdfTextSpan[] }> = [];

  for (const span of spans) {
    const existing = lineGroups.find((group) => Math.abs(group.y - span.y) <= yTolerance);
    if (existing) {
      existing.spans.push(span);
      existing.y = (existing.y + span.y) / 2;
    } else {
      lineGroups.push({ y: span.y, spans: [span] });
    }
  }

  lineGroups.sort((left, right) => right.y - left.y);

  const lines: ReconstructedLine[] = [];
  let lineNumber = 1;

  for (const group of lineGroups) {
    const columnGroups = splitLineByColumnGap(group.spans, options.pageWidth);
    for (const columnSpans of columnGroups) {
      const text = joinSpans(columnSpans.sort((left, right) => left.x - right.x));
      if (text.length > 0) {
        lines.push({ lineNumber, text });
        lineNumber += 1;
      }
    }
  }

  return lines;
}

export function pageTextFromLines(lines: ReconstructedLine[]): string {
  return lines.map((line) => line.text).join('\n');
}
