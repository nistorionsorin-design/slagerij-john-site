// Open chip (D-20, stage 2) — the state logic in plain JavaScript (row 11c): moved here unchanged from open-state.ts so
// that the Vercel function api/ask.js, which imports the assistant's engine (lib/assistant/engine.js), runs it with no
// TypeScript step (as order-core.js and api/order.js). open-state.ts keeps the types and re-exports these functions
// typed, so OpenChip.astro, src/scripts/open-chip.ts, the views and the engine run the same code.
// Time is always Europe/Brussels wall-clock time, whatever the visitor's own time zone. Pure functions, no DOM.

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** Minutes before closing time from which the countdown („sluit over N min”) shows (open-chip.css: ≤ 30 min). */
export const SOON = 30;

export const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Now (or any instant) as a Brussels calendar day (UTC midnight of that date) + minute of the day. */
export function brussels(at = new Date(), timeZone = 'Europe/Brussels') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const n = (t) => Number(parts.find((p) => p.type === t)?.value);
  return { day: new Date(Date.UTC(n('year'), n('month') - 1, n('day'))), min: n('hour') * 60 + n('minute') };
}

const addDays = (d, k) => new Date(d.getTime() + k * 86400000);
const iso = (d) => d.toISOString().slice(0, 10);
/** 0 = Monday … 6 = Sunday */
export const weekday = (d) => (d.getUTCDay() + 6) % 7;

/** The hours that hold on a calendar day: its special entry if there is one, else the regular week. */
export function hoursOn(h, d) {
  const sp = h.special?.find((s) => s.date === iso(d));
  if (sp) return { slots: sp.slots, special: true };
  return { slots: h.regular.find((r) => r.dayOfWeek === WEEK[weekday(d)])?.slots ?? [], special: false };
}

/** First opening strictly after today, up to two weeks ahead. */
function nextAfterToday(h, today) {
  for (let k = 1; k <= 14; k++) {
    const d = addDays(today, k);
    const { slots } = hoursOn(h, d);
    if (slots.length) return { inDays: k, weekday: weekday(d), open: slots[0].open };
  }
  return null;
}

/** The chip's state at a Brussels moment (open-chip.css, the eight states minus „still”). */
export function chipState(h, at) {
  const { slots, special } = hoursOn(h, at.day);
  const now = slots.find((s) => toMin(s.open) <= at.min && at.min < toMin(s.close));
  if (now) {
    if (special) return { kind: 'special-open', close: now.close };
    const left = toMin(now.close) - at.min;
    return left <= SOON ? { kind: 'closing-soon', close: now.close, left } : { kind: 'open', close: now.close };
  }
  const later = slots.find((s) => toMin(s.open) > at.min);
  if (later) return { kind: 'closed-today', open: later.open };
  const next = nextAfterToday(h, at.day);
  if (special && !slots.length) return { kind: 'special-closed', next };
  return { kind: next && next.inDays > 1 ? 'closed-day' : 'closed-tomorrow', next };
}
