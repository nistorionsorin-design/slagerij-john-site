// The assistant's test (row 11a, docs/assistant.md §10.5 — the release gate of the local engine). Plays the cases of
// docs/data/assistant-tests-11a.json (Cowork: 600 bank questions × NL + RO × three spellings, 15 „do you have”, 10
// conversations) against the engine and the index the build wrote (dist/assistant-index.json — what ships), plus
// every start chip of lexicon §5.32 in both languages. Pass bar: ≥ 90 % right, 0 wrong allergen answers.
//   npm run build && node scripts/assistant-test.mjs [tests.json] [--out result.json] [--now 2026-11-10T09:00:00Z] [--v]
// The tests file lives in the working folder outside this repo; its path is an argument (default ../docs/data/…).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, newState, prepare } from '../src/lib/assistant/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const testsPath = resolve(args.find((a) => a.endsWith('.json') && args[args.indexOf(a) - 1] !== '--out') ?? join(root, '../docs/data/assistant-tests-11a.json'));
const out = opt('--out', null);
const NOW = new Date(opt('--now', '2026-11-10T09:00:00Z'));
const VERBOSE = args.includes('--v');

const indexPath = join(root, 'dist/assistant-index.json');
// --src: the index built from the source files here, without photos or price labels (a quick loop while tuning; the
// gate's run reads dist/, the file that ships)
async function fromSource() {
  const { buildIndex } = await import('../src/lib/assistant/build-index.js');
  const { qaT } = await import('../src/i18n/assistant.ts');
  const { nav, menu, footer } = await import('../src/i18n/ui.ts');
  const data = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));
  const pages = { nl: {}, ro: {} };
  for (const L of ['nl', 'ro']) for (const it of [...menu[L], ...nav[L], ...footer[L].legal]) pages[L][it.href] = it.label;
  return buildIndex({
    faq: data('assistant-faq.json'), syn: data('assistant-synonyms.json'), products: data('products.json'), photos: data('product-photos.json'),
    allergens: data('allergens.json'), hours: data('hours.json'), delivery: data('delivery.json'), menus: data('menus.json'), entity: data('entity.json'),
    recipes: data('recipes.json').recipes.map((r) => r.id), strings: { nl: { ...qaT.nl, recipe: 'Recept →' }, ro: { ...qaT.ro, recipe: 'Rețetă →' } }, pages,
    paths: { producten: { nl: '/producten', ro: '/ro/produse' }, colli: { nl: '/colli-vleespakketten', ro: '/ro/colli' }, recepten: { nl: '/recepten', ro: '/ro/retete' }, allergenen: { nl: '/allergenen', ro: '/ro/alergeni' } },
    thumbs: {}, labels: {},
  });
}
if (!args.includes('--src') && !existsSync(indexPath)) throw new Error('dist/assistant-index.json missing — run npm run build first (or --src)');
const ix = prepare(args.includes('--src') ? await fromSource() : JSON.parse(readFileSync(indexPath, 'utf8')));
const tests = JSON.parse(readFileSync(testsPath, 'utf8'));
const mapConfirmed = !!ix.al.map;

const text = (r) => [...r.lines.map((l) => l.map((s) => s.t).join('')), ...(r.link ? [r.link.map((s) => s.t).join('')] : [])].join(' ');
// D-60 (10.11, build-plan row 11a): the mascot lines replace the §5.32 greeting, miss 1 and thanks — a case written on
// 05.11 that names the old line is checked against its replacement, and the note says so
const SUPERSEDED = {
  'Dat weet ik niet zeker': { intent: 'miss-1', now: 'Dat ligt niet in mijn toog', why: 'D-60: the mascot miss 1 replaces §5.32 miss 1' },
};

const say = (state, lang, t) => ask(ix, state, { text: t, pageLang: lang, page: null, path: null, now: NOW });
const results = [];
const record = (kind, id, ok, why, got) => results.push({ kind, id, ok, why: ok ? undefined : why, got });

// 1 — the answer bank
for (const c of tests.faq) {
  const { reply, dbg } = say(newState(c.page_lang), c.page_lang, c.text);
  const why = [];
  if (dbg.entry !== c.expect.entry) why.push(`entry ${dbg.entry ?? dbg.intent} ≠ ${c.expect.entry}`);
  if ((dbg.handoff ?? 'none') !== c.expect.handoff) why.push(`handoff ${dbg.handoff} ≠ ${c.expect.handoff}`);
  if (reply.lang !== c.page_lang) why.push(`answered in ${reply.lang}`);
  record('faq', c.id, !why.length, why.join('; '), { entry: dbg.entry, intent: dbg.intent, text: text(reply).slice(0, 160) });
}

