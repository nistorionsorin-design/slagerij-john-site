// POST /api/order — the bestelbon's send (stage 5, docs/order-flow.md §5). A Vercel Function (the zero-config /api
// directory, Web handler); locally the same handler runs inside `npm run dev` (astro.config.mjs, plugin „api-dev”).
// Steps: read + check the order (src/lib/order-core.js — prices from products.json, never from the browser) → mail to
// the shop → WhatsApp notice to the shop → confirmation mail to the customer → the reference back.
// Not here yet: storing the order for the admin (Vercel Blob, 90 days) — D-24 decides whether an orders screen exists
// (stage 12); the running number SJ-2026-0001 needs that store too, so the reference is random until then.
// Secrets only as Vercel environment variables (D-26, public repo) — names in .env.example, values never in the repo:
//   RESEND_API_KEY · ORDER_MAIL_FROM · ORDER_MAIL_TO (default: entity.json email)
//   TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN · TWILIO_WHATSAPP_FROM · ORDER_WHATSAPP_TO (default: entity.json whatsapp)
//   TWILIO_CONTENT_SID (optional: an approved template whose {{1}} is the order text)
//   ORDER_DRY_RUN=1 — validate and answer as if sent, send nothing (a preview deployment). Without RESEND_API_KEY
//   the function also dry-runs outside Vercel (npm run dev); on Vercel it then answers 503 and the page offers
//   WhatsApp — it never tells a customer an order went out when it did not.
// Answers: JSON for the page script; for the no-script form a 303 back to the page (#bedankt or #fout).
import { readFileSync } from 'node:fs';
import { readOrder, waText, dayLabel, money, lineText, addressLine } from '../src/lib/order-core.js';

const json = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const data = () => ({ products: json('products.json'), hours: json('hours.json'), delivery: json('delivery.json'), menus: json('menus.json') });
const entity = json('entity.json');

const page = { nl: '/bestellen', ro: '/ro/comanda' };

// Mail strings: lexicon §5.20 „Mails” (subjects, the RO first line for the shop, the confirmation line) and the slip
// labels of §5.20 / §6 „Comandă”; §5.5 (art. VI.53 4°), §5.3 (Bel · WhatsApp). What has no source yet is a
// [PLACEHOLDER] — the gate scans this file and fails on it under --release (C-04).
const T = {
  nl: {
    // a menu order names its menu (lexicon §5.22, 08.10 17:50): „Bestelling {REF} · Eindejaarsmenu · afhalen {dag} {uur}”
    subjectShop: (o) => `Bestelling ${o.ref} · ${o.menu ? `${o.menu.mail.nl} · ` : ''}${o.method === 'delivery' ? 'levering' : 'afhalen'} ${dayLabel(o.date, 'nl')} ${o.time}`,
    subjectCustomer: (o) => `Uw bestelling ${o.ref} bij ${entity.name}`,
    pickup: 'Afhalen',
    delivery: 'Levering',
    name: 'Naam',
    tel: 'Tel',
    email: 'E-mail',
    remarks: 'Opmerkingen',
    total: 'Totaal',
    unknownPrice: '[PRIJS]',
    feeLabel: 'Leveringskosten',
    fee: { free: 'Gratis', fee: '€1 per km; wij bevestigen het bedrag.', 'below-minimum': 'Minimum €50 voor levering', outside: 'Bel ons', unknown: '[PRIJS]' },
    call: 'Bel',
    whatsapp: 'WhatsApp',
    confirm: 'Wij bevestigen uw bestelling via WhatsApp of telefoon.',
    legal: 'Vers vlees wordt niet teruggenomen (art. VI.53, 4° WER).',
    pay: 'Betalen bij afhaling: [BETALING]',
    payDelivery: 'Betalen bij levering: [BETALING]',
    hours: 'Openingsuren',
  },
  ro: {
    // RO orders (stage 9): the menu's word as in the shop's first line below
    subjectShop: (o) => `Comandă ${o.ref} · ${o.menu ? `${o.menu.mail.ro} · ` : ''}${o.method === 'delivery' ? 'livrare' : 'ridicare'} ${dayLabel(o.date, 'ro')} ${o.time}`,
    subjectCustomer: (o) => `Comanda ta ${o.ref} la ${entity.alternateName}`,
    pickup: 'Ridicare',
    delivery: 'Livrare',
    name: 'Nume',
    tel: 'Tel',
    email: 'E-mail',
    remarks: 'Observații',
    total: 'Total',
    unknownPrice: '[PREȚ]',
    feeLabel: 'Costul livrării',
    fee: { free: 'Gratuit', fee: '1 € pe km; confirmăm suma.', 'below-minimum': 'Minimum 50 € pentru livrare', outside: 'Sună-ne', unknown: '[PREȚ]' },
    call: 'Sună',
    whatsapp: 'WhatsApp',
    confirm: 'Îți confirmăm comanda pe WhatsApp sau la telefon.',
    legal: 'Carnea proaspătă nu se returnează (art. VI.53, 4° WER).',
    pay: 'Plata la ridicare: [PLATĂ]',
    payDelivery: 'Plata la livrare: [PLATĂ]',
    hours: 'Program',
  },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** 0470 12 34 56 → 32470123456 (wa.me wants the international number without +) */
const intl = (phone) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('00') ? d.slice(2) : d.startsWith('0') ? `32${d.slice(1)}` : d;
};

