// Row 12 (docs/admin.md §3.2, §3.5, §4) — the signatures of the private pages, server side only (node:crypto). One secret,
// ADMIN_SECRET (32 random bytes, a Vercel environment variable, never in the repo — D-26), signs three things, each with
// its own purpose word so one can never stand in for another:
//   step   the three buttons in the shop's mail: reference + step + expiry (30 days) → /admin/pas
//   status the customer's link: reference → /bestelling (valid while the order exists: until it is erased, row 12c)
//   session the shop's cookie: expiry (30 days on her phone)
// The passphrase is checked against ADMIN_PASS_HASH (scrypt, made by scripts/admin-pass.mjs on Dan's machine).
import { createHmac, createHash, scrypt, timingSafeEqual, randomBytes } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const mac = (secret, ...parts) => b64u(createHmac('sha256', secret).update(parts.join('|')).digest());
/** a constant-time comparison of two strings of any length */
const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export const DAY = 86400000;
export const STEP_DAYS = 30;
export const SESSION_DAYS = 30;

/** the signed query of a step button: r · s · e · k */
export function signStep(secret, ref, step, now = Date.now()) {
  const e = String(Math.floor((now + STEP_DAYS * DAY) / 1000));
  return { r: ref, s: step, e, k: mac(secret, 'step', ref, step, e) };
}
/** true when the step link is ours and not expired */
export function checkStep(secret, q, now = Date.now()) {
  if (!secret || !q || typeof q.r !== 'string' || typeof q.s !== 'string' || !/^\d{9,11}$/.test(String(q.e ?? '')) || typeof q.k !== 'string') return false;
  if (Number(q.e) * 1000 < now) return false;
  return same(q.k, mac(secret, 'step', q.r, q.s, q.e));
}

/** the customer's status link: r · k */
export const signStatus = (secret, ref) => ({ r: ref, k: mac(secret, 'status', ref) });
export const checkStatus = (secret, q) => !!secret && !!q && typeof q.r === 'string' && typeof q.k === 'string' && same(q.k, mac(secret, 'status', q.r));

/** the cookie's value: v1.<expiry>.<signature> */
export function sessionValue(secret, now = Date.now()) {
  const exp = String(Math.floor((now + SESSION_DAYS * DAY) / 1000));
  return `v1.${exp}.${mac(secret, 'session', exp)}`;
}
/** 'ok' · 'expired' (ours, out of date: „A trecut prea mult timp”) · 'none' (missing or not ours) */
export function checkSession(secret, value, now = Date.now()) {
  const m = /^v1\.(\d{9,11})\.([A-Za-z0-9_-]{43})$/.exec(String(value ?? ''));
  if (!secret || !m || !same(m[2], mac(secret, 'session', m[1]))) return 'none';
  return Number(m[1]) * 1000 < now ? 'expired' : 'ok';
}

/** an address as the login brake's key: a hash with the secret, never the address itself */
export const addressKey = (secret, ip) => createHash('sha256').update(`${secret}|${ip}`).digest('hex').slice(0, 32);

// ——— the passphrase (scrypt) ———
// ADMIN_PASS_HASH = scrypt$<N>$<r>$<p>$<salt>$<hash> (base64url). The parameters travel in the value, bounded here.
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 32 };
const run = (pass, salt, { N, r, p, keylen }) =>
  new Promise((ok, no) => scrypt(String(pass).normalize('NFC'), salt, keylen, { N, r, p, maxmem: 128 * N * r * 2 }, (e, k) => (e ? no(e) : ok(k))));

export async function hashPass(pass, params = SCRYPT) {
  const salt = randomBytes(16);
  const k = await run(pass, salt, params);
  return `scrypt$${params.N}$${params.r}$${params.p}$${b64u(salt)}$${b64u(k)}`;
}
export async function checkPass(stored, pass) {
  const m = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/.exec(String(stored ?? ''));
  if (!m || typeof pass !== 'string' || !pass || pass.length > 200) return false;
  const [N, r, p] = [m[1], m[2], m[3]].map(Number);
  if (N < 16384 || N > 262144 || (N & (N - 1)) !== 0 || r < 8 || r > 16 || p < 1 || p > 4) return false;
  const want = Buffer.from(m[5], 'base64url');
  const got = await run(pass, Buffer.from(m[4], 'base64url'), { N, r, p, keylen: want.length });
  return want.length === got.length && timingSafeEqual(want, got);
}
export const newSecret = () => b64u(randomBytes(32));
