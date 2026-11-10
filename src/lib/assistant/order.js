// The assistant's order helper (row 11b; docs/assistant.md §10.2 C · §10.4; D-58 · D-04): the draft order in the
// conversation — add · change · remove · show · start over — and its handover to the bestelbon or WhatsApp, plus
// delivery by town (src/data/towns.json). Plain JavaScript, no DOM, no storage: the engine (engine.js) calls it, the
// caller keeps the draft in the conversation's state (the island: sessionStorage; row 11c: the function's request).
// Every rule is the bestelbon's own (lib/order-core.js): a quantity through qtyRule / snapQty, a day only from daysFor,
// the slip by readOrder + lineText + totalLabel, the WhatsApp text by waText — so the order that reaches the form is
// the order of the conversation. Strings: lexicon §5.34 / §6 „Asistent, comanda, 10.11” (src/i18n/assistant.ts `o`).
// What it never does: submit an order, ask for or keep a name, phone number or address (§10.2 C), turn pieces into
// kilos (the weight of a piece is not on file), compute a delivery fee (the shop confirms it), or promise stock.
import { norm, words, same, find } from './normalize.js';
import { fill, textLine, reply, listOf, handoff, waHref, plain } from './say.js';
import { qtyRule, snapQty, qtyLabel, dayLabel, daysFor, hoursOn, brussels, iso, money, totalLabel, lineText, readOrder, waText, menuOpen, newRef, toMin } from '../order-core.js';

const DAY_MS = 86400000;
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const weekday = (d) => (d.getUTCDay() + 6) % 7;
const fromIso = (s) => new Date(`${s}T00:00:00Z`);
const split = (s) => (s ? s.split(' ') : []);
const uniq = (a) => [...new Set(a)];
const set = (s) => new Set(s.split(' '));

// ——— words (language knowledge, not copy): normalised as normalize.js `norm` writes them ———
const KG = set('kg kgs kilo kilos kilootje kilogram kilogrammen kilograms kil kile kilograme kilogramul kilu');
const GR = set('g gr gram grammen grams grame gramul gramm');
const PIECE = set('stuk stuks stukken stukjes stukje bucata bucati buc bucatele');
const PERS = set('personen persoon pers pp mensen persoane persoana oameni');
const NUM = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, vijftien: 15, twintig: 20, dertig: 30, un: 1, unu: 1, una: 1, doi: 2, doua: 2, trei: 3, patru: 4, cinci: 5, sase: 6, sapte: 7, opt: 8, noua: 9, zece: 10, douazeci: 20 };
const FRAC = { half: 0.5, halve: 0.5, halfje: 0.5, anderhalf: 1.5, anderhalve: 1.5, jumatate: 0.5, kwart: 0.25, sfert: 0.25 };
const MONTHS = set('januari februari maart april mei juni juli augustus september oktober november december jan feb mrt apr jun jul aug sep sept okt nov dec ianuarie februarie martie aprilie mai iunie iulie august septembrie octombrie noiembrie decembrie ian iun iul oct');
// the words that may stand between a quantity and its product („2 kg de mici”, „gourmet luxe voor 8”)
const FILL = set('de van aan a x voor pentru din');
const TIME_BEFORE = set('om tegen rond ora orele');
const TIME_AFTER = set('u uur uren h ora');

/** an order is asked for („zet … klaar”, „graag”, „ik wil”, „pune”, „vreau” …) */
const ORDER = set('bestel bestellen zet zetten klaarzetten klaarleggen reserveer reserveren wil wilt wou graag neem nemen doe geef mag leg pune puneti pregatiti pregatesti vreau vrem doresc dorim comand comandam rezerv rezervati iau luam dati adauga adaugati');
/** asking to order, no product yet („Help mij bestellen”, „Ajută-mă să comand”) */
const START = set('bestel bestellen bestelhulp comand comandam');
/** a question about a thing, not an order of it („hoeveel kost 2 kg gehakt?”) */
const QUESTION = set('wat hoe hoeveel welke welk waar wanneer waarom hebben heeft hebt kost kosten prijs prijzen ce cum cat cata cate care unde cand aveti costa pret preturi exista');
/** „ik wil weten …”: a question in an order's clothes */
const ASKING = set('weten vragen vraag stiu intreb intrebare');
/** a party, a quote: the traiteur's (row 6), never the order helper's */
const PARTY = set('traiteur catering offerte feest verjaardag communie trouw huwelijk petrecere nunta botez aniversare');
const SHOW_VERB = set('toon tonen laat zien bekijk overzicht arata aratati vezi vad afiseaza');
const SHOW_OBJ = set('bon bestelbon bestelling bestellingen lijst lijstje mandje comanda comenzii bonul cos');
const REMOVE = set('eraf weg verwijder verwijderen schrap schrappen scoate scoateti sterge stergeti elimina renunt renunta');
const INC = set('nog erbij extra bij mai inca plus');
const SET_TO = set('maak maken liever verander veranderen wijzig aanpassen wordt fa schimba modifica');
const PICKUP = set('afhalen afhaal afhaling ophalen ophaal afgehaald ridicare ridic ridica ridicam ridicat');
const DELIVER = set('leveren levering levert geleverd leveringen bezorgen bezorgd bezorging thuislevering livrare livrati livrat livreaza livrezi aduceti aduci');
/** words for „come to” that mean delivery only for a town in the delivery rings (≤ 20 km): „komen jullie tot gent?”
 *  is the barbecue at home (up to 200 km, the bank's traiteur-distance) */