/** The slip as text lines and as an HTML table — the same rows in the shop's mail and the customer's. A menu order's
 *  menu rows come first, under the menu's name (menus.json `name`, lexicon §5.22 08.10 17:50); a heading row has
 *  no second cell (null). */
function slip(o, t) {
  const line = (l) => [lineText({ ...l, sum: null }, o.locale), l.sum === null ? t.unknownPrice : money(l.sum, o.locale, true)];
  const menuLines = o.lines.filter((l) => l.menu);
  const otherLines = o.lines.filter((l) => !l.menu);
  const rows = [
    // the menu group, then a spacer (both cells null) before the rest so a counter row never reads as part of the menu
    ...(menuLines.length ? [[o.menu?.name ?? '', null], ...menuLines.map(line), ...(otherLines.length || o.requests.length ? [[null, null]] : [])] : []),
    ...otherLines.map(line),
    ...o.requests.map((r) => [`„${r}”`, t.unknownPrice]),
  ];
  if (o.quote) rows.push([t.feeLabel, t.fee[o.quote.status]]);
  rows.push([t.total, o.total === null || o.requests.length ? t.unknownPrice : money(o.total, o.locale, true)]);
  const when = `${o.method === 'delivery' ? t.delivery : t.pickup}: ${dayLabel(o.date, o.locale, 'long')}, ${o.time}${o.address ? ` · ${addressLine(o.address)}` : ''}`;
  const text = [when, '', ...rows.map(([a, b]) => (a === null ? '' : b === null ? `${a}:` : `${a}  ${b}`))].join('\n');
  const html =
    `<p style="margin:0 0 12px;font-weight:600">${esc(when)}</p>` +
    `<table style="border-collapse:collapse;width:100%;max-width:520px;font-size:15px">` +
    rows.map(([a, b], i) => (a === null
      ? `<tr><td colspan="2" style="padding:6px 0"></td></tr>`
      : b === null
      ? `<tr style="border-top:1px solid #D9CDB8"><td colspan="2" style="padding:10px 0 4px;font-weight:700;color:#7B2420">${esc(a)}</td></tr>`
      : `<tr style="border-top:1px solid #D9CDB8${i === rows.length - 1 ? ';font-weight:700' : ''}"><td style="padding:8px 12px 8px 0">${esc(a)}</td><td style="padding:8px 0;text-align:right;white-space:nowrap">${esc(b)}</td></tr>`)).join('') +
    `</table>`;
  return { text, html };
}

const DAYS_NL = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const DAYS_RO = ['lun', 'mar', 'mie', 'joi', 'vin', 'sâm', 'dum'];
const hoursText = (hours, locale) =>
  hours.regular
    .map((d, i) => `${(locale === 'ro' ? DAYS_RO : DAYS_NL)[i]} ${d.slots.map((s) => `${s.open}-${s.close}`).join(', ')}`)
    .join(' · ');

