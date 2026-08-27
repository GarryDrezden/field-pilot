const FIELD_ID_PREFIX = 'fp-field-';

let fieldCounter = 0;

export function assignFieldId(element: Element): string {
  const existing = element.getAttribute('data-fieldpilot-id');
  if (existing) {
    return existing;
  }

  fieldCounter += 1;
  const id = `${FIELD_ID_PREFIX}${fieldCounter}`;
  element.setAttribute('data-fieldpilot-id', id);
  return id;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}…`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAcceptedDocumentTypes(): Record<string, 'pdf' | 'docx'> {
  return {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
}

export function detectDocumentFormat(file: File): 'pdf' | 'docx' | null {
  const accepted = getAcceptedDocumentTypes();
  const byMime = accepted[file.type];
  if (byMime) {
    return byMime;
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (lowerName.endsWith('.docx')) {
    return 'docx';
  }

  return null;
}
