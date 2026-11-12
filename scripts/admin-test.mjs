// Row 12 — the tests of docs/admin.md §6, against a local double of the store (src/lib/order-store.js memoryAdapter) and
// a stub of Resend (no mail leaves this machine, no Blob store is touched, no key is read):
//   node scripts/admin-test.mjs [--out result.json] [--v]
// Each case runs the functions themselves (api/order.js · api/admin.js · api/bestelling.js) as Vercel would call them.
// „no token → today's behaviour byte for byte” runs the stage-5 function from git (HEAD:api/order.js, copied to a
// temporary file next to this one and deleted again) beside today's, on the same orders, and compares every response
// and every mail field byte for byte.
// The built pages (dist/) are read for the last cases: run after `npm run build`.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const VERBOSE = args.includes('--v');

// a clean environment: no real key can be used by accident (the store is the double, Resend is the stub)
for (const k of ['BLOB_READ_WRITE_TOKEN', 'RESEND_API_KEY', 'ORDER_MAIL_FROM', 'ORDER_MAIL_TO', 'METRICS_URL', 'METRICS_KEY', 'TWILIO_ACCOUNT_SID', 'VERCEL', 'VERCEL_ENV', 'ORDER_DRY_RUN', 'ADMIN_PASS_HASH', 'ADMIN_SECRET', 'CRON_SECRET']) delete process.env[k];
const { memoryAdapter, sweep, parseRef, pathOf, pagePath, pageOf, INDEX, _flood } = await import('../src/lib/order-store.js');
const { hashPass, newSecret, signStep, signStatus, sessionValue } = await import('../src/lib/order-sign.js');
const { KEEP_FROM } = await import('../src/lib/order-keep.js');
const { daysFor } = await import('../src/lib/order-core.js');
const data = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));
const hours = data('hours.json');
const delivery = data('delivery.json');
const entity = data('entity.json');

const SHOP_TO = 'shop@example.invalid';
const env = () => ({ RESEND_API_KEY: 'test-resend', ORDER_MAIL_FROM: 'bestellingen@example.invalid', ORDER_MAIL_TO: SHOP_TO });
const setEnv = (o) => {
  for (const k of ['RESEND_API_KEY', 'ORDER_MAIL_FROM', 'ORDER_MAIL_TO', 'ADMIN_SECRET', 'ADMIN_PASS_HASH', 'CRON_SECRET', 'ORDER_DRY_RUN', 'BLOB_READ_WRITE_TOKEN']) delete process.env[k];
  Object.assign(process.env, o);
};

// ——— Resend, stubbed: every mail recorded; the shop's can be made to fail ———
const mails = [];
let failShop = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.resend.com/')) {
    const b = JSON.parse(init.body);
    mails.push(b);
    if (failShop && b.to[0] === SHOP_TO) return new Response('{"message":"test failure"}', { status: 500 });
    return new Response('{"id":"test"}', { status: 200 });
  }
  throw new Error(`the test makes no network call (${url})`);
};

const orderApi = await import('../api/order.js');
const adminApi = await import('../api/admin.js');
const statusApi = await import('../api/bestelling.js');

const results = [];
const record = (id, why, got) => {
  results.push({ id, ok: !why.length, ...(why.length ? { why } : {}), ...(got !== undefined ? { got } : {}) });
  console.log(`${why.length ? '✗' : '✓'} ${id}${why.length ? `  ← ${why.join('; ')}` : ''}`);
  if (VERBOSE && got !== undefined) console.log('   ', JSON.stringify(got).slice(0, 400));
};

// ——— orders ———
const at = new Date();
const pickupDay = daysFor('pickup', hours, delivery, at)[0];
const deliveryDay = daysFor('delivery', hours, delivery, at)[0];
let seq = 0;
const orderInput = (o = {}) => {
  const n = ++seq;
  const method = o.method ?? 'pickup';
  const day = method === 'delivery' ? deliveryDay : pickupDay;
  return {
    lang: o.lang ?? 'nl',
    method,
    date: day.date,
    time: day.times[0],
    items: o.items ?? { 'colli-john': 1 },
    requests: [],
    name: `Testklant ${n}`,
    phone: `0470 00 00 ${String(n).padStart(2, '0')}`,
    email: `klant${n}@example.invalid`,
    remarks: o.remarks ?? '',
    ...(method === 'delivery' ? { address: { street: 'Teststraat', nr: String(n), postcode: '8750', place: 'Wingene' } } : {}),
    ref: 'SJ-2026-ABCD',
  };
};
// every order its own address: api/order.js brakes at 6 orders in 10 minutes per address (stage 5)
let ipSeq = 0;
const nextIp = () => `10.12.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;
const post = (api, body, { headers = {}, url = 'https://slagerij-john.be/api/order', ip = nextIp() } = {}) =>
  api.default.fetch(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...headers }, body: JSON.stringify(body) }));
const adminPost = (body, { cookie = '', ip = '203.0.113.1', header = true } = {}) =>
  adminApi.default.fetch(new Request('https://slagerij-john.be/api/admin', { method: 'POST', headers: { 'content-type': 'application/json', ...(header ? { 'x-admin': '1' } : {}), ...(cookie ? { cookie } : {}), 'x-forwarded-for': ip }, body: JSON.stringify(body) }));
const adminGet = (q, { cookie = '', headers = {} } = {}) => adminApi.default.fetch(new Request(`https://slagerij-john.be/api/admin?${new URLSearchParams(q)}`, { headers: { ...(cookie ? { cookie } : {}), ...headers } }));
const statusGet = (q) => statusApi.default.fetch(new Request(`https://slagerij-john.be/api/bestelling?${new URLSearchParams(q)}`));
const body = async (r) => JSON.parse(await r.text());

// the store on: the double, a fresh secret (never a literal), the clock
const SECRET = newSecret();
const CRON = newSecret();
let clock = Date.now();
const store = memoryAdapter({ now: () => clock });
const storeOn = () => {
  setEnv({ ...env(), ADMIN_SECRET: SECRET, CRON_SECRET: CRON });
  orderApi.hooks.store = store;
  adminApi.hooks.store = store;
  statusApi.hooks.store = store;
  for (const h of [orderApi.hooks, adminApi.hooks]) h.now = () => clock;
};
storeOn();