const COME = set('komen komt rijden veniti venit');
const HOURS = set('open geopend gesloten dicht openingsuren uren deschis inchis program orar');

// ——— the index, once ———

const shape = (p) => ({
  id: p.id,
  category: p.c ?? null,
  name: p.n,
  ...(p.al ? { alias: { ro: p.al } } : {}),
  unit: p.u,
  price: p.pr,
  ...(p.ps ? { priceInStore: true } : {}),
  ...(p.mn !== undefined ? { min: p.mn } : {}),
  ...(p.st !== undefined ? { step: p.st } : {}),
});

/** The order helper's working form of the index: every orderable row by id (the counter's and the holiday menu's), the
 *  data in the shape order-core.js reads, the phrases as word lists. */
export function prepareOrder(ix) {
  const o = ix.order;
  if (!o || o._ready) return;
  const m = o.menu;
  for (const r of m?.rows ?? []) {
    r.phw = r.ph.map(split);
    r.menu = m.id;
  }
  for (const t of o.towns) t.phw = t.ph.map(split);
  o._byId = new Map([...ix.p.map((p) => [p.id, p]), ...(m?.rows ?? []).map((r) => [r.id, r])]);
  o._shape = new Map([...o._byId.values()].map((p) => [p.id, shape(p)]));
  o._data = {
    products: { items: ix.p.map((p) => o._shape.get(p.id)) },
    hours: ix.hours,
    delivery: o.delivery,
    menus: { menus: m ? [{ id: m.id, param: m.param, deadline: m.deadline, pickup: m.pickup, name: m.name, message: m.message, pickupOnly: m.pickupOnly, mail: m.mail, items: m.rows.map((r) => o._shape.get(r.id)) }] : [] },
  };
  o._ready = true;
}

/** a new draft: lines [[id, qty], …] in the order they were added, pickup or delivery, the day, the reference the
 *  WhatsApp text quotes, the question waiting for its answer (`q`), whether the discount note was said */
export const newDraft = () => ({ items: [], mode: null, day: null, want: null, ref: null, q: null, disc: false, last: null, asked: 0 });
const copy = (d) => ({ ...newDraft(), ...(d ?? {}), items: (d?.items ?? []).map(([id, q]) => [id, q]) });
export const hasLines = (d) => !!d?.items?.length;

const isMenuRow = (ix, id) => !!ix.order.menu?.rows.some((r) => r.id === id);
/** the open holiday menu the draft takes rows from, or null */
function draftMenu(ix, d, at) {
  const m = ix.order.menu;
  if (!m || !menuOpen(m, at, ix.hours.timeZone)) return null;
  return d.items.some(([id]) => isMenuRow(ix, id)) ? m : null;
}
const onMenuPage = (ix, path) => !!path && Object.values(ix.order.paths?.eindejaar ?? {}).includes(path);

// ——— reading a message ———

/** decimals and halves as one word each before `words` splits them: „1,5 kg” → „1d5 kg”, „½” → „0d5” */
const prep = (raw) =>
  String(raw)
    .replace(/½/g, ' 0d5 ')
    .replace(/(^|\D)1\s*\/\s*2(?!\d)/g, '$10d5')
    .replace(/(^|\D)1\s*\/\s*4(?!\d)/g, '$10d25')
    .replace(/(\d)\s*[.,]\s*(\d)/g, '$1d$2');
const num = (s) => Number(String(s).replace('d', '.'));
const unitOf = (w) => (KG.has(w) ? 'kg' : GR.has(w) ? 'g' : PIECE.has(w) ? 'stuk' : PERS.has(w) ? 'pers' : null);

/** the quantities of a text: { at, end, n, u (kg · g · stuk · pers · null = a bare number), word } — never a time
 *  („om 10”, „12 00”), a date („24 december”), a postcode or a year, nor a word inside a product's name */
function quantities(T, taken) {
  const out = [];
  for (let i = 0; i < T.length; i++) {
    if (taken[i]) continue;
    const t = T[i];
    let n = null;
    let u = null;
    let len = 1;
    let m;
    if ((m = /^(\d+(?:d\d+)?)(kg|kilo|g|gr|gram)$/.exec(t))) {
      n = num(m[1]);
      u = m[2].startsWith('g') ? 'g' : 'kg';
    } else if ((m = /^(\d+)x$|^x(\d+)$/.exec(t))) n = Number(m[1] ?? m[2]);
    else if (/^\d+(?:d\d+)?$/.test(t)) n = num(t);
    else if (NUM[t] !== undefined) n = NUM[t];
    else if (FRAC[t] !== undefined) n = FRAC[t];
    else if (t === 'o' && unitOf(T[i + 1])) n = 1;
    if (n === null || !(n > 0)) continue;
    // „een halve kilo”, „o jumătate”: the article and the half are one quantity
    if (['een', 'un', 'o'].includes(t) && FRAC[T[i + 1]] !== undefined && !taken[i + 1]) {
      n = FRAC[T[i + 1]];
      len = 2;
    }
    const prev = T[i - 1];
    const next = T[i + len];
    if (TIME_BEFORE.has(prev)) continue;
    if (next && (TIME_AFTER.has(next) || MONTHS.has(next) || (/^\d+$/.test(t) && /^(00|15|30|45)$/.test(next)))) continue;
    if (/^\d{4,}$/.test(t) && !GR.has(next)) continue;
    let j = i + len;
    if (!u) {
      let k = j;
      if (T[k] === 'de' && unitOf(T[k + 1])) k++;
      const w = unitOf(T[k]);
      if (w && !taken[k]) {
        u = w;
        j = k + 1;
      }
    }
    // „anderhalve kilo” is said, but so is „een kilo en een half” / „un kilogram și jumătate”
    if (u === 'kg' && T[j] === 'en' && T[j + 1] === 'een' && T[j + 2] === 'half') {
      n += 0.5;
      j += 3;
    } else if (u === 'kg' && ((T[j] === 'en' && T[j + 1] === 'half') || (T[j] === 'si' && T[j + 1] === 'jumatate'))) {
      n += 0.5;
      j += 2;
    }
    // „voor 8”, „pentru 8”: persons
    if (!u && (prev === 'voor' || prev === 'pentru')) u = 'pers';
    out.push({ at: i, end: j, n, u, word: NUM[t] !== undefined || FRAC[t] !== undefined || t === 'o' });
    i = j - 1;
  }
  return out;
}

