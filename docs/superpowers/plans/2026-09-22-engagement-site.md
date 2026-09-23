# Engagement Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page bilingual (Marathi and English) engagement invitation site for Abhishek Unde and Mansi Kaldate, deployable to Netlify from this GitHub repository.

**Architecture:** Plain HTML, CSS and vanilla ES modules. No framework, no bundler, no build step. All user-facing copy lives in one `content.js` data module keyed by `{ mr, en }` pairs; `index.html` carries only `data-i18n` keys. Two pure function modules (i18n resolution, countdown math) are unit tested with `node:test`; a thin `app.js` wires them to the DOM.

**Tech Stack:** HTML5, CSS custom properties, ES modules, `node:test` (zero npm dependencies), Netlify static hosting.

**Spec:** `docs/superpowers/specs/2026-09-22-engagement-site-design.md`

## Global Constraints

- **No npm dependencies.** `package.json` exists only to set `"type": "module"` and a test script. `node_modules` must never appear.
- **No build step.** Netlify publishes the repository root verbatim.
- **No em dashes or en dashes anywhere**, including code comments, copy, and commit messages. Use commas, colons, periods, parentheses. Write ranges as "1 to 12".
- **Do not run `git commit` or `git push`.** Hand work over uncommitted. This overrides the commit steps that the writing-plans skill template normally includes; they have been deliberately omitted from every task below.
- **No user-facing copy in `index.html`.** Every text node is driven by a `data-i18n` key, with the single exception of the `<noscript>` block.
- **Both languages required.** Any string added to `content.js` must have a non-empty `mr` and a non-empty `en`. Task 1's coverage test enforces this.
- **Node version floor:** Node 20 or later (for stable `node --test` and ESM).
- **Placeholder copy must be obvious.** Unknown real-world values use the literal prefix `TODO: ` inside the string so they are visible on the rendered page, never silently blank.
- **Mobile first.** Layout must work at 320px width with no horizontal scroll.

### Refinement from the spec

The spec placed i18n and countdown logic inside `assets/app.js`. This plan splits them into `assets/i18n.js` and `assets/countdown.js`, leaving `app.js` as DOM wiring only. Reason: pure functions in their own modules are importable by `node:test` without a DOM shim. Behaviour is identical to the spec.

---

### Task 1: Content module and i18n resolver

**Files:**
- Create: `package.json`
- Create: `content.js`
- Create: `assets/i18n.js`
- Test: `tests/i18n.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `CONTENT` (frozen object) from `content.js`, shape: `{ eventISO: string, strings: Record<string, {mr: string, en: string}>, mapUrl: string, contacts: Array<{name: {mr,en}, phone: string}>, heroImage: string }`
  - `LANGS = ["mr", "en"]`, `DEFAULT_LANG = "mr"`, `STORAGE_KEY = "am-lang"` from `assets/i18n.js`
  - `resolve(strings, key, lang) -> string`
  - `findMissing(strings) -> string[]`
  - `readLang(storage) -> "mr" | "en"`
  - `writeLang(storage, lang) -> void`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "abhishek-mansi-engagement",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/i18n.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { resolve, findMissing, readLang, writeLang, DEFAULT_LANG, STORAGE_KEY } from "../assets/i18n.js";
import { CONTENT } from "../content.js";

const sample = {
  "a.one": { mr: "एक", en: "One" },
  "a.two": { mr: "दोन", en: "Two" }
};

test("resolve returns the requested language", () => {
  assert.equal(resolve(sample, "a.one", "mr"), "एक");
  assert.equal(resolve(sample, "a.one", "en"), "One");
});

test("resolve returns the key name when the key is unknown", () => {
  assert.equal(resolve(sample, "a.missing", "en"), "a.missing");
});

test("resolve returns the key name when the language is absent", () => {
  assert.equal(resolve({ "a.one": { mr: "एक" } }, "a.one", "en"), "a.one");
});

test("findMissing reports keys lacking either language", () => {
  const broken = {
    "ok": { mr: "ठीक", en: "Ok" },
    "no.en": { mr: "फक्त", en: "" },
    "no.mr": { en: "Only" }
  };
  assert.deepEqual(findMissing(broken).sort(), ["no.en", "no.mr"]);
});

test("every string in content.js has both languages", () => {
  assert.deepEqual(findMissing(CONTENT.strings), []);
});

test("content.js exposes the required top level fields", () => {
  assert.equal(typeof CONTENT.eventISO, "string");
  assert.equal(typeof CONTENT.mapUrl, "string");
  assert.ok(Array.isArray(CONTENT.contacts));
  assert.equal(typeof CONTENT.heroImage, "string");
});

test("readLang falls back to the default when storage is empty or broken", () => {
  assert.equal(readLang({ getItem: () => null }), DEFAULT_LANG);
  assert.equal(readLang({ getItem: () => "fr" }), DEFAULT_LANG);
  assert.equal(readLang({ getItem: () => { throw new Error("blocked"); } }), DEFAULT_LANG);
});

test("readLang returns a stored valid language", () => {
  assert.equal(readLang({ getItem: () => "en" }), "en");
});

test("writeLang stores under the shared key and swallows storage errors", () => {
  const calls = [];
  writeLang({ setItem: (k, v) => calls.push([k, v]) }, "en");
  assert.deepEqual(calls, [[STORAGE_KEY, "en"]]);
  assert.doesNotThrow(() => writeLang({ setItem: () => { throw new Error("blocked"); } }, "en"));
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/i18n.test.js`
Expected: FAIL, cannot find module `../assets/i18n.js`.