// 2 — do you have
function checkExpect(e, reply, dbg, why) {
  const t = text(reply);
  if (e.intent && dbg.intent !== e.intent && !(e.result === 'yes-or-clarify' && dbg.intent === 'clarify')) why.push(`intent ${dbg.intent} ≠ ${e.intent}`);
  if (e.entry && dbg.entry !== e.entry) why.push(`entry ${dbg.entry} ≠ ${e.entry}`);
  if (e.result === 'yes' && !(dbg.result === 'yes' && dbg.product === e.product)) why.push(`not yes ${e.product} (got ${dbg.result} ${dbg.product})`);
  if (e.result === 'yes-or-clarify') {
    const okYes = dbg.result === 'yes' && [e.product, ...(e.clarify_ok ?? [])].includes(dbg.product);
    const okClar = dbg.intent === 'clarify' && (dbg.chips ?? []).some((id) => [e.product, ...(e.clarify_ok ?? [])].includes(id));
    if (!okYes && !okClar) why.push(`neither yes nor clarify on ${e.product}`);
  }
  if (e.result === 'not-on-list' || e.result === 'not-on-list-or-close') {
    const alts = dbg.alternatives ?? [];
    const close = e.result === 'not-on-list-or-close' && dbg.result === 'yes' && (e.alternatives_any_of ?? []).includes(dbg.product);
    if (!close) {
      if (dbg.result !== 'not-on-list') why.push(`result ${dbg.result ?? dbg.intent} ≠ not-on-list`);
      if (Array.isArray(e.alternatives) && e.alternatives.length === 0 && alts.length) why.push(`alternatives shown: ${alts.join(', ')}`);
      if (e.alternatives_any_of && !alts.some((a) => e.alternatives_any_of.includes(a))) why.push(`no alternative among ${e.alternatives_any_of.join(', ')} (got ${alts.join(', ') || 'none'})`);
    }
  }
  if (e.product && e.result !== 'yes' && e.result !== 'yes-or-clarify' && dbg.product !== e.product) why.push(`product ${dbg.product} ≠ ${e.product}`);
  if (e.answer_lang && reply.lang !== e.answer_lang) why.push(`answered in ${reply.lang} ≠ ${e.answer_lang}`);
  if (e.offer && !t.includes(e.offer)) why.push(`no offer „${e.offer}”`);
  if (e.handoff && (dbg.handoff ?? 'none') !== e.handoff) why.push(`handoff ${dbg.handoff} ≠ ${e.handoff}`);
  for (const s of e.must_include ?? []) {
    const sup = SUPERSEDED[s];
    if (sup && dbg.intent === sup.intent) {
      if (!t.includes(sup.now)) why.push(`missing „${sup.now}” (${sup.why})`);
      else why.note = sup.why;
    } else if (!t.includes(s)) why.push(`missing „${s}”`);
  }
  for (const s of e.must_not_include ?? []) if (t.includes(s)) why.push(`contains „${s}”`);
  for (const id of e.chips_include ?? []) if (!(dbg.chips ?? []).includes(id)) why.push(`chip ${id} missing (got ${(dbg.chips ?? []).join(', ')})`);
  if (e.wa_prefill_contains) {
    const wa = reply.acts.find((a) => a.kind === 'wa');
    if (!wa || !decodeURIComponent(wa.href).includes(e.wa_prefill_contains)) why.push(`WhatsApp text lacks „${e.wa_prefill_contains}”`);
  }
  if (e.category && dbg.category !== e.category) why.push(`category ${dbg.category} ≠ ${e.category}`);
}
for (const c of tests.do_you_have) {
  const { reply, dbg } = say(newState(c.page_lang), c.page_lang, c.text);
  const why = [];
  checkExpect(c.expect, reply, dbg, why);
  record('do_you_have', c.id, !why.length, why.join('; '), { intent: dbg.intent, product: dbg.product, result: dbg.result, alternatives: dbg.alternatives, chips: dbg.chips, text: text(reply).slice(0, 200) });
}