// 1 — five orders posted at once → five different numbers, no gap larger than the failures
{
  mails.length = 0;
  const res = await Promise.all([1, 2, 3, 4, 5].map(() => post(orderApi, orderInput()).then(body)));
  const refs = res.map((r) => r.ref);
  const nums = refs.map((r) => parseRef(r)?.n).sort((a, b) => a - b);
  const why = [];
  if (!res.every((r) => r.ok)) why.push(`not all ok: ${JSON.stringify(res)}`);
  if (new Set(refs).size !== 5) why.push(`references ${refs.join(', ')}`);
  if (nums.join(',') !== '1,2,3,4,5') why.push(`numbers ${nums.join(',')} (want 1–5: no failure, so no gap)`);
  const year = new Date().getFullYear();
  if (!refs.every((r) => new RegExp(`^SJ-${year}-000[1-5]$`).test(r))) why.push(`format ${refs.join(', ')}`);
  const stored = [...store.map.keys()].filter((p) => p !== INDEX).length;
  if (stored !== 5) why.push(`${stored} order blobs`);
  const ix = JSON.parse(store.map.get(INDEX).body);
  if (Object.keys(ix.orders).length !== 5) why.push(`${Object.keys(ix.orders).length} cards in the index`);
  if (Object.values(ix.orders).some((c) => 'email' in c)) why.push('the index keeps an e-mail address');
  const shop = mails.filter((m) => m.to[0] === SHOP_TO);
  if (shop.length !== 5) why.push(`${shop.length} shop mails`);
  if (!shop.every((m) => /Am primit-o: https:\/\/slagerij-john\.be\/admin\/pas\?r=SJ-/.test(m.text) && /O pregătim: /.test(m.text) && /E gata: /.test(m.text))) why.push('a shop mail lacks the three step buttons');
  if (!shop.every((m) => (m.html.match(/\/admin\/pas\?r=/g) ?? []).length === 3)) why.push('the shop mail\'s HTML lacks the three buttons');
  const cust = mails.filter((m) => m.to[0] !== SHOP_TO);
  if (!cust.every((m) => m.text.includes('U krijgt een e-mail zodra wij uw bestelling bevestigd hebben en wanneer ze klaarstaat.') && /Volg uw bestelling: https:\/\/slagerij-john\.be\/bestelling\?r=SJ-/.test(m.text) && !m.text.includes('Wij bevestigen uw bestelling via WhatsApp of telefoon.'))) why.push('a confirmation lacks the §5.40 line or the link');
  if (!cust.every((m) => refs.some((r) => m.subject.includes(r)))) why.push('a confirmation names another reference');
  record('§6 five orders at once → five different numbers, no gap', why, { refs, ops: { ...store.ops } });
}

// 2 — the shop's mail fails → no blob, the customer gets the WhatsApp fallback
{
  const before = [...store.map.keys()].sort().join();
  const ixBefore = store.map.get(INDEX).body;
  failShop = true;
  mails.length = 0;
  const r = await post(orderApi, orderInput());
  const b = await body(r);
  failShop = false;
  const why = [];
  if (r.status !== 502 || b.ok !== false || b.errors?.join() !== 'send') why.push(`answer ${r.status} ${JSON.stringify(b)} (want 502 send: the page offers WhatsApp)`);
  if ([...store.map.keys()].sort().join() !== before) why.push('a blob stayed');
  if (JSON.parse(store.map.get(INDEX).body).orders && Object.keys(JSON.parse(store.map.get(INDEX).body).orders).sort().join() !== Object.keys(JSON.parse(ixBefore).orders).sort().join()) why.push('the index kept the failed order');
  if (mails.some((m) => m.to[0] !== SHOP_TO)) why.push('the customer got a confirmation');
  record('§6 shop mail fails → no blob, the customer sees the WhatsApp fallback', why, { status: r.status, body: b });
}

// 3 — no token → today's behaviour byte for byte (the stage-5 function from git, same orders)
{
  const why = [];
  const tmp = join(root, 'scripts', '.order-head.tmp.mjs');
  try {
    writeFileSync(tmp, execFileSync('git', ['show', 'HEAD:api/order.js'], { cwd: root, encoding: 'utf8' }));
    const head = await import(pathToFileURL(tmp).href);
    orderApi.hooks.store = null;
    const cases = [
      ['pickup nl', orderInput()],
      ['delivery nl', orderInput({ method: 'delivery', remarks: 'Achterdeur, aub.' })],
      ['pickup ro', orderInput({ lang: 'ro' })],
      ['in-store kg row', orderInput({ items: { mici: 1.5 } })],
    ];
    const runs = [];
    for (const [label, input] of cases) {
      for (const [mode, e] of [['no token', { ...env(), ADMIN_SECRET: SECRET }], ['ORDER_DRY_RUN=1', { ORDER_DRY_RUN: '1', ADMIN_SECRET: SECRET }], ['a preview deployment with a token', { ...env(), ADMIN_SECRET: SECRET, BLOB_READ_WRITE_TOKEN: 'test-token-not-real', VERCEL: '1', VERCEL_ENV: 'preview' }], ['a token outside Vercel', { ...env(), ADMIN_SECRET: SECRET, BLOB_READ_WRITE_TOKEN: 'test-token-not-real' }]]) {
        const ips = [nextIp(), nextIp()];
        const one = async (api) => {
          setEnv(e);
          mails.length = 0;
          const logs = [];
          const log = console.log;
          const err = console.error;
          console.log = (...a) => logs.push(a.join(' '));
          console.error = (...a) => logs.push(a.join(' '));
          try {
            const r = await post(api, input, { ip: ips[0] });
            const forms = await api.default.fetch(new Request('https://slagerij-john.be/api/order', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ips[1] }, body: new URLSearchParams({ lang: input.lang, method: input.method, date: input.date, time: input.time, ...Object.fromEntries(Object.entries(input.items).map(([k, v]) => [`q-${k}`, String(v)])), name: input.name, phone: input.phone, email: input.email, ...(input.address ? { street: input.address.street, nr: input.address.nr, postcode: input.address.postcode, place: input.address.place } : {}) }).toString() }));
            // the no-script form draws a new random reference on each send (the page's own is SJ-2026-ABCD): only that is
            // masked; every other byte is compared
            const mask = (s) => s.replace(/SJ-\d{4}-(?!ABCD)[2-9A-HJ-NP-Z]{4}/g, 'SJ-<random>');
            return { status: r.status, body: await r.text(), form: `${forms.status} ${mask(forms.headers.get('location') ?? '')}`, mails: mask(JSON.stringify(mails.map((m) => ({ ...m })))), logs: mask(logs.join('\n')) };
          } finally {
            console.log = log;
            console.error = err;
          }
        };
        const a = await one(head);
        const b = await one(orderApi);
        const diff = ['status', 'body', 'form', 'mails', 'logs'].filter((k) => a[k] !== b[k]);
        // the form path draws a new random reference in each run: compared without it (above); the JSON path keeps the page's
        runs.push({ label, mode, same: !diff.length, ...(diff.length ? { diff, head: a, now: b } : {}) });
        if (diff.length) why.push(`${label} / ${mode}: ${diff.join(', ')} differ`);
      }
    }
    // production with a token but without ADMIN_SECRET: the links could not be signed → the store stays off (and says so)
    {
      const { storeFor } = await import('../src/lib/order-store.js');
      const err = console.error;
      const said = [];
      console.error = (...a) => said.push(a.join(' '));
      const s = await storeFor({ BLOB_READ_WRITE_TOKEN: 'test-token-not-real', VERCEL: '1', VERCEL_ENV: 'production' });
      console.error = err;
      if (s !== null || !said.some((x) => /ADMIN_SECRET is not/.test(x))) why.push('production with a token and no ADMIN_SECRET did not keep the store off');
    }
    record('§6 no token · ORDER_DRY_RUN · a preview deployment → today\'s behaviour byte for byte', why, runs.map((r) => `${r.label} / ${r.mode}: ${r.same ? 'same' : 'DIFFERENT'}`));
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
    storeOn();
  }
}