/** each quantity to its product: the product right after it (a word like „de” between), else the one right before it
 *  („gourmet luxe voor 8”); a number word („twee”, „een”) only right before a product */
function bind(qs, spans, T) {
  const between = (a, b) => T.slice(a, b).every((w) => FILL.has(w));
  for (const q of qs) {
    let s = spans.find((x) => !x.q && x.at >= q.end && x.at - q.end <= (q.word && !q.u ? 0 : 2) && between(q.end, x.at));
    if (!s && !(q.word && !q.u)) s = [...spans].reverse().find((x) => !x.q && x.at + x.len <= q.at && q.at - (x.at + x.len) <= 1 && between(x.at + x.len, q.at));
    if (s) {
      s.q = q;
      q.s = s;
    }
  }
}

/** the holiday menu's rows a text names (on the Eindejaar page they win): longest first; a word two rows share asks */
function menuSpans(ix, T) {
  const m = ix.order.menu;
  const hits = [];
  for (const r of m.rows) for (const ph of r.phw) for (const f of find(T, ph)) hits.push({ id: r.id, ...f, ph: ph.join(' ') });
  hits.sort((a, b) => b.len - a.len || Number(b.exact) - Number(a.exact) || a.at - b.at);
  const taken = new Array(T.length).fill(false);
  const spans = [];
  for (const h of hits) {
    const s = spans.find((x) => x.at === h.at && x.len === h.len);
    if (s) {
      if (!s.ids.includes(h.id)) s.ids.push(h.id);
      continue;
    }
    if (taken.slice(h.at, h.at + h.len).some(Boolean)) continue;
    for (let k = h.at; k < h.at + h.len; k++) taken[k] = true;
    spans.push({ at: h.at, len: h.len, ids: [h.id], ph: h.ph });
  }
  for (const s of spans) if (s.len === 1 && m.generic[s.ph]) s.ids = uniq([...s.ids, ...m.generic[s.ph]]);
  for (let i = 0; i < T.length; i++) if (!taken[i] && m.generic[T[i]]) spans.push({ at: i, len: 1, ids: m.generic[T[i]], ph: T[i] });
  for (const s of spans) s.generic = s.ids.length > 1;
  return spans.sort((a, b) => a.at - b.at);
}

/** the method a text names: pickup · delivery · both („leveren jullie, of haal ik af?”) · null */
function methodIn(T) {
  const t = ` ${T.join(' ')} `;
  const pick = T.some((w) => PICKUP.has(w)) || / haal (ik |het |de |dat )?af | kom (ik |het )?halen | vin (sa |eu )?(iau|ridic) /.test(t);
  const del = T.some((w) => DELIVER.has(w)) || / aan huis | la domiciliu | acasa /.test(t);
  return pick && del ? 'both' : pick ? 'pickup' : del ? 'delivery' : null;
}

/** a name, a phone number, an address or an e-mail address typed in the box (§5.34: the text is not kept) */
function personal(raw, inOrder) {
  const s = String(raw);
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(s)) return true;
  if (/(?:^|[^\d])(?:(?:\+|00)\d{2,3}[\s./-]?\d(?:[\s./-]?\d){6,11}|0\d(?:[\s./-]?\d){7,9})(?!\d)/.test(s)) return true;
  const n = ` ${norm(s)} `;
  if (/ (mijn naam|ik heet|numele meu|ma numesc|mijn adres|adresa mea|ik woon|locuiesc|mijn telefoon|mijn gsm|telefonul meu) /.test(n)) return true;
  if (/ (naam|nume|adres|adresa|tel|telefoon|gsm) /.test(n) && /:/.test(s)) return true;
  return inOrder && /\p{L}+(straat|laan|steenweg|dreef|plein|weg)\s+\d+/iu.test(s);
}

// ——— the order's own words ———

const chipsFor = (ix, L, p) => {
  const c = ix.s[L].o.chips;
  const labels = p.u === 'kg' ? c.kg : p.u === 'stuk' ? c.stuk : p.u === 'pers' ? c.pers : c.other;
  return labels.map((label) => ({ label, pick: `qty:${num(label.replace(',', 'd').match(/[\dd]+/)[0])}` }));
};
const dayChips = (L, list) => list.slice(0, 3).map((x) => ({ label: dayLabel(x.date, L, 'short'), pick: `day:${x.date}` }));
const methodChips = (ix, L) => [
  { label: ix.s[L].o.pickup, pick: 'mode:pickup' },
  { label: ix.s[L].o.delivery, pick: 'mode:delivery' },
];

