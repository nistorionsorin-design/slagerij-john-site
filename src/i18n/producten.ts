// /producten (stage 4) — canvas board Producten (mobile 390); desktop derived (D-30). Strings: lexicon §5.19
// „Producten & prijzen” (07.10, incl. its 16:45 addendum) unless noted. What is still in [BRACKETS] waits for a fact
// (gate: WARN in dev, FAIL under --release). /ro/produse (stage 9) = `productenRo`, lexicon §6 „Produse” + the D-33 RO
// line (13.10), same keys.
// Row 18 (20.10, D-41 · D-42): the whole assortment — lexicon §5.19 „20.10 — the whole assortment on this page” (NL) and
// §6 „Produse, 20.10” (RO): the new lead and meta description, the sticky pill row (`pills`, replaces the stage-4 filter),
// the two part heads (`toog` · `feest`; the §5.30 note moves up into `toog.line`), the five rubrics of part 2 (`rubrics`),
// the row action and the wheel's hint (`card`), the byline's change note. Strings only from those two blocks.

import { updatedOn, ASSORTMENT_UPDATED } from '../lib/updated';

export const productenNl = {
  /** §5.19 meta: the title (57) stays; the description = §5.19 20.10 (154) */
  title: 'Vers vlees en prijzen per kg in Zwevezele | Slagerij John',
  description: "Vers vlees per kg zoals aan de toog en het hele feestaanbod met prijs: colli's, gourmet, tapas, warme gerechten en dessert. Bestel via WhatsApp of online.",

  /** §5.19 */
  eyebrow: 'Producten & prijzen',
  h1: 'Vers vlees, prijzen per kilo.',
  accent: 'Zoals aan de toog.',
  /** §5.19 20.10 lead (replaces the 07.10 lead) */
  lead: "Dagvers rund, varken, kip en lam, per kilo zoals aan de toog. En voor uw feest, met prijs: colli's, gourmet, tapas, warme gerechten en dessert.",
  /** §5.3 primary */
  order: 'Bestel via WhatsApp',
  /** §5.3 secondary beside it (row 8b, D-33) → the bestelbon */
  online: 'Bestel online',
  onlineHref: '/bestellen',

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
    line: 'Onze Roemeense specialiteiten maken we zelf: vers bereid, volgens ons eigen recept, met Belgisch vlees.',
  },

  /** §5.19 20.10 pill row: plain anchors, one per section, in page order (the stage-4 filter and „Alles” retire); the
   *  nav's accessible name = „Rubrieken” */
  pills: {
    label: 'Rubrieken',
    items: [
      { id: 'rund', label: 'Rund' },
      { id: 'varken', label: 'Varken' },
      { id: 'kip', label: 'Kip & kalkoen' },
      { id: 'lam', label: 'Lam' },
      { id: 'roemeens', label: 'Roemeense specialiteiten' },
      { id: 'colli', label: "Colli's" },
      { id: 'gourmet', label: 'Gourmet & fondue' },
      { id: 'tapas', label: 'Tapas & hapjes' },
      { id: 'warm', label: 'Warm & soepen' },
      { id: 'dessert', label: 'Dessert' },
    ],
  },

  /** §5.19 20.10 part 1 head; its line = the §5.30 note, moved up from under the grid (under the grid: nothing) */
  toog: {
    eyebrow: 'Aan de toog',
    title: 'Per kilo, zoals aan de toog.',
    line: 'De prijs per kilogram ziet u aan de toog; colli en schotels staan hier met hun prijs.',
  },
  /** §5.19 20.10 part 2 head */
  feest: {
    eyebrow: 'Feest & traiteur',
    title: 'Alles voor uw feest, met prijs.',
    line: 'Per schotel, per stuk, per persoon of per portie. Bestel online of via WhatsApp, een dag vooraf.',
  },
  /** §5.19 20.10 the five rubrics, in page order: name · note; `under` = the line under the rows, `more` = its link.
   *  Row 10d (20.10): the colli rubric's line is its link alone, „Alle colli's en vleespakketten” → /colli-vleespakketten
   *  (§5.28 link swaps; design/css/assortment.css markup contract). */
  rubrics: {
    colli: { name: "Colli's", note: '5 tot 10 kg, op bestelling', more: { label: "Alle colli's en vleespakketten", href: '/colli-vleespakketten' } },
    gourmet: {
      name: 'Gourmet & fondue',
      note: 'per persoon, vanaf 2 personen',
      under: 'BBQ-pakket per persoon en barbecue aan huis met kok: op aanvraag.',
      more: { label: 'Meer over BBQ & gourmet', href: '/bbq-pakketten' },
    },
    tapas: { name: 'Tapas & hapjes', note: 'per schotel of per stuk' },
    warm: { name: 'Warme gerechten & soepen', note: 'per portie van 200 g · soep per liter' },
    dessert: { name: "Dessert & extra's", note: 'per persoon of per stuk' },
  },
  /** §5.19 20.10 a card of part 2: the action („Bestel” → its bestelbon row) and the phone-only hint under each wheel;
   *  `count` = the rubric's count for screen readers (design/css/assortment.css markup contract: „6 producten”) */
  card: {
    action: 'Bestel',
    href: (id: string) => `/bestellen?product=${id}#n-${id}`,
    hint: 'Veeg voor meer →',
    count: (n: number) => `${n} producten`,
  },
  /** §5.19 „20.10 12:5x — the counter board” (row 18b, D-47): the Krijtbord under a per-kg category's tags — eyebrow,
   *  the pork board's organ group (its first group = the category name), the line under every board + its WhatsApp link
   *  (→ /wa?src=producten-board); the names = products.json `board` rows; the count's words = `card.count` */
  board: {
    eyebrow: 'Alles van de toog',
    organen: 'Orgaanvlees',
    foot: 'Prijs per kilo aan de toog. Tik op een naam om te bestellen.',
    wa: 'Liever via WhatsApp? Stuur ons de naam en het gewicht.',
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

  /** order block: title + the two buttons = §5.19 (row 10d, §5.28 link swaps: the secondary → /colli-vleespakketten,
   *  was #colli); the pickup, minimum, delivery and payment lines = §5.5 verbatim; label above the message = §5.19
   *  addendum; message = §5.10 home NL */
  orderCard: {
    title: 'Bestellen? Via WhatsApp of aan de toog.',
    pickup: 'Afhalen in de winkel, op het uur dat u kiest.',
    minimum: 'Geen minimumbestelling bij afhaling.',
    delivery: 'Gratis levering tot 10 km vanaf €50; tot 20 km vanaf €100; daarbuiten €1 per km. Levering maandag tot zaterdag vanaf 18:00.',
    pay: 'Betalen bij afhaling: cash, Bancontact, Payconiq, Visa of Mastercard',
    msgLabel: 'WhatsApp-bericht',
    msg: 'Dag, ik wil graag bestellen bij Slagerij John:',
    cta: 'Bestel via WhatsApp',
    secondary: "Bekijk de colli's",
    secondaryHref: '/colli-vleespakketten',
  },

  /** FAQ heading = the home's (lexicon §5.15 „Home body strings”; board: eyebrow „Veelgestelde vragen”) */
  faq: 'Wat klanten ons vragen',
  /** §5.13 byline: the date (row 15c; row 18: this page's own date while SITE_UPDATED is older) + §5.19 20.10's
   *  change note */
  byline: `Door John en Georgiana, Slagerij John · bijgewerkt op ${updatedOn('nl', ASSORTMENT_UPDATED)}: het hele assortiment.`,

  /** BreadcrumbList (lexicon §8.4: „Home” + the page's name) */
  crumbs: { home: 'Home', page: 'Producten & prijzen' },
};

