// Smaller hardening checks: bot honeypots, reverse tabnabbing, mixed content, cookie flags.
import { test, expect } from '../../utils/fixtures.js';

test.describe('Form hardening', () => {
  test('US-027: booking and client forms carry an invisible, non-focusable honeypot @P2', async ({ contactPage, page }) => {
    for (const open of [() => contactPage.openBooking(), () => contactPage.openClient()]) {
      await open();
      const hp = contactPage.main.locator('input[name="website"]').first();
      await expect(hp).toBeAttached();
      await expect(hp).toHaveAttribute('tabindex', '-1');
      await expect(hp).toHaveAttribute('autocomplete', 'off');
      const box = await hp.boundingBox();
      const offscreen = !box || box.x + box.width <= 0 || box.width === 0 || box.height === 0;
      expect(offscreen, `honeypot on ${page.url()} must not be visible`).toBe(true);
      expect(await hp.evaluate(el => !!el.closest('[aria-hidden="true"]')), 'hidden from screen readers').toBe(true);
    }
  });

  test('US-027: keyboard users never land in the honeypot @P2', async ({ contactPage, page }) => {
    await contactPage.openBooking();
    await contactPage.firstName.focus();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.getAttribute('name'))).not.toBe('website');
    }
  });
});

test.describe('Link & resource hardening', () => {
  for (const path of ['/', '/about', '/products/sparrow', '/products/justinterview-ai', '/contact']) {
    test(`US-028: new-tab links on ${path} use rel="noopener" @P2`, async ({ anyPage, page }) => {
      await anyPage.open(path);
      const unsafe = await page.$$eval('a[target="_blank"]', as => as
        .filter(a => !/noopener|noreferrer/i.test(a.rel))
        .map(a => a.href));
      // Modern browsers imply noopener for target=_blank, but older/embedded browsers do not.
      expect.soft(unsafe, `links missing rel=noopener on ${path}`).toEqual([]);
    });
  }

  test('US-028: pages load no mixed (http://) content @P2', async ({ anyPage, page }) => {
    const insecure = [];
    page.on('request', r => { if (r.url().startsWith('http://')) insecure.push(r.url()); });
    for (const path of ['/', '/contact', '/work']) await anyPage.open(path);
    expect(insecure).toEqual([]);
  });

  test.describe('cookies after consent', () => {
    // A pre-seeded "accept" in localStorage does NOT start the tags (first version of this
    // test therefore checked zero cookies and passed vacuously). Click the real button instead.
    test.use({ consent: 'none' });

    test('US-028: cookies set on techdome.io after consent carry the Secure flag @P2', async ({ homePage, page, context }, testInfo) => {
      testInfo.annotations.push({
        type: 'bug',
        description: 'BUG-005: analytics cookies (_ga, _ga_*, _gcl_au, _fbp, _clck) are set without Secure. See docs/bugs.md',
      });
      test.fail();

      await homePage.open();
      await page.getByRole('dialog', { name: 'Cookie preferences' }).getByRole('button', { name: 'Accept all' }).click();
      // Wait for the GA cookie specifically, so the test always has the same thing to check.
      await expect.poll(async () => (await context.cookies('https://techdome.io')).some(c => c.name === '_ga'),
        { message: '_ga cookie should be set after Accept all', timeout: 30_000 }).toBe(true);

      const cookies = (await context.cookies('https://techdome.io')).filter(c => c.domain.includes('techdome.io'));
      await testInfo.attach('cookies.json', {
        body: JSON.stringify(cookies.map(({ name, domain, secure, httpOnly, sameSite }) => ({ name, domain, secure, httpOnly, sameSite })), null, 2),
        contentType: 'application/json',
      });
      const insecure = cookies.filter(c => !c.secure).map(c => c.name);
      expect(insecure, 'cookies without Secure flag').toEqual([]);
    });
  });
});
