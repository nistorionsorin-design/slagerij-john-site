// The assistant when /api/ask is held or fails — the browser check of row 11e (4) (the live fault of 10.11 15:17: a
// layer check that never answered froze the box; Cowork's repro docs/data/measurements/2026-11-10/assistant-hang-repro.json).
// Headless Chrome with a phone profile on the built site (dist, served by scripts/routes.mjs --serve, no key read): the
// two requests to /api/ask are answered, failed or held in the browser, and two typed questions go into the box on
// /bestellen, as on Dan's phone. Every case: both questions get an answer — within 4 s, 13 s while a POST is held — and
// the page throws nothing.
//   get-off      GET answers {"on":false}                → the local engine answers both; no POST
//   get-fail     GET fails (network error)              → the local engine answers both
//   get-hang     GET never answers                      → after ≤ 2,5 s the local engine answers; asked again for the 2nd
//   post-fail    GET {"on":true}, POST fails            → the local engine answers both, silently
//   post-hang    GET {"on":true}, POST never answers    → the local engine answers after the 12 s deadline, each time
// and two more: get-hang-then-on (the first check held, the second answers {"on":true} → the label switches and the 2nd
// question is answered by the layer) and no-abortsignal-timeout (an older browser without AbortSignal.timeout → the
// layer still answers).
//   npm run build && node scripts/assistant-hang.mjs [--out <file.json>]
// Needs Chrome and puppeteer-core (not a dependency of the site): `import('puppeteer-core')`, else $PUPPETEER_CORE, else
// the npx cache (npx puppeteer-core once fills it); Chrome from $CHROME or its default Windows path.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;

