// POST /api/hit — the page-view beacon of src/scripts/hit.ts (row 13b, docs/metrics-spine.md §4). One row into `hits`
// of the DGA metrics project (src/lib/metrics.js): site · Brussels day · path · locale · referrer class · device bucket
// · country. The country is the two letters of Vercel's x-vercel-ip-country header; the IP, the user-agent string and
// the referrer URL are never read or kept, and nothing is set on the device (BE-05: no cookie, so no banner).
// The body is ≤ 300 bytes of JSON with exactly the four fields p · l · r · d, each checked against the enums of the
// `hits` table (§3); anything else is dropped with one log line. The answer is always 204 (405 for another method):
// the page never waits on it and never sees an error. Locally inside `npm run dev` (astro.config.mjs, „api-dev”).
import { insertRow, siteId, brusselsDay } from '../src/lib/metrics.js';

const MAX = 300;
const FIELDS = ['d', 'l', 'p', 'r'];
const LOCALES = new Set(['nl', 'ro', 'en']);
const REFS = new Set(['google', 'bing', 'facebook', 'instagram', 'tiktok', 'whatsapp', 'roflandra', 'direct', 'other']);
const DEVICES = new Set(['sm', 'md', 'lg']);

const done = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
const drop = (why) => (console.log(JSON.stringify({ event: 'hit', drop: why })), done());

/** The body as text, or null past MAX bytes (stops reading there). */
async function body(request) {
  const reader = request.body?.getReader();
  const chunks = [];
  for (let n = 0; reader; ) {
    const { done: end, value } = await reader.read();
    if (end) break;
    if ((n += value.byteLength) > MAX) return reader.cancel().then(() => null);
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST', 'cache-control': 'no-store' } });
    if (Number(request.headers.get('content-length') ?? 0) > MAX) return drop('size');
    const text = await body(request);
    if (text === null) return drop('size');
    let hit;
    try {
      hit = JSON.parse(text);
    } catch {
      return drop('json');
    }
    if (!hit || typeof hit !== 'object' || Array.isArray(hit) || Object.keys(hit).sort().join() !== FIELDS.join()) return drop('fields');
    // the pathname only: no query string or fragment, ≤ 200 characters, never /admin
    const path = typeof hit.p === 'string' ? hit.p.split(/[?#]/)[0].slice(0, 200) : '';
    if (!path.startsWith('/') || /[\u0000-\u001f\u007f]/.test(path) || /^\/admin(\/|$)/.test(path)) return drop('p');
    if (!LOCALES.has(hit.l)) return drop('l');
    if (!REFS.has(hit.r)) return drop('r');
    if (!DEVICES.has(hit.d)) return drop('d');
    const country = request.headers.get('x-vercel-ip-country') ?? '';
    await insertRow('hits', {
      site_id: siteId(request),
      day: brusselsDay(),
      path,
      locale: hit.l,
      ref: hit.r,
      device: hit.d,
      country: /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : null,
    });
    return done();
  },
};
