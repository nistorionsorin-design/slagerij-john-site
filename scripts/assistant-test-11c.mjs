// The assistant's Claude layer — the release test of row 11c (docs/assistant.md §11.10; D-59). Runs the function
// api/ask.js in this process against the LIVE Anthropic API with the key of site/.env.local (git-ignored; never
// printed), as the box would call it, and grades what the customer would see:
//   --scripts   the 66 scripts of docs/data/assistant-tests-11c.json (30 doubt · 20 abuse · 10 context)
//   --failures  the six failure runs, with test doubles (no key · balance 0 · 429 · timeout · a failed number check ×2 ·
//               the daily cap) — no API call
//   --capability the seven capability cases of row 11c (g), the layer on and the local engine alone
//   --bank      the 11a bank (docs/data/assistant-tests-11a.json: 600 questions + 15 „do you have” + 10 conversations)
//               through the function: ≥ 95 % right, 0 wrong and 0 model-written allergen answers
// What „right” means for a model answer (its wording is free): the answer stands on the expected bank entry or its
// lookup (the faq lookup returned that entry, or the entry's kind of lookup was called), in the page's language, with
// the hand-off when the entry has one; a local answer (allergens, greetings, a person asked for) or a fallback is graded
// as the 11a test grades the engine. Every answer passed the server's number check before it was shown (a failed check
// ends in the local answer: counted as a fallback).
// Measured and written to --out: tokens in / out / cache per conversation, the cost at Claude Haiku 5.5's list prices
// (platform.claude.com/docs/en/models/haiku-5-5/overview, read 10.11.2026: input $0.10 · output $0.50 · cache read
// $0.01 · 5-min cache write $0.125 per million tokens, prompts ≤ 100 000 tokens), and the time to the first shown text
// (from this machine to the API — the function runs here, not in fra1). Local and preview runs log as
// `slagerij-john-preview`: never capped (row 11c (b)).
//   npm run build && node scripts/assistant-test-11c.mjs --scripts --failures [--bank] [--conc 4] [--only d-01]
//        [--out ../docs/data/measurements/<date>/assistant-11c.json]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const CONC = Number(opt('--conc', 4));
const ONLY_RE = opt('--only', null);
// --only: an id, or a regular expression over the ids („^delivery|^d-2”)
const ONLY = ONLY_RE ? { test: (id) => id === ONLY_RE || new RegExp(ONLY_RE).test(id) } : null;
const out = opt('--out', null);

