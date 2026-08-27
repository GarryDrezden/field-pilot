import type { PageFieldSignature } from '../profile/profileTypes';

export type FillOperationStatus =
  | 'ready'
  | 'existing-value'
  | 'already-equal'
  | 'no-page-field'
  | 'ambiguous-page-field'
  | 'unsupported-field'
  | 'invalid-value'
  | 'disabled'
  | 'readonly'
  | 'select-option-not-found'
  | 'conflict';

export interface FillOperation {
  id: string;
  characteristicId: string;
  propertyId: string;
  pageFieldId?: string;
  fieldSignature?: PageFieldSignature;
  value: string;
  displayValue: string;
  currentValue?: string;
  status: FillOperationStatus;
  selected: boolean;
  allowOverwrite: boolean;
  reason?: string;
  fieldLabel?: string;
  propertyName?: string;
  propertyExternalId?: string;
  sourceLabel?: string;
  sourceValue?: string;
  sourceUnit?: string;
}

export interface FillPlanStats {
  totalMatches: number;
  ready: number;
  existingValue: number;
  alreadyEqual: number;
  noField: number;
  ambiguous: number;
  unsupported: number;
  conflicts: number;
  disabled: number;
  readonly: number;
  invalidValue: number;
  selectNotFound: number;
}

export interface FillPlan {
  operations: FillOperation[];
  stats: FillPlanStats;
}

export interface FillExecutionItemResult {
  operationId: string;
  status: 'filled' | 'skipped' | 'failed';
  message?: string;
}

export interface FillExecutionResult {
  filled: number;
  skipped: number;
  failed: number;
  results: FillExecutionItemResult[];
  undoBatch: FillUndoBatch | null;
}

export interface FillUndoEntry {
  fieldRuntimeId: string;
  fieldSignature?: PageFieldSignature;
  previousValue: string;
  writtenValue: string;
  writtenOptionValue?: string;
  elementType: 'input' | 'textarea' | 'select';
}

export interface FillUndoBatch {
  createdAt: string;
  entries: FillUndoEntry[];
}

export interface UndoResult {
  restored: number;
  skipped: number;
  messages: string[];
}
