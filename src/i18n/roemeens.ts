// /roemeense-specialiteiten (row 10b, 15.10) — no board: head on hero frame 1 (the mici on the grill) · three product
// blocks · the Romanian tapas · the towns line · FAQ · byline (D-30). Strings: lexicon §5.25 (15.10, written before
// this row), one line per key in page order, swapped 1:1; §5.3 / §5.10 / §5.13 / §5.15 where §5.25 points to them.
// Product names come from products.json `roemeens` (§5.25: „the NL names of products.json”); prices too (null →
// [PRIJS] / [PREȚ] until the owners' sheet A2) and the tapas €45 (`tapas-ro`, `[OWNER]` 13.10).
// /ro/mici-si-specialitati = `roemeensRo`, lexicon §6 „Mici și specialități” (15.10), same keys, written for the
// Romanian reader (no explanation of what mici are).
// Left visible until FACTS.md has the value: the three per-kg prices and the byline's [DATUM] / [DATA]; the FAQ's
// [PRIJS] · [AANTAL] / [PREȚ] · [NUMĂR] live in faq.json.

export const roemeensNl = {
  /** §5.25 meta (59 / 152) */
  title: 'Roemeense slagerij in West-Vlaanderen: mici | Slagerij John',
  description: 'Mici, gerookte worst en pastrami uit eigen atelier, dagvers in Zwevezele bij Wingene. Roemeense specialiteiten naast de Vlaamse klassiekers, per kilo.',

  /** §5.25 head (hero frame 1, photos.json hero[0], alt §5.14) */
  eyebrow: 'Roemeense specialiteiten',
  h1: 'Mici, gerookte worst en pastrami, uit eigen atelier.',
  accent: 'Roemeens van smaak, Zwevezeels van adres.',
  lead: 'John en Georgiana brengen de slagerij van thuis mee naar de Bruggestraat: mici voor op de barbecue, gerookte worst en pastrami, naast stoofvlees, vol-au-vent en vers gehakt. Alles bereid in eigen atelier, per kilo aan de toog of op bestelling.',
  /** §5.3 primary → /wa with the §5.10 / §5.25 mici message; §5.25 secondary → the /producten mici section */
  primary: 'Bestel via WhatsApp',
  primarySrc: 'roemeens-head',
  waMessage: 'Dag, ik wil graag [aantal] kg mici bestellen voor [datum].',
  secondary: 'Bekijk de prijzen',
  secondaryHref: '/producten#roemeens',

  /** §5.25 products: three blocks, each = (name from products.json) · explaining line · cooking line · price + unit */
  products: {
    label: 'Wat wij maken',
    items: [
      {
        product: 'mici',
        line: 'Gekruide gehaktrolletjes van rund en varken, zonder vel — het Roemeense barbecuegerecht bij uitstek.',
        cook: 'Acht minuten op een hete grill, één keer draaien; ook in de pan.',
      },
      {
        product: 'gerookte-worst',
        line: 'Varkensworst, gekruid en gerookt in eigen atelier.',
        cook: 'Koud bij de borrel, of warm uit de pan of de oven.',
      },
      {
        product: 'pastrami',
        line: 'Gezouten en gekruid vlees, gerookt en gegaard; dun gesneden voor op de boterham.',
        cook: 'Klaar om te eten.',
      },
    ],
    more: 'Ook Vlaamse klassiekers: stoofvlees, vol-au-vent, vers gehakt van de dag.',
    moreLink: 'Alle producten en prijzen',
    moreHref: '/producten',
  },

  /** §5.25 Roemeense tapas (products.json `tapas-ro`, €45 /stuk; photo q05 = product-photos.json `tapas-ro`) */
  tapas: {
    eyebrow: 'Voor het feest',
    title: 'Roemeense tapas, voor 5 tot 6 personen.',
    line: 'Een schotel met onze eigen charcuterie en specialiteiten, klaar om op tafel te zetten.',
    link: 'Bestel de Roemeense tapas',
    href: '/bestellen#cat-tapas',
  },

  /** §5.25 regio line */
  region: {
    eyebrow: 'Ook voor',
    text: 'Klanten uit Beernem, Tielt, Lichtervelde, Roeselare en Brugge komen voor onze mici naar Zwevezele; levering aan huis vanaf €50.',
  },

  /** §5.15 FAQ heading; the four §5.25 items in faq.json pages.roemeens */
  faq: 'Wat klanten ons vragen',
  /** §5.13 with [DATUM] */
  byline: 'Door John en Georgiana, Slagerij John · bijgewerkt op [DATUM].',
  /** BreadcrumbList (§8.4): Home › Roemeense specialiteiten */
  crumbs: { home: 'Home', page: 'Roemeense specialiteiten' },
};