/** the bestelbon's own reading of the draft: lines, total, in-store rows (order-core.js readOrder, no customer data) */
function slipOrder(ix, d, L, at) {
  return readOrder({ lang: L, method: d.mode ?? 'pickup', date: d.day ?? '', time: '', items: Object.fromEntries(d.items), requests: [], ref: d.ref ?? '' }, ix.order._data, at).order;
}

/** the slip in the conversation: §5.34 title · lineText · „Afhalen / Levering + the day” · Totaal · the weighed line */
function slip(ix, L, d, at) {
  const s = ix.s[L];
  const o = slipOrder(ix, d, L, at);
  const notes = [];
  if (o.lines.some((l) => l.unit === 'kg')) notes.push(s.o.weighed);
  if (o.inStore && !o.lines.every((l) => l.inStore)) notes.push(s.slip.inStoreNote ?? '');
  return {
    title: s.o.slipTitle,
    lines: o.lines.map((l) => lineText(l, L)),
    when: d.mode ? `${d.mode === 'delivery' ? s.o.delivery : s.o.pickup}${d.day ? ` ${dayLabel(d.day, L, 'long')}` : ''}` : null,
    total: plain(s.o.total, { total: totalLabel(o, { tbc: s.slip.tbc, inStore: s.slip.inStore }) }),
    notes: notes.filter(Boolean),
  };
}

/** „Naar de bestelbon”: /bestellen?add=<id>:<qty>,…&day=…&mode=… (RO /ro/comanda; a menu order opens with menu=…) */
export function formHref(ix, L, d, at) {
  const base = ix.order.paths.bestellen[L];
  const m = draftMenu(ix, d, at);
  const q = [];
  if (m) q.push(`menu=${m.param}`);
  q.push(`add=${d.items.map(([id, n]) => `${id}:${+Number(n).toFixed(3)}`).join(',')}`);
  if (d.day) q.push(`day=${d.day}`);
  if (d.mode) q.push(`mode=${d.mode}`);
  return `${base}?${q.join('&')}`;
}
/** „Via WhatsApp”: the bestelbon's own WhatsApp text of the same draft (order-core.js waText), through /wa?src=qa-order */
export function waOrder(ix, L, d, at) {
  const o = slipOrder(ix, d, L, at);
  return waText({ ...o, address: null, date: d.day ?? '', time: '' });
}
const waOrderHref = (ix, L, d, at) => `/wa?src=qa-order&text=${encodeURIComponent(waOrder(ix, L, d, at))}${L === 'ro' ? '&lang=ro' : ''}`;

/** the ready block: the slip, „Uw bestelling staat klaar. U plaatst ze zelf:”, the two buttons, the name-and-phone line */
function ready(ix, r, L, d, at) {
  const o = ix.s[L].o;
  r.slip = slip(ix, L, d, at);
  r.lines.push(fill(o.ready));
  r.acts.push({ kind: 'form', label: o.toForm, href: formHref(ix, L, d, at) });
  r.acts.push({ kind: 'wa', label: o.toWa, href: waOrderHref(ix, L, d, at), order: true });
  r.foot.push(fill(o.formNote));
}

// ——— the steps ———

/** the quantity a message gives for a product, in the product's unit — or the question to ask */
function qtyFor(ix, p, q, pend) {
  const unit = p.u;
  if (!q) return { ask: isMenuRow(ix, p.id) && unit === 'pers' ? 'persons' : 'qty' };
  const { n, u } = q;
  if (u === 'g') return unit === 'kg' ? { n: n / 1000 } : { ask: unit === 'stuk' ? 'unit' : 'qty' };
  if (u === 'kg') return unit === 'kg' ? { n } : { ask: unit === 'stuk' ? 'unit' : 'qty' };
  if (u === 'stuk' || u === 'pers') return unit === 'kg' ? { ask: 'unit' } : unit === 'stuk' && u === 'pers' ? { ask: 'qty' } : { n };
  // a bare number: pieces, persons, colli … in the product's own unit; for a per-kilo product only once the question
  // „Hoeveel kilo wilt u?” is out, or with decimals (never 20 mici as 20 kg)
  if (unit === 'kg') return pend === 'unit' || !Number.isInteger(n) ? { n } : { ask: 'unit' };
  return { n };
}

/** put a quantity on the draft (add, or change a line already on it); the lines it says */
function apply(ctx, d, p, n, rel) {
  const { ix, L, at } = ctx;
  const o = ix.s[L].o;
  const sh = ix.order._shape.get(p.id);
  const at0 = d.items.findIndex(([id]) => id === p.id);
  const cur = at0 >= 0 ? d.items[at0][1] : 0;
  const want = rel === 'inc' && cur ? cur + n : n;
  const q = snapQty(sh, want);
  if (at0 >= 0) d.items[at0][1] = q;
  else d.items.push([p.id, q]);
  d.last = p.id;
  d.q = null;
  d.ref ??= newRef(at);
  const lines = [fill(cur ? o.changed : o.added, { qty: qtyLabel(q, p.u, L), product: p.n[L] })];
  const rule = qtyRule(sh);
  if (q !== +want.toFixed(3) && want < rule.max) lines.push(fill(o.snapped, { qty: qtyLabel(q, p.u, L), step: qtyLabel(want < rule.min ? rule.min : rule.step, p.u, L) }));
  // the §5.19 note, once, from 3 kg of one product (as the bestelbon shows it under a kg row)
  if (p.u === 'kg' && q >= 3 && !d.disc) {
    d.disc = true;
    lines.push(textLine(ix.s[L].discount));
  }
  return { lines, kind: cur ? 'change' : 'add' };
}

