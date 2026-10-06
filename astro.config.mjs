import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
    // The CSP in vercel.json has script-src 'self': never inline a script or asset.
    build: { assetsInlineLimit: 0 },
  },
});
