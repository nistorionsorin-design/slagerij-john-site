// Product thumbnails (row 5b, D-34): which product row has its own photo. src/data/product-photos.json is the site copy of
// Cowork's docs/data/product-photos.json; a row without an entry shows nothing (no empty box, no stock photo), so the
// components ask here first and keep their old markup when the answer is null.
import type { L10n } from '../data/types';
import data from '../data/product-photos.json';

export interface ProductPhoto {
  /** path under src/assets/, e.g. "products/mici.jpeg" */
  src: string;
  from: string;
  focalX: number;
  focalY: number;
  alt: L10n;
  level: 'item' | 'section';
}

const entries = data.products as Record<string, ProductPhoto>;

/** A menu row (menus.json `ej26-tapas-2`) is its product's row (`tapas-2`): the folder's year prefix comes off. */
const productId = (id: string) => id.replace(/^ej\d{2}-/, '');

export const thumbOf = (id: string | undefined): ProductPhoto | null => (id ? (entries[id] ?? entries[productId(id)] ?? null) : null);
