// UI strings of the layout (nav, bottom bar, footer), per locale.
// Source of every string is noted. Strings not in docs/lexicon.md §5–6 are
// either page names from lexicon §4 / the canvas boards (flagged in the stage
// report) or visible placeholders in [brackets] for Cowork to replace.
import type { ChipState } from '../lib/open-state';

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

// Overlay menu (stage 0b2, design/css/header.css + board „Header · mobiel 390”): seven links,
// each with its sub-line — lexicon §5.15 (NL) and §6 (RO), 06.10 18:45, verbatim.
// „bestel vóór [DATUM]” / „comandă până pe [DATA]” stay placeholders until FACTS has the deadline.
export interface MenuItem { label: string; sub: string; href: string }
export const menu: Record<Locale, MenuItem[]> = {
  nl: [
    { label: 'Producten & prijzen', sub: "per kg · colli's", href: '/producten' },
    { label: 'BBQ & gourmet', sub: 'pakketten · steengrill', href: '/bbq-pakketten' },
    { label: 'Traiteur', sub: 'feesten · BBQ aan huis', href: '/traiteur' },
    { label: 'Eindejaar', sub: 'bestel vóór [DATUM]', href: '/feestmenu-eindejaar' },
    { label: 'Roemeense specialiteiten', sub: 'mici · gerookte worst', href: '/roemeense-specialiteiten' },
    { label: 'Over ons', sub: 'John & Georgiana', href: '/over-ons' },
    { label: 'Contact', sub: 'uren · route', href: '/contact' },
  ],
  ro: [
    { label: 'Produse și prețuri', sub: 'pe kg · colli', href: '/ro/produse' },
    { label: 'Grătar și gourmet', sub: 'pachete · steengrill', href: '/ro/gratar' },
    { label: 'Catering', sub: 'petreceri · grătar la domiciliu', href: '/ro/catering' },
    { label: 'Sărbători', sub: 'comandă până pe [DATA]', href: '/ro/sarbatori' },
    { label: 'Mici și specialități', sub: 'mici · cârnați afumați', href: '/ro/mici-si-specialitati' },
    { label: 'Despre noi', sub: 'John și Georgiana', href: '/ro/despre-noi' },
    { label: 'Contact', sub: 'program · drum', href: '/ro/contact' },
  ],
};

