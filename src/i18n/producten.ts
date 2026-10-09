// /producten (stage 4) — canvas board Producten (mobile 390); desktop derived (D-30). Strings: lexicon §5.19
// „Producten & prijzen” (07.10, incl. its 16:45 addendum) unless noted. What is still in [BRACKETS] waits for a fact
// (gate: WARN in dev, FAIL under --release). NL only: /ro/produse is stage 9 (lexicon §6 „Produse”).

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
