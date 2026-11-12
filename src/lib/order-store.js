// Row 12 (D-24 · D-70, docs/admin.md §2) — the order store: one private Vercel Blob store in the owners' project, one JSON
// per order at orders/<year>/<0001>.json, the running number SJ-<year>-0001, the five statuses, 90 days, the login brake.
// Server side only (the functions api/order.js · api/admin.js · api/bestelling.js); no order ever reaches the repo, the
// built HTML or a script.
//
// The Hobby plan's Blob allowance (read 11.11 on vercel.com/docs/vercel-blob/usage-and-pricing, [OFFICIAL]): 1 GB, the
// first 10 000 simple operations (reads) and 2 000 advanced operations (uploads, lists) a month; beyond that „you will not
// be able to access Vercel Blob … until 30 days have passed” — the order store would stop. So the shop's list (refreshed
// each minute while open) reads ONE blob, orders/index.json (the live orders' cards), never list() + every order; list()
// runs once per order (the running number) and once a day (the sweep cron). The index is a copy inside the same store,
// swept with the orders; the order's own blob stays the truth (status changes are written there first, with ifMatch).
//
// Adapters (same rules both): blobAdapter(token) — @vercel/blob, private access, loaded only when a token is set (the
// install is Dan's step: it needs his dev server stopped, CLAUDE.md) · memoryAdapter() — the test double.
import { brussels } from './order-core.js';
import { rank, nextOf } from './order-text.js';

export class Exists extends Error {}
export class Conflict extends Error {}

export const DAYS_KEPT = 90;
const DAY = 86400000;
export const INDEX = 'orders/index.json';
const pad = (n) => String(n).padStart(4, '0');
export const pathOf = (year, n) => `orders/${year}/${pad(n)}.json`;
export const refOf = (year, n) => `SJ-${year}-${pad(n)}`;
/** a running number's year and number; null for anything else (a random page reference SJ-2026-AB7K among them) */
export const parseRef = (ref) => {
  const m = /^SJ-(\d{4})-(\d{4,6})$/.exec(String(ref ?? ''));
  return m ? { year: Number(m[1]), n: Number(m[2]) } : null;
};

/** @vercel/blob (private store). `create` = put without overwrite (an existing pathname → Exists); `ifMatch` = a write
 *  only when the ETag still matches (else Conflict). Reads bypass the CDN cache (useCache false: a status just changed). */
