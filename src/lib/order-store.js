// Row 12 (D-24 · D-70, docs/admin.md §2) — the order store: one private Vercel Blob store in the owners' project, one JSON
// per order at orders/<year>/<0001>.json, the running number SJ-<year>-0001, the five statuses, the login brake.
// Row 12c (D-72 A, lexicon §5.41): orders received from the switch day on (KEEP_FROM, src/lib/order-keep.js) are kept
// until the customer asks — erase() on the shop's „Șterge comanda” — and never erased by age; orders received before it
// keep their 90 days. Server side only (the functions api/order.js · api/admin.js · api/bestelling.js); no order ever
// reaches the repo, the built HTML or a script.
//
// The Hobby plan's Blob allowance (read 11.11 on vercel.com/docs/vercel-blob/usage-and-pricing, [OFFICIAL]): 1 GB, the
// first 10 000 simple operations (reads) and 2 000 advanced operations (uploads, lists) a month; beyond that „you will not
// be able to access Vercel Blob … until 30 days have passed” — the order store would stop. So the shop's list (refreshed
// each minute while open) reads ONE blob, orders/index.json, never list() + every order; list() runs once per order (the
// running number) and once a week (the sweep cron). Since row 12c the index holds only the cards the shop works with
// (open orders, and orders received before KEEP_FROM until their 90 days end): a kept order picked up or delivered moves
// to its archive page orders/done/<year>-<page>.json (order-keep.js), which the tabs Ridicate and Toate read one page at
// a time. The index and the pages are copies inside the same store; the order's own blob stays the truth (status changes
// are written there first, with ifMatch).
//
// Adapters (same rules both): blobAdapter(token) — @vercel/blob, private access, loaded only when a token is set (the
// install is Dan's step: it needs his dev server stopped, CLAUDE.md) · memoryAdapter() — the test double.
import { brussels } from './order-core.js';
import { rank, nextOf } from './order-text.js';
import { kept, DAYS_KEPT_BEFORE, pageOf, inPage } from './order-keep.js';

export class Exists extends Error {}
export class Conflict extends Error {}

const DAY = 86400000;
export const INDEX = 'orders/index.json';
const pad = (n) => String(n).padStart(4, '0');
export const pathOf = (year, n) => `orders/${year}/${pad(n)}.json`;
export const pagePath = (key) => `orders/done/${key}.json`;
/** an archive page's key as the screen asks for it (order-keep.js pageOf): 2026-001 */
export const isPageKey = (key) => /^\d{4}-\d{3}$/.test(String(key ?? ''));
export { pageOf };
export const refOf = (year, n) => `SJ-${year}-${pad(n)}`;
/** a running number's year and number; null for anything else (a random page reference SJ-2026-AB7K among them) */
export const parseRef = (ref) => {
  const m = /^SJ-(\d{4})-(\d{4,6})$/.exec(String(ref ?? ''));
  return m ? { year: Number(m[1]), n: Number(m[2]) } : null;
};

/** a conditional write needs an ETag: without one it would be a plain overwrite (row 12a) — never silently */
const tagged = (path, opts) => {
  if ('ifMatch' in opts && !opts.ifMatch) throw new Error(`order store: a conditional write without an ETag (${path})`);
};

/** @vercel/blob (private store). `create` = put without overwrite (an existing pathname → Exists); `ifMatch` = a write
 *  only when the ETag still matches (else Conflict). Reads bypass the CDN cache (useCache false: a status just changed).
 *  `read(path, { etag: true })` = a read before a conditional write: the ETag comes from head() — the store API's own
 *  value, the one put()'s x-if-match is compared with (Vercel's example for conditional writes) — never from get().
 *  Measured 12.11 on the live store (row 12a, docs/data/measurements/2026-11-12/row12a-etag-probe.json): get() delivers
 *  JSON from about 1 kB up Brotli-compressed and its etag header turns weak, W/"<hash>", while head() and put() name
 *  "<hash>" — a conditional put with the weak one is refused („ETag mismatch”); an order (≈ 2,3 kB) and the index are
 *  always above that size. head first, then the body: a write in between leaves an older ETag with newer content → the
 *  write is refused and retried, never the other way round. Plain reads (the list, an order shown, the brake's check)
 *  stay one get() — head() is a simple operation of its own.
 *  Two writes racing on one pathname can also be refused with „The conditional request cannot succeed due to a
 *  conflicting operation against this resource” (a plain BlobError, not retried by the SDK; measured 12.11, three orders
 *  at once on the index) → Conflict too, so the caller reads again. `refused` counts both kinds (the contract reads it). */
