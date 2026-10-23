import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The two Vercel Functions in api/ (stage 5: the bestelbon's POST /api/order, the /wa redirect) run inside the dev
// server, so the order can be tried locally (D-22) with no Vercel CLI and no extra package. `astro preview` serves
// dist/ only (it takes no Vite plugin): the build is checked there, the sends in `npm run dev`.
// The routes mirror vercel.json (/wa → /api/wa; /api/gone, the 410 / RO 404 page of row 13 — the rewrites to it, and the
// old-URL redirects, are Vercel's only: scripts/routes.mjs replays vercel.json against dist/ to test them locally). Production: Vercel builds api/ itself; Astro stays static (D-06).
// Row 13b: /api/hit (the page-view beacon) too; without METRICS_URL / METRICS_KEY it prints the row it would insert.
// The headers Vercel sets (x-forwarded-host, x-vercel-ip-country) and the Referer (/wa's locale) are passed on when a
// request carries them, so a test can set them; a plain browser request has none of the first two → preview site_id.
const apiRoutes = { '/api/order': 'api/order.js', '/api/wa': 'api/wa.js', '/wa': 'api/wa.js', '/api/gone': 'api/gone.js', '/api/hit': 'api/hit.js' };
const apiMiddleware = (load) => async (req, res, next) => {
  const file = apiRoutes[(req.url ?? '').split('?')[0]];
  if (!file) return next();
  try {
    const mod = await load(file);
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = {};
    for (const k of ['content-type', 'accept', 'x-forwarded-for', 'x-forwarded-host', 'x-vercel-ip-country', 'referer']) if (req.headers[k]) headers[k] = String(req.headers[k]);
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks);
    const response = await mod.default.fetch(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, body }));
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    next(e);
  }
};
const apiDev = {
  name: 'api-dev',
  configureServer(server) {
    server.middlewares.use(apiMiddleware((f) => server.ssrLoadModule(`/${f}`)));
  },
};

// Sitemap (row 13). Each URL carries:
// - lastmod = the date of the last commit that touched the page: its src/pages file, the view it renders and the
//   src/i18n strings that view imports (git log). No git, or a shallow clone whose history ends before that commit
//   (Vercel clones shallow) → no lastmod: an omitted date, never a guessed one.
// - the hreflang pair (xhtml:link nl-BE / ro-BE / x-default) read from the built page's own <link rel="alternate">
//   (Base.astro), so the sitemap and the pages cannot disagree; the slugs differ per language (/producten ↔
//   /ro/produse), which the integration's i18n option cannot pair.
// Excluded: the two 404 pages; /wa and /api/* are not pages, so never listed.
const here = new URL('.', import.meta.url);
const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: fileURLToPath(here), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const shallowFile = git('rev-parse', '--is-shallow-repository') === 'true' ? git('rev-parse', '--git-path', 'shallow') : '';
const shallow = new Set(shallowFile ? readFileSync(new URL(shallowFile, here), 'utf8').split(/\s+/).filter(Boolean) : []);
const source = (file) => (existsSync(new URL(file, here)) ? readFileSync(new URL(file, here), 'utf8') : '');
const VIEW = /from '(?:\.\.\/)+views\/([\w-]+)\.astro'/g;
const STRINGS = /from '(?:\.\.\/)+i18n\/([\w-]+)'/g;
function lastmod(pathname) {
  const page = `src/pages${pathname === '/' ? '/index' : pathname === '/ro' ? '/ro/index' : pathname}.astro`;
  const views = [...source(page).matchAll(VIEW)].map((m) => `src/views/${m[1]}.astro`);
  const strings = views.flatMap((v) => [...source(v).matchAll(STRINGS)].map((m) => `src/i18n/${m[1]}.ts`));
  const files = [...new Set([page, ...views, ...strings])].filter((f) => existsSync(new URL(f, here)));
  const [sha, date] = git('log', '-1', '--format=%H %cI', '--', ...files).split(' ');
  return sha && !shallow.has(sha) ? date : undefined;
}
function alternates(pathname) {
  const file = new URL(`dist${pathname === '/' ? '/index' : pathname}.html`, here);
  if (!existsSync(file)) return [];
  const tags = readFileSync(file, 'utf8').match(/<link\s+rel="alternate"[^>]*>/gi) ?? [];
  return tags.map((t) => ({ lang: t.match(/hreflang="([^"]+)"/)?.[1], url: t.match(/href="([^"]+)"/)?.[1] })).filter((l) => l.lang && l.url);
}

export default defineConfig({
  site: 'https://slagerij-john.be',
  output: 'static',
  trailingSlash: 'never',
  // inlineStylesheets: the page CSS goes into <style> (CSP style-src allows it) so no
  // render-blocking stylesheet request sits before first paint; fonts stay in /_astro/.
  build: { format: 'file', inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'nl',
    locales: ['nl', 'ro'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !/\/404\/?$/.test(new URL(page).pathname) && !/^\/(wa|api)(\/|$)/.test(new URL(page).pathname),
      serialize(item) {
        const pathname = new URL(item.url).pathname.replace(/\/$/, '') || '/';
        const date = lastmod(pathname);
        const links = alternates(pathname);
        return { ...item, ...(date ? { lastmod: date } : {}), ...(links.length ? { links } : {}) };
      },
    }),
  ],
  vite: {
    plugins: [apiDev],
    // The CSP in vercel.json has script-src 'self': never inline a script or asset.
    build: { assetsInlineLimit: 0 },
  },
});
