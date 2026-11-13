// „What is in it” questions → the allergen rule, and the owners' e1 of 13.11 (spit pig from 30 persons) in the bank — the
// release test of row 11l (docs/data/assistant-tests-11l.json). Against the engine and the index the build wrote
// (dist/assistant-index.json — what ships; --src: built from the source files):
//   --local     l-01…l-16 (the engine alone; a case's own must_include is read on its reply) + the file's must_include
//               block, read on the replies of the local cases that land on each entry, in each language
//   --layer     ll-01…ll-04 on the LIVE API with the key of site/.env.local (api/ask.js run in this process)
//   --all       both
//   npm run build && node scripts/assistant-test-11l.mjs --all [--src] [--out result.json] [--v]
// A case whose note reads „either entry is right” passes on either entry of the file's must_include block (l-16: both
// traiteur-minimum and traiteur-spit carry the 30).
// How the layer properties are read: handoff_shown false = the answer is not a hand-off (no serious face, the row's
// family is not „handoff”; a WhatsApp button the server adds because the answer itself names WhatsApp is recorded, not
// failed); model_called false = the row says no model call (the allergen gate answers before the model).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const out = opt('--out', null);
const VERBOSE = args.includes('--v');
const ALL = args.includes('--all');
const want = (k) => ALL || args.includes(k);
const NOW = new Date(opt('--now', '2026-11-13T10:30:00Z'));

// the key and the rest of site/.env.local, as the dev server hands them to the functions (only the layer cases use it)
if (existsSync(join(root, '.env.local')))
  for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([a-z_][a-z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && m[2] && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
// the metrics spine stays out of a test run: the rows are collected here
delete process.env.METRICS_URL;
delete process.env.METRICS_KEY;

const { ask, newState, prepare } = await import('../src/lib/assistant/engine.js');
const tests = JSON.parse(readFileSync(resolve(root, '../docs/data/assistant-tests-11l.json'), 'utf8'));

async function fromSource() {
  const { buildIndex } = await import('../src/lib/assistant/build-index.js');
  const { qaT } = await import('../src/i18n/assistant.ts');
  const { nav, menu, footer, ui } = await import('../src/i18n/ui.ts');
  const { bestellenT } = await import('../src/i18n/bestellen.ts');
  const data = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));
  const maybe = (f) => (existsSync(join(root, 'src/data', f)) ? data(f) : null);
  const pages = { nl: {}, ro: {} };
  for (const L of ['nl', 'ro']) for (const it of [...menu[L], ...nav[L], ...footer[L].legal]) pages[L][it.href] = it.label;
  return buildIndex({
    faq: data('assistant-faq.json'), syn: data('assistant-synonyms.json'), products: data('products.json'), photos: data('product-photos.json'),
    allergens: data('allergens.json'), hours: data('hours.json'), delivery: data('delivery.json'), menus: data('menus.json'), entity: data('entity.json'),
    recipes: data('recipes.json').recipes.map((r) => r.id), recipesFull: data('recipes.json').recipes, nextQ: maybe('assistant-paths.json'), pairings: maybe('assistant-pairings.json'),
    strings: Object.fromEntries(['nl', 'ro'].map((L) => [L, { ...qaT[L], recipe: L === 'ro' ? 'Rețetă →' : 'Recept →', slip: { inStore: bestellenT[L].slip.inStore, tbc: bestellenT[L].slip.priceTbc, inStoreNote: bestellenT[L].slip.inStoreNote }, discount: ui[L].discountNote, menuClosed: bestellenT[L].menu.closed }])), pages,
    paths: { producten: { nl: '/producten', ro: '/ro/produse' }, colli: { nl: '/colli-vleespakketten', ro: '/ro/colli' }, recepten: { nl: '/recepten', ro: '/ro/retete' }, allergenen: { nl: '/allergenen', ro: '/ro/alergeni' } },
    thumbs: {}, labels: {}, towns: data('towns.json'),
    orderPaths: { bestellen: { nl: '/bestellen', ro: '/ro/comanda' }, eindejaar: { nl: '/feestmenu-eindejaar', ro: '/ro/sarbatori' } },
  });
}
const indexPath = join(root, 'dist/assistant-index.json');
if (!args.includes('--src') && !existsSync(indexPath)) throw new Error('dist/assistant-index.json missing — run npm run build first (or --src)');
const ix = prepare(args.includes('--src') ? await fromSource() : JSON.parse(readFileSync(indexPath, 'utf8')));

