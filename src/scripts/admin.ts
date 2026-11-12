// /admin — the shop's screen (row 12; docs/admin.md §3.6 · §4). Everything about an order comes from /api/admin after the
// cookie's check; nothing about one is in the page or in this file. The cards are built with textContent only (an order's
// text never becomes markup). Every change is a POST with JSON and the header x-admin: 1. Strings: src/lib/order-text.js
// (lexicon §6 „Comenzi și pașii comenzii, 11.11”).
import { SHOP, CUSTOMER, nextOf, rank } from '../lib/order-text.js';
import { dayLabel, addressLine } from '../lib/order-core.js';

type Card = {
  ref: string;
  locale: 'nl' | 'ro';
  method: 'pickup' | 'delivery';
  date: string;
  time: string;
  name: string;
  phone: string;
  address: { street: string; nr: string; postcode: string; place: string } | null;
  remarks: string;
  slip: string[];
  totalLabel: string;
  status: string;
  history: { to: string; at: string }[];
  receivedAt: string;
};

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const login = $<HTMLFormElement>('[data-login]');
const board = $<HTMLElement>('[data-board]');
const out = $<HTMLButtonElement>('[data-logout]');
const listEl = $<HTMLOListElement>('[data-list]');
const empty = $<HTMLElement>('[data-empty]');
const state = $<HTMLElement>('[data-state]');
const boardMsg = $<HTMLElement>('[data-board-msg]');
const loginMsg = $<HTMLElement>('[data-login-msg]');
const waIcon = $<HTMLTemplateElement>('[data-wa-icon]');

let orders: Card[] = [];
let tab = 'noua';
let sort: 'new' | 'pickup' = 'new';

const post = (body: unknown) => fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin': '1' }, body: JSON.stringify(body), credentials: 'same-origin' });
const brussels = (iso: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { date: `${v('year')}-${v('month')}-${v('day')}`, hour: `${v('hour')}:${v('minute')}` };
};
/** 0470 12 34 56 → 32470123456 (wa.me) — as api/order.js */
const intl = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('00') ? d.slice(2) : d.startsWith('0') ? `32${d.slice(1)}` : d;
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) => {
  const n = document.createElement(tag);
  n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const inTab = (o: Card) => (tab === 'all' ? true : tab === 'done' ? o.status === 'ridicata' || o.status === 'livrata' : o.status === tab);

function show(view: 'login' | 'board', msg = '') {
  login.hidden = view !== 'login';
  board.hidden = view !== 'board';
  out.hidden = view !== 'board';
  loginMsg.textContent = view === 'login' ? msg : '';
  if (view === 'login') login.querySelector('input')!.focus();
}

function cardOf(o: Card) {
  const li = el('li', 'card');
  li.dataset.ref = o.ref;
  const top = el('p', 'card__top');
  top.append(el('span', '', o.ref), el('span', '', SHOP.tabs[(o.status === 'ridicata' || o.status === 'livrata' ? 'done' : o.status) as keyof typeof SHOP.tabs] ?? ''));
  const day = dayLabel(o.date, 'ro', 'long');
  const when = o.method === 'delivery' ? CUSTOMER.ro.momentDelivery(day, o.time) : CUSTOMER.ro.momentPickup(day, o.time);
  li.append(top, el('h2', 'card__name', o.name), el('p', 'card__when', o.address ? `${when} · ${addressLine(o.address)}` : when));
  const lines = el('ul', 'card__lines');
  for (const l of o.slip) lines.append(el('li', '', l));
  lines.append(el('li', 'card__total', `${SHOP.total}: ${o.totalLabel}`));
  li.append(lines);
  if (o.remarks) li.append(el('p', 'card__note', `${SHOP.remarks}: ${o.remarks}`));
  const got = brussels(o.receivedAt);
  li.append(el('p', 'card__note', `${SHOP.received}: ${dayLabel(got.date, 'ro', 'short')}, ${got.hour}`));
  const acts = el('p', 'card__acts');
  const tel = el('a', 'btn btn--secondary btn--sm', SHOP.call);
  tel.setAttribute('href', `tel:${o.phone.replace(/[^\d+]/g, '')}`);
  const wa = el('a', 'btn btn--secondary btn--sm');
  wa.append(waIcon.content.cloneNode(true), document.createTextNode(o.status === 'gata' ? SHOP.writeWa : SHOP.whatsapp));
  // at „gata” the ready text is filled in (docs/admin.md §3.4); she presses send on her own phone
  wa.setAttribute('href', `https://wa.me/${intl(o.phone)}${o.status === 'gata' ? `?text=${encodeURIComponent(CUSTOMER[o.locale].waReady(o.name, o.ref))}` : ''}`);
  wa.setAttribute('rel', 'noopener');
  acts.append(tel, wa);
  const next = nextOf(o.status, o.method);
  if (next) {
    const b = el('button', 'btn btn--primary btn--sm', SHOP.next[next as keyof typeof SHOP.next]);
    b.type = 'button';
    b.dataset.op = 'next';
    acts.append(b);
  }
  if (o.history.length > 1 && rank(o.status) > 0) {
    const b = el('button', 'btn btn--secondary btn--sm', SHOP.back);
    b.type = 'button';
    b.dataset.op = 'back';
    acts.append(b);
  }
  li.append(acts, el('p', 'card__msg'));
  return li;
}

function draw() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-tab]')) b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
  for (const c of document.querySelectorAll<HTMLElement>('[data-count]')) {
    const id = c.dataset.count!;
    const n = orders.filter((o) => (id === 'all' ? true : id === 'done' ? o.status === 'ridicata' || o.status === 'livrata' : o.status === id)).length;
    c.textContent = id === 'all' || !n ? '' : String(n);
  }
  const shown = orders.filter(inTab).sort((a, b) => (sort === 'new' ? (a.receivedAt < b.receivedAt ? 1 : -1) : `${a.date} ${a.time}` < `${b.date} ${b.time}` ? -1 : 1));
  listEl.replaceChildren(...shown.map(cardOf));
  empty.hidden = !(tab === 'noua' && !shown.length);
}

