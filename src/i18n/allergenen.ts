// /allergenen · /ro/alergeni (row 10c, 16.10) — lexicon §5.18 (u-form) and §6 „Alergeni” (tu-form: this is the shop
// talking about its products, the §6 block is written in tu — D4's dumneavoastră covers privacy and the terms only).
// The data — 14 allergens, six categories, notes, the workshop notice (= the lead) — is src/data/allergens.json
// (= docs/data/allergens.json, the old site's statement, the owners confirm before launch, FACTS „Allergens”).
// One view: src/views/Allergenen.astro. The §5.18 Q&A-box sample belongs to the assistant (docs/assistant.md §4.3),
// not to this page. The byline's date = SITE_UPDATED (row 15c, src/lib/updated.ts); the legal line's date = the owners' confirmation,
// 19.10.2026 [OWNER] (row 15, lexicon §5.30).

import { updatedOn } from '../lib/updated';

export const allergenenNl = {
  /** §5.18 meta (43 / 149) */
  title: 'Allergenen per productgroep | Slagerij John',
  description: 'De 14 allergenen per productgroep bij Slagerij John in Zwevezele, van vers vlees tot gourmet en bereide gerechten. Ernstige allergie? Bel ons vooraf.',
  eyebrow: 'Allergenen',
  h1: 'Allergenen per productgroep.',
  accent: 'Ernstige allergie? Bel ons vooraf.',
  /** the picker: legend · the three result lines */
  pick: 'Kies een allergeen',
  result: { contains: 'Zit in:', may: 'Kan sporen bevatten:', none: 'Niet aanwezig in:' },
  /** the legend — words always, never colour alone */
  legend: { contains: 'bevat', may: 'kan sporen bevatten', none: 'niet aanwezig' },
  /** the category cards */
  card: { contains: 'Bevat:', may: 'Kan sporen bevatten:', nothing: 'geen' },
  ask: {
    eyebrow: 'Vraag het ons',
    lines: [
      'Wij kijken de exacte ingrediëntenlijst van marinades en kruidenmengelingen voor u na.',
      'Wij raden u een veilig alternatief aan.',
      'Waar het kan, verpakken wij uw product apart.',
    ],
  },
  duty: {
    eyebrow: 'Uw verantwoordelijkheid',
    text: 'Meld een ernstige allergie altijd vóór u bestelt, telefonisch of in de winkel. Zonder die melding kunnen wij er geen rekening mee houden.',
  },
  closing: 'Twijfelt u? Neem geen risico. Bel ons.',
  /** „Bel ons vooraf · 0466 18 64 57” — the number from entity.json; on this page the call is the primary action */
  call: 'Bel ons vooraf',
  legal: 'Allergeneninformatie volgens Verordening (EU) nr. 1169/2011 en het KB van 17 juli 2014 (niet-voorverpakte levensmiddelen). Lijst bevestigd door John en Georgiana op 19 oktober 2026.',
  /** §5.13 with SITE_UPDATED (row 15c), as on /over-ons */
  byline: `Door John en Georgiana, Slagerij John · bijgewerkt op ${updatedOn('nl')}.`,
  crumbs: { home: 'Home', page: 'Allergenen' },
};

export const allergenenRo: typeof allergenenNl = {
  /** §6 meta (45 / 147) */
  title: 'Alergeni pe grupe de produse | Măcelăria John',
  description: 'Cei 14 alergeni pe grupe de produse la Măcelăria John din Zwevezele, de la carne proaspătă la gourmet și preparate. Alergie gravă? Sună-ne înainte.',
  eyebrow: 'Alergeni',
  h1: 'Alergenii, pe grupe de produse.',
  accent: 'Alergie gravă? Sună-ne înainte.',
  pick: 'Alege un alergen',
  result: { contains: 'Se găsește în:', may: 'Poate conține urme:', none: 'Nu se găsește în:' },
  legend: { contains: 'conține', may: 'poate conține urme', none: 'nu conține' },
  card: { contains: 'Conține:', may: 'Poate conține urme:', nothing: 'niciunul' },
  ask: {
    eyebrow: 'Întreabă-ne',
    lines: [
      'Verificăm pentru tine lista exactă de ingrediente a marinatelor și a amestecurilor de condimente.',
      'Îți recomandăm o alternativă sigură.',
      'Unde se poate, îți ambalăm produsul separat.',
    ],
  },
  duty: {
    eyebrow: 'Responsabilitatea ta',
    text: 'Anunță o alergie gravă mereu înainte să comanzi, la telefon sau în magazin. Fără anunț, nu putem ține cont de ea.',
  },
  closing: 'Ai îndoieli? Nu risca. Sună-ne.',
  call: 'Sună-ne înainte',
  legal: 'Informații despre alergeni conform Regulamentului (UE) nr. 1169/2011 și KB din 17 iulie 2014 (alimente neambalate). Listă confirmată de John și Georgiana la 19 octombrie 2026.',
  byline: `De John și Georgiana, Măcelăria John · actualizat la ${updatedOn('ro')}.`,
  crumbs: { home: 'Acasă', page: 'Alergeni' },
};

export const allergenenT = { nl: allergenenNl, ro: allergenenRo };
