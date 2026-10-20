// Row 15c (19.10, lexicon §5.31): the site's one „last updated” date. Every byline („bijgewerkt op …” / „actualizat
// la …”) and the terms/privacy version line („Versie van …” / „Versiunea din …”) read it — the domain switch changes
// this line only. The allergens' legal line keeps its own date (the owners' confirmation, allergens.json).
// Row 18 (20.10): a page changed after SITE_UPDATED passes its own date (`since`); the byline shows the later of the two,
// so when the domain switch moves SITE_UPDATED past it, that page follows the site again with no second edit.
import type { Locale } from '../i18n/ui';
import { dateLabel } from './menu';

export const SITE_UPDATED = '2026-10-19';
/** /producten + /ro/produse: the whole assortment (row 18, lexicon §5.19 20.10) */
export const ASSORTMENT_UPDATED = '2026-10-20';

/** „19 oktober 2026” / „19 octombrie 2026” — or `since`'s date when it is later than SITE_UPDATED (ISO dates compare as text) */
export const updatedOn = (locale: Locale, since?: string) => {
  const iso = since && since > SITE_UPDATED ? since : SITE_UPDATED;
  return `${dateLabel(iso, locale)} ${iso.slice(0, 4)}`;
};
