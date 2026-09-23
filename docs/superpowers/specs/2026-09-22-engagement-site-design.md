# Engagement Site: Abhishek Unde and Mansi Kaldate

Design spec. Written 2026-09-22. Event 2026-10-24.

## Purpose

A single-page bilingual (Marathi and English) invitation site for the
sakharpuda of Abhishek Unde and Mansi Kaldate at Sanjog Lawns,
Ahilyanagar, on 24 October 2026. Guests open a link, see who is getting
engaged, when, and how to reach the venue. Nothing else.

## Decisions already made

| Decision | Choice | Rationale |
|---|---|---|
| Event scope | Engagement only | Wedding is a separate future event, out of scope |
| RSVP | None | Open invitation, no headcount needed |
| Languages | Marathi and English, toggle | Elders and local family read Marathi; toggle keeps pages short |
| Sections | Hero with countdown, Venue with directions | Story timeline and gallery deliberately deferred |
| Hosting | Netlify, deploying from this GitHub repo | Free, git-backed, no server to maintain |
| Aesthetic | Soft romantic (blush, sage, cream) | User choice; differentiated by typography and restraint, not floral clip art |
| Content readiness | Placeholders | Real names, times and photos land later via one content file |

## Non-goals

These are explicitly out of scope. Adding any of them is a new request.

- RSVP form, guest list, headcount, meal preferences
- Photo gallery or lightbox (deferred, cheap to add later)
- Love story timeline
- Wedding events (haldi, mehendi, sangeet, reception)
- Any backend, database, analytics, or third party tracking
- Accounts, logins, or admin panel

## Architecture

Plain HTML, CSS and vanilla JavaScript. No framework, no bundler, no
build step. Netlify publishes the repository root as-is.

Rejected alternatives:

- **Astro or 11ty**: adds node_modules, a lockfile, and a build that can
  break between now and October 2026 for a site with two sections.
- **React or Next.js**: an entire runtime shipped to render roughly
  forty strings. Absurd at this scale.

### File layout

```
index.html          Structure and data-i18n keys. No user-facing copy.
content.js          ALL copy, names, times, address. The only file to edit.
assets/style.css    Design tokens and layout.
assets/app.js       Language toggle and countdown.
images/             Hero image and placeholders.
netlify.toml        publish = ".", no build command.
tests/              node:test suites, zero dependencies.
```

### Units and boundaries

Four units, each independently understandable and testable.

**1. content.js (data)**

Exports one frozen object. Every user-facing string is keyed and carries
both languages:

```js
export const CONTENT = {
  eventISO: "2026-10-24T18:00:00+05:30",
  strings: {
    "hero.invite":  { mr: "...", en: "..." },
    "hero.groom":   { mr: "अभिषेक उंडे", en: "Abhishek Unde" },
    "venue.address":{ mr: "...", en: "..." }
  },
  mapUrl: "https://maps.google.com/?q=...",
  contacts: [ { name: {...}, phone: "+91..." } ]
};
```

Depends on nothing. Consumed by app.js only. A non-technical person can
edit this file safely; that is its reason to exist.

**2. i18n (assets/app.js)**

Takes the strings object and a language code, returns the resolved text.
Walks elements carrying `data-i18n="key"` and sets their text. Sets
`document.documentElement.lang`. Persists the choice to localStorage
under one key. Falls back to Marathi as the default language on first
visit.

Pure function at its core: `resolve(strings, key, lang) -> string`.
Missing key or missing language throws in tests, renders the key name in
production so a gap is visible rather than silent.

**3. countdown (assets/app.js)**

Pure function: `remaining(eventISO, now) -> { days, hours, minutes,
seconds, passed }`. The `passed` flag is true once `now` is at or after
the event instant. A one second interval calls it and writes to the DOM.

The IST offset lives in the timestamp string itself, so a guest opening
the site from anywhere sees the correct countdown to the Ahilyanagar
moment.

**4. Presentation (index.html, assets/style.css)**

Semantic HTML: `header`, `main`, two `section` elements, `footer`.
No copy in the markup; every text node is driven by a `data-i18n` key so
translation cannot drift from layout.

