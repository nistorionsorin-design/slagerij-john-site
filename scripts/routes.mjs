// Local replay of vercel.json routing against dist/ (row 13) — `astro preview` knows nothing of vercel.json, so the
// old-URL redirects, the 410s and the RO 404 are tested here before a push (D-22), and once more on the deployed URL.
//
//   npm run build && node scripts/routes.mjs          test table (exit 1 on any failure)
//   node scripts/routes.mjs --serve [port]            keep the replay running (default 4330) to click through
//
// Vercel's order, as far as this site uses it: trailingSlash false (308) → redirects (query string passes through)
// → filesystem (cleanUrls: /x serves x.html; api/<name>.js answers /api/<name>) → rewrites → dist/404.html with 404.
// The old URLs come from ../docs/data/old-urls.json (Dan's working folder, never pushed) when it is there, otherwise
// from vercel.json itself.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const v = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

// path-to-regexp, the subset vercel.json uses here: literal segments, /:name, /:name* (zero or more segments)
const matcher = (source) =>
  new RegExp('^' + source.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\/:(\w+)\*/g, '(?:/(?<$1>.*))?').replace(/\/:(\w+)/g, '/(?<$1>[^/]+)') + '$');
const fill = (dest, groups = {}) => dest.replace(/:(\w+)\*?/g, (_, k) => groups[k] ?? '');
const file = (p) => {
  const f = join(dist, decodeURIComponent(p));
  return f.startsWith(dist) && existsSync(f) && statSync(f).isFile() ? f : null;
};
const fn = (p) => {
  const m = p.match(/^\/api\/([\w-]+)$/);
  return m && existsSync(join(root, 'api', `${m[1]}.js`)) ? join(root, 'api', `${m[1]}.js`) : null;
};

async function callFunction(path, query, req, origin) {
  const mod = await import(pathToFileURL(path).href);
  const headers = {};
  for (const [k, val] of Object.entries(req.headers)) if (typeof val === 'string') headers[k] = val;
  const r = await mod.default.fetch(new Request(`${origin}${query}`, { method: req.method, headers }));
  return { status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer()) };
}

