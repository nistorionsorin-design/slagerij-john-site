// The assistant names its maker whenever it names itself — the release test of row 11i (D-64; Dan 11.11 11:06 on the
// live answer to „ce faci?”; docs/data/assistant-tests-11i.json). Against the engine and the index the build wrote
// (dist/assistant-index.json — what ships; --src: built from the source files):
//   --local     the 12 local cases (the engine alone, the bank of docs/)
//   --layer     il-01…il-03 on the LIVE API with the key of site/.env.local (api/ask.js run in this process)
//   --double    il-04 (a model answer that names Claude and not DanGabriel Advisory: back once; twice → check:wording)
//               and il-05 (a Romanian model answer that says „Slagerij John”: no check — the instructions only)
//   --all       all of the above
//   npm run build && node scripts/assistant-test-11i.mjs --all [--src] [--out result.json] [--v]
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
const NOW = new Date(opt('--now', '2026-11-11T10:30:00Z'));

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
const tests = JSON.parse(readFileSync(resolve(root, '../docs/data/assistant-tests-11i.json'), 'utf8'));

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
const report = { _source: `scripts/assistant-test-11i.mjs on ${new Date().toISOString()}; index ${args.includes('--src') ? 'built from src' : 'dist/assistant-index.json'}; engine clock ${NOW.toISOString()}. [MEASURED-OURS] local.` };
let exit = 0;
const keep = setInterval(() => {}, 1000);

