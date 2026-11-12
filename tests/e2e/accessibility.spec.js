import { test, expect } from '../../utils/fixtures.js';

/**
 * Known defects are marked with test.fail() + a 'bug' annotation instead of being skipped:
 * the run stays green while the bug exists, the HTML report lists it as an expected failure,
 * and the test turns RED when the site is fixed, which reminds us to remove the marker.
 */

/** Words glued together produce absurdly long "tokens". */
const longestToken = s => Math.max(...s.trim().split(/\s+/).map(t => t.length));
const PAGES = ['/', '/contact', '/pricing', '/about', '/services', '/gcc'];

test.describe('Headings', () => {
  for (const path of PAGES) {
    test(`US-030: ${path} has one H1 with a readable accessible name @P2`, async ({ anyPage }) => {
      await anyPage.open(path);
      await expect(anyPage.h1).toHaveCount(1);
      // ariaSnapshot = the name assistive tech announces (Chromium inserts spaces between
      // inline-block word spans, so screen readers are fine even on /gcc).
      const name = (await anyPage.h1.ariaSnapshot()).match(/heading "(.*)"/)?.[1] ?? '';
      expect(name.length).toBeGreaterThan(0);
      expect(longestToken(name), `accessible name "${name.slice(0, 60)}"`).toBeLessThan(25);
    });
  }

  test('US-030: /gcc H1 text has real spaces for copy-paste, find-in-page and non-rendering crawlers @P2', async ({ anyPage }) => {
    test.info().annotations.push({
      type: 'bug',
      description: 'BUG-007: /gcc H1 words are inline-block spans spaced by CSS margin; textContent/innerText = "YourengineeringcentreinIndia…". See docs/bugs.md',
    });
    test.fail();
    await anyPage.open('/gcc');
    const text = await anyPage.h1.textContent();
    expect(longestToken(text), `H1 textContent "${text.slice(0, 60)}"`).toBeLessThan(25);
  });
});

test.describe('Interactive elements', () => {
  test('US-030: booking-form error messages are linked to their inputs @P2', async ({ contactPage }) => {
    test.info().annotations.push({ type: 'bug', description: 'BUG-006: "Required." errors are not linked via aria-describedby. See docs/bugs.md' });
    test.fail();

    await contactPage.openBooking();
    await contactPage.nextButton.click();
    await expect(contactPage.requiredErrors.first()).toBeVisible();
    await expect(contactPage.firstName).toHaveAttribute('aria-describedby', /.+/, { timeout: 3_000 });
  });

  test('US-030: desktop mega-menu buttons announce their expanded state @P2', async ({ homePage }) => {
    await homePage.open();
    await expect(homePage.header.menuButton('Services')).toHaveAttribute('aria-expanded', 'false');
    await homePage.header.openMegaMenu('Services');
    await expect(homePage.header.menuButton('Services')).toHaveAttribute('aria-expanded', 'true');
  });
});