export async function blobAdapter(token) {
  const sdk = await import('@vercel/blob');
  const read = async (path, { etag: forWrite = false } = {}) => {
    let etag;
    if (forWrite) {
      try {
        etag = (await sdk.head(path, { token })).etag;
      } catch (e) {
        if (e instanceof sdk.BlobNotFoundError) return null;
        throw e;
      }
      if (!etag) throw new Error(`order store: head() gave no ETag (${path})`);
    }
    const r = await sdk.get(path, { access: 'private', token, useCache: false });
    if (!r || r.statusCode !== 200 || !r.stream) return null;
    return { etag, json: JSON.parse(await new Response(r.stream).text()) };
  };
  const refused = { etag: 0, racing: 0 };
  return {
    read,
    refused,
    async write(path, json, opts = {}) {
      const { create = false, ifMatch } = opts;
      tagged(path, opts);
      try {
        const r = await sdk.put(path, JSON.stringify(json), { access: 'private', token, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: !create, ...(ifMatch ? { ifMatch } : {}) });
        return { etag: r.etag };
      } catch (e) {
        if (e instanceof sdk.BlobPreconditionFailedError) {
          refused.etag++;
          throw new Conflict(path);
        }
        if (e instanceof sdk.BlobError && /conflicting operation/i.test(e.message)) {
          refused.racing++;
          throw new Conflict(path);
        }
        // an existing pathname without allowOverwrite: the SDK names no class for it (docs, 11.11) → look
        if (create && (await sdk.head(path, { token }).then(() => true, () => false))) throw new Exists(path);
        throw e;
      }
    },
    async list(prefix) {
      const out = [];
      let cursor;
      do {
        const r = await sdk.list({ prefix, cursor, limit: 1000, token });
        out.push(...r.blobs.map((b) => ({ path: b.pathname, at: new Date(b.uploadedAt).getTime() })));
        cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor);
      return out;
    },
    async remove(path) {
      await sdk.del(path, { token });
    },
  };
}

/** The test double: a Map with the same rules, every call a turn of the event loop (so concurrent calls interleave as
 *  requests do), the calls counted (the quota; `head` = the extra simple operation of a read before a conditional
 *  write). As in the real store, only a read that asks for it carries the ETag a conditional write is compared with: a
 *  path that forgets to ask cannot write. `fail` = { write: (path) => bool } to make a write throw. */
export function memoryAdapter({ now = () => Date.now() } = {}) {
  const m = new Map();
  let tag = 0;
  const ops = { read: 0, head: 0, write: 0, list: 0, remove: 0 };
  const tick = () => new Promise((r) => setImmediate(r));
  return {
    map: m,
    ops,
    fail: {},
    async read(path, { etag: forWrite = false } = {}) {
      await tick();
      let etag;
      if (forWrite) {
        // head, then the body a turn later — as the two requests of the real adapter, another write can land between
        ops.head++;
        etag = m.get(path)?.etag;
        if (!etag) return null;
        await tick();
      }
      ops.read++;
      const x = m.get(path);
      return x ? { etag, json: JSON.parse(x.body) } : null;
    },
    async write(path, json, opts = {}) {
      const { create = false, ifMatch } = opts;
      await tick();
      ops.write++;
      tagged(path, opts);
      if (this.fail.write?.(path)) throw new Error(`store down (${path})`);
      const x = m.get(path);
      if (create && x) throw new Exists(path);
      if (ifMatch && (!x || x.etag !== ifMatch)) throw new Conflict(path);
      const etag = `"e${++tag}"`;
      m.set(path, { body: JSON.stringify(json), etag, at: now() });
      return { etag };
    },
    async list(prefix) {
      await tick();
      ops.list++;
      return [...m].filter(([p]) => p.startsWith(prefix)).map(([path, x]) => ({ path, at: x.at }));
    },
    async remove(path) {
      await tick();
      ops.remove++;
      m.delete(path);
    },
  };
}