/** /ro/produse (stage 9) — lexicon §6 „Produse” (07.10) + „D-33 on the RO pages” (13.10) + „Produse, 20.10” (row 18),
 *  verbatim, keys of `productenNl`. Where §6 has no line of its own the page takes a §6 string already in use (noted
 *  per key). */
export const productenRo = {
  /** §6 Produse meta: the title (57) stays; the description = §6 „Produse, 20.10” (149) */
  title: 'Carne proaspătă, prețuri/kg în Zwevezele | Măcelăria John',
  description: 'Carne la kilogram, ca la tejghea, și tot pentru petrecere, cu preț: colli, gourmet, tapas, preparate calde și desert. Comandă pe WhatsApp sau online.',

  eyebrow: 'Produse și prețuri',
  h1: 'Carne proaspătă, prețuri la kilogram.',
  accent: 'Ca la tejghea.',
  /** §6 „Produse, 20.10” lead */
  lead: 'Vită, porc, pui și miel, la kilogram, ca la tejghea. Iar pentru petrecere, cu preț: colli, gourmet, tapas, preparate calde și desert.',
  /** D-33 RO line: intro = Comandă pe WhatsApp + Comandă online → /ro/comanda */
  order: 'Comandă pe WhatsApp',
  online: 'Comandă online',
  onlineHref: '/ro/comanda',

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
    line: 'Specialitățile românești le facem noi, proaspăt preparate, după rețeta casei, din carne belgiană.',
  },

  /** §6 „Produse, 20.10” rubrici (the pills), accessible name „Rubrici” */
  pills: {
    label: 'Rubrici',
    items: [
      { id: 'rund', label: 'Vită' },
      { id: 'varken', label: 'Porc' },
      { id: 'kip', label: 'Pui și curcan' },
      { id: 'lam', label: 'Miel' },
      { id: 'roemeens', label: 'Mici și specialități' },
      { id: 'colli', label: 'Colli' },
      { id: 'gourmet', label: 'Gourmet și fondue' },
      { id: 'tapas', label: 'Tapas și aperitive' },
      { id: 'warm', label: 'Calde și supe' },
      { id: 'dessert', label: 'Desert' },
    ],
  },

  /** §6 „Produse, 20.10” partea 1 (the line = §5.30) */
  toog: {
    eyebrow: 'La tejghea',
    title: 'La kilogram, ca la tejghea.',
    line: 'Prețul pe kilogram îl vezi la tejghea; pachetele și platourile au prețul aici.',
  },
  /** §6 „Produse, 20.10” partea 2 */
  feest: {
    eyebrow: 'Petreceri și catering',
    title: 'Tot ce ai nevoie pentru petrecere, cu preț.',
    line: 'La platou, la bucată, de persoană sau la porție. Comanzi online sau pe WhatsApp, cu o zi înainte.',
  },
  /** §6 „Produse, 20.10” rubricile; row 10d: the colli rubric's „Toate pachetele colli” → /ro/colli */
  rubrics: {
    colli: { name: 'Colli', note: '5 până la 10 kg, la comandă', more: { label: 'Toate pachetele colli', href: '/ro/colli' } },
    gourmet: {
      name: 'Gourmet și fondue',
      note: 'de persoană, de la 2 persoane',
      under: 'Pachet BBQ de persoană și grătar la domiciliu cu bucătar: la cerere.',
      more: { label: 'Mai multe despre grătar și gourmet', href: '/ro/gratar' },
    },
    tapas: { name: 'Tapas și aperitive', note: 'la platou sau la bucată' },
    warm: { name: 'Preparate calde și supe', note: 'porție de 200 g · supa la litru' },
    dessert: { name: 'Desert și extra', note: 'de persoană sau la bucată' },
  },
  /** §6 „Produse, 20.10” acțiunea rândului + the wheel's hint (§5.19 / §6 „Catering, 20.10”); `count` = the
   *  screen-reader count — no §6 line of its own: „produse” (the page's own word) with the RO numeral rule (≥ 20 takes
   *  „de”), flagged in the row-18 report for Cowork */
  card: {
    action: 'Comandă',
    href: (id: string) => `/ro/comanda?product=${id}#n-${id}`,
    hint: 'Glisează pentru mai multe →',
    count: (n: number) => (n % 100 === 0 || n % 100 >= 20 ? `${n} de produse` : `${n} produse`),
  },
  /** §6 „Produse, 20.10 — tabla” (row 18b) → /wa?src=ro-produse-board */
  board: {
    eyebrow: 'Tot ce avem la tejghea',
    organen: 'Organe',
    foot: 'Prețul pe kilogram la tejghea. Apasă pe un nume ca să comanzi.',
    wa: 'Preferi WhatsApp? Trimite-ne numele și cantitatea.',
  },

  /** no §6 heading for this section: it carries the §6 category name (the pill), no eyebrow, no NL link */
  roemeens: {
    eyebrow: '',
    title: 'Mici și specialități',
    roLabel: '',
    roHref: '',
  },

  /** order block: title + primary = §6 Produse; secondary = §6 Produse „Vezi pachetele colli” → /ro/colli (row 10d,
   *  §5.28 link swaps — the D-33 stand-in „Comandă online” → /ro/comanda held the place until /ro/colli existed);
   *  pickup / minimum / payment = §6 „Comandă”; delivery = §6 „Delivery”; label = §6 „Mesaj WhatsApp”; message = §5.10
   *  home RO */
  orderCard: {
    title: 'Comanzi? Pe WhatsApp sau la tejghea.',
    pickup: 'Ridicare din magazin, la ora pe care o alegi.',
    minimum: 'Fără comandă minimă la ridicare.',
    delivery: 'Livrăm gratuit până la 10 km la comenzi de la 50 € și până la 20 km de la 100 €. Peste 20 km, 1 € pe km. Luni-sâmbătă, de la 18:00.',
    pay: 'Plata la ridicare: numerar, Bancontact, Payconiq, Visa sau Mastercard',
    msgLabel: 'Mesaj WhatsApp',
    msg: 'Bună, aș vrea să comand la Măcelăria John:',
    cta: 'Comandă pe WhatsApp',
    secondary: 'Vezi pachetele colli',
    secondaryHref: '/ro/colli',
  },

  /** the RO FAQ heading of §6 „Acasă” / „Catering” */
  faq: 'Ce ne întreabă clienții',
  /** §5.13 RO, as /ro/contact, with §6 „Produse, 20.10”'s change note */
  byline: `De John și Georgiana, Măcelăria John · actualizat la ${updatedOn('ro', ASSORTMENT_UPDATED)}: tot sortimentul.`,
  /** §8.4 with the §6 home crumb „Acasă” */
  crumbs: { home: 'Acasă', page: 'Produse și prețuri' },
};

export const productenT = { nl: productenNl, ro: productenRo };