export const ui = {
  nl: {
    /** lexicon §5.15 */
    skip: 'Naar de inhoud',
    /** lexicon §5.15: burger label, and the label when the menu is open */
    menu: 'Menu',
    close: 'Sluiten',
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
    /** lexicon §6 interface strings (06.10) */
    skip: 'Sari la conținut',
    menu: 'Meniu',
    close: 'Închide',
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

// Open chip (stage 2, D-20 + addendum 07.10): the eight states of design/css/open-chip.css v1.1, verbatim (lexicon
// §5.15: „Open chip: the eight states in design/css/open-chip.css”; the countdown also in §5.4). Each state =
// [segment, time]: the segment (.s) names the state, the time (.t) sits on the card half — no „· ” between them,
// the two tones carry the split. RO times: a hyphen in 08:00-18:00 (LR-T03, the file's RO „still”). Day names
// lowercase (file + LR-T06). Closing-soon is the countdown („sluit over 20 min” / „închide în 20 min”).
const chipDays: Record<Locale, string[]> = {
  nl: ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
  ro: ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'],
};
export const chip: Record<Locale, { text: (s: ChipState) => [string, string] }> = {
  nl: {
    text: (s) => {
      const when = (n: { inDays: number; weekday: number; open: string } | null) =>
        n ? `opent ${n.inDays === 1 ? 'morgen' : chipDays.nl[n.weekday]} ${n.open}` : '';
      switch (s.kind) {
        case 'open': return ['Nu open', `sluit om ${s.close}`];
        case 'closing-soon': return ['Nu open', `sluit over ${s.left} min`];
        case 'special-open': return ['Nu open', `vandaag tot ${s.close} · feestdag`];
        case 'closed-today': return ['Gesloten', `opent om ${s.open}`];
        case 'closed-tomorrow':
        case 'closed-day': return ['Gesloten', when(s.next)];
        case 'special-closed': return ['Vandaag gesloten', when(s.next)];
        case 'still': return s.slots.length
          ? ['Vandaag', s.slots.map((x) => `${x.open}–${x.close}`).join(' · ')]
          : ['Vandaag gesloten', ''];
      }
    },
  },
  ro: {
    text: (s) => {
      const when = (n: { inDays: number; weekday: number; open: string } | null) =>
        n ? `deschide ${n.inDays === 1 ? 'mâine' : chipDays.ro[n.weekday]} la ${n.open}` : '';
      switch (s.kind) {
        case 'open': return ['Deschis acum', `închide la ${s.close}`];
        case 'closing-soon': return ['Deschis acum', `închide în ${s.left} min`];
        case 'special-open': return ['Deschis acum', `azi până la ${s.close} · sărbătoare`];
        case 'closed-today': return ['Închis', `deschide la ${s.open}`];
        case 'closed-tomorrow':
        case 'closed-day': return ['Închis', when(s.next)];
        case 'special-closed': return ['Azi închis', when(s.next)];
        case 'still': return s.slots.length
          ? ['Azi', s.slots.map((x) => `${x.open}-${x.close}`).join(' · ')]
          : ['Azi închis', ''];
      }
    },
  },
};

// Footer (stage 0c, boards „Footer · desktop 1440” / „Footer · mobiel 390”). Every string's source is noted.
// Column heads, e-mail row, back-to-top, legal link names and the credit: lexicon §5.15 „Footer labels” /
// „Footer credit” and §6 footer labels (added 07.10), verbatim.
export const footer = {
  nl: {
    /** lexicon §5.17 „Kom langs” block: eyebrow + closing line (the board's „Tot binnenkort in de Bruggestraat.” is not in the lexicon) */
    closeEyebrow: 'Kom langs',
    closeLine: 'Zaterdag open tot 18:00, zondag tot 13:00.',
    /** the pinned print: caption = §5.15 menu sub-line, alt = §5.17 photo caption */
    printCaption: 'John & Georgiana',
    printAlt: 'John en Georgiana · Bruggestraat 146A',
    /** §5.4 */
    closed: 'Gesloten',
    /** §5.3 bottom bar „Bel” + the number from entity.json */
    call: 'Bel',
    /** §5.15 footer labels (07.10) */
    visit: 'Bezoek ons',
    /** §5.3 */
    route: 'Route',
    /** lexicon §4 word (/contact cluster: „openingsuren”) */
    hours: 'Openingsuren',
    /** §5.15 footer labels; also the order page's name in the page list */
    order: 'Bestellen',
    orderHref: '/bestellen',
    mail: 'E-mail',
    /** §5.5, three sentences verbatim (old site's rules — owners confirm, D6) */
    orderNote: 'Afhalen in de winkel, op het uur dat u kiest. Gratis levering tot 10 km vanaf €50; tot 20 km vanaf €100; daarbuiten €1 per km. Levering maandag tot zaterdag vanaf 18:00.',
    /** §5.3 */
    orderOnline: 'Bestel online',
    pages: "Pagina's",
    follow: 'Volg ons',
    /** §5.17 „Google 5,0 · 22 beoordelingen”, the figures from reviews.json (placeholders while it is empty) */
    reviews: (rating: string, count: string) => `Google ${rating} · ${count} beoordelingen.`,
    ratingPh: '[SCORE]',
    countPh: '[AANTAL]',
    /** §5.7, first sentence */
    reviewsSource: 'Beoordelingen komen rechtstreeks van Google en worden dagelijks bijgewerkt.',
    toTop: 'Naar boven',
    /** §5.15 legal link names; NL slugs not in the lexicon yet (pages come at stage 10) */
    legal: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Algemene voorwaarden', href: '/algemene-voorwaarden' },
      { label: 'Allergenen', href: '/allergenen' },
    ],
    /** D-29 + §5.15 „Footer credit”: eyebrow + name, two strings */
    credit: { k: 'Website door', n: 'DG Advisory', href: 'https://dg-advisory.net/' },
  },
  ro: {
    /** §5.17 reading aid „Vino la noi” + §6 closing line (LR-V09) */
    closeEyebrow: 'Vino la noi',
    closeLine: 'Vino sâmbătă până la 18:00 sau duminică până la 13:00.',
    /** §6 menu sub-line; alt = §5.17 photo caption, RO aid */
    printCaption: 'John și Georgiana',
    printAlt: 'John și Georgiana · Bruggestraat 146A',
    /** §5.4 RO aid */
    closed: 'Închis',
    /** §5.3 bottom bar RO */
    call: 'Sună',
    /** §6 footer labels (07.10) */
    visit: 'Ne găsești aici',
    /** §5.3 bottom bar RO */
    route: 'Drum',
    /** lexicon §4 word (/ro/contact cluster: „program”) */
    hours: 'Program',
    /** §6 footer labels */
    order: 'Comandă',
    orderHref: '/ro/comanda',
    mail: 'E-mail',
    /** §5.5 RO aid (pickup) + §6 „Delivery” verbatim (hyphen in „Luni-sâmbătă” since 07.10, LR-T03) */
    orderNote: 'Ridicare din magazin, la ora pe care o alegi. Livrăm gratuit până la 10 km la comenzi de la 50 € și până la 20 km de la 100 €. Peste 20 km, 1 € pe km. Luni-sâmbătă, de la 18:00.',
    /** §5.3 */
    orderOnline: 'Comandă online',
    pages: 'Pagini',
    follow: 'Urmărește-ne',
    /** §6 „Google 5,0 · 22 de recenzii” („de” from 20 up) */
    reviews: (rating: string, count: string) => `Google ${rating} · ${count}${/^\d+$/.test(count) && (Number(count) % 100 >= 20 || Number(count) % 100 === 0) && Number(count) > 0 ? ' de' : ''} recenzii.`,
    ratingPh: '[SCOR]',
    countPh: '[NUMĂR]',
    /** §5.7 RO aid, first sentence */
    reviewsSource: 'Recenziile vin direct de la Google și se actualizează zilnic.',
    toTop: 'Înapoi sus',
    /** §6 legal link names with their /ro slugs (07.10) */
    legal: [
      { label: 'Confidențialitate', href: '/ro/confidentialitate' },
      { label: 'Termeni și condiții', href: '/ro/termeni' },
      { label: 'Alergeni', href: '/ro/alergeni' },
    ],
    /** D-29 + §6 credit */
    credit: { k: 'Site realizat de', n: 'DG Advisory', href: 'https://dg-advisory.net/' },
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
