import { UI_MESSAGES } from '../test-data.js';

/** Site footer: newsletter form, contact links, social links, legal links. */
export class Footer {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.locator('footer').last();

    // Newsletter: POST /api/newsletter/subscribe, expects { success: true, message? }
    this.newsletterForm = this.root.locator('form').filter({ has: page.locator('input[type=email]') });
    this.newsletterEmail = this.newsletterForm.getByPlaceholder('Enter your work email');
    this.subscribeButton = this.newsletterForm.getByRole('button', { name: 'Subscribe' });
    this.honeypot = this.newsletterForm.locator('input[name=website]');
    this.newsletterStatus = this.root.getByText(new RegExp(
      [UI_MESSAGES.newsletterSuccess, UI_MESSAGES.newsletterFailure, UI_MESSAGES.newsletterNetworkError]
        .map(r => r.source).join('|'), 'i'));

    this.whatsapp = this.root.getByRole('link', { name: 'WhatsApp' });
    this.phone = this.root.locator('a[href^="tel:"]').first();
    this.mapLink = this.root.locator('a[href*="google.com/maps"]').first();
  }

  link(name, opts = { exact: true }) {
    return this.root.getByRole('link', { name, ...opts });
  }

  /** Footer hydrates late; a pre-hydration click submits the form natively as GET. */
  async waitReady() {
    await this.newsletterEmail.scrollIntoViewIfNeeded();
    await this.page.waitForFunction(
      el => Object.keys(el).some(k => k.startsWith('__reactProps')),
      await this.subscribeButton.elementHandle(), { timeout: 30_000 });
  }

  async subscribe(email) {
    await this.waitReady();
    await this.newsletterEmail.fill(email);
    await this.subscribeButton.click();
  }

  /** Native HTML5 validation message of the email input ('' when valid). */
  async emailValidationMessage() {
    return this.newsletterEmail.evaluate(el => el.validationMessage);
  }
}
