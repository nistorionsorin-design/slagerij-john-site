// /over-ons (row 10b, 15.10) — no board of its own in the build: the canvas board `OverOns` (06.10) is the concept, the
// page follows /traiteur and /bbq-pakketten (D-30). Strings: lexicon §5.17, one line per key in page order, with its
// 15.10 build note applied — the timeline carries the two dated facts only (the [JAAR] row and the [DATUM] · [MIJLPAAL]
// row are out), no Herkomst block, the „Kom langs” line is written from hours.json (never typed: `visit.line` takes
// Saturday's and Sunday's closing time), the photo is the owners' own site portrait (team-portrait.webp, §A) until the
// shoot, the press line KW · HLN as worded by Cowork 15.10 11:55. §5.3 / §5.10 / §5.13 / §5.15 where §5.17 points to them.
// /ro/despre-noi = `overOnsRo`, lexicon §6 „Despre noi” (shorter than the NL page, written for the reader: one quote),
// same cuts; where §6 names a block without its heading, the §5.17 reading aid is the heading (as the footer's
// „Vino la noi”, ui.ts).
// Left visible until FACTS.md has the value: the byline's [DATUM] / [DATA]; the Google figure's [SCORE] · [AANTAL] while
// reviews.json is empty (the footer's and the home's own placeholders, D-10).
import { roReviews } from './home';

/** the two press articles (URLs Dan gave in the chat 15.10), KW first — the order of the press line (Cowork 15.10 11:55) */
const KW = 'https://kw.be/nieuws/economie/bedrijven/slager-john-opent-de-deuren-in-zwevezele-eigenlijk-heet-ik-ion-maar-iedereen-noemt-me-john/';
const HLN = 'https://www.hln.be/wingene/slager-john-in-zwevezele-viert-eerste-verjaardag-met-feestelijke-opendeurdag-op-1-februari~ad165ed3/';

export const overOnsNl = {
  /** §5.17 meta (55 / 145) */
  title: 'Over ons – John en Georgiana, Zwevezele | Slagerij John',
  description: 'John en Georgiana, sinds februari 2025 slager en traiteur in de vroegere bakkerij van Zwevezele. Vlaamse klassiekers en Roemeense specialiteiten.',

  /** §5.17 head */
  eyebrow: 'Over ons',
  h1: 'De slagerij van John en Georgiana.',
  accent: 'In de Bruggestraat, sinds februari 2025.',
  lead: 'Slagerij John is een familieslagerij in Zwevezele (Wingene). Sinds 7 februari 2025 staan John en Georgiana achter de toog in de Bruggestraat 146A, in de vroegere bakkerij. Vlaamse klassiekers en Roemeense specialiteiten, dagvers en in eigen atelier bereid.',
  /** §5.17 photo caption; the alt is the caption, as the footer's pinned print (ui.ts footer.printAlt) */
  caption: 'John en Georgiana · Bruggestraat 146A',
  alt: 'John en Georgiana · Bruggestraat 146A',

  /** §5.17 quotes: John's, then both (the old site's own words, trimmed as §5.17 says) */
  quotes: [
    { text: '„Het is een stiel die je met liefde moet doen, of niet moet doen.”', by: 'John' },
    { text: '„We zijn trots dat we onze eigen zaak hier mogen openen, voor onze buren.”', by: 'John en Georgiana' },
  ],

  /** §5.17 timeline — the 15.10 build note: the two dated facts only (FACTS: company register · opened) */
  timeline: {
    eyebrow: 'Sinds wanneer',
    items: [
      { date: '2024-08-20', when: '20 augustus 2024', what: 'Slager John SComm wordt opgericht' },
      { date: '2025-02-07', when: '7 februari 2025', what: 'De winkel opent in de vroegere bakkerij, Bruggestraat 146A' },
    ],
  },

  /** §5.17 „Wat we maken” — three lines, their own list */
  make: {
    eyebrow: 'Wat we maken',
    lines: [
      'Vlaamse klassiekers: huisgemaakt stoofvlees, vol-au-vent, vers gehakt van de dag.',
      'Roemeense specialiteiten: mici, cârnați de casă, afumături.',
      'Alles bereiden we in ons eigen atelier.',
    ],
  },

  /** §5.17 „Erkenning” — the §5.6 items + the press line. The Google figure from reviews.json (placeholders while it is
   *  empty); `google` = §5.17's „Google 5,0 · 22 beoordelingen”. Press (Cowork 15.10 11:55): „In de krant: KW bij de
   *  opening, HLN bij de eerste verjaardag.” — the names are the two links (no logos), each followed by its note; the
   *  view joins them as „{lead} {name} {note}, {name} {note}.” KW = the opening article, HLN = the first-anniversary
   *  open day of 1 February (the referrer parameter dropped). */
  trust: {
    eyebrow: 'Waar u op kunt rekenen',
    google: (rating: string, count: string) => `Google ${rating} · ${count} beoordelingen`,
    items: ['Erkend beenhouwer-spekslager', 'Too Good To Go-partner'],
    press: {
      lead: 'In de krant:',
      items: [
        { name: 'KW', href: KW, note: 'bij de opening' },
        { name: 'HLN', href: HLN, note: 'bij de eerste verjaardag' },
      ],
    },
  },
  ratingPh: '[SCORE]',
  countPh: '[AANTAL]',

  /** §5.17 „Kom langs”: the hours card (Hours.astro) + Bestel via WhatsApp + Route (the card's own button). The line
   *  is §5.17's sentence with its two times taken from hours.json. */
  visit: {
    eyebrow: 'Kom langs',
    line: (sat: string, sun: string) => `Zaterdag open tot ${sat}, zondag tot ${sun}.`,
    hours: 'Openingsuren',
    closed: 'Gesloten',
    route: 'Route',
  },
  /** §5.3 primary → /wa?src={page}-{position} (§5.10 tracking, §9 „traiteur-cta”) with the §5.10 home message */
  primary: 'Bestel via WhatsApp',
  primarySrc: 'overons-cta',
  waMessage: 'Dag, ik wil graag bestellen bij Slagerij John:',

  /** §5.13 with [DATUM] */
  byline: 'Door John en Georgiana, Slagerij John · bijgewerkt op [DATUM].',
  /** BreadcrumbList (§8.4): Home › Over ons */
  crumbs: { home: 'Home', page: 'Over ons' },
};

