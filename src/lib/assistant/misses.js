// The assistant's unanswered questions (row 11b; D-58 point 3; docs/sql/qa-misses-11b.sql): what a second miss in a row
// sends, what the function keeps of it, and the Romanian mail that lists the week's to the shop. Plain JavaScript (the
// Vercel functions api/miss.js and api/qa-digest.js import it as-is; the box imports `cleanMiss` too, so nothing with a
// digit or an e-mail address leaves the browser either).
// Kept: the question text — digits and e-mail addresses cut — its language, the page's path, the day. Never an IP, a
// user-agent, a session or any identifier.
// KEEP_DAYS: how long a question is kept, and the switch for keeping one at all. D-58 point 3 settles the mail „with one
// line on the privacy page”; that line (lexicon §5.34, src/i18n/legal.ts `missLine`) names the 90 days — D-62 (Dan
// 10.11 12:05): yes. With KEEP_DAYS set, /privacy carries the line and api/miss.js inserts; null takes both away
// together (api/miss.js then keeps nothing). The erasing after 90 days is the database's (qa-misses-11b.sql, the
// weekly call).
export const KEEP_DAYS = 90;

/** The row a miss becomes, or null: lang nl · ro; page a path (no query, no fragment, ≤ 200, never /admin); q the text
 *  with every e-mail address and every digit cut, spaces folded, 2–200 characters (the table refuses anything else). */
export function cleanMiss(m) {
  if (!m || typeof m !== 'object') return null;
  const lang = m.lang === 'ro' ? 'ro' : m.lang === 'nl' ? 'nl' : null;
  const page = typeof m.page === 'string' ? m.page.split(/[?#]/)[0].slice(0, 200) : '';
  if (!lang || !page.startsWith('/') || /[\u0000-\u001f\u007f]/.test(page) || /^\/admin(\/|$)/.test(page)) return null;
  const q = String(m.q ?? '')
    .replace(/\S*@\S*/g, ' ')
    .replace(/[0-9]/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
    .trim();
  if (q.length < 2) return null;
  return { lang, page, q };
}

const RO_DAY = ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'];
const RO_M = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** „joi 12 nov” (order-core.js dayLabel, short, RO) */
const day = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return `${RO_DAY[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()} ${RO_M[d.getUTCMonth()]}`;
};
/** Romanian: a count whose last two figures are 20–99 or 00 takes „de” („20 de întrebări”) — RO bible numerals rule */
const count = (n) => (n % 100 >= 20 || (n >= 100 && n % 100 === 0) ? `${n} de` : `${n}`);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The weekly mail to the shop, in Romanian (lexicon §6 „Asistent, comanda, 10.11” — no Dutch version): subject,
 *  greeting, one line per question „{date} · {page} · {q}”, the close, the foot. `rows` = qa_misses_week(). */
export function digestMail(rows) {
  const n = rows.length;
  const subject = `Întrebări fără răspuns pe site: ${n}`;
  const intro = `Bună dimineața! Săptămâna trecută asistentul de pe site nu a știut să răspundă la ${count(n)} întrebări. Le găsiți mai jos, așa cum au fost scrise, fără cifre și fără adrese de e-mail.`;
  const lines = rows.map((r) => `${day(r.day)} · ${r.page} · ${r.q}`);
  const close = 'Trimiteți-i lui Dan Gabriel răspunsurile pe WhatsApp și le adăugăm pe site.';
  const foot = 'Asistentul site-ului este făcut de DanGabriel Advisory.';
  const text = [intro, '', ...lines, '', close, '', foot].join('\n');
  const html = `<!doctype html><html lang="ro"><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1511"><p>${esc(intro)}</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p>${esc(close)}</p><p style="color:#5e534a;font-size:13px">${esc(foot)}</p></body></html>`;
  return { subject, text, html };
}
