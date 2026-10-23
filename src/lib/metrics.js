// The metrics spine, server side (row 13b, docs/metrics-spine.md §3–§4): one row into the DGA metrics project
// (Supabase `dga-metrics`, Frankfurt) through PostgREST — `hits` from api/hit.js, `wa_clicks` from api/wa.js.
// METRICS_URL + METRICS_KEY (the insert-only `ingest` role) are Vercel environment variables, never in this repo
// (D-26), and their values are never printed. Without them nothing is sent: on Vercel silently, under `npm run dev`
// the row is printed in the terminal instead. A failed insert logs one line and never throws — no page and no
// redirect depends on it.

/** The site the row belongs to, from the host the visitor asked for: slagerij-john.be → `slagerij-john`; a
    *.vercel.app deployment, localhost or anything else → `slagerij-john-preview`. */
export const siteId = (request) => {
  const host = (request.headers.get('x-forwarded-host') ?? '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  return host === 'slagerij-john.be' ? 'slagerij-john' : 'slagerij-john-preview';
};

/** Today in Brussels, YYYY-MM-DD (the `day` column). */
export const brusselsDay = (now = new Date()) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
};

/** Keep the function alive for `promise` after its response is sent: what @vercel/functions' waitUntil does (the
    request context Vercel puts on globalThis), without the package. Outside Vercel the promise simply runs on. */
export const afterResponse = (promise) => globalThis[Symbol.for('@vercel/request-context')]?.get?.()?.waitUntil?.(promise);

/** POST {METRICS_URL}/rest/v1/{table} with the row; resolves in every case. */
export async function insertRow(table, row) {
  const base = process.env.METRICS_URL;
  const key = process.env.METRICS_KEY;
  if (!base || !key) {
    if (!process.env.VERCEL) console.log(JSON.stringify({ event: 'metrics', table, dryRun: true, row }));
    return;
  }
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/rest/v1/${table}`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      // PostgREST's error code only (42501 no grant, 23503 unknown site_id, 23514 a check constraint …)
      const code = await res.json().then((b) => b?.code, () => undefined);
      console.log(JSON.stringify({ event: 'metrics', table, error: `http ${res.status}`, code }));
    }
  } catch (e) {
    console.log(JSON.stringify({ event: 'metrics', table, error: e?.name ?? 'error', cause: e?.cause?.code }));
  }
}
