# Abhishek and Mansi

Engagement invitation site. Saturday 24 October 2026, 10:00 AM, Sanjog Lawns,
Ahilyanagar.

The page is a hero card, a countdown and the venue. There are no photographs,
no parents' names, no contact numbers and no travel notes. That is the whole
invitation, by the family's decision.

## Editing the site

Most of what a guest reads lives in `content.js`. Open that file, change the
text, save, push.

Nine of those strings are deliberately written a second time in `index.html`:
seven inside the hero card (the names, the conjunction, the occasion, the
date, the time and the venue, so the invitation still shows something if the
script never loads) and the page title plus description (so the WhatsApp
preview shows the right words). Seven more are written a third time in
`images/og-preview.html`, the source of the link preview card.

If you change one of those in `content.js`, change the matching text in
`index.html` and `images/og-preview.html` too, then run `npm test` before you
push. That is what catches a mismatch: Netlify runs no build step and no tests
on deploy, so a forgotten second copy would otherwise go live with no warning.

Each string has two versions:

    "hero.groom": { mr: "अभिषेक", en: "Abhishek" }

`mr` is Marathi, `en` is English. Both must be filled in or the tests fail. A
test also fails on any value left as a `TODO: ` placeholder, so the site
cannot ship half finished.

## Two things that look wrong and are not

**The countdown shows Latin numerals in Marathi.** "31" and "17" sit beside
the Devanagari date "शनिवार, २४ ऑक्टोबर २०२६". The family chose that mix.
Leave it.

**The invitation is fully readable before any script runs.** The hero card
carries its own Marathi text and `assets/app.js` only overwrites it. The
envelope that opens on load is added by the script and removed again about a
second and a half later. It is a cover over a finished page, never a gate in
front of one: with no JavaScript there is no envelope and the guest simply
reads the invitation. It does not animate at all under
`prefers-reduced-motion: reduce`.

## Before sharing the link

One step, in `images/README.md`: point `og:image` and `twitter:image` at the
absolute deployed URL instead of the relative path.

The site is also marked `noindex, nofollow` on purpose. This is an invitation
for people who were sent the link, not a page that wants search traffic.

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
| `content.js` | All copy, names, time, address, map link |
| `index.html` | Page structure, plus 9 strings duplicated from `content.js` |
| `assets/style.css` | Palette and layout |
| `assets/i18n.js` | Language resolution and storage |
| `assets/countdown.js` | Countdown arithmetic |
| `assets/envelope.js` | The opening envelope, and every reason not to show it |
| `assets/app.js` | Wires the above to the page |
| `images/og-preview.html` | Source of the WhatsApp preview card |