- [ ] **Step 4: Create `assets/i18n.js`**

```js
export const LANGS = ["mr", "en"];
export const DEFAULT_LANG = "mr";
export const STORAGE_KEY = "am-lang";

// Returns the key name rather than throwing so a missing string is visible
// on the page instead of silently blank. Tests catch these before launch.
export function resolve(strings, key, lang) {
  const entry = strings[key];
  if (!entry) return key;
  const value = entry[lang];
  if (typeof value !== "string" || value === "") return key;
  return value;
}

export function findMissing(strings) {
  const missing = [];
  for (const [key, entry] of Object.entries(strings)) {
    const incomplete = LANGS.some((lang) => typeof entry[lang] !== "string" || entry[lang] === "");
    if (incomplete) missing.push(key);
  }
  return missing;
}

export function readLang(storage) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return LANGS.includes(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function writeLang(storage, lang) {
  try {
    storage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private browsing can block storage. The site still works, it just
    // forgets the choice on reload.
  }
}
```

- [ ] **Step 5: Create `content.js`**

Every unknown real-world value uses the `TODO: ` prefix so it renders visibly. Keys are grouped by section. Copy this exactly:

```js
// The only file that needs editing to update the site.
// Every string carries both languages: mr (Marathi) and en (English).
// Values beginning with "TODO: " are placeholders awaiting real details.

export const CONTENT = Object.freeze({
  // Ceremony start instant. The +05:30 offset is IST, so the countdown is
  // correct for a guest opening the site from any timezone.
  eventISO: "2026-10-24T18:00:00+05:30",

  mapUrl: "https://www.google.com/maps/search/?api=1&query=Sanjog+Lawns+Ahilyanagar",

  heroImage: "images/hero.svg",

  contacts: [
    { name: { mr: "TODO: संपर्क नाव", en: "TODO: Contact name" }, phone: "TODO: +91" },
    { name: { mr: "TODO: संपर्क नाव", en: "TODO: Contact name" }, phone: "TODO: +91" }
  ],

  strings: {
    "meta.title": { mr: "अभिषेक आणि मानसी | साखरपुडा", en: "Abhishek and Mansi | Engagement" },
    "meta.description": {
      mr: "अभिषेक उंडे आणि मानसी कालदाते यांचा साखरपुडा सोहळा, २४ ऑक्टोबर २०२६, संजोग लॉन्स, अहिल्यानगर.",
      en: "The engagement of Abhishek Unde and Mansi Kaldate, 24 October 2026, Sanjog Lawns, Ahilyanagar."
    },

    "nav.toggle": { mr: "English", en: "मराठी" },
    "nav.toggleLabel": { mr: "भाषा बदला", en: "Change language" },

    "hero.blessing": { mr: "॥ श्री ॥", en: "॥ Shree ॥" },
    "hero.invite": {
      mr: "TODO: सप्रेम आमंत्रण ओळ (उदा. आमच्या लाडक्या मुलाच्या साखरपुड्यास आपण सहकुटुंब यावे)",
      en: "TODO: Invitation line (for example, we warmly invite you and your family to the engagement of our son)"
    },
    "hero.groom": { mr: "अभिषेक उंडे", en: "Abhishek Unde" },
    "hero.and": { mr: "आणि", en: "and" },
    "hero.bride": { mr: "मानसी कालदाते", en: "Mansi Kaldate" },
    "hero.occasion": { mr: "साखरपुडा सोहळा", en: "Engagement Ceremony" },
    "hero.date": { mr: "शनिवार, २४ ऑक्टोबर २०२६", en: "Saturday, 24 October 2026" },
    "hero.time": { mr: "TODO: वेळ", en: "TODO: Start time" },
    "hero.muhurat": { mr: "TODO: मुहूर्त वेळ", en: "TODO: Muhurat time" },
    "hero.venueShort": { mr: "संजोग लॉन्स, अहिल्यानगर", en: "Sanjog Lawns, Ahilyanagar" },

    "families.heading": { mr: "आमंत्रक", en: "With the blessings of" },
    "families.groomParents": { mr: "TODO: वराचे आई वडील", en: "TODO: Groom's parents" },
    "families.brideParents": { mr: "TODO: वधूचे आई वडील", en: "TODO: Bride's parents" },

    "countdown.heading": { mr: "सोहळ्यासाठी उरलेले दिवस", en: "Counting down to the day" },
    "countdown.days": { mr: "दिवस", en: "Days" },
    "countdown.hours": { mr: "तास", en: "Hours" },
    "countdown.minutes": { mr: "मिनिटे", en: "Minutes" },
    "countdown.seconds": { mr: "सेकंद", en: "Seconds" },
    "countdown.passed": {
      mr: "आमचा साखरपुडा झाला. आपल्या शुभेच्छांबद्दल मनःपूर्वक आभार.",
      en: "We are engaged. Thank you for all your blessings and wishes."
    },

    "venue.heading": { mr: "स्थळ", en: "Venue" },
    "venue.name": { mr: "संजोग लॉन्स", en: "Sanjog Lawns" },
    "venue.address": {
      mr: "TODO: संजोग लॉन्सचा संपूर्ण पत्ता, अहिल्यानगर, महाराष्ट्र",
      en: "TODO: Full postal address of Sanjog Lawns, Ahilyanagar, Maharashtra"
    },
    "venue.mapCta": { mr: "गूगल मॅपवर उघडा", en: "Open in Google Maps" },
    "venue.travelHeading": { mr: "प्रवास आणि पार्किंग", en: "Travel and parking" },
    "venue.travel": {
      mr: "TODO: बस स्थानकापासूनचे अंतर, पार्किंगची माहिती",
      en: "TODO: Distance from the bus stand, parking notes"
    },

    "contact.heading": { mr: "संपर्क", en: "Contact" },
    "contact.note": {
      mr: "काही शंका असल्यास कृपया संपर्क साधा.",
      en: "Please reach out with any questions."
    },

    "footer.note": { mr: "आपल्या शुभेच्छा हाच आमचा आशीर्वाद.", en: "Your blessings are the only gift we need." }
  }
});
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/i18n.test.js`
Expected: PASS, 9 tests.