// 4 — the passphrase: five wrong → 429; a sixth, right, inside the window → still closed; another address → in
const PASS = ['test', 'zin', 'van', 'vier', 'woorden', String(Date.now())].join(' ');
let cookie = '';
{
  process.env.ADMIN_PASS_HASH = await hashPass(PASS, { N: 16384, r: 8, p: 1, keylen: 32 });
  Object.assign(_flood, { since: 0, writes: 0, closedUntil: 0 });
  const why = [];
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await adminPost({ op: 'login', pass: `fout ${i}` }, { ip: '198.51.100.7' })).status);
  if (codes.slice(0, 4).some((c) => c !== 401) || codes[4] !== 429) why.push(`wrong ×5 → ${codes.join(' ')} (want 401 ×4, then 429)`);
  const sixth = await adminPost({ op: 'login', pass: PASS }, { ip: '198.51.100.7' });
  if (sixth.status !== 429) why.push(`the sixth, right, inside 15 minutes → ${sixth.status} (want 429)`);
  if (sixth.headers.get('set-cookie')) why.push('the closed address got a cookie');
  clock += 16 * 60000;
  const later = await adminPost({ op: 'login', pass: PASS }, { ip: '198.51.100.7' });
  if (later.status !== 200) why.push(`after 16 minutes → ${later.status}`);
  const other = await adminPost({ op: 'login', pass: PASS }, { ip: '192.0.2.44' });
  const sc = other.headers.get('set-cookie') ?? '';
  if (other.status !== 200 || !/^sj_admin=v1\.\d+\.[A-Za-z0-9_-]{43}; Path=\/api\/admin; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict$/.test(sc)) why.push(`login → ${other.status} ${sc}`);
  cookie = sc.split(';')[0];
  const csrf = await adminPost({ op: 'login', pass: PASS }, { header: false, ip: '192.0.2.45' });
  if (csrf.status !== 403) why.push(`a POST without x-admin → ${csrf.status} (want 403)`);
  const counters = [...store.map.keys()].filter((p) => p.startsWith('limits/'));
  if (counters.some((p) => /198\.51|192\.0/.test(p))) why.push('a counter names the address');
  record('§6 wrong passphrase ×5 → 429, a sixth right one inside the window still closed', why, { codes, sixth: sixth.status, later: later.status, cookieAttrs: sc.replace(/=v1\.[^;]+/, '=…') });
}