/** /ro/despre-noi — lexicon §6 „Despre noi”, verbatim, keys of `overOnsNl`. The RO page carries one quote (John's). */
export const overOnsRo: typeof overOnsNl = {
  /** §6 meta (58 / 141) */
  title: 'Despre noi – John și Georgiana, Zwevezele | Măcelăria John',
  description: 'John și Georgiana, din februarie 2025 măcelari în fosta brutărie din Zwevezele. Clasice flamande și specialități românești. Deschis duminica.',

  eyebrow: 'Despre noi',
  h1: 'Măcelăria lui John și a Georgianei.',
  accent: 'În Bruggestraat, din februarie 2025.',
  /** §6: „the §6 lead above” (Suntem John și Georgiana …) + its own closing sentence */
  lead: 'Suntem John și Georgiana. Din februarie 2025 avem măcelăria în Bruggestraat 146A, în fosta brutărie din Zwevezele. Clasice flamande și specialități românești, proaspete zilnic, din atelierul nostru.',
  /** §5.17 caption, RO aid (= ui.ts footer.printAlt RO) */
  caption: 'John și Georgiana · Bruggestraat 146A',
  alt: 'John și Georgiana · Bruggestraat 146A',

  quotes: [{ text: '„E o meserie pe care o faci cu drag, sau nu o faci deloc.”', by: 'John' }],

  timeline: {
    /** §5.17 reading aid */
    eyebrow: 'De când',
    items: [
      { date: '2024-08-20', when: '20 august 2024', what: 'înființăm Slager John SComm' },
      { date: '2025-02-07', when: '7 februarie 2025', what: 'deschidem magazinul în fosta brutărie, Bruggestraat 146A' },
    ],
  },

  make: {
    eyebrow: 'Ce facem',
    lines: [
      'Clasice flamande: stoofvlees (tocăniță flamandă) de casă, vol-au-vent, carne tocată proaspătă.',
      'Românești: mici, cârnați de casă, afumături.',
      'Totul pregătim în atelierul nostru.',
    ],
  },

  trust: {
    eyebrow: 'Pe ce poți conta',
    google: (rating: string, count: string) => `Google ${rating} · ${roReviews(count)}`,
    items: ['Măcelar autorizat', 'Partener Too Good To Go'],
    /** Cowork 15.10 11:55: „În presă: KW la deschidere, HLN la prima aniversare.” */
    press: {
      lead: 'În presă:',
      items: [
        { name: 'KW', href: KW, note: 'la deschidere' },
        { name: 'HLN', href: HLN, note: 'la prima aniversare' },
      ],
    },
  },
  ratingPh: '[NOTĂ]',
  countPh: '[NUMĂR]',

  visit: {
    /** §5.17 reading aid (= ui.ts footer.closeEyebrow RO) */
    eyebrow: 'Vino la noi',
    /** §6 closing line (LR-V09) with its two times from hours.json */
    line: (sat: string, sun: string) => `Vino sâmbătă până la ${sat} sau duminică până la ${sun}.`,
    hours: 'Program',
    closed: 'Închis',
    /** §6 „Cum ajungi” (§5.3) */
    route: 'Cum ajungi',
  },
  primary: 'Comandă pe WhatsApp',
  primarySrc: 'ro-despre-noi-cta',
  /** §5.10 home RO */
  waMessage: 'Bună, aș vrea să comand la Măcelăria John:',

  /** §5.13 RO with [DATA] */
  byline: 'De John și Georgiana, Măcelăria John · actualizat la [DATA].',
  crumbs: { home: 'Acasă', page: 'Despre noi' },
};

export const overOnsT = { nl: overOnsNl, ro: overOnsRo };
