// Row 15c (19.10, lexicon §5.31): the site's one „last updated” date. Every byline („bijgewerkt op …” / „actualizat
// la …”) and the terms/privacy version line („Versie van …” / „Versiunea din …”) read it — the domain switch changes
// this line only. The allergens' legal line keeps its own date (the owners' confirmation, allergens.json).
import type { Locale } from '../i18n/ui';
import { dateLabel } from './menu';

export const SITE_UPDATED = '2026-10-19';

/** „19 oktober 2026” / „19 octombrie 2026” */
export const updatedOn = (locale: Locale) => `${dateLabel(SITE_UPDATED, locale)} ${SITE_UPDATED.slice(0, 4)}`;
