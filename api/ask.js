// /api/ask — the assistant's Claude layer (row 11c; docs/assistant.md §11; D-59 · D-63 · D-64). Vercel function, fra1
// (vercel.json), streaming. Haiku sits ON TOP of the local engine: the engine of rows 11a/11b holds the facts (the
// model gets them only through the lookups of lib/assistant/lookups.js) and is the fallback — on any failure the
// answer is {t:"fallback"} and the box answers with its own engine in the browser, the customer sees no error.
//   GET  → {on}: whether the layer is on (a key is set and AI_LAYER), so the box can show the AI label before the
//          first message (AI Act art. 50). No model call.
//   POST {q, lang, page, ctx:{page, section, sheet, opened_from}, st, hist} → NDJSON events, one per line:
//          {t:"wait"} at once · {t:"delta",d} a checked sentence · {t:"reset"} drop what was shown · {t:"done", reply,
//          st} the answer in the box's own shape · {t:"local", why} the box's engine answers (allergens, greetings,
//          a person asked for) · {t:"fallback", why} the box's engine answers (no key, the cap, an error, a check).
//   POST {ev:"tap", id, shown, lang, page} · {ev:"handover", kind, tapped, lang, page} → 204 (row 11d, D-65 §13.5): one
//          numbers-only row, no model call — a next-question button tapped (the box answered it itself) or a click on
//          „Naar de bestelbon” / a WhatsApp button, with the button ids tapped so far in the conversation. Sent by the box
//          as a beacon, only while the layer is on.
// Row 11d: `present.chips` = button ids of assistant-paths.json; the server keeps those that pass the rules (lib/
// assistant/next.js — the same rules as the local engine) and draws the file's labels as the reply's `nq`. The row
// carries shown · tapped · first_turn (docs/sql/qa-asks-11d.sql, qa_ask_log_v2; until Dan runs that file, the 11c
// function qa_ask_log, without an error anywhere). `handover` = a click on a handover button (§11.7 point 5 „handover
// clicked”), counted by the click's own row; a model answer that only shows the buttons no longer sets it.
// The server's own checks (§11.7): in — ≤ 500 characters, e-mail addresses and digit runs of 9+ cut, the context
// whitelisted (assistant-sections.json, products.json ids), 12 turns of history, 20 messages a conversation; the
// allergen gate (no model call; the §4 text word for word); out — every price, percentage, hour, date, distance and
// phone number must stand in a lookup result of this conversation, cards must exist, an offer needs its lookup; one
// retry, then the fallback. Limits: max_tokens 1000 (thinking included; see MAX_TOKENS) · effort low · timeout 8 s · a daily cap of model calls counted in
// the metrics spine for the site id `slagerij-john` only (local and preview runs log as `slagerij-john-preview`, never
// capped) · the Vercel WAF rule (Dan, panel) · the owners' Console spend limit.
// Nothing is kept: no message text in the logs or the database; one numbers-only row per call (qa_ask_log,
// docs/sql/qa-asks-11c.sql). Secrets only as Vercel environment variables (D-26): ANTHROPIC_API_KEY · ANTHROPIC_MODEL ·
// QA_DIGEST_TOKEN · METRICS_URL · METRICS_KEY. Without METRICS_* the row is printed under `npm run dev`.
// The API (read 10.11.2026 on platform.claude.com/docs, quoted in the row-11c report): POST /v1/messages, headers
// x-api-key + anthropic-version 2026-10-21 (no temperature / top_p / top_k on that version), stream:true (SSE
// message_start · content_block_* · message_delta · message_stop · error), output_config.effort "low", adaptive thinking
// left on (Claude Haiku 5.5's default; thinking blocks are passed back unchanged inside the tool loop; max_tokens 1000,
// see MAX_TOKENS), tools with
// input_schema, tool_result blocks in one user message, cache_control on the system block (tools + system cached).
// Raw HTTP, not the SDK: installing @anthropic-ai/sdk needs an npm install, which CLAUDE.md forbids while Dan's dev
// server runs (06.10 incident); the function has no dependency, like the other functions in api/.
import { readFileSync } from 'node:fs';
import { prepare, ask as engineAsk, newState, kit } from '../src/lib/assistant/engine.js';
import { prepareOrder } from '../src/lib/assistant/order.js';
import { words as normWords } from '../src/lib/assistant/normalize.js';
import { fill, reply as newReply, handoff as handoffActs } from '../src/lib/assistant/say.js';
import { SYSTEM, TERMINAL, toolsFor, session, familyOf, saidNo, asksWhatItIs, allowedOf, numberCheck, textCheck, wordingCheck, tidy, offerIn, offerAllowed, formCheck, rude, otherLang, asksToWhatsApp } from '../src/lib/assistant/lookups.js';
import { nextFor, nqOf } from '../src/lib/assistant/next.js';
import { AI_LAYER, DAILY_CAP, MAX_MESSAGES } from '../src/lib/assistant/ai.js';
import { siteId, afterResponse } from '../src/lib/metrics.js';

