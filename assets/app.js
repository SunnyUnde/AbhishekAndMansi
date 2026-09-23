import { CONTENT } from "../content.js";
import { resolve, readLang, writeLang, LANGS, DEFAULT_LANG } from "./i18n.js";
import { remaining } from "./countdown.js";
import { playEnvelope } from "./envelope.js";

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
}

function startCountdown(root) {
  const units = root.getElementById("countdown-units");
  const passedNote = root.getElementById("countdown-passed");
  const section = root.getElementById("countdown");
  // The heading and the digits are one state, shown only while there is a
  // count to show. They start hidden in the markup, so a page with no working
  // script never shows them, and "Counting down to the day" is not left
  // standing over a stopped clock once the day has gone.
  const counting = [root.getElementById("countdown-heading"), units];
  const showCounting = (on) => { for (const el of counting) el.hidden = !on; };
  const cells = new Map(
    [...root.querySelectorAll("[data-unit]")].map((el) => [el.dataset.unit, el])
  );

  let intervalId;

  const tick = () => {
    const r = remaining(CONTENT.eventISO, new Date());

    if (!r.valid) {
      section.hidden = true;
      clearInterval(intervalId);
      return;
    }
    if (r.passed) {
      showCounting(false);
      passedNote.hidden = false;
      clearInterval(intervalId);
      return;
    }
    for (const [unit, el] of cells) {
      const next = String(r[unit]);
      // Only touch the DOM when the digits actually change.
      if (el.textContent !== next) el.textContent = next;
    }
    // After the digits are right, never before, so nothing flashes zeroes.
    showCounting(true);
  };

  intervalId = setInterval(tick, 1000);
  tick();
}

function wireToggle(root, initial) {
  let lang = initial;
  const button = root.getElementById("lang-toggle");
  // Only now is there a second language to switch to. It starts hidden in the
  // markup so a scriptless page does not offer a button that does nothing.
  button.hidden = false;
  button.addEventListener("click", () => {
    lang = LANGS.find((candidate) => candidate !== lang) ?? DEFAULT_LANG;
    applyTranslations(root, lang);
    writeLang(window.localStorage, lang);
  });
}

function revealOnScroll(root) {
  const sections = [...root.querySelectorAll("main > section")];

  let observer;
  try {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -10% 0px" });
  } catch {
    // No working observer, so nothing gets hidden either. The page renders
    // fully visible without the reveal animation, which is correct.
    return;
  }

  for (const el of sections) {
    el.classList.add("reveal");
    observer.observe(el);
  }
}

function start() {
  const lang = readLang(window.localStorage);

  document.getElementById("map-link").href = CONTENT.mapUrl;

  applyTranslations(document, lang);
  wireToggle(document, lang);
  startCountdown(document);
  revealOnScroll(document);
  // Last, and never awaited by anything above it. The invitation is finished
  // and on screen before the envelope is laid over it for a moment.
  playEnvelope(document, window);
}

start();
