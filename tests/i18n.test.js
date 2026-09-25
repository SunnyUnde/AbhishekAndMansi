import test from "node:test";
import assert from "node:assert/strict";
import { resolve, findMissing, readLang, writeLang, LANGS, DEFAULT_LANG, STORAGE_KEY } from "../assets/i18n.js";
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
  assert.equal(typeof CONTENT.siteUrl, "string");
  assert.equal(typeof CONTENT.strings, "object");
  assert.ok(CONTENT.strings !== null);
  assert.deepEqual(Object.keys(CONTENT).sort(), ["eventISO", "mapUrl", "siteUrl", "strings"]);
  assert.equal(Object.isFrozen(CONTENT), true);
});

// The ceremony was once listed at the wrong hour and the countdown counted to
// it faithfully. The offset is what makes the instant unambiguous, so an edit
// that drops it, or that leaves a date the browser cannot parse, is the
// failure mode worth catching here rather than on the day.
test("eventISO is a parseable instant carrying an explicit UTC offset", () => {
  assert.match(
    CONTENT.eventISO,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/,
    "eventISO must state its own offset, or it means a different moment in every timezone"
  );
  assert.ok(!Number.isNaN(Date.parse(CONTENT.eventISO)), "eventISO does not parse");
});

// Everything absolute on the page is built by joining a path onto siteUrl, so
// a trailing slash here becomes a double slash in an og:image a scraper may
// refuse, and a bare host becomes a URL Open Graph will not accept at all.
test("siteUrl is an absolute https origin with no trailing slash", () => {
  assert.match(CONTENT.siteUrl, /^https:\/\/[^\s\/]+$/, `siteUrl must be a bare https origin: ${CONTENT.siteUrl}`);
});

// Every placeholder is now filled in. This is what stops a half finished
// invitation reaching a guest's phone, since Netlify runs no tests on deploy.
test("no value in content.js is left as a TODO placeholder", () => {
  const offenders = [];
  const walk = (value, path) => {
    if (typeof value === "string") {
      if (value.startsWith("TODO: ") || value.includes("TODO:")) offenders.push(`${path} = ${value}`);
      return;
    }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    }
  };
  walk(CONTENT, "CONTENT");
  assert.deepEqual(offenders, [], `content.js still carries placeholders:\n${offenders.join("\n")}`);
});

// LANGS is the list every other check iterates, so a typo there would quietly
// stop findMissing from looking at one of the two languages.
test("LANGS is exactly the two languages the site ships", () => {
  assert.deepEqual([...LANGS].sort(), ["en", "mr"]);
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

// The shloka is recited, so the English is a transliteration and not a
// translation, and its verse marks are the ASCII pipes a reciter reads. The
// Devanagari keeps the real dandas: a single one closing the first line and a
// double one closing the verse. Both are deliberate, like the Latin countdown
// digits, and both are exactly the kind of thing a later pass "corrects".
test("the shloka keeps its dandas in Marathi and its pipes in English", () => {
  const one = CONTENT.strings["hero.shlokaOne"];
  const two = CONTENT.strings["hero.shlokaTwo"];
  assert.ok(one.mr.endsWith("।") && !one.mr.endsWith("॥"), "line one must close with a single danda");
  assert.ok(two.mr.endsWith("॥"), "line two must close with a double danda");
  assert.ok(one.en.endsWith(" |") && !one.en.endsWith("||"), "the transliterated line one must close with one pipe");
  assert.ok(two.en.endsWith(" ||"), "the transliterated line two must close with two pipes");
  assert.ok(!/[ऀ-ॿ]/.test(one.en + two.en), "the English shloka must be transliterated, not Devanagari");
});
