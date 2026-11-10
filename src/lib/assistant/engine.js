// The assistant's engine (row 11a, docs/assistant.md §10.2 A B D E F · §10.4; D-04 · D-58 · D-60): understands a
// customer's message and answers it from the shop's own data. Local, no API, nothing sent anywhere.
// Plain JavaScript, no DOM, no `window`, no storage (build-plan row 11a note for row 11c): the browser island
// (src/scripts/qa-ui.ts) and row 11c's Vercel function call the same `ask`. The caller keeps the conversation `state`
// (a small plain object) and hands it back with the next message.
// Answers are built only from the lexicon templates (index.s = src/i18n/assistant.ts) and the answer bank
// (index.faq = assistant-faq.json); every slot value comes from the data. Hours use the open chip's own logic
// (open-state.ts, D-20); prices the bestelbon's money() (order-core.js).
// Allergens (§4): the bank's answers and the allergens.json matrix, word for word, each ending with the workshop
// notice. Until assistant-faq.json `allergen_category_map._status` reads „confirmed”, a question about a named
// product's allergens hands off (build-plan row 11a, allergen gate); only a matrix category gets the §4 answer.
// Row 11b: after the person and allergen checks, the order helper (order.js: the draft, its quantities, pickup or
// delivery, the day, the handover to the bestelbon or WhatsApp) and delivery to one named town get the message first;
// the state's `draft` holds the order. The order's taps come back as picks add:<id> · qty:<n> · day:<date> · mode:<m>.
import { norm, words, same, find } from './normalize.js';
import { brussels, chipState, hoursOn, weekday } from '../open-state-core.js';
import { money } from '../order-core.js';
import { fill, textLine, reply, listOf, handoff } from './say.js';
import { orderTurn, orderPick, orderFor, townTurn, wasFilled } from './order.js';

const DAY_MS = 86400000;
const addDays = (d, k) => new Date(d.getTime() + k * DAY_MS);
const iso = (d) => d.toISOString().slice(0, 10);
const fromIso = (s) => new Date(`${s}T00:00:00Z`);

// Calendar words (language knowledge, not copy): weekdays, months, relative days, the dated holidays of hours.json.
const DAYS = {
  nl: ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
  ro: ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'],
};
const MONTHS = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  ro: ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'],
};
const MONTH_SHORT = { jan: 0, ian: 0, feb: 1, mrt: 2, maa: 2, mar: 2, apr: 3, jun: 5, iun: 5, jul: 6, iul: 6, aug: 7, sep: 8, sept: 8, okt: 9, oct: 9, nov: 10, dec: 11 };
const RELATIVE = [
  [['vandaag'], 0], [['azi'], 0], [['astazi'], 0], [['vanavond'], 0], [['diseara'], 0],
  [['morgen'], 1], [['maine'], 1], [['overmorgen'], 2], [['poimaine'], 2],
];
const HOLIDAYS = [
  [['tweede', 'kerstdag'], 12, 26], [['a', 'doua', 'zi', 'de', 'craciun'], 12, 26],
  [['kerstavond'], 12, 24], [['ajun'], 12, 24], [['ajunul'], 12, 24],
  [['kerstmis'], 12, 25], [['kerst'], 12, 25], [['kerstdag'], 12, 25], [['craciun'], 12, 25], [['craciunul'], 12, 25],
  [['oudejaar'], 12, 31], [['oudejaarsavond'], 12, 31], [['revelion'], 12, 31],
  [['nieuwjaar'], 1, 1], [['nieuwjaarsdag'], 1, 1], [['anul', 'nou'], 1, 1],
  [['allerheiligen'], 11, 1], [['wapenstilstand'], 11, 11],
];
// Words that point back at the product of the last answer („en hoeveel kost dat?”, „zit daar mosterd in?”, „și cât costă?”)
const BACK = new Set(['dat', 'dit', 'die', 'deze', 'het', 'daar', 'daarin', 'erin', 'ervan', 'asta', 'ala', 'aia', 'el', 'ea', 'ei', 'ii', 'il', 'o', 'lor']);
// The allergen words that also name food a customer may simply want to buy („hebben jullie vis?”): an allergen answer
// only with a cue word as well (allergie, bevat, zit … in, zonder, contine, fara …)
const FOODLIKE = new Set(['milk', 'eggs', 'fish', 'nuts', 'peanuts', 'mustard']);
const CUES = ['allergie', 'allergisch', 'allergeen', 'allergenen', 'bevat', 'bevatten', 'zit', 'zitten', 'zonder', 'vrij', 'sporen', 'kruisbesmetting', 'alergie', 'alergic', 'alergica', 'alergen', 'alergeni', 'contine', 'contin', 'fara', 'urme', 'contaminare'];
// words a trigger can fold into that mean something else without their accent („vóór” before → „voor” for)
const FOLDS = new Set(['voor']);
// shorthand customers type for the bank's words (per persoon · kilogram)
const EQUIV = [['pp', 'persoon', 'personen', 'pers', 'persoana', 'persoane', 'persoană'], ['kg', 'kilo', 'kilogram', 'kilogramul']];
const alike = (a, b) => same(a, b) || EQUIV.some((g) => g.includes(a) && g.includes(b));
// row 11b — the language of a message: units belong to neither; the order helper's words belong to one
const NEUTRAL = ['kg', 'g', 'gr', 'km', 'l', 'pp', 'euro'];
const ORDER_WORDS = {
  nl: 'zet graag bestel bestellen afhalen leveren levering toon haal eraf erbij stuks halve anderhalve klaar alles bestelbon'.split(' '),
  ro: 'pune vreau ridicare livrare arata scoate bucati bucata jumatate gata atat bonul comanda'.split(' '),
};

const split = (s) => (s ? s.split(' ') : []);
const uniq = (a) => [...new Set(a)];

/** Turn the fetched index into its working form once: phrases as word lists, the bank's questions and keywords per
 *  language, word weights (idf), the vocabularies that tell Dutch from Romanian. */