// ——— the 12 local cases ———
if (want('--local')) {
  const results = [];
  for (const c of tests.local) {
    const { reply, dbg } = ask(ix, newState(c.lang), { text: c.text, pageLang: c.lang, page: null, path: null, now: NOW });
    const e = c.expect;
    const t = text(reply);
    const why = [];
    if (e.entry && dbg.entry !== e.entry) why.push(`entry ${dbg.entry ?? dbg.intent} ≠ ${e.entry}`);
    for (const s of e.must_include ?? []) if (!t.includes(s)) why.push(`missing „${s}”`);
    if (reply.lang !== c.lang) why.push(`answered in ${reply.lang}`);
    const ok = !why.length;
    results.push({ id: c.id, text: c.text, ok, ...(why.length ? { why: why.join('; ') } : {}), got: { intent: dbg.intent, entry: dbg.entry ?? null, text: t.slice(0, 260) } });
    if (VERBOSE || !ok) console.log(`${ok ? '✓' : '✗'} ${c.id} ${JSON.stringify(c.text)} → ${dbg.intent}/${dbg.entry ?? '-'} „${t.slice(0, 120)}”${ok ? '' : `  ← ${why.join('; ')}`}`);
  }
  const pass = results.filter((x) => x.ok).length;
  report.local = { pass, total: results.length, results };
  console.log(`local ${pass}/${results.length}`);
  if (pass < results.length) exit = 1;
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
  const id = `i${++seq}`;
  const body = { q, lang, page: null, ctx: { page: lang === 'ro' ? '/ro' : '/' }, st: newState(lang), hist: [], _test: { id, now: NOW.toISOString() } };
  const t0 = Date.now();
  const res = await A.default.fetch(new Request('http://localhost:4321/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  const evs = (await res.text()).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  await new Promise((r) => setTimeout(r, 5));
  const last = evs.at(-1);
  let reply;
  let via;
  if (last?.t === 'done') {
    reply = last.reply;
    via = 'model';
  } else {
    reply = ask(ix, newState(lang), { text: q, pageLang: lang, page: null, path: body.ctx.page, now: NOW }).reply;
    via = last?.t ?? 'none';
  }
  const row = rows.get(id) ?? null;
  return { via, why: last?.why ?? row?.p_why ?? null, shown: text(reply), ms: Date.now() - t0, retry: row?._retry ?? null, first: row?._retryWhy ?? null, row };
}
if (want('--layer')) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('--layer needs ANTHROPIC_API_KEY (site/.env.local)');
  const results = [];
  for (const c of tests.layer.filter((x) => x.mode === 'layer')) {
    const t = await turn(c.lang, c.text);
    const why = [];
    if (t.via !== 'model') why.push(`answered by ${t.via}${t.why ? `:${t.why}` : ''}, not the model`);
    for (const s of c.expect.must_include ?? []) if (!t.shown.includes(s)) why.push(`missing „${s}”`);
    for (const s of c.expect.must_not_include ?? []) if (t.shown.includes(s)) why.push(`contains „${s}”`);
    const ok = !why.length;
    results.push({ id: c.id, text: c.text, ok, ...(why.length ? { why: why.join('; ') } : {}), via: t.via, ms: t.ms, retry: t.retry, first_answer: t.first, shown: t.shown });
    console.log(`${ok ? '✓' : '✗'} ${c.id} ${JSON.stringify(c.text)} [${t.via} ${t.ms} ms${t.retry ? ` retry:${t.retry.join('+')}` : ''}] ${t.shown.slice(0, 220)}${ok ? '' : `  ← ${why.join('; ')}`}`);
  }
  const pass = results.filter((x) => x.ok).length;
  report.layer = { pass, total: results.length, results };
  console.log(`layer ${pass}/${results.length}`);
  if (pass < results.length) exit = 1;
}

// ——— il-04 · il-05: test doubles, no API call ———
if (want('--double')) {
  const A = await loadApi();
  const key = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY ||= 'test-double-no-call';
  const results = [];
  const said = (s) => async () => ({ blocks: [{ type: 'text', text: s }], stop: 'end_turn', usage: { in: 100, out: 10, cache: 0, write: 0 } });
  const run = async (id, lang, q, answers) => {
    let calls = 0;
    A.hooks.model = async (...a) => said(answers[Math.min(calls++, answers.length - 1)])(...a);
    const t = await turn(lang, q);
    A.hooks.model = null;
    return { ...t, calls };
  };
  const claudeOnly = { nl: 'Ik ben de automatische assistent van Slagerij John, gebouwd op Claude.', ro: 'Sunt asistentul automat al Măcelăriei John, construit pe Claude.' };
  const both = { nl: 'Ik ben de automatische assistent van Slagerij John, gemaakt door DanGabriel Advisory en gebouwd op Claude.', ro: 'Sunt asistentul automat al Măcelăriei John, făcut de DanGabriel Advisory și construit pe Claude.' };
  // il-04 (a): Claude without the maker once → back once, the second answer stands
  for (const lang of ['nl', 'ro']) {
    const t = await run('il-04a', lang, lang === 'ro' ? 'ce ești?' : 'wat ben je?', [claudeOnly[lang], both[lang]]);
    const why = [];
    if (t.calls !== 2) why.push(`${t.calls} model calls ≠ 2`);
    if (!(t.retry ?? []).includes('wording')) why.push(`first answer not sent back on wording (${JSON.stringify(t.retry)})`);
    if (t.via !== 'model' || !t.shown.includes('DanGabriel Advisory')) why.push(`shown „${t.shown.slice(0, 100)}” via ${t.via}`);
    results.push({ id: `il-04a.${lang}`, ok: !why.length, ...(why.length ? { why: why.join('; ') } : {}), via: t.via, calls: t.calls, retry: t.retry, shown: t.shown });
    console.log(`${why.length ? '✗' : '✓'} il-04a ${lang}: Claude without the maker → back once (${(t.first?.why ?? []).join(' | ').slice(0, 120)}) → „${t.shown.slice(0, 90)}”${why.length ? `  ← ${why.join('; ')}` : ''}`);
  }
  // il-04 (b): twice → fallback, check:wording on the row
  for (const lang of ['nl', 'ro']) {
    const t = await run('il-04b', lang, lang === 'ro' ? 'ce ești?' : 'wat ben je?', [claudeOnly[lang]]);
    const why = [];
    if (t.via !== 'fallback') why.push(`reply ${t.via} ≠ fallback`);
    if (t.row?.p_why !== 'check:wording') why.push(`row why ${t.row?.p_why} ≠ check:wording`);
    if (t.calls !== 2) why.push(`${t.calls} model calls ≠ 2`);
    if (!t.shown.includes('DanGabriel Advisory')) why.push(`the local answer lacks the maker: „${t.shown.slice(0, 100)}”`);
    results.push({ id: `il-04b.${lang}`, ok: !why.length, ...(why.length ? { why: why.join('; ') } : {}), via: t.via, row_why: t.row?.p_why ?? null, calls: t.calls, shown: t.shown });
    console.log(`${why.length ? '✗' : '✓'} il-04b ${lang}: twice → ${t.via}, row why „${t.row?.p_why}”, the box's own answer „${t.shown.slice(0, 90)}”${why.length ? `  ← ${why.join('; ')}` : ''}`);
  }
  // il-05: a Romanian answer that says „Slagerij John” (and names its maker) — no check: it stands
  {
    const t = await run('il-05', 'ro', 'ce ești?', ['Sunt asistentul automat al magazinului Slagerij John, făcut de DanGabriel Advisory.']);
    const why = [];
    if (t.via !== 'model' || t.calls !== 1 || t.retry) why.push(`via ${t.via}, ${t.calls} calls, retry ${JSON.stringify(t.retry)} — a check caught it`);
    results.push({ id: 'il-05', ok: !why.length, ...(why.length ? { why: why.join('; ') } : {}), via: t.via, calls: t.calls, shown: t.shown, note: tests.layer.find((x) => x.id === 'il-05').expect.note });
    console.log(`${why.length ? '✗' : '✓'} il-05 ro: „Slagerij John” in a Romanian answer → ${t.via}, ${t.calls} call (the instructions only, no check)${why.length ? `  ← ${why.join('; ')}` : ''}`);
  }
  // the maker named but not Claude, and neither named: no check (an answer need not name Claude)
  {
    const t = await run('none', 'nl', 'Hebben jullie mici?', ['Ja, mici staat op onze lijst.']);
    const ok = t.via === 'model' && t.calls === 1 && !t.retry;
    results.push({ id: 'control: no self-naming', ok, via: t.via, calls: t.calls });
    console.log(`${ok ? '✓' : '✗'} control: an answer that names neither → ${t.via}, ${t.calls} call`);
  }
  if (key === undefined) delete process.env.ANTHROPIC_API_KEY;
  const pass = results.filter((x) => x.ok).length;
  report.double = { pass, total: results.length, results };
  console.log(`double ${pass}/${results.length}`);
  if (pass < results.length) exit = 1;
}

if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), JSON.stringify(report, null, 1));
  console.log(`written ${out}`);
}
clearInterval(keep);
process.exit(exit);