// 3 — conversations
for (const s of tests.scripts) {
  let state = newState(s.page_lang);
  const why = [];
  const notes = [];
  const got = [];
  for (const [i, turn] of s.turns.entries()) {
    const input = turn.tap ? { pick: turn.tap, pageLang: s.page_lang, page: null, path: null, now: NOW } : { text: turn.text, pageLang: s.page_lang, page: null, path: null, now: NOW };
    const res = ask(ix, state, input);
    state = res.state;
    let e = turn.expect;
    // build-plan row 11a, allergen gate: while the product → category map is a proposal, a named product's allergen
    // question hands off — the case's own note says so
    if (!mapConfirmed && e.intent === 'allergen' && /no-list handoff/.test(e.note ?? '')) {
      e = { intent: 'allergen', product: e.product, must_include: ['Voor dit product heb ik geen allergenenlijst', 'Heeft u een ernstige allergie?'], handoff: 'always' };
      notes.push(`turn ${i + 1}: allergen gate (map ${ix.al.map ? 'confirmed' : 'proposed'}) → the no-list handoff`);
    }
    const w = [];
    checkExpect(e, res.reply, res.dbg, w);
    if (w.note) notes.push(`turn ${i + 1}: ${w.note}`);
    why.push(...w.map((x) => `turn ${i + 1}: ${x}`));
    got.push({ intent: res.dbg.intent, entry: res.dbg.entry, product: res.dbg.product, text: text(res.reply).slice(0, 200) });
  }
  record('script', s.id, !why.length, why.join('; '), got);
  if (notes.length) results[results.length - 1].note = notes.join('; ');
}

// 4 — every start chip answers (lexicon §5.32 / §6), on its own page, in its own language
for (const L of ['nl', 'ro'])
  for (const [page, chips] of Object.entries(ix.s[L].chips))
    for (const q of chips) {
      const { reply, dbg } = ask(ix, newState(L), { text: q, pageLang: L, page, path: null, now: NOW });
      const ok = !/^miss/.test(dbg.intent) && reply.lang === L;
      record('chip', `${L}.${page}.${q}`, ok, `${dbg.intent} in ${reply.lang}`, { intent: dbg.intent, entry: dbg.entry, text: text(reply).slice(0, 160) });
    }

// allergen safety: every case of the bank's allergen topic right, and no allergen answer where none was asked
const allergenIds = new Set(JSON.parse(readFileSync(join(root, 'src/data/assistant-faq.json'), 'utf8')).entries.filter((e) => e.topic === 'allergens').map((e) => e.id));
const alCases = tests.faq.filter((c) => allergenIds.has(c.expect.entry)).map((c) => results.find((r) => r.kind === 'faq' && r.id === c.id));
const alWrong = alCases.filter((r) => !r.ok);
const falseAl = results.filter((r) => r.kind === 'faq' && !allergenIds.has(tests.faq.find((c) => c.id === r.id).expect.entry) && r.got.intent === 'allergen');

const by = (k) => results.filter((r) => r.kind === k);
const summary = Object.fromEntries(['faq', 'do_you_have', 'script', 'chip'].map((k) => [k, { pass: by(k).filter((r) => r.ok).length, total: by(k).length }]));
const graded = results.filter((r) => r.kind !== 'chip');
const pass = graded.filter((r) => r.ok).length;
const rate = pass / graded.length;
const verdict = rate >= 0.9 && alWrong.length === 0 ? 'PASS' : 'FAIL';

for (const [k, v] of Object.entries(summary)) console.log(`${k.padEnd(12)} ${v.pass}/${v.total}`);
console.log(`all cases    ${pass}/${graded.length} = ${(rate * 100).toFixed(1)} % (bar 90 %)`);
console.log(`allergen     ${alCases.length - alWrong.length}/${alCases.length} right · ${falseAl.length} allergen answers to non-allergen questions`);
console.log(`map          ${mapConfirmed ? 'confirmed' : 'proposed → named-product allergen questions hand off'}`);
const fails = results.filter((r) => !r.ok);
for (const f of VERBOSE ? fails : fails.slice(0, 40)) console.log(`  ✗ ${f.kind} ${f.id}: ${f.why}${VERBOSE ? `\n      got ${JSON.stringify(f.got).slice(0, 300)}` : ''}`);
if (!VERBOSE && fails.length > 40) console.log(`  … ${fails.length - 40} more (--v)`);
console.log(`\n${verdict}`);

if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(
    resolve(out),
    JSON.stringify(
      {
        _source: `scripts/assistant-test.mjs (row 11a) on ${new Date().toISOString()}, engine clock ${NOW.toISOString()}, tests ${testsPath.replace(/\\/g, '/').split('/').slice(-3).join('/')}, index dist/assistant-index.json. [MEASURED-OURS] local.`,
        verdict,
        rate: +(rate * 100).toFixed(1),
        summary,
        allergen: { cases: alCases.length, wrong: alWrong.map((r) => r.id), falseAllergenAnswers: falseAl.map((r) => r.id), map: mapConfirmed ? 'confirmed' : 'proposed (gate on)' },
        results,
      },
      null,
      1,
    ),
  );
  console.log(`written ${out}`);
}
process.exit(verdict === 'PASS' ? 0 : 1);
