// The assortment questions, the fallback reason on the row — the release test of row 11h (audit of the live assistant,
// 11.11.2026; docs/data/assistant-tests-11h.json). Plays the cases against the engine and the index the build wrote
// (dist/assistant-index.json — what ships; --src: built from the source files):
//   --local     the 45 local cases (the engine alone, the 115-entry bank)
//   --find      find_products hf-01…04 (the layer's lookup, no model call)
//   --layer     hl-01…hl-06 on the LIVE API with the key of site/.env.local (api/ask.js run in this process); hl-06 =
//               the same question ×10 (no fallback, no retry, p90 ≤ 5 s)
//   --double    hl-07 with test doubles (a model answer that fails a check twice → the row's `why`), and the log chain
//               qa_ask_log_v3 → _v2 → qa_ask_log on „function not found”, without an error anywhere
//   --all       all of the above
//   npm run build && node scripts/assistant-test-11h.mjs --all [--src] [--out result.json] [--v]
// A local case is right when every property of its `expect` holds: entry · intent · product · intent_starts. h-42
// („Hebben jullie salami?”) accepts the charcuterie entry or the clarify it had (the case's own note).
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
const NOW = new Date(opt('--now', '2026-11-11T09:30:00Z'));

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
const tests = JSON.parse(readFileSync(resolve(root, '../docs/data/assistant-tests-11h.json'), 'utf8'));

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
const report = { _source: `scripts/assistant-test-11h.mjs on ${new Date().toISOString()}; index ${args.includes('--src') ? 'built from src' : 'dist/assistant-index.json'}; engine clock ${NOW.toISOString()}. [MEASURED-OURS] local.` };
let exit = 0;
// AbortSignal.timeout's timer does not keep Node alive; a fake model that never answers would end the process
const keep = setInterval(() => {}, 1000);

// ——— the 45 local cases ———
if (want('--local')) {
  const results = [];
  for (const c of tests.local) {
    const res = ask(ix, newState(c.lang), { text: c.text, pageLang: c.lang, page: null, path: null, now: NOW });
    const { reply, dbg } = res;
    const e = c.expect;
    const why = [];
    // h-42: the category entry, or the clarify it had today — the case's own note
    const either = c.id === 'h-42' && dbg.intent === 'clarify';
    if (e.entry && dbg.entry !== e.entry && !either) why.push(`entry ${dbg.entry ?? dbg.intent} ≠ ${e.entry}`);
    if (e.intent && dbg.intent !== e.intent) why.push(`intent ${dbg.intent} ≠ ${e.intent}`);
    if (e.intent_starts && !String(dbg.intent ?? '').startsWith(e.intent_starts)) why.push(`intent ${dbg.intent} does not start with ${e.intent_starts}`);
    if (e.product && dbg.product !== e.product) why.push(`product ${dbg.product} ≠ ${e.product}`);
    if (reply.lang !== c.lang) why.push(`answered in ${reply.lang}`);
    const ok = !why.length;
    results.push({ id: c.id, text: c.text, ok, ...(why.length ? { why: why.join('; ') } : {}), got: { intent: dbg.intent, entry: dbg.entry ?? null, product: dbg.product ?? null, text: text(reply).slice(0, 240) }, was_live_10_11: c.live_10_11_bank?.entry ?? c.live_10_11_bank?.intent ?? null });
    if (VERBOSE || !ok) console.log(`${ok ? '✓' : '✗'} ${c.id} ${JSON.stringify(c.text)} → ${dbg.intent}/${dbg.entry ?? '-'}${dbg.product ? `/${dbg.product}` : ''}${ok ? '' : `  ← ${why.join('; ')}`}`);
  }
  const pass = results.filter((x) => x.ok).length;
  report.local = { pass, total: results.length, results };
  console.log(`local ${pass}/${results.length}`);
  if (pass < results.length) exit = 1;
}

