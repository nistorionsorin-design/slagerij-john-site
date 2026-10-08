// Build gate — docs/qa.md §1. Runs astro check + astro build, then inspects dist/.
// FAIL = exit 1. WARN = the check cannot bite yet (stub data, nothing mounted)
// or needs a browser/deployed URL; it never hides a failure on real content.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// --release (before a push to main): placeholders FAIL. Default (dev, preview branch): they
// WARN — docs/build-plan.md §0 allows them in dev and on `preview`, never on `main`.
const RELEASE = process.argv.includes('--release');
const dist = join(root, 'dist');
const OWN_HOST = 'slagerij-john.be';
const GEO = { latitude: 51.041, longitude: 3.2185 };

const results = [];
const pass = (id, msg) => results.push({ s: 'PASS', id, msg });
const warn = (id, msg) => results.push({ s: 'WARN', id, msg });
const fail = (id, msg) => results.push({ s: 'FAIL', id, msg });
const verdict = (id, errors, okMsg) => (errors.length ? fail(id, errors.join('\n         ')) : pass(id, okMsg));

const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : [p];
      })
    : [];
const read = (p) => readFileSync(p, 'utf8');
const rel = (p) => relative(root, p).replaceAll('\\', '/');
const json = (name) => JSON.parse(read(join(root, 'src/data', name)));
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1];
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const visibleText = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');

// 1 — astro check + astro build
function run(id, args) {
  const r = spawnSync('npx', ['astro', ...args], { cwd: root, shell: true, encoding: 'utf8' });
  if (r.status === 0) return pass(id, `astro ${args.join(' ')}`), true;
  fail(id, `astro ${args.join(' ')} exited ${r.status}\n${(r.stdout + r.stderr).trim().split('\n').slice(-15).join('\n')}`);
  return false;
}
const built = run('check', ['check']) && run('build', ['build']);