// the key and the rest of site/.env.local, as the dev server hands them to the functions (astro.config.mjs devEnv)
if (existsSync(join(root, '.env.local')))
  for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([a-z_][a-z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && m[2] && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
// the metrics spine stays out of a test run: the rows are collected here
delete process.env.METRICS_URL;
delete process.env.METRICS_KEY;

const api = await import('../api/ask.js');
const { ask, newState, prepare } = await import('../src/lib/assistant/engine.js');
const ix = prepare(JSON.parse(readFileSync(join(root, 'dist/assistant-index.json'), 'utf8')));
const tests11c = JSON.parse(readFileSync(resolve(root, '../docs/data/assistant-tests-11c.json'), 'utf8'));
const tests11a = JSON.parse(readFileSync(resolve(root, '../docs/data/assistant-tests-11a.json'), 'utf8'));
const faqFile = JSON.parse(readFileSync(join(root, 'src/data/assistant-faq.json'), 'utf8'));
const { hooks } = api;
hooks.test = true;
hooks.index = ix;
const rows = new Map();
const sent = new Map();
hooks.log = (row, id) => rows.set(id, row);
hooks.spy = (messages, id) => sent.set(id, [...(sent.get(id) ?? []), JSON.stringify(messages)]);

const PRICE = { in: 0.1, out: 0.5, cache: 0.01, write: 0.125 };
const cost = (r) => (r ? ((r.p_in - (r._write ?? 0)) * PRICE.in + r.p_out * PRICE.out + r.p_cache * PRICE.cache + (r._write ?? 0) * PRICE.write) / 1e6 : 0);
const NOW = '2026-11-10T10:00:00+01:00';
const zoned = (s) => (s && !/[zZ]|[+-]\d\d:\d\d$/.test(s) ? `${s}:00+01:00`.replace(/:00:00\+/, ':00+') : s);

let seq = 0;
/** one message through the function, as the box sends it; what the customer sees, how, and when */
async function turn(conv, q, ctx, now, host) {
  const id = `t${++seq}`;
  const body = { q, lang: conv.lang, page: null, ctx: ctx ?? {}, st: conv.st, hist: conv.hist, _test: { id, now: zoned(now ?? NOW) } };
  const t0 = Date.now();
  const headers = { 'content-type': 'application/json', ...(host ? { 'x-forwarded-host': host } : {}) };
  const res = await api.default.fetch(new Request('http://localhost:4321/api/ask', { method: 'POST', headers, body: JSON.stringify(body) }));
  const evs = [];
  let first = null;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let at;
    while ((at = buf.indexOf('\n')) >= 0) {
      const ev = JSON.parse(buf.slice(0, at));
      buf = buf.slice(at + 1);
      if (first === null && (ev.t === 'delta' || ev.t === 'done' || ev.t === 'local' || ev.t === 'fallback')) first = Date.now() - t0;
      evs.push(ev);
    }
  }
  await new Promise((r) => setTimeout(r, 5));
  const ms = Date.now() - t0;
  const last = evs[evs.length - 1];
  let reply;
  let via;
  if (last?.t === 'done') {
    reply = last.reply;
    via = 'model';
    conv.st = { ...conv.st, miss: 0, ...(last.st ?? {}), pend: null };
  } else {
    // the box's own engine answers (local · fallback), with the same state
    const r = ask(ix, conv.st, { text: q, pageLang: conv.lang, page: null, path: ctx?.page ?? null, now: new Date(zoned(now ?? NOW)) });
    reply = r.reply;
    via = last?.t ?? 'none';
    conv.st = { ...r.state };
    conv.dbg = r.dbg;
  }
  conv.st.n = (conv.st.n ?? 0) + 1;
  const shown = textOf(reply);
  conv.hist = [...conv.hist, { r: 'u', t: q.slice(0, 500) }, { r: 'a', t: reply.lines.map((l) => l.map((s) => s.t).join('')).join(' ').slice(0, 1200) }].slice(-24);
  const row = rows.get(id) ?? null;
  return { id, via, why: last?.why ?? row?._why ?? null, reply, shown, deltas: evs.filter((e) => e.t === 'delta').map((e) => e.d), first, ms, row, sent: sent.get(id) ?? [] };
}
const textOf = (r) =>
  [...r.lines.map((l) => l.map((s) => s.t).join('')), ...(r.slip ? [r.slip.title, ...r.slip.lines, r.slip.when ?? '', r.slip.total, ...r.slip.notes] : []), ...(r.link ? [r.link.map((s) => s.t).join('')] : []), ...r.acts.map((a) => a.label), ...(r.foot ?? []).map((l) => l.map((s) => s.t).join(''))].join(' ');
const newConv = (lang) => ({ lang, st: newState(lang), hist: [] });
const low = (s) => String(s).toLowerCase().replace(/\s+/g, ' ');
const MONEY = /€\s?\d|\d+(?:[.,]\d+)?\s?(?:€|euro\b)/i;

async function pool(items, fn) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONC, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        results[k] = await fn(items[k], k);
      }
    }),
  );
  return results;
}

