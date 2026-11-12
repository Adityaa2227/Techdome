# 🔍 Site Exploration Notes: techdome.io

Explored 2026-11-10 with one headless Chromium browser, visiting pages one at a time.
All POST requests were **intercepted and mocked**, so nothing was submitted to Techdome.
These notes feed `user-story-map.md`, test design, and `bugs.md`.

---

## 1. Site map (all returned 200 unless noted)

| Area | URLs |
|---|---|
| Core | `/`, `/services`, `/studio`, `/ventures`, `/ventures/apply`, `/staff-augmentation`, `/automation`, `/gcc`, `/pricing`, `/about`, `/careers`, `/life-at-techdome`, `/faq` |
| Contact | `/contact`, `/contact?for=client`, `/contact?for=student` |
| Portfolio | `/work` (+ filters `?domain=FinTech#case-studies` etc.), ~20 case studies `/work/<slug>` |
| Industries | `/industries/healthcare-software-development`, `/industries/telehealth-software-development` |
| Products | `/products`, `/products/{sparrow, justinterview-ai, saral-funding, aether-voice, catalyst, geolytics, arc}` |
| Content | `/insights` (+ articles), `/topics/*`, `/glossary`, `/newsletter`, `/automation/templates` |
| Tools | `/tools`, `/tools/{mvp-cost, team-cost, automation-payback, migration-payback}` |
| Legal | `/privacy`, `/terms`, `/security`, `/cookie-policy`, `/reviews`, `/sitemap.xml`, `/robots.txt` |
| Redirect | `/go/whatsapp` → **307** → `wa.me/919652049922?text=…` |
| 404 | Unknown URL → **404**, title "404: This page could not be found." ✅ |

Tech: Next.js (App Router) behind Cloudflare, hosted on Railway.

## 2. Homepage facts (for assertions)
- Title: `Software Development Company in Hyderabad, India | Techdome`
- Meta description: "Techdome is a custom software development company and venture studio in Hyderabad. MVPs, engineering pods and n8n and AI automation from a 110-person team."
- H1: "Your product team, fully assembled."
- canonical `https://techdome.io/`, `lang="en"`, viewport meta present
- Hero CTAs: **Book a product teardown** → `/contact`, **See what we've built** → `/work`, **Pitch Techdome Ventures** → `/ventures`
- Header: **Book call** → `/contact`; mega-menu groups: Services, Portfolio, Insights, Company
- Trust badges (external): Upwork, freeCodeCamp YouTube, Product Hunt
- LCP (warm load): ~0.9 s
- A cookie consent dialog appears (Accept all / Reject all / Preferences)

## 3. Navigation
- Desktop: mega-menu buttons **Services / Portfolio / Insights / Company** + Ventures link + Book call
- Mobile (375 & 768): `button "Open navigation"` → `dialog "Site Navigation"` containing Services, Portfolio, Insights, Company (accordions), Ventures, "Book a 30-min call", `button "Close navigation"`
- No horizontal page overflow at 375 or 768 (scrollWidth == clientWidth) ✅

## 4. Footer
- Links: all service, industry, product and company pages; Privacy, Terms, Security, Client reviews, Cookie policy, Sitemap
- Contact: WhatsApp (`/go/whatsapp`, new tab), `tel:+919652049922`, Google Maps address, `mailto:rahul.joshi@techdome.net.in`
- Social (new tab): LinkedIn, X, Instagram, GitHub, Facebook, YouTube, plus Upwork, Clutch, TechBehemoths badge
- Newsletter form: email (required) + hidden honeypot `website` + **Subscribe**

## 5. Forms

### 5a. Booking form — `/contact` (main lead form, 2 steps). Not a `<form>` element.
- Step 1: **First name \***, Last name, **Work email \***, Company → `button "Next"`
  - Empty → both required fields show "Required." with `aria-invalid=true`
  - `not-an-email` → "Enter a valid email."
  - `a@b` → rejected. `qa@gmail.com` → accepted (free-mail domains are allowed for a "work email")
