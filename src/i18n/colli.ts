// /colli-vleespakketten (row 10d, 20.10; D-43) — no board: the page follows /bbq-pakketten (hero D-40 · blocks · steps ·
// FAQ · byline, D-30). Strings: lexicon §5.28 (20.10, written before this row), one line per key in page order, swapped
// 1:1; §5.3 / §5.10 / §5.13 / §5.15 where §5.28 points to them. Facts: the six colli, contents and prices = the old site's,
// confirmed unchanged by the owners 19.10 (FACTS „Colli”); the prices themselves are products.json's, not strings here —
// the view checks that every card's name and per-kilo figure agree with products.json (a changed price fails the build
// instead of shipping a wrong „per kilo”).
// /ro/colli = `colliRo`, lexicon §6 „Colli” (20.10), same keys.

import { updatedOn, COLLI_UPDATED } from '../lib/updated';

export interface ColliCard {
  /** products.json id: the price, the bestelbon row (/bestellen?product=<id>#n-<id>) and the card's anchor */
  id: string;
  name: string;
  /** the pack's weight in kg („5 kg” on the card, `weight` in the JSON-LD, the per-kilo check) */
  kg: number;
  line: string;
  /** the contents, „1 kg” before each product (C-12), as §5.28 lists them */
  contents: string[];
  /** the per-kilo figure, muted under the price — arithmetic on the owners' price (§5.28) */
  perKg: string;
}