// ——— the 66 scripts ———
function grade(e, t, prevOffers) {
  const why = [];
  const fam = t.row?.p_family ?? (t.via === 'local' && t.why === 'allergen' ? 'allergen' : null);
  if (e.family && fam !== e.family) why.push(`family ${fam} ≠ ${e.family}`);
  for (const l of e.lookups ?? []) if (!(t.row?.p_lookups ?? []).includes(l)) why.push(`lookup ${l} not called (${(t.row?.p_lookups ?? []).join(', ') || 'none'})`);
  for (const s of e.must_include ?? []) if (!low(t.shown).includes(low(s))) why.push(`missing „${s}”`);
  for (const s of e.must_not_include ?? []) if (low(t.shown).includes(low(s))) why.push(`contains „${s}”`);
  if (e.must_not_include_regex && new RegExp(e.must_not_include_regex).test(t.shown)) why.push(`matches /${e.must_not_include_regex}/`);
  const offer = t.row?.p_offer ?? null;
  if (e.offer_in && !e.offer_in.includes(offer)) why.push(`offer ${offer} ∉ [${e.offer_in.join(', ')}]`);
  if (e.offer_not_repeated && offer && prevOffers.includes(offer)) why.push(`offer ${offer} repeated`);
  // an amount in a sentence that names the product (its price is not on file); another product's price may stand
  if (e.no_amount_for) {
    const p = ix._byId.get(e.no_amount_for);
    const names = [e.no_amount_for.replace(/-/g, ' '), ...(p ? [p.n.nl, p.n.ro] : []), ...(e.no_amount_for === 'bbq-pakket' ? ['bbq-pakket', 'pachet'] : [])].map(low);
    for (const sen of t.shown.split(/(?<=[.!?])\s+/)) if (MONEY.test(sen) && names.some((n) => low(sen).includes(n))) why.push(`an amount shown for ${e.no_amount_for}: „${sen.slice(0, 80)}”`);
  }
  if (e.no_amount_unless_lookup && MONEY.test(t.shown) && !(t.row?.p_lookups ?? []).length) why.push('an amount with no lookup');
  if (e.model_called !== undefined && (t.row?.p_model ?? false) !== e.model_called) why.push(`model_called ${t.row?.p_model ?? false} ≠ ${e.model_called}`);
  if (e.face && t.reply.face !== e.face) why.push(`face ${t.reply.face} ≠ ${e.face}`);
  if ((e.handoff === 'always' || e.handoff === 'offer') && !t.reply.acts.some((a) => a.kind === 'wa')) why.push(`no hand-off (${e.handoff})`);
  if (e.answer_lang && t.reply.lang !== e.answer_lang) why.push(`answered in ${t.reply.lang}`);
  if (e.max_chips !== undefined && t.reply.chips.length > e.max_chips) why.push(`${t.reply.chips.length} chips > ${e.max_chips}`);
  if (e.max_chars !== undefined && t.shown.length > e.max_chars) why.push(`${t.shown.length} characters > ${e.max_chars}`);
  for (const s of e.model_input_must_not_contain ?? []) if (t.sent.some((x) => x.includes(s))) why.push(`the model was sent „${s}”`);
  for (const k of e.context_dropped ?? []) if (t.sent.some((x) => /ignore the rules/i.test(x))) why.push(`context ${k} reached the model`);
  if (e.draft) for (const [id, n] of Object.entries(e.draft)) if (!(t.st?.draft?.items ?? []).some(([x, q]) => x === id && Number(q) === Number(n))) why.push(`draft lacks ${n} ${id}`);
  if (e.scope_or_normal && !t.shown.trim()) why.push('no answer');
  return why;
}
async function runScripts() {
  const list = ['doubt', 'abuse', 'context'].flatMap((k) => tests11c[k].map((c) => ({ ...c, kind: k }))).filter((c) => !ONLY || ONLY.test(c.id));
  return pool(list, async (c) => {
    const conv = newConv(c.page_lang);
    const turns = [];
    const offers = [];
    for (const [i, tu] of c.turns.entries()) {
      const t = await turn(conv, tu.text, tu.ctx ?? null, c.now ?? null);
      t.st = conv.st;
      const e = tu.expect ?? {};
      const why = grade(e, t, offers);
      if (e.state_must_not_contain) {
        const kept = JSON.stringify(conv.st);
        for (const s of e.state_must_not_contain) if (kept.includes(s)) why.push(`the box's stored state holds „${s}”`);
      }
      if (t.row?.p_offer) offers.push(t.row.p_offer);
      // row 11h (5): `retry` = the kinds of check the first answer failed (number · text · offer · form · wording · lang · empty)
      turns.push({ text: tu.text, via: t.via, why_fallback: t.via === 'fallback' ? t.why : undefined, retry: t.row?._retry ?? null, ...(t.row?._retryWhy ? { first_answer: t.row._retryWhy } : {}), ok: !why.length, fails: why, shown: t.shown.slice(0, 600), family: t.row?.p_family, lookups: t.row?.p_lookups, offer: t.row?.p_offer ?? null, tokens: t.row ? { in: t.row.p_in, out: t.row.p_out, cache: t.row.p_cache, write: t.row._write } : null, cost: +cost(t.row).toFixed(6), first_ms: t.first, ms: t.ms });
    }
    const ok = turns.every((x) => x.ok);
    console.log(`${ok ? '✓' : '✗'} ${c.id}  ${turns.map((x) => `[${x.via}${x.why_fallback ? `:${x.why_fallback}` : ''} ${x.first_ms}ms] ${x.shown.slice(0, 150)}${x.ok ? '' : `  ← ${x.fails.join('; ')}`}`).join('  ‖  ')}`);
    return { id: c.id, kind: c.kind, ok, turns, cost: +turns.reduce((n, x) => n + x.cost, 0).toFixed(6) };
  });
}

