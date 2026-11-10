// The assistant's next question — the release test of rows 11d + 11g (docs/assistant.md §13; D-65 · D-67 · D-69;
// docs/data/assistant-paths.json). Plays docs/data/assistant-tests-11d.json against the engine and the index the build
// wrote (dist/assistant-index.json — what ships; --src: built from the source files, no photos or price labels):
//   --bank      bank_107 + engine_fixes (the bank of 10.11 and the engine fixes e-04…e-08)
//   --paths     paths_local · never (local) · rules · pairings · opening · three_taps · allergen_wording
//   --layer     the layer cases (n-05, n-07, o-04, l-01…l-04) on the LIVE API with the key of site/.env.local, and the
//               double cases (l-05, l-06, c-01…c-04) with test doubles — api/ask.js run in this process
//   --all       all of the above (the salute cases sb-01…sb-07 run in a browser: docs/data/measurements/2026-11-10/row11dg-look.mjs)
//   npm run build && node scripts/assistant-test-11d.mjs --all [--src] [--out result.json] [--v]
// What each property means is the tests file's own `_source`. A case is right only when every property holds.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask, newState, prepare } from '../src/lib/assistant/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const out = opt('--out', null);
const VERBOSE = args.includes('--v');
const ALL = args.includes('--all');
const want = (k) => ALL || args.includes(k);
const NOW = new Date(opt('--now', '2026-11-10T09:00:00Z'));

const tests = JSON.parse(readFileSync(resolve(root, '../docs/data/assistant-tests-11d.json'), 'utf8'));
const products = JSON.parse(readFileSync(join(root, 'src/data/products.json'), 'utf8'));
const productById = new Map(products.items.map((p) => [p.id, p]));

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
const results = [];
const record = (kind, id, why, got, note) => results.push({ kind, id, ok: !why.length, ...(why.length ? { why: why.join('; ') } : {}), got, ...(note ? { note } : {}) });
const say = (state, lang, input, now = NOW) => ask(ix, state, { pageLang: lang, page: null, path: null, now, ...input });

// ——— bank_107 + engine fixes ———
if (want('--bank')) {
  for (const c of tests.bank_107) {
    const { reply, dbg } = say(newState(c.lang), c.lang, { text: c.q });
    const why = [];
    const t = text(reply);
    if (dbg.entry !== c.entry) why.push(`entry ${dbg.entry ?? dbg.intent} ≠ ${c.entry}`);
    if (c.handoff && (dbg.handoff ?? 'none') !== c.handoff) why.push(`handoff ${dbg.handoff} ≠ ${c.handoff}`);
    for (const s of c.must_include ?? []) if (!t.includes(s)) why.push(`missing „${s}”`);
    if (c.no_day_figure && /\d+\s*(dagen|dag|zile|zi)\b/i.test(t)) why.push('a day figure');
    if (reply.lang !== c.lang) why.push(`answered in ${reply.lang}`);
    record('bank_107', c.q, why, { entry: dbg.entry, intent: dbg.intent, handoff: dbg.handoff, text: t.slice(0, 220) });
  }
  for (const c of tests.engine_fixes) {
    const { reply, dbg } = say(newState(c.lang), c.lang, { text: c.text });
    const why = [];
    const t = text(reply);
    const e = c.expect;
    if (e.entry && dbg.entry !== e.entry) why.push(`entry ${dbg.entry ?? dbg.intent} ≠ ${e.entry}`);
    if (e.product && dbg.product !== e.product) why.push(`product ${dbg.product} ≠ ${e.product}`);
    for (const s of e.must_not_include ?? []) if (t.includes(s)) why.push(`contains „${s}”`);
    if (e.text_has) {
      const [, id, f] = /products\.json (\S+) line\.(nl|ro)/.exec(e.text_has) ?? [];
      const line = productById.get(id)?.line?.[f];
      if (!line || !t.includes(line)) why.push(`lacks the ${id} cooking line (${f})`);
    }
    record('engine_fixes', c.id, why, { entry: dbg.entry, intent: dbg.intent, product: dbg.product, text: t.slice(0, 220) }, c.was);
  }
}

