// HTTP-level checks with the API request context: no browser rendering, read-only GETs.
import { test, expect } from '../../utils/fixtures.js';
import { CONTACT } from '../../utils/test-data.js';
import { getStatus, mapLimit } from '../../utils/helpers.js';

const SITEMAP_SAMPLE = 20;

test.describe('Public endpoints', () => {
  test('US-020: robots.txt and sitemap.xml are served and linked @P1', async ({ request }) => {
    const robots = await getStatus(request, '/robots.txt');
    expect(robots.status).toBe(200);
    expect(robots.headers['content-type']).toMatch(/text\/plain/);
    expect(await robots.body.text()).toMatch(/Sitemap:\s*https:\/\/techdome\.io\/sitemap\.xml/i);

    const sitemap = await getStatus(request, '/sitemap.xml');
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers['content-type']).toMatch(/xml/);
    expect(await sitemap.body.text()).toContain('<urlset');
  });

  test(`US-020: a spread sample of ${SITEMAP_SAMPLE} sitemap URLs all return 200 @P1`, async ({ request }, testInfo) => {
    test.setTimeout(240_000);
    const xml = await (await getStatus(request, '/sitemap.xml')).body.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    expect(urls.length).toBeGreaterThan(SITEMAP_SAMPLE);

    // Evenly spaced sample (deterministic, covers every section of the sitemap).
    const step = urls.length / SITEMAP_SAMPLE;
    const sample = Array.from({ length: SITEMAP_SAMPLE }, (_, i) => urls[Math.floor(i * step)]);

    const results = await mapLimit(sample, 2, async url => ({ url, ...(await getStatus(request, url, { maxRedirects: 0 })) }));
    await testInfo.attach('sitemap-sample.json', {
      body: JSON.stringify(results.map(({ url, status }) => ({ url, status })), null, 2), contentType: 'application/json',
    });
    for (const r of results) {
      // A sitemap should list canonical URLs only: redirects count as defects too.
      expect.soft(r.status, r.url).toBe(200);
    }
  });

  test('US-020: /go/whatsapp is a temporary redirect to wa.me @P1', async ({ request }) => {
    const { status, headers } = await getStatus(request, CONTACT.whatsappPath, { maxRedirects: 0 });
    expect(status).toBe(307);
    expect(headers.location).toMatch(CONTACT.whatsappLocation);
  });

  test('US-020: unknown pages return 404 @P1', async ({ request }) => {
    for (const path of ['/this-page-does-not-exist-qa', '/products/not-a-product', '/work/not-a-case-study']) {
      expect.soft((await getStatus(request, path)).status, path).toBe(404);
    }
  });

  test('US-020: write-only APIs reject GET with 4xx, never 5xx @P1', async ({ request }) => {
    // GET is read-only: it cannot create a lead or subscription, so this is safe on production.
    for (const path of ['/api/newsletter/subscribe', '/api/leads', '/api/contact-path']) {
      const { status } = await getStatus(request, path, { maxRedirects: 0 });
      expect.soft(status, `${path} should be 405/404, got ${status}`).toBeGreaterThanOrEqual(400);
      expect.soft(status, `${path} must not crash the server`).toBeLessThan(500);
    }
  });
});
