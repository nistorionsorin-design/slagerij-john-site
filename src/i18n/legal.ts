// The two footer text pages of row 10c (16.10): /privacy · /ro/confidentialitate (lexicon §5.26 + §6 „Confidențialitate”)
// and /algemene-voorwaarden · /ro/termeni (§5.27 + §6 „Condiții de comandă”). One view, src/views/Legal.astro.
// The RO pages are written in *dumneavoastră* on purpose (lexicon D4: legal pages) — never „corrected” to tu.
// Strings verbatim, one block per H2, in the lexicon's order.
// `title`: the lexicon's own note (§5.26 „the key `title` takes the part before „ | Slagerij John””), and its counts
// (55 · 53 · 51 · 58) are of that part — with the brand the four titles run 69–77 chars, over the gate's 60.
// `links`: the in-page links of §5.26 / §5.27 („Links on the page”), each set on its anchor where the text carries it
// (IL-03); `auto`: the shop's mail and phone and the two authorities' sites, linked wherever they appear.
// Left visible until FACTS.md has the value: [DATUM] / [DATA] (version + byline = the go-live date, C-10), [BETALING] /
// [PLATĂ] (owners' sheet B 6), the Eindejaar deadline [DATUM] / [DATA] (B 11).

import entity from '../data/entity.json';

export type Link = readonly [anchor: string, href: string];
export interface LegalBlock { h2: string; text: string }
export interface LegalPage {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  accent: string;
  lead?: string;
  blocks: LegalBlock[];
  closing: string;
  byline: string;
  links: Link[];
  crumbs: { home: string; page: string };
}

/** linked on every legal page wherever the text names them (mail and phone from entity.json) */
export const auto: Link[] = [
  [entity.email, `mailto:${entity.email}`],
  [entity.telephoneDisplay, `tel:${entity.telephone}`],
  ['www.gegevensbeschermingsautoriteit.be', 'https://www.gegevensbeschermingsautoriteit.be/'],
  ['consumentenombudsdienst.be', 'https://consumentenombudsdienst.be/'],
];

const bylineNl = 'Door John en Georgiana, Slagerij John · bijgewerkt op [DATUM].';
const bylineRo = 'De John și Georgiana, Măcelăria John · actualizat la [DATA].';

