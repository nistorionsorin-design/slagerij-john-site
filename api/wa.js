// GET /wa?src=<page>-<position>[&text=<pre-filled message>] — every WhatsApp button goes through here (lexicon §5.10,
// §9; qa.md §2): log the click, then 302 to wa.me with the shop's number from entity.json. A Vercel Function, reached
// through the rewrite /wa → /api/wa in vercel.json; locally inside `npm run dev` (astro.config.mjs, plugin „api-dev”).
// The log is one JSON line in the function logs ({"event":"wa","src":…}) — the playbook's §4.6 click count; nothing
// about the visitor is kept (no IP, no cookie). robots.txt disallows /wa.
// Row 13b: the click is also one row in `wa_clicks` of the DGA metrics project (src/lib/metrics.js) — site · Brussels
// day · src · locale — sent after the redirect is decided and handed to waitUntil: the 302 never waits on the insert,
// and a failed insert only logs a line.
// A form without its script (stage 6, the traiteur quote form) sends its fields along: each [key] of `text` is then
// swapped for the field of that name (src/lib/quote-core.js, the same code the page script runs).
import { readFileSync } from 'node:fs';
import { fillQuote } from '../src/lib/quote-core.js';
import { insertRow, siteId, brusselsDay, afterResponse } from '../src/lib/metrics.js';

const entity = JSON.parse(readFileSync(new URL('../src/data/entity.json', import.meta.url), 'utf8'));
const OWN = new Set(['src', 'text', 'lang']);

// The locale of the page the click came from: `lang` when the link carries it (the quote forms), else the path of a
// same-host Referer (/ro… → ro); a /wa link opened from anywhere else has none. Only these two letters are kept.
function pageLocale(request, url) {
  const lang = url.searchParams.get('lang');
  if (lang === 'nl' || lang === 'ro') return lang;
  try {
    const from = new URL(request.headers.get('referer') ?? '');
    if (from.host !== url.host && from.host !== request.headers.get('x-forwarded-host')) return null;
    return /^\/ro(\/|$)/.test(from.pathname) ? 'ro' : 'nl';
  } catch {
    return null;
  }
}

export default {
  fetch(request) {
    const url = new URL(request.url);
    const src = (url.searchParams.get('src') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'none';
    const fields = Object.fromEntries([...url.searchParams].filter(([k]) => !OWN.has(k)).slice(0, 12));
    const lang = url.searchParams.get('lang') === 'ro' ? 'ro' : 'nl';
    const text = fillQuote((url.searchParams.get('text') ?? '').slice(0, 1500), fields, lang);
    console.log(JSON.stringify({ event: 'wa', src, text: text.length > 0, at: new Date().toISOString() }));
    const to = `https://wa.me/${entity.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    afterResponse(insertRow('wa_clicks', { site_id: siteId(request), day: brusselsDay(), src, locale: pageLocale(request, url) }));
    return new Response(null, { status: 302, headers: { location: to, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  },
};