---

### Task 2: Countdown module

**Files:**
- Create: `assets/countdown.js`
- Test: `tests/countdown.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `remaining(eventISO, now) -> { valid: boolean, passed: boolean, days: number, hours: number, minutes: number, seconds: number }`. When `valid` is false or `passed` is true, the four numeric fields are all `0`.

- [ ] **Step 1: Write the failing tests**

Create `tests/countdown.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { remaining } from "../assets/countdown.js";

const EVENT = "2026-10-24T18:00:00+05:30";

test("counts whole units down to the event", () => {
  // Exactly two days, three hours, four minutes and five seconds earlier.
  const now = new Date(Date.parse(EVENT) - ((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000));
  assert.deepEqual(remaining(EVENT, now), {
    valid: true, passed: false, days: 2, hours: 3, minutes: 4, seconds: 5
  });
});

test("is timezone independent for the caller", () => {
  // The same instant expressed as UTC must give the same answer.
  const utcNow = new Date("2026-10-22T12:30:00Z");
  const istNow = new Date("2026-10-22T18:00:00+05:30");
  assert.deepEqual(remaining(EVENT, utcNow), remaining(EVENT, istNow));
});

test("has not passed one second before the event", () => {
  const now = new Date(Date.parse(EVENT) - 1000);
  const r = remaining(EVENT, now);
  assert.equal(r.passed, false);
  assert.deepEqual([r.days, r.hours, r.minutes, r.seconds], [0, 0, 0, 1]);
});

test("has passed at the exact instant and after", () => {
  assert.equal(remaining(EVENT, new Date(Date.parse(EVENT))).passed, true);
  assert.equal(remaining(EVENT, new Date(Date.parse(EVENT) + 86400000)).passed, true);
});

test("zeroes every unit once passed", () => {
  assert.deepEqual(remaining(EVENT, new Date(Date.parse(EVENT) + 5000)), {
    valid: true, passed: true, days: 0, hours: 0, minutes: 0, seconds: 0
  });
});

test("reports invalid for a malformed or missing timestamp", () => {
  const dead = { valid: false, passed: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  assert.deepEqual(remaining("not a date", new Date()), dead);
  assert.deepEqual(remaining(undefined, new Date()), dead);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/countdown.test.js`
Expected: FAIL, cannot find module `../assets/countdown.js`.

- [ ] **Step 3: Create `assets/countdown.js`**

```js
const DEAD = Object.freeze({
  valid: false, passed: false, days: 0, hours: 0, minutes: 0, seconds: 0
});

const PASSED = Object.freeze({
  valid: true, passed: true, days: 0, hours: 0, minutes: 0, seconds: 0
});

// eventISO carries its own UTC offset, so the result is the same for a
// guest in Ahilyanagar and a guest abroad.
export function remaining(eventISO, now) {
  const target = Date.parse(eventISO);
  if (Number.isNaN(target)) return { ...DEAD };

  let delta = Math.floor((target - now.getTime()) / 1000);
  if (delta <= 0) return { ...PASSED };

  const days = Math.floor(delta / 86400);
  delta -= days * 86400;
  const hours = Math.floor(delta / 3600);
  delta -= hours * 3600;
  const minutes = Math.floor(delta / 60);
  const seconds = delta - minutes * 60;

  return { valid: true, passed: false, days, hours, minutes, seconds };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/countdown.test.js`
Expected: PASS, 6 tests.

---

### Task 3: Markup and stylesheet

**Files:**
- Create: `index.html`
- Create: `assets/style.css`
- Create: `images/hero.svg`
- Create: `images/README.md`

**Interfaces:**
- Consumes: the `data-i18n` key names defined in `content.js` (Task 1).
- Produces: DOM hooks that Task 4 wires up: `#lang-toggle`, `#countdown`, `#countdown-units`, `#countdown-passed`, `#contact-list`, `#map-link`, and `[data-i18n]` / `[data-i18n-attr]` attributes. `[data-i18n-attr]` holds a value like `content:meta.description` meaning "set the `content` attribute from key `meta.description`".

- [ ] **Step 1: Create the hero placeholder image**

`images/hero.svg`, a plain blush field so the layout has real dimensions before a photograph arrives:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-label="Placeholder">
  <rect width="1600" height="1000" fill="#e8cfc8"/>
  <text x="800" y="500" text-anchor="middle" font-family="serif" font-size="48" fill="#8a6a63">
    TODO: replace with images/hero.jpg
  </text>
</svg>
```

- [ ] **Step 2: Create `images/README.md`**

```markdown
# Images

Replace `hero.svg` with a real photograph named `hero.jpg`, then update
`heroImage` in `content.js` to `images/hero.jpg`.

Requirements for the hero photograph:

- Landscape orientation
- At least 1600px wide
- The couple positioned toward the left or right, not dead centre, because
  the invitation text overlays the middle on wide screens
- Under 400KB after compression, so the page opens fast on mobile data
```

- [ ] **Step 3: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title data-i18n="meta.title">अभिषेक आणि मानसी</title>
<meta name="description" data-i18n-attr="content:meta.description" content="">
<meta name="theme-color" content="#fdf8f4">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Karla:wght@400;600&family=Noto+Serif+Devanagari:wght@400;600&display=swap">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>

<noscript>
  <div class="noscript">
    <p>अभिषेक उंडे आणि मानसी कालदाते यांचा साखरपुडा सोहळा.</p>
    <p>शनिवार, २४ ऑक्टोबर २०२६. संजोग लॉन्स, अहिल्यानगर.</p>
    <p>Engagement of Abhishek Unde and Mansi Kaldate. Saturday, 24 October 2026. Sanjog Lawns, Ahilyanagar.</p>
  </div>
</noscript>

<header class="bar">
  <button id="lang-toggle" type="button" class="toggle"
          data-i18n="nav.toggle" data-i18n-attr="aria-label:nav.toggleLabel"></button>
</header>

<main>

  <section class="hero" aria-labelledby="hero-names">
    <div class="hero__media"><img id="hero-image" src="" alt="" loading="eager"></div>
    <div class="hero__panel">
      <p class="hero__blessing" data-i18n="hero.blessing"></p>
      <p class="hero__invite" data-i18n="hero.invite"></p>
      <h1 id="hero-names" class="names">
        <span class="names__one" data-i18n="hero.groom"></span>
        <span class="names__amp" data-i18n="hero.and"></span>
        <span class="names__one" data-i18n="hero.bride"></span>
      </h1>
      <p class="hero__occasion" data-i18n="hero.occasion"></p>
      <hr class="rule">
      <p class="hero__date" data-i18n="hero.date"></p>
      <p class="hero__time"><span data-i18n="hero.time"></span> <span class="dot"></span> <span data-i18n="hero.muhurat"></span></p>
      <p class="hero__where" data-i18n="hero.venueShort"></p>
    </div>
  </section>

  <section class="families" aria-labelledby="families-heading">
    <h2 id="families-heading" class="section__title" data-i18n="families.heading"></h2>
    <div class="families__grid">
      <p data-i18n="families.groomParents"></p>
      <p data-i18n="families.brideParents"></p>
    </div>
  </section>

  <section id="countdown" class="countdown" aria-labelledby="countdown-heading">
    <h2 id="countdown-heading" class="section__title" data-i18n="countdown.heading"></h2>
    <ul id="countdown-units" class="clock">
      <li><span class="clock__n" data-unit="days">0</span><span class="clock__l" data-i18n="countdown.days"></span></li>
      <li><span class="clock__n" data-unit="hours">0</span><span class="clock__l" data-i18n="countdown.hours"></span></li>
      <li><span class="clock__n" data-unit="minutes">0</span><span class="clock__l" data-i18n="countdown.minutes"></span></li>
      <li><span class="clock__n" data-unit="seconds">0</span><span class="clock__l" data-i18n="countdown.seconds"></span></li>
    </ul>
    <p id="countdown-passed" class="countdown__passed" data-i18n="countdown.passed" hidden></p>
  </section>

  <section class="venue" aria-labelledby="venue-heading">
    <h2 id="venue-heading" class="section__title" data-i18n="venue.heading"></h2>
    <p class="venue__name" data-i18n="venue.name"></p>
    <p class="venue__address" data-i18n="venue.address"></p>
    <a id="map-link" class="cta" href="#" target="_blank" rel="noopener noreferrer" data-i18n="venue.mapCta"></a>
    <h3 class="venue__sub" data-i18n="venue.travelHeading"></h3>
    <p class="venue__travel" data-i18n="venue.travel"></p>
  </section>

  <section class="contact" aria-labelledby="contact-heading">
    <h2 id="contact-heading" class="section__title" data-i18n="contact.heading"></h2>
    <p data-i18n="contact.note"></p>
    <ul id="contact-list" class="contact__list"></ul>
  </section>

</main>

<footer class="foot">
  <p data-i18n="footer.note"></p>
</footer>

<script type="module" src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create `assets/style.css`**

```css
/* Soft romantic, executed with restraint. Palette lives here only, so the
   whole look can be retuned from the :root block. */
:root {
  --cream: #fdf8f4;
  --blush: #d99b90;
  --blush-soft: #f1ddd8;
  --sage: #8b9c8a;
  --ink: #3a332f;
  --ink-soft: #6f635c;
  --rule: #e4d5ce;

  --display: "Cormorant Garamond", Georgia, serif;
  --body: "Karla", system-ui, sans-serif;
  --devanagari: "Noto Serif Devanagari", serif;

  --gutter: 1.25rem;
  --measure: 34rem;
}

*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  /* Set explicitly so a dark mode browser cannot invert the invitation. */
  background: var(--cream);
  color: var(--ink);
  font-family: var(--body);
  font-size: 1rem;
  line-height: 1.7;
}

/* Devanagari needs more leading and a slightly larger size than Latin at
   the same nominal point size. */
html[lang="mr"] body { font-family: var(--devanagari); line-height: 1.9; }
html[lang="mr"] .names { font-family: var(--devanagari); }

.noscript {
  padding: 2rem var(--gutter);
  background: var(--blush-soft);
  text-align: center;
}

.bar {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem var(--gutter);
}

.toggle {
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  padding: 0.4rem 1rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.toggle:hover, .toggle:focus-visible { background: var(--blush-soft); color: var(--ink); }

main { max-width: 64rem; margin: 0 auto; padding: 0 var(--gutter); }

section { padding: 3.5rem 0; }

.section__title {
  font-family: var(--display);
  font-weight: 400;
  font-size: 1.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
  text-align: center;
  margin: 0 0 1.75rem;
}
html[lang="mr"] .section__title { text-transform: none; letter-spacing: 0.02em; }

.hero { padding-top: 1rem; text-align: center; }

.hero__media {
  border-radius: 1rem;
  overflow: hidden;
  background: var(--blush-soft);
  aspect-ratio: 16 / 10;
}
.hero__media img { width: 100%; height: 100%; object-fit: cover; display: block; }

.hero__panel { max-width: var(--measure); margin: -3rem auto 0; position: relative;
  background: var(--cream); border-radius: 1rem; padding: 2rem 1.5rem 2.5rem; }

.hero__blessing { font-family: var(--devanagari); color: var(--blush); letter-spacing: 0.2em; margin: 0 0 1.25rem; }

.hero__invite { color: var(--ink-soft); font-size: 0.95rem; margin: 0 0 1.5rem; }

.names { margin: 0; font-family: var(--display); font-weight: 400; line-height: 1.15; }
.names__one { display: block; font-size: clamp(2.25rem, 9vw, 3.75rem); }
.names__amp { display: block; font-size: 1rem; font-style: italic; color: var(--blush);
  letter-spacing: 0.25em; margin: 0.4rem 0; }

.hero__occasion { color: var(--sage); letter-spacing: 0.18em; text-transform: uppercase;
  font-size: 0.8rem; margin: 1.25rem 0 0; }
html[lang="mr"] .hero__occasion { text-transform: none; letter-spacing: 0.04em; font-size: 0.95rem; }

.rule { border: 0; border-top: 1px solid var(--rule); width: 4rem; margin: 1.5rem auto; }

.hero__date { font-family: var(--display); font-size: 1.5rem; margin: 0; }
html[lang="mr"] .hero__date { font-family: var(--devanagari); font-size: 1.2rem; }
.hero__time { color: var(--ink-soft); margin: 0.25rem 0 0; font-size: 0.95rem; }
.dot { display: inline-block; width: 4px; height: 4px; border-radius: 50%;
  background: var(--blush); vertical-align: middle; margin: 0 0.5rem; }
.hero__where { color: var(--ink-soft); margin: 0.75rem 0 0; }

.families__grid { display: grid; gap: 1.25rem; text-align: center; }
@media (min-width: 40rem) { .families__grid { grid-template-columns: 1fr 1fr; } }

.countdown { text-align: center; }
.clock { list-style: none; display: flex; justify-content: center; flex-wrap: wrap;
  gap: 0.75rem; padding: 0; margin: 0; }
.clock li { min-width: 4.5rem; background: var(--blush-soft); border-radius: 0.75rem;
  padding: 0.9rem 0.5rem; }
.clock__n { display: block; font-family: var(--display); font-size: 2rem; line-height: 1;
  font-variant-numeric: tabular-nums; }
.clock__l { display: block; font-size: 0.7rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-soft); margin-top: 0.35rem; }
html[lang="mr"] .clock__l { text-transform: none; letter-spacing: 0.02em; font-size: 0.8rem; }
.countdown__passed { font-family: var(--display); font-size: 1.5rem; color: var(--blush); }

.venue { text-align: center; }
.venue__name { font-family: var(--display); font-size: 1.6rem; margin: 0; }
.venue__address { color: var(--ink-soft); max-width: var(--measure); margin: 0.5rem auto 1.5rem; }
.venue__sub { font-family: var(--display); font-weight: 400; font-size: 1.15rem; margin: 2.5rem 0 0.5rem; }
.venue__travel { color: var(--ink-soft); max-width: var(--measure); margin: 0 auto; }

.cta {
  display: inline-block; text-decoration: none;
  border: 1px solid var(--blush); color: var(--ink);
  border-radius: 999px; padding: 0.7rem 1.6rem; font-size: 0.9rem;
  letter-spacing: 0.06em; transition: background 0.2s ease, color 0.2s ease;
}
.cta:hover, .cta:focus-visible { background: var(--blush); color: var(--cream); }

.contact { text-align: center; }
.contact__list { list-style: none; padding: 0; margin: 1rem 0 0; display: grid; gap: 0.5rem; }
.contact__list a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--blush); }

.foot { text-align: center; padding: 2.5rem var(--gutter) 3.5rem; color: var(--ink-soft);
  font-size: 0.9rem; border-top: 1px solid var(--rule); margin-top: 2rem; }

/* Entry motion, opt out respected. */
.reveal { opacity: 0; transform: translateY(1rem); transition: opacity 0.7s ease, transform 0.7s ease; }
.reveal.is-in { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
  * { scroll-behavior: auto !important; }
}
```

- [ ] **Step 5: Verify the page opens with no console errors**

Run: `python3 -m http.server 8000` in the repository root, then open `http://localhost:8000`.
Expected: the page renders with empty text nodes (Task 4 fills them) and the browser console shows a 404 only for nothing. `assets/app.js` does not exist yet, so a single 404 for `assets/app.js` is expected and acceptable at this step. Stop the server afterwards.

---

### Task 4: Wire the DOM and enforce key parity

**Files:**
- Create: `assets/app.js`
- Test: `tests/markup.test.js`

**Interfaces:**
- Consumes: `CONTENT` (Task 1), `resolve`/`readLang`/`writeLang`/`LANGS`/`DEFAULT_LANG` (Task 1), `remaining` (Task 2), and the DOM hooks from Task 3.
- Produces: the running site. Nothing imports `app.js`.

- [ ] **Step 1: Write the failing parity test**

Create `tests/markup.test.js`. It parses `index.html` with a regular expression rather than a DOM library, because the constraint is zero dependencies:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT } from "../content.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function keysUsed(source) {
  const used = new Set();
  for (const m of source.matchAll(/data-i18n="([^"]+)"/g)) used.add(m[1]);
  for (const m of source.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(/\s+/)) used.add(pair.split(":")[1]);
  }
  return used;
}

