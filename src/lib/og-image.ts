// The link preview (row 22o; Dan 30.10 13:12 on WhatsApp's text-only preview of slagerij-john.be): one 1200 × 630 baseline
// JPEG per page, made at build from the page's hero frame 1 and served at /og/<the photo's own name>.jpg. Sharp directly,
// not getImage: getImage does not enlarge (the home's frame 1 is 886 px wide) and cannot composite, and a stable name
// keeps a link already shared pointing at a file after the next deploy. A cut-out or a „whole” frame is drawn entire,
// centred on the hero's ink; any other frame is cut at its focal point, read as CSS object-position (the focal value
// shares out what the cut leaves over), the desktop row where it has one: the shape is the desktop hero's. Not the
// keyword thirds of hero-image.ts: focalY 35 would be `top`, and the 465 px slice of the home's tall mici frame would be
// a guest's jeans instead of the mici. The RO twin passes the same frame, so the same file.
// Written into dist/ as the page renders (Astro empties dist/ before it generates the pages); `astro dev` serves no /og/
// and only needs the URL. `fsPath` is the source path Astro's image proxy carries, not in its public type.
import { mkdir, writeFile } from 'node:fs/promises';
import { parse } from 'node:path';
import { outDir } from 'astro:config/server';
import type { ImageMetadata } from 'astro';
import sharp from 'sharp';
import photos from '../data/photos.json';
import type { HeroPhoto } from '../data/types';
import type { Locale } from '../i18n/ui';
import type { Frame } from './hero-image';

const WIDTH = 1200;
const HEIGHT = 630;
const INK = '#15110D'; // tokens.css --ink
const QUALITY = 80;

const jpeg = async (f: Frame, path: string) => {
  const src = sharp(path).autoOrient();
  if (f.whole || (await src.metadata()).hasAlpha) {
    return src.resize(WIDTH, HEIGHT, { fit: 'contain', background: INK }).flatten({ background: INK }).jpeg({ quality: QUALITY }).toBuffer();
  }
  const scale = Math.max(WIDTH / f.img.width, HEIGHT / f.img.height);
  const width = Math.round(WIDTH / scale), height = Math.round(HEIGHT / scale);
  const left = Math.round(((f.img.width - width) * (f.focalX ?? 50)) / 100);
  const top = Math.round(((f.img.height - height) * (f.desktopFocalY ?? f.focalY ?? 50)) / 100);
  return src.extract({ left, top, width, height }).resize(WIDTH, HEIGHT).jpeg({ quality: QUALITY }).toBuffer();
};

const made = new Map<string, Promise<void>>();
/** the frame's preview file: made once per build, however many pages share it */
export async function ogFile(f: Frame) {
  const { fsPath } = f.img as ImageMetadata & { fsPath: string };
  const file = `${parse(fsPath).name}.jpg`;
  if (import.meta.env.PROD && !made.has(file)) {
    const dir = new URL('og/', outDir);
    made.set(file, jpeg(f, fsPath).then(async (data) => {
      await mkdir(dir, { recursive: true });
      await writeFile(new URL(file, dir), data);
    }));
  }
  await made.get(file);
  return { src: `/og/${file}`, width: WIDTH, height: HEIGHT };
}

const heroFiles = import.meta.glob<{ default: ImageMetadata }>('../assets/hero/*.{jpg,jpeg,png,webp}', { eager: true });
/** the home's hero frame 1 (photos.json `hero`): the home's preview, and the fallback of every page without a hero */
export function homeFrame(locale: Locale): Frame {
  const p = (photos.hero as HeroPhoto[])[0];
  const img = heroFiles[`../assets/${p.src}`]?.default;
  if (!img) throw new Error(`photos.json hero ${p.id}: src/assets/${p.src} not found`);
  return { img, alt: p.alt[locale], focalX: p.focalX, focalY: p.focalY };
}
