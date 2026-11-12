import { test, expect } from '../../utils/fixtures.js';
import { UI_MESSAGES } from '../../utils/test-data.js';

const SUBSCRIBE_API = '**/api/newsletter/subscribe';

test.describe('Newsletter before JavaScript has loaded', () => {
  // Simulates a click before React hydrates (slow network / slow site spell).
  test.use({ javaScriptEnabled: false });

  test('US-010: subscribing before the page is interactive does not silently lose the email @P1', async ({ page }) => {
    test.info().annotations.push({
      type: 'bug',
      description: 'BUG-003: native <form method=get> submit reloads to "/?website=" and drops the email (input has no name). See docs/bugs.md',
    });
    test.fail();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const form = page.locator('footer form').filter({ has: page.locator('input[type=email]') });
    await form.locator('input[type=email]').fill('qa.playwright@example.com');
    await form.getByRole('button', { name: 'Subscribe' }).click();
    await page.waitForLoadState('domcontentloaded');

    // Acceptable outcomes: the email is submitted somewhere, or the user is told JS is required.
    const emailSent = new URL(page.url()).searchParams.has('email');
    expect(emailSent, `after submit the URL is ${page.url()}: the email was dropped`).toBe(true);
  });
});

test.describe('Newsletter signup (footer)', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
    await homePage.footer.waitReady();
  });

  test('US-010: footer shows the newsletter form @P1', async ({ homePage }) => {
    const { footer } = homePage;
    await expect(footer.root.getByRole('heading', { name: 'Subscribe to our newsletter' })).toBeVisible();
    await expect(footer.newsletterEmail).toBeVisible();
    await expect(footer.newsletterEmail).toHaveAttribute('type', 'email');
    await expect(footer.subscribeButton).toBeEnabled();
  });

  test('US-010: empty and malformed emails are blocked by validation, nothing sent @P1', async ({ homePage, capturedRequests }) => {
    const { footer } = homePage;

    await footer.subscribeButton.click();
    expect(await footer.emailValidationMessage()).not.toBe('');

    await footer.newsletterEmail.fill('not-an-email');
    await footer.subscribeButton.click();
    expect(await footer.emailValidationMessage()).toMatch(/@/);

    expect(capturedRequests.filter(r => r.url.includes('/api/newsletter'))).toHaveLength(0);
  });

  test('US-010: valid email shows the confirmation message @P1', async ({ homePage, page }) => {
    await page.route(SUBSCRIBE_API, r => r.fulfill({ json: { success: true } }));
    await homePage.footer.subscribe('qa.playwright@example.com');
    await expect(homePage.footer.newsletterStatus).toHaveText(UI_MESSAGES.newsletterSuccess);
  });

  test('US-010: API rejection shows a retry message @P1', async ({ homePage, page }) => {
    await page.route(SUBSCRIBE_API, r => r.fulfill({ status: 400, json: { success: false } }));
    await homePage.footer.subscribe('qa.playwright@example.com');
    await expect(homePage.footer.newsletterStatus).toHaveText(UI_MESSAGES.newsletterFailure);
  });

  test('US-010: network failure shows a connection error, not a silent failure @P2', async ({ homePage, page }) => {
    await page.route(SUBSCRIBE_API, r => r.abort('internetdisconnected'));
    await homePage.footer.subscribe('qa.playwright@example.com');
    await expect(homePage.footer.newsletterStatus).toHaveText(UI_MESSAGES.newsletterNetworkError);
  });

  test('US-010: hidden honeypot field is not reachable by keyboard or screen readers @P2', async ({ homePage }) => {
    const hp = homePage.footer.honeypot;
    await expect(hp).toHaveAttribute('tabindex', '-1');
    await expect(hp).toHaveAttribute('autocomplete', 'off');
    const hiddenFromAT = await hp.evaluate(el => !!el.closest('[aria-hidden="true"]'));
    expect(hiddenFromAT, 'honeypot should sit inside aria-hidden="true"').toBe(true);
  });
});