function mails(o, hours) {
  const t = T[o.locale];
  const s = slip(o, t);
  const who = [`${t.name}: ${o.name}`, `${t.tel}: ${o.phone}`, `${t.email}: ${o.email}`];
  const remarks = o.remarks ? `${t.remarks}: ${o.remarks}` : '';
  // the shop: a one-line RO header for John and Georgiana (lexicon §5.20 „Mails”), then the slip, then the customer
  // a menu order: „Comandă nouă de pe site · {REF} · meniul de sărbători · ridicare {zi} {oră}” (§5.22, 08.10 17:50)
  const header = `Comandă nouă de pe site · ${o.ref} · ${o.menu ? `${o.menu.mail.ro} · ` : ''}${o.method === 'delivery' ? 'livrare' : 'ridicare'} ${dayLabel(o.date, 'ro')} ${o.time}`;
  const shop = {
    subject: t.subjectShop(o),
    replyTo: o.email,
    text: [header, '', s.text, '', ...who, remarks, '', `${t.call}: tel:${o.phone.replace(/[^\d+]/g, '')}`, `${t.whatsapp}: https://wa.me/${intl(o.phone)}`].filter((x) => x !== '').join('\n'),
    html:
      `<div style="font-family:Arial,sans-serif;color:#1A1511">` +
      `<p style="margin:0 0 16px;font-size:17px;font-weight:700">${esc(header)}</p>${s.html}` +
      `<p style="margin:16px 0 0;line-height:1.5">${who.map(esc).join('<br>')}${remarks ? `<br>${esc(remarks).replace(/\n/g, '<br>')}` : ''}</p>` +
      `<p style="margin:20px 0 0"><a href="tel:${esc(o.phone.replace(/[^\d+]/g, ''))}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#F2C12E;color:#1A1511;font-weight:700;text-decoration:none">${esc(t.call)}</a> ` +
      `<a href="https://wa.me/${intl(o.phone)}" style="display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid #1A1511;color:#1A1511;font-weight:700;text-decoration:none">${esc(t.whatsapp)}</a></p></div>`,
  };
  const foot = [o.method === 'delivery' ? t.payDelivery : t.pay, t.legal, `${entity.name} · ${entity.address.streetAddress}, ${entity.address.postalCode} ${entity.address.addressLocality} · ${entity.telephoneDisplay}`, `${t.hours}: ${hoursText(hours, o.locale)}`];
  const customer = {
    subject: t.subjectCustomer(o),
    replyTo: entity.email,
    text: [o.ref, '', s.text, '', t.confirm, '', ...foot].join('\n'),
    html:
      `<div style="font-family:Arial,sans-serif;color:#1A1511">` +
      `<p style="margin:0 0 16px;font-size:17px;font-weight:700">${esc(o.ref)}</p>${s.html}` +
      `<p style="margin:16px 0 0">${esc(t.confirm)}</p>` +
      `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#5E534A">${foot.map(esc).join('<br>')}</p></div>`,
  };
  return { shop, customer };
}

async function sendMail(env, to, m) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.ORDER_MAIL_FROM, to: [to], reply_to: m.replyTo, subject: m.subject, text: m.text, html: m.html }),
  });
  if (!r.ok) throw new Error(`resend ${r.status} ${(await r.text()).slice(0, 200)}`);
}

async function sendWhatsApp(env, text) {
  const to = env.ORDER_WHATSAPP_TO || `+${entity.whatsapp}`;
  const body = new URLSearchParams({ From: env.TWILIO_WHATSAPP_FROM, To: `whatsapp:${to.replace(/^whatsapp:/, '')}` });
  if (env.TWILIO_CONTENT_SID) {
    body.set('ContentSid', env.TWILIO_CONTENT_SID);
    body.set('ContentVariables', JSON.stringify({ 1: text }));
  } else body.set('Body', text);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`twilio ${r.status} ${(await r.text()).slice(0, 200)}`);
}

