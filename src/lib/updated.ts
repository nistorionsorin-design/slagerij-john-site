// Row 15c (19.10, lexicon §5.31): the site's one „last updated” date. Every byline („bijgewerkt op …” / „actualizat
// la …”) and the terms/privacy version line („Versie van …” / „Versiunea din …”) read it — the domain switch changes
// this line only. The allergens' legal line keeps its own date (the owners' confirmation, allergens.json).
// Row 18 (20.10): a page changed after SITE_UPDATED passes its own date (`since`); the byline shows the later of the two,
// so when the domain switch moves SITE_UPDATED past it, that page follows the site again with no second edit.
import type { Locale } from '../i18n/ui';
import { dateLabel } from './menu';

export const SITE_UPDATED = '2026-10-19';
/** /producten + /ro/produse: the whole assortment (row 18, lexicon §5.19 20.10); row 21 (lexicon §5.19 „23.10”): the
 *  owners' 22.10 lists + the volume discount — also the WebPage node's dateModified. The byline's date is the push
 *  day: if the push is not on 23.10, this line moves to that day. Row 22g (lexicon §5.19 „27.10”): the owners' form
 *  answers — new rows, the butcher's photos, the discount on meat; pushed on another day than 27.10 → that day.
 *  Row 22p: Georgiana's two photos + „Kaizer de casă”, live 30.10 (Dan's yes, same day). */
export const ASSORTMENT_UPDATED = '2026-10-30';
/** /colli-vleespakketten + /ro/colli: the page is new (row 10d, lexicon §5.28) */
export const COLLI_UPDATED = '2026-10-20';
/** /feestmenu-eindejaar + /ro/sarbatori: the holiday brochure as a pdf under the menu card (row 22h, lexicon §5.22
 *  „27.10”); pushed on another day than 27.10 → that day */
export const EINDEJAAR_UPDATED = '2026-10-27';
/** /bbq-pakketten + /ro/gratar: the gallery (row 22l); /contact + /ro/contact: the shop-front hero (row 22n). The date is the
 *  push day: pushed on another day than 30.10 → that day */
export const BBQ_UPDATED = '2026-10-30';
export const CONTACT_UPDATED = '2026-10-30';

/** „19 oktober 2026” / „19 octombrie 2026” — or `since`'s date when it is later than SITE_UPDATED (ISO dates compare as text) */
export const updatedOn = (locale: Locale, since?: string) => {
  const iso = since && since > SITE_UPDATED ? since : SITE_UPDATED;
  return `${dateLabel(iso, locale)} ${iso.slice(0, 4)}`;
};