const text = (r) => [...r.lines.map((l) => l.map((s) => s.t).join('')), ...(r.link ? [r.link.map((s) => s.t).join('')] : [])].join(' ');
const report = { _source: `scripts/assistant-test-11l.mjs on ${new Date().toISOString()}; index ${args.includes('--src') ? 'built from src' : 'dist/assistant-index.json'}; engine clock ${NOW.toISOString()}. [MEASURED-OURS] local.` };
let exit = 0;
const keep = setInterval(() => {}, 1000);

// ——— l-01…l-16 + must_include ———
if (want('--local')) {
  const results = [];
  const either = new Set(tests.must_include.map((m) => m.entry));
  for (const c of tests.local) {
    const { reply, dbg } = ask(ix, newState(c.lang), { text: c.text, pageLang: c.lang, page: null, path: null, now: NOW });
    const e = c.expect;
    const t = text(reply);
    const why = [];
    const anyOf = /either entry is right/.test(e.note ?? '') && either.has(e.entry) ? either : new Set([e.entry]);
    if (e.entry && !anyOf.has(dbg.entry)) why.push(`entry ${dbg.entry ?? dbg.intent} ≠ ${[...anyOf].join(' | ')}`);
    if (e.intent && dbg.intent !== e.intent) why.push(`intent ${dbg.intent} ≠ ${e.intent}`);
    if (e.product && dbg.product !== e.product) why.push(`product ${dbg.product} ≠ ${e.product}`);
    for (const s of e.must_include ?? []) if (!t.includes(s)) why.push(`missing „${s}”`);
    if (reply.lang !== c.lang) why.push(`answered in ${reply.lang}`);
    const ok = !why.length;
    const acts = reply.acts.map((a) => a.kind);
    results.push({ id: c.id, lang: c.lang, text: c.text, ok, ...(why.length ? { why: why.join('; ') } : {}), got: { intent: dbg.intent, entry: dbg.entry ?? null, product: dbg.product ?? null, ...(dbg.category ? { category: dbg.category } : {}), ...(dbg.result ? { result: dbg.result } : {}), ...(dbg.asked ? { asked: dbg.asked } : {}), handoff: dbg.handoff ?? 'none', face: reply.face, acts, text: t.slice(0, 700) } });
    if (VERBOSE || !ok) console.log(`${ok ? '✓' : '✗'} ${c.id} ${JSON.stringify(c.text)} → ${dbg.intent}/${dbg.entry ?? '-'} [${acts.join(',')}] „${t.slice(0, 140)}”${ok ? '' : `  ← ${why.join('; ')}`}`);
  }
  const pass = results.filter((x) => x.ok).length;
  report.local = { pass, total: results.length, results };
  console.log(`local ${pass}/${results.length}`);
  if (pass < results.length) exit = 1;

  // must_include: on the replies of the local cases that landed on the entry, per language
  const mi = [];
  for (const m of tests.must_include) {
    const on = results.filter((r) => r.got.entry === m.entry);
    const why = [];
    for (const L of ['nl', 'ro']) {
      const rs = on.filter((r) => r.lang === L);
      if (!rs.length) why.push(`no ${L} case on ${m.entry}`);
      for (const r of rs) for (const s of m[L] ?? []) if (!r.got.text.includes(s)) why.push(`${r.id}: missing „${s}”`);
    }
    for (const r of on) for (const s of m.must_not ?? []) if (r.got.text.toLowerCase().includes(s.toLowerCase())) why.push(`${r.id}: contains „${s}”`);
    const ok = !why.length;
    mi.push({ entry: m.entry, cases: on.map((r) => r.id), ok, ...(why.length ? { why } : {}) });
    console.log(`${ok ? '✓' : '✗'} must_include ${m.entry} (${on.map((r) => r.id).join(' ')})${ok ? '' : `  ← ${why.join('; ')}`}`);
  }
  const mpass = mi.filter((x) => x.ok).length;
  report.must_include = { pass: mpass, total: mi.length, results: mi };
  console.log(`must_include ${mpass}/${mi.length}`);
  if (mpass < mi.length) exit = 1;
}