export function prepare(ix) {
  if (ix._ready) return ix;
  const stop = { nl: new Set(ix.stop.nl), ro: new Set(ix.stop.ro) };
  ix._stop = stop;
  for (const p of ix.p) p.phw = p.ph.map(split);
  ix._byId = new Map(ix.p.map((p) => [p.id, p]));
  ix._generic = new Map(Object.entries(ix.generic));
  const df = { nl: new Map(), ro: new Map() };
  for (const e of ix.faq) {
    e.qw = {};
    e.qc = {};
    e.kw = {};
    for (const L of ['nl', 'ro']) {
      e.qw[L] = words(e.q[L]);
      e.qc[L] = uniq(e.qw[L].filter((w) => !stop[L].has(w)));
      e.kw[L] = e.k[L].map(split);
      for (const w of uniq([...e.qc[L], ...e.kw[L].flat()])) df[L].set(w, (df[L].get(w) ?? 0) + 1);
    }
  }
  const N = ix.faq.length;
  ix._idf = (L, w) => Math.log(1 + N / (df[L].get(w) ?? 0.5));
  ix._df = df;
  // the words only one language uses (the bank, the intents, the product names), for the language of a message
  const vocab = { nl: new Set(), ro: new Set() };
  for (const L of ['nl', 'ro']) {
    for (const e of ix.faq) for (const w of [...e.qw[L], ...e.kw[L].flat()]) vocab[L].add(w);
    for (const v of Object.values(ix.intents)) for (const ph of v[L]) for (const w of split(ph)) vocab[L].add(w);
    for (const p of ix.p) for (const w of words(p.n[L])) vocab[L].add(w);
    for (const w of words(Object.values(ix.s[L].t).join(' '))) vocab[L].add(w);
  }
  ix._only = {
    nl: new Set([...vocab.nl].filter((w) => !vocab.ro.has(w) && w.length > 1)),
    ro: new Set([...vocab.ro].filter((w) => !vocab.nl.has(w) && w.length > 1)),
  };
  // row 11b: a unit is no language („2 kg de mici” is Romanian), and the order helper's own words are („zet … klaar”,
  // „pune …”, „ridicare”) — each only where the other language's vocabulary does not have it
  for (const w of NEUTRAL) {
    ix._only.nl.delete(w);
    ix._only.ro.delete(w);
  }
  for (const [L, other] of [['nl', 'ro'], ['ro', 'nl']]) for (const w of ORDER_WORDS[L]) if (!vocab[other].has(w)) ix._only[L].add(w);
  const plain = () => (ph) => !(ph.length === 1 && FOLDS.has(ph[0]));
  for (const [k, v] of Object.entries(ix.intents)) ix.intents[k].w = { nl: v.nl.map(split).filter(plain()), ro: v.ro.map(split).filter(plain()) };
  ix._productWord = new Set(ix.p.flatMap((p) => p.phw.flat()));
  ix._qWord = new Set(ix.faq.flatMap((e) => [...e.qw.nl, ...e.qw.ro]));
  ix._bankWord = new Set([...df.nl.keys(), ...df.ro.keys(), ...Object.values(ix.intents).flatMap((v) => [...v.w.nl, ...v.w.ro].flat())]);
  // the product words themselves stay products (a bank question may name one: „mici”, „colli”)
  for (const p of ix.p) for (const ph of p.phw) if (ph.length === 1) ix._bankWord.delete(ph[0]);
  for (const c of ix.al.cats) c.phw = c.ph.map(split);
  // what each allergen entry of the bank is about: its categories and allergens, read from its own questions
  for (const e of ix.faq)
    if (e.topic === 'allergens') {
      const w = [...e.qw.nl, ' ', ...e.qw.ro];
      e.alCats = uniq(catsIn(ix, e.qw.nl).concat(catsIn(ix, e.qw.ro)));
      e.alIds = uniq(allergensIn(ix, e.qw.nl, 'nl').ids.concat(allergensIn(ix, e.qw.ro, 'ro').ids));
      void w;
    }
  ix._ready = true;
  return ix;
}

/** What the engine reads in a text — for the test and for tuning, never shown to a customer. */
export function explain(ix, text, lang) {
  prepare(ix);
  const T = words(text);
  return {
    T,
    lang: langOf(ix, T, text, lang),
    spans: productSpans(ix, T).map((s) => ({ ...s, ids: s.ids.slice(0, 8) })),
    intents: Object.keys(ix.intents).filter((k) => has(ix, T, k)),
    faq: scoreFaq(ix, T, lang).slice(0, 4).map((s) => ({ id: s.e.id, score: +s.score.toFixed(2), q: +s.qCover.toFixed(2), t: +s.tCover.toFixed(2), k: s.kHits })),
  };
}

/** A fresh conversation. `lang`: the language of the last answer; `last`: the product of the last answer;
 *  `pend`: a clarify question waiting for its pick; `miss`: misses in a row; `draft`: the order slot of row 11b. */
export const newState = (lang) => ({ lang, last: null, pend: null, miss: 0, draft: null });

// ——— understanding ———

function langOf(ix, T, raw, fallback) {
  let nl = 0;
  let ro = 0;
  // a Romanian letter counts, except in a product's name typed on a Dutch page („tobă”) — a Romanian function word
  // („și”) counts even when a product's name holds it (row 11b)
  for (const tok of String(raw).match(/[\p{L}\p{M}]+/gu) ?? []) if (/[ăâîșşțţ]/i.test(tok) && (!ix._productWord.has(norm(tok)) || ix._stop.ro.has(norm(tok)))) ro += 2;
  for (const w of T) {
    if (ix._only.nl.has(w)) nl++;
    if (ix._only.ro.has(w)) ro++;
  }
  if (ro > nl) return { lang: 'ro', sure: ro - nl >= 1 };
  if (nl > ro) return { lang: 'nl', sure: nl - ro >= 1 };
  return { lang: fallback, sure: false };
}

/** where an intent's trigger words stand in the text (both languages) */
function intentAt(ix, T, name) {
  const v = ix.intents[name];
  if (!v) return [];
  const out = [];
  for (const L of ['nl', 'ro'])
    for (const ph of v.w[L]) {
      // a one- or two-letter trigger („ai”, „ei”, „ou”) only as itself, never inside a typo match
      for (const m of find(T, ph)) if (ph.join('').length > 2 || m.exact) out.push({ ...m, L, ph });
    }
  return out;
}
const has = (ix, T, name) => intentAt(ix, T, name).length > 0;

/** the products a text names: phrase spans, longest first; a word that fits several products is a `generic` span */
function productSpans(ix, T, only = null) {
  const hits = [];
  for (const p of ix.p) {
    if (only && !only.includes(p.id)) continue;
    for (const ph of p.phw)
      for (const m of find(T, ph)) if (m.exact || ph.length > 1 || !ix._bankWord.has(T[m.at])) hits.push({ id: p.id, ...m, ph: ph.join(' ') });
  }
  hits.sort((a, b) => b.len - a.len || Number(b.exact) - Number(a.exact) || a.at - b.at);
  const taken = new Array(T.length).fill(false);
  const spans = [];
  for (const h of hits) {
    const s = spans.find((x) => x.at === h.at && x.len === h.len);
    if (s) {
      if (!s.ids.includes(h.id) && (h.exact || !s.exact)) s.ids.push(h.id);
      continue;
    }
    if (taken.slice(h.at, h.at + h.len).some(Boolean)) continue;
    for (let k = h.at; k < h.at + h.len; k++) taken[k] = true;
    spans.push({ at: h.at, len: h.len, ids: [h.id], exact: h.exact, ph: h.ph });
  }
  // one-word spans: a word several products share is a question back, unless it is one product's whole name
  for (const s of spans)
    if (s.len === 1) {
      const g = genericOf(ix, s.ph, only);
      if (!g) continue;
      const named = ix.p.filter((p) => p.ex.includes(s.ph) && (!only || only.includes(p.id)));
      if (named.length === 1) s.ids = [named[0].id];
      else {
        s.generic = true;
        s.ids = uniq([...s.ids, ...g]);
      }
    }
  if (!only)
    for (let i = 0; i < T.length; i++) {
      if (taken[i] || ix._stop.nl.has(T[i]) || ix._stop.ro.has(T[i])) continue;
      const g = genericOf(ix, T[i]);
      if (g) spans.push({ at: i, len: 1, ids: g, generic: true, ph: T[i] });
    }
  for (const s of spans) if (s.ids.length > 1 && !s.generic) s.generic = true;
  return spans.sort((a, b) => a.at - b.at);
}

function genericOf(ix, w, only = null) {
  if (w.length < 3 || /^\d+$/.test(w)) return null;
  let ids = ix._generic.get(w);
  // a word the bank or the intents already use („costă”, „minimum”, „roemeens”) never stands for a product by a typo
  if (!ids && !ix._bankWord.has(w))
    for (const [k, v] of ix._generic)
      if (k.length >= 4 && same(k, w)) {
        ids = v;
        break;
      }
  if (!ids) return null;
  const list = only ? ids.filter((id) => only.includes(id)) : ids;
  return list.length >= 2 ? list : null;
}