/** the question for a product's quantity: „Hoeveel {product} wilt u?” · „… verkopen wij per kilo …” · „Voor hoeveel
 *  personen?” — with its chips; the draft remembers which product the answer is for */
function askFor(ix, L, d, p, kind) {
  const o = ix.s[L].o;
  d.q = { k: kind, id: p.id };
  if (kind === 'persons') return { line: fill(o.persons), chips: o.personsChips.map((label) => ({ label, pick: `qty:${label}` })), kind };
  if (kind === 'unit' && (p.u === 'kg' || p.u === 'stuk')) return { line: fill(p.u === 'kg' ? o.perKg : o.perPiece, { product: p.n[L] }), chips: chipsFor(ix, L, p), kind };
  return { line: fill(o.howMuch, { product: p.n[L] }), chips: chipsFor(ix, L, p), kind: 'qty' };
}

/** why a day cannot (lexicon §5.34 {reason}): too late · closed · no delivery on Sunday · too far ahead */
function why(ix, date, mode, at) {
  const now = brussels(at, ix.hours.timeZone);
  const cfg = ix.order.delivery.pickup;
  const first = new Date(now.day.getTime() + (cfg.leadDays + (cfg.cutoff && now.min >= toMin(cfg.cutoff) ? 1 : 0)) * DAY_MS);
  const d = fromIso(date);
  if (d < first) return 'late';
  if (!hoursOn(ix.hours, d).slots.length) return 'closed';
  if (mode === 'delivery' && !ix.order.delivery.days.includes(WEEK[weekday(d)])) return 'sunday';
  return 'far';
}
const daysOf = (ix, d, mode, at) => daysFor(mode, ix.hours, ix.order.delivery, at, draftMenu(ix, d, at));

/** pickup or delivery on the draft: a holiday-menu order is collected in the shop; delivery under the €50 minimum
 *  stays open (pickup is always possible) */
function setMethod(ctx, d, m, ev) {
  const { ix, L, at } = ctx;
  const o = ix.s[L].o;
  const menu = draftMenu(ix, d, at);
  if (menu) {
    if (m !== 'pickup') ev.lines.push(textLine(menu.pickupOnly[L]));
    d.mode = 'pickup';
    ev.method = 'menu';
  } else if (m === 'both') {
    ev.prompt = 'method';
    return;
  } else if (m === 'delivery' && hasLines(d)) {
    const or = slipOrder(ix, d, L, at);
    const min = ix.order.delivery.minimumOrder;
    const unsure = or.total === null || or.inStore;
    if (min !== null && (or.total ?? 0) < min) {
      if (unsure) {
        ev.lines.push(fill(o.minInStore));
        d.mode = 'delivery';
        ev.method = 'ok';
      } else {
        ev.lines.push(fill(o.min));
        ev.method = 'min';
        ev.chips = methodChips(ix, L);
        return;
      }
    } else {
      d.mode = 'delivery';
      ev.method = 'ok';
    }
  } else {
    d.mode = m;
    ev.method = 'ok';
  }
  if (d.mode && d.day && !daysOf(ix, d, d.mode, at).some((x) => x.date === d.day)) {
    d.want = d.day;
    d.day = null;
  }
  if (d.mode && d.want) setDay(ctx, d, d.want, ev);
}

/** the day on the draft — only a day the bestelbon would offer (daysFor); another day gets its reason and the next
 *  valid days; without the method yet, the day waits for it */
function setDay(ctx, d, date, ev) {
  const { ix, L, at } = ctx;
  const o = ix.s[L].o;
  if (!d.mode) {
    d.want = date;
    ev.prompt = 'method';
    return;
  }
  const list = daysOf(ix, d, d.mode, at);
  d.want = null;
  if (list.some((x) => x.date === date)) {
    d.day = date;
    ev.day = 'ok';
    return;
  }
  d.day = null;
  ev.day = 'invalid';
  ev.chips = dayChips(L, list);
  const menu = draftMenu(ix, d, at);
  if (menu) ev.lines.push(textLine(menu.pickupOnly[L]));
  else ev.lines.push(fill(o.dayNo, { day: dayLabel(date, L, 'long'), reason: o.why[why(ix, date, d.mode, at)], list: listOf(ix, L, list.slice(0, 3).map((x) => dayLabel(x.date, L, 'long'))) }));
}

/** the end of a turn: the next question (the method, then the day) or the ready block; the intent the turn reports */
function finish(ctx, d, ev) {
  const { ix, L, at } = ctx;
  const o = ix.s[L].o;
  const r = reply(L);
  r.lines.push(...ev.lines);
  if (ev.slip) r.slip = slip(ix, L, d, at);
  let intent = ev.intent;
  if (ev.ask) {
    r.lines.push(ev.ask.line);
    r.chips = ev.ask.chips;
    intent = ev.ask.kind === 'unit' ? 'order-ask-unit' : ev.ask.kind === 'persons' ? 'menu-ask-persons' : 'order-ask-qty';
  } else if (ev.clarify) {
    r.lines.push(fill(ix.s[L].t.clarify));
    r.chips = ev.clarify.chips;
    intent = 'clarify';
  } else {
    if (ev.day === 'invalid') intent = 'order-day-invalid';
    else if (ev.day === 'ok') intent = 'order-day';
    else if (ev.method === 'min') intent = 'order-min';
    else if (ev.method) intent = 'order-method';
    if (ev.chips) r.chips = ev.chips;
    else if (hasLines(d) && !ev.quiet) {
      // the next step: pickup or delivery, then the day, then the order is ready to place
      if (!d.mode && (ev.prompt === 'method' || !(d.asked & 1))) {
        d.asked |= 1;
        d.q = { k: 'method' };
        r.lines.push(fill(o.method));
        r.chips = methodChips(ix, L);
      } else if (d.mode && !d.day && (ev.method || !(d.asked & 2))) {
        d.asked |= 2;
        d.q = { k: 'day' };
        r.lines.push(fill(o.day));
        r.chips = dayChips(L, daysOf(ix, d, d.mode, at));
      } else if (d.mode && d.day) {
        if (ev.day === 'ok') r.lines.push(fill(o.hour));
        ready(ix, r, L, d, at);
      }
    }
  }
  return { r, dbg: { intent, draft: d, product: d.last ?? undefined, dynamic: 'order', handoff: 'none', ...(ev.dbg ?? {}) } };
}

