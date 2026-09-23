# Images

There are no photographs on this site and none are planned. The invitation is
typographic: the hero is a ruled card in the site's palette, not a photo with
text over it. Two files live here.

## `favicon.svg`

The browser tab icon. Nothing to do.

## `og-preview.png` and `og-preview.html`

`og-preview.png` is the 1200x630 card WhatsApp, Facebook and X show when the
link is pasted. `og-preview.html` is the source it was rendered from. The card
is typographic and uses the same palette and fonts as the site: the two names,
the occasion, the date and the venue on cream, inside a double rule.

The Marathi text in `og-preview.html` is pinned to `content.js` by a test, so
the card cannot quietly disagree with the invitation. If you change a name or
the date in `content.js`, the test goes red until you change `og-preview.html`
to match. It cannot check the PNG, so after editing the HTML you must
**re-render the PNG**:

1. Serve the repository: `python3 -m http.server 8000`
2. Open `http://localhost:8000/images/og-preview.html` in a browser
3. Size the window so the page area is exactly **1200x630** and take a
   screenshot, or use a headless browser to capture it at that size
4. Save over `images/og-preview.png`

It has to be a raster. WhatsApp will not render an SVG as a preview image.

## TODO before sharing the link

One step, and it is the only thing left in the repository that cannot be done
yet because it needs the deployed address.

In `index.html`, change `og:image` and `twitter:image` from the relative path
`images/og-preview.png` to the **absolute** deployed URL, for example
`https://the-real-domain.netlify.app/images/og-preview.png`. WhatsApp,
Facebook and X all ignore a relative `og:image`, so until this is done the
link pastes with the title and description but no card. The test accepts
either form, so making this change will not turn the suite red.

While adding the absolute URL, consider adding `og:url` and a
`<link rel="canonical">` with the same origin. Both were left out for the same
reason: there is no deployed URL to put in them yet.
