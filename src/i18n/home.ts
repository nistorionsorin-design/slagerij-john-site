// Home body (stage 3) — the sections below the hero, canvas board Main (390) + Raster (photo loop, 1440); the
// desktop of the other sections is derived from Main (D-30). Every string's source is noted. Strings the board
// carries were placeholders until lexicon §5.15 „Home body strings” (07.10) gave them; what is still in [BRACKETS] waits
// for a fact (gate: WARN in dev, FAIL under --release). NL only: the RO home is stage 9 (lexicon §6).

export const homeNl = {
  /** lexicon §5.6 trust strip, the five items verbatim. The Google figure comes from reviews.json (D-10);
   *  the „★” of the lexicon line is the star icon in front of it. */
  trust: {
    label: 'Waar u op kunt rekenen', // lexicon §5.17 eyebrow „Erkenning” (aria-label of the list only)
    google: (rating: string, count: string) => `Google ${rating} (${count} beoordelingen)`,
    items: ['Erkend beenhouwer-spekslager', 'Open op zondag', 'Gratis levering tot 10 km', 'Too Good To Go-partner'],
  },
  /** placeholders while reviews.json is empty — the footer's own (ui.ts footer.ratingPh / countPh) */
  ratingPh: '[SCORE]',
  countPh: '[AANTAL]',

  toog: {
    /** lexicon §5.15 „Home body strings” (07.10), verbatim */
    eyebrow: 'Deze week op de toog',
    title: 'Van de toog, met de prijs erbij.',
    intro: 'Prijzen zoals in de winkel, per kilo. Bestel via WhatsApp of kom langs.',
    /** lexicon §5.3 secondary CTA (board: „Alle prijzen per kg →”) */
    more: 'Bekijk de prijzen',
    moreHref: '/producten',
  },

  /** category grid (D-13: Vers vlees · BBQ & gourmet · Traiteur · Roemeense specialiteiten). Names: D-13 and the
   *  overlay menu (lexicon §5.15); sub-lines = the menu's sub-lines (§5.15). Traiteur CTA = §5.3. The RO link on the
   *  Roemeense tile = the RO page name of /ro/mici-si-specialitati (lexicon §6; board: „și în română →”). */
  categories: {
    label: 'Producten', // lexicon §5.15 nav (aria-label of the grid, no visible heading on the board)
    fresh: { name: 'Vers vlees', sub: "per kg · colli's", href: '/producten' },
    bbq: { name: 'BBQ & gourmet', sub: 'pakketten · steengrill', href: '/bbq-pakketten' },
    traiteur: { name: 'Traiteur', sub: 'feesten · BBQ aan huis', href: '/traiteur', cta: 'Vraag een offerte' },
    ro: {
      name: 'Roemeense specialiteiten',
      sub: 'mici · gerookte worst',
      href: '/roemeense-specialiteiten',
      roLabel: 'Mici și specialități',
      roHref: '/ro/mici-si-specialitati',
    },
  },

  /** Eindejaar block: eyebrow = §5.15 nav „Eindejaar”; title = the §5.15 menu sub-line „bestel vóór [DATUM]” as a
   *  sentence (the Toog board's „Bestel vóór [DATUM].”); line = the second half of the §5.11 answer „Tot wanneer
   *  kan ik bestellen voor Kerstmis?”; button = §5.3 „Bekijk de feestfolder” (board: „Bekijk het menu”). */
  season: {
    eyebrow: 'Eindejaar',
    title: 'Bestel vóór [DATUM].',
    line: 'Afhalen 24 en 31 december van [UUR] tot [UUR].',
    cta: 'Bekijk de feestfolder',
    href: '/feestmenu-eindejaar',
  },

  /** reviews (D-10, U-14): figure + count from reviews.json; source line = lexicon §5.7, both sentences verbatim,
   *  the second one is the link. Count line = §5.6 „(22 beoordelingen)”. */
  reviews: {
    count: (count: string) => `${count} beoordelingen`,
    source: 'Beoordelingen komen rechtstreeks van Google en worden dagelijks bijgewerkt.',
    link: 'Bekijk alle beoordelingen op Google Maps.',
    /** a Maps search for the shop until the GBP review link (place id) is in FACTS.md — an outbound link, no request */
    href: 'https://www.google.com/maps/search/?api=1&query=Slagerij%20John%2C%20Bruggestraat%20146A%2C%208750%20Zwevezele',
    starsLabel: (rating: string) => `${rating} van 5`,
  },

  /** photo loop „Bij ons” (D-11, boards Main + Raster) */
  loop: {
    /** lexicon §5.15 „Home body strings” (07.10), verbatim */
    eyebrow: 'Bij ons',
    title: 'De winkel, de mensen, het vak, de barbecue en de schotels.',
    hint: "De foto's wisselen langzaam van plaats; met de knop zet u ze stil.",
    /** lexicon §5.15 (the hero's pause / play labels) */
    pause: "Pauzeer de foto's",
    play: "Speel de foto's af",
  },

  /** owners (board: „Ons verhaal · John & Georgiana · Sinds februari 2025 in de vroegere bakkerij …”):
   *  eyebrow = lexicon §5.17 „Over ons”; name = §5.15 menu sub-line; text = §5.17 lead, second sentence verbatim
   *  (facts: opened 7 February 2025 in the former bakery — FACTS „Opened”). */
  owners: {
    eyebrow: 'Over ons',
    name: 'John & Georgiana',
    text: 'Sinds 7 februari 2025 staan John en Georgiana achter de toog in de Bruggestraat 146A, in de vroegere bakkerij.',
    alt: 'John en Georgiana · Bruggestraat 146A', // §5.17 photo caption (the footer's print alt)
    /** lexicon §5.15 „Home body strings” (07.10) */
    more: 'Meer over ons',
    href: '/over-ons',
  },

  /** hours card (board Main): heading = the lexicon §4 word the footer uses (ui.ts footer.hours); Route = §5.3 */
  hours: { title: 'Openingsuren', closed: 'Gesloten', route: 'Route' },

  /** FAQ (lexicon §5.11 via faq.json); heading = lexicon §5.15 „Home body strings” (07.10) */
  faq: {
    title: 'Wat klanten ons vragen',
  },
};