export const colliNl = {
  /** §5.28 meta (50 / 153); `title` = the part before „ | Slagerij John”, the page passes the whole */
  title: 'Colli vlees bestellen in Zwevezele | Slagerij John',
  description: "Zes colli's van 5 tot 10 kg, 1 kg per product: varken, kip, gemengd, BBQ en Colli John. Vaste prijs van €45 tot €100, op bestelling. Afhalen of geleverd.",

  /** §5.28 head (hero D-40, photo p16 = photos.json `colli`, its alt there) */
  eyebrow: "Colli's & vleespakketten",
  h1: 'Colli vlees bestellen: zes vaste pakketten, één prijs.',
  accent: 'Van 5 tot 10 kilo, van €45 tot €100.',
  lead: 'Een colli is een vast vleespakket: 1 kg van elk product, vijf tot tien producten, één prijs. Varken, kip, gemengd of voor de barbecue — op bestelling, af te halen in Zwevezele of geleverd aan huis.',
  /** §5.3 primary → /wa with the §5.10 colli message; §5.3 secondary (D-33) → the bestelbon's colli group */
  primary: 'Bestel via WhatsApp',
  primarySrc: 'colli-head',
  secondary: 'Bestel online',
  secondaryHref: '/bestellen#cat-colli',
  /** §5.10 colli */
  waMessage: 'Dag, ik wil graag een colli bestellen: [naam colli], afhalen op [dag/uur].',

  /** §5.28 cards: section label · the six in this order · the card's action („Bestel” → its bestelbon row, the §5.19
   *  20.10 row link) */
  cards: {
    label: "De zes colli's",
    action: 'Bestel',
    href: (id: string) => `/bestellen?product=${id}#n-${id}`,
    items: [
      {
        id: 'colli-varken-1',
        name: 'Colli Varken 1',
        kg: 5,
        line: 'Het basispakket varken.',
        contents: ['1 kg spiering', '1 kg filet kotelet', '1 kg spek', '1 kg worst', '1 kg gehakt'],
        perKg: '€9 per kilo',
      },
      {
        id: 'colli-varken-2',
        name: 'Colli Varken 2',
        kg: 6,
        line: 'Zoals Varken 1, plus 1 kg burgers.',
        contents: ['1 kg spiering', '1 kg filet kotelet', '1 kg spek', '1 kg worst', '1 kg burger', '1 kg gehakt'],
        perKg: '€9,17 per kilo',
      },
      {
        id: 'colli-kip',
        name: 'Colli Kip',
        kg: 5,
        line: 'Vijf keer kip: filet, schnitzel, gyros, brochette en boutjes.',
        contents: ['1 kg kipfilet', '1 kg kip schnitzel', '1 kg kip gyros', '1 kg kip brochette', '1 kg kippenboutjes'],
        perKg: '€10 per kilo',
      },
      {
        id: 'colli-kip-varken',
        name: 'Colli Kip-Varken',
        kg: 6,
        line: 'Kip en varken in één pakket.',
        contents: ['1 kg kipfilet', '1 kg kip schnitzel', '1 kg varkensgehakt', '1 kg filet kotelet', '1 kg spiering', '1 kg spek'],
        perKg: '€10 per kilo',
      },
      {
        id: 'colli-bbq',
        name: 'BBQ Colli',
        kg: 5,
        line: 'Alles voor de grill: brochettes, braadworst, mici, gemarineerd spek en ribbetjes.',
        contents: ['1 kg kip brochette', '1 kg braadworst', '1 kg mici', '1 kg gemarineerd spek', '1 kg gemarineerde ribbetjes'],
        perKg: '€11 per kilo',
      },
      {
        id: 'colli-john',
        name: 'Colli John',
        kg: 10,
        line: 'Het grootste pakket: tien producten, kip en varken.',
        contents: ['1 kg braadworst', '1 kg varkensgehakt', '1 kg burger', '1 kg boomstammetjes', '1 kg filet kotelet', '1 kg kip gyros', '1 kg kip brochette', '1 kg kippenboutjes', '1 kg kip schnitzel', '1 kg kipfilet'],
        perKg: '€10 per kilo',
      },
    ] as ColliCard[],
  },

  /** §5.28 the line under the cards + its two links */
  under: {
    swap: 'Een product ruilen of een ander gewicht? Vraag het via WhatsApp, dan kijken wij wat kan.',
    perKilo: { label: 'Liever per kilo? Bekijk alle prijzen van de toog', href: '/producten' },
    bbq: { label: 'BBQ-pakket per persoon', href: '/bbq-pakketten' },
  },

  /** §5.28 „Zo werkt het”: three numbered steps, text only (the §5.24 pattern) */
  steps: {
    eyebrow: 'Zo werkt het',
    items: [
      { title: 'Kies uw colli.', text: 'Zes pakketten, vaste inhoud, vaste prijs.' },
      { title: 'Bestel een dag vooraf.', text: 'Via WhatsApp of de bestelbon, vóór 12 uur voor de volgende dag.' },
      { title: 'Haal af of laat leveren.', text: 'In de winkel in Zwevezele, op het uur dat u kiest. Of aan huis, maandag tot zaterdag tussen 18 en 19.30 uur: gratis tot 10 km vanaf €50 en tot 20 km vanaf €100; daarbuiten €1 per km.' },
    ],
  },

  /** §5.15 FAQ heading; the five §5.28 items in faq.json pages.colli */
  faq: 'Wat klanten ons vragen',
  /** §5.13 with this page's date (row 10d) + §5.28's change note */
  byline: `Door John en Georgiana, Slagerij John · bijgewerkt op ${updatedOn('nl', COLLI_UPDATED)}: colli's.`,

  /** BreadcrumbList (§8.4): Home › Colli's & vleespakketten */
  crumbs: { home: 'Home', page: "Colli's & vleespakketten" },
};