// literal paths (as api/order.js): Vercel's file tracing and the dev server's Vite both read them as they are
const offersFile = JSON.parse(readFileSync(new URL('../src/data/assistant-offers.json', import.meta.url), 'utf8'));
// the colli an offers lookup named this turn (lookups.js sets S.colli), for the detection of the colli-for-this offer
Object.defineProperty(offersFile, '_colliNames', { value: (S) => S.colli ?? [], enumerable: false });
const sections = JSON.parse(readFileSync(new URL('../src/data/assistant-sections.json', import.meta.url), 'utf8')).pages;

const API = 'https://api.anthropic.com/v1/messages';
const VERSION = '2026-10-21';
// max_tokens 1000, not the 400 of §11.7 (measured 10.11, the 60 scripts on the live API, [MEASURED-OURS] local): with
// Claude Haiku 5.5's adaptive thinking (on by default; „Thinking is on by default and counts toward max_tokens, so leave
// room for it”, docs: effort) 400 ran out on 4 of 60 scripts (→ fallback); thinking off (accepted on Haiku 5.5 at
// effort ≤ high) fit in 400 but answered worse (51/60: two answers in English, facts left out); adaptive + 1000: 57/60,
// no cut-off. The answer itself stays ≤ 3 sentences by the instructions; the room is for the thinking of a tool round.
const MAX_TOKENS = 1000;
const TIMEOUT = 8000;
const MAX_BODY = 16 * 1024;
const OPENED = new Set(['inline', 'button', 'sheet']);

/** Test doubles (scripts/assistant-test-11c.mjs only; inert unless the test sets them): the index, the model call, the
 *  call counter, the log row, a spy on what the model is sent, and — only with `test` on — a clock per request (`_test`). */
export const hooks = { test: false, index: null, model: null, today: null, log: null, spy: null, rpc: null };

let indexP = null;
const loadIndex = (origin) =>
  (indexP ??= (hooks.index ? Promise.resolve(hooks.index) : fetch(new URL('/assistant-index.json', origin), { signal: AbortSignal.timeout(3000) }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`index ${r.status}`)))))
    .then((ix) => {
      prepare(ix);
      prepareOrder(ix);
      return ix;
    })
    .catch((e) => {
      indexP = null;
      throw e;
    }));

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const keyOn = () => AI_LAYER && !!process.env.ANTHROPIC_API_KEY;