- Step 2: **What do you need? \*** (select: Engineering Pods / Automation / AI / Product Development / Venture Studio / Something else), checkbox "Send me a mutual NDA…", `button "Back"`, `button "Find a time"` (probably opens a calendar)
- Fields have labels (so `getByLabel` works) but **no `name` attributes**

### 5b. Existing client — `/contact?for=client`
Name \*, Work email \*, Company, What is this about? \* (New phase / Support / Referral / Feedback), honeypot → **Send to my account owner**

### 5c. Student — `/contact?for=student`
Name \*, Email \*, Where are you now? \*, What is your goal? \*, topic checkboxes (n8n basics, AI agents, Voice AI, RAG) → **Send me the learning path**

### 5d. Newsletter (footer, every page)
`POST https://techdome.io/api/newsletter/subscribe` with JSON
`{"email":"…","audience":"business","source":"website-inline","attribution":{},"pagePath":"/contact"}`
Native validation: empty → "Please fill out this field."; `not-an-email` → missing '@'.
The `/studio`, `/insights`, `/automation` and `/staff-augmentation` pages have a second inline newsletter form (placeholder "Enter your email").

Other inputs: `/products/saral-funding` (loan chat box), `/products/geolytics` (domain input "yourcompany.com").

## 6. Security / network observations

| Header | Value | Status |
|---|---|---|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | ✅ |
| X-Frame-Options | `SAMEORIGIN` | ✅ |
| X-Content-Type-Options | `nosniff` | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | ✅ |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | ✅ |
| **Content-Security-Policy** | **missing on every page checked** | ❌ |
| `/.well-known/security.txt` | 404 | ⚠️ |

- Third-party requests before consent: only `cdn.techbehemoths.com` (badge image). No analytics loads before consent ✅. After "Accept all" this needs re-checking.
- All `<script>` tags are first-party Next.js chunks loaded with `async`. Only the `polyfills` chunk is synchronous.

## 7. External links (automated GET)
Many return **403/400 to automated clients** (LinkedIn, X, Upwork, Clutch, Product Hunt, TechBehemoths, Facebook 400). This is bot-blocking, not breakage.
YouTube fails with "Header overflow" in the API client.
➡ Tests should assert the `href`, `target="_blank"` and `rel="noopener"` on these links, **not** their HTTP status.

## 8. Bug candidates (verify, then move to `bugs.md`)

| # | Observation | Proposed severity |
|---|---|---|
| 1 | No `Content-Security-Policy` header on any page | Medium (security) |
| 2 | `/gcc` H1 words are separate inline-block spans with spacing done by CSS margin. Its `textContent`/`innerText` is "YourengineeringcentreinIndia.Werunitfromdayone…" (copy-paste and non-rendering crawlers see no spaces). **Corrected in Step 4:** Chromium's accessibility tree *does* insert spaces, so screen readers are fine | Low (SEO / copy-paste) |
| 10 | Analytics cookies set without `Secure` flag after consent | Low (security) |
| 11 | Sporadic 20 s TTFB / dropped connections (§10) | Medium–High (performance) |
| 12 | LeadConnector/GoHighLevel tracker not named in cookie policy (§12) | Low (privacy transparency) |
| 9 | 404 page is the bare Next.js default ("404 · This page could not be found.") with no header, logo or link back to the site | Low–Medium (UX) |
| 3 | Console warnings: 1 CSS file and 4 font files are "preloaded but not used within a few seconds" (`/contact`) | Low–Medium (the brief lists console warnings under Medium) |
| 4 | Booking-form error messages aren't linked to their inputs (`aria-describedby` missing), and the inputs have no `name` attributes | Low (a11y) |
| 5 | "Work email \*" accepts free-mail domains (gmail.com) | Low (product/UX question) |
| 6 | Two nav items labelled "Venture Studio" go to different places (`/` and `/studio`); "Industries" and "Portfolio" both go to `/work` | Low (UX) |
| 7 | No `/.well-known/security.txt` even though the site has a `/security` page | Low |
| 8 | A personal email address (`rahul.joshi@…`) is exposed in page source on every page (intentional contact, but a spam/scrape target) | Low / informational |

