import { test, expect } from '../../utils/fixtures.js';
import { SITE, PRODUCT_PAGES } from '../../utils/test-data.js';
import { getStatus, htmlFacts, mapLimit } from '../../utils/helpers.js';

test.describe('Primary CTAs', () => {
  const cases = [
    { name: 'header "Contact Us"', locate: hp => hp.header.contactUs, path: '/contact', h1: SITE.contact.h1 },
    { name: 'hero "Book a product teardown"', locate: hp => hp.heroBookTeardown, path: '/contact', h1: SITE.contact.h1 },
    { name: 'hero "See what we\'ve built"', locate: hp => hp.heroSeeWork, path: '/work', h1: SITE.work.h1 },
    { name: '"Pitch Techdome Ventures"', locate: hp => hp.pitchVentures, path: '/ventures', h1: SITE.ventures.h1 },
  ];

  for (const c of cases) {
    test(`US-011: ${c.name} routes to ${c.path} @P0`, async ({ homePage, page }) => {
      await homePage.open();
      await c.locate(homePage).click();
      await expect(page).toHaveURL(new RegExp(`${c.path}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.h1);
    });
  }

  test('US-011: every "Apply" CTA on /ventures leads to a working application page @P1', async ({ anyPage, request }) => {
    await anyPage.open('/ventures');
    const apply = anyPage.main.locator('a[href$="/ventures/apply"]');
    expect(await apply.count()).toBeGreaterThan(0);
    const { status } = await getStatus(request, '/ventures/apply');
    expect(status).toBe(200);
  });
});

test.describe('Product pages', () => {
  test('US-014: all product pages load and link out to the live products @P2', async ({ request }) => {
    test.setTimeout(180_000);
    const rows = await mapLimit(Object.entries(PRODUCT_PAGES), 2, async ([path, externalHost]) => {
      const { status, body } = await getStatus(request, path);
      const html = status === 200 ? await body.text() : '';
      return { path, externalHost, status, title: htmlFacts(html).title, linksOut: externalHost ? html.includes(`https://${externalHost}`) : null };
    });

    for (const r of rows) {
      expect.soft(r.status, `${r.path} status`).toBe(200);
      expect.soft(r.title, `${r.path} has its own title`).not.toBe(SITE.home.title);
      expect.soft(r.title, `${r.path} title`).toMatch(/\| Techdome$/);
      if (r.externalHost) expect.soft(r.linksOut, `${r.path} links to ${r.externalHost}`).toBe(true);
    }
  });
});
