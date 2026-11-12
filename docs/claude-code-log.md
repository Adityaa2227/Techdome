# 🤖 Claude Code Usage Log

Model: Claude Code (Opus 5.5), CLI on Windows. One continuous session, 2026-11-10.

## At a glance

| # | Prompt | Outcome |
|:---:|---|---|
| [1](#prompt-1) | Explain the Playwright scaffold | Config reorganised into per-suite projects |
| [2](#prompt-2) | Explain the framework architecture | Plan for page objects, fixtures and helpers |
| [3](#prompt-3) | Read the brief, write `steps.md` | Step-by-step work plan |
| [4](#prompt-4) | Explore the site | `site-exploration.md`, 8 bug candidates |
| [5](#prompt-5) | Write the user story map | 30 stories, 8 personas |
| [6](#prompt-6) | Build the framework | `utils/`; 4 smoke failures found and fixed |
| [7](#prompt-7) | Write E2E tests | 58 runs; 3 of Claude's own wrong claims corrected |
| [8](#prompt-8) | Write integration tests | 18 tests; vendor check mutation-tested |
| [9](#prompt-9) | Write security tests | 28 tests; a vacuous cookie test caught and fixed |
| [10](#prompt-10) | Load test, bugs, finish | 5-user load test, 9 bugs, fresh-clone run verified |

---

## Prompt #1
**What I asked:** Before anything is written, review the Playwright scaffold: which files were generated, what the config does, how tests are discovered and run, and what to configure first. Explain only; change no files.

> 💬 *Exact prompt:* "I am working on a QA Engineer take-home assignment for Techdome. The project uses: javaScript, Playwright, End-to-end testing. For now, inspect the existing project structure and explain: 1. What files Playwright has generated. 2. The purpose of playwright.config.ts. 3. How Playwright discovers and executes tests. 4. What we should configure before writing our actual test cases. Do not modify any files yet."

**What Claude did:** Read the scaffold (config, example spec, package.json, .gitignore, last-run, the assignment PDF). Explained each file, how `testDir`/`testMatch`/projects/workers work, and proposed config changes. Pointed out that the project has `playwright.config.js`, not the `.ts` the brief shows. Highlighted the 5-user load limit as the main config risk. Proposed a plan; after the plan was approved it rewrote the config (per-suite projects, baseURL, workers), added npm scripts and a README, deleted the example spec and created the folders.

**What I changed / accepted / rejected:** **Accepted, after an interruption.** I had said "do not modify any files yet". I then approved Claude's plan, so the config changes it made were changes I had agreed to. While it was verifying them, I stopped it and asked about the overall architecture first, so the structure was agreed before more code was written.
- **JavaScript, not TypeScript:** I kept JavaScript. The project was already scaffolded in JS, the assignment is about test design rather than types, and `// @ts-check` still gives editor checking.
- **Chromium only, plus 375 px and 768 px viewports:** I accepted this. The brief asks for mobile coverage, not cross-browser coverage, and three browser engines would triple the traffic against a live site that turned out to be slow.

---

## Prompt #2
**What I asked:** Design the framework architecture: the role of each folder (`e2e`, `integration`, `security`, `load`, `utils`, `docs`), how to organise the test files, and which reusable fixtures and helpers we need. Explain only; change no files.

> 💬 *Exact prompt:* "We are building a QA automation framework… Inspect the current project and explain: 1. The purpose of each folder. 2. The role of Playwright's configuration file. 3. How we should organise our test files. 4. What reusable helpers and fixtures we will need. Do not modify any files yet."

**What Claude did:** Disclosed which changes it had already made in the previous turn. Explained the folders, the config's role, and a file-per-feature layout with `US-xxx` IDs in test titles. Proposed page objects, fixtures (console collector, network log, form-submit interception so no real leads are sent) and helpers.

**What I changed / accepted / rejected:** **Accepted both proposals.**
- **Story IDs in test titles:** `npx playwright test -g US-005` runs a single story, and every story, test and bug traces to the others.
- **Mocking every form submission:** I didn't want to file fake leads, bookings or newsletter sign-ups in Techdome's real systems. The tests assert the exact payload the browser would send, and how the UI reacts to success, failure and network errors. The trade-off is that the real backend is never exercised, and the README says so.

---

## Prompt #3
**What I asked:** Read the assignment brief (PDF) and turn it into a step-by-step work plan (`steps.md`) to follow for the rest of the assignment.

> 💬 *Exact prompt:* "first i want you to read D:\Techdome\QA-Playwright-Assignment (2).pdf and then create a steps.md file in which we will be doing this work"

**What Claude did:** Created `steps.md`: a step-by-step plan (setup → explore → stories → framework → E2E/integration/security/load → bugs → log → submit), with the brief's templates, scoring weights and red flags copied in.

**What I changed / accepted / rejected:** **Accepted.** I used `steps.md` as my checklist and worked through it in order. I removed it from the repo before submitting, because it copies parts of the brief, which is marked confidential.

---

## Prompt #4
**What I asked:** Step 1 of the plan had me exploring techdome.io by hand. I asked Claude to do the exploration as well: a read-only crawl of techdome.io that records pages, forms, headers and bug candidates, with nothing submitted to the site.

> 💬 *Exact prompt:* "you also do"

**What Claude did:** Ran read-only crawls of ~30 pages with one browser (sequential, every POST intercepted). Recorded the site map, forms, headers, mobile nav and external links in `docs/site-exploration.md`, with 8 bug candidates. Flagged one candidate as its own probe error (homepage H2s looked empty because of `content-visibility:auto`).

**What I changed / accepted / rejected:** **I widened the scope.** I asked Claude to do the exploration itself ("you also do") instead of only planning it, on condition that it stayed read-only and sequential, with every POST request intercepted.
- **Rejected two of the candidates:** "Industries/Portfolio both go to /work" is the logo lockup, and the two Venture Studio links are a design choice. Neither is a defect.
- **Re-checked the rest later:** In Step 8 every candidate was re-checked against fresh evidence instead of being trusted from this first crawl. The preload warnings didn't reproduce, so they were not filed.

---

## Prompt #5
**What I asked:** Go ahead with Step 2 of the plan: write the user story map, with site-specific stories, personas and acceptance criteria.

> 💬 *Exact prompt:* "do it"

**What Claude did:** Wrote `docs/user-story-map.md`: 30 stories, 8 personas, each with site-specific acceptance criteria, plus a coverage table vs. the brief and a story→test-file traceability matrix.

**What I changed / accepted / rejected:** **Accepted, keeping the brief's story template.**
- **US-006:** I agree that accepting an `@gmail.com` address in a field labelled "Work email" is a product decision, not a defect. The test records it as an annotation instead of failing.

---

## Prompt #6
**What I asked:** Go ahead with Step 3 of the plan: build the framework (page objects, fixtures and helpers), and prove it works against the live site.

> 💬 *Exact prompt:* "do it"

**What Claude did:** Built `utils/` and verified it with a temporary smoke spec against the live site. The first run **failed 4 ways**, and each was fixed:
1. **Hydration:** clicks landed before React attached handlers. Added `waitForHydration()` instead of sleeps.
2. **Wrong CTA:** desktop header says "Contact Us", not "Book call".
3. **Newsletter modal** overlay blocked clicks. Found the site's own snooze key and pre-set it.
4. **Booking step 2 is dynamic** (fields depend on the chosen need).

Also found the form APIs (`/api/leads`, `/api/contact-path`) in the JS bundles, and measured 20 s response spikes. Lowered workers from 4 to 2 and raised timeouts.

**What I changed / accepted / rejected:** **Accepted.**
- **`__reactProps` hydration check:** This ties the tests to a React internal, but the alternatives were worse. Fixed sleeps are slow and flaky, and the site has no "ready" signal of its own to wait for. The check lives in one helper, `BasePage.waitForHydration`, so it is a single change if the site moves away from React.
- **2 workers instead of 4:** I agree. We measured 20 s response spikes, and the goal is to test the site, not to stress it.

---

## Prompt #7
**What I asked:** Go ahead with Step 4 of the plan: write the E2E tests (navigation, forms, CTAs and mobile) and run them.

> 💬 *Exact prompt:* "go"

**What Claude did:** 8 spec files, 57 runs incl. mobile/tablet. The first run had 8 failures, which it triaged as test bugs vs. site bugs:
- **Test bugs fixed:** mega-menu links only render on hover; headings use `&nbsp;`/curly apostrophes; canonical has no trailing slash; sr-only checkboxes.
- **Site bug found:** bare 404 page (no navigation).
- **Claude's own wrong claims corrected:** (a) it had said the `/gcc` heading is unreadable for screen readers; Chromium's AX tree showed it isn't, so it was downgraded to Low. (b) An `aria-expanded` "bug" was its own probe error. (c) 12 "console errors" were caused by its own fixture on `about:blank`.

Introduced the `test.fail()` + bug annotation policy for known bugs.

**What I changed / accepted / rejected:** **Accepted the `test.fail()` policy.** Known bugs stay visible in the report and are not skipped. The suite stays green, so it remains usable for regression runs, and each test turns red when its bug is fixed. This isn't hiding failures: the Loom walks through each expected-fail test.
- **Corrections:** I accepted all three. I would rather Claude retract a wrong claim than have a wrong bug in the report. The `/gcc` heading bug went from an accessibility issue to Low severity once the accessibility tree showed screen readers are fine.

---

## Prompt #8
**What I asked:** Go ahead with Step 5 of the plan: write the integration tests (form API payloads, endpoints and third-party behaviour).

> 💬 *Exact prompt:* "continue"

**What Claude did:** 18 tests: exact request bodies for 3 form APIs, success/failure/double-click handling, sitemap sample, 405s, third-party blocking, consent behaviour. Because everything passed first time, it inspected the recorded data rather than trusting green. **Mutation-tested** the vendor-disclosure check (broke it on purpose, saw it fail, reverted). Found 19 tracking hosts after consent, and LeadConnector not named in the cookie policy. Investigated one flaky timeout (site slowness).

**What I changed / accepted / rejected:** **Accepted the exact-payload assertions.** The payload is what reaches Techdome's backend and CRM. A missing or renamed field, such as the consent flag or the landing page, would silently lose data, and that is what these tests catch. If Techdome changes the API on purpose, the tests should be updated on purpose too.
- **Green tests weren't trusted at face value:** Claude broke the vendor-disclosure check deliberately, confirmed it failed, then reverted it. That is the habit I want from a test suite.

---

## Prompt #9
**What I asked:** Go ahead with Step 6 of the plan: write the security tests (headers, XSS, data exposure and hardening).

> 💬 *Exact prompt:* "yup"

**What Claude did:** 28 tests (headers, XSS, data exposure, hardening). The **first cookie test was vacuous**: it checked zero cookies and passed, because pre-seeded consent doesn't start the tags. Caught this by reading the attachment, fixed it to click "Accept all", and it then found non-Secure analytics cookies. Verified the secret scanner against fake AWS/Google/JWT values.

**What I changed / accepted / rejected:** **Agreed with stopping the XSS tests at the browser.** There was no permission to send attack strings to Techdome's production backend. Testing in the browser proves that payloads never execute or render as HTML, and the server side is listed as out of scope.
- **Cookie test fix:** I accepted it. The first version passed while checking zero cookies, which is the kind of false green a reviewer should catch. Once it clicked the real "Accept all" button, it found BUG-005.

---

## Prompt #10
**What I asked:** Finish the remaining steps in one go: the 5-user load test, a full run, the bug report, this log, and a final check that the repo works from a fresh clone.

> 💬 *Exact prompt:* "continue all steps"

**What Claude did:** Load test (exactly 5 users, guard against more, runs as a *teardown* project so it can't overlap other suites in a full run). Full run: 101 passed / 4 skipped. Re-verified every bug with fresh evidence (`docs/evidence/`): one candidate (preload warnings) didn't reproduce and was not filed, and one new bug was confirmed (newsletter drops the email before JS loads). Wrote `bugs.md` (9 bugs) and this log draft. Initialised git and verified a fresh clone.

**What I changed / accepted / rejected:** **Kept the proposed severities.**
- **404 page (Medium):** It is a navigation dead end for anyone following an old or mistyped link. That is more than polish.
- **Slowness (Medium, not High):** It is intermittent, the site recovers, and the 5-user load test passes. High would mean a key feature is broken.
- **Cut:** The preload warnings were not filed because they didn't reproduce. The UX nitpicks from exploration had already been dropped in Prompt #4.

