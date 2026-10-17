// Hero frames by id (D-38, 17.10): other pages pick a hero photo by its `id` in photos.json `hero`, never by its index —
// the hero's order is Dan's to change (row 14c: 5 → 10 frames moved the BBQ tray from [3] to [6]).
import photos from '../data/photos.json';
import type { HeroPhoto } from '../data/types';

export function heroPhoto(id: string): HeroPhoto {
  const p = (photos.hero as HeroPhoto[]).find((x) => x.id === id);
  if (!p) throw new Error(`photos.json hero: no frame with id "${id}"`);
  return p;
}