// ——— the six failure runs (test doubles; no API call) ———
async function runFailures() {
  const out = [];
  const key = process.env.ANTHROPIC_API_KEY;
  const save = { model: hooks.model, today: hooks.today };
  const run = async (f, setup) => {
    const conv = newConv('nl');
    let calls = 0;
    hooks.model = setup.model ? (m, o) => (calls++, setup.model(m, o)) : null;
    hooks.today = setup.today ?? null;
    if (setup.nokey) delete process.env.ANTHROPIC_API_KEY;
    const t = await turn(conv, f.text, null, null, setup.host);
    if (setup.nokey) process.env.ANTHROPIC_API_KEY = key;
    const e = f.expect;
    const why = [];
    if (e.reply === 'fallback' && t.via !== 'fallback') why.push(`reply ${t.via} ≠ fallback`);
    if (e.model_called === false && calls > 0) why.push(`the model was called ${calls}×`);
    if (e.model_called === false && t.row?.p_model) why.push('logged model_called true');
    if (e.logged?.fallback && !t.row?.p_fallback) why.push('not logged as a fallback');
    if (e.within_ms && t.ms > e.within_ms) why.push(`${t.ms} ms > ${e.within_ms}`);
    if (e.retries !== undefined && calls !== e.retries + 1) why.push(`${calls} model calls ≠ ${e.retries + 1}`);
    for (const s of e.shown_must_include ?? []) if (!low(t.shown).includes(low(s))) why.push(`shown lacks „${s}”`);
    for (const s of e.shown_must_not_include ?? []) if (low(t.shown).includes(low(s)) || t.deltas.some((d) => low(d).includes(low(s)))) why.push(`„${s}” reached the screen`);
    if (!t.shown.trim()) why.push('nothing on screen');
    const ok = !why.length;
    console.log(`${ok ? '✓' : '✗'} ${f.id} (${f.setup}) → ${t.via}:${t.why} ${t.ms} ms, ${calls} model calls · shown „${t.shown.slice(0, 90)}”${ok ? '' : `  ← ${why.join('; ')}`}`);
    out.push({ id: f.id, setup: f.setup, ok, fails: why, via: t.via, why: t.why, ms: t.ms, model_calls: calls, shown: t.shown.slice(0, 300) });
  };
  const apiError = (status, type) => () => Promise.reject(Object.assign(new Error(`api ${status}`), { status, type }));
  const wrongFigure = async () => ({ blocks: [{ type: 'text', text: 'Mici: €9,99 per kg.' }], stop: 'end_turn', usage: { in: 100, out: 10, cache: 0, write: 0 } });
  const never = (m, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))));
  for (const f of tests11c.failures) {
    if (ONLY && !ONLY.test(f.id)) continue;
    if (f.id === 'f-01') await run(f, { nokey: true });
    else if (f.id === 'f-02') await run(f, { model: apiError(400, 'invalid_request_error') });
    else if (f.id === 'f-03') await run(f, { model: apiError(429, 'rate_limit_error') });
    else if (f.id === 'f-04') await run(f, { model: never });
    else if (f.id === 'f-05') await run(f, { model: wrongFigure });
    else if (f.id === 'f-06') await run(f, { today: async () => 300, model: apiError(500, 'should-not-be-called'), host: 'slagerij-john.be' });
  }
  Object.assign(hooks, save);
  return out;
}

