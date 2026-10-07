import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The two Vercel Functions in api/ (stage 5: the bestelbon's POST /api/order, the /wa redirect) run inside the dev
// server, so the order can be tried locally (D-22) with no Vercel CLI and no extra package. `astro preview` serves
// dist/ only (it takes no Vite plugin): the build is checked there, the sends in `npm run dev`.
// The routes mirror vercel.json (/wa → /api/wa). Production: Vercel builds api/ itself; Astro stays static (D-06).
const apiRoutes = { '/api/order': 'api/order.js', '/api/wa': 'api/wa.js', '/wa': 'api/wa.js' };
const apiMiddleware = (load) => async (req, res, next) => {
  const file = apiRoutes[(req.url ?? '').split('?')[0]];
  if (!file) return next();
  try {
    const mod = await load(file);
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = {};
    for (const k of ['content-type', 'accept', 'x-forwarded-for']) if (req.headers[k]) headers[k] = String(req.headers[k]);
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
      filter: (page) => !page.includes('/404'),
      i18n: {
        defaultLocale: 'nl',
        locales: { nl: 'nl-BE', ro: 'ro-BE' },
      },
    }),
  ],
  vite: {
    plugins: [apiDev],
    // The CSP in vercel.json has script-src 'self': never inline a script or asset.
    build: { assetsInlineLimit: 0 },
  },
});
