import { BasePage } from './BasePage.js';

/**
 * /contact has three journeys:
 *  - booking (default): 2-step widget, NOT a <form>. Submits POST /api/leads
 *  - ?for=client: existing-client form. Submits POST /api/contact-path
 *  - ?for=student: learner form. Submits POST /api/contact-path
 * All APIs answer { success: boolean, ... }.
 */
export class ContactPage extends BasePage {
  constructor(page) {
    super(page, '/contact');
    const main = this.main;

    // Booking: step 1
    this.firstName = main.getByLabel('First name');
    this.lastName = main.getByLabel('Last name');
    this.workEmail = main.getByLabel('Work email');
    this.company = main.getByLabel('Company', { exact: true });
    this.nextButton = main.getByRole('button', { name: 'Next', exact: true });
    this.requiredErrors = main.getByText('Required.', { exact: true });
    this.invalidEmailError = main.getByText('Enter a valid email.', { exact: true });

    // Booking: step 2
    this.needSelect = main.getByLabel('What do you need?');
    this.ndaCheckbox = main.getByLabel(/mutual NDA/);
    this.backButton = main.getByRole('button', { name: 'Back', exact: true });
    this.findTimeButton = main.getByRole('button', { name: /Find a time/ });

    // Client / student forms (?for=…)
    this.name = main.getByLabel(/^Name/);
    this.email = main.getByLabel(/^(Work )?email/i);
    this.topicSelect = main.getByLabel('What is this about?');
    this.levelSelect = main.getByLabel('Where are you now?');
    this.goalSelect = main.getByLabel('What is your goal?');
    this.sendToOwner = main.getByRole('button', { name: 'Send to my account owner' });
    this.sendLearningPath = main.getByRole('button', { name: 'Send me the learning path' });
    this.startProjectLink = main.getByRole('link', { name: /Start a project instead/ });
  }

  async openBooking() {
    const res = await this.open('/contact');
    await this.waitForHydration(this.nextButton);
    return res;
  }
  async openClient() {
    const res = await this.open('/contact?for=client');
    await this.waitForHydration(this.sendToOwner);
    return res;
  }
  async openStudent() {
    const res = await this.open('/contact?for=student');
    await this.waitForHydration(this.sendLearningPath);
    return res;
  }

  /** Fill booking step 1. Pass only the fields you want to set. */
  async fillStep1({ firstName, lastName, email, company } = {}) {
    if (firstName !== undefined) await this.firstName.fill(firstName);
    if (lastName !== undefined) await this.lastName.fill(lastName);
    if (email !== undefined) await this.workEmail.fill(email);
    if (company !== undefined) await this.company.fill(company);
  }

  async goToStep2(lead) {
    await this.fillStep1(lead);
    await this.nextButton.click();
    await this.needSelect.waitFor({ state: 'visible' });
  }

  /**
   * Step 2 shows extra fields that depend on the chosen need (e.g. "Automation / n8n" adds
   * "What do you want to automate? *", frequency, timeline, budget). Fill every visible
   * free-text field so validation passes whichever option was picked.
   */
  async fillStep2Details(text = 'QA automation test, please ignore.') {
    const fields = this.main.locator('textarea:visible, input[type=text]:visible:not([name=website])');
    for (const field of await fields.all()) {
      if (!(await field.inputValue())) await field.fill(text);
    }
  }

  /** The real checkbox is visually hidden (`sr-only`); users click its label. */
  topicCheckbox(label) {
    return this.main.getByLabel(label, { exact: true });
  }

  async toggleTopic(label) {
    await this.main.getByText(label, { exact: true }).click();
  }
}
