// GET /api/gone?code=410|404&lang=nl|ro — the branded „page not found” with a status a static file cannot carry
// (row 13). vercel.json rewrites to it: the old app routes of docs/data/old-urls.json `gone` (/login, /register,
// /account + /account/*, /ro/login, /ro/account) → 410 Gone, and every unmatched /ro/* → 404 with the RO page
// (Vercel's own 404 for the rest serves dist/404.html, NL). `redirects` cannot answer 410 and a rewrite to a static
// page answers 200, hence this function.
// The body is the built page itself (dist/404.html, dist/ro/404.html — src/views/NotFound.astro), fetched from the
// same deployment, so the copy lives in one place. If that fetch fails (a preview behind Vercel Authentication, a
// timeout) the status still goes out with the plain fallback below — same strings, src/i18n/notfound.ts.
const FALLBACK = {
  nl: { lang: 'nl-BE', h1: 'Pagina niet gevonden', text: 'Deze pagina bestaat niet of niet meer. Wat u zoekt, vindt u via de startpagina of via WhatsApp.', home: 'Naar de startpagina', href: '/' },
  ro: { lang: 'ro-BE', h1: 'Pagina nu a fost găsită', text: 'Pagina asta nu există sau nu mai există. Ce cauți găsești pe prima pagină sau pe WhatsApp.', home: 'La prima pagină', href: '/ro' },
};

const fallback = (f) =>
  `<!doctype html><html lang="${f.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${f.h1}</title></head><body><main><h1>${f.h1}</h1><p>${f.text}</p><p><a href="${f.href}">${f.home}</a></p></main></body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code') === '404' ? 404 : 410;
    const lang = url.searchParams.get('lang') === 'ro' ? 'ro' : 'nl';
    let html = '';
    // a request this function made itself never fetches again (no loop if the page were ever missing)
    if (!request.headers.get('x-gone-fetch')) {
      try {
        const res = await fetch(new URL(lang === 'ro' ? '/ro/404' : '/404', url.origin), { headers: { 'x-gone-fetch': '1' }, signal: AbortSignal.timeout(3000) });
        const body = await res.text();
        if (/<h1[\s>]/i.test(body) && /name="robots" content="noindex"/i.test(body)) html = body;
      } catch {
        // fall through to the fallback
      }
    }
    if (!html) html = fallback(FALLBACK[lang]);
    const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600', 'x-robots-tag': 'noindex' };
    return new Response(request.method === 'HEAD' ? null : html, { status: code, headers });
  },
};
