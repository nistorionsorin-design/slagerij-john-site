// Home body (stage 3) — the sections below the hero, canvas board Main (390) + Raster (photo loop, 1440); the
// desktop of the other sections is derived from Main (D-30). Every string's source is noted. Strings the board
// carries were placeholders until lexicon §5.15 „Home body strings” (07.10) gave them; what is still in [BRACKETS] waits
// for a fact (gate: WARN in dev, FAIL under --release). The RO home (stage 9) = `homeRo`, lexicon §6 „Acasă” (13.10),
// same keys; the home components take the locale and read `homeT[locale]`.

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
    /** the shop's Maps profile (FACTS „Google Maps profile URL”, canonical form, 07.10) — an outbound link, no request */
    href: 'https://www.google.com/maps?cid=16864215184050152248',
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

/** Romanian count form (LR-T14, lexicon §6 „Acasă” count rule): 1 → „o recenzie” · 2-19 → „{n} recenzii” · from 20 →
 *  „{n} de recenzii” (and so on per hundred: 101-119 without „de”, as the footer's §6 line does). A placeholder stays as
 *  it is, with the plural. */
export const roReviews = (count: string) => {
  if (!/^\d+$/.test(count)) return `${count} recenzii`;
  const n = Number(count);
  if (n === 1) return 'o recenzie';
  return `${n}${n % 100 >= 20 || (n % 100 === 0 && n > 0) ? ' de' : ''} recenzii`;
};

/** The RO home (stage 9) — lexicon §6 „Acasă” (13.10), verbatim, in the keys and order of `homeNl`. */
export const homeRo = {
  trust: {
    label: 'Pe ce poți conta',
    google: (rating: string, count: string) => `Google ${rating} (${roReviews(count)})`,
    items: ['Măcelar autorizat', 'Deschis duminica', 'Livrare gratuită până la 10 km', 'Partener Too Good To Go'],
  },
  ratingPh: '[NOTĂ]',
  countPh: '[NUMĂR]',

  toog: {
    eyebrow: 'Săptămâna asta pe tejghea',
    title: 'De pe tejghea, cu prețul lângă.',
    intro: 'Prețuri ca în magazin, la kilogram. Comandă pe WhatsApp sau treci pe la noi.',
    more: 'Vezi prețurile',
    moreHref: '/ro/produse',
  },

  /** the overlay's names (§6 interface strings); the RO tile has no second-language link (NL is in the sign) */
  categories: {
    label: 'Produse',
    fresh: { name: 'Carne proaspătă', sub: 'pe kg · colli', href: '/ro/produse' },
    bbq: { name: 'Grătar și gourmet', sub: 'pachete · steengrill', href: '/ro/gratar' },
    traiteur: { name: 'Catering', sub: 'petreceri · grătar la domiciliu', href: '/ro/catering', cta: 'Cere o ofertă' },
    ro: { name: 'Mici și specialități', sub: 'mici · cârnați afumați', href: '/ro/mici-si-specialitati' },
  },

  season: {
    eyebrow: 'Sărbători',
    title: 'Comandă până pe [DATA].',
    line: 'Ridicare pe 24 și 31 decembrie, între [ORA] și [ORA].',
    cta: 'Vezi meniul de sărbători',
    href: '/ro/sarbatori',
  },

  reviews: {
    count: (count: string) => roReviews(count),
    source: 'Recenziile vin direct de la Google și se actualizează zilnic.',
    link: 'Vezi toate recenziile pe Google Maps.',
    href: 'https://www.google.com/maps?cid=16864215184050152248',
    starsLabel: (rating: string) => `${rating} din 5`,
  },

  loop: {
    eyebrow: 'La noi',
    title: 'Magazinul, oamenii, meseria, grătarul și platourile.',
    hint: 'Fotografiile își schimbă încet locul; cu butonul le oprești.',
    pause: 'Oprește fotografiile',
    play: 'Pornește fotografiile',
  },

  owners: {
    eyebrow: 'Despre noi',
    name: 'John și Georgiana',
    text: 'Din 7 februarie 2025, John și Georgiana stau la tejghea în Bruggestraat 146A, în fosta brutărie.',
    alt: 'John și Georgiana · Bruggestraat 146A',
    more: 'Mai multe despre noi',
    href: '/ro/despre-noi',
  },

  hours: { title: 'Program', closed: 'Închis', route: 'Cum ajungi' },

  faq: {
    title: 'Ce ne întreabă clienții',
  },
};

export const homeT = { nl: homeNl, ro: homeRo };
