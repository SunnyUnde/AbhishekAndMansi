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

test("every key in content.js is used by index.html", () => {
  const used = keysUsed(html);
  const orphans = Object.keys(CONTENT.strings).filter((k) => !used.has(k));
  assert.deepEqual(orphans, [], `content.js defines unused keys: ${orphans.join(", ")}`);
});

// Everything index.html spells out for itself, because it has to read as an
// invitation before any script runs. Each one is a copy of a Marathi value in
// content.js, so each one is a drift hazard. Rather than hand-keep a list of
// which elements are seeded (which goes stale the moment someone seeds a new
// one), find them: any element carrying data-i18n whose opening and closing
// tags have non-empty text between them is a seed and must be pinned.
function decodeEntity(whole, body, key) {
  const named = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'" };
  if (named[whole]) return named[whole];
  if (/^#\d+$/.test(body)) return String.fromCodePoint(Number(body.slice(1)));
  if (/^#x[0-9a-fA-F]+$/.test(body)) return String.fromCodePoint(parseInt(body.slice(2), 16));
  throw new Error(`data-i18n="${key}": unrecognised entity ${whole}, cannot verify its text exactly`);
}

function findSeededTexts(source) {
  const openTag = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>/g;
  const seeds = [];
  let m;
  while ((m = openTag.exec(source)) !== null) {
    const [tagText, tagName, key] = m;
    const afterOpen = m.index + tagText.length;
    const nextLt = source.indexOf("<", afterOpen);
    if (nextLt === -1) {
      throw new Error(`data-i18n="${key}": no closing tag found after it`);
    }
    if (!source.startsWith(`</${tagName}>`, nextLt)) {
      // Something other than plain text sits before the closing tag (nested
      // markup, another element). This simple scan cannot safely read text
      // like that, so it must not be treated as if it had none.
      throw new Error(
        `data-i18n="${key}": contains nested markup this test cannot read; ` +
        "extend the extraction rather than ignoring it"
      );
    }
    const raw = source.slice(afterOpen, nextLt);
    if (raw.trim() === "") continue; // filled in by the script only, nothing seeded to pin
    const text = raw.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => decodeEntity(whole, body, key));
    seeds.push({ key, text });
  }
  return seeds;
}

test("the markup an unscripted guest reads matches content.js mr exactly", () => {
  const seeded = findSeededTexts(html);
  assert.ok(seeded.length > 0, "no seeded data-i18n text found in index.html");
  for (const { key, text } of seeded) {
    assert.ok(key in CONTENT.strings, `index.html seeds data-i18n="${key}", which content.js does not define`);
    assert.equal(text, CONTENT.strings[key].mr, `seeded text for ${key} has drifted from content.js`);
  }
});

// A guest with no working script must see an invitation and nothing that looks
// broken. Only startCountdown can fill these in, so only startCountdown may
// show them.
test("the countdown heading and digits start hidden in the markup", () => {
  for (const id of ["countdown-heading", "countdown-units", "countdown-passed"]) {
    const tag = html.match(new RegExp(`<[a-z0-9]+ id="${id}"[^>]*>`));
    assert.ok(tag, `no element with id="${id}"`);
    assert.match(tag[0], /\shidden[\s>]/, `id="${id}" is not hidden in the markup`);
  }
});

// A button whose only job is done by a script must not be on screen before
// that script has run. wireToggle unhides it.
test("the language toggle starts hidden in the markup", () => {
  const tag = html.match(/<button id="lang-toggle"[^>]*>/);
  assert.ok(tag, "no element with id=\"lang-toggle\"");
  assert.match(tag[0], /\shidden[\s>]/, "the language toggle is not hidden in the markup");
  const app = readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
  assert.match(app, /button\.hidden\s*=\s*false/, "nothing in app.js ever unhides the language toggle");
});

// The map link works with no script at all, which means the URL is written
// twice. Pin the copy, the same way the seeded text is pinned.
test("the seeded map link href matches CONTENT.mapUrl exactly", () => {
  const found = html.match(/<a id="map-link"[\s\S]*?href="([^"]*)"/);
  assert.ok(found, "no href found on the map link");
  const href = found[1].replace(/&amp;/g, "&");
  assert.equal(href, CONTENT.mapUrl, "the map link in index.html has drifted from content.js");
  assert.notEqual(href, "#", "the map link must open the venue with no script running");
});

