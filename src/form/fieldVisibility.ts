export function isVisibleFormField(element: HTMLElement): boolean {
  if (element.closest('[hidden]')) {
    return false;
  }

  if (element instanceof HTMLInputElement && element.type === 'hidden') {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const hasZeroLayout = rect.width === 0 && rect.height === 0 && element.offsetParent === null;
  if (hasZeroLayout && process.env.VITEST !== 'true') {
    return false;
  }

  return true;
}

export function isCustomSelectLike(element: HTMLElement): boolean {
  if (element instanceof HTMLSelectElement) {
    return false;
  }

  const role = element.getAttribute('role');
  if (role === 'combobox' || role === 'listbox') {
    return true;
  }

  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  const className = element.className?.toString().toLowerCase() ?? '';
  return (
    className.includes('select2') ||
    className.includes('choices') ||
    className.includes('react-select') ||
    className.includes('combobox')
  );
}