/** The store for this request, or null = today's behaviour (random reference, nothing stored, docs/admin.md §2): no
 *  token, ORDER_DRY_RUN=1, a preview deployment, no ADMIN_SECRET (the links could not be signed) — and, outside Vercel,
 *  only with ORDER_STORE_LOCAL=1, so a token pulled into .env.local never writes test orders into the owners' store. */
export async function storeFor(env, test = null) {
  if (test) return test;
  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token || env.ORDER_DRY_RUN === '1' || env.VERCEL_ENV === 'preview') return null;
  if (env.VERCEL ? env.VERCEL_ENV !== 'production' : env.ORDER_STORE_LOCAL !== '1') return null;
  if (!env.ADMIN_SECRET) {
    console.error('order store: BLOB_READ_WRITE_TOKEN is set but ADMIN_SECRET is not — the store stays off');
    return null;
  }
  return blobAdapter(token);
}

// ——— the index and the archive pages: the cards of the list ———
/** an order's card for the shop's list = the record without the customer's e-mail (the list never shows it) */
const card = (rec) => {
  const { email, ...rest } = rec;
  void email;
  return rest;
};
/** the index since row 12c: { v: 2, orders: { ref: card }, done: { pageKey: cards in that page }, last: { year: the
 *  highest running number ever given } } — `last` keeps an erased order's number from being given again (its old
 *  links are signed with it). An index of row 12 ({ v: 1, orders }) reads as one with no pages yet. */
const shape = (ix) => Object.assign(ix, { v: 2, orders: ix.orders ?? {}, done: ix.done ?? {}, last: ix.last ?? {} });
const blankIndex = () => shape({});
const blankPage = () => ({ v: 1, orders: {} });
/** read → change → write only if no other write landed in between (ifMatch; a first write: create, never an
 *  overwrite); a refused write is retried on the fresh copy. `change` returning false = nothing to write. */
async function edit(store, path, blank, change, what) {
  for (let i = 0; i < 8; i++) {
    const cur = await store.read(path, { etag: true });
    const doc = cur ? cur.json : blank();
    if (change(doc) === false) return doc;
    try {
      await store.write(path, doc, cur ? { ifMatch: cur.etag } : { create: true });
      return doc;
    } catch (e) {
      if (!(e instanceof Conflict) && !(e instanceof Exists)) throw e;
    }
  }
  throw new Error(`${what}: busy`);
}
const indexEdit = (store, change) => edit(store, INDEX, blankIndex, (ix) => change(shape(ix)), 'order index');
const pageEdit = (store, key, change) => edit(store, pagePath(key), blankPage, change, 'order page');
export async function readIndex(store) {
  return shape((await store.read(INDEX))?.json ?? {});
}
/** one archive page's cards (a page not written yet: none); null for a key that is not a page's */
export async function readPage(store, key) {
  if (!isPageKey(key)) return null;
  return (await store.read(pagePath(key)))?.json ?? blankPage();
}

/** Put an order's card where it lies (order-keep.js inPage) and take it out of the other place: its archive page first,
 *  then the index (the page's count, the year's last number). `was` = where the card lay before this write ('page',
 *  'index', or null = not known: the page is looked at) — a step between open statuses never reads a page. Returns the
 *  index as written (its `done` goes back to the screen). */
