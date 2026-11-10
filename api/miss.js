// POST /api/miss — a question the assistant could not answer twice in a row (row 11b; D-58 point 3; the box sends it
// from src/scripts/qa-ui.ts after a miss-2, and only then: an allergen answer, a hand-off to a person or the order
// helper is never a miss). One row into `qa_misses` of the DGA metrics project (docs/sql/qa-misses-11b.sql, through
// src/lib/metrics.js): site · Brussels day · lang · page · q. The text is cut of every digit and e-mail address first
// (src/lib/assistant/misses.js cleanMiss — the box does the same before sending); the IP, the user-agent and the
// referrer are never read, nothing is set on the device.
// KEEP_DAYS (misses.js) is the 90 days of D-62 and the privacy page's line; set to null, the row is not inserted
// (under npm run dev it is printed). Without METRICS_URL / METRICS_KEY nothing is sent either (src/lib/metrics.js). The body is ≤ 600 bytes of JSON {lang, page, q}; anything else is dropped with one log
// line. The answer is always 204 (405 for another method). Locally inside `npm run dev` (astro.config.mjs, „api-dev”).
import { insertRow, siteId, brusselsDay } from '../src/lib/metrics.js';
import { cleanMiss, KEEP_DAYS } from '../src/lib/assistant/misses.js';

const MAX = 600;
const done = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
const drop = (why) => (console.log(JSON.stringify({ event: 'miss', drop: why })), done());

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
    let m;
    try {
      m = JSON.parse(text);
    } catch {
      return drop('json');
    }
    if (!m || typeof m !== 'object' || Array.isArray(m) || Object.keys(m).sort().join() !== 'lang,page,q') return drop('fields');
    const clean = cleanMiss(m);
    if (!clean) return drop('row');
    const row = { site_id: siteId(request), day: brusselsDay(), ...clean };
    if (!KEEP_DAYS) {
      // on Vercel not even the log line carries the text (the logs are a store too); under npm run dev the row shows
      console.log(JSON.stringify({ event: 'miss', kept: false, why: 'privacy line not live (misses.js KEEP_DAYS)', ...(process.env.VERCEL ? {} : { row }) }));
      return done();
    }
    await insertRow('qa_misses', row);
    return done();
  },
};
