import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The palette is read out of the stylesheet rather than copied here, so this
// measures what the page actually ships. Retune :root and this test retunes
// with it, which is the point: the 4.5:1 floor is a property of the palette,
// not of one particular set of hex values.
const css = readFileSync(new URL("../assets/style.css", import.meta.url), "utf8");

function token(name) {
  const found = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(found, `style.css defines no --${name}`);
  return found[1].trim();
}

function channels(name) {
  const value = token(name);
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const list = value.match(/^rgb\(var\(--([a-z-]+)\)\)$/);
  if (list) return token(list[1]).split(",").map((n) => Number(n.trim()));
  throw new Error(`--${name} is ${value}, which this test cannot read`);
}

// One dot of the dust field at its darkest point, laid over the page's cream.
// The dot is what a letter can land on, so the dot is what gets measured.
function over(fg, bg, alpha) {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
}

function luminance([r, g, b]) {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The alphas are read from the .dust rule for the same reason the palette is
// read from :root: nobody should be able to darken the dust without this
// number moving.
function dustAlpha(rgbToken) {
  const rule = css.match(/\.dust\s*{[\s\S]*?}/);
  assert.ok(rule, "style.css has no .dust rule");
  const found = rule[0].match(new RegExp(`rgba\\(var\\(--${rgbToken}\\),\\s*([0-9.]+)\\)\\s`));
  assert.ok(found, `the .dust rule has no rgba(var(--${rgbToken}), ...) layer`);
  return Number(found[1]);
}

const cream = channels("cream");
const paperHi = channels("paper-hi");
const paperLo = channels("paper-lo");
const blushSoft = channels("blush-soft");
const blushText = channels("blush-text");
const ink = channels("ink");
const inkSoft = channels("ink-soft");
const blush = channels("blush");

const dustBlush = over(blush, cream, dustAlpha("blush-rgb"));
const dustInk = over(ink, cream, dustAlpha("ink-rgb"));

// Every pair of text colour and the surface under it, including every stop of
// the two paper gradients, because a gradient is three backgrounds wearing one
// declaration and the darkest stop is the one that decides.
const PAIRS = [
  ["names, date, time on the card (lightest stop)", ink, paperHi],
  ["names, date, time on the card (middle stop)", ink, cream],
  ["names, date, time on the card (darkest stop)", ink, paperLo],
  ["venue line, invitation and shloka on the card (lightest stop)", inkSoft, paperHi],
  ["venue line, invitation and shloka on the card (middle stop)", inkSoft, cream],
  ["venue line, invitation and shloka on the card (darkest stop)", inkSoft, paperLo],
  ["blessing and occasion on the card (lightest stop)", blushText, paperHi],
  ["blessing and occasion on the card (middle stop)", blushText, cream],
  ["blessing and occasion on the card (darkest stop)", blushText, paperLo],
  ["countdown digits on a chip (lightest stop)", ink, paperHi],
  ["countdown digits on a chip (darkest stop)", ink, paperLo],
  ["countdown labels on a chip (darkest stop)", inkSoft, paperLo],
  ["body text on bare cream", inkSoft, cream],
  ["body text on a blush dust dot", inkSoft, dustBlush],
  ["body text on an ink dust dot", inkSoft, dustInk],
  ["headings and footer on a blush dust dot", inkSoft, dustBlush],
  ["the passed note on a blush dust dot", blushText, dustBlush],
  ["the passed note on an ink dust dot", blushText, dustInk],
  ["the language toggle on a blush dust dot", inkSoft, dustBlush],
  ["venue name on the tinted band", ink, blushSoft],
  ["venue address and heading on the tinted band", inkSoft, blushSoft],
  ["the map button at rest", ink, blushSoft],
  ["the map button hovered or focused", cream, blushText]
];

test("every text carrying pair measures at least 4.5:1", () => {
  const failures = [];
  for (const [what, fg, bg] of PAIRS) {
    const measured = ratio(fg, bg);
    console.log(`${measured.toFixed(2)}:1  ${what}`);
    if (measured < 4.5) failures.push(`${what} is ${measured.toFixed(2)}:1`);
  }
  assert.deepEqual(failures, [], `below the 4.5:1 floor: ${failures.join("; ")}`);
});
