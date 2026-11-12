// /api/admin — the shop's order screen (row 12; D-24 · D-70; docs/admin.md §3 · §4). A Vercel Function (Web handler).
// The page /admin is a static shell (src/components/Admin.astro): no order in its HTML or script; everything comes from
// here, after the checks. Romanian strings: src/lib/order-text.js (lexicon §6 „Comenzi și pașii comenzii”).
//   GET  ?op=list                    the cookie → the cards of the store's index, newest first (+ the light sweep)
//   GET  ?op=step&r&s&e&k            a signed step link (the shop's mail) → the order's reference, name and status only;
//                                    a GET never changes anything (a mail scanner may follow links)
//   GET  ?op=sweep                   the weekly cron (vercel.json, Mondays 03:00 UTC; Authorization: Bearer CRON_SECRET) → the full sweep
//   POST {op:'login', pass}          the passphrase (ADMIN_PASS_HASH, scrypt) → the cookie; five wrong in 15 minutes from
//                                    one address → 15 minutes closed (429)
//   POST {op:'logout'}               the cookie ends („Ieși”)
//   POST {op:'next'|'back', ref}     the cookie → the card's next step, or Înapoi
//   POST {op:'step', r, s, e, k}     the signed step link's button (/admin/pas) → that step, no password
// Every POST: content-type application/json and the header x-admin: 1 (no cross-site form can send it) + the cookie
// HttpOnly · Secure · SameSite=Strict, 30 days. The customer's mail of a step (confirmată, gata) goes once per order.
// Secrets only as Vercel environment variables (D-26): ADMIN_PASS_HASH · ADMIN_SECRET · BLOB_READ_WRITE_TOKEN ·
// CRON_SECRET (+ the order mails' RESEND_API_KEY · ORDER_MAIL_FROM). Without the store every op answers 503.
import { readFileSync } from 'node:fs';
import { storeFor, readIndex, readOrder, step, unsend, sweep, loginClosed, loginFailed, loginPassed, nextOf } from '../src/lib/order-store.js';
import { checkStep, checkSession, sessionValue, checkPass, addressKey, signStatus, SESSION_DAYS, DAY } from '../src/lib/order-sign.js';
import { rank } from '../src/lib/order-text.js';
import { stepMail, sendMail } from './order.js';

const hours = JSON.parse(readFileSync(new URL('../src/data/hours.json', import.meta.url), 'utf8'));
const entity = JSON.parse(readFileSync(new URL('../src/data/entity.json', import.meta.url), 'utf8'));

