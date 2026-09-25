import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/style.css", import.meta.url), "utf8");

const ornament = html.match(/<svg class="ornament"[\s\S]*?<\/svg>/);
const dust = html.match(/<div class="dust"[^>]*>([\s\S]*?)<\/div>/);

// The heartbeat is the one thing on the page that is about this couple rather
// than about invitations, and the one thing on the page that says nothing. It
// has to stay that way: decoration a screen reader announces is noise in the
// middle of the date and the time.
test("the heartbeat is decorative: hidden from assistive technology, carrying no text", () => {
  assert.ok(ornament, "index.html has no .ornament svg");
  assert.match(ornament[0], /aria-hidden="true"/, "the heartbeat is not hidden from assistive technology");
  assert.doesNotMatch(ornament[0], />[^<\s][^<]*</, "the heartbeat carries text; it must carry none");
  assert.doesNotMatch(ornament[0], /<(image|use)\b/, "the heartbeat must be a hand written path, not a linked asset");
});

// No image file, no icon font, no dependency: the motif is one path in the
// markup, so it cannot fail to load and cannot cost a request.
test("the heartbeat is one inline path and nothing else", () => {
  const paths = ornament[0].match(/<path\b/g) ?? [];
  assert.equal(paths.length, 1, `the heartbeat is ${paths.length} paths; one is the whole idea`);
  assert.match(ornament[0], /\bpathLength="100"/, "the path does not normalise its length, so the draw cannot be written in percent");
});

// If the animation never runs, for any reason at all, the guest must still see
// a finished line rather than an empty gap between the occasion and the date.
test("the heartbeat rests drawn, so a browser that runs no animation still shows it", () => {
  const rule = css.match(/\.ornament path\s*{[\s\S]*?}/);
  assert.ok(rule, "style.css has no .ornament path rule");
  assert.doesNotMatch(
    rule[0].replace(/\/\*[\s\S]*?\*\//g, ""),
    /stroke-dashoffset/,
    "the resting state hides part of the line; only the keyframes may set stroke-dashoffset"
  );
  assert.match(rule[0], /animation:[^;]*\bbackwards\b/, "the animation does not take its start from backwards fill");
});

// Motion is opt out, everywhere, including decoration.
test("the heartbeat does not animate under reduced motion, and prints without animating", () => {
  for (const query of ["prefers-reduced-motion: reduce", "print"]) {
    const block = css.match(new RegExp(`@media \\(?${query}\\)?\\s*{[\\s\\S]*?\\n}`));
    assert.ok(block, `style.css has no @media ${query} block`);
    assert.match(block[0], /\.ornament path\s*{\s*animation: none;/, `@media ${query} does not stop the heartbeat`);
  }
});

// Static markup, empty, inert and behind everything. It must survive a page
// with no script and must never come between a guest and the map link.
test("the dust field is static, empty markup that cannot take a tap", () => {
  assert.ok(dust, "index.html has no .dust element");
  assert.equal(dust[1].trim(), "", "the dust field carries content; it must carry none");
  assert.match(dust[0], /aria-hidden="true"/, "the dust field is not hidden from assistive technology");
  const rule = css.match(/\.dust\s*{[\s\S]*?}/);
  assert.match(rule[0], /pointer-events: none/, "the dust field can take pointer events");
  assert.match(rule[0], /z-index: -1/, "the dust field is not behind the page content");
});
