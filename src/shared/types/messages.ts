export type MessageType =
  | 'TOGGLE_PANEL'
  | 'PANEL_READY'
  | 'CLOSE_PANEL';

export interface ExtensionMessage {
  type: MessageType;
}

export const FIELD_PILOT_ROOT_ID = 'fieldpilot-root-host';
export const FIELD_PILOT_FIELD_ATTR = 'data-fieldpilot-id';
