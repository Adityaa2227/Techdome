// HTTP security header audit (read-only GETs through the API request context).
import { test, expect } from '../../utils/fixtures.js';
import { getStatus } from '../../utils/helpers.js';

const PAGES = ['/', '/contact', '/products/sparrow', '/work/telehealth-platform-glp1', '/pricing'];

test.describe('Security headers', () => {
  for (const path of PAGES) {
    test(`US-024: ${path} sends HSTS, X-Frame-Options, nosniff, Referrer- and Permissions-Policy @P0`, async ({ request }) => {
      const { status, headers } = await getStatus(request, path);
      expect(status).toBe(200);

      const hsts = headers['strict-transport-security'] ?? '';
      expect(hsts, 'HSTS present').not.toBe('');
      expect(Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0), 'HSTS max-age >= 1 year').toBeGreaterThanOrEqual(31_536_000);
      expect.soft(hsts, 'HSTS covers subdomains').toMatch(/includeSubDomains/i);

      expect(headers['x-frame-options'] ?? '', 'clickjacking protection').toMatch(/^(DENY|SAMEORIGIN)$/i);
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect.soft(headers['referrer-policy'], 'Referrer-Policy').toBeTruthy();
      expect.soft(headers['permissions-policy'], 'Permissions-Policy').toBeTruthy();
      expect.soft(headers['x-powered-by'], 'framework fingerprint header should not be sent').toBeUndefined();
    });
  }

  test('US-024: Content-Security-Policy is present on every page @P0', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'bug', description: 'BUG-001: no Content-Security-Policy header (nor <meta http-equiv>) on any page. See docs/bugs.md' });
    test.fail();

    const missing = [];
    for (const path of PAGES) {
      const { headers, body } = await getStatus(request, path);
      const viaHeader = headers['content-security-policy'] || headers['content-security-policy-report-only'];
      const viaMeta = /<meta[^>]+http-equiv=["']Content-Security-Policy["']/i.test(await body.text());
      if (!viaHeader && !viaMeta) missing.push(path);
    }
    expect(missing, 'pages without any CSP').toEqual([]);
  });

  test('US-024: plain HTTP is permanently redirected to HTTPS @P0', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    try {
      const res = await ctx.get('http://techdome.io/contact', { maxRedirects: 0, timeout: 30_000 });
      expect([301, 308]).toContain(res.status());
      expect(res.headers().location).toMatch(/^https:\/\/techdome\.io\/contact/);
    } finally {
      await ctx.dispose();
    }
  });
});
