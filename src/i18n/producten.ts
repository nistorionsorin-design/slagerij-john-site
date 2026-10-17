// /producten (stage 4) — canvas board Producten (mobile 390); desktop derived (D-30). Strings: lexicon §5.19
// „Producten & prijzen” (07.10, incl. its 16:45 addendum) unless noted. What is still in [BRACKETS] waits for a fact
// (gate: WARN in dev, FAIL under --release). /ro/produse (stage 9) = `productenRo`, lexicon §6 „Produse” + the D-33 RO
// line (13.10), same keys.

export const productenNl = {
  /** §5.19 meta (57 / 150) */
  title: 'Vers vlees en prijzen per kg in Zwevezele | Slagerij John',
  description: 'Dagvers vlees van rund, varken, kip en lam, prijzen per kg zoals aan de toog. Colli\'s, BBQ-pakketten en Roemeense specialiteiten. Bestel via WhatsApp.',

  /** §5.19 */
  eyebrow: 'Producten & prijzen',
  h1: 'Vers vlees, prijzen per kilo.',
  accent: 'Zoals aan de toog.',
  /** §5.19 lead, settled 07.10 16:55 */
  lead: "Dagvers rund, varken, kip en lam, per kilo of per stuk — en onze Roemeense specialiteiten en colli's.",
  /** §5.3 primary */
  order: 'Bestel via WhatsApp',
  /** §5.3 secondary beside it (row 8b, D-33) → the bestelbon */
  online: 'Bestel online',
  onlineHref: '/bestellen',

  /** §5.19 category pills (settled 07.10 16:55) = a filter, „Alles” selected by default; one pill per section,
   *  the label = the category name in products.json (the page renders them). The legend (screen readers only) =
   *  §5.15 nav „Producten”. */
  filter: {
    legend: 'Producten',
    all: 'Alles',
  },

  /** lexicon §5.19 „Product cards under the head” (16.10 21:40, D-37 v5; tile 4 + the line under the tiles 17.10,
   *  D-37 v6): the group's hidden H2 (C-06) + the four tiles, in the order of photos.json `producten_head.tiles` */
  tiles: {
    label: 'Van de toog',
    items: [
      { name: 'Salami met peper', sub: 'Roemeense specialiteiten' },
      { name: 'Gerookt spek', sub: 'Roemeense specialiteiten' },
      { name: 'Parizer', sub: 'Roemeense specialiteiten' },
      { name: 'Gerookte worst', sub: 'Roemeense specialiteiten' },
    ],
    line: 'Onze Roemeense specialiteiten maken we zelf: vers bereid, volgens ons eigen recept, met lokale producten.',
  },

  /** Roemeense section: eyebrow = §4 / §5.15 page name; heading = lexicon §7 GBP description
   *  „Roemeense specialiteiten: mici, gerookte worst, pastrami.”, the list part; the RO link = the RO page name of
   *  /ro/mici-si-specialitati (§6), as on the home's grid (board: „și în română →”) */
  roemeens: {
    eyebrow: 'Roemeense specialiteiten',
    title: 'Mici, gerookte worst, pastrami',
    roLabel: 'Mici și specialități',
    roHref: '/ro/mici-si-specialitati',
  },
  /** Colli section (a summary, §5.19 „Scope of this page”): heading = lexicon §7 GBP services. Its „Alle colli's en
   *  vleespakketten” link comes back with stage 10 (/colli-vleespakketten); until then the only colli link is the
   *  order block's „Bekijk de colli's” → #colli. */
  colli: {
    title: "Colli's en vleespakketten",
  },

  /** §5.19 note under the grid; the date = the owners' price-list date (FACTS) */
  note: 'Prijzen zoals aan de toog, bijgewerkt op [DATUM].',

  /** order block: title + the two buttons = §5.19 (the secondary targets #colli, §5.19 addendum); the pickup,
   *  minimum, delivery and payment lines = §5.5 verbatim (payment = D6 → [BETALING]); label above the message =
   *  §5.19 addendum; message = §5.10 home NL */
  card: {
    title: 'Bestellen? Via WhatsApp of aan de toog.',
    pickup: 'Afhalen in de winkel, op het uur dat u kiest.',
    minimum: 'Geen minimumbestelling bij afhaling.',
    delivery: 'Gratis levering tot 10 km vanaf €50; tot 20 km vanaf €100; daarbuiten €1 per km. Levering maandag tot zaterdag vanaf 18:00.',
    pay: 'Betalen bij afhaling: [BETALING]',
    msgLabel: 'WhatsApp-bericht',
    msg: 'Dag, ik wil graag bestellen bij Slagerij John:',
    cta: 'Bestel via WhatsApp',
    secondary: "Bekijk de colli's",
    secondaryHref: '#colli',
  },

  /** FAQ heading = the home's (lexicon §5.15 „Home body strings”; board: eyebrow „Veelgestelde vragen”) */
  faq: 'Wat klanten ons vragen',
  /** §5.13 byline with [DATUM] and „prijslijst” as the change (§5.19 addendum) */
  byline: 'Door John en Georgiana, Slagerij John · bijgewerkt op [DATUM]: prijslijst.',

  /** BreadcrumbList (lexicon §8.4: „Home” + the page's name) */
  crumbs: { home: 'Home', page: 'Producten & prijzen' },
};