/** §5.26 Privacy */
export const privacyNl: LegalPage = {
  title: 'Privacybeleid: hoe wij uw gegevens gebruiken, Zwevezele',
  description: 'Slagerij John in Zwevezele gebruikt uw gegevens alleen voor uw bestelling en bewaart ze 90 dagen. Geen cookies, geen account, geen nieuwsbrief. Lees hoe.',
  eyebrow: 'Privacy',
  h1: 'Privacy: hoe wij uw gegevens gebruiken.',
  accent: 'Geen cookies, geen account, geen nieuwsbrief.',
  lead: 'Deze website is van Slager John SComm, Bruggestraat 146A, 8750 Zwevezele, BE 1012.585.374. Met een vraag over uw gegevens mailt u naar info@slagerij-john.be of belt u 0466 18 64 57.',
  blocks: [
    { h2: 'Welke gegevens wij ontvangen', text: 'Alleen wat u op de bestelbon invult: uw naam, telefoonnummer, e-mailadres, eventueel uw opmerkingen en, bij levering, uw adres. Geen account, geen nieuwsbrief.' },
    { h2: 'Waarvoor wij ze gebruiken', text: 'Om uw bestelling klaar te maken en te bevestigen: u krijgt een bevestiging per e-mail, de winkel krijgt dezelfde bestelling. De grondslag is de overeenkomst tussen ons (art. 6, lid 1, b AVG). Wij gebruiken uw gegevens niet voor reclame en verkopen ze niet.' },
    { h2: 'Hoelang wij ze bewaren', text: '90 dagen na uw bestelling, daarna wissen wij ze. Boekhoudkundige stukken bewaren wij zolang de wet dat vraagt.' },
    { h2: 'Wie ze nog ziet', text: 'De website draait bij Vercel Inc.; de bestelfunctie draait in Frankfurt (EU). De bevestigingsmail vertrekt via een e-maildienst (Resend). Die leveranciers verwerken de gegevens alleen in onze opdracht en gebruiken ze niet voor zichzelf.' },
    { h2: 'WhatsApp', text: 'De knop „Bestel via WhatsApp” opent de app WhatsApp met een kant-en-klaar bericht. Vanaf dan gelden de regels van WhatsApp (Meta). Wij ontvangen niets vóór u op „verzenden” drukt.' },
    { h2: 'Op uw toestel', text: 'Vinkt u „Mijn gegevens onthouden op dit toestel” aan, dan blijven uw naam en telefoonnummer alleen in uw browser, op uw eigen telefoon of computer. Ze komen pas bij ons bij uw volgende bestelling.' },
    /** = the §5.5 statistics sentence, verbatim */
    { h2: 'Statistieken', text: 'Deze website meet bezoeken zonder cookies en zonder persoonsgegevens. Per bezoek bewaren we enkel de pagina, de taal, van waar u kwam (bijvoorbeeld Google), het type toestel, het land en de dag. Er wordt niets op uw toestel opgeslagen; daarom vraagt de site u geen toestemming.' },
    { h2: 'Google en de kaart', text: 'De Google-score op de site lezen wij op onze server; uw browser stuurt niets naar Google. De kaart op de contactpagina is een afbeelding op onze eigen server.' },
    { h2: 'Uw rechten', text: 'U kunt altijd vragen welke gegevens wij van u hebben, ze laten verbeteren of wissen. Mail naar info@slagerij-john.be; wij antwoorden binnen 30 dagen. Een klacht kunt u indienen bij de Gegevensbeschermingsautoriteit, Drukpersstraat 35, 1000 Brussel, www.gegevensbeschermingsautoriteit.be.' },
  ],
  closing: 'Versie van [DATUM]. Verandert er iets, dan schrijven wij hier wat en wanneer.',
  byline: bylineNl,
  /** §5.26: de bestelbon · de contactpagina · Allergenen — the text names no „Allergenen” (the footer links it) */
  links: [['de bestelbon', '/bestellen'], ['de contactpagina', '/contact'], ['Allergenen', '/allergenen']],
  crumbs: { home: 'Home', page: 'Privacy' },
};

/** §6 „Confidențialitate” = the italic RO lines of §5.26, verbatim (Statistici: the dumneavoastră version) */
export const privacyRo: LegalPage = {
  title: 'Confidențialitate: cum folosim datele dumneavoastră',
  description: 'Măcelăria John din Zwevezele folosește datele dumneavoastră doar pentru comandă și le păstrează 90 de zile. Fără cookie-uri, fără cont, fără newsletter.',
  eyebrow: 'Confidențialitate',
  h1: 'Confidențialitate. Cum folosim datele dumneavoastră.',
  accent: 'Fără cookie-uri, fără cont, fără newsletter.',
  lead: 'Site-ul slagerij-john.be aparține Slager John SComm, Bruggestraat 146A, 8750 Zwevezele, BE 1012.585.374. Pentru orice întrebare despre datele dumneavoastră scrieți la info@slagerij-john.be sau sunați la 0466 18 64 57.',
  blocks: [
    { h2: 'Ce date primim', text: 'Doar ce completați în bonul de comandă: numele, telefonul, adresa de e-mail, eventual observațiile și, pentru livrare, adresa. Nu cerem cont, nu trimitem newsletter.' },
    { h2: 'La ce le folosim', text: 'Pentru a pregăti și a confirma comanda dumneavoastră: primiți o confirmare pe e-mail, iar magazinul primește aceeași comandă. Temeiul este contractul dintre noi (art. 6 alin. 1 lit. b GDPR). Nu le folosim pentru reclamă și nu le vindem.' },
    { h2: 'Cât le păstrăm', text: '90 de zile după comandă, apoi le ștergem. Documentele contabile se păstrează cât cere legea.' },
    { h2: 'Cine le mai vede', text: 'Site-ul este găzduit la Vercel Inc.; funcția de comandă rulează în Frankfurt (UE). E-mailul de confirmare pleacă printr-un serviciu de e-mail (Resend). Acești furnizori prelucrează datele doar în numele nostru și nu le folosesc pentru ei.' },
    { h2: 'WhatsApp', text: 'Butonul „Comandă pe WhatsApp” deschide aplicația WhatsApp cu un mesaj gata scris. Din acel moment se aplică regulile WhatsApp (Meta). Noi nu primim nimic până nu apăsați „trimite”.' },
    { h2: 'Pe dispozitivul dumneavoastră', text: 'Dacă bifați „Ține minte datele mele pe acest dispozitiv”, numele și telefonul rămân doar în browserul dumneavoastră, pe telefonul sau calculatorul dumneavoastră. Nu ajung la noi până la următoarea comandă.' },
    { h2: 'Statistici', text: 'Site-ul măsoară vizitele fără cookie-uri și fără date personale. La fiecare vizită păstrăm doar pagina, limba, de unde ați venit (de exemplu Google), tipul de dispozitiv, țara și ziua. Nimic nu se salvează pe dispozitivul dumneavoastră; de aceea site-ul nu vă cere acordul.' },
    { h2: 'Google și harta', text: 'Nota Google de pe site o citim noi, de pe serverul nostru; browserul dumneavoastră nu trimite nimic la Google. Harta de pe pagina Contact este o imagine de pe serverul nostru.' },
    { h2: 'Drepturile dumneavoastră', text: 'Puteți cere oricând ce date avem despre dumneavoastră, corectarea sau ștergerea lor. Scrieți la info@slagerij-john.be; răspundem în 30 de zile. Puteți depune o plângere la Autoritatea pentru Protecția Datelor, Drukpersstraat 35, 1000 Bruxelles, www.gegevensbeschermingsautoriteit.be.' },
  ],
  closing: 'Versiunea din [DATA]. Dacă schimbăm ceva, scriem aici ce și când.',
  byline: bylineRo,
  links: [['bonul de comandă', '/ro/comanda'], ['pagina Contact', '/ro/contact'], ['Alergeni', '/ro/alergeni']],
  crumbs: { home: 'Acasă', page: 'Confidențialitate' },
};