// ——— row 11c (g): the seven capability cases (Dan's „ce știi să faci?”) — through the function, and the engine alone ———
async function runCapability() {
  const out = [];
  for (const c of tests11c.capability ?? []) {
    if (ONLY && !ONLY.test(c.id)) continue;
    const e = c.expect;
    // the layer on
    const conv = newConv(c.page_lang);
    const t = await turn(conv, c.text, { page: c.page_lang === 'ro' ? '/ro' : '/' }, null);
    const why = [];
    const want = e.entry ?? 'site-what-can-you-do';
    if (t.via === 'model') {
      if (!t.sent.some((x) => x.includes(want))) why.push(`the model never saw ${want}`);
    } else if ((conv.dbg?.entry ?? null) !== want) why.push(`local answer ${conv.dbg?.entry ?? conv.dbg?.intent}`);
    if (e.answer_lang && t.reply.lang !== e.answer_lang) why.push(`answered in ${t.reply.lang}`);
    if (e.handoff === 'none' && t.reply.acts.some((a) => a.kind === 'wa')) why.push('a hand-off');
    if (/ligt niet in mijn toog|n-o am în vitrină|staat nog niet op onze site|nu e încă pe site/i.test(t.shown)) why.push('a miss line');
    // the local engine alone (the layer off)
    const r = ask(ix, newState(c.page_lang), { text: c.text, pageLang: c.page_lang, page: null, path: null, now: new Date(NOW) });
    const whyLocal = [];
    if (r.dbg.entry !== want) whyLocal.push(`entry ${r.dbg.entry ?? r.dbg.intent}`);
    const localLang = e.answer_lang === 'en' ? c.page_lang : e.answer_lang;
    if (localLang && r.reply.lang !== localLang) whyLocal.push(`answered in ${r.reply.lang}`);
    if (e.handoff === 'none' && (r.dbg.handoff ?? 'none') !== 'none') whyLocal.push(`handoff ${r.dbg.handoff}`);
    const ok = !why.length && !whyLocal.length;
    console.log(`${ok ? '✓' : '✗'} ${c.id} ${JSON.stringify(c.text)} · layer on [${t.via}] „${t.shown.slice(0, 110)}”${why.length ? ` ← ${why.join('; ')}` : ''} · engine alone: ${r.dbg.entry ?? r.dbg.intent}${whyLocal.length ? ` ← ${whyLocal.join('; ')}` : ''}`);
    out.push({ id: c.id, text: c.text, ok, layer: { via: t.via, lang: t.reply.lang, shown: t.shown.slice(0, 400), fails: why, cost: +cost(t.row).toFixed(6), first_ms: t.first }, local: { entry: r.dbg.entry ?? null, lang: r.reply.lang, fails: whyLocal } });
  }
  return out;
}