async function route(req, origin) {
  const url = new URL(req.url, origin);
  const p = url.pathname;
  const send = (status, headers, body = '') => ({ status, headers, body });
  const serve = (f, status = 200) => send(status, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' }, readFileSync(f));
  if (v.trailingSlash === false && p.length > 1 && p.endsWith('/')) return send(308, { location: p.slice(0, -1) + url.search });
  for (const r of v.redirects ?? []) {
    const m = p.match(matcher(r.source));
    if (!m) continue;
    const to = new URL(fill(r.destination, m.groups), origin);
    for (const [k, val] of url.searchParams) if (!to.searchParams.has(k)) to.searchParams.append(k, val);
    return send(r.statusCode ?? (r.permanent === false ? 307 : 308), { location: to.pathname + to.search });
  }
  if (v.cleanUrls && p.endsWith('.html')) return send(308, { location: p.slice(0, -5).replace(/\/index$/, '/') || '/' });
  const fsHit = p === '/' ? file('/index.html') : file(p) ?? (v.cleanUrls ? file(`${p}.html`) : null);
  if (fsHit) return serve(fsHit);
  if (fn(p)) return callFunction(fn(p), p + url.search, req, origin);
  for (const r of v.rewrites ?? []) {
    const m = p.match(matcher(r.source));
    if (!m) continue;
    const dest = new URL(fill(r.destination, m.groups), origin);
    for (const [k, val] of url.searchParams) if (!dest.searchParams.has(k)) dest.searchParams.append(k, val);
    if (fn(dest.pathname)) return callFunction(fn(dest.pathname), dest.pathname + dest.search, req, origin);
    const f = file(dest.pathname) ?? file(`${dest.pathname}.html`);
    if (f) return serve(f);
  }
  return serve(join(dist, '404.html'), 404);
}

function start(port) {
  const server = createServer(async (req, res) => {
    try {
      const r = await route(req, `http://localhost:${server.address().port}`);
      res.writeHead(r.status, r.headers);
      res.end(req.method === 'HEAD' ? undefined : r.body);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err?.stack ?? err));
    }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (!existsSync(join(dist, '404.html'))) throw new Error('dist/ is not built: npm run build first');

if (process.argv.includes('--serve')) {
  const port = Number(process.argv[process.argv.indexOf('--serve') + 1]) || 4330;
  await start(port);
  console.log(`vercel.json replay on http://localhost:${port}`);
} else {
  const server = await start(0);
  const origin = `http://localhost:${server.address().port}`;
  const hop = async (path) => {
    const chain = [];
    let at = path;
    for (let i = 0; i < 5; i++) {
      const r = await fetch(origin + at, { redirect: 'manual' });
      chain.push({ at, status: r.status });
      const loc = r.headers.get('location');
      if (r.status >= 300 && r.status < 400 && loc) at = loc;
      else return { chain, final: r.status, body: await r.text(), type: r.headers.get('content-type') ?? '' };
    }
    return { chain, final: 0, body: '' };
  };
  const h1 = (html) => html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, '').trim() ?? '';
  const lang = (html) => html.match(/<html[^>]*\slang="([^"]+)"/i)?.[1] ?? '';

  const oldFile = join(root, '..', 'docs', 'data', 'old-urls.json');
  const old = existsSync(oldFile)
    ? JSON.parse(readFileSync(oldFile, 'utf8'))
    : { same: [], redirects: v.redirects.filter((r) => r.source !== '/sitemap.xml').map((r) => ({ from: r.source, to: r.destination })), gone: v.rewrites.filter((r) => r.destination.includes('code=410') && !r.source.includes(':')).map((r) => ({ from: r.source })) };

  const rows = [];
  const check = async (kind, path, want, test) => {
    const r = await hop(path);
    const got = r.chain.map((c) => `${c.status} ${c.at}`).join(' → ');
    const why = test(r);
    rows.push({ kind, path, want, got: got + (r.chain.length > 1 ? ` (${r.chain.length - 1} hop)` : ''), ok: !why, why });
  };
  const oneHop = (to) => (r) =>
    r.chain.length !== 2 ? `${r.chain.length - 1} hops` : r.chain[0].status !== 301 ? `first status ${r.chain[0].status}` : r.chain[1].at !== to ? `lands on ${r.chain[1].at}` : r.final !== 200 ? `final ${r.final}` : '';

  for (const s of old.same) await check('same', s, '200', (r) => (r.chain.length === 1 && r.final === 200 ? '' : `got ${r.final} after ${r.chain.length - 1} hops`));
  for (const x of old.redirects) await check('301', x.from, `301 → ${x.to} 200`, oneHop(x.to));
  await check('301+query', '/order?product=mici&src=fb', '301 → /bestellen?product=mici&src=fb 200', oneHop('/bestellen?product=mici&src=fb'));
  await check('301', '/sitemap.xml', '301 → /sitemap-index.xml 200', oneHop('/sitemap-index.xml'));
  const gone = [...old.gone.map((g) => g.from), '/account/orders/12', '/ro/account/setari'];
  for (const g of gone) {
    const ro = g.startsWith('/ro/');
    await check('410', g, `410 ${ro ? 'RO' : 'NL'} page`, (r) =>
      r.chain.length !== 1 || r.final !== 410 ? `got ${r.final}` : lang(r.body) !== (ro ? 'ro-BE' : 'nl-BE') ? `lang ${lang(r.body)}` : !/noindex/.test(r.body) ? 'not noindex' : '');
  }
  const nf = (wantLang, wantH1) => (r) =>
    r.chain.length !== 1 || r.final !== 404 ? `got ${r.final}` : lang(r.body) !== wantLang ? `lang ${lang(r.body)}` : h1(r.body) !== wantH1 ? `h1 „${h1(r.body)}”` : (r.body.match(/<h1[\s>]/gi) || []).length !== 1 ? 'h1 count' : !/name="robots" content="noindex"/.test(r.body) ? 'not noindex' : '';
  await check('404', '/nonexistent', '404 NL, h1 „Pagina niet gevonden”', nf('nl-BE', 'Pagina niet gevonden'));
  await check('404', '/ro/nonexistent', '404 RO, h1 „Pagina nu a fost găsită”', nf('ro-BE', 'Pagina nu a fost găsită'));
  await check('404', '/producten/x', '404 NL', nf('nl-BE', 'Pagina niet gevonden'));
  await check('robots', '/robots.txt', '200, Disallow /wa /api/ /admin + Sitemap', (r) =>
    r.final !== 200 ? `got ${r.final}` : ['Disallow: /wa', 'Disallow: /api/', 'Disallow: /admin', 'Sitemap: https://slagerij-john.be/sitemap-index.xml'].filter((l) => !r.body.includes(l)).join(', '));
  await check('sitemap', '/sitemap-0.xml', '200, xhtml:link pairs, no /404 /wa /api', (r) =>
    r.final !== 200 ? `got ${r.final}` : !r.body.includes('<xhtml:link') ? 'no xhtml:link' : /\/404<|\/wa<|\/api\//.test(r.body) ? 'lists an excluded URL' : '');
  const key = (await import('node:fs')).readdirSync(join(root, 'public')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  await check('indexnow', `/${key}`, '200, body = key', (r) => (r.final === 200 && r.body.trim() === key.slice(0, -4) ? '' : `got ${r.final}`));

  console.log('| | kind | old URL | want | got |\n|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.ok ? '✓' : '✗'} | ${r.kind} | \`${r.path}\` | ${r.want} | ${r.got}${r.ok ? '' : ` — **${r.why}**`} |`);
  const bad = rows.filter((r) => !r.ok).length;
  console.log(`\n${rows.length - bad}/${rows.length} pass`);
  server.close();
  process.exit(bad ? 1 : 0);
}
