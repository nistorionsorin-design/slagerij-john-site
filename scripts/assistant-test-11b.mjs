// The order helper's test (row 11b, docs/assistant.md §10.5 — the release gate of the order helper). Plays the cases of
// docs/data/assistant-tests-11b.json (Cowork, 10.11: 20 order scripts, 13 delivery-town questions, 4 miss checks)
// against the engine and the index the build wrote (dist/assistant-index.json — what ships). The page checks of the
// same file run in a browser (docs/data/measurements/2026-11-10/assistant-pages-11b.mjs, in the working folder: it needs
// this machine's headless Chrome). Pass bar: every script right, delivery-town ≥ 90 %.
//   npm run build && node scripts/assistant-test-11b.mjs [tests.json] [--out result.json] [--src] [--v]
// Each case runs at the clock it names (`now`, Europe/Brussels wall-clock time). „Via WhatsApp” is checked against the
// bestelbon's own waText of the same draft, computed here from src/data (products · menus · hours · delivery) — not
// from the index — so a difference between the box's data and the form's data shows as a failure.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, newState, prepare } from '../src/lib/assistant/engine.js';
import { readOrder, waText } from '../src/lib/order-core.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const testsPath = resolve(args.find((a) => a.endsWith('.json') && args[args.indexOf(a) - 1] !== '--out') ?? join(root, '../docs/data/assistant-tests-11b.json'));
const out = opt('--out', null);
const VERBOSE = args.includes('--v');
const data = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));

async function fromSource() {
  const { buildIndex } = await import('../src/lib/assistant/build-index.js');
  const { qaT } = await import('../src/i18n/assistant.ts');
  const { nav, menu, footer, ui } = await import('../src/i18n/ui.ts');
  const { bestellenT } = await import('../src/i18n/bestellen.ts');
  const pages = { nl: {}, ro: {} };
  for (const L of ['nl', 'ro']) for (const it of [...menu[L], ...nav[L], ...footer[L].legal]) pages[L][it.href] = it.label;
  const strings = Object.fromEntries(['nl', 'ro'].map((L) => [L, { ...qaT[L], recipe: L === 'ro' ? 'Rețetă →' : 'Recept →', slip: { inStore: bestellenT[L].slip.inStore, tbc: bestellenT[L].slip.priceTbc, inStoreNote: bestellenT[L].slip.inStoreNote }, discount: ui[L].discountNote, menuClosed: bestellenT[L].menu.closed }]));
  return buildIndex({
    faq: data('assistant-faq.json'), syn: data('assistant-synonyms.json'), products: data('products.json'), photos: data('product-photos.json'),
    allergens: data('allergens.json'), hours: data('hours.json'), delivery: data('delivery.json'), menus: data('menus.json'), entity: data('entity.json'),
    recipes: data('recipes.json').recipes.map((r) => r.id), strings, pages,
    paths: { producten: { nl: '/producten', ro: '/ro/produse' }, colli: { nl: '/colli-vleespakketten', ro: '/ro/colli' }, recepten: { nl: '/recepten', ro: '/ro/retete' }, allergenen: { nl: '/allergenen', ro: '/ro/alergeni' } },
    thumbs: {}, labels: {}, towns: data('towns.json'),
    orderPaths: { bestellen: { nl: '/bestellen', ro: '/ro/comanda' }, eindejaar: { nl: '/feestmenu-eindejaar', ro: '/ro/sarbatori' } },
  });
}
const indexPath = join(root, 'dist/assistant-index.json');
if (!args.includes('--src') && !existsSync(indexPath)) throw new Error('dist/assistant-index.json missing — run npm run build first (or --src)');
const ix = prepare(args.includes('--src') ? await fromSource() : JSON.parse(readFileSync(indexPath, 'utf8')));
const tests = JSON.parse(readFileSync(testsPath, 'utf8'));
const form = { products: data('products.json'), hours: data('hours.json'), delivery: data('delivery.json'), menus: data('menus.json') };

/** „2026-11-12T10:00” in Brussels → the instant */
function brussels(s) {
  const guess = new Date(`${s}:00Z`);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(guess);
  const n = (t) => Number(parts.find((p) => p.type === t).value);
  const asIf = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'));
  return new Date(guess.getTime() - (asIf - guess.getTime()));
}
const DEFAULT_NOW = brussels('2026-11-12T10:00');

const seg = (l) => l.map((s) => s.t).join('');
/** everything the customer reads in the bubble: lines, the slip, the link, the buttons' foot line */
const text = (r) =>
  [
    ...r.lines.map(seg),
    ...(r.slip ? [r.slip.title, ...r.slip.lines, r.slip.when ?? '', r.slip.total, ...r.slip.notes] : []),
    ...(r.link ? [seg(r.link)] : []),
    ...r.foot.map(seg),
  ].join(' ');
