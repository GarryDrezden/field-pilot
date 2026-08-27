import type { ExtensionMessage } from '../shared/types/messages';

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  const tabId = tab.id;

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_PANEL' } satisfies ExtensionMessage);
    return;
  } catch {
    // Content script is not injected yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
  } catch (error) {
    console.error('[FieldPilot] Failed to inject content script:', error);
  }
});