/** rank products for a question back or a list of alternatives: this week's counter, the owners' best sellers, the
 *  counter tags, a photo, then the data's own order */
function rank(ix, ids) {
  const score = (p) => (p.w ? 8 : 0) + (p.b ? 4 : 0) + (p.tag ? 2 : 0) + (p.th ? 1 : 0);
  return ids
    .map((id) => ix._byId.get(id))
    .filter(Boolean)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => score(b.p) - score(a.p) || a.i - b.i)
    .map((x) => x.p);
}

function catsIn(ix, T) {
  const out = [];
  for (const c of ix.al.cats) if (c.phw.some((ph) => find(T, ph).length)) out.push(c.id);
  return out;
}

function allergensIn(ix, T, lang) {
  const ids = [];
  const strong = [];
  for (const a of ix.al.list) {
    const hit = a.w.some((w) => T.some((t) => (w.length <= 3 ? t === w : same(t, w) || (t.length > w.length && t.startsWith(w)))));
    if (hit) ids.push(a.id);
  }
  // the bank's own allergen words that are no allergen name („glutenvrij”, „lactosevrij”, „ei”, „ou”): the allergen
  // whose name starts them, or whose name they start
  for (const ph of ix.intents.allergen?.w[lang] ?? [])
    if (ph.length === 1 && T.includes(ph[0]))
      for (const a of ix.al.list)
        if (a.w.some((w) => (w.length >= 4 && ph[0].startsWith(w)) || (ph[0].length <= 3 && w.startsWith(ph[0]) && w !== ph[0]))) ids.push(a.id);
  for (const id of uniq(ids)) if (!FOODLIKE.has(id)) strong.push(id);
  return { ids: uniq(ids), strong };
}