// ——— the local cases: one conversation per case, typed turns and taps ———
const lineOf = (spec) => {
  const [, id, f] = /products\.json (\S+) line\.(nl|ro)/.exec(spec) ?? [];
  return productById.get(id)?.line?.[f] ?? null;
};
const kinds = (r) => r.acts.map((a) => a.kind).filter((k) => k === 'wa' || k === 'tel' || k === 'form');
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
/** every property of one `expect` against one answer; `prev` = the answer before (a tap must have been shown there) */
function check(e, res, why) {
  const { reply, dbg } = res;
  const t = text(reply);
  const nq = dbg.nq ?? [];
  if (e.intent && dbg.intent !== e.intent) why.push(`intent ${dbg.intent} ≠ ${e.intent}`);
  if (e.intent_in && !e.intent_in.includes(dbg.intent)) why.push(`intent ${dbg.intent} ∉ ${e.intent_in.join(', ')}`);
  if (e.entry && dbg.entry !== e.entry) why.push(`entry ${dbg.entry ?? dbg.intent} ≠ ${e.entry}`);
  if (e.entry_in && !e.entry_in.includes(dbg.entry)) why.push(`entry ${dbg.entry} ∉ ${e.entry_in.join(', ')}`);
  if (e.product && dbg.product !== e.product) why.push(`product ${dbg.product} ≠ ${e.product}`);
  if (e.dynamic && dbg.dynamic !== e.dynamic) why.push(`dynamic ${dbg.dynamic} ≠ ${e.dynamic}`);
  if (e.handoff && (dbg.handoff ?? 'none') !== e.handoff) why.push(`handoff ${dbg.handoff} ≠ ${e.handoff}`);
  if (e.face && reply.face !== e.face) why.push(`face ${reply.face} ≠ ${e.face}`);
  const chips = e.chips ?? e.path_chips;
  if (chips && !sameList(nq, chips)) why.push(`buttons [${nq.join(', ')}] ≠ [${chips.join(', ')}]`);
  if (e.chips_not) for (const id of e.chips_not) if (nq.includes(id)) why.push(`button ${id} shown`);
  if (e.chips_must) for (const id of e.chips_must) if (!nq.includes(id)) why.push(`button ${id} missing`);
  if (Array.isArray(e.chips_in) && nq.some((id) => !e.chips_in.includes(id))) why.push(`buttons [${nq.join(', ')}] ⊄ [${e.chips_in.join(', ')}]`);
  if (e.labels && !sameList((reply.nq ?? []).map((c) => c.label), e.labels)) why.push(`labels [${(reply.nq ?? []).map((c) => c.label).join(' | ')}] ≠ [${e.labels.join(' | ')}]`);
  if (e.card_add && !reply.cards.some((c) => c.id === (e.product ?? dbg.product) && c.add)) why.push('no card with its add button');
  if (e.cards && !sameList(reply.cards.map((c) => c.id), e.cards)) why.push(`cards [${reply.cards.map((c) => c.id).join(', ')}] ≠ [${e.cards.join(', ')}]`);
  if (e.cards_not) for (const id of e.cards_not) if (reply.cards.some((c) => c.id === id)) why.push(`card ${id} shown`);
  if (e.cards_max !== undefined && reply.cards.length > e.cards_max) why.push(`${reply.cards.length} cards > ${e.cards_max}`);
  if (e.cards_min !== undefined && reply.cards.length < e.cards_min) why.push(`${reply.cards.length} cards < ${e.cards_min}`);
  if (e.cards_not_category) for (const c of reply.cards) if (e.cards_not_category.includes(productById.get(c.id)?.category)) why.push(`card ${c.id} is a ${productById.get(c.id)?.category}`);
  if (e.cards_from === 'products.json week') for (const c of reply.cards) if (!products.week.includes(c.id)) why.push(`card ${c.id} not on this week's list`);
  if ('label_over_cards' in e && (reply.cardsLabel ?? null) !== e.label_over_cards) why.push(`label over the cards ${reply.cardsLabel ?? null} ≠ ${e.label_over_cards}`);
  if (e.model_called === true) why.push('model_called true is a layer case');
  if (e.text_is) {
    const want = lineOf(e.text_is);
    if (t !== want) why.push(`text „${t.slice(0, 80)}” ≠ the ${e.text_is}`);
  }
  if (e.text && !t.includes(e.text)) why.push(`lacks „${e.text}”`);
  for (const s of e.must_include ?? []) if (!t.includes(s)) why.push(`missing „${s}”`);
  for (const s of e.must_not_include ?? []) if (t.toLowerCase().includes(s.toLowerCase())) why.push(`contains „${s}”`);
  if (e.first_line) {
    const f = reply.lines[0]?.map((s) => s.t).join('') ?? '';
    if (f !== e.first_line) why.push(`first line „${f}” ≠ „${e.first_line}”`);
  }
  if (e.acts && !sameSet(kinds(reply), e.acts)) why.push(`acts [${kinds(reply).join(', ')}] ≠ [${e.acts.join(', ')}]`);
  if (e.basis && dbg.basis !== e.basis) why.push(`basis ${dbg.basis} ≠ ${e.basis}`);
  if (nq.length > 2) why.push(`${nq.length} buttons > 2`);
}
/** a conversation: turns of {text} or {tap}; a tap must have been shown under the answer before */
function play(c, turns, start = null) {
  let state = start ?? newState(c.lang);
  const now = c.now ? new Date(c.now) : NOW;
  const why = [];
  const got = [];
  let prev = null;
  for (const [i, turn] of turns.entries()) {
    if (turn.tap && prev && !(prev.dbg.nq ?? []).includes(turn.tap)) why.push(`turn ${i + 1}: „${turn.tap}” was not shown under the answer before (shown: ${(prev.dbg.nq ?? []).join(', ') || 'none'})`);
    // a tap sends the product its button was drawn for, as the box does (nq:<id>@<product>)
    const drawn = (prev?.reply.nq ?? []).find((x) => x.id === turn.tap)?.p;
    const res = say(state, c.lang, turn.tap ? { pick: `nq:${turn.tap}${drawn ? `@${drawn}` : ''}` } : turn.pick ? { pick: turn.pick } : { text: turn.text }, now);
    state = res.state;
    const w = [];
    if (turn.expect) check(turn.expect, res, w);
    why.push(...w.map((x) => `turn ${i + 1}: ${x}`));
    got.push({ in: turn.text ?? `[${turn.tap ?? turn.pick}]`, intent: res.dbg.intent, entry: res.dbg.entry, product: res.dbg.product, nq: res.dbg.nq, labels: (res.reply.nq ?? []).map((x) => x.label), cards: res.reply.cards.map((x) => x.id), acts: res.reply.acts.map((a) => a.kind), text: text(res.reply).slice(0, 200) });
    prev = res;
  }
  return { why, got, state, last: prev };
}
const all = [];
if (want('--paths')) {
  for (const c of tests.paths_local) {
    const { why, got } = play(c, c.turns);
    record('paths_local', c.id, why, got);
    all.push(...got);
  }
  for (const c of tests.never.filter((x) => x.mode !== 'layer')) {
    const { why, got } = play(c, c.turns ?? [{ text: c.text, expect: c.expect }]);
    record('never', c.id, why, got);
    all.push(...got);
  }
  for (const c of tests.rules.filter((x) => x.turns || x.text)) {
    const { why, got } = play(c, c.turns ?? [{ text: c.text, expect: c.expect }]);
    record('rules', c.id, why, got, c.rule);
    all.push(...got);
  }
  // r-04 — every product asked „Hebben jullie {name}?”: each shown button's `needs`, computed here from the data
  {
    const why = [];
    const colli = products.items.filter((p) => p.category === 'colli');
    const recipeIds = new Set(JSON.parse(readFileSync(join(root, 'src/data/recipes.json'), 'utf8')).recipes.map((r) => r.id));
    const meat = new Set(['rund', 'varken', 'kip', 'lam', 'marinades', 'roemeens']);
    let asked = 0;
    let withButtons = 0;
    for (const p of products.items) {
      const res = say(newState('nl'), 'nl', { text: `Hebben jullie ${p.name.nl}?` });
      if (res.dbg.product !== p.id) continue;
      asked++;
      const nq = res.dbg.nq ?? [];
      if (nq.length) withButtons++;
      const inColli = colli.some((c) => c.id !== p.id && [p.name.nl, p.name.ro].some((n) => n.length > 3 && ` ${c.line.nl.toLowerCase()} `.includes(` ${n.toLowerCase()} `)));
      const recipeLink = recipeIds.has(p.id);
      const card = res.reply.cards.some((c) => c.id === p.id && c.add);
      const holds = {
        with: true,
        cook: !!p.line?.nl && !recipeLink,
        'in-colli': inColli && !res.reply.acts.some((a) => a.kind === 'link' && /colli/.test(a.href ?? '')),
        discount: p.unit === 'kg' && meat.has(p.category),
        add: !card,
        'colli-contents': p.category === 'colli',
        'colli-freeze': true,
      };
      for (const id of nq) if (!holds[id]) why.push(`${p.id}: ${id} shown, its needs do not hold`);
    }
    record('rules', 'r-04', why, { asked, withButtons }, `needs, ${asked} products asked by name`);
  }
  // r-03 — max 2 over every answer this file played (the 11a–11c files: their own runners report the counts)
  record('rules', 'r-03', all.filter((g) => (g.nq ?? []).length > 2).map((g) => `${g.in}: ${g.nq.length} buttons`), { answers: all.length });
  // r-06 — a question or a step
  {
    const why = [];
    const pathsFile = JSON.parse(readFileSync(join(root, 'src/data/assistant-paths.json'), 'utf8'));
    const scarce = ['nog maar', 'laatste', 'op = op', 'alleen vandaag', 'bijna weg', 'doar azi', 'ultimele', 'se termină', 'aanbevolen', 'populair', 'vaak samen'];
    for (const [id, b] of Object.entries(pathsFile.buttons))
      for (const L of ['nl', 'ro']) {
        const l = b.label[L];
        if (/€|\d+\s*€|%/.test(l)) why.push(`${id}.${L}: a price or a % in „${l}”`);
        if (id !== 'discount' && /korting|reducere/i.test(l)) why.push(`${id}.${L}: „korting” outside discount`);
        for (const w of scarce) if (l.toLowerCase().includes(w)) why.push(`${id}.${L}: „${w}”`);
      }
    record('rules', 'r-06', why, { buttons: Object.keys(pathsFile.buttons).length });
  }
  // the pairings: „Wat past erbij?” tapped with the product known (the box opened from its sheet, or named before)
  for (const c of tests.pairings) {
    if (c.text) {
      const { why, got } = play(c, [{ text: c.text, expect: c.expect }]);
      record('pairings', c.id, why, got);
      continue;
    }
    const start = { ...newState(c.lang), last: c.product, nq: { s: {}, a: [], p: c.product } };
    const { why, got, last } = play(c, [{ tap: c.tap, expect: c.expect }], start);
    if (c.expect.sources_in_order) {
      // the four sources, in order, computed here: recipes · the colli that holds it · the rubric's best sellers · the week
      const photos = JSON.parse(readFileSync(join(root, 'src/data/product-photos.json'), 'utf8'));
      const p = productById.get(c.product);
      const inc = products.items.filter((x) => x.category === 'colli' && ` ${x.line.nl.toLowerCase()} `.includes(` ${p.name.nl.toLowerCase()} `)).map((x) => x.id);
      const wantIds = [...new Set([...inc, ...(photos.bestsellers[p.category] ?? []), ...products.week])].filter((id) => id !== p.id).slice(0, 3);
      const gotIds = last.reply.cards.map((x) => x.id);
      if (!sameList(gotIds, wantIds)) why.push(`cards [${gotIds.join(', ')}] ≠ the four sources in order [${wantIds.join(', ')}]`);
    }
    record('pairings', c.id, why, got);
  }
  // the opening line from a product's sheet; from the button, the greeting
  {
    const { opening } = await import('../src/lib/assistant/engine.js');
    for (const c of tests.opening.filter((x) => x.mode !== 'layer')) {
      const why = [];
      let reply;
      if (c.open.from === 'sheet') reply = opening(ix, newState(c.lang), { product: c.open.product, pageLang: c.lang }).reply;
      else reply = { lines: [[{ t: ix.s[c.lang].t.greeting }]], cards: [] };
      const f = reply.lines[0].map((s) => s.t).join('');
      if (f !== c.expect.first_line) why.push(`first line „${f}” ≠ „${c.expect.first_line}”`);
      if (c.expect.card && !reply.cards.some((x) => x.id === c.expect.card)) why.push(`no card ${c.expect.card}`);
      if (c.expect.names_a_product === false && reply.cards.length) why.push('names a product');
      for (const s of c.expect.must_not_include ?? []) if (f.toLowerCase().includes(s.toLowerCase())) why.push(`contains „${s}”`);
      record('opening', c.id, why, { first: f, cards: reply.cards.map((x) => x.id) });
    }
  }
  // three taps: from „Hebben jullie mici?” to the pre-filled bestelbon
  for (const c of tests.three_taps) {
    const why = [];
    const got = [];
    let state = newState(c.lang);
    let res = null;
    let taps = 0;
    let href = null;
    const tapped = [];
    for (const step of c.steps) {
      const m = /^type: (.+)$/.exec(step);
      if (m) res = say(state, c.lang, { text: m[1] });
      else if (/the card's add button|add on the (\S+) card/.test(step)) {
        const id = /add on the (\S+) card/.exec(step)?.[1] ?? res.dbg.product;
        if (!res.reply.cards.some((x) => x.id === id && x.add)) why.push(`${step}: no ${id} card with its add button`);
        res = say(state, c.lang, { pick: `add:${id}` });
        taps++;
      } else if (/a quantity chip/.test(step)) {
        const chip = res.reply.chips.find((x) => x.pick?.startsWith('qty:'));
        if (!chip) why.push(`${step}: no quantity chip`);
        res = say(state, c.lang, { pick: chip?.pick ?? 'qty:1' });
        taps++;
        if (taps === 2 && c.expect.after_tap_2) {
          const a2 = c.expect.after_tap_2;
          if (a2.acts_include && !res.reply.acts.some((a) => a.kind === a2.acts_include)) why.push(`after tap 2: no ${a2.acts_include} button`);
          if (a2.helper_question && !text(res.reply).includes(a2.helper_question)) why.push(`after tap 2: no „${a2.helper_question}”`);
        }
      } else if (/^tap: (\S+)$/.test(step)) {
        const id = /^tap: (\S+)$/.exec(step)[1];
        if (!(res.dbg.nq ?? []).includes(id)) why.push(`${step}: not shown`);
        res = say(state, c.lang, { pick: `nq:${id}` });
        tapped.push(id);
        taps++;
      } else if (/Naar de bestelbon|La bonul de comandă/.test(step)) {
        const a = res.reply.acts.find((x) => x.kind === 'form');
        if (!a) why.push(`${step}: no form button`);
        href = a?.href ?? null;
        taps++;
        state = res.state;
        got.push({ step, href });
        break;
      }
      state = res.state;
      got.push({ step, intent: res.dbg.intent, nq: res.dbg.nq, acts: res.reply.acts.map((a) => `${a.kind}:${a.href ?? ''}`.slice(0, 80)), text: text(res.reply).slice(0, 120) });
    }
    const e = c.expect;
    if (e.href_starts && !href?.startsWith(e.href_starts)) why.push(`href ${href} does not start ${e.href_starts}`);
    if (e.href_has && !href?.includes(e.href_has)) why.push(`href ${href} lacks ${e.href_has}`);
    if (e.taps !== undefined && taps !== e.taps) why.push(`${taps} taps ≠ ${e.taps}`);
    if (e.log_handover_tapped && !sameList(tapped, e.log_handover_tapped)) why.push(`tapped [${tapped.join(', ')}] ≠ [${e.log_handover_tapped.join(', ')}] (the box's memory; the log row itself: --layer c-01)`);
    record('three_taps', c.id, why, got);
  }
  // the allergen wording (item 9): the lead once per group, the same allergens
  for (const c of tests.allergen_wording.filter((x) => x.text)) {
    const res = say(newState(c.lang), c.lang, { text: c.text });
    const why = [];
    const t = text(res.reply);
    for (const [s, n] of Object.entries(c.expect.count ?? {})) {
      const k = t.split(s).length - 1;
      if (k !== n) why.push(`„${s}” ${k}× ≠ ${n}`);
    }
    for (const s of c.expect.must_include ?? []) if (!t.includes(s)) why.push(`missing „${s}”`);
    if (c.expect.workshop_notice && !t.includes(ix.al.notice[c.lang].slice(0, 40))) why.push('no workshop notice');
    if ((res.dbg.nq ?? []).length) why.push('buttons under an allergen answer');
    record('allergen_wording', c.id, why, { text: t });
  }
}

