// /traiteur (stage 6) — canvas board Traiteur (mobile 390) as the concept (D-30), its sections in order; desktop
// derived. Strings: lexicon §5.21 (08.10, written before this stage), one line per key in page order, swapped 1:1;
// §5.3 / §5.10 / §5.13 / §5.15 / §5.20 where §5.21 points to them. Left visible until FACTS.md has the value:
// [PRIJS], [OMSCHRIJVING] (owners' sheet D 1–2); the byline's date = SITE_UPDATED (row 15c).
// „met kok” is the old site's own claim (§5.21; owners' sheet D 3) — if the owners say no, §5.21 lists every line
// that changes (accent, meta, lead, tile 4, price row 5, two FAQ answers).
// /ro/catering (stage 9) = `traiteurRo`, lexicon §6 „Catering”, same keys.

import { TRAITEUR_UPDATED, updatedOn } from '../lib/updated';

export const traiteurNl = {
  /** §5.21 meta (59 / 150); `title` = the part before „ | Slagerij John”, as §5.21 says — the page passes the whole */
  title: 'Traiteur regio Wingene, Tielt, Lichtervelde | Slagerij John',
  description: 'Traiteur in de regio Wingene, Tielt en Lichtervelde: koude schotels, hapjes, buffetten, BBQ-pakketten en barbecue aan huis met kok. Vraag een offerte.',

  /** §5.21 head */
  eyebrow: 'Traiteur',
  h1: 'Traiteur in de regio Wingene, Tielt en Lichtervelde.',
  accent: 'Ook barbecue aan huis, met kok.',
  /** §5.21 lead (27.10: „traiteur aan huis” + the Belgian / Romanian styles, Georgiana WhatsApp 11:29); its last sentence
   *  „— en verder, tot 200 km” = 20.10, D-46 (owners' form `home_bbq.max_km` 200) */
  lead: 'Traiteur aan huis voor uw feest, op uw manier: Belgisch met buffet, hamburgers en barbecue ter plaatse, of Roemeens, per persoon op het bord geserveerd. Koude schotels, hapjes en buffetten, gourmet- en BBQ-pakketten, af te halen in Zwevezele of geleverd aan huis. En barbecue aan huis met kok, in de regio Wingene, Tielt, Lichtervelde en Roeselare — en verder, tot 200 km.',
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

  /** §5.21 „20.10 — the gallery” (row 19, D-45): the block's head; the ten tiles (alt · title · line) are
   *  src/data/gallery-traiteur.json, poured from docs/data/gallery-traiteur.json */
  gallery: {
    eyebrow: 'Van onze feesten',
    title: 'Zo ziet het eruit.',
    intro: "Schotels, buffetten en barbecues die wij maakten. Eigen foto's, geen stockbeelden.",
    /** the section's anchor */
    anchor: 'galerij',
  },

  /** §5.21 „30.10 — the gallery swaps + the Hapjes strip” (row 22r): the strip's head; the six tiles (alt · caption) are
   *  src/data/gallery-hapjes.json, poured from docs/data/gallery-hapjes.json */
  hapjes: {
    eyebrow: 'Hapjes',
    title: 'Per stuk, voor uw feest.',
    intro: "Scampi, lepeltjes, taco's, bulgur en bruschetta's. U kiest per stuk, wij leggen ze klaar.",
    anchor: 'hapjes',
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
      { name: 'Koude schotel', line: 'hesp, salami, eieren en vleessalade', product: 'koude-schotel' }, // row 15d, lexicon §5.22 „19.10 15:30”
      { name: 'Warm buffet', line: '', price: 'op aanvraag', unit: '' }, // row 15, lexicon §5.30 (Dan 19.10 16:25): text, no Offer
      { name: 'BBQ-pakket', line: 'gemarineerd, kant-en-klaar voor de grill, vanaf 10 personen', price: 'op aanvraag', unit: '' }, // row 15
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
    /** each field's name = its [bracket word] in `msg` (stage 9: the RO template has its own words) */
    fields: { feest: 'feest', datum: 'datum', aantal: 'aantal', plaats: 'plaats', telefoon: 'telefoon' },
    /** §5.3 */
    submit: 'Vraag een offerte',
    call: 'Bel ons',
    /** row 22g: „binnen 24 uur” now that the owners confirmed it (form section 2 `quote24` = da, 27.10; lexicon §5.19 „27.10”) */
    promise: 'U krijgt van ons binnen 24 uur een voorstel met de prijs per persoon, via WhatsApp of telefoon.',
    /** one per field (§5.21; phone = §5.20) */
    errors: {
      feest: 'Kies het soort feest.',
      datum: 'Kies een datum.',
      aantal: 'Vul het aantal personen in.',
      plaats: 'Vul de plaats in.',
      telefoon: 'Vul een telefoonnummer in.',
    },
  },

  /** §5.21 Regio: the towns as text (§2.5 = areaServed, never city pages, L-03); the closing line carries the 200 km of
   *  D-46 (20.10) — the towns and areaServed unchanged */
  region: {
    eyebrow: 'Regio',
    line: 'Traiteur en barbecue aan huis in',
    towns: ['Wingene', 'Zwevezele', 'Lichtervelde', 'Ruddervoorde', 'Tielt', 'Ardooie', 'Pittem', 'Torhout', 'Beernem', 'Roeselare'],
    closing: 'Verder weg? Tot 200 km: vraag het ons.',
  },

  /** the head's anchor of the quote form */
  anchor: 'offerte',

  /** §5.15 FAQ heading; the five „Traiteur” items of §5.11 in faq.json pages.traiteur */
  faq: 'Wat klanten ons vragen',
  /** §5.13 with SITE_UPDATED (the board's line; row 15c) */
  byline: `Door John en Georgiana, Slagerij John · bijgewerkt op ${updatedOn('nl', TRAITEUR_UPDATED)}.`,

  /** BreadcrumbList (§8.4): Home › Traiteur */
  crumbs: { home: 'Home', page: 'Traiteur' },
};