async function place(store, rec, { was = null } = {}) {
  const key = pageOf(rec.year, rec.n);
  const there = inPage(rec);
  let delta = 0;
  if (there || was !== 'index')
    await pageEdit(store, key, (pg) => {
      const had = rec.ref in pg.orders;
      if (there) {
        pg.orders[rec.ref] = card(rec);
        delta = had ? 0 : 1;
        return;
      }
      delta = had ? -1 : 0;
      if (!had) return false;
      delete pg.orders[rec.ref];
    });
  return indexEdit(store, (ix) => {
    const before = JSON.stringify([ix.orders[rec.ref], ix.done[key], ix.last[rec.year]]);
    if (there) delete ix.orders[rec.ref];
    else ix.orders[rec.ref] = card(rec);
    const count = (ix.done[key] ?? 0) + delta;
    if (count > 0) ix.done[key] = count;
    else delete ix.done[key];
    ix.last[rec.year] = Math.max(ix.last[rec.year] ?? 0, rec.n);
    if (JSON.stringify([ix.orders[rec.ref], ix.done[key], ix.last[rec.year]]) === before) return false;
  });
}

// ——— the running number (docs/admin.md §2) ———
/** Claim SJ-<year>-<max+1> for the order and store it (status nouă): list the year, take max + 1 — and never below the
 *  index's `last` + 1, so the number of an erased order is not given again (row 12c) —, put without overwrite;
 *  „already exists” → the next number, five tries. The year is Brussels time (0001 again each January). Numbers are
 *  references, not invoices: a gap is allowed. `rec` = the order as it is kept. */
export async function claim(store, rec, now = Date.now()) {
  const year = brussels(new Date(now)).day.getUTCFullYear();
  const taken = (await store.list(`orders/${year}/`)).map((b) => Number(/\/(\d+)\.json$/.exec(b.path)?.[1])).filter(Number.isFinite);
  const last = (await readIndex(store)).last[year] ?? 0;
  let n = Math.max(taken.length ? Math.max(...taken) : 0, last) + 1;
  for (let i = 0; i < 5; i++, n++) {
    const stored = { ...rec, v: 1, ref: refOf(year, n), n, year, receivedAt: new Date(now).toISOString(), status: 'noua', history: [{ to: 'noua', at: new Date(now).toISOString() }], sent: {} };
    try {
      await store.write(pathOf(year, n), stored, { create: true });
    } catch (e) {
      // taken, or another order creating the same number at this moment (a racing write, row 12a) → the next number
      if (e instanceof Exists || e instanceof Conflict) continue;
      throw e;
    }
    // the list's card; if the index write fails the order still stands (the weekly sweep puts it back in the index)
    await place(store, stored, { was: 'index' }).catch((e) => console.error('order index: put failed', stored.ref, e.message));
    return stored;
  }
  throw new Error('order store: five numbers in a row were taken');
}
/** the order and its card, gone (the shop's mail failed: never an order on the screen the customer was told failed) */
export async function unclaim(store, rec) {
  await store.remove(pathOf(rec.year, rec.n));
  await indexEdit(store, (ix) => (rec.ref in ix.orders ? void delete ix.orders[rec.ref] : false)).catch((e) => console.error('order index: drop failed', rec.ref, e.message));
}

/** Erase one order on the customer's request (row 12c; the privacy page's right to erasure; „Șterge comanda” on
 *  /admin): the order's blob first — the customer's status link and the shop's step links answer as a wrong link from
 *  that moment —, then its card wherever it lies (its archive page, the index). No mail to anyone. A second tap finds
 *  nothing and writes nothing: { erased: false }. Returns { erased, done } (the index's pages, for the screen), or null
 *  for a reference that is not a running number. */
