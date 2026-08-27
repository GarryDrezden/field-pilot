import { createRoot, type Root } from 'react-dom/client';
import type { ExtensionMessage } from '../shared/types/messages';
import { FIELD_PILOT_ROOT_ID } from '../shared/types/messages';
import { App } from '../ui/App';
import panelStyles from '../ui/styles/panel.css?inline';

let reactRoot: Root | null = null;
let hostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let isOpen = false;

function ensurePanelHost(): ShadowRoot {
  if (hostElement && shadowRoot) {
    return shadowRoot;
  }

  hostElement = document.createElement('div');
  hostElement.id = FIELD_PILOT_ROOT_ID;
  hostElement.setAttribute('data-fieldpilot', 'host');

  Object.assign(hostElement.style, {
    all: 'initial',
    position: 'fixed',
    top: '0',
    right: '0',
    width: '440px',
    height: '100vh',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transform: 'translateX(100%)',
  });

  document.documentElement.appendChild(hostElement);
  shadowRoot = hostElement.attachShadow({ mode: 'open' });

  const styleElement = document.createElement('style');
  styleElement.textContent = panelStyles;
  shadowRoot.appendChild(styleElement);

  const mountPoint = document.createElement('div');
  mountPoint.className = 'fp-root';
  shadowRoot.appendChild(mountPoint);

  reactRoot = createRoot(mountPoint);
  reactRoot.render(<App onClose={() => setPanelOpen(false)} />);

  return shadowRoot;
}

function setPanelOpen(open: boolean): void {
  isOpen = open;
  if (!hostElement) {
    return;
  }

  hostElement.style.pointerEvents = open ? 'auto' : 'none';
  hostElement.style.transform = open ? 'translateX(0)' : 'translateX(100%)';
  hostElement.style.transition = 'transform 0.24s ease';
}

function togglePanel(): void {
  ensurePanelHost();
  setPanelOpen(!isOpen);
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'TOGGLE_PANEL') {
    togglePanel();
  }
});

togglePanel();