// ——— the layer: api/ask.js in this process ———
let api = null;
const rows = new Map();
async function loadApi() {
  if (api) return api;
  api = await import('../api/ask.js');
  api.hooks.test = true;
  api.hooks.index = ix;
  api.hooks.log = (row, id) => rows.set(id, row);
  return api;
}
let seq = 0;
async function turn(lang, q) {
  const A = await loadApi();
  const id = `l${++seq}`;
  const body = { q, lang, page: null, ctx: { page: lang === 'ro' ? '/ro' : '/' }, st: newState(lang), hist: [], _test: { id, now: NOW.toISOString() } };
  const t0 = Date.now();
  const res = await A.default.fetch(new Request('http://localhost:4321/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  const evs = (await res.text()).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  await new Promise((r) => setTimeout(r, 5));
  const last = evs.at(-1);
  let reply;
  let via;
  let dbg = null;
  if (last?.t === 'done') {
    reply = last.reply;
    via = 'model';
  } else {
    const r = ask(ix, newState(lang), { text: q, pageLang: lang, page: null, path: body.ctx.page, now: NOW });
    reply = r.reply;
    dbg = r.dbg;
    via = last?.t ?? 'none';
  }
  const row = rows.get(id) ?? null;
  return { via, why: last?.why ?? row?.p_why ?? null, reply, dbg, shown: text(reply), ms: Date.now() - t0, retry: row?._retry ?? null, row };
}
if (want('--layer')) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('--layer needs ANTHROPIC_API_KEY (site/.env.local)');
  const results = [];
  for (const c of tests.layer.filter((x) => x.mode === 'layer')) {
    const t = await turn(c.lang, c.text);
    const e = c.expect;
    const why = [];
    const modelCalled = t.row?.p_model ?? false;
    // a model answer is expected unless the case says the model is not called
    if (e.model_called === false) {
      if (modelCalled) why.push('the row says the model was called');
      if (t.via === 'model') why.push('answered by the model');
    } else if (t.via !== 'model') why.push(`answered by ${t.via}${t.why ? `:${t.why}` : ''}, not the model`);
    for (const s of e.must_include ?? []) if (!t.shown.includes(s)) why.push(`missing „${s}”`);
    for (const s of e.must_not_include ?? []) if (t.shown.includes(s)) why.push(`contains „${s}”`);
    const wa = t.reply.acts.some((a) => a.kind === 'wa');
    const handoffShown = t.reply.face === 'serious' || t.row?.p_family === 'handoff';
    if (e.handoff_shown === false && handoffShown) why.push(`a hand-off (face ${t.reply.face}, family ${t.row?.p_family})`);
    const ok = !why.length;
    results.push({ id: c.id, lang: c.lang, text: c.text, ok, ...(why.length ? { why: why.join('; ') } : {}), via: t.via, ms: t.ms, retry: t.retry, model_called: modelCalled, family: t.row?.p_family ?? null, lookups: t.row?.p_lookups ?? [], face: t.reply.face, wa_button: wa, acts: t.reply.acts.map((a) => a.kind), shown: t.shown, note: e.note ?? null });
    console.log(`${ok ? '✓' : '✗'} ${c.id} ${JSON.stringify(c.text)} [${t.via} ${t.ms} ms · model ${modelCalled} · ${t.row?.p_family ?? '-'} · face ${t.reply.face} · acts ${t.reply.acts.map((a) => a.kind).join(',') || '-'}${t.retry ? ` · retry:${t.retry.join('+')}` : ''}] ${t.shown.slice(0, 220)}${ok ? '' : `  ← ${why.join('; ')}`}`);
  }
  const pass = results.filter((x) => x.ok).length;
  report.layer = { pass, total: results.length, results };
  console.log(`layer ${pass}/${results.length}`);
  if (pass < results.length) exit = 1;
}

if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), JSON.stringify(report, null, 1));
  console.log(`written ${out}`);
}
clearInterval(keep);
process.exit(exit);
