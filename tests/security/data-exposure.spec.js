// Scans public HTML, JS bundles and API error bodies for leaked secrets or unexpected personal data.
import { test, expect } from '../../utils/fixtures.js';
import { EMAIL_ALLOWLIST, KEY_PAGES } from '../../utils/test-data.js';
import { getStatus, mapLimit, scanForSensitiveData } from '../../utils/helpers.js';

const PAGES = [...KEY_PAGES, '/privacy', '/security', '/careers', '/contact?for=client'];

/** Same-origin JS chunk URLs referenced by a page. */
const chunkUrls = html => [...new Set(html.match(/\/_next\/static\/chunks\/[^"'\s]+\.js/g) || [])]
  .map(p => new URL(p, 'https://techdome.io').href);

test.describe('Sensitive data exposure', () => {
  test('US-026: page HTML contains no secrets and only intentionally published emails @P1', async ({ request }, testInfo) => {
    test.setTimeout(240_000);
    const findings = await mapLimit(PAGES, 2, async path => {
      const { status, body } = await getStatus(request, path);
      return { path, status, ...scanForSensitiveData(status === 200 ? await body.text() : '', EMAIL_ALLOWLIST) };
    });
    await testInfo.attach('html-scan.json', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' });

    for (const f of findings) {
      expect.soft(f.secrets, `${f.path}: secrets`).toEqual([]);
      expect.soft(f.emails, `${f.path}: unexpected emails`).toEqual([]);
    }
  });

  test('US-026: JavaScript bundles contain no secrets @P1', async ({ request }, testInfo) => {
    test.setTimeout(300_000);
    const pages = ['/', '/contact', '/products/geolytics', '/tools/mvp-cost'];
    const chunks = new Set();
    for (const p of pages) chunkUrls(await (await getStatus(request, p)).body.text()).forEach(c => chunks.add(c));
    expect(chunks.size).toBeGreaterThan(10);

    const findings = (await mapLimit([...chunks], 3, async url => {
      const { status, body } = await getStatus(request, url);
      return { url, ...scanForSensitiveData(status === 200 ? await body.text() : '', EMAIL_ALLOWLIST) };
    })).filter(f => f.secrets.length || f.emails.length);
    await testInfo.attach('bundle-scan.json', { body: JSON.stringify({ scanned: chunks.size, findings }, null, 2), contentType: 'application/json' });

    expect(findings.flatMap(f => f.secrets.map(s => `${f.url}: ${s.type}`)), 'secrets in JS bundles').toEqual([]);
  });

  test('US-026: production source maps are not publicly served @P1', async ({ request }) => {
    const chunks = chunkUrls(await (await getStatus(request, '/')).body.text()).slice(0, 8);
    expect(chunks.length).toBeGreaterThan(0);
    for (const url of chunks) {
      const { status } = await getStatus(request, `${url}.map`);
      expect.soft(status, `${url}.map`).not.toBe(200);
    }
  });

  test('US-026: API errors do not leak stack traces or internals @P1', async ({ request }) => {
    for (const path of ['/api/leads', '/api/contact-path', '/api/newsletter/subscribe', '/api/does-not-exist']) {
      const { body } = await getStatus(request, path, { maxRedirects: 0 });
      const text = await body.text();
      expect.soft(text, `${path} body`).not.toMatch(/at \w+ \(|node_modules|\/app\/|stack|Error: .*\n\s+at /i);
    }
  });
});
