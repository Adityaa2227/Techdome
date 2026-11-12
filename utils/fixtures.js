// Custom Playwright fixtures. Import `test`/`expect` from here instead of '@playwright/test'.
import { test as base, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { ContactPage } from './pages/ContactPage.js';
import { BasePage } from './pages/BasePage.js';

/**
 * Options (override per file with `test.use({ ... })`):
 *  - consent:    'reject' (default) | 'accept' | 'none'
 *                Pre-seeds the site's own localStorage key `td_consent`, so the cookie
 *                dialog never covers content. Use 'none' to test the dialog itself.
 *  - mockWrites: true (default) intercepts every non-GET request and answers it locally,
 *                so tests NEVER create real leads/subscriptions on techdome.io.
 *                Tests can register their own page.route() to override the response.
 *  - suppressPopups: true (default) snoozes the timed newsletter modal (`td_nl_popup_until`).
 */
export const test = base.extend({
  consent: ['reject', { option: true }],
  mockWrites: [true, { option: true }],
  suppressPopups: [true, { option: true }],

  /** Every intercepted non-GET request: { method, url, headers, body, json }. */
  capturedRequests: async ({}, use) => { await use([]); },

  /** Console errors/warnings + uncaught page errors, attached to the report after each test. */
  consoleMessages: async ({}, use) => { await use([]); },

  _siteSetup: [async ({ context, consent, mockWrites, suppressPopups, capturedRequests, consoleMessages }, use, testInfo) => {
    if (suppressPopups) {
      // The newsletter modal (fixed overlay, z-80) appears after a few seconds and blocks clicks.
      // The site itself snoozes it via this key for 14 days after dismissal; we pre-set it.
      // Guarded: init scripts also run on about:blank, where localStorage access throws and
      // would show up as a fake "page error" (it did, in the first E2E run).
      await context.addInitScript(() => {
        if (!location.hostname.endsWith('techdome.io')) return;
        localStorage.setItem('td_nl_popup_until', String(Date.now() + 14 * 24 * 3600 * 1000));
      });
    }
    if (consent !== 'none') {
      const granted = consent === 'accept';
      await context.addInitScript(granted => {
        if (!location.hostname.endsWith('techdome.io')) return;
        const v = granted ? 'granted' : 'denied';
        localStorage.setItem('td_consent', JSON.stringify({
          state: { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v },
          choice: { analytics: granted, marketing: granted }, v: 1, ts: Date.now(),
        }));
      }, granted);
    }

    if (mockWrites) {
      await context.route('**/*', async route => {
        const req = route.request();
        if (req.method() === 'GET' || req.method() === 'HEAD' || req.method() === 'OPTIONS') return route.fallback();
        let json = null;
        try { json = req.postDataJSON(); } catch { /* not JSON */ }
        capturedRequests.push({ method: req.method(), url: req.url(), headers: req.headers(), body: req.postData(), json });
        const ours = new URL(req.url()).hostname.endsWith('techdome.io');
        return ours
          ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
          : route.fulfill({ status: 204 });
      });
    }

    context.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push({ type: msg.type(), text: msg.text(), url: msg.page()?.url() });
      }
    });
    context.on('weberror', err => consoleMessages.push({ type: 'pageerror', text: err.error().message, url: err.page()?.url() }));

    await use();

    if (consoleMessages.length) {
      await testInfo.attach('console-messages.json', {
        body: JSON.stringify(consoleMessages, null, 2), contentType: 'application/json',
      });
    }
    if (capturedRequests.length) {
      await testInfo.attach('intercepted-requests.json', {
        body: JSON.stringify(capturedRequests.map(({ headers, ...r }) => r), null, 2), contentType: 'application/json',
      });
    }
  }, { auto: true }],

  homePage: async ({ page }, use) => { await use(new HomePage(page)); },
  contactPage: async ({ page }, use) => { await use(new ContactPage(page)); },
  /** Generic page object for any other URL: `await anyPage.open('/pricing')`. */
  anyPage: async ({ page }, use) => { await use(new BasePage(page)); },
});

export { expect };

/** Console entries that are real errors (warnings excluded). */
export const errorsOnly = msgs => msgs.filter(m => m.type === 'error' || m.type === 'pageerror');