/** /ro/colli — lexicon §6 „Colli” (20.10), verbatim, keys of `colliNl` */
export const colliRo: typeof colliNl = {
  title: 'Colli de carne la comandă, Zwevezele | Măcelăria John',
  description: 'Șase colli de 5 până la 10 kg, 1 kg din fiecare produs: porc, pui, mixt, BBQ și Colli John. Preț fix, de la 45 la 100 €, la comandă. Ridicare sau livrare.',

  eyebrow: 'Colli și pachete de carne',
  h1: 'Colli de carne la comandă: șase pachete fixe, un singur preț.',
  accent: 'De la 5 la 10 kilograme, de la 45 la 100 €.',
  lead: 'Un colli e un pachet fix de carne: câte 1 kg din fiecare produs, cinci până la zece produse, un singur preț. Porc, pui, mixt sau pentru grătar, la comandă, de ridicat din Zwevezele sau livrat acasă.',
  primary: 'Comandă pe WhatsApp',
  primarySrc: 'ro-colli-head',
  secondary: 'Comandă online',
  secondaryHref: '/ro/comanda#cat-colli',
  /** §5.10 RO colli */
  waMessage: 'Bună, aș vrea să comand un colli: [nume], ridicare [zi/oră].',

  cards: {
    label: 'Cele șase pachete colli',
    action: 'Comandă',
    href: (id: string) => `/ro/comanda?product=${id}#n-${id}`,
    items: [
      {
        id: 'colli-varken-1',
        name: 'Colli Porc 1',
        kg: 5,
        line: 'Pachetul de bază, porc.',
        contents: ['1 kg ceafă', '1 kg cotlet', '1 kg piept de porc', '1 kg cârnați', '1 kg carne tocată'],
        perKg: '9 € pe kilogram',
      },
      {
        id: 'colli-varken-2',
        name: 'Colli Porc 2',
        kg: 6,
        line: 'Ca Porc 1, plus 1 kg de hamburgeri.',
        contents: ['1 kg ceafă', '1 kg cotlet', '1 kg piept de porc', '1 kg cârnați', '1 kg hamburgeri', '1 kg carne tocată'],
        perKg: '9,17 € pe kilogram',
      },
      {
        id: 'colli-kip',
        name: 'Colli Pui',
        kg: 5,
        line: 'De cinci ori pui: piept, șnițel, gyros, frigărui și pulpe.',
        contents: ['1 kg piept de pui', '1 kg șnițel de pui', '1 kg gyros de pui', '1 kg frigărui de pui', '1 kg pulpe de pui'],
        perKg: '10 € pe kilogram',
      },
      {
        id: 'colli-kip-varken',
        name: 'Colli Pui și Porc',
        kg: 6,
        line: 'Pui și porc într-un singur pachet.',
        contents: ['1 kg piept de pui', '1 kg șnițel de pui', '1 kg carne tocată de porc', '1 kg cotlet', '1 kg ceafă', '1 kg piept de porc'],
        perKg: '10 € pe kilogram',
      },
      {
        id: 'colli-bbq',
        name: 'Colli BBQ',
        kg: 5,
        line: 'Tot ce trebuie pentru grătar: frigărui, cârnați, mici, piept și coaste marinate.',
        contents: ['1 kg frigărui de pui', '1 kg cârnați proaspeți', '1 kg mici', '1 kg piept de porc marinat', '1 kg coaste marinate'],
        perKg: '11 € pe kilogram',
      },
      {
        id: 'colli-john',
        name: 'Colli John',
        kg: 10,
        line: 'Cel mai mare pachet: zece produse, pui și porc.',
        contents: ['1 kg cârnați proaspeți', '1 kg carne tocată de porc', '1 kg hamburgeri', '1 kg rulouri de carne tocată (boomstammetjes)', '1 kg cotlet', '1 kg gyros de pui', '1 kg frigărui de pui', '1 kg pulpe de pui', '1 kg șnițel de pui', '1 kg piept de pui'],
        perKg: '10 € pe kilogram',
      },
    ],
  },

  under: {
    swap: 'Vrei să schimbi un produs sau alt gramaj? Întreabă-ne pe WhatsApp și vedem ce se poate.',
    perKilo: { label: 'Preferi la kilogram? Vezi toate prețurile de la tejghea', href: '/ro/produse' },
    bbq: { label: 'Pachet BBQ de persoană', href: '/ro/gratar' },
  },

  steps: {
    eyebrow: 'Așa funcționează',
    items: [
      { title: 'Alege pachetul.', text: 'Șase pachete, conținut fix, preț fix.' },
      { title: 'Comandă cu o zi înainte.', text: 'Pe WhatsApp sau din bonul de comandă, până la ora 12 pentru ziua următoare.' },
      { title: 'Ridică sau primește acasă.', text: 'Din magazin, în Zwevezele, la ora pe care o alegi. Sau la domiciliu, de luni până sâmbătă, între 18 și 19.30: gratuit până la 10 km de la 50 € și până la 20 km de la 100 €; apoi 1 € pe km.' },
    ],
  },

  /** §6 FAQ heading */
  faq: 'Ce ne întreabă clienții',
  /** §5.13 RO (nota „colli”) */
  byline: `De John și Georgiana, Măcelăria John · actualizat la ${updatedOn('ro', COLLI_UPDATED)}: colli.`,
  crumbs: { home: 'Acasă', page: 'Colli' },
};

export const colliT = { nl: colliNl, ro: colliRo };