/** /ro/produse (stage 9) — lexicon §6 „Produse” (07.10) + „D-33 on the RO pages” (13.10), verbatim, keys of `productenNl`.
 *  Where §6 has no line of its own the page takes a §6 string already in use (noted per key). */
export const productenRo = {
  /** §6 Produse meta (57 / 150) */
  title: 'Carne proaspătă, prețuri/kg în Zwevezele | Măcelăria John',
  description: 'Vită, porc, pui și miel, proaspete zilnic, prețuri la kilogram ca la tejghea. Colli, pachete BBQ, mici și specialități românești. Comandă pe WhatsApp.',

  eyebrow: 'Produse și prețuri',
  h1: 'Carne proaspătă, prețuri la kilogram.',
  accent: 'Ca la tejghea.',
  lead: 'Vită, porc, pui și miel, proaspete zilnic, la kilogram sau la bucată, plus specialitățile noastre românești și pachetele colli.',
  /** D-33 RO line: intro = Comandă pe WhatsApp + Comandă online → /ro/comanda */
  order: 'Comandă pe WhatsApp',
  online: 'Comandă online',
  onlineHref: '/ro/comanda',

  /** §6 pills „Toate · Vită · …” (the names = products.json `name.ro`); legend = §6 nav „Produse” */
  filter: {
    legend: 'Produse',
    all: 'Toate',
  },

  /** lexicon §6 „Produse — the product cards under the head” (16.10 21:40, D-37 v5; tile 4 + the line under the cards
   *  17.10, D-37 v6), same keys as the NL cards */
  tiles: {
    label: 'De la tejghea',
    items: [
      { name: 'Salam cu piper', sub: 'Specialități românești' },
      { name: 'Slănină afumată', sub: 'Specialități românești' },
      { name: 'Parizer', sub: 'Specialități românești' },
      { name: 'Cârnați afumați', sub: 'Specialități românești' },
    ],
    line: 'Specialitățile românești le facem noi, proaspăt preparate, după rețeta casei, din produse locale.',
  },

  /** no §6 heading for these two sections: they carry the §6 category name (the pill), no eyebrow, no NL link */
  roemeens: {
    eyebrow: '',
    title: 'Mici și specialități',
    roLabel: '',
    roHref: '',
  },
  colli: {
    title: 'Colli',
  },

  note: 'Prețuri ca la tejghea, actualizate la [DATA].',

  /** order block: title + primary = §6 Produse; secondary = the D-33 RO line („Comandă online” replaces „Vezi pachetele
   *  colli” → /ro/colli until that page exists); pickup / minimum / payment = §6 „Comandă”; delivery = §6 „Delivery”;
   *  label = §6 „Mesaj WhatsApp”; message = §5.10 home RO */
  card: {
    title: 'Comanzi? Pe WhatsApp sau la tejghea.',
    pickup: 'Ridicare din magazin, la ora pe care o alegi.',
    minimum: 'Fără comandă minimă la ridicare.',
    delivery: 'Livrăm gratuit până la 10 km la comenzi de la 50 € și până la 20 km de la 100 €. Peste 20 km, 1 € pe km. Luni-sâmbătă, de la 18:00.',
    pay: 'Plata la ridicare: [PLATĂ]',
    msgLabel: 'Mesaj WhatsApp',
    msg: 'Bună, aș vrea să comand la Măcelăria John:',
    cta: 'Comandă pe WhatsApp',
    secondary: 'Comandă online',
    secondaryHref: '/ro/comanda',
  },

  /** the RO FAQ heading of §6 „Acasă” / „Catering” */
  faq: 'Ce ne întreabă clienții',
  /** §5.13 RO, as /ro/contact */
  byline: 'De John și Georgiana, Măcelăria John · actualizat la [DATA].',
  /** §8.4 with the §6 home crumb „Acasă” */
  crumbs: { home: 'Acasă', page: 'Produse și prețuri' },
};

export const productenT = { nl: productenNl, ro: productenRo };
