const RESTRICTED_PREFIXES = [
  'about:',
  'chrome://',
  'chrome-devtools://',
  'chrome-extension://',
  'chrome-search://',
  'devtools://',
  'edge://',
  'opera://',
  'view-source:',
];

const RESTRICTED_ORIGINS = ['https://chrome.google.com/webstore'];

export function isRestrictedPageUrl(url: string | undefined): boolean {
  if (!url) {
    return true;
  }

  if (RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return true;
  }

  return RESTRICTED_ORIGINS.some((origin) => url.startsWith(origin));
}

export function getRestrictedPageMessage(): string {
  return 'FieldPilot работает на обычных веб-страницах. Откройте сайт с формой и нажмите иконку снова.';
}