Ruled out (not bugs): homepage H2s looked empty to `innerText`. That's because the sections use `content-visibility:auto`; the accessible names are correct.

## 10. Findings while building the framework (Step 3)

**Form APIs** (found in the site's JS bundles; all expect a `{ success: true }` response):
| Form | Endpoint | Body keys |
|---|---|---|
| Booking (`/contact`) | `POST /api/leads` | `service, contact{firstName,lastName,email,company}, answers{…}, utm, attribution, tracking{eventId,adConsent}, landingPage, website, ndaFirst` |
| Client / student (`?for=`) | `POST /api/contact-path` | `path, name, email, company, requestType \| level, goal, topics, attribution, pagePath, website` |
| Newsletter | `POST /api/newsletter/subscribe` | `email, audience, source, attribution, pagePath` |

- Newsletter UI: success → "Almost there. Check your inbox to confirm."; `success:false` → "Unable to subscribe. Please try again."; fetch error → "Network error…".
- **Booking step 2 is dynamic**: each "What do you need?" option adds its own required fields (e.g. *Automation / n8n* → "What do you want to automate? \*", plus frequency, timeline and budget). After a successful submit, the widget switches to a "submitted" state.
- **Desktop header CTA is "Contact Us"**. "Book call" only appears below the `lg` breakpoint.
- **Newsletter modal**: a timed full-screen overlay (`z-80`) blocks clicks. The site snoozes it with `localStorage.td_nl_popup_until`; the fixture pre-sets that key.
- **Consent** is stored in `localStorage.td_consent`; the fixture pre-sets it to "rejected" by default.
- **Hydration**: the HTML renders before React attaches its handlers. Clicks made too early do nothing. Pre-hydration, the newsletter `<form method=get>` submits natively. The email input has no `name`, so no email leaks into the URL (checked, not a bug). Page objects wait for hydration.

**Response time instability (bug candidate, Medium–High)**
| Request (sequential, curl) | TTFB | Total |
|---|---|---|
| `/contact` #1, #2 | **19.6 s, 20.3 s** | 19.9 s, 20.5 s |
| `/contact` #3–#5 | 0.9–1.2 s | 1.2–1.5 s |
| `/` × 3 in parallel | 1.3–2.0 s | **10.8 s, 44.5 s, 54.2 s** |
| `/robots.txt` | — | **connection failed (000)** |
| Control: playwright.dev / github.com | 0.25–0.6 s | < 0.7 s |

The control sites were fast from the same network, so the slowness is on the techdome.io side (Railway origin / Cloudflare `cf-cache-status: DYNAMIC`). Earlier, `page.goto` also hit the 30 s `load` timeout on `/`. This is why the config uses 2 workers and 60 s navigation timeouts. The load test (US-029) should capture it.

## 11. Findings while writing the E2E suite (Step 4)
- **Desktop mega-menus open on hover**, and their links are only rendered while open (a click toggles a menu closed). `aria-expanded` is correctly `true` while open. An early probe suggested otherwise because it read the state after a click had closed the menu, so this is not a bug.
- Headings use `&nbsp;` between words and curly apostrophes (`we’ve`). Text assertions use `\s+` and `['’]`.
- Canonical `href` attribute is `https://techdome.io` (no trailing slash; the DOM `.href` property adds one).
- Student-form topic checkboxes are visually hidden (`sr-only`) inside clickable labels.
- The 404 page has no site chrome (candidate #9).
- Ruled out: 12 "console errors" in one run were `localStorage` access errors from **our own** init script on `about:blank`. Fixed in the fixture; the site's homepage logs no console errors.

## 12. Findings while writing the integration suite (Step 5)
- **Write APIs** (`/api/newsletter/subscribe`, `/api/leads`, `/api/contact-path`) answer `GET` with **405**: correct, and never a 5xx.
- **Success states:** booking → heading "Thank you, {first name}!" + calendar modal (uses a `bookingToken` from the API); client → `role=status` "Thanks. Your account owner has it."; learner → "You are on the list."
- **Double-click on "Find a time"** sends only one lead ✅ (button switches to "Submitting…").
- **Consent works as claimed:** zero tracking requests before a choice, and zero after "Reject all" (remembered across reload).
- **After "Accept all", 19 third-party hosts load:** Google Analytics 4 (`G-D3NY626SEL`), Google Ads (`AW-18532270377`) + DoubleClick, Meta Pixel, Microsoft Clarity (session replay), Bing, OpenAI "ChatGPT Ads" pixel (`bzr.openai.com`), LeadConnector/GoHighLevel (`leadconnectorhq.com`, `msgsndr.com`), and a Cloud Run endpoint.
- **Cookie policy** names Google, Meta, Microsoft Clarity, Bing and OpenAI. **LeadConnector/GoHighLevel is only described as "our customer-records service"**, without the vendor name (Low, transparency). The policy also lists LinkedIn cookies (`bcookie`, `lidc`) although no LinkedIn tag loaded.
- Flakiness: across ~60 integration runs, one consent test timed out once during a site slow spell. `retries: 1` in the config covers this.

## 13. Findings while writing the security suite (Step 6)
| Check | Result |
|---|---|
| HSTS (2 y, includeSubDomains, preload), X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy | ✅ on all 5 audited pages |
| `X-Powered-By` fingerprint header | ✅ not sent |
| HTTP → HTTPS | ✅ permanent redirect |
| **Content-Security-Policy** (header or `<meta>`) | ❌ **absent on all pages** |
| XSS in booking first name / company / details, client name, URL params (`/work?q=`, `?domain=`, `/contact?for=`) | ✅ never executed; the "Thank you, {name}!" heading renders the payload as text |
| XSS payload in the data sent to the API | ⚠️ sent raw (normal for JSON APIs). Server-side handling not testable without sending payloads to production (deliberately not done) |
| Secrets in 18 pages' HTML and 32 JS bundles | ✅ none (scanner verified against fake AWS/Google/JWT values) |
| Unexpected email addresses in HTML | ✅ none beyond the published contact address |
| Public source maps (`*.js.map`) | ✅ not served |
| API error bodies (405/404) | ✅ no stack traces or paths |
| Honeypots on booking/client/newsletter forms | ✅ off-screen, `tabindex=-1`, `autocomplete=off`, `aria-hidden` |
| `target=_blank` links without `rel=noopener` | ✅ none found |
| Mixed (http://) content | ✅ none |
| **Analytics cookies after "Accept all"** (`_ga`, `_ga_D3NY626SEL`, `_gcl_au`, `_fbp`, `_clck`) | ❌ **set without `Secure`** (Low: tracking IDs, not session cookies; fix via gtag `cookie_flags: 'secure'`). OpenAI cookies are `Secure; SameSite=None` |

Test-quality note: the first version of the cookie test pre-seeded "accept" in localStorage. That doesn't start the tags, so it checked **zero** cookies and passed vacuously. It now clicks the real "Accept all" button and waits for `_ga`.

## 9. Implications for test design
- Use `getByRole` / `getByLabel`. Labels are good and `name` attributes are missing.
- Dismiss or accept the cookie dialog in a fixture. It overlays content on mobile.
- Contact tests: **mock `POST`** (`page.route`) so tests never create real leads. Don't click "Find a time" through to a real booking.
- Newsletter integration test: intercept `/api/newsletter/subscribe` and assert the JSON keys `email, audience, source, attribution, pagePath`.
- WhatsApp: assert the 307 + `wa.me` Location via `request` (`maxRedirects: 0`). `page.goto` hangs on wa.me.
- Load test targets: `/` and `/contact` (pages are Cloudflare-cached, `x-nextjs-cache: HIT`). Mention caching when interpreting p95.
