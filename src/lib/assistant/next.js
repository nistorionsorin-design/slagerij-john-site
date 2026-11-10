// The assistant's next question (row 11d; docs/assistant.md §13 · §13.9; D-65 · D-69; src/data/assistant-paths.json and
// assistant-pairings.json, carried in the index as `ix.nq`). Plain JavaScript, no DOM, no storage: the engine
// (engine.js) draws the buttons of the local engine with it, the Claude layer's function (api/ask.js) filters the
// model's button ids with the same rules — one set of rules, two callers.
// A button is an id of assistant-paths.json `buttons`; its label is the file's, never written here or by the model.
// After an answer, the first row of `after` whose `when` fits decides; of its `offer`, the first ones that pass the
// rules are shown — at most `max` (2), often one, sometimes none.
// What the conversation keeps for the rules (the state's `nq`, numbers and ids only): `s` = how often each button was
// shown, `a` = the answers given (as keys, below), `p` = the product the last buttons were drawn for (a tap refers to
// it). The ids a customer tapped are not kept here: the box holds them in the page's memory for the handover's count.
import { fill } from './say.js';
import { money } from '../order-core.js';

// product.kg-meat: the volume discount's own scope (FACTS: only meat, only on order) — the rubrics of the paths file
const MEAT_KG = new Set(['rund', 'varken', 'kip', 'lam', 'marinades', 'roemeens']);
const uniq = (a) => [...new Set(a.filter(Boolean))];
const A_MAX = 60;

export const newNq = () => ({ s: {}, a: [], p: null });
/** the state's `nq`, copied (a missing or malformed one is a new one) */
export function nqOf(st) {
  const n = st?.nq && typeof st.nq === 'object' ? st.nq : {};
  const s = {};
  for (const [k, v] of Object.entries(n.s && typeof n.s === 'object' ? n.s : {})) if (typeof k === 'string' && k.length <= 40 && Number(v) > 0) s[k] = Math.min(9, Math.floor(Number(v)));
  const a = (Array.isArray(n.a) ? n.a : []).filter((x) => typeof x === 'string' && x.length <= 80).slice(-A_MAX);
  return { s, a, p: typeof n.p === 'string' && n.p.length <= 60 ? n.p : null };
}

// ——— „what goes with it” (§13.4) ———

/** the owners' pairing row for a product (its id, its rubric, or the holiday menu it is a row of), or null */
export function pairingOf(ix, p) {
  if (!p || !ix.nq) return null;
  const menuRow = (m) => ix.order?.menu?.id === m && (ix.order.menu.rows ?? []).some((r) => r.id === p.id);
  return ix.nq.pairs.find((r) => r.p.includes(p.id) || (r.cat && r.cat === p.c) || (r.menu && menuRow(r.menu))) ?? null;
}

/** The cards (≤ 3 product ids, never the product itself), the text and the WhatsApp button of „Wat past erbij?” for a
 *  product: the owners' pairing row first (its `show`, or this week's list without any colli for `show_from: week`, or
 *  its `text` where it shows no card), else the four data sources of §13.4 in order — what a recipe names beside the
 *  product · the colli that holds it · the rubric's best sellers · this week's list. */
export function withCards(ix, L, p) {
  const not = (id) => id !== p.id && ix._byId.has(id);
  const row = pairingOf(ix, p);
  if (row) {
    const ids = (row.from === 'week' ? ix.nq.week.filter((id) => ix._byId.get(id)?.c !== 'colli') : row.show).filter(not).slice(0, 3);
    if (ids.length || row.text) return { ids, text: row.text?.[L] ?? null, wa: !!row.wa, row: row.id, basis: row.basis };
  }
  const out = [];
  for (const id of [...(ix.nq.rcp[p.id] ?? []), ...(p.inc ?? []), ...(ix.nq.best[p.c] ?? []), ...ix.nq.week]) if (not(id) && !out.includes(id) && out.length < 3) out.push(id);
  return { ids: out, text: null, wa: false, row: null, basis: 'data' };
}

/** the cards a bank answer carries under it (`cards_under_bank`: the row's first three), or [] */
export const underBank = (ix, entry) => (ix.nq?.pairs.find((r) => r.bank === entry && r.under)?.show ?? []).filter((id) => ix._byId.has(id)).slice(0, 3);

// ——— keys: what an answer gave, so its button is never offered again (rules.passed) ———

/** the key of the answer a button leads to, for product p */
export function buttonKey(b, p) {
  if (b.entry) return `e:${b.entry}`;
  if (b.say === 'askTown') return 's:askTown';
  if (b.say) return `s:${b.say}:${p?.id ?? ''}`;
  if (b.cards) return `w:${p?.id ?? ''}`;
  if (b.pick) return `a:${p?.id ?? ''}`;
  return null;
}