/** the message as the model may see it: ≤ 500 characters, no e-mail address, no run of 9+ digits (a phone, an IBAN) */
export const clean = (q) =>
  String(q ?? '')
    .slice(0, 500)
    .replace(/\S+@\S+/g, ' ')
    .replace(/(?:\+?\d[\s./-]?){9,}/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function body(request) {
  const reader = request.body?.getReader();
  const chunks = [];
  for (let n = 0; reader; ) {
    const { done, value } = await reader.read();
    if (done) break;
    if ((n += value.byteLength) > MAX_BODY) return reader.cancel().then(() => null);
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** the context, whitelisted (§11.4): a known path, a section of that page, a product id, one of three doors; the draft
 *  only with known ids and sane quantities. Anything else is dropped. */
function context(ix, m) {
  const c = m.ctx && typeof m.ctx === 'object' ? m.ctx : {};
  const path = typeof c.page === 'string' && Object.hasOwn(sections, c.page) ? c.page : null;
  const section = path && typeof c.section === 'string' && sections[path].includes(c.section) ? c.section : null;
  const sheet = typeof c.sheet === 'string' && ix._byId.has(c.sheet) ? c.sheet : null;
  const opened = OPENED.has(c.opened_from) ? c.opened_from : null;
  const dropped = ['page', 'section', 'sheet', 'opened_from'].filter((k) => c[k] != null && { page: path, section, sheet, opened_from: opened }[k] === null);
  return { path, section, sheet, opened, dropped };
}
function stateOf(ix, m, pageLang) {
  const s = m.st && typeof m.st === 'object' ? m.st : {};
  const known = (id) => typeof id === 'string' && ix.order._byId.has(id);
  const items = (Array.isArray(s.draft?.items) ? s.draft.items : [])
    .filter((x) => Array.isArray(x) && known(x[0]) && Number(x[1]) > 0 && Number(x[1]) <= 1000)
    .map(([id, q]) => [id, Number(q)])
    .slice(0, 60);
  // the context's draft ({id: qty}, docs/assistant.md §11.4) where the state has none (a test, a page that kept one)
  if (!items.length && m.ctx?.draft && typeof m.ctx.draft === 'object') for (const [id, q] of Object.entries(m.ctx.draft)) if (known(id) && Number(q) > 0 && Number(q) <= 1000) items.push([id, Number(q)]);
  const d = s.draft && typeof s.draft === 'object' ? s.draft : {};
  const draft = items.length
    ? { items, mode: d.mode === 'pickup' || d.mode === 'delivery' ? d.mode : null, day: /^\d{4}-\d{2}-\d{2}$/.test(d.day ?? '') ? d.day : null, want: null, ref: /^sj-\d{4}-[a-z0-9]{4}$/i.test(d.ref ?? '') ? d.ref : null, q: null, disc: !!d.disc, last: known(d.last) ? d.last : null, asked: Number(d.asked) || 0 }
    : null;
  return {
    ...newState(pageLang),
    lang: s.lang === 'ro' || s.lang === 'nl' ? s.lang : pageLang,
    last: typeof s.last === 'string' && ix._byId.has(s.last) ? s.last : null,
    miss: Number(s.miss) === 1 ? 1 : 0,
    draft,
    off: (Array.isArray(s.off) ? s.off : []).filter((x) => typeof x === 'string' && offersFile.offers.some((o) => o.id === x)),
    no: !!s.no,
    n: Math.max(0, Math.min(99, Number(s.n) || 0)),
    // row 11d: the next question's own memory (counts, answer keys, the product of the last buttons), shape-checked
    nq: nqOf(s),
  };
}
const histOf = (m) =>
  (Array.isArray(m.hist) ? m.hist : [])
    .filter((h) => h && (h.r === 'u' || h.r === 'a') && typeof h.t === 'string' && h.t.trim())
    .slice(-24)
    .map((h) => ({ r: h.r, t: (h.r === 'u' ? clean(h.t) : h.t.replace(/\s+/g, ' ').trim().slice(0, 1200)) || '…' }));

/** the user turn: the context (not from the customer) and the customer's words, as two text blocks */
function userTurn(ix, L, pageLang, ctx, st, q, at, pre) {
  const p = (id) => (id ? `${ix._byId.get(id)?.n[L]} (${id})` : null);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const v = (t) => parts.find((x) => x.type === t)?.value;
  const info = {
    today: `${v('year')}-${v('month')}-${v('day')} (${v('weekday')})`,
    time: `${v('hour')}:${v('minute')}`,
    page: ctx.path,
    page_language: pageLang,
    section: ctx.section,
    ...(ctx.section && ix._byId.has(ctx.section) ? { section_product: p(ctx.section) } : {}),
    open_product: p(ctx.sheet),
    last_product: p(st.last),
    order_so_far: (st.draft?.items ?? []).map(([id, n]) => `${n} × ${p(id)}`),
    opened_from: ctx.opened,
    // the customer's language only when the engine is sure of it; else (English, French …) the model reads it itself
    customer_language: kit.langOf(ix, kit.words(q), q, pageLang).sure ? L : otherLang(q) === 'en' ? 'English: answer in English' : otherLang(q) === 'fr' ? 'French: answer in French' : `${pageLang === 'ro' ? 'Romanian' : 'Dutch'} (the page's language; the message shows no other)`,
  };
  return {
    role: 'user',
    content: [
      { type: 'text', text: `Context (from the site, not from the customer): ${JSON.stringify(info)}` },
      { type: 'text', text: `Lookups already made for this message (from the site, not from the customer): ${JSON.stringify(pre)}` },
      { type: 'text', text: `Customer: ${q}` },
    ],
  };
}

// ——— the model call: streamed SSE, read into content blocks ———

async function callModel(messages, signal, onText, tools) {
  if (hooks.model) return hooks.model(messages, { signal, onText, tools, system: SYSTEM });
  const res = await fetch(API, {
    method: 'POST',
    signal,
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': VERSION, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: MAX_TOKENS,
      stream: true,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools,
      output_config: { effort: 'low' },
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const e = new Error(`api ${res.status}`);
    e.status = res.status;
    e.type = err?.error?.type ?? null;
    throw e;
  }
  const blocks = [];
  let stop = null;
  const usage = { in: 0, out: 0, cache: 0, write: 0 };
  const dec = new TextDecoder();
  let buf = '';
  const handle = (ev, d) => {
    if (ev === 'message_start') {
      const u = d.message?.usage ?? {};
      usage.in = u.input_tokens ?? 0;
      usage.cache = u.cache_read_input_tokens ?? 0;
      usage.write = u.cache_creation_input_tokens ?? 0;
      usage.out = u.output_tokens ?? 0;
    } else if (ev === 'content_block_start') {
      blocks[d.index] = { ...d.content_block };
      if (blocks[d.index].type === 'tool_use') blocks[d.index]._json = '';
    } else if (ev === 'content_block_delta') {
      const b = blocks[d.index];
      const x = d.delta;
      if (!b) return;
      if (x.type === 'text_delta') {
        b.text = (b.text ?? '') + x.text;
        onText?.(d.index, b.text, blocks);
      } else if (x.type === 'input_json_delta') b._json += x.partial_json;
      else if (x.type === 'thinking_delta') b.thinking = (b.thinking ?? '') + x.thinking;
      else if (x.type === 'signature_delta') b.signature = x.signature;
    } else if (ev === 'content_block_stop') {
      const b = blocks[d.index];
      if (b?.type === 'tool_use') {
        try {
          b.input = b._json ? JSON.parse(b._json) : {};
        } catch {
          b.input = {};
          b._bad = true;
        }
        delete b._json;
      }
    } else if (ev === 'message_delta') {
      stop = d.delta?.stop_reason ?? stop;
      // usage in message_delta is cumulative (docs: streaming → Event types)
      if (d.usage?.output_tokens != null) usage.out = d.usage.output_tokens;
      if (d.usage?.input_tokens != null) usage.in = d.usage.input_tokens;
      if (d.usage?.cache_read_input_tokens != null) usage.cache = d.usage.cache_read_input_tokens;
    } else if (ev === 'error') {
      const e = new Error(`stream ${d.error?.type ?? 'error'}`);
      e.type = d.error?.type ?? null;
      throw e;
    }
  };
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let at;
    while ((at = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, at);
      buf = buf.slice(at + 2);
      let ev = null;
      let payload = '';
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) payload += line.slice(5).trim();
      }
      if (!ev || !payload) continue;
      handle(ev, JSON.parse(payload));
    }
  }
  return { blocks: blocks.filter(Boolean), stop, usage };
}

// ——— the turn ———

const SENT = /[^.!?\n]*[.!?\n]+(\s|$)/g;
const sentencesDone = (s) => {
  const out = [];
  let last = 0;
  for (const m of s.matchAll(SENT)) {
    out.push(m[0]);
    last = m.index + m[0].length;
  }
  return { done: out.join(''), rest: s.slice(last) };
};

export default {
  async fetch(request) {
    if (request.method === 'GET') return json(200, { on: keyOn() });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'GET, POST', 'cache-control': 'no-store' } });
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return json(413, { t: 'fallback', why: 'size' });
    const text = await body(request);
    let m;
    try {
      m = text === null ? null : JSON.parse(text);
    } catch {
      m = null;
    }
    // row 11d: a count from the box (a tap, a handover) — one numbers-only row, nothing streamed
    if (m && typeof m === 'object' && typeof m.ev === 'string') return countEvent(request, m);
    if (!m || typeof m !== 'object' || typeof m.q !== 'string') return json(400, { t: 'fallback', why: 'body' });

    const enc = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const w = writable.getWriter();
    const send = (o) => w.write(enc.encode(`${JSON.stringify(o)}\n`)).catch(() => {});
    const log = { lang: 'other', page: null, family: 'other', lookups: [], in: 0, out: 0, cache: 0, write: 0, model: false, fallback: false, offer: null, handover: false, shown: [], tapped: [], first: false, why: null };
    const site = siteId(request);
    const work = (async () => {
      send({ t: 'wait' });
      try {
        await turn(request, m, send, log, site);
      } catch (e) {
        log.fallback = true;
        log.why = e?.why ?? 'error';
        console.log(JSON.stringify({ event: 'ask', fallback: e?.why ?? e?.type ?? e?.name ?? 'error', status: e?.status ?? null }));
        send({ t: 'fallback', why: e?.why ?? 'error' });
      }
      await w.close().catch(() => {});
      await logRow(site, log);
    })();
    afterResponse(work);
    return new Response(readable, { status: 200, headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
  },
};

