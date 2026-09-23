import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TIMELINE, envelopeAvailable, playEnvelope } from "../assets/envelope.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/style.css", import.meta.url), "utf8");

// A view object shaped like window, with only the three things envelope.js
// touches. Defaults are a capable browser with motion allowed.
function fakeView({ reduce = false, supports = () => true, matchMedia, css: cssObj } = {}) {
  const timers = [];
  return {
    matchMedia: matchMedia ?? ((q) => ({ matches: q.includes("reduce") ? reduce : false })),
    CSS: cssObj === undefined ? { supports } : cssObj,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    runAll: () => { for (const t of [...timers].sort((a, b) => a.ms - b.ms)) t.fn(); },
    timers
  };
}

test("the envelope is not in the markup, so the invitation is never gated behind it", () => {
  assert.doesNotMatch(html, /envelope/i, "index.html mentions the envelope; it must be built by app.js alone");
});

test("the envelope timeline is monotonic and finishes inside 1.2s to 1.8s", () => {
  const order = ["lit", "unsealed", "open", "clearing", "done"];
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(
      TIMELINE[order[i]] > TIMELINE[order[i - 1]],
      `${order[i]} (${TIMELINE[order[i]]}ms) must come after ${order[i - 1]} (${TIMELINE[order[i - 1]]}ms)`
    );
  }
  assert.ok(TIMELINE.done >= 1200 && TIMELINE.done <= 1800, `total ${TIMELINE.done}ms is outside 1200ms to 1800ms`);
});

test("reduced motion means no envelope at all", () => {
  assert.equal(envelopeAvailable(fakeView({ reduce: true })), false);
});

test("a browser without matchMedia, CSS.supports or rotateX gets no envelope", () => {
  assert.equal(envelopeAvailable({}), false, "no matchMedia");
  assert.equal(envelopeAvailable(undefined), false, "no view at all");
  assert.equal(envelopeAvailable(fakeView({ css: null })), false, "no CSS object");
  assert.equal(envelopeAvailable(fakeView({ supports: () => false })), false, "no rotateX support");
  assert.equal(
    envelopeAvailable(fakeView({ matchMedia: () => { throw new Error("blocked"); } })),
    false,
    "matchMedia that throws"
  );
  assert.equal(envelopeAvailable(fakeView()), true, "a capable browser with motion allowed");
});

test("playEnvelope adds a cover and removes it again with no interaction", () => {
  const made = [];
  const appended = [];
  const root = {
    createElement: (tag) => {
      const el = {
        tag, className: "", attrs: {}, children: [], removed: false,
        classList: { list: new Set(), add(c) { this.list.add(c); } },
        setAttribute(k, v) { this.attrs[k] = v; },
        append(...kids) { this.children.push(...kids); },
        remove() { this.removed = true; }
      };
      made.push(el);
      return el;
    },
    body: { append: (el) => appended.push(el) }
  };

  const view = fakeView();
  const stage = playEnvelope(root, view);

  assert.ok(stage, "a capable browser should get a cover");
  assert.equal(appended.length, 1, "exactly one cover is added to the body");
  assert.equal(stage.attrs["aria-hidden"], "true", "the cover is decorative and hidden from assistive tech");
  assert.equal(stage.removed, false, "the cover is still there before the timers run");
  assert.equal(view.timers.length, 5, "every step is a plain timer, nothing waits on a transition event");

  // No clicks, no taps, no events. Time alone opens it and clears it away.
  view.runAll();
  assert.equal(stage.removed, true, "the cover removes itself with no interaction");
});

test("playEnvelope builds nothing when reduced motion is set", () => {
  const root = {
    createElement: () => assert.fail("no envelope element may be created under reduced motion"),
    body: { append: () => assert.fail("nothing may be added to the body under reduced motion") }
  };
  assert.equal(playEnvelope(root, fakeView({ reduce: true })), null);
});

// The 390px wrap bug was uppercase plus 0.08em tracking in Cormorant Garamond
// turning "With the blessings of" into two awkward centred lines. Sentence
// case is the fix, so a future pass that puts the caps back should turn red.
test("section titles are not set in tracked uppercase", () => {
  const rule = css.match(/\.section__title\s*\{[^}]*\}/);
  assert.ok(rule, "no .section__title rule found");
  assert.doesNotMatch(rule[0], /text-transform:\s*uppercase/, ".section__title is uppercase again");
  const tracking = rule[0].match(/letter-spacing:\s*([\d.]+)em/);
  assert.ok(tracking, ".section__title should still state its letter-spacing explicitly");
  assert.ok(Number(tracking[1]) <= 0.02, `letter-spacing ${tracking[1]}em is too wide for a 360px phone`);
});

// The palette is allowed two hues. A token nothing uses is a name the page has
// not earned, which is how --sage got here in the first place.
test("every custom property declared in :root is used somewhere in the stylesheet", () => {
  const root = css.match(/:root\s*\{[\s\S]*?\}/);
  assert.ok(root, "no :root block found");
  const declared = [...root[0].matchAll(/(--[a-z-]+):/g)].map((m) => m[1]);
  assert.ok(declared.length > 0, "no custom properties declared");
  const unused = declared.filter((name) => !css.includes(`var(${name})`));
  assert.deepEqual(unused, [], `style.css declares tokens nothing uses: ${unused.join(", ")}`);
});
