// The assistant's index (row 11a, docs/assistant.md §10.4): one compact object built once at build time from the site's
// own data — the answer bank (assistant-faq.json), the synonym bank (assistant-synonyms.json), products.json,
// product-photos.json, allergens.json, hours.json, delivery.json, menus.json, entity.json, recipes.json and the lexicon
// strings (src/i18n/assistant.ts). Served same-origin as /assistant-index.json and fetched on the first question.
// Pure function, no file access, no DOM: the caller (lib/assistant/index.ts at build, row 11c's function) passes the
// data. Every phrase is stored normalised (normalize.js `norm`), so the browser does no folding of the shop's words.
import { norm } from './normalize.js';

const uniq = (a) => [...new Set(a.filter(Boolean))];
// „meat”, „piece”: words for all of it, never a group to pick from
const GENERAL = new Set(['vlees', 'carne', 'stuk', 'stukje', 'bucata', 'bucati', 'gram', 'grame', 'kilo', 'portie', 'portii', 'per', 'pentru', 'met', 'cu', 'de', 'van', 'casa', 'huis', 'eigen']);

/** The words a customer leaves out of a question when the meaning sits in the rest — dropped when a question of the
 *  bank is compared with the customer's text (keywords and product names keep every word). */
export const STOP = {
  nl: 'de het een en van in op te is zijn ben bent jullie u uw ik je jij jou wij we ons onze er dat dit die deze wat hoe of ook nog wel maar met aan om bij als dan kan kunnen mag moet zit zitten heb hebben heeft hebt hier daar wordt worden zo al me mijn mij iets graag even eens toch dus naar uit over voor'.split(' '),
  ro: 'de la pe in cu si sa ce cum e este sunt ai aveti am a al ale un o unei unui pentru mai din se ma te va voi noi eu tu ati asta acest aceasta acesta aici ne nu imi mi iti ti le li lui ei el ea ca daca sau dar fi fie vreau vrei pot poti puteti'.split(' '),
};

/** allergens.json category names → the phrases that name a category in a question: the whole name, each part around
 *  „&” / „și” / „(…)”, and for „X vlees” / „carne X” also X alone („gemarineerd”, „marinata”). */
function categoryPhrases(cat) {
  const out = [];
  for (const lang of ['nl', 'ro']) {
    const name = cat[lang];
    out.push(name);
    // („\b” sees no word edge next to „ș”, so the separators are matched with their spaces)
    for (const part of name.split(/\s+(?:&|și|si)\s+|\s*[()]\s*/)) {
      const p = norm(part);
      if (!p) continue;
      out.push(p);
      const w = p.split(' ');
      if (lang === 'nl' && w.length === 2 && w[1] === 'vlees') out.push(w[0]);
      if (lang === 'ro' && w.length === 2 && w[0] === 'carne') out.push(w[1]);
    }
  }
  return uniq(out.map(norm));
}

/**
 * @param {object} d
 * @param {object} d.faq           assistant-faq.json
 * @param {object} d.syn           assistant-synonyms.json
 * @param {object} d.products      products.json
 * @param {object} d.photos        product-photos.json
 * @param {object} d.allergens     allergens.json
 * @param {object} d.hours         hours.json
 * @param {object} d.delivery      delivery.json
 * @param {object} d.menus         menus.json
 * @param {object} d.entity        entity.json
 * @param {string[]} d.recipes     the ids of recipes.json (a product with a recipe card on /recepten)
 * @param {object} d.strings       src/i18n/assistant.ts qaT
 * @param {object} d.pages         { nl: { path: name }, ro: { … } } — the nav names of the pages an answer links to
 * @param {object} d.paths         { producten, colli, recepten, allergenen } per locale
 * @param {object} d.thumbs        { productId: url } — the 56 px photo of a row that has its own (AVIF)
 * @param {object} d.labels        { productId: { nl, ro } } — the row's price + unit as the site prints it
 */
