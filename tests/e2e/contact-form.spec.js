import { test, expect } from '../../utils/fixtures.js';
import { VALID_LEAD, BOOKING_NEEDS } from '../../utils/test-data.js';

// Every POST is mocked by the fixture (mockWrites), so none of these tests create a real lead.

test.describe('Booking form (/contact)', () => {
  test('US-005: step 1 blocks empty required fields @P0', async ({ contactPage, capturedRequests }) => {
    await contactPage.openBooking();
    await contactPage.nextButton.click();

    await expect(contactPage.requiredErrors).toHaveCount(2);
    await expect(contactPage.firstName).toHaveAttribute('aria-invalid', 'true');
    await expect(contactPage.workEmail).toHaveAttribute('aria-invalid', 'true');
    await expect(contactPage.lastName).not.toHaveAttribute('aria-invalid', 'true');
    await expect(contactPage.company).not.toHaveAttribute('aria-invalid', 'true');
    await expect(contactPage.nextButton, 'still on step 1').toBeVisible();
    expect(capturedRequests, 'nothing is submitted').toHaveLength(0);
  });

  for (const email of ['not-an-email', 'a@b', 'name@', '@example.com']) {
    test(`US-006: rejects invalid email "${email}" @P0`, async ({ contactPage }) => {
      await contactPage.openBooking();
      await contactPage.fillStep1({ firstName: VALID_LEAD.firstName, email });
      await contactPage.nextButton.click();

      await expect(contactPage.invalidEmailError).toBeVisible();
      await expect(contactPage.workEmail).toHaveAttribute('aria-invalid', 'true');
      await expect(contactPage.needSelect, 'must not advance to step 2').toBeHidden();
    });
  }

  test('US-006: accepts a valid work email and advances to step 2 @P0', async ({ contactPage }) => {
    await contactPage.openBooking();
    await contactPage.goToStep2(VALID_LEAD);
    await expect(contactPage.needSelect).toBeVisible();
  });

  test('US-006: free-mail address is accepted for "Work email" (observation) @P2', async ({ contactPage }, testInfo) => {
    await contactPage.openBooking();
    await contactPage.goToStep2({ firstName: 'QA', email: 'qa.playwright@gmail.com' });
    testInfo.annotations.push({
      type: 'observation',
      description: '"Work email *" accepts @gmail.com. Product question: should free-mail domains be allowed?',
    });
    await expect(contactPage.needSelect).toBeVisible();
  });

  test('US-006: email with surrounding spaces is rejected or trimmed, never stored padded @P2', async ({ contactPage, capturedRequests }) => {
    await contactPage.openBooking();
    await contactPage.fillStep1({ firstName: 'QA', email: `  ${VALID_LEAD.email}  ` });
    await contactPage.nextButton.click();

    if (await contactPage.invalidEmailError.isVisible()) return; // rejected consistently: fine

    await contactPage.needSelect.selectOption({ label: BOOKING_NEEDS[1] });
    await contactPage.fillStep2Details();
    await contactPage.findTimeButton.click();
    await expect.poll(() => capturedRequests.find(r => r.url.includes('/api/leads'))).toBeTruthy();
    const lead = capturedRequests.find(r => r.url.includes('/api/leads')).json;
    expect(lead.contact.email).toBe(VALID_LEAD.email);
  });

  test('US-007: step 2 offers all needs, reveals follow-up fields, and validates them @P1', async ({ contactPage, capturedRequests }) => {
    await contactPage.openBooking();
    await contactPage.goToStep2(VALID_LEAD);

    const options = (await contactPage.needSelect.locator('option').allInnerTexts()).map(s => s.trim());
    expect(options).toEqual(expect.arrayContaining(BOOKING_NEEDS));

    await contactPage.needSelect.selectOption({ label: 'Automation / n8n' });
    const automate = contactPage.main.getByLabel('What do you want to automate?');
    await expect(automate).toBeVisible();

    await contactPage.findTimeButton.click();
    await expect(contactPage.requiredErrors.first()).toBeVisible();
    await expect(automate).toHaveAttribute('aria-invalid', 'true');
    expect(capturedRequests.filter(r => r.url.includes('/api/leads')), 'not submitted while invalid').toHaveLength(0);
  });

  test('US-007: Back keeps step 1 data and the NDA checkbox toggles @P1', async ({ contactPage }) => {
    await contactPage.openBooking();
    await contactPage.goToStep2(VALID_LEAD);

    await contactPage.ndaCheckbox.check();
    await expect(contactPage.ndaCheckbox).toBeChecked();
    await contactPage.ndaCheckbox.uncheck();
    await expect(contactPage.ndaCheckbox).not.toBeChecked();

    await contactPage.backButton.click();
    await expect(contactPage.firstName).toHaveValue(VALID_LEAD.firstName);
    await expect(contactPage.workEmail).toHaveValue(VALID_LEAD.email);
    await expect(contactPage.company).toHaveValue(VALID_LEAD.company);
  });
});

test.describe('Existing client form (/contact?for=client)', () => {
  test('US-008: shows the account-owner form with the right fields @P1', async ({ contactPage }) => {
    await contactPage.openClient();
    await expect(contactPage.main.getByText('Back for the next phase?')).toBeVisible();
    for (const field of [contactPage.name, contactPage.email, contactPage.company, contactPage.topicSelect]) {
      await expect(field).toBeVisible();
    }
    const topics = (await contactPage.topicSelect.locator('option').allInnerTexts()).map(s => s.trim());
    expect(topics).toEqual(expect.arrayContaining(['New phase of work', 'Support', 'Referral', 'Feedback or review']));
    await expect(contactPage.startProjectLink).toHaveAttribute('href', /\/contact/);
  });

  test('US-008: empty submit is blocked and nothing is sent @P1', async ({ contactPage, capturedRequests }) => {
    await contactPage.openClient();
    await contactPage.sendToOwner.click();
    await expect(contactPage.main.getByText(/please (enter|choose|tell)/i).first()).toBeVisible();
    expect(capturedRequests.filter(r => r.url.includes('/api/contact-path'))).toHaveLength(0);
  });
});

test.describe('Learner form (/contact?for=student)', () => {
  test('US-009: learner form offers level, goal and multi-select topics @P2', async ({ contactPage }) => {
    await contactPage.openStudent();
    const level = (await contactPage.levelSelect.locator('option').allInnerTexts()).map(s => s.trim());
    const goal = (await contactPage.goalSelect.locator('option').allInnerTexts()).map(s => s.trim());
    expect(level).toEqual(expect.arrayContaining(['Beginner', 'Building', 'Professional']));
    expect(goal).toEqual(expect.arrayContaining(['Get a job', 'Freelancing', 'My own business']));

    for (const topic of ['n8n basics', 'AI agents', 'Voice AI', 'RAG']) {
      await contactPage.toggleTopic(topic);
    }
    for (const topic of ['n8n basics', 'AI agents', 'Voice AI', 'RAG']) {
      await expect(contactPage.topicCheckbox(topic)).toBeChecked();
    }
    await expect(contactPage.main.getByText('No sales call. Learning material only.')).toBeVisible();
  });

  test('US-009: empty submit is blocked and nothing is sent @P2', async ({ contactPage, capturedRequests }) => {
    await contactPage.openStudent();
    await contactPage.sendLearningPath.click();
    await expect(contactPage.main.getByText(/please (enter|choose|tell)/i).first()).toBeVisible();
    expect(capturedRequests.filter(r => r.url.includes('/api/contact-path'))).toHaveLength(0);
  });
});
