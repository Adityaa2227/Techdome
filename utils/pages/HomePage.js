import { BasePage } from './BasePage.js';

export class HomePage extends BasePage {
  constructor(page) {
    super(page, '/');
    this.heroBookTeardown = this.main.getByRole('link', { name: 'Book a product teardown' });
    this.heroSeeWork = this.main.getByRole('link', { name: "See what we've built" });
    this.pitchVentures = this.main.getByRole('link', { name: /Pitch Techdome Ventures/ });
  }
}
