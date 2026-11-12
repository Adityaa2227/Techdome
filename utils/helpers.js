// Stateless helpers shared by all suites.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, BOT_BLOCKING_HOSTS } from './test-data.js';

// ---------- links ----------

/**
 * Unique absolute hrefs inside a scope (a Locator such as header/footer, or a Page).
 * Skips mailto:, tel:, javascript: and same-page '#' anchors.
 */
export async function collectLinks(scope) {
  const hrefs = await scope.locator('a[href]').evaluateAll(as => as.map(a => a.href));
  return [...new Set(hrefs)].filter(h => /^https?:/.test(h));
}

export const isInternal = url => new URL(url).hostname.endsWith('techdome.io');
export const isBotBlocking = url => BOT_BLOCKING_HOSTS.some(h => new URL(url).hostname.endsWith(h));

/** URL without its hash. Lets us request each page once even when many anchors point into it. */
export const stripHash = url => url.split('#')[0];

/**
 * HTTP status of a URL via the APIRequestContext (no browser render, fast).
 * One retry on network error, because a live site can drop a connection now and then.
 */
export async function getStatus(request, url, { maxRedirects = 5 } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await request.get(url, { maxRedirects, timeout: 20_000 });
      return { status: res.status(), headers: res.headers(), body: res };
    } catch (e) {
      if (attempt === 1) return { status: 0, error: e.message };
    }
  }
}

/**
 * Run `fn` over items with at most `limit` in flight. Keep limit at 2–3 for link checks:
 * these are functional checks, not load, and the site is fragile under parallel traffic.
 */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Extract basic facts from raw HTML without rendering it. */
export function htmlFacts(html) {
  return {
    title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '',
    h1Count: (html.match(/<h1[\s>]/gi) || []).length,
    hasId: id => new RegExp(`id=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(html),
  };
}

// ---------- layout ----------

/** True if the document scrolls horizontally (classic mobile layout break). */
export async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

/** Visible elements whose right edge passes the viewport. Used as evidence when overflow is found. */
export async function overflowingElements(page, limit = 10) {
  return page.evaluate(limit => [...document.querySelectorAll('body *')]
    .filter(e => e.checkVisibility() && e.getBoundingClientRect().right > window.innerWidth + 1)
    .slice(0, limit)
    .map(e => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)}`), limit);
}

// ---------- performance ----------

/** Largest Contentful Paint in ms (null if the browser reported none within the timeout). */
export async function measureLCP(page, timeoutMs = 5000) {
  return page.evaluate(timeoutMs => new Promise(resolve => {
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      resolve(Math.round(entries[entries.length - 1].startTime));
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => resolve(null), timeoutMs);
  }), timeoutMs);
}

/** Nearest-rank percentile. percentile([..], 95) → p95. */
export function percentile(values, p) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(rank, 0), sorted.length - 1)];
}

export function summarize(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: Math.min(...values),
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    max: Math.max(...values),
    avg: Math.round(sum / values.length),
  };
}

// ---------- security ----------

export const SECRET_PATTERNS = {
  'AWS access key': /\bAKIA[0-9A-Z]{16}\b/,
  'Google API key': /\bAIza[0-9A-Za-z_-]{35}\b/,
  'Stripe live key': /\b(sk|rk)_live_[0-9a-zA-Z]{20,}\b/,
  'GitHub token': /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  'Slack token': /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  'Private key block': /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  'JWT': /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  'Bearer token': /\bBearer\s+[A-Za-z0-9._-]{20,}\b/,
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Things that look like emails but are build artefacts (e.g. "logo@2x.png", "pkg@1.2.3").
const EMAIL_NOISE = /\.(png|jpe?g|svg|webp|gif|js|css|woff2?)$|@\d/i;

/**
 * Scan text for secrets and unexpected emails.
 * @returns {{secrets: {type:string, match:string}[], emails: string[]}}
 *   Emails are returned only if they are NOT in the allowlist.
 */
export function scanForSensitiveData(text, emailAllowlist = []) {
  const secrets = Object.entries(SECRET_PATTERNS)
    .map(([type, re]) => ({ type, match: text.match(re)?.[0] }))
    .filter(s => s.match)
    .map(s => ({ ...s, match: s.match.slice(0, 12) + '…' })); // never print a full secret into reports
  const allow = emailAllowlist.map(e => e.toLowerCase());
  const emails = [...new Set(text.match(EMAIL_RE) || [])]
    .filter(e => !EMAIL_NOISE.test(e) && !allow.includes(e.toLowerCase()));
  return { secrets, emails };
}

// ---------- reporting ----------

/** Write a markdown file under docs/ (creates the folder if needed). */
export function writeDoc(fileName, markdown) {
  const target = path.resolve(process.cwd(), 'docs', fileName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, markdown, 'utf8');
  return target;
}

export const absolute = p => new URL(p, SITE.origin).href;
