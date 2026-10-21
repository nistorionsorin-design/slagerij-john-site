// The hero's first frame, cut once and shared (row 16 prep, 21.10): PageHero.astro draws the frames with these sets and
// HeroPreload.astro puts frame 1 into a <link rel="preload"> at the top of <head> with the same calls, so the preload is
// byte for byte the request the <picture> makes (getImage is deterministic: same options → same /_astro/ file).
// Why a preload when the <img> already has fetchpriority high: the inline CSS and the sign come first in the HTML, so the
// first frame is found only 14–22 kB (gzip) into the document — on a phone that is the second network round trip; the
// preload is in the first one. Lighthouse's simulation cannot show it (it starts every subresource after the whole
// document), the field can. The cuts (moved here from PageHero.astro, unchanged): sharp crops by keyword — the focal point
// mapped to its third of the frame (ArtPicture's rule); three boxes. Phone: 1 : 2 (390 × 844 is 0,46, 360 × 640 is 0,56),
// drawn max(100vw, ½ of the height); Lighthouse's 412 × 823 at DPR 1,75 asks ≈ 720 px → the ≤ 828 file. Tablet (600–959,
// still the phone layout, the hero ≤ 920 px tall): 4 : 5. Desktop: 2 : 1, drawn max(the print's width, twice its
// height) — the print is the container less its gutters.
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export interface Frame {
  img: ImageMetadata;
  alt: string;
  focalX?: number;
  focalY?: number;
  /** the zoom's origin (photos.json zoomX / zoomY), else the focal point */
  zoomX?: number;
  zoomY?: number;
  /** the desktop crop's focal row, where it differs (John's face in the top fifth of john-bbq) */
  desktopFocalY?: number;
  /** draw the photo whole instead of covering the hero: phone width in % of the hero's, its top edge in % of the hero's
      height; `backdrop`: an opaque photo — the blurred copy behind it */
  whole?: { width: number; top: number; backdrop?: boolean };
}
export interface Box { ratio: number; steps: number[]; max: number; sizes: string }
export interface Set { width: number; height: number; avif: string; webp: string; src: string; sizes: string }

const gravity = (x = 50, y = 50) =>
  [y < 40 ? 'top' : y > 60 ? 'bottom' : '', x < 40 ? 'left' : x > 60 ? 'right' : ''].filter(Boolean).join(' ') || 'center';

const boxes: Record<'m' | 't' | 'd', Box> = {
  m: { ratio: 0.5, steps: [480, 640, 828], max: 828, sizes: 'max(100vw, 50vh)' },
  t: { ratio: 0.8, steps: [828, 1080, 1280, 1600], max: 1600, sizes: 'max(100vw, min(100vh, 920px) * 0.8)' },
  d: { ratio: 2, steps: [1280, 1600, 2040], max: 2040, sizes: 'max(min(100vw, 1440px) - 112px, min(640px, 100vh - 140px) * 2)' },
};

const cut = async (f: Frame, b: Box, quality: number, fy = f.focalY): Promise<Set> => {
  const width = Math.min(f.img.width, Math.round(f.img.height * b.ratio), b.max);
  const height = Math.round(width / b.ratio);
  const opts = { src: f.img, width, height, fit: 'cover' as const, position: gravity(f.focalX, fy), widths: b.steps.filter((w) => w < width).concat(width) };
  const [avif, webp] = await Promise.all([getImage({ ...opts, format: 'avif', quality }), getImage({ ...opts, format: 'webp', quality: quality + 10 })]);
  return { width, height, avif: avif.srcSet.attribute, webp: webp.srcSet.attribute, src: webp.src, sizes: b.sizes };
};

// a whole frame keeps the photo's own shape in every box (no cut): phone drawn width % of the hero, tablet ≤ 82 % of it,
// desktop as tall as the hero + 12 % (PageHero's CSS)
const wholeBoxes = (f: Frame): Record<'m' | 't' | 'd', Box> => {
  const ratio = f.img.width / f.img.height;
  const w = f.whole!.width / 100;
  return {
    m: { ratio, steps: [480, 640, 828], max: 828, sizes: `calc(100vw * ${w})` },
    t: { ratio, steps: [828, 1080, 1280, 1600], max: 1600, sizes: `calc(100vw * ${Math.min(w, 0.82)})` },
    d: { ratio, steps: [1080, 1280, 1600], max: 1600, sizes: `calc(min(640px, 100vh - 140px) * ${(1.12 * ratio).toFixed(3)})` },
  };
};

/** a PageHero frame's three files (phone · tablet · desktop), AVIF + WebP */
export async function frameSets(f: Frame, quality: number) {
  const b = f.whole ? wholeBoxes(f) : boxes;
  const [m, t, d] = await Promise.all([cut(f, b.m, quality), cut(f, b.t, quality), cut(f, b.d, quality, f.desktopFocalY ?? f.focalY)]);
  return { m, t, d };
}

// The home hero (Hero.astro, astro:assets <Picture>): one file set for every width, moved here from Hero.astro unchanged.
// The frame covers its box: on a phone the full screen (height-bound for wide photos), on desktop the pinned print right
// of the seam (hero-seam.css: 45 % wide, 48 % from 1600 px, 16 px inset top and bottom). The phone term is 1 px short of
// the drawn width: a 3:4 frame on Lighthouse's phone (823 px tall, DPR 1,75) asked for 1080,2 device px and got the
// 1500/1600 file (199 kB for the counter photo) for 0,2 px — 1 px is invisible (row 14c). A „whole” frame (the pig on
// the spit) is drawn 100/w times the frame's width (`w` = the band of the photo that fills it, in %).
export const homeWidths = (img: ImageMetadata) => {
  const max = Math.min(img.width, 1600);
  return [480, 768, 1080, 1600].filter((w) => w < max).concat(max);
};
export const homeSizes = (img: ImageMetadata, wholeW?: number) => {
  if (wholeW) {
    const k = (100 / wholeW).toFixed(3);
    return `(min-width: 1600px) calc(48vw * ${k}), (min-width: 960px) calc(45vw * ${k}), calc(100vw * ${k})`;
  }
  const r = (img.width / img.height).toFixed(3);
  return `(min-width: 1600px) max(48vw, calc((100vh - 32px) * ${r})), (min-width: 960px) max(45vw, calc((100vh - 32px) * ${r})), max(100vw, calc(100vh * ${r} - 1px))`;
};
/** the home frame 1's AVIF set — the call <Picture formats={['avif', 'webp']}> makes for its first <source> */
export async function homePreload(img: ImageMetadata, quality: number, wholeW?: number): Promise<Preload[]> {
  const sizes = homeSizes(img, wholeW);
  const avif = await getImage({ src: img, widths: homeWidths(img), sizes, format: 'avif', quality });
  return [{ srcset: avif.srcSet.attribute, sizes }];
}

/** one image preload: the AVIF the <picture> picks first, scoped to the viewport its <source> answers */
export interface Preload { media?: string; srcset: string; sizes: string }
/** the preloads of a PageHero frame: HeroPic's three <source media> ranges (≥ 960 · ≥ 600 · the rest) */
export const framePreloads = ({ m, t, d }: Awaited<ReturnType<typeof frameSets>>): Preload[] => [
  { media: '(max-width: 599.98px)', srcset: m.avif, sizes: m.sizes },
  { media: '(min-width: 600px) and (max-width: 959.98px)', srcset: t.avif, sizes: t.sizes },
  { media: '(min-width: 960px)', srcset: d.avif, sizes: d.sizes },
];
