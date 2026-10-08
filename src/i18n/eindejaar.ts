// /feestmenu-eindejaar (stage 7) — canvas board Eindejaar (mobile 390) as the concept (D-30), its sections in order;
// desktop derived. Strings: lexicon §5.22 (08.10, written before this stage), one line per key in page order, swapped
// 1:1; §5.3 / §5.10 / §5.13 / §5.15 / §5.19 where §5.22 points to them. Left visible until FACTS.md has the value:
// [DATUM], [UUR], [UREN], [PRIJS] (owners' sheet B 3, B 11, D 7). [DATUM] / [UUR] are swapped for menus.json's
// deadline and pickup hours once they are set (src/lib/menu.ts); the holiday rows read hours.json `special`.
// The menu rows are menus.json `eindejaar-2026` (§5.22 table) — the owners' folder replaces them wholesale (B 11).
// NL only: /ro/sarbatori is stage 9 (lexicon §6 „Sărbători”).

export const eindejaarNl = {
  /** §5.22 meta (56 / 153); `title` = the part before „ | Slagerij John”, the page passes the whole */
  title: 'Eindejaarsmenu 2026 afhalen in Zwevezele | Slagerij John',
  description: 'Eindejaarsmenu 2026 in Zwevezele: gourmet, fondue, koude schotels, hapjes, Roemeens feestvlees. Afhalen 24 en 31 december. Bestel online of via WhatsApp.',

  /** §5.22 head (dark, text only) */
  eyebrow: 'Eindejaar 2026',
  h1: 'Eindejaarsmenu 2026: afhalen in Zwevezele.',
  accent: 'Bestel vóór [DATUM].',
  lead: 'Afhalen op 24 en 31 december, van [UUR] tot [UUR]. Gourmet, fondue, koude schotels, hapjes en Roemeens feestvlees.',
  /** §5.22 buttons: primary → the bestelbon with the menu on top (D-23); secondary §5.3 → /wa with the §5.10 message.
   *  Dan's flip (§5.22): the board had WhatsApp as the primary. */
  primary: 'Bestel uit het eindejaarsmenu',
  /** + the section's fragment: shown from the first paint (CSS :target, OrderForm) — no layout shift */
  primaryHref: '/bestellen?menu=eindejaar#cat-menu-eindejaar-2026',
  whatsapp: 'Bestel via WhatsApp',
  waSrc: 'eindejaar-head',
  /** §5.10 eindejaar (on this page the message stays as written, dots included) */
  waMessage: 'Dag, ik wil bestellen uit het eindejaarsmenu: …',

  /** §5.22 three steps */
  steps: {
    eyebrow: 'Bestellen in drie stappen',
    items: [
      'Kies uit het eindejaarsmenu.',
      'Bestel vóór [DATUM], online of via WhatsApp.',
      'Haal af op 24 of 31 december, van [UUR] tot [UUR].',
    ],
  },

  /** §5.22 menu card (#feestmenu, oxblood); rows from menus.json */
  card: {
    eyebrow: 'Het eindejaarsmenu',
    title: 'Gourmet, schotels en feestvlees.',
    /** §5.19 */
    msgLabel: 'WhatsApp-bericht',
    /** the board's secondary, moved here; → #feestmenu until a folder file exists (§5.22) */
    folder: 'Bekijk de feestfolder',
    folderHref: '#feestmenu',
    deadline: 'Bestellen tot [DATUM]. Afhalen op 24 en 31 december.',
  },

  /** §5.22 „Și în română” box (lang="ro") */
  ro: {
    label: 'Și în română',
    text: 'Meniu de Crăciun și Revelion 2026. Comenzile de Crăciun le luăm până pe [DATA].',
    link: 'Vezi pagina în română →',
    href: '/ro/sarbatori',
  },

  /** §5.22 holiday hours card: four rows from hours.json `special`; no entry → [UREN], `slots: []` → gesloten */
  holiday: {
    eyebrow: 'Openingsuren eindejaar',
    days: [
      { date: '2026-12-24', label: '24 december' },
      { date: '2026-12-25', label: '25 december' },
      { date: '2026-12-31', label: '31 december' },
      { date: '2027-01-01', label: '1 januari' },
    ],
    unknown: '[UREN]',
    closed: 'gesloten',
    other: 'Andere dagen: de gewone openingsuren.',
  },

  /** §5.15 FAQ heading; the three „Eindejaar” items of §5.11 in faq.json pages.eindejaar */
  faq: 'Wat klanten ons vragen',
  /** §5.13 with [DATUM] (the board's line) */
  byline: 'Door John en Georgiana, Slagerij John · bijgewerkt op [DATUM].',

  /** BreadcrumbList (§8.4): Home › Eindejaar */
  crumbs: { home: 'Home', page: 'Eindejaar' },
};
