export interface DiagnosticsInput {
  version: string;
  documentStatus: string;
  profileName: string | null;
  profilePropertiesCount: number;
  characteristicsCount: number;
  matchingHigh: number;
  matchingReview: number;
  matchingReject: number;
  pageFieldsCount: number;
  pageScanGeneration: number;
  pageStale: boolean;
  ocrActive: boolean;
  fillPlanReady: number;
  sessionAvailable: boolean;
  errorMessage?: string | null;
}

export function buildDiagnosticsReport(input: DiagnosticsInput): string {
  const lines = [
    `FieldPilot ${input.version}`,
    `Document: ${input.documentStatus}`,
    `Profile: ${input.profileName ?? '—'} (${input.profilePropertiesCount} properties)`,
    `Characteristics: ${input.characteristicsCount}`,
    `Matching: HIGH=${input.matchingHigh} REVIEW=${input.matchingReview} REJECT=${input.matchingReject}`,
    `Page fields: ${input.pageFieldsCount} (scan gen ${input.pageScanGeneration}${input.pageStale ? ', stale' : ''})`,
    `Fill ready: ${input.fillPlanReady}`,
    `OCR active: ${input.ocrActive ? 'yes' : 'no'}`,
    `Session storage: ${input.sessionAvailable ? 'available' : 'unavailable'}`,
  ];

  if (input.errorMessage) {
    lines.push(`Last error: ${input.errorMessage}`);
  }

  return lines.join('\n');
}