/** §5.27 Algemene voorwaarden */
export const termsNl: LegalPage = {
  title: 'Bestelvoorwaarden voor afhalen en levering, Zwevezele',
  description: 'Bestellen bij Slagerij John, Zwevezele: wij bevestigen, u betaalt bij afhaling of levering. Gratis levering tot 10 km vanaf €50. Vers vlees: geen retour.',
  eyebrow: 'Voorwaarden',
  h1: 'Bestelvoorwaarden: zo werkt een bestelling bij ons.',
  accent: 'U bestelt, wij bevestigen, u betaalt bij afhaling of levering.',
  blocks: [
    { h2: 'Wie wij zijn', text: 'Slager John SComm, Bruggestraat 146A, 8750 Zwevezele, BE 1012.585.374, info@slagerij-john.be, 0466 18 64 57. Hoe wij uw gegevens gebruiken, leest u in ons privacybeleid.' },
    { h2: 'Waarvoor deze voorwaarden gelden', text: 'Voor bestellingen via de website, WhatsApp of telefoon, met afhaling in de winkel of levering aan huis. Een aankoop aan de toog heeft deze voorwaarden niet nodig.' },
    { h2: 'Uw bestelling', text: 'Een bestelling is een aanvraag, via de bestelbon op de site, WhatsApp of telefoon. Ze is definitief zodra wij ze bevestigen, per e-mail of WhatsApp, met dag en uur. Is een product niet meer beschikbaar, dan stellen wij een alternatief voor of annuleren wij kosteloos.' },
    { h2: 'Prijzen', text: 'Alle prijzen zijn in euro, btw inbegrepen. Producten per kilogram hebben hun prijs aan de toog; het gewogen gewicht bepaalt het eindbedrag.' },
    { h2: 'Kennelijke fouten', text: 'Een duidelijke fout in een prijs of omschrijving bindt ons niet; wij verwittigen u vóór wij bereiden.' },
    { h2: 'Afhalen', text: 'U haalt uw bestelling af in de winkel, op het gekozen uur, tijdens de openingsuren. Geen minimumbestelling bij afhaling.' },
    { h2: 'Niet afgehaald', text: 'Haalt u een bestelling niet af, dan vragen wij bij uw volgende bestelling een voorschot van minstens 50 %.' },
    /** = the §5.5 delivery rule verbatim + §5.27's sentence */
    { h2: 'Levering', text: 'Gratis levering tot 10 km vanaf €50; tot 20 km vanaf €100; daarbuiten €1 per km. Levering maandag tot zaterdag vanaf 18:00. Het bedrag voor de levering bevestigen wij samen met uw bestelling.' },
    { h2: 'Betaling', text: 'Betalen bij afhaling of levering: cash, Bancontact, Payconiq, Visa of Mastercard. U betaalt niets vooraf op de site.' },
    { h2: 'Eindejaarsmenu', text: 'Het eindejaarsmenu haalt u af in de winkel, op 24 of 31 december. Bestel uiterlijk [DATUM].' },
    { h2: 'Wijzigen en annuleren', text: 'Wijzigen of annuleren kan telefonisch, zolang wij uw bestelling nog niet bereiden. Eindejaarsbestellingen kunnen na 20 december niet meer gewijzigd of geannuleerd worden.' },
    /** = §5.5's line + §5.27's sentence */
    { h2: 'Herroepingsrecht', text: 'Vers vlees wordt niet teruggenomen (art. VI.53, 4° WER). Verse producten en bereide gerechten bederven snel; daarom voorziet de wet er geen herroepingsrecht voor.' },
    { h2: 'Allergenen', text: 'De allergenen per productgroep staan op de pagina Allergenen. Meld een ernstige allergie vóór u bestelt, telefonisch of in de winkel.' },
    { h2: 'Klachten', text: 'Is er iets mis met uw bestelling? Laat het ons liefst dezelfde dag weten, met een foto, op 0466 18 64 57 of via info@slagerij-john.be. Wij zoeken samen een oplossing. Komen wij er niet uit, dan kunt u terecht bij de Consumentenombudsdienst, consumentenombudsdienst.be.' },
    { h2: 'Aansprakelijkheid', text: 'Onze aansprakelijkheid voor een bestelling is beperkt tot het bedrag van die bestelling. Uw wettelijke rechten als consument blijven volledig gelden.' },
    { h2: 'Toepasselijk recht', text: 'Het Belgische recht is van toepassing.' },
  ],
  closing: 'Versie van [DATUM].',
  byline: bylineNl,
  /** §5.27: de pagina Allergenen · bestelbon · privacybeleid · openingsuren — „bestelbon” („Uw bestelling”) and
   *  „privacybeleid” („Wie wij zijn”) added to the strings 16.10, after the 10c report */
  links: [['de pagina Allergenen', '/allergenen'], ['bestelbon', '/bestellen'], ['privacybeleid', '/privacy'], ['openingsuren', '/contact']],
  crumbs: { home: 'Home', page: 'Voorwaarden' },
};