export async function erase(store, ref) {
  const p = parseRef(ref);
  if (!p) return null;
  const path = pathOf(p.year, p.n);
  const rec = (await store.read(path))?.json ?? null;
  if (rec) await store.remove(path);
  const key = pageOf(p.year, p.n);
  let delta = 0;
  await pageEdit(store, key, (pg) => {
    delta = ref in pg.orders ? -1 : 0;
    if (!delta) return false;
    delete pg.orders[ref];
  });
  let inIndex = false;
  const ix = await indexEdit(store, (x) => {
    inIndex = ref in x.orders;
    if (!inIndex && !delta && (x.last[p.year] ?? 0) >= p.n) return false;
    delete x.orders[ref];
    const count = (x.done[key] ?? 0) + delta;
    if (count > 0) x.done[key] = count;
    else delete x.done[key];
    x.last[p.year] = Math.max(x.last[p.year] ?? 0, p.n);
  });
  return { erased: !!(rec || inIndex || delta), done: ix.done };
}

/** one order, fresh from the store (null: no such order — erased on request, or an order received before KEEP_FROM
 *  gone after its 90 days) */
export async function readOrder(store, ref) {
  const p = parseRef(ref);
  return p ? (await store.read(pathOf(p.year, p.n)))?.json ?? null : null;
}

// ——— the steps (docs/admin.md §3) ———
/** Move an order to `to` (a later status only: a step link tapped twice, or after a later step, changes nothing), or one
 *  step `back` (Înapoi: the last step undone). The customer's mail of a step (confirmată, gata) is claimed in the same
 *  conditional write, once per order: a repeated tap — even after Înapoi — sends none. Then the card is put where it
 *  lies (place: a kept order picked up or delivered → its archive page; Înapoi from there → the index). Returns
 *  { rec, changed, mail, done } (done: the index's pages after the move; undefined if the card's write failed) or null
 *  (no such order). */
export async function step(store, ref, to, now = Date.now()) {
  const p = parseRef(ref);
  if (!p) return null;
  const at = new Date(now).toISOString();
  for (let i = 0; i < 6; i++) {
    const cur = await store.read(pathOf(p.year, p.n), { etag: true });
    if (!cur) return null;
    const rec = cur.json;
    const was = inPage(rec) ? 'page' : 'index';
    let mail = null;
    if (to === 'back') {
      if (rec.history.length < 2) return { rec, changed: false, mail };
      rec.history.pop();
      rec.status = rec.history.at(-1).to;
    } else {
      const fits = to === 'ridicata' ? rec.method !== 'delivery' : to === 'livrata' ? rec.method === 'delivery' : true;
      if (rank(to) < 0 || !fits || rank(to) <= rank(rec.status)) return { rec, changed: false, mail };
      rec.status = to;
      rec.history.push({ to, at });
      if ((to === 'confirmata' || to === 'gata') && !rec.sent?.[to]) {
        rec.sent = { ...rec.sent, [to]: at };
        mail = to;
      }
    }
    rec.changedAt = at;
    try {
      await store.write(pathOf(p.year, p.n), rec, { ifMatch: cur.etag });
    } catch (e) {
      if (e instanceof Conflict) continue;
      throw e;
    }
    const ix = await place(store, rec, { was }).catch((e) => void console.error('order index: put failed', rec.ref, e.message));
    return { rec, changed: true, mail, done: ix?.done };
  }
  throw new Error('order store: busy');
}
/** the step's mail did not go: free its claim, so a later tap can send it */
export async function unsend(store, ref, which) {
  const p = parseRef(ref);
  for (let i = 0; p && i < 6; i++) {
    const cur = await store.read(pathOf(p.year, p.n), { etag: true });
    if (!cur?.json.sent?.[which]) return;
    delete cur.json.sent[which];
    try {
      await store.write(pathOf(p.year, p.n), cur.json, { ifMatch: cur.etag });
      await place(store, cur.json, { was: inPage(cur.json) ? 'page' : 'index' }).catch((e) => console.error('order index: put failed', cur.json.ref, e.message));
      return;
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
    }
  }
}
export { nextOf };

