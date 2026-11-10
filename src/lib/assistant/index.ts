// The assistant's index at build time (row 11a, docs/assistant.md §10.4): the site's own data files + the lexicon
// strings → lib/assistant/build-index.js → one JSON, written by src/pages/assistant-index.json.ts and fetched by the
// box on the first question. The photo of a row is the /producten paper row's own cut (Thumb.astro `row`: 112 px
// source, AVIF), so the browser may already hold it.
import { getImage } from 'astro:assets';
import faq from '../../data/assistant-faq.json';
import syn from '../../data/assistant-synonyms.json';
import products from '../../data/products.json';
import photos from '../../data/product-photos.json';
import allergens from '../../data/allergens.json';
import hours from '../../data/hours.json';
import delivery from '../../data/delivery.json';
import menus from '../../data/menus.json';
import entity from '../../data/entity.json';
import recipes from '../../data/recipes.json';
import towns from '../../data/towns.json';
import reviews from '../../data/reviews.json';
import { homeT } from '../../i18n/home';
import type { Products } from '../../data/types';
import { qaT } from '../../i18n/assistant';
import { nav, menu, footer, ui, type Locale } from '../../i18n/ui';
import { bestellenT } from '../../i18n/bestellen';
import { receptenT } from '../../i18n/recepten';
import { colliT } from '../../i18n/colli';
import { priceLabel, priceUnitLabel } from '../price';
import { ownPhoto, photoFile, gravity } from '../thumbs';
import { buildIndex } from './build-index.js';

const locales: Locale[] = ['nl', 'ro'];
const items = (products as Products).items;

/** the nav name of every page an answer may link to (lexicon §5.32 slot {page}: „the target page's nav name (§5.15)”) */
function pageNames() {
  const out = { nl: {} as Record<string, string>, ro: {} as Record<string, string> };
  for (const L of locales) {
    for (const it of menu[L]) out[L][it.href] = it.label;
    for (const it of nav[L]) out[L][it.href] = it.label;
    for (const it of footer[L].legal) out[L][it.href] = it.label;
    out[L][L === 'ro' ? '/ro/retete' : '/recepten'] = receptenT[L].footer;
    out[L][L === 'ro' ? '/ro/colli' : '/colli-vleespakketten'] = colliT[L].eyebrow;
  }
  return out;
}

export async function assistantIndex() {
  const thumbs: Record<string, string> = {};
  for (const p of items) {
    const e = ownPhoto(p.id);
    if (!e) continue;
    const img = await getImage({ src: photoFile(e), width: 112, height: 112, fit: 'cover', position: gravity(e.focalX, e.focalY), quality: 50, format: 'avif' });
    thumbs[p.id] = img.src;
  }
  // the card's price as the tags print it: „€45/stuk”, „vanaf €10/pers”; a price in the shop alone, without a unit
  const label = (p: (typeof items)[number], L: Locale) => (p.priceInStore ? priceLabel(p, L) : `${priceLabel(p, L)}${priceUnitLabel(p, L)}`);
  const labels = Object.fromEntries(items.map((p) => [p.id, { nl: label(p, 'nl'), ro: label(p, 'ro') }]));
  // row 11b: the words the slip in the conversation shares with the bestelbon (§5.20 / §5.19 / §5.22, read where they
  // live): „prijs in de winkel” · „op aanvraag” for totalLabel, the volume-discount note, the menu's closed line
  const strings = Object.fromEntries(
    locales.map((L) => [L, { ...qaT[L], recipe: receptenT[L].tagLink, slip: { inStore: bestellenT[L].slip.inStore, tbc: bestellenT[L].slip.priceTbc, inStoreNote: bestellenT[L].slip.inStoreNote }, discount: ui[L].discountNote, menuClosed: bestellenT[L].menu.closed }]),
  );
  return buildIndex({
    faq,
    syn,
    products,
    photos,
    allergens,
    hours,
    delivery,
    menus,
    entity,
    recipes: recipes.recipes.map((r) => r.id),
    strings,
    pages: pageNames(),
    paths: {
      producten: { nl: '/producten', ro: '/ro/produse' },
      colli: { nl: '/colli-vleespakketten', ro: '/ro/colli' },
      recepten: { nl: '/recepten', ro: '/ro/retete' },
      allergenen: { nl: '/allergenen', ro: '/ro/alergeni' },
    },
    thumbs,
    labels,
    towns,
    orderPaths: {
      bestellen: { nl: '/bestellen', ro: '/ro/comanda' },
      eindejaar: { nl: '/feestmenu-eindejaar', ro: '/ro/sarbatori' },
    },
    // row 11c: the live Google figure in the trust strip's own form + the reviews block's link (the `google-rating`
    // offer of docs/data/assistant-offers.json; D-10: hand-read reviews.json, its date with it)
    reviews: Object.fromEntries(
      locales.map((L) => {
        const rating = reviews.rating.toFixed(1).replace('.', ',');
        return [L, { line: homeT[L].trust.google(rating, String(reviews.count)), link: homeT[L].reviews.link, href: homeT[L].reviews.href, read: reviews.fetchedAt }];
      }),
    ),
  });
}
