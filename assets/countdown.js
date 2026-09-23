const DEAD = Object.freeze({
  valid: false, passed: false, days: 0, hours: 0, minutes: 0, seconds: 0
});

const PASSED = Object.freeze({
  valid: true, passed: true, days: 0, hours: 0, minutes: 0, seconds: 0
});

// eventISO carries its own UTC offset, so the result is the same for a
// guest in Ahilyanagar and a guest abroad.
export function remaining(eventISO, now) {
  const target = Date.parse(eventISO);
  if (Number.isNaN(target)) return { ...DEAD };

  let delta = Math.floor((target - now.getTime()) / 1000);
  if (delta <= 0) return { ...PASSED };

  const days = Math.floor(delta / 86400);
  delta -= days * 86400;
  const hours = Math.floor(delta / 3600);
  delta -= hours * 3600;
  const minutes = Math.floor(delta / 60);
  const seconds = delta - minutes * 60;

  return { valid: true, passed: false, days, hours, minutes, seconds };
}