const blank = () => ({ lines: [], intent: null, ask: null, clarify: null, method: null, day: null, prompt: null, chips: null, slip: false, quiet: false, dbg: null });

/** a product named with what the message says of it → the draft (or the question back) */
function take(ctx, d, p, q, rel, ev) {
  const got = qtyFor(ctx.ix, p, q, d.q?.id === p.id ? d.q.k : null);
  if (got.ask) {
    ev.ask ??= askFor(ctx.ix, ctx.L, d, p, got.ask);
    return;
  }
  const res = apply(ctx, d, p, got.n, rel);
  ev.lines.push(...res.lines);
  ev.intent = res.kind === 'change' || ev.intent === 'order-change' ? 'order-change' : 'order-add';
  if (isMenuRow(ctx.ix, p.id) && !d.mode) {
    // a holiday-menu row: collected in the shop, on the menu's own days (lexicon §5.22 / §5.34)
    ev.lines.push(textLine(ctx.ix.order.menu.pickupOnly[ctx.L]));
    d.mode = 'pickup';
    d.asked |= 1;
  }
}

/**
 * The order helper's turn, or null when the message is not about the order (the engine answers it).
 * @param ctx  the engine's turn: { ix, st, L, raw, here, at, now, kit: { spans, clarify, days } }
 * @param best the answer bank's best entry for the message (an order start yields to a strong bank answer)
 */
