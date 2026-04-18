import { describe, it, expect } from 'vitest';
import { isRestrictedUrl } from '../state-machine';

// ---------------------------------------------------------------------------
// §5.1.6 — Restricted-page URL pattern detector
// ---------------------------------------------------------------------------

describe('isRestrictedUrl', () => {
  const restrictedUrls = [
    ['chrome://settings', 'chrome://'],
    ['chrome://extensions', 'chrome://'],
    ['chrome://newtab', 'chrome://'],
    ['chrome-extension://abcdef123456/popup.html', 'chrome-extension://'],
    ['edge://settings', 'edge://'],
    ['edge://extensions', 'edge://'],
    ['about:blank', 'about:'],
    ['about:debugging', 'about:'],
    ['view-source:https://example.com', 'view-source:'],
    ['https://chrome.google.com/webstore/detail/abc', 'Chrome Web Store'],
    ['https://chrome.google.com/webstore/category/extensions', 'Chrome Web Store'],
  ] as const;

  for (const [url, prefix] of restrictedUrls) {
    it(`returns true for ${prefix} URL: ${url}`, () => {
      expect(isRestrictedUrl(url)).toBe(true);
    });
  }

  const normalUrls = [
    'https://example.com',
    'https://www.google.com/search?q=numpy',
    'http://localhost:3000',
    'https://github.com/numpy/numpy',
    'https://chrome.google.com/', // Not webstore path
    'https://docs.python.org',
  ];

  for (const url of normalUrls) {
    it(`returns false for normal URL: ${url}`, () => {
      expect(isRestrictedUrl(url)).toBe(false);
    });
  }
});