async function loadPuppeteer() {
  try {
    return (await import('puppeteer-core')).default;
  } catch {
    /* not installed here */
  }
  const cands = [];
  if (process.env.PUPPETEER_CORE) cands.push(process.env.PUPPETEER_CORE);
  const npx = join(process.env.LOCALAPPDATA ?? join(process.env.HOME ?? '', '.npm'), 'npm-cache', '_npx');
  if (existsSync(npx)) for (const d of readdirSync(npx)) cands.push(join(npx, d, 'node_modules', 'puppeteer-core', 'lib', 'puppeteer', 'puppeteer-core.js'));
  for (const c of cands) if (existsSync(c)) return (await import(pathToFileURL(c).href)).default;
  throw new Error('puppeteer-core not found: npx puppeteer-core --version once, or set PUPPETEER_CORE');
}
const puppeteer = await loadPuppeteer();
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// the built site, as Vercel serves it
const port = 4339;
const server = spawn(process.execPath, [join(root, 'scripts', 'routes.mjs'), '--serve', String(port)], { cwd: root, stdio: 'ignore' });
const base = `http://localhost:${port}`;
for (let i = 0; ; i++) {
  try {
    if ((await fetch(base + '/bestellen')).ok) break;
  } catch {
    /* not up yet */
  }
  if (i > 50) throw new Error('routes.mjs --serve did not start');
  await new Promise((r) => setTimeout(r, 200));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ON = JSON.stringify({ on: true });
const OFF = JSON.stringify({ on: false });
// a layer answer as api/ask.js streams it (NDJSON): one delta, then the reply
const stream = (text) =>
  [{ t: 'wait' }, { t: 'delta', d: text }, { t: 'done', reply: { lang: 'nl', face: 'answer', lines: [[{ t: text }]], cards: [], chips: [], acts: [], link: null }, st: {} }].map((e) => JSON.stringify(e)).join('\n') + '\n';
const LAYER_TEXT = 'Antwoord van de laag (test).';

const cases = [
  { name: 'get-off', get: ['off'], post: 'none', limit: 4000 },
  { name: 'get-fail', get: ['fail'], post: 'none', limit: 4000 },
  { name: 'get-hang', get: ['hang'], post: 'none', limit: 4000 },
  { name: 'post-fail', get: ['on'], post: 'fail', limit: 4000 },
  { name: 'post-hang', get: ['on'], post: 'hang', limit: 13000 },
  { name: 'get-hang-then-on', get: ['hang', 'on'], post: 'stream', limit: 4000, layerSecond: true },
  { name: 'no-abortsignal-timeout', get: ['on'], post: 'stream', limit: 4000, old: true, layerBoth: true },
];
const questions = ['In romana', 'Wat kost colli John?'];

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-first-run'] });
const results = [];
for (const c of cases) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36');
  await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message ?? e)));
  if (c.old) await page.evaluateOnNewDocument(() => delete AbortSignal.timeout);
  let gets = 0;
  let posts = 0;
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.pathname !== '/api/ask') return req.continue();
    if (req.method() === 'GET') {
      const how = c.get[Math.min(gets++, c.get.length - 1)];
      if (how === 'hang') return; // held: never answered
      if (how === 'fail') return req.abort('failed');
      return req.respond({ status: 200, contentType: 'application/json', body: how === 'on' ? ON : OFF });
    }
    posts++;
    if (c.post === 'hang') return;
    if (c.post === 'fail' || c.post === 'none') return req.abort('failed');
    return req.respond({ status: 200, contentType: 'application/x-ndjson', body: stream(LAYER_TEXT) });
  });
  await page.goto(base + '/bestellen', { waitUntil: 'load' });
  const row = { case: c.name, answers: [], errors, ok: true };
  for (const [i, q] of questions.entries()) {
    const before = await page.$$eval('section.qa .qa__msg--bot', (l) => l.length);
    await page.$eval('section.qa .qa__in', (inp, q) => {
      inp.focus();
      inp.value = q;
      inp.form.requestSubmit();
    }, q);
    const t0 = Date.now();
    const got = await page
      .waitForFunction(
        (n) => {
          const bots = document.querySelectorAll('section.qa .qa__msg--bot');
          const last = bots[bots.length - 1];
          return bots.length > n && !last.classList.contains('qa__msg--wait') && last.querySelector('.qa__bub').textContent.trim().length > 0;
        },
        { timeout: c.limit + 2000, polling: 50 },
        before,
      )
      .then(() => true)
      .catch(() => false);
    const ms = Date.now() - t0;
    const text = await page.$$eval('section.qa .qa__msg--bot', (l) => l[l.length - 1].querySelector('.qa__bub').textContent.trim().slice(0, 90));
    const fromLayer = text.includes(LAYER_TEXT);
    const wantLayer = c.layerBoth || (c.layerSecond && i === 1);
    const ok = got && ms <= c.limit && fromLayer === !!wantLayer;
    row.answers.push({ q, answered: got, ms, from: fromLayer ? 'layer' : 'local engine', text, ok });
    if (!ok) row.ok = false;
    await sleep(150);
  }
  row.label = await page.$eval('section.qa .qa__auto', (e) => (e.textContent.includes('AI') || e.textContent.includes('artificial') ? 'AI' : '11b')).catch(() => '?');
  row.gets = gets;
  row.posts = posts;
  if (errors.length) row.ok = false;
  if (c.name === 'get-off' && posts) row.ok = false; // „off” stays off: no question goes to the layer
  if (c.name === 'get-hang-then-on' && row.label !== 'AI') row.ok = false; // the label switched in the same visit
  results.push(row);
  console.log(`${row.ok ? '✓' : '✗'} ${c.name.padEnd(24)} ${row.answers.map((a) => `${a.answered ? a.ms + ' ms' : 'NO ANSWER'} (${a.from})`).join(' · ')} · label ${row.label} · GET ×${gets} POST ×${posts}${errors.length ? ' · errors: ' + errors.join(' | ') : ''}`);
  await ctx.close();
}
await browser.close();
server.kill();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} cases passed`);
if (outFile) writeFileSync(outFile, JSON.stringify({ _source: `scripts/assistant-hang.mjs on ${new Date().toISOString()} — dist via routes.mjs --serve, headless Chrome, phone 360×740 DPR 3 [MEASURED-OURS] local`, results }, null, 1));
process.exit(passed === results.length ? 0 : 1);
