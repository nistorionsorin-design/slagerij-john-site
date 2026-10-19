// /bbq-pakketten (row 10a, 15.10) — no board: the page follows /traiteur (head on a hero frame · blocks · FAQ · byline,
// D-30). Strings: lexicon §5.24 (15.10, written before this row), one line per key in page order, swapped 1:1; §5.3 /
// §5.10 / §5.13 / §5.15 where §5.24 points to them. Left visible until FACTS.md has the value: the BBQ Colli and the
// BBQ-pakket per person [PRIJS] (owners' sheet A2 · D 2) and the byline's [DATUM]. Gourmet and fondue prices are
// products.json's (`[OWNER]` 13.10), not strings here.
// /ro/gratar = `bbqRo`, lexicon §6 „Grătar” (15.10), same keys.

export const bbqNl = {
  /** §5.24 meta (57 / 143); `title` = the part before „ | Slagerij John”, as §5.24 says — the page passes the whole */
  title: 'BBQ-pakket & gourmet bestellen, Zwevezele | Slagerij John',
  description: 'BBQ-pakketten met gemarineerd vlees, worst en mici, gourmet en fondue per persoon, barbecue aan huis met kok. Afhalen in Zwevezele of geleverd.',

  /** §5.24 head (the hero frame with id bbq-pakket, D-38) */
  eyebrow: 'BBQ & gourmet',
  h1: 'BBQ-pakketten en gourmet, klaar voor uw feest.',
  accent: 'Gemarineerd, gesneden en afgewogen.',
  lead: 'Voor de grill: gemarineerd vlees, braadworst, brochettes en mici, per kilo of als pakket. Voor aan tafel: gourmet en fondue per persoon. Af te halen in Zwevezele, of geleverd aan huis.',
  /** §5.3 primary → /wa with the §5.10 bbq message; §5.3 secondary (D-33) → the bestelbon's gourmet group */
  primary: 'Bestel via WhatsApp',
  primarySrc: 'bbq-head',
  secondary: 'Bestel online',
  secondaryHref: '/bestellen#cat-gourmet',
  /** §5.10 bbq (one message for both WhatsApp links of the page) */
  waMessage: 'Dag, ik zoek een BBQ-pakket voor [aantal] personen op [datum].',

  /** §5.24 block 1 — BBQ. `product` = the products.json item whose price the row shows (null → [PRIJS]); `price`
   *  where the row has no product; the ink row splits „offerte op aanvraag” as /traiteur does (price · unit). */
  bbq: {
    eyebrow: 'Voor de grill',
    title: 'BBQ-pakketten.',
    intro: 'Alles gemarineerd en gesneden in eigen atelier; u legt het op de grill.',
    rows: [
      {
        name: 'BBQ Colli, 5 kg',
        sub: 'kipbrochettes, braadworst, mici, gemarineerd spek, gemarineerde ribbetjes — 1 kg van elk',
        product: 'colli-bbq',
        unit: '/colli',
        link: 'Bestel de BBQ Colli',
        href: '/bestellen#cat-colli',
      },
      {
        // row 15 (lexicon §5.30, Dan 19.10 16:25): the /traiteur BBQ-pakket row — „op aanvraag” is text, no Offer
        name: 'BBQ-pakket',
        sub: 'gemarineerd, kant-en-klaar voor de grill, vanaf 10 personen',
        price: 'op aanvraag',
        unit: '',
        link: 'Vraag het via WhatsApp',
        waSrc: 'bbq-pakket',
      },
      {
        name: 'Barbecue aan huis',
        sub: 'met kok, regio Wingene, Tielt, Lichtervelde en Roeselare',
        price: 'offerte',
        unit: 'op aanvraag',
        ink: true,
        link: 'Vraag een offerte',
        href: '/traiteur#offerte',
      },
    ] as { name: string; sub: string; product?: string; price?: string; unit: string; ink?: boolean; link: string; href?: string; waSrc?: string }[],
    more: 'Liever per kilo? Gemarineerd vlees, braadworst, brochettes en mici staan in de bestelbon.',
    moreLink: 'Open de bestelbon',
    moreHref: '/bestellen',
  },

  /** §5.24 block 2 — Gourmet (photo q12 = photos.json categories[1], the home grid's „BBQ & gourmet” file). Prices from
   *  products.json (`[OWNER]` 13.10); the names are §5.24's. */
  gourmet: {
    eyebrow: 'Voor aan tafel',
    title: 'Gourmet en fondue, per persoon.',
    intro: 'Wij stellen de schotel samen op het aantal dat u opgeeft, vanaf 2 personen.',
    unit: '/pers.',
    rows: [
      { name: 'Gourmet, 9 soorten', product: 'gourmet-9' },
      { name: 'Gourmet, 10 soorten', product: 'gourmet-10' },
      { name: 'Gourmet Luxe, 10 soorten', product: 'gourmet-luxe' },
      { name: 'Fondue, 10 soorten', product: 'fondue' },
    ],
    more: 'Groenten, sauzen en brood bespreekt u bij de bestelling.',
    moreLink: 'Bestel gourmet of fondue',
    moreHref: '/bestellen#cat-gourmet',
  },

  /** §5.24 „Zo werkt het”: three numbered steps, text only */
  steps: {
    eyebrow: 'Zo werkt het',
    items: [
      { title: 'Kies en tel.', text: 'Pakket of per kilo, gourmet per persoon; geef ons het aantal.' },
      { title: 'Bestel.', text: 'Via WhatsApp of de bestelbon, liefst een dag vooraf.' },
      { title: 'Haal af of laat leveren.', text: 'In de winkel in Zwevezele, of aan huis: gratis tot 10 km vanaf €50.' },
    ],
  },

  /** §5.15 FAQ heading; the four §5.24 items in faq.json pages.bbq */
  faq: 'Wat klanten ons vragen',
  /** §5.13 with [DATUM] */
  byline: 'Door John en Georgiana, Slagerij John · bijgewerkt op [DATUM].',

  /** BreadcrumbList (§8.4): Home › BBQ & gourmet */
  crumbs: { home: 'Home', page: 'BBQ & gourmet' },
};

