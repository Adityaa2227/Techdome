import { test, expect } from '../../utils/fixtures.js';
import { SITE } from '../../utils/test-data.js';
import { collectLinks, isInternal, stripHash, getStatus, mapLimit, htmlFacts } from '../../utils/helpers.js';

/**
 * Link checks run through the API request context (no rendering), 2 at a time.
 * That is fast, and gentle on a site that slowed down under parallel traffic during exploration.
 */
async function auditInternalLinks(request, urls) {
  const pages = [...new Set(urls.filter(isInternal).map(stripHash))];
  const results = await mapLimit(pages, 2, async url => {
    const { status, body, error } = await getStatus(request, url);
    const facts = status === 200 && !url.endsWith('.xml') ? htmlFacts(await body.text()) : null;
    return { url, status, error, title: facts?.title, h1Count: facts?.h1Count };
  });
  return results;
}

const MEGA_MENUS = ['Services', 'Portfolio', 'Insights', 'Company'];

/** Mega-menu links only exist in the DOM while their menu is hovered open. */
async function collectHeaderLinks(header) {
  const all = await collectLinks(header.root);
  for (const name of MEGA_MENUS) {
    await header.openMegaMenu(name);
    all.push(...await collectLinks(header.root));
  }
  return [...new Set(all)];
}

test.describe('Navigation', () => {
  test('US-002: every header / mega-menu link resolves to a real page @P0', async ({ homePage, request }, testInfo) => {
    test.setTimeout(300_000);
    await homePage.open();
    const links = await collectHeaderLinks(homePage.header);
    expect(links.length, 'mega-menus should expose their links when opened').toBeGreaterThan(20);

    const results = await auditInternalLinks(request, links);
    await testInfo.attach('header-link-audit.json', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });

    for (const r of results) {
      expect.soft(r.status, `${r.url} status`).toBe(200);
      if (r.status === 200) {
        expect.soft(r.title, `${r.url} has a Techdome title`).toMatch(/Techdome/);
        expect.soft(r.h1Count, `${r.url} has exactly one <h1>`).toBe(1);
      }
    }
  });

  test('US-002: in-page anchors in the header point at existing sections @P1', async ({ homePage, request }) => {
    await homePage.open();
    const anchored = (await collectHeaderLinks(homePage.header))
      .filter(u => isInternal(u) && u.includes('#'));
    expect(anchored.length).toBeGreaterThan(0);

    const byPage = new Map();
    for (const u of anchored) {
      const [base, hash] = u.split('#');
      byPage.set(base, [...(byPage.get(base) || []), hash]);
    }
    await mapLimit([...byPage], 2, async ([base, hashes]) => {
      const html = await (await getStatus(request, base)).body.text();
      const { hasId } = htmlFacts(html);
      for (const h of hashes) expect.soft(hasId(h), `${base}#${h} target id exists`).toBe(true);
    });
  });

  test('US-003: footer company & legal links resolve @P1', async ({ homePage, request }) => {
    await homePage.open();
    const legal = ['Privacy', 'Terms', 'Security', 'Client reviews', 'Cookie policy', 'Sitemap'];
    const hrefs = [];
    for (const name of legal) {
      const link = homePage.footer.link(name).first();
      await expect(link, `footer link "${name}"`).toBeAttached();
      hrefs.push(new URL(await link.getAttribute('href'), SITE.origin).href);
    }
    const results = await auditInternalLinks(request, hrefs);
    for (const r of results) expect.soft(r.status, `${r.url} status`).toBe(200);

    const sitemap = await getStatus(request, '/sitemap.xml');
    expect(sitemap.headers['content-type']).toMatch(/xml/);
  });

  test('US-003: footer is present on every page type @P1', async ({ anyPage }) => {
    for (const path of ['/', '/contact', '/work/telehealth-platform-glp1', '/products/sparrow']) {
      await anyPage.open(path);
      await expect.soft(anyPage.footer.link('Privacy'), `footer on ${path}`).toBeAttached();
    }
  });

  test('US-004: unknown URLs return a hard 404 status @P2', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-qa', { waitUntil: 'domcontentloaded' });
    expect(response.status(), 'should be a hard 404, not a soft-404 200').toBe(404);
    await expect(page).toHaveTitle(SITE.notFoundTitle);
  });

  test('US-004: 404 page lets the visitor get back to the site @P2', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'BUG-004: 404 is the bare Next.js default: no header, logo, links or search. See docs/bugs.md' });
    test.fail();
    await page.goto('/this-page-does-not-exist-qa', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('a[href="/"]').first(), 'a link back to the homepage').toBeVisible({ timeout: 5_000 });
  });
});