test("every data-i18n key in index.html exists in content.js", () => {
  const defined = new Set(Object.keys(CONTENT.strings));
  const unknown = [...keysUsed(html)].filter((k) => !defined.has(k));
  assert.deepEqual(unknown, [], `index.html references undefined keys: ${unknown.join(", ")}`);
});

test("every key in content.js is used by index.html or by app.js", () => {
  const app = readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
  const used = keysUsed(html);
  const orphans = Object.keys(CONTENT.strings).filter((k) => !used.has(k) && !app.includes(`"${k}"`));
  assert.deepEqual(orphans, [], `content.js defines unused keys: ${orphans.join(", ")}`);
});

test("index.html carries a noscript fallback naming both people and the venue", () => {
  const block = html.match(/<noscript>[\s\S]*?<\/noscript>/);
  assert.ok(block, "no noscript block found");
  for (const needle of ["Abhishek", "Mansi", "Sanjog", "2026"]) {
    assert.ok(block[0].includes(needle), `noscript block is missing "${needle}"`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/markup.test.js`
Expected: FAIL, cannot read `../assets/app.js`.

- [ ] **Step 3: Create `assets/app.js`**

```js
import { CONTENT } from "../content.js";
import { resolve, readLang, writeLang, LANGS, DEFAULT_LANG } from "./i18n.js";
import { remaining } from "./countdown.js";

const strings = CONTENT.strings;
const t = (key, lang) => resolve(strings, key, lang);

function applyTranslations(root, lang) {
  root.documentElement.lang = lang;

  for (const el of root.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n, lang);
  }

  // data-i18n-attr="content:meta.description aria-label:nav.toggleLabel"
  for (const el of root.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr.trim().split(/\s+/)) {
      const [attr, key] = pair.split(":");
      el.setAttribute(attr, t(key, lang));
    }
  }

  renderContacts(root, lang);
}

function renderContacts(root, lang) {
  const list = root.getElementById("contact-list");
  if (!list) return;
  list.replaceChildren();
  for (const person of CONTENT.contacts) {
    const li = root.createElement("li");
    const name = root.createElement("span");
    name.textContent = `${person.name[lang]} `;
    const link = root.createElement("a");
    link.href = `tel:${person.phone.replace(/\s+/g, "")}`;
    link.textContent = person.phone;
    li.append(name, link);
    list.append(li);
  }
}

function startCountdown(root) {
  const units = root.getElementById("countdown-units");
  const passedNote = root.getElementById("countdown-passed");
  const section = root.getElementById("countdown");
  const cells = new Map(
    [...root.querySelectorAll("[data-unit]")].map((el) => [el.dataset.unit, el])
  );

  const tick = () => {
    const r = remaining(CONTENT.eventISO, new Date());

    if (!r.valid) {
      section.hidden = true;
      return;
    }
    if (r.passed) {
      units.hidden = true;
      passedNote.hidden = false;
      return;
    }
    for (const [unit, el] of cells) {
      const next = String(r[unit]);
      // Only touch the DOM when the digits actually change.
      if (el.textContent !== next) el.textContent = next;
    }
  };

  tick();
  setInterval(tick, 1000);
}

function wireToggle(root, initial) {
  let lang = initial;
  const button = root.getElementById("lang-toggle");
  button.addEventListener("click", () => {
    lang = LANGS.find((candidate) => candidate !== lang) ?? DEFAULT_LANG;
    applyTranslations(root, lang);
    writeLang(window.localStorage, lang);
  });
}

function revealOnScroll(root) {
  const sections = [...root.querySelectorAll("main > section")];
  for (const el of sections) el.classList.add("reveal");

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -10% 0px" });

  for (const el of sections) observer.observe(el);
}

function start() {
  const lang = readLang(window.localStorage);

  const hero = document.getElementById("hero-image");
  hero.src = CONTENT.heroImage;
  hero.alt = "";

  document.getElementById("map-link").href = CONTENT.mapUrl;

  applyTranslations(document, lang);
  wireToggle(document, lang);
  startCountdown(document);
  revealOnScroll(document);
}

start();
```

- [ ] **Step 4: Run the full suite**

Run: `node --test tests/`
Expected: PASS, all 18 tests across the three files.

- [ ] **Step 5: Verify in a browser**

Run `python3 -m http.server 8000` in the repository root and open `http://localhost:8000`.

Check each of these and report the result:
1. Page renders in Marathi on first load.
2. Clicking the toggle switches every visible string to English and the button label changes to `मराठी`.
3. Reloading keeps the chosen language.
4. The countdown shows a plausible number of days to 24 October 2026 and the seconds tick.
5. Console is clean, no errors.
6. At 320px width there is no horizontal scroll.
7. "Open in Google Maps" opens the Sanjog Lawns search.
8. No string renders as a raw key name such as `hero.invite`.

Stop the server afterwards.

---

### Task 5: Netlify configuration and repository documentation

**Files:**
- Create: `netlify.toml`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Consumes: the finished site from Tasks 1 to 4.
- Produces: nothing consumed by code.

- [ ] **Step 1: Create `netlify.toml`**

```toml
# No build step. Netlify serves the repository root as static files.
[build]
  publish = "."
  command = ""

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=3600"
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
.DS_Store
.netlify/
```

- [ ] **Step 3: Create `README.md`**

```markdown
# Abhishek and Mansi

Engagement invitation site. Saturday 24 October 2026, Sanjog Lawns, Ahilyanagar.

## Editing the site

Everything a guest reads lives in `content.js`. Open that file, change the
text, save, push. Nothing else needs touching.

Each string has two versions:

    "hero.groom": { mr: "अभिषेक उंडे", en: "Abhishek Unde" }

`mr` is Marathi, `en` is English. Both must be filled in or the tests fail.

Anything starting with `TODO: ` is a placeholder still waiting for real
details. Search the file for `TODO` to find what is outstanding.

## Adding the hero photograph

See `images/README.md`.

## Running it locally

    python3 -m http.server 8000

Then open http://localhost:8000

## Tests

    npm test

No dependencies to install. Requires Node 20 or later.

## Deploying

Netlify is connected to this repository. Pushing to `main` publishes the
site. There is no build step and no environment variables to set.

## Structure

| File | Purpose |
|---|---|
| `content.js` | All copy, names, times, address, contacts |
| `index.html` | Page structure, no copy |
| `assets/style.css` | Palette and layout |
| `assets/i18n.js` | Language resolution and storage |
| `assets/countdown.js` | Countdown arithmetic |
| `assets/app.js` | Wires the above to the page |
```

- [ ] **Step 4: Run the full suite one final time**

Run: `node --test tests/`
Expected: PASS, 18 tests, 0 failures. Paste the output.

- [ ] **Step 5: Confirm no forbidden characters shipped**

Run: `grep -rnP '[\x{2010}-\x{2015}]' --include='*.js' --include='*.html' --include='*.css' --include='*.md' --include='*.toml' .`
Expected: no matches.

- [ ] **Step 6: Leave the work uncommitted**

Run: `git status --short`
Report the list of new files. Do not commit. Do not push.

---

## Outstanding after implementation

The site is deployable but incomplete until these are supplied and pasted into `content.js`:

1. Both sets of parents' names, in Marathi and English
2. The Marathi invitation line the family prefers
3. Ceremony start time and muhurat time
4. Sanjog Lawns' full postal address and the exact Google Maps pin URL
5. Two contact names and phone numbers
6. Travel and parking notes
7. A hero photograph at `images/hero.jpg`
