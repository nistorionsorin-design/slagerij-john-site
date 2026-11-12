// /api/bestelling — the customer's status page's data (row 12; D-70; docs/admin.md §3.5; lexicon §5.40 / §6). The link
// in the customer's mails (/bestelling?r=…&k=…, signed with ADMIN_SECRET) is the permission: no login.
//   GET ?r&k → { ref, locale, method, step (0 Ontvangen · 1 In bereiding · 2 Klaar), moment } — the status and the pickup
//   or delivery moment only: never the name, phone, e-mail or address (docs/admin.md §3.5). A link that is not ours, or
//   an order gone after 90 days → 404 („Deze link is niet meer geldig”).
import { storeFor, readOrder } from '../src/lib/order-store.js';
import { checkStatus } from '../src/lib/order-sign.js';
import { dayLabel } from '../src/lib/order-core.js';
import { CUSTOMER } from '../src/lib/order-text.js';

/** test doubles (scripts/admin-test.mjs only) */
export const hooks = { store: null };
const answer = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
/** nouă and confirmată = received; în lucru = being made; gata and after = ready */
const STEP = { noua: 0, confirmata: 0, 'in-lucru': 1, gata: 2, ridicata: 2, livrata: 2 };

export default {
  async fetch(request) {
    if (request.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET' } });
    const env = process.env;
    const q = Object.fromEntries(new URL(request.url).searchParams);
    if (!checkStatus(env.ADMIN_SECRET, q)) return answer(404, { error: 'link' });
    const store = await storeFor(env, hooks.store).catch(() => null);
    if (!store) return answer(404, { error: 'link' });
    const rec = await readOrder(store, q.r);
    if (!rec) return answer(404, { error: 'link' });
    const c = CUSTOMER[rec.locale] ?? CUSTOMER.nl;
    const day = dayLabel(rec.date, rec.locale, 'long');
    return answer(200, {
      ref: rec.ref,
      locale: rec.locale,
      method: rec.method,
      step: STEP[rec.status] ?? 0,
      moment: rec.method === 'delivery' ? c.momentDelivery(day, rec.time) : c.momentPickup(day, rec.time),
    });
  },
};