// ——— find_products hf-01…04 (the layer's lookup, as the model calls it) ———
if (want('--find')) {
  const { session } = await import('../src/lib/assistant/lookups.js');
  const offers = JSON.parse(readFileSync(join(root, 'src/data/assistant-offers.json'), 'utf8'));
  const results = [];
  for (const c of tests.find_products) {
    const L = c.call.lang;
    const S = session({ ix, offers, L, pageLang: L, path: null, page: null, at: NOW, st: newState(L), text: c.call.q, shown: [], no: false, allergenish: false });
    const r = JSON.parse(S.call('find_products', { words: c.call.q }));
    const why = [];
    const cats = r.categories ?? [];
    const prods = r.products ?? [];
    const meat = ['rund', 'varken', 'kip', 'lam'];
    if (c.id === 'hf-01' || c.id === 'hf-02') {
      // the categories (name, how many, the first names) — not the products whose name carries the word
      if (!meat.every((id) => cats.some((x) => x.id === id))) why.push(`categories [${cats.map((x) => x.id).join(', ')}] lack one of ${meat.join(', ')}`);
      if (cats.some((x) => !x.name || !(x.products > 0) || !(x.first?.length > 0))) why.push('a category without its name, count or first names');
      if (prods.length) why.push(`${prods.length} products by name returned beside the categories`);
      if (Object.keys(r).indexOf('categories') !== 0) why.push('the categories do not come first');
    } else if (c.id === 'hf-03') {
      const v = cats.find((x) => x.id === 'varken');
      const items = JSON.parse(readFileSync(join(root, 'src/data/products.json'), 'utf8')).items;
      const all = items.filter((p) => p.category === 'varken').length;
      // „spiering, filetkotelet, braadworst …” = the owners' best sellers (product-photos.json, form q10), in their order
      const head = ['spiering', 'filetkotelet', 'braadworst'].map((id) => items.find((p) => p.id === id).name[L]);
      if (cats.length !== 1 || !v) why.push(`categories [${cats.map((x) => x.id).join(', ')}] ≠ [varken]`);
      else {
        if (v.name !== 'Porc') why.push(`name ${v.name} ≠ Porc`);
        if (v.products !== all) why.push(`count ${v.products} ≠ ${all}`);
        if (v.first.slice(0, 3).join(' | ') !== head.join(' | ')) why.push(`first names „${v.first.slice(0, 3).join(' | ')}” ≠ „${head.join(' | ')}”`);
      }
      if (!prods.length) why.push('no products after the category');
      if (Object.keys(r).indexOf('categories') !== 0) why.push('the category does not come first');
    } else if (c.id === 'hf-04') {
      if (cats.length) why.push(`categories returned for a product: [${cats.map((x) => x.id).join(', ')}]`);
      if (prods[0]?.id !== 'mici') why.push(`first product ${prods[0]?.id} ≠ mici`);
    }
    const ok = !why.length;
    results.push({ id: c.id, call: c.call, ok, ...(why.length ? { why: why.join('; ') } : {}), got: r });
    console.log(`${ok ? '✓' : '✗'} ${c.id} find_products(${JSON.stringify(c.call.q)}, ${L}) → categories [${cats.map((x) => `${x.name} ${x.products}: ${x.first.slice(0, 3).join(', ')}…`).join(' | ')}] products [${prods.map((p) => p.id).join(', ')}]${ok ? '' : `  ← ${why.join('; ')}`}`);
  }
  const pass = results.filter((x) => x.ok).length;
  report.find_products = { pass, total: results.length, results };
  console.log(`find_products ${pass}/${results.length}`);
  if (pass < results.length) exit = 1;
}