const fail = (why) => Object.assign(new Error(why), { why });

async function turn(request, m, send, log, site) {
  const probe = hooks.test && m._test && typeof m._test === 'object' ? m._test : {};
  log.id = probe.id ?? null;
  const at = probe.now ? new Date(probe.now) : new Date();
  const pageLang = m.lang === 'ro' ? 'ro' : 'nl';
  const page = typeof m.page === 'string' && /^[a-z]{2,12}$/.test(m.page) ? m.page : null;
  const ix = await loadIndex(new URL(request.url).origin).catch(() => {
    throw fail('index');
  });
  const ctx = context(ix, m);
  const st = stateOf(ix, m, pageLang);
  if (ctx.sheet && !st.last) st.last = ctx.sheet;
  const hist = histOf(m);
  // row 11d: the first message of a conversation (the box counts the typed messages in its state)
  log.first = st.n === 0;
  const q = clean(m.q);
  const typed = q !== String(m.q ?? '').slice(0, 500).replace(/\s+/g, ' ').trim() && /\S+@\S+|(?:\+?\d[\s./-]?){9,}/.test(String(m.q));
  log.page = ctx.path;
  if (!q) throw fail('empty');

  // the local engine's reading of the message: its language, and the turns it answers alone (no model call)
  const local = engineAsk(ix, st, { text: q, pageLang, page, path: ctx.path, now: at });
  const L = local.reply.lang;
  log.lang = L;
  log.family = familyOf(q) ?? 'info';
  const intent = local.dbg.intent ?? '';
  if (intent === 'allergen') {
    log.family = 'allergen';
    return send({ t: 'local', why: 'allergen' });
  }
  if (['greeting', 'thanks', 'restart', 'human'].includes(intent)) {
    if (intent === 'human') log.family = 'handoff';
    return send({ t: 'local', why: intent });
  }
  const t = ix.s[L];
  const fixed = (line, face) => {
    const r = newReply(L, { face });
    r.lines.push(fill(line));
    handoffActs(ix, r, L, q);
    send({ t: 'done', reply: r, st: { ...st, lang: L, n: st.n + 1 } });
  };
  // „ben je een mens?” — the §5.36 answer, fixed (D-64): made by DanGabriel Advisory, built on Claude, the way to a person
  if (asksWhatItIs(q)) {
    log.family = 'handoff';
    return fixed(t.ai.whoAmI, 'serious');
  }
  // 20 customer messages in a conversation: Georgiana takes over (§11.7 point 1)
  if (st.n + 1 > MAX_MESSAGES) {
    log.family = 'handoff';
    return fixed(t.ai.limit, 'serious');
  }
  if (!keyOn()) throw fail('off');
  // the daily cap, the production site only (row 11c (b)): above it the local engine answers
  if (site === 'slagerij-john') {
    const n = hooks.today ? await hooks.today() : await callsToday(site);
    if (n !== null && n >= DAILY_CAP) throw fail('cap');
  }

  // a no to an offer shown before: no offer for the rest of the conversation (§11.5)
  const no = st.no || (st.off.length > 0 && saidNo(q));
  // allergen, intolerance, diet or illness words: an allergen_answer call is honoured only then (halal is no allergen)
  const allergenish = /allerg|alerg|intoler|gluten|lactos|coeliak|celiac|dieet|dieta|diet|medisch|medical|ziek|bolnav|sporen|urme|noten|nuci|ei\b|ou\b|ouă|melk|lapte|mosterd|mustar|selder|telina|soja|sesam|vis\b|pește|peste|schaal|crustac|lupine|lupin|sulfiet|sulfit/i.test(q);
  const S = session({ ix, offers: offersFile, L, pageLang, path: ctx.path, page, at, st, text: q, shown: st.off, no, allergenish });
  // the answer in the customer's language: when the engine is sure the message is Dutch or Romanian, an answer that is
  // surely the other one goes back (another language — English, French — is never „sure” here, and stays free)
  const asked = kit.langOf(ix, kit.words(q), q, pageLang);
  const foreign = asked.sure ? null : otherLang(q);
  // the language the answer must be in: the customer's when the engine is sure of it, the page's when the message
  // shows no other; an English or French message is answered in its own language (not checked here)
  const want = asked.sure ? asked.lang : foreign ? null : pageLang;
  S.langCheck = (text) => {
    if (!want) return [];
    const got = kit.langOf(ix, kit.words(text), text, want);
    const wrong = (got.sure && got.lang !== want) || otherLang(text, 3);
    return wrong ? [`answer in ${want === 'ro' ? 'Romanian (tu-form)' : 'Dutch (u-form)'}, the customer's language`] : [];
  };
  const messages = [];
  for (const h of hist.slice(-24)) {
    const role = h.r === 'u' ? 'user' : 'assistant';
    if (!messages.length && role === 'assistant') continue;
    const prev = messages[messages.length - 1];
    if (prev && prev.role === role) prev.content += `\n${h.t}`;
    else messages.push({ role, content: h.t });
  }
  if (messages.length && messages[messages.length - 1].role === 'user') messages.push({ role: 'assistant', content: '…' });
  // the up-front lookups: the bank for the message, and what fits the local engine's reading of it — the products it
  // named (and the product of the open sheet or of the block in view: „this” is that one), a colli, a town, the hours of
  // a day, an order deadline
  const d = local.dbg;
  const named = [...new Set([...(d.product ? [d.product, ...(d.also ?? []).map((x) => x.product)] : []), ctx.sheet, ix._byId.has(ctx.section ?? '') ? ctx.section : null].filter(Boolean))];
  const colli = named.find((id) => ix._byId.get(id)?.c === 'colli') ?? (d.intent === 'colli' || /colli/.test(d.entry ?? '') || (d.chips ?? []).some((id) => ix._byId.get(id)?.c === 'colli') ? 'all' : null);
  const products = named.filter((id) => ix._byId.get(id)?.c !== 'colli').map((id) => ix._byId.get(id)?.n[L]).filter(Boolean).join(' ');
  // the engine's own best bank answer always goes along (a question in English, a typo the bank lookup misses)
  if (d.entry && ix.faq.some((e) => e.id === d.entry && e.topic !== 'allergens')) S.engineEntry = d.entry;
  const pre = S.prefetch({
    products: products || null,
    colli,
    place: d.intent === 'delivery-town' ? (d.place ?? q) : log.family === 'delivery' ? townIn(ix, q) : null,
    hours: d.intent === 'hours',
    deadline: d.intent === 'deadline' ? (/season|christmas|menu/.test(d.entry ?? '') ? (/pig/.test(d.entry ?? '') ? 'christmas-pig' : 'holiday-menu') : 'normal') : null,
  });
  messages.push(userTurn(ix, L, pageLang, ctx, st, q, at, pre));
  const histFacts = hist.filter((h) => h.r === 'a').map((h) => h.t);

  const deadline = Date.now() + TIMEOUT;
  let retries = 0;
  let shown = '';
  let final = null;
  log.model = true;
  for (let round = 0; round < 5 && !final; round++) {
    const left = deadline - Date.now();
    if (left <= 0) throw fail('timeout');
    let sawTool = false;
    const allowedNow = () => allowedOf([...S.results, ...histFacts]);
    // stream the checked sentences of an answer that comes after a lookup round (the final answer, most often)
    const onText = (i, sofar, blocks) => {
      if (round === 0 || sawTool || blocks.some((b) => b?.type === 'tool_use')) return;
      const all = blocks.filter((b) => b?.type === 'text').map((b) => b.text ?? '').join('');
      const { done } = sentencesDone(all);
      if (done.length <= shown.length) return;
      const next = done.slice(shown.length);
      if (numberCheck(next, allowedNow()).length || textCheck(next).bad.length || textCheck(next).leak || wordingCheck(next, S).length) return;
      shown = done;
      send({ t: 'delta', d: next });
    };
    let res;
    hooks.spy?.(messages, probe.id ?? null);
    try {
      res = await callModel(messages, AbortSignal.timeout(left), onText, toolsFor(ix.nq));
    } catch (e) {
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw fail('timeout');
      throw Object.assign(e, { why: e.status === 429 ? 'rate' : e.type === 'invalid_request_error' ? 'refused' : e.type ?? 'api' });
    }
    log.in += res.usage.in + res.usage.write;
    log.write += res.usage.write;
    log.out += res.usage.out;
    log.cache += res.usage.cache;
    if (res.stop === 'max_tokens' || res.stop === 'refusal' || res.stop === 'pause_turn') throw fail(res.stop);
    const uses = res.blocks.filter((b) => b.type === 'tool_use');
    sawTool = uses.length > 0;
    const textNow = res.blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim();
    // run the lookups of this round (all results in one user message, in the order called)
    const results = [];
    for (const u of uses) results.push({ type: 'tool_result', tool_use_id: u.id, content: u._bad ? '{"error":"invalid input"}' : S.call(u.name, u.input) });
    if (S.allergen) {
      // the model asked for the allergen answer: the §4 text, word for word, and the turn ends (§11.7 point 2)
      log.family = 'allergen';
      log.lookups = S.used;
      if (shown) send({ t: 'reset' });
      return send({ t: 'done', reply: { ...S.allergen.reply }, st: { ...st, lang: L, n: st.n + 1 } });
    }
    const terminal = uses.every((u) => TERMINAL.has(u.name));
    if (uses.length && !terminal) {
      messages.push({ role: 'assistant', content: res.blocks.map(strip) }, { role: 'user', content: results });
      continue;
    }
    // the answer of this round stands — unless a check says no
    const why = checks(textNow, S, allowedNow());
    if (!why.length) {
      final = textNow;
      break;
    }
    if (retries >= 1) throw fail('check');
    retries++;
    if (shown) {
      send({ t: 'reset' });
      shown = '';
    }
    console.log(JSON.stringify({ event: 'ask', retry: why.map((x) => x.replace(/\d/g, '#')) }));
    messages.push({ role: 'assistant', content: res.blocks.map(strip) }, { role: 'user', content: [...results, { type: 'text', text: `Not shown to the customer: ${why.join('; ')}. Answer again: use only figures that stand in a lookup result (call the lookup), or leave them out.` }] });
    S.cards = [];
    S.chips = [];
    S.nqIds = [];
  }
  if (final === null) throw fail('rounds');

  // the answer in the box's shape
  const leak = textCheck(final).leak;
  const lines = leak ? [t.ai.scope] : tidy(final);
  if (!lines.length && !S.draft && !S.cards.length) throw fail('empty-answer');
  const r = newReply(L, { face: S.handoff ? 'serious' : 'answer' });
  for (const l of lines) r.lines.push([{ t: l }]);
  r.cards = S.cards;
  // row 11d: the reply's chips are the order helper's own (its question's answers); the model's are button ids (below)
  r.chips = [];
  if (S.draft) {
    r.slip = S.draft.slip ?? null;
    r.acts.push(...S.draft.acts);
    r.foot = S.draft.foot ?? [];
    r.chips = S.draft.chips ?? [];
  }
  for (const a of S.acts) if (!r.acts.some((x) => x.kind === a.kind)) r.acts.push(a);
  // a phone number or an e-mail address was typed (cut before the model): the order helper's line (lexicon §5.34)
  if (typed) r.lines.push(fill(t.o.personal));
  // an answer that stood on no lookup and asked back (an unclear message): the second one in a row hands off (§11.6
  // HANDOFF „two unclear messages in a row”); an insult gets the way to a person (no apology)
  const unclear = !S.called.some((x) => x !== 'present') && !S.handoff && !leak && lines.join(' ') !== t.ai.scope && !S.draft && !S.credit;
  if (unclear && st.miss === 1 && !r.acts.some((a) => a.kind === 'wa')) {
    handoffActs(ix, r, L, q);
    r.face = 'serious';
  } else if (rude(q) && !r.acts.some((a) => a.kind === 'wa')) handoffActs(ix, r, L, q, false);
  // an answer that sends the customer to WhatsApp carries the buttons (the bank's „not on the site yet, ask Georgiana
  // on WhatsApp” answers, written by the model without a handoff call)
  if (asksToWhatsApp(final) && !r.acts.some((a) => a.kind === 'wa')) {
    handoffActs(ix, r, L, q);
    log.handover = true;
  }
  // the scope line keeps the way to a person: the WhatsApp button (§11.6 HANDOFF „never hold a customer back”)
  if ((leak || lines.join(' ') === t.ai.scope) && !r.acts.some((a) => a.kind === 'wa')) handoffActs(ix, r, L, q, false);
  if (S.credit && t.credit) r.link = fill(t.credit.line, { name: { t: t.credit.name, href: t.credit.href } });
  // another language (row 11c (c): English, French … answered in it): marked as such, no offer to switch the site
  const other = foreign && otherLang(final, 3) === foreign ? foreign : null;
  if (other) r.lang = other;
  // typed in the other language: the offer to switch (§5.32 / §6), as the engine makes it
  if (L !== pageLang && !other) {
    r.lines.push(fill(t.t.switchAsk));
    r.acts.push({ kind: 'switch', label: t.t.switchBtn, lang: L });
  }
  const offer = leak ? null : offerIn(final, S, offersFile);
  log.offer = offer;
  log.lookups = S.used;
  if (other) log.lang = 'other';
  if (S.handoff) log.family = S.handoff === 'complaint' ? 'handoff' : log.family;
  if (S.draft) log.family = log.family === 'info' ? 'order' : log.family;
  if (leak) log.family = 'scope';
  const last = S.cards[0]?.id ?? S.st.last ?? st.last;
  const next = { ...st, ...S.st, lang: L, last, pend: null, miss: unclear && st.miss !== 1 ? 1 : 0, off: [...new Set([...st.off, ...(offer ? [offer] : [])])], no, n: st.n + 1 };
  // row 11d (§13.9): the model's button ids, kept only where the rules let them — never beside a hand-off (the model's
  // handoff call, or the second unclear message: the serious face), a complaint, the scope sentence or an offer, never one the conversation already holds; the answer's
  // keys are the local engine's reading of the same message (what was asked is what was answered)
  const scope = leak || lines.join(' ') === t.ai.scope;
  const nx = nextFor(ix, {
    st,
    reply: r,
    dbg: { intent: 'layer', entry: local.dbg.entry, product: local.dbg.product, handoff: r.face === 'serious' ? 'always' : 'none', offer, scope, complaint: S.handoff === 'complaint' },
    L,
    today: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(at),
    product: ctx.sheet,
    draft: next.draft,
    ids: S.nqIds,
  });
  r.nq = nx.chips;
  next.nq = nx.nq;
  log.shown = nx.ids;
  // D-58 point 3 with the layer on: a question the model could not answer (it handed off as „not sure”) goes to the
  // weekly mail like the local engine's second miss — the box sends it to /api/miss, cut of digits and e-mail addresses
  send({ t: 'done', reply: r, st: next, ...(S.handoff === 'not-sure' ? { unanswered: true } : {}) });
}

