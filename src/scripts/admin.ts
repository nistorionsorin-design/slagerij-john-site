// /admin — the shop's screen (row 12; docs/admin.md §3.6 · §4). Everything about an order comes from /api/admin after the
// cookie's check; nothing about one is in the page or in this file. The cards are built with textContent only (an order's
// text never becomes markup). Every change is a POST with JSON and the header x-admin: 1. Strings: src/lib/order-text.js
// (lexicon §6 „Comenzi și pașii comenzii, 11.11” · „Păstrarea comenzilor, 12.11”).
// Row 12c: the list reads the store's index (the open orders) each minute; the tabs Ridicate and Toate add the archive
// pages (kept orders picked up or delivered, src/lib/order-keep.js), one page at a time, newest first, as the list is
// scrolled to its end. „Șterge comanda” (the customer's request) shows in the tab Toate only.
import { SHOP, CUSTOMER, nextOf, rank } from '../lib/order-text.js';
import { dayLabel, addressLine } from '../lib/order-core.js';
import { isDone, inPage, pageOf } from '../lib/order-keep.js';

type Card = {
  ref: string;
  year: number;
  n: number;
  changedAt?: string;
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
const moreEl = $<HTMLElement>('[data-more]');

/** the index's cards (open orders, and orders received before the switch day) */
let orders: Card[] = [];
/** the archive pages the store has → how many cards each holds (from the list) */
let done: Record<string, number> = {};
/** the pages loaded, and the count each was loaded under (a page is read again only when its count changes) */
const pages = new Map<string, Card[]>();
const pagesAt = new Map<string, number>();
/** how many pages, newest first, the tabs Ridicate and Toate have asked for so far */
let wanted = 0;
let loading = false;
let tab = 'noua';
let sort: 'new' | 'pickup' = 'new';
/** the card whose erase question is open; the cards erased in this visit of the tab Toate (shown as the line after) */
let asking: string | null = null;
const erased = new Map<string, Card>();

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
const inTab = (o: Card) => (tab === 'all' ? true : tab === 'done' ? isDone(o.status) : o.status === tab);
const archive = () => tab === 'done' || tab === 'all';
const keys = () => Object.keys(done).sort().reverse();
/** the latest write of a card wins where one shows twice (a move whose second write failed; the weekly sweep mends it) */
const stamp = (o: Card) => o.changedAt ?? o.history.at(-1)?.at ?? o.receivedAt;
function cards(): Card[] {
  const m = new Map<string, Card>();
  for (const list of [orders, ...pages.values()])
    for (const o of list) {
      const had = m.get(o.ref);
      if (!had || stamp(o) > stamp(had)) m.set(o.ref, o);
    }
  return [...m.values()];
}
/** a card the server changed or erased: out of every list it was in, into the one it now lies in (or none) */
function put(o: Card | null, ref: string) {
  orders = orders.filter((x) => x.ref !== ref);
  for (const [k, list] of pages) pages.set(k, list.filter((x) => x.ref !== ref));
  if (!o) return;
  if (!inPage(o)) orders.push(o);
  else pages.get(pageOf(o.year, o.n))?.push(o);
}
/** the server's pages after a change: a loaded page whose count moved without us is read again */
function setDone(next: Record<string, number> | undefined, touched?: Card | null) {
  if (!next) return;
  done = next;
  if (touched) {
    const k = pageOf(touched.year, touched.n);
    if (pages.has(k)) pagesAt.set(k, done[k] ?? 0);
  }
  for (const [k, at] of pagesAt)
    if ((done[k] ?? 0) !== at) {
      pages.delete(k);
      pagesAt.delete(k);
    }
}

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
  li.append(acts);
  // the customer asked to be erased (the privacy page's right): in the tab Toate only, behind a question
  if (tab === 'all') {
    if (asking === o.ref) {
      acts.hidden = true;
      const ask = el('div', 'card__ask');
      ask.setAttribute('role', 'group');
      const q = el('p', 'card__q', SHOP.eraseAsk(o.ref));
      q.id = `ask-${o.ref}`;
      ask.setAttribute('aria-labelledby', q.id);
      const yes = el('button', 'btn btn--quote btn--sm', SHOP.eraseYes);
      yes.type = 'button';
      yes.dataset.op = 'erase';
      const no = el('button', 'btn btn--secondary btn--sm', SHOP.eraseNo);
      no.type = 'button';
      no.dataset.op = 'keep';
      ask.append(q, yes, no);
      li.append(ask);
    } else {
      const b = el('button', 'btn btn--secondary btn--sm card__erase', SHOP.erase);
      b.type = 'button';
      b.dataset.op = 'ask';
      acts.append(b);
    }
  }
  li.append(el('p', 'card__msg'));
  return li;
}
/** an erased card: its reference and the line after, until the tab is left */
function goneOf(o: Card) {
  const li = el('li', 'card card--gone');
  li.dataset.ref = o.ref;
  const top = el('p', 'card__top');
  top.append(el('span', '', o.ref));
  const note = el('p', 'card__note', SHOP.erased);
  note.tabIndex = -1;
  li.append(top, note);
  return li;
}

