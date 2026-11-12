import { Header } from './Header.js';
import { Footer } from './Footer.js';

/**
 * Shared behaviour for every techdome.io page.
 * Selector strategy: role / label / accessible name first. The site has good labels
 * but no `name`/`data-testid` attributes, and Tailwind class names are not stable.
 */
export class BasePage {
  /** @param {import('@playwright/test').Page} page  @param {string} path */
  constructor(page, path = '/') {
    this.page = page;
    this.path = path;
    this.header = new Header(page);
    this.footer = new Footer(page);
    this.h1 = page.getByRole('heading', { level: 1 });
    this.main = page.locator('main');
  }

  /**
   * Navigate and wait until the page is usable.
   * Waits for 'domcontentloaded' + visible H1 instead of 'load': the full load event
   * can take >30 s on this site (seen during exploration), but content renders well before.
   */
  async open(path = this.path) {
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.h1.first().waitFor({ state: 'visible' });
    await this.waitForHydration(this.page.locator('header button').first());
    return response;
  }

  /**
   * Next.js renders HTML on the server and attaches React handlers later ("hydration").
   * Clicking before that does nothing (or submits forms natively as GET). Seen as flaky
   * failures in the first framework run. We wait until React has attached its props
   * object to the element we are about to use.
   */
  async waitForHydration(locator, timeout = 30_000) {
    await locator.waitFor({ state: 'attached', timeout });
    const handle = await locator.elementHandle();
    await this.page.waitForFunction(
      el => Object.keys(el).some(k => k.startsWith('__reactProps')), handle, { timeout });
  }

  async title() {
    return this.page.title();
  }

  async metaContent(name) {
    return this.page.locator(`meta[name="${name}"]`).getAttribute('content');
  }
}
