// Third-party scripts and consent. "Third party" = any host that is not techdome.io.
import { test, expect } from '../../utils/fixtures.js';
import { isInternal } from '../../utils/helpers.js';

const TRACKING = /google-analytics|googletagmanager|doubleclick|googleadservices|facebook\.net|connect\.facebook|clarity\.ms|hotjar|linkedin\.com\/px|snap\.licdn|posthog|segment/i;

/** Record every third-party request the page makes. */
function recordThirdParty(page) {
  const hosts = new Set();
  const tracking = [];
  page.on('request', req => {
    const url = req.url();
    if (!url.startsWith('http') || isInternal(url)) return;
    hosts.add(new URL(url).hostname);
    if (TRACKING.test(url)) tracking.push(url.slice(0, 120));
  });
  return { hosts, tracking };
}

test.describe('Third-party scripts', () => {
  test('US-021: no render-blocking third-party scripts in <head> @P1', async ({ homePage, page }, testInfo) => {
    await homePage.open();
    const scripts = await page.$$eval('head script[src]', els => els.map(s => ({
      src: s.src, async: s.async, defer: s.defer, module: s.type === 'module',
    })));
    const blocking = scripts.filter(s => !s.src.includes('techdome.io') && !s.async && !s.defer && !s.module);
    await testInfo.attach('head-scripts.json', { body: JSON.stringify(scripts, null, 2), contentType: 'application/json' });
    expect(blocking, 'third-party scripts in <head> must be async/defer').toEqual([]);
  });

  test('US-021: page still renders and works with every third-party host blocked @P1', async ({ homePage, page }) => {
    await page.route(url => !isInternal(url.href), r => r.abort());
    await homePage.open();
    await expect(homePage.h1).toBeVisible();
    await expect(homePage.heroBookTeardown).toBeVisible();
    await homePage.heroBookTeardown.click();
    await expect(page).toHaveURL(/\/contact$/);
  });
});

test.describe('Cookie consent', () => {
  test.describe('first visit (no stored choice)', () => {
    test.use({ consent: 'none' });

    test('US-022: no tracking loads before the visitor chooses @P1', async ({ homePage, page }, testInfo) => {
      const seen = recordThirdParty(page);
      await homePage.open();
      await expect(page.getByRole('dialog', { name: 'Cookie preferences' })).toBeVisible();
      await page.waitForTimeout(3_000); // give delayed tags a chance to fire
      await testInfo.attach('third-party-before-consent.json', { body: JSON.stringify([...seen.hosts]), contentType: 'application/json' });
      expect(seen.tracking, 'tracking requests before consent').toEqual([]);
    });

    test('US-022: "Reject all" keeps tracking off and is remembered @P1', async ({ homePage, page }) => {
      const seen = recordThirdParty(page);
      await homePage.open();
      const dialog = page.getByRole('dialog', { name: 'Cookie preferences' });
      await dialog.getByRole('button', { name: 'Reject all' }).click();
      await expect(dialog).toBeHidden();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(homePage.h1).toBeVisible();
      await page.waitForTimeout(3_000);
      await expect(dialog, 'choice is remembered after reload').toBeHidden();
      expect(seen.tracking, 'tracking requests after rejecting').toEqual([]);

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('td_consent') || '{}'));
      expect(stored.choice).toEqual({ analytics: false, marketing: false });
    });

    test('US-022: "Accept all" loads analytics asynchronously (recorded) @P2', async ({ homePage, page }, testInfo) => {
      const seen = recordThirdParty(page);
      await homePage.open();
      await page.getByRole('dialog', { name: 'Cookie preferences' }).getByRole('button', { name: 'Accept all' }).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(homePage.h1).toBeVisible();
      await page.waitForTimeout(4_000);

      const hosts = [...seen.hosts].sort();
      testInfo.annotations.push({ type: 'third-party hosts after consent', description: hosts.join(', ') || '(none)' });
      await testInfo.attach('third-party-after-consent.json', { body: JSON.stringify({ hosts, tracking: seen.tracking }, null, 2), contentType: 'application/json' });

      // Every tracking vendor that actually loaded must be named in the cookie policy.
      const VENDORS = [
        { host: /googletagmanager|google-analytics|analytics\.google/, disclosed: /Google Analytics/i },
        { host: /doubleclick|googleadservices|google\.(com|co\.\w+)\/(rmkt|pagead|ccm)/, disclosed: /Google Ads|DoubleClick/i },
        { host: /facebook\.(net|com)/, disclosed: /Meta|Facebook/i },
        { host: /clarity\.ms/, disclosed: /Clarity/i },
        { host: /bing\.com/, disclosed: /Microsoft|Bing/i },
        { host: /openai\.com/, disclosed: /OpenAI|ChatGPT/i },
        // Disclosed only generically ("our customer-records service"): BUG-008 in docs/bugs.md.
        { host: /leadconnectorhq|msgsndr/, disclosed: /LeadConnector|HighLevel|customer-records service/i },
      ];
      const policy = await (await page.request.get('/cookie-policy')).text();
      for (const v of VENDORS.filter(v => hosts.some(h => v.host.test(h)) || seen.tracking.some(u => v.host.test(u)))) {
        expect.soft(policy, `cookie policy discloses ${v.disclosed}`).toMatch(v.disclosed);
      }

      // Whatever loads must not have been injected as a blocking script.
      const blocking = await page.$$eval('script[src]', els => els
        .filter(s => !s.src.includes('techdome.io') && !s.async && !s.defer && s.type !== 'module')
        .map(s => s.src));
      expect(blocking).toEqual([]);
    });
  });
});