export function buildIndex(d) {
  const items = d.products.items;
  const week = new Set(d.products.week ?? []);
  const best = new Set(
    Object.entries(d.photos.bestsellers ?? {})
      .filter(([k, v]) => !k.startsWith('_') && Array.isArray(v))
      .flatMap(([, v]) => v),
  );
  const recipes = new Set(d.recipes);

  // colli lines name what is in them: a product whose name stands in a colli's line is in that colli (§10.2 D)
  const colli = items.filter((p) => p.category === 'colli');

  const products = items.map((p) => {
    const s = d.syn.products[p.id] ?? { nl: [], ro: [], typo: [] };
    const names = uniq([p.name.nl, p.name.ro, p.alias?.ro].map(norm));
    const phrases = uniq([...names, ...[...s.nl, ...s.ro, ...(s.typo ?? [])].map(norm)]);
    const href = (loc) => (p.category === 'colli' ? `${d.paths.colli[loc]}#${p.id}` : `${d.paths.producten[loc]}#${p.id}`);
    const inColli = colli
      .filter((c) => c.id !== p.id && c.line && names.some((n) => n.length > 3 && ` ${norm(c.line.nl)} `.includes(` ${n} `)))
      .map((c) => c.id);
    return {
      id: p.id,
      c: p.category,
      g: p.group ?? null,
      n: p.name,
      al: p.alias?.ro ?? null,
      ph: phrases,
      ex: names,
      line: p.line ?? null,
      pl: d.labels[p.id] ?? null,
      pr: p.price,
      u: p.unit,
      pf: !!p.priceFrom,
      ps: !!p.priceInStore,
      w: week.has(p.id),
      b: best.has(p.id),
      tag: !p.board,
      th: d.thumbs[p.id] ?? null,
      href: { nl: href('nl'), ro: href('ro') },
      rc: recipes.has(p.id) ? { nl: `${d.paths.recepten.nl}#${p.id}`, ro: `${d.paths.recepten.ro}#${p.id}` } : null,
      inc: inColli,
    };
  });

  // A word that fits several products („worst”, „cârnați”, „gehakt”, „kip”, „colli” …; the synonym bank's _source):
  // a one-word phrase that stands, as a word or as the front or back of a compound, in the phrases of two products or
  // more and at most 24 („vlees”, „carne” are no choice). The engine asks „Welke bedoelt u?” with these, unless the
  // word is the whole name of exactly one product.
  const words = new Map();
  for (const p of products)
    for (const ph of p.ph)
      for (const w of ph.split(' '))
        if (w.length >= 3) {
          if (!words.has(w)) words.set(w, new Set());
          words.get(w).add(p.id);
        }
  const generic = {};
  const vocab = [...words.keys()];
  for (const [w, ids] of words) {
    const hits = new Set(ids);
    for (const v of vocab) if (v !== w && v.length > w.length + 2 && (v.startsWith(w) || v.endsWith(w))) for (const id of words.get(v)) hits.add(id);
    if (hits.size >= 2 && hits.size <= 24 && !GENERAL.has(w)) generic[w] = [...hits];
  }

  const faq = d.faq.entries.map((e) => ({
    id: e.id,
    topic: e.topic,
    q: e.q,
    k: { nl: uniq((e.keywords?.nl ?? []).map(norm)), ro: uniq((e.keywords?.ro ?? []).map(norm)) },
    a: e.a,
    link: e.link ?? null,
    h: e.handoff,
    d: e.dynamic ?? null,
  }));

  const map = d.faq.allergen_category_map;
  const confirmed = /^confirmed/i.test(String(map?._status ?? ''));
  const allergens = {
    list: d.allergens.allergens.map((a) => ({
      id: a.id,
      nl: a.nl,
      ro: a.ro,
      // the allergen's own words: each word of its NL and RO names („Melk (lactose)” → melk, lactose)
      w: uniq([...norm(a.nl).split(' '), ...norm(a.ro).split(' ')].filter((w) => w.length >= 2)),
    })),
    cats: d.allergens.categories.map((c) => ({ id: c.id, nl: c.nl, ro: c.ro, contains: c.contains, may: c.may, ph: categoryPhrases(c) })),
    notice: { nl: d.allergens.workshop_notice_nl, ro: d.allergens.workshop_notice_ro },
    // the product → category map counts only once the owners confirmed it (build-plan row 11a, allergen gate)
    map: confirmed ? map.map : null,
    href: d.paths.allergenen,
  };

  const intents = {};
  for (const [k, v] of Object.entries(d.syn.intents)) intents[k] = { nl: uniq(v.nl.map(norm)), ro: uniq(v.ro.map(norm)) };

  const menu = (d.menus.menus ?? [])[0] ?? null;

  return {
    v: 1,
    phone: d.entity.telephoneDisplay,
    tel: d.entity.telephone,
    s: d.strings,
    stop: STOP,
    pages: d.pages,
    faq,
    miss: d.faq.miss,
    p: products,
    generic,
    cats: Object.fromEntries(d.products.categories.map((c) => [c.id, c.name])),
    al: allergens,
    intents,
    hours: { timeZone: d.hours.timeZone, regular: d.hours.regular, special: d.hours.special ?? [] },
    cutoff: d.delivery.pickup.cutoff,
    lead: d.delivery.pickup.leadDays,
    menu: menu ? { id: menu.id, deadline: menu.deadline, pickup: menu.pickup } : null,
  };
}