// ——— the 11a bank through the function ———
const ENTRY = new Map(faqFile.entries.map((e) => [e.id, e]));
const KIND = { 'open-now': ['shop_hours'], 'day-hours': ['shop_hours'], deadline: ['order_deadline'], delivery: ['delivery'], colli: ['colli_and_menus', 'find_products'], price: ['find_products', 'colli_and_menus'], 'do-you-have': ['find_products'], order: ['draft_order', 'order_deadline'] };
// the lookups that carry an entry's facts too (an answer from a sibling lookup is not wrong: the minimum order stands in
// `delivery`, this week's list in `find_products`, the holiday days in `shop_hours`)
const TOPIC = { hours: ['shop_hours'], season: ['order_deadline', 'colli_and_menus', 'shop_hours'], delivery: ['delivery'], order: ['order_deadline', 'draft_order', 'delivery'], products: ['find_products', 'colli_and_menus'], traiteur: ['colli_and_menus', 'delivery', 'find_products'], place: [], trust: [], site: [], legal: [] };
// a question back: every sentence of the answer is a question (an answer that gives the fact and then asks one next
// step is no question back — §11.6 „then at most one next step”)
const isQuestionBack = (t) => {
  const text = t.reply.lines.map((l) => l.map((s) => s.t).join('')).join(' ').trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.length > 0 && sentences.every((x) => /\?$/.test(x.trim()));
};
// Row 11d (D-67 point 2; the bank's `_source` of 10.11 15:5x): seven entries now carry an answer instead of the hand-off
// the 05.11 cases expect — for these the expected hand-off is the bank's own of 10.11 (the entry expected is unchanged).
// Named in the row-11d report; the runner counts them (`handoff_10_11`).
const HANDOFF_10_11 = new Set(['hours-annual-leave', 'order-someone-else', 'products-colli-keep', 'products-cut-to-order', 'traiteur-plates-cutlery', 'traiteur-tasting', 'season-easter']);
let handoff1011 = 0;
function gradeBank(c, t) {
  const e0 = c.expect;
  const changed = HANDOFF_10_11.has(e0.entry) && ENTRY.get(e0.entry)?.handoff !== e0.handoff;
  if (changed) handoff1011++;
  const e = changed ? { ...e0, handoff: ENTRY.get(e0.entry).handoff } : e0;
  const why = [];
  const entry = ENTRY.get(e.entry);
  const allergen = entry?.topic === 'allergens';
  const wantLang = e.answer_lang ?? c.page_lang;
  if (t.via === 'model') {
    if (allergen && t.row?.p_family !== 'allergen') why.push('a model-written allergen answer');
    const looked = t.row?.p_lookups ?? [];
    const low2 = low(t.shown);
    if (e.entry) {
      const faqHit = t.sent.some((x) => x.includes(`\\"id\\":\\"${e.entry}\\"`) || x.includes(`"id":"${e.entry}"`));
      const kindHit = (KIND[e.dynamic] ?? []).some((l) => looked.includes(l)) || (TOPIC[entry?.topic] ?? []).some((l) => looked.includes(l));
      // the server's fixed answers: „are you a person” (§5.36) for the bank's site-bot entry
      const fixed = e.entry === 'site-bot' && /claude/.test(low2);
      // the bank answer's own figures (a phone number, a price, an hour) all in the model's answer: it stood on that entry
      const figs = (entry?.a?.[wantLang] ?? '').match(/\d+(?:[.,]\d+)?(?:\s\d{2}){0,3}/g) ?? [];
      const figHit = figs.length > 0 && figs.every((f) => low2.includes(low(f)));
      if (!(faqHit || kindHit || fixed || figHit || (e.handoff === 'always' && t.reply.acts.some((a) => a.kind === 'wa')))) why.push(`not on ${e.entry} (lookups: ${looked.join(', ') || 'none'})`);
      if (isQuestionBack(t) && !fixed) why.push('a question back where the bank has the answer');
    } else if (e.intent === 'do-you-have' || e.result) {
      const p = e.product && ix._byId.get(e.product);
      const names = p ? [p.n.nl, p.n.ro, e.product.replace(/-/g, ' ')].map(low) : [];
      if (!looked.includes('find_products')) why.push('find_products not called');
      if (e.result === 'yes' && p && !names.some((n) => low2.includes(n) || low2.includes(n.split(' ')[0]))) why.push(`does not name ${e.product}`);
      if (/^not-on-list/.test(e.result ?? '') && !/(niet op onze lijst|staat niet|niet in ons|hebben wij niet|hebben we niet|nu este pe list|nu e pe list|nu apare|nu avem|nu am găsit|nu am gasit|nu figurează|nu figureaza)/.test(low2)) why.push('does not say it is not on the list');
      if (e.intent === 'clarify') for (const id of e.chips_include ?? []) {
        const q = ix._byId.get(id);
        if (q && ![q.n.nl, q.n.ro].some((n) => low2.includes(low(n)))) why.push(`does not offer ${id}`);
      }
    }
    if (e.handoff === 'always' && !t.reply.acts.some((a) => a.kind === 'wa')) why.push('no hand-off');
    if (t.reply.lang !== wantLang) why.push(`answered in ${t.reply.lang}`);
    // a figure the engine's answer gives must stand in the model's too (a price, an hour, a date …)
    for (const s of e.must_include ?? []) if (/\d/.test(s) && !low2.includes(low(s))) why.push(`missing „${s}”`);
  } else {
    const d = t.conv.dbg ?? {};
    if (e.entry && d.entry !== e.entry) why.push(`local entry ${d.entry ?? d.intent} ≠ ${e.entry}`);
    if (e.handoff && (d.handoff ?? 'none') !== e.handoff) why.push(`handoff ${d.handoff} ≠ ${e.handoff}`);
    if (e.intent && d.intent !== e.intent && !(e.result === 'yes-or-clarify' && d.intent === 'clarify')) why.push(`intent ${d.intent} ≠ ${e.intent}`);
    if (e.product && e.result === 'yes' && d.product !== e.product) why.push(`product ${d.product} ≠ ${e.product}`);
  }
  if (e.must_include) for (const s of e.must_include) if (t.via !== 'model' && !t.shown.includes(s)) why.push(`missing „${s}”`);
  if (t.via !== 'model' && e.answer_lang && t.reply.lang !== e.answer_lang) why.push(`answered in ${t.reply.lang}`);
  return why;
}
async function runBank() {
  const flat = [
    ...tests11a.faq.map((c) => ({ ...c, kind: 'faq', turns: [{ text: c.text, expect: c.expect }] })),
    ...tests11a.do_you_have.map((c) => ({ ...c, kind: 'do_you_have', turns: [{ text: c.text, expect: c.expect }] })),
    ...tests11a.scripts.map((c) => ({ ...c, kind: 'script' })),
  ].filter((c) => !ONLY || ONLY.test(c.id));
  let done = 0;
  return pool(flat, async (c) => {
    const conv = newConv(c.page_lang);
    const turns = [];
    for (const tu of c.turns) {
      if (tu.tap) {
        const r = ask(ix, conv.st, { pick: tu.tap, pageLang: c.page_lang, page: null, path: null, now: new Date(NOW) });
        conv.st = r.state;
        turns.push({ tap: tu.tap, via: 'local', ok: true });
        continue;
      }
      const t = await turn(conv, tu.text, null, null);
      t.conv = conv;
      const why = gradeBank({ ...c, expect: tu.expect ?? {} }, t);
      turns.push({ text: tu.text, via: t.via, why_fallback: t.via === 'fallback' ? t.why : undefined, retry: t.row?._retry ?? null, ...(t.row?._retryWhy ? { first_answer: t.row._retryWhy } : {}), ok: !why.length, fails: why, shown: t.shown.slice(0, 300), lookups: t.row?.p_lookups, family: t.row?.p_family, cost: +cost(t.row).toFixed(6), first_ms: t.first, ms: t.ms, tokens: t.row ? { in: t.row.p_in, out: t.row.p_out, cache: t.row.p_cache, write: t.row._write } : null });
    }
    const ok = turns.every((x) => x.ok);
    if (++done % 50 === 0) console.log(`  … ${done}/${flat.length}`);
    if (!ok) console.log(`✗ ${c.id}: ${turns.filter((x) => !x.ok).map((x) => `[${x.via}] ${x.fails.join('; ')} — „${x.shown?.slice(0, 120)}”`).join(' ‖ ')}`);
    return { id: c.id, kind: c.kind, ok, turns, allergen: ENTRY.get(c.expect?.entry)?.topic === 'allergens' };
  });
}