/** /ro/mici-si-specialitati — lexicon §6 „Mici și specialități” (15.10), verbatim, keys of `roemeensNl`. */
export const roemeensRo: typeof roemeensNl = {
  /** §6 meta (53 / 155) */
  title: 'Mici de casă și afumături, Zwevezele | Măcelăria John',
  description: 'Mici de casă, cârnați afumați și pastramă din atelierul propriu, proaspete zilnic, lângă Tielt, Roeselare și Brugge. Deschis duminica. Comandă pe WhatsApp.',

  eyebrow: 'Specialități românești',
  h1: 'Mici de casă, cârnați afumați și pastramă.',
  accent: 'Ca acasă, lângă Tielt și Roeselare.',
  lead: 'John și Georgiana fac micii, cârnații și afumăturile în atelierul propriu, în Zwevezele: proaspete zilnic, la kilogram la tejghea sau la comandă. Alături, carne proaspătă de vită, porc, pui și miel și clasicele belgiene. Deschis și duminica.',
  primary: 'Comandă pe WhatsApp',
  primarySrc: 'ro-mici-head',
  waMessage: 'Bună, aș vrea să comand [număr] kg de mici pentru [data].',
  secondary: 'Vezi prețurile',
  secondaryHref: '/ro/produse#roemeens',

  products: {
    label: 'Ce facem',
    items: [
      { product: 'mici', line: 'de vită și porc, condimentați în casă, fără membrană', cook: 'Opt minute pe grătar încins, întorși o singură dată.' },
      { product: 'gerookte-worst', line: 'de porc, condimentați și afumați în atelierul propriu', cook: 'Reci, la o gustare, sau calzi, din tigaie ori din cuptor.' },
      { product: 'pastrami', line: 'sărată, condimentată, afumată și gătită; feliată subțire', cook: 'Gata de mâncat.' },
    ],
    more: 'Și clasice belgiene: tocăniță flamandă, vol-au-vent, carne tocată proaspătă zilnic.',
    moreLink: 'Toate produsele și prețurile',
    moreHref: '/ro/produse',
  },

  tapas: {
    eyebrow: 'Pentru petrecere',
    title: 'Tapas românești, pentru 5 până la 6 persoane.',
    line: 'Un platou cu mezelurile și specialitățile noastre, gata de pus pe masă: botez, aniversare, o seară cu prietenii.',
    link: 'Comandă tapasul românesc',
    href: '/ro/comanda#cat-tapas',
  },

  region: {
    eyebrow: 'Și pentru',
    text: 'Vin la noi români din Beernem, Tielt, Lichtervelde, Roeselare și Brugge; livrare la domiciliu de la 50 €.',
  },

  /** §6 „Acasă” FAQ heading */
  faq: 'Ce ne întreabă clienții',
  /** §5.13 RO with [DATA] */
  byline: 'De John și Georgiana, Măcelăria John · actualizat la [DATA].',
  crumbs: { home: 'Acasă', page: 'Specialități românești' },
};

export const roemeensT = { nl: roemeensNl, ro: roemeensRo };
