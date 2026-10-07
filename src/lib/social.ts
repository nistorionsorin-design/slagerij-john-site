// The brand marks with their links — shared by the overlay menu (stage 0b2) and the footer (stage 0c).
// Facebook, TikTok, Too Good To Go = entity.json sameAs; Google Maps = the shop's Maps profile (FACTS, canonical cid URL).
// A brand without a link in entity.json is left out.
import entity from '../data/entity.json';
import type { Brand } from '../components/BrandIcon.astro';

export interface Social { brand: Brand; name: string; href: string }

const same = (host: string) => entity.sameAs.find((u) => u.includes(host));
const maps = 'https://www.google.com/maps?cid=16864215184050152248';

export const social: Social[] = [
  { brand: 'facebook', name: 'Facebook', href: same('facebook.com') },
  { brand: 'tiktok', name: 'TikTok', href: same('tiktok.com') },
  { brand: 'google-maps', name: 'Google Maps', href: maps },
  { brand: 'too-good-to-go', name: 'Too Good To Go', href: same('toogoodtogo.com') },
].filter((s): s is Social => Boolean(s.href));
