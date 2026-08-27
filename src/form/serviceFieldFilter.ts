const SERVICE_NAME_PATTERN =
  /(?:^|_)(?:csrf|token|sessid|session|nonce|captcha|recaptcha|antispam|search|q|query|filter|sort|page|limit|offset|utm_|_token)(?:_|$)/i;

const SERVICE_LABEL_PATTERN =
  /^(?:поиск|search|filter|sort|csrf|token|submit|cancel|найти|фильтр)$/i;

export function isLikelyServiceField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  label: string,
): boolean {
  const name = element.getAttribute('name') ?? '';
  const htmlId = element.getAttribute('id') ?? '';
  const type = element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase();

  if (type === 'search') {
    return true;
  }

  if (element.getAttribute('role') === 'searchbox') {
    return true;
  }

  if (SERVICE_NAME_PATTERN.test(name) || SERVICE_NAME_PATTERN.test(htmlId)) {
    return true;
  }

  if (SERVICE_LABEL_PATTERN.test(label.trim())) {
    return true;
  }

  const autocomplete = element.getAttribute('autocomplete') ?? '';
  if (autocomplete === 'off' && /search|filter/i.test(name)) {
    return true;
  }

  return false;
}