/** /ro/catering (stage 9) — lexicon §6 „Catering” (08.10), verbatim, keys of `traiteurNl`. [PREȚ] / [DESCRIERE] stay
 *  visible until FACTS.md (owners' sheet D); the byline's date = SITE_UPDATED (row 15c). */
export const traiteurRo: typeof traiteurNl = {
  title: 'Catering românesc în Flandra de Vest | Măcelăria John',
  description: 'Platouri reci și calde, aperitive, pachete BBQ, grătar la domiciliu cu bucătar, din Zwevezele: botez, nuntă, aniversare. Cere o ofertă pe WhatsApp.',

  eyebrow: 'Catering',
  h1: 'Catering românesc în Flandra de Vest.',
  accent: 'Botez, nuntă, aniversare sau un grătar cu bucătar, la tine acasă.',
  lead: 'Traiteur, cum se spune aici, adică mâncare gătită la comandă pentru petrecerea ta. O facem pentru orice preferință: în stil belgian, cu bufet, hamburgeri și grătar la fața locului, sau în stil românesc, cu farfurii individuale. Platouri reci, aperitive și bufete, pachete gourmet și BBQ cu mici și cârnați de casă, de ridicat din Zwevezele sau livrate acasă. Și grătar la domiciliu cu bucătar, în zona Wingene, Tielt, Lichtervelde și Roeselare, și mai departe, până la 200 de km.', // 27.10 (§6 Catering lead, Georgiana 11:29); „până la 200 de km” 20.10, D-46
  primary: 'Cere o ofertă',
  call: 'Sună-ne',

  tiles: {
    label: 'Ce comanzi la noi',
    items: [
      { name: 'Platouri reci', sub: 'de persoană, pe numărul tău' },
      { name: 'Pachete BBQ', sub: 'carne marinată, cârnați și mici, gata pentru grătar' },
      { name: 'Aperitive și platouri festive', sub: 'reci și calde, pentru acasă' },
      { name: 'Grătar la domiciliu, cu bucătar', sub: 'zona Wingene, Tielt, Lichtervelde și Roeselare' },
    ],
  },

  /** §6 „Catering, 20.10 — galeria” */
  gallery: {
    eyebrow: 'De la petrecerile noastre',
    title: 'Așa arată.',
    intro: 'Platouri, bufete și grătare făcute de noi. Fotografii proprii, nu de stoc.',
    anchor: 'galerie',
  },

  /** §6 „Catering, 30.10” */
  hapjes: {
    eyebrow: 'Aperitive',
    title: 'La bucată, pentru petrecerea ta.',
    intro: 'Scampi, lingurițe, taco, bulgur și bruschette. Alegi la bucată, noi le pregătim.',
    anchor: 'aperitive',
  },

  /** row 5 split as on NL: „ofertă” in the price place, „la cerere” in the unit place */
  perPerson: {
    eyebrow: 'De persoană',
    title: 'Prețuri de persoană.',
    intro: 'Platourile le facem pe numărul pe care ni-l dai; prețul e de persoană.',
    unit: '/pers.',
    rows: [
      { name: 'Platou gourmet, 9 feluri', line: 'și fondue, 10 feluri sau de lux', product: 'gourmet-9' },
      { name: 'Platou rece', line: 'șuncă, salam, ouă și salată de carne', product: 'koude-schotel' }, // row 15d
      { name: 'Bufet cald', line: '', price: 'la cerere', unit: '' }, // row 15, §5.30
      { name: 'Pachet BBQ', line: 'marinat, gata pentru grătar, de la 10 persoane', price: 'la cerere', unit: '' }, // row 15
      { name: 'Grătar la domiciliu', line: 'cu bucătar, zona Wingene', price: 'ofertă', unit: 'la cerere', ink: true },
    ],
    more: 'Tapas, aperitive, preparate calde, supe și deserturi: la bucată sau de persoană, în bonul de comandă.',
    moreLink: 'Comandă-le din bonul de comandă',
    moreHref: '/ro/comanda',
  },

  /** the §3.3 list, written for the reader */
  occasions: {
    eyebrow: 'Pentru orice petrecere',
    items: ['botez', 'nuntă', 'cumetrie', 'aniversare', 'onomastică', 'petrecere de firmă'],
  },

  quote: {
    eyebrow: 'Ofertă',
    title: 'Cere o ofertă.',
    intro: 'Cinci lucruri ne ajung: ce petrecere, când, pentru câte persoane, unde și numărul tău de telefon. Restul le discutăm.',
    feest: 'Evenimentul',
    other: 'Altceva',
    /** RO needs no article: „o ofertă pentru botez”; „Altceva” → „altceva” (§6 has no message word of its own for it) */
    msgFeest: ['botez', 'nuntă', 'cumetrie', 'aniversare', 'onomastică', 'petrecere de firmă'],
    msgOther: 'altceva',
    datum: 'Data',
    aantal: 'Număr de persoane',
    plaats: 'Localitatea',
    telefoon: 'Telefon',
    naam: 'Nume',
    required: 'Câmp obligatoriu',
    msgLabel: 'Mesaj WhatsApp',
    /** §5.10 traiteur RO, extended 08.10 (§6); „[număr] persoane” takes „de” from 20 up (src/lib/quote-core.js) */
    msg: 'Bună, vreau o ofertă pentru [eveniment] pe [data], [număr] persoane, în [localitate]. Numărul meu: [telefon].',
    fields: { feest: 'eveniment', datum: 'data', aantal: 'număr', plaats: 'localitate', telefoon: 'telefon' },
    submit: 'Cere o ofertă',
    call: 'Sună-ne',
    promise: 'Primești de la noi în 24 de ore o propunere cu prețul de persoană, pe WhatsApp sau la telefon.',
    errors: {
      feest: 'Alege tipul de eveniment.',
      datum: 'Alege data.',
      aantal: 'Scrie numărul de persoane.',
      plaats: 'Scrie localitatea.',
      telefoon: 'Scrie un număr de telefon.',
    },
  },

  region: {
    eyebrow: 'Zona',
    line: 'Traiteur și grătar la domiciliu în',
    towns: ['Wingene', 'Zwevezele', 'Lichtervelde', 'Ruddervoorde', 'Tielt', 'Ardooie', 'Pittem', 'Torhout', 'Beernem', 'Roeselare'],
    closing: 'Mai departe? Până la 200 de km: întreabă-ne.', // 20.10, D-46 (§6 Catering)
  },

  /** §6 „Catering”: the form's anchor `#oferta` */
  anchor: 'oferta',

  faq: 'Ce ne întreabă clienții',
  /** §5.13 RO with SITE_UPDATED (row 15c) */
  byline: `De John și Georgiana, Măcelăria John · actualizat la ${updatedOn('ro', TRAITEUR_UPDATED)}.`,
  crumbs: { home: 'Acasă', page: 'Catering' },
};

export const traiteurT = { nl: traiteurNl, ro: traiteurRo };