/** a town of towns.json named in a delivery question the engine did not read as one („livrarea la Roeselare e scumpă?”) */
function townIn(ix, q) {
  const T = ` ${normWords(q).join(' ')} `;
  return ix.order.towns.find((t) => t.ph.some((ph) => T.includes(` ${ph} `)))?.p ?? null;
}

/** a content block as the API takes it back (the stream's own fields only) */
const strip = (b) => {
  if (b.type === 'text') return { type: 'text', text: b.text ?? '' };
  if (b.type === 'tool_use') return { type: 'tool_use', id: b.id, name: b.name, input: b.input ?? {} };
  if (b.type === 'thinking') return { type: 'thinking', thinking: b.thinking ?? '', signature: b.signature ?? '' };
  return b;
};

/** what keeps an answer from the customer (§11.7 point 3): a figure on no lookup, a link or a scarcity word, an offer
 *  without its lookup or beside a handoff */
function checks(text, S, allowed) {
  const why = [];
  const bad = numberCheck(text, allowed);
  if (bad.length) why.push(`the figures ${bad.join(', ')} stand in no lookup result`);
  const tc = textCheck(text);
  if (tc.bad.length) why.push(`not allowed: ${tc.bad.join(', ')}`);
  const offer = offerIn(text, S, offersFile);
  if (offer && !offerAllowed(offer, S, offersFile)) why.push(`the offer ${offer} was not returned by a lookup in this turn`);
  // an offer (from the offers lookup, not the bank's answer to the question) beside a hand-off; a complaint or an
  // allergy gets none at all (§11.5 „never … in an allergen answer, a complaint, or a handoff”)
  const factOf = (id) => S.faqIds.has(offersFile.offers.find((r) => r.id === id)?.faq ?? '');
  if (offer && S.handoff && (['complaint', 'allergy'].includes(S.handoff) || !factOf(offer))) why.push('no offer in the same answer as a handoff');
  why.push(...formCheck(text, S.L));
  // row 11e (3): nothing passed on, no apology on a complaint, the order form only for its rows, no Romanian „per”
  why.push(...wordingCheck(text, S, true));
  if (S.langCheck) why.push(...S.langCheck(text));
  if (!text && !S.draft) why.push('no answer text: write the answer in words');
  return why;
}

