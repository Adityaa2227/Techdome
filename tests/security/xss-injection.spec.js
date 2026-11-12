// Script-injection checks. Submissions are intercepted (fixture mockWrites), so payloads never
// reach Techdome's backend. That means these tests cover the CLIENT side: input is never
// executed or rendered as HTML. Whether the server sanitises stored data cannot be tested without
// sending real payloads to production, which we deliberately don't do (see README trade-offs).
import { test, expect } from '../../utils/fixtures.js';
import { VALID_LEAD, XSS_PAYLOADS } from '../../utils/test-data.js';

/** Fails the test if any JS dialog opens or a payload-created element appears in the DOM. */
function guardAgainstExecution(page) {
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
  return {
    dialogs,
    async assertClean() {
      // Next.js ships its own inline <script> tags, so count only ones whose body is our payload.
      const markerScripts = await page.evaluate(() =>
        [...document.querySelectorAll('script:not([src])')].filter(s => s.textContent.trim() === 'alert(1)').length);
      expect(dialogs, 'no alert() executed').toEqual([]);
      expect(markerScripts, 'no injected <script>alert(1)</script> in DOM').toBe(0);
      expect(await page.locator('img[src="x"], svg[onload]').count(), 'no injected img/svg elements').toBe(0);
    },
  };
}

test.describe('Script injection: booking form', () => {
  for (const payload of XSS_PAYLOADS) {
    test(`US-025: booking form neutralises ${JSON.stringify(payload)} in name and company @P0`, async ({ contactPage, page, capturedRequests }) => {
      const guard = guardAgainstExecution(page);
      await contactPage.openBooking();
      await contactPage.goToStep2({ ...VALID_LEAD, firstName: payload, company: payload });
      await contactPage.needSelect.selectOption({ label: 'Something else' });
      await contactPage.fillStep2Details(payload);
      await contactPage.findTimeButton.click();

      // The thank-you heading reflects the first name: it must appear as literal text.
      const heading = contactPage.main.getByRole('heading', { name: /Thank you/ });
      await expect(heading).toBeVisible();
      expect(await heading.textContent()).toContain(payload.split(' ')[0]);
      await guard.assertClean();

      // Record what the client sends (raw: escaping is the renderer's/server's job).
      const lead = capturedRequests.find(r => r.url.includes('/api/leads'));
      expect(lead.json.contact.firstName).toBe(payload);
    });
  }
});

test.describe('Script injection: other inputs', () => {
  test('US-025: client form name field does not execute script @P0', async ({ contactPage, page }) => {
    const guard = guardAgainstExecution(page);
    await contactPage.openClient();
    await contactPage.name.fill(XSS_PAYLOADS[1]);
    await contactPage.email.fill(VALID_LEAD.email);
    await contactPage.topicSelect.selectOption({ label: 'Feedback or review' });
    await contactPage.sendToOwner.click();
    await expect(contactPage.main.getByRole('status')).toBeVisible();
    await guard.assertClean();
  });

  test('US-025: newsletter rejects a script payload as an invalid email @P0', async ({ homePage, capturedRequests }) => {
    await homePage.open();
    await homePage.footer.waitReady();
    await homePage.footer.newsletterEmail.fill(XSS_PAYLOADS[0]);
    await homePage.footer.subscribeButton.click();
    expect(await homePage.footer.emailValidationMessage()).not.toBe('');
    expect(capturedRequests.filter(r => r.url.includes('/api/newsletter'))).toHaveLength(0);
  });

  for (const url of [
    `/work?q=${encodeURIComponent('<img src=x onerror=alert(1)>')}`,
    `/work?domain=${encodeURIComponent('"><svg onload=alert(1)>')}#case-studies`,
    `/contact?for=${encodeURIComponent('<script>alert(1)</script>')}`,
  ]) {
    test(`US-025: URL parameters are not reflected as HTML (${url.split('?')[0]}?${url.split('?')[1].split('=')[0]}) @P0`, async ({ page, anyPage }) => {
      const guard = guardAgainstExecution(page);
      await anyPage.open(url);
      await page.waitForTimeout(1_500); // let client-side filters render
      await guard.assertClean();
    });
  }
});
