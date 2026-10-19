// /recepten (row 17) — lexicon §5.29 (19.10, RO-linted), verbatim; the recipes themselves are src/data/recipes.json
// (poured from docs/data/recipes.json, which wins over the §5.29 table for photos, focal points and alts).
// One change to §5.29: the count. §5.29 was written for 15 recipes; spiering was dropped 19.10 14:06, 14 ship, so the
// meta description and the lead say „Veertien” / „Paisprezece” where §5.29 says „Vijftien” / „Cincisprezece”
// (flagged in STATE.md for Cowork to confirm in the lexicon).
// /ro/retete = `receptenRo`, same keys.

export const receptenNl = {
  /** §5.29 meta (49 / 151) */
  title: 'Recepten: stoverij, mici en meer | Slagerij John',
  description: 'Veertien korte recepten met vlees van Slagerij John in Zwevezele: Vlaamse klassiekers en Roemeense smaak, elk in vier stappen, met tijd en temperatuur.',

  /** §5.29 head */
  eyebrow: 'Recepten',
  h1: 'Recepten van de slager.',
  accent: 'Vlaamse klassiekers, Roemeense smaak.',
  lead: 'Veertien keer vier stappen. Elk recept hoort bij een stuk uit onze toog: koop het vlees, de rest staat hier.',

  /** §5.29 card labels */
  origin: { vl: 'Vlaamse klassieker', ro: 'Roemeens recept' },
  persons: 'personen',
  ingredients: 'Ingrediënten',
  steps: 'Zo maakt u het',
  tip: 'Tip',
  order: 'Bestel dit vlees via WhatsApp',
  /** the list's label for screen readers (no visible heading: the H1 heads the cards) */
  listLabel: 'Recepten',

  /** §5.29 link on the /producten counter tag and the footer's „Pagina's” */
  tagLink: 'Recept →',
  footer: 'Recepten',

  crumbs: { home: 'Home', page: 'Recepten' },
};

export const receptenRo = {
  /** §5.29 meta RO (47 / 150) */
  title: 'Rețete: tocăniță, mici și altele | Slagerij John',
  description: 'Paisprezece rețete scurte cu carne de la Slagerij John, Zwevezele: clasice flamande și gust românesc, fiecare în patru pași, cu timp și temperatură.',

  eyebrow: 'Rețete',
  h1: 'Rețete de la măcelar.',
  accent: 'Clasice flamande, gust românesc.',
  lead: 'De paisprezece ori câte patru pași. Fiecare rețetă pleacă de la o bucată din vitrina noastră: cumperi carnea, restul e aici.',

  origin: { vl: 'Clasic flamand', ro: 'Rețetă românească' },
  persons: 'persoane',
  ingredients: 'Ingrediente',
  steps: 'Așa se face',
  tip: 'Sfat',
  order: 'Comandă carnea pe WhatsApp',
  listLabel: 'Rețete',

  tagLink: 'Rețetă →',
  footer: 'Rețete',

  crumbs: { home: 'Acasă', page: 'Rețete' },
};

export const receptenT = { nl: receptenNl, ro: receptenRo };
