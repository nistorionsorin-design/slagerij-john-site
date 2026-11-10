// GET /api/qa-digest — the weekly mail of unanswered questions (row 11b; D-58 point 3). Called by the Vercel cron of
// vercel.json (Monday 06:00 UTC = 07:00 in Brussels in winter, 08:00 in summer; cron times are UTC), which sends
// `Authorization: Bearer <CRON_SECRET>` — without CRON_SECRET set, or with another header, the answer is 401 and
// nothing is read or sent. Reads the last 7 days through qa_misses_week(site, QA_DIGEST_TOKEN)
// (docs/sql/qa-misses-11b.sql: the token's sha256 sits in the database, the token only in Vercel) and, when there are
// rows, sends the Romanian mail of lexicon §6 (src/lib/assistant/misses.js digestMail) through the order mail's Resend
// setup (RESEND_API_KEY · ORDER_MAIL_FROM) to ORDER_MAIL_TO (default: entity.json e-mail). No rows, no token, no keys →
// nothing is sent; the answer says which, never a value. Secrets only as Vercel environment variables (D-26).
// QA_DIGEST_DRY_RUN=1 builds the mail and prints its subject without sending (a preview deployment).
import { readFileSync } from 'node:fs';
import { digestMail } from '../src/lib/assistant/misses.js';

const entity = JSON.parse(readFileSync(new URL('../src/data/entity.json', import.meta.url), 'utf8'));
const answer = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const log = (o) => console.log(JSON.stringify({ event: 'qa-digest', ...o }));

export default {
  async fetch(request) {
    const env = process.env;
    if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) return answer(401, { ok: false });
    // the production site's rows; a preview deployment reads the preview site's
    const site = env.VERCEL_ENV === 'production' ? 'slagerij-john' : 'slagerij-john-preview';
    if (!env.METRICS_URL || !env.METRICS_KEY || !env.QA_DIGEST_TOKEN) {
      log({ sent: false, why: 'keys' });
      return answer(200, { ok: true, sent: false, why: 'keys' });
    }
    let rows;
    try {
      const r = await fetch(`${env.METRICS_URL.replace(/\/+$/, '')}/rest/v1/rpc/qa_misses_week`, {
        method: 'POST',
        headers: { apikey: env.METRICS_KEY, authorization: `Bearer ${env.METRICS_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ p_site: site, p_token: env.QA_DIGEST_TOKEN }),
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) {
        log({ sent: false, why: `rpc http ${r.status}` });
        return answer(200, { ok: false, sent: false, why: 'rpc' });
      }
      rows = await r.json();
    } catch (e) {
      log({ sent: false, why: e?.name ?? 'rpc error' });
      return answer(200, { ok: false, sent: false, why: 'rpc' });
    }
    if (!Array.isArray(rows) || !rows.length) {
      log({ sent: false, rows: 0 });
      return answer(200, { ok: true, sent: false, rows: 0 });
    }
    const mail = digestMail(rows);
    if (env.QA_DIGEST_DRY_RUN === '1' || !env.RESEND_API_KEY || !env.ORDER_MAIL_FROM) {
      log({ sent: false, rows: rows.length, why: env.QA_DIGEST_DRY_RUN === '1' ? 'dry run' : 'mail keys', subject: mail.subject });
      return answer(200, { ok: true, sent: false, rows: rows.length });
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.ORDER_MAIL_FROM, to: [env.ORDER_MAIL_TO || entity.email], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);
    log({ sent: !!r?.ok, rows: rows.length, status: r?.status ?? 0 });
    return answer(200, { ok: !!r?.ok, sent: !!r?.ok, rows: rows.length });
  },
};
