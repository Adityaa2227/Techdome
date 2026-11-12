# 🗺️ User Story Map: techdome.io

Based on the exploration in [`site-exploration.md`](./site-exploration.md) (2026-11-10).
Each story ID is used in its test's title (`test('US-005: …')`), so stories, tests and bugs trace to each other.

**Jump to:** [Personas](#personas) · [Coverage](#coverage-summary) · [Navigation](#1-navigation--page-load--e2e) · [Forms](#2-contact--enquiry-forms--e2e) · [CTAs](#3-ctas--external-links--e2e) · [Mobile](#4-mobile-responsiveness--e2e) · [Perf & a11y](#5-performance--accessibility--e2e-beyond-minimum) · [Integration](#6-api--form-integration--integration) · [Security](#7-security--security) · [Load](#8-load--load) · [Traceability](#traceability-story--test-file)

## Personas

| Persona | Who | What they come for |
|---|---|---|
| **Prospect** | Founder / CTO evaluating a dev partner | Proof of work, pricing, booking a 30-min architect call |
| **Hiring manager** | Engineering lead needing extra devs | Staff augmentation / engineering pods, React/Node roles |
| **Existing client** | Current Techdome customer | Requesting a new phase, support, referral (`/contact?for=client`) |
| **Learner** | Student learning n8n / AI automation | Learning path (`/contact?for=student`), templates, YouTube |
| **Founder raising** | Pre-seed/seed startup founder | Techdome Ventures fund, `/ventures/apply` |
| **Recruiter / candidate** | Job seeker or recruiter vetting the company | Careers, Life at Techdome, social profiles |
| **Mobile visitor** | Any of the above on a phone/tablet | Same journeys at 375px / 768px |
| **Security reviewer** | Client's InfoSec team doing vendor due diligence | Headers, data handling, injection resistance |

## Journey overview

```
Land on homepage ─► Explore (Services / Portfolio / Products / Insights) ─► Trust signals (Upwork, Clutch, PH)
        │                                                                          │
        └──────────────► Convert: Book call (/contact 2-step) · Newsletter · WhatsApp/Phone
                         Route:   Existing client (?for=client) · Learner (?for=student) · Founder (/ventures/apply)
```

## Coverage summary

| Area | Type | Brief min | Stories |
|---|---|---|---|
| Navigation & page load | E2E | 2 | US-001 – US-004 |
| Contact / enquiry forms | E2E | 2 | US-005 – US-010 |
| CTAs & external links | E2E | 2 | US-011 – US-014 |
| Mobile responsiveness | E2E | 2 | US-015 – US-017 |
| Performance & accessibility | E2E | — | US-018, US-030 |
| API / form integration | Integration | 3 | US-019 – US-023 |
| Security headers & injection | Security | 2 | US-024 – US-028 |
| Load (≤ 5 users) | Load | 1 | US-029 |
| **Total** | | **14** | **30** |

---

## 1. Navigation & page load — E2E

### US-001

**Title:** Homepage loads with the correct identity and hero\
**As a:** prospect\
**I want to:** open techdome.io and immediately see who Techdome is and what to do next\
**So that:** I can decide within seconds whether they are a fit\
**Acceptance:**
- [ ] Response is 200 and the page has no uncaught JS errors
- [ ] Title is `Software Development Company in Hyderabad, India | Techdome`
- [ ] Meta description mentions "custom software development company and venture studio in Hyderabad"
- [ ] Exactly one H1: "Your product team, fully assembled."
- [ ] Hero CTAs "Book a product teardown" and "See what we've built" are visible
- [ ] Canonical is `https://techdome.io/` and `<html lang="en">`

**Test Type:** E2E  **Priority:** P0

### US-002

**Title:** Every header and mega-menu link resolves to a real page\
**As a:** prospect\
**I want to:** use the Services, Portfolio, Insights and Company menus to reach any section\
**So that:** I never hit a dead end while evaluating Techdome\
**Acceptance:**
- [ ] Every internal `href` in the header returns HTTP 200 (no 404/5xx)
- [ ] Each target page has a non-empty `<title>` ending in "Techdome" and exactly one H1
- [ ] Hash links (e.g. `/studio#mvp`, `/staff-augmentation#role-react-nextjs`) point at an element with that id
- [ ] Portfolio filter links (`/work?domain=FinTech#case-studies`) load with 200

**Test Type:** E2E  **Priority:** P0

### US-003

**Title:** Footer company and legal links resolve\
**As a:** security reviewer\
**I want to:** reach Privacy, Terms, Security, Cookie policy, Client reviews and Sitemap from the footer\
**So that:** I can complete vendor due diligence\
**Acceptance:**
- [ ] All internal footer links return 200
- [ ] `/privacy` H1 is "Privacy Policy"; `/sitemap.xml` returns XML
- [ ] Footer is present on every page sampled (home, contact, a case study, a product page)

**Test Type:** E2E  **Priority:** P1

### US-004

**Title:** Unknown URLs show a proper 404 page\
**As a:** visitor following an old or mistyped link\
**I want to:** see a clear "not found" page that lets me get back on track\
**So that:** I don't think the whole site is broken\
**Acceptance:**
- [ ] `/this-page-does-not-exist` returns HTTP 404 (not a soft-404 200)
- [ ] Page title says "This page could not be found"
- [ ] Header navigation is still available to recover

**Test Type:** E2E  **Priority:** P2

---

## 2. Contact / enquiry forms — E2E

### US-005

**Title:** Booking form step 1 blocks empty required fields\
**As a:** prospect\
**I want to:** be told clearly which fields I missed when I click "Next" on `/contact`\
**So that:** I can fix them quickly and book my call\
**Acceptance:**
- [ ] Clicking **Next** with everything empty keeps me on step 1
- [ ] "First name \*" and "Work email \*" each show "Required." and have `aria-invalid="true"`
- [ ] Optional fields (Last name, Company) are not flagged
- [ ] No network request is sent

**Test Type:** E2E  **Priority:** P0

### US-006

**Title:** Booking form validates the email format\
**As a:** prospect\
**I want to:** be warned if I mistype my work email\
**So that:** Techdome can actually reach me\
**Acceptance:**
- [ ] `not-an-email` → "Enter a valid email.", stays on step 1
- [ ] `a@b` (no TLD) is rejected
- [ ] `name@company.com` is accepted and advances to step 2
- [ ] *(Edge)* Leading/trailing spaces are trimmed or rejected consistently
- [ ] *(Observation)* Free-mail (`@gmail.com`) is accepted despite the "Work email" label. Recorded as a product question

**Test Type:** E2E  **Priority:** P0

### US-007

**Title:** Booking form step 2 keeps my data and lets me go back\
**As a:** prospect\
**I want to:** choose "What do you need?", optionally request an NDA, and go Back without losing input\
**So that:** the 2-step flow doesn't punish me for changing my mind\
**Acceptance:**
- [ ] Valid step 1 → step 2 shows the "What do you need? \*" select with 6 options (Engineering Pods / Staff Augmentation, Automation / n8n, AI / GenAI, Product Development, Venture Studio, Something else)
- [ ] Choosing an option reveals its own follow-up fields (e.g. Automation / n8n → "What do you want to automate? \*", frequency, timeline, budget), and the required one shows "Required." if left empty
- [ ] "Send me a mutual NDA before I share any details." checkbox can be toggled
- [ ] **Back** returns to step 1 with First name / Work email still filled
- [ ] **Find a time** without a selection shows a required error
- [ ] Final submission is mocked. No real booking is created

**Test Type:** E2E  **Priority:** P1

### US-008

**Title:** Existing clients reach their account owner, not sales\
**As a:** existing client\
**I want to:** use `/contact?for=client` to request a new phase or support\
**So that:** my request goes to the people who built my project\
**Acceptance:**
- [ ] Page shows "Back for the next phase?" and **Send to my account owner**
- [ ] Fields: Name \*, Work email \*, Company, "What is this about? \*" (New phase of work / Support / Referral / Feedback or review)
- [ ] Submitting empty shows required errors on Name, Work email, topic
- [ ] "← Start a project instead" returns to the booking flow

**Test Type:** E2E  **Priority:** P1

### US-009

**Title:** Learners can request an n8n learning path\
**As a:** learner\
**I want to:** tell Techdome my level and goal on `/contact?for=student`\
**So that:** I get learning material without a sales call\
**Acceptance:**
- [ ] Fields: Name \*, Email \*, "Where are you now? \*" (Beginner/Building/Professional), "What is your goal? \*" (Get a job/Freelancing/My own business), topic checkboxes (n8n basics, AI agents, Voice AI, RAG)
- [ ] Multiple topics can be selected
- [ ] Empty submit is blocked with required errors
- [ ] Copy states "No sales call. Learning material only."

**Test Type:** E2E  **Priority:** P2

### US-010

**Title:** Newsletter signup validates email before subscribing\
**As a:** visitor\
**I want to:** subscribe from the footer of any page\
**So that:** I get Techdome's fortnightly engineering newsletter\
**Acceptance:**
- [ ] Footer shows "Subscribe to our newsletter", email field "Enter your work email", **Subscribe**
- [ ] Empty submit → native "Please fill out this field."
- [ ] `not-an-email` → native "missing an '@'" message, no request sent
- [ ] Valid email (request mocked) → a visible success/confirmation state
- [ ] Hidden honeypot `website` field is not visible or focusable

**Test Type:** E2E  **Priority:** P1

---

## 3. CTAs & external links — E2E

### US-011

**Title:** Primary CTAs take me to the right place\
**As a:** prospect\
**I want to:** click the main calls to action\
**So that:** I land exactly where the button promised\
**Acceptance:**
- [ ] Header "Contact Us" (desktop) / "Book call" (below `lg`) → `/contact` with H1 "Talk to an architect. 30 minutes."
- [ ] Hero "Book a product teardown" → `/contact`
- [ ] Hero "See what we've built" → `/work` (H1 "Software we've built and shipped to production.")
- [ ] "Pitch Techdome Ventures" → `/ventures` ("Not just capital.")
- [ ] `/ventures` "Apply" CTAs → `/ventures/apply` (200)

**Test Type:** E2E  **Priority:** P0

### US-012

**Title:** Social and trust-badge links point to Techdome's real profiles\
**As a:** recruiter / candidate\
**I want to:** check Techdome's LinkedIn, GitHub, Clutch and Upwork from the footer\
**So that:** I can verify the company is legitimate\
**Acceptance:**
- [ ] LinkedIn `/company/techdome-solutions`, X `@techdomesolves`, Instagram, GitHub `techdome-io`, Facebook, YouTube, Upwork, Clutch links are present with the exact expected URLs
- [ ] All open in a new tab (`target="_blank"`)
- [ ] Status is checked only where the host allows bots (GitHub, Instagram). LinkedIn, X, Upwork and Clutch return 403 to automation, so their status is not used as a failure signal

**Test Type:** E2E  **Priority:** P1

### US-013

**Title:** WhatsApp and phone contact work in one tap\
**As a:** prospect (on mobile)\
**I want to:** message or call Techdome directly from the footer\
**So that:** I can reach a human without filling in a form\
**Acceptance:**
- [ ] `/go/whatsapp` returns **307** to `https://wa.me/919652049922` with prefilled text "Hi Techdome, I would like to schedule an architecture consultation."
- [ ] Phone link is `tel:+919652049922` and the visible number matches
- [ ] Address link opens Google Maps in a new tab

**Test Type:** E2E  **Priority:** P1

### US-014

**Title:** Product pages link out to the live products\
**As a:** prospect evaluating Techdome's own products\
**I want to:** jump from a product page to the real product\
**So that:** I can try what they've built\
**Acceptance:**
- [ ] Sparrow → `sparrowapp.dev` + docs link; JustInterview.ai → `justinterview.ai` with UTM params; Saral Funding → `saralfunding.com`; Catalyst → `app.catalystai.work/auth/login`
- [ ] All 7 product pages (`/products/*`) return 200 with a product-specific title

**Test Type:** E2E  **Priority:** P2

---

## 4. Mobile responsiveness — E2E

### US-015

**Title:** Phone (375px): navigation collapses into a usable menu\
**As a:** mobile visitor\
**I want to:** open a compact menu on my phone\
**So that:** I can navigate without pinching and zooming\
**Acceptance:**
- [ ] Desktop menu buttons are hidden; `button "Open navigation"` is visible
- [ ] Tapping it opens `dialog "Site Navigation"` with Services, Portfolio, Insights, Company, Ventures, "Book a 30-min call"
- [ ] Accordion groups expand to show links; a link navigates and the menu closes
- [ ] `button "Close navigation"` closes the dialog
- [ ] No horizontal overflow on `/`, `/contact`, `/pricing` (`scrollWidth <= clientWidth`)

**Test Type:** E2E  **Priority:** P0

### US-016

**Title:** Tablet (768px): layout reflows without breaking\
**As a:** mobile visitor on a tablet\
**I want to:** see the content laid out properly at 768px\
**So that:** the site looks professional on my iPad\
**Acceptance:**
- [ ] Hamburger menu is shown (desktop nav starts at the `lg` breakpoint)
- [ ] Hero H1 and both hero CTAs are fully in the viewport, not clipped
- [ ] No horizontal page overflow on key pages
- [ ] Cookie banner doesn't permanently cover the primary CTA

**Test Type:** E2E  **Priority:** P1

### US-017

**Title:** Booking form is usable on a phone\
**As a:** mobile visitor\
**I want to:** fill in the `/contact` form at 375px\
**So that:** I can book a call from my phone\
**Acceptance:**
- [ ] All step-1 fields are visible and tappable, with labels above inputs
- [ ] Validation messages are visible without horizontal scroll
- [ ] Email field uses `type="email"` (mobile email keyboard)
- [ ] **Next** button is full-width and reachable

**Test Type:** E2E  **Priority:** P1

---

## 5. Performance & accessibility — E2E (beyond minimum)

### US-018

**Title:** Homepage renders its main content quickly\
**As a:** prospect on an average connection\
**I want to:** see the hero almost instantly\
**So that:** I don't bounce before learning what Techdome does\
**Acceptance:**
- [ ] Largest Contentful Paint is recorded and attached to the report
- [ ] LCP < 2.5 s (Google "good" threshold). Soft assertion; explored warm value ≈ 0.9 s
- [ ] No console **errors** during load (warnings are collected and reported)

**Test Type:** E2E  **Priority:** P2

### US-030

**Title:** Headings are readable by screen readers and search engines\
**As a:** visitor using a screen reader\
**I want to:** hear page headings as proper sentences\
**So that:** I can understand and navigate the page\
**Acceptance:**
- [ ] Each key page's H1 accessible name contains spaces between words (e.g. `/gcc` should read "Your engineering centre in India…")
- [ ] H1 *text* (`textContent`, used by copy-paste and non-rendering crawlers) also has real spaces
- [ ] Each page has exactly one H1
- [ ] Form error messages are programmatically linked to their inputs (`aria-describedby`)
- [ ] Desktop mega-menu buttons expose `aria-expanded` correctly

**Test Type:** E2E  **Priority:** P2
*(Known failures: `/gcc` H1 textContent and the booking-form error linkage. Both are marked `test.fail()` with a bug annotation. Chromium's accessible name for `/gcc` is fine.)*

---

## 6. API / form integration — Integration

### US-019

**Title:** Newsletter signup sends the correct API request\
**As a:** visitor\
**I want to:** have my subscription recorded with the right context\
**So that:** I get the newsletter and Techdome knows where I signed up\
**Acceptance:**
- [ ] Clicking Subscribe sends exactly one `POST /api/newsletter/subscribe`
- [ ] `Content-Type: application/json`
- [ ] Body has keys `email`, `audience`, `source`, `attribution`, `pagePath`; `email` equals the input, `pagePath` equals the current path, `source` = `website-inline`
- [ ] Honeypot `website` value is not sent as user data
- [ ] Request is intercepted, so no real subscription is created

**Test Type:** Integration  **Priority:** P0

### US-020

**Title:** Public endpoints return the expected status codes\
**As a:** security reviewer / SEO crawler\
**I want to:** get correct HTTP semantics from the site\
**So that:** crawlers index it correctly and nothing is silently broken\
**Acceptance:**
- [ ] `/robots.txt` 200 (text), `/sitemap.xml` 200 (XML)
- [ ] Every URL in `sitemap.xml` (sample of ≥ 15) returns 200
- [ ] `/go/whatsapp` 307 with `Location` to `wa.me`
- [ ] Unknown path 404
- [ ] `GET /api/newsletter/subscribe` (wrong method) returns 4xx, not 5xx

**Test Type:** Integration  **Priority:** P1

### US-021

**Title:** Third-party resources never block the page render\
**As a:** prospect\
**I want to:** see the page even if a third-party service is slow or down\
**So that:** an outage elsewhere doesn't make Techdome look broken\
**Acceptance:**
- [ ] No synchronous third-party `<script>` in `<head>` (all are `async`/`defer` or first-party)
- [ ] With all third-party hosts blocked (`page.route` abort), the homepage still renders its H1 and CTAs
- [ ] Third-party requests seen on load are listed in the report (currently only `cdn.techbehemoths.com` before consent)

**Test Type:** Integration  **Priority:** P1

### US-022

**Title:** Tracking only loads after cookie consent\
**As a:** privacy-conscious visitor (EU/UK)\
**I want to:** have analytics load only if I accept cookies\
**So that:** my consent choice is respected\
**Acceptance:**
- [ ] Cookie dialog appears on first visit with Accept all / Reject all / Preferences
- [ ] Before any choice: no analytics/tracking hosts are requested
- [ ] After **Reject all**: still none, and the choice persists on reload
- [ ] After **Accept all**: analytics (if any) load asynchronously. Record which hosts appear
- [ ] Every tracking vendor that loads is named in `/cookie-policy`

**Test Type:** Integration  **Priority:** P1

### US-023

**Title:** Booking form submission sends the entered data\
**As a:** prospect\
**I want to:** have my booking details passed on intact\
**So that:** the architect sees my real needs on the call\
**Acceptance:**
- [ ] Completing both steps fires exactly one `POST /api/leads` (JSON)
- [ ] Body: `contact.firstName/lastName/email/company` match the inputs, `service` matches the chosen need (e.g. `automation`), `answers` holds the step-2 details, `ndaFirst` reflects the checkbox, `landingPage` = `/contact`, honeypot `website` is empty
- [ ] On `{ success: true }` the widget shows its submitted state; on `success:false` it shows "We couldn't submit your request right now. Please try again."
- [ ] The request is intercepted/mocked. No real booking

**Test Type:** Integration  **Priority:** P1

---

## 7. Security — Security

### US-024

**Title:** Pages send the essential security headers\
**As a:** security reviewer\
**I want to:** confirm the site sends standard protective headers\
**So that:** I can approve Techdome as a vendor\
**Acceptance:**
- [ ] `Strict-Transport-Security` with `max-age ≥ 31536000` ✅ (observed 63072000, includeSubDomains, preload)
- [ ] `X-Frame-Options` = `SAMEORIGIN` or `DENY` ✅
- [ ] `X-Content-Type-Options: nosniff` ✅, `Referrer-Policy` ✅
- [ ] `Content-Security-Policy` present ❌ **missing on all pages checked**
- [ ] Checked on `/`, `/contact`, a product page and a case study

**Test Type:** Security  **Priority:** P0

### US-025

**Title:** Forms neutralise script injection\
**As a:** security reviewer\
**I want to:** confirm user input is never executed as code\
**So that:** attackers can't use Techdome's forms for XSS\
**Acceptance:**
- [ ] `<script>alert(1)</script>` in booking "First name": no `dialog` event fires, payload isn't rendered as HTML anywhere on the page
- [ ] `"><img src=x onerror=alert(1)>` in Company: same
- [ ] Payload in newsletter email field is rejected by validation
- [ ] Any reflected value (e.g. step 2 or confirmation text) is shown escaped

**Test Type:** Security  **Priority:** P0

### US-026

**Title:** No secrets or unintended personal data are exposed\
**As a:** security reviewer\
**I want to:** scan page source and network responses for leaked data\
**So that:** no API keys, tokens or private details are public\
**Acceptance:**
- [ ] HTML of key pages and their JS/JSON responses contain no API keys (`sk_live_`, `AKIA…`, `AIza…`), JWTs, bearer tokens or private keys
- [ ] Emails found are only the intentionally published contacts (allowlist: `rahul.joshi@techdome.net.in`); anything else fails
- [ ] No source maps (`*.js.map`) are publicly served for production chunks

**Test Type:** Security  **Priority:** P1

### US-027

**Title:** Bot-protection honeypot is invisible to real users\
**As a:** visitor\
**I want to:** never see or tab into the hidden "Website" field\
**So that:** I don't fill it in by accident and get flagged as a bot\
**Acceptance:**
- [ ] Honeypot `input[name=website]` exists on booking and newsletter forms
- [ ] It isn't visible, and keyboard Tab order skips it (`tabindex=-1` or hidden)
- [ ] It has `autocomplete="off"`, so browsers don't autofill it

**Test Type:** Security  **Priority:** P2

### US-028

**Title:** External links can't hijack the Techdome tab\
**As a:** visitor\
**I want to:** open external links safely\
**So that:** a third-party page can't redirect my Techdome tab (reverse tabnabbing)\
**Acceptance:**
- [ ] Every `a[target=_blank]` has `rel` containing `noopener` (or `noreferrer`)
- [ ] Checked on homepage, footer, product pages

**Test Type:** Security  **Priority:** P2

---

## 8. Load — Load

### US-029

**Title:** Site stays fast with 5 simultaneous visitors\
**As a:** prospect arriving during a busy moment (e.g. a newsletter send)\
**I want to:** load the homepage and contact page quickly even when others are browsing\
**So that:** I'm not put off by a slow site\
**Acceptance:**
- [ ] **Exactly 5** concurrent virtual users (5 browser contexts in 1 worker), **never more**
- [ ] Each user loads `/` then `/contact` (≥ 3 iterations each)
- [ ] p95 document response time < 3000 ms
- [ ] Zero HTTP 5xx responses
- [ ] Summary (requests, p50/p95/max, error count, verdict, timestamp, cache status) written to `docs/load-test-results.md`

**Test Type:** Load  **Priority:** P0
*Note: pages are served from the Cloudflare/Next.js cache (`x-nextjs-cache: HIT`), so results mostly reflect edge performance. Stated in the results.*

---

## Traceability: story → test file

| Story | Test file |
|---|---|
| US-001, US-018 | `tests/e2e/homepage.spec.js` |
| US-002, US-003, US-004 | `tests/e2e/navigation.spec.js` |
| US-005 – US-009 | `tests/e2e/contact-form.spec.js` |
| US-010 | `tests/e2e/newsletter.spec.js` |
| US-011, US-014 | `tests/e2e/ctas.spec.js` |
| US-012, US-013 | `tests/e2e/footer.spec.js` |
| US-015, US-016, US-017 | `tests/e2e/responsive.mobile.spec.js` |
| US-030 | `tests/e2e/accessibility.spec.js` |
| US-019, US-023 | `tests/integration/form-network.spec.js` |
| US-020 | `tests/integration/endpoints.spec.js` |
| US-021, US-022 | `tests/integration/third-party.spec.js` |
| US-024 | `tests/security/headers.spec.js` |
| US-025 | `tests/security/xss-injection.spec.js` |
| US-026 | `tests/security/data-exposure.spec.js` |
| US-027, US-028 | `tests/security/hardening.spec.js` |
| US-029 | `tests/load/homepage-contact.load.spec.js` |

## Out of scope (deliberate)
- **Completing a real booking / newsletter subscription.** It would create real leads for Techdome; all submissions are mocked.
- **Cross-browser (Firefox/WebKit).** Not required by the brief; Chromium + mobile viewports cover the journeys. Could be added via config projects.
- **Interactive calculators** (`/tools/*`, Geolytics domain checker, Saral loan chat). Lower priority; candidates if time remains.
- **Load beyond 5 users / stress testing.** Explicitly forbidden by the brief.
