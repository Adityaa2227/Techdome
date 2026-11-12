// Runs in the `mobile-375` and `tablet-768` projects (see playwright.config.js).
import { test, expect } from '../../utils/fixtures.js';
import { SITE, VALID_LEAD } from '../../utils/test-data.js';
import { hasHorizontalOverflow, overflowingElements } from '../../utils/helpers.js';

const isPhone = testInfo => testInfo.project.use.viewport.width < 500;

async function expectNoOverflow(page, anyPage, path, testInfo) {
  await anyPage.open(path);
  const overflow = await hasHorizontalOverflow(page);
  if (overflow) {
    await testInfo.attach(`overflow-${path.replace(/\W/g, '_')}.json`, {
      body: JSON.stringify(await overflowingElements(page)), contentType: 'application/json',
    });
  }
  expect.soft(overflow, `${path} must not scroll horizontally`).toBe(false);
}

test.describe('Phone (375px)', () => {
  test.beforeEach(({}, testInfo) => test.skip(!isPhone(testInfo), 'phone-only story'));

  test('US-015: navigation collapses into a usable menu @P0', async ({ homePage, page }) => {
    await homePage.open();
    const { header } = homePage;

    await expect(header.openNavButton).toBeVisible();
    await expect(header.contactUs, 'desktop CTA hidden on phone').toBeHidden();

    await header.openMobileNav();
    for (const item of ['Services', 'Portfolio', 'Insights', 'Company']) {
      await expect(header.mobileNav.getByRole('button', { name: item, exact: true })).toBeVisible();
    }
    await expect(header.mobileNav.getByRole('link', { name: 'Book a 30-min call' })).toBeVisible();

    const visibleLinks = () => header.mobileNav.getByRole('link').filter({ visible: true }).count();
    const before = await visibleLinks();
    await header.expandMobileGroup('Services');
    await expect.poll(visibleLinks, 'expanding Services reveals its links').toBeGreaterThan(before);

    await header.closeMobileNav();
    await expect(header.mobileNav).toBeHidden();

    await header.openMobileNav();
    await header.mobileNav.getByRole('link', { name: 'Ventures', exact: true }).click();
    await expect(page).toHaveURL(/\/ventures$/);
    await expect(header.mobileNav).toBeHidden();
  });

  test('US-015: key pages do not overflow horizontally @P0', async ({ page, anyPage }, testInfo) => {
    for (const path of ['/', '/contact', '/pricing', '/gcc']) await expectNoOverflow(page, anyPage, path, testInfo);
  });
});

test.describe('Tablet (768px)', () => {
  test.beforeEach(({}, testInfo) => test.skip(isPhone(testInfo), 'tablet-only story'));

  test('US-016: tablet uses the compact menu and shows the hero fully @P1', async ({ homePage }) => {
    await homePage.open();
    await expect(homePage.header.openNavButton).toBeVisible();
    await expect(homePage.h1).toHaveText(SITE.home.h1);
    await expect(homePage.h1).toBeInViewport({ ratio: 1 });
    await expect(homePage.heroBookTeardown).toBeInViewport({ ratio: 1 });
    await expect(homePage.heroSeeWork).toBeInViewport({ ratio: 1 });
  });

  test('US-016: key pages do not overflow horizontally @P1', async ({ page, anyPage }, testInfo) => {
    for (const path of ['/', '/contact', '/pricing', '/work']) await expectNoOverflow(page, anyPage, path, testInfo);
  });
});

test.describe('Booking form on small screens', () => {
  test('US-017: booking form is fully usable without horizontal scrolling @P1', async ({ contactPage, page }) => {
    await contactPage.openBooking();
    const { width } = page.viewportSize();

    for (const field of [contactPage.firstName, contactPage.lastName, contactPage.workEmail, contactPage.company]) {
      await field.scrollIntoViewIfNeeded();
      await expect(field).toBeVisible();
      const box = await field.boundingBox();
      expect.soft(box.x + box.width, 'field fits the viewport').toBeLessThanOrEqual(width);
    }
    await expect(contactPage.workEmail).toHaveAttribute('type', 'email');

    await contactPage.nextButton.click();
    await expect(contactPage.requiredErrors.first()).toBeInViewport();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await contactPage.goToStep2(VALID_LEAD);
    await expect(contactPage.needSelect).toBeVisible();
  });
});