/** §6 „Condiții de comandă” = the italic RO lines of §5.27, verbatim */
export const termsRo: LegalPage = {
  title: 'Condiții de comandă: ridicare, livrare și plată, Zwevezele',
  description: 'Comanda la Măcelăria John, Zwevezele: confirmăm, plătiți la ridicare sau la livrare. Livrare gratuită până la 10 km de la 50 €. Carnea nu se returnează.',
  eyebrow: 'Condiții',
  h1: 'Condiții de comandă. Ce înseamnă o comandă la noi.',
  accent: 'Comandați, noi confirmăm, plătiți la ridicare sau la livrare.',
  blocks: [
    { h2: 'Cine suntem', text: 'Slager John SComm, Bruggestraat 146A, 8750 Zwevezele, BE 1012.585.374, info@slagerij-john.be, 0466 18 64 57. Cum folosim datele dumneavoastră citiți în pagina de confidențialitate.' },
    { h2: 'Pentru ce sunt condițiile', text: 'Pentru comenzile date pe site, pe WhatsApp sau la telefon, cu ridicare din magazin sau livrare la domiciliu. Cumpărăturile de la tejghea nu au nevoie de aceste condiții.' },
    { h2: 'Comanda', text: 'O comandă este o cerere, prin bonul de comandă de pe site, pe WhatsApp sau la telefon. Comanda este fermă când o confirmăm noi, pe e-mail sau pe WhatsApp, cu ziua și ora. Dacă un produs nu mai este disponibil, vă propunem o alternativă sau anulăm comanda fără costuri.' },
    { h2: 'Prețurile', text: 'Toate prețurile sunt în euro, cu TVA inclus. Produsele la kilogram au prețul la tejghea; cântărirea din magazin stabilește suma finală.' },
    { h2: 'Greșeli evidente', text: 'O greșeală evidentă de preț sau de descriere nu ne obligă; vă anunțăm înainte să pregătim.' },
    { h2: 'Ridicarea', text: 'Ridicați comanda din magazin, la ora aleasă, în programul de lucru. Fără comandă minimă la ridicare.' },
    { h2: 'Comandă neridicată', text: 'Dacă nu ridicați o comandă, la următoarea vă cerem un avans de cel puțin 50%.' },
    { h2: 'Livrarea', text: 'Livrare gratuită până la 10 km de la 50 €; până la 20 km de la 100 €; peste, 1 € pe km. Livrăm de luni până sâmbătă, de la 18:00. Suma pentru livrare o confirmăm odată cu comanda.' },
    { h2: 'Plata', text: 'Plata la ridicare sau la livrare: numerar, Bancontact, Payconiq, Visa sau Mastercard. Nu plătiți nimic în avans pe site.' },
    { h2: 'Meniul de sărbători', text: 'Meniul de sărbători se ridică din magazin, pe 24 sau 31 decembrie. Comandați până la [DATA].' },
    { h2: 'Modificări și anulări', text: 'Puteți modifica sau anula o comandă la telefon, cât timp nu am început să o pregătim. Comenzile de sărbători nu se mai pot modifica sau anula după 20 decembrie.' },
    { h2: 'Dreptul de retragere', text: 'Carnea proaspătă nu se returnează (art. VI.53, 4° WER). Produsele proaspete și preparatele se strică repede, de aceea legea nu prevede un drept de retragere pentru ele.' },
    { h2: 'Alergeni', text: 'Lista alergenilor pe grupe de produse este pe pagina Alergeni. Anunțați o alergie gravă înainte să comandați, la telefon sau în magazin.' },
    { h2: 'Reclamații', text: 'Ceva nu e în regulă cu comanda? Spuneți-ne, de preferință în aceeași zi, cu o poză, la 0466 18 64 57 sau la info@slagerij-john.be. Căutăm o soluție împreună. Dacă nu ne înțelegem, vă puteți adresa Serviciului de Mediere pentru Consumatori (Consumentenombudsdienst), consumentenombudsdienst.be.' },
    { h2: 'Răspunderea', text: 'Răspunderea noastră pentru o comandă se limitează la valoarea acelei comenzi. Drepturile dumneavoastră legale de consumator rămân întregi.' },
    { h2: 'Legea aplicabilă', text: 'Se aplică legea belgiană.' },
  ],
  closing: 'Versiunea din [DATA].',
  byline: bylineRo,
  links: [['pagina Alergeni', '/ro/alergeni'], ['bonul de comandă', '/ro/comanda'], ['confidențialitate', '/ro/confidentialitate'], ['programul', '/ro/contact']],
  crumbs: { home: 'Acasă', page: 'Condiții' },
};