// ——— run, sum up, write ———
const pct = (a, n) => (n ? +((a / n) * 100).toFixed(1) : null);
const q = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null;
};
const report = { _source: `scripts/assistant-test-11c.mjs on ${new Date().toISOString()}; model ${process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5'} on the live API with the owners' key (site/.env.local); the function api/ask.js run in-process on Dan's machine (Belgium) — first-text times are this machine → api.anthropic.com, not fra1; index dist/assistant-index.json; prices Claude Haiku 5.5 list (docs, read 10.11.2026). [MEASURED-OURS] local.` };
const sumTurns = (list) => {
  const ts = list.flatMap((c) => c.turns).filter((x) => x.via && x.tap === undefined);
  const model = ts.filter((x) => x.via === 'model');
  return {
    turns: ts.length,
    by: Object.fromEntries(['model', 'local', 'fallback'].map((k) => [k, ts.filter((x) => x.via === k).length])),
    fallback_why: ts.filter((x) => x.via === 'fallback').reduce((o, x) => ({ ...o, [x.why_fallback]: (o[x.why_fallback] ?? 0) + 1 }), {}),
    // row 11h (5): how often the first answer failed a check, on which check, and how long the turns with a retry took
    first_answer_failed: {
      turns: ts.filter((x) => x.retry).length,
      of_turns_with_a_model_call: ts.filter((x) => (x.tokens?.in ?? 0) > 0).length,
      by_check: ts.filter((x) => x.retry).flatMap((x) => x.retry).reduce((o, k) => ({ ...o, [k]: (o[k] ?? 0) + 1 }), {}),
      retry_path_ms: { p50: q(ts.filter((x) => x.retry).map((x) => x.ms), 0.5), p95: q(ts.filter((x) => x.retry).map((x) => x.ms), 0.95), max: ts.some((x) => x.retry) ? Math.max(...ts.filter((x) => x.retry).map((x) => x.ms)) : null },
    },
    first_text_ms: { p50: q(model.map((x) => x.first_ms), 0.5), p95: q(model.map((x) => x.first_ms), 0.95) },
    whole_answer_ms: { p50: q(model.map((x) => x.ms), 0.5), p95: q(model.map((x) => x.ms), 0.95) },
    tokens: model.reduce((o, x) => ({ in: o.in + (x.tokens?.in ?? 0), out: o.out + (x.tokens?.out ?? 0), cache: o.cache + (x.tokens?.cache ?? 0), write: o.write + (x.tokens?.write ?? 0) }), { in: 0, out: 0, cache: 0, write: 0 }),
    cost_usd: +ts.reduce((n, x) => n + (x.cost ?? 0), 0).toFixed(4),
    cost_per_conversation_usd: +(ts.reduce((n, x) => n + (x.cost ?? 0), 0) / Math.max(1, list.length)).toFixed(5),
  };
};
let exit = 0;
// AbortSignal.timeout's timer does not keep Node alive; a fake model that never answers would end the process
const keep = setInterval(() => {}, 1000);
if (args.includes('--failures')) {
  console.log('\n— failure runs —');
  const f = await runFailures();
  report.failures = { pass: f.filter((x) => x.ok).length, total: f.length, runs: f };
  if (f.some((x) => !x.ok)) exit = 1;
}
if (args.includes('--capability')) {
  console.log('\n— the capability cases (row 11c (g)), both modes —');
  const c = await runCapability();
  report.capability = { pass: c.filter((x) => x.ok).length, total: c.length, results: c };
  console.log(`capability ${report.capability.pass}/${report.capability.total}`);
  if (c.some((x) => !x.ok)) exit = 1;
}
if (args.includes('--scripts')) {
  console.log('\n— 66 scripts (live API) —');
  const s = await runScripts();
  report.scripts = { pass: s.filter((x) => x.ok).length, total: s.length, by_kind: Object.fromEntries(['doubt', 'abuse', 'context'].map((k) => [k, `${s.filter((x) => x.kind === k && x.ok).length}/${s.filter((x) => x.kind === k).length}`])), ...sumTurns(s), results: s };
  console.log(`scripts ${report.scripts.pass}/${report.scripts.total} · ${JSON.stringify(report.scripts.by_kind)} · ${JSON.stringify(report.scripts.by)} · first text p50 ${report.scripts.first_text_ms.p50} ms p95 ${report.scripts.first_text_ms.p95} ms · $${report.scripts.cost_usd} ($${report.scripts.cost_per_conversation_usd}/conversation)`);
  const fa = report.scripts.first_answer_failed;
  console.log(`first answer failed a check: ${fa.turns} of ${fa.of_turns_with_a_model_call} turns with a model call ${JSON.stringify(fa.by_check)} · retry path p50 ${fa.retry_path_ms.p50} ms p95 ${fa.retry_path_ms.p95} ms · fallbacks ${JSON.stringify(report.scripts.fallback_why)}`);
  if (report.scripts.pass < report.scripts.total) exit = 1;
}
if (args.includes('--bank')) {
  console.log('\n— the 11a bank through /api/ask (live API) —');
  const b = await runBank();
  const al = b.filter((x) => x.allergen);
  const modelAl = al.filter((x) => x.turns.some((t) => t.fails?.includes('a model-written allergen answer')));
  report.bank = { handoff_10_11: handoff1011, pass: b.filter((x) => x.ok).length, total: b.length, rate: pct(b.filter((x) => x.ok).length, b.length), allergen: { cases: al.length, wrong: al.filter((x) => !x.ok).map((x) => x.id), model_written: modelAl.map((x) => x.id) }, ...sumTurns(b), results: b };
  const verdict = report.bank.rate >= 95 && !report.bank.allergen.wrong.length && !modelAl.length ? 'PASS' : 'FAIL';
  report.bank.verdict = verdict;
  console.log(`bank ${report.bank.pass}/${report.bank.total} = ${report.bank.rate} % (bar 95 %) · allergen ${al.length - report.bank.allergen.wrong.length}/${al.length}, model-written ${modelAl.length} · ${JSON.stringify(report.bank.by)} ${JSON.stringify(report.bank.fallback_why)} · first text p50 ${report.bank.first_text_ms.p50} ms p95 ${report.bank.first_text_ms.p95} ms · $${report.bank.cost_usd}  ${verdict}`);
  if (verdict !== 'PASS') exit = 1;
}
if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), JSON.stringify(report, null, 1));
  console.log(`written ${out}`);
}
clearInterval(keep);
process.exit(exit);
