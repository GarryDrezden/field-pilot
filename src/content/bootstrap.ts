const CONTENT_MODULE_URL = chrome.runtime.getURL('content.js');
const LOADED_KEY = '__fieldPilotModuleLoaded';

type FieldPilotWindow = typeof globalThis & {
  [LOADED_KEY]?: Promise<void>;
};

async function loadContentModule(): Promise<void> {
  const scope = globalThis as FieldPilotWindow;

  if (!scope[LOADED_KEY]) {
    scope[LOADED_KEY] = import(CONTENT_MODULE_URL).then(() => undefined);
  }

  await scope[LOADED_KEY];
}

void loadContentModule();