export async function blobAdapter(token) {
  const sdk = await import('@vercel/blob');
  const read = async (path) => {
    const r = await sdk.get(path, { access: 'private', token, useCache: false });
    if (!r || r.statusCode !== 200 || !r.stream) return null;
    return { etag: r.blob.etag, json: JSON.parse(await new Response(r.stream).text()) };
  };
  return {
    read,
    async write(path, json, { create = false, ifMatch } = {}) {
      try {
        const r = await sdk.put(path, JSON.stringify(json), { access: 'private', token, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: !create, ...(ifMatch ? { ifMatch } : {}) });
        return { etag: r.etag };
      } catch (e) {
        if (e instanceof sdk.BlobPreconditionFailedError) throw new Conflict(path);
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
 *  requests do), the calls counted (the quota). `fail` = { write: (path) => bool } to make a write throw. */
export function memoryAdapter({ now = () => Date.now() } = {}) {
  const m = new Map();
  let tag = 0;
  const ops = { read: 0, write: 0, list: 0, remove: 0 };
  const tick = () => new Promise((r) => setImmediate(r));
  return {
    map: m,
    ops,
    fail: {},
    async read(path) {
      await tick();
      ops.read++;
      const x = m.get(path);
      return x ? { etag: x.etag, json: JSON.parse(x.body) } : null;
    },
    async write(path, json, { create = false, ifMatch } = {}) {
      await tick();
      ops.write++;
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

// ——— the index: the cards of the list, one read ———
/** an order's card for the shop's list = the record without the customer's e-mail (the list never shows it) */
const card = (rec) => {
  const { email, ...rest } = rec;
  void email;
  return rest;
};
async function indexEdit(store, edit) {
  for (let i = 0; i < 8; i++) {
    const cur = await store.read(INDEX);
    const ix = cur?.json ?? { v: 1, orders: {} };
    if (edit(ix) === false) return ix;
    try {
      await store.write(INDEX, ix, cur ? { ifMatch: cur.etag } : { create: true });
      return ix;
    } catch (e) {
      if (!(e instanceof Conflict) && !(e instanceof Exists)) throw e;
    }
  }
  throw new Error('order index: busy');
}
const indexPut = (store, rec) => indexEdit(store, (ix) => void (ix.orders[rec.ref] = card(rec)));
const indexDrop = (store, refs) => indexEdit(store, (ix) => (refs.some((r) => r in ix.orders) ? void refs.forEach((r) => delete ix.orders[r]) : false));
export async function readIndex(store) {
  return (await store.read(INDEX))?.json ?? { v: 1, orders: {} };
}

// ——— the running number (docs/admin.md §2) ———
/** Claim SJ-<year>-<max+1> for the order and store it (status nouă): list the year, take max + 1, put without overwrite;
 *  „already exists” → the next number, five tries. The year is Brussels time (0001 again each January). Numbers are
 *  references, not invoices: a gap is allowed. `rec` = the order as it is kept. */
export async function claim(store, rec, now = Date.now()) {
  const year = brussels(new Date(now)).day.getUTCFullYear();
  const taken = (await store.list(`orders/${year}/`)).map((b) => Number(/\/(\d+)\.json$/.exec(b.path)?.[1])).filter(Number.isFinite);
  let n = (taken.length ? Math.max(...taken) : 0) + 1;
  for (let i = 0; i < 5; i++, n++) {
    const kept = { ...rec, v: 1, ref: refOf(year, n), n, year, receivedAt: new Date(now).toISOString(), status: 'noua', history: [{ to: 'noua', at: new Date(now).toISOString() }], sent: {} };
    try {
      await store.write(pathOf(year, n), kept, { create: true });
    } catch (e) {
      if (e instanceof Exists) continue;
      throw e;
    }
    // the list's card; if the index write fails the order still stands (the weekly sweep puts it back in the index)
    await indexPut(store, kept).catch((e) => console.error('order index: put failed', kept.ref, e.message));
    return kept;
  }
  throw new Error('order store: five numbers in a row were taken');
}
/** the order and its card, gone (the shop's mail failed: never an order on the screen the customer was told failed) */
export async function unclaim(store, rec) {
  await store.remove(pathOf(rec.year, rec.n));
  await indexDrop(store, [rec.ref]).catch((e) => console.error('order index: drop failed', rec.ref, e.message));
}

/** one order, fresh from the store (null: no such order, or gone after 90 days) */
export async function readOrder(store, ref) {
  const p = parseRef(ref);
  return p ? (await store.read(pathOf(p.year, p.n)))?.json ?? null : null;
}

// ——— the steps (docs/admin.md §3) ———
/** Move an order to `to` (a later status only: a step link tapped twice, or after a later step, changes nothing), or one
 *  step `back` (Înapoi: the last step undone). The customer's mail of a step (confirmată, gata) is claimed in the same
 *  conditional write, once per order: a repeated tap — even after Înapoi — sends none. Returns { rec, changed, mail }
 *  or null (no such order). */
export async function step(store, ref, to, now = Date.now()) {
  const p = parseRef(ref);
  if (!p) return null;
  const at = new Date(now).toISOString();
  for (let i = 0; i < 6; i++) {
    const cur = await store.read(pathOf(p.year, p.n));
    if (!cur) return null;
    const rec = cur.json;
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
    try {
      await store.write(pathOf(p.year, p.n), rec, { ifMatch: cur.etag });
    } catch (e) {
      if (e instanceof Conflict) continue;
      throw e;
    }
    await indexPut(store, rec).catch((e) => console.error('order index: put failed', rec.ref, e.message));
    return { rec, changed: true, mail };
  }
  throw new Error('order store: busy');
}
/** the step's mail did not go: free its claim, so a later tap can send it */
export async function unsend(store, ref, which) {
  const p = parseRef(ref);
  for (let i = 0; p && i < 6; i++) {
    const cur = await store.read(pathOf(p.year, p.n));
    if (!cur?.json.sent?.[which]) return;
    delete cur.json.sent[which];
    try {
      await store.write(pathOf(p.year, p.n), cur.json, { ifMatch: cur.etag });
      await indexPut(store, cur.json).catch(() => {});
      return;
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
    }
  }
}
export { nextOf };

// ——— 90 days (docs/admin.md §2) ———
const old = (iso, now) => now - new Date(iso).getTime() > DAYS_KEPT * DAY;
/** The sweep. Light (each stored order, each opening of the list): the index's cards older than 90 days after
 *  receivedAt — their orders and cards deleted (deletes are free); no list(). Full (the weekly cron, docs/admin.md §2): one list() of
 *  orders/ — every order blob checked by its own receivedAt (an order missing from the index is read and put back in it,
 *  a card whose order is gone is dropped), and the login brake's counters older than a day. */
export async function sweep(store, now = Date.now(), { full = false } = {}) {
  const ix = await readIndex(store);
  const gone = [];
  for (const [ref, c] of Object.entries(ix.orders)) if (old(c.receivedAt, now)) gone.push(ref);
  for (const ref of gone) {
    const p = parseRef(ref);
    if (p) await store.remove(pathOf(p.year, p.n));
  }
  if (!full) {
    if (gone.length) await indexDrop(store, gone);
    // the cards that stay, for the list (api/admin.js): the index is read once per refresh
    const cards = Object.fromEntries(Object.entries(ix.orders).filter(([ref]) => !gone.includes(ref)));
    return { removed: gone.length, cards };
  }
  const blobs = (await store.list('orders/')).filter((b) => b.path !== INDEX && /^orders\/\d{4}\/\d+\.json$/.test(b.path));
  const live = new Set();
  for (const b of blobs) {
    const [, year, n] = /^orders\/(\d{4})\/(\d+)\.json$/.exec(b.path);
    const ref = refOf(Number(year), Number(n));
    if (gone.includes(ref)) continue;
    const c = ix.orders[ref];
    if (c && !old(c.receivedAt, now)) {
      live.add(ref);
      continue;
    }
    const rec = c ? null : (await store.read(b.path))?.json;
    if (c || (rec && old(rec.receivedAt, now))) {
      await store.remove(b.path);
      gone.push(ref);
    } else if (rec) {
      await indexPut(store, rec);
      live.add(ref);
    }
  }
  const stale = Object.keys(ix.orders).filter((r) => !live.has(r));
  if (stale.length) await indexDrop(store, stale);
  let counters = 0;
  for (const b of await store.list('limits/'))
    if (now - b.at > DAY) {
      await store.remove(b.path);
      counters++;
    }
  return { removed: gone.length, counters };
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
  const cur = await store.read(counterPath(key));
  const fails = [...(cur?.json.fails ?? []).filter((t) => now - t < WINDOW), now];
  const until = fails.length >= 5 ? now + WINDOW : 0;
  await store.write(counterPath(key), { fails, until }, cur ? { ifMatch: cur.etag } : {}).catch(() => {});
  return until > now;
}
export const loginPassed = (store, key) => store.remove(counterPath(key)).catch(() => {});
/** the test's own reset of the instance-wide flood guard */
export const _flood = flood;
