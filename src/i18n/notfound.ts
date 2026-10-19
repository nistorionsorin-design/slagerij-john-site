// The 404 page (row 13): lexicon §5.15 „404” (NL) and §6 interface strings „404” (RO), verbatim. The CTA labels are
// the §5.3 primary CTA (ui.ts `order`) and the 404 button. The same page answers the old app routes with 410
// (api/gone.js): a visitor with a bookmark reads the same thing.
import type { Locale } from './ui';

export const notfound = {
  nl: {
    title: 'Pagina niet gevonden | Slagerij John',
    h1: 'Pagina niet gevonden',
    text: 'Deze pagina bestaat niet of niet meer. Wat u zoekt, vindt u via de startpagina of via WhatsApp.',
    home: 'Naar de startpagina',
    homeHref: '/',
    whatsapp: 'Bestel via WhatsApp',
  },
  ro: {
    title: 'Pagina nu a fost găsită | Măcelăria John',
    h1: 'Pagina nu a fost găsită',
    text: 'Pagina asta nu există sau nu mai există. Ce cauți găsești pe prima pagină sau pe WhatsApp.',
    home: 'La prima pagină',
    homeHref: '/ro',
    whatsapp: 'Comandă pe WhatsApp',
  },
} satisfies Record<Locale, unknown>;
