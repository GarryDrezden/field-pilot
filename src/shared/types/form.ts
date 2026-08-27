export type FormElementType = 'input' | 'textarea' | 'select';

export type LabelSource =
  | 'label-for'
  | 'label-wrap'
  | 'aria-label'
  | 'aria-labelledby'
  | 'container'
  | 'table-cell'
  | 'placeholder'
  | 'name'
  | 'id';

export interface FormField {
  id: string;
  elementType: FormElementType;
  inputType?: string;
  label: string;
  labelSource?: LabelSource;
  name?: string;
  htmlId?: string;
  placeholder?: string;
  currentValue?: string;
  disabled: boolean;
  readonly: boolean;
  visible?: boolean;
  ambiguousLabel?: boolean;
  isCustomControl?: boolean;
}

export interface FormScanResult {
  scannedAt: string;
  fields: FormField[];
  pageUrl: string;
  pageTitle: string;
  scanGeneration: number;
}