// ——— the layer: api/ask.js in this process ———
let api = null;
const rows = new Map();
const sent = new Map();
async function loadApi() {
  if (api) return api;
  api = await import('../api/ask.js');
  api.hooks.test = true;
  api.hooks.index = ix;
  api.hooks.log = (row, id) => rows.set(id, row);
  api.hooks.spy = (messages, id) => sent.set(id, [...(sent.get(id) ?? []), messages.length]);
  return api;
}
let seq = 0;
const zoned = (d) => d.toISOString();
async function turn(conv, q, ctx = {}) {
  const A = await loadApi();
  const id = `h${++seq}`;
  const body = { q, lang: conv.lang, page: null, ctx: { page: conv.lang === 'ro' ? '/ro' : '/', ...ctx }, st: conv.st, hist: conv.hist, _test: { id, now: zoned(NOW) } };
  const t0 = Date.now();
  const res = await A.default.fetch(new Request('http://localhost:4321/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
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
      if (first === null && ['delta', 'done', 'local', 'fallback'].includes(ev.t)) first = Date.now() - t0;
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
    const r = ask(ix, conv.st, { text: q, pageLang: conv.lang, page: null, path: body.ctx.page, now: NOW });
    reply = r.reply;
    via = last?.t ?? 'none';
    conv.st = { ...r.state, n: (conv.st.n ?? 0) + 1 };
  }
  const shown = [...reply.lines.map((l) => l.map((s) => s.t).join('')), ...(reply.link ? [reply.link.map((s) => s.t).join('')] : [])].join(' ');
  conv.hist = [...conv.hist, { r: 'u', t: q }, { r: 'a', t: shown.slice(0, 1200) }].slice(-24);
  const row = rows.get(id) ?? null;
  return { id, via, why: last?.why ?? row?.p_why ?? null, shown, first, ms, row, rounds: (sent.get(id) ?? []).length, retry: row?._retry ?? null };
}
const newConv = (lang) => ({ lang, st: newState(lang), hist: [] });
const low = (s) => String(s).toLowerCase();
function grade(e, t) {
  const why = [];
  const s = low(t.shown);
  if (t.via !== 'model') why.push(`answered by ${t.via}${t.why ? `:${t.why}` : ''}, not the model`);
  if (e.must_include_any) {
    const n = e.must_include_any.filter((w) => s.includes(low(w))).length;
    if (n < (e.must_include_all_of_min ?? 1)) why.push(`names ${n} of [${e.must_include_any.join(', ')}] < ${e.must_include_all_of_min ?? 1}`);
  }
  for (const w of e.must_include ?? []) if (!s.includes(low(w))) why.push(`missing „${w}”`);
  for (const w of e.must_not_include ?? []) if (s.includes(low(w))) why.push(`contains „${w}”`);
  if (e.lookups_include && !(t.row?.p_lookups ?? []).includes(e.lookups_include)) why.push(`lookup ${e.lookups_include} not used (${(t.row?.p_lookups ?? []).join(', ')})`);
  return why;
}
const q = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)] : null;
};
if (want('--layer')) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('--layer needs ANTHROPIC_API_KEY (site/.env.local)');
  const results = [];
  for (const c of tests.layer.filter((x) => x.mode === 'layer')) {
    if (c.turns) {
      const conv = newConv(c.lang);
      const turns = [];
      for (const tu of c.turns) {
        const t = await turn(conv, tu.text);
        const why = tu.expect ? grade(tu.expect, t) : t.via === 'model' ? [] : [`answered by ${t.via}`];
        turns.push({ text: tu.text, via: t.via, why_fallback: t.why, ok: !why.length, fails: why, shown: t.shown, ms: t.ms, retry: t.retry, lookups: t.row?.p_lookups });
      }
      const ok = turns.every((x) => x.ok);
      results.push({ id: c.id, ok, turns });
      console.log(`${ok ? '✓' : '✗'} ${c.id} ${turns.map((x) => `[${x.via} ${x.ms} ms${x.retry ? ` retry:${x.retry.join('+')}` : ''}] ${x.shown.slice(0, 160)}${x.ok ? '' : `  ← ${x.fails.join('; ')}`}`).join('  ‖  ')}`);
      continue;
    }
    const n = c.repeat ?? 1;
    const runs = [];
    for (let i = 0; i < n; i++) {
      const t = await turn(newConv(c.lang), c.text);
      const why = c.repeat ? [] : grade(c.expect, t);
      runs.push({ via: t.via, why_fallback: t.why, ok: !why.length, fails: why, shown: t.shown, first_ms: t.first, ms: t.ms, retry: t.retry, lookups: t.row?.p_lookups, rounds: t.rounds });
    }
    if (c.repeat) {
      const fb = runs.filter((x) => x.via !== 'model').length;
      const rt = runs.filter((x) => x.retry).length;
      const p90 = q(runs.map((x) => x.ms), 0.9);
      const why = [];
      if (fb > c.expect.fallback) why.push(`${fb} fallbacks`);
      if (rt > c.expect.retries_max) why.push(`${rt} retries (${runs.filter((x) => x.retry).map((x) => x.retry.join('+')).join(', ')})`);
      if (p90 > c.expect.ms_p90_max) why.push(`p90 ${p90} ms > ${c.expect.ms_p90_max}`);
      const ok = !why.length;
      results.push({ id: c.id, ok, ...(why.length ? { why: why.join('; ') } : {}), runs: runs.length, fallback: fb, retries: rt, ms: { p50: q(runs.map((x) => x.ms), 0.5), p90, max: Math.max(...runs.map((x) => x.ms)) }, first_ms_p50: q(runs.map((x) => x.first_ms), 0.5), answers: runs });
      console.log(`${ok ? '✓' : '✗'} ${c.id} ×${n}: fallback ${fb} · retries ${rt} · p50 ${q(runs.map((x) => x.ms), 0.5)} ms · p90 ${p90} ms${ok ? '' : `  ← ${why.join('; ')}`}`);
      if (VERBOSE) for (const r of runs) console.log(`    [${r.via} ${r.ms} ms, ${r.rounds} rounds${r.retry ? ` retry:${r.retry.join('+')}` : ''}] ${r.shown.slice(0, 200)}`);
    } else {
      const r = runs[0];
      results.push({ id: c.id, ok: r.ok, ...(r.fails.length ? { why: r.fails.join('; ') } : {}), ...r });
      console.log(`${r.ok ? '✓' : '✗'} ${c.id} [${r.via} ${r.ms} ms${r.retry ? ` retry:${r.retry.join('+')}` : ''}] ${r.shown.slice(0, 220)}${r.ok ? '' : `  ← ${r.fails.join('; ')}`}`);
    }
  }
  const pass = results.filter((x) => x.ok).length;
  report.layer = { pass, total: results.length, results };
  console.log(`layer ${pass}/${results.length}`);
  if (pass < results.length) exit = 1;
}