async function load() {
  try {
    const r = await fetch('/api/admin?op=list', { credentials: 'same-origin', cache: 'no-store' });
    if (r.status === 401) {
      const e = await r.json().catch(() => ({}));
      return show('login', e.error === 'expired' ? SHOP.expired : '');
    }
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    orders = data.orders;
    show('board');
    boardMsg.hidden = true;
    state.textContent = SHOP.updated(brussels(data.at).hour);
    draw();
  } catch {
    if (board.hidden && login.hidden) show('board');
    boardMsg.textContent = SHOP.loadFailed;
    boardMsg.hidden = false;
  }
}

login.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const input = login.querySelector('input')!;
  try {
    const r = await post({ op: 'login', pass: input.value });
    if (r.ok) {
      input.value = '';
      return load();
    }
    loginMsg.textContent = r.status === 429 ? SHOP.locked : SHOP.wrong;
  } catch {
    loginMsg.textContent = SHOP.loadFailed;
  }
});
out.addEventListener('click', async () => {
  await post({ op: 'logout' }).catch(() => {});
  orders = [];
  listEl.replaceChildren();
  show('login');
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-tab]'))
  b.addEventListener('click', () => {
    tab = b.dataset.tab!;
    draw();
  });
for (const r of document.querySelectorAll<HTMLInputElement>('input[name="adm-sort"]'))
  r.addEventListener('change', () => {
    sort = r.value as 'new' | 'pickup';
    draw();
  });
$<HTMLButtonElement>('[data-reload]').addEventListener('click', () => load());

listEl.addEventListener('click', async (ev) => {
  const b = (ev.target as Element).closest<HTMLButtonElement>('button[data-op]');
  if (!b) return;
  const card = b.closest<HTMLElement>('.card')!;
  const msg = card.querySelector<HTMLElement>('.card__msg')!;
  b.disabled = true;
  try {
    const r = await post({ op: b.dataset.op, ref: card.dataset.ref });
    if (r.status === 401) return show('login', SHOP.expired);
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    orders = orders.map((o) => (o.ref === data.order.ref ? data.order : o));
    draw();
  } catch {
    b.disabled = false;
    msg.textContent = SHOP.saveFailed;
  }
});

// each minute while the page is in view (docs/admin.md §3.6); at once when it comes back into view
setInterval(() => {
  if (document.visibilityState === 'visible' && !board.hidden) load();
}, 60000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !board.hidden) load();
});
load();
