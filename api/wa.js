// GET /wa?src=<page>-<position>[&text=<pre-filled message>] — every WhatsApp button goes through here (lexicon §5.10,
// §9; qa.md §2): log the click, then 302 to wa.me with the shop's number from entity.json. A Vercel Function, reached
// through the rewrite /wa → /api/wa in vercel.json; locally inside `npm run dev` (astro.config.mjs, plugin „api-dev”).
// The log is one JSON line in the function logs ({"event":"wa","src":…}) — the playbook's §4.6 click count; nothing
// about the visitor is kept (no IP, no cookie). robots.txt disallows /wa.
import { readFileSync } from 'node:fs';

const entity = JSON.parse(readFileSync(new URL('../src/data/entity.json', import.meta.url), 'utf8'));

export default {
  fetch(request) {
    const url = new URL(request.url);
    const src = (url.searchParams.get('src') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'none';
    const text = (url.searchParams.get('text') ?? '').slice(0, 1500);
    console.log(JSON.stringify({ event: 'wa', src, text: text.length > 0, at: new Date().toISOString() }));
    const to = `https://wa.me/${entity.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    return new Response(null, { status: 302, headers: { location: to, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  },
};
