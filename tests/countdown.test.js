import test from "node:test";
import assert from "node:assert/strict";
import { remaining } from "../assets/countdown.js";

const EVENT = "2026-10-24T18:00:00+05:30";

test("counts whole units down to the event", () => {
  // Exactly two days, three hours, four minutes and five seconds earlier.
  const now = new Date(Date.parse(EVENT) - ((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000));
  assert.deepEqual(remaining(EVENT, now), {
    valid: true, passed: false, days: 2, hours: 3, minutes: 4, seconds: 5
  });
});

test("is timezone independent for the caller", () => {
  // The same instant expressed as UTC must give the same answer.
  const utcNow = new Date("2026-10-22T12:30:00Z");
  const istNow = new Date("2026-10-22T18:00:00+05:30");
  assert.deepEqual(remaining(EVENT, utcNow), remaining(EVENT, istNow));
});

test("has not passed one second before the event", () => {
  const now = new Date(Date.parse(EVENT) - 1000);
  const r = remaining(EVENT, now);
  assert.equal(r.passed, false);
  assert.deepEqual([r.days, r.hours, r.minutes, r.seconds], [0, 0, 0, 1]);
});

test("has passed at the exact instant and after", () => {
  assert.equal(remaining(EVENT, new Date(Date.parse(EVENT))).passed, true);
  assert.equal(remaining(EVENT, new Date(Date.parse(EVENT) + 86400000)).passed, true);
});

test("zeroes every unit once passed", () => {
  assert.deepEqual(remaining(EVENT, new Date(Date.parse(EVENT) + 5000)), {
    valid: true, passed: true, days: 0, hours: 0, minutes: 0, seconds: 0
  });
});

test("reports invalid for a malformed or missing timestamp", () => {
  const dead = { valid: false, passed: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  assert.deepEqual(remaining("not a date", new Date()), dead);
  assert.deepEqual(remaining(undefined, new Date()), dead);
});
