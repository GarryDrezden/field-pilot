export type FormElementType = 'input' | 'textarea' | 'select';

export interface FormField {
  id: string;
  elementType: FormElementType;
  inputType?: string;
  label: string;
  name?: string;
  htmlId?: string;
  placeholder?: string;
  currentValue?: string;
  disabled: boolean;
  readonly: boolean;
}

export interface FormScanResult {
  scannedAt: string;
  fields: FormField[];
  pageUrl: string;
  pageTitle: string;
}