// ——— how long an order stays (docs/admin.md §2; row 12c, order-keep.js) ———
/** an order received before KEEP_FROM, more than 90 days ago — the only order the sweeps erase */
const expired = (rec, now) => !kept(rec.receivedAt) && now - new Date(rec.receivedAt).getTime() > DAYS_KEPT_BEFORE * DAY;
/** the full sweep re-checks what was written in the last two weeks (it runs weekly: every write gets two looks) */
const RECENT = 14 * DAY;
/** The sweep. Light (each stored order, each opening of the list; one read of the index, no list()): the index's cards
 *  of orders received before KEEP_FROM and older than 90 days — their orders and cards deleted (deletes are free); a
 *  kept order picked up or delivered that still lies in the index (an index of row 12) moved to its page, once. Returns
 *  the index's cards and pages for the list (api/admin.js reads the index once per refresh).
 *  Full (the weekly cron): one list() of orders/ (one advanced operation per 1 000 blobs) —
 *    · an order blob written in the last 14 days (or last written before the switch day) that lies neither in the index
 *      nor in its page (a card's write that failed) is read and put back where it lies — or erased, if it is an order
 *      received before the switch day past its 90 days; one older than that was placed when it was last written and
 *      looked at by an earlier sweep, so the sweep does not read the archive;
 *    · an index card whose order is gone is dropped (cards younger than the list() itself are left alone);
 *    · an archive page written in the last 14 days is read: cards of orders that are gone dropped, its count in the
 *      index set to what it holds; a page key the index names but the store does not have is dropped;
 *    · the index's last number of each year raised to the highest order blob listed;
 *    · the login brake's counters older than a day. */
export async function sweep(store, now = Date.now(), { full = false } = {}) {
  const ix = await readIndex(store);
  const gone = [];
  const move = [];
  for (const [ref, c] of Object.entries(ix.orders)) {
    if (expired(c, now)) gone.push(ref);
    else if (inPage(c)) move.push(c);
  }
  for (const ref of gone) {
    const p = parseRef(ref);
    if (p) await store.remove(pathOf(p.year, p.n));
  }
  let cur = ix;
  if (gone.length) cur = await indexEdit(store, (x) => (gone.some((r) => r in x.orders) ? void gone.forEach((r) => delete x.orders[r]) : false));
  for (const c of move) cur = (await place(store, c, { was: 'index' }).catch((e) => void console.error('order index: move failed', c.ref, e.message))) ?? cur;
  if (!full) return { removed: gone.length, moved: move.length, cards: cur.orders, done: cur.done };

  const started = now;
  const blobs = [];
  const pages = new Map();
  for (const b of await store.list('orders/')) {
    let m = /^orders\/(\d{4})\/(\d+)\.json$/.exec(b.path);
    if (m) {
      const year = Number(m[1]);
      const n = Number(m[2]);
      blobs.push({ ...b, year, n, ref: refOf(year, n) });
      continue;
    }
    m = /^orders\/done\/(\d{4}-\d{3})\.json$/.exec(b.path);
    if (m) pages.set(m[1], b.at);
  }
  const listed = new Set(blobs.map((b) => b.ref).filter((r) => !gone.includes(r)));
  const seen = new Map();
  const pageOnce = async (key) => {
    if (!seen.has(key)) seen.set(key, await readPage(store, key));
    return seen.get(key);
  };
  let restored = 0;
  for (const b of blobs) {
    // looked at: written in the last two weeks, or last written before the switch day (an order received before it,
    // never changed since: few, and only until their 90 days end)
    if (gone.includes(b.ref) || b.ref in cur.orders || (now - b.at > RECENT && kept(new Date(b.at).toISOString()))) continue;
    if (pages.has(pageOf(b.year, b.n)) && b.ref in (await pageOnce(pageOf(b.year, b.n))).orders) continue;
    const rec = (await store.read(b.path))?.json;
    if (!rec) continue;
    if (expired(rec, now)) {
      await store.remove(b.path);
      gone.push(b.ref);
      listed.delete(b.ref);
      continue;
    }
    cur = (await place(store, rec)) ?? cur;
    if (inPage(rec)) pages.set(pageOf(rec.year, rec.n), now);
    restored++;
  }
  const counts = {};
  for (const [key, at] of pages) {
    if (now - at > RECENT) continue;
    const pg = await pageEdit(store, key, (x) => {
      const drop = Object.keys(x.orders).filter((r) => !listed.has(r));
      if (!drop.length) return false;
      for (const r of drop) delete x.orders[r];
    });
    counts[key] = Object.keys(pg.orders).length;
  }
  const top = {};
  for (const b of blobs) top[b.year] = Math.max(top[b.year] ?? 0, b.n);
  const stale = Object.entries(cur.orders)
    .filter(([r, c]) => !listed.has(r) && new Date(c.changedAt ?? c.receivedAt).getTime() < started - 60000)
    .map(([r]) => r);
  await indexEdit(store, (x) => {
    const before = JSON.stringify(x);
    for (const r of [...stale, ...gone]) delete x.orders[r];
    for (const [key, c] of Object.entries(counts)) {
      if (c) x.done[key] = c;
      else delete x.done[key];
    }
    for (const key of Object.keys(x.done)) if (!pages.has(key)) delete x.done[key];
    for (const [y, n] of Object.entries(top)) x.last[y] = Math.max(x.last[y] ?? 0, n);
    if (JSON.stringify(x) === before) return false;
  });
  let counters = 0;
  for (const b of await store.list('limits/'))
    if (now - b.at > DAY) {
      await store.remove(b.path);
      counters++;
    }
  return { removed: gone.length, moved: move.length, restored, stale: stale.length, pages: Object.keys(counts).length, counters };
}