// ——— hl-07 and the log chain: test doubles, no API call ———
if (want('--double')) {
  const A = await loadApi();
  const results = [];
  const key = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY ||= 'test-double-no-call';
  // hl-07: a model answer that fails the number check twice → fallback, and the row says why (one word, no text)
  {
    let calls = 0;
    A.hooks.model = async () => (calls++, { blocks: [{ type: 'text', text: 'Mici: €9,99 per kg.' }], stop: 'end_turn', usage: { in: 100, out: 10, cache: 0, write: 0 } });
    const t = await turn(newConv('nl'), 'Wat kosten mici?');
    A.hooks.model = null;
    const c = tests.layer.find((x) => x.id === 'hl-07');
    const why = [];
    if (t.via !== 'fallback') why.push(`reply ${t.via} ≠ fallback`);
    if (!t.row?.p_fallback) why.push('row: fallback not true');
    if (!String(t.row?.p_why ?? '').startsWith(c.expect.row.why)) why.push(`row why ${t.row?.p_why} does not start with ${c.expect.row.why}`);
    if (!/^[a-z_:-]{1,32}$/.test(String(t.row?.p_why ?? ''))) why.push(`row why „${t.row?.p_why}” is not one word of the list`);
    if (calls !== 2) why.push(`${calls} model calls ≠ 2`);
    if (/9,99/.test(t.shown)) why.push('the failed figure reached the screen');
    results.push({ id: 'hl-07', ok: !why.length, ...(why.length ? { why: why.join('; ') } : {}), via: t.via, row_why: t.row?.p_why ?? null, row_fallback: t.row?.p_fallback ?? null, model_calls: calls, shown: t.shown });
    console.log(`${why.length ? '✗' : '✓'} hl-07 → ${t.via}, row why „${t.row?.p_why}”, ${calls} model calls${why.length ? `  ← ${why.join('; ')}` : ''}`);
  }
  // other reasons on the row: a timeout, the API's own error type, the cap
  {
    const never = (m, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))));
    const cases = [
      ['timeout', never, null],
      ['rate', () => Promise.reject(Object.assign(new Error('api 429'), { status: 429, type: 'rate_limit_error' })), null],
      ['overloaded_error', () => Promise.reject(Object.assign(new Error('api 529'), { status: 529, type: 'overloaded_error' })), null],
      ['other', () => Promise.reject(Object.assign(new Error('api 500'), { status: 500, type: 'Weird Type!' })), null],
    ];
    for (const [expect, model] of cases) {
      A.hooks.model = model;
      const t = await turn(newConv('nl'), 'Zijn jullie nu open?');
      A.hooks.model = null;
      const ok = t.via === 'fallback' && t.row?.p_why === expect;
      results.push({ id: `why-${expect}`, ok, via: t.via, row_why: t.row?.p_why ?? null });
      console.log(`${ok ? '✓' : '✗'} why on a ${expect} → ${t.via}, row why „${t.row?.p_why}”`);
    }
  }
  // the log chain: v3 → v2 → qa_ask_log on „not found”; what each function is sent; nothing thrown
  {
    const saveLog = A.hooks.log;
    A.hooks.log = null;
    const calls = [];
    let missing = new Set();
    A.hooks.rpc = async (name, a) => (calls.push({ name, keys: Object.keys(a).sort() }), missing.has(name) ? { error: 404 } : { value: null });
    const one = async (miss) => {
      A.logMemo.reset();
      missing = new Set(miss);
      calls.length = 0;
      A.hooks.model = async () => ({ blocks: [{ type: 'text', text: 'Mici: €9,99 per kg.' }], stop: 'end_turn', usage: { in: 100, out: 10, cache: 0, write: 0 } });
      let threw = null;
      try {
        await turn(newConv('nl'), 'Wat kosten mici?');
        await new Promise((r) => setTimeout(r, 30));
      } catch (e) {
        threw = String(e);
      }
      A.hooks.model = null;
      return { names: calls.map((c) => c.name), keys: calls.map((c) => c.keys), threw };
    };
    const chain = [
      ['v3 present', [], ['qa_ask_log_v3']],
      ['v3 missing', ['qa_ask_log_v3'], ['qa_ask_log_v3', 'qa_ask_log_v2']],
      ['v3 + v2 missing', ['qa_ask_log_v3', 'qa_ask_log_v2'], ['qa_ask_log_v3', 'qa_ask_log_v2', 'qa_ask_log']],
    ];
    for (const [label, miss, expectNames] of chain) {
      const r = await one(miss);
      const why = [];
      if (r.threw) why.push(`threw ${r.threw}`);
      if (r.names.join(' → ') !== expectNames.join(' → ')) why.push(`called ${r.names.join(' → ')} ≠ ${expectNames.join(' → ')}`);
      const v3 = r.keys[r.names.indexOf('qa_ask_log_v3')];
      if (v3 && !v3.includes('p_why')) why.push('v3 not sent p_why');
      const v2 = r.keys[r.names.indexOf('qa_ask_log_v2')];
      if (v2 && v2.includes('p_why')) why.push('v2 sent p_why (it has no such parameter)');
      const v1 = r.keys[r.names.indexOf('qa_ask_log')];
      if (v1 && (v1.includes('p_why') || v1.includes('p_shown'))) why.push('qa_ask_log sent a parameter it does not have');
      results.push({ id: `chain: ${label}`, ok: !why.length, ...(why.length ? { why: why.join('; ') } : {}), called: r.names });
      console.log(`${why.length ? '✗' : '✓'} log chain, ${label}: ${r.names.join(' → ')}${why.length ? `  ← ${why.join('; ')}` : ''}`);
    }
    // a warm function remembers a missing v3 (15 minutes): after one row that found it missing, the next goes to v2
    {
      await one(['qa_ask_log_v3']);
      calls.length = 0;
      A.hooks.model = async () => ({ blocks: [{ type: 'text', text: 'Mici: €9,99 per kg.' }], stop: 'end_turn', usage: { in: 100, out: 10, cache: 0, write: 0 } });
      await turn(newConv('nl'), 'Wat kosten mici?');
      await new Promise((r) => setTimeout(r, 30));
      A.hooks.model = null;
      const ok = calls.map((c) => c.name).join(' → ') === 'qa_ask_log_v2';
      results.push({ id: 'chain: v3 remembered missing', ok, called: calls.map((c) => c.name) });
      console.log(`${ok ? '✓' : '✗'} log chain, v3 remembered as missing: ${calls.map((c) => c.name).join(' → ')}`);
    }
    A.hooks.rpc = null;
    A.hooks.log = saveLog;
    A.logMemo.reset();
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
