// Form → API contract tests. Requests are intercepted (fixture mockWrites), so nothing reaches
// Techdome's CRM. We assert on what the browser SENDS and how the UI reacts to each response.
import { test, expect } from '../../utils/fixtures.js';
import { VALID_LEAD, UI_MESSAGES } from '../../utils/test-data.js';

const only = (reqs, part) => reqs.filter(r => r.url.includes(part));

test.describe('Newsletter API', () => {
  test('US-019: Subscribe sends one well-formed POST /api/newsletter/subscribe @P0', async ({ homePage, page, capturedRequests }) => {
    await homePage.open();
    await homePage.footer.subscribe(VALID_LEAD.email);
    await expect(homePage.footer.newsletterStatus).toHaveText(UI_MESSAGES.newsletterSuccess);

    const calls = only(capturedRequests, '/api/newsletter/subscribe');
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.method).toBe('POST');
    expect(call.headers['content-type']).toContain('application/json');
    expect(Object.keys(call.json).sort()).toEqual(expect.arrayContaining(['attribution', 'audience', 'email', 'pagePath', 'source']));
    expect(call.json).toMatchObject({
      email: VALID_LEAD.email,
      pagePath: new URL(page.url()).pathname,
      source: 'website-inline',
      audience: 'business',
    });
    expect(call.json, 'honeypot value must not be sent as user data').not.toHaveProperty('website');
  });

  test('US-019: email is trimmed before it is sent @P2', async ({ homePage, capturedRequests }) => {
    await homePage.open();
    await homePage.footer.waitReady();
    // type="email" inputs strip surrounding spaces in value; we check the API still gets a clean value.
    await homePage.footer.newsletterEmail.fill(`  ${VALID_LEAD.email}  `);
    await homePage.footer.subscribeButton.click();
    await expect.poll(() => only(capturedRequests, '/api/newsletter/subscribe').length).toBe(1);
    expect(only(capturedRequests, '/api/newsletter/subscribe')[0].json.email).toBe(VALID_LEAD.email);
  });
});

test.describe('Booking API (/contact → POST /api/leads)', () => {
  async function completeBooking(contactPage, need = 'Automation / n8n') {
    await contactPage.openBooking();
    await contactPage.goToStep2(VALID_LEAD);
    await contactPage.needSelect.selectOption({ label: need });
    await contactPage.fillStep2Details('Automate invoice reconciliation (QA test, please ignore).');
    await contactPage.ndaCheckbox.check();
    await contactPage.findTimeButton.click();
  }

  test('US-023: completing both steps sends the entered data to /api/leads @P1', async ({ contactPage, capturedRequests }) => {
    await completeBooking(contactPage);
    await expect.poll(() => only(capturedRequests, '/api/leads').length).toBe(1);
    const lead = only(capturedRequests, '/api/leads')[0];

    expect(lead.method).toBe('POST');
    expect(lead.headers['content-type']).toContain('application/json');
    expect(lead.json).toMatchObject({
      service: 'automation',
      contact: {
        firstName: VALID_LEAD.firstName,
        lastName: VALID_LEAD.lastName,
        email: VALID_LEAD.email,
        company: VALID_LEAD.company,
      },
      ndaFirst: true,
      landingPage: '/contact',
      website: '', // honeypot must be empty for a human submission
    });
    expect(Object.values(lead.json.answers).join(' ')).toContain('invoice reconciliation');
    expect(lead.json.tracking, 'no ad tracking when consent was rejected').toMatchObject({ adConsent: false });
  });

  test('US-023: successful submission shows a personalised thank-you @P1', async ({ contactPage }) => {
    await completeBooking(contactPage);
    await expect(contactPage.main.getByRole('heading', { name: `Thank you, ${VALID_LEAD.firstName}!` })).toBeVisible();
  });

  test('US-023: API failure shows an error and keeps the user on the form @P1', async ({ contactPage, page }) => {
    await page.route('**/api/leads', r => r.fulfill({ status: 500, json: { success: false } }));
    await completeBooking(contactPage);
    await expect(contactPage.main.getByText(/couldn.t submit your request right now/i)).toBeVisible();
    await expect(contactPage.findTimeButton, 'user can retry').toBeEnabled();
  });

  test('US-023: double-clicking "Find a time" sends only one lead @P2', async ({ contactPage, page, capturedRequests }) => {
    // Slow response so a second click lands while the first request is in flight.
    await page.route('**/api/leads', async r => {
      capturedRequests.push({ url: r.request().url(), json: r.request().postDataJSON() });
      await new Promise(res => setTimeout(res, 1500));
      await r.fulfill({ json: { success: true } });
    });
    await contactPage.openBooking();
    await contactPage.goToStep2(VALID_LEAD);
    await contactPage.needSelect.selectOption({ label: 'Automation / n8n' });
    await contactPage.fillStep2Details();
    await contactPage.findTimeButton.dblclick();
    await expect(contactPage.main.getByRole('heading', { name: /Thank you/ })).toBeVisible();
    expect(only(capturedRequests, '/api/leads'), 'duplicate leads would spam the sales team').toHaveLength(1);
  });
});

test.describe('Contact-path API (?for=client / ?for=student → POST /api/contact-path)', () => {
  test('US-023: existing-client request sends path, topic and contact details @P1', async ({ contactPage, capturedRequests }) => {
    await contactPage.openClient();
    await contactPage.name.fill(`${VALID_LEAD.firstName} ${VALID_LEAD.lastName}`);
    await contactPage.email.fill(VALID_LEAD.email);
    await contactPage.company.fill(VALID_LEAD.company);
    await contactPage.topicSelect.selectOption({ label: 'Support' });
    await contactPage.sendToOwner.click();

    await expect(contactPage.main.getByRole('status')).toContainText('Your account owner has it');
    const [call] = only(capturedRequests, '/api/contact-path');
    expect(call.json).toMatchObject({
      path: 'client',
      name: `${VALID_LEAD.firstName} ${VALID_LEAD.lastName}`,
      email: VALID_LEAD.email,
      company: VALID_LEAD.company,
      pagePath: '/contact?for=client',
      website: '',
    });
    expect(call.json.requestType).toBeTruthy();
  });

  test('US-023: learner request sends level, goal and every selected topic @P2', async ({ contactPage, capturedRequests }) => {
    await contactPage.openStudent();
    await contactPage.name.fill(VALID_LEAD.firstName);
    await contactPage.email.fill(VALID_LEAD.email);
    await contactPage.levelSelect.selectOption({ label: 'Beginner' });
    await contactPage.goalSelect.selectOption({ label: 'Freelancing' });
    await contactPage.toggleTopic('AI agents');
    await contactPage.toggleTopic('RAG');
    await contactPage.sendLearningPath.click();

    await expect(contactPage.main.getByRole('status')).toContainText('You are on the list');
    const [call] = only(capturedRequests, '/api/contact-path');
    expect(call.json).toMatchObject({ path: 'student', email: VALID_LEAD.email, website: '' });
    expect(call.json.level).toBeTruthy();
    expect(call.json.goal).toBeTruthy();
    expect(call.json.topics).toHaveLength(2);
  });
});
