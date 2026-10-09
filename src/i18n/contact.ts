// /contact (stage 8) — canvas board Contact (mobile 390) as the concept (D-30), its sections in order; desktop derived.
// Strings: lexicon §5.23 (09.10, written before this stage), one key per line in page order, swapped 1:1; §5.3 /
// §5.4 / §5.5 / §5.10 / §5.13 / §5.15 where §5.23 points to them. The hours come from hours.json (regular + `special`),
// never from this file. Left visible until FACTS.md has the value: [UREN] (B 3), [BETAALWIJZEN] (B 6), [PARKING]
// (Dan's question), [WHATSAPP-ANTWOORD] (B 5, in faq.json), [DATUM] (the byline). No contact form (§5.23).
// `ro` = lexicon §6 „Contact”, same keys: the stub /ro/contact uses its meta and head; the full RO page is stage 9.

export const contact = {
  nl: {
    /** §5.23 meta (59 / 152); `title` = the part before „ | Slagerij John”, the page passes the whole */
    title: 'Openingsuren, adres en contact in Zwevezele | Slagerij John',
    description: 'Slagerij John in Zwevezele (Wingene): zondag open van 08:00 tot 13:00, maandag vanaf 13:00. Bruggestraat 146A. Bel, stuur een WhatsApp of plan uw route.',

    /** §5.23 head (paper) */
    eyebrow: 'Contact',
    h1: 'Openingsuren en adres van Slagerij John in Zwevezele.',
    accent: 'Zondag open van 08:00 tot 13:00.',
    /** §5.3 → /wa with the §5.10 home message */
    whatsapp: 'Bestel via WhatsApp',
    waSrcHead: 'contact-head',
    waMessage: 'Dag, ik wil graag bestellen bij Slagerij John:',
    /** §5.15 */
    call: 'Bel ons',

    /** §5.23 contact rows (one card, each row a link) */
    rows: { tel: 'Telefoon', wa: 'WhatsApp', mail: 'E-mail' },
    waSrcRows: 'contact-rows',

    /** §5.23 hours card (Hours.astro: the chip, the week from hours.json, address, Route) */
    hours: 'Openingsuren',
    closed: 'gesloten',
    /** §5.15 */
    route: 'Route',
    /** §5.4 */
    hoursNote: 'Maandag open vanaf 13:00.',

    /** §5.23 special days card: once hours.json `special` has rows, every entry (its date, its hours or „gesloten”);
     *  until then (B 3) the board's four rows, each with [UREN] */
    special: {
      eyebrow: 'Feestdagen',
      days: [
        '1 en 2 november',
        '11 november',
        '24, 25 en 31 december',
        '1 januari',
      ],
      unknown: '[UREN]',
      other: 'Andere dagen: de gewone openingsuren.',
    },

    /** §5.23 map: a self-hosted picture from an OpenStreetMap export (scripts/contact-map.mjs) */
    map: {
      alt: 'Kaart: Slagerij John aan de Bruggestraat 146A in Zwevezele',
      osm: '© OpenStreetMap-bijdragers',
    },

    /** §5.23 „Afhalen en levering” = the §5.5 lines verbatim */
    pickup: {
      eyebrow: 'Afhalen en levering',
      lines: [
        'Afhalen in de winkel, op het uur dat u kiest.',
        'Gratis levering tot 10 km vanaf €50; tot 20 km vanaf €100; daarbuiten €1 per km. Levering maandag tot zaterdag vanaf 18:00.',
      ],
      pay: 'Betalen bij afhaling of bij levering: [BETAALWIJZEN]',
      parking: 'Parking: [PARKING]',
    },

    /** §5.23 FAQ eyebrow; the four „Contact” items of §5.11 in faq.json pages.contact */
    faq: 'Veelgestelde vragen',
    /** §5.13 with [DATUM] */
    byline: 'Door John en Georgiana, Slagerij John · bijgewerkt op [DATUM].',
    /** BreadcrumbList (§8.4): Home › Contact */
    crumbs: { home: 'Home', page: 'Contact' },
  },

  ro: {
    /** §6 „Contact” meta (56 / 151) */
    title: 'Program, adresă și contact în Zwevezele | Măcelăria John',
    description: 'Măcelăria John din Zwevezele (Wingene): deschis duminica 08:00-13:00, luni de la 13:00. Bruggestraat 146A. Sună, scrie pe WhatsApp sau vezi cum ajungi.',
    eyebrow: 'Contact',
    h1: 'Programul și adresa Măcelăriei John din Zwevezele.',
    accent: 'Duminica deschis 08:00-13:00.',
    whatsapp: 'Comandă pe WhatsApp',
    waSrcHead: 'contact-head',
    waMessage: 'Bună, aș vrea să comand la Măcelăria John:',
    call: 'Sună-ne',
    rows: { tel: 'Telefon', wa: 'WhatsApp', mail: 'E-mail' },
    waSrcRows: 'contact-rows',
    hours: 'Program',
    closed: 'închis',
    route: 'Cum ajungi',
    hoursNote: 'Luni deschis de la 13:00.',
    special: {
      eyebrow: 'Sărbători legale',
      days: [
        '1 și 2 noiembrie',
        '11 noiembrie',
        '24, 25 și 31 decembrie',
        '1 ianuarie',
      ],
      unknown: '[PROGRAM]',
      other: 'În celelalte zile: programul obișnuit.',
    },
    map: {
      alt: 'Hartă: Măcelăria John, Bruggestraat 146A, Zwevezele',
      osm: '© contribuitorii OpenStreetMap',
    },
    pickup: {
      eyebrow: 'Ridicare și livrare',
      lines: [
        'Ridicare din magazin, la ora pe care o alegi.',
        'Livrare gratuită până la 10 km de la 50 €; până la 20 km de la 100 €; peste, 1 € pe km. Livrăm de luni până sâmbătă, de la 18:00.',
      ],
      pay: 'Plata la ridicare sau la livrare: [PLATĂ]',
      parking: 'Parcare: [PARCARE]',
    },
    faq: 'Întrebări frecvente',
    byline: 'De John și Georgiana, Măcelăria John · actualizat la [DATA].',
    crumbs: { home: 'Acasă', page: 'Contact' },
  },
};
