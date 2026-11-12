// Row 12 — Dan's local look at the order screen (D-22), with no Blob store and no mail service:
//   npm run build && node scripts/admin-local.mjs [port] [--archive N]        (default 4340; N default 60)
// Row 12c: N more demo orders go straight into the double (no mail printed) and are walked to „ridicată”, so the tabs
// Ridicate and Toate have archive pages to load (50 running numbers a page) and „Șterge comanda” has cards to erase.
// Serves dist/ (cleanUrls) and the three functions — /api/order, /api/admin, /api/bestelling — over the local double
// of the store (src/lib/order-store.js memoryAdapter, in this process's memory only). Four demo orders go in through the
// real /api/order; the mails it would send are printed here, never sent (Resend is stubbed). A throwaway passphrase
// and the step and status links of the first order are printed to this terminal (never written to a file); they work
// only on this local server and are gone when it stops (Ctrl+C). Production is untouched: no key, token or store.
// Over the LAN (Dan's phone, http://<laptop-ip>:<port>) the cookie's Secure flag is dropped by this server only — a
// browser refuses a Secure cookie on plain http outside localhost; production keeps it.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const args = process.argv.slice(2);
const port = Number(args.find((a) => /^\d+$/.test(a) && args[args.indexOf(a) - 1] !== '--archive') ?? 4340);
const archiveN = args.includes('--archive') ? Number(args[args.indexOf('--archive') + 1]) : 60;
for (const k of ['BLOB_READ_WRITE_TOKEN', 'RESEND_API_KEY', 'METRICS_URL', 'METRICS_KEY', 'VERCEL', 'VERCEL_ENV', 'ORDER_DRY_RUN']) delete process.env[k];

const { memoryAdapter, claim, step, readOrder } = await import('../src/lib/order-store.js');
const { hashPass, newSecret, signStep, signStatus } = await import('../src/lib/order-sign.js');
const { daysFor } = await import('../src/lib/order-core.js');
const data = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));

const WORDS = ['toog', 'mici', 'spiering', 'colli', 'braadworst', 'gehakt', 'stoofvlees', 'kipfilet', 'pastrami', 'gourmet', 'fondue', 'tapas'];
const pass = Array.from({ length: 4 }, () => WORDS[randomInt(WORDS.length)]).join(' ');
Object.assign(process.env, { ADMIN_SECRET: newSecret(), ADMIN_PASS_HASH: await hashPass(pass), RESEND_API_KEY: 'local-stub', ORDER_MAIL_FROM: 'bestellingen@example.invalid', ORDER_MAIL_TO: 'winkel@example.invalid' });

// Resend, stubbed: the mail is printed, not sent
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.resend.com/')) {
    const m = JSON.parse(init.body);
    console.log(`\n── mail (not sent) to ${m.to[0]} · ${m.subject}\n${m.text}\n`);
    return new Response('{"id":"local"}', { status: 200 });
  }
  return realFetch(url, init);
};

const store = memoryAdapter();
const api = {
  order: await import('../api/order.js'),
  admin: await import('../api/admin.js'),
  bestelling: await import('../api/bestelling.js'),
};
for (const m of Object.values(api)) m.hooks.store = store;

// four demo orders through the real function
const hours = data('hours.json');
const delivery = data('delivery.json');
const pickup = daysFor('pickup', hours, delivery, new Date());
const deliv = daysFor('delivery', hours, delivery, new Date());
const demo = [
  { lang: 'nl', method: 'pickup', date: pickup[0].date, time: pickup[0].times[2], items: { 'colli-john': 1, mici: 1 }, name: 'Demo Peeters', phone: '0470 11 22 33', email: 'demo1@example.invalid', remarks: 'Graag in stukken van 500 g.' },
  { lang: 'ro', method: 'pickup', date: pickup[1].date, time: pickup[1].times[0], items: { mici: 2, 'gerookte-worst': 1 }, name: 'Demo Popescu', phone: '0470 44 55 66', email: 'demo2@example.invalid', remarks: '' },
  { lang: 'nl', method: 'delivery', date: deliv[0].date, time: deliv[0].times[0], items: { 'colli-varken-2': 1 }, name: 'Demo Vermeulen', phone: '0470 77 88 99', email: 'demo3@example.invalid', remarks: '', address: { street: 'Demostraat', nr: '1', postcode: '8750', place: 'Wingene' } },
  { lang: 'nl', method: 'pickup', date: pickup[0].date, time: pickup[0].times[6] ?? pickup[0].times[0], items: { 'colli-kip': 1 }, name: 'Demo Claes', phone: '0470 12 12 12', email: 'demo4@example.invalid', remarks: '' },
];
const refs = [];
for (const [i, o] of demo.entries()) {
  const r = await api.order.default.fetch(new Request(`http://localhost:${port}/api/order`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${i + 1}` }, body: JSON.stringify(o) }));
  refs.push((await r.json()).ref);
}
// row 12c: the archive — copies of the first demo order, picked up (straight into the double: no mail, no print)
{
  const { v, ref, n, year, receivedAt, status, history, sent, changedAt, ...base } = await readOrder(store, refs[0]);
  void [v, ref, n, year, receivedAt, status, history, sent, changedAt];
  for (let i = 1; i <= archiveN; i++) {
    const o = await claim(store, { ...base, name: `Demo Archief ${i}`, email: `archief${i}@example.invalid`, remarks: '' });
    for (const to of ['confirmata', 'in-lucru', 'gata', 'ridicata']) await step(store, o.ref, to);
  }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.pdf': 'application/pdf' };
const fileFor = (path) => {
  const p = decodeURIComponent(path).replace(/\/+$/, '') || '/';
  for (const c of [p === '/' ? '/index.html' : p, `${p}.html`, `${p}/index.html`]) {
    const f = join(dist, c);
    if (f.startsWith(dist) && existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fn = /^\/api\/(order|admin|bestelling)$/.exec(url.pathname)?.[1];
    if (fn) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      const r = await api[fn].default.fetch(new Request(url, { method: req.method, headers, ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) }));
      const out = {};
      r.headers.forEach((v, k) => (out[k] = k === 'set-cookie' && !/^(localhost|127\.0\.0\.1)$/.test(url.hostname) ? v.replace('; Secure', '') : v));
      res.writeHead(r.status, out);
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    const f = fileFor(url.pathname);
    if (!f) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('404');
    }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(f));
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end();
  }
}).listen(port, () => {
  const q = (o) => new URLSearchParams(o).toString();
  console.log(`\nLocal order screen (a store double in memory — nothing is stored or sent):`);
  console.log(`  http://localhost:${port}/admin              passphrase (this server only): ${pass}`);
  console.log(`  demo orders: ${refs.join(' · ')}`);
  if (archiveN) console.log(`  + ${archiveN} demo orders already picked up (tabs Ridicate / Toate, loaded page by page)`);
  console.log(`  step link „E gata” of ${refs[0]}:  http://localhost:${port}/admin/pas?${q(signStep(process.env.ADMIN_SECRET, refs[0], 'gata'))}`);
  console.log(`  status page of ${refs[0]}:        http://localhost:${port}/bestelling?${q(signStatus(process.env.ADMIN_SECRET, refs[0]))}`);
  console.log(`  status page of ${refs[1]} (RO):   http://localhost:${port}/bestelling?${q(signStatus(process.env.ADMIN_SECRET, refs[1]))}`);
  console.log('Ctrl+C stops it; everything above is gone with it.\n');
});