/** the days a text names, each with how it was named (weekday · relative · date) */
function daysIn(T, now) {
  const today = now.day;
  const out = [];
  const used = new Set();
  const year = today.getUTCFullYear();
  const dateOf = (m, d) => {
    let x = new Date(Date.UTC(year, m, d));
    if (x < today) x = new Date(Date.UTC(year + 1, m, d));
    return x;
  };
  for (const [ph, m, d] of HOLIDAYS)
    for (const f of find(T, ph))
      if (![...Array(f.len).keys()].some((k) => used.has(f.at + k))) {
        for (let k = 0; k < f.len; k++) used.add(f.at + k);
        out.push({ at: f.at, kind: 'date', date: dateOf(m - 1, d) });
      }
  for (let i = 0; i < T.length; i++) {
    if (used.has(i)) continue;
    const t = T[i];
    const n = /^\d{1,2}$/.test(t) ? Number(t) : NaN;
    if (n >= 1 && n <= 31 && i + 1 < T.length) {
      const nx = T[i + 1];
      let m = MONTHS.nl.findIndex((x) => same(x, nx));
      if (m < 0) m = MONTHS.ro.findIndex((x) => same(norm(x), nx));
      if (m < 0 && MONTH_SHORT[nx] !== undefined) m = MONTH_SHORT[nx];
      if (m < 0 && /^\d{1,2}$/.test(nx) && Number(nx) >= 1 && Number(nx) <= 12) m = Number(nx) - 1;
      if (m >= 0) {
        used.add(i).add(i + 1);
        out.push({ at: i, kind: 'date', date: dateOf(m, n) });
        continue;
      }
    }
    const rel = RELATIVE.find(([ph]) => ph[0] === t);
    if (rel) {
      used.add(i);
      out.push({ at: i, kind: 'rel', date: addDays(today, rel[1]) });
      continue;
    }
    for (const L of ['nl', 'ro']) {
      const wd = DAYS[L].findIndex((x) => {
        const f = norm(x);
        return same(f, t) || (t.length > f.length && t.startsWith(f));
      });
      if (wd >= 0) {
        used.add(i);
        const k = (wd - weekday(today) + 7) % 7;
        out.push({ at: i, kind: 'weekday', wd, date: addDays(today, k) });
        break;
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// ——— scoring the answer bank ———

// the bank entries an intent's trigger words point at get a small lift („pret pe kg?” → a price entry)
const BOOST = {
  price: (e) => e.d === 'price',
  'open-now': (e) => e.topic === 'hours' || e.d === 'open-now' || e.d === 'day-hours',
  'day-hours': (e) => e.d === 'day-hours' || e.d === 'open-now',
  deadline: (e) => e.d === 'deadline',
  delivery: (e) => e.topic === 'delivery',
  order: (e) => e.topic === 'order',
  cooking: (e) => e.id === 'products-cooking' || e.id === 'products-mici-cook' || e.id === 'products-recipes',
  colli: (e) => e.d === 'colli' || e.id.startsWith('products-colli'),
  party: (e) => e.topic === 'traiteur' || e.id === 'products-bbq-pakket' || e.id === 'products-bbq-amount',
  location: (e) => e.topic === 'place',
};

// row 11c (D-64): „who made this site” answers only a message that names the site, the assistant or „you” — never
// „făcute de voi?” (made by you, the shop?), which is the own-made question
const SITE_WORDS = new Set(['site', 'sites', 'website', 'websites', 'webdesigner', 'web', 'designer', 'webbouwer', 'webbouwers', 'pagina', 'assistent', 'asistent', 'asistentul', 'chatbot', 'bot', 'robot', 'je', 'jij', 'jou', 'te', 'tu']);

function scoreFaq(ix, T, L, filter = null, intents = null) {
  const stop = ix._stop[L];
  const siteAsked = T.some((w) => SITE_WORDS.has(w));
  const content = T.map((w, i) => ({ w, i })).filter((x) => !stop.has(x.w) && !/^\d+$/.test(x.w));
  const idf = (w) => ix._idf(L, w);
  const textMass = content.reduce((s, x) => s + idf(x.w), 0) || 1;
  const out = [];
  for (const e of ix.faq) {
    if (filter && !filter(e)) continue;
    if (e.id === 'site-made-by' && !siteAsked) continue;
    const covered = new Set();
    let kHits = 0;
    for (const kp of e.kw[L]) {
      const ms = find(T, kp);
      if (!ms.length) continue;
      kHits += kp.length > 1 ? 2 : 1;
      for (const m of ms) for (let k = 0; k < m.len; k++) covered.add(m.at + k);
    }
    let qMass = 0;
    let qHit = 0;
    for (const w of e.qc[L]) {
      const v = idf(w);
      qMass += v;
      const at = content.find((x) => alike(x.w, w));
      if (at) {
        qHit += v;
        covered.add(at.i);
        continue;
      }
      const pair = content.findIndex((x, k) => content[k + 1] && content[k + 1].i === x.i + 1 && x.w + content[k + 1].w === w);
      if (pair >= 0) {
        qHit += v;
        covered.add(content[pair].i).add(content[pair + 1].i);
      }
    }
    const qCover = qMass ? qHit / qMass : 0;
    // row 11c (g): a message of small words only („wat kan je?”) is covered by a multi-word keyword it holds whole
    const tCover = content.length ? content.reduce((s, x) => s + (covered.has(x.i) ? idf(x.w) : 0), 0) / textMass : kHits >= 2 && covered.size ? 1 : 0;
    const lift = intents && [...intents].some((k) => BOOST[k]?.(e)) ? 0.12 : 0;
    const score = qCover * 0.5 + tCover * 0.5 + Math.min(0.3, kHits * 0.06) + (qCover > 0.99 && tCover > 0.99 ? 0.2 : 0) + lift;
    if (score > 0) out.push({ e, score, qCover, tCover, kHits, lift });
  }
  return out.sort((a, b) => b.score - a.score);
}

const STRONG = 0.62;
const WEAK = 0.4;
// the bank entries that stand for „a product question” — with a product named, the product's own answer replaces them
const TEMPLATE = new Set(['products-do-you-have', 'products-price-kg', 'products-cooking']);

// ——— answers ———

function card(ix, p, L) {
  return {
    id: p.id,
    name: p.n[L],
    price: p.pl?.[L] ?? '',
    line: p.line?.[L] ?? '',
    th: p.th,
    href: p.href[L],
    more: fill(ix.s[L].t.more, { product: p.n[L] }).map((s) => s.t).join(''),
    // row 11b: the card's button „Zet in mijn bestelling” (lexicon §5.34) — the box sends it back as the pick add:<id>
    add: ix.s[L].o.add,
  };
}

function linkTo(ix, r, L, href, here) {
  if (!href || href === here) return;
  const page = ix.pages[L]?.[href.split('#')[0]];
  if (!page) return;
  r.link = fill(ix.s[L].t.link, { page: { t: page, href } });
}

const dayWord = (ix, L, d, now, named) => {
  const k = Math.round((d - now.day) / DAY_MS);
  if (named === 'weekday' || (named === undefined && k > 1 && k < 7)) return DAYS[L][weekday(d)];
  if (named === 'date' && k > 1) return dateWord(L, d);
  if (k === 0) return ix.s[L].today;
  if (k === 1) return ix.s[L].tomorrow;
  if (k > 1 && k < 7) return DAYS[L][weekday(d)];
  return dateWord(L, d);
};
const dateWord = (L, d) => `${d.getUTCDate()} ${MONTHS[L][d.getUTCMonth()]}`;

/** one line for a day's hours: the special day (with its note) or the regular week */
function dayLine(ix, L, day, now) {
  const t = ix.s[L].t;
  const h = hoursOn(ix.hours, day.date);
  const name = day.kind === 'date' ? dateWord(L, day.date) : dayWord(ix, L, day.date, now, day.kind);
  if (h.special) {
    const sp = ix.hours.special.find((s) => s.date === iso(day.date));
    if (!h.slots.length) return fill(t.specialClosed, { date: dateWord(L, day.date) });
    const from = h.slots[0].open;
    const to = h.slots[h.slots.length - 1].close;
    if (sp?.note) return fill(t.special, { date: dateWord(L, day.date), from, to, note: sp.note[L] });
    return fill(t.day, { day: dateWord(L, day.date), from, to });
  }
  if (!h.slots.length) return fill(t.dayClosed, { day: name });
  return fill(t.day, { day: name, from: h.slots[0].open, to: h.slots[h.slots.length - 1].close });
}

function openNow(ix, L, now) {
  const t = ix.s[L].t;
  const s = chipState(ix.hours, now);
  if (s.kind === 'open' || s.kind === 'special-open') return fill(t.open, { time: s.close });
  if (s.kind === 'closing-soon') return fill(t.soon, { minutes: s.left });
  if (s.kind === 'closed-today') return fill(t.closed, { day: ix.s[L].today, time: s.open });
  if (s.next) return fill(t.closed, { day: s.next.inDays === 1 ? ix.s[L].tomorrow : DAYS[L][s.next.weekday], time: s.next.open });
  return fill(t.dayClosed, { day: ix.s[L].today });
}

function deadlineLine(ix, L, day, now) {
  const t = ix.s[L].t;
  const target = day ? day.date : addDays(now.day, 1);
  const named = day?.kind;
  const name = named === 'date' ? dateWord(L, target) : dayWord(ix, L, target, now, named);
  if (!hoursOn(ix.hours, target).slots.length) return fill(t.dayClosed, { day: name });
  const last = addDays(target, -(ix.lead ?? 1));
  const [hh, mm] = (ix.cutoff ?? '12:00').split(':').map(Number);
  const late = last < now.day || (iso(last) === iso(now.day) && now.min >= hh * 60 + mm);
  if (late) return fill(t.late, { day: name, phone: ix.phone });
  return fill(t.deadline, { day: name, deadlineDay: dayWord(ix, L, last, now) });
}

function priceLine(ix, L, p) {
  const t = ix.s[L].t;
  if (p.ps || p.pr === null) return fill(t.priceKg, { product: p.n[L] });
  const v = p.pf ? (p.pl?.[L] ?? money(p.pr, L)).replace(/\/.*$/, '') : money(p.pr, L);
  if (p.u === 'pers') return fill(t.pricePers, { product: p.n[L], price: v });
  return fill(t.price, { product: p.n[L], price: v, unit: ix.s[L].unit[p.u] ?? p.u });
}

/** „Hebben jullie X?” with X on the list: yes · this week · for today · the card · at most two suggestions (§10.2 D) */
function yesAnswer(ix, r, L, p) {
  const t = ix.s[L].t;
  r.lines.push(fill(t.yes, { product: p.n[L] }));
  if (p.w) r.lines.push(fill(t.week));
  r.lines.push(fill(t.today));
  r.cards.push(card(ix, p, L));
  suggest(ix, r, L, p);
}
function suggest(ix, r, L, p) {
  if (p.rc) r.acts.push({ kind: 'link', label: ix.s[L].recipe, href: p.rc[L] });
  const c = p.inc?.[0] && ix._byId.get(p.inc[0]);
  if (c && r.acts.length < 2) r.acts.push({ kind: 'link', label: c.n[L], href: c.href[L] });
}

/** the customer's own words after „hebben jullie” / „aveți”, as typed (for „{query} staat niet op onze lijst.”) */
function queryWords(raw, from) {
  const orig = String(raw).replace(/['’`´]/g, '').match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  return orig.slice(from).join(' ');
}

// ——— the conversation ———

/**
 * @param {object} ix     the index (prepare() is applied on first use)
 * @param {object} state  the conversation so far (newState) — returned updated, never mutated
 * @param {object} input  { text?, pick? (a product id from a question back), product? (the sheet's product),
 *                          page (lexicon §5.32 chip page or null), pageLang, path, now (Date) }
 * @returns {{ reply: object, state: object, dbg: object }}
 */
export function ask(ix, state, input) {
  prepare(ix);
  const st = { ...newState(input.pageLang), ...state };
  const now = brussels(input.now ?? new Date(), ix.hours.timeZone);
  const raw = String(input.text ?? '').slice(0, 500);
  const T = words(raw);
  const { lang: L, sure } = langOf(ix, T, raw, st.lang ?? input.pageLang);
  const ctx = { ix, st, now, at: input.now ?? new Date(), raw, T, L, sure, input, here: input.path };
  // what the order helper (order.js, row 11b) borrows from the engine: the product spans, the question back, the days
  ctx.kit = { spans: (W) => productSpans(ix, W), clarify: (ids) => clarify(ctx, ids, 'order'), days: (W) => daysIn(W, now) };
  let out;
  if (input.pick) out = picked(ctx, input.pick);
  else if (!T.length) out = { r: greet(ix, L), dbg: { intent: 'greeting' } };
  else out = route(ctx);
  const { r, dbg } = out;
  // typed in the other language: the answer in theirs, and the offer to switch (§5.32 / §6)
  if (r.lang !== input.pageLang && !dbg.noSwitch) {
    r.lines.push(fill(ix.s[r.lang].t.switchAsk));
    r.acts.push({ kind: 'switch', label: ix.s[r.lang].t.switchBtn, lang: r.lang });
  }
  const next = { ...st, lang: r.lang, pend: dbg.pend ?? null, last: dbg.product ?? (dbg.keepLast ? st.last : st.last) };
  // row 11b: the draft order — the order helper's turn returns the new draft; any other turn keeps it as it was and
  // lets go of the question it had waiting („Hoeveel …?”), so a later bare number is not read as its answer
  if (dbg.draft !== undefined) next.draft = dbg.draft;
  else if (st.draft?.q) next.draft = { ...st.draft, q: null };
  delete dbg.draft;
  if (dbg.intent === 'restart') Object.assign(next, newState(r.lang));
  next.miss = dbg.intent === 'miss-1' ? 1 : dbg.intent === 'miss-2' ? 0 : 0;
  return { reply: r, state: next, dbg: { ...dbg, answer_lang: r.lang, handoff: dbg.handoff ?? 'none' } };
}

function greet(ix, L) {
  const r = reply(L, { face: 'greet' });
  r.lines.push(fill(ix.s[L].t.greeting));
  return r;
}

function picked(ctx, id) {
  const { ix, st, L } = ctx;
  // row 11b: the order's taps — add:<id> (a card's „Zet in mijn bestelling”), qty:<n>, day:<date>, mode:<method>; a
  // tap whose question has gone (an old bubble) gets the start line
  if (/^(add|qty|day|mode):/.test(id)) {
    const out = orderPick(ctx, id);
    if (out) return out;
    const r = reply(L);
    r.lines.push(fill(ix.s[L].o.start));
    return { r, dbg: { intent: 'order-start' } };
  }
  // a product picked from „Welke bedoelt u?” while ordering (the holiday menu's rows too)
  if (st.pend?.intent === 'order') return orderFor(ctx, id, st.pend.qty) ?? miss(ctx);
  const p = ix._byId.get(id);
  if (!p) return miss(ctx);
  const intent = st.pend?.intent ?? 'do-you-have';
  return productAnswer(ctx, p, intent);
}

function productAnswer(ctx, p, intent, entry = null) {
  const { ix, L } = ctx;
  if (intent === 'order') return orderFor(ctx, p.id, ctx.st.pend?.qty ?? null) ?? miss(ctx);
  const r = reply(L);
  if (intent === 'price') {
    r.lines.push(priceLine(ix, L, p));
    r.cards.push(card(ix, p, L));
    return { r, dbg: { intent: 'price', entry: entry ?? 'products-price-kg', dynamic: 'price', product: p.id } };
  }
  if (intent === 'cooking') {
    if (p.line) r.lines.push(textLine(p.line[L]));
    else r.lines.push(textLine(ix.faq.find((e) => e.id === 'products-cooking').a[L]));
    r.cards.push(card(ix, p, L));
    if (p.rc) r.acts.push({ kind: 'link', label: ix.s[L].recipe, href: p.rc[L] });
    return { r, dbg: { intent: 'cooking', entry: entry ?? 'products-cooking', dynamic: 'do-you-have', product: p.id } };
  }
  if (intent === 'colli') {
    r.lines.push(priceLine(ix, L, p));
    r.cards.push(card(ix, p, L));
    return { r, dbg: { intent: 'colli', entry: entry ?? 'products-colli-contents', dynamic: 'colli', product: p.id } };
  }
  yesAnswer(ix, r, L, p);
  return { r, dbg: { intent: 'do-you-have', entry: entry ?? 'products-do-you-have', dynamic: 'do-you-have', product: p.id, result: 'yes' } };
}

function clarify(ctx, ids, intent) {
  const { ix, L } = ctx;
  const r = reply(L);
  const list = rank(ix, ids).slice(0, 6);
  r.lines.push(fill(ix.s[L].t.clarify));
  r.chips = list.map((p) => ({ label: p.n[L], pick: p.id }));
  return { r, dbg: { intent: 'clarify', chips: list.map((p) => p.id), pend: { intent, ids: list.map((p) => p.id), all: ids } } };
}

function miss(ctx) {
  const { ix, st, L, raw, input } = ctx;
  const t = ix.s[L].t;
  if (st.miss >= 1) {
    const r = reply(L, { face: 'serious' });
    r.lines.push(fill(t.miss2));
    handoff(ix, r, L, raw);
    return { r, dbg: { intent: 'miss-2', handoff: 'always' } };
  }
  const r = reply(L, { face: 'miss' });
  r.lines.push(fill(t.miss1));
  r.chips = (ix.s[L].chips[input.page ?? 'home'] ?? ix.s[L].chips.home).map((q) => ({ label: q, ask: q }));
  return { r, dbg: { intent: 'miss-1' } };
}

function bankAnswer(ctx, e, extra = {}) {
  const { ix, L, raw, here } = ctx;
  const r = reply(L);
  r.lines.push(textLine(e.a[L]));
  if (e.h === 'always') {
    r.face = 'serious';
    handoff(ix, r, L, raw);
  } else if (e.h === 'offer') handoff(ix, r, L, raw, false);
  linkTo(ix, r, L, e.link?.[L], here);
  // row 11c (D-64, lexicon §5.36): „who made this site” — the answer carries the credit line's link (its `link` is null)
  if (e.id === 'site-made-by' && ix.s[L].credit) r.link = fill(ix.s[L].credit.line, { name: { t: ix.s[L].credit.name, href: ix.s[L].credit.href } });
  return { r, dbg: { intent: 'faq', entry: e.id, dynamic: e.d, handoff: e.h, ...extra } };
}

function route(ctx) {
  const { ix, st, T, L, raw } = ctx;
  const t = ix.s[L].t;
  // row 11c: at least one of the intent's own words — „wat zit hier in?” (small words only) is no „thanks”
  const only = (name) => has(ix, T, name) && T.every((w) => has(ix, [w], name) || ix._stop.nl.has(w) || ix._stop.ro.has(w));

  // start over · hello · thanks (a message of those words only)
  if (T.length <= 4 && has(ix, T, 'restart') && T.every((w) => has(ix, [w], 'restart') || ix._stop.nl.has(w) || ix._stop.ro.has(w) || w === 'capat')) {
    const r = reply(L, { face: 'greet' });
    // row 11b: with an order in the conversation, the slip is emptied too (§5.34 „Uw bon is leeg. Wij beginnen opnieuw.”)
    r.lines.push(fill(wasFilled(st) ? ix.s[L].o.cleared : t.restart));
    return { r, dbg: { intent: 'restart', noSwitch: true } };
  }
  if (only('thanks')) {
    const r = reply(L);
    r.lines.push(fill(t.thanks));
    return { r, dbg: { intent: 'thanks' } };
  }
  if (only('greeting')) return { r: greet(ix, L), dbg: { intent: 'greeting' } };

  // a question back waiting: the next words pick among its products („afumați” → cârnați afumați); the holiday menu's
  // rows (row 11b) are picked by their chips only
  if (st.pend?.ids?.length && !st.pend.menu) {
    const pool = st.pend.all ?? st.pend.ids;
    const hit = productSpans(ix, T, pool).find((s) => !s.generic && s.ids.length === 1);
    let id = hit?.ids[0];
    if (!id) {
      const w2 = T.filter((w) => !ix._stop.nl.has(w) && !ix._stop.ro.has(w));
      const fits = pool.filter((pid) => w2.length && w2.every((w) => ix._byId.get(pid).phw.some((ph) => ph.some((x) => same(x, w)))));
      const len = (pid) => Math.min(...ix._byId.get(pid).phw.filter((ph) => w2.every((w) => ph.some((x) => same(x, w)))).map((ph) => ph.length));
      const short = fits.length > 1 ? fits.filter((pid) => len(pid) === Math.min(...fits.map(len))) : fits;
      if (short.length === 1) id = short[0];
      else if (fits.length > 1 && fits.length < pool.length) return clarify(ctx, fits, st.pend.intent);
    }
    if (id) return productAnswer(ctx, ix._byId.get(id), st.pend.intent);
  }

  // a person, not the box (NN/g: never gatekeep) — each word counted once
  const hwAt = new Map();
  for (const m of intentAt(ix, T, 'human').filter((x) => x.exact)) {
    const v = m.len > 1 ? 2 : ['medewerker', 'operator', 'cineva'].includes(m.ph[0]) ? 1.5 : 0.6;
    if ((hwAt.get(m.at) ?? 0) < v) hwAt.set(m.at, v);
  }
  const hw = [...hwAt.values()].reduce((x, y) => x + y, 0);

  const intents = new Set(Object.keys(ix.intents).filter((k) => has(ix, T, k)));
  const scores = scoreFaq(ix, T, L, (e) => e.topic !== 'allergens', intents);
  const best = scores[0];

  if (hw >= 2 || (hw >= 1.5 && (!best || best.score < STRONG))) {
    const r = reply(L, { face: 'serious' });
    r.lines.push(fill(t.human));
    handoff(ix, r, L, raw);
    return { r, dbg: { intent: 'human', handoff: 'always' } };
  }

  // allergens: §4, word for word
  const al = allergenRoute(ctx);
  if (al) return al;

  // row 11b: the order helper (order.js) — the draft, its quantities, pickup or delivery, the day, the handover —
  // then delivery to one named town; a message about neither goes on to the answers of row 11a
  const ord = orderTurn(ctx, best);
  if (ord) return ord;
  const town = townTurn(ctx);
  if (town) return town;

  // what the message says about products
  const spans = productSpans(ix, T);
  const specific = spans.filter((s) => !s.generic && s.ids.length === 1);
  const generic = spans.filter((s) => s.generic);
  const inSpan = (i) => spans.some((s) => i >= s.at && i < s.at + s.len);
  const dyh = intents.has('do-you-have');
  const want = intents.has('price') ? 'price' : intents.has('cooking') ? 'cooking' : 'do-you-have';
  // the message is only product words („mici?”, „carnati afumati”)
  const pure = spans.length > 0 && T.every((w, i) => inSpan(i) || ix._stop.nl.has(w) || ix._stop.ro.has(w));
  const asksProduct = dyh || want !== 'do-you-have' || pure;
  const trig = new Set(intentAt(ix, T, 'do-you-have').flatMap((m) => [...Array(m.len).keys()].map((k) => m.at + k)));
  const content = T.map((w, i) => ({ w, i })).filter((x) => !ix._stop.nl.has(x.w) && !ix._stop.ro.has(x.w) && !trig.has(x.i));
  const outside = content.filter((x) => !inSpan(x.i));
  const noProduct = outside.filter((x) => !productWord(ix, x.w) && !ix._qWord.has(x.w));
  const strong = best && best.score >= STRONG && !TEMPLATE.has(best.e.id);

  // „hebben jullie X?” — one product named and nothing else asked: the product's own answer, before any bank entry
  if (dyh && specific.length === 1 && !generic.length && outside.length === 0) return productAnswer(ctx, ix._byId.get(specific[0].ids[0]), 'do-you-have');
  // „aveți drob de miel?” — a kind of meat named, the thing itself not on the list
  if (dyh && !specific.length && generic.length && noProduct.length) return notOnList(ctx, spans, noProduct);

  const followUp = !specific.length && !generic.length && st.last && (T.some((w) => BACK.has(w)) || T.length <= 4);
  if (followUp && want !== 'do-you-have' && (T.some((w) => BACK.has(w)) || T.length <= 3)) return productAnswer(ctx, ix._byId.get(st.last), want);
  // „zijn jullie zaterdag open?” — a day and an opening-hours word: the hours of that day, from hours.json
  const days = daysIn(T, ctx.now);
  if (days.length && intents.has('open-now') && !intents.has('deadline') && !intents.has('order') && !intents.has('delivery')) {
    const e = (best && best.e.topic === 'hours' && (best.e.d === 'day-hours' || best.e.d === 'open-now') ? best.e : null) ?? scores.find((x) => x.e.d === 'day-hours' || x.e.d === 'open-now')?.e;
    if (e) return entryAnswer(ctx, e, { specific, generic, want });
  }
  // two products, each with its own question („hebben jullie mici en wat kost Colli John?”), unless one bank question
  // names them together (products-romanian)
  const named = (e) => specific.filter((x) => x.ph.split(' ').every((w) => e.qw[L].some((q) => same(q, w)))).length;
  if (specific.length >= 2 && asksProduct && !(best && best.score >= STRONG && named(best.e) >= 2)) return productTurn(ctx, specific, want, best);
  if (strong) return entryAnswer(ctx, best.e, { specific, generic, want });
  if (best && TEMPLATE.has(best.e.id) && !specific.length && !st.last && best.score >= 1) return entryAnswer(ctx, best.e, { specific, generic, want });

  if (specific.length && asksProduct) return productTurn(ctx, specific, want, best);

  // „hebben jullie X?” with X not on the list: the closest products, else WhatsApp
  if (dyh && noProduct.length) return notOnList(ctx, spans, noProduct);

  if (generic.length && asksProduct) return clarify(ctx, generic[0].ids, want);

  // „en hoeveel kost dat?” — the product of the last answer
  if (followUp && (want !== 'do-you-have' || dyh)) return productAnswer(ctx, ix._byId.get(st.last), want);
  // „și cum îi fac?” — the bank, read with the last product's name added
  if (followUp) {
    const last = ix._byId.get(st.last);
    const T2 = [...T, ...words(last.n[L])];
    const b2 = scoreFaq(ix, T2, L, (e) => e.topic !== 'allergens', intents)[0];
    if (b2 && b2.score >= STRONG && !TEMPLATE.has(b2.e.id)) {
      const out = entryAnswer(ctx, b2.e, { specific: [], generic: [], want });
      out.dbg.product = last.id;
      return out;
    }
  }

  if (best && best.score >= WEAK && (best.tCover >= 0.5 || (best.lift && best.tCover >= 0.4))) return entryAnswer(ctx, best.e, { specific, generic, want });
  if (specific.length) return productTurn(ctx, specific, want, best);
  // row 11c (g): „what can you do?” typed in English — the bank's answer in the page's language (the Claude layer
  // answers it in English; the local engine has no English, only this question)
  const en = ` ${T.join(' ')} `;
  const can = ix.faq.find((e) => e.id === 'site-what-can-you-do');
  if (can && EN_CAN.some((p) => en.includes(` ${p} `))) return bankAnswer({ ...ctx, L: ctx.input.pageLang }, can, { noSwitch: true });
  return miss(ctx);
}
// the English ways to ask what the assistant can do (language knowledge, not copy)
const EN_CAN = ['what can you do', 'what do you do', 'what can i ask', 'how can you help', 'what do you know', 'what are you able to'];

/** the product answers of one message: one per product named (at most three), each with the intent of its own clause */
function productTurn(ctx, specific, want, best) {
  const { ix, T } = ctx;
  const parts = specific.slice(0, 3).map((s) => {
    const p = ix._byId.get(s.ids[0]);
    const before = T.slice(prevAt(specific, s), s.at + s.len);
    const own = has(ix, before, 'price') ? 'price' : has(ix, before, 'cooking') ? 'cooking' : p.c === 'colli' && /\b(zit|inhoud|contine|continut|erin)\b/.test(before.join(' ')) ? 'colli' : 'do-you-have';
    const intent = specific.length === 1 ? (own === 'do-you-have' ? want : own) : own;
    return productAnswer(ctx, p, intent, best && TEMPLATE.has(best.e.id) && specific.length === 1 ? best.e.id : null);
  });
  if (parts.length === 1) return parts[0];
  const r = parts[0].r;
  for (const x of parts.slice(1)) {
    r.lines.push(...x.r.lines);
    r.cards.push(...x.r.cards);
    for (const a of x.r.acts) if (r.acts.length < 2) r.acts.push(a);
  }
  return { r, dbg: { ...parts[0].dbg, product: parts[parts.length - 1].dbg.product, also: parts.slice(1).map((x) => x.dbg) } };
}

/** a word of a product's names or synonyms */
function productWord(ix, w) {
  for (const p of ix.p) for (const ph of p.phw) if (ph.some((x) => same(x, w))) return true;
  return false;
}

/** where the clause of a product span starts: after the span before it */
function prevAt(spans, s) {
  const before = spans.filter((x) => x.at < s.at);
  return before.length ? before[before.length - 1].at + before[before.length - 1].len : 0;
}

function notOnList(ctx, spans, unknown) {
  const { ix, L, raw, T } = ctx;
  const t = ix.s[L].t;
  const r = reply(L);
  const from = Math.min(...unknown.map((x) => x.i), ...spans.map((s) => s.at));
  r.lines.push(fill(t.no, { query: queryWords(raw, from) }));
  // the closest: the products a word of the question names in general (lamb, chicken …), or whose compound ends the
  // same way („eendenborst” → kippenborst, kalkoenborst); never on „vlees” / „carne” alone
  let ids = spans.flatMap((s) => s.ids);
  if (!ids.length) {
    const cat = Object.entries(ix.cats).find(([, n]) => unknown.concat(T.map((w, i) => ({ w, i }))).some((x) => [n.nl, n.ro].some((v) => words(v).some((y) => y.length >= 3 && same(y, x.w)))));
    if (cat) ids = ix.p.filter((p) => p.c === cat[0]).map((p) => p.id);
  }
  if (!ids.length)
    for (const x of unknown) {
      if (x.w.length < 8) continue;
      for (const p of ix.p)
        if (p.phw.some((ph) => ph.some((y) => y.length >= 5 && y.length < x.w.length && x.w.endsWith(y.slice(-5)) && y.endsWith(x.w.slice(-5)) && !/(vlees|carne)$/.test(y.slice(-5)))))
          ids.push(p.id);
    }
  const alts = rank(ix, uniq(ids)).slice(0, 4);
  if (alts.length) {
    r.lines.push(fill(t.alt, { list: listOf(ix, L, alts.map((p) => p.n[L])) }));
    r.chips = alts.map((p) => ({ label: p.n[L], pick: p.id }));
  } else r.lines.push(fill(t.noAlt));
  handoff(ix, r, L, raw, false);
  return { r, dbg: { intent: 'do-you-have', entry: 'products-do-you-have', dynamic: 'do-you-have', result: 'not-on-list', alternatives: alts.map((p) => p.id), handoff: 'offer', pend: alts.length ? { intent: 'do-you-have', ids: alts.map((p) => p.id) } : null } };
}

/** an answer-bank entry, computed at this moment where it is dynamic (hours, deadlines, a named product) */
function entryAnswer(ctx, e, { specific, generic, want }) {
  const { ix, L, T, now, here } = ctx;
  const one = specific.length === 1 ? ix._byId.get(specific[0].ids[0]) : null;
  if ((e.d === 'open-now' || e.d === 'day-hours') && (e.topic === 'hours' || e.topic === 'season')) {
    const days = daysIn(T, now);
    if (days.length || e.d === 'open-now') {
      const r = reply(L);
      if (days.length) for (const d of days.slice(0, 3)) r.lines.push(dayLine(ix, L, d, now));
      else r.lines.push(openNow(ix, L, now));
      linkTo(ix, r, L, e.link?.[L], here);
      return { r, dbg: { intent: 'hours', entry: e.id, dynamic: e.d, handoff: e.h } };
    }
  }
  if (e.d === 'deadline' && e.topic === 'season' && ix.menu?.deadline) {
    const r = reply(L);
    r.lines.push(fill(ix.s[L].t.menu, { menuDeadline: dateWord(L, fromIso(ix.menu.deadline)) }));
    linkTo(ix, r, L, e.link?.[L], here);
    return { r, dbg: { intent: 'deadline', entry: e.id, dynamic: e.d, handoff: e.h } };
  }
  if (e.d === 'deadline' && e.topic === 'order') {
    const days = daysIn(T, now);
    const r = reply(L);
    r.lines.push(deadlineLine(ix, L, days[0] ?? null, now));
    linkTo(ix, r, L, e.link?.[L], here);
    return { r, dbg: { intent: 'deadline', entry: e.id, dynamic: e.d, handoff: e.h } };
  }
  if (e.d === 'colli' && one && one.c === 'colli' && !e.qw[L].some((w) => one.ex.some((n) => split(n).includes(w) && w !== 'colli'))) {
    return productAnswer(ctx, one, 'colli', 'products-colli-contents');
  }
  const out = bankAnswer(ctx, e);
  // a bank answer about named products shows their cards (products-romanian: „cârnați afumați, pastramă of tobă”)
  if (e.d === 'do-you-have' || e.d === 'colli' || e.d === 'price')
    for (const s of specific.slice(0, 3)) out.r.cards.push(card(ix, ix._byId.get(s.ids[0]), L));
  if (one) out.dbg.product = one.id;
  void generic;
  void want;
  return out;
}

/** row 11f: allergen ids as the owners' table names them, lower case, joined „a, b en c” / „a, b și c” */
function alNames(ix, ids, L) {
  const n = ids.map((id) => ix.al.list.find((x) => x.id === id)?.[L].toLocaleLowerCase(L)).filter(Boolean);
  return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} ${L === 'ro' ? 'și' : 'en'} ${n[n.length - 1]}`;
}

function allergenRoute(ctx) {
  const { ix, st, T, L, raw, here } = ctx;
  const t = ix.s[L].t;
  const al = allergensIn(ix, T, L);
  const cue = T.some((w) => CUES.some((c) => same(c, w) || (w.length > c.length && w.startsWith(c) && c.length >= 5)) || /vrij$/.test(w)) || (L === 'ro' && T.some((w) => w === 'au' || w === 'are'));
  // Dutch compounds count too: „notenallergie”, „glutenallergie” (row 11f: „Ik heb een ernstige notenallergie, mag ik
  // kipbrochette eten?” went to the order flow)
  const allergyWord = T.some((w) => /allerg|^alerg|^kruisbesmet|^contaminar/.test(w));
  // a message that is only an allergen word („mosterd?”, „mustar?”, „lactosevrij?”) asks about that allergen
  const bare = al.ids.length > 0 && T.every((w) => ix._stop.nl.has(w) || ix._stop.ro.has(w) || ix.al.list.some((a) => a.w.some((x) => same(x, w) || w.startsWith(x))));
  if (!(al.strong.length || (al.ids.length && (cue || bare)) || allergyWord)) return null;

  const notice = textLine(ix.al.notice[L]);
  const done = (r, dbg) => {
    r.face = 'serious';
    linkTo(ix, r, L, ix.al.href[L], here);
    return { r, dbg: { intent: 'allergen', dynamic: 'allergen', handoff: 'none', ...dbg } };
  };
  const cats = catsIn(ix, T);
  const spans = productSpans(ix, T).filter((s) => !s.generic && s.ids.length === 1);
  const catWords = new Set();
  for (const c of ix.al.cats) for (const ph of c.phw) for (const m of find(T, ph)) for (let k = 0; k < m.len; k++) catWords.add(m.at + k);
  // a product named only by a group's own words is the group; a longer name that shares one of them („cârnați proaspeți
  // de porc” beside „cârnați”) is the product (row 11f)
  const named = spans.filter((s) => ![...Array(s.len).keys()].every((k) => catWords.has(s.at + k)));
  const back = !named.length && !cats.length && st.last && T.some((w) => BACK.has(w));
  const pid = named[0]?.ids[0] ?? (back ? st.last : null);

  // a named product: the matrix only through the owners' confirmed product → category map; until then, hand off
  if (pid) {
    const cat = ix.al.map?.[pid];
    if (!cat) {
      const r = reply(L);
      r.lines.push(fill(t.aNoList, { phone: ix.phone }), notice);
      handoff(ix, r, L, raw);
      return done(r, { entry: null, product: pid, result: 'no-list', handoff: 'always' });
    }
    cats.splice(0, cats.length, cat);
  }

  const bank = ix.faq.filter((e) => e.topic === 'allergens');
  const scores = scoreFaq(ix, T, L, (e) => e.topic === 'allergens');
  const fit = (e) => cats.every((c) => e.alCats.includes(c)) && al.ids.every((a) => e.alIds.includes(a)) && (cats.length ? e.alCats.length > 0 : e.alCats.length === 0) && (al.ids.length ? e.alIds.length > 0 : e.alIds.length === 0);
  const fitting = scores.filter((s) => fit(s.e));
  // the serious-allergy entry and the cross-contamination entry win on their own words
  // „ernstig” / „gravă” beside an allergy word is the serious-allergy entry too, compounds included („ernstige
  // notenallergie”, row 11f) — its keywords are the two-word phrases
  const grave = allergyWord && T.some((w) => /^(ernstig|levensbedreig|anafyla|grav|sever)/.test(w));
  const seriousE = grave ? scores.find((s) => s.e.id === 'allergen-serious') ?? { e: bank.find((x) => x.id === 'allergen-serious'), kHits: 1 } : null;
  const special = scores.find((s) => (s.e.id === 'allergen-serious' || s.e.id === 'allergen-cross') && s.kHits > 0) ?? (seriousE?.e ? { ...seriousE, kHits: 1 } : undefined);
  if (special && !al.ids.length) return done(bankAnswer(ctx, special.e).r, { entry: special.e.id, handoff: special.e.h });
  if (special?.e.id === 'allergen-serious') return done(bankAnswer(ctx, special.e).r, { entry: special.e.id, handoff: special.e.h });
  // row 11f (D-68): the owners confirmed the product → group map. A named product with no allergen named gets its group's
  // row of the owners' table — what it contains, what it may contain — and the notice (§4), never another group's entry
  // (10.11: „Ce alergeni are frigăruia de pui?” got the fresh-meat „nu conține alergeni” for a marinated product)
  if (pid && !al.ids.length) {
    const c = ix.al.cats.find((x) => x.id === cats[0]);
    const r = reply(L);
    r.lines.push(fill(c.contains.length ? t.aContains : t.aNone, { category: c[L], allergen: c.contains.length ? alNames(ix, c.contains, L) : L === 'ro' ? 'alergeni' : 'allergenen' }));
    if (c.may.length) r.lines.push(fill(t.aMay, { category: c[L], allergen: alNames(ix, c.may, L) }));
    r.lines.push(notice);
    return done(r, { entry: null, category: c.id, product: pid, result: 'group-row' });
  }
  if (fitting.length && fitting[0].score >= 0.3) {
    const e = fitting[0].e;
    const out = bankAnswer(ctx, e);
    if (e.h === 'always') out.r.face = 'serious';
    return done(out.r, { entry: e.id, handoff: e.h, category: cats[0] ?? null, product: pid ?? undefined });
  }
  if (cats.length && al.ids.length) {
    const r = reply(L);
    for (const cid of cats.slice(0, 3)) {
      const c = ix.al.cats.find((x) => x.id === cid);
      let none = false;
      for (const aid of al.ids.slice(0, 3)) {
        const a = ix.al.list.find((x) => x.id === aid);
        const slots = { category: c[L], allergen: a[L].toLocaleLowerCase(L) };
        none ||= !c.contains.includes(aid) && !c.may.includes(aid);
        r.lines.push(fill(c.contains.includes(aid) ? t.aContains : c.may.includes(aid) ? t.aMay : t.aNone, slots));
      }
      // row 11f: never a bare „no” — beside it, what the group may contain (the owners' table, word for word)
      if (none && c.may.length) r.lines.push(fill(t.aMay, { category: c[L], allergen: alNames(ix, c.may, L) }));
    }
    r.lines.push(notice);
    return done(r, { entry: null, category: cats[0], product: pid ?? undefined });
  }
  const list = bank.find((e) => e.id === 'allergen-list');
  const top = scores[0];
  // row 11f: a bank entry about another group never answers for this one (the category named or the product's group)
  const sameGroup = (e) => !cats.length || !e.alCats.length || cats.every((c) => e.alCats.includes(c));
  const e = top && top.score >= WEAK && (fit(top.e) || !al.ids.length) && sameGroup(top.e) ? top.e : list;
  return done(bankAnswer(ctx, e).r, { entry: e.id, handoff: e.h });
}

// ——— row 11c: what the Claude layer's function reads with the engine's own logic ———
// api/ask.js (through lib/assistant/lookups.js) answers its lookups from the same index and the same functions the box
// uses, so the model gets the facts the local engine would give (docs/assistant.md §11.2 „one set of facts, two callers”).
export const kit = { card, productSpans, scoreFaq, rank, openNow, dayLine, deadlineLine, priceLine, daysIn, dateWord, dayWord, langOf, words, DAYS, MONTHS };

/** The §4 allergen answer for a message (docs/assistant.md §11.7 point 2): the engine's allergen route word for word;
 *  a message it does not read as an allergen question (the model asked for it) gets the serious-allergy entry. */
export function allergenAnswer(ix, state, input) {
  prepare(ix);
  const st = { ...newState(input.pageLang), ...state };
  const now = brussels(input.now ?? new Date(), ix.hours.timeZone);
  const raw = String(input.text ?? '').slice(0, 500);
  const T = words(raw);
  const { lang: L, sure } = langOf(ix, T, raw, st.lang ?? input.pageLang);
  const ctx = { ix, st, now, at: input.now ?? new Date(), raw, T, L, sure, input, here: input.path };
  let out = allergenRoute(ctx);
  if (!out) {
    const e = ix.faq.find((x) => x.id === 'allergen-serious') ?? ix.faq.find((x) => x.topic === 'allergens');
    out = bankAnswer(ctx, e);
    out.r.face = 'serious';
    linkTo(ix, out.r, L, ix.al.href[L], ctx.here);
    out.dbg = { ...out.dbg, intent: 'allergen', dynamic: 'allergen' };
  }
  return { reply: out.r, dbg: out.dbg };
}