// 5 — a tampered cookie or step link → 401 and nothing changed; 6 — a GET on a step link changes nothing
const ix0 = JSON.parse(store.map.get(INDEX).body);
const ref1 = Object.keys(ix0.orders).sort()[0];
const blobOf = (ref) => store.map.get(pathOf(parseRef(ref).year, parseRef(ref).n)).body;
{
  const why = [];
  const before = blobOf(ref1);
  const bad = cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
  const r1 = await adminPost({ op: 'next', ref: ref1 }, { cookie: bad });
  if (r1.status !== 401) why.push(`tampered cookie → ${r1.status}`);
  const exp = cookie.replace(/v1\.(\d+)\./, (_, e) => `v1.${Number(e) + 999}.`);
  const r2 = await adminPost({ op: 'next', ref: ref1 }, { cookie: exp });
  if (r2.status !== 401) why.push(`a cookie with another expiry → ${r2.status}`);
  const link = signStep(SECRET, ref1, 'confirmata', clock);
  for (const [label, q] of [['k changed', { ...link, k: link.k.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')) }], ['step changed', { ...link, s: 'gata' }], ['ref changed', { ...link, r: Object.keys(ix0.orders).sort()[1] }], ['expired', signStep(SECRET, ref1, 'confirmata', clock - 31 * 86400000)], ['another secret', signStep(newSecret(), ref1, 'confirmata', clock)]]) {
    const r = await adminPost({ op: 'step', ...q });
    if (r.status !== 401) why.push(`step link, ${label} → ${r.status}`);
    const g = await adminGet({ op: 'step', ...q });
    if (g.status !== 401) why.push(`GET step link, ${label} → ${g.status}`);
  }
  const list = await adminGet({ op: 'list' }, { cookie: bad });
  if (list.status !== 401) why.push(`list with a tampered cookie → ${list.status}`);
  if (blobOf(ref1) !== before) why.push('the order changed');
  record('§6 a tampered cookie or step link → 401 and nothing changed', why);
}
{
  const why = [];
  const before = blobOf(ref1);
  mails.length = 0;
  const g = await adminGet({ op: 'step', ...signStep(SECRET, ref1, 'gata', clock) });
  const b = await body(g);
  if (g.status !== 200 || b.ref !== ref1 || !b.name) why.push(`GET → ${g.status} ${JSON.stringify(b)}`);
  if (blobOf(ref1) !== before) why.push('the GET changed the order');
  if (mails.length) why.push('the GET sent a mail');
  record('§6 a GET on a step link changes nothing', why, b);
}

// 7 — each step sends at most one customer mail, a repeated tap sends none
{
  const why = [];
  const steps = [];
  const tap = async (s) => {
    mails.length = 0;
    const r = await adminPost({ op: 'step', ...signStep(SECRET, ref1, s, clock) });
    const b = await body(r);
    steps.push({ step: s, status: r.status, changed: b.changed, mailed: b.mailed, mails: mails.map((m) => m.subject) });
    return { r, b, sent: [...mails] };
  };
  let t = await tap('confirmata');
  if (!t.b.changed || !t.b.mailed || t.sent.length !== 1 || !/is bevestigd$/.test(t.sent[0].subject)) why.push(`Am primit-o → ${JSON.stringify(steps.at(-1))}`);
  if (!t.sent[0]?.text.includes('Wij hebben uw bestelling goed ontvangen en maken ze klaar tegen ') || !/Volg uw bestelling: https:\/\/slagerij-john\.be\/bestelling\?r=/.test(t.sent[0]?.text ?? '')) why.push('the confirmed mail lacks its line or the link');
  t = await tap('confirmata');
  if (t.b.changed || t.b.mailed || t.sent.length) why.push(`Am primit-o again → ${JSON.stringify(steps.at(-1))}`);
  t = await tap('in-lucru');
  if (!t.b.changed || t.b.mailed || t.sent.length) why.push(`O pregătim → ${JSON.stringify(steps.at(-1))} (no mail at în lucru)`);
  t = await tap('gata');
  if (!t.b.changed || !t.b.mailed || t.sent.length !== 1 || !/staat klaar$/.test(t.sent[0].subject) || !t.sent[0].text.includes('Uw bestelling staat klaar in de winkel. Afhalen: ')) why.push(`E gata → ${JSON.stringify(steps.at(-1))}`);
  t = await tap('confirmata');
  if (t.b.changed || t.sent.length) why.push(`a step back by link → ${JSON.stringify(steps.at(-1))}`);
  // Înapoi on the list, then E gata again: the ready mail went once, never twice
  mails.length = 0;
  const back = await body(await adminPost({ op: 'back', ref: ref1 }, { cookie }));
  if (back.order?.status !== 'in-lucru') why.push(`Înapoi → ${back.order?.status}`);
  const again = await body(await adminPost({ op: 'next', ref: ref1 }, { cookie }));
  if (again.order?.status !== 'gata' || again.mailed || mails.length) why.push(`E gata after Înapoi → ${again.order?.status}, mailed ${again.mailed}, ${mails.length} mails`);
  const done = await body(await adminPost({ op: 'next', ref: ref1 }, { cookie }));
  if (done.order?.status !== 'ridicata' || mails.length) why.push(`A fost ridicată → ${done.order?.status}`);
  const end = await body(await adminPost({ op: 'next', ref: ref1 }, { cookie }));
  if (end.changed) why.push('a step after ridicată');
  // a delivery order ends „livrată”; its ready mail is the delivery line
  const del = await body(await post(orderApi, orderInput({ method: 'delivery' })));
  mails.length = 0;
  for (const s of ['confirmata', 'in-lucru', 'gata']) await adminPost({ op: 'step', ...signStep(SECRET, del.ref, s, clock) });
  if (!mails.some((m) => m.text.includes('Uw bestelling is klaar. Wij leveren ze '))) why.push('the delivery order\'s ready mail lacks its line');
  const last = await body(await adminPost({ op: 'next', ref: del.ref }, { cookie }));
  if (last.order?.status !== 'livrata') why.push(`delivery → ${last.order?.status} (want livrata)`);
  // a step mail that does not go: „Salvat.” without „Clientul a primit e-mailul.”, and its claim freed
  const ro = await body(await post(orderApi, orderInput({ lang: 'ro' })));
  setEnv({ ADMIN_SECRET: SECRET, CRON_SECRET: CRON });
  const nomail = await body(await adminPost({ op: 'step', ...signStep(SECRET, ro.ref, 'confirmata', clock) }));
  storeOn();
  if (!nomail.changed || nomail.mailed) why.push(`no mail service → ${JSON.stringify(nomail)}`);
  const retry = await body(await adminPost({ op: 'step', ...signStep(SECRET, ro.ref, 'gata', clock) }));
  if (!retry.mailed) why.push('the ready mail after a failed confirmed mail');
  const roMail = mails.find((m) => m.subject === `Comanda ta ${ro.ref} e gata`);
  if (!roMail || !roMail.text.includes('Comanda ta te așteaptă în magazin. Ridicare: ') || !/Urmărește comanda: /.test(roMail.text)) why.push('the Romanian ready mail');
  record('§6 each step sends at most one customer mail, a repeated tap sends none', why, steps);
}

// 8 — the status page shows no name, phone, e-mail or address
{
  const why = [];
  const ix = JSON.parse(store.map.get(INDEX).body);
  const shown = [];
  for (const c of Object.values(ix.orders)) {
    const full = JSON.parse(blobOf(c.ref));
    const r = await statusGet(signStatus(SECRET, c.ref));
    const text = await r.text();
    shown.push(text);
    if (r.status !== 200) why.push(`${c.ref} → ${r.status}`);
    for (const v of [full.name, full.phone, full.email, full.address?.street, full.address?.postcode, full.remarks].filter(Boolean)) if (text.includes(v)) why.push(`${c.ref}: the page's answer holds „${v}”`);
    const b = JSON.parse(text);
    if (Object.keys(b).sort().join() !== 'locale,method,moment,ref,step') why.push(`${c.ref}: fields ${Object.keys(b)}`);
  }
  const bad = await statusGet({ r: Object.keys(ix.orders)[0], k: 'x'.repeat(43) });
  if (bad.status !== 404) why.push(`a wrong k → ${bad.status}`);
  const html = readFileSync(join(root, 'dist/bestelling.html'), 'utf8');
  if (/Testklant|example\.invalid|0470 00/.test(html)) why.push('the built page holds an order value');
  record('§6 the status page shows no name, phone, e-mail or address', why, shown[0]);
}

// 9 — sweep: 91 days gone, 89 stays (the light sweep at the list; the full sweep of the weekly cron)
{
  const why = [];
  const day = 86400000;
  const now = clock;
  clock = now - 91 * day;
  const old = await body(await post(orderApi, orderInput()));
  clock = now - 89 * day;
  const young = await body(await post(orderApi, orderInput()));
  clock = now;
  const list = await body(await adminGet({ op: 'list' }, { cookie }));
  const refs = list.orders.map((o) => o.ref);
  if (refs.includes(old.ref)) why.push(`the list still shows the 91-day order ${old.ref}`);
  if (!refs.includes(young.ref)) why.push(`the list lost the 89-day order ${young.ref}`);
  if (store.map.has(pathOf(parseRef(old.ref).year, parseRef(old.ref).n))) why.push('the 91-day blob is still there');
  if (!store.map.has(pathOf(parseRef(young.ref).year, parseRef(young.ref).n))) why.push('the 89-day blob is gone');
  if (list.orders.some((o) => 'email' in o)) why.push('the list shows an e-mail address');
  // the full sweep: an order missing from the index (a failed index write) — old → deleted, young → back in the index
  clock = now - 92 * day;
  const orphanOld = await body(await post(orderApi, orderInput()));
  clock = now - 10 * day;
  const orphanYoung = await body(await post(orderApi, orderInput()));
  clock = now;
  const ixb = JSON.parse(store.map.get(INDEX).body);
  delete ixb.orders[orphanOld.ref];
  delete ixb.orders[orphanYoung.ref];
  store.map.set(INDEX, { ...store.map.get(INDEX), body: JSON.stringify(ixb) });
  store.map.set('limits/login/old.json', { body: '{"fails":[],"until":0}', etag: '"x"', at: now - 2 * day });
  const noauth = await adminGet({ op: 'sweep' });
  if (noauth.status !== 401) why.push(`the cron without its secret → ${noauth.status}`);
  const cron = await body(await adminGet({ op: 'sweep' }, { headers: { authorization: `Bearer ${CRON}` } }));
  if (store.map.has(pathOf(parseRef(orphanOld.ref).year, parseRef(orphanOld.ref).n))) why.push('the full sweep left a 92-day orphan');
  if (!(orphanYoung.ref in JSON.parse(store.map.get(INDEX).body).orders)) why.push('the full sweep did not put the young orphan back in the index');
  if (store.map.has('limits/login/old.json')) why.push('a two-day-old counter stayed');
  record('§6 sweep: 91 days gone, 89 stays', why, { old: old.ref, young: young.ref, cron });
}

// ——— row 12c (D-72 A): kept until the customer asks · the erase · the list that does not read a growing file ———
const DAYMS = 86400000;
const SWITCH = Date.parse(`${KEEP_FROM}T00:00:00+01:00`);
const cookieAt = (t) => `sj_admin=${sessionValue(SECRET, t)}`;
const blobAt = (ref) => store.map.get(pathOf(parseRef(ref).year, parseRef(ref).n));
const ixNow = () => JSON.parse(store.map.get(INDEX).body);
const pageNow = (ref) => {
  const p = parseRef(ref);
  const x = store.map.get(pagePath(pageOf(p.year, p.n)));
  return x ? JSON.parse(x.body) : null;
};
/** the store's calls of one action: simple = reads + heads, advanced = writes + lists (Hobby: 10 000 · 2 000 a month) */
const opsOf = async (fn) => {
  const a = { ...store.ops };
  const r = await fn();
  const d = Object.fromEntries(Object.keys(store.ops).map((k) => [k, store.ops[k] - a[k]]));
  return { r, calls: { simple: d.read + d.head, advanced: d.write + d.list, removes: d.remove, ...d } };
};
const walk = async (ref, c) => {
  for (let i = 0; i < 4; i++) await adminPost({ op: 'next', ref }, { cookie: c });
};
const calls = {};

// 12 — a 91-day and a 400-day order received after the switch day stay; one received before it goes at day 91
{
  const why = [];
  const real = clock;
  clock = SWITCH + 1 * DAYMS + 9 * 3600000;
  const k91 = await body(await post(orderApi, orderInput()));
  clock = SWITCH + 2 * DAYMS + 9 * 3600000;
  const k400 = await body(await post(orderApi, orderInput()));
  // the 400-day one is picked up: it leaves the index for its archive page and must stay there too
  await walk(k400.ref, cookieAt(clock));
  clock = SWITCH - 1 * DAYMS + 9 * 3600000;
  const before = await body(await post(orderApi, orderInput()));
  clock = SWITCH - 1 * DAYMS + 9 * 3600000 + 89 * DAYMS;
  let list = await body(await adminGet({ op: 'list' }, { cookie: cookieAt(clock) }));
  if (!list.orders.some((o) => o.ref === before.ref)) why.push(`the order received before the switch day is gone at day 89 (${before.ref})`);
  clock = SWITCH - 1 * DAYMS + 9 * 3600000 + 91 * DAYMS;
  list = await body(await adminGet({ op: 'list' }, { cookie: cookieAt(clock) }));
  if (list.orders.some((o) => o.ref === before.ref) || blobAt(before.ref)) why.push(`the order received before the switch day stayed past day 91 (${before.ref})`);
  if (!list.orders.some((o) => o.ref === k91.ref) || !blobAt(k91.ref)) why.push(`the order received after the switch day is gone at day 90 (${k91.ref})`);
  clock = SWITCH + 1 * DAYMS + 9 * 3600000 + 91 * DAYMS;
  list = await body(await adminGet({ op: 'list' }, { cookie: cookieAt(clock) }));
  if (!list.orders.some((o) => o.ref === k91.ref) || !blobAt(k91.ref)) why.push(`a 91-day order received after the switch day is gone (${k91.ref})`);
  clock = SWITCH + 2 * DAYMS + 9 * 3600000 + 400 * DAYMS;
  await adminGet({ op: 'list' }, { cookie: cookieAt(clock) });
  const cron = await body(await adminGet({ op: 'sweep' }, { headers: { authorization: `Bearer ${CRON}` } }));
  list = await body(await adminGet({ op: 'list' }, { cookie: cookieAt(clock) }));
  const pg = pageOf(parseRef(k400.ref).year, parseRef(k400.ref).n);
  const page = await body(await adminGet({ op: 'page', p: pg }, { cookie: cookieAt(clock) }));
  if (!blobAt(k400.ref)) why.push(`a 400-day order received after the switch day lost its blob (${k400.ref})`);
  if (!page.orders?.some((o) => o.ref === k400.ref)) why.push(`a 400-day order picked up is not in its page ${pg}`);
  if (list.done?.[pg] !== page.orders?.length) why.push(`the list's count of ${pg} = ${list.done?.[pg]}, the page holds ${page.orders?.length}`);
  if (!list.orders.some((o) => o.ref === k91.ref) || !blobAt(k91.ref)) why.push(`after the full sweep at day 400 the kept order ${k91.ref} is gone`);
  clock = real;
  record('12c a 91-day and a 400-day order received after the switch day stay; one received before it goes at day 91', why, { KEEP_FROM, before: before.ref, k91: k91.ref, k400: k400.ref, cron });
}

// 13 — the list: the index holds the open work only; a kept order picked up moves to its page and back on Înapoi; the
// list is one read, a page is one read; 120 picked-up orders leave the index as small as it was
{
  const why = [];
  const real = clock;
  clock = SWITCH + 3 * DAYMS;
  const c = cookieAt(clock);
  const fresh = await opsOf(() => post(orderApi, orderInput()).then(body));
  calls['a new order (claim + card + light sweep)'] = fresh.calls;
  const ref = fresh.r.ref;
  const steps = [];
  for (let i = 0; i < 3; i++) steps.push((await opsOf(() => adminPost({ op: 'next', ref }, { cookie: c }).then(body))).calls);
  calls['a step between open statuses (Am primit-o · O pregătim · E gata, + its mail where it has one)'] = steps[0];
  const toDone = await opsOf(() => adminPost({ op: 'next', ref }, { cookie: c }).then(body));
  calls['the last step (A fost ridicată / livrată): the card to its page'] = toDone.calls;
  if (ref in ixNow().orders) why.push('a kept order picked up still lies in the index');
  if (!pageNow(ref)?.orders?.[ref]) why.push('a kept order picked up is not in its page');
  if (!toDone.r.done || toDone.r.done[pageOf(parseRef(ref).year, parseRef(ref).n)] !== Object.keys(pageNow(ref).orders).length) why.push(`the step's answer carries no right page count: ${JSON.stringify(toDone.r.done)}`);
  const back = await opsOf(() => adminPost({ op: 'back', ref }, { cookie: c }).then(body));
  calls['Înapoi from Ridicate: the card back to the index'] = back.calls;
  if (!(ref in ixNow().orders) || pageNow(ref)?.orders?.[ref]) why.push('Înapoi did not bring the card back to the index');
  await adminPost({ op: 'next', ref }, { cookie: c });
  const list = await opsOf(() => adminGet({ op: 'list' }, { cookie: c }).then(body));
  calls['a refresh of the list (each minute while open)'] = list.calls;
  if (list.calls.simple !== 1 || list.calls.advanced !== 0) why.push(`a list refresh = ${JSON.stringify(list.calls)} (want one read)`);
  const key = pageOf(parseRef(ref).year, parseRef(ref).n);
  const pg = await opsOf(() => adminGet({ op: 'page', p: key }, { cookie: c }).then(body));
  calls['one archive page (Ridicate / Toate, as the list is scrolled)'] = pg.calls;
  if (pg.calls.simple !== 1 || pg.calls.advanced !== 0) why.push(`a page = ${JSON.stringify(pg.calls)} (want one read)`);
  if ((await adminGet({ op: 'page', p: key })).status !== 401) why.push('a page without the cookie is not 401');
  if ((await adminGet({ op: 'page', p: '../index' }, { cookie: c })).status !== 400) why.push('a page key that is not a page is not 400');
  // 120 kept orders, all picked up: the index the list reads stays the size of the open work
  const sizeBefore = store.map.get(INDEX).body.length;
  const many = [];
  for (let i = 0; i < 120; i++) many.push(await body(await post(orderApi, orderInput())));
  const sizeOpen = store.map.get(INDEX).body.length;
  for (const o of many) await walk(o.ref, c);
  const sizeAfter = store.map.get(INDEX).body.length;
  const ix = ixNow();
  const listed = await body(await adminGet({ op: 'list' }, { cookie: c }));
  const shownDone = Object.values(listed.done).reduce((a, b) => a + b, 0);
  if (many.some((o) => o.ref in ix.orders)) why.push('a picked-up kept order still lies in the index');
  if (sizeAfter > sizeBefore + 200) why.push(`the index grew from ${sizeBefore} to ${sizeAfter} B with 120 picked-up orders`);
  let inPages = 0;
  for (const [k, n] of Object.entries(ix.done)) {
    const p = JSON.parse(store.map.get(pagePath(k)).body);
    if (Object.keys(p.orders).length !== n) why.push(`page ${k}: index says ${n}, the page holds ${Object.keys(p.orders).length}`);
    inPages += n;
  }
  if (shownDone !== inPages) why.push(`the list's Ridicate count ${shownDone} ≠ ${inPages}`);
  const biggest = Math.max(...Object.keys(ix.done).map((k) => store.map.get(pagePath(k)).body.length));
  clock = real;
  record('12c the list: one read of the index (open work only), pages of 50 for Ridicate / Toate, Înapoi back', why, { index_bytes: { before: sizeBefore, with_120_open: sizeOpen, after_120_picked_up: sizeAfter }, pages: ix.done, biggest_page_bytes: biggest, last: ix.last });
}

// 14 — the store as row 12 leaves it (index v1, every card in it, no pages): the first list reads it as v2, moves a kept
// card picked up to its page, leaves an order received before the switch day (picked up too) in the index. A store of
// its own: the shared one keeps its pages.
{
  const why = [];
  const real = clock;
  const old = memoryAdapter({ now: () => clock });
  for (const h of [orderApi.hooks, adminApi.hooks, statusApi.hooks]) h.store = old;
  const at = (t) => new Date(t).toISOString();
  const mk = (n, t, status) => ({ v: 1, ref: `SJ-2026-${String(n).padStart(4, '0')}`, n, year: 2026, receivedAt: at(t), locale: 'nl', method: 'pickup', date: '2026-11-14', time: '10:00', name: `Testklant v1-${n}`, phone: '0470 00 00 99', email: `v1-${n}@example.invalid`, remarks: '', slip: [], totalLabel: '', quote: false, status, history: [{ to: 'noua', at: at(t) }, ...(status === 'noua' ? [] : [{ to: status, at: at(t + 3600000) }])], sent: {} });
  const orders = [mk(1, SWITCH - 1 * DAYMS, 'ridicata'), mk(2, SWITCH + 2 * 3600000, 'ridicata'), mk(3, SWITCH + 3 * 3600000, 'noua')];
  for (const o of orders) await old.write(pathOf(2026, o.n), o, { create: true });
  const cards = Object.fromEntries(orders.map(({ email: _e, ...c }) => [c.ref, c]));
  await old.write(INDEX, { v: 1, orders: cards }, { create: true });
  clock = SWITCH + 1 * DAYMS;
  const c = cookieAt(clock);
  const list = await body(await adminGet({ op: 'list' }, { cookie: c }));
  const ix = JSON.parse(old.map.get(INDEX).body);
  const pk = pagePath(pageOf(2026, 2));
  const pg = old.map.get(pk) ? JSON.parse(old.map.get(pk).body) : null;
  if (ix.v !== 2 || !ix.done || !ix.last) why.push(`the index after the first list: ${JSON.stringify({ v: ix.v, done: ix.done, last: ix.last })}`);
  if ('SJ-2026-0002' in ix.orders || !pg?.orders['SJ-2026-0002']) why.push('the kept order picked up did not move to its page');
  if (!('SJ-2026-0001' in ix.orders) || pg?.orders['SJ-2026-0001']) why.push('the order received before the switch day left the index');
  if (!('SJ-2026-0003' in ix.orders)) why.push('the open order left the index');
  if (ix.done[pageOf(2026, 2)] !== 1 || list.done?.[pageOf(2026, 2)] !== 1) why.push(`the page count: index ${JSON.stringify(ix.done)}, list ${JSON.stringify(list.done)}`);
  if (list.orders.some((x) => x.ref === 'SJ-2026-0002')) why.push('the first list still listed it among the index cards');
  if (list.orders.some((x) => 'email' in x)) why.push('the list shows an e-mail address');
  for (const h of [orderApi.hooks, adminApi.hooks, statusApi.hooks]) h.store = store;
  clock = real;
  record('12c the store as row 12 left it (index v1): read as v2, a kept picked-up card to its page, a pre-switch one stays', why, { index: { v: ix.v, cards: Object.keys(ix.orders), done: ix.done, last: ix.last } });
}

// 15 — erase: logged in only, a POST with x-admin; the card and the blob gone; a second tap „already gone”; the links
// answer as a wrong one; no mail; the number is not given again; five orders arriving during an erase
{
  const why = [];
  const real = clock;
  clock = SWITCH + 5 * DAYMS;
  const c = cookieAt(clock);
  const open = await body(await post(orderApi, orderInput()));
  const picked = await body(await post(orderApi, orderInput()));
  await walk(picked.ref, c);
  const openBlob = blobAt(open.ref).body;
  const r401 = await adminPost({ op: 'erase', ref: open.ref });
  if (r401.status !== 401) why.push(`erase without the cookie → ${r401.status}`);
  const r403 = await adminPost({ op: 'erase', ref: open.ref }, { cookie: c, header: false });
  if (r403.status !== 403) why.push(`erase without x-admin → ${r403.status}`);
  const rGet = await adminGet({ op: 'erase', ref: open.ref }, { cookie: c });
  if (rGet.status !== 404) why.push(`a GET erase → ${rGet.status} (want 404: no such op)`);
  const r400 = await adminPost({ op: 'erase', ref: 'SJ-2026-ABCD' }, { cookie: c });
  if (r400.status !== 400) why.push(`erase of a page reference → ${r400.status}`);
  if (blobAt(open.ref)?.body !== openBlob || !(open.ref in ixNow().orders)) why.push('a refused erase changed something');
  // the customer's link and the shop's step link before: they work
  if ((await statusGet(signStatus(SECRET, open.ref))).status !== 200) why.push('the status link did not work before the erase');
  mails.length = 0;
  const e1 = await opsOf(() => adminPost({ op: 'erase', ref: open.ref }, { cookie: c }).then(body));
  calls['erase an open order („Șterge comanda”)'] = e1.calls;
  const e2 = await opsOf(() => adminPost({ op: 'erase', ref: picked.ref }, { cookie: c }).then(body));
  calls['erase a picked-up order (its page and the index)'] = e2.calls;
  if (!e1.r.ok || e1.r.erased !== true || !e2.r.ok || e2.r.erased !== true) why.push(`erase answers ${JSON.stringify([e1.r, e2.r])}`);
  for (const o of [open, picked]) {
    if (blobAt(o.ref)) why.push(`${o.ref}: the blob is still there`);
    if (o.ref in ixNow().orders) why.push(`${o.ref}: the index card is still there`);
    if (pageNow(o.ref)?.orders?.[o.ref]) why.push(`${o.ref}: the page card is still there`);
  }
  const list = await body(await adminGet({ op: 'list' }, { cookie: c }));
  const pk = pageOf(parseRef(picked.ref).year, parseRef(picked.ref).n);
  const page = await body(await adminGet({ op: 'page', p: pk }, { cookie: c }));
  if ([...list.orders, ...page.orders].some((o) => o.ref === open.ref || o.ref === picked.ref)) why.push('the screen still shows an erased order');
  if ((list.done[pk] ?? 0) !== page.orders.length) why.push(`after the erase the count of ${pk} = ${list.done[pk]}, the page holds ${page.orders.length}`);
  const again = await opsOf(() => adminPost({ op: 'erase', ref: open.ref }, { cookie: c }));
  calls['a second tap on an erased order'] = again.calls;
  const againB = await body(again.r);
  if (again.r.status !== 200 || againB.erased !== false || againB.ok !== true) why.push(`a second tap → ${again.r.status} ${JSON.stringify(againB)} (want 200 erased:false)`);
  if (again.calls.advanced) why.push(`a second tap wrote: ${JSON.stringify(again.calls)}`);
  if (mails.length) why.push(`the erase sent ${mails.length} mail(s)`);
  // the customer's status link answers as a wrong key does; the shop's step link as a gone order
  const st = await statusGet(signStatus(SECRET, open.ref));
  const wrong = await statusGet({ r: open.ref, k: 'x'.repeat(43) });
  const stText = await st.text();
  const wrongText = await wrong.text();
  if (st.status !== wrong.status || stText !== wrongText) why.push(`the status link after the erase: ${st.status} ${stText} ≠ wrong key ${wrong.status} ${wrongText}`);
  const stepGet = await adminGet({ op: 'step', ...signStep(SECRET, open.ref, 'gata', clock) });
  const stepPost = await adminPost({ op: 'step', ...signStep(SECRET, open.ref, 'gata', clock) });
  if (stepGet.status !== 404 || stepPost.status !== 404) why.push(`the step link after the erase: GET ${stepGet.status} POST ${stepPost.status} (want 404)`);
  if (blobAt(open.ref)) why.push('a step link after the erase wrote the order back');
  // the highest number erased: the next order does not get it again
  const top = await body(await post(orderApi, orderInput()));
  const topN = parseRef(top.ref).n;
  await adminPost({ op: 'erase', ref: top.ref }, { cookie: c });
  const nextOne = await body(await post(orderApi, orderInput()));
  if (parseRef(nextOne.ref).n !== topN + 1) why.push(`after erasing ${top.ref} the next order got ${nextOne.ref}`);
  // five orders arriving during an erase: the index stays valid and holds the five, not the erased one
  const victim = await body(await post(orderApi, orderInput()));
  const [er, ...five] = await Promise.all([adminPost({ op: 'erase', ref: victim.ref }, { cookie: c }).then(body), ...[1, 2, 3, 4, 5].map(() => post(orderApi, orderInput()).then(body))]);
  let ix;
  try {
    ix = ixNow();
  } catch {
    why.push('the index is not valid JSON after the race');
  }
  if (ix) {
    if (!er.ok || er.erased !== true) why.push(`the erase in the race → ${JSON.stringify(er)}`);
    if (victim.ref in ix.orders || blobAt(victim.ref)) why.push('the erased order came back in the race');
    for (const f of five) {
      if (!f.ok) why.push(`an order in the race → ${JSON.stringify(f)}`);
      else if (!(f.ref in ix.orders) || !blobAt(f.ref)) why.push(`${f.ref} missing after the race`);
    }
    if (new Set(five.map((f) => f.ref)).size !== 5) why.push(`the race gave ${five.map((f) => f.ref)}`);
    const refs = five.map((f) => parseRef(f.ref));
    if (refs.some((p) => p && ix.last[p.year] < p.n)) why.push(`the index's last ${JSON.stringify(ix.last)} is below a number given`);
    for (const r of Object.keys(ix.orders)) if (!blobAt(r)) why.push(`the index holds ${r} without its order`);
  }
  clock = real;
  record('12c erase: 401 without the cookie, 403 without the header, a GET changes nothing, card and blob gone, links dead, no mail, five orders during an erase', why, { erased: [open.ref, picked.ref], second: againB, status_after: `${st.status} ${stText}`, renumber: { erased: top.ref, next: nextOne.ref }, race: { erased: victim.ref, five: five.map((f) => f.ref) } });
}

// 16 — the full sweep mends a card's lost write (an order in neither the index nor its page) and drops a card whose
// order is gone
{
  const why = [];
  const real = clock;
  clock = SWITCH + 6 * DAYMS;
  const c = cookieAt(clock);
  const lostOpen = await body(await post(orderApi, orderInput()));
  const lostDone = await body(await post(orderApi, orderInput()));
  await walk(lostDone.ref, c);
  const ix = ixNow();
  delete ix.orders[lostOpen.ref];
  ix.orders['SJ-2026-0999'] = { ...ix.orders[Object.keys(ix.orders)[0]], ref: 'SJ-2026-0999', n: 999, receivedAt: new Date(clock - 3 * DAYMS).toISOString(), changedAt: undefined };
  store.map.set(INDEX, { ...store.map.get(INDEX), body: JSON.stringify(ix) });
  const pk = pagePath(pageOf(parseRef(lostDone.ref).year, parseRef(lostDone.ref).n));
  const pg = JSON.parse(store.map.get(pk).body);
  delete pg.orders[lostDone.ref];
  store.map.set(pk, { ...store.map.get(pk), body: JSON.stringify(pg) });
  clock += 2 * DAYMS;
  const swept = await opsOf(() => adminGet({ op: 'sweep' }, { headers: { authorization: `Bearer ${CRON}` } }).then(body));
  calls['the weekly full sweep (this test store)'] = swept.calls;
  const after = ixNow();
  if (!(lostOpen.ref in after.orders)) why.push('the open order whose card was lost is not back in the index');
  if (!pageNow(lostDone.ref)?.orders?.[lostDone.ref]) why.push('the picked-up order whose card was lost is not back in its page');
  if ('SJ-2026-0999' in after.orders) why.push('a card whose order is gone stayed in the index');
  for (const [k, n] of Object.entries(after.done)) {
    const p = store.map.get(pagePath(k));
    if (!p || Object.keys(JSON.parse(p.body).orders).length !== n) why.push(`page ${k}: count ${n} ≠ the page`);
  }
  clock = real;
  record('12c the full sweep puts a lost card back (index or page) and drops a card whose order is gone', why, swept.r);
}

// 10 — the built /admin HTML and script carry no order field values
{
  const why = [];
  const files = ['admin.html', 'admin/pas.html', 'bestelling.html'];
  const scripts = [];
  for (const f of files) {
    const html = readFileSync(join(root, 'dist', f), 'utf8');
    for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g)) scripts.push(m[1]);
    if (!/<meta name="robots" content="noindex"/.test(html)) why.push(`${f} not noindex`);
    if (/hit\.ts|Base\.astro_astro_type_script/.test(html)) why.push(`${f} ships the beacon`);
  }
  const seen = new Set();
  const read = (p) => {
    const file = join(root, 'dist', p);
    if (seen.has(file) || !existsSync(file)) return '';
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    return src + [...src.matchAll(/["'`]\.\/([\w.-]+\.js)["'`]/g)].map((m) => read(`_astro/${m[1]}`)).join('');
  };
  const all = files.map((f) => readFileSync(join(root, 'dist', f), 'utf8')).join('') + scripts.map((s) => read(s.replace(/^\//, ''))).join('');
  for (const [what, re] of [['an e-mail address', /[\w.+-]+@(?!example\.invalid)[\w-]+\.[a-z]{2,}/i], ['a test order value', /Testklant|klant\d+@|0470 00 00/], ['a running number', /SJ-\d{4}-\d{4}\b/], ['a phone number beyond the shop\'s', /\b0\d{3} \d{2} \d{2} \d{2}\b/]])
    for (const m of all.matchAll(new RegExp(re.source, `${re.flags.replace('g', '')}g`))) if (!m[0].includes('slagerij-john.be') && m[0] !== entity.email && !['0466 18 64 57'].includes(m[0])) why.push(`${what}: „${m[0]}”`);
  record('§6 the built /admin, /admin/pas, /bestelling HTML and scripts carry no order field values', [...new Set(why)], { scripts: [...seen].map((f) => f.replace(/.*dist[\\/]/, '')) });
}

// 11 — robots, hit, gate and the release gate unchanged; no secret in the diff
{
  const why = [];
  const robots = readFileSync(join(root, 'public/robots.txt'), 'utf8');
  if (!/^Disallow: \/admin$/m.test(robots)) why.push('robots.txt lost Disallow /admin');
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'public/robots.txt', 'api/hit.js'], { cwd: root, encoding: 'utf8' }).trim();
  if (changed) why.push(`changed: ${changed}`);
  const diff = execFileSync('git', ['diff', 'HEAD'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }) + execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\n').filter((f) => f && /\.(js|mjs|ts|astro|json)$/.test(f)).map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
  for (const [what, re] of [['an Anthropic key', /sk-ant-[a-z0-9_-]{8,}/i], ['a Resend key', /\bre_[A-Za-z0-9]{20,}/], ['a Blob token', /vercel_blob_rw_[A-Za-z0-9]{10,}/i], ['a scrypt hash', /scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{32,}/], ['a key-like assignment', /(?:api[_-]?key|secret|token|password|passwd)["']?\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{24,}["']/i]])
    if (re.test(diff)) why.push(`the diff holds ${what}`);
  record('§6 robots and hit unchanged; no secret in the diff (the gate and the release gate: npm run gate, npm run gate -- --release)', why);
}

globalThis.fetch = realFetch;
const pass = results.filter((r) => r.ok).length;
console.log(`\nadmin tests ${pass}/${results.length} · store calls ${JSON.stringify(store.ops)}`);
for (const [k, v] of Object.entries(calls)) console.log(`  calls · ${k}: ${v.simple} simple · ${v.advanced} advanced${v.removes ? ` · ${v.removes} delete(s)` : ''}`);
if (out) writeFileSync(resolve(out), JSON.stringify({ _source: `scripts/admin-test.mjs on ${new Date().toISOString()} — the functions in-process, the store a local double, Resend stubbed; nothing left this machine [MEASURED-OURS] local`, pass, total: results.length, store_ops: store.ops, calls_per_action: calls, results }, null, 1));
process.exit(pass === results.length ? 0 : 1);
