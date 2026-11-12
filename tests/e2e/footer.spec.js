import { test, expect } from '../../utils/fixtures.js';
import { SOCIAL_LINKS, CONTACT } from '../../utils/test-data.js';
import { getStatus, isBotBlocking } from '../../utils/helpers.js';

test.describe('Footer links & social icons', () => {
  test('US-012: social links point to Techdome\'s real profiles and open in a new tab @P1', async ({ homePage }) => {
    await homePage.open();
    for (const [name, href] of Object.entries(SOCIAL_LINKS)) {
      const link = homePage.footer.link(name);
      await expect.soft(link, name).toHaveAttribute('href', href);
      await expect.soft(link, `${name} target`).toHaveAttribute('target', '_blank');
    }
    for (const host of ['upwork.com/agencies/techdome', 'clutch.co/profile/techdome']) {
      await expect.soft(homePage.footer.root.locator(`a[href*="${host}"]`).first(), host).toBeAttached();
    }
  });

  test('US-012: social profiles that allow automated checks are live @P2', async ({ request }) => {
    // LinkedIn, X, Upwork, Clutch, Facebook and YouTube block bots (403/400), so their status
    // says nothing about the link. Check only hosts that answer automation honestly.
    const checkable = Object.values(SOCIAL_LINKS).filter(u => !isBotBlocking(u));
    expect(checkable.length).toBeGreaterThan(0);
    for (const url of checkable) {
      const { status } = await getStatus(request, url);
      expect.soft(status, url).toBe(200);
    }
  });

  test('US-013: WhatsApp redirects to wa.me with a pre-filled message @P1', async ({ homePage, request }) => {
    await homePage.open();
    await expect(homePage.footer.whatsapp).toHaveAttribute('href', CONTACT.whatsappPath);
    await expect(homePage.footer.whatsapp).toHaveAttribute('target', '_blank');

    // page.goto hangs on wa.me in headless, so assert the redirect itself.
    const { status, headers } = await getStatus(request, CONTACT.whatsappPath, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(status);
    expect(headers.location).toMatch(CONTACT.whatsappLocation);
    expect(decodeURIComponent(headers.location)).toContain('schedule an architecture consultation');
  });

  test('US-013: phone and map links are correct @P1', async ({ homePage }) => {
    await homePage.open();
    await expect(homePage.footer.phone).toHaveAttribute('href', CONTACT.phoneHref);
    await expect(homePage.footer.phone).toContainText('9652049922');
    await expect(homePage.footer.mapLink).toHaveAttribute('target', '_blank');
  });
});
