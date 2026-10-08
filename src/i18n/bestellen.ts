// /bestellen (stage 5) — the bestelbon, docs/order-flow.md; canvas board Bestellen (mobile 390), desktop derived (D-30).
// Strings: lexicon §5.20 (07.10 17:40), one line per key in this order, swapped 1:1; §5.3 / §5.5 / §5.15 / §5.18 / §5.19
// where §5.20 points to them. Left visible until FACTS.md has the value: [BETALING] (D6) and [PRIJS].
// NL only: /ro/comanda is stage 9 (lexicon §6 „Comandă”).

export const bestellenNl = {
  /** meta: §5.20 (60 / 144) */
  title: 'Bestellen – afhalen of levering in Zwevezele | Slagerij John',
  description: "Bestel online bij Slagerij John: vers vlees, colli's, gourmet, tapas en meer. Afhalen in de winkel of levering aan huis, op het uur dat u kiest.",

  /** §5.15 footer column head „Bestellen” = the page's name */
  eyebrow: 'Bestellen',
  /** §5.20 head */
  h1: 'Bestel zoals aan de toog.',
  lead: 'Kies uw producten, kies een dag en een uur, betaal bij afhaling of levering. Geen account nodig.',

  /** pickup / delivery choice (order-flow §2.1), §5.20 method: pickup + pickupSub = §5.5, deliverySub = §5.5 delivery
   *  rule (D6); the legend is for screen readers (the board shows two cards) */
  method: {
    legend: 'Afhalen of leveren?',
    pickup: 'Afhalen in de winkel, op het uur dat u kiest.',
    pickupSub: 'Geen minimumbestelling bij afhaling.',
    delivery: 'Levering aan huis',
    deliverySub: 'Gratis levering tot 10 km vanaf €50; tot 20 km vanaf €100; daarbuiten €1 per km. Levering maandag tot zaterdag vanaf 18:00.',
  },

  /** step 1: §5.20 */
  products: {
    eyebrow: '1 · Producten',
    title: 'Wat mag het zijn?',
    /** the jump pills = products.json category names + this one for the per-kg group */
    kgGroup: 'Vers vlees per kg',
    less: 'Minder', // aria
    more: 'Meer', // aria
    qty: 'Aantal', // the number field's label (screen readers)
  },

  /** stage 7: the menu section on top when the bestelbon opens with ?menu=eindejaar (lexicon §5.22 „menus.json”).
   *  The section's title = menus.json `name`. [UUR] / [DATUM] are swapped for menus.json's values once they are set;
   *  `closed` replaces the rows once the deadline (FACTS.md) has passed. */
  menu: {
    note: 'Afhalen op 24 of 31 december, van [UUR] tot [UUR]. Bestellen tot [DATUM].',
    closed: 'De besteltermijn voor het eindejaarsmenu is verstreken. Bel ons, dan kijken wij wat kan.',
  },

  /** free request (order-flow §2.3): §5.20 */
  request: {
    title: 'Niet gevonden wat u zoekt?',
    intro: 'Schrijf het hier; wij bekijken wat mogelijk is.',
    label: 'Product of aanvraag',
    add: 'Voeg toe aan de bestelling',
    remove: 'Verwijder',
  },

  /** step 2: §5.20; `noteDelivery` replaces `note` when delivering (= §5.5, D6) */
  when: {
    eyebrow: '2 · Wanneer',
    titlePickup: 'Wanneer haalt u af?',
    titleDelivery: 'Wanneer leveren wij?',
    day: 'Dag',
    time: 'Uur',
    note: 'Alleen uren waarop de winkel open is.',
    noteDelivery: 'Levering maandag tot zaterdag, vanaf 18:00.',
    none: 'Kies eerst een dag.',
  },

  /** step 3: §5.20 */
  details: {
    eyebrow: '3 · Uw gegevens',
    title: 'Voor wie is de bestelling?',
    name: 'Naam',
    phone: 'Telefoon',
    email: 'E-mail',
    remarks: 'Opmerkingen',
    street: 'Straat',
    nr: 'Nr',
    postcode: 'Postcode',
    place: 'Gemeente',
    remember: 'Mijn gegevens onthouden op dit toestel',
    /** §5.15 form basics */
    required: 'Verplicht veld',
    /** §5.20 privacy line (order-flow §5, GDPR art. 13); its last two words link to the privacy page */
    privacy: 'Uw gegevens gebruiken wij alleen voor deze bestelling en bewaren wij 90 dagen. Geen account, geen nieuwsbrief. Meer in',
    privacyLink: 'ons privacybeleid',
  },

  /** allergen notice (order-flow §2.6): §5.18 accent + §5.18 „Uw verantwoordelijkheid” + the workshop notice
   *  (allergens.json `workshop_notice_nl`, = §5.18 lead) — §5.20: „as built” */
  allergy: {
    title: 'Ernstige allergie? Bel ons vooraf.',
    duty: 'Meld een ernstige allergie altijd vóór u bestelt, telefonisch of in de winkel. Zonder die melding kunnen wij er geen rekening mee houden.',
  },

  /** the slip (OrderSlip): §5.20; payment lines = §5.5 with [BETALING] (D6); legal = §5.5 art. VI.53 4° */
  slip: {
    title: 'Uw bestelbon',
    empty: 'Nog niets gekozen.',
    pickup: 'Afhalen',
    delivery: 'Levering',
    whenPending: 'Kies een dag en een uur.',
    pay: 'Betalen bij afhaling: [BETALING]',
    payDelivery: 'Betalen bij levering: [BETALING]',
    total: 'Totaal',
    priceTbc: '[PRIJS]', // stays until FACTS
    /** the delivery-cost row (delivery.json + order-core deliveryQuote): free · beyond the free ring (per km, distance
     *  unknown) · under the €50 delivery minimum · outside the zones („Bel ons”, §5.3) · not known yet */
    feeLabel: 'Leveringskosten',
    fee: { free: 'Gratis', fee: '€1 per km; wij bevestigen het bedrag.', 'below-minimum': 'Minimum €50 voor levering', outside: 'Bel ons', unknown: '[PRIJS]' },
    legal: 'Vers vlees wordt niet teruggenomen (art. VI.53, 4° WER).',
  },

  /** the two sends (order-flow §3): §5.20 — submit is this page's own label (§5.15 „Verzenden” stays for the contact
   *  form) · §5.3 „Bestel via WhatsApp” · the label above the message = §5.19 „WhatsApp-bericht” */
  send: {
    submit: 'Bestelling verzenden',
    whatsapp: 'Bestel via WhatsApp',
    promise: 'U krijgt meteen een bevestiging per e-mail. Wij bevestigen uw bestelling daarna via WhatsApp of telefoon.',
    msgLabel: 'WhatsApp-bericht',
    /** §5.10 home NL — the WhatsApp button's text before anything is chosen (and without script) */
    msgEmpty: 'Dag, ik wil graag bestellen bij Slagerij John:',
    sending: 'Bezig met verzenden…',
  },

  /** after the send: §5.20 (thanks = this page's own; §5.15's line stays for the contact form) */
  done: {
    thanks: 'Bedankt, uw bestelling is verstuurd.',
    ref: 'Uw referentie',
    error: 'Niet verzonden. Probeer opnieuw of bestel via WhatsApp.',
    fix: 'Kijk de gemarkeerde velden na.',
    call: 'Bel ons', // §5.3
  },

  /** one line under what needs attention: §5.20 field errors (`address` = one line for the four address fields) */
  errors: {
    name: 'Vul uw naam in.',
    phone: 'Vul een telefoonnummer in.',
    email: 'Vul een geldig e-mailadres in.',
    address: 'Vul het adres volledig in.',
    items: 'Kies minstens één product.',
    when: 'Kies een dag en een uur.',
  },

  /** FAQ: §5.20 „the three Bestellen items of §5.11” (faq.json pages.bestellen); heading = §5.15 home FAQ heading */
  faq: 'Wat klanten ons vragen',

  /** BreadcrumbList (lexicon §8.4: „Home” + the page's name) */
  crumbs: { home: 'Home', page: 'Bestellen' },
};