// a light brake per running instance: 6 orders per 10 minutes per address
const recent = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 600000);
  list.push(now);
  recent.set(ip, list);
  return list.length > 6;
}

/** The no-script form (application/x-www-form-urlencoded) → the shape readOrder takes. */
function fromForm(f) {
  const items = {};
  for (const [k, v] of f) if (k.startsWith('q-')) items[k.slice(2)] = v;
  return {
    lang: f.get('lang'),
    method: f.get('method'),
    date: f.get('date'),
    time: f.get('time'),
    items,
    requests: String(f.get('requests') ?? '').split('\n'),
    name: f.get('name'),
    phone: f.get('phone'),
    email: f.get('email'),
    remarks: f.get('remarks'),
    address: { street: f.get('street'), nr: f.get('nr'), postcode: f.get('postcode'), place: f.get('place') },
    website: f.get('website'),
  };
}

export default {
  async fetch(request) {
    const env = process.env;
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
    const type = request.headers.get('content-type') ?? '';
    const form = !type.includes('application/json');
    const raw = await request.text();
    if (raw.length > 20000) return new Response(null, { status: 413 });

    let input;
    try {
      input = form ? fromForm(new URLSearchParams(raw)) : JSON.parse(raw);
    } catch {
      return Response.json({ ok: false, errors: ['format'] }, { status: 400 });
    }
    const locale = input.lang === 'ro' ? 'ro' : 'nl';
    const back = (hash, q = '') => new Response(null, { status: 303, headers: { location: `${page[locale]}${q}#${hash}`, 'cache-control': 'no-store' } });
    const answer = (status, body) => (form ? back(body.ok ? 'bedankt' : 'fout', body.ref ? `?ref=${body.ref}` : body.errors ? `?fout=${body.errors.join(',')}` : '') : Response.json(body, { status, headers: { 'cache-control': 'no-store' } }));

    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
    if (tooMany(ip)) return answer(429, { ok: false, errors: ['busy'] });

    const d = data();
    const { errors, order } = readOrder(input, d);
    // the hidden „website” field: a person never fills it; a bot gets the normal answer and nothing is sent
    if (input.website) return answer(200, { ok: true, ref: order.ref });
    if (errors.length) return answer(422, { ok: false, errors });

    const m = mails(order, d.hours);
    const wa = waText(order);
    const dry = env.ORDER_DRY_RUN === '1' || (!env.RESEND_API_KEY && !env.VERCEL);
    if (dry) {
      console.log(`\n[bestelbon · dry run — nothing sent] ${order.ref}\n── mail to the shop: ${m.shop.subject}\n${m.shop.text}\n── WhatsApp to the shop:\n${wa}\n── mail to ${order.email}: ${m.customer.subject}\n${m.customer.text}\n`);
      // the page's English „dry run” line is for the dev server only: on Vercel (ORDER_DRY_RUN=1) the answer is plain ok
      return answer(200, { ok: true, ref: order.ref, ...(env.VERCEL ? {} : { dryRun: true }) });
    }
    if (!env.RESEND_API_KEY || !env.ORDER_MAIL_FROM) {
      console.error('order: not configured (RESEND_API_KEY / ORDER_MAIL_FROM)');
      return answer(503, { ok: false, errors: ['send'] });
    }
    try {
      await sendMail(env, env.ORDER_MAIL_TO || entity.email, m.shop);
    } catch (e) {
      console.error('order: shop mail failed', order.ref, e.message);
      return answer(502, { ok: false, errors: ['send'] });
    }
    // the shop has the order; the two notices below are best effort and never undo a sent order
    const extra = [];
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) extra.push(sendWhatsApp(env, wa).catch((e) => console.error('order: whatsapp failed', order.ref, e.message)));
    extra.push(sendMail(env, order.email, m.customer).catch((e) => console.error('order: confirmation failed', order.ref, e.message)));
    await Promise.all(extra);
    console.log(JSON.stringify({ event: 'order', ref: order.ref, method: order.method, date: order.date, lines: order.lines.length, requests: order.requests.length }));
    return answer(200, { ok: true, ref: order.ref });
  },
};
