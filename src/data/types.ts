export type L10n = { nl: string; ro: string };

export interface Photo {
  /** path under src/assets/, e.g. "hero/mici-….jpg" */
  src: string;
  /** the original it was copied from (assets/raw/…) */
  from?: string;
  width?: number;
  height?: number;
  /** object-position, % */
  focalX?: number;
  focalY?: number;
  /** transform-origin of the Ken Burns zoom, % (canvas); defaults to the focal point */
  zoomX?: number;
  zoomY?: number;
  alt: L10n;
}

/** The counter tag that rides on a hero frame (desktop). Placeholders until FACTS.md. */
export interface HeroTag { name: L10n; line: L10n; price: L10n; unit: L10n }
export interface HeroPhoto extends Photo { tag: HeroTag }

export interface Slot { open: string; close: string }
export interface Day { dayOfWeek: string; slots: Slot[] }
/** hours.json `special`: one calendar day (Brussels) that replaces the regular week; `slots: []` = closed.
 *  e.g. { "date": "2026-11-01", "slots": [] } · { "date": "2026-12-24", "slots": [{ "open": "08:00", "close": "16:00" }] } */
export interface SpecialDay { date: string; slots: Slot[] }

/** products.json (stage 4). Every unit the bestelbon sells by (docs/order-flow.md §3: per kg · pers · stuk · liter · colli). */
export type Unit = 'kg' | 'pers' | 'colli' | 'stuk' | 'liter';

/** products.json `categories`: one section of /producten (pill + anchor) or of a later page. */
export interface Category {
  id: string;
  /** the pill and the section name */
  name: L10n;
}

/** products.json `items`: one counter tag. `price` null = not in FACTS.md yet → the tag shows [PRIJS] / [PREȚ]. */
export interface Product {
  id: string;
  category: string;
  name: L10n;
  /** the tag's one line: the cooking line (counter products) or the contents (colli) */
  line: L10n;
  /** € per unit, as the owners give it; null until FACTS.md has it */
  price: number | null;
  /** „vanaf €10” (fondue: the old site's „vanaf”) */
  priceFrom?: boolean;
  unit: Unit;
  /** the „aanbevolen pakket” look of board Toog: the ink tag */
  featured?: boolean;
  photo?: string;
}

export interface Products {
  categories: Category[];
  items: Product[];
  /** „Deze week op de toog” on the home: ids into `items` */
  week: string[];
}

export interface FaqItem { q: string; a: string; keywords?: string[] }