## Data flow

```
content.js  ->  app.js on DOMContentLoaded
                  |
                  +-> i18n.apply(lang)      -> writes text into [data-i18n] nodes
                  +-> countdown tick (1s)   -> writes into #countdown
                  |
              toggle click -> i18n.apply(other lang) -> localStorage
```

One direction only. No state beyond the current language and the current
tick.

## Visual design

Soft romantic, executed with restraint.

- **Palette**: cream background, blush accent, sage secondary, deep ink
  for body text. Defined as CSS custom properties on `:root` so the whole
  palette swaps from one place if it reads generic at review.
- **Type**: a real serif for display (not a novelty script), a clean sans
  for body, and Noto Serif Devanagari for Marathi so it never falls back
  to a system default. Marathi and English display sizes are tuned
  separately; Devanagari needs more line height than Latin.
- **Motion**: fade and rise on section entry, respecting
  `prefers-reduced-motion`. The countdown digits do not animate on every
  tick.
- **Imagery**: one strong photograph in the hero. No floral clip art.
- **Responsive**: mobile first. Most guests open this from WhatsApp on a
  phone. Tested down to 320px width.
- **Dark mode**: not supported. An invitation card has one correct
  appearance. The background is set explicitly so a dark-mode browser
  cannot invert it.

## Error handling

The failure modes worth handling on a static invitation site are few and
specific.

- **Missing translation**: renders the key name visibly. Tests fail on
  any missing pair, so this should never reach production.
- **Malformed or missing eventISO**: countdown block hides itself rather
  than showing `NaN`.
- **Event has passed**: countdown flips to a celebratory message from
  content.js instead of counting negative.
- **JavaScript disabled or failed to load**: the essential facts (both
  names, the occasion, the date, the venue) are the initial text content
  of the elements that carry their `data-i18n` keys, in Marathi, the
  default language. `applyTranslations` overwrites them when the script
  runs, so they cost nothing on the happy path and are the whole
  invitation when the module never arrives. There is no `<noscript>`
  block: `noscript` fires only when scripting is disabled, never when a
  script fails to load or a stock WebView ignores `type="module"`, and a
  second copy of the same facts would be free to drift. A test pins each
  seeded value byte for byte to its `mr` value in `content.js`. For the
  same reason the countdown heading and digits carry `hidden` in the
  markup and only `startCountdown` clears it, so a guest with no working
  script sees the invitation rather than a stopped clock reading zeroes.
- **Hero image fails to load**: background colour behind it is set so
  text stays legible.

## Testing

`node --test tests/`. Zero dependencies, no test framework install.

1. **countdown.test.js**: correct days and hours for a known `now`;
   `passed` false one second before the event; `passed` true at the exact
   instant and after; correct handling of a `now` in a non-IST timezone.
2. **i18n.test.js**: `resolve` returns the right language; the coverage
   check walks every key in `content.js` and fails if either `mr` or `en`
   is missing or empty. This is the guard that stops a half translated
   site shipping.
3. **markup.test.js**: every `data-i18n` key present in `index.html`
   exists in `content.js`, and vice versa. Catches a renamed key that
   would otherwise render as raw key text on the live site.

## Placeholders to be filled before launch

Each is marked `TODO` in `content.js`. The site builds and deploys with
placeholders in place.

Required:

- Both sets of parents' names, Marathi and English
- The Marathi invitation line (the "सप्रेम आमंत्रण" wording the family prefers)
- Ceremony start time and muhurat time
- Sanjog Lawns full postal address and the exact Google Maps pin
- Contact numbers and whose they are
- Hero photograph, landscape, at least 1600px wide

Optional:

- Dress code or theme colours
- Parking and travel notes (distance from Ahilyanagar bus stand, Pune airport)
- A short welcome note from the couple

## Deployment

`netlify.toml` sets `publish = "."` with no build command. Netlify is
connected to the GitHub repository; a push to `main` publishes. No
environment variables, no secrets, no build minutes consumed.

Custom domain is deferred. The Netlify subdomain works until the family
decides on a name.
