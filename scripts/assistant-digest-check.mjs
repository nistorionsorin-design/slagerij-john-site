// The weekly mail of unanswered questions, checked without the network (row 11b, test ms-04): api/qa-digest.js runs
// with `fetch` stubbed — the database's qa_misses_week answers rows for the right token and none for a wrong one (as
// the SQL does), Resend's /emails records the mail. Nothing leaves this machine. Used by scripts/assistant-test-11b.mjs.
const ROWS = [
  { day: '2026-11-09', lang: 'nl', page: '/producten', q: 'hebben jullie hertenvlees' },
  { day: '2026-11-11', lang: 'ro', page: '/ro/produse', q: 'aveți carne de cerb' },
];

export async function digestCheck() {
  const real = globalThis.fetch;
  const keep = { ...process.env };
  const sent = [];
  let rowsFor = (token) => (token === 'right-token' ? ROWS : []);
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.endsWith('/rest/v1/rpc/qa_misses_week')) return new Response(JSON.stringify(rowsFor(JSON.parse(init.body).p_token)), { status: 200 });
    if (u === 'https://api.resend.com/emails') {
      sent.push(JSON.parse(init.body));
      return new Response('{"id":"stub"}', { status: 200 });
    }
    throw new Error(`no network in this check: ${u}`);
  };
  Object.assign(process.env, { CRON_SECRET: 'cron', METRICS_URL: 'https://stub.supabase.co', METRICS_KEY: 'stub', QA_DIGEST_TOKEN: 'right-token', RESEND_API_KEY: 'stub', ORDER_MAIL_FROM: 'bestellingen@slagerij-john.be', VERCEL_ENV: 'production' });
  delete process.env.QA_DIGEST_DRY_RUN;
  const { default: fn } = await import('../api/qa-digest.js');
  const call = (auth) => fn.fetch(new Request('https://slagerij-john.be/api/qa-digest', { headers: auth ? { authorization: auth } : {} }));
  const why = [];
  try {
    const a = await call(null);
    if (a.status !== 401) why.push(`no cron header → ${a.status}, not 401`);
    const b = await call('Bearer cron');
    const bj = await b.json();
    if (!bj.sent || sent.length !== 1) why.push('rows in the week → no mail');
    const m = sent[0] ?? {};
    if (m.subject !== 'Întrebări fără răspuns pe site: 2') why.push(`subject „${m.subject}”`);
    if (!/^Bună dimineața! Săptămâna trecută asistentul de pe site nu a știut să răspundă la 2 întrebări\./.test(m.text ?? '')) why.push('the body does not open with the §6 line');
    if (!(m.text ?? '').includes('luni 9 nov · /producten · hebben jullie hertenvlees')) why.push('the list line {date} · {page} · {q}');
    if (!(m.to ?? []).includes('info@slagerij-john.be')) why.push(`to ${m.to}`);
    process.env.QA_DIGEST_TOKEN = 'wrong-token';
    const c = await (await call('Bearer cron')).json();
    if (c.sent || sent.length !== 1) why.push('a wrong token sent a mail');
    process.env.QA_DIGEST_TOKEN = 'right-token';
    rowsFor = () => [];
    const d = await (await call('Bearer cron')).json();
    if (d.sent || sent.length !== 1) why.push('0 rows sent a mail');
    return { ok: !why.length, why: why.join('; '), mail: { lang: 'ro', subject: m.subject, to: m.to, lines: (m.text ?? '').split('\n') } };
  } finally {
    globalThis.fetch = real;
    for (const k of Object.keys(process.env)) if (!(k in keep)) delete process.env[k];
    Object.assign(process.env, keep);
  }
}