export const legal = {
  privacy: { nl: privacyNl, ro: privacyRo, alternates: { nl: '/privacy', ro: '/ro/confidentialitate' } },
  terms: { nl: termsNl, ro: termsRo, alternates: { nl: '/algemene-voorwaarden', ro: '/ro/termeni' } },
} as const;

/** Splits `text` on the anchors it carries: each page link once (its first occurrence), each `auto` link everywhere.
 *  Returns plain strings and { text, href } parts, in order. */
export function linkify(text: string, links: readonly Link[], used: Set<string>): (string | { text: string; href: string })[] {
  type Hit = { at: number; text: string; href: string; page: boolean };
  const hits: Hit[] = [];
  for (const [a, href] of links) {
    if (used.has(a)) continue;
    const at = text.indexOf(a);
    if (at >= 0) hits.push({ at, text: a, href, page: true });
  }
  for (const [a, href] of auto) {
    let at = text.indexOf(a);
    while (at >= 0) {
      hits.push({ at, text: a, href, page: false });
      at = text.indexOf(a, at + a.length);
    }
  }
  hits.sort((x, y) => x.at - y.at || y.text.length - x.text.length);
  const out: (string | { text: string; href: string })[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.at < pos) continue; // overlaps an earlier hit
    if (h.at > pos) out.push(text.slice(pos, h.at));
    out.push({ text: h.text, href: h.href });
    if (h.page) used.add(h.text);
    pos = h.at + h.text.length;
  }
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}
