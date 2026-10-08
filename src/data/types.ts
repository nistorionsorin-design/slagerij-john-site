export type L10n = { nl: string; ro: string };

export interface Photo {
  /** path under src/assets/, e.g. "hero/mici-….jpg" */
  src: string;
  /** the original it was copied from (assets/raw/…) */
  from?: string;
  /** another file for desktop (≥ 960 px) at the same place — art direction, e.g. a wide photo for a wide tile */
  srcDesktop?: string;
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
  /** bestelbon (stage 5): smallest quantity (gourmet „vanaf 2 personen”); default per unit in src/lib/order-core.js */
  min?: number;
  /** bestelbon: quantity step; default per unit (kg 0,5 · everything else 1) */
  step?: number;
  /** bestelbon: false = not orderable online (default true) */
  orderable?: boolean;
  /** sold through the bestelbon only, not shown on /producten (its page is a later stage) */
  orderOnly?: boolean;
}

export interface Products {
  categories: Category[];
  items: Product[];
  /** „Deze week op de toog” on the home: ids into `items` */
  week: string[];
}

export interface FaqItem { q: string; a: string; keywords?: string[] }

/** delivery.json (stage 5): the old site's delivery rules ([OBSERVED] 03.10 / 06.10, lexicon §5.5) — D6: the owners
 *  confirm. `rings`: free from `freeFrom` € within `km` of the shop; `zones`: postcode → ring (km 10 or 20). */
export interface Delivery {
  minimumOrder: number | null;
  rings: { km: number; freeFrom: number }[];
  feePerKm: number | null;
  days: string[];
  times: string[];
  zones: { postcode: string; place: string; ring: number }[];
  pickup: { leadDays: number; cutoff: string | null; stepMin: number; horizonDays: number };
  currency: string;
}

/** menus.json (stage 7, lexicon §5.22): a seasonal menu the bestelbon lists on top when opened with ?menu=…
 *  `deadline` null → [DATUM] (nothing closes before FACTS.md has the date); `pickup` from/to null → [UUR] and the
 *  day's opening hours. Items have the products.json row shape (no category, no line). */
export interface MenuItem { id: string; name: L10n; price: number | null; unit: Unit; min?: number; step?: number }
export interface Menu {
  id: string;
  /** /bestellen?menu=<param> opens the bestelbon with this menu on top */
  param: string;
  name: L10n;
  /** §5.10: the WhatsApp opening the bestelbon puts before the order when a row of this menu is chosen */
  message: L10n;
  /** the line the bestelbon shows once a row of this menu is chosen: menu orders are pickup only (§5.22, 08.10 17:50) */
  pickupOnly: L10n;
  /** the menu's word in the shop's mail subject (NL) and first line (RO) */
  mail: L10n;
  deadline: string | null;
  pickup: { date: string; from: string | null; to: string | null }[];
  items: MenuItem[];
}
export interface Menus { menus: Menu[] }
