import { describe, expect, it } from 'vitest';
import { isRestrictedPageUrl } from './pageAccess';

describe('isRestrictedPageUrl', () => {
  it('blocks internal browser pages', () => {
    expect(isRestrictedPageUrl('chrome://extensions/')).toBe(true);
    expect(isRestrictedPageUrl('chrome://settings/')).toBe(true);
  });

  it('allows regular https pages', () => {
    expect(isRestrictedPageUrl('https://example.com/form')).toBe(false);
    expect(isRestrictedPageUrl('https://www.privarka-k97.ru/bitrix/admin/iblock_element_edit.php')).toBe(
      false,
    );
  });

  it('blocks Chrome Web Store', () => {
    expect(isRestrictedPageUrl('https://chrome.google.com/webstore/detail/test')).toBe(true);
  });
});