// ——— the login brake (docs/admin.md §4) ———
// Five wrong passphrases in 15 minutes from one address → that address closed for 15 minutes: a counter blob under
// limits/login/<hash of the address>, swept after a day. Each wrong try is an upload (an advanced operation of the 2 000
// a month), so a running instance also stops writing counters after 60 in an hour and then closes the login for
// everyone for 15 minutes — a flood of wrong tries can then not use up the store the orders need.
const WINDOW = 15 * 60000;
const flood = { since: 0, writes: 0, closedUntil: 0 };
const counterPath = (key) => `limits/login/${key}.json`;
export async function loginClosed(store, key, now = Date.now()) {
  if (flood.closedUntil > now) return true;
  const c = (await store.read(counterPath(key)))?.json;
  return !!c && c.until > now;
}
/** a wrong passphrase: counted; true when the address is now closed */
export async function loginFailed(store, key, now = Date.now()) {
  if (now - flood.since > 3600000) Object.assign(flood, { since: now, writes: 0 });
  if (++flood.writes > 60) {
    flood.closedUntil = now + WINDOW;
    return true;
  }
  // read → count → write only if no other wrong try landed in between (a first try: create, never an overwrite); a
  // refused write is counted again on the fresh counter. A write that fails for any other reason is logged, never
  // swallowed (row 12a: a refused write used to leave the counter at one try and the brake open), and this answer still
  // follows the count it made.
  let until = 0;
  for (let i = 0; i < 4; i++) {
    const cur = await store.read(counterPath(key), { etag: true });
    const fails = [...(cur?.json.fails ?? []).filter((t) => now - t < WINDOW), now];
    until = fails.length >= 5 ? now + WINDOW : 0;
    try {
      await store.write(counterPath(key), { fails, until }, cur ? { ifMatch: cur.etag } : { create: true });
      return until > now;
    } catch (e) {
      if (e instanceof Conflict || e instanceof Exists) continue;
      console.error('login brake: counter write failed', e.message);
      return until > now;
    }
  }
  console.error('login brake: counter busy (four refused writes)');
  return until > now;
}
export const loginPassed = (store, key) => store.remove(counterPath(key)).catch(() => {});
/** the test's own reset of the instance-wide flood guard */
export const _flood = flood;
