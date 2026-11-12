import { test, expect, errorsOnly } from '../../utils/fixtures.js';
import { SITE } from '../../utils/test-data.js';
import { measureLCP } from '../../utils/helpers.js';

test.describe('Homepage', () => {
  test('US-001: homepage loads with correct title, meta description and hero @P0', async ({ homePage, page, consoleMessages }) => {
    const response = await homePage.open();

    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(SITE.home.title);
    expect(await homePage.metaContent('description')).toContain(SITE.home.descriptionIncludes);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/techdome\.io\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await expect(homePage.h1).toHaveCount(1);
    await expect(homePage.h1).toHaveText(SITE.home.h1);
    await expect(homePage.heroBookTeardown).toBeVisible();
    await expect(homePage.heroSeeWork).toBeVisible();

    expect(errorsOnly(consoleMessages), 'no uncaught JS errors / console errors on load').toEqual([]);
  });

  test('US-018: Largest Contentful Paint is recorded and within 2.5 s @P2', async ({ homePage, page }, testInfo) => {
    await homePage.open();
    const lcp = await measureLCP(page);

    testInfo.annotations.push({ type: 'LCP (ms)', description: String(lcp) });
    await testInfo.attach('lcp.json', { body: JSON.stringify({ url: page.url(), lcpMs: lcp }), contentType: 'application/json' });

    expect(lcp, 'LCP should be reported by the browser').not.toBeNull();
    // Soft: a slow LCP is a finding to report, not a reason to stop the run.
    expect.soft(lcp, 'Google "good" LCP threshold is 2500 ms').toBeLessThan(2500);
  });
});
