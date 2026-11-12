// Static facts about techdome.io (from docs/site-exploration.md) and test inputs.
// Keeping expectations here means a copy change on the site is a one-line fix.

export const SITE = {
  origin: 'https://techdome.io',
  home: {
    path: '/',
    title: 'Software Development Company in Hyderabad, India | Techdome',
    descriptionIncludes: 'custom software development company and venture studio in Hyderabad',
    h1: /Your product team,\s*fully assembled\./,
  },
  // Headings use &nbsp; between words and curly apostrophes: match with \s and ['’].
  contact: { path: '/contact', h1: /Talk\s+to\s+an\s+architect\.\s+30\s+minutes\./ },
  work: { path: '/work', h1: /Software\s+we['’]ve\s+built\s+and\s+shipped\s+to\s+production\./ },
  ventures: { path: '/ventures', h1: /Not\s+just\s+capital\./ },
  notFoundTitle: /This page could not be found/,
};

/** Key pages used by navigation, header-audit and load tests. */
export const KEY_PAGES = [
  '/', '/services', '/studio', '/ventures', '/staff-augmentation', '/automation', '/gcc',
  '/pricing', '/work', '/products', '/insights', '/about', '/careers', '/contact',
];

export const PRODUCT_PAGES = {
  '/products/sparrow': 'sparrowapp.dev',
  '/products/justinterview-ai': 'justinterview.ai',
  '/products/saral-funding': 'saralfunding.com',
  '/products/catalyst': 'app.catalystai.work',
  '/products/geolytics': null,
  '/products/aether-voice': null,
  '/products/arc': null,
};

/** Footer social / trust links: accessible name → exact expected href. */
export const SOCIAL_LINKS = {
  'Techdome on LinkedIn': 'https://www.linkedin.com/company/techdome-solutions',
  'Techdome on X': 'https://x.com/techdomesolves',
  'Techdome on Instagram': 'https://www.instagram.com/techdome.io/',
  'Techdome on GitHub': 'https://github.com/techdome-io',
  'Techdome on Facebook': 'https://www.facebook.com/techdomesolutions',
  'Techdome on YouTube': 'https://www.youtube.com/@automationsbyrahul',
};

/** Hosts that answer automated clients with 403/400/odd headers: check href, never status. */
export const BOT_BLOCKING_HOSTS = [
  'linkedin.com', 'x.com', 'twitter.com', 'upwork.com', 'clutch.co', 'producthunt.com',
  'facebook.com', 'youtube.com', 'techbehemoths.com', 'wa.me',
];

export const CONTACT = {
  phoneHref: 'tel:+919652049922',
  whatsappPath: '/go/whatsapp',
  whatsappLocation: /^https:\/\/wa\.me\/919652049922\?text=/,
};

// ---------- form inputs ----------
// Reserved example.com domain: never a real inbox, even if a mock were bypassed.
export const VALID_LEAD = {
  firstName: 'QA',
  lastName: 'Playwright',
  email: 'qa.playwright@example.com',
  company: 'Techdome QA Assignment',
};

export const INVALID_EMAILS = ['not-an-email', 'a@b', 'name@', '@example.com', 'name@@example.com'];

export const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  "<svg onload=alert(1)>",
];

/** Booking step 2 options, in display order. */
export const BOOKING_NEEDS = [
  'Engineering Pods / Staff Augmentation', 'Automation / n8n', 'AI / GenAI',
  'Product Development', 'Venture Studio', 'Something else',
];

export const UI_MESSAGES = {
  required: 'Required.',
  invalidEmail: 'Enter a valid email.',
  newsletterSuccess: /Almost there|Check your inbox/i,
  newsletterFailure: /Unable to subscribe/i,
  newsletterNetworkError: /Network error/i,
};

// ---------- security ----------
export const REQUIRED_SECURITY_HEADERS = [
  'strict-transport-security', 'x-frame-options', 'content-security-policy',
];

/** Emails Techdome publishes on purpose. Anything else found in source is flagged. */
export const EMAIL_ALLOWLIST = ['rahul.joshi@techdome.net.in', 'careers@techdome.net.in'];

// ---------- load ----------
/** HARD LIMIT from the brief. Do not raise. */
export const MAX_CONCURRENT_USERS = 5;
export const LOAD_P95_BUDGET_MS = 3000;
