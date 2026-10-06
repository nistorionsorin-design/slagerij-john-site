// UI strings of the layout (nav, bottom bar, footer), per locale.
// Source of every string is noted. Strings not in docs/lexicon.md §5–6 are
// either page names from lexicon §4 / the canvas boards (flagged in the stage
// report) or visible placeholders in [brackets] for Cowork to replace.
export type Locale = 'nl' | 'ro';

export interface NavItem {
  label: string;
  href: string;
  /** Eindejaar / Sărbători reads in oxblood on the canvas Desktop board. */
  seasonal?: boolean;
}

export const home: Record<Locale, string> = { nl: '/', ro: '/ro' };

// Page names: lexicon §4 (the cluster → page map) and the canvas Desktop board.
// "BBQ & gourmet" is the category name settled in D-13.
export const nav: Record<Locale, NavItem[]> = {
  nl: [
    { label: 'Producten', href: '/producten' },
    { label: 'BBQ & gourmet', href: '/bbq-pakketten' },
    { label: 'Traiteur', href: '/traiteur' },
    { label: 'Eindejaar', href: '/feestmenu-eindejaar', seasonal: true },
    { label: 'Contact', href: '/contact' },
  ],
  ro: [
    { label: 'Produse', href: '/ro/produse' },
    { label: 'Grătar', href: '/ro/gratar' },
    { label: 'Catering', href: '/ro/catering' },
    { label: 'Sărbători', href: '/ro/sarbatori', seasonal: true },
    { label: 'Contact', href: '/ro/contact' },
  ],
};

export const ui = {
  nl: {
    /** lexicon §5.15 */
    skip: 'Naar de inhoud',
    /** canvas Main / Contact boards: aria-label of the burger */
    menu: 'Menu',
    /** scaffold label of the language switch, kept */
    lang: 'Taal / Limbă',
    /** canvas Desktop board, place line under the wordmark */
    place: 'Zwevezele · Wingene',
    /** lexicon §5.3 primary CTA */
    order: 'Bestel via WhatsApp',
    /** lexicon §5.3 bottom bar */
    bar: { tel: 'Bel', wa: 'WhatsApp', route: 'Route', label: 'Bel · WhatsApp · Route' },
    /** canvas footer */
    footer: { nl: 'Nederlands', ro: 'Română' },
  },
  ro: {
    skip: '[SKIP]',
    menu: 'Menu',
    lang: 'Taal / Limbă',
    place: 'Zwevezele · Wingene',
    /** lexicon §5.3 */
    order: 'Comandă pe WhatsApp',
    /** lexicon §5.3 */
    bar: { tel: 'Sună', wa: 'WhatsApp', route: 'Drum', label: 'Sună · WhatsApp · Drum' },
    footer: { nl: 'Nederlands', ro: 'Română' },
  },
} satisfies Record<Locale, unknown>;

// Hero (stage 1). title + accent = lexicon §5.1 option 1 (NL) / §6 option 1 (RO), split
// at the sentence break as on the canvas; sub = the §1 one-liner (§5.2) verbatim;
// CTAs = §5.3; pause / play labels = §5.15; stamp = §5.16 (both added 06.10 for stage 1).
export const hero = {
  nl: {
    title: 'Slagerij & traiteur in Zwevezele.',
    accent: 'Ook open op zondag.',
    sub: 'Slagerij John is een ambachtelijke slagerij en traiteur in Zwevezele (Wingene), met dagvers vlees, huisbereide gerechten, BBQ- en feestschotels en Roemeense specialiteiten zoals mici en gerookte worst. Open op zondag.',
    primary: 'Bestel via WhatsApp',
    secondary: 'Bekijk de prijzen',
    secondaryHref: '/producten',
    pause: "Pauzeer de foto's",
    /** lexicon §5.15: the label when the photos are paused */
    play: "Speel de foto's af",
    /** lexicon §5.16 */
    stamp: 'Vlaamse klassiekers · Roemeense smaak · sinds 2025',
  },
  ro: {
    title: 'Măcelărie și magazin românesc în Zwevezele.',
    accent: 'Deschis și duminica.',
    sub: 'Măcelăria John este măcelărie și magazin românesc în Zwevezele, lângă Tielt, Roeselare și Brugge: carne proaspătă zilnic, mici și cârnați de casă, afumături, platouri pentru grătar și petreceri. Deschis și duminica.',
    primary: 'Comandă pe WhatsApp',
    secondary: 'Vezi prețurile',
    secondaryHref: '/ro/produse',
    /** §5.15 gives only a reading aid for RO; the RO surface strings come with stage 9 */
    pause: '[PAUZĂ]',
    play: '[PORNEȘTE]',
    /** lexicon §5.16, RO surface */
    stamp: 'Clasice flamande · Gust românesc · Din 2025',
  },
} satisfies Record<Locale, unknown>;

/** WhatsApp always goes through the /wa redirect (lexicon §5.10, §9), never a raw wa.me link. */
export const wa = (src: string) => `/wa?src=${encodeURIComponent(src)}`;

/** Route link to the Maps pin (FACTS: 51.0410, 3.2185). An outbound link, not a request. */
export const routeHref = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Display form of the VAT number as the footer shows it: BE 1012.585.374 */
export const vatDisplay = (vatID: string) =>
  vatID.replace(/^BE\s?(\d{4})(\d{3})(\d{3})$/, 'BE $1.$2.$3');