const draftObj = (st) => Object.fromEntries((st.draft?.items ?? []).map(([id, q]) => [id, q]));
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** a tap: the last answer's chip by its label or by its value („2026-11-14” = day:2026-11-14), or a card's button */
function resolvePick(last, pick) {
  if (!last) return pick;
  const c = last.chips.find((x) => x.label === pick) ?? last.chips.find((x) => x.pick === pick || (x.pick ?? '').split(':').slice(1).join(':') === pick);
  if (c) return c.pick ?? null;
  if (/^add:/.test(pick) && last.cards.some((x) => `add:${x.id}` === pick && x.add)) return pick;
  return pick;
}

function checkTurn(e, res, st, s, i, last) {
  const why = [];
  const r = res.reply;
  const dbg = res.dbg;
  const t = text(r);
  if (e.intent && dbg.intent !== e.intent) why.push(`intent ${dbg.intent} ≠ ${e.intent}`);
  if (e.draft && !same(draftObj(st), e.draft)) why.push(`draft ${JSON.stringify(draftObj(st))} ≠ ${JSON.stringify(e.draft)}`);
  if ('mode' in e && (st.draft?.mode ?? null) !== e.mode) why.push(`mode ${st.draft?.mode ?? null} ≠ ${e.mode}`);
  if ('day' in e && (st.draft?.day ?? null) !== e.day) why.push(`day ${st.draft?.day ?? null} ≠ ${e.day}`);
  for (const m of e.must_include ?? []) if (!t.includes(m)) why.push(`missing „${m}”`);
  for (const m of e.must_not_include ?? []) if (t.includes(m)) why.push(`contains „${m}”`);
  if (e.chips && JSON.stringify(r.chips.map((c) => c.label)) !== JSON.stringify(e.chips)) why.push(`chips ${JSON.stringify(r.chips.map((c) => c.label))} ≠ ${JSON.stringify(e.chips)}`);
  if (e.chips_first_day && r.chips[0]?.pick !== `day:${e.chips_first_day}`) why.push(`first day chip ${r.chips[0]?.pick} ≠ day:${e.chips_first_day}`);
  if (e.bestelbon) {
    const a = r.acts.find((x) => x.kind === 'form');
    if (a?.href !== e.bestelbon) why.push(`bestelbon ${a?.href} ≠ ${e.bestelbon}`);
  }
  if (e.wa) {
    const a = r.acts.find((x) => x.kind === 'wa' && x.order);
    if (!a?.href.startsWith(e.wa)) why.push(`WhatsApp ${a?.href?.slice(0, 40)} ≠ ${e.wa}…`);
    if (a && e.wa_text === 'waText') {
      const got = new URL(a.href, 'https://x').searchParams.get('text');
      const L = r.lang;
      const ref = /SJ-\d{4}-[2-9A-HJ-NP-Z]{4}/.exec(got ?? '')?.[0];
      const d = st.draft;
      const o = readOrder({ lang: L, method: d.mode ?? 'pickup', date: d.day ?? '', time: '', items: draftObj(st), requests: [], ref }, form, res.now).order;
      const want = waText({ ...o, address: null, date: d.day ?? '', time: '' });
      if (got !== want) why.push(`WhatsApp text ≠ the bestelbon's waText:\n        got  ${got}\n        want ${want}`);
    }
  }
  if (e.face && r.face !== e.face) why.push(`face ${r.face} ≠ ${e.face}`);
  if (e.answer_lang && r.lang !== e.answer_lang) why.push(`answered in ${r.lang}`);
  if (e.card_button && !r.cards.some((c) => c.add === e.card_button)) why.push(`no card button „${e.card_button}”`);
  if (e.product && dbg.product !== e.product) why.push(`product ${dbg.product} ≠ ${e.product}`);
  if (e.result && dbg.result !== e.result) why.push(`result ${dbg.result} ≠ ${e.result}`);
  if (e.handoff && (dbg.handoff ?? 'none') !== e.handoff) why.push(`handoff ${dbg.handoff} ≠ ${e.handoff}`);
  if (e.entry && dbg.entry !== e.entry) why.push(`entry ${dbg.entry} ≠ ${e.entry}`);
  if ('place' in e && (dbg.place ?? null) !== e.place) why.push(`place ${dbg.place ?? null} ≠ ${e.place}`);
  for (const x of e.state_must_not_contain ?? []) if (JSON.stringify(st).includes(x)) why.push(`state holds „${x}”`);
  void s;
  void i;
  void last;
  return why;
}

const results = [];
const record = (kind, id, ok, why, got) => results.push({ kind, id, ok, why: ok ? undefined : why, got });