test("the link preview tags match content.js mr exactly", () => {
  const meta = (name) => {
    // The name and the content are not always adjacent: the description tag
    // also carries data-i18n-attr, so app.js can swap it with the language.
    const found = html.match(new RegExp(`<meta (?:property|name)="${name}"[^>]*? content="([^"]*)"`));
    assert.ok(found, `no ${name} meta tag found`);
    return found[1];
  };
  for (const name of ["og:title", "twitter:title"]) {
    assert.equal(meta(name), CONTENT.strings["meta.title"].mr);
  }
  // description is seeded, not left empty for app.js to fill, because the
  // crawlers and link scrapers that read it never run app.js.
  for (const name of ["description", "og:description", "twitter:description"]) {
    assert.equal(meta(name), CONTENT.strings["meta.description"].mr);
  }
  assert.equal(meta("og:image:alt"), CONTENT.strings["meta.title"].mr);
  // Open Graph requires absolute URLs. Every one of them is built from
  // CONTENT.siteUrl, so a domain change stays a one line edit in content.js.
  for (const name of ["og:image", "twitter:image"]) {
    assert.equal(meta(name), `${CONTENT.siteUrl}/images/og-preview.png`);
  }
  assert.equal(meta("og:url"), `${CONTENT.siteUrl}/`);
  assert.equal(meta("robots"), "index, follow");
});

test("the canonical link points at the deployed origin", () => {
  const found = html.match(/<link rel="canonical" href="([^"]*)">/);
  assert.ok(found, "no canonical link found");
  assert.equal(found[1], `${CONTENT.siteUrl}/`);
});

// A third copy of the date, the venue and the coordinates lives in the
// JSON-LD, and it is in the markup rather than built by app.js because the
// crawlers that read it do not run scripts. That makes it the same kind of
// drift hazard as the seeded text, so pin it the same way.
test("the structured data matches content.js exactly", () => {
  const found = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(found, "no application/ld+json script found");
  const ld = JSON.parse(found[1]);

  assert.equal(ld["@type"], "Event");
  assert.equal(ld.name, CONTENT.strings["meta.title"].en);
  assert.equal(ld.description, CONTENT.strings["meta.description"].en);
  assert.equal(ld.startDate, CONTENT.eventISO);
  assert.equal(ld.url, `${CONTENT.siteUrl}/`);
  assert.equal(ld.image, `${CONTENT.siteUrl}/images/og-preview.png`);

  assert.equal(ld.location.name, CONTENT.strings["venue.name"].en);
  assert.equal(ld.location.address, CONTENT.strings["venue.address"].en);
  assert.equal(ld.location.hasMap, CONTENT.mapUrl);

  // The coordinates are written once, inside the Maps URL. Read them back out
  // of it rather than trusting a second hand copy.
  const query = new URL(CONTENT.mapUrl).searchParams.get("query");
  const [lat, lng] = query.split(",").map(Number);
  assert.equal(ld.location.geo.latitude, lat);
  assert.equal(ld.location.geo.longitude, lng);
});

// images/og-preview.png is a raster, so nothing can read it back and check it.
// What can be checked is its source, which is a second copy of the names, the
// occasion, the date and the venue and therefore a drift hazard of exactly the
// kind the seeded markup test exists to catch. If this goes red, edit
// images/og-preview.html and re-render the PNG. images/README.md says how.
test("the link preview card source matches content.js mr exactly", () => {
  const card = readFileSync(new URL("../images/og-preview.html", import.meta.url), "utf8");
  for (const key of ["hero.blessing", "hero.groom", "hero.and", "hero.bride", "hero.occasion", "hero.date", "hero.venueShort"]) {
    assert.ok(
      card.includes(`>${CONTENT.strings[key].mr}<`),
      `og-preview.html does not carry the current ${key}: "${CONTENT.strings[key].mr}"`
    );
  }
});

test("every id app.js passes to getElementById exists in index.html", () => {
  const app = readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
  const ids = new Set(
    [...app.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1])
  );
  const missing = [...ids].filter((id) => !html.includes(`id="${id}"`));
  assert.deepEqual(missing, [], `index.html is missing ids referenced by app.js: ${missing.join(", ")}`);
});
