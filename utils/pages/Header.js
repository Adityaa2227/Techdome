/** Site header: desktop mega-menu + mobile "Site Navigation" dialog. */
export class Header {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.locator('header').first();
    this.homeLink = this.root.getByRole('link', { name: /techdome home/i }).first();
    // Primary header CTA differs by breakpoint: "Contact Us" on desktop, "Book call" below lg.
    this.contactUs = this.root.getByRole('link', { name: 'Contact Us', exact: true });
    this.bookCall = this.root.getByRole('link', { name: 'Book call', exact: true });
    this.ventures = this.root.getByRole('link', { name: 'Ventures', exact: true });

    // Mobile / tablet (< lg breakpoint)
    this.openNavButton = page.getByRole('button', { name: 'Open navigation' });
    this.mobileNav = page.getByRole('dialog', { name: 'Site Navigation' });
    this.closeNavButton = this.mobileNav.getByRole('button', { name: 'Close navigation' });
  }

  /** Mega-menu trigger buttons: Services | Portfolio | Insights | Company. */
  menuButton(name) {
    return this.root.getByRole('button', { name, exact: true });
  }

  /**
   * Desktop mega-menus open on HOVER and their links are only rendered while open
   * (a click toggles them closed again). Returns the links shown for that group.
   */
  async openMegaMenu(name) {
    await this.menuButton(name).hover();
    await this.page.waitForFunction(
      n => document.querySelectorAll('header a[href]').length > n, 4, { timeout: 10_000 });
    return this.root.locator('a[href]');
  }

  async openMobileNav() {
    await this.openNavButton.click();
    await this.mobileNav.waitFor({ state: 'visible' });
  }

  async closeMobileNav() {
    await this.closeNavButton.click();
    await this.mobileNav.waitFor({ state: 'hidden' });
  }

  /** Expand an accordion group inside the mobile nav and return it. */
  async expandMobileGroup(name) {
    await this.mobileNav.getByRole('button', { name, exact: true }).click();
    return this.mobileNav;
  }
}