export function orderTurn(ctx, best) {
  const { ix, st, L, raw, here, at, kit } = ctx;
  prepareOrder(ix);
  if (!ix.order) return null;
  const d = copy(st.draft);
  const T = words(prep(raw));
  const ev = blank();
  const o = ix.s[L].o;
  if (personal(raw, hasLines(d))) {
    const r = reply(L);
    r.lines.push(fill(o.personal));
    return { r, dbg: { intent: 'order-personal', draft: d, dynamic: 'order', handoff: 'none' } };
  }
  const menuCtx = (onMenuPage(ix, here) || d.items.some(([id]) => isMenuRow(ix, id))) && ix.order.menu && menuOpen(ix.order.menu, at, ix.hours.timeZone);
  let spans = menuCtx ? menuSpans(ix, T) : [];
  if (!spans.length) spans = kit.spans(T);
  const taken = new Array(T.length).fill(false);
  for (const s of spans) for (let k = s.at; k < s.at + s.len; k++) taken[k] = true;
  const qs = quantities(T, taken);
  bind(qs, spans, T);
  const nt = ` ${T.join(' ')} `;
  const has = (S) => T.some((w) => S.has(w));
  const question = has(QUESTION) || has(ASKING);
  const mark = /\?/.test(raw);
  const cue = has(ORDER) && !has(ASKING);
  const method = methodIn(T);
  const day = kit.days(T).find((x) => !qs.some((q) => x.at >= q.at && x.at < q.end)) ?? null;
  const hoursAsk = has(HOURS);
  const pend = d.q;
  const rel = has(INC) || / in plus /.test(nt) ? 'inc' : has(SET_TO) || / in plaats | in loc /.test(nt) ? 'set' : null;
  const specific = spans.filter((s) => !s.generic && s.ids.length === 1);
  const generic = spans.filter((s) => s.generic);

  // ── show · remove · hand over (the draft's own words) ──
  const show = (has(SHOW_VERB) && has(SHOW_OBJ)) || (T.length <= 4 && has(SHOW_OBJ) && T.every((w) => SHOW_OBJ.has(w) || ['mijn', 'mea', 'meu', 'de', 'het', 'm', 'mi'].includes(w)) && hasLines(d)) || / wat (heb ik|staat er) .*(besteld|bon) | ce am (pe bon|comandat) /.test(nt);
  if (show && !spans.length) {
    const r = reply(L);
    if (hasLines(d)) r.slip = slip(ix, L, d, at);
    else r.lines.push(fill(o.empty));
    d.q = null;
    return { r, dbg: { intent: 'order-show', draft: d, dynamic: 'order', handoff: 'none' } };
  }
  if (has(REMOVE) || / niet meer | toch niet | nu mai /.test(nt)) {
    const ids = uniq(specific.map((s) => s.ids[0]));
    if (ids.length) {
      for (const id of ids) {
        const p = ix.order._byId.get(id);
        const k = d.items.findIndex(([x]) => x === id);
        if (k >= 0) {
          d.items.splice(k, 1);
          ev.lines.push(fill(o.removed, { product: p.n[L] }));
        } else ev.lines.push(fill(o.notOn, { product: p.n[L] }));
      }
      if (d.last && !d.items.some(([x]) => x === d.last)) d.last = d.items.at(-1)?.[0] ?? null;
      d.q = null;
      ev.intent = 'order-remove';
      ev.quiet = true;
      return finish(ctx, d, ev);
    }
  }
  const handover = !spans.length && !qs.length && !question && !mark && hasLines(d) && (/ (klaar|gata|atat|gedaan|afronden|bestelbon|whatsapp|afgerond|trimite|finalizez|plaatsen) /.test(nt) || / (dat is|dat was|asta e) (alles|het|tot) /.test(nt) || / la bon /.test(nt));
  if (handover) {
    const r = reply(L);
    ready(ix, r, L, d, at);
    d.q = null;
    return { r, dbg: { intent: 'order-handover', draft: d, dynamic: 'order', handoff: 'none', form: r.acts[0].href } };
  }

  // ── the products of the message ──
  const party = has(PARTY);
  // „een colli”, „un colli” is an article, not an order („kan ik een colli invriezen?”); an order word inside a question
  // („cu cât timp înainte rezerv un grătar?”) is the question's, unless a quantity says otherwise
  const article = (q) => !!q && q.word && !q.u && ['een', 'un', 'una', 'o'].includes(T[q.at]);
  const orderish = (s) => {
    if (d.q?.id && s.ids.includes(d.q.id)) return true;
    const q = article(s.q) ? null : s.q;
    if (cue && !party && (!question || q)) return true;
    if (!q || question) return false;
    if (q.u === 'kg' || q.u === 'g' || q.u === 'stuk') return true;
    return !mark && !party;
  };
  if (spans.length && spans.some(orderish)) {
    for (const s of specific) {
      if (!orderish(s) && !cue) continue;
      take(ctx, d, ix.order._byId.get(s.ids[0]), s.q ?? null, rel, ev);
    }
    const g = generic.find((s) => s.ids.length);
    if (g && !ev.ask) {
      if (menuCtx && g.ids.every((id) => isMenuRow(ix, id))) {
        ev.clarify = { chips: g.ids.slice(0, 6).map((id) => ({ label: ix.order._byId.get(id).n[L], pick: id })) };
        ev.dbg = { chips: g.ids.slice(0, 6), pend: { intent: 'order', ids: g.ids.slice(0, 6), all: g.ids, menu: true, qty: g.q ? { n: g.q.n, u: g.q.u } : null } };
      } else {
        const c = kit.clarify(g.ids);
        ev.clarify = { chips: c.r.chips };
        ev.dbg = { chips: c.dbg.chips, pend: { ...c.dbg.pend, intent: 'order', qty: g.q ? { n: g.q.n, u: g.q.u } : null } };
      }
    }
  } else if (!spans.length && pend?.id && qs.length === 1 && !question && T.length - (qs[0].end - qs[0].at) <= 2) {
    // the answer to „Hoeveel …?” / „… per kilo?” / „Voor hoeveel personen?”: a quantity alone
    const p = ix.order._byId.get(pend.id);
    if (p) take(ctx, d, p, pend.k === 'persons' ? { n: qs[0].n, u: qs[0].u ?? 'pers' } : qs[0], rel, ev);
  } else if (!spans.length && rel && qs.length === 1 && hasLines(d)) {
    // „nog een kilo erbij”, „maak er 5 kilo van”, „mai pune un kilogram”: the last product on the slip
    const p = ix.order._byId.get(d.last ?? d.items.at(-1)[0]);
    take(ctx, d, p, qs[0], rel === 'set' ? 'set' : 'inc', ev);
    if (ev.intent === 'order-add') ev.intent = 'order-change';
  } else if (!spans.length) {
    const flow = hasLines(d) || pend?.k === 'method' || pend?.k === 'day';
    const asksDay = day && !hoursAsk && (method || pend?.k === 'day' || pend?.k === 'method');
    if (!(flow && (method || asksDay))) {
      // „Help mij bestellen”, „Ik wil bestellen”: the start, unless the answer bank has the question
      if (has(START) && !question && !mark && !(best && best.score >= 0.62)) {
        if (day && !hoursAsk) d.want = iso(day.date);
        if (method && method !== 'both') d.mode = method;
        const r = reply(L);
        r.lines.push(fill(o.start));
        return { r, dbg: { intent: 'order-start', draft: d, dynamic: 'order', handoff: 'none' } };
      }
      return null;
    }
  } else return null;

  // ── pickup or delivery, the day (only in an order: items in this message, or a draft) ──
  const inOrder = hasLines(d) || ev.ask || ev.clarify;
  if (inOrder && method) setMethod(ctx, d, method, ev);
  else if (inOrder && method === null && pend?.k === 'method' && !ev.intent && !ev.ask) ev.prompt = 'method';
  if (inOrder && day && !hoursAsk && (ev.intent || method || pend?.k === 'day' || pend?.k === 'method' || ev.ask)) setDay(ctx, d, iso(day.date), ev);
  if (!ev.intent && !ev.ask && !ev.clarify && !ev.method && !ev.day && !ev.prompt) return null;
  return finish(ctx, d, ev);
}