function draw() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-tab]')) b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
  const all = cards();
  for (const c of document.querySelectorAll<HTMLElement>('[data-count]')) {
    const id = c.dataset.count!;
    // Ridicate: the index's (orders received before the switch day) + every archive page's count, loaded or not
    const n = id === 'done' ? orders.filter((o) => isDone(o.status)).length + Object.values(done).reduce((a, b) => a + b, 0) : all.filter((o) => o.status === id).length;
    c.textContent = id === 'all' || !n ? '' : String(n);
  }
  const gone = tab === 'all' ? [...erased.values()].filter((o) => !all.some((x) => x.ref === o.ref)) : [];
  const shown = [...all.filter(inTab), ...gone].sort((a, b) => (sort === 'new' ? (a.receivedAt < b.receivedAt ? 1 : -1) : `${a.date} ${a.time}` < `${b.date} ${b.time}` ? -1 : 1));
  listEl.replaceChildren(...shown.map((o) => (gone.includes(o) ? goneOf(o) : cardOf(o))));
  empty.hidden = !(tab === 'noua' && !shown.length);
  moreEl.hidden = !(archive() && keys().some((k) => !pages.has(k)));
  if (archive()) queueMicrotask(fill);
}

/** the tabs Ridicate and Toate: the pages asked for so far that are not loaded yet, one read each, newest first */
async function ensure() {
  if (loading || !archive()) return;
  const next = keys()
    .slice(0, wanted)
    .find((k) => !pages.has(k));
  if (!next) return;
  loading = true;
  try {
    const r = await fetch(`/api/admin?op=page&p=${encodeURIComponent(next)}`, { credentials: 'same-origin', cache: 'no-store' });
    if (r.status === 401) return show('login', SHOP.expired);
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    pages.set(next, data.orders);
    pagesAt.set(next, done[next] ?? 0);
  } catch {
    boardMsg.textContent = SHOP.loadFailed;
    boardMsg.hidden = false;
    return;
  } finally {
    loading = false;
  }
  draw();
  ensure();
}
/** the end of the list in view and a page still unread → ask for one more page */
function fill() {
  if (!archive() || loading || moreEl.hidden) return;
  if (moreEl.getBoundingClientRect().top > innerHeight + 400) return;
  if (keys()
    .slice(0, wanted)
    .every((k) => pages.has(k)))
    wanted++;
  ensure();
}
new IntersectionObserver((seen) => seen.some((e) => e.isIntersecting) && fill(), { rootMargin: '400px 0px' }).observe(moreEl);

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
    setDone(data.done ?? {});
    show('board');
    boardMsg.hidden = true;
    state.textContent = SHOP.updated(brussels(data.at).hour);
    draw();
    ensure();
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
  done = {};
  pages.clear();
  pagesAt.clear();
  erased.clear();
  asking = null;
  wanted = 0;
  listEl.replaceChildren();
  moreEl.hidden = true;
  show('login');
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-tab]'))
  b.addEventListener('click', () => {
    tab = b.dataset.tab!;
    asking = null;
    erased.clear();
    draw();
  });
for (const r of document.querySelectorAll<HTMLInputElement>('input[name="adm-sort"]'))
  r.addEventListener('change', () => {
    sort = r.value as 'new' | 'pickup';
    draw();
  });
$<HTMLButtonElement>('[data-reload]').addEventListener('click', () => load());

/** after a redraw, the focus back where the hand is: the question's „Renunță”, the card's first button, the line after */
const focusIn = (ref: string, sel: string) => listEl.querySelector<HTMLElement>(`[data-ref="${CSS.escape(ref)}"] ${sel}`)?.focus();

listEl.addEventListener('click', async (ev) => {
  const b = (ev.target as Element).closest<HTMLButtonElement>('button[data-op]');
  if (!b) return;
  const card = b.closest<HTMLElement>('.card')!;
  const ref = card.dataset.ref!;
  const msg = card.querySelector<HTMLElement>('.card__msg')!;
  const op = b.dataset.op!;
  if (op === 'ask' || op === 'keep') {
    asking = op === 'ask' ? ref : null;
    draw();
    return focusIn(ref, op === 'ask' ? '[data-op="keep"]' : '[data-op="ask"]');
  }
  b.disabled = true;
  try {
    const r = await post({ op, ref });
    if (r.status === 401) return show('login', SHOP.expired);
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    if (op === 'erase') {
      // gone from the store (or already gone: a second tap answers the same, without an error)
      const was = cards().find((o) => o.ref === ref);
      if (was) erased.set(ref, was);
      put(null, ref);
      setDone(data.done, was);
      asking = null;
      draw();
      return focusIn(ref, '.card__note');
    }
    put(data.order, data.order.ref);
    setDone(data.done, data.order);
    draw();
    ensure();
  } catch {
    b.disabled = false;
    msg.textContent = SHOP.saveFailed;
  }
});

// each minute while the page is in view (docs/admin.md §3.6) — not while an erase question is open (the redraw would
// take the focus off it); at once when it comes back into view
setInterval(() => {
  if (document.visibilityState === 'visible' && !board.hidden && !asking) load();
}, 60000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !board.hidden) load();
});
load();
