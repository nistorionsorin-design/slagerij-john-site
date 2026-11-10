// Open chip (D-20, stage 2) — the state logic, shared by OpenChip.astro (the no-script „still” text at
// build) and src/scripts/open-chip.ts (the eight live states in the browser). Pure functions, no DOM.
// Row 11c: the code itself lives in open-state-core.js (plain JavaScript, so the assistant's function api/ask.js runs it
// with no TypeScript step); this file keeps the types and re-exports it typed. Behaviour unchanged.
// Time is always Europe/Brussels wall-clock time, whatever the visitor's own time zone.
// States and their strings: design/css/open-chip.css (lexicon §5.15 points there); the strings live in
// src/i18n/ui.ts `chip`.
import type { Day, Slot, SpecialDay } from '../data/types';
import * as core from './open-state-core.js';

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

/** Minutes before closing time from which the countdown („sluit over N min”) shows (open-chip.css: ≤ 30 min). */
export const SOON: number = core.SOON;

export const toMin: (t: string) => number = core.toMin;

/** Now (or any instant) as a Brussels calendar day + minute. */
export const brussels: (at?: Date, timeZone?: string) => Moment = core.brussels;

/** 0 = Monday … 6 = Sunday */
export const weekday: (d: Date) => number = core.weekday;

/** The hours that hold on a calendar day: its special entry if there is one, else the regular week. */
export const hoursOn: (h: HoursData, d: Date) => { slots: Slot[]; special: boolean } = core.hoursOn;

/** The chip's state at a Brussels moment (open-chip.css, the eight states minus „still”). */
// (the JS core returns the same objects; TypeScript reads its `kind` as a plain string, hence the cast)
export const chipState = core.chipState as unknown as (h: HoursData, at: Moment) => ChipState;
