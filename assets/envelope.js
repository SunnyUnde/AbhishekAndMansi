// A patrika arriving: a sealed envelope that opens by itself on load and gets
// out of the way. It never holds the invitation. The invitation is already in
// the DOM and already visible; this only draws a cover over it for a moment
// and then takes the cover away. Anything that fails here (no script, no
// matchMedia, no CSS.supports, no 3D transforms, reduced motion) means the
// guest sees the invitation with no envelope, which is the correct outcome.

// Milliseconds from the first paint of the stage. Monotonic, and `done` is the
// moment the cover leaves the DOM, so it is the number that has to stay inside
// the brief's 1.2s to 1.8s window.
export const TIMELINE = Object.freeze({
  lit: 40,        // envelope settles into place, 280ms of fade
  unsealed: 520,  // fully visible and sealed for a beat, then the wax lifts
  open: 760,      // the flap swings up, 620ms of travel
  clearing: 1300, // the cover starts to fade off the invitation
  done: 1720      // the cover is removed entirely
});

export function envelopeAvailable(view) {
  try {
    if (!view || typeof view.matchMedia !== "function") return false;
    if (view.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    const css = view.CSS;
    if (!css || typeof css.supports !== "function") return false;
    // The whole effect is one rotateX on the flap. No rotateX, no envelope.
    return css.supports("transform", "rotateX(180deg)");
  } catch {
    return false;
  }
}

function build(root) {
  const stage = root.createElement("div");
  stage.className = "envelope-stage";
  // Decorative from start to finish: it says nothing a guest needs to hear,
  // and it is gone before anyone could tab to it.
  stage.setAttribute("aria-hidden", "true");

  const envelope = root.createElement("div");
  envelope.className = "envelope";
  for (const part of ["envelope__body", "envelope__pocket", "envelope__flap", "envelope__seal"]) {
    const piece = root.createElement("div");
    piece.className = part;
    envelope.append(piece);
  }
  stage.append(envelope);
  return { stage, envelope };
}

// view is injected so the timers are the page's own, and so a test can drive
// this without a global window.
export function playEnvelope(root, view) {
  if (!envelopeAvailable(view)) return null;

  const { stage, envelope } = build(root);
  root.body.append(stage);

  const at = (ms, run) => view.setTimeout(run, ms);
  at(TIMELINE.lit, () => envelope.classList.add("is-lit"));
  at(TIMELINE.unsealed, () => envelope.classList.add("is-unsealed"));
  at(TIMELINE.open, () => envelope.classList.add("is-open"));
  // Not waiting on transitionend anywhere: a dropped transition event would
  // leave the cover sitting on the invitation forever. Plain timers cannot.
  at(TIMELINE.clearing, () => stage.classList.add("is-clearing"));
  at(TIMELINE.done, () => stage.remove());

  return stage;
}