/** the keys an answer gave: its bank entry, the line it said, the cards of „what goes with it” it showed — typed or
 *  tapped alike (a product's cooking answer is its cooking line; „Wat zit er in Colli John?” is the colli's contents;
 *  a pairing's bank answer is that product's „what goes with it”; a town answered is the town question) */
export function keysOf(ix, dbg) {
  const k = [];
  const p = dbg.product ?? null;
  if (dbg.entry) k.push(`e:${dbg.entry}`);
  if (dbg.say) k.push(dbg.say === 'askTown' ? 's:askTown' : `s:${dbg.say}:${p ?? ''}`);
  if (dbg.cardsOf) k.push(`w:${dbg.cardsOf}`);
  if (p && dbg.intent === 'cooking') k.push(`s:cookLine:${p}`);
  const cook = /^products-(.+)-cook$/.exec(dbg.entry ?? '');
  if (cook && ix._byId.has(cook[1])) k.push(`s:cookLine:${cook[1]}`);
  if (p && ix._byId.get(p)?.c === 'colli' && (dbg.intent === 'colli' || dbg.entry === 'products-colli-contents' || dbg.entry === 'products-colli-john')) k.push(`s:colliContents:${p}`);
  for (const r of ix.nq?.pairs ?? []) if (dbg.entry && r.bank === dbg.entry) for (const id of r.p) k.push(`w:${id}`);
  if (dbg.intent === 'delivery-town') k.push('s:askTown');
  return uniq(k);
}

// ——— the rules ———

/** no button at all after this answer (rules.never and rules.never.also): an allergen or legal answer, a hand-off,
 *  a miss, a person asked for, a question back, the greeting; a reply that carries the order helper's own chips or its
 *  handover buttons (the helper leads); an answer that shows an offer row (one nudge at a time) */
export function blocked(ix, dbg, reply) {
  const nv = ix.nq.never;
  const intent = dbg.intent === 'human' ? 'person' : dbg.intent;
  if (nv.intents.includes(intent)) return true;
  if (dbg.handoff === 'always') return true;
  if (dbg.dynamic === 'allergen') return true;
  if (dbg.entry && nv.entries.includes(dbg.entry)) return true;
  const e = dbg.entry ? ix.faq.find((x) => x.id === dbg.entry) : null;
  if (e && nv.topics.includes(e.topic)) return true;
  if (['greeting', 'thanks', 'restart', 'order-start', 'order-personal'].includes(dbg.intent)) return true;
  if (dbg.offer || dbg.scope || dbg.complaint) return true;
  if (reply.chips?.length) return true;
  if ((reply.acts ?? []).some((a) => a.kind === 'form' || (a.kind === 'wa' && a.order))) return true;
  return false;
}

/** the row of `after` that fits the answer, or null — the first one whose every `when` key holds */
export function rowFor(ix, dbg, p, reply) {
  // the town answer of row 11b is computed („Ja, wij leveren in Tielt …”), not the bank's text: its entry
  // (delivery-towns, for the tests of 11b) is no `entry` here — the row `intent: delivery-town` is its own
  const entry = dbg.intent === 'delivery-town' ? null : dbg.entry;
  for (const r of ix.nq.after) {
    const w = r.when;
    let ok = true;
    for (const [key, v] of Object.entries(w)) {
      if (key === 'intent') ok = dbg.intent === v;
      else if (key === 'result') ok = dbg.result === v;
      else if (key === 'product') ok = !!p && (v === 'colli' ? p.c === 'colli' : v === 'not-colli' ? p.c !== 'colli' : p.id === v);
      else if (key === 'entry') ok = Array.isArray(v) && !!entry && v.includes(entry);
      else if (key === 'say') ok = dbg.say === v;
      else if (key === 'draft') ok = v === 'line-added' && ['order-add', 'order-change'].includes(dbg.intent);
      else if (key === 'helper') ok = v === 'asks-nothing' && !(reply.chips?.length);
      else if (key === 'place') ok = v === 'named' && !!dbg.place;
      else ok = false;
      if (!ok) break;
    }
    if (ok) return r;
  }
  return null;
}

