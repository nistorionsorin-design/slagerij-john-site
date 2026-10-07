// The bestelbon's rules (stage 5, docs/order-flow.md) — one copy, shared by the page script (src/scripts/order.ts),
// the serverless function (api/order.js) and the build (src/pages/bestellen.astro). Plain JavaScript on purpose: the
// Vercel function imports it as-is, with no TypeScript step. Pure functions, no DOM, no file access: the caller passes
// the data (products.json · hours.json · delivery.json).
// Time is Europe/Brussels wall-clock time, whatever the visitor's zone (as src/lib/open-state.ts, whose few date helpers
// are repeated here because that file is TypeScript).
// Message formats = docs/order-flow.md §5 (NL and RO, verbatim words): „Bestelling SJ-… · Afhalen do 8 okt 10:00 ·
// 2× Colli Varken 1 (€90) · 1 kg Mici · Naam: … · Tel: …” / „Comandă SJ-… · Ridicare joi 8 oct 10:00 · …”.

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_MS = 86400000;

export const toMin = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};
export const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/** An instant as a Brussels calendar day (UTC midnight of that date) + minute of the day. */
export function brussels(at = new Date(), timeZone = 'Europe/Brussels') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at);
  const n = (t) => Number(parts.find((p) => p.type === t)?.value);
  return { day: new Date(Date.UTC(n('year'), n('month') - 1, n('day'))), min: n('hour') * 60 + n('minute') };
}
const addDays = (d, k) => new Date(d.getTime() + k * DAY_MS);
export const iso = (d) => d.toISOString().slice(0, 10);
const fromIso = (s) => new Date(`${s}T00:00:00Z`);
/** 0 = Monday … 6 = Sunday */
const weekday = (d) => (d.getUTCDay() + 6) % 7;

/** The opening slots of a calendar day: its special entry if there is one, else the regular week. */
export function hoursOn(hours, d) {
  const sp = hours.special?.find((s) => s.date === iso(d));
  if (sp) return { slots: sp.slots, special: true };
  return { slots: hours.regular.find((r) => r.dayOfWeek === WEEK[weekday(d)])?.slots ?? [], special: false };
}

/** The first day an order may be for: today + leadDays, one more once the cut-off of today has passed. */
function earliest(cfg, now) {
  const late = cfg.cutoff && now.min >= toMin(cfg.cutoff) ? 1 : 0;
  return addDays(now.day, cfg.leadDays + late);
}

/** Pickup: the next `horizonDays` open days from the earliest day on, each with its times — every `stepMin` minutes
 *  from opening until one step before closing (the old list 08:00–17:30 for a day open 08:00–18:00). */
export function pickupDays(hours, delivery, at = new Date()) {
  const cfg = delivery.pickup;
  const now = brussels(at, hours.timeZone);
  const out = [];
  for (let d = earliest(cfg, now), k = 0; out.length < cfg.horizonDays && k < 60; d = addDays(d, 1), k++) {
    const times = hoursOn(hours, d).slots.flatMap((s) => {
      const t = [];
      for (let m = toMin(s.open); m + cfg.stepMin <= toMin(s.close); m += cfg.stepMin) t.push(fromMin(m));
      return t;
    });
    if (times.length) out.push({ date: iso(d), times });
  }
  return out;
}

/** Delivery: the delivery weekdays (delivery.json `days`) from the earliest day on, at the fixed evening times; a
 *  special day that closes the shop takes the delivery with it. */
export function deliveryDays(hours, delivery, at = new Date()) {
  const now = brussels(at, hours.timeZone);
  const out = [];
  for (let d = earliest(delivery.pickup, now), k = 0; out.length < delivery.pickup.horizonDays && k < 60; d = addDays(d, 1), k++) {
    const h = hoursOn(hours, d);
    if (h.special && !h.slots.length) continue;
    if (delivery.days.includes(WEEK[weekday(d)])) out.push({ date: iso(d), times: [...delivery.times] });
  }
  return out;
}

export const daysFor = (method, hours, delivery, at) =>
  method === 'delivery' ? deliveryDays(hours, delivery, at) : pickupDays(hours, delivery, at);

/** Quantity rule of a product: kg in steps of 0,5 (min 0,5), everything else in whole units; products.json may set
 *  `min` (gourmet „vanaf 2 personen”) or `step`. */
