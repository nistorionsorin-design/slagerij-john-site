// Open chip (D-20, stage 2) — the state logic, shared by OpenChip.astro (the no-script „still” text at
// build) and src/scripts/open-chip.ts (the eight live states in the browser). Pure functions, no DOM.
// Time is always Europe/Brussels wall-clock time, whatever the visitor's own time zone.
// States and their strings: design/css/open-chip.css (lexicon §5.15 points there); the strings live in
// src/i18n/ui.ts `chip`.
import type { Day, Slot, SpecialDay } from '../data/types';

export interface HoursData {
  timeZone?: string;
  regular: Day[];
  special?: SpecialDay[];
}

export type ChipKind =
  | 'open'
  | 'closing-soon'
  | 'closed-today'
  | 'closed-tomorrow'
  | 'closed-day'
  | 'special-open'
  | 'special-closed'
  | 'still';

/** A moment in Brussels: the calendar day (UTC midnight of that date, used only for date arithmetic) + minute of the day. */
export interface Moment { day: Date; min: number }

/** What the chip says, before the strings are applied. */
export type ChipState =
  | { kind: 'open'; close: string }
  | { kind: 'closing-soon'; close: string; left: number }
  | { kind: 'special-open'; close: string }
  | { kind: 'closed-today'; open: string }
  | { kind: 'closed-tomorrow' | 'closed-day' | 'special-closed'; next: Next | null }
  | { kind: 'still'; slots: Slot[] };

/** The next opening after today: in one day („morgen”) or later (a weekday name, 0 = Monday). */
export interface Next { inDays: number; weekday: number; open: string }

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** Minutes before closing time from which the countdown („sluit over N min”) shows (open-chip.css: ≤ 30 min). */
export const SOON = 30;

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Now (or any instant) as a Brussels calendar day + minute. */
export function brussels(at: Date = new Date(), timeZone = 'Europe/Brussels'): Moment {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { day: new Date(Date.UTC(n('year'), n('month') - 1, n('day'))), min: n('hour') * 60 + n('minute') };
}

const addDays = (d: Date, k: number) => new Date(d.getTime() + k * 86400000);
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** 0 = Monday … 6 = Sunday */
export const weekday = (d: Date) => (d.getUTCDay() + 6) % 7;

/** The hours that hold on a calendar day: its special entry if there is one, else the regular week. */
export function hoursOn(h: HoursData, d: Date): { slots: Slot[]; special: boolean } {
  const sp = h.special?.find((s) => s.date === iso(d));
  if (sp) return { slots: sp.slots, special: true };
  return { slots: h.regular.find((r) => r.dayOfWeek === WEEK[weekday(d)])?.slots ?? [], special: false };
}

/** First opening strictly after today, up to two weeks ahead. */
function nextAfterToday(h: HoursData, today: Date): Next | null {
  for (let k = 1; k <= 14; k++) {
    const d = addDays(today, k);
    const { slots } = hoursOn(h, d);
    if (slots.length) return { inDays: k, weekday: weekday(d), open: slots[0].open };
  }
  return null;
}

/** The chip's state at a Brussels moment (open-chip.css, the eight states minus „still”). */
export function chipState(h: HoursData, at: Moment): ChipState {
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
