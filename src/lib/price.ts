// Price and unit display of a counter tag (stage 4). Formats only; the figures come from products.json and stay
// null — shown as the placeholder — until FACTS.md has the owners' price (C-04).
// Forms: lexicon §9 „Prices: NL `€10/persoon`, `€45`, `€12,50/kg`; RO `10 €/persoană`, `45 €`, `12,50 €/kg`”;
// „vanaf” = the old site's word (§5.11 „fondue vanaf €10”), RO „de la” (§5.5 RO „de la 50 €”).
// Unit labels: the tag's short forms already on the hero and the home (lexicon §5.14: /kg · /colli · /pers → /pers.);
// /stuk = §5.19 (RO /buc.), /liter = §2.2 „per liter” (RO: no lexicon form yet).
import type { Locale } from '../i18n/ui';
import type { Products, Product, Unit } from '../data/types';
import data from '../data/products.json';

export const products = data as Products;

const units: Record<Locale, Record<Unit, string>> = {
  nl: { kg: '/kg', colli: '/colli', pers: '/pers', stuk: '/stuk', liter: '/liter' },
  ro: { kg: '/kg', colli: '/colli', pers: '/pers.', stuk: '/buc.', liter: '[UNITATE]' },
};
const placeholder: Record<Locale, string> = { nl: '[PRIJS]', ro: '[PREȚ]' };

/** 45 → „45”, 12.5 → „12,50” (comma decimal in both languages) */
const amount = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));

export const unitLabel = (unit: Unit, locale: Locale) => units[locale][unit];

export const priceLabel = (p: Product, locale: Locale) => {
  if (p.price === null) return placeholder[locale];
  const v = locale === 'ro' ? `${amount(p.price)} €` : `€${amount(p.price)}`;
  if (!p.priceFrom) return v;
  return locale === 'ro' ? `de la ${v}` : `vanaf ${v}`;
};

export const item = (id: string): Product => {
  const p = products.items.find((x) => x.id === id);
  if (!p) throw new Error(`products.json: no item "${id}"`);
  return p;
};