export function qtyRule(p) {
  const step = p.step ?? (p.unit === 'kg' ? 0.5 : 1);
  return { step, min: p.min ?? step, max: p.unit === 'kg' ? 50 : 99 };
}
/** A wanted quantity snapped to the product's rule; 0 = not ordered. */
export function snapQty(p, q) {
  const n = Number(String(q ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const { step, min, max } = qtyRule(p);
  return Math.min(max, Math.max(min, Math.round(n / step) * step));
}

const dec = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));
/** €90 · €12,50 (NL) / 90 € · 12,50 € (RO); `cents` forces two decimals (the slip: €90,00). */
export function money(n, locale = 'nl', cents = false) {
  const v = cents ? n.toFixed(2).replace('.', ',') : dec(n);
  return locale === 'ro' ? `${v} €` : `€${v}`;
}

/** The quantity as the message writes it: „2×” (colli, stuk) · „1 kg” · „4 pers.” · „2 l”. */
export function qtyLabel(q, unit) {
  const n = String(q).replace('.', ',');
  if (unit === 'kg') return `${n} kg`;
  if (unit === 'pers') return `${n} pers.`;
  if (unit === 'liter') return `${n} l`;
  return `${n}×`;
}

const NL_D = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const NL_DAY = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const NL_M = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const NL_MONTH = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const RO_DAY = ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'];
const RO_M = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const RO_MONTH = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

/** „do 9” (the day chip) · „do 9 okt” (the message) · „donderdag 9 oktober” (the slip, the mail). RO: „joi 9” ·
 *  „joi 9 oct” · „joi, 9 octombrie”. */
export function dayLabel(date, locale = 'nl', form = 'short') {
  const d = fromIso(date);
  const w = weekday(d);
  const n = d.getUTCDate();
  const m = d.getUTCMonth();
  if (locale === 'ro') {
    if (form === 'chip') return `${RO_DAY[w].slice(0, 3)} ${n}`;
    if (form === 'short') return `${RO_DAY[w]} ${n} ${RO_M[m]}`;
    return `${RO_DAY[w]}, ${n} ${RO_MONTH[m]}`;
  }
  if (form === 'chip') return `${NL_D[w]} ${n}`;
  if (form === 'short') return `${NL_D[w]} ${n} ${NL_M[m]}`;
  return `${NL_DAY[w]} ${n} ${NL_MONTH[m]}`;
}

/** Delivery for a postcode (+ place, when one postcode holds several places) and a basket total (null = a price is
 *  still unknown): free · fee (beyond a free ring, per km — not computable without the distance) · below the minimum ·
 *  outside the zones („Bel ons”) · unknown (no postcode yet, or the total is not known). */
export function deliveryQuote(delivery, postcode, place, total) {
  const pc = String(postcode ?? '').trim();
  if (!/^\d{4}$/.test(pc)) return { status: 'unknown' };
  const pl = String(place ?? '').trim().toLowerCase();
  const hits = delivery.zones.filter((z) => z.postcode === pc);
  const zone = hits.find((z) => z.place.toLowerCase() === pl) ?? hits[0];
  if (!zone) return { status: 'outside' };
  if (total === null) return { status: 'unknown', ring: zone.ring };
  if (delivery.minimumOrder !== null && total < delivery.minimumOrder) return { status: 'below-minimum', ring: zone.ring, minimum: delivery.minimumOrder };
  const free = delivery.rings.find((r) => zone.ring <= r.km && total >= r.freeFrom);
  return free ? { status: 'free', ring: zone.ring } : { status: 'fee', ring: zone.ring };
}

/** A reference the shop and the customer both quote: SJ-<year>-<4 characters>, no 0/O/1/I. Random, not a counter:
 *  a running number (SJ-2026-0001) needs a store, which waits for D-24. */
export function newRef(at = new Date()) {
  const abc = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const r = new Uint8Array(4);
  globalThis.crypto.getRandomValues(r);
  return `SJ-${brussels(at).day.getUTCFullYear()}-${[...r].map((x) => abc[x % abc.length]).join('')}`;
}

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanBlock = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, max);