/** /ro/gratar — lexicon §6 „Grătar” (15.10), verbatim, keys of `bbqNl`. [PREȚ] and the byline's [DATA] stay visible
 *  until FACTS.md (owners' sheet A2 · D 2). */
export const bbqRo: typeof bbqNl = {
  title: 'Pachete BBQ și platou gourmet, Zwevezele | Măcelăria John',
  description: 'Pachete BBQ cu carne marinată, cârnați și mici, gourmet și fondue de persoană, grătar la domiciliu cu bucătar. Ridicare sau livrare. Comandă pe WhatsApp.',

  eyebrow: 'Grătar și gourmet',
  h1: 'Pachete BBQ și gourmet, gata pentru petrecerea ta.',
  accent: 'Marinat, tăiat și cântărit.',
  lead: 'Pentru grătar: carne marinată, cârnați de casă, frigărui și mici, la kilogram sau ca pachet. Pentru masă: gourmet și fondue de persoană. De ridicat din Zwevezele sau livrate acasă.',
  primary: 'Comandă pe WhatsApp',
  primarySrc: 'ro-gratar-head',
  secondary: 'Comandă online',
  secondaryHref: '/ro/comanda#cat-gourmet',
  /** §6 messages, bbq (15.10); ≥ 20 persons → „[număr] de persoane” (api/wa.js fillQuote) */
  waMessage: 'Bună, caut un pachet BBQ pentru [număr] persoane pe [data].',

  bbq: {
    eyebrow: 'Pentru grătar',
    title: 'Pachete BBQ.',
    intro: 'Totul marinat și tăiat în atelierul nostru; tu îl pui pe grătar.',
    rows: [
      {
        name: 'Colli BBQ, 5 kg',
        sub: 'frigărui de pui, cârnați, mici, piept de porc marinat, coaste marinate, câte 1 kg din fiecare',
        product: 'colli-bbq',
        unit: '/colli',
        link: 'Comandă Colli BBQ',
        href: '/ro/comanda#cat-colli',
      },
      {
        // row 15 (§5.30): the /ro/catering Pachet BBQ row — „la cerere” is text, no Offer
        name: 'Pachet BBQ',
        sub: 'marinat, gata pentru grătar, de la 10 persoane',
        price: 'la cerere',
        unit: '',
        link: 'Întreabă pe WhatsApp',
        waSrc: 'ro-gratar-pachet',
      },
      {
        name: 'Grătar la domiciliu',
        sub: 'cu bucătar, zona Wingene, Tielt, Lichtervelde și Roeselare',
        price: 'ofertă',
        unit: 'la cerere',
        ink: true,
        link: 'Cere o ofertă',
        href: '/ro/catering#oferta',
      },
    ],
    more: 'Preferi la kilogram? Carnea marinată, cârnații, frigăruile și micii sunt în bonul de comandă.',
    moreLink: 'Deschide bonul de comandă',
    moreHref: '/ro/comanda',
  },

  gourmet: {
    eyebrow: 'Pentru masă',
    title: 'Gourmet și fondue, de persoană.',
    intro: 'Platoul îl facem pe numărul pe care ni-l dai, de la 2 persoane.',
    unit: '/pers.',
    rows: [
      { name: 'Platou gourmet, 9 feluri', product: 'gourmet-9' },
      { name: 'Platou gourmet, 10 feluri', product: 'gourmet-10' },
      { name: 'Gourmet de lux, 10 feluri', product: 'gourmet-luxe' },
      { name: 'Fondue, 10 feluri', product: 'fondue' },
    ],
    more: 'Legumele, sosurile și pâinea le stabilim la comandă.',
    moreLink: 'Comandă gourmet sau fondue',
    moreHref: '/ro/comanda#cat-gourmet',
  },

  steps: {
    eyebrow: 'Așa funcționează',
    items: [
      { title: 'Alege și numără.', text: 'Pachet sau la kilogram, gourmet de persoană; spune-ne numărul.' },
      { title: 'Comandă.', text: 'Pe WhatsApp sau din bonul de comandă, de preferat cu o zi înainte.' },
      { title: 'Ridică sau primește acasă.', text: 'Din magazin, în Zwevezele, sau la domiciliu: gratuit până la 10 km de la 50 €.' },
    ],
  },

  /** §6 „Acasă” FAQ heading */
  faq: 'Ce ne întreabă clienții',
  /** §5.13 RO with [DATA] */
  byline: 'De John și Georgiana, Măcelăria John · actualizat la [DATA].',
  crumbs: { home: 'Acasă', page: 'Grătar și gourmet' },
};

export const bbqT = { nl: bbqNl, ro: bbqRo };
