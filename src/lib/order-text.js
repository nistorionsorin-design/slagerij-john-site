// Row 12 (D-70, docs/admin.md §3) — the strings of the order steps, shared by the functions (api/order.js, api/admin.js,
// api/bestelling.js) and the private pages' scripts. Every string is lexicon §5.40 (NL, u-form) or §6 „Comenzi și pașii
// comenzii, 11.11” (RO: the customer's mails and page in tu, the shop's own screen in Romanian), word for word; the
// {placeholders} of the lexicon are the functions' arguments. Plain JS, no DOM: the functions import it as it is.

/** the statuses, in order (docs/admin.md §3.1): nouă → confirmată → în lucru → gata → ridicată / livrată */
export const STATUS = ['noua', 'confirmata', 'in-lucru', 'gata', 'ridicata', 'livrata'];
/** the rank of a status on the way (ridicată and livrată are both the last step) */
export const rank = (s) => (s === 'livrata' ? 4 : STATUS.indexOf(s));
/** the three steps the shop's mail carries (Am primit-o · O pregătim · E gata) */
export const MAIL_STEPS = ['confirmata', 'in-lucru', 'gata'];
/** the step after a status for this order (pickup ends „ridicată”, delivery „livrată”); null at the end */
export const nextOf = (status, method) => {
  const i = rank(status);
  if (i < 0 || i >= 4) return null;
  return i === 3 ? (method === 'delivery' ? 'livrata' : 'ridicata') : STATUS[i + 1];
};

/** the customer's side, by the order's language: the confirmation's line and link, the two step mails, the status page,
 *  the WhatsApp text from the shop's phone (lexicon §5.40 / §6) */
export const CUSTOMER = {
  nl: {
    confirmStore: 'U krijgt een e-mail zodra wij uw bestelling bevestigd hebben en wanneer ze klaarstaat.',
    track: 'Volg uw bestelling',
    confirmedSubject: (ref) => `Uw bestelling ${ref} is bevestigd`,
    confirmedLine: (day, hour) => `Wij hebben uw bestelling goed ontvangen en maken ze klaar tegen ${day}, ${hour}.`,
    readySubject: (ref) => `Uw bestelling ${ref} staat klaar`,
    readyPickup: (day, hour) => `Uw bestelling staat klaar in de winkel. Afhalen: ${day}, ${hour}.`,
    readyDelivery: (day, hour) => `Uw bestelling is klaar. Wij leveren ze ${day} rond ${hour}.`,
    pageTitle: (ref) => `Uw bestelling ${ref}`,
    steps: ['Ontvangen', 'In bereiding', 'Klaar om af te halen'],
    stepsDelivery: ['Ontvangen', 'In bereiding', 'Klaar voor levering'],
    momentPickup: (day, hour) => `Afhalen: ${day}, ${hour}`,
    momentDelivery: (day, hour) => `Levering: ${day}, ${hour}`,
    help: 'Vragen? Bel of stuur een WhatsApp.',
    invalid: 'Deze link is niet meer geldig. Bel ons of stuur een WhatsApp.',
    call: 'Bel', // §5.3
    whatsapp: 'WhatsApp', // §5.3
    waReady: (name, ref) => `Dag ${name}, uw bestelling ${ref} bij Slagerij John staat klaar. Tot straks!`,
  },
  ro: {
    confirmStore: 'Primești un e-mail când confirmăm comanda și când e gata.',
    track: 'Urmărește comanda',
    confirmedSubject: (ref) => `Comanda ta ${ref} e confirmată`,
    confirmedLine: (day, hour) => `Am primit comanda ta și o pregătim pentru ${day}, ${hour}.`,
    readySubject: (ref) => `Comanda ta ${ref} e gata`,
    readyPickup: (day, hour) => `Comanda ta te așteaptă în magazin. Ridicare: ${day}, ${hour}.`,
    readyDelivery: (day, hour) => `Comanda ta e gata. O livrăm ${day}, în jurul orei ${hour}.`,
    pageTitle: (ref) => `Comanda ta ${ref}`,
    steps: ['Primită', 'În lucru', 'Gata de ridicat'],
    stepsDelivery: ['Primită', 'În lucru', 'Gata de livrare'],
    momentPickup: (day, hour) => `Ridicare: ${day}, ${hour}`,
    momentDelivery: (day, hour) => `Livrare: ${day}, ${hour}`,
    help: 'Întrebări? Sună sau scrie-ne pe WhatsApp.',
    invalid: 'Linkul nu mai e valabil. Sună-ne sau scrie-ne pe WhatsApp.',
    call: 'Sună', // §6 (§5.3)
    whatsapp: 'WhatsApp',
    waReady: (name, ref) => `Bună, ${name}! Comanda ta ${ref} de la Măcelăria John e gata. Te așteptăm.`,
  },
};

/** the shop's own Romanian screen (/admin), the step page (/admin/pas) and the three buttons in the shop's mail
 *  (lexicon §6 „Comenzi și pașii comenzii, 11.11”) */
export const SHOP = {
  title: 'Comenzi',
  pass: 'Parola',
  enter: 'Intră',
  wrong: 'Parola nu e bună. Mai încearcă.',
  locked: 'Prea multe încercări. Încearcă din nou peste 15 minute.',
  tabs: { noua: 'Noi', confirmata: 'Confirmate', 'in-lucru': 'În lucru', gata: 'Gata', done: 'Ridicate', all: 'Toate' },
  newest: 'Cele mai noi',
  byPickup: 'După ora de ridicare',
  pickup: 'Ridicare',
  delivery: 'Livrare',
  received: 'Primită',
  remarks: 'Observații',
  total: 'Total',
  call: 'Sună',
  whatsapp: 'WhatsApp',
  /** the next-step button on a card = the status it moves to */
  next: { confirmata: 'Am primit-o', 'in-lucru': 'O pregătim', gata: 'E gata', ridicata: 'A fost ridicată', livrata: 'A fost livrată' },
  back: 'Înapoi',
  none: 'Nicio comandă nouă.',
  updated: (hour) => `Actualizat la ${hour}`,
  reload: 'Reîncarcă',
  logout: 'Ieși',
  loadFailed: 'Nu am putut încărca comenzile. Verifică internetul și apasă Reîncarcă.',
  saveFailed: 'Nu s-a salvat. Mai apasă o dată.',
  expired: 'A trecut prea mult timp. Scrie din nou parola.',
  /** lexicon §6 „Păstrarea comenzilor, 12.11” (row 12c, D-72 A) */
  foot: 'Aici apar comenzile trimise prin bonul de pe site. Cele scrise pe WhatsApp rămân în WhatsApp. Comenzile rămân aici. Ștergi una doar când clientul o cere.',
  /** the erase on request (§6 „Păstrarea comenzilor”): in the tab „Toate” only */
  erase: 'Șterge comanda',
  eraseAsk: (ref) => `Ștergi comanda ${ref}? Nu se mai poate recupera.`,
  eraseYes: 'Șterge',
  eraseNo: 'Renunță',
  erased: 'Comanda a fost ștearsă.',
  credit: 'Pagină făcută de DanGabriel Advisory',
  // /admin/pas — the step page from the shop's mail
  stepTitle: (ref, name) => `Comanda ${ref} · ${name}`,
  saved: 'Salvat.',
  savedMailed: 'Salvat. Clientul a primit e-mailul.',
  writeWa: 'Scrie-i și pe WhatsApp',
  seeAll: 'Vezi toate comenzile',
  stepInvalid: 'Linkul nu mai e valabil. Deschide lista de comenzi.',
};
