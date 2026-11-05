// Product thumbnails (row 5b, D-34): which product row has its own photo. src/data/product-photos.json is the site copy of
// Cowork's docs/data/product-photos.json; a row without an entry shows nothing (no empty box, no stock photo), so the
// components ask here first and keep their old markup when the answer is null.
// Row 22 (D-50 (3)): the photo's source file and its crop (shared by Thumb.astro, the Vitrine tiles and the sheet), the
// row's OWN photo (`level: item` — a section shot shows the range, not the product: no tile, no board thumb, no sheet
// photo) and the Vitrine's pick per category.
import type { ImageMetadata } from 'astro';
import type { L10n, Product } from '../data/types';
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

/** A menu row (menus.json `ej26-tapas-mix`) is its product's row (`tapas-mix`): the folder's year prefix comes off. */
const productId = (id: string) => id.replace(/^ej\d{2}-/, '');

export const thumbOf = (id: string | undefined): ProductPhoto | null => (id ? (entries[id] ?? entries[productId(id)] ?? null) : null);

const rubrics = data.rubrics as Record<string, ProductPhoto>;

/** Row 22f: a /producten rubric head's print — the rubric's own photo (product-photos.json `rubrics`, keyed by rubric,
 *  so it stays when a product leaves), else the first `level: section` photo of its rows (lexicon §5.19 20.10); colli
 *  has neither: no print. */
export const rubricPrint = (rubric: string, rows: Product[]): ProductPhoto | null =>
  rubrics[rubric] ?? rows.map((p) => thumbOf(p.id)).find((e) => e?.level === 'section') ?? null;

/** Row 22g: a `rubrics` photo printed outside /producten (`bbq-aan-huis` → /bbq-pakketten block 1 + the /traiteur
 *  tile 4), or null */
export const rubric = (id: string): ProductPhoto | null => rubrics[id] ?? null;

/** Row 22: the row's own photo (`level: item`), else null. */
export const ownPhoto = (id: string): ProductPhoto | null => {
  const e = thumbOf(id);
  return e?.level === 'item' ? e : null;
};

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/{products,roemeens,bbq}/*.{jpg,jpeg,png,webp}', { eager: true }); // row 14: a thumb may share a page photo's file

/** The entry's source image; an entry naming a file that is not there stops the build. */
export const photoFile = (entry: ProductPhoto): ImageMetadata => {
  const img = files[`../assets/${entry.src}`]?.default;
  if (!img) throw new Error(`product-photos.json: src/assets/${entry.src} not found`);
  return img;
};

/** Row 22v: the source's pixel size, read from the proxy's own copy (`clone`): any other property read on Astro's image
 *  proxy marks the original as used and the build ships it whole in /_astro/ (the eight orphan JPEGs that rows 22b–22p's
 *  `photoFile(e).width` left in dist/). */
const sourceSize = (entry: ProductPhoto): { width: number; height: number } => {
  const img = photoFile(entry) as ImageMetadata & { clone?: ImageMetadata };
  const { width, height } = img.clone ?? img;
  return { width, height };
};

/** Row 22v: the width of a cut of shape `aspect` (w / h) — `want`, or the widest such cut the source holds when it is
 *  smaller. sharp never enlarges and clamps width and height apart, so a 447 × 447 source asked for 520 × 390 came out
 *  447 × 390 and its Vitrine tile stood taller than its neighbours; cut at 447 × 335 it keeps the tile's 4:3. A source
 *  big enough returns `want` itself, so every existing photo gets the same transform as before. */
export const cutWidth = (entry: ProductPhoto, want: number, aspect: number): number => {
  const s = sourceSize(entry);
  return Math.min(want, Math.floor(Math.min(s.width, s.height * aspect)));
};

/** sharp crops by keyword, not by percentage: the focal point mapped to its third of the frame */
export const gravity = (x = 50, y = 50) =>
  [y < 40 ? 'top' : y > 60 ? 'bottom' : '', x < 40 ? 'left' : x > 60 ? 'right' : ''].filter(Boolean).join(' ') || 'center';

/** Row 22: the row's own photo for the Vitrine tile (520 w) and the sheet (720 × 440). Until row 22v it also asked for a
 *  file ≥ 720 px wide (the build never enlarges, so a smaller file shows soft); row 22v (05.11) puts nine downloaded
 *  stand-ins of 440–700 px in the tiles and sheets on purpose (build-plan 22v (c)), so every own photo counts now and
 *  photoFile still stops the build on a missing file. A file under its drawn width is drawn larger by the browser —
 *  the row's report measures it per file. */
export const bigPhoto = (id: string): ProductPhoto | null => {
  const e = ownPhoto(id);
  return e && photoFile(e) ? e : null;
};

/** Row 22b (D-51 (1), build-plan row 22b (b)): a category's entrance „Meest gevraagd” — up to four of its rows with
 *  their own photo (big enough, `bigPhoto`): the owners' best sellers, product-photos.json `bestsellers.<category>` (a
 *  list of ids, form q10), in that order, those with a photo; then, row 22p (Dan 30.10), the category's other rows with
 *  a photo in data order (products.json) until there are four. No photo in the category = no entrance.
 *  `rows` = the category's rows in products.json order. */
export const entranceOf = (category: string, rows: Product[]): Product[] => {
  const withPhoto = rows.filter((p) => bigPhoto(p.id));
  // row 22g: the map also carries `_source` and `_fills` (the docs file as is) — only a category's list is read
  const list = (data as { bestsellers?: Record<string, unknown> }).bestsellers?.[category];
  const best = Array.isArray(list) ? (list as string[]) : [];
  const picked = best.map((id) => withPhoto.find((p) => p.id === id)).filter((p): p is Product => !!p);
  return [...new Set([...picked, ...withPhoto])].slice(0, 4);
};