/** test doubles (scripts/admin-test.mjs only): the store, the clock */
export const hooks = { store: null, now: null };
const COOKIE = 'sj_admin';
const answer = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...headers } });
const cookieOf = (request) => (request.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? '';
const setCookie = (value, maxAge) => `${COOKIE}=${value}; Path=/api/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
const STEP_IDS = new Set(['confirmata', 'in-lucru', 'gata']);

/** the step's customer mail, when the step claimed one: sent through the order mails' Resend setup; if it does not go,
 *  its claim is freed (a later tap can send it) and the answer says „Salvat.” without „Clientul a primit e-mailul.” */
async function mailOf(env, store, origin, res) {
  if (!res?.mail) return false;
  const { rec } = res;
  const base = env.VERCEL_ENV === 'production' ? entity.url : origin;
  const s = signStatus(env.ADMIN_SECRET, rec.ref);
  try {
    if (!env.RESEND_API_KEY || !env.ORDER_MAIL_FROM) throw new Error('mail not configured');
    await sendMail(env, rec.email, stepMail(rec, res.mail, `${base}/bestelling?${new URLSearchParams(s)}`, hours));
    return true;
  } catch (e) {
    console.error('admin: step mail failed', rec.ref, res.mail, e.message);
    await unsend(store, rec.ref, res.mail).catch(() => {});
    return false;
  }
}
/** what the shop's screen gets of an order: the card (the record without the e-mail, as the index keeps it) */
const cardOf = (rec) => {
  const { email, ...c } = rec;
  void email;
  return c;
};

export default {
  async fetch(request) {
    const env = process.env;
    const now = hooks.now?.() ?? Date.now();
    const url = new URL(request.url);
    const op = url.searchParams.get('op');
    const store = await storeFor(env, hooks.store).catch((e) => (console.error('admin: store', e.message), null));

    if (request.method === 'GET') {
      if (op === 'sweep') {
        if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) return answer(401, { error: 'auth' });
        if (!store) return answer(503, { error: 'off' });
        return answer(200, await sweep(store, now, { full: true }));
      }
      if (op === 'step') {
        const q = Object.fromEntries(url.searchParams);
        if (!checkStep(env.ADMIN_SECRET, q, now) || !STEP_IDS.has(q.s)) return answer(401, { error: 'link' });
        if (!store) return answer(503, { error: 'off' });
        const rec = await readOrder(store, q.r);
        if (!rec) return answer(404, { error: 'gone' });
        return answer(200, { ref: rec.ref, name: rec.name, step: q.s, status: rec.status, done: rank(rec.status) >= rank(q.s), locale: rec.locale, phone: rec.phone });
      }
      if (op === 'list') {
        const who = checkSession(env.ADMIN_SECRET, cookieOf(request), now);
        if (who !== 'ok') return answer(401, { error: who === 'expired' ? 'expired' : 'login' });
        if (!store) return answer(503, { error: 'off' });
        // one read of the index per refresh (a simple operation of the Hobby plan's 10 000 a month): the light sweep
        // reads it and hands back the cards it kept; only when the sweep fails is it read again
        const kept = await sweep(store, now).then((s) => s.cards, (e) => void console.error('admin: sweep failed', e.message));
        const cards = kept ?? (await readIndex(store)).orders;
        const orders = Object.values(cards).sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
        return answer(200, { orders, at: new Date(now).toISOString() });
      }
      return answer(404, { error: 'op' });
    }
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'GET, POST' } });
    // a change: JSON and our own header only — a cross-site form can send neither
    if (!(request.headers.get('content-type') ?? '').startsWith('application/json') || request.headers.get('x-admin') !== '1') return answer(403, { error: 'origin' });
    const raw = await request.text();
    if (raw.length > 4096) return answer(413, { error: 'size' });
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return answer(400, { error: 'format' });
    }
    if (!store) return answer(503, { error: 'off' });

    if (m.op === 'login') {
      const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
      const key = addressKey(env.ADMIN_SECRET ?? '', ip);
      if (await loginClosed(store, key, now)) return answer(429, { error: 'locked' });
      if (!env.ADMIN_PASS_HASH || !env.ADMIN_SECRET || !(await checkPass(env.ADMIN_PASS_HASH, m.pass))) {
        const closed = await loginFailed(store, key, now);
        return answer(closed ? 429 : 401, { error: closed ? 'locked' : 'wrong' });
      }
      await loginPassed(store, key);
      return answer(200, { ok: true }, { 'set-cookie': setCookie(sessionValue(env.ADMIN_SECRET, now), SESSION_DAYS * (DAY / 1000)) });
    }
    if (m.op === 'logout') return answer(200, { ok: true }, { 'set-cookie': setCookie('', 0) });

    if (m.op === 'step') {
      // the button of /admin/pas: the signed link is the permission (docs/admin.md §3.2: no password for this one step)
      if (!checkStep(env.ADMIN_SECRET, m, now) || !STEP_IDS.has(m.s)) return answer(401, { error: 'link' });
      const res = await step(store, m.r, m.s, now);
      if (!res) return answer(404, { error: 'gone' });
      const mailed = await mailOf(env, store, url.origin, res);
      return answer(200, { ok: true, changed: res.changed, mailed, status: res.rec.status, ref: res.rec.ref, name: res.rec.name, locale: res.rec.locale, phone: res.rec.phone });
    }
    if (m.op === 'next' || m.op === 'back') {
      const who = checkSession(env.ADMIN_SECRET, cookieOf(request), now);
      if (who !== 'ok') return answer(401, { error: who === 'expired' ? 'expired' : 'login' });
      if (typeof m.ref !== 'string') return answer(400, { error: 'ref' });
      const cur = await readOrder(store, m.ref);
      if (!cur) return answer(404, { error: 'gone' });
      const to = m.op === 'back' ? 'back' : nextOf(cur.status, cur.method);
      if (!to) return answer(200, { ok: true, changed: false, order: cardOf(cur) });
      const res = await step(store, m.ref, to, now);
      if (!res) return answer(404, { error: 'gone' });
      const mailed = await mailOf(env, store, url.origin, res);
      return answer(200, { ok: true, changed: res.changed, mailed, order: cardOf(res.rec) });
    }
    return answer(400, { error: 'op' });
  },
};
