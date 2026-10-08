// The quote message (stage 6, /traiteur; lexicon §5.10 traiteur as extended in §5.21 / §6 „Catering”): the template's
// [bracket words] are swapped for the form's values; an empty value keeps its bracket word, so the customer sees in
// WhatsApp what is still missing. One function for the page script (src/scripts/quote.ts) and for the no-script path
// (api/wa.js fills the same template from the form's GET fields). Plain JS: the Vercel function imports it as is.
// The values arrive as the message writes them: the feest select's option values carry the article („een verjaardag”,
// „een feest” for Iets anders — lexicon §5.21, 08.10 15:40; src/i18n/traiteur.ts), so both paths say „voor een …”.
import { dayLabel } from './order-core.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** „zaterdag 14 november 2026” / „sâmbătă, 14 noiembrie 2026” (lexicon §9: dates with the month written out). */
export const quoteDate = (date, locale = 'nl') => `${dayLabel(date, locale, 'long')} ${date.slice(0, 4)}`;

/** template + { key: value } → the message. A value that is an ISO date is written out; in Romanian a count of 20 or
 *  more before „persoane” takes „de” (lexicon §6 „Catering”, RO bible: numerals ≥ 20). */
export function fillQuote(template, values, locale = 'nl') {
  return template.replace(/\[([^\]]+)\](?=( persoane)?)/g, (token, key, persons) => {
    const raw = String(values[key] ?? '').trim().slice(0, 80);
    if (!raw) return token;
    const v = ISO_DATE.test(raw) ? quoteDate(raw, locale) : raw;
    return locale === 'ro' && persons && /^\d+$/.test(v) && Number(v) >= 20 ? `${v} de` : v;
  });
}
