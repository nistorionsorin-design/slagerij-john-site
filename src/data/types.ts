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
  /** row 14: the photo's place on its page (head · strip · atelier · optional · tile …), from phone-shoot-slots.json */
  role?: string;
  /** row 14: the white-balance class applied before the crop (display · atelier) */
  wb?: string;
  alt: L10n;
}

/** The counter tag that rides on a hero frame (desktop). Tag rule (D-38, 17.10): it shows only what FACTS has —
 *  `line` null = no line row; `price` null = no price and no unit (the unit belongs to the price); never a placeholder. */
export interface HeroTag { name: L10n; line: L10n | null; price: L10n | null; unit: L10n | null }
/** a hero frame (D-38): `id` is how other pages pick it (never its index) */
export interface HeroPhoto extends Photo {
  id: string;
  /** AVIF/WebP quality when not the hero's 45 (row 14c: the highest that keeps the phone variant ≤ 90 kB) */
  quality?: number;
  /** show the scene whole instead of a full-bleed crop (Dan 17.10, the pig on the spit): the band from `x` % of the
   *  photo's width, `w` % wide, spans the frame's width; its focalY sits at `top` % of the frame on the phone (the
   *  middle from 960); the rest of the frame is the same photo, blurred */
  whole?: { x: number; w: number; top: number };
  tag: HeroTag;
}

export interface Slot { open: string; close: string }
export interface Day { dayOfWeek: string; slots: Slot[] }
/** hours.json `special`: one calendar day (Brussels) that replaces the regular week; `slots: []` = closed.
 *  e.g. { "date": "2026-11-01", "slots": [] } · { "date": "2026-12-24", "slots": [{ "open": "08:00", "close": "16:00" }] } */
export interface SpecialDay { date: string; slots: Slot[] }

/** products.json (stage 4). Every unit the bestelbon sells by (docs/order-flow.md §3: per kg · pers · stuk · liter · colli;
 *  row 15a: portie = the vleeshoofdgerechten, per portie van 200 g — docs/data/price-list.json). */
export type Unit = 'kg' | 'pers' | 'colli' | 'stuk' | 'liter' | 'portie';

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
  /** the tag's one line: the cooking line (counter products) or the contents (colli); null = no line (row 5b:
   *  gourmet-9 / gourmet-10, the name says „9 soorten”) */
  line: L10n | null;
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
export interface MenuItem {
  id: string;
  /** row 15a: the id of its `sections` entry */
  section: string;
  name: L10n;
  /** persons (tapas), contents — as the products.json row */
  line?: L10n;
  price: number | null;
  priceFrom?: boolean;
  unit: Unit;
  min?: number;
  step?: number;
}
/** row 15a: one section of the menu card, in the owners' folder's order; `note` = the section's unit line */
export interface MenuSection { id: string; name: L10n; note?: L10n }
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
  sections: MenuSection[];
  items: MenuItem[];
}
export interface Menus { menus: Menu[] }
