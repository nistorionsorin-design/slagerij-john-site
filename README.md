# slagerij-john-site

Website of Slagerij John (slagerij-john.be). Astro, static output, NL at `/`, RO at `/ro`.

```
npm install
npm run dev      # local preview
npm run build    # static site in dist/
npm run gate     # astro check + build + the build-gate checks; exit 1 on any failure
```

- `src/data/*.json` — entity, hours, products, delivery, FAQ, photos, reviews. The pages and the JSON-LD read from these files; nothing is typed twice.
- `src/content/nl`, `src/content/ro` — page texts.
- `src/components` — Hero, PhotoLoop, CounterTag, Stamp, OpenChip, BottomBar, Hours, Reviews, QaBox (the only client script), OrderSlip, LangSwitch.
- `src/styles/tokens.css` — design tokens.
- `vercel.json` — security headers, cache, redirects. Hosting: Vercel, framework preset Astro.
- Fonts are self-hosted (`@fontsource-variable`); the site makes no third-party request.