if (built) {
  const pages = walk(dist)
    .filter((f) => f.endsWith('.html'))
    .map((f) => {
      const html = read(f);
      const file = rel(f).replace(/^dist\//, '');
      const url = 'https://' + OWN_HOST + '/' + file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
      return { file, url: url.endsWith('/') && file !== 'index.html' ? url.slice(0, -1) : url, html, is404: file === '404.html' };
    });
  const content = pages.filter((p) => !p.is404);
  const byUrl = new Map(content.map((p) => [p.url, p]));

  // 2 — one h1, title ≤ 60, meta description ≤ 155
  {
    const e = [];
    for (const p of pages) {
      const h1 = (p.html.match(/<h1[\s>]/gi) || []).length;
      if (h1 !== 1) e.push(`${p.file}: ${h1} <h1>`);
      const title = decode(p.html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '').trim();
      if (!title) e.push(`${p.file}: no <title>`);
      else if (title.length > 60) e.push(`${p.file}: title ${title.length} chars`);
      const mt = p.html.match(/<meta\s+name="description"[^>]*>/i)?.[0];
      const desc = decode((mt && attr(mt, 'content')) || '').trim();
      if (!desc) e.push(`${p.file}: no meta description`);
      else if (desc.length > 155) e.push(`${p.file}: description ${desc.length} chars`);
    }
    verdict('head', e, `${pages.length} pages: one h1, title ≤ 60, description ≤ 155`);
    const stubs = content.filter((p) => {
      const title = p.html.match(/<title>([^<]*)<\/title>/i)?.[1];
      const mt = p.html.match(/<meta\s+name="description"[^>]*>/i)?.[0];
      return mt && attr(mt, 'content') === title;
    });
    if (stubs.length) warn('head-copy', `title = description on ${stubs.map((p) => p.file).join(', ')} — stub strings, lexicon §5–6 not applied yet`);
  }

  // 3 — hreflang nl-BE / ro-BE / x-default, reciprocal; canonical self-referencing
  {
    const e = [];
    const alts = (html) =>
      Object.fromEntries((html.match(/<link\s+rel="alternate"[^>]*>/gi) || []).map((t) => [attr(t, 'hreflang'), attr(t, 'href')]));
    for (const p of content) {
      const canon = attr(p.html.match(/<link\s+rel="canonical"[^>]*>/i)?.[0] ?? '', 'href');
      if (canon !== p.url) e.push(`${p.file}: canonical ${canon} ≠ ${p.url}`);
      const a = alts(p.html);
      for (const k of ['nl-BE', 'ro-BE', 'x-default']) if (!a[k]) e.push(`${p.file}: hreflang ${k} missing`);
      if (Object.keys(a).some((k) => !['nl-BE', 'ro-BE', 'x-default'].includes(k))) e.push(`${p.file}: unexpected hreflang ${Object.keys(a)}`);
      const lang = p.html.match(/<html[^>]*\slang="([^"]+)"/i)?.[1];
      if (!a[lang] || a[lang] !== p.url) e.push(`${p.file}: <html lang="${lang}"> but hreflang ${lang} → ${a[lang]}`);
      if (a['x-default'] !== a['nl-BE']) e.push(`${p.file}: x-default ≠ nl-BE`);
      for (const k of ['nl-BE', 'ro-BE']) {
        const other = byUrl.get(a[k]);
        if (!other) e.push(`${p.file}: hreflang ${k} → ${a[k]} is not a built page`);
        else if (alts(other.html)[lang] !== p.url) e.push(`${p.file}: ${a[k]} does not link back`);
      }
    }
    verdict('hreflang', e, `${content.length} pages: canonical + reciprocal nl-BE / ro-BE / x-default`);
  }

  // 4 — JSON-LD
  {
    const e = [];
    const nodes = [];
    for (const p of content) {
      const blocks = [...p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
      if (!blocks.length) e.push(`${p.file}: no JSON-LD`);
      for (const b of blocks) {
        try {
          const j = JSON.parse(b[1]);
          for (const n of [j].flat().flatMap((x) => x['@graph'] ?? x)) nodes.push({ p, n });
        } catch (err) {
          e.push(`${p.file}: JSON-LD does not parse (${err.message})`);
        }
      }
    }
    const types = (n) => [n['@type']].flat();
    const flat = JSON.stringify(nodes.map((x) => x.n));
    if (/"aggregateRating"|"@type":"Review"/.test(flat)) e.push('aggregateRating / Review present (self-serving, S-03)');
    const entity = json('entity.json');
    const hours = json('hours.json');
    const products = json('products.json');
    const shops = nodes.filter((x) => types(x.n).includes('ButcherShop'));
    if (!entity.name) {
      warn('jsonld-shop', 'entity.json is empty → no ButcherShop emitted; geo / hours / areaServed checks not exercised');
    } else {
      for (const p of content) if (!shops.some((s) => s.p === p)) e.push(`${p.file}: no ButcherShop`);
      for (const { p, n } of shops) {
        if (n.geo?.latitude !== GEO.latitude || n.geo?.longitude !== GEO.longitude)
          e.push(`${p.file}: geo ${n.geo?.latitude}, ${n.geo?.longitude} ≠ ${GEO.latitude}, ${GEO.longitude}`);
        if ('servesCuisine' in n) e.push(`${p.file}: servesCuisine on ButcherShop`);
        if (!n.areaServed?.length) e.push(`${p.file}: areaServed empty`);
        if (!n.knowsLanguage?.length) e.push(`${p.file}: knowsLanguage empty`);
        const want = hours.regular.reduce((t, d) => t + d.slots.length, 0);
        if (!want || (n.openingHoursSpecification?.length ?? 0) !== want)
          e.push(`${p.file}: openingHoursSpecification has ${n.openingHoursSpecification?.length ?? 0} entries, hours.json has ${want} slots`);
      }
    }
    if (!products.items.length) {
      warn('jsonld-product', 'products.json is empty → Product / UnitPriceSpecification KGM check not exercised');
    } else {
      const prods = nodes.filter((x) => types(x.n).includes('Product'));
      if (!prods.length) e.push('products.json has items but no Product node is emitted');
      const perKg = products.items.filter((i) => i.unit === 'kg').length;
      const kgm = prods.filter((x) => JSON.stringify(x.n).includes('"unitCode":"KGM"')).length;
      if (perKg && !kgm) e.push('per-kg products exist but no UnitPriceSpecification with unitCode KGM');
    }
    const sub = content.filter((p) => !/^(index|ro)\.html$/.test(p.file));
    for (const p of sub)
      if (!nodes.some((x) => x.p === p && types(x.n).includes('BreadcrumbList'))) e.push(`${p.file}: no BreadcrumbList`);
    verdict('jsonld', e, 'JSON-LD parses on every page; no aggregateRating / Review / servesCuisine');
  }

  // 5 — zero third-party requests
  {
    const e = [];
    const offsite = (u) => /^(https?:)?\/\//i.test(u) && !new RegExp(`^(https?:)?//(www\\.)?${OWN_HOST.replace('.', '\\.')}(/|$)`, 'i').test(u);
    for (const p of pages) {
      for (const tag of p.html.match(/<(script|img|source|iframe|video|audio|embed|object|link)\b[^>]*>/gi) || []) {
        if (/^<link/i.test(tag) && /rel="(canonical|alternate)"/i.test(tag)) continue;
        const urls = [attr(tag, 'src'), attr(tag, 'href'), attr(tag, 'poster'), attr(tag, 'data'), ...(attr(tag, 'srcset') ?? '').split(',').map((s) => s.trim().split(/\s+/)[0])];
        for (const u of urls.filter(Boolean)) if (offsite(u)) e.push(`${p.file}: ${u}`);
      }
      for (const m of p.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>|style="([^"]*)"/gi))
        for (const u of (m[1] ?? m[2]).matchAll(/url\(\s*['"]?([^'")]+)/gi)) if (offsite(u[1])) e.push(`${p.file}: css ${u[1]}`);
    }
    for (const f of walk(dist).filter((f) => /\.(css|js|mjs)$/.test(f))) {
      const src = read(f);
      const hits = f.endsWith('.css')
        ? [...src.matchAll(/url\(\s*['"]?([^'")]+)/gi), ...src.matchAll(/@import\s+['"]([^'"]+)/gi)].map((m) => m[1]).filter(offsite)
        : src.match(/https?:\/\/[a-z0-9.-]*(google|gstatic|supabase|doubleclick|facebook|hotjar|clarity)[a-z0-9.-]*/gi) || [];
      for (const u of hits) e.push(`${rel(f)}: ${u}`);
      if (f.endsWith('.css') && /url\(\s*['"]?data:font/i.test(src)) e.push(`${rel(f)}: inlined font`);
    }
    for (const p of pages) if (/<style[^>]*>[\s\S]*?url\(\s*['"]?data:font/i.test(p.html)) e.push(`${p.file}: inlined font in <style>`);
    const fonts = walk(dist).filter((f) => /\.woff2?$/.test(f));
    if (fonts.some((f) => !rel(f).startsWith('dist/_astro/'))) e.push('font file outside /_astro/');
    if (!fonts.length) e.push('no self-hosted font files in dist/_astro/');
    verdict('third-party', e, `0 off-site requests in ${pages.length} pages + assets; ${fonts.length} font files, all in /_astro/`);
  }

  // 6 — images
  {
    const e = [];
    let n = 0;
    const photos = json('photos.json');
    for (const p of pages) {
      for (const tag of p.html.match(/<img\b[^>]*>/gi) || []) {
        n++;
        const src = attr(tag, 'src') ?? '';
        if (!attr(tag, 'width') || !attr(tag, 'height')) e.push(`${p.file}: ${src} without width/height`);
        // a bare `alt` (Astro's rendering of alt="") is a valid empty alt
        if (attr(tag, 'alt') === undefined && !/\salt(?=[\s/>])/i.test(tag)) e.push(`${p.file}: ${src} without alt`);
        const hero = attr(tag, 'fetchpriority') === 'high';
        if (!hero && attr(tag, 'loading') !== 'lazy') e.push(`${p.file}: ${src} not lazy`);
        if (!/\.(avif|webp|svg)(\?|$)/i.test(src)) e.push(`${p.file}: ${src} is not AVIF/WebP`);
      }
      if ((p.html.match(/fetchpriority="high"/gi) || []).length > 1) e.push(`${p.file}: more than one fetchpriority=high`);
    }
    for (const ph of [...photos.hero, ...photos.loop, ...photos.gallery, ...(photos.traiteur ?? [])])
      if (!ph.alt?.nl?.trim() || !ph.alt?.ro?.trim()) e.push(`photos.json: ${ph.src} lacks alt NL/RO`);
    verdict('images', e, `${n} <img>: width/height, alt, lazy, AVIF/WebP`);
    if (!n) warn('images-empty', 'no images built yet → hero ≤ 90 kB mobile is not exercised');
    else warn('hero-weight', 'hero frame ≤ 90 kB mobile: check the served variant in the browser, not automated here');
  }

  // 7 — placeholders (C-04). Any [UPPER-CASE] token ([PRIJS], [KOOKLIJN], [ALT RO], …),
  // the {TEL}-style braces of the lexicon, or lorem. WARN in dev/preview, FAIL with --release.
  {
    const found = new Map();
    const re = /\[[A-ZĂÂÎȘȚ][A-ZĂÂÎȘȚ0-9 -]+\]|\{(?:TEL|NUME|DATUM|DATA|PRIJS)\}|[Ll]orem/g;
    const scan = (label, text) => {
      for (const m of text.matchAll(re)) found.set(label, new Set([...(found.get(label) ?? []), m[0]]));
    };
    for (const p of pages) scan(p.file, p.html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, ' '));
    for (const f of walk(join(root, 'src/content')).filter((f) => /\.(md|mdx)$/.test(f))) scan(rel(f), read(f));
    for (const f of walk(join(root, 'src/data')).filter((f) => f.endsWith('.json'))) scan(rel(f), read(f).replace(/"_source":\s*"(?:[^"\\]|\\.)*"/g, ''));
    // the order mails (stage 5) are written by the functions, not the pages: their strings count too
    for (const f of walk(join(root, 'api')).filter((f) => f.endsWith('.js'))) scan(rel(f), read(f).replace(/^\s*\/\/.*$/gm, ''));
    const list = [...found].map(([k, v]) => `${k}: ${[...v].join(' ')}`);
    if (!list.length) pass('placeholders', 'no placeholder string in dist/, src/content/, src/data/');
    else if (RELEASE) fail('placeholders', list.join('\n         '));
    else warn('placeholders', `in ${list.length} files — allowed in dev/preview, FAIL under --release:\n         ${list.join('\n         ')}`);
  }

  // 8 — RO lint (mechanical subset of the Romanian bible §16)
  {
    const e = [];
    // `dashText`: the rule is „no em/en dash in RO body” (CLAUDE.md) — a page's <title> is head, not body, and keeps the
    // separator lexicon §6 gives it („Comandă online – ridicare sau livrare | Măcelăria John”); every other test reads it
    const lint = (label, text, dashText = text) => {
      if (/[şţŞŢ]/.test(text)) e.push(`${label}: cedilla ş/ţ — use comma-below ș/ț`);
      if (/"/.test(text)) e.push(`${label}: straight double quote — use „…”`);
      if (/[“]/.test(text)) e.push(`${label}: “ — Romanian opens with „`);
      if (/[–—]/.test(dashText)) e.push(`${label}: en/em dash in body`);
      // a numeral followed by a proper noun (postal code + place: „8750 Zwevezele”) is not a counted noun, nor is a
      // calendar date („pe 24 și 31 decembrie”, stage 7: the day of a month takes no „de”)
      const m = text.match(/(?<![\d.,:/])\b(?:[2-9]\d|\d{3,})\s+(?!de\b|%|€|kg\b|g\b|km\b|m\b|cm\b|ml\b|l\b|min\b|h\b|\p{Lu}|(?:ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\b)\p{L}{3,}/u);
      if (m) e.push(`${label}: numeral ≥ 20 without „de”: «${m[0]}»`);
    };
    const md = walk(join(root, 'src/content/ro')).filter((f) => /\.(md|mdx)$/.test(f));
    for (const f of md) lint(rel(f), read(f).replace(/^---[\s\S]*?---/, '').replace(/```[\s\S]*?```/g, '').replace(/\]\([^)]*\)/g, ']'));
    const roPages = content.filter((p) => /<html[^>]*lang="ro/i.test(p.html));
    for (const p of roPages) lint(p.file, decode(visibleText(p.html)), decode(visibleText(p.html.replace(/<title>[\s\S]*?<\/title>/i, ' '))));
    verdict('ro-lint', e, `${md.length} RO content files + ${roPages.length} built RO pages: diacritics, quotes, dashes, „de”`);
    warn('ro-lint-manual', 'calque / kitsch lists (LR-C, LR-K) live in the Romanian bible outside this repo — reviewed by hand');
  }

  // 9 — NL u-form
  {
    const e = [];
    const re = /\b(je|jij|jou|jouw)\b/i;
    const md = walk(join(root, 'src/content/nl')).filter((f) => /\.(md|mdx)$/.test(f));
    for (const f of md) {
      const m = read(f).replace(/^---[\s\S]*?---/, '').match(re);
      if (m) e.push(`${rel(f)}: «${m[0]}»`);
    }
    const nlPages = pages.filter((p) => /<html[^>]*lang="nl/i.test(p.html));
    for (const p of nlPages) {
      const m = decode(visibleText(p.html.replace(/<[^>]+\slang="ro"[^>]*>[\s\S]*?<\/[a-z]+>/gi, ' '))).match(re);
      if (m) e.push(`${p.file}: «${m[0]}»`);
    }
    verdict('nl-u-form', e, `${md.length} NL content files + ${nlPages.length} built NL pages: no je/jij/jouw`);
  }

  // 10 — 404, sitemap, robots
  {
    const e = [];
    const p404 = pages.find((p) => p.is404);
    if (!p404) e.push('dist/404.html missing');
    else if (!/<meta name="robots" content="noindex"/i.test(p404.html)) e.push('404.html is not noindex');
    const maps = walk(dist).filter((f) => /sitemap-\d+\.xml$/.test(f));
    if (!existsSync(join(dist, 'sitemap-index.xml')) || !maps.length) e.push('sitemap missing');
    const locs = maps.flatMap((f) => [...read(f).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
    for (const l of locs) if (!byUrl.has(l)) e.push(`sitemap lists ${l}, which is not a built page`);
    for (const p of content) if (!locs.includes(p.url)) e.push(`${p.file} not in sitemap`);
    const robots = existsSync(join(dist, 'robots.txt')) ? read(join(dist, 'robots.txt')) : '';
    const dis = [...robots.matchAll(/^Disallow:\s*(.*)$/gim)].map((m) => m[1].trim()).filter(Boolean);
    if (dis.length !== 1 || dis[0] !== '/wa') e.push(`robots.txt Disallow = [${dis}] (want only /wa)`);
    if (!/^Sitemap:\s*https:\/\/slagerij-john\.be\/sitemap-index\.xml/im.test(robots)) e.push('robots.txt lacks the Sitemap line');
    verdict('404-sitemap-robots', e, `404.html built + noindex; sitemap = ${locs.length} built pages; robots blocks only /wa`);
    warn('404-status', 'real 404 status: verify on the deployed URL (curl -I <preview>/does-not-exist)');
  }

  // 11 — motion
  {
    const e = [];
    let mounted = 0;
    for (const p of pages) {
      for (const [cls, name] of [['hero', 'hero'], ['loop', 'photo loop']]) {
        const sec = p.html.match(new RegExp(`<section class="${cls}[\\s"][\\s\\S]*?</section>`, 'i'))?.[0];
        if (!sec) continue;
        mounted++;
        const imgs = (sec.match(/<img\b/gi) || []).length;
        if (imgs > 1 && !/data-pause/.test(sec)) e.push(`${p.file}: ${name} has ${imgs} frames but no pause control`);
        if (cls === 'hero' && imgs && !/<img[^>]*fetchpriority="high"/i.test(sec)) e.push(`${p.file}: first hero frame is not a plain fetchpriority=high <img>`);
      }
    }
    // page CSS is inlined into <style> (astro.config inlineStylesheets: 'always'); read both places
    const css = [
      ...walk(dist).filter((f) => f.endsWith('.css')).map(read),
      ...pages.flatMap((p) => [...p.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])),
    ].join('\n');
    if (!/prefers-reduced-motion:\s*reduce/.test(css)) e.push('no prefers-reduced-motion rule in the built CSS');
    if (/\.hero__bg img[^}]*opacity:\s*0(?![.\d])/.test(css)) e.push('first hero frame starts at opacity 0');
    verdict('motion', e, 'pause control where frames rotate; reduced-motion rule present; first hero frame opacity 1');
    if (!mounted) warn('motion-empty', 'hero and photo loop are not mounted on any page yet');
    warn('motion-manual', 'working pause + reduced-motion stills: verify in the browser');
  }

  // 12 — accessibility (static subset)
  {
    const e = [];
    const tokens = Object.fromEntries([...read(join(root, 'src/styles/tokens.css')).matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
    const lum = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [hi, lo] = [lum(tokens[a]), lum(tokens[b])].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const pairs = [['muted', 'paper'], ['muted', 'card'], ['fg', 'paper'], ['ox', 'paper'], ['ox', 'tag'], ['on-accent', 'accent'], ['on-ink', 'ink'], ['on-ink-muted', 'ink']];
    for (const [a, b] of pairs) {
      const r = ratio(a, b);
      if (r < 4.5) e.push(`--${a} on --${b}: ${r.toFixed(2)}:1 < 4.5`);
    }
    if (!/:focus-visible/.test(read(join(root, 'src/styles/tokens.css')))) e.push('no :focus-visible style');
    for (const p of pages) {
      const bar = p.html.match(/<nav class="bar"[\s\S]*?<\/nav>/i)?.[0];
      if (bar && (/<button/i.test(bar) || (bar.match(/<a\s[^>]*href=/gi) || []).length !== 3)) e.push(`${p.file}: bottom bar must be three real <a href>`);
      const qa = p.html.match(/<section class="qa"[\s\S]*?<\/section>/i)?.[0];
      if (qa && !/class="qa__auto"[^>]*>\s*[^<\s]/.test(qa)) e.push(`${p.file}: Q&A box lacks the automated-assistant label`);
      if (qa && !/<label[^>]*for="qa-input"/.test(qa)) e.push(`${p.file}: Q&A input has no label`);
    }
    verdict('a11y', e, `${pairs.length} token pairs ≥ 4.5:1; focus-visible; bottom bar and Q&A markup`);
    warn('a11y-manual', 'text over the hero gradient and keyboard operation of the Q&A box: verify in the browser');
  }

  // client JS budget (D-06 one island + D-12 hero loop + D-20 open chip + the header's menu and
  // smart-sticky, build plan stage 0b2 + the bestelbon, stage 5 + the traiteur quote form, stage 6): a script ships only
  // on a page that mounts its component, from /_astro/, never inline (CSP script-src 'self').
  {
    const js = walk(dist).filter((f) => /\.(js|mjs)$/.test(f));
    const inline = pages.filter((p) => /<script(?![^>]*application\/(ld\+)?json)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(p.html.replace(/<script[^>]*src=[^>]*><\/script>/gi, '')));
    const e = inline.map((p) => `${p.file}: inline script (blocked by the CSP in vercel.json)`);
    const mounts = [
      ['Hero', /<section class="hero[\s"]/],
      ['Header', /<header class="sign[\s"]/],
      ['OpenChip', /class="oc[\s"]/],
      ['QaBox', /<section class="qa[\s"]/],
      ['OrderForm', /<form class="order[\s"]/],
      ['QuoteForm', /<form class="qf[\s"]/],
    ];
    for (const p of pages)
      for (const tag of p.html.match(/<script[^>]*\ssrc="[^"]*"[^>]*>/gi) || []) {
        const src = attr(tag, 'src');
        const file = src.split('/').pop();
        const m = mounts.find(([name]) => file.startsWith(name + '.'));
        if (!src.startsWith('/_astro/')) e.push(`${p.file}: ${src} not served from /_astro/`);
        if (!m) e.push(`${p.file}: ${src} belongs to no allowed component (Hero / Header / OpenChip / QaBox / OrderForm / QuoteForm)`);
        else if (!m[1].test(p.html)) e.push(`${p.file}: ships ${file} without its component`);
      }
    verdict('client-js', e, `${js.length} JS files in dist; no inline script; each script ships only with its component`);
  }
}

const icon = { PASS: '✓', WARN: '!', FAIL: '✗' };
for (const r of results) console.log(`${icon[r.s]} ${r.s}  ${r.id.padEnd(20)} ${r.msg}`);
const n = (s) => results.filter((r) => r.s === s).length;
console.log(`\n${n('PASS')} passed · ${n('WARN')} warnings · ${n('FAIL')} failed`);
process.exit(n('FAIL') ? 1 : 0);