/** A tap in the box that belongs to the order: add:<id> (the card's button) · qty:<n> · day:<date> · mode:<method>. */
export function orderPick(ctx, pick) {
  const { ix, st, L } = ctx;
  prepareOrder(ix);
  const d = copy(st.draft);
  const ev = blank();
  const [kind, val] = [pick.slice(0, pick.indexOf(':')), pick.slice(pick.indexOf(':') + 1)];
  if (kind === 'add') {
    const p = ix.order._byId.get(val);
    if (!p) return null;
    ev.ask = askFor(ix, L, d, p, isMenuRow(ix, p.id) && p.u === 'pers' ? 'persons' : 'qty');
    return finish(ctx, d, ev);
  }
  if (kind === 'qty') {
    const p = d.q?.id && ix.order._byId.get(d.q.id);
    const n = Number(val);
    if (!p || !(n > 0)) return null;
    take(ctx, d, p, { n, u: p.u === 'kg' ? 'kg' : p.u === 'stuk' ? 'stuk' : p.u === 'pers' ? 'pers' : null }, null, ev);
    return finish(ctx, d, ev);
  }
  if (kind === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    setDay(ctx, d, val, ev);
    return finish(ctx, d, ev);
  }
  if (kind === 'mode' && (val === 'pickup' || val === 'delivery')) {
    setMethod(ctx, d, val, ev);
    return finish(ctx, d, ev);
  }
  return null;
}

/** a product picked from „Welke bedoelt u?” in an order: the quantity the message had, or the question for it */
export function orderFor(ctx, id, qty) {
  const { ix, st } = ctx;
  prepareOrder(ix);
  const p = ix.order._byId.get(id);
  if (!p) return null;
  const d = copy(st.draft);
  const ev = blank();
  take(ctx, d, p, qty ?? null, null, ev);
  return finish(ctx, d, ev);
}

/** the draft as the box's „Opnieuw” leaves it: empty, and whether there was anything on it */
export const wasFilled = (st) => hasLines(st?.draft);

// ——— delivery by town (towns.json; docs/assistant.md §10.2 B; lexicon §5.34) ———

/** km to a whole number, a half to the even one (6,5 → 6, as the table's figures were rounded) */
const km = (x) => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : r;
};

/** „Leveren jullie in Tielt?”, „levering 8820”, „aduceți și la Oostkamp?” — one town or postcode, or an unknown one
 *  with a delivery word; several towns, or none, leave the answer bank's own answer (delivery-towns,
 *  delivery-or-pickup). Never a fee: the distance, the rule, and who confirms. */
export function townTurn(ctx) {
  const { ix, T, L, raw } = ctx;
  prepareOrder(ix);
  const towns = ix.order?.towns ?? [];
  if (!towns.length) return null;
  const nt = ` ${T.join(' ')} `;
  const strong = T.some((w) => DELIVER.has(w)) || / aan huis | la domiciliu /.test(nt);
  const weak = T.some((w) => COME.has(w));
  if ((!strong && !weak) || T.some((w) => PARTY.has(w) || /^(bbq|barbecue|grill|gratar|spit|protap|traiteur)/.test(w))) return null;
  // a town named as it is spelled wins over one a typo reaches („roeselare” is one letter-pair from „koekelare”); a
  // typo counts only in a long word (7+ letters: „roeselaere”), never in a short one („steden” is not Staden)
  const exact = [];
  const typo = [];
  for (const t of towns)
    for (const ph of t.phw) {
      const ms = find(T, ph);
      if (ms.some((m) => m.exact)) {
        exact.push(t);
        break;
      }
      if (ms.some((m) => T.slice(m.at, m.at + m.len).every((w) => w.length >= 7)) && !typo.includes(t)) typo.push(t);
    }
  const found = exact.length ? exact : typo;
  let unknownPc = false;
  for (const pc of T.filter((w) => /^\d{4}$/.test(w))) {
    if (found.some((t) => t.pc === pc)) continue;
    const t = towns.find((x) => x.pc === pc);
    if (t) found.push(t);
    else unknownPc = true;
  }
  const places = uniq(found.map((t) => t.p));
  if (places.length >= 2) return null;
  const s = ix.s[L].o;
  const r = reply(L);
  if (places.length === 1) {
    const t = found[0];
    if (!strong && t.km > 20) return null;
    const k = km(t.km);
    if (t.z && !t.e) {
      const ring = ix.order.delivery.rings.find((x) => t.z <= x.km);
      r.lines.push(fill(s.townZone, { place: t.p, km: k, freeFrom: money(ring.freeFrom, L) }), fill(s.townDays));
      return { r, dbg: { intent: 'delivery-town', entry: 'delivery-towns', place: t.p, km: k, dynamic: 'delivery', handoff: 'none' } };
    }
    r.lines.push(fill(s.townOther, { place: t.p, km: k }));
    handoff(ix, r, L, raw);
    return { r, dbg: { intent: 'delivery-town', entry: 'delivery-other-town', place: t.p, km: k, dynamic: 'delivery', handoff: 'offer' } };
  }
  if (!strong) return null;
  // a capitalised name after „in” / „naar” / „la” / „în” that is no town of the table, nor a word the shop uses
  const cand = [...String(raw).matchAll(/(?:^|\s)(?:in|naar|tot|te|la|în|spre|richting)\s+(\p{Lu}[\p{L}'’-]{2,})/gu)].map((m) => norm(m[1]));
  const unknown = unknownPc || cand.some((w) => w && !ix._stop.nl.has(w) && !ix._stop.ro.has(w) && !ix._bankWord.has(w) && !ix._productWord.has(w) && !MONTHS.has(w));
  if (!unknown) return null;
  r.lines.push(fill(s.townUnknown));
  r.acts.push({ kind: 'wa', label: ix.s[L].t.askWa, href: waHref(ix, L, raw) });
  return { r, dbg: { intent: 'delivery-town', entry: 'delivery-other-town', place: null, dynamic: 'delivery', handoff: 'offer' } };
}
