// Row 12c (D-72 A, Dan 12.11 16:20; lexicon §5.41) — how long an order is kept and where its card lies, in one place:
// the order store (src/lib/order-store.js, the sweeps), the shop's screen (src/scripts/admin.ts) and the privacy page's
// change note + version date (src/i18n/legal.ts) read it. Plain JS, no order data: safe in a page's script.
import { brussels, iso } from './order-core.js';

// KEEP_FROM = the switch day = the day row 12c goes live (Brussels date). An order received from this day on is never
// erased by age: it stays until the customer asks and the shop erases it („Șterge comanda” on /admin). An order received
// before it keeps the 90 days its customer was told (the privacy page until this row) and is erased at day 91.
// If the push lands on another day than this one, this line moves to that day — the store's rule and the page's note
// follow it, nothing else changes.
export const KEEP_FROM = '2026-11-12';
/** the 90 days of an order received before KEEP_FROM (D-24, the privacy page until row 12c) */
export const DAYS_KEPT_BEFORE = 90;

/** received from KEEP_FROM on (its Brussels day): never erased by age */
export const kept = (receivedAt) => iso(brussels(new Date(receivedAt)).day) >= KEEP_FROM;
/** picked up or delivered: the last step */
export const isDone = (status) => status === 'ridicata' || status === 'livrata';

// The list that does not read a file growing without end (row 12c point 2). The store's index (orders/index.json) holds
// the cards the shop works with — every open order (Noi · Confirmate · În lucru · Gata) and the last orders received
// before KEEP_FROM until their 90 days end — so it stays as small as the shop's open work. A kept order that is picked up
// or delivered moves to an archive page: orders/done/<year>-<page>.json, one page per PAGE running numbers of a year
// (SJ-2026-0001…0050 → 2026-001). The page follows from the reference alone, so an erase finds the card without a list.
// The tabs Ridicate and Toate load those pages one at a time, newest first.
export const PAGE = 50;
export const pageOf = (year, n) => `${year}-${String(Math.ceil(n / PAGE)).padStart(3, '0')}`;
/** where a card lies: its archive page (a kept order, picked up or delivered) or the index (every other order) */
export const inPage = (rec) => isDone(rec.status) && kept(rec.receivedAt);