// ——— the layer: the live API (the owners' key of site/.env.local, never printed) and test doubles ———
if (want('--layer')) {
  if (existsSync(join(root, '.env.local')))
    for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([a-z_][a-z0-9_]*)\s*=\s*(.*?)\s*$/i);
      if (m && m[2] && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  delete process.env.METRICS_URL;
  delete process.env.METRICS_KEY;
  const api = await import('../api/ask.js');
  const { hooks } = api;
  hooks.test = true;
  hooks.index = ix;
  const logged = [];
  hooks.log = (row, id) => logged.push({ ...row, _id: id });
  const keep = setInterval(() => {}, 1000);
  const NOWZ = '2026-11-10T10:00:00+01:00';
  let seq = 0;
  const paths = JSON.parse(readFileSync(join(root, 'src/data/assistant-paths.json'), 'utf8'));
  const settle = () => new Promise((r) => setTimeout(r, 60));
  /** a typed message through the function, as the box sends it; a local or fallback answer is the box's own engine */
  async function typed(conv, q, ctx = {}) {
    const id = `l${++seq}`;
    const res = await api.default.fetch(new Request('http://localhost:4321/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, lang: conv.lang, page: null, ctx, st: conv.st, hist: conv.hist, _test: { id, now: NOWZ } }) }));
    const evs = (await res.text()).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    await settle();
    const last = evs[evs.length - 1];
    let reply;
    let via;
    if (last?.t === 'done') {
      reply = last.reply;
      via = 'model';
      conv.st = { ...conv.st, miss: 0, ...(last.st ?? {}), pend: null, n: (conv.st.n ?? 0) + 1 };
    } else {
      const r = ask(ix, conv.st, { text: q, pageLang: conv.lang, page: null, path: ctx.page ?? null, product: ctx.sheet ?? null, now: new Date(NOWZ) });
      reply = r.reply;
      via = last?.t ?? 'none';
      conv.st = { ...r.state, n: (conv.st.n ?? 0) + 1 };
    }
    conv.hist = [...conv.hist, { r: 'u', t: q }, { r: 'a', t: text(reply) }].slice(-24);
    const row = logged.find((x) => x._id === id) ?? null;
    return { reply, via, why: last?.why ?? null, row, evs, nq: (reply.nq ?? []).map((c) => c.id) };
  }
  /** a tap: the box's own engine answers; with the layer on it sends its count as a beacon (here: the same body) */
  async function tap(conv, idBtn) {
    const label = (conv.lastNq ?? []).find((c) => c.id === idBtn)?.label ?? idBtn;
    const r = ask(ix, conv.st, { pick: `nq:${idBtn}`, pageLang: conv.lang, page: null, path: null, now: new Date(NOWZ) });
    conv.st = r.state;
    conv.hist = [...conv.hist, { r: 'u', t: label }, { r: 'a', t: text(r.reply) }].slice(-24);
    conv.tapped = [...(conv.tapped ?? []), idBtn];
    const before = logged.length;
    await api.default.fetch(new Request('http://localhost:4321/api/ask', { method: 'POST', body: JSON.stringify({ ev: 'tap', id: idBtn, shown: (r.reply.nq ?? []).map((c) => c.id), lang: conv.lang, page: '/' }) }));
    await settle();
    return { reply: r.reply, dbg: r.dbg, rows: logged.slice(before), nq: r.dbg.nq ?? [] };
  }
  const conv = (lang) => ({ lang, st: newState(lang), hist: [], tapped: [] });
  const labelsOk = (reply, L) => (reply.nq ?? []).every((c) => paths.buttons[c.id]?.label[L] === c.label);
  const ids = new Set(Object.keys(paths.buttons));

  // live cases
  const layer = [...tests.never.filter((x) => x.mode === 'layer'), ...tests.opening.filter((x) => x.mode === 'layer'), ...tests.layer.filter((x) => x.mode === 'layer' && (x.text || x.turns))];
  for (const c of layer) {
    const why = [];
    const got = [];
    const cv = conv(c.lang ?? 'nl');
    let ctx = {};
    if (c.open?.from === 'sheet') {
      const { opening } = await import('../src/lib/assistant/engine.js');
      cv.st = opening(ix, cv.st, { product: c.open.product, pageLang: cv.lang }).state;
      ctx = { sheet: c.open.product, opened_from: 'sheet' };
    }
    const turns = c.turns ?? [{ text: c.text, expect: c.expect }];
    let prevNq = [];
    for (const [i, t] of turns.entries()) {
      const e = t.expect ?? {};
      if (t.tap) {
        if (!prevNq.includes(t.tap)) got.push({ note: `turn ${i + 1}: „${t.tap}” was not among the model's buttons (${prevNq.join(', ') || 'none'}); tapped as the case says` });
        const r = await tap(cv, t.tap);
        const tapRow = r.rows.find((x) => (x.p_tapped ?? []).includes(t.tap));
        if (e.model_called === false && r.rows.some((x) => x.p_model)) why.push(`turn ${i + 1}: a model call`);
        if (e.log?.tapped && !(tapRow && sameList(tapRow.p_tapped, e.log.tapped) && tapRow.p_model === false)) why.push(`turn ${i + 1}: the tap's row ${JSON.stringify(tapRow ?? null)}`);
        got.push({ in: `[${t.tap}]`, text: text(r.reply).slice(0, 160), nq: r.nq, rows: r.rows.map((x) => ({ model: x.p_model, tapped: x.p_tapped, shown: x.p_shown })) });
        prevNq = r.nq;
        continue;
      }
      const r = await typed(cv, t.text, ctx);
      cv.lastNq = r.reply.nq ?? [];
      prevNq = r.nq;
      const tx = text(r.reply);
      if (e.scope_line && !tx.includes(ix.s[cv.lang].ai.scope)) why.push(`turn ${i + 1}: not the scope sentence (${r.via})`);
      if (e.chips && !sameList(r.nq, e.chips)) why.push(`turn ${i + 1}: buttons [${r.nq.join(', ')}] ≠ [${e.chips.join(', ')}]`);
      if (e.chips_in === 'the ids of assistant-paths.json buttons' && r.nq.some((x) => !ids.has(x))) why.push(`turn ${i + 1}: unknown ids ${r.nq}`);
      if (e.chips_max !== undefined && r.nq.length > e.chips_max) why.push(`turn ${i + 1}: ${r.nq.length} buttons`);
      if (e.labels_from_file && !labelsOk(r.reply, cv.lang)) why.push(`turn ${i + 1}: a label not from the file`);
      if (e.if_offer_shown && r.row?.p_offer && r.nq.length) why.push(`turn ${i + 1}: an offer (${r.row.p_offer}) and buttons [${r.nq}]`);
      if (e.model_called === false && r.row?.p_model) why.push(`turn ${i + 1}: a model call`);
      if (e.handoff && !r.reply.acts.some((a) => a.kind === 'wa')) why.push(`turn ${i + 1}: no hand-off button`);
      for (const s of e.must_include ?? []) if (!tx.includes(s)) why.push(`turn ${i + 1}: missing „${s}”`);
      for (const s of e.must_not_include ?? []) if (tx.toLowerCase().includes(s.toLowerCase())) why.push(`turn ${i + 1}: contains „${s}”`);
      if (e.about_product && !(new RegExp(ix._byId.get(e.about_product).n[cv.lang], 'i').test(tx) || r.reply.cards.some((x) => x.id === e.about_product))) why.push(`turn ${i + 1}: not about ${e.about_product}`);
      got.push({ in: t.text, via: r.via, why: r.why, text: tx.slice(0, 220), nq: r.nq, labels: (r.reply.nq ?? []).map((x) => x.label), offer: r.row?.p_offer ?? null, model: r.row?.p_model ?? null, shown: r.row?.p_shown ?? null, first: r.row?.p_first ?? null });
    }
    record('layer', c.id, why, got);
  }

  // test doubles: the model's answer is set here (no API call)
  const double = (blocks) => async () => ({ blocks, stop: 'end_turn', usage: { in: 10, out: 10, cache: 0, write: 0 } });
  const say2 = (txt, present) => [{ type: 'text', text: txt }, { type: 'tool_use', id: 'tu1', name: 'present', input: present }];
  const saved = { model: hooks.model, today: hooks.today };
  // l-05 — an id that is no button is dropped, no error on screen
  {
    hooks.model = double(say2('Ja, mici staat op onze lijst.', { cards: ['mici'], chips: ['with', 'gratis-vandaag'] }));
    const cv = conv('nl');
    const r = await typed(cv, 'hebben jullie mici?');
    const why = [];
    if (r.via !== 'model') why.push(`answered ${r.via} (${r.why})`);
    if (!sameList(r.nq, ['with'])) why.push(`buttons [${r.nq.join(', ')}] ≠ [with]`);
    if (r.evs.some((e) => e.t === 'fallback')) why.push('a fallback');
    record('layer', 'l-05', why, { via: r.via, nq: r.nq });
  }
  // l-06 — an id whose answer the conversation holds (order-deadline answered before) is dropped
  {
    hooks.model = double(say2('Wij zijn vandaag open.', { chips: ['deadline'] }));
    const cv = conv('nl');
    cv.st = { ...cv.st, nq: { s: {}, a: ['e:order-deadline'], p: null } };
    const r = await typed(cv, 'Wanneer zijn jullie open?');
    const why = [];
    if (r.nq.length) why.push(`buttons [${r.nq.join(', ')}] ≠ []`);
    record('layer', 'l-06', why, { via: r.via, why: r.why, nq: r.nq });
  }
  // c-01 — the rows of t-03 (type · tap with · add on the braadworst card · a quantity · „Naar de bestelbon”)
  {
    hooks.model = double(say2('Ja, mici staat op onze lijst. Voor vandaag: bel of stuur een WhatsApp.', { cards: ['mici'], chips: ['with', 'cook'] }));
    const before = logged.length;
    const cv = conv('nl');
    const r1 = await typed(cv, 'Hebben jullie mici?');
    cv.lastNq = r1.reply.nq;
    const why = [];
    if (!r1.nq.includes('with')) why.push(`„with” not shown (${r1.nq})`);
    await tap(cv, 'with');
    let res = ask(ix, cv.st, { pick: 'add:braadworst', pageLang: 'nl', now: new Date(NOWZ) });
    cv.st = res.state;
    res = ask(ix, cv.st, { pick: res.reply.chips.find((x) => x.pick?.startsWith('qty:'))?.pick ?? 'qty:2', pageLang: 'nl', now: new Date(NOWZ) });
    cv.st = res.state;
    const form = res.reply.acts.find((a) => a.kind === 'form');
    if (!form?.href.includes('add=braadworst')) why.push(`no form button with braadworst (${form?.href})`);
    await api.default.fetch(new Request('http://localhost:4321/api/ask', { method: 'POST', body: JSON.stringify({ ev: 'handover', kind: 'order', tapped: cv.tapped, lang: 'nl', page: '/' }) }));
    await settle();
    const rows = logged.slice(before).map((x) => ({ first_turn: x.p_first, shown: x.p_shown, tapped: x.p_tapped, model_called: x.p_model, handover: x.p_handover, keys: Object.keys(x).filter((k) => !k.startsWith('_')) }));
    const want = tests.counts.find((x) => x.id === 'c-01').expect.rows;
    if (rows.length !== want.length) why.push(`${rows.length} rows ≠ ${want.length}`);
    for (const [i, w] of want.entries()) for (const [k, v] of Object.entries(w)) if (JSON.stringify(rows[i]?.[k]) !== JSON.stringify(v)) why.push(`row ${i + 1} ${k} ${JSON.stringify(rows[i]?.[k])} ≠ ${JSON.stringify(v)}`);
    const textish = rows.flatMap((x) => x.keys).filter((k) => /text|_q$|question|answer|session/.test(k));
    if (textish.length) why.push(`text fields ${textish}`);
    record('counts', 'c-01', why, rows);
  }
  // c-02 — qa_ask_log_v2 not there yet (404): the answer is shown, the row goes through qa_ask_log
  {
    hooks.model = double(say2('Ja, mici staat op onze lijst.', { cards: ['mici'], chips: ['with'] }));
    const calls = [];
    const saveLog = hooks.log;
    hooks.log = null;
    hooks.rpc = async (name, args) => {
      calls.push({ name, keys: Object.keys(args) });
      return name === 'qa_ask_log_v2' ? { error: 404 } : { value: null };
    };
    const cv = conv('nl');
    const r = await typed(cv, 'Hebben jullie mici?');
    await settle();
    hooks.rpc = null;
    hooks.log = saveLog;
    const why = [];
    if (r.via !== 'model') why.push(`answered ${r.via}`);
    if (r.evs.some((e) => e.t === 'fallback')) why.push('a fallback on screen');
    const v1 = calls.find((x) => x.name === 'qa_ask_log');
    if (!calls.some((x) => x.name === 'qa_ask_log_v2')) why.push('v2 not tried');
    if (!v1) why.push('no fallback to qa_ask_log');
    else if (v1.keys.some((k) => /shown|tapped|first/.test(k))) why.push(`qa_ask_log got the new fields ${v1.keys}`);
    record('counts', 'c-02', why, calls);
  }
  // c-03 · c-04 — the weekly mail with the table (qa_paths_week answering two buttons, then none)
  for (const c of tests.counts.filter((x) => x.id === 'c-03' || x.id === 'c-04')) {
    const env = { ...process.env };
    Object.assign(process.env, { CRON_SECRET: 'test-cron', METRICS_URL: 'https://metrics.invalid', METRICS_KEY: 'test-key', QA_DIGEST_TOKEN: 'test-token', RESEND_API_KEY: 'test-resend', ORDER_MAIL_FROM: 'test@example.invalid', VERCEL_ENV: 'production' });
    delete process.env.QA_DIGEST_DRY_RUN;
    const realFetch = globalThis.fetch;
    let mail = null;
    const two = { days: 7, conversations: 12, handovers: 3, buttons: [{ id: 'with', shown: 9, tapped: 4, in_handover: 2 }, { id: 'deadline', shown: 5, tapped: 1, in_handover: 0 }] };
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u.includes('qa_misses_week')) return new Response(JSON.stringify([{ day: '2026-11-09', page: '/', q: 'hebben jullie hertenvlees' }]), { status: 200 });
      if (u.includes('qa_paths_week')) return new Response(JSON.stringify(c.id === 'c-03' ? two : { days: 7, conversations: 0, handovers: 0, buttons: [] }), { status: 200 });
      if (u.includes('api.resend.com')) {
        mail = JSON.parse(init.body);
        return new Response('{"id":"x"}', { status: 200 });
      }
      throw new Error(`unexpected fetch ${u}`);
    };
    const dg = await import('../api/qa-digest.js');
    const res = await dg.default.fetch(new Request('http://localhost/api/qa-digest', { headers: { authorization: 'Bearer test-cron' } }));
    globalThis.fetch = realFetch;
    for (const k of Object.keys(process.env)) if (!(k in env)) delete process.env[k];
    Object.assign(process.env, env);
    const why = [];
    if (res.status !== 200 || !mail) why.push(`no mail (status ${res.status})`);
    for (const s of c.expect.weekly_mail_has) if (!mail?.text.includes(s)) why.push(`the mail lacks „${s}”`);
    if (c.id === 'c-03' && !mail?.text.includes('Cu ce merge? · 9 · 4 · 2')) why.push('the row of „with” is not its Romanian label with 9 · 4 · 2');
    record('counts', c.id, why, { text: mail?.text.split('\n').slice(-8) });
  }
  hooks.model = saved.model;
  hooks.today = saved.today;
  clearInterval(keep);
}

// ——— report ———
const groups = [...new Set(results.map((r) => r.kind))];
const summary = Object.fromEntries(groups.map((k) => [k, { pass: results.filter((r) => r.kind === k && r.ok).length, total: results.filter((r) => r.kind === k).length }]));
for (const r of results.filter((x) => !x.ok)) console.log(`  ✗ ${r.kind} ${r.id}: ${r.why}${VERBOSE ? `\n      ${JSON.stringify(r.got).slice(0, 300)}` : ''}`);
for (const [k, v] of Object.entries(summary)) console.log(`${k.padEnd(18)} ${v.pass}/${v.total}`);
const fails = results.filter((r) => !r.ok).length;
console.log(fails ? `\n${fails} case(s) wrong` : '\nall right');
if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), `${JSON.stringify({ _source: `scripts/assistant-test-11d.mjs on ${new Date().toISOString()}; index ${args.includes('--src') ? 'built from src' : 'dist/assistant-index.json'}; clock ${NOW.toISOString()} unless a case sets its own. [MEASURED-OURS] local.`, summary, results }, null, 1)}\n`);
  console.log(`written ${out}`);
}
process.exit(fails ? 1 : 0);
