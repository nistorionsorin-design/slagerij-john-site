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

export interface Product {
  id: string;
  category: string;
  name: L10n;
  line: L10n;
  price: number | null;
  unit: 'kg' | 'pers' | 'colli' | 'stuk';
  photo?: string;
}

export interface FaqItem { q: string; a: string; keywords?: string[] }
