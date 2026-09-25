import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/style.css", import.meta.url), "utf8");

const ornament = html.match(/<svg class="ornament"[\s\S]*?<\/svg>/);
const dust = html.match(/<div class="dust"[^>]*>([\s\S]*?)<\/div>/);

// The trace is the one thing on the page that is about this couple rather
// than about invitations, and the one thing on the page that says nothing. It
// has to stay that way: decoration a screen reader announces is noise in the
// middle of the date and the time.
test("the trace is decorative: hidden from assistive technology, carrying no text", () => {
  assert.ok(ornament, "index.html has no .ornament svg");
  assert.match(ornament[0], /aria-hidden="true"/, "the trace is not hidden from assistive technology");
  assert.doesNotMatch(ornament[0], />[^<\s][^<]*</, "the trace carries text; it must carry none");
  assert.doesNotMatch(ornament[0], /<(image|use)\b/, "the trace must be a hand written path, not a linked asset");
});

// No image file, no icon font, no dependency: the motif is one path in the
// markup, so it cannot fail to load and cannot cost a request.
test("the trace is one inline path and nothing else", () => {
  const paths = ornament[0].match(/<path\b/g) ?? [];
  assert.equal(paths.length, 1, `the trace is ${paths.length} paths; one is the whole idea`);
  assert.match(ornament[0], /\bpathLength="100"/, "the path does not normalise its length, so the draw cannot be written in percent");
});

// Walks the one path and returns the points it passes through, curves sampled.
// Only the commands the trace is written in are understood: anything else is a
// rewrite the assertions below would silently stop measuring.
function walk(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? [];
  const points = [];
  let i = 0, cmd = null, x = 0, y = 0, lastControl = null;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === "M") { x = num(); y = num(); lastControl = null; points.push([x, y]); continue; }
    if (cmd === "h") { x += num(); lastControl = null; points.push([x, y]); continue; }
    if (cmd === "l") { x += num(); y += num(); lastControl = null; points.push([x, y]); continue; }
    if (cmd === "c" || cmd === "s") {
      const c1 = cmd === "c"
        ? [x + num(), y + num()]
        : [lastControl ? 2 * x - lastControl[0] : x, lastControl ? 2 * y - lastControl[1] : y];
      const c2 = [x + num(), y + num()];
      const end = [x + num(), y + num()];
      for (let step = 1; step <= 24; step++) {
        const t = step / 24, u = 1 - t;
        points.push([
          u ** 3 * x + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * end[0],
          u ** 3 * y + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * end[1]
        ]);
      }
      lastControl = c2; [x, y] = end; continue;
    }
    throw new Error(`the trace uses the command ${cmd}, which this test cannot measure`);
  }
  return points;
}

// The whole point of the divider: two signals on one line, hers first. If a
// later edit trims it back to a bare heartbeat, or lets her wave grow tall
// enough to compete with his spike, the page stops naming them equally and
// nothing else on it would notice.
test("the trace carries both of them: her wave on the left, his beat on the right", () => {
  const [, width, height] = ornament[0].match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
  const baseline = height / 2;
  const points = walk(ornament[0].match(/\sd="([^"]+)"/)[1]);
  const first = points[0], last = points[points.length - 1];

  assert.deepEqual([first[0], first[1]], [0, baseline], "the line does not start at the left edge on the baseline");
  assert.deepEqual([last[0], Math.round(last[1] * 100) / 100], [width, baseline], "the line does not finish at the right edge on the baseline");

  // Runs are the stretches that leave the baseline by more than a hairline,
  // so the flat lead in, the settling segment and the run out are skipped.
  const runs = [];
  for (const [px, py] of points) {
    if (px >= width / 2 || Math.abs(py - baseline) < 3) { if (runs.length && runs.at(-1).open) runs.at(-1).open = false; continue; }
    const side = py < baseline ? "crest" : "trough";
    if (!runs.length || !runs.at(-1).open || runs.at(-1).side !== side) runs.push({ side, peak: 0, open: true });
    runs.at(-1).open = true;
    runs.at(-1).peak = Math.max(runs.at(-1).peak, Math.abs(py - baseline));
  }
  const crests = runs.filter((r) => r.side === "crest").length;
  const troughs = runs.filter((r) => r.side === "trough").length;
  assert.ok(crests >= 2 && troughs >= 2, `her half of the line oscillates ${crests} up and ${troughs} down; two of each is the least that reads as a wave`);

  const wave = Math.max(...points.filter(([px]) => px < width / 2).map(([, py]) => Math.abs(py - baseline)));
  const beat = Math.max(...points.filter(([px]) => px >= width / 2).map(([, py]) => Math.abs(py - baseline)));
  assert.ok(wave < beat, `her wave reaches ${wave} against his ${beat}; the wave must not compete with the spike for height`);
  assert.ok(wave >= beat / 3, `her wave reaches ${wave} against his ${beat}; below a third of him it is a scratch, not a signal`);
});

// If the animation never runs, for any reason at all, the guest must still see
// a finished line rather than an empty gap between the occasion and the date.
test("the trace rests drawn, so a browser that runs no animation still shows it", () => {
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
test("the trace does not animate under reduced motion, and prints without animating", () => {
  for (const query of ["prefers-reduced-motion: reduce", "print"]) {
    const block = css.match(new RegExp(`@media \\(?${query}\\)?\\s*{[\\s\\S]*?\\n}`));
    assert.ok(block, `style.css has no @media ${query} block`);
    assert.match(block[0], /\.ornament path\s*{\s*animation: none;/, `@media ${query} does not stop the trace`);
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
