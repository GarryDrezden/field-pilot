import type { ExtensionMessage } from '../shared/types/messages';
import { getRestrictedPageMessage, isRestrictedPageUrl } from '../shared/utils/pageAccess';

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  if (isRestrictedPageUrl(tab.url)) {
    console.info(`[FieldPilot] ${getRestrictedPageMessage()}`);
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
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[FieldPilot] Failed to inject content script:', message);
  }
});