/** one `needs` entry of a button for product p, in the answer just given */
function need(ix, n, p, { reply, L, keysNow }) {
  switch (n) {
    case 'product':
      return !!p;
    case 'pairing': {
      if (!p) return false;
      const w = withCards(ix, L, p);
      return !!(w.ids.length || w.text);
    }
    case 'product.line':
      return !!p?.line?.[L];
    case 'product.in-colli':
      return !!p?.inc?.length;
    case 'product.is-colli':
      return p?.c === 'colli';
    case 'product.kg-meat':
      return p?.u === 'kg' && MEAT_KG.has(p.c);
    case 'no-card-with-add':
      return !(reply.cards ?? []).some((c) => c.id === p?.id && c.add);
    case 'no-recipe-link':
      return !(p?.rc && (reply.acts ?? []).some((a) => a.kind === 'link' && a.href === p.rc[L]));
    case 'no-colli-link':
      return !(p?.inc ?? []).some((cid) => {
        const c = ix._byId.get(cid);
        return c && (reply.acts ?? []).some((a) => a.kind === 'link' && a.href === c.href[L]);
      });
    case 'contents-not-said':
      return !keysNow.includes(`s:colliContents:${p?.id}`);
    default:
      // a need this code does not know: the button is not shown
      return false;
  }
}

/** a button's label in the customer's language, {product} filled (the file's labels, never the model's words) */
export const labelOf = (ix, id, L, p) => fill(ix.nq.b[id].l[L] ?? ix.nq.b[id].l.nl, { product: p?.n[L] ?? '' }).map((s) => s.t).join('');

/**
 * Whether button `id` may be shown now. o: { nq (the conversation's, keys of this answer added), p (the product the
 * buttons refer to), reply, L, today (YYYY-MM-DD, Brussels), keysNow, draft }.
 */
export function passes(ix, id, o) {
  const b = ix.nq.b[id];
  if (!b) return false;
  if (b.until && o.today > b.until) return false;
  if ((o.nq.s[id] ?? 0) >= 2) return false;
  if (!b.needs.every((n) => need(ix, n, o.p, o))) return false;
  const key = buttonKey(b, o.p);
  if (key && o.nq.a.includes(key)) return false;
  // „Zet het bij mijn bestelling”: never for a product already on the slip
  if (b.pick && o.p && (o.draft?.items ?? []).some(([x]) => x === o.p.id)) return false;
  return true;
}

/**
 * The buttons under an answer, and the conversation's `nq` after it.
 * @param ix   the index
 * @param o    { st (the state before this answer), reply, dbg, L, today, product (the open sheet's), draft (after),
 *               ids (the Claude layer: the model's ids, in its order — instead of the `after` table) }
 * @returns {{ ids: string[], chips: {id: string, label: string, p?: string}[], nq: object, stage: string|null }}
 */
export function nextFor(ix, o) {
  const nq = nqOf(o.st);
  const keysNow = ix.nq ? keysOf(ix, o.dbg) : [];
  nq.a = uniq([...nq.a, ...keysNow]).slice(-A_MAX);
  const none = { ids: [], chips: [], nq, stage: null };
  if (!ix.nq || blocked(ix, o.dbg, o.reply)) return none;
  const byId = (id) => (id ? ix._byId.get(id) ?? null : null);
  // the product the buttons refer to: named in the answer, the row's own, the open product sheet, or the last one. With
  // the layer, the first card the model showed names it; the cards under a bank answer („Past erbij”) never do.
  const named = byId(o.dbg.product) ?? (o.ids ? byId(o.reply.cards?.[0]?.id) : null);
  const pre = named ?? byId(o.product) ?? byId(o.st?.last);
  const row = o.ids ? null : rowFor(ix, o.dbg, pre, o.reply);
  if (!o.ids && !row) return none;
  const p = named ?? byId(row?.product) ?? byId(o.product) ?? byId(o.st?.last);
  const cand = o.ids ? uniq(o.ids.filter((x) => typeof x === 'string' && Object.hasOwn(ix.nq.b, x))) : row.offer;
  const args = { nq, p, reply: o.reply, L: o.L, today: o.today, keysNow, draft: o.draft };
  const ids = cand.filter((id) => passes(ix, id, args)).slice(0, ix.nq.max);
  for (const id of ids) nq.s[id] = (nq.s[id] ?? 0) + 1;
  nq.p = p?.id ?? null;
  // each button carries the product it was drawn for: a tap on a button of an older answer still means that product
  return { ids, chips: ids.map((id) => ({ id, label: labelOf(ix, id, o.L, p), ...(p ? { p: p.id } : {}) })), nq, stage: row?.stage ?? null };
}

/** „{product} zit in BBQ Colli (€55).” — the colli lines that name the product, each with its price, „, ” and „ en ” */
export function inColliList(ix, L, p) {
  const names = (p.inc ?? []).map((id) => ix._byId.get(id)).filter(Boolean).map((c) => `${c.n[L]} (${c.pr === null || c.ps ? c.pl?.[L] ?? '' : money(c.pr, L)})`);
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${ix.s[L].nq.and} ${names[names.length - 1]}`;
}