// ——— the metrics spine: the cap before, the row after (docs/sql/qa-asks-11c.sql) ———

async function rpc(name, args, ms) {
  if (hooks.rpc) return hooks.rpc(name, args);
  const base = process.env.METRICS_URL;
  const key = process.env.METRICS_KEY;
  const token = process.env.QA_DIGEST_TOKEN;
  if (!base || !key || !token) return { skipped: true };
  const r = await fetch(`${base.replace(/\/+$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...args, p_token: token }),
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) return { error: r.status };
  return { value: await r.json().catch(() => null) };
}
/** model calls today for the site, or null (no keys, no table, an error: the cap is skipped, never the answer) */
async function callsToday(site) {
  try {
    const r = await rpc('qa_asks_today', { p_site: site }, 2000);
    return typeof r.value === 'number' && r.value >= 0 ? r.value : null;
  } catch {
    return null;
  }
}
// row 11d: qa_ask_log_v2 (docs/sql/qa-asks-11d.sql) until it answers „not found” — then the 11c qa_ask_log for 15
// minutes, and v2 is tried again (Dan runs the SQL file before the push; a warm function finds it within 15 minutes)
let v2Missing = 0;
async function logRow(site, l) {
  const row = { p_site: site, p_lang: l.lang === 'nl' || l.lang === 'ro' ? l.lang : 'other', p_page: l.page, p_family: l.family, p_lookups: [...new Set(l.lookups)], p_in: l.in, p_out: l.out, p_cache: l.cache, p_model: l.model, p_fallback: l.fallback, p_offer: l.offer, p_handover: l.handover };
  const v2 = { ...row, p_shown: (l.shown ?? []).slice(0, 2), p_tapped: (l.tapped ?? []).slice(0, 40), p_first: !!l.first };
  if (hooks.log) return hooks.log({ ...v2, _write: l.write, _why: l.why }, l.id ?? null);
  try {
    if (Date.now() - v2Missing > 15 * 60000) {
      const r = await rpc('qa_ask_log_v2', v2, 3000);
      if (r.skipped) {
        if (!process.env.VERCEL) console.log(JSON.stringify({ event: 'ask', dryRun: true, row: v2 }));
        return;
      }
      if (!r.error) return;
      if (r.error !== 404) return console.log(JSON.stringify({ event: 'ask', log: `http ${r.error}` }));
      v2Missing = Date.now();
    }
    const r = await rpc('qa_ask_log', row, 3000);
    if (r.error) console.log(JSON.stringify({ event: 'ask', log: `http ${r.error}` }));
  } catch (e) {
    console.log(JSON.stringify({ event: 'ask', log: e?.name ?? 'error' }));
  }
}

/** Row 11d (§13.5): a count from the box — `tap` (a next-question button the box answered itself: its id, the ids shown
 *  under that answer) or `handover` (a click on „Naar de bestelbon” or a WhatsApp button: the ids tapped so far in the
 *  conversation). Ids are checked against the buttons of the index, the page against the whitelist; no text, no model
 *  call, no identifier. */
async function countEvent(request, m) {
  const done = new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  if (!keyOn()) return done;
  const site = siteId(request);
  const ix = await loadIndex(new URL(request.url).origin).catch(() => null);
  const b = ix?.nq?.b;
  if (!b) return done;
  const ids = (a, n) => [...new Set((Array.isArray(a) ? a : []).filter((x) => typeof x === 'string' && Object.hasOwn(b, x)))].slice(0, n);
  const page = typeof m.page === 'string' && Object.hasOwn(sections, m.page) ? m.page : null;
  const lang = m.lang === 'ro' || m.lang === 'nl' ? m.lang : 'other';
  const base = { lang, page, lookups: [], in: 0, out: 0, cache: 0, write: 0, model: false, fallback: false, offer: null, first: false, why: null };
  let row = null;
  if (m.ev === 'tap' && typeof m.id === 'string' && Object.hasOwn(b, m.id)) {
    const topic = b[m.id].entry ? ix.faq.find((e) => e.id === b[m.id].entry)?.topic : null;
    row = { ...base, family: b[m.id].pick ? 'order' : topic === 'delivery' ? 'delivery' : topic === 'order' ? 'order' : 'info', shown: ids(m.shown, 2), tapped: [m.id], handover: false };
  } else if (m.ev === 'handover') row = { ...base, family: m.kind === 'order' ? 'order' : 'handoff', shown: [], tapped: ids(m.tapped, 40), handover: true };
  if (row) afterResponse(logRow(site, row));
  return done;
}