// 1 — the order scripts
for (const s of tests.scripts) {
  const now = s.now ? brussels(s.now) : DEFAULT_NOW;
  let state = newState(s.page_lang);
  let path = s.path ?? null;
  let last = null;
  const why = [];
  const got = [];
  for (const [i, turn] of s.turns.entries()) {
    if (turn.navigate) {
      // a page change: the box on the new page reads the same sessionStorage state (qa-ui.ts)
      path = turn.navigate;
      state = JSON.parse(JSON.stringify(state));
      if (turn.expect?.draft && !same(draftObj(state), turn.expect.draft)) why.push(`turn ${i + 1}: draft lost on navigation`);
      got.push({ navigate: path, draft: draftObj(state) });
      continue;
    }
    const input = turn.pick !== undefined ? { pick: resolvePick(last, turn.pick) } : { text: turn.text };
    const res = ask(ix, state, { ...input, pageLang: s.page_lang, page: null, path, now });
    res.now = now;
    state = res.state;
    // what the island writes: the state goes through JSON (sessionStorage) between turns
    state = JSON.parse(JSON.stringify(state));
    const w = checkTurn(turn.expect ?? {}, res, state, s, i, last);
    why.push(...w.map((x) => `turn ${i + 1}: ${x}`));
    got.push({ in: turn.text ?? `[${turn.pick}]`, intent: res.dbg.intent, draft: draftObj(state), mode: state.draft?.mode ?? null, day: state.draft?.day ?? null, text: text(res.reply).slice(0, 260), chips: res.reply.chips.map((c) => c.label), acts: res.reply.acts.map((a) => `${a.kind}:${a.href?.slice(0, 90) ?? ''}`) });
    last = res.reply;
  }
  record('script', s.id, !why.length, why.join('; '), got);
}

// 2 — delivery by town
for (const c of tests.delivery_town) {
  const res = ask(ix, newState(c.page_lang), { text: c.text, pageLang: c.page_lang, page: null, path: null, now: DEFAULT_NOW });
  const w = checkTurn(c.expect, res, res.state, null, 0, null);
  record('delivery_town', c.id, !w.length, w.join('; '), { intent: res.dbg.intent, entry: res.dbg.entry, place: res.dbg.place ?? null, handoff: res.dbg.handoff, text: text(res.reply).slice(0, 260) });
}

// 3 — the misses: what the box sends (a miss-2 only), and what api/miss.js keeps of it
const { cleanMiss } = await import('../src/lib/assistant/misses.js');
for (const c of tests.misses) {
  const why = [];
  let got = {};
  if (c.id === 'ms-04') {
    const { digestCheck } = await import('./assistant-digest-check.mjs');
    got = await digestCheck();
    if (!got.ok) why.push(got.why);
  } else {
    let st = newState('nl');
    const a = ask(ix, st, { text: c.text, pageLang: 'nl', page: null, path: '/', now: DEFAULT_NOW });
    st = a.state;
    const b = ask(ix, st, { text: c.text, pageLang: 'nl', page: null, path: '/', now: DEFAULT_NOW });
    const sent = b.dbg.intent === 'miss-2';
    got = { first: a.dbg.intent, second: b.dbg.intent, sent };
    if (c.expect.stored === false && sent) why.push(`a ${b.dbg.intent} would be sent`);
    if (c.expect.stored_q !== undefined || c.expect.stored === true) {
      const row = cleanMiss({ lang: 'nl', page: '/', q: c.text });
      got.row = row;
      if (c.expect.stored_q !== undefined && row?.q !== c.expect.stored_q) why.push(`stored „${row?.q}” ≠ „${c.expect.stored_q}”`);
      if (c.expect.stored === true && !sent) why.push(`not a miss-2 (${b.dbg.intent}): nothing is sent`);
      for (const f of c.expect.fields ?? []) if (!(f in (row ?? {})) && f !== 'site_id' && f !== 'day') why.push(`field ${f} missing`);
      for (const f of c.expect.no_fields ?? []) if (f in (row ?? {})) why.push(`field ${f} present`);
    }
  }
  record('miss', c.id, !why.length, why.join('; '), got);
}

const by = (k) => results.filter((r) => r.kind === k);
const summary = Object.fromEntries(['script', 'delivery_town', 'miss'].map((k) => [k, { pass: by(k).filter((r) => r.ok).length, total: by(k).length }]));
const dt = summary.delivery_town;
const verdict = summary.script.pass === summary.script.total && dt.pass / dt.total >= 0.9 && summary.miss.pass === summary.miss.total ? 'PASS' : 'FAIL';
for (const [k, v] of Object.entries(summary)) console.log(`${k.padEnd(14)} ${v.pass}/${v.total}`);
const fails = results.filter((r) => !r.ok);
for (const f of fails) console.log(`  ✗ ${f.kind} ${f.id}: ${f.why}${VERBOSE ? `\n      got ${JSON.stringify(f.got).slice(0, 1200)}` : ''}`);
console.log(`\n${verdict}`);
if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(
    resolve(out),
    JSON.stringify({ _source: `scripts/assistant-test-11b.mjs (row 11b) on ${new Date().toISOString()}, tests ${testsPath.replace(/\\/g, '/').split('/').slice(-3).join('/')}, index ${args.includes('--src') ? 'built from src/' : 'dist/assistant-index.json'}. [MEASURED-OURS] local.`, verdict, summary, results }, null, 1),
  );
  console.log(`written ${out}`);
}
process.exit(verdict === 'PASS' ? 0 : 1);
