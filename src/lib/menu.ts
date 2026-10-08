// Seasonal menus (stage 7, menus.json, lexicon §5.22): the values the page and the bestelbon write into their strings.
// A value still null in menus.json leaves the string's placeholder standing ([DATUM] / [UUR], RO [DATA] / [ORA]) —
// FACTS.md fills menus.json at stage 15 (C-04).
import type { Locale } from '../i18n/ui';
import type { Menu, Menus } from '../data/types';
import data from '../data/menus.json';

export const menus = data as Menus;

export const menu = (id: string): Menu => {
  const m = menus.menus.find((x) => x.id === id);
  if (!m) throw new Error(`menus.json: no menu "${id}"`);
  return m;
};

const MONTH: Record<Locale, string[]> = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  ro: ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'],
};
/** 2026-12-20 → „20 december” / „20 decembrie” */
export const dateLabel = (isoDate: string, locale: Locale) => {
  const [, m, d] = isoDate.split('-').map(Number);
  return `${d} ${MONTH[locale][m - 1]}`;
};

/** Swaps the deadline and the pickup hours into a string: [DATUM]/[DATA] = the deadline; the first [UUR]/[ORA] = the
 *  first pickup day's `from`, the second = its `to`. A null keeps its placeholder. */
export const fillMenu = (text: string, m: Menu, locale: Locale) => {
  const dateKey = locale === 'ro' ? '[DATA]' : '[DATUM]';
  const hourKey = locale === 'ro' ? '[ORA]' : '[UUR]';
  const hours = [m.pickup[0]?.from, m.pickup[0]?.to];
  let i = 0;
  return text
    .split(dateKey).join(m.deadline ? dateLabel(m.deadline, locale) : dateKey)
    .split(hourKey).map((part, k, all) => (k < all.length - 1 ? part + (hours[i++] ?? hourKey) : part)).join('');
};
