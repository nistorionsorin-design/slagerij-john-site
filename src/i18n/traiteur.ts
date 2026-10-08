// /traiteur (stage 6) — canvas board Traiteur (mobile 390) as the concept (D-30), its sections in order; desktop
// derived. Strings: lexicon §5.21 (08.10, written before this stage), one line per key in page order, swapped 1:1;
// §5.3 / §5.10 / §5.13 / §5.15 / §5.20 where §5.21 points to them. Left visible until FACTS.md has the value:
// [PRIJS], [OMSCHRIJVING] (owners' sheet D 1–2) and the byline's [DATUM].
// „met kok” is the old site's own claim (§5.21; owners' sheet D 3) — if the owners say no, §5.21 lists every line
// that changes (accent, meta, lead, tile 4, price row 5, two FAQ answers).
// NL only: /ro/catering is stage 9 (lexicon §6 „Catering”).

export const traiteurNl = {
  /** §5.21 meta (59 / 150); `title` = the part before „ | Slagerij John”, as §5.21 says — the page passes the whole */
  title: 'Traiteur regio Wingene, Tielt, Lichtervelde | Slagerij John',
  description: 'Traiteur in de regio Wingene, Tielt en Lichtervelde: koude schotels, hapjes, buffetten, BBQ-pakketten en barbecue aan huis met kok. Vraag een offerte.',

  /** §5.21 head */
  eyebrow: 'Traiteur',
  h1: 'Traiteur in de regio Wingene, Tielt en Lichtervelde.',
  accent: 'Ook barbecue aan huis, met kok.',
  lead: 'Traiteur voor uw feest: koude schotels, hapjes en buffetten, gourmet- en BBQ-pakketten, af te halen in Zwevezele of geleverd aan huis. En barbecue aan huis met kok, in de regio Wingene, Tielt, Lichtervelde en Roeselare.',
  /** §5.3 primary (traiteur) → the form on this page; §5.3 secondary → tel: */
  primary: 'Vraag een offerte',
  call: 'Bel ons',

  /** §5.21 tiles (static, D-13); photos + alts in photos.json `traiteur` (same order) */
  tiles: {
    label: 'Wat u bij ons bestelt',
    items: [
      { name: 'Koude schotels', sub: 'per persoon, op uw aantal' },
      { name: 'BBQ-pakketten', sub: 'gemarineerd vlees, worst en mici, klaar voor de grill' },
      { name: 'Hapjes & feestschotels', sub: 'koud en warm, voor thuis' },
      { name: 'Barbecue aan huis met kok', sub: 'regio Wingene, Tielt, Lichtervelde en Roeselare' },
    ],
  },

  /** §5.21 „Per persoon” (the board's price block). `product` = the products.json item whose price the row shows
   *  (gourmet 9: the same price as the bestelbon); the others carry their [PRIJS] here until FACTS.md (D 1–2).
   *  Row 5 is the board's ink tag; its „offerte op aanvraag” is split as the board sets it: „offerte” in the price
   *  place, „op aanvraag” in the unit place. */
  perPerson: {
    eyebrow: 'Per persoon',
    title: 'Prijzen per persoon.',
    intro: 'De schotels maken wij op het aantal dat u opgeeft; de prijs is per persoon.',
    unit: '/pers.',
    rows: [
      { name: 'Gourmet, 9 soorten', line: 'ook fondue, 10 soorten en luxe', product: 'gourmet-9' },
      { name: 'Koude schotel', line: '[OMSCHRIJVING]', price: '[PRIJS]' },
      { name: 'Warm buffet', line: '[OMSCHRIJVING]', price: '[PRIJS]' },
      { name: 'BBQ-pakket', line: 'gemarineerd, kant-en-klaar voor de grill', price: '[PRIJS]' },
      { name: 'Barbecue aan huis', line: 'met kok, regio Wingene', price: 'offerte', unit: 'op aanvraag', ink: true },
    ] as { name: string; line: string; product?: string; price?: string; unit?: string; ink?: boolean }[],
    more: 'Tapas, hapjes, warme gerechten, soepen en desserts: per stuk of per persoon, in de bestelbon.',
    moreLink: 'Bestel ze via de bestelbon',
    moreHref: '/bestellen',
  },

  /** §5.21 occasions: text chips (§2.3), no links */
  occasions: {
    eyebrow: 'Voor elk feest',
    items: ['verjaardag', 'communie of lentefeest', 'babyborrel', 'bedrijfsfeest', 'trouwfeest', 'buurtfeest'],
  },

  /** §5.21 „Offerte form” (#offerte). WhatsApp only in this stage (D-31, §5.21 „Send path”). */
  quote: {
    eyebrow: 'Offerte',
    title: 'Vraag een offerte.',
    intro: 'Vijf dingen volstaan: welk feest, wanneer, voor hoeveel personen, waar, en uw telefoonnummer. De rest bespreken wij.',
    feest: 'Feest',
    /** the select = the six occasions above + this one */
    other: 'Iets anders',
    /** the feest value as the message writes it — with the article (§5.21, 08.10 15:40), one per occasion in the same
     *  order, then „Iets anders”; the select labels stay the chip words. These are the options' values, so the page
     *  script and the no-script /wa path write the same message. */
    msgFeest: ['een verjaardag', 'een communie of lentefeest', 'een babyborrel', 'een bedrijfsfeest', 'een trouwfeest', 'een buurtfeest'],
    msgOther: 'een feest',
    datum: 'Datum',
    aantal: 'Aantal personen',
    plaats: 'Plaats',
    telefoon: 'Telefoon',
    /** optional, last (§5.20 „Naam”) — not in the message: WhatsApp carries the name */
    naam: 'Naam',
    /** §5.15 */
    required: 'Verplicht veld',
    /** §5.19 */
    msgLabel: 'WhatsApp-bericht',
    /** §5.10 traiteur, extended 08.10 (§5.21): each [bracket word] is swapped for its field's value; an empty field
     *  keeps its bracket word, so the customer sees what is missing */
    msg: 'Dag, ik wil een offerte voor [feest] op [datum], [aantal] personen, in [plaats]. Mijn nummer: [telefoon].',
    /** §5.3 */
    submit: 'Vraag een offerte',
    call: 'Bel ons',
    promise: 'U krijgt van ons een voorstel met de prijs per persoon, via WhatsApp of telefoon.',
    /** one per field (§5.21; phone = §5.20) */
    errors: {
      feest: 'Kies het soort feest.',
      datum: 'Kies een datum.',
      aantal: 'Vul het aantal personen in.',
      plaats: 'Vul de plaats in.',
      telefoon: 'Vul een telefoonnummer in.',
    },
  },

  /** §5.21 Regio: the towns as text (§2.5 = areaServed, never city pages, L-03); no kilometres */
  region: {
    eyebrow: 'Regio',
    line: 'Traiteur en barbecue aan huis in',
    towns: ['Wingene', 'Zwevezele', 'Lichtervelde', 'Ruddervoorde', 'Tielt', 'Ardooie', 'Pittem', 'Torhout', 'Beernem', 'Roeselare'],
    closing: 'Verder weg? Vraag het ons.',
  },

  /** §5.15 FAQ heading; the five „Traiteur” items of §5.11 in faq.json pages.traiteur */
  faq: 'Wat klanten ons vragen',
  /** §5.13 with [DATUM] (the board's line) */
  byline: 'Door John en Georgiana, Slagerij John · bijgewerkt op [DATUM].',

  /** BreadcrumbList (§8.4): Home › Traiteur */
  crumbs: { home: 'Home', page: 'Traiteur' },
};