/** Reads an order (the page's JSON, or the no-script form mapped to the same shape by api/order.js), checks it against
 *  the data and the clock, and returns the clean order with every price computed here — never the browser's.
 *  `errors` = the field names that need the customer's attention. */
export function readOrder(input, { products, hours, delivery }, at = new Date()) {
  const errors = [];
  const locale = input.lang === 'ro' ? 'ro' : 'nl';
  const method = input.method === 'delivery' ? 'delivery' : 'pickup';

  const byId = new Map(products.items.map((p) => [p.id, p]));
  const lines = [];
  for (const [id, q] of Object.entries(input.items ?? {})) {
    const p = byId.get(id);
    if (!p || p.orderable === false) continue;
    const qty = snapQty(p, q);
    if (!qty) continue;
    lines.push({ id, name: p.name[locale], unit: p.unit, qty, price: p.price, sum: p.price === null ? null : +(p.price * qty).toFixed(2) });
  }
  const requests = (Array.isArray(input.requests) ? input.requests : [input.requests])
    .map((r) => clean(r, 200))
    .filter(Boolean)
    .slice(0, 10);
  if (!lines.length && !requests.length) errors.push('items');

  const days = daysFor(method, hours, delivery, at);
  const day = days.find((d) => d.date === input.date);
  if (!day) errors.push('date');
  else if (!day.times.includes(input.time)) errors.push('time');

  const name = clean(input.name, 80);
  const phone = clean(input.phone, 30);
  const email = clean(input.email, 120);
  if (name.length < 2) errors.push('name');
  if ((phone.match(/\d/g) ?? []).length < 8) errors.push('phone');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push('email');

  const address = method === 'delivery'
    ? { street: clean(input.address?.street, 80), nr: clean(input.address?.nr, 12), postcode: clean(input.address?.postcode, 4), place: clean(input.address?.place, 60) }
    : null;
  if (address) {
    if (!address.street) errors.push('street');
    if (!address.nr) errors.push('nr');
    if (!/^\d{4}$/.test(address.postcode)) errors.push('postcode');
    if (!address.place) errors.push('place');
  }

  const known = lines.every((l) => l.sum !== null);
  const total = known ? +lines.reduce((t, l) => t + l.sum, 0).toFixed(2) : null;
  const quote = address ? deliveryQuote(delivery, address.postcode, address.place, requests.length ? null : total) : null;

  return {
    errors,
    order: {
      ref: /^SJ-\d{4}-[2-9A-HJ-NP-Z]{4}$/.test(input.ref ?? '') ? input.ref : newRef(at),
      locale,
      method,
      date: input.date,
      time: input.time,
      lines,
      requests,
      total,
      quote,
      name,
      phone,
      email,
      remarks: cleanBlock(input.remarks, 600),
      address,
    },
  };
}

/** The address as one line: „Bruggestraat 1, 8750 Wingene”. */
export const addressLine = (a) => (a ? `${a.street} ${a.nr}, ${a.postcode} ${a.place}` : '');

/** One order line for the message: „2× Colli Varken 1 (€90)” · „1 kg Mici” (no price while it is unknown). */
export const lineText = (l, locale) => `${qtyLabel(l.qty, l.unit)} ${l.name}${l.sum === null ? '' : ` (${money(l.sum, locale)})`}`;

/** The WhatsApp text (docs/order-flow.md §5), also the body of the shop's WhatsApp notification. Delivery adds the
 *  address after the moment; a free request goes in „…” among the lines. */
export function waText(o) {
  const ro = o.locale === 'ro';
  const when = `${ro ? (o.method === 'delivery' ? 'Livrare' : 'Ridicare') : o.method === 'delivery' ? 'Levering' : 'Afhalen'} ${o.date ? dayLabel(o.date, o.locale, 'short') : '…'} ${o.time || '…'}`;
  return [
    `${ro ? 'Comandă' : 'Bestelling'} ${o.ref}`,
    o.address ? `${when}, ${addressLine(o.address)}` : when,
    ...o.lines.map((l) => lineText(l, o.locale)),
    ...o.requests.map((r) => `„${r}”`),
    `${ro ? 'Nume' : 'Naam'}: ${o.name || '…'}`,
    `Tel: ${o.phone || '…'}`,
  ].join(' · ');
}
