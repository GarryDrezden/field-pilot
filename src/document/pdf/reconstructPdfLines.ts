export interface PdfTextSpan {
  text: string;
  x: number;
  y: number;
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

export function spansFromPdfTextItems(items: PdfTextItemLike[]): PdfTextSpan[] {
  return items
    .filter((item): item is PdfTextItemLike & { str: string; transform: number[] } => {
      return Boolean(item.str?.trim()) && Array.isArray(item.transform) && item.transform.length >= 6;
    })
    .map((item) => ({
      text: item.str.trim(),
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
    }));
}

export function reconstructPdfLines(
  items: PdfTextItemLike[],
  yTolerance = DEFAULT_Y_TOLERANCE,
): ReconstructedLine[] {
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

  return lineGroups
    .map((group, index) => ({
      lineNumber: index + 1,
      text: group.spans
        .sort((left, right) => left.x - right.x)
        .map((span) => span.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((line) => line.text.length > 0);
}

export function pageTextFromLines(lines: ReconstructedLine[]): string {
  return lines.map((line) => line.text).join('\n');
}
