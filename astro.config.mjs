import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://slagerij-john.be',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
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
